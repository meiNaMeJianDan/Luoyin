/**
 * 璀璨宝石房间管理模块
 *
 * 负责房间的创建、加入、离开、准备、开始游戏条件判断，
 * 以及 AI 玩家管理和断线重连。
 * 参考 Halli Galli 房间管理模块的实现模式。
 */

import { v4 as uuidv4 } from 'uuid';
import type { SplendorPlayer, SplendorRoom, SplendorRoomStatus } from './types.js';
import { MAX_PLAYERS, MIN_PLAYERS } from './types.js';

// ============================================================
// 房间存储（内存 Map）
// ============================================================

/** 所有房间，key 为 6 位数字房间号 */
const rooms: Map<string, SplendorRoom> = new Map();

/** 通过 socketId 查找玩家所在房间和玩家信息的索引 */
const socketToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();

// ============================================================
// AI 名字池
// ============================================================

const AI_NAMES = ['小智', '小慧', '小明', '小红', '小蓝'];
let aiNameIndex = 0;

// ============================================================
// 工具函数
// ============================================================

/** 生成唯一的 6 位数字房间号 */
function generateRoomId(): string {
  let id: string;
  do {
    id = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms.has(id));
  return id;
}

/** 校验昵称长度（2～8 字符） */
function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 8;
}

/** 创建新玩家对象 */
function createPlayer(
  name: string,
  socketId: string,
  options: { isHost?: boolean; isAI?: boolean } = {},
): SplendorPlayer {
  return {
    id: uuidv4(),
    name,
    socketId,
    gems: { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 },
    purchasedCards: [],
    reservedCards: [],
    nobles: [],
    prestige: 0,
    isHost: options.isHost ?? false,
    isAI: options.isAI ?? false,
    isConnected: true,
    isReady: options.isAI ?? false,
  };
}

// ============================================================
// 房间生命周期管理
// ============================================================

/**
 * 创建房间
 * - 生成唯一 6 位数字房间号
 * - 创建者自动成为房主
 */
export function createRoom(
  playerName: string,
  socketId: string,
): { room: SplendorRoom; playerId: string } | { error: string } {
  if (!validateName(playerName)) {
    return { error: '昵称长度需为2～8个字符' };
  }

  const roomId = generateRoomId();
  const host = createPlayer(playerName, socketId, { isHost: true });

  const room: SplendorRoom = {
    id: roomId,
    players: [host],
    status: 'waiting',
    hostId: host.id,
    gameState: null,
    createdAt: Date.now(),
    allowAI: true,
  };

  rooms.set(roomId, room);
  socketToPlayer.set(socketId, { roomId, playerId: host.id });

  return { room, playerId: host.id };
}

/**
 * 加入房间
 * - 校验房间存在、未满员（< 4 人）、未开始游戏
 * - 校验昵称长度 2～8 字符
 */
export function joinRoom(
  roomId: string,
  playerName: string,
  socketId: string,
): { room: SplendorRoom; playerId: string } | { error: string } {
  if (!validateName(playerName)) {
    return { error: '昵称长度需为2～8个字符' };
  }

  const room = rooms.get(roomId);
  if (!room) {
    return { error: '房间不存在' };
  }
  if (room.status !== 'waiting') {
    return { error: '游戏已开始' };
  }
  if (room.players.length >= MAX_PLAYERS) {
    return { error: '房间已满' };
  }

  const player = createPlayer(playerName, socketId);
  room.players.push(player);
  socketToPlayer.set(socketId, { roomId, playerId: player.id });

  return { room, playerId: player.id };
}

/**
 * 离开房间
 * - 将玩家从房间移除
 * - 如果离开的是房主，转移房主给下一位玩家
 * - 如果房间为空，删除房间
 */
export function leaveRoom(roomId: string, playerId: string): SplendorRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return room;

  const leavingPlayer = room.players[playerIndex];

  // 清理 socket 映射（AI 玩家 socketId 为空字符串，不需要清理）
  if (leavingPlayer.socketId) {
    socketToPlayer.delete(leavingPlayer.socketId);
  }

  // 移除玩家
  room.players.splice(playerIndex, 1);

  // 房间为空，删除房间
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  // 房主离开，转移房主给第一位玩家
  if (leavingPlayer.isHost) {
    const newHost = room.players[0];
    newHost.isHost = true;
    room.hostId = newHost.id;
  }

  return room;
}

