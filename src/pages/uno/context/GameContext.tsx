/**
 * UNO 游戏状态 Context
 *
 * 使用 useReducer 管理游戏状态，提供 GameProvider 和 useGameContext hook
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react'

// ============================================================
// 前端类型定义（复用后端 types 中的结构）
// ============================================================

/** 牌的颜色 */
export type CardColor = 'red' | 'yellow' | 'blue' | 'green' | 'wild'

/** 牌的类型 */
export type CardType = 'number' | 'action' | 'wild'

/** 牌的值 */
export type CardValue =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  | 'skip' | 'reverse' | 'draw_two'
  | 'wild' | 'wild_draw_four'

/** 单张 UNO 牌 */
export interface Card {
  id: string
  color: CardColor
  type: CardType
  value: CardValue
}

/** 出牌方向 */
export type Direction = 'clockwise' | 'counterclockwise'

/** 游戏阶段 */
export type GamePhase = 'playing' | 'choosing_color' | 'challenging' | 'finished'

/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished'

/** 客户端可见的玩家信息 */
export interface ClientPlayer {
  id: string
  name: string
  handCount: number
  isHost: boolean
  isAI: boolean
  isConnected: boolean
  calledUno: boolean
  isReady?: boolean
}

/** 客户端可见的游戏状态 */
export interface ClientGameState {
  roomId: string
  players: ClientPlayer[]
  topCard: Card
  drawPileCount: number
  currentPlayerIndex: number
  direction: Direction
  currentColor: CardColor
  phase: GamePhase
  myHand: Card[]
  playableCardIds: string[]
  winnerId: string | null
  turnStartTime: number
  lastPlayedCard: Card | null
  lastPlayerId: string | null
}

/** 房间信息（不含 gameState） */
export interface RoomInfo {
  id: string
  players: {
    id: string
    name: string
    isReady: boolean
    isHost: boolean
    isAI: boolean
    isConnected: boolean
  }[]
  status: RoomStatus
  hostId: string
}

/** 质疑结果 */
export interface ChallengeResult {
  success: boolean
  challengerId: string
  challengedId: string
  penaltyCards: number
}

/** 游戏消息 */
export interface GameMessage {
  id: string
  text: string
  timestamp: number
}

// ============================================================
// State 和 Action 定义
// ============================================================

export interface GameContextState {
  /** 当前玩家 ID */
  playerId: string | null
  /** 房间信息 */
  room: RoomInfo | null
  /** 游戏状态 */
  gameState: ClientGameState | null
  /** Socket 连接状态 */
  connected: boolean
  /** 游戏消息列表 */
  messages: GameMessage[]
  /** 游戏结束信息 */
  gameOver: { winnerId: string; players: ClientPlayer[] } | null
}

export type GameAction =
  | { type: 'SET_PLAYER_ID'; playerId: string }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_ROOM'; room: RoomInfo | null }
  | { type: 'SET_GAME_STATE'; gameState: ClientGameState }
  | { type: 'SET_GAME_OVER'; data: { winnerId: string; players: ClientPlayer[] } }
  | { type: 'ADD_MESSAGE'; message: GameMessage }
  | { type: 'RESET' }

const initialState: GameContextState = {
  playerId: null,
  room: null,
  gameState: null,
  connected: false,
  messages: [],
  gameOver: null,
}

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_PLAYER_ID':
      return { ...state, playerId: action.playerId }
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected }
    case 'SET_ROOM':
      return { ...state, room: action.room }
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.gameState }
    case 'SET_GAME_OVER':
      return { ...state, gameOver: action.data }
    case 'ADD_MESSAGE':
      // 最多保留 50 条消息
      return {
        ...state,
        messages: [...state.messages, action.message].slice(-50),
      }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ============================================================
// Context 和 Provider
// ============================================================

interface GameContextValue {
  state: GameContextState
  dispatch: React.Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGameContext 必须在 GameProvider 内使用')
  }
  return context
}
