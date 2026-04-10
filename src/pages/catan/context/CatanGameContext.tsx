/**
 * 卡坦岛游戏状态 Context
 *
 * 使用 useReducer 管理游戏状态，提供 CatanGameProvider 和 useCatanGame hook
 * 参考 UNO GameContext 的实现模式
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import type {
  ClientCatanGameState,
  CatanRoomInfo,
  CatanChatMessage,
  CatanGameOverData,
} from '../types'

// ============================================================
// State 和 Action 定义
// ============================================================

export interface CatanGameContextState {
  /** 当前玩家 ID */
  playerId: string | null
  /** 房间 ID */
  roomId: string | null
  /** 房间信息 */
  roomInfo: CatanRoomInfo | null
  /** 游戏状态 */
  gameState: ClientCatanGameState | null
  /** Socket 连接状态 */
  connected: boolean
  /** 聊天消息列表 */
  chatMessages: CatanChatMessage[]
  /** 游戏结束信息 */
  gameOver: CatanGameOverData | null
  /** 错误信息 */
  error: string | null
}

export type CatanGameAction =
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_PLAYER_ID'; playerId: string }
  | { type: 'SET_ROOM_ID'; roomId: string }
  | { type: 'SET_ROOM_INFO'; roomInfo: CatanRoomInfo | null }
  | { type: 'SET_GAME_STATE'; gameState: ClientCatanGameState }
  | { type: 'SET_GAME_OVER'; data: CatanGameOverData }
  | { type: 'ADD_CHAT_MESSAGE'; message: CatanChatMessage }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' }

const initialState: CatanGameContextState = {
  playerId: null,
  roomId: null,
  roomInfo: null,
  gameState: null,
  connected: false,
  chatMessages: [],
  gameOver: null,
  error: null,
}

function catanGameReducer(state: CatanGameContextState, action: CatanGameAction): CatanGameContextState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected }
    case 'SET_PLAYER_ID':
      return { ...state, playerId: action.playerId }
    case 'SET_ROOM_ID':
      return { ...state, roomId: action.roomId }
    case 'SET_ROOM_INFO':
      return { ...state, roomInfo: action.roomInfo }
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.gameState }
    case 'SET_GAME_OVER':
      return { ...state, gameOver: action.data }
    case 'ADD_CHAT_MESSAGE':
      // 最多保留 100 条聊天消息
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message].slice(-100),
      }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ============================================================
// Context 和 Provider
// ============================================================

interface CatanGameContextValue {
  state: CatanGameContextState
  dispatch: React.Dispatch<CatanGameAction>
}

const CatanGameContext = createContext<CatanGameContextValue | null>(null)

/** CatanGameProvider 包裹 Outlet，用于路由共享状态 */
export function CatanGameProvider() {
  const [state, dispatch] = useReducer(catanGameReducer, initialState)

  return (
    <CatanGameContext.Provider value={{ state, dispatch }}>
      <Outlet />
    </CatanGameContext.Provider>
  )
}

/** 也支持包裹 children 的用法 */
export function CatanGameProviderWithChildren({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(catanGameReducer, initialState)

  return (
    <CatanGameContext.Provider value={{ state, dispatch }}>
      {children}
    </CatanGameContext.Provider>
  )
}

export function useCatanGame() {
  const context = useContext(CatanGameContext)
  if (!context) {
    throw new Error('useCatanGame 必须在 CatanGameProvider 内使用')
  }
  return context
}
