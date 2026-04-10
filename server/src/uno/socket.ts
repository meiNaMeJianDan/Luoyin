/**
 * UNO WebSocket 事件处理层
 *
 * 初始化 Socket.io Server，注册所有客户端到服务端事件，
 * 实现参数校验、游戏状态广播、断线重连、AI 托管触发。
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type { Socket } from 'socket.io';
import type { CardColor, Room } from './types.js';
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
  toggleAllowAI,
  addAIPlayer,
  removeAIPlayer,
} from './room.js';
import {
  initGame,
  playCard,
  drawCard,
  advanceTurn,
  toClientGameState,
  checkChallenge,
  handleCallUno,
  handleReportUno,
} from './engine.js';
import { aiDecide, aiChooseColor, aiShouldChallenge } from './ai.js';
import { startTimer, clearTimer } from './timer.js';

// ============================================================
// 辅助函数
// ============================================================

/**
 * 向房间内所有在线玩家广播各自的 ClientGameState
 * 每位玩家只能看到自己的手牌详情
 */
function broadcastGameState(io: SocketIOServer, room: Room): void {
  if (!room.gameState) return;

  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      const clientState = toClientGameState(room.gameState, player.id);
      io.to(player.socketId).emit('game_state', clientState);
    }
  }
}

/**
 * 广播房间信息（不含 gameState，用于房间页面）
 */
function broadcastRoomUpdate(io: SocketIOServer, room: Room): void {
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
      io.to(player.socketId).emit('room_updated', roomInfo);
    }
  }
}

/**
 * 基本参数校验：检查字符串参数是否存在且非空
 */
function validateString(value: unknown, name: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `参数错误：${name} 不能为空`;
  }
  return null;
}

/**
 * 校验房间 ID 格式（6 位数字）
 */
function validateRoomId(roomId: unknown): string | null {
  if (typeof roomId !== 'string' || !/^\d{6}$/.test(roomId)) {
    return '参数错误：房间号必须为6位数字';
  }
  return null;
}

/**
 * 校验颜色参数
 */
function validateColor(color: unknown): color is CardColor {
  return color === 'red' || color === 'yellow' || color === 'blue' || color === 'green';
}

/**
 * 启动回合计时器
 * 超时后自动为当前玩家摸牌并传递回合
 */
function startTurnTimer(io: SocketIOServer, roomId: string): void {
  const room = getRoom(roomId);
  if (!room?.gameState || room.gameState.phase === 'finished') return;

  // 清除旧的回合计时器
  clearTimer(roomId, 'turn');

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];

  // 只有人机（isAI=true）才启动 AI 计时器，掉线玩家走正常超时
  if (currentPlayer.isAI) {
    console.log(`[Timer] 当前玩家 ${currentPlayer.name} 是 AI，启动 AI 计时器`);
    startAiTimer(io, roomId);
    return;
  }

  console.log(`[Timer] 当前玩家 ${currentPlayer.name} 是真人，启动 30 秒超时`);

  // 启动回合超时计时器（30 秒）
  startTimer(roomId, 'turn', () => {
    const currentRoom = getRoom(roomId);
    if (!currentRoom?.gameState || currentRoom.gameState.phase === 'finished') return;

    const player = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];

    // 超时自动摸牌
    const result = drawCard(currentRoom.gameState, player.id);
    currentRoom.gameState = result.state;

    // 推进回合
    currentRoom.gameState = advanceTurn(currentRoom.gameState);

    // 广播状态
    broadcastGameState(io, currentRoom);

    // 启动下一回合计时器
    startTurnTimer(io, roomId);
  });
}

/**
 * 启动 AI 操作计时器
 * 延迟 2～4 秒后执行 AI 决策
 */
