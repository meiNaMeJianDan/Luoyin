/**
 * 你画我猜 WebSocket 事件处理层
 *
 * 初始化 Socket.io 事件监听，注册所有 draw: 前缀的客户端到服务端事件，
 * 实现参数校验、游戏状态广播（脱敏）、绘画实时同步、猜词判定、
 * 计时器管理、断线重连。
 * 与 UNO、Catan 和 Halli Galli 模块共享同一个 httpServer，通过事件前缀隔离。
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import type { DrawRoom, DrawAction, GameConfig, TurnScore } from './types.js';
import {
  WORD_SELECT_TIMEOUT,
  HINT_REVEAL_1_PERCENT,
  HINT_REVEAL_2_PERCENT,
  TURN_SUMMARY_DURATION,
  DRAWER_DISCONNECT_TIMEOUT,
} from './types.js';
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
  deleteRoom,
} from './room.js';
import {
  initGame,
  selectWord,
  autoSelectWord,
  judgeGuess,
  endTurn,
  advanceTurn,
  revealHintChar,
  allGuessersCorrect,
  toClientGameState,
  getFinalRankings,
} from './engine.js';
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
 * 向房间内所有在线玩家广播各自的脱敏 ClientDrawGameState
 * 每位玩家收到的状态中 Guesser 看不到目标词语
 */
function broadcastGameState(io: SocketIOServer, room: DrawRoom): void {
  if (!room.gameState) return;

  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      const clientState = toClientGameState(room.gameState, player.id);
      io.to(player.socketId).emit('draw:game_state', clientState);
    }
  }
}

/**
 * 广播房间信息（不含 gameState，用于房间等待页面）
 */
function broadcastRoomState(io: SocketIOServer, room: DrawRoom): void {
  const roomInfo = {
    id: room.id,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady,
      isHost: p.isHost,
      isConnected: p.isConnected,
    })),
    status: room.status,
    hostId: room.hostId,
  };

  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      io.to(player.socketId).emit('draw:room_updated', roomInfo);
    }
  }
}

/** 向房间内所有在线玩家广播事件 */
function broadcastToRoom(io: SocketIOServer, room: DrawRoom, event: string, data: unknown): void {
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
 * 启动选词超时计时器（15 秒）
 * 超时后自动为 Drawer 随机选词
 */
function startWordSelectTimer(io: SocketIOServer, roomId: string): void {
  startTimer(roomId, 'word_select', () => {
    const room = getRoom(roomId);
    if (!room?.gameState || room.gameState.phase !== 'word_select') return;

    // 自动选词
    room.gameState = autoSelectWord(room.gameState);

    // 广播系统消息
    broadcastToRoom(io, room, 'draw:system_message', {
      message: '选词超时，已自动选择词语',
    });

    // 广播游戏状态
    broadcastGameState(io, room);

    // 启动 Turn 倒计时和提示揭示定时器
    startTurnTimers(io, room);
  }, WORD_SELECT_TIMEOUT * 1000);
}

/**
 * 启动 Turn 相关的所有计时器
 * - Turn 倒计时
 * - 提示揭示定时器（40% 和 70% 时间点）
 */
function startTurnTimers(io: SocketIOServer, room: DrawRoom): void {
  if (!room.gameState || room.gameState.phase !== 'drawing') return;

  const turnDurationMs = room.gameState.config.turnDuration * 1000;

  // Turn 倒计时：超时自动结束
  startTimer(room.id, 'turn', () => {
    const currentRoom = getRoom(room.id);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'drawing') return;

    handleTurnEnd(io, currentRoom);
  }, turnDurationMs);

  // 第一次提示揭示（40% 时间点）
  const hint1Delay = Math.floor(turnDurationMs * HINT_REVEAL_1_PERCENT);
  startTimer(room.id, 'hint_1', () => {
    const currentRoom = getRoom(room.id);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'drawing') return;

    currentRoom.gameState = revealHintChar(currentRoom.gameState);

    // 广播提示更新
    if (currentRoom.gameState.hintState) {
      const revealedSet = new Set(currentRoom.gameState.hintState.revealedIndices);
      const hint = currentRoom.gameState.hintState.chars.map((char, index) =>
        revealedSet.has(index) ? char : '_',
      );
      broadcastToRoom(io, currentRoom, 'draw:hint_update', { hint });
    }

    broadcastGameState(io, currentRoom);
  }, hint1Delay);

  // 第二次提示揭示（70% 时间点）
  const hint2Delay = Math.floor(turnDurationMs * HINT_REVEAL_2_PERCENT);
  startTimer(room.id, 'hint_2', () => {
    const currentRoom = getRoom(room.id);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'drawing') return;

    currentRoom.gameState = revealHintChar(currentRoom.gameState);

    // 广播提示更新
    if (currentRoom.gameState.hintState) {
      const revealedSet = new Set(currentRoom.gameState.hintState.revealedIndices);
      const hint = currentRoom.gameState.hintState.chars.map((char, index) =>
        revealedSet.has(index) ? char : '_',
      );
      broadcastToRoom(io, currentRoom, 'draw:hint_update', { hint });
    }

    broadcastGameState(io, currentRoom);
  }, hint2Delay);
}

