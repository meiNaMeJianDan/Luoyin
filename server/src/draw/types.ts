// ============================================================
// 基础类型
// ============================================================

/** 词语难度 */
export type WordDifficulty = 'easy' | 'medium' | 'hard';

/** 词语分类 */
export type WordCategory = 'animal' | 'food' | 'object' | 'action' | 'profession' | 'place' | 'other';

/** 词语 */
export interface Word {
  /** 词语文本 */
  text: string;
  /** 难度等级 */
  difficulty: WordDifficulty;
  /** 分类 */
  category: WordCategory;
}

// ============================================================
// 绘画相关
// ============================================================

/** 绘画工具类型 */
export type DrawToolType = 'pen' | 'eraser';

/** 绘画动作 */
export interface DrawAction {
  /** 动作唯一 ID（用于撤销） */
  id: string;
  /** 工具类型 */
  tool: DrawToolType;
  /** 颜色（十六进制，橡皮擦时为 null） */
  color: string | null;
  /** 画笔粗细（px） */
  lineWidth: number;
  /** 坐标点序列（百分比值 0-1，适配不同屏幕） */
  points: { x: number; y: number }[];
}

// ============================================================
// 游戏配置
// ============================================================

/** 游戏配置 */
export interface GameConfig {
  /** 轮次数量（1-3） */
  rounds: number;
  /** 每回合时间（秒）：60 / 90 / 120 */
  turnDuration: number;
}

// ============================================================
// 玩家相关
// ============================================================

/** 你画我猜玩家 */
export interface DrawPlayer {
  /** 唯一玩家标识（UUID） */
  id: string;
  /** 昵称（2-8 字符） */
  name: string;
  /** 当前 socket 连接 ID */
  socketId: string;
  /** 累计总分 */
  score: number;
  /** 是否房主 */
  isHost: boolean;
  /** 是否在线 */
  isConnected: boolean;
  /** 是否已准备 */
  isReady: boolean;
  /** 当前 Turn 是否已猜对 */
  hasGuessedCorrect: boolean;
  /** 当前 Turn 的猜对时间戳（用于计分） */
  guessedAt: number | null;
}

// ============================================================
// 游戏状态
// ============================================================

/** 游戏阶段 */
export type DrawGamePhase =
  | 'word_select'    // Drawer 选词阶段
  | 'drawing'        // 绘画/猜词阶段
  | 'turn_summary'   // Turn 结算展示阶段
  | 'finished';      // 游戏结束

/** 词语提示状态 */
export interface WordHintState {
  /** 目标词语的字符数组 */
  chars: string[];
  /** 已揭示的字符位置索引 */
  revealedIndices: number[];
}

/** Turn 得分记录 */
export interface TurnScore {
  /** 玩家 ID */
  playerId: string;
  /** 玩家昵称 */
  playerName: string;
  /** 本 Turn 获得的分数 */
  scoreGained: number;
}

/** 完整游戏状态（服务端） */
export interface DrawGameState {
  /** 房间 ID */
  roomId: string;
  /** 玩家列表 */
  players: DrawPlayer[];
  /** 游戏配置 */
  config: GameConfig;
  /** 当前 Round（从 1 开始） */
  currentRound: number;
  /** 当前 Turn 在本 Round 中的索引（从 0 开始） */
  currentTurnIndex: number;
  /** Drawer 轮转顺序（玩家索引列表） */
  drawerOrder: number[];
  /** 当前 Drawer 的玩家索引 */
  currentDrawerIndex: number;
  /** 游戏阶段 */
  phase: DrawGamePhase;
  /** 当前目标词语（仅 Drawer 可见） */
  currentWord: string | null;
  /** 候选词语列表（选词阶段） */
  candidateWords: Word[] | null;
  /** 词语提示状态 */
  hintState: WordHintState | null;
  /** 已使用的词语列表（防止重复） */
  usedWords: string[];
  /** 当前 Turn 的绘画历史（用于断线重连） */
  drawHistory: DrawAction[];
  /** Turn 开始时间戳 */
  turnStartTime: number;
  /** 当前 Turn 猜对的玩家数量 */
  correctGuessCount: number;
  /** 胜利者 ID（得分最高者） */
  winnerId: string | null;
}