// ============================================================
// 准备和开始条件判断
// ============================================================

/** 切换准备状态 */
export function toggleReady(roomId: string, playerId: string): SplendorRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.isReady = !player.isReady;
  return room;
}

/**
 * 检查是否可以开始游戏
 * - 玩家人数 2～4
 * - 所有非房主玩家已准备（房主不需要准备，AI 自动准备）
 */
export function canStartGame(room: SplendorRoom): boolean {
  const playerCount = room.players.length;
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) return false;
  return room.players.every((p) => p.isHost || p.isAI || p.isReady);
}

// ============================================================
// AI 玩家管理
// ============================================================

/** 添加 AI 玩家到房间 */
export function addAIPlayer(roomId: string): SplendorRoom | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.status !== 'waiting') return { error: '游戏已开始' };
  if (room.players.length >= MAX_PLAYERS) return { error: '房间已满' };

  const name = AI_NAMES[aiNameIndex % AI_NAMES.length] + (aiNameIndex >= AI_NAMES.length ? `${Math.floor(aiNameIndex / AI_NAMES.length) + 1}` : '');
  aiNameIndex++;

  const aiPlayer = createPlayer(`🤖 ${name}`, '', { isAI: true });
  room.players.push(aiPlayer);

  return room;
}

/** 移除房间中的一个 AI 玩家（移除最后加入的 AI） */
export function removeAIPlayer(roomId: string): SplendorRoom | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.status !== 'waiting') return { error: '游戏已开始' };

  let aiIndex = -1;
  for (let i = room.players.length - 1; i >= 0; i--) {
    if (room.players[i].isAI) {
      aiIndex = i;
      break;
    }
  }
  if (aiIndex === -1) return { error: '没有 AI 玩家可移除' };

  room.players.splice(aiIndex, 1);
  return room;
}

// ============================================================
// 辅助函数
// ============================================================

/** 获取房间信息 */
export function getRoom(roomId: string): SplendorRoom | undefined {
  return rooms.get(roomId);
}

/** 通过 socketId 查找玩家所在房间和玩家 ID */
export function getRoomBySocketId(socketId: string): { roomId: string; playerId: string } | undefined {
  return socketToPlayer.get(socketId);
}

/** 更新房间状态 */
export function setRoomStatus(roomId: string, status: SplendorRoomStatus): void {
  const room = rooms.get(roomId);
  if (room) {
    room.status = status;
  }
}

/** 删除房间 */
export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    for (const player of room.players) {
      if (player.socketId) {
        socketToPlayer.delete(player.socketId);
      }
    }
    rooms.delete(roomId);
  }
}

// ============================================================
// 断线重连逻辑
// ============================================================

/** 处理玩家断线 */
export function handleDisconnect(socketId: string): { roomId: string; playerId: string } | null {
  const mapping = socketToPlayer.get(socketId);
  if (!mapping) return null;

  const { roomId, playerId } = mapping;
  const room = rooms.get(roomId);
  if (!room) {
    socketToPlayer.delete(socketId);
    return null;
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    socketToPlayer.delete(socketId);
    return null;
  }

  player.isConnected = false;
  socketToPlayer.delete(socketId);

  return { roomId, playerId };
}

/** 处理玩家重连 */
export function handleReconnect(
  roomId: string,
  playerId: string,
  newSocketId: string,
): SplendorRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.isConnected = true;
  player.socketId = newSocketId;
  player.isAI = false;

  socketToPlayer.set(newSocketId, { roomId, playerId });

  return room;
}

/** 通过 socketId 查找玩家和所在房间 */
export function findPlayerBySocketId(socketId: string): { room: SplendorRoom; player: SplendorPlayer } | null {
  const mapping = socketToPlayer.get(socketId);
  if (!mapping) return null;

  const { roomId, playerId } = mapping;
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  return { room, player };
}
