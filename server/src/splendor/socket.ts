/**
 * 璀璨宝石 WebSocket 事件处理层
 *
 * 初始化 Socket.io 事件监听，注册所有 splendor: 前缀的客户端到服务端事件，
 * 实现参数校验、游戏状态广播（脱敏）、回合超时、AI 触发、断线重连。
 * 参考 Halli Galli socket.ts 的实现模式。
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import type { SplendorRoom, GemColor, CardLevel, GemMap } from './types.js';
import { GEM_COLORS } from './types.js';
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
  takeThreeGems,
  takeTwoGems,
  buyCard,
  reserveDisplayCard,
  reserveDeckCard,
  returnGems,
  selectNoble,
  checkNobleVisit,
  autoNobleVisit,
  advanceTurn,
  checkVictory,
  toClientGameState,
  getFinalRankings,
  getTotalGems,
} from './engine.js';
import { aiDecideAction, aiDecideReturnGems, aiDecideNoble } from './ai.js';
import { startTimer, clearTimer } from './timer.js';
import { MAX_GEMS_IN_HAND } from './types.js';

// ============================================================
// 辅助函数
// ============================================================

/** 基本参数校验 */
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

/** 向房间内所有在线玩家广播各自的脱敏游戏状态 */
function broadcastGameState(io: SocketIOServer, room: SplendorRoom): void {
  if (!room.gameState) return;
  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      const clientState = toClientGameState(room.gameState, player.id);
      io.to(player.socketId).emit('splendor:game_state', clientState);
    }
  }
}

/** 广播房间信息（不含 gameState，用于房间等待页面） */
function broadcastRoomState(io: SocketIOServer, room: SplendorRoom): void {
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
      io.to(player.socketId).emit('splendor:room_updated', roomInfo);
    }
  }
}

/** 向房间内所有在线玩家广播事件 */
function broadcastToRoom(io: SocketIOServer, room: SplendorRoom, event: string, data: unknown): void {
  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      io.to(player.socketId).emit(event, data);
    }
  }
}

// ============================================================
// 回合流程管理
// ============================================================

/**
 * 执行操作后的后续流程：
 * 检查宝石超限 → 贵族拜访 → 胜利判定 → 推进回合
 */
function postActionFlow(io: SocketIOServer, room: SplendorRoom): void {
  if (!room.gameState) return;

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];

  // 1. 检查是否需要归还宝石
  const totalGems = getTotalGems(currentPlayer.gems);
  if (totalGems > MAX_GEMS_IN_HAND) {
    room.gameState = { ...room.gameState, phase: 'return_gems' };
    broadcastGameState(io, room);

    // 如果是 AI 或掉线玩家，自动归还
    if (currentPlayer.isAI || !currentPlayer.isConnected) {
      const excessCount = totalGems - MAX_GEMS_IN_HAND;
      const gemsToReturn = aiDecideReturnGems(room.gameState, currentPlayer.id, excessCount);
      const result = returnGems(room.gameState, currentPlayer.id, gemsToReturn);
      if (!('error' in result)) {
        room.gameState = result;
      }
    } else {
      // 真人玩家：发送归还请求，启动超时计时器
      const excessCount = totalGems - MAX_GEMS_IN_HAND;
      io.to(currentPlayer.socketId).emit('splendor:require_return_gems', { excessCount });
      startTimer(room.id, 'return_gems', () => {
        const currentRoom = getRoom(room.id);
        if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'return_gems') return;
        // 超时自动归还
        const cp = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
        const excess = getTotalGems(cp.gems) - MAX_GEMS_IN_HAND;
        const autoReturn = aiDecideReturnGems(currentRoom.gameState, cp.id, excess);
        const result = returnGems(currentRoom.gameState, cp.id, autoReturn);
        if (!('error' in result)) {
          currentRoom.gameState = result;
          postNobleCheck(io, currentRoom);
        }
      });
      return;
    }
  }

  // 继续贵族检查流程
  postNobleCheck(io, room);
}

