// ============================================================
// 基础类型
// ============================================================

/** 资源类型 */
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

/** 地形类型 */
export type TerrainType = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert';

/** 资源映射（各资源数量） */
export type ResourceMap = Record<ResourceType, number>;

/** 建筑类型 */
export type BuildingType = 'settlement' | 'city';

/** 港口类型 */
export type HarborType = 'generic' | ResourceType;

/** 发展卡类型（可选扩展） */
export type DevCardType = 'knight' | 'victory_point' | 'road_building' | 'year_of_plenty' | 'monopoly';

/** 发展卡使用参数（可选扩展） */
export interface DevCardParams {
  /** 垄断卡：指定资源类型 */
  resource?: ResourceType;
  /** 发明卡：选择的两种资源 */
  resources?: [ResourceType, ResourceType];
  /** 道路建设卡：两条道路的边 ID */
  edges?: [string, string];
  /** 骑士卡：移动强盗的目标地块 ID */
  hexId?: string;
  /** 骑士卡：抢夺目标玩家 ID */
  targetPlayerId?: string;
}

// ============================================================
// 地图相关
// ============================================================

/** 轴坐标 */
export interface AxialCoord {
  q: number;
  r: number;
}

/** 六边形地块 */
export interface HexTile {
  /** 轴坐标 */
  coord: AxialCoord;
  /** 地形类型 */
  terrain: TerrainType;
  /** 资源点数标记（2-12），沙漠为 null */
  numberToken: number | null;
  /** 是否有强盗 */
  hasRobber: boolean;
}

/** 港口 */
export interface Harbor {
  /** 港口类型 */
  type: HarborType;
  /** 港口关联的两个顶点 ID */
  vertices: [string, string];
  /** 港口朝向的边 ID */
  edgeId: string;
}

/** 顶点上的建筑 */
export interface VertexBuilding {
  /** 建筑类型 */
  type: BuildingType;
  /** 所属玩家 ID */
  playerId: string;
}

/** 边上的道路 */
export interface EdgeRoad {
  /** 所属玩家 ID */
  playerId: string;
}

/** 六边形地图（vertices 和 edges 使用 Record 以便序列化） */
export interface HexMap {
  /** 所有地块 */
  tiles: HexTile[];
  /** 港口列表 */
  harbors: Harbor[];
  /** 顶点建筑，key 为顶点 ID（格式 "q,r,d"） */
  vertices: Record<string, VertexBuilding>;
  /** 边道路，key 为边 ID（格式 "q,r,d"） */
  edges: Record<string, EdgeRoad>;
}

// ============================================================
// 玩家相关
// ============================================================

/** 玩家颜色（红/蓝/白/橙） */
export type PlayerColor = 'red' | 'blue' | 'white' | 'orange';

/** 卡坦岛玩家 */
export interface CatanPlayer {
  /** 唯一玩家标识（UUID） */
  id: string;
  /** 昵称（2～8 字符） */
  name: string;
  /** 当前 socket 连接 ID */
  socketId: string;
  /** 资源手牌 */
  resources: ResourceMap;
  /** 已建造的村庄顶点 ID 列表 */
  settlements: string[];
  /** 已建造的城市顶点 ID 列表 */
  cities: string[];
  /** 已建造的道路边 ID 列表 */
  roads: string[];
  /** 发展卡手牌（可选扩展） */
  devCards: DevCardType[];
  /** 已使用的骑士卡数量（可选扩展） */
  knightsPlayed: number;
  /** 最长连续道路长度 */
  longestRoadLength: number;
  /** 是否持有"最长道路"称号 */
  hasLongestRoad: boolean;
  /** 是否持有"最大骑士团"称号（可选扩展） */
  hasLargestArmy: boolean;
  /** 胜利分 */
  victoryPoints: number;
  /** 是否房主 */
  isHost: boolean;
  /** 是否 AI 托管 */
  isAI: boolean;
  /** 是否在线 */
  isConnected: boolean;
  /** 是否已准备 */
  isReady: boolean;
  /** 玩家颜色 */
  color: PlayerColor;
}

// ============================================================
// 游戏状态
// ============================================================

/** 游戏阶段 */
export type GamePhase =
  | 'setup_settlement'    // 初始放置：放村庄
  | 'setup_road'          // 初始放置：放道路
  | 'roll_dice'           // 掷骰阶段
  | 'discard'             // 丢弃资源阶段（骰子为 7）
  | 'move_robber'         // 移动强盗阶段
  | 'steal'               // 抢夺资源阶段
  | 'trade_build'         // 交易/建造阶段
  | 'finished';           // 游戏结束

/** 初始放置阶段追踪 */
export interface SetupState {
  /** 当前是第几轮放置（1 或 2） */
  round: 1 | 2;
  /** 当前放置顺序中的玩家索引列表 */
  order: number[];
  /** 当前放置到第几个玩家 */
  currentIndex: number;
  /** 当前玩家是否已放置村庄（等待放道路） */
  settlementPlaced: boolean;
}

/** 交易提案 */
export interface TradeProposal {
  /** 交易唯一 ID */
  id: string;
  /** 发起者 ID */
  proposerId: string;
  /** 提供的资源 */
  offer: ResourceMap;
  /** 期望的资源 */
  request: ResourceMap;
  /** 已接受的玩家 ID 列表 */
  acceptedBy: string[];
}

/** 丢弃状态追踪 */
export interface DiscardState {
  /** 需要丢弃资源的玩家 ID 列表 */
  pendingPlayers: string[];
  /** 已完成丢弃的玩家 ID 列表 */
  completedPlayers: string[];
}

