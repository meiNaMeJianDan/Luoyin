/**
 * UNO 房间管理模块
 *
 * 负责房间的创建、加入、离开、准备、开始游戏条件判断，
 * 以及断线重连逻辑。
 */

import { v4 as uuidv4 } from 'uuid';
import type { Player, Room, RoomStatus } from './types.js';

// ============================================================
// 房间存储（内存 Map）
// ============================================================

/** 所有房间，key 为 6 位数字房间号 */
const rooms: Map<string, Room> = new Map();

/** 通过 socketId 查找玩家所在房间和玩家信息的索引 */
const socketToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();

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

// ============================================================
// 4.1 — 房间生命周期管理
// ============================================================

/**
 * 创建房间
 * - 生成唯一 6 位数字房间号
 * - 创建者自动成为房主
 */
export function createRoom(playerName: string, socketId: string): { room: Room; playerId: string } | { error: string } {
  if (!validateName(playerName)) {
    return { error: '昵称长度需为2～8个字符' };
  }

  const roomId = generateRoomId();
  const playerId = uuidv4();

  const host: Player = {
    id: playerId,
    name: playerName,
    socketId,
    hand: [],
    isReady: false,
    isHost: true,
    isAI: false,
    isConnected: true,
    calledUno: false,
  };

  const room: Room = {
    id: roomId,
    players: [host],
    status: 'waiting',
    hostId: playerId,
    gameState: null,
    createdAt: Date.now(),
    allowAI: true,
  };

  rooms.set(roomId, room);
  socketToPlayer.set(socketId, { roomId, playerId });

  return { room, playerId };
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
): { room: Room; playerId: string } | { error: string } {
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
  if (room.players.length >= 10) {
    return { error: '房间已满' };
  }

  const playerId = uuidv4();
  const player: Player = {
    id: playerId,
    name: playerName,
    socketId,
    hand: [],
    isReady: false,
    isHost: false,
    isAI: false,
    isConnected: true,
    calledUno: false,
  };

  room.players.push(player);
  socketToPlayer.set(socketId, { roomId, playerId });

  return { room, playerId };
}

/**
 * 离开房间
 * - 将玩家从房间移除
 * - 如果离开的是房主，转移房主给下一位玩家
 * - 如果房间为空，删除房间
 * - 返回更新后的房间，房间被删除时返回 null
 */
export function leaveRoom(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return room;

  const leavingPlayer = room.players[playerIndex];

  // 清理 socket 映射
  socketToPlayer.delete(leavingPlayer.socketId);

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

/**
 * 切换准备状态
 */
export function toggleReady(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.isReady = !player.isReady;
  return room;
}

/**
 * 检查是否可以开始游戏
 * - 所有非房主玩家已准备（房主不需要准备）
 * - 玩家人数 2～10
 */
export function canStartGame(room: Room): boolean {
  const playerCount = room.players.length;
  if (playerCount < 2 || playerCount > 10) return false;
  // 房主不需要准备，AI 自动准备，其他真人玩家必须全部准备
  return room.players.every((p) => p.isHost || p.isAI || p.isReady);
}

/**
 * 获取房间信息
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/**
 * 切换房间的 AI 托管开关
 */
export function toggleAllowAI(roomId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.allowAI = !room.allowAI;
  return room;
}

/** AI 名字池 */
const AI_NAMES = ['小智', '小慧', '小明', '小红', '小蓝', '小绿', '小黄', '小紫', '小橙'];
let aiNameIndex = 0;

/**
 * 添加 AI 玩家到房间
 * - 仅在等待状态且未满员时可添加
 * - AI 自动准备
 */
export function addAIPlayer(roomId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.status !== 'waiting') return { error: '游戏已开始' };
  if (room.players.length >= 10) return { error: '房间已满' };

  const playerId = uuidv4();
  const name = AI_NAMES[aiNameIndex % AI_NAMES.length] + (aiNameIndex > 8 ? `${Math.floor(aiNameIndex / 9) + 1}` : '');
  aiNameIndex++;

  const aiPlayer: Player = {
    id: playerId,
    name: `🤖 ${name}`,
    socketId: '',
    hand: [],
    isReady: true,
    isHost: false,
    isAI: true,
    isConnected: true,
    calledUno: false,
  };

  room.players.push(aiPlayer);
  return room;
}

/**
 * 移除房间中的一个 AI 玩家
 */
export function removeAIPlayer(roomId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.status !== 'waiting') return { error: '游戏已开始' };

  const aiIndex = room.players.findIndex((p) => p.isAI);
  if (aiIndex === -1) return { error: '没有 AI 玩家可移除' };

  room.players.splice(aiIndex, 1);
  return room;
}

// ============================================================
// 4.3 — 断线重连逻辑
// ============================================================

/**
 * 处理玩家断线
 * - 通过 socketId 找到对应的房间和玩家
 * - 标记玩家为掉线状态
 * - 返回断线信息（roomId、playerId），找不到则返回 null
 */
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

  // 标记玩家掉线
  player.isConnected = false;

  // 清理旧的 socket 映射
  socketToPlayer.delete(socketId);

  return { roomId, playerId };
}

/**
 * 处理玩家重连
 * - 恢复玩家在线状态
 * - 更新 socketId
 * - 返回更新后的房间，找不到则返回 null
 */
export function handleReconnect(
  roomId: string,
  playerId: string,
  newSocketId: string,
): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  // 恢复在线状态
  player.isConnected = true;
  player.isAI = false;
  player.socketId = newSocketId;

  // 更新 socket 映射
  socketToPlayer.set(newSocketId, { roomId, playerId });

  return room;
}

// ============================================================
// 辅助方法：供外部模块使用
// ============================================================

/**
 * 通过 socketId 查找玩家所在房间和玩家 ID
 */
export function findPlayerBySocketId(socketId: string): { roomId: string; playerId: string } | undefined {
  return socketToPlayer.get(socketId);
}

/**
 * 更新房间状态
 */
export function setRoomStatus(roomId: string, status: RoomStatus): void {
  const room = rooms.get(roomId);
  if (room) {
    room.status = status;
  }
}

/**
 * 删除房间（用于清理过期房间）
 */
export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    // 清理所有玩家的 socket 映射
    for (const player of room.players) {
      socketToPlayer.delete(player.socketId);
    }
    rooms.delete(roomId);
  }
}

/**
 * 获取所有房间（调试用）
 */
export function getAllRooms(): Map<string, Room> {
  return rooms;
}
