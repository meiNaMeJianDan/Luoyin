/**
 * 卡坦岛房间管理模块
 *
 * 负责房间的创建、加入、离开、准备、开始游戏条件判断，
 * 以及 AI 玩家管理和断线重连逻辑。
 * 参考 UNO 房间管理模块的实现模式。
 */

import { v4 as uuidv4 } from 'uuid';
import type { CatanPlayer, CatanRoom, PlayerColor, RoomStatus, ResourceMap } from './types.js';

// ============================================================
// 房间存储（内存 Map）
// ============================================================

/** 所有房间，key 为 6 位数字房间号 */
const rooms: Map<string, CatanRoom> = new Map();

/** 通过 socketId 查找玩家所在房间和玩家信息的索引 */
const socketToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();

// ============================================================
// 常量
// ============================================================

/** 玩家颜色按加入顺序分配 */
const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'white', 'orange'];

/** 房间最大玩家数 */
const MAX_PLAYERS = 4;

/** AI 名字池 */
const AI_NAMES = ['小智', '小慧', '小明', '小红'];
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

/** 创建空资源映射 */
function emptyResources(): ResourceMap {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

/** 创建新玩家对象 */
function createPlayer(
  name: string,
  socketId: string,
  color: PlayerColor,
  options: { isHost?: boolean; isAI?: boolean } = {},
): CatanPlayer {
  return {
    id: uuidv4(),
    name,
    socketId,
    resources: emptyResources(),
    settlements: [],
    cities: [],
    roads: [],
    devCards: [],
    knightsPlayed: 0,
    longestRoadLength: 0,
    hasLongestRoad: false,
    hasLargestArmy: false,
    victoryPoints: 0,
    isHost: options.isHost ?? false,
    isAI: options.isAI ?? false,
    isConnected: true,
    isReady: options.isAI ?? false, // AI 自动准备
    color,
  };
}

// ============================================================
// 房间生命周期管理
// ============================================================

/**
 * 创建房间
 * - 生成唯一 6 位数字房间号
 * - 创建者自动成为房主，颜色为 red
 * - 返回 { room, playerId } 或 { error: string }
 */
export function createRoom(
  playerName: string,
  socketId: string,
): { room: CatanRoom; playerId: string } | { error: string } {
  if (!validateName(playerName)) {
    return { error: '昵称长度需为2～8个字符' };
  }

  const roomId = generateRoomId();
  const host = createPlayer(playerName, socketId, PLAYER_COLORS[0], { isHost: true });

  const room: CatanRoom = {
    id: roomId,
    players: [host],
    status: 'waiting',
    hostId: host.id,
    gameState: null,
    createdAt: Date.now(),
    allowAI: true,
    enableDevCards: false,
  };

  rooms.set(roomId, room);
  socketToPlayer.set(socketId, { roomId, playerId: host.id });

  return { room, playerId: host.id };
}

/**
 * 加入房间
 * - 校验房间存在、未满员（< 4 人）、未开始游戏
 * - 校验昵称长度 2～8 字符
 * - 颜色按加入顺序分配
 * - 返回 { room, playerId } 或 { error: string }
 */
export function joinRoom(
  roomId: string,
  playerName: string,
  socketId: string,
): { room: CatanRoom; playerId: string } | { error: string } {
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

  // 分配颜色：找到第一个未被使用的颜色
  const usedColors = new Set(room.players.map((p) => p.color));
  const color = PLAYER_COLORS.find((c) => !usedColors.has(c))!;

  const player = createPlayer(playerName, socketId, color);
  room.players.push(player);
  socketToPlayer.set(socketId, { roomId, playerId: player.id });

  return { room, playerId: player.id };
}

/**
 * 离开房间
 * - 将玩家从房间移除
 * - 如果离开的是房主，转移房主给下一位玩家
 * - 如果房间为空，删除房间
 * - 返回更新后的房间，房间被删除时返回 null
 */
export function leaveRoom(roomId: string, playerId: string): CatanRoom | null {
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

/**
 * 切换准备状态
 */
export function toggleReady(roomId: string, playerId: string): CatanRoom | null {
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
export function canStartGame(room: CatanRoom): boolean {
  const playerCount = room.players.length;
  if (playerCount < 2 || playerCount > MAX_PLAYERS) return false;
  // 房主不需要准备，AI 自动准备，其他真人玩家必须全部准备
  return room.players.every((p) => p.isHost || p.isAI || p.isReady);
}

// ============================================================
// AI 玩家管理
// ============================================================

/**
 * 添加 AI 玩家到房间
 * - 仅在等待状态且未满员时可添加
 * - AI 自动准备，socketId 为空字符串
 */
export function addAIPlayer(roomId: string): CatanRoom | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.status !== 'waiting') return { error: '游戏已开始' };
  if (room.players.length >= MAX_PLAYERS) return { error: '房间已满' };

  // 分配颜色
  const usedColors = new Set(room.players.map((p) => p.color));
  const color = PLAYER_COLORS.find((c) => !usedColors.has(c))!;

  // 生成 AI 名字
  const name = AI_NAMES[aiNameIndex % AI_NAMES.length] + (aiNameIndex >= AI_NAMES.length ? `${Math.floor(aiNameIndex / AI_NAMES.length) + 1}` : '');
  aiNameIndex++;

  const aiPlayer = createPlayer(`🤖 ${name}`, '', color, { isAI: true });
  room.players.push(aiPlayer);

  return room;
}

/**
 * 移除房间中的一个 AI 玩家（移除最后加入的 AI）
 */
export function removeAIPlayer(roomId: string): CatanRoom | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.status !== 'waiting') return { error: '游戏已开始' };

  // 从后往前找，移除最后加入的 AI
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
// 断线重连逻辑
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
): CatanRoom | null {
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
// 辅助函数
// ============================================================

/**
 * 获取房间信息
 */
export function getRoom(roomId: string): CatanRoom | undefined {
  return rooms.get(roomId);
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
 * 通过 socketId 查找玩家所在房间和玩家 ID
 */
export function findPlayerBySocketId(socketId: string): { roomId: string; playerId: string } | undefined {
  return socketToPlayer.get(socketId);
}

/**
 * 切换房间的 AI 托管开关
 */
export function toggleAllowAI(roomId: string): CatanRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.allowAI = !room.allowAI;
  return room;
}

/**
 * 删除房间（用于清理过期房间）
 */
export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    // 清理所有玩家的 socket 映射
    for (const player of room.players) {
      if (player.socketId) {
        socketToPlayer.delete(player.socketId);
      }
    }
    rooms.delete(roomId);
  }
}

/**
 * 获取所有房间（调试用）
 */
export function getAllRooms(): Map<string, CatanRoom> {
  return rooms;
}
