/**
 * 卡坦岛游戏操作 hook
 *
 * 封装所有 catan: 前缀的 Socket 事件发送和监听
 * 参考 UNO useGame 的实现模式
 */

import { useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useCatanGame } from '../context/CatanGameContext'
import { useSocket, saveSession, clearSession } from './useSocket'
import type {
  ClientCatanGameState,
  CatanRoomInfo,
  CatanGameOverData,
  ResourceMap,
} from '../types'

export function useGame() {
  const { state, dispatch } = useCatanGame()
  const { socketRef, emit } = useSocket()
  const navigate = useNavigate()

  // 监听所有 catan: 前缀的服务端事件
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // 房间创建成功
    const onRoomCreated = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigate(`/catan/room/${data.roomId}`)
    }

    // 加入房间成功
    const onRoomJoined = (data: { roomId: string; playerId: string }) => {
      saveSession(data.roomId, data.playerId)
      dispatch({ type: 'SET_PLAYER_ID', playerId: data.playerId })
      dispatch({ type: 'SET_ROOM_ID', roomId: data.roomId })
      navigate(`/catan/room/${data.roomId}`)
    }

    // 房间状态更新
    const onRoomUpdated = (roomInfo: CatanRoomInfo) => {
      dispatch({ type: 'SET_ROOM_INFO', roomInfo })
    }

    // 游戏开始
    const onGameStarted = (gameState: ClientCatanGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
      if (gameState?.roomId) {
        navigate(`/catan/game/${gameState.roomId}`)
      }
    }

    // 游戏状态同步
    const onGameState = (gameState: ClientCatanGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState })
    }

    // 骰子结果（可用于动画展示）
    const onDiceRolled = (_data: { playerId: string; dice: [number, number] }) => {
      // 骰子动画由 gameState 更新驱动，此处可扩展额外动画
    }

    // 建筑放置通知
    const onBuildingPlaced = (_data: { playerId: string; type: string; position: string }) => {
      // 建筑放置动画由 gameState 更新驱动
    }

    // 强盗移动
    const onRobberMoved = (_data: { playerId: string; hexId: string }) => {
      // 强盗移动动画由 gameState 更新驱动
    }

    // 交易提案
    const onTradeProposed = (_data: unknown) => {
      // 交易提案由 gameState.currentTrade 驱动
    }

    // 交易完成
    const onTradeCompleted = (_data: { tradeId: string; accepterId: string }) => {
      toast.success('交易完成')
    }

    // 交易被拒绝
    const onTradeRejected = (_data: { tradeId: string; rejecterId: string }) => {
      toast.info('交易被拒绝')
    }

    // 游戏结束
    const onGameOver = (data: CatanGameOverData) => {
      dispatch({ type: 'SET_GAME_OVER', data })
      const winner = data.players.find((p) => p.id === data.winnerId)
      if (winner) {
        toast.success(`🏆 ${winner.name} 获胜！`)
      }
      // 延迟跳转到结算页
      const roomId = state.gameState?.roomId || state.roomId
      if (roomId) {
        setTimeout(() => navigate(`/catan/result/${roomId}`), 1500)
      }
    }

    // 聊天消息
    const onChatMessage = (data: { playerId: string; playerName: string; message: string }) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { ...data, timestamp: Date.now() },
      })
    }

    // 错误通知
    const onError = (data: { message: string }) => {
      // 重连失败时静默处理
      if (data.message.includes('重连失败')) {
        console.warn('[Catan Socket] 重连失败，清除旧会话:', data.message)
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
      const players = state.gameState?.players || state.roomInfo?.players || []
      const player = players.find((p) => p.id === playerId)
      return player?.name || '玩家'
    }

    // 注册所有 catan: 前缀事件
    socket.on('catan:room_created', onRoomCreated)
    socket.on('catan:room_joined', onRoomJoined)
    socket.on('catan:room_updated', onRoomUpdated)
    socket.on('catan:game_started', onGameStarted)
    socket.on('catan:game_state', onGameState)
    socket.on('catan:dice_rolled', onDiceRolled)
    socket.on('catan:building_placed', onBuildingPlaced)
    socket.on('catan:robber_moved', onRobberMoved)
    socket.on('catan:trade_proposed', onTradeProposed)
    socket.on('catan:trade_completed', onTradeCompleted)
    socket.on('catan:trade_rejected', onTradeRejected)
    socket.on('catan:game_over', onGameOver)
    socket.on('catan:chat_message', onChatMessage)
    socket.on('catan:error', onError)
    socket.on('catan:player_disconnected', onPlayerDisconnected)
    socket.on('catan:player_reconnected', onPlayerReconnected)

    return () => {
      socket.off('catan:room_created', onRoomCreated)
      socket.off('catan:room_joined', onRoomJoined)
      socket.off('catan:room_updated', onRoomUpdated)
      socket.off('catan:game_started', onGameStarted)
      socket.off('catan:game_state', onGameState)
      socket.off('catan:dice_rolled', onDiceRolled)
      socket.off('catan:building_placed', onBuildingPlaced)
      socket.off('catan:robber_moved', onRobberMoved)
      socket.off('catan:trade_proposed', onTradeProposed)
      socket.off('catan:trade_completed', onTradeCompleted)
      socket.off('catan:trade_rejected', onTradeRejected)
      socket.off('catan:game_over', onGameOver)
      socket.off('catan:chat_message', onChatMessage)
      socket.off('catan:error', onError)
      socket.off('catan:player_disconnected', onPlayerDisconnected)
      socket.off('catan:player_reconnected', onPlayerReconnected)
    }
  }, [socketRef.current, dispatch, navigate, state.gameState, state.roomInfo, state.roomId])

  // ============================================================
  // 房间操作
  // ============================================================

  const createRoom = useCallback(
    (playerName: string) => {
      emit('catan:create_room', { playerName })
    },
    [emit],
  )

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      emit('catan:join_room', { roomId, playerName })
    },
    [emit],
  )

  const leaveRoom = useCallback(
    (roomId: string) => {
      emit('catan:leave_room', { roomId })
      clearSession()
      dispatch({ type: 'RESET' })
    },
    [emit, dispatch],
  )

  const toggleReady = useCallback(
    (roomId: string) => {
      emit('catan:player_ready', { roomId })
    },
    [emit],
  )

  const addAI = useCallback(
    (roomId: string) => {
      emit('catan:add_ai', { roomId })
    },
    [emit],
  )

  const removeAI = useCallback(
    (roomId: string) => {
      emit('catan:remove_ai', { roomId })
    },
    [emit],
  )

  const startGame = useCallback(
    (roomId: string, enableDevCards?: boolean) => {
      emit('catan:start_game', { roomId, enableDevCards })
    },
    [emit],
  )

  // ============================================================
  // 游戏操作
  // ============================================================

  /** 获取当前房间 ID */
  const getRoomId = useCallback(() => {
    return state.gameState?.roomId || state.roomId
  }, [state.gameState?.roomId, state.roomId])

  const placeSettlement = useCallback(
    (vertexId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:place_settlement', { roomId, vertexId })
    },
    [emit, getRoomId],
  )

  const placeRoad = useCallback(
    (edgeId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:place_road', { roomId, edgeId })
    },
    [emit, getRoomId],
  )

  const rollDice = useCallback(() => {
    const roomId = getRoomId()
    if (!roomId) return
    emit('catan:roll_dice', { roomId })
  }, [emit, getRoomId])

  const discardResources = useCallback(
    (resources: ResourceMap) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:discard_resources', { roomId, resources })
    },
    [emit, getRoomId],
  )

  const moveRobber = useCallback(
    (hexId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:move_robber', { roomId, hexId })
    },
    [emit, getRoomId],
  )

  const stealResource = useCallback(
    (targetPlayerId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:steal_resource', { roomId, targetPlayerId })
    },
    [emit, getRoomId],
  )

  const buildRoad = useCallback(
    (edgeId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:build_road', { roomId, edgeId })
    },
    [emit, getRoomId],
  )

  const buildSettlement = useCallback(
    (vertexId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:build_settlement', { roomId, vertexId })
    },
    [emit, getRoomId],
  )

  const buildCity = useCallback(
    (vertexId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:build_city', { roomId, vertexId })
    },
    [emit, getRoomId],
  )

  const bankTrade = useCallback(
    (offer: ResourceMap, request: ResourceMap) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:bank_trade', { roomId, offer, request })
    },
    [emit, getRoomId],
  )

  const proposeTrade = useCallback(
    (offer: ResourceMap, request: ResourceMap) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:propose_trade', { roomId, offer, request })
    },
    [emit, getRoomId],
  )

  const acceptTrade = useCallback(
    (tradeId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:accept_trade', { roomId, tradeId })
    },
    [emit, getRoomId],
  )

  const rejectTrade = useCallback(
    (tradeId: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:reject_trade', { roomId, tradeId })
    },
    [emit, getRoomId],
  )

  const endTurn = useCallback(() => {
    const roomId = getRoomId()
    if (!roomId) return
    emit('catan:end_turn', { roomId })
  }, [emit, getRoomId])

  const buyDevCard = useCallback(() => {
    const roomId = getRoomId()
    if (!roomId) return
    emit('catan:buy_dev_card', { roomId })
  }, [emit, getRoomId])

  const useDevCard = useCallback(
    (cardType: string, params?: Record<string, unknown>) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:use_dev_card', { roomId, cardType, params })
    },
    [emit, getRoomId],
  )

  const sendChat = useCallback(
    (message: string) => {
      const roomId = getRoomId()
      if (!roomId) return
      emit('catan:chat', { roomId, message })
    },
    [emit, getRoomId],
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
    placeSettlement,
    placeRoad,
    rollDice,
    discardResources,
    moveRobber,
    stealResource,
    buildRoad,
    buildSettlement,
    buildCity,
    bankTrade,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    endTurn,
    buyDevCard,
    useDevCard,
    sendChat,
  }
}
