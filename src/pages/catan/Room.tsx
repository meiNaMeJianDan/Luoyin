/**
 * 卡坦岛房间等待页
 *
 * 房间号显示+复制，玩家列表（高亮自己），准备/开始，添加/移除人机
 * 参考 UNO Room 的实现模式
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
  Bot,
  Plus,
  Minus,
} from 'lucide-react'
import { useState } from 'react'

/** 玩家颜色映射到 CSS 背景色 */
const COLOR_BG_MAP: Record<string, string> = {
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  white: 'bg-gray-100 text-gray-700',
  orange: 'bg-orange-100 text-orange-700',
}

export default function CatanRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const {
    roomInfo,
    playerId,
    connected,
    toggleReady,
    startGame,
    leaveRoom,
    addAI,
    removeAI,
  } = useGame()

  const [copied, setCopied] = useState(false)

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

  const currentPlayer = roomInfo?.players.find((p) => p.id === playerId)
  const isHost = currentPlayer?.isHost ?? false
  const isReady = currentPlayer?.isReady ?? false
  const aiCount = roomInfo?.players.filter((p) => p.isAI).length ?? 0

  // 房主不需要准备，AI 自动准备，其他真人玩家必须全部准备
  const canStart =
    isHost &&
    roomInfo &&
    roomInfo.players.length >= 2 &&
    roomInfo.players.length <= 4 &&
    roomInfo.players.every((p) => p.isHost || p.isAI || p.isReady)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-600 via-green-700 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-5">
        {/* 房间号 */}
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">房间号</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-gray-800">
              {roomId}
            </span>
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="复制房间号">
              {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {connected
            ? <><Wifi className="size-3 text-green-500" /><span className="text-green-600">已连接</span></>
            : <><WifiOff className="size-3 text-red-500" /><span className="text-red-600">连接中断，正在重连...</span></>
          }
        </div>

        {/* 玩家列表 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            玩家列表（{roomInfo?.players.length || 0}/4）
          </p>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {roomInfo?.players.map((player) => {
              const isSelf = player.id === playerId
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 transition-all ${
                    isSelf
                      ? 'bg-amber-50 border-2 border-amber-400 shadow-sm'
                      : 'bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {player.isAI
                      ? <Bot className="size-5 text-purple-500" />
                      : <UserRound className={`size-5 ${isSelf ? 'text-amber-500' : 'text-gray-400'}`} />
                    }
                    <span className={`font-medium ${isSelf ? 'text-amber-700' : 'text-gray-800'}`}>
                      {player.name}
                      {isSelf && <span className="text-xs text-amber-400 ml-1">（我）</span>}
                    </span>
                    {player.isHost && <Crown className="size-4 text-yellow-500" />}
                    {!player.isConnected && !player.isAI && <span className="text-xs text-red-400">离线</span>}
                    {/* 玩家颜色标识 */}
                    {player.color && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${COLOR_BG_MAP[player.color] || ''}`}>
                        {player.color === 'red' ? '红' : player.color === 'blue' ? '蓝' : player.color === 'white' ? '白' : '橙'}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    player.isHost ? 'bg-yellow-100 text-yellow-700'
                    : player.isAI ? 'bg-purple-100 text-purple-700'
                    : player.isReady ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                    {player.isHost ? '房主' : player.isAI ? '人机' : player.isReady ? '已准备' : '未准备'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 房主：添加/移除人机 */}
        {isHost && (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">人机玩家</span>
              <span className="text-xs text-gray-400">当前 {aiCount} 个人机</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => roomId && removeAI(roomId)}
                disabled={aiCount === 0}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <Minus className="size-4" />
              </button>
              <span className="text-sm font-bold w-4 text-center">{aiCount}</span>
              <button
                onClick={() => roomId && addAI(roomId)}
                disabled={(roomInfo?.players.length ?? 0) >= 4}
                className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2">
          {isHost ? (
            <Button className="w-full h-11" disabled={!canStart} onClick={() => roomId && startGame(roomId)}>
              {canStart ? '开始游戏' : '等待所有玩家准备'}
            </Button>
          ) : (
            <Button className="w-full h-11" variant={isReady ? 'outline' : 'default'} onClick={() => roomId && toggleReady(roomId)}>
              {isReady ? '取消准备' : '准备'}
            </Button>
          )}
          <Button variant="ghost" className="w-full text-gray-500" onClick={() => { if (roomId) leaveRoom(roomId); window.location.href = '/catan' }}>
            <LogOut className="size-4 mr-1" />
            离开房间
          </Button>
        </div>
      </div>
    </div>
  )
}