/** 贵族检查 → 胜利判定 → 推进回合 */
function postNobleCheck(io: SocketIOServer, room: SplendorRoom): void {
  if (!room.gameState) return;

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];

  // 2. 检查贵族拜访
  const visitableNobles = checkNobleVisit(room.gameState, currentPlayer.id);

  if (visitableNobles.length > 1) {
    // 多位贵族：需要玩家选择
    room.gameState = { ...room.gameState, phase: 'choose_noble' };
    broadcastGameState(io, room);

    if (currentPlayer.isAI || !currentPlayer.isConnected) {
      // AI 自动选择第一个
      const nobleId = aiDecideNoble(room.gameState, currentPlayer.id, visitableNobles);
      const result = selectNoble(room.gameState, currentPlayer.id, nobleId);
      if (!('error' in result)) {
        room.gameState = result;
        broadcastToRoom(io, room, 'splendor:noble_visited', {
          playerId: currentPlayer.id,
          nobleId,
        });
      }
    } else {
      // 真人玩家：发送选择请求
      io.to(currentPlayer.socketId).emit('splendor:choose_noble', { nobles: visitableNobles });
      startTimer(room.id, 'choose_noble', () => {
        const currentRoom = getRoom(room.id);
        if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'choose_noble') return;
        // 超时自动选择第一个
        const cp = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
        const nobles = checkNobleVisit(currentRoom.gameState, cp.id);
        if (nobles.length > 0) {
          const result = selectNoble(currentRoom.gameState, cp.id, nobles[0].id);
          if (!('error' in result)) {
            currentRoom.gameState = result;
            broadcastToRoom(io, currentRoom, 'splendor:noble_visited', {
              playerId: cp.id,
              nobleId: nobles[0].id,
            });
            postVictoryCheck(io, currentRoom);
          }
        }
      });
      return;
    }
  } else if (visitableNobles.length === 1) {
    // 仅一位贵族：自动拜访
    room.gameState = autoNobleVisit(room.gameState, currentPlayer.id);
    broadcastToRoom(io, room, 'splendor:noble_visited', {
      playerId: currentPlayer.id,
      nobleId: visitableNobles[0].id,
    });
  }

  // 继续胜利判定
  postVictoryCheck(io, room);
}

/** 胜利判定 → 推进回合 */
function postVictoryCheck(io: SocketIOServer, room: SplendorRoom): void {
  if (!room.gameState) return;

  // 3. 检查胜利条件
  room.gameState = checkVictory(room.gameState);

  if (room.gameState.phase === 'finished') {
    handleGameOver(io, room);
    return;
  }

  // 4. 推进到下一位玩家回合
  room.gameState = advanceTurn(room.gameState);
  broadcastGameState(io, room);

  // 启动下一回合流程
  startTurnFlow(io, room);
}

/** 启动回合流程 */
function startTurnFlow(io: SocketIOServer, room: SplendorRoom): void {
  if (!room.gameState) return;
  if (room.gameState.phase === 'finished') return;

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
  if (!currentPlayer) return;

  // 清除旧计时器
  clearTimer(room.id, 'turn');
  clearTimer(room.id, 'ai_action');

  if (currentPlayer.isAI || !currentPlayer.isConnected) {
    // AI 或掉线玩家：延迟后自动操作
    startTimer(room.id, 'ai_action', () => {
      const currentRoom = getRoom(room.id);
      if (!currentRoom?.gameState) return;
      if (currentRoom.gameState.phase !== 'player_turn' && currentRoom.gameState.phase !== 'last_round') return;

      const cp = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
      if (!cp || cp.id !== currentPlayer.id) return;

      executeAIAction(io, currentRoom, cp.id);
    });
  } else {
    // 真人玩家：启动回合超时计时器（60 秒）
    startTimer(room.id, 'turn', () => {
      const currentRoom = getRoom(room.id);
      if (!currentRoom?.gameState) return;
      if (currentRoom.gameState.phase !== 'player_turn' && currentRoom.gameState.phase !== 'last_round') return;

      const cp = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
      if (!cp || cp.id !== currentPlayer.id) return;

      // 超时自动操作：拿取可用宝石
      executeAIAction(io, currentRoom, cp.id);
    });
  }
}