// ============================================================
// 客户端可见状态（脱敏）
// ============================================================

/** 客户端可见的玩家信息 */
export interface ClientDrawPlayer {
  /** 玩家 ID */
  id: string;
  /** 昵称 */
  name: string;
  /** 累计总分 */
  score: number;
  /** 是否房主 */
  isHost: boolean;
  /** 是否在线 */
  isConnected: boolean;
  /** 当前 Turn 是否已猜对 */
  hasGuessedCorrect: boolean;
}

/** 客户端可见的游戏状态 */
export interface ClientDrawGameState {
  /** 房间 ID */
  roomId: string;
  /** 客户端可见的玩家列表 */
  players: ClientDrawPlayer[];
  /** 游戏配置 */
  config: GameConfig;
  /** 当前 Round（从 1 开始） */
  currentRound: number;
  /** 当前 Turn 在本 Round 中的索引（从 0 开始） */
  currentTurnIndex: number;
  /** 当前 Drawer 的玩家索引 */
  currentDrawerIndex: number;
  /** 游戏阶段 */
  phase: DrawGamePhase;
  /** 当前词语（仅 Drawer 可见，Guesser 为 null） */
  currentWord: string | null;
  /** 候选词语（仅 Drawer 在选词阶段可见） */
  candidateWords: Word[] | null;
  /** 词语提示（下划线 + 已揭示字符） */
  hint: string[];
  /** Turn 开始时间戳 */
  turnStartTime: number;
  /** 每回合时间（秒） */
  turnDuration: number;
  /** 当前 Turn 猜对的玩家数量 */
  correctGuessCount: number;
  /** 总 Guesser 数量（用于判断是否全部猜对） */
  totalGuessers: number;
  /** 胜利者 ID（得分最高者） */
  winnerId: string | null;
}

// ============================================================
// 房间类型
// ============================================================

/** 房间状态 */
export type DrawRoomStatus = 'waiting' | 'playing' | 'finished';

/** 你画我猜房间 */
export interface DrawRoom {
  /** 6 位数字房间号 */
  id: string;
  /** 玩家列表 */
  players: DrawPlayer[];
  /** 房间状态 */
  status: DrawRoomStatus;
  /** 房主玩家 ID */
  hostId: string;
  /** 游戏状态 */
  gameState: DrawGameState | null;
  /** 创建时间戳 */
  createdAt: number;
}

// ============================================================
// 排名
// ============================================================

/** 玩家排名 */
export interface PlayerRanking {
  /** 玩家 ID */
  playerId: string;
  /** 玩家昵称 */
  playerName: string;
  /** 总分 */
  score: number;
  /** 排名（从 1 开始） */
  rank: number;
}

// ============================================================
// 常量
// ============================================================

/** 最大玩家数 */
export const MAX_PLAYERS = 8;

/** 最小玩家数 */
export const MIN_PLAYERS = 2;

/** 选词超时（秒） */
export const WORD_SELECT_TIMEOUT = 15;

/** 第一次提示揭示时间点（占总时间的百分比） */
export const HINT_REVEAL_1_PERCENT = 0.4;

/** 第二次提示揭示时间点（占总时间的百分比） */
export const HINT_REVEAL_2_PERCENT = 0.7;

/** Turn 结算展示时间（秒） */
export const TURN_SUMMARY_DURATION = 5;

/** Drawer 掉线后自动跳过 Turn 的等待时间（秒） */
export const DRAWER_DISCONNECT_TIMEOUT = 10;

/** 仅剩 1 人在线时暂停等待时间（秒） */
export const PAUSE_TIMEOUT = 120;

/** 全员掉线后房间清理时间（秒） */
export const ROOM_CLEANUP_TIMEOUT = 300;

/** 预设颜色列表（12 种） */
export const PRESET_COLORS: string[] = [
  '#000000', '#FF0000', '#0000FF', '#00AA00',
  '#FFFF00', '#FF8800', '#8800FF', '#FF69B4',
  '#8B4513', '#808080', '#FFFFFF', '#00CCCC',
];

/** 画笔粗细选项（px） */
export const LINE_WIDTHS: number[] = [2, 5, 10];