// ============================================================
// 核心执行函数
// ============================================================

/**
 * 处理 Turn 结束
 * - 清除所有 Turn 相关计时器
 * - 调用 endTurn 进入 turn_summary 阶段
 * - 构建 Turn 得分记录
 * - 广播 turn_ended 事件
 * - 启动 Turn 结算展示计时器（5 秒后自动进入下一 Turn）
 */
function handleTurnEnd(io: SocketIOServer, room: DrawRoom): void {
  if (!room.gameState) return;

  // 清除 Turn 相关计时器
  clearTimer(room.id, 'turn');
  clearTimer(room.id, 'hint_1');
  clearTimer(room.id, 'hint_2');
  clearTimer(room.id, 'drawer_disconnect');

  // 结束当前 Turn
  room.gameState = endTurn(room.gameState);

  // 构建 Turn 得分记录
  const scores: TurnScore[] = room.gameState.players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    scoreGained: p.hasGuessedCorrect ? (p.guessedAt ? p.score : 0) : 0,
  }));

  // 广播 Turn 结束事件
  broadcastToRoom(io, room, 'draw:turn_ended', {
    word: room.gameState.currentWord,
    scores,
  });

  broadcastGameState(io, room);

  // 启动 Turn 结算展示计时器（5 秒后自动进入下一 Turn）
  startTimer(room.id, 'turn_summary', () => {
    const currentRoom = getRoom(room.id);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'turn_summary') return;

    // 推进到下一 Turn
    currentRoom.gameState = advanceTurn(currentRoom.gameState);

    // 检查游戏是否结束
    if (currentRoom.gameState.phase === 'finished') {
      handleGameOver(io, currentRoom);
      return;
    }

    // 广播新 Turn 开始
    const drawerPlayer = currentRoom.gameState.players[currentRoom.gameState.currentDrawerIndex];
    broadcastToRoom(io, currentRoom, 'draw:turn_started', {
      drawerId: drawerPlayer.id,
      round: currentRoom.gameState.currentRound,
      turn: currentRoom.gameState.currentTurnIndex,
    });

    // 仅向 Drawer 发送候选词语
    if (drawerPlayer.isConnected && drawerPlayer.socketId && currentRoom.gameState.candidateWords) {
      io.to(drawerPlayer.socketId).emit('draw:word_candidates', {
        words: currentRoom.gameState.candidateWords,
      });
    }

    broadcastGameState(io, currentRoom);

    // 启动选词超时计时器
    startWordSelectTimer(io, currentRoom.id);
  }, TURN_SUMMARY_DURATION * 1000);
}

/**
 * 处理游戏结束
 */
function handleGameOver(io: SocketIOServer, room: DrawRoom): void {
  if (!room.gameState) return;

  // 清除所有计时器
  clearTimer(room.id);
  setRoomStatus(room.id, 'finished');

  // 获取最终排名
  const rankings = getFinalRankings(room.gameState);

  broadcastToRoom(io, room, 'draw:game_over', { rankings });
  broadcastGameState(io, room);
}

// ============================================================
// 初始化你画我猜 Socket 事件
// ============================================================

