// ============================================================
// 基础类型
// ============================================================

/** 水果种类 */
export type FruitType = 'banana' | 'strawberry' | 'cherry' | 'lime';

/** 水果牌 */
export interface FruitCard {
  /** 唯一标识，如 "banana-3-1"（水果-数量-副本序号） */
  id: string;
  /** 水果种类 */
  fruit: FruitType;
  /** 水果数量（1-5） */
  count: number;
}

/** 水果计数映射 */
export type FruitCount = Record<FruitType, number>;

// ============================================================
// 玩家相关
// ============================================================

/** 德国心脏病玩家 */
export interface HalliPlayer {
  /** 唯一玩家标识（UUID） */
  id: string;
  /** 昵称（2-8 字符） */
  name: string;
  /** 当前 socket 连接 ID */
  socketId: string;
  /** 摸牌堆（牌面朝下，仅服务端可见具体内容） */
  drawPile: FruitCard[];
  /** 翻牌堆（仅堆顶牌可见） */
  discardPile: FruitCard[];
  /** 是否已淘汰 */
  isEliminated: boolean;
  /** 淘汰顺序（用于排名，越大越早淘汰） */
  eliminationOrder: number | null;
  /** 是否房主 */
  isHost: boolean;
  /** 是否 AI 托管 */
  isAI: boolean;
  /** 是否在线 */
  isConnected: boolean;
  /** 是否已准备 */
  isReady: boolean;
}

// ============================================================
// 游戏状态
// ============================================================

/** 游戏阶段 */
export type HalliGamePhase =
  | 'flip'           // 等待当前玩家翻牌
  | 'bell_window'    // 按铃窗口期（翻牌后 3 秒内所有人可按铃）
  | 'bell_judging'   // 按铃判定中（处理收牌/罚牌）
  | 'finished';      // 游戏结束

/** 按铃记录 */
export interface BellRing {
  /** 按铃玩家 ID */
  playerId: string;
  /** 服务端接收时间戳（毫秒） */
  timestamp: number;
}

/** 游戏日志条目 */
export interface HalliLogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 操作玩家 ID */
  playerId: string;
  /** 操作类型 */
  action: 'flip' | 'ring_correct' | 'ring_wrong' | 'eliminated' | 'recycle' | 'game_over';
  /** 操作详情 */
  details: string;
}

/** 完整游戏状态（服务端） */
export interface HalliGameState {
  /** 房间 ID */
  roomId: string;
  /** 玩家列表 */
  players: HalliPlayer[];
  /** 当前翻牌玩家索引 */
  currentPlayerIndex: number;
  /** 游戏阶段 */
  phase: HalliGamePhase;
  /** 本次翻牌后的按铃记录列表 */
  bellRings: BellRing[];
  /** 当前所有堆顶牌的水果总数缓存 */
  topFruitCounts: FruitCount;
  /** 是否满足按铃条件 */
  bellConditionMet: boolean;
  /** 胜利者 ID */
  winnerId: string | null;
  /** 已淘汰玩家计数（用于排名） */
  eliminationCount: number;
  /** 回合开始时间戳 */
  turnStartTime: number;
  /** 游戏操作日志 */
  log: HalliLogEntry[];
}

// ============================================================
// 客户端可见状态（脱敏）
// ============================================================

/** 客户端可见的玩家信息 */
export interface ClientHalliPlayer {
  /** 玩家 ID */
  id: string;
  /** 昵称 */
  name: string;
  /** Draw_Pile 剩余牌数（不显示具体牌面） */
  drawPileCount: number;
  /** Discard_Pile 堆顶牌（null 表示空） */
  topCard: FruitCard | null;
  /** Discard_Pile 牌数 */
  discardPileCount: number;
  /** 是否已淘汰 */
  isEliminated: boolean;
  /** 淘汰顺序（用于排名，越大越早淘汰） */
  eliminationOrder: number | null;
  /** 是否房主 */
  isHost: boolean;
  /** 是否 AI 托管 */
  isAI: boolean;
  /** 是否在线 */
  isConnected: boolean;
}

/** 客户端可见的游戏状态 */
export interface ClientHalliGameState {
  /** 房间 ID */
  roomId: string;
  /** 客户端可见的玩家列表 */
  players: ClientHalliPlayer[];
  /** 当前翻牌玩家索引 */
  currentPlayerIndex: number;
  /** 游戏阶段 */
  phase: HalliGamePhase;
  /** 当前水果总数（所有堆顶牌） */
  topFruitCounts: FruitCount;
  /** 是否满足按铃条件 */
  bellConditionMet: boolean;
  /** 胜利者 ID */
  winnerId: string | null;
  /** 回合开始时间戳 */
  turnStartTime: number;
  /** 游戏操作日志 */
  log: HalliLogEntry[];
}

// ============================================================
// 房间类型
// ============================================================

/** 房间状态 */
export type HalliRoomStatus = 'waiting' | 'playing' | 'finished';

/** 德国心脏病房间 */
export interface HalliRoom {
  /** 6 位数字房间号 */
  id: string;
  /** 玩家列表 */
  players: HalliPlayer[];
  /** 房间状态 */
  status: HalliRoomStatus;
  /** 房主玩家 ID */
  hostId: string;
  /** 游戏状态 */
  gameState: HalliGameState | null;
  /** 创建时间戳 */
  createdAt: number;
  /** 是否允许 AI 托管 */
  allowAI: boolean;
}

// ============================================================
// 常量
// ============================================================

/** 标准牌组分布：每种水果 14 张 */
export const CARD_DISTRIBUTION: Record<number, number> = {
  1: 3,  // 1 个水果 × 3 张
  2: 3,  // 2 个水果 × 3 张
  3: 3,  // 3 个水果 × 3 张
  4: 2,  // 4 个水果 × 2 张
  5: 3,  // 5 个水果 × 3 张
};
// 每种水果：3+3+3+2+3 = 14 张
// 4 种水果 × 14 = 56 张

/** 水果种类列表 */
export const FRUIT_TYPES: FruitType[] = ['banana', 'strawberry', 'cherry', 'lime'];

/** 翻牌超时（毫秒） */
export const FLIP_TIMEOUT = 5 * 1000;

/** 按铃窗口期（毫秒） */
export const BELL_WINDOW_DURATION = 3 * 1000;

/** AI 翻牌延迟最小值（毫秒） */
export const AI_FLIP_DELAY_MIN = 1 * 1000;

/** AI 翻牌延迟最大值（毫秒） */
export const AI_FLIP_DELAY_MAX = 2 * 1000;

/** AI 按铃反应时间最小值（毫秒） */
export const AI_BELL_DELAY_MIN = 500;

/** AI 按铃反应时间最大值（毫秒） */
export const AI_BELL_DELAY_MAX = 1500;
