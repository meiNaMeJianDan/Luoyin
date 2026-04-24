// ============================================================
// 基础类型
// ============================================================

/** 宝石颜色（5 种普通宝石） */
export type GemColor = 'diamond' | 'sapphire' | 'emerald' | 'ruby' | 'onyx';

/** 宝石映射（含黄金万能宝石） */
export type GemMap = Record<GemColor | 'gold', number>;

/** 仅普通宝石映射（不含黄金） */
export type BasicGemMap = Record<GemColor, number>;

/** 发展卡等级 */
export type CardLevel = 1 | 2 | 3;

// ============================================================
// 发展卡和贵族
// ============================================================

/** 发展卡 */
export interface DevelopmentCard {
  /** 唯一标识（格式："L{等级}-{序号}"，如 "L1-01"） */
  id: string;
  /** 等级（1/2/3） */
  level: CardLevel;
  /** 宝石购买成本 */
  cost: BasicGemMap;
  /** 提供的永久宝石折扣颜色 */
  bonus: GemColor;
  /** 声望点数（0-5） */
  prestige: number;
}

/** 贵族板块 */
export interface Noble {
  /** 唯一标识（格式："N-{序号}"，如 "N-01"） */
  id: string;
  /** Bonus 需求条件 */
  requirements: BasicGemMap;
  /** 提供的声望点数（固定 3 分） */
  prestige: number;
  /** 贵族名称（用于展示） */
  name: string;
}

// ============================================================
// 玩家相关
// ============================================================

/** 璀璨宝石玩家 */
export interface SplendorPlayer {
  /** 唯一玩家标识（UUID） */
  id: string;
  /** 昵称（2-8 字符） */
  name: string;
  /** 当前 socket 连接 ID */
  socketId: string;
  /** 持有的宝石筹码 */
  gems: GemMap;
  /** 已购买的发展卡 ID 列表 */
  purchasedCards: string[];
  /** 预留的发展卡 ID 列表（最多 3 张） */
  reservedCards: string[];
  /** 已拜访的贵族 ID 列表 */
  nobles: string[];
  /** 声望点数 */
  prestige: number;
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
export type SplendorGamePhase =
  | 'player_turn'      // 等待当前玩家执行操作
  | 'return_gems'      // 等待玩家归还多余宝石
  | 'choose_noble'     // 等待玩家选择贵族
  | 'last_round'       // 最后一轮（有人达到 15 分，继续执行直到本轮结束）
  | 'finished';        // 游戏结束

/** 游戏日志条目 */
export interface SplendorLogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 操作玩家 ID */
  playerId: string;
  /** 操作类型 */
  action: 'take_gems' | 'buy_card' | 'reserve_card' | 'return_gems' | 'noble_visit' | 'game_over';
  /** 操作详情 */
  details: string;
}

/** 完整游戏状态（服务端） */
export interface SplendorGameState {
  /** 房间 ID */
  roomId: string;
  /** 玩家列表 */
  players: SplendorPlayer[];
  /** 当前操作玩家索引 */
  currentPlayerIndex: number;
  /** 游戏阶段 */
  phase: SplendorGamePhase;
  /** 公共宝石池 */
  gemPool: GemMap;
  /** 3 个等级的发展卡牌堆（牌面朝下，数组末尾为顶部） */
  decks: Record<CardLevel, string[]>;
  /** 3 个等级的展示区（每个等级最多 4 张，存储卡牌 ID） */
  display: Record<CardLevel, string[]>;
  /** 公共贵族展示区（存储贵族 ID） */
  nobles: string[];
  /** 是否已触发最后一轮 */
  isLastRound: boolean;
  /** 触发最后一轮的玩家索引（用于判断本轮是否结束） */
  lastRoundTriggerIndex: number | null;
  /** 回合数 */
  turnNumber: number;
  /** 胜利者 ID */
  winnerId: string | null;
  /** 回合开始时间戳 */
  turnStartTime: number;
  /** 游戏操作日志 */
  log: SplendorLogEntry[];
}

// ============================================================
// 客户端可见状态（脱敏）
// ============================================================

/** 客户端可见的预留卡信息（其他玩家视角） */
export interface HiddenReservedCard {
  /** 发展卡等级（可见） */
  level: CardLevel;
}

/** 客户端可见的玩家信息 */
export interface ClientSplendorPlayer {
  /** 玩家 ID */
  id: string;
  /** 昵称 */
  name: string;
  /** 持有的宝石筹码 */
  gems: GemMap;
  /** 各颜色 Bonus 数量 */
  bonus: BasicGemMap;
  /** 已购买的发展卡数量 */
  purchasedCardCount: number;
  /** 预留卡数量 */
  reservedCardCount: number;
  /** 预留卡信息（仅自己可见完整内容，其他玩家仅见等级） */
  reservedCards: (DevelopmentCard | HiddenReservedCard)[];
  /** 已拜访的贵族 ID 列表 */
  nobles: string[];
  /** 声望点数 */
  prestige: number;
  /** 是否房主 */
  isHost: boolean;
  /** 是否 AI 托管 */
  isAI: boolean;
  /** 是否在线 */
  isConnected: boolean;
}

