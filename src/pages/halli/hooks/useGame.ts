/**
 * 德国心脏病游戏操作 hook
 *
 * 封装所有 halli: 前缀的 Socket 事件发送和监听
 * 事件监听在 socket 创建时立即注册，避免时序问题
 */

import { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  useHalliGame,
  type ClientHalliGameState,
  type HalliRoomInfo,
} from '../context/HalliGameContext'
import { useSocket, saveSession, clearSession } from './useSocket'

export function useGame() {
  const { state, dispatch } = useHalliGame()
  const { socketRef, emit } = useSocket()
  const navigate = useNavigate()

  // 用 ref 保存最新的 state，避免 useEffect 依赖 state 导致频繁重注册
  const stateRef = useRef(state)
  stateRef.current = state

  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // 监听所有 halli: 前缀的服务端事件
  // 只依赖 socketRef（稳定引用），事件处理器通过 ref 读取最新 state
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // 房间创建成功
    const onRoomCreated = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigateRef.current(`/halli/room/${data.roomId}`)
    }

    // 加入房间成功
    const onRoomJoined = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigateRef.current(`/halli/room/${data.roomId}`)
    }

    // 房间状态更新
    const onRoomUpdated = (roomInfo: HalliRoomInfo) => {
      dispatch({ type: 'SET_ROOM_INFO', roomInfo })
    }

    // 游戏开始
    const onGameStarted = (gameState: ClientHalliGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
      if (gameState?.roomId) {
        navigateRef.current(`/halli/game/${gameState.roomId}`)
      }
    }

    // 游戏状态同步
    const onGameState = (gameState: ClientHalliGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
    }

    // 按铃判定结果
    const onBellResult = (data: { playerId: string; correct: boolean; details: string }) => {
      const playerName = findPlayerName(data.playerId)
      if (data.correct) {
        toast.success(`🔔 ${playerName} 正确按铃！`)
      } else {
        toast.error(`❌ ${playerName} 错误按铃！`)
      }
    }

    // 玩家淘汰通知
    const onPlayerEliminated = (data: { playerId: string; rank: number }) => {
      const playerName = findPlayerName(data.playerId)
      toast.info(`💀 ${playerName} 已被淘汰`)
    }

    // 游戏结束
    const onGameOver = (data: { winnerId: string }) => {
      const playerName = findPlayerName(data.winnerId)
      toast.success(`🏆 ${playerName} 获胜！`)
      const s = stateRef.current
      const roomId = s.gameState?.roomId || s.roomId
      if (roomId) {
        setTimeout(() => navigateRef.current(`/halli/result/${roomId}`), 1500)
      }
    }

    // 错误通知
    const onError = (data: { message: string }) => {
      if (data.message.includes('重连失败')) {
        clearSession()
        return
      }
      toast.error(data.message)
      dispatch({ type: 'SET_ERROR', error: data.message })
    }

    // 玩家断线
    const onPlayerDisconnected = (data: { playerId: string }) => {
      const playerName = findPlayerName(data.playerId)
      toast.info(`⚡ ${playerName} 断线了`)
    }

    // 玩家重连
    const onPlayerReconnected = (data: { playerId: string }) => {
      const playerName = findPlayerName(data.playerId)
      toast.info(`🔄 ${playerName} 重新连接`)
    }

    /** 根据 playerId 查找玩家名 */
    function findPlayerName(playerId: string): string {
      const s = stateRef.current
      const players = s.gameState?.players || s.roomInfo?.players || []
      const player = players.find((p) => p.id === playerId)
      return player?.name || '玩家'
    }

    // 注册所有 halli: 前缀事件
    socket.on('halli:room_created', onRoomCreated)
    socket.on('halli:room_joined', onRoomJoined)
    socket.on('halli:room_updated', onRoomUpdated)
    socket.on('halli:game_started', onGameStarted)
    socket.on('halli:game_state', onGameState)
    socket.on('halli:bell_result', onBellResult)
    socket.on('halli:player_eliminated', onPlayerEliminated)
    socket.on('halli:game_over', onGameOver)
    socket.on('halli:error', onError)
    socket.on('halli:player_disconnected', onPlayerDisconnected)
    socket.on('halli:player_reconnected', onPlayerReconnected)

    return () => {
      socket.off('halli:room_created', onRoomCreated)
      socket.off('halli:room_joined', onRoomJoined)
      socket.off('halli:room_updated', onRoomUpdated)
      socket.off('halli:game_started', onGameStarted)
      socket.off('halli:game_state', onGameState)
      socket.off('halli:bell_result', onBellResult)
      socket.off('halli:player_eliminated', onPlayerEliminated)
      socket.off('halli:game_over', onGameOver)
      socket.off('halli:error', onError)
      socket.off('halli:player_disconnected', onPlayerDisconnected)
      socket.off('halli:player_reconnected', onPlayerReconnected)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef.current, dispatch])

  // ============================================================
  // 房间操作
  // ============================================================

  const createRoom = useCallback(
    (playerName: string) => {
      emit('halli:create_room', { playerName })
    },
    [emit],
  )

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      emit('halli:join_room', { roomId, playerName })
    },
    [emit],
  )

  const leaveRoom = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('halli:leave_room', { roomId })
    clearSession()
    dispatch({ type: 'RESET' })
  }, [emit, dispatch])

  const toggleReady = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('halli:player_ready', { roomId })
  }, [emit])

  const addAI = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('halli:add_ai', { roomId })
  }, [emit])

  const removeAI = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('halli:remove_ai', { roomId })
  }, [emit])

  const startGame = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('halli:start_game', { roomId })
  }, [emit])

  // ============================================================
  // 游戏操作
  // ============================================================

  const flipCard = useCallback(() => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('halli:flip_card', { roomId })
  }, [emit])

  const ringBell = useCallback(() => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('halli:ring_bell', { roomId })
  }, [emit])

  const reconnect = useCallback(
    (roomId: string, playerId: string) => {
      emit('halli:reconnect', { roomId, playerId })
    },
    [emit],
  )

  const sendChat = useCallback(
    (message: string) => {
      const s = stateRef.current
      const roomId = s.gameState?.roomId || s.roomId
      if (!roomId) return
      emit('halli:chat', { roomId, message })
    },
    [emit],
  )

  return {
    // 状态
    ...state,
    // 房间操作
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    addAI,
    removeAI,
    startGame,
    // 游戏操作
    flipCard,
    ringBell,
    reconnect,
    sendChat,
  }
}
