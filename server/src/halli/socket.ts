/**
 * 德国心脏病 WebSocket 事件处理层
 *
 * 初始化 Socket.io 事件监听，注册所有 halli: 前缀的客户端到服务端事件，
 * 实现参数校验、游戏状态广播（脱敏）、按铃窗口管理、AI 触发、断线重连。
 * 与 UNO 和 Catan 模块共享同一个 httpServer，通过事件前缀隔离。
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import type { HalliRoom } from './types.js';
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
  flipCard,
  ringBell,
  advanceTurn,
  checkVictory,
  checkElimination,
  toClientGameState,
} from './engine.js';
import { aiDecideFlip, aiDecideBell } from './ai.js';
import { startTimer, clearTimer } from './timer.js';

// ============================================================
// 辅助函数
// ============================================================

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

/**
 * 向房间内所有在线玩家广播各自的脱敏 ClientHalliGameState
 * 每位玩家收到的状态中隐藏了所有玩家的 Draw_Pile 具体牌面
 */
function broadcastGameState(io: SocketIOServer, room: HalliRoom): void {
  if (!room.gameState) return;

  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      const clientState = toClientGameState(room.gameState, player.id);
      io.to(player.socketId).emit('halli:game_state', clientState);
    }
  }
}

/**
 * 广播房间信息（不含 gameState，用于房间等待页面）
 */
function broadcastRoomState(io: SocketIOServer, room: HalliRoom): void {
  const roomInfo = {
    id: room.id,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady,
      isHost: p.isHost,
      isAI: p.isAI,
      isConnected: p.isConnected,
    })),
    status: room.status,
    hostId: room.hostId,
    allowAI: room.allowAI,
  };

  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      io.to(player.socketId).emit('halli:room_updated', roomInfo);
    }
  }
}

/** 向房间内所有在线玩家广播事件 */
function broadcastToRoom(io: SocketIOServer, room: HalliRoom, event: string, data: unknown): void {
  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      io.to(player.socketId).emit(event, data);
    }
  }
}

// ============================================================
// 计时器管理辅助函数
// ============================================================

/**
 * 启动翻牌超时计时器（5 秒）
 * 超时后自动为当前玩家执行翻牌
 */
function startFlipTimer(io: SocketIOServer, room: HalliRoom): void {
  if (!room.gameState || room.gameState.phase !== 'flip') return;

  // 清除旧的翻牌计时器
  clearTimer(room.id, 'flip');

  startTimer(room.id, 'flip', () => {
    const currentRoom = getRoom(room.id);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'flip') return;

    const currentPlayer = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isEliminated) return;

    // 自动翻牌
    executeFlipCard(io, currentRoom, currentPlayer.id);
  });
}

/**
 * 启动按铃窗口计时器（3 秒）
 * 窗口结束后自动推进到下一回合
 */
function startBellWindowTimer(io: SocketIOServer, room: HalliRoom): void {
  if (!room.gameState || room.gameState.phase !== 'bell_window') return;

  // 清除旧的按铃窗口计时器
  clearTimer(room.id, 'bell_window');

  startTimer(room.id, 'bell_window', () => {
    const currentRoom = getRoom(room.id);
    if (!currentRoom?.gameState) return;
    // 只有仍在 bell_window 阶段才推进（可能已被按铃中断）
    if (currentRoom.gameState.phase !== 'bell_window') return;

    // 窗口期结束无人按铃，检查淘汰后推进到下一回合
    currentRoom.gameState = checkElimination(currentRoom.gameState);
    currentRoom.gameState = checkVictory(currentRoom.gameState);

    if (currentRoom.gameState.phase === 'finished') {
      handleGameOver(io, currentRoom);
      return;
    }

    // 推进到下一回合
    currentRoom.gameState = advanceTurn(currentRoom.gameState);
    broadcastGameState(io, currentRoom);

    // 启动下一回合的翻牌流程
    startTurnFlow(io, currentRoom);
  });
}

/**
 * 触发 AI 翻牌
 * 当前玩家是 AI 或掉线玩家时，启动 AI 翻牌计时器
 */
