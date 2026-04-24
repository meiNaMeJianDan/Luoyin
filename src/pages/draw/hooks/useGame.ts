/**
 * 你画我猜游戏操作 hook
 *
 * 封装所有 draw: 前缀的 Socket 事件发送和监听
 * 事件监听在 socket 创建时立即注册，避免时序问题
 * 用 stateRef 读取最新 state，避免 useEffect 依赖 state 导致频繁重注册
 */

import { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  useDrawGame,
  type ClientDrawGameState,
  type DrawRoomInfo,
  type DrawAction,
  type GameConfig,
  type TurnScore,
  type PlayerRanking,
  type Word,
  type ChatMessage,
} from '../context/DrawGameContext'
import { useSocket, saveSession, clearSession } from './useSocket'

let chatMsgId = 0
function nextChatId() {
  return `chat_${Date.now()}_${++chatMsgId}`
}

export function useGame() {
  const { state, dispatch } = useDrawGame()
  const { socketRef, emit } = useSocket()
  const navigate = useNavigate()

  // 用 ref 保存最新的 state，避免 useEffect 依赖 state 导致频繁重注册
  const stateRef = useRef(state)
  stateRef.current = state

  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // 画板回调 ref，由 Game.tsx 设置，useGame 在收到绘画事件时调用
  const canvasCallbacksRef = useRef<{
    replayAction?: (action: DrawAction) => void
    replayHistory?: (actions: DrawAction[]) => void
    undoLast?: () => void
    clearAll?: () => void
    onTurnEnded?: (data: { word: string; scores: TurnScore[] }) => void
    onTurnStarted?: () => void
  }>({})

  // 监听所有 draw: 前缀的服务端事件
  // 只依赖 socketRef.current 和 dispatch（稳定引用）
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // 房间创建成功
    const onRoomCreated = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigateRef.current(`/draw/room/${data.roomId}`)
    }

    // 加入房间成功
    const onRoomJoined = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigateRef.current(`/draw/room/${data.roomId}`)
    }

    // 房间状态更新
    const onRoomUpdated = (roomInfo: DrawRoomInfo) => {
      dispatch({ type: 'SET_ROOM_INFO', roomInfo })
    }

    // 游戏开始
    const onGameStarted = (gameState: ClientDrawGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
      dispatch({ type: 'CLEAR_CHAT' })
      if (gameState?.roomId) {
        navigateRef.current(`/draw/game/${gameState.roomId}`)
      }
    }

    // 游戏状态同步
    const onGameState = (gameState: ClientDrawGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
    }

    // 候选词语（仅 Drawer 收到）
    const onWordCandidates = (_data: { words: Word[] }) => {
      // 候选词语已包含在 gameState.candidateWords 中，此处可用于额外 UI 提示
    }

    // Turn 开始
    const onTurnStarted = (data: { drawerId: string; round: number; turn: number }) => {
      dispatch({ type: 'CLEAR_CHAT' })
      canvasCallbacksRef.current.onTurnStarted?.()
      canvasCallbacksRef.current.clearAll?.()
      const drawerName = findPlayerName(data.drawerId)
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: {
          id: nextChatId(),
          playerId: 'system',
          playerName: '系统',
          message: `第 ${data.round} 轮第 ${data.turn + 1} 回合开始，${drawerName} 来画画！`,
          type: 'system',
        },
      })
    }

    // 聊天消息
    const onChatMessage = (data: { playerId: string; playerName: string; message: string }) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: {
          id: nextChatId(),
          playerId: data.playerId,
          playerName: data.playerName,
          message: data.message,
          type: 'chat',
        },
      })
    }

    // 猜对通知
    const onCorrectGuess = (data: { playerId: string; playerName: string }) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: {
          id: nextChatId(),
          playerId: data.playerId,
          playerName: data.playerName,
          message: `${data.playerName} 猜对了！`,
          type: 'correct',
        },
      })
      toast.success(`🎉 ${data.playerName} 猜对了！`)
    }

    // "很接近了"提示（仅发给猜词者）
    const onCloseGuess = (data: { message: string }) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: {
          id: nextChatId(),
          playerId: 'system',
          playerName: '系统',
          message: data.message,
          type: 'close',
        },
      })
    }

    // 系统消息
    const onSystemMessage = (data: { message: string }) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: {
          id: nextChatId(),
          playerId: 'system',
          playerName: '系统',
          message: data.message,
          type: 'system',
        },
      })
    }

    // Turn 结束
    const onTurnEnded = (data: { word: string; scores: TurnScore[] }) => {
      canvasCallbacksRef.current.onTurnEnded?.(data)
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: {
          id: nextChatId(),
          playerId: 'system',
          playerName: '系统',
          message: `回合结束！答案是「${data.word}」`,
          type: 'system',
        },
      })
    }

    // 提示更新
    const onHintUpdate = (_data: { hint: string[] }) => {
      // hint 已包含在 gameState 中，通过 game_state 事件同步
    }

    // 游戏结束
    const onGameOver = (data: { rankings: PlayerRanking[] }) => {
      const winner = data.rankings[0]
      if (winner) {
        toast.success(`🏆 ${winner.playerName} 获胜！`)
      }
      const s = stateRef.current
      const roomId = s.gameState?.roomId || s.roomId
      if (roomId) {
        setTimeout(() => navigateRef.current(`/draw/result/${roomId}`), 1500)
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

    // 注册所有 draw: 前缀事件
    socket.on('draw:room_created', onRoomCreated)
    socket.on('draw:room_joined', onRoomJoined)
    socket.on('draw:room_updated', onRoomUpdated)
    socket.on('draw:game_started', onGameStarted)
    socket.on('draw:game_state', onGameState)
    socket.on('draw:word_candidates', onWordCandidates)
    socket.on('draw:turn_started', onTurnStarted)
    socket.on('draw:chat_message', onChatMessage)
    socket.on('draw:correct_guess', onCorrectGuess)
    socket.on('draw:close_guess', onCloseGuess)
    socket.on('draw:system_message', onSystemMessage)
    socket.on('draw:turn_ended', onTurnEnded)
    socket.on('draw:hint_update', onHintUpdate)
    socket.on('draw:game_over', onGameOver)
    socket.on('draw:error', onError)
    socket.on('draw:player_disconnected', onPlayerDisconnected)
    socket.on('draw:player_reconnected', onPlayerReconnected)

    // 绘画相关事件（通过 canvasCallbacksRef 转发给 Game.tsx 的画板组件）
    const onDrawActionEvent = (data: { action: DrawAction }) => {
      canvasCallbacksRef.current.replayAction?.(data.action)
    }
    const onUndoEvent = () => {
      canvasCallbacksRef.current.undoLast?.()
    }
    const onClearCanvasEvent = () => {
      canvasCallbacksRef.current.clearAll?.()
    }
    const onDrawHistoryEvent = (data: { actions: DrawAction[] }) => {
      canvasCallbacksRef.current.replayHistory?.(data.actions)
    }

    socket.on('draw:draw_action', onDrawActionEvent)
    socket.on('draw:undo', onUndoEvent)
    socket.on('draw:clear_canvas', onClearCanvasEvent)
    socket.on('draw:draw_history', onDrawHistoryEvent)

    return () => {
      socket.off('draw:room_created', onRoomCreated)
      socket.off('draw:room_joined', onRoomJoined)
      socket.off('draw:room_updated', onRoomUpdated)
      socket.off('draw:game_started', onGameStarted)
      socket.off('draw:game_state', onGameState)
      socket.off('draw:word_candidates', onWordCandidates)
      socket.off('draw:turn_started', onTurnStarted)
      socket.off('draw:chat_message', onChatMessage)
      socket.off('draw:correct_guess', onCorrectGuess)
      socket.off('draw:close_guess', onCloseGuess)
      socket.off('draw:system_message', onSystemMessage)
      socket.off('draw:turn_ended', onTurnEnded)
      socket.off('draw:hint_update', onHintUpdate)
      socket.off('draw:game_over', onGameOver)
      socket.off('draw:error', onError)
      socket.off('draw:player_disconnected', onPlayerDisconnected)
      socket.off('draw:player_reconnected', onPlayerReconnected)
      socket.off('draw:draw_action', onDrawActionEvent)
      socket.off('draw:undo', onUndoEvent)
      socket.off('draw:clear_canvas', onClearCanvasEvent)
      socket.off('draw:draw_history', onDrawHistoryEvent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef.current, dispatch])

  // ============================================================
  // 房间操作
  // ============================================================

  const createRoom = useCallback(
    (playerName: string) => {
      emit('draw:create_room', { playerName })
    },
    [emit],
  )

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      emit('draw:join_room', { roomId, playerName })
    },
    [emit],
  )

  const leaveRoom = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('draw:leave_room', { roomId })
    clearSession()
    dispatch({ type: 'RESET' })
  }, [emit, dispatch])

  const toggleReady = useCallback(() => {
    const roomId = stateRef.current.roomId
    if (!roomId) return
    emit('draw:player_ready', { roomId })
  }, [emit])

  const startGame = useCallback(
    (config?: GameConfig) => {
      const roomId = stateRef.current.roomId
      if (!roomId) return
      emit('draw:start_game', { roomId, config })
    },
    [emit],
  )

  // ============================================================
  // 游戏操作
  // ============================================================

  const selectWord = useCallback(
    (wordIndex: number) => {
      const s = stateRef.current
      const roomId = s.gameState?.roomId || s.roomId
      if (!roomId) return
      emit('draw:select_word', { roomId, wordIndex })
    },
    [emit],
  )

  const sendDrawAction = useCallback(
    (action: DrawAction) => {
      const s = stateRef.current
      const roomId = s.gameState?.roomId || s.roomId
      if (!roomId) return
      emit('draw:draw_action', { roomId, action })
    },
    [emit],
  )

  const undo = useCallback(() => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('draw:undo', { roomId })
  }, [emit])

  const clearCanvas = useCallback(() => {
    const s = stateRef.current
    const roomId = s.gameState?.roomId || s.roomId
    if (!roomId) return
    emit('draw:clear_canvas', { roomId })
  }, [emit])

  const sendChat = useCallback(
    (message: string) => {
      const s = stateRef.current
      const roomId = s.gameState?.roomId || s.roomId
      if (!roomId) return
      emit('draw:chat', { roomId, message })
    },
    [emit],
  )

  const reconnect = useCallback(
    (roomId: string, playerId: string) => {
      emit('draw:reconnect', { roomId, playerId })
    },
    [emit],
  )

  return {
    // 状态
    ...state,
    // socket ref（供 Game.tsx 监听绘画事件）
    socketRef,
    // 画板回调 ref（供 Game.tsx 注册画板方法）
    canvasCallbacksRef,
    // 房间操作
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    // 游戏操作
    selectWord,
    sendDrawAction,
    undo,
    clearCanvas,
    sendChat,
    reconnect,
  }
}