/**
 * 初始化你画我猜 Socket.io 事件处理
 * 接收 httpServer 参数，自己创建 SocketIOServer 实例，通过 draw: 前缀隔离事件
 */
export function initDrawSocket(io: SocketIOServer): void {
  console.log('[Draw Socket] 初始化你画我猜 Socket 事件');

  io.on('connection', (socket: Socket) => {
    console.log('[Draw Socket] 新连接:', socket.id);

    // ========================================================
    // draw:create_room — 创建房间
    // ========================================================
    socket.on('draw:create_room', (data: unknown) => {
      try {
        const { playerName } = (data ?? {}) as { playerName?: string };
        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('draw:error', { message: nameErr });
          return;
        }

        const result = createRoom(playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('draw:error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(`draw:${room.id}`);

        socket.emit('draw:room_created', { roomId: room.id, playerId });
        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Draw Socket] create_room 错误:', err);
        socket.emit('draw:error', { message: '创建房间失败' });
      }
    });

    // ========================================================
    // draw:join_room — 加入房间
    // ========================================================
    socket.on('draw:join_room', (data: unknown) => {
      try {
        const { roomId, playerName } = (data ?? {}) as { roomId?: string; playerName?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('draw:error', { message: nameErr });
          return;
        }

        const result = joinRoom(roomId!, playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('draw:error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(`draw:${room.id}`);

        socket.emit('draw:room_joined', { roomId: room.id, playerId });
        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Draw Socket] join_room 错误:', err);
        socket.emit('draw:error', { message: '加入房间失败' });
      }
    });

    // ========================================================
    // draw:leave_room — 离开房间
    // ========================================================
    socket.on('draw:leave_room', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = leaveRoom(roomId!, mapping.player.id);
        socket.leave(`draw:${roomId!}`);

        if (room) {
          broadcastRoomState(io, room);
          if (room.gameState) {
            broadcastGameState(io, room);
          }
        }
      } catch (err) {
        console.error('[Draw Socket] leave_room 错误:', err);
        socket.emit('draw:error', { message: '离开房间失败' });
      }
    });

    // ========================================================
    // draw:player_ready — 切换准备状态
    // ========================================================
    socket.on('draw:player_ready', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = toggleReady(roomId!, mapping.player.id);
        if (!room) {
          socket.emit('draw:error', { message: '操作失败' });
          return;
        }

        broadcastRoomState(io, room);
      } catch (err) {
        console.error('[Draw Socket] player_ready 错误:', err);
        socket.emit('draw:error', { message: '准备操作失败' });
      }
    });

    // ========================================================
    // draw:start_game — 开始游戏（仅房主）
    // ========================================================
    socket.on('draw:start_game', (data: unknown) => {
      try {
        const { roomId, config } = (data ?? {}) as { roomId?: string; config?: GameConfig };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room) {
          socket.emit('draw:error', { message: '房间不存在' });
          return;
        }

        if (room.hostId !== mapping.player.id) {
          socket.emit('draw:error', { message: '只有房主可以开始游戏' });
          return;
        }

        if (!canStartGame(room)) {
          socket.emit('draw:error', { message: '条件不满足，无法开始' });
          return;
        }

        // 校验游戏配置
        const gameConfig: GameConfig = {
          rounds: config?.rounds && [1, 2, 3].includes(config.rounds) ? config.rounds : 2,
          turnDuration: config?.turnDuration && [60, 90, 120].includes(config.turnDuration) ? config.turnDuration : 90,
        };

        // 初始化游戏状态
        const gameState = initGame(room.players, roomId!, gameConfig);
        room.gameState = gameState;
        room.status = 'playing';
        setRoomStatus(roomId!, 'playing');

        // 向每位玩家广播游戏开始（脱敏版本）
        for (const player of room.players) {
          if (player.isConnected && player.socketId) {
            const clientState = toClientGameState(gameState, player.id);
            io.to(player.socketId).emit('draw:game_started', clientState);
          }
        }

        // 广播 Turn 开始
        const drawerPlayer = gameState.players[gameState.currentDrawerIndex];
        broadcastToRoom(io, room, 'draw:turn_started', {
          drawerId: drawerPlayer.id,
          round: gameState.currentRound,
          turn: gameState.currentTurnIndex,
        });

        // 仅向 Drawer 发送候选词语
        if (drawerPlayer.isConnected && drawerPlayer.socketId && gameState.candidateWords) {
          io.to(drawerPlayer.socketId).emit('draw:word_candidates', {
            words: gameState.candidateWords,
          });
        }

        broadcastGameState(io, room);

        // 启动选词超时计时器
        startWordSelectTimer(io, roomId!);
      } catch (err) {
        console.error('[Draw Socket] start_game 错误:', err);
        socket.emit('draw:error', { message: '开始游戏失败' });
      }
    });

    // ========================================================
    // draw:select_word — Drawer 选词
    // ========================================================
    socket.on('draw:select_word', (data: unknown) => {
      try {
        const { roomId, wordIndex } = (data ?? {}) as { roomId?: string; wordIndex?: number };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('draw:error', { message: '游戏未开始' });
          return;
        }

        // 校验阶段
        if (room.gameState.phase !== 'word_select') {
          socket.emit('draw:error', { message: '当前阶段不允许此操作' });
          return;
        }

        // 校验是否为当前 Drawer
        const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];
        if (drawerPlayer.id !== mapping.player.id) {
          socket.emit('draw:error', { message: '你不是画画玩家' });
          return;
        }

        // 校验选词索引
        if (typeof wordIndex !== 'number' || wordIndex < 0 || wordIndex > 2) {
          socket.emit('draw:error', { message: '无效的词语选择' });
          return;
        }

        // 清除选词超时计时器
        clearTimer(roomId!, 'word_select');

        // 执行选词
        room.gameState = selectWord(room.gameState, wordIndex);

        broadcastGameState(io, room);

        // 启动 Turn 倒计时和提示揭示定时器
        startTurnTimers(io, room);
      } catch (err) {
        console.error('[Draw Socket] select_word 错误:', err);
        socket.emit('draw:error', { message: '选词失败' });
      }
    });

    // ========================================================
    // draw:draw_action — 绘画动作
    // ========================================================
    socket.on('draw:draw_action', (data: unknown) => {
      try {
        const { roomId, action } = (data ?? {}) as { roomId?: string; action?: DrawAction };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('draw:error', { message: '游戏未开始' });
          return;
        }

        // 校验阶段
        if (room.gameState.phase !== 'drawing') {
          socket.emit('draw:error', { message: '当前阶段不允许此操作' });
          return;
        }

        // 校验是否为当前 Drawer
        const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];
        if (drawerPlayer.id !== mapping.player.id) {
          socket.emit('draw:error', { message: '你不是画画玩家' });
          return;
        }

        if (!action) {
          socket.emit('draw:error', { message: '参数错误：action 不能为空' });
          return;
        }

        // 将绘画动作追加到历史记录
        room.gameState.drawHistory.push(action);

        // 向除 Drawer 外的所有在线玩家广播绘画动作
        for (const player of room.players) {
          if (player.isConnected && player.socketId && player.id !== drawerPlayer.id) {
            io.to(player.socketId).emit('draw:draw_action', { action });
          }
        }
      } catch (err) {
        console.error('[Draw Socket] draw_action 错误:', err);
        socket.emit('draw:error', { message: '绘画操作失败' });
      }
    });

    // ========================================================
    // draw:undo — 撤销最近一笔
    // ========================================================
    socket.on('draw:undo', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('draw:error', { message: '游戏未开始' });
          return;
        }

        // 校验阶段
        if (room.gameState.phase !== 'drawing') {
          socket.emit('draw:error', { message: '当前阶段不允许此操作' });
          return;
        }

        // 校验是否为当前 Drawer
        const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];
        if (drawerPlayer.id !== mapping.player.id) {
          socket.emit('draw:error', { message: '你不是画画玩家' });
          return;
        }

        // 从历史记录中移除最后一个绘画动作
        if (room.gameState.drawHistory.length > 0) {
          room.gameState.drawHistory.pop();

          // 广播撤销事件（发送当前历史长度作为 strokeIndex）
          for (const player of room.players) {
            if (player.isConnected && player.socketId && player.id !== drawerPlayer.id) {
              io.to(player.socketId).emit('draw:undo', {
                strokeIndex: room.gameState.drawHistory.length,
              });
            }
          }
        }
      } catch (err) {
        console.error('[Draw Socket] undo 错误:', err);
        socket.emit('draw:error', { message: '撤销操作失败' });
      }
    });

    // ========================================================
    // draw:clear_canvas — 清空画板
    // ========================================================
    socket.on('draw:clear_canvas', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('draw:error', { message: '游戏未开始' });
          return;
        }

        // 校验阶段
        if (room.gameState.phase !== 'drawing') {
          socket.emit('draw:error', { message: '当前阶段不允许此操作' });
          return;
        }

        // 校验是否为当前 Drawer
        const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];
        if (drawerPlayer.id !== mapping.player.id) {
          socket.emit('draw:error', { message: '你不是画画玩家' });
          return;
        }

        // 清空绘画历史
        room.gameState.drawHistory = [];

        // 广播清空画板事件
        for (const player of room.players) {
          if (player.isConnected && player.socketId && player.id !== drawerPlayer.id) {
            io.to(player.socketId).emit('draw:clear_canvas', {});
          }
        }
      } catch (err) {
        console.error('[Draw Socket] clear_canvas 错误:', err);
        socket.emit('draw:error', { message: '清空画板失败' });
      }
    });

    // ========================================================
    // draw:chat — 聊天/猜词
    // ========================================================
    socket.on('draw:chat', (data: unknown) => {
      try {
        const { roomId, message } = (data ?? {}) as { roomId?: string; message?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const msgErr = validateString(message, 'message');
        if (msgErr) {
          socket.emit('draw:error', { message: msgErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('draw:error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room) {
          socket.emit('draw:error', { message: '房间不存在' });
          return;
        }

        const trimmedMessage = message!.trim().slice(0, 200);

        // 如果游戏进行中且处于 drawing 阶段，进行猜词判定
        if (room.gameState && room.gameState.phase === 'drawing') {
          const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];

          // Drawer 不能发送聊天消息
          if (drawerPlayer.id === mapping.player.id) {
            socket.emit('draw:error', { message: '画画玩家不能发送消息' });
            return;
          }

          // 已猜对的 Guesser 不能继续发言
          const player = room.gameState.players.find((p) => p.id === mapping.player.id);
          if (player?.hasGuessedCorrect) {
            socket.emit('draw:error', { message: '你已猜对，不能继续发言' });
            return;
          }

          // 猜词判定
          const { state: newState, result } = judgeGuess(room.gameState, mapping.player.id, trimmedMessage);
          room.gameState = newState;

          if (result === 'correct') {
            // 广播猜对通知
            broadcastToRoom(io, room, 'draw:correct_guess', {
              playerId: mapping.player.id,
              playerName: mapping.player.name,
            });

            // 广播系统消息
            broadcastToRoom(io, room, 'draw:system_message', {
              message: `${mapping.player.name} 猜对了！`,
            });

            broadcastGameState(io, room);

            // 检查是否所有 Guesser 都已猜对
            if (allGuessersCorrect(room.gameState)) {
              handleTurnEnd(io, room);
            }
            return;
          }

          if (result === 'close') {
            // 仅向猜词者发送"很接近了"提示
            socket.emit('draw:close_guess', { message: '很接近了！' });
          }

          // 广播聊天消息（无论 close 还是 wrong 都广播原始消息）
          broadcastToRoom(io, room, 'draw:chat_message', {
            playerId: mapping.player.id,
            playerName: mapping.player.name,
            message: trimmedMessage,
          });
          return;
        }

        // 非 drawing 阶段：普通聊天消息
        broadcastToRoom(io, room, 'draw:chat_message', {
          playerId: mapping.player.id,
          playerName: mapping.player.name,
          message: trimmedMessage,
        });
      } catch (err) {
        console.error('[Draw Socket] chat 错误:', err);
        socket.emit('draw:error', { message: '发送消息失败' });
      }
    });

    // ========================================================
    // draw:reconnect — 断线重连
    // ========================================================
    socket.on('draw:reconnect', (data: unknown) => {
      try {
        const { roomId, playerId } = (data ?? {}) as { roomId?: string; playerId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('draw:error', { message: roomIdErr });
          return;
        }

        const playerIdErr = validateString(playerId, 'playerId');
        if (playerIdErr) {
          socket.emit('draw:error', { message: playerIdErr });
          return;
        }

        const room = handleReconnect(roomId!, playerId!, socket.id);
        if (!room) {
          socket.emit('draw:error', { message: '重连失败：房间或玩家不存在' });
          return;
        }

        socket.join(`draw:${roomId!}`);

        // 广播重连通知
        broadcastToRoom(io, room, 'draw:player_reconnected', { playerId });

        // 发送当前状态
        if (room.gameState) {
          const clientState = toClientGameState(room.gameState, playerId!);
          socket.emit('draw:game_state', clientState);

          // 如果游戏进行中，发送绘画历史用于重建画板
          if (room.gameState.phase === 'drawing' && room.gameState.drawHistory.length > 0) {
            socket.emit('draw:draw_history', {
              actions: room.gameState.drawHistory,
            });
          }

          // 如果重连的是 Drawer 且处于掉线超时中，取消掉线超时
          const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];
          if (drawerPlayer.id === playerId) {
            clearTimer(roomId!, 'drawer_disconnect');
          }

          broadcastGameState(io, room);
        } else {
          broadcastRoomState(io, room);
        }
      } catch (err) {
        console.error('[Draw Socket] reconnect 错误:', err);
        socket.emit('draw:error', { message: '重连失败' });
      }
    });

    // ========================================================
    // disconnect — 断线处理（你画我猜）
    // ========================================================
    socket.on('disconnect', () => {
      try {
        const disconnectInfo = handleDisconnect(socket.id);
        if (!disconnectInfo) return;

        const { roomId: rid, playerId: pid } = disconnectInfo;
        const room = getRoom(rid);
        if (!room) return;

        // 广播断线通知
        broadcastToRoom(io, room, 'draw:player_disconnected', { playerId: pid });

        if (room.gameState && room.gameState.phase !== 'finished') {
          broadcastGameState(io, room);

          // 如果掉线的是当前 Drawer 且处于 drawing 阶段，启动 Drawer 掉线超时
          if (room.gameState.phase === 'drawing') {
            const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];
            if (drawerPlayer && drawerPlayer.id === pid) {
              startTimer(rid, 'drawer_disconnect', () => {
                const currentRoom = getRoom(rid);
                if (!currentRoom?.gameState) return;
                if (currentRoom.gameState.phase !== 'drawing') return;

                // Drawer 掉线超时，自动结束当前 Turn
                broadcastToRoom(io, currentRoom, 'draw:system_message', {
                  message: '画画玩家掉线超时，自动跳过本回合',
                });

                handleTurnEnd(io, currentRoom);
              }, DRAWER_DISCONNECT_TIMEOUT * 1000);
            }
          }

          // 如果掉线的是 Drawer 且处于 word_select 阶段，自动选词
          if (room.gameState.phase === 'word_select') {
            const drawerPlayer = room.gameState.players[room.gameState.currentDrawerIndex];
            if (drawerPlayer && drawerPlayer.id === pid) {
              clearTimer(rid, 'word_select');
              room.gameState = autoSelectWord(room.gameState);

              broadcastToRoom(io, room, 'draw:system_message', {
                message: '画画玩家掉线，已自动选择词语',
              });

              broadcastGameState(io, room);
              startTurnTimers(io, room);

              // 同时启动 Drawer 掉线超时
              startTimer(rid, 'drawer_disconnect', () => {
                const currentRoom = getRoom(rid);
                if (!currentRoom?.gameState) return;
                if (currentRoom.gameState.phase !== 'drawing') return;

                broadcastToRoom(io, currentRoom, 'draw:system_message', {
                  message: '画画玩家掉线超时，自动跳过本回合',
                });

                handleTurnEnd(io, currentRoom);
              }, DRAWER_DISCONNECT_TIMEOUT * 1000);
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
        console.error('[Draw Socket] disconnect 错误:', err);
      }
    });
  });
}