/** 执行 AI 操作 */
function executeAIAction(io: SocketIOServer, room: SplendorRoom, playerId: string): void {
  if (!room.gameState) return;

  const action = aiDecideAction(room.gameState, playerId);
  let result: typeof room.gameState | { error: string };

  switch (action.type) {
    case 'take_three':
      result = takeThreeGems(room.gameState, playerId, action.gems);
      break;
    case 'take_two':
      result = takeTwoGems(room.gameState, playerId, action.gem);
      break;
    case 'buy_card':
      result = buyCard(room.gameState, playerId, action.cardId);
      break;
    case 'reserve_card':
      result = reserveDisplayCard(room.gameState, playerId, action.cardId);
      break;
    case 'reserve_deck':
      result = reserveDeckCard(room.gameState, playerId, action.level);
      break;
  }

  if ('error' in result) {
    // AI 操作失败，尝试兜底拿取宝石
    const available = GEM_COLORS.filter(c => room.gameState!.gemPool[c] > 0);
    if (available.length > 0) {
      result = takeThreeGems(room.gameState, playerId, available.slice(0, Math.min(3, available.length)));
    }
    if ('error' in result) {
      // 实在无法操作，跳过回合
      room.gameState = advanceTurn(room.gameState);
      broadcastGameState(io, room);
      startTurnFlow(io, room);
      return;
    }
  }

  room.gameState = result as typeof room.gameState;
  broadcastGameState(io, room);
  postActionFlow(io, room);
}

/** 处理游戏结束 */
function handleGameOver(io: SocketIOServer, room: SplendorRoom): void {
  if (!room.gameState) return;

  clearTimer(room.id);
  setRoomStatus(room.id, 'finished');

  const rankings = getFinalRankings(room.gameState);

  broadcastToRoom(io, room, 'splendor:game_over', {
    winnerId: room.gameState.winnerId,
    rankings,
  });

  broadcastGameState(io, room);
}

// ============================================================
// 初始化璀璨宝石 Socket 事件
// ============================================================

