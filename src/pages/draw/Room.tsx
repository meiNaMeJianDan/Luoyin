/**
 * 你画我猜房间等待页
 *
 * 房间号显示+复制，玩家列表（高亮自己），准备/开始
 * 房主可配置游戏参数（轮次数量、每回合时间）
 */

import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useGame } from './hooks/useGame'
import { toast } from 'sonner'
import type { GameConfig } from './context/DrawGameContext'
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

export default function DrawRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const {
    roomInfo,
    playerId,
    isConnected,
    toggleReady,
    startGame,
    leaveRoom,
  } = useGame()

  const [copied, setCopied] = useState(false)
  // 游戏配置
  const [rounds, setRounds] = useState(2)
  const [turnDuration, setTurnDuration] = useState(90)

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
  const playerCount = roomInfo?.players.length ?? 0

  // 开始条件：2-8 人且所有非房主已准备
  const canStart =
    isHost &&
    roomInfo &&
    playerCount >= 2 &&
    playerCount <= 8 &&
    roomInfo.players.every((p) => p.isHost || p.isReady)

  const handleStartGame = () => {
    const config: GameConfig = { rounds, turnDuration }
    startGame(config)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-5">
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
              {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {isConnected
            ? <><Wifi className="size-3 text-green-500" /><span className="text-green-600">已连接</span></>
            : <><WifiOff className="size-3 text-red-500" /><span className="text-red-600">连接中断，正在重连...</span></>
          }
        </div>

        {/* 玩家列表 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            玩家列表（{playerCount}/8）
          </p>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {roomInfo?.players.map((player) => {
              const isSelf = player.id === playerId
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 transition-all ${
                    isSelf
                      ? 'bg-indigo-50 border-2 border-indigo-400 shadow-sm'
                      : 'bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserRound className={`size-5 ${isSelf ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <span className={`font-medium ${isSelf ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {player.name}
                      {isSelf && <span className="text-xs text-indigo-400 ml-1">（我）</span>}
                    </span>
                    {player.isHost && <Crown className="size-4 text-yellow-500" />}
                    {!player.isConnected && <span className="text-xs text-red-400">离线</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    player.isHost ? 'bg-yellow-100 text-yellow-700'
                    : player.isReady ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                    {player.isHost ? '房主' : player.isReady ? '已准备' : '未准备'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 开始条件提示 */}
        <div className="text-center text-xs text-gray-400">
          开始条件：2～8 人且所有非房主玩家已准备
        </div>

        {/* 房主：游戏配置 */}
        {isHost && (
          <div className="space-y-3 bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-gray-700">游戏配置</p>

            {/* 轮次数量 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">轮次数量</span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRounds(r)}
                    className={`w-9 h-8 rounded-lg text-sm font-medium transition-colors ${
                      rounds === r
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* 每回合时间 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">每回合时间</span>
              <div className="flex gap-1.5">
                {[60, 90, 120].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTurnDuration(t)}
                    className={`px-2.5 h-8 rounded-lg text-sm font-medium transition-colors ${
                      turnDuration === t
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                  >
                    {t}秒
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2">
          {isHost ? (
            <Button className="w-full h-11" disabled={!canStart} onClick={handleStartGame}>
              {canStart ? '开始游戏' : '等待所有玩家准备'}
            </Button>
          ) : (
            <Button
              className="w-full h-11"
              variant={isReady ? 'outline' : 'default'}
              onClick={toggleReady}
            >
              {isReady ? '取消准备' : '准备'}
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-gray-500"
            onClick={() => { leaveRoom(); window.location.href = '/draw' }}
          >
            <LogOut className="size-4 mr-1" />
            离开房间
          </Button>
        </div>
      </div>
    </div>
  )
}