function triggerAIFlip(io: SocketIOServer, room: HalliRoom): void {
  if (!room.gameState || room.gameState.phase !== 'flip') return;

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.isEliminated) return;

  // 只有 AI 或掉线玩家才自动翻牌
  if (!currentPlayer.isAI && currentPlayer.isConnected) return;

  clearTimer(room.id, 'ai_flip');

  const decision = aiDecideFlip(room.gameState, currentPlayer.id);

  startTimer(room.id, 'ai_flip', () => {
    const currentRoom = getRoom(room.id);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'flip') return;

    const player = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
    if (!player || player.id !== currentPlayer.id) return;

    executeFlipCard(io, currentRoom, player.id);
  }, decision.delay);
}

/**
 * 触发 AI 按铃
 * 翻牌后如果满足按铃条件，为每个 AI 玩家启动按铃计时器
 */
function triggerAIBell(io: SocketIOServer, room: HalliRoom): void {
  if (!room.gameState || room.gameState.phase !== 'bell_window') return;

  for (const player of room.gameState.players) {
    // 跳过已淘汰、非 AI、掉线的真人玩家
    if (player.isEliminated) continue;
    if (!player.isAI && player.isConnected) continue;

    const decision = aiDecideBell(room.gameState, player.id);
    if (decision.action === 'skip') continue;

    // 为该 AI 玩家启动按铃计时器（使用 ai_bell 类型，key 包含玩家 ID）
    // 注意：timer 模块的 ai_bell 类型是共享的，这里用 setTimeout 直接管理
    const delay = decision.delay;
    const playerId = player.id;
    const roomId = room.id;

    // 使用 startTimer 启动 AI 按铃（所有 AI 共享同一个 ai_bell 计时器类型）
    // 为避免覆盖，直接用 setTimeout 并在按铃时检查状态
    setTimeout(() => {
      const currentRoom = getRoom(roomId);
      if (!currentRoom?.gameState) return;
      if (currentRoom.gameState.phase !== 'bell_window') return;

      // 确认该 AI 玩家仍未淘汰
      const aiPlayer = currentRoom.gameState.players.find((p) => p.id === playerId);
      if (!aiPlayer || aiPlayer.isEliminated) return;

      executeRingBell(io, currentRoom, playerId);
    }, delay);
  }
}

// ============================================================
// 核心执行函数
// ============================================================

/**
 * 启动回合流程
 * 根据当前玩家类型决定启动翻牌超时还是 AI 翻牌
 */
function startTurnFlow(io: SocketIOServer, room: HalliRoom): void {
  if (!room.gameState || room.gameState.phase !== 'flip') return;

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.isEliminated) return;

  if (currentPlayer.isAI || !currentPlayer.isConnected) {
    // AI 或掉线玩家：启动 AI 翻牌
    triggerAIFlip(io, room);
  } else {
    // 真人玩家：启动翻牌超时计时器
    startFlipTimer(io, room);
  }
}

/**
 * 执行翻牌操作
 * 调用引擎 flipCard，广播状态，启动按铃窗口
 */
function executeFlipCard(io: SocketIOServer, room: HalliRoom, playerId: string): void {
  if (!room.gameState) return;

  const prevState = room.gameState;
  room.gameState = flipCard(room.gameState, playerId);

  // 翻牌失败（状态未变）
  if (room.gameState === prevState) return;

  // 清除翻牌相关计时器
  clearTimer(room.id, 'flip');
  clearTimer(room.id, 'ai_flip');

  // 获取翻开的牌（当前玩家 Discard_Pile 堆顶）
  const currentPlayer = room.gameState.players.find((p) => p.id === playerId);
  const flippedCard = currentPlayer?.discardPile[currentPlayer.discardPile.length - 1] ?? null;

  // 广播翻牌通知
  broadcastToRoom(io, room, 'halli:card_flipped', {
    playerId,
    card: flippedCard,
  });

  // 广播游戏状态
  broadcastGameState(io, room);

  // 检查淘汰和胜利
  room.gameState = checkElimination(room.gameState);
  room.gameState = checkVictory(room.gameState);

  if (room.gameState.phase === 'finished') {
    handleGameOver(io, room);
    return;
  }

  // 启动按铃窗口计时器（3 秒）
  startBellWindowTimer(io, room);

  // 触发 AI 按铃
  triggerAIBell(io, room);
}

/**
 * 执行按铃操作
 * 调用引擎 ringBell，清除计时器，广播结果
 */