function startAiTimer(io: SocketIOServer, roomId: string): void {
  clearTimer(roomId, 'ai');
  console.log(`[AI] 启动 AI 计时器，房间 ${roomId}`);

  startTimer(roomId, 'ai', () => {
    const room = getRoom(roomId);
    if (!room?.gameState || room.gameState.phase === 'finished') return;

    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!currentPlayer) return;
    console.log(`[AI] AI 玩家 ${currentPlayer.name} 开始决策`);

    const gs = room.gameState;
    const topCard = gs.discardPile[gs.discardPile.length - 1];

    // 处理 AI 在质疑阶段的决策
    if (gs.phase === 'challenging') {
      if (aiShouldChallenge()) {
        // AI 质疑（当前策略：永不质疑）
        const challengeResult = checkChallenge(gs, currentPlayer.id);
        room.gameState = challengeResult.state;

        // 广播质疑结果
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('challenge_result', challengeResult.result);
          }
        }
      } else {
        // AI 接受 Wild+4：摸 4 张牌并跳过回合
        let newState = gs;
        for (let i = 0; i < 4; i++) {
          const result = drawCard(newState, currentPlayer.id);
          newState = result.state;
        }
        newState = advanceTurn({ ...newState, phase: 'playing', pendingDrawCount: 0 });
        room.gameState = newState;
      }

      broadcastGameState(io, room);
      startTurnTimer(io, roomId);
      return;
    }

    // 处理 AI 在选色阶段的决策
    if (gs.phase === 'choosing_color') {
      const color = aiChooseColor(currentPlayer.hand);
      room.gameState = {
        ...gs,
        currentColor: color,
        phase: 'playing',
      };
      room.gameState = advanceTurn(room.gameState);

      // 广播颜色选择
      for (const p of room.players) {
        if (p.isConnected && p.socketId) {
          io.to(p.socketId).emit('color_chosen', { color });
        }
      }

      broadcastGameState(io, room);
      startTurnTimer(io, roomId);
      return;
    }

    // 正常出牌阶段：AI 决策
    const decision = aiDecide(currentPlayer.hand, topCard, gs.currentColor);

    if (decision.action === 'play' && decision.card) {
      // AI 出牌
      const newState = playCard(gs, currentPlayer.id, decision.card.id, decision.chosenColor);
      room.gameState = newState;

      // 广播出牌通知
      for (const p of room.players) {
        if (p.isConnected && p.socketId) {
          io.to(p.socketId).emit('card_played', {
            playerId: currentPlayer.id,
            card: decision.card,
          });
        }
      }

      // AI 手牌剩余 1 张时自动喊 UNO
      const updatedPlayer = room.gameState.players.find((p) => p.id === currentPlayer.id);
      if (updatedPlayer && updatedPlayer.hand.length === 1) {
        room.gameState = handleCallUno(room.gameState, currentPlayer.id);
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('uno_called', { playerId: currentPlayer.id });
          }
        }
      }

      // 检查游戏是否结束
      if (room.gameState.phase === 'finished') {
        clearTimer(roomId);
        setRoomStatus(roomId, 'finished');

        const clientPlayers = room.gameState.players.map((p) => ({
          id: p.id,
          name: p.name,
          handCount: p.hand.length,
          isHost: p.isHost,
          isAI: p.isAI,
          isConnected: p.isConnected,
          calledUno: p.calledUno,
        }));

        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('game_over', {
              winnerId: room.gameState.winnerId,
              players: clientPlayers,
            });
          }
        }

        broadcastGameState(io, room);
        return;
      }

      // 如果进入选色或质疑阶段，AI 需要继续处理
      if (room.gameState.phase === 'choosing_color' || room.gameState.phase === 'challenging') {
        broadcastGameState(io, room);
        // 检查下一个需要操作的玩家是否是 AI
        const nextPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (nextPlayer && (nextPlayer.isAI || !nextPlayer.isConnected)) {
          startAiTimer(io, roomId);
        } else {
          // 选色阶段：出牌者自己选色，如果出牌者是 AI 则继续 AI 处理
          if (room.gameState.phase === 'choosing_color') {
            startAiTimer(io, roomId);
          } else {
            startTurnTimer(io, roomId);
          }
        }
        return;
      }
    } else {
      // AI 摸牌
      const result = drawCard(gs, currentPlayer.id);
      room.gameState = result.state;

      // 广播摸牌通知
      for (const p of room.players) {
        if (p.isConnected && p.socketId) {
          io.to(p.socketId).emit('card_drawn', {
            playerId: currentPlayer.id,
            count: 1,
          });
        }
      }

      // 推进回合
      room.gameState = advanceTurn(room.gameState);
    }

    broadcastGameState(io, room);
    startTurnTimer(io, roomId);
  });
}


// ============================================================
// 初始化 Socket.io Server
// ============================================================