/** 发展卡牌堆（可选扩展） */
export interface DevCardDeck {
  /** 牌堆中的发展卡 */
  cards: DevCardType[];
  /** 剩余数量 */
  remaining: number;
}

/** 游戏日志条目 */
export interface GameLogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 操作玩家 ID */
  playerId: string;
  /** 操作类型 */
  action: string;
  /** 操作详情 */
  details: string;
}

/** 完整游戏状态 */
export interface CatanGameState {
  /** 房间 ID */
  roomId: string;
  /** 地图 */
  map: HexMap;
  /** 玩家列表 */
  players: CatanPlayer[];
  /** 当前操作玩家索引 */
  currentPlayerIndex: number;
  /** 游戏阶段 */
  phase: GamePhase;
  /** 初始放置状态 */
  setupState: SetupState | null;
  /** 本回合骰子结果 */
  diceResult: [number, number] | null;
  /** 丢弃状态 */
  discardState: DiscardState | null;
  /** 当前交易提案 */
  currentTrade: TradeProposal | null;
  /** 发展卡牌堆（可选扩展） */
  devCardDeck: DevCardDeck | null;
  /** 本回合是否已使用发展卡 */
  devCardUsedThisTurn: boolean;
  /** 本回合购买的发展卡（不能立即使用） */
  devCardBoughtThisTurn: DevCardType[];
  /** 回合数 */
  turnNumber: number;
  /** 胜利者 ID */
  winnerId: string | null;
  /** 回合开始时间戳 */
  turnStartTime: number;
  /** 游戏操作日志 */
  log: GameLogEntry[];
}

// ============================================================
// 客户端可见状态（脱敏）
// ============================================================

/** 客户端可见的玩家信息 */
export interface ClientCatanPlayer {
  /** 玩家 ID */
  id: string;
  /** 昵称 */
  name: string;
  /** 玩家颜色 */
  color: PlayerColor;
  /** 资源总数（不显示具体类型） */
  resourceCount: number;
  /** 已建造的村庄顶点 ID 列表 */
  settlements: string[];
  /** 已建造的城市顶点 ID 列表 */
  cities: string[];
  /** 已建造的道路边 ID 列表 */
  roads: string[];
  /** 发展卡数量 */
  devCardCount: number;
  /** 已使用的骑士卡数量 */
  knightsPlayed: number;
  /** 最长连续道路长度 */
  longestRoadLength: number;
  /** 是否持有"最长道路"称号 */
  hasLongestRoad: boolean;
  /** 是否持有"最大骑士团"称号 */
  hasLargestArmy: boolean;
  /** 胜利分 */
  victoryPoints: number;
  /** 是否房主 */
  isHost: boolean;
  /** 是否 AI 托管 */
  isAI: boolean;
  /** 是否在线 */
  isConnected: boolean;
}

/** 交易比率 */
export interface TradeRatios {
  /** 默认银行交易比率（通常为 4） */
  default: number;
  /** 各资源的最优交易比率 */
  resources: Record<ResourceType, number>;
}

/** 客户端可见的游戏状态 */
export interface ClientCatanGameState {
  /** 房间 ID */
  roomId: string;
  /** 地图 */
  map: HexMap;
  /** 客户端可见的玩家列表 */
  players: ClientCatanPlayer[];
  /** 当前操作玩家索引 */
  currentPlayerIndex: number;
  /** 游戏阶段 */
  phase: GamePhase;
  /** 初始放置状态 */
  setupState: SetupState | null;
  /** 本回合骰子结果 */
  diceResult: [number, number] | null;
  /** 丢弃状态 */
  discardState: DiscardState | null;
  /** 当前交易提案 */
  currentTrade: TradeProposal | null;
  /** 回合数 */
  turnNumber: number;
  /** 胜利者 ID */
  winnerId: string | null;
  /** 回合开始时间戳 */
  turnStartTime: number;
  /** 游戏操作日志 */
  log: GameLogEntry[];
  /** 当前玩家自己的资源详情 */
  myResources: ResourceMap;
  /** 当前玩家的发展卡 */
  myDevCards: DevCardType[];
  /** 当前玩家可合法建造的位置 */
  validPositions: {
    roads: string[];
    settlements: string[];
    cities: string[];
  };
  /** 当前玩家可用的交易比率 */
  tradeRatios: TradeRatios;
}

// ============================================================
// 房间类型（复用 UNO 模式）
// ============================================================

/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** 卡坦岛房间 */
export interface CatanRoom {
  /** 6 位数字房间号 */
  id: string;
  /** 玩家列表 */
  players: CatanPlayer[];
  /** 房间状态 */
  status: RoomStatus;
  /** 房主玩家 ID */
  hostId: string;
  /** 游戏状态 */
  gameState: CatanGameState | null;
  /** 创建时间戳 */
  createdAt: number;
  /** 是否允许 AI 托管 */
  allowAI: boolean;
  /** 是否启用发展卡（可选扩展） */
  enableDevCards: boolean;
}

// ============================================================
// 常量
// ============================================================

/** 建造费用 */
export const BUILD_COSTS: Record<string, ResourceMap> = {
  road:       { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 },
  city:       { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
  devCard:    { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 },
};

/** 地形到资源映射 */
export const TERRAIN_RESOURCE: Record<TerrainType, ResourceType | null> = {
  forest:    'wood',
  hills:     'brick',
  pasture:   'sheep',
  fields:    'wheat',
  mountains: 'ore',
  desert:    null,
};
