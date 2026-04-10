/**
 * 卡坦岛前端类型定义
 *
 * 从后端 types.ts 复制需要的客户端可见类型
 */

// ============================================================
// 基础类型
// ============================================================

/** 资源类型 */
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore'

/** 地形类型 */
export type TerrainType = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert'

/** 资源映射（各资源数量） */
export type ResourceMap = Record<ResourceType, number>

/** 建筑类型 */
export type BuildingType = 'settlement' | 'city'

/** 港口类型 */
export type HarborType = 'generic' | ResourceType

/** 发展卡类型 */
export type DevCardType = 'knight' | 'victory_point' | 'road_building' | 'year_of_plenty' | 'monopoly'

/** 玩家颜色 */
export type PlayerColor = 'red' | 'blue' | 'white' | 'orange'

/** 游戏阶段 */
export type GamePhase =
  | 'setup_settlement'
  | 'setup_road'
  | 'roll_dice'
  | 'discard'
  | 'move_robber'
  | 'steal'
  | 'trade_build'
  | 'finished'

/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished'

// ============================================================
// 地图相关
// ============================================================

/** 轴坐标 */
export interface AxialCoord {
  q: number
  r: number
}

/** 六边形地块 */
export interface HexTile {
  coord: AxialCoord
  terrain: TerrainType
  numberToken: number | null
  hasRobber: boolean
}

/** 港口 */
export interface Harbor {
  type: HarborType
  vertices: [string, string]
  edgeId: string
}

/** 顶点上的建筑 */
export interface VertexBuilding {
  type: BuildingType
  playerId: string
}

/** 边上的道路 */
export interface EdgeRoad {
  playerId: string
}

/** 六边形地图 */
export interface HexMap {
  tiles: HexTile[]
  harbors: Harbor[]
  vertices: Record<string, VertexBuilding>
  edges: Record<string, EdgeRoad>
}

// ============================================================
// 游戏状态相关
// ============================================================

/** 初始放置阶段追踪 */
export interface SetupState {
  round: 1 | 2
  order: number[]
  currentIndex: number
  settlementPlaced: boolean
}

/** 交易提案 */
export interface TradeProposal {
  id: string
  proposerId: string
  offer: ResourceMap
  request: ResourceMap
  acceptedBy: string[]
}

/** 丢弃状态追踪 */
export interface DiscardState {
  pendingPlayers: string[]
  completedPlayers: string[]
}

/** 游戏日志条目 */
export interface GameLogEntry {
  timestamp: number
  playerId: string
  action: string
  details: string
}

/** 交易比率 */
export interface TradeRatios {
  default: number
  resources: Record<ResourceType, number>
}

// ============================================================
// 客户端可见类型
// ============================================================

/** 客户端可见的玩家信息 */
export interface ClientCatanPlayer {
  id: string
  name: string
  color: PlayerColor
  resourceCount: number
  settlements: string[]
  cities: string[]
  roads: string[]
  devCardCount: number
  knightsPlayed: number
  longestRoadLength: number
  hasLongestRoad: boolean
  hasLargestArmy: boolean
  victoryPoints: number
  isHost: boolean
  isAI: boolean
  isConnected: boolean
}

/** 客户端可见的游戏状态 */
export interface ClientCatanGameState {
  roomId: string
  map: HexMap
  players: ClientCatanPlayer[]
  currentPlayerIndex: number
  phase: GamePhase
  setupState: SetupState | null
  diceResult: [number, number] | null
  discardState: DiscardState | null
  currentTrade: TradeProposal | null
  turnNumber: number
  winnerId: string | null
  turnStartTime: number
  log: GameLogEntry[]
  myResources: ResourceMap
  myDevCards: DevCardType[]
  validPositions: {
    roads: string[]
    settlements: string[]
    cities: string[]
  }
  tradeRatios: TradeRatios
}

/** 房间信息（不含 gameState，用于房间等待页面） */
export interface CatanRoomInfo {
  id: string
  players: {
    id: string
    name: string
    isReady: boolean
    isHost: boolean
    isAI: boolean
    isConnected: boolean
    color: PlayerColor
  }[]
  status: RoomStatus
  hostId: string
  allowAI: boolean
}

/** 聊天消息 */
export interface CatanChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: number
}

/** 游戏结束数据 */
export interface CatanGameOverData {
  winnerId: string
  players: ClientCatanPlayer[]
}