/**
 * 初始化 Socket.io Server 并注册所有事件处理
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 玩家连接: ${socket.id}`);

    // ========================================================
    // create_room — 创建房间
    // ========================================================
    socket.on('create_room', (data: unknown) => {
      try {
        const { playerName } = (data ?? {}) as { playerName?: string };
        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('error', { message: nameErr });
          return;
        }

        const result = createRoom(playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(room.id);

        // 返回房间信息和玩家 ID
        socket.emit('room_created', { roomId: room.id, playerId });
        broadcastRoomUpdate(io, room);
      } catch (err) {
        console.error('[Socket] create_room 错误:', err);
        socket.emit('error', { message: '创建房间失败' });
      }
    });

    // ========================================================
    // join_room — 加入房间
    // ========================================================
    socket.on('join_room', (data: unknown) => {
      try {
        const { roomId, playerName } = (data ?? {}) as { roomId?: string; playerName?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const nameErr = validateString(playerName, 'playerName');
        if (nameErr) {
          socket.emit('error', { message: nameErr });
          return;
        }

        const result = joinRoom(roomId!, playerName!.trim(), socket.id);
        if ('error' in result) {
          socket.emit('error', { message: result.error });
          return;
        }

        const { room, playerId } = result;
        socket.join(room.id);

        socket.emit('room_joined', { roomId: room.id, playerId });
        broadcastRoomUpdate(io, room);
      } catch (err) {
        console.error('[Socket] join_room 错误:', err);
        socket.emit('error', { message: '加入房间失败' });
      }
    });

    // ========================================================
    // leave_room — 离开房间
    // ========================================================
    socket.on('leave_room', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = leaveRoom(roomId!, mapping.playerId);
        socket.leave(roomId!);

        if (room) {
          // 如果游戏进行中且人数不足，结束游戏
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
        console.error('[Socket] leave_room 错误:', err);
        socket.emit('error', { message: '离开房间失败' });
      }
    });

    // ========================================================
    // player_ready — 切换准备状态
    // ========================================================
    socket.on('player_ready', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = toggleReady(roomId!, mapping.playerId);
        if (!room) {
          socket.emit('error', { message: '操作失败' });
          return;
        }

        broadcastRoomUpdate(io, room);
      } catch (err) {
        console.error('[Socket] player_ready 错误:', err);
        socket.emit('error', { message: '准备操作失败' });
      }
    });

    // ========================================================
    // toggle_ai — 切换 AI 托管开关（仅房主可操作）
    // ========================================================
    socket.on('toggle_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        // 只有房主可以切换 AI 开关
        if (room.hostId !== mapping.playerId) {
          socket.emit('error', { message: '只有房主可以切换 AI 设置' });
          return;
        }

        const updatedRoom = toggleAllowAI(roomId!);
        if (updatedRoom) {
          broadcastRoomUpdate(io, updatedRoom);
        }
      } catch (err) {
        console.error('[Socket] toggle_ai 错误:', err);
        socket.emit('error', { message: '切换 AI 设置失败' });
      }
    });

    // ========================================================
    // add_ai — 添加人机玩家（仅房主可操作）
    // ========================================================
    socket.on('add_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.playerId) { socket.emit('error', { message: '只有房主可以添加人机' }); return; }

        const result = addAIPlayer(roomId!);
        if ('error' in result) { socket.emit('error', { message: result.error }); return; }

        broadcastRoomUpdate(io, result);
      } catch (err) {
        console.error('[Socket] add_ai 错误:', err);
        socket.emit('error', { message: '添加人机失败' });
      }
    });

    // ========================================================
    // remove_ai — 移除人机玩家（仅房主可操作）
    // ========================================================
    socket.on('remove_ai', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) { socket.emit('error', { message: roomIdErr }); return; }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) { socket.emit('error', { message: '你不在该房间中' }); return; }

        const room = getRoom(roomId!);
        if (!room) { socket.emit('error', { message: '房间不存在' }); return; }
        if (room.hostId !== mapping.playerId) { socket.emit('error', { message: '只有房主可以移除人机' }); return; }

        const result = removeAIPlayer(roomId!);
        if ('error' in result) { socket.emit('error', { message: result.error }); return; }

        broadcastRoomUpdate(io, result);
      } catch (err) {
        console.error('[Socket] remove_ai 错误:', err);
        socket.emit('error', { message: '移除人机失败' });
      }
    });

    // ========================================================
    // start_game — 开始游戏
    // ========================================================
    socket.on('start_game', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        // 只有房主可以开始游戏
        if (room.hostId !== mapping.playerId) {
          socket.emit('error', { message: '只有房主可以开始游戏' });
          return;
        }

        // 检查开始条件
        if (!canStartGame(room)) {
          socket.emit('error', { message: '条件不满足，无法开始' });
          return;
        }

        // 初始化游戏
        const gameState = initGame(room.players, roomId!);
        room.gameState = gameState;
        room.status = 'playing';
        setRoomStatus(roomId!, 'playing');

        // 广播游戏开始
        for (const player of room.players) {
          if (player.isConnected && player.socketId) {
            const clientState = toClientGameState(gameState, player.id);
            io.to(player.socketId).emit('game_started', clientState);
          }
        }

        broadcastGameState(io, room);

        // 启动回合计时器
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Socket] start_game 错误:', err);
        socket.emit('error', { message: '开始游戏失败' });
      }
    });


    // ========================================================
    // play_card — 出牌
    // ========================================================
    socket.on('play_card', (data: unknown) => {
      try {
        const { roomId, cardId, chosenColor } = (data ?? {}) as {
          roomId?: string;
          cardId?: string;
          chosenColor?: CardColor;
        };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const cardIdErr = validateString(cardId, 'cardId');
        if (cardIdErr) {
          socket.emit('error', { message: cardIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('error', { message: '游戏未开始' });
          return;
        }

        // 检查是否是当前回合玩家
        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('error', { message: '不是你的回合' });
          return;
        }

        // 校验颜色参数（如果提供了）
        if (chosenColor !== undefined && !validateColor(chosenColor)) {
          socket.emit('error', { message: '参数错误：无效的颜色' });
          return;
        }

        // 执行出牌
        const prevState = room.gameState;
        const newState = playCard(room.gameState, mapping.playerId, cardId!, chosenColor);

        // 检查出牌是否成功（状态未变说明出牌失败）
        if (newState === prevState) {
          socket.emit('error', { message: '该牌不可出' });
          return;
        }

        room.gameState = newState;

        // 清除回合计时器
        clearTimer(roomId!, 'turn');

        // 广播出牌通知
        const playedCard = prevState.discardPile.length < newState.discardPile.length
          ? newState.discardPile[newState.discardPile.length - 1]
          : null;

        if (playedCard) {
          for (const p of room.players) {
            if (p.isConnected && p.socketId) {
              io.to(p.socketId).emit('card_played', {
                playerId: mapping.playerId,
                card: playedCard,
              });
            }
          }
        }

        // 检查游戏是否结束
        if (newState.phase === 'finished') {
          clearTimer(roomId!);
          setRoomStatus(roomId!, 'finished');

          const clientPlayers = newState.players.map((p) => ({
            id: p.id,
            name: p.name,
            handCount: p.hand.length,
            isHost: p.isHost,
            isAI: p.isAI,
            isConnected: p.isConnected,
            calledUno: p.calledUno,
          }));

          for (const p of room.players) {
            if (p.isConnected && p.socketId) {
              io.to(p.socketId).emit('game_over', {
                winnerId: newState.winnerId,
                players: clientPlayers,
              });
            }
          }

          broadcastGameState(io, room);
          return;
        }

        // 广播游戏状态
        broadcastGameState(io, room);

        // 根据游戏阶段启动对应计时器
        if (newState.phase === 'choosing_color') {
          // 选色超时（15 秒）
          startTimer(roomId!, 'color', () => {
            const currentRoom = getRoom(roomId!);
            if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'choosing_color') return;

            // 超时随机指定颜色
            const colors: CardColor[] = ['red', 'yellow', 'blue', 'green'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            currentRoom.gameState = {
              ...currentRoom.gameState,
              currentColor: randomColor,
              phase: 'playing',
            };
            currentRoom.gameState = advanceTurn(currentRoom.gameState);

            for (const p of currentRoom.players) {
              if (p.isConnected && p.socketId) {
                io.to(p.socketId).emit('color_chosen', { color: randomColor });
              }
            }

            broadcastGameState(io, currentRoom);
            startTurnTimer(io, roomId!);
          });
        } else if (newState.phase === 'challenging') {
          // 质疑超时（10 秒）
          startTimer(roomId!, 'challenge', () => {
            const currentRoom = getRoom(roomId!);
            if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'challenging') return;

            // 超时默认接受：摸 4 张牌并跳过回合
            const targetPlayer = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
            let newGs = currentRoom.gameState;
            for (let i = 0; i < 4; i++) {
              const result = drawCard(newGs, targetPlayer.id);
              newGs = result.state;
            }
            newGs = advanceTurn({ ...newGs, phase: 'playing', pendingDrawCount: 0 });
            currentRoom.gameState = newGs;

            broadcastGameState(io, currentRoom);
            startTurnTimer(io, roomId!);
          });

          // 如果下一位玩家是 AI，启动 AI 计时器处理质疑
          const nextPlayer = newState.players[newState.currentPlayerIndex];
          if (nextPlayer && (nextPlayer.isAI || !nextPlayer.isConnected)) {
            startAiTimer(io, roomId!);
          }
        } else {
          // 正常回合：启动回合计时器
          startTurnTimer(io, roomId!);
        }
      } catch (err) {
        console.error('[Socket] play_card 错误:', err);
        socket.emit('error', { message: '出牌失败' });
      }
    });

    // ========================================================
    // draw_card — 摸牌
    // ========================================================
    socket.on('draw_card', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('error', { message: '游戏未开始' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('error', { message: '不是你的回合' });
          return;
        }

        // 清除回合计时器
        clearTimer(roomId!, 'turn');

        // 执行摸牌
        const result = drawCard(room.gameState, mapping.playerId);
        room.gameState = result.state;

        // 广播摸牌通知
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('card_drawn', {
              playerId: mapping.playerId,
              count: 1,
            });
          }
        }

        // 推进回合
        room.gameState = advanceTurn(room.gameState);

        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Socket] draw_card 错误:', err);
        socket.emit('error', { message: '摸牌失败' });
      }
    });


    // ========================================================
    // call_uno — 喊 UNO
    // ========================================================
    socket.on('call_uno', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('error', { message: '游戏未开始' });
          return;
        }

        // 执行喊 UNO
        const newState = handleCallUno(room.gameState, mapping.playerId);
        room.gameState = newState;

        // 广播 UNO 喊牌通知
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('uno_called', { playerId: mapping.playerId });
          }
        }

        broadcastGameState(io, room);
      } catch (err) {
        console.error('[Socket] call_uno 错误:', err);
        socket.emit('error', { message: '喊 UNO 失败' });
      }
    });

    // ========================================================
    // report_uno — 举报未喊 UNO
    // ========================================================
    socket.on('report_uno', (data: unknown) => {
      try {
        const { roomId, targetPlayerId } = (data ?? {}) as {
          roomId?: string;
          targetPlayerId?: string;
        };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const targetErr = validateString(targetPlayerId, 'targetPlayerId');
        if (targetErr) {
          socket.emit('error', { message: targetErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('error', { message: '游戏未开始' });
          return;
        }

        // 执行举报
        const result = handleReportUno(room.gameState, mapping.playerId, targetPlayerId!);
        room.gameState = result.state;

        // 广播举报结果
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('uno_reported', {
              reporterId: mapping.playerId,
              targetId: targetPlayerId!,
              success: result.success,
            });
          }
        }

        if (result.success) {
          broadcastGameState(io, room);
        }
      } catch (err) {
        console.error('[Socket] report_uno 错误:', err);
        socket.emit('error', { message: '举报失败' });
      }
    });

    // ========================================================
    // choose_color — 选择颜色（Wild 牌）
    // ========================================================
    socket.on('choose_color', (data: unknown) => {
      try {
        const { roomId, color } = (data ?? {}) as { roomId?: string; color?: CardColor };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        if (!validateColor(color)) {
          socket.emit('error', { message: '参数错误：无效的颜色' });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('error', { message: '游戏未开始' });
          return;
        }

        if (room.gameState.phase !== 'choosing_color') {
          socket.emit('error', { message: '当前不在选色阶段' });
          return;
        }

        // 清除颜色选择计时器
        clearTimer(roomId!, 'color');

        // 更新颜色并推进回合
        room.gameState = {
          ...room.gameState,
          currentColor: color!,
          phase: 'playing',
        };
        room.gameState = advanceTurn(room.gameState);

        // 广播颜色选择结果
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('color_chosen', { color });
          }
        }

        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Socket] choose_color 错误:', err);
        socket.emit('error', { message: '选择颜色失败' });
      }
    });

    // ========================================================
    // challenge_wild4 — 质疑 Wild+4
    // ========================================================
    socket.on('challenge_wild4', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('error', { message: '游戏未开始' });
          return;
        }

        if (room.gameState.phase !== 'challenging') {
          socket.emit('error', { message: '当前不在质疑阶段' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('error', { message: '不是你的回合' });
          return;
        }

        // 清除质疑计时器
        clearTimer(roomId!, 'challenge');

        // 执行质疑
        const challengeResult = checkChallenge(room.gameState, mapping.playerId);
        room.gameState = challengeResult.state;

        // 广播质疑结果
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('challenge_result', challengeResult.result);
          }
        }

        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Socket] challenge_wild4 错误:', err);
        socket.emit('error', { message: '质疑失败' });
      }
    });

    // ========================================================
    // accept_wild4 — 接受 Wild+4
    // ========================================================
    socket.on('accept_wild4', (data: unknown) => {
      try {
        const { roomId } = (data ?? {}) as { roomId?: string };
        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const mapping = findPlayerBySocketId(socket.id);
        if (!mapping) {
          socket.emit('error', { message: '你不在该房间中' });
          return;
        }

        const room = getRoom(roomId!);
        if (!room?.gameState) {
          socket.emit('error', { message: '游戏未开始' });
          return;
        }

        if (room.gameState.phase !== 'challenging') {
          socket.emit('error', { message: '当前不在质疑阶段' });
          return;
        }

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
        if (currentPlayer.id !== mapping.playerId) {
          socket.emit('error', { message: '不是你的回合' });
          return;
        }

        // 清除质疑计时器
        clearTimer(roomId!, 'challenge');

        // 接受 Wild+4：摸 4 张牌并跳过回合
        let newState = room.gameState;
        for (let i = 0; i < 4; i++) {
          const result = drawCard(newState, mapping.playerId);
          newState = result.state;
        }
        newState = advanceTurn({ ...newState, phase: 'playing', pendingDrawCount: 0 });
        room.gameState = newState;

        broadcastGameState(io, room);
        startTurnTimer(io, roomId!);
      } catch (err) {
        console.error('[Socket] accept_wild4 错误:', err);
        socket.emit('error', { message: '接受 Wild+4 失败' });
      }
    });


    // ========================================================
    // reconnect_game — 重连游戏
    // ========================================================
    socket.on('reconnect_game', (data: unknown) => {
      try {
        const { roomId, playerId } = (data ?? {}) as { roomId?: string; playerId?: string };

        const roomIdErr = validateRoomId(roomId);
        if (roomIdErr) {
          socket.emit('error', { message: roomIdErr });
          return;
        }

        const playerIdErr = validateString(playerId, 'playerId');
        if (playerIdErr) {
          socket.emit('error', { message: playerIdErr });
          return;
        }

        const room = handleReconnect(roomId!, playerId!, socket.id);
        if (!room) {
          socket.emit('error', { message: '重连失败：房间或玩家不存在' });
          return;
        }

        socket.join(roomId!);

        // 广播重连通知
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('player_reconnected', { playerId });
          }
        }

        // 发送当前状态
        if (room.gameState) {
          const clientState = toClientGameState(room.gameState, playerId!);
          socket.emit('game_state', clientState);
          broadcastGameState(io, room);
        } else {
          broadcastRoomUpdate(io, room);
        }
      } catch (err) {
        console.error('[Socket] reconnect_game 错误:', err);
        socket.emit('error', { message: '重连失败' });
      }
    });

    // ========================================================
    // disconnect — 断线处理
    // ========================================================
    socket.on('disconnect', () => {
      try {
        console.log(`[Socket] 玩家断线: ${socket.id}`);

        const disconnectInfo = handleDisconnect(socket.id);
        if (!disconnectInfo) return;

        const { roomId, playerId } = disconnectInfo;
        const room = getRoom(roomId);
        if (!room) return;

        // 广播断线通知
        for (const p of room.players) {
          if (p.isConnected && p.socketId) {
            io.to(p.socketId).emit('player_disconnected', { playerId });
          }
        }

        // 如果游戏进行中，掉线玩家不再自动 AI 托管，等待超时自动摸牌
        if (room.gameState && room.gameState.phase !== 'finished') {
          broadcastGameState(io, room);

          // 如果当前轮到掉线玩家，启动回合超时（超时后自动摸牌跳过）
          const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
          if (currentPlayer && currentPlayer.id === playerId) {
            clearTimer(roomId, 'turn');
            startTurnTimer(io, roomId);
          }
        } else if (room.status === 'waiting') {
          // 房间等待中：30 秒后移除掉线玩家
          setTimeout(() => {
            const currentRoom = getRoom(roomId);
            if (!currentRoom) return;

            const disconnectedPlayer = currentRoom.players.find((p) => p.id === playerId);
            if (disconnectedPlayer && !disconnectedPlayer.isConnected) {
              const updatedRoom = leaveRoom(roomId, playerId);
              if (updatedRoom) {
                broadcastRoomUpdate(io, updatedRoom);
              }
            }
          }, 30 * 1000);
        }
      } catch (err) {
        console.error('[Socket] disconnect 错误:', err);
      }
    });
  });

  return io;
}