function executeRingBell(io: SocketIOServer, room: HalliRoom, playerId: string): void {
  if (!room.gameState) return;
  if (room.gameState.phase !== 'bell_window') return;

  // 记录按铃前的状态用于判断结果
  const bellConditionMet = room.gameState.bellConditionMet;

  const prevState = room.gameState;
  room.gameState = ringBell(room.gameState, playerId);

  // 按铃失败（状态未变）
  if (room.gameState === prevState) return;

  // 清除按铃窗口计时器和所有 AI 按铃计时器
  clearTimer(room.id, 'bell_window');
  clearTimer(room.id, 'ai_bell');

  // 获取按铃玩家名称
  const player = room.players.find((p) => p.id === playerId);
  const playerName = player?.name ?? '未知玩家';

  // 广播按铃判定结果
  broadcastToRoom(io, room, 'halli:bell_result', {
    playerId,
    correct: bellConditionMet,
    details: bellConditionMet
      ? `${playerName} 正确按铃，收集了所有翻牌堆的牌`
      : `${playerName} 错误按铃，需要向其他玩家分发牌`,
  });

  // 检查是否有玩家被淘汰
  const eliminatedPlayers = room.gameState.players.filter(
    (p) => p.isEliminated && !prevState.players.find((pp) => pp.id === p.id)?.isEliminated,
  );
  for (const ep of eliminatedPlayers) {
    broadcastToRoom(io, room, 'halli:player_eliminated', {
      playerId: ep.id,
      rank: ep.eliminationOrder,
    });
  }

  // 广播游戏状态
  broadcastGameState(io, room);

  // 检查游戏是否结束
  if (room.gameState.phase === 'finished') {
    handleGameOver(io, room);
    return;
  }

  // 启动下一回合的翻牌流程
  startTurnFlow(io, room);
}

/**
 * 处理游戏结束
 */
function handleGameOver(io: SocketIOServer, room: HalliRoom): void {
  if (!room.gameState) return;

  // 清除所有计时器
  clearTimer(room.id);
  setRoomStatus(room.id, 'finished');

  // 构建排名列表（按淘汰顺序倒序，最后淘汰的排名靠前，胜利者排第一）
  const rankings = room.gameState.players
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      rank: p.isEliminated ? p.eliminationOrder! : 0, // 胜利者 rank 为 0（最高）
      isWinner: p.id === room.gameState!.winnerId,
    }))
    .sort((a, b) => a.rank - b.rank);

  broadcastToRoom(io, room, 'halli:game_over', {
    winnerId: room.gameState.winnerId,
    rankings,
  });

  broadcastGameState(io, room);
}

// ============================================================
// 初始化德国心脏病 Socket 事件
// ============================================================

/**
 * 初始化德国心脏病 Socket.io 事件处理
 * 接收已有的 Socket.io Server 实例（与 UNO、Catan 共享），通过 halli: 前缀隔离事件
 */
