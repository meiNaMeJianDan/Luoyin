/**
 * 璀璨宝石游戏操作 hook
 *
 * 封装所有 splendor: 前缀的 Socket 事件发送和监听
 * 参考 Halli useGame 的实现模式（使用 stateRef/navigateRef）
 */

import { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  useSplendorGame,
  type ClientSplendorGameState,
  type SplendorRoomInfo,
  type Noble,
  type PlayerRanking,
} from '../context/SplendorGameContext'
import { useSocket, saveSession, clearSession } from './useSocket'
import type { GemColor, GemMap } from '../context/SplendorGameContext'

export function useGame() {
  const { state, dispatch } = useSplendorGame()
  const { socketRef, emit } = useSocket()
  const navigate = useNavigate()

  const stateRef = useRef(state)
  stateRef.current = state

  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // 监听所有 splendor: 前缀的服务端事件
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const onRoomCreated = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigateRef.current(`/splendor/room/${data.roomId}`)
    }

    const onRoomJoined = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigateRef.current(`/splendor/room/${data.roomId}`)
    }

    const onRoomUpdated = (roomInfo: SplendorRoomInfo) => {
      dispatch({ type: 'SET_ROOM_INFO', roomInfo })
    }

    const onGameStarted = (gameState: ClientSplendorGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
      if (gameState?.roomId) {
        navigateRef.current(`/splendor/game/${gameState.roomId}`)
      }
    }

    const onGameState = (gameState: ClientSplendorGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
    }

    const onRequireReturnGems = (data: { excessCount: number }) => {
      dispatch({ type: 'SET_EXCESS_GEMS', excessGems: data.excessCount })
    }

    const onChooseNoble = (data: { nobles: Noble[] }) => {
      dispatch({ type: 'SET_CHOOSABLE_NOBLES', nobles: data.nobles })
    }

    const onNobleVisited = (data: { playerId: string; nobleId: string }) => {
      const playerName = findPlayerName(data.playerId)
      toast.success(`👑 ${playerName} 获得贵族来访！`)
    }

    const onGameOver = (data: { winnerId: string; rankings: PlayerRanking[] }) => {
      dispatch({ type: 'SET_RANKINGS', rankings: data.rankings })
      const playerName = findPlayerName(data.winnerId)
      toast.success(`🏆 ${playerName} 获胜！`)
      const s = stateRef.current
      const roomId = s.gameState?.roomId || s.roomId
      if (roomId) {
        setTimeout(() => navigateRef.current(`/splendor/result/${roomId}`), 1500)
      }
    }

    const onError = (data: { message: string }) => {
      if (data.message.includes('重连失败')) {
        clearSession()
        return
      }
      toast.error(data.message)
      dispatch({ type: 'SET_ERROR', error: data.message })
    }

    const onPlayerDisconnected = (data: { playerId: string }) => {
      const playerName = findPlayerName(data.playerId)
      toast.info(`⚡ ${playerName} 断线了`)
    }

    const onPlayerReconnected = (data: { playerId: string }) => {
      const playerName = findPlayerName(data.playerId)
      toast.info(`🔄 ${playerName} 重新连接`)
    }

    const onChatMessage = (data: { playerId: string; playerName: string; message: string }) => {
      toast.info(`💬 ${data.playerName}: ${data.message}`)
    }

    function findPlayerName(playerId: string): string {
      const s = stateRef.current
      const players = s.gameState?.players || s.roomInfo?.players || []
      const player = players.find((p) => p.id === playerId)
      return player?.name || '玩家'
    }

    socket.on('splendor:room_created', onRoomCreated)
    socket.on('splendor:room_joined', onRoomJoined)
    socket.on('splendor:room_updated', onRoomUpdated)
    socket.on('splendor:game_started', onGameStarted)
    socket.on('splendor:game_state', onGameState)
    socket.on('splendor:require_return_gems', onRequireReturnGems)
    socket.on('splendor:choose_noble', onChooseNoble)
    socket.on('splendor:noble_visited', onNobleVisited)
    socket.on('splendor:game_over', onGameOver)
    socket.on('splendor:error', onError)
    socket.on('splendor:player_disconnected', onPlayerDisconnected)
    socket.on('splendor:player_reconnected', onPlayerReconnected)
    socket.on('splendor:chat_message', onChatMessage)

    return () => {
      socket.off('splendor:room_created', onRoomCreated)
      socket.off('splendor:room_joined', onRoomJoined)
      socket.off('splendor:room_updated', onRoomUpdated)
      socket.off('splendor:game_started', onGameStarted)
      socket.off('splendor:game_state', onGameState)
      socket.off('splendor:require_return_gems', onRequireReturnGems)
      socket.off('splendor:choose_noble', onChooseNoble)
      socket.off('splendor:noble_visited', onNobleVisited)
      socket.off('splendor:game_over', onGameOver)
      socket.off('splendor:error', onError)
      socket.off('splendor:player_disconnected', onPlayerDisconnected)
      socket.off('splendor:player_reconnected', onPlayerReconnected)
      socket.off('splendor:chat_message', onChatMessage)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef.current, dispatch])

  // ============================================================
  // 房间操作
  // ============================================================

  const createRoom = useCallback((playerName: string) => {
    emit('splendor:create_room', { playerName })
  }, [emit])

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    emit('splendor:join_room', { roomId, playerName })
  }, [emit])

  const leaveRoom = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('splendor:leave_room', { roomId })
    clearSession()
    dispatch({ type: 'RESET' })
  }, [emit, dispatch])

  const toggleReady = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('splendor:player_ready', { roomId })
  }, [emit])

  const addAI = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('splendor:add_ai', { roomId })
  }, [emit])

  const removeAI = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('splendor:remove_ai', { roomId })
  }, [emit])

  const startGame = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('splendor:start_game', { roomId })
  }, [emit])

  // ============================================================
  // 游戏操作
  // ============================================================

  const takeGems = useCallback((gems: GemColor[], mode: 'three' | 'two') => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('splendor:take_gems', { roomId, gems, mode })
  }, [emit])

  const buyCard = useCallback((cardId: string) => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('splendor:buy_card', { roomId, cardId })
  }, [emit])

  const reserveCard = useCallback((cardId: string) => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('splendor:reserve_card', { roomId, cardId })
  }, [emit])

  const reserveDeck = useCallback((level: 1 | 2 | 3) => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('splendor:reserve_deck', { roomId, level })
  }, [emit])

  const returnGems = useCallback((gems: GemMap) => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('splendor:return_gems', { roomId, gems })
    dispatch({ type: 'SET_EXCESS_GEMS', excessGems: 0 })
  }, [emit, dispatch])

  const selectNoble = useCallback((nobleId: string) => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('splendor:select_noble', { roomId, nobleId })
    dispatch({ type: 'SET_CHOOSABLE_NOBLES', nobles: [] })
  }, [emit, dispatch])

  const sendChat = useCallback((message: string) => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('splendor:chat', { roomId, message })
  }, [emit])

  return {
    ...state,
    socketRef,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    addAI,
    removeAI,
    startGame,
    takeGems,
    buyCard,
    reserveCard,
    reserveDeck,
    returnGems,
    selectNoble,
    sendChat,
  }
}
