/**
 * 卡坦岛 WebSocket 事件处理层
 *
 * 初始化 Socket.io 事件监听，注册所有 catan: 前缀的客户端到服务端事件，
 * 实现参数校验、游戏状态广播（脱敏）、断线重连、AI 托管触发。
 * 与 UNO 模块共享同一个 httpServer，通过事件前缀隔离。
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type { Socket } from 'socket.io';
import type { ResourceMap, DevCardType, DevCardParams } from './types.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  canStartGame,
  getRoom,
  handleDisconnect,
  handleReconnect,
  findPlayerBySocketId,
  setRoomStatus,
  addAIPlayer,
  removeAIPlayer,
} from './room.js';
import {
  initGame,
  placeInitialSettlement,
  placeInitialRoad,
  rollDice,
  discardResources,
  moveRobber,
  stealResource,
  buildRoad,
  buildSettlement,
  buildCity,
  bankTrade,
  proposePlayerTrade,
  acceptPlayerTrade,
  endTurn,
  toClientGameState,
  checkVictory,
  buyDevelopmentCard,
  useDevelopmentCard,
  updateLargestArmyAwards,
} from './engine.js';
import { generateMap } from './map.js';
import {
  aiDecideSetup,
  aiDecideRollPhase,
  aiDecideTradeBuild,
  aiDecideDiscard,
  aiDecideRobber,
  aiDecideSteal,
} from './ai.js';
import { startTimer, clearTimer } from './timer.js';

// ============================================================
// 辅助函数
// ============================================================

/**
 * 向房间内所有在线玩家广播各自的脱敏 ClientCatanGameState
 * 每位玩家只能看到自己的资源详情
 */
function broadcastGameState(io: SocketIOServer, room: ReturnType<typeof getRoom>): void {
  if (!room?.gameState) return;

  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      const clientState = toClientGameState(room.gameState, player.id);
      io.to(player.socketId).emit('catan:game_state', clientState);
    }
  }
}

/**
 * 广播房间信息（不含 gameState，用于房间等待页面）
 */
function broadcastRoomUpdate(io: SocketIOServer, room: ReturnType<typeof getRoom>): void {
  if (!room) return;
  const roomInfo = {
    id: room.id,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady,
      isHost: p.isHost,
      isAI: p.isAI,
      isConnected: p.isConnected,
      color: p.color,
    })),
    status: room.status,
    hostId: room.hostId,
    allowAI: room.allowAI,
  };

  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      io.to(player.socketId).emit('catan:room_updated', roomInfo);
    }
  }
}

/** 基本参数校验：检查字符串参数是否存在且非空 */
function validateString(value: unknown, name: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `参数错误：${name} 不能为空`;
  }
  return null;
}

/** 校验房间 ID 格式（6 位数字） */
function validateRoomId(roomId: unknown): string | null {
  if (typeof roomId !== 'string' || !/^\d{6}$/.test(roomId)) {
    return '参数错误：房间号必须为6位数字';
  }
  return null;
}

/** 校验 ResourceMap 格式 */
function validateResourceMap(resources: unknown): resources is ResourceMap {
  if (!resources || typeof resources !== 'object') return false;
  const r = resources as Record<string, unknown>;
  const keys: (keyof ResourceMap)[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  return keys.every(k => typeof r[k] === 'number' && r[k] >= 0);
}

/** 添加游戏日志 */
function addLog(room: NonNullable<ReturnType<typeof getRoom>>, playerId: string, action: string, details: string): void {
  if (!room.gameState) return;
  room.gameState.log.push({
    timestamp: Date.now(),
    playerId,
    action,
    details,
  });
}

// ============================================================
// AI 回合处理
// ============================================================

/**
 * 启动回合计时器
 * 如果当前玩家是 AI，启动 AI 计时器；否则启动超时计时器
 */
function startTurnTimer(io: SocketIOServer, roomId: string): void {
  const room = getRoom(roomId);
  if (!room?.gameState || room.gameState.phase === 'finished') return;

  // 清除旧的回合计时器
  clearTimer(roomId, 'turn');

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
  if (!currentPlayer) return;

  // AI 玩家或掉线玩家启动 AI 计时器
  if (currentPlayer.isAI || !currentPlayer.isConnected) {
    startAiTimer(io, roomId);
    return;
  }

  // 真人玩家启动回合超时计时器（60 秒）
  startTimer(roomId, 'turn', () => {
    const currentRoom = getRoom(roomId);
    if (!currentRoom?.gameState || currentRoom.gameState.phase === 'finished') return;

    const player = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
    if (!player) return;

    // 根据当前阶段执行默认操作
    handleTimeoutAction(io, roomId, player.id);
  });
}

/**
 * 超时默认操作
 * - 掷骰阶段：自动掷骰
 * - 交易/建造阶段：自动结束回合
 * - 初始放置阶段：AI 代替放置
 * - 其他阶段：根据情况处理
 */
function handleTimeoutAction(io: SocketIOServer, roomId: string, playerId: string): void {
  const room = getRoom(roomId);
  if (!room?.gameState || room.gameState.phase === 'finished') return;

  const phase = room.gameState.phase;

  if (phase === 'roll_dice') {
    // 自动掷骰
    executeRollDice(io, room, playerId);
  } else if (phase === 'trade_build') {
    // 自动结束回合
    executeEndTurn(io, room, playerId);
  } else if (phase === 'setup_settlement' || phase === 'setup_road') {
    // 使用 AI 策略放置
    executeAiSetup(io, room, playerId);
  } else if (phase === 'discard') {
    // 使用 AI 策略丢弃
    executeAiDiscard(io, room, playerId);
  } else if (phase === 'move_robber') {
    executeAiMoveRobber(io, room, playerId);
  } else if (phase === 'steal') {
    executeAiSteal(io, room, playerId);
  }
}

/**
 * 启动 AI 操作计时器
 * 延迟 2～4 秒后执行 AI 决策
 */
function startAiTimer(io: SocketIOServer, roomId: string): void {
  clearTimer(roomId, 'ai');

  startTimer(roomId, 'ai', () => {
    const room = getRoom(roomId);
    if (!room?.gameState || room.gameState.phase === 'finished') return;

    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!currentPlayer) return;

    const phase = room.gameState.phase;

    if (phase === 'setup_settlement' || phase === 'setup_road') {
      executeAiSetup(io, room, currentPlayer.id);
    } else if (phase === 'roll_dice') {
      executeRollDice(io, room, currentPlayer.id);
    } else if (phase === 'trade_build') {
      executeAiTradeBuild(io, room, currentPlayer.id);
    } else if (phase === 'discard') {
      executeAiDiscard(io, room, currentPlayer.id);
    } else if (phase === 'move_robber') {
      executeAiMoveRobber(io, room, currentPlayer.id);
    } else if (phase === 'steal') {
      executeAiSteal(io, room, currentPlayer.id);
    }
  });
}

