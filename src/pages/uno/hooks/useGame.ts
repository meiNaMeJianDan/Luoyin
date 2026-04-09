/**
 * 游戏操作 hook
 *
 * 封装所有游戏操作，监听服务端事件更新 Context
 * 错误处理用 sonner toast
 */

import { useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useGameContext, type CardColor } from '../context/GameContext'
import { useSocket, saveSession, clearSession } from './useSocket'
import { useNavigate } from 'react-router-dom'

/** 生成消息 ID */
let msgId = 0
function nextMsgId() {
  return `msg-${++msgId}`
}

export function useGame() {
  const { state, dispatch } = useGameContext()
  const { socketRef, emit } = useSocket()
  const navigate = useNavigate()

  // 监听所有服务端事件
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // 房间创建成功
    const onRoomCreated = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      navigate(`/uno/room/${data.roomId}`)
    }

    // 加入房间成功
    const onRoomJoined = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      navigate(`/uno/room/${data.roomId}`)
    }

    // 房间状态更新
    const onRoomUpdated = (room: unknown) => {
      dispatch({ type: 'SET_ROOM', room: room as any })
    }

    // 游戏开始
    const onGameStarted = (gameState: unknown) => {
      dispatch({ type: 'SET_GAME_STATE', gameState: gameState as any })
      const gs = gameState as any
      if (gs?.roomId) {
        navigate(`/uno/game/${gs.roomId}`)
      }
      dispatch({
        type: 'ADD_MESSAGE',
        message: { id: nextMsgId(), text: '🎮 游戏开始！', timestamp: Date.now() },
      })
    }

    // 游戏状态同步
    const onGameState = (gameState: unknown) => {
      dispatch({ type: 'SET_GAME_STATE', gameState: gameState as any })
    }

    // 出牌通知
    const onCardPlayed = (data: { playerId: string; card: any }) => {
      const playerName = findPlayerName(data.playerId)
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: nextMsgId(),
          text: `🃏 ${playerName} 出了一张牌`,
          timestamp: Date.now(),
        },
      })
    }

    // 摸牌通知
    const onCardDrawn = (data: { playerId: string; count: number }) => {
      const playerName = findPlayerName(data.playerId)
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: nextMsgId(),
          text: `📥 ${playerName} 摸了 ${data.count} 张牌`,
          timestamp: Date.now(),
        },
      })
    }

    // UNO 喊牌通知
    const onUnoCalled = (data: { playerId: string }) => {
      const playerName = findPlayerName(data.playerId)
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: nextMsgId(),
          text: `🔔 ${playerName} 喊了 UNO！`,
          timestamp: Date.now(),
        },
      })
    }

    // 举报结果
    const onUnoReported = (data: { reporterId: string; targetId: string; success: boolean }) => {
      const reporterName = findPlayerName(data.reporterId)
      const targetName = findPlayerName(data.targetId)
      const text = data.success
        ? `⚠️ ${reporterName} 举报 ${targetName} 成功！罚摸 2 张`
        : `❌ ${reporterName} 举报 ${targetName} 失败`
      dispatch({
        type: 'ADD_MESSAGE',
        message: { id: nextMsgId(), text, timestamp: Date.now() },
      })
    }

    // 颜色选择结果
    const onColorChosen = (data: { color: CardColor }) => {
      const colorMap: Record<string, string> = {
        red: '🔴 红色',
        yellow: '🟡 黄色',
        blue: '🔵 蓝色',
        green: '🟢 绿色',
      }
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: nextMsgId(),
          text: `🎨 颜色已选择：${colorMap[data.color] || data.color}`,
          timestamp: Date.now(),
        },
      })
    }

    // 质疑结果
    const onChallengeResult = (data: any) => {
      const text = data.success
        ? `✅ 质疑成功！出牌方罚摸 ${data.penaltyCards} 张`
        : `❌ 质疑失败！质疑方罚摸 ${data.penaltyCards} 张`
      dispatch({
        type: 'ADD_MESSAGE',
        message: { id: nextMsgId(), text, timestamp: Date.now() },
      })
    }

    // 游戏结束
    const onGameOver = (data: { winnerId: string; players: any[] }) => {
      dispatch({ type: 'SET_GAME_OVER', data })
      const winnerName = data.players.find((p) => p.id === data.winnerId)?.name || '未知'
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: nextMsgId(),
          text: `🏆 ${winnerName} 获胜！`,
          timestamp: Date.now(),
        },
      })
      // 延迟跳转到结算页
      const roomId = state.gameState?.roomId || state.room?.id
      if (roomId) {
        setTimeout(() => navigate(`/uno/result/${roomId}`), 1500)
      }
    }

    // 玩家断线
    const onPlayerDisconnected = (data: { playerId: string }) => {
      const playerName = findPlayerName(data.playerId)
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: nextMsgId(),
          text: `⚡ ${playerName} 断线了`,
          timestamp: Date.now(),
        },
      })
    }

    // 玩家重连
    const onPlayerReconnected = (data: { playerId: string }) => {
      const playerName = findPlayerName(data.playerId)
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: nextMsgId(),
          text: `🔄 ${playerName} 重新连接`,
          timestamp: Date.now(),
        },
      })
    }

    // 错误通知
    const onError = (data: { message: string }) => {
      // 重连失败时静默处理，清除旧会话
      if (data.message.includes('重连失败')) {
        console.warn('[Socket] 重连失败，清除旧会话:', data.message)
        clearSession()
        return
      }
      toast.error(data.message)
    }

    // 辅助：根据 playerId 查找玩家名
    function findPlayerName(playerId: string): string {
      const players = state.gameState?.players || state.room?.players || []
      const player = players.find((p) => p.id === playerId)
      return player?.name || '玩家'
    }

    socket.on('room_created', onRoomCreated)
    socket.on('room_joined', onRoomJoined)
    socket.on('room_updated', onRoomUpdated)
    socket.on('game_started', onGameStarted)
    socket.on('game_state', onGameState)
    socket.on('card_played', onCardPlayed)
    socket.on('card_drawn', onCardDrawn)
    socket.on('uno_called', onUnoCalled)
    socket.on('uno_reported', onUnoReported)
    socket.on('color_chosen', onColorChosen)
    socket.on('challenge_result', onChallengeResult)
    socket.on('game_over', onGameOver)
    socket.on('player_disconnected', onPlayerDisconnected)
    socket.on('player_reconnected', onPlayerReconnected)
    socket.on('error', onError)

    return () => {
      socket.off('room_created', onRoomCreated)
      socket.off('room_joined', onRoomJoined)
      socket.off('room_updated', onRoomUpdated)
      socket.off('game_started', onGameStarted)
      socket.off('game_state', onGameState)
      socket.off('card_played', onCardPlayed)
      socket.off('card_drawn', onCardDrawn)
      socket.off('uno_called', onUnoCalled)
      socket.off('uno_reported', onUnoReported)
      socket.off('color_chosen', onColorChosen)
      socket.off('challenge_result', onChallengeResult)
      socket.off('game_over', onGameOver)
      socket.off('player_disconnected', onPlayerDisconnected)
      socket.off('player_reconnected', onPlayerReconnected)
      socket.off('error', onError)
    }
  }, [socketRef.current, dispatch, navigate, state.gameState, state.room])

  // ============================================================
  // 游戏操作
  // ============================================================

  const createRoom = useCallback(
    (playerName: string) => {
      emit('create_room', { playerName })
    },
    [emit],
  )

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      emit('join_room', { roomId, playerName })
    },
    [emit],
  )

  const leaveRoom = useCallback(
    (roomId: string) => {
      emit('leave_room', { roomId })
      clearSession()
      dispatch({ type: 'RESET' })
    },
    [emit, dispatch],
  )

  const toggleReady = useCallback(
    (roomId: string) => {
      emit('player_ready', { roomId })
    },
    [emit],
  )

  const startGame = useCallback(
    (roomId: string) => {
      emit('start_game', { roomId })
    },
    [emit],
  )

  const playCard = useCallback(
    (cardId: string, chosenColor?: CardColor) => {
      const roomId = state.gameState?.roomId || state.room?.id
      if (!roomId) return
      emit('play_card', { roomId, cardId, chosenColor })
    },
    [emit, state.gameState?.roomId, state.room?.id],
  )

  const drawCard = useCallback(() => {
    const roomId = state.gameState?.roomId || state.room?.id
    if (!roomId) return
    emit('draw_card', { roomId })
  }, [emit, state.gameState?.roomId, state.room?.id])

  const callUno = useCallback(() => {
    const roomId = state.gameState?.roomId || state.room?.id
    if (!roomId) return
    emit('call_uno', { roomId })
  }, [emit, state.gameState?.roomId, state.room?.id])

  const reportUno = useCallback(
    (targetPlayerId: string) => {
      const roomId = state.gameState?.roomId || state.room?.id
      if (!roomId) return
      emit('report_uno', { roomId, targetPlayerId })
    },
    [emit, state.gameState?.roomId, state.room?.id],
  )

  const chooseColor = useCallback(
    (color: CardColor) => {
      const roomId = state.gameState?.roomId || state.room?.id
      if (!roomId) return
      emit('choose_color', { roomId, color })
    },
    [emit, state.gameState?.roomId, state.room?.id],
  )

  const challengeWild4 = useCallback(() => {
    const roomId = state.gameState?.roomId || state.room?.id
    if (!roomId) return
    emit('challenge_wild4', { roomId })
  }, [emit, state.gameState?.roomId, state.room?.id])

  const acceptWild4 = useCallback(() => {
    const roomId = state.gameState?.roomId || state.room?.id
    if (!roomId) return
    emit('accept_wild4', { roomId })
  }, [emit, state.gameState?.roomId, state.room?.id])

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    playCard,
    drawCard,
    callUno,
    reportUno,
    chooseColor,
    challengeWild4,
    acceptWild4,
  }
}
