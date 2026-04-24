/**
 * 你画我猜游戏状态 Context
 *
 * 使用 useReducer 管理游戏状态，提供 DrawGameProvider 和 useDrawGame hook
 * 参考 HalliGameContext 的实现模式
 */

import { createContext, useContext, useReducer } from 'react'
import { Outlet } from 'react-router-dom'

// ============================================================
// 客户端类型定义（对应 server/src/draw/types.ts 中的客户端可见类型）
// ============================================================

/** 词语难度 */
export type WordDifficulty = 'easy' | 'medium' | 'hard'

/** 词语分类 */
export type WordCategory = 'animal' | 'food' | 'object' | 'action' | 'profession' | 'place' | 'other'

/** 词语 */
export interface Word {
  text: string
  difficulty: WordDifficulty
  category: WordCategory
}

/** 绘画工具类型 */
export type DrawToolType = 'pen' | 'eraser'

/** 绘画动作 */
export interface DrawAction {
  id: string
  tool: DrawToolType
  color: string | null
  lineWidth: number
  points: { x: number; y: number }[]
}

/** 游戏配置 */
export interface GameConfig {
  rounds: number
  turnDuration: number
}

/** 游戏阶段 */
export type DrawGamePhase = 'word_select' | 'drawing' | 'turn_summary' | 'finished'

/** 客户端可见的玩家信息 */
export interface ClientDrawPlayer {
  id: string
  name: string
  score: number
  isHost: boolean
  isConnected: boolean
  hasGuessedCorrect: boolean
}

/** 客户端可见的游戏状态 */
export interface ClientDrawGameState {
  roomId: string
  players: ClientDrawPlayer[]
  config: GameConfig
  currentRound: number
  currentTurnIndex: number
  currentDrawerIndex: number
  phase: DrawGamePhase
  /** 当前词语（仅 Drawer 可见，Guesser 为 null） */
  currentWord: string | null
  /** 候选词语（仅 Drawer 在选词阶段可见） */
  candidateWords: Word[] | null
  /** 词语提示（下划线 + 已揭示字符） */
  hint: string[]
  turnStartTime: number
  turnDuration: number
  correctGuessCount: number
  totalGuessers: number
  winnerId: string | null
}

/** 房间状态 */
export type DrawRoomStatus = 'waiting' | 'playing' | 'finished'

/** 房间玩家信息（等待页使用） */
export interface DrawRoomPlayer {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  isConnected: boolean
}

/** 房间信息 */
export interface DrawRoomInfo {
  id: string
  players: DrawRoomPlayer[]
  status: DrawRoomStatus
  hostId: string
}

/** Turn 得分记录 */
export interface TurnScore {
  playerId: string
  playerName: string
  scoreGained: number
}

/** 玩家排名 */
export interface PlayerRanking {
  playerId: string
  playerName: string
  score: number
  rank: number
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  type: 'chat' | 'system' | 'correct' | 'close'
}

// ============================================================
// State 和 Action 定义
// ============================================================

export interface DrawGameContextState {
  /** 游戏状态 */
  gameState: ClientDrawGameState | null
  /** 房间信息 */
  roomInfo: DrawRoomInfo | null
  /** 当前玩家 ID */
  playerId: string | null
  /** 当前房间 ID */
  roomId: string | null
  /** 错误信息 */
  error: string | null
  /** Socket 连接状态 */
  isConnected: boolean
  /** 聊天消息列表 */
  chatMessages: ChatMessage[]
}

export type DrawGameAction =
  | { type: 'SET_GAME_STATE'; gameState: ClientDrawGameState }
  | { type: 'SET_ROOM_INFO'; roomInfo: DrawRoomInfo | null }
  | { type: 'SET_PLAYER_ID'; playerId: string }
  | { type: 'SET_ROOM_ID'; roomId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CONNECTED'; isConnected: boolean }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'CLEAR_CHAT' }
  | { type: 'RESET' }

const initialState: DrawGameContextState = {
  gameState: null,
  roomInfo: null,
  playerId: null,
  roomId: null,
  error: null,
  isConnected: false,
  chatMessages: [],
}

function drawGameReducer(
  state: DrawGameContextState,
  action: DrawGameAction,
): DrawGameContextState {
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
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.message] }
    case 'CLEAR_CHAT':
      return { ...state, chatMessages: [] }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ============================================================
// Context 和 Provider
// ============================================================

interface DrawGameContextValue {
  state: DrawGameContextState
  dispatch: React.Dispatch<DrawGameAction>
}

const DrawGameContext = createContext<DrawGameContextValue | null>(null)

/** DrawGameProvider 包裹 Outlet，用于路由共享状态 */
export function DrawGameProvider() {
  const [state, dispatch] = useReducer(drawGameReducer, initialState)

  return (
    <DrawGameContext.Provider value={{ state, dispatch }}>
      <Outlet />
    </DrawGameContext.Provider>
  )
}

/** 获取你画我猜游戏上下文 */
export function useDrawGame() {
  const context = useContext(DrawGameContext)
  if (!context) {
    throw new Error('useDrawGame 必须在 DrawGameProvider 内使用')
  }
  return context
}