// ============================================================
// AI 执行函数
// ============================================================

/** AI 初始放置 */
function executeAiSetup(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, playerId: string): void {
  if (!room.gameState) return;

  const decision = aiDecideSetup(room.gameState, playerId);

  if (decision.action === 'place_settlement') {
    room.gameState = placeInitialSettlement(room.gameState, playerId, decision.vertexId);
    addLog(room, playerId, 'place_settlement', `放置了初始村庄 ${decision.vertexId}`);
    broadcastBuildingPlaced(io, room, playerId, 'settlement', decision.vertexId);
  } else {
    room.gameState = placeInitialRoad(room.gameState, playerId, decision.edgeId);
    addLog(room, playerId, 'place_road', `放置了初始道路 ${decision.edgeId}`);
    broadcastBuildingPlaced(io, room, playerId, 'road', decision.edgeId);
  }

  broadcastGameState(io, room);

  // 检查是否还在初始放置阶段，继续触发下一个 AI
  if (room.gameState.phase === 'setup_settlement' || room.gameState.phase === 'setup_road') {
    startTurnTimer(io, room.id);
  } else {
    // 初始放置结束，进入正式游戏
    startTurnTimer(io, room.id);
  }
}

/** 执行掷骰 */
function executeRollDice(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, playerId: string): void {
  if (!room.gameState) return;

  const prevState = room.gameState;
  room.gameState = rollDice(room.gameState);

  // 掷骰失败（状态未变）
  if (room.gameState === prevState) return;

  const dice = room.gameState.diceResult!;
  addLog(room, playerId, 'roll_dice', `掷出了 ${dice[0]}+${dice[1]}=${dice[0] + dice[1]}`);

  // 广播骰子结果
  broadcastToRoom(io, room, 'catan:dice_rolled', { playerId, dice });
  broadcastGameState(io, room);

  // 根据掷骰后的阶段决定下一步
  const phase = room.gameState.phase;
  if (phase === 'discard') {
    // 启动丢弃超时计时器
    startTimer(roomId(room), 'discard', () => {
      autoDiscardForPending(io, room.id);
    });
    // 检查是否有 AI 需要丢弃
    triggerAiDiscardIfNeeded(io, room);
  } else if (phase === 'move_robber') {
    startTurnTimer(io, room.id);
  } else {
    // trade_build 阶段
    startTurnTimer(io, room.id);
  }
}

/** 获取房间 ID 辅助函数 */
function roomId(room: NonNullable<ReturnType<typeof getRoom>>): string {
  return room.id;
}

/** AI 交易/建造阶段决策 */
function executeAiTradeBuild(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, playerId: string): void {
  if (!room.gameState) return;

  const decision = aiDecideTradeBuild(room.gameState, playerId);

  if (decision.action === 'build_city') {
    room.gameState = buildCity(room.gameState, playerId, decision.vertexId);
    room.gameState = checkVictory(room.gameState);
    addLog(room, playerId, 'build_city', `建造了城市 ${decision.vertexId}`);
    broadcastBuildingPlaced(io, room, playerId, 'city', decision.vertexId);
    broadcastGameState(io, room);

    if (room.gameState.phase === 'finished') {
      handleGameOver(io, room);
      return;
    }
    // AI 可能还能继续建造
    startAiTimer(io, room.id);
  } else if (decision.action === 'build_settlement') {
    room.gameState = buildSettlement(room.gameState, playerId, decision.vertexId);
    room.gameState = checkVictory(room.gameState);
    addLog(room, playerId, 'build_settlement', `建造了村庄 ${decision.vertexId}`);
    broadcastBuildingPlaced(io, room, playerId, 'settlement', decision.vertexId);
    broadcastGameState(io, room);

    if (room.gameState.phase === 'finished') {
      handleGameOver(io, room);
      return;
    }
    startAiTimer(io, room.id);
  } else if (decision.action === 'build_road') {
    room.gameState = buildRoad(room.gameState, playerId, decision.edgeId);
    room.gameState = checkVictory(room.gameState);
    addLog(room, playerId, 'build_road', `建造了道路 ${decision.edgeId}`);
    broadcastBuildingPlaced(io, room, playerId, 'road', decision.edgeId);
    broadcastGameState(io, room);

    if (room.gameState.phase === 'finished') {
      handleGameOver(io, room);
      return;
    }
    startAiTimer(io, room.id);
  } else {
    // end_turn
    executeEndTurn(io, room, playerId);
  }
}