/** 客户端可见的游戏状态 */
export interface ClientSplendorGameState {
  /** 房间 ID */
  roomId: string;
  /** 客户端可见的玩家列表 */
  players: ClientSplendorPlayer[];
  /** 当前操作玩家索引 */
  currentPlayerIndex: number;
  /** 游戏阶段 */
  phase: SplendorGamePhase;
  /** 公共宝石池 */
  gemPool: GemMap;
  /** 3 个等级的牌堆剩余数量 */
  deckCounts: Record<CardLevel, number>;
  /** 3 个等级的展示区发展卡（完整信息） */
  display: Record<CardLevel, DevelopmentCard[]>;
  /** 公共贵族展示区（完整信息） */
  nobles: Noble[];
  /** 是否已触发最后一轮 */
  isLastRound: boolean;
  /** 回合数 */
  turnNumber: number;
  /** 胜利者 ID */
  winnerId: string | null;
  /** 回合开始时间戳 */
  turnStartTime: number;
  /** 游戏操作日志 */
  log: SplendorLogEntry[];
}


// ============================================================
// 房间类型
// ============================================================

/** 房间状态 */
export type SplendorRoomStatus = 'waiting' | 'playing' | 'finished';

/** 璀璨宝石房间 */
export interface SplendorRoom {
  /** 6 位数字房间号 */
  id: string;
  /** 玩家列表 */
  players: SplendorPlayer[];
  /** 房间状态 */
  status: SplendorRoomStatus;
  /** 房主玩家 ID */
  hostId: string;
  /** 游戏状态 */
  gameState: SplendorGameState | null;
  /** 创建时间戳 */
  createdAt: number;
  /** 是否允许 AI 托管 */
  allowAI: boolean;
}

// ============================================================
// AI 相关
// ============================================================

/** AI 操作类型 */
export type AiAction =
  | { type: 'take_three'; gems: GemColor[] }
  | { type: 'take_two'; gem: GemColor }
  | { type: 'buy_card'; cardId: string }
  | { type: 'reserve_card'; cardId: string }
  | { type: 'reserve_deck'; level: CardLevel };

// ============================================================
// 排名
// ============================================================

/** 玩家排名 */
export interface PlayerRanking {
  /** 玩家 ID */
  playerId: string;
  /** 玩家昵称 */
  playerName: string;
  /** 声望点数 */
  prestige: number;
  /** 已购买发展卡数量 */
  purchasedCardCount: number;
  /** 已拜访贵族数量 */
  nobleCount: number;
  /** 排名（从 1 开始） */
  rank: number;
}

// ============================================================
// 常量
// ============================================================

/** 最大玩家数 */
export const MAX_PLAYERS = 4;

/** 最小玩家数 */
export const MIN_PLAYERS = 2;

/** 宝石颜色列表 */
export const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'];

/** 根据玩家人数确定每种普通宝石的初始数量 */
export const GEM_COUNT_BY_PLAYERS: Record<number, number> = {
  2: 4,
  3: 5,
  4: 7,
};

/** 黄金万能宝石固定数量 */
export const GOLD_COUNT = 5;

/** 玩家宝石持有上限 */
export const MAX_GEMS_IN_HAND = 10;

/** 玩家预留卡上限 */
export const MAX_RESERVED_CARDS = 3;

/** 拿取同色 2 个宝石时该颜色最低要求数量 */
export const MIN_GEMS_FOR_TAKE_TWO = 4;

/** 胜利所需声望点数 */
export const VICTORY_PRESTIGE = 15;

/** 回合超时时间（秒） */
export const TURN_TIMEOUT = 60;

/** AI 操作延迟最小值（毫秒） */
export const AI_ACTION_DELAY_MIN = 2000;

/** AI 操作延迟最大值（毫秒） */
export const AI_ACTION_DELAY_MAX = 4000;

/** 贵族提供的声望点数 */
export const NOBLE_PRESTIGE = 3;

/** 每个等级的发展卡数量 */
export const CARDS_PER_LEVEL: Record<CardLevel, number> = { 1: 40, 2: 30, 3: 20 };

/** 每个等级展示区的卡牌数量 */
export const DISPLAY_SIZE = 4;

/** 根据玩家人数确定贵族数量（玩家数 + 1） */
export const NOBLE_COUNT_BY_PLAYERS: Record<number, number> = {
  2: 3,
  3: 4,
  4: 5,
};
