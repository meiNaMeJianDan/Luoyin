/**
 * 璀璨宝石 Socket.io 连接管理 hook
 *
 * 建立连接，自动重连，使用 splendor_ 前缀的 sessionStorage 键名
 * 参考 Draw useSocket 的实现模式（使用 sessionStorage）
 */

import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useSplendorGame } from '../context/SplendorGameContext'

// sessionStorage 键名（使用 splendor_ 前缀避免与其他游戏冲突）
const STORAGE_ROOM_ID = 'splendor_room_id'
const STORAGE_PLAYER_ID = 'splendor_player_id'

/** 保存房间和玩家信息到 sessionStorage */
export function saveSession(roomId: string, playerId: string) {
  sessionStorage.setItem(STORAGE_ROOM_ID, roomId)
  sessionStorage.setItem(STORAGE_PLAYER_ID, playerId)
}

/** 清除 sessionStorage 中的会话信息 */
export function clearSession() {
  sessionStorage.removeItem(STORAGE_ROOM_ID)
  sessionStorage.removeItem(STORAGE_PLAYER_ID)
}

/** 获取 sessionStorage 中的会话信息 */
export function getSession() {
  return {
    roomId: sessionStorage.getItem(STORAGE_ROOM_ID),
    playerId: sessionStorage.getItem(STORAGE_PLAYER_ID),
  }
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { dispatch } = useSplendorGame()

  useEffect(() => {
    // 创建 Socket.io 连接
    const socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Splendor Socket] 已连接:', socket.id)
      dispatch({ type: 'SET_CONNECTED', isConnected: true })

      // 自动重连：仅在非首页时尝试
      const session = getSession()
      const isHomePage = window.location.pathname === '/splendor'
      if (session.roomId && session.playerId && !isHomePage) {
        console.log('[Splendor Socket] 尝试自动重连房间:', session.roomId)
        socket.emit('splendor:reconnect', {
          roomId: session.roomId,
          playerId: session.playerId,
        })
        dispatch({ type: 'SET_PLAYER_ID', playerId: session.playerId })
        dispatch({ type: 'SET_ROOM_ID', roomId: session.roomId })
      } else if (isHomePage) {
        clearSession()
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[Splendor Socket] 断开连接:', reason)
      dispatch({ type: 'SET_CONNECTED', isConnected: false })
    })

    socket.on('connect_error', (err) => {
      console.error('[Splendor Socket] 连接错误:', err.message)
      dispatch({ type: 'SET_CONNECTED', isConnected: false })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [dispatch])

  /** 发送事件 */
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return {
    socket: socketRef.current,
    socketRef,
    emit,
  }
}