/** 执行结束回合 */
function executeEndTurn(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, playerId: string): void {
  if (!room.gameState) return;

  room.gameState = endTurn(room.gameState, playerId);
  addLog(room, playerId, 'end_turn', '结束了回合');
  broadcastGameState(io, room);
  startTurnTimer(io, room.id);
}

/** AI 丢弃资源 */
function executeAiDiscard(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, playerId: string): void {
  if (!room.gameState) return;

  const decision = aiDecideDiscard(room.gameState, playerId);
  room.gameState = discardResources(room.gameState, playerId, decision.resources);
  addLog(room, playerId, 'discard', '丢弃了资源');
  broadcastGameState(io, room);

  // 检查是否所有人都丢弃完毕
  if (room.gameState.phase === 'move_robber') {
    startTurnTimer(io, room.id);
  } else {
    // 还有人需要丢弃，检查是否有 AI
    triggerAiDiscardIfNeeded(io, room);
  }
}

/** AI 移动强盗 */
function executeAiMoveRobber(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, playerId: string): void {
  if (!room.gameState) return;

  const decision = aiDecideRobber(room.gameState, playerId);
  room.gameState = moveRobber(room.gameState, playerId, decision.hexId);
  addLog(room, playerId, 'move_robber', `移动强盗到 ${decision.hexId}`);
  broadcastToRoom(io, room, 'catan:robber_moved', { playerId, hexId: decision.hexId });
  broadcastGameState(io, room);

  if (room.gameState.phase === 'steal') {
    startTurnTimer(io, room.id);
  } else {
    // trade_build 阶段
    startTurnTimer(io, room.id);
  }
}

/** AI 抢夺资源 */
function executeAiSteal(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, playerId: string): void {
  if (!room.gameState) return;

  const decision = aiDecideSteal(room.gameState, playerId);
  room.gameState = stealResource(room.gameState, playerId, decision.targetPlayerId);
  addLog(room, playerId, 'steal', `从玩家抢夺了资源`);
  broadcastGameState(io, room);
  startTurnTimer(io, room.id);
}

/** 检查是否有 AI 玩家需要丢弃资源 */
function triggerAiDiscardIfNeeded(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>): void {
  if (!room.gameState || room.gameState.phase !== 'discard' || !room.gameState.discardState) return;

  const pending = room.gameState.discardState.pendingPlayers;
  const completed = room.gameState.discardState.completedPlayers;

  for (const pid of pending) {
    if (completed.includes(pid)) continue;
    const player = room.gameState.players.find(p => p.id === pid);
    if (player && (player.isAI || !player.isConnected)) {
      // 延迟执行 AI 丢弃
      setTimeout(() => {
        const currentRoom = getRoom(room.id);
        if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'discard') return;
        executeAiDiscard(io, currentRoom, pid);
      }, 1000);
      return; // 一次只处理一个 AI
    }
  }
}

/** 超时自动丢弃：为所有未完成丢弃的玩家执行 AI 丢弃 */
function autoDiscardForPending(io: SocketIOServer, rid: string): void {
  const room = getRoom(rid);
  if (!room?.gameState || room.gameState.phase !== 'discard' || !room.gameState.discardState) return;

  const pending = room.gameState.discardState.pendingPlayers;
  const completed = room.gameState.discardState.completedPlayers;

  for (const pid of pending) {
    if (completed.includes(pid)) continue;
    executeAiDiscard(io, room, pid);
    // 重新获取房间状态（可能已经进入下一阶段）
    const updatedRoom = getRoom(rid);
    if (!updatedRoom?.gameState || updatedRoom.gameState.phase !== 'discard') break;
  }
}

// ============================================================
// 广播辅助函数
// ============================================================

/** 向房间内所有在线玩家广播事件 */
function broadcastToRoom(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>, event: string, data: unknown): void {
  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      io.to(player.socketId).emit(event, data);
    }
  }
}

/** 广播建筑放置通知 */
function broadcastBuildingPlaced(
  io: SocketIOServer,
  room: NonNullable<ReturnType<typeof getRoom>>,
  playerId: string,
  type: string,
  position: string,
): void {
  broadcastToRoom(io, room, 'catan:building_placed', { playerId, type, position });
}

