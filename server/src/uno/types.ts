/** 牌的颜色 */
export type CardColor = 'red' | 'yellow' | 'blue' | 'green' | 'wild';

/** 牌的类型 */
export type CardType = 'number' | 'action' | 'wild';

/** 牌的值 */
export type CardValue =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  | 'skip' | 'reverse' | 'draw_two'
  | 'wild' | 'wild_draw_four';

/** 单张 UNO 牌 */
export interface Card {
  /** 唯一标识，如 "red-3-1" */
  id: string;
  /** 牌的颜色 */
  color: CardColor;
  /** 牌的类型 */
  type: CardType;
  /** 牌的值 */
  value: CardValue;
}

/** 玩家状态 */
export interface Player {
  /** 唯一玩家标识（UUID） */
  id: string;
  /** 昵称（2～8 字符） */
  name: string;
  /** 当前 socket 连接 ID */
  socketId: string;
  /** 手牌 */
  hand: Card[];
  /** 准备状态 */
  isReady: boolean;
  /** 是否房主 */
  isHost: boolean;
  /** 是否 AI 托管 */
  isAI: boolean;
  /** 是否在线 */
  isConnected: boolean;
  /** 是否已喊 UNO */
  calledUno: boolean;
}

/** 出牌方向 */
export type Direction = 'clockwise' | 'counterclockwise';

/** 游戏阶段 */
export type GamePhase =
  | 'playing'           // 正常出牌
  | 'choosing_color'    // 等待选择颜色
  | 'challenging'       // 等待质疑决策
  | 'finished';         // 游戏结束

/** 游戏状态 */
export interface GameState {
  /** 房间 ID */
  roomId: string;
  /** 玩家列表 */
  players: Player[];
  /** 摸牌堆 */
  drawPile: Card[];
  /** 弃牌堆 */
  discardPile: Card[];
  /** 当前操作玩家索引 */
  currentPlayerIndex: number;
  /** 出牌方向 */
  direction: Direction;
  /** 当前有效颜色（Wild 牌指定后更新） */
  currentColor: CardColor;
  /** 游戏阶段 */
  phase: GamePhase;
  /** 最后打出的牌 */
  lastPlayedCard: Card | null;
  /** 最后出牌的玩家 */
  lastPlayerId: string | null;
  /** 待摸牌数（+2/+4 累积） */
  pendingDrawCount: number;
  /** 胜利者 ID */
  winnerId: string | null;
  /** 当前回合开始时间戳 */
  turnStartTime: number;
  /** Wild+4 质疑时需要的前一张堆顶颜色 */
  previousColor: CardColor;
}

/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** 房间 */
export interface Room {
  /** 6 位数字房间号 */
  id: string;
  /** 玩家列表 */
  players: Player[];
  /** 房间状态 */
  status: RoomStatus;
  /** 房主玩家 ID */
  hostId: string;
  /** 游戏状态 */
  gameState: GameState | null;
  /** 创建时间戳 */
  createdAt: number;
}

/** 质疑结果 */
export interface ChallengeResult {
  /** 质疑是否成功 */
  success: boolean;
  /** 质疑方玩家 ID */
  challengerId: string;
  /** 被质疑方玩家 ID */
  challengedId: string;
  /** 罚牌数量 */
  penaltyCards: number;
}

/** AI 决策结果 */
export interface AiDecision {
  /** 操作类型：出牌或摸牌 */
  action: 'play' | 'draw';
  /** 要出的牌 */
  card?: Card;
  /** Wild 牌指定的颜色 */
  chosenColor?: CardColor;
}

/** 客户端可见的游戏状态（隐藏其他玩家手牌） */
export interface ClientGameState {
  /** 房间 ID */
  roomId: string;
  /** 客户端可见的玩家列表 */
  players: ClientPlayer[];
  /** 弃牌堆堆顶牌 */
  topCard: Card;
  /** 摸牌堆剩余数量 */
  drawPileCount: number;
  /** 当前操作玩家索引 */
  currentPlayerIndex: number;
  /** 出牌方向 */
  direction: Direction;
  /** 当前有效颜色 */
  currentColor: CardColor;
  /** 游戏阶段 */
  phase: GamePhase;
  /** 当前玩家的手牌 */
  myHand: Card[];
  /** 当前玩家可出的牌 ID 列表 */
  playableCardIds: string[];
  /** 胜利者 ID */
  winnerId: string | null;
  /** 当前回合开始时间戳 */
  turnStartTime: number;
  /** 最后打出的牌 */
  lastPlayedCard: Card | null;
  /** 最后出牌的玩家 ID */
  lastPlayerId: string | null;
}

/** 客户端可见的玩家信息 */
export interface ClientPlayer {
  /** 玩家 ID */
  id: string;
  /** 昵称 */
  name: string;
  /** 手牌数量 */
  handCount: number;
  /** 是否房主 */
  isHost: boolean;
  /** 是否 AI 托管 */
  isAI: boolean;
  /** 是否在线 */
  isConnected: boolean;
  /** 是否已喊 UNO */
  calledUno: boolean;
}