export function initSplendorSocket(io: SocketIOServer): void {
  console.log('[Splendor Socket] 初始化璀璨宝石 Socket 事件');

  io.on('connection', (socket: Socket) => {
    // ========================================================
    // splendor:create_room — 创建房间
    // ========================================================
    socket.on('splendor:create_room', (data: unknown) => {
      try {
        const { playerName } = (data ?? {}) as { playerName?: string };
        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) { socket.emit('splendor:error', { message: nameErr }); return; }

        const result = createRoom(playerName!.trim(), socket.id);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        const { room, playerId } = result;
        socket.join(`splendor:${room.id}`);
        socket.emit('splendor:room_created', { roomId: room.id, playerId });
        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Splendor Socket] create_room 错误:', err);
        socket.emit('splendor:error', { message: '创建房间失败' });
      }
    });

    // ========================================================
    // splendor:join_room — 加入房间
    // ========================================================
    socket.on('splendor:join_room', (data: unknown) => {
      try {
        const { roomId, playerName } = (data ?? {}) as { roomId?: string; playerName?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) { socket.emit('splendor:error', { message: nameErr }); return; }

        const result = joinRoom(roomId!, playerName!.trim(), socket.id);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        const { room, playerId } = result;
        socket.join(`splendor:${room.id}`);
        socket.emit('splendor:room_joined', { roomId: room.id, playerId });
        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Splendor Socket] join_room 错误:', err);
        socket.emit('splendor:error', { message: '加入房间失败' });
      }
    });

    // ========================================================
    // splendor:leave_room — 离开房间
    // ========================================================
    socket.on('splendor:leave_room', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = leaveRoom(roomId!, mapping.player.id);
        socket.leave(`splendor:${roomId!}`);

        if (room) {
          if (room.gameState && room.players.filter((p) => !p.isAI).length === 0) {
            clearTimer(roomId!);
            room.gameState.phase = 'finished';
            setRoomStatus(roomId!, 'finished');
          }
          broadcastRoomState(io, room);
          if (room.gameState) broadcastGameState(io, room);
        }
      } catch (err) {
        console.error('[Splendor Socket] leave_room 错误:', err);
        socket.emit('splendor:error', { message: '离开房间失败' });
      }
    });

    // ========================================================
    // splendor:player_ready — 切换准备状态
    // ========================================================
    socket.on('splendor:player_ready', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = toggleReady(roomId!, mapping.player.id);
        if (!room) { socket.emit('splendor:error', { message: '操作失败' }); return; }

        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Splendor Socket] player_ready 错误:', err);
        socket.emit('splendor:error', { message: '准备操作失败' });
      }
    });

    // ========================================================
    // splendor:add_ai — 添加 AI 玩家（仅房主）
    // ========================================================
    socket.on('splendor:add_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('splendor:error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.player.id) { socket.emit('splendor:error', { message: '只有房主可以添加人机' }); return; }

        const result = addAIPlayer(roomId!);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        broadcastRoomState(io, result);
      } catch (err) {
        console.error('[Splendor Socket] add_ai 错误:', err);
        socket.emit('splendor:error', { message: '添加人机失败' });
      }
    });

    // ========================================================
    // splendor:remove_ai — 移除 AI 玩家（仅房主）
    // ========================================================
    socket.on('splendor:remove_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('splendor:error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.player.id) { socket.emit('splendor:error', { message: '只有房主可以移除人机' }); return; }

        const result = removeAIPlayer(roomId!);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        broadcastRoomState(io, result);
      } catch (err) {
        console.error('[Splendor Socket] remove_ai 错误:', err);
        socket.emit('splendor:error', { message: '移除人机失败' });
      }
    });

    // ========================================================
    // splendor:start_game — 开始游戏（仅房主）
    // ========================================================
    socket.on('splendor:start_game', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('splendor:error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.player.id) { socket.emit('splendor:error', { message: '只有房主可以开始游戏' }); return; }
        if (!canStartGame(room)) { socket.emit('splendor:error', { message: '条件不满足，无法开始' }); return; }

        const gameState = initGame(room.players, roomId!);
        room.gameState = gameState;
        room.status = 'playing';
        setRoomStatus(roomId!, 'playing');

        // 向每位玩家广播游戏开始（脱敏版本）
        for (const player of room.players) {
          if (player.isConnected && player.socketId) {
            const clientState = toClientGameState(gameState, player.id);
            io.to(player.socketId).emit('splendor:game_started', clientState);
          }
        }

        broadcastGameState(io, room);
        startTurnFlow(io, room);
      } catch (err) {
        console.error('[Splendor Socket] start_game 错误:', err);
        socket.emit('splendor:error', { message: '开始游戏失败' });
      }
    });

    // ========================================================
    // splendor:take_gems — 拿取宝石
    // ========================================================
    socket.on('splendor:take_gems', (data: unknown) => {
      try {
        const { roomId, gems, mode } = (data ?? {}) as { roomId?: string; gems?: GemColor[]; mode?: 'three' | 'two' };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('splendor:error', { message: '游戏未开始' }); return; }

        let result: typeof room.gameState | { error: string };
        if (mode === 'two' && gems && gems.length === 1) {
          result = takeTwoGems(room.gameState, mapping.player.id, gems[0]);
        } else if (gems && gems.length >= 1) {
          result = takeThreeGems(room.gameState, mapping.player.id, gems);
        } else {
          socket.emit('splendor:error', { message: '参数错误：宝石选择无效' });
          return;
        }

        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        room.gameState = result;
        clearTimer(room.id, 'turn');
        broadcastGameState(io, room);
        postActionFlow(io, room);
      } catch (err) {
        console.error('[Splendor Socket] take_gems 错误:', err);
        socket.emit('splendor:error', { message: '拿取宝石失败' });
      }
    });

    // ========================================================
    // splendor:buy_card — 购买发展卡
    // ========================================================
    socket.on('splendor:buy_card', (data: unknown) => {
      try {
        const { roomId, cardId } = (data ?? {}) as { roomId?: string; cardId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        const cardIdErr = validateString(cardId, 'cardId');
        if (cardIdErr) { socket.emit('splendor:error', { message: cardIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('splendor:error', { message: '游戏未开始' }); return; }

        const result = buyCard(room.gameState, mapping.player.id, cardId!);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        room.gameState = result;
        clearTimer(room.id, 'turn');
        broadcastGameState(io, room);
        postActionFlow(io, room);
      } catch (err) {
        console.error('[Splendor Socket] buy_card 错误:', err);
        socket.emit('splendor:error', { message: '购买卡牌失败' });
      }
    });

    // ========================================================
    // splendor:reserve_card — 预留展示区发展卡
    // ========================================================
    socket.on('splendor:reserve_card', (data: unknown) => {
      try {
        const { roomId, cardId } = (data ?? {}) as { roomId?: string; cardId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        const cardIdErr = validateString(cardId, 'cardId');
        if (cardIdErr) { socket.emit('splendor:error', { message: cardIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('splendor:error', { message: '游戏未开始' }); return; }

        const result = reserveDisplayCard(room.gameState, mapping.player.id, cardId!);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        room.gameState = result;
        clearTimer(room.id, 'turn');
        broadcastGameState(io, room);
        postActionFlow(io, room);
      } catch (err) {
        console.error('[Splendor Socket] reserve_card 错误:', err);
        socket.emit('splendor:error', { message: '预留卡牌失败' });
      }
    });

    // ========================================================
    // splendor:reserve_deck — 预留牌堆顶部发展卡（盲抽）
    // ========================================================
    socket.on('splendor:reserve_deck', (data: unknown) => {
      try {
        const { roomId, level } = (data ?? {}) as { roomId?: string; level?: number };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        if (level !== 1 && level !== 2 && level !== 3) {
          socket.emit('splendor:error', { message: '参数错误：等级必须为1、2或3' });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('splendor:error', { message: '游戏未开始' }); return; }

        const result = reserveDeckCard(room.gameState, mapping.player.id, level as CardLevel);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        room.gameState = result;
        clearTimer(room.id, 'turn');
        broadcastGameState(io, room);
        postActionFlow(io, room);
      } catch (err) {
        console.error('[Splendor Socket] reserve_deck 错误:', err);
        socket.emit('splendor:error', { message: '盲抽预留失败' });
      }
    });

    // ========================================================
    // splendor:return_gems — 归还多余宝石
    // ========================================================
    socket.on('splendor:return_gems', (data: unknown) => {
      try {
        const { roomId, gems } = (data ?? {}) as { roomId?: string; gems?: GemMap };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        if (!gems) { socket.emit('splendor:error', { message: '参数错误：gems 不能为空' }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('splendor:error', { message: '游戏未开始' }); return; }

        const result = returnGems(room.gameState, mapping.player.id, gems);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        room.gameState = result;
        clearTimer(room.id, 'return_gems');
        broadcastGameState(io, room);
        postNobleCheck(io, room);
      } catch (err) {
        console.error('[Splendor Socket] return_gems 错误:', err);
        socket.emit('splendor:error', { message: '归还宝石失败' });
      }
    });

    // ========================================================
    // splendor:select_noble — 选择贵族拜访
    // ========================================================
    socket.on('splendor:select_noble', (data: unknown) => {
      try {
        const { roomId, nobleId } = (data ?? {}) as { roomId?: string; nobleId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        const nobleIdErr = validateString(nobleId, 'nobleId');
        if (nobleIdErr) { socket.emit('splendor:error', { message: nobleIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room?.gameState) { socket.emit('splendor:error', { message: '游戏未开始' }); return; }

        const result = selectNoble(room.gameState, mapping.player.id, nobleId!);
        if ('error' in result) { socket.emit('splendor:error', { message: result.error }); return; }

        room.gameState = result;
        clearTimer(room.id, 'choose_noble');
        broadcastToRoom(io, room, 'splendor:noble_visited', {
          playerId: mapping.player.id,
          nobleId,
        });
        broadcastGameState(io, room);
        postVictoryCheck(io, room);
      } catch (err) {
        console.error('[Splendor Socket] select_noble 错误:', err);
        socket.emit('splendor:error', { message: '选择贵族失败' });
      }
    });

    // ========================================================
    // splendor:reconnect — 断线重连
    // ========================================================
    socket.on('splendor:reconnect', (data: unknown) => {
      try {
        const { roomId, playerId } = (data ?? {}) as { roomId?: string; playerId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        const playerIdErr = validateString(playerId, 'playerId');
        if (playerIdErr) { socket.emit('splendor:error', { message: playerIdErr }); return; }

        const room = handleReconnect(roomId!, playerId!, socket.id);
        if (!room) { socket.emit('splendor:error', { message: '重连失败：房间或玩家不存在' }); return; }

        socket.join(`splendor:${roomId!}`);
        broadcastToRoom(io, room, 'splendor:player_reconnected', { playerId });

        if (room.gameState) {
          const clientState = toClientGameState(room.gameState, playerId!);
          socket.emit('splendor:game_state', clientState);
          broadcastGameState(io, room);
        } else {
          broadcastRoomState(io, room);
        }
      } catch (err) {
        console.error('[Splendor Socket] reconnect 错误:', err);
        socket.emit('splendor:error', { message: '重连失败' });
      }
    });

    // ========================================================
    // splendor:chat — 聊天消息
    // ========================================================
    socket.on('splendor:chat', (data: unknown) => {
      try {
        const { roomId, message } = (data ?? {}) as { roomId?: string; message?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('splendor:error', { message: roomIdErr }); return; }
        const msgErr = validateString(message, 'message');
        if (msgErr) { socket.emit('splendor:error', { message: msgErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('splendor:error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('splendor:error', { message: '房间不存在' }); return; }

        const trimmedMessage = message!.trim().slice(0, 200);
        broadcastToRoom(io, room, 'splendor:chat_message', {
          playerId: mapping.player.id,
          playerName: mapping.player.name,
          message: trimmedMessage,
        });
      } catch (err) {
        console.error('[Splendor Socket] chat 错误:', err);
        socket.emit('splendor:error', { message: '发送消息失败' });
      }
    });

    // ========================================================
    // disconnect — 断线处理
    // ========================================================
    socket.on('disconnect', () => {
      try {
        const disconnectInfo = handleDisconnect(socket.id);
        if (!disconnectInfo) return;

        const { roomId: rid, playerId: pid } = disconnectInfo;
        const room = getRoom(rid);
        if (!room) return;

        broadcastToRoom(io, room, 'splendor:player_disconnected', { playerId: pid });

        if (room.gameState && room.gameState.phase !== 'finished') {
          broadcastGameState(io, room);

          // 如果当前轮到掉线玩家，启动 AI 接管
          const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
          if (currentPlayer && currentPlayer.id === pid) {
            if (room.gameState.phase === 'player_turn' || room.gameState.phase === 'last_round') {
              clearTimer(rid, 'turn');
              startTimer(rid, 'ai_action', () => {
                const currentRoom = getRoom(rid);
                if (!currentRoom?.gameState) return;
                executeAIAction(io, currentRoom, pid);
              });
            } else if (room.gameState.phase === 'return_gems') {
              clearTimer(rid, 'return_gems');
              const cp = room.gameState.players[room.gameState.currentPlayerIndex];
              const excess = getTotalGems(cp.gems) - MAX_GEMS_IN_HAND;
              const autoReturn = aiDecideReturnGems(room.gameState, cp.id, excess);
              const result = returnGems(room.gameState, cp.id, autoReturn);
              if (!('error' in result)) {
                room.gameState = result;
                postNobleCheck(io, room);
              }
            } else if (room.gameState.phase === 'choose_noble') {
              clearTimer(rid, 'choose_noble');
              const nobles = checkNobleVisit(room.gameState, pid);
              if (nobles.length > 0) {
                const nobleId = aiDecideNoble(room.gameState, pid, nobles);
                const result = selectNoble(room.gameState, pid, nobleId);
                if (!('error' in result)) {
                  room.gameState = result;
                  postVictoryCheck(io, room);
                }
              }
            }
          }
        } else if (room.status === 'waiting') {
          setTimeout(() => {
            const currentRoom = getRoom(rid);
            if (!currentRoom) return;
            const disconnectedPlayer = currentRoom.players.find((p) => p.id === pid);
            if (disconnectedPlayer && !disconnectedPlayer.isConnected) {
              const updatedRoom = leaveRoom(rid, pid);
              if (updatedRoom) broadcastRoomState(io, updatedRoom);
            }
          }, 30 * 1000);
        }
      } catch (err) {
        console.error('[Splendor Socket] disconnect 错误:', err);
      }
    });
  });
}
