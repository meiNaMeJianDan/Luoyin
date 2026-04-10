/**
 * 卡坦岛 Socket.io 连接管理 hook
 *
 * 建立连接，自动重连，监听 catan: 前缀事件并 dispatch 到 context
 * localStorage 存储 roomId 和 playerId 用于断线重连
 * 参考 UNO useSocket 的实现模式
 */

import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useCatanGame } from '../context/CatanGameContext'

// localStorage 键名（使用 catan_ 前缀避免与 UNO 冲突）
const STORAGE_ROOM_ID = 'catan_room_id'
const STORAGE_PLAYER_ID = 'catan_player_id'

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
  const { dispatch } = useCatanGame()

  useEffect(() => {
    // 创建 Socket.io 连接（开发环境通过 vite proxy 代理）
    const socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Catan Socket] 已连接:', socket.id)
      dispatch({ type: 'SET_CONNECTED', connected: true })

      // 自动重连：仅在非首页时尝试
      const session = getSession()
      const isHomePage = window.location.pathname === '/catan'
      if (session.roomId && session.playerId && !isHomePage) {
        console.log('[Catan Socket] 尝试自动重连房间:', session.roomId)
        socket.emit('catan:reconnect', {
          roomId: session.roomId,
          playerId: session.playerId,
        })
        dispatch({ type: 'SET_PLAYER_ID', playerId: session.playerId })
        dispatch({ type: 'SET_ROOM_ID', roomId: session.roomId })
      } else if (isHomePage) {
        // 在首页时清除旧的会话信息
        clearSession()
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[Catan Socket] 断开连接:', reason)
      dispatch({ type: 'SET_CONNECTED', connected: false })
    })

    socket.on('connect_error', (err) => {
      console.error('[Catan Socket] 连接错误:', err.message)
      dispatch({ type: 'SET_CONNECTED', connected: false })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [dispatch])

  /** 发送 catan: 前缀事件 */
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