/** 处理游戏结束 */
function handleGameOver(io: SocketIOServer, room: NonNullable<ReturnType<typeof getRoom>>): void {
  if (!room.gameState) return;

  clearTimer(room.id);
  setRoomStatus(room.id, 'finished');

  const clientPlayers = room.gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    resourceCount: p.resources.wood + p.resources.brick + p.resources.sheep + p.resources.wheat + p.resources.ore,
    settlements: p.settlements,
    cities: p.cities,
    roads: p.roads,
    devCardCount: p.devCards.length,
    knightsPlayed: p.knightsPlayed,
    longestRoadLength: p.longestRoadLength,
    hasLongestRoad: p.hasLongestRoad,
    hasLargestArmy: p.hasLargestArmy,
    victoryPoints: p.victoryPoints,
    isHost: p.isHost,
    isAI: p.isAI,
    isConnected: p.isConnected,
  }));

  broadcastToRoom(io, room, 'catan:game_over', {
    winnerId: room.gameState.winnerId,
    players: clientPlayers,
  });

  broadcastGameState(io, room);
}

// ============================================================
// 初始化卡坦岛 Socket 事件
// ============================================================

/**
 * 初始化卡坦岛 Socket.io 事件处理
 * 复用已有的 httpServer（与 UNO 共享），通过 catan: 前缀隔离事件
 */
