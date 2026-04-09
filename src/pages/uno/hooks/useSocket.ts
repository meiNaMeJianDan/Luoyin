/**
 * Socket.io 连接管理 hook
 *
 * 建立连接，自动重连，心跳检测
 * localStorage 存储房间号和玩家标识用于重连
 */

import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useGameContext } from '../context/GameContext'

// localStorage 键名
const STORAGE_ROOM_ID = 'uno_room_id'
const STORAGE_PLAYER_ID = 'uno_player_id'

/** 保存房间和玩家信息到 localStorage */
export function saveSession(roomId: string, playerId: string) {
  localStorage.setItem(STORAGE_ROOM_ID, roomId)
  localStorage.setItem(STORAGE_PLAYER_ID, playerId)
}

/** 清除 localStorage 中的会话信息 */
export function clearSession() {
  localStorage.removeItem(STORAGE_ROOM_ID)
  localStorage.removeItem(STORAGE_PLAYER_ID)
}

/** 获取 localStorage 中的会话信息 */
export function getSession() {
  return {
    roomId: localStorage.getItem(STORAGE_ROOM_ID),
    playerId: localStorage.getItem(STORAGE_PLAYER_ID),
  }
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { dispatch } = useGameContext()

  useEffect(() => {
    // 创建 Socket.io 连接
    const socket = io({
      // 开发环境通过 vite proxy 代理，无需指定 URL
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Socket] 已连接:', socket.id)
      dispatch({ type: 'SET_CONNECTED', connected: true })

      // 自动重连：仅在非首页时尝试（首页路径为 /uno）
      // 检查 localStorage 是否有会话信息
      const session = getSession()
      const isHomePage = window.location.pathname === '/uno'
      if (session.roomId && session.playerId && !isHomePage) {
        console.log('[Socket] 尝试自动重连房间:', session.roomId)
        socket.emit('reconnect_game', {
          roomId: session.roomId,
          playerId: session.playerId,
        })
        dispatch({ type: 'SET_PLAYER_ID', playerId: session.playerId })
      } else if (isHomePage) {
        // 在首页时清除旧的会话信息，避免干扰新的创建/加入操作
        clearSession()
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] 断开连接:', reason)
      dispatch({ type: 'SET_CONNECTED', connected: false })
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] 连接错误:', err.message)
      dispatch({ type: 'SET_CONNECTED', connected: false })
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
