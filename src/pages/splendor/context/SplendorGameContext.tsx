/**
 * 璀璨宝石游戏状态 Context
 *
 * 使用 useReducer 管理游戏状态，提供 SplendorGameProvider 和 useSplendorGame hook
 * 参考 HalliGameContext 的实现模式
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

// ============================================================
// 客户端类型定义
// ============================================================

/** 宝石颜色 */
export type GemColor = 'diamond' | 'sapphire' | 'emerald' | 'ruby' | 'onyx'

/** 宝石映射（含黄金） */
export type GemMap = Record<GemColor | 'gold', number>

/** 普通宝石映射 */
export type BasicGemMap = Record<GemColor, number>

/** 发展卡等级 */
export type CardLevel = 1 | 2 | 3

/** 发展卡 */
export interface DevelopmentCard {
  id: string
  level: CardLevel
  cost: BasicGemMap
  bonus: GemColor
  prestige: number
}

/** 贵族 */
export interface Noble {
  id: string
  requirements: BasicGemMap
  prestige: number
  name: string
}

/** 隐藏的预留卡信息 */
export interface HiddenReservedCard {
  level: CardLevel
}

/** 游戏阶段 */
export type SplendorGamePhase = 'player_turn' | 'return_gems' | 'choose_noble' | 'last_round' | 'finished'

/** 游戏日志条目 */
export interface SplendorLogEntry {
  timestamp: number
  playerId: string
  action: 'take_gems' | 'buy_card' | 'reserve_card' | 'return_gems' | 'noble_visit' | 'game_over'
  details: string
}

/** 客户端可见的玩家信息 */
export interface ClientSplendorPlayer {
  id: string
  name: string
  gems: GemMap
  bonus: BasicGemMap
  purchasedCardCount: number
  reservedCardCount: number
  reservedCards: (DevelopmentCard | HiddenReservedCard)[]
  nobles: string[]
  prestige: number
  isHost: boolean
  isAI: boolean
  isConnected: boolean
}

/** 客户端可见的游戏状态 */
export interface ClientSplendorGameState {
  roomId: string
  players: ClientSplendorPlayer[]
  currentPlayerIndex: number
  phase: SplendorGamePhase
  gemPool: GemMap
  deckCounts: Record<CardLevel, number>
  display: Record<CardLevel, DevelopmentCard[]>
  nobles: Noble[]
  isLastRound: boolean
  turnNumber: number
  winnerId: string | null
  turnStartTime: number
  log: SplendorLogEntry[]
}

/** 玩家排名 */
export interface PlayerRanking {
  playerId: string
  playerName: string
  prestige: number
  purchasedCardCount: number
  nobleCount: number
  rank: number
}

/** 房间状态 */
export type SplendorRoomStatus = 'waiting' | 'playing' | 'finished'

/** 房间玩家信息（等待页使用） */
export interface SplendorRoomPlayer {
  id: string
  name: string
  isHost: boolean
  isAI: boolean
  isReady: boolean
  isConnected: boolean
}

/** 房间信息 */
export interface SplendorRoomInfo {
  id: string
  players: SplendorRoomPlayer[]
  status: SplendorRoomStatus
  hostId: string
  allowAI: boolean
}

// ============================================================
// State 和 Action 定义
// ============================================================

export interface SplendorGameContextState {
  gameState: ClientSplendorGameState | null
  roomInfo: SplendorRoomInfo | null
  playerId: string | null
  roomId: string | null
  error: string | null
  isConnected: boolean
  /** 需要归还的宝石数量 */
  excessGems: number
  /** 需要选择的贵族列表 */
  choosableNobles: Noble[]
  /** 游戏结束排名 */
  rankings: PlayerRanking[]
}

export type SplendorGameAction =
  | { type: 'SET_GAME_STATE'; gameState: ClientSplendorGameState }
  | { type: 'SET_ROOM_INFO'; roomInfo: SplendorRoomInfo | null }
  | { type: 'SET_PLAYER_ID'; playerId: string }
  | { type: 'SET_ROOM_ID'; roomId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CONNECTED'; isConnected: boolean }
  | { type: 'SET_EXCESS_GEMS'; excessGems: number }
  | { type: 'SET_CHOOSABLE_NOBLES'; nobles: Noble[] }
  | { type: 'SET_RANKINGS'; rankings: PlayerRanking[] }
  | { type: 'RESET' }

const initialState: SplendorGameContextState = {
  gameState: null,
  roomInfo: null,
  playerId: null,
  roomId: null,
  error: null,
  isConnected: false,
  excessGems: 0,
  choosableNobles: [],
  rankings: [],
}

function splendorGameReducer(
  state: SplendorGameContextState,
  action: SplendorGameAction,
): SplendorGameContextState {
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
    case 'SET_EXCESS_GEMS':
      return { ...state, excessGems: action.excessGems }
    case 'SET_CHOOSABLE_NOBLES':
      return { ...state, choosableNobles: action.nobles }
    case 'SET_RANKINGS':
      return { ...state, rankings: action.rankings }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ============================================================
// Context 和 Provider
// ============================================================

interface SplendorGameContextValue {
  state: SplendorGameContextState
  dispatch: React.Dispatch<SplendorGameAction>
}

const SplendorGameContext = createContext<SplendorGameContextValue | null>(null)

/** SplendorGameProvider 包裹 Outlet，用于路由共享状态 */
export function SplendorGameProvider() {
  const [state, dispatch] = useReducer(splendorGameReducer, initialState)

  return (
    <SplendorGameContext.Provider value={{ state, dispatch }}>
      <Outlet />
    </SplendorGameContext.Provider>
  )
}

/** 获取璀璨宝石游戏上下文 */
export function useSplendorGame() {
  const context = useContext(SplendorGameContext)
  if (!context) {
    throw new Error('useSplendorGame 必须在 SplendorGameProvider 内使用')
  }
  return context
}