export function initCatanSocketServer(httpServer: HttpServer): void {
  // 复用已有的 Socket.io 实例（UNO 已创建）
  // 通过获取已绑定到 httpServer 上的 io 实例
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // ========================================================
    // catan:create_room — 创建房间
    // ========================================================
    socket.on('catan:create_room', (data: unknown) => {
      try {
        const { playerName } = (data ?? {}) as { playerName?: string };
        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('catan:error', { message: nameErr });
          return;
        }

        const result = createRoom(playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('catan:error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(`catan:${room.id}`);

        socket.emit('catan:room_created', { roomId: room.id, playerId });
        broadcastRoomUpdate(io, room);
      } catch (err) {
        console.error('[Catan Socket] create_room 错误:', err);
        socket.emit('catan:error', { message: '创建房间失败' });
      }
    });

    // ========================================================
    // catan:join_room — 加入房间
    // ========================================================
    socket.on('catan:join_room', (data: unknown) => {
      try {
        const { roomId, playerName } = (data ?? {}) as { roomId?: string; playerName?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('catan:error', { message: roomIdErr });
          return;
        }

        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('catan:error', { message: nameErr });
          return;
        }

        const result = joinRoom(roomId!, playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('catan:error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(`catan:${room.id}`);

        socket.emit('catan:room_joined', { roomId: room.id, playerId });
        broadcastRoomUpdate(io, room);
      } catch (err) {
        console.error('[Catan Socket] join_room 错误:', err);
        socket.emit('catan:error', { message: '加入房间失败' });
      }
    });

    // ========================================================
    // catan:leave_room — 离开房间
    // ========================================================
    socket.on('catan:leave_room', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('catan:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('catan:error', { message: '你不在该房间中' });
          return;
        }

        const room = leaveRoom(roomId!, mapping.playerId);
        socket.leave(`catan:${roomId!}`);

        if (room) {
          // 如果游戏进行中且没有真人玩家了，结束游戏
          if (room.gameState && room.players.filter((p) => !p.isAI).length === 0) {
            clearTimer(roomId!);
            room.gameState.phase = 'finished';
            setRoomStatus(roomId!, 'finished');
          }
          broadcastRoomUpdate(io, room);
          if (room.gameState) {
            broadcastGameState(io, room);
          }
        }
      } catch (err) {
        console.error('[Catan Socket] leave_room 错误:', err);
        socket.emit('catan:error', { message: '离开房间失败' });
      }
    });

    // ========================================================
    // catan:player_ready — 切换准备状态
    // ========================================================
    socket.on('catan:player_ready', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('catan:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('catan:error', { message: '你不在该房间中' });
          return;
        }

        const room = toggleReady(roomId!, mapping.playerId);
        if (!room) {
          socket.emit('catan:error', { message: '操作失败' });
          return;
        }

        broadcastRoomUpdate(io, room);
      } catch (err) {
        console.error('[Catan Socket] player_ready 错误:', err);
        socket.emit('catan:error', { message: '准备操作失败' });
      }
    });

    // ========================================================
    // catan:add_ai — 添加 AI 玩家（仅房主）
    // ========================================================
    socket.on('catan:add_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('catan:error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.playerId) { socket.emit('catan:error', { message: '只有房主可以添加人机' }); return; }

        const result = addAIPlayer(roomId!);
        if ('error' in result) { socket.emit('catan:error', { message: result.error }); return; }

        broadcastRoomUpdate(io, result);
      } catch (err) {
        console.error('[Catan Socket] add_ai 错误:', err);
        socket.emit('catan:error', { message: '添加人机失败' });
      }
    });

    // ========================================================
    // catan:remove_ai — 移除 AI 玩家（仅房主）
    // ========================================================
    socket.on('catan:remove_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('catan:error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.playerId) { socket.emit('catan:error', { message: '只有房主可以移除人机' }); return; }

        const result = removeAIPlayer(roomId!);
        if ('error' in result) { socket.emit('catan:error', { message: result.error }); return; }

        broadcastRoomUpdate(io, result);
      } catch (err) {
        console.error('[Catan Socket] remove_ai 错误:', err);
        socket.emit('catan:error', { message: '移除人机失败' });
      }
    });

    // ========================================================
    // catan:start_game — 开始游戏（仅房主）
    // ========================================================
    socket.on('catan:start_game', (data: unknown) => {
      try {
        const { roomId, enableDevCards } = (data ?? {}) as { roomId?: string; enableDevCards?: boolean };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('catan:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('catan:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room) {
          socket.emit('catan:error', { message: '房间不存在' });
          return;
        }

        if (room.hostId !== mapping.playerId) {
          socket.emit('catan:error', { message: '只有房主可以开始游戏' });
          return;
        }

        if (!canStartGame(room)) {
          socket.emit('catan:error', { message: '条件不满足，无法开始' });
          return;
        }

        // 设置发展卡选项
        if (enableDevCards !== undefined) {
          room.enableDevCards = enableDevCards;
        }

        // 生成地图并初始化游戏
        const map = generateMap();
        const gameState = initGame(room.players, map, roomId!, room.enableDevCards);
        room.gameState = gameState;
        room.status = 'playing';
        setRoomStatus(roomId!, 'playing');

        // 广播游戏开始
        for (const player of room.players) {
          if (player.isConnected && player.socketId) {
            const clientState = toClientGameState(gameState, player.id);
            io.to(player.socketId).emit('catan:game_started', clientState);
          }
        }

        broadcastGameState(io, room);

        // 启动初始放置阶段的计时器
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Catan Socket] start_game 错误:', err);
        socket.emit('catan:error', { message: '开始游戏失败' });
      }
    });

    // ========================================================
    // catan:place_settlement — 放置村庄（初始放置阶段）
    // ========================================================
    socket.on('catan:place_settlement', (data: unknown) => {
      try {
        const { roomId, vertexId } = (data ?? {}) as { roomId?: string; vertexId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const vertexErr = validateString(vertexId, 'vertexId');
        if (vertexErr) { socket.emit('catan:error', { message: vertexErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'setup_settlement') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = placeInitialSettlement(room.gameState, mapping.playerId, vertexId!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '无法在此位置放置村庄' });
          return;
        }

        clearTimer(roomId!, 'turn');
        addLog(room, mapping.playerId, 'place_settlement', `放置了初始村庄 ${vertexId}`);
        broadcastBuildingPlaced(io, room, mapping.playerId, 'settlement', vertexId!);
        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Catan Socket] place_settlement 错误:', err);
        socket.emit('catan:error', { message: '放置村庄失败' });
      }
    });

    // ========================================================
    // catan:place_road — 放置道路（初始放置阶段）
    // ========================================================
    socket.on('catan:place_road', (data: unknown) => {
      try {
        const { roomId, edgeId } = (data ?? {}) as { roomId?: string; edgeId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const edgeErr = validateString(edgeId, 'edgeId');
        if (edgeErr) { socket.emit('catan:error', { message: edgeErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'setup_road') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = placeInitialRoad(room.gameState, mapping.playerId, edgeId!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '无法在此位置放置道路' });
          return;
        }

        clearTimer(roomId!, 'turn');
        addLog(room, mapping.playerId, 'place_road', `放置了初始道路 ${edgeId}`);
        broadcastBuildingPlaced(io, room, mapping.playerId, 'road', edgeId!);
        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Catan Socket] place_road 错误:', err);
        socket.emit('catan:error', { message: '放置道路失败' });
      }
    });

    // ========================================================
    // catan:roll_dice — 掷骰子
    // ========================================================
    socket.on('catan:roll_dice', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'roll_dice') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        clearTimer(roomId!, 'turn');
        executeRollDice(io, room, mapping.playerId);
      } catch (err) {
        console.error('[Catan Socket] roll_dice 错误:', err);
        socket.emit('catan:error', { message: '掷骰子失败' });
      }
    });

    // ========================================================
    // catan:discard_resources — 丢弃资源
    // ========================================================
    socket.on('catan:discard_resources', (data: unknown) => {
      try {
        const { roomId, resources } = (data ?? {}) as { roomId?: string; resources?: ResourceMap };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        if (!validateResourceMap(resources)) {
          socket.emit('catan:error', { message: '参数错误：资源格式不正确' });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'discard') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = discardResources(room.gameState, mapping.playerId, resources!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '丢弃资源失败，请检查数量' });
          return;
        }

        addLog(room, mapping.playerId, 'discard', '丢弃了资源');
        broadcastGameState(io, room);

        // 检查是否所有人都丢弃完毕
        if (room.gameState.phase === 'move_robber') {
          clearTimer(roomId!, 'discard');
          startTurnTimer(io, roomId!);
        }
      } catch (err) {
        console.error('[Catan Socket] discard_resources 错误:', err);
        socket.emit('catan:error', { message: '丢弃资源失败' });
      }
    });

    // ========================================================
    // catan:move_robber — 移动强盗
    // ========================================================
    socket.on('catan:move_robber', (data: unknown) => {
      try {
        const { roomId, hexId } = (data ?? {}) as { roomId?: string; hexId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const hexIdErr = validateString(hexId, 'hexId');
        if (hexIdErr) { socket.emit('catan:error', { message: hexIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'move_robber') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = moveRobber(room.gameState, mapping.playerId, hexId!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '无法移动强盗到此位置' });
          return;
        }

        clearTimer(roomId!, 'turn');
        addLog(room, mapping.playerId, 'move_robber', `移动强盗到 ${hexId}`);
        broadcastToRoom(io, room, 'catan:robber_moved', { playerId: mapping.playerId, hexId });
        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Catan Socket] move_robber 错误:', err);
        socket.emit('catan:error', { message: '移动强盗失败' });
      }
    });

    // ========================================================
    // catan:steal_resource — 抢夺资源
    // ========================================================
    socket.on('catan:steal_resource', (data: unknown) => {
      try {
        const { roomId, targetPlayerId } = (data ?? {}) as { roomId?: string; targetPlayerId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const targetErr = validateString(targetPlayerId, 'targetPlayerId');
        if (targetErr) { socket.emit('catan:error', { message: targetErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'steal') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = stealResource(room.gameState, mapping.playerId, targetPlayerId!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '抢夺失败' });
          return;
        }

        clearTimer(roomId!, 'turn');
        addLog(room, mapping.playerId, 'steal', '抢夺了资源');
        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Catan Socket] steal_resource 错误:', err);
        socket.emit('catan:error', { message: '抢夺资源失败' });
      }
    });

    // ========================================================
    // catan:build_road — 建造道路
    // ========================================================
    socket.on('catan:build_road', (data: unknown) => {
      try {
        const { roomId, edgeId } = (data ?? {}) as { roomId?: string; edgeId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const edgeErr = validateString(edgeId, 'edgeId');
        if (edgeErr) { socket.emit('catan:error', { message: edgeErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'trade_build') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = buildRoad(room.gameState, mapping.playerId, edgeId!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '无法在此位置建造道路' });
          return;
        }

        // 检查胜利（最长道路可能触发胜利）
        room.gameState = checkVictory(room.gameState);

        addLog(room, mapping.playerId, 'build_road', `建造了道路 ${edgeId}`);
        broadcastBuildingPlaced(io, room, mapping.playerId, 'road', edgeId!);
        broadcastGameState(io, room);

        if (room.gameState.phase === 'finished') {
          handleGameOver(io, room);
        }
      } catch (err) {
        console.error('[Catan Socket] build_road 错误:', err);
        socket.emit('catan:error', { message: '建造道路失败' });
      }
    });

    // ========================================================
    // catan:build_settlement — 建造村庄
    // ========================================================
    socket.on('catan:build_settlement', (data: unknown) => {
      try {
        const { roomId, vertexId } = (data ?? {}) as { roomId?: string; vertexId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const vertexErr = validateString(vertexId, 'vertexId');
        if (vertexErr) { socket.emit('catan:error', { message: vertexErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'trade_build') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = buildSettlement(room.gameState, mapping.playerId, vertexId!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '无法在此位置建造村庄' });
          return;
        }

        room.gameState = checkVictory(room.gameState);

        addLog(room, mapping.playerId, 'build_settlement', `建造了村庄 ${vertexId}`);
        broadcastBuildingPlaced(io, room, mapping.playerId, 'settlement', vertexId!);
        broadcastGameState(io, room);

        if (room.gameState.phase === 'finished') {
          handleGameOver(io, room);
        }
      } catch (err) {
        console.error('[Catan Socket] build_settlement 错误:', err);
        socket.emit('catan:error', { message: '建造村庄失败' });
      }
    });

    // ========================================================
    // catan:build_city — 建造城市
    // ========================================================
    socket.on('catan:build_city', (data: unknown) => {
      try {
        const { roomId, vertexId } = (data ?? {}) as { roomId?: string; vertexId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const vertexErr = validateString(vertexId, 'vertexId');
        if (vertexErr) { socket.emit('catan:error', { message: vertexErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'trade_build') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = buildCity(room.gameState, mapping.playerId, vertexId!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '无法在此位置建造城市' });
          return;
        }

        room.gameState = checkVictory(room.gameState);

        addLog(room, mapping.playerId, 'build_city', `建造了城市 ${vertexId}`);
        broadcastBuildingPlaced(io, room, mapping.playerId, 'city', vertexId!);
        broadcastGameState(io, room);

        if (room.gameState.phase === 'finished') {
          handleGameOver(io, room);
        }
      } catch (err) {
        console.error('[Catan Socket] build_city 错误:', err);
        socket.emit('catan:error', { message: '建造城市失败' });
      }
    });

    // ========================================================
    // catan:bank_trade — 银行/港口交易
    // ========================================================
    socket.on('catan:bank_trade', (data: unknown) => {
      try {
        const { roomId, offer, request } = (data ?? {}) as { roomId?: string; offer?: ResourceMap; request?: ResourceMap };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        if (!validateResourceMap(offer) || !validateResourceMap(request)) {
          socket.emit('catan:error', { message: '参数错误：资源格式不正确' });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'trade_build') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = bankTrade(room.gameState, mapping.playerId, offer!, request!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '交易失败，请检查资源和比率' });
          return;
        }

        addLog(room, mapping.playerId, 'bank_trade', '进行了银行交易');
        broadcastGameState(io, room);
      } catch (err) {
        console.error('[Catan Socket] bank_trade 错误:', err);
        socket.emit('catan:error', { message: '银行交易失败' });
      }
    });

    // ========================================================
    // catan:propose_trade — 发起玩家交易
    // ========================================================
    socket.on('catan:propose_trade', (data: unknown) => {
      try {
        const { roomId, offer, request } = (data ?? {}) as { roomId?: string; offer?: ResourceMap; request?: ResourceMap };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        if (!validateResourceMap(offer) || !validateResourceMap(request)) {
          socket.emit('catan:error', { message: '参数错误：资源格式不正确' });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'trade_build') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = proposePlayerTrade(room.gameState, mapping.playerId, offer!, request!);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '发起交易失败' });
          return;
        }

        addLog(room, mapping.playerId, 'propose_trade', '发起了交易请求');

        // 广播交易提案
        if (room.gameState.currentTrade) {
          broadcastToRoom(io, room, 'catan:trade_proposed', room.gameState.currentTrade);
        }
        broadcastGameState(io, room);
      } catch (err) {
        console.error('[Catan Socket] propose_trade 错误:', err);
        socket.emit('catan:error', { message: '发起交易失败' });
      }
    });

    // ========================================================
    // catan:accept_trade — 接受交易
    // ========================================================
    socket.on('catan:accept_trade', (data: unknown) => {
      try {
        const { roomId, tradeId } = (data ?? {}) as { roomId?: string; tradeId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const tradeIdErr = validateString(tradeId, 'tradeId');
        if (tradeIdErr) { socket.emit('catan:error', { message: tradeIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        const prevState = room.gameState;
        room.gameState = acceptPlayerTrade(room.gameState, tradeId!, mapping.playerId);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '接受交易失败' });
          return;
        }

        addLog(room, mapping.playerId, 'accept_trade', '接受了交易');
        broadcastToRoom(io, room, 'catan:trade_completed', { tradeId, accepterId: mapping.playerId });
        broadcastGameState(io, room);
      } catch (err) {
        console.error('[Catan Socket] accept_trade 错误:', err);
        socket.emit('catan:error', { message: '接受交易失败' });
      }
    });

    // ========================================================
    // catan:reject_trade — 拒绝交易
    // ========================================================
    socket.on('catan:reject_trade', (data: unknown) => {
      try {
        const { roomId, tradeId } = (data ?? {}) as { roomId?: string; tradeId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const tradeIdErr = validateString(tradeId, 'tradeId');
        if (tradeIdErr) { socket.emit('catan:error', { message: tradeIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        // 清除当前交易
        if (room.gameState.currentTrade && room.gameState.currentTrade.id === tradeId) {
          room.gameState = { ...room.gameState, currentTrade: null };
        }

        addLog(room, mapping.playerId, 'reject_trade', '拒绝了交易');
        broadcastToRoom(io, room, 'catan:trade_rejected', { tradeId, rejecterId: mapping.playerId });
        broadcastGameState(io, room);
      } catch (err) {
        console.error('[Catan Socket] reject_trade 错误:', err);
        socket.emit('catan:error', { message: '拒绝交易失败' });
      }
    });

    // ========================================================
    // catan:buy_dev_card — 购买发展卡
    // ========================================================
    socket.on('catan:buy_dev_card', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'trade_build') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = buyDevelopmentCard(room.gameState, mapping.playerId);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '购买发展卡失败，请检查资源或牌堆' });
          return;
        }

        // 检查胜利（胜利分卡可能触发胜利）
        room.gameState = checkVictory(room.gameState);

        addLog(room, mapping.playerId, 'buy_dev_card', '购买了一张发展卡');
        broadcastGameState(io, room);

        if (room.gameState.phase === 'finished') {
          handleGameOver(io, room);
        }
      } catch (err) {
        console.error('[Catan Socket] buy_dev_card 错误:', err);
        socket.emit('catan:error', { message: '购买发展卡失败' });
      }
    });

    // ========================================================
    // catan:use_dev_card — 使用发展卡
    // ========================================================
    socket.on('catan:use_dev_card', (data: unknown) => {
      try {
        const { roomId, cardType, params } = (data ?? {}) as {
          roomId?: string;
          cardType?: DevCardType;
          params?: DevCardParams;
        };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        if (!cardType || typeof cardType !== 'string') {
          socket.emit('catan:error', { message: '参数错误：cardType 不能为空' });
          return;
        }

        const validCardTypes: DevCardType[] = ['knight', 'victory_point', 'road_building', 'year_of_plenty', 'monopoly'];
        if (!validCardTypes.includes(cardType)) {
          socket.emit('catan:error', { message: '参数错误：无效的发展卡类型' });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        // 骑士卡可以在 roll_dice 阶段使用，其他卡只能在 trade_build 阶段
        if (cardType === 'knight') {
          if (room.gameState.phase !== 'trade_build' && room.gameState.phase !== 'roll_dice') {
            socket.emit('catan:error', { message: '当前阶段不允许此操作' });
            return;
          }
        } else {
          if (room.gameState.phase !== 'trade_build') {
            socket.emit('catan:error', { message: '当前阶段不允许此操作' });
            return;
          }
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        const prevState = room.gameState;
        room.gameState = useDevelopmentCard(room.gameState, mapping.playerId, cardType, params);

        if (room.gameState === prevState) {
          socket.emit('catan:error', { message: '使用发展卡失败' });
          return;
        }

        // 检查胜利（最大骑士团/最长道路可能触发胜利）
        room.gameState = checkVictory(room.gameState);

        addLog(room, mapping.playerId, 'use_dev_card', `使用了${cardType}发展卡`);
        broadcastGameState(io, room);

        if (room.gameState.phase === 'finished') {
          handleGameOver(io, room);
        } else if (room.gameState.phase === 'move_robber') {
          // 骑士卡使用后进入移动强盗阶段
          startTurnTimer(io, roomId!);
        }
      } catch (err) {
        console.error('[Catan Socket] use_dev_card 错误:', err);
        socket.emit('catan:error', { message: '使用发展卡失败' });
      }
    });

    // ========================================================
    // catan:end_turn — 结束回合
    // ========================================================
    socket.on('catan:end_turn', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('catan:error', { message: '游戏未开始' }); return; }

        if (room.gameState.phase !== 'trade_build') {
          socket.emit('catan:error', { message: '当前阶段不允许此操作' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('catan:error', { message: '不是你的回合' });
          return;
        }

        clearTimer(roomId!, 'turn');
        executeEndTurn(io, room, mapping.playerId);
      } catch (err) {
        console.error('[Catan Socket] end_turn 错误:', err);
        socket.emit('catan:error', { message: '结束回合失败' });
      }
    });

    // ========================================================
    // catan:reconnect — 断线重连
    // ========================================================
    socket.on('catan:reconnect', (data: unknown) => {
      try {
        const { roomId, playerId } = (data ?? {}) as { roomId?: string; playerId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const playerIdErr = validateString(playerId, 'playerId');
        if (playerIdErr) { socket.emit('catan:error', { message: playerIdErr }); return; }

        const room = handleReconnect(roomId!, playerId!, socket.id);
        if (!room) {
          socket.emit('catan:error', { message: '重连失败：房间或玩家不存在' });
          return;
        }

        socket.join(`catan:${roomId!}`);

        // 广播重连通知
        broadcastToRoom(io, room, 'catan:player_reconnected', { playerId });

        // 发送当前状态
        if (room.gameState) {
          const clientState = toClientGameState(room.gameState, playerId!);
          socket.emit('catan:game_state', clientState);
          broadcastGameState(io, room);
        } else {
          broadcastRoomUpdate(io, room);
        }
      } catch (err) {
        console.error('[Catan Socket] reconnect 错误:', err);
        socket.emit('catan:error', { message: '重连失败' });
      }
    });

    // ========================================================
    // catan:chat — 聊天消息
    // ========================================================
    socket.on('catan:chat', (data: unknown) => {
      try {
        const { roomId, message } = (data ?? {}) as { roomId?: string; message?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('catan:error', { message: roomIdErr }); return; }

        const msgErr = validateString(message, 'message');
        if (msgErr) { socket.emit('catan:error', { message: msgErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('catan:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('catan:error', { message: '房间不存在' }); return; }

        const player = room.players.find(p => p.id === mapping.playerId);
        if (!player) { socket.emit('catan:error', { message: '玩家不存在' }); return; }

        // 限制消息长度
        const trimmedMessage = message!.trim().slice(0, 200);

        broadcastToRoom(io, room, 'catan:chat_message', {
          playerId: mapping.playerId,
          playerName: player.name,
          message: trimmedMessage,
        });
      } catch (err) {
        console.error('[Catan Socket] chat 错误:', err);
        socket.emit('catan:error', { message: '发送消息失败' });
      }
    });

    // ========================================================
    // disconnect — 断线处理（卡坦岛）
    // ========================================================
    socket.on('disconnect', () => {
      try {
        const disconnectInfo = handleDisconnect(socket.id);
        if (!disconnectInfo) return;

        const { roomId: rid, playerId: pid } = disconnectInfo;
        const room = getRoom(rid);
        if (!room) return;

        // 广播断线通知
        broadcastToRoom(io, room, 'catan:player_disconnected', { playerId: pid });

        if (room.gameState && room.gameState.phase !== 'finished') {
          broadcastGameState(io, room);

          // 如果当前轮到掉线玩家，启动 AI 计时器接管
          const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
          if (currentPlayer && currentPlayer.id === pid) {
            clearTimer(rid, 'turn');
            startTurnTimer(io, rid);
          }

          // 如果在丢弃阶段，检查掉线玩家是否需要丢弃
          if (room.gameState.phase === 'discard') {
            triggerAiDiscardIfNeeded(io, room);
          }
        } else if (room.status === 'waiting') {
          // 房间等待中：30 秒后移除掉线玩家
          setTimeout(() => {
            const currentRoom = getRoom(rid);
            if (!currentRoom) return;

            const disconnectedPlayer = currentRoom.players.find((p) => p.id === pid);
            if (disconnectedPlayer && !disconnectedPlayer.isConnected) {
              const updatedRoom = leaveRoom(rid, pid);
              if (updatedRoom) {
                broadcastRoomUpdate(io, updatedRoom);
              }
            }
          }, 30 * 1000);
        }
      } catch (err) {
        console.error('[Catan Socket] disconnect 错误:', err);
      }
    });
  });
}
