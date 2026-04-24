/**
 * 德国心脏病游戏状态 Context
 *
 * 使用 useReducer 管理游戏状态，提供 HalliGameProvider 和 useHalliGame hook
 * 参考 CatanGameContext 的实现模式
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

// ============================================================
// 客户端类型定义（对应 server/src/halli/types.ts 中的客户端可见类型）
// ============================================================

/** 水果种类 */
export type FruitType = 'banana' | 'strawberry' | 'cherry' | 'lime'

/** 水果牌 */
export interface FruitCard {
  id: string
  fruit: FruitType
  count: number
}

/** 水果计数映射 */
export type FruitCount = Record<FruitType, number>

/** 游戏阶段 */
export type HalliGamePhase = 'flip' | 'bell_window' | 'bell_judging' | 'finished'

/** 游戏日志条目 */
export interface HalliLogEntry {
  timestamp: number
  playerId: string
  action: 'flip' | 'ring_correct' | 'ring_wrong' | 'eliminated' | 'recycle' | 'game_over'
  details: string
}

/** 客户端可见的玩家信息 */
export interface ClientHalliPlayer {
  id: string
  name: string
  drawPileCount: number
  topCard: FruitCard | null
  discardPileCount: number
  isEliminated: boolean
  eliminationOrder: number | null
  isHost: boolean
  isAI: boolean
  isConnected: boolean
}

/** 客户端可见的游戏状态 */
export interface ClientHalliGameState {
  roomId: string
  players: ClientHalliPlayer[]
  currentPlayerIndex: number
  phase: HalliGamePhase
  topFruitCounts: FruitCount
  bellConditionMet: boolean
  winnerId: string | null
  turnStartTime: number
  log: HalliLogEntry[]
}

/** 房间状态 */
export type HalliRoomStatus = 'waiting' | 'playing' | 'finished'

/** 房间玩家信息（等待页使用） */
export interface HalliRoomPlayer {
  id: string
  name: string
  isHost: boolean
  isAI: boolean
  isReady: boolean
  isConnected: boolean
}

/** 房间信息 */
export interface HalliRoomInfo {
  id: string
  players: HalliRoomPlayer[]
  status: HalliRoomStatus
  hostId: string
}

// ============================================================
// State 和 Action 定义
// ============================================================

export interface HalliGameContextState {
  /** 游戏状态 */
  gameState: ClientHalliGameState | null
  /** 房间信息 */
  roomInfo: HalliRoomInfo | null
  /** 当前玩家 ID */
  playerId: string | null
  /** 当前房间 ID */
  roomId: string | null
  /** 错误信息 */
  error: string | null
  /** Socket 连接状态 */
  isConnected: boolean
}

export type HalliGameAction =
  | { type: 'SET_GAME_STATE'; gameState: ClientHalliGameState }
  | { type: 'SET_ROOM_INFO'; roomInfo: HalliRoomInfo | null }
  | { type: 'SET_PLAYER_ID'; playerId: string }
  | { type: 'SET_ROOM_ID'; roomId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CONNECTED'; isConnected: boolean }
  | { type: 'RESET' }

const initialState: HalliGameContextState = {
  gameState: null,
  roomInfo: null,
  playerId: null,
  roomId: null,
  error: null,
  isConnected: false,
}

function halliGameReducer(
  state: HalliGameContextState,
  action: HalliGameAction
): HalliGameContextState {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.gameState }
    case 'SET_ROOM_INFO':
      return { ...state, roomInfo: action.roomInfo }
    case 'SET_PLAYER_ID':
      return { ...state, playerId: action.playerId }
    case 'SET_ROOM_ID':
      return { ...state, roomId: action.roomId }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.isConnected }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ============================================================
// Context 和 Provider
// ============================================================

interface HalliGameContextValue {
  state: HalliGameContextState
  dispatch: React.Dispatch<HalliGameAction>
}

const HalliGameContext = createContext<HalliGameContextValue | null>(null)

/** HalliGameProvider 包裹 Outlet，用于路由共享状态 */
export function HalliGameProvider() {
  const [state, dispatch] = useReducer(halliGameReducer, initialState)

  return (
    <HalliGameContext.Provider value={{ state, dispatch }}>
      <Outlet />
    </HalliGameContext.Provider>
  )
}

/** 支持包裹 children 的用法 */
export function HalliGameProviderWithChildren({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(halliGameReducer, initialState)

  return (
    <HalliGameContext.Provider value={{ state, dispatch }}>
      {children}
    </HalliGameContext.Provider>
  )
}

/** 获取德国心脏病游戏上下文 */
export function useHalliGame() {
  const context = useContext(HalliGameContext)
  if (!context) {
    throw new Error('useHalliGame 必须在 HalliGameProvider 内使用')
  }
  return context
}
