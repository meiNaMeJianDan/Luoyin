/**
 * UNO 房间页面
 *
 * 房间号显示+复制，玩家列表，准备/开始
 */

import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useGame } from './hooks/useGame'
import { toast } from 'sonner'
import {
  Copy,
  Check,
  Crown,
  LogOut,
  Wifi,
  WifiOff,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'

export default function UnoRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const {
    room,
    playerId,
    connected,
    toggleReady,
    startGame,
    leaveRoom,
  } = useGame()

  const [copied, setCopied] = useState(false)

  // 复制房间号
  const handleCopy = async () => {
    if (!roomId) return
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      toast.success('房间号已复制')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  const currentPlayer = room?.players.find((p) => p.id === playerId)
  const isHost = currentPlayer?.isHost ?? false
  const isReady = currentPlayer?.isReady ?? false

  // 检查是否可以开始游戏
  const canStart =
    isHost &&
    room &&
    room.players.length >= 2 &&
    room.players.every((p) => p.isReady || p.isHost)

  // 空位占位
  const emptySlots = room ? Math.max(0, 4 - room.players.length) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-6">
        {/* 房间号 */}
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">房间号</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-gray-800">
              {roomId}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="复制房间号"
            >
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {connected ? (
            <>
              <Wifi className="size-3 text-green-500" />
              <span className="text-green-600">已连接</span>
            </>
          ) : (
            <>
              <WifiOff className="size-3 text-red-500" />
              <span className="text-red-600">连接中断，正在重连...</span>
            </>
          )}
        </div>

        {/* 玩家列表 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            玩家列表（{room?.players.length || 0}/4）
          </p>
          <div className="space-y-2">
            {room?.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <UserRound className="size-5 text-gray-400" />
                  <span className="font-medium text-gray-800">{player.name}</span>
                  {player.isHost && (
                    <Crown className="size-4 text-yellow-500" />
                  )}
                  {!player.isConnected && (
                    <span className="text-xs text-red-400">离线</span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    player.isHost
                      ? 'bg-yellow-100 text-yellow-700'
                      : player.isReady
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {player.isHost ? '房主' : player.isReady ? '已准备' : '未准备'}
                </span>
              </div>
            ))}

            {/* 空位 */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center bg-gray-50/50 rounded-xl px-4 py-3 border-2 border-dashed border-gray-200"
              >
                <span className="text-sm text-gray-400">等待加入...</span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2">
          {isHost ? (
            <Button
              className="w-full h-11"
              disabled={!canStart}
              onClick={() => roomId && startGame(roomId)}
            >
              {canStart ? '开始游戏' : '等待所有玩家准备'}
            </Button>
          ) : (
            <Button
              className="w-full h-11"
              variant={isReady ? 'outline' : 'default'}
              onClick={() => roomId && toggleReady(roomId)}
            >
              {isReady ? '取消准备' : '准备'}
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-gray-500"
            onClick={() => {
              if (roomId) leaveRoom(roomId)
              window.location.href = '/uno'
            }}
          >
            <LogOut className="size-4 mr-1" />
            离开房间
          </Button>
        </div>
      </div>
    </div>
  )
}