export function initHalliSocket(io: SocketIOServer): void {
  console.log('[Halli Socket] 初始化德国心脏病 Socket 事件');

  io.on('connection', (socket: Socket) => {
    console.log('[Halli Socket] 新连接:', socket.id);
    // ========================================================
    // halli:create_room — 创建房间
    // ========================================================
    socket.on('halli:create_room', (data: unknown) => {
      console.log('[Halli Socket] 收到 create_room:', data, 'from:', socket.id);
      try {
        const { playerName } = (data ?? {}) as { playerName?: string };
        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('halli:error', { message: nameErr });
          return;
        }

        const result = createRoom(playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('halli:error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(`halli:${room.id}`);

        socket.emit('halli:room_created', { roomId: room.id, playerId });
        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Halli Socket] create_room 错误:', err);
        socket.emit('halli:error', { message: '创建房间失败' });
      }
    });

    // ========================================================
    // halli:join_room — 加入房间
    // ========================================================
    socket.on('halli:join_room', (data: unknown) => {
      try {
        const { roomId, playerName } = (data ?? {}) as { roomId?: string; playerName?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('halli:error', { message: roomIdErr });
          return;
        }

        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('halli:error', { message: nameErr });
          return;
        }

        const result = joinRoom(roomId!, playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('halli:error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(`halli:${room.id}`);

        socket.emit('halli:room_joined', { roomId: room.id, playerId });
        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Halli Socket] join_room 错误:', err);
        socket.emit('halli:error', { message: '加入房间失败' });
      }
    });

    // ========================================================
    // halli:leave_room — 离开房间
    // ========================================================
    socket.on('halli:leave_room', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('halli:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('halli:error', { message: '你不在该房间中' });
          return;
        }

        const room = leaveRoom(roomId!, mapping.player.id);
        socket.leave(`halli:${roomId!}`);

        if (room) {
          // 如果游戏进行中且没有真人玩家了，结束游戏
          if (room.gameState && room.players.filter((p) => !p.isAI).length === 0) {
            clearTimer(roomId!);
            room.gameState.phase = 'finished';
            setRoomStatus(roomId!, 'finished');
          }
          broadcastRoomState(io, room);
          if (room.gameState) {
            broadcastGameState(io, room);
          }
        }
      } catch (err) {
        console.error('[Halli Socket] leave_room 错误:', err);
        socket.emit('halli:error', { message: '离开房间失败' });
      }
    });

    // ========================================================
    // halli:player_ready — 切换准备状态
    // ========================================================
    socket.on('halli:player_ready', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('halli:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('halli:error', { message: '你不在该房间中' });
          return;
        }

        const room = toggleReady(roomId!, mapping.player.id);
        if (!room) {
          socket.emit('halli:error', { message: '操作失败' });
          return;
        }

        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Halli Socket] player_ready 错误:', err);
        socket.emit('halli:error', { message: '准备操作失败' });
      }
    });

    // ========================================================
    // halli:add_ai — 添加 AI 玩家（仅房主）
    // ========================================================
    socket.on('halli:add_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('halli:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('halli:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('halli:error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.player.id) { socket.emit('halli:error', { message: '只有房主可以添加人机' }); return; }

        const result = addAIPlayer(roomId!);
        if ('error' in result) { socket.emit('halli:error', { message: result.error }); return; }

        broadcastRoomState(io, result);
      } catch (err) {
        console.error('[Halli Socket] add_ai 错误:', err);
        socket.emit('halli:error', { message: '添加人机失败' });
      }
    });

    // ========================================================
    // halli:remove_ai — 移除 AI 玩家（仅房主）
    // ========================================================
    socket.on('halli:remove_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('halli:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('halli:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('halli:error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.player.id) { socket.emit('halli:error', { message: '只有房主可以移除人机' }); return; }

        const result = removeAIPlayer(roomId!);
        if ('error' in result) { socket.emit('halli:error', { message: result.error }); return; }

        broadcastRoomState(io, result);
      } catch (err) {
        console.error('[Halli Socket] remove_ai 错误:', err);
        socket.emit('halli:error', { message: '移除人机失败' });
      }
    });

    // ========================================================
    // halli:start_game — 开始游戏（仅房主）
    // ========================================================
    socket.on('halli:start_game', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('halli:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('halli:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room) {
          socket.emit('halli:error', { message: '房间不存在' });
          return;
        }

        if (room.hostId !== mapping.player.id) {
          socket.emit('halli:error', { message: '只有房主可以开始游戏' });
          return;
        }

        if (!canStartGame(room)) {
          socket.emit('halli:error', { message: '条件不满足，无法开始' });
          return;
        }

        // 初始化游戏状态（洗牌并发牌）
        const gameState = initGame(room.players, roomId!);
        room.gameState = gameState;
        room.status = 'playing';
        setRoomStatus(roomId!, 'playing');

        // 向每位玩家广播游戏开始（脱敏版本）
        for (const player of room.players) {
          if (player.isConnected && player.socketId) {
            const clientState = toClientGameState(gameState, player.id);
            io.to(player.socketId).emit('halli:game_started', clientState);
          }
        }

        broadcastGameState(io, room);

        // 启动第一回合的翻牌流程
        startTurnFlow(io, room);
      } catch (err) {
        console.error('[Halli Socket] start_game 错误:', err);
        socket.emit('halli:error', { message: '开始游戏失败' });
      }
    });

    // ========================================================
    // halli:flip_card — 翻牌
    // ========================================================
    socket.on('halli:flip_card', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('halli:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('halli:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('halli:error', { message: '游戏未开始' });
          return;
        }

        // 校验游戏阶段
        if (room.gameState.phase !== 'flip') {
          socket.emit('halli:error', { message: '当前阶段不允许此操作' });
          return;
        }

        // 校验是否为当前回合玩家
        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.player.id) {
          socket.emit('halli:error', { message: '不是你的回合' });
          return;
        }

        // 校验玩家未淘汰
        if (currentPlayer.isEliminated) {
          socket.emit('halli:error', { message: '你已被淘汰' });
          return;
        }

        // 执行翻牌
        executeFlipCard(io, room, mapping.player.id);
      } catch (err) {
        console.error('[Halli Socket] flip_card 错误:', err);
        socket.emit('halli:error', { message: '翻牌失败' });
      }
    });

    // ========================================================
    // halli:ring_bell — 按铃
    // ========================================================
    socket.on('halli:ring_bell', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('halli:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('halli:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('halli:error', { message: '游戏未开始' });
          return;
        }

        // 校验游戏阶段：必须在按铃窗口期
        if (room.gameState.phase !== 'bell_window') {
          socket.emit('halli:error', { message: '当前不在按铃窗口期' });
          return;
        }

        // 校验玩家未淘汰
        const player = room.gameState.players.find((p) => p.id === mapping.player.id);
        if (!player || player.isEliminated) {
          socket.emit('halli:error', { message: '你已被淘汰' });
          return;
        }

        // 执行按铃
        executeRingBell(io, room, mapping.player.id);
      } catch (err) {
        console.error('[Halli Socket] ring_bell 错误:', err);
        socket.emit('halli:error', { message: '按铃失败' });
      }
    });

    // ========================================================
    // halli:reconnect — 断线重连
    // ========================================================
    socket.on('halli:reconnect', (data: unknown) => {
      try {
        const { roomId, playerId } = (data ?? {}) as { roomId?: string; playerId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('halli:error', { message: roomIdErr });
          return;
        }

        const playerIdErr = validateString(playerId, 'playerId');
        if (playerIdErr) {
          socket.emit('halli:error', { message: playerIdErr });
          return;
        }

        const room = handleReconnect(roomId!, playerId!, socket.id);
        if (!room) {
          socket.emit('halli:error', { message: '重连失败：房间或玩家不存在' });
          return;
        }

        socket.join(`halli:${roomId!}`);

        // 广播重连通知
        broadcastToRoom(io, room, 'halli:player_reconnected', { playerId });

        // 发送当前状态
        if (room.gameState) {
          const clientState = toClientGameState(room.gameState, playerId!);
          socket.emit('halli:game_state', clientState);
          broadcastGameState(io, room);
        } else {
          broadcastRoomState(io, room);
        }
      } catch (err) {
        console.error('[Halli Socket] reconnect 错误:', err);
        socket.emit('halli:error', { message: '重连失败' });
      }
    });

    // ========================================================
    // halli:chat — 聊天消息
    // ========================================================
    socket.on('halli:chat', (data: unknown) => {
      try {
        const { roomId, message } = (data ?? {}) as { roomId?: string; message?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('halli:error', { message: roomIdErr }); return; }

        const msgErr = validateString(message, 'message');
        if (msgErr) { socket.emit('halli:error', { message: msgErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('halli:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('halli:error', { message: '房间不存在' }); return; }

        // 限制消息长度
        const trimmedMessage = message!.trim().slice(0, 200);

        broadcastToRoom(io, room, 'halli:chat_message', {
          playerId: mapping.player.id,
          playerName: mapping.player.name,
          message: trimmedMessage,
        });
      } catch (err) {
        console.error('[Halli Socket] chat 错误:', err);
        socket.emit('halli:error', { message: '发送消息失败' });
      }
    });

    // ========================================================
    // disconnect — 断线处理（德国心脏病）
    // ========================================================
    socket.on('disconnect', () => {
      try {
        const disconnectInfo = handleDisconnect(socket.id);
        if (!disconnectInfo) return;

        const { roomId: rid, playerId: pid } = disconnectInfo;
        const room = getRoom(rid);
        if (!room) return;

        // 广播断线通知
        broadcastToRoom(io, room, 'halli:player_disconnected', { playerId: pid });

        if (room.gameState && room.gameState.phase !== 'finished') {
          broadcastGameState(io, room);

          // 如果当前轮到掉线玩家且处于翻牌阶段，启动 AI 翻牌接管
          if (room.gameState.phase === 'flip') {
            const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
            if (currentPlayer && currentPlayer.id === pid) {
              clearTimer(rid, 'flip');
              triggerAIFlip(io, room);
            }
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
                broadcastRoomState(io, updatedRoom);
              }
            }
          }, 30 * 1000);
        }
      } catch (err) {
        console.error('[Halli Socket] disconnect 错误:', err);
      }
    });
  });
}
