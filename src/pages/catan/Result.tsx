/**
 * 卡坦岛结算页面（占位组件）
 *
 * 后续任务实现完整功能：分数排名、建筑统计等
 */

import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useGame } from './hooks/useGame'
import { clearSession } from './hooks/useSocket'
import { Trophy, RotateCcw, Home } from 'lucide-react'

export default function CatanResult() {
  const { roomId } = useParams<{ roomId: string }>()
  const { gameOver, playerId, leaveRoom } = useGame()

  if (!gameOver) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">加载结算信息...</p>
      </div>
    )
  }

  const { winnerId, players } = gameOver
  const winner = players.find((p) => p.id === winnerId)
  const isWinner = winnerId === playerId

  // 按胜利分排序
  const sortedPlayers = [...players].sort((a, b) => b.victoryPoints - a.victoryPoints)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-amber-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 胜利动画 */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-400/20 animate-pulse">
            <Trophy className="size-10 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-white">
            {isWinner ? '🎉 你赢了！' : `${winner?.name || '玩家'} 获胜！`}
          </h1>
          {isWinner && (
            <p className="text-yellow-300 text-sm animate-bounce">恭喜你成为本局冠军！</p>
          )}
        </div>

        {/* 排名列表 */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 space-y-2">
          <p className="text-white/60 text-sm font-medium mb-3">排名</p>
          {sortedPlayers.map((player, index) => {
            const isMe = player.id === playerId
            const isPlayerWinner = player.id === winnerId
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isPlayerWinner
                    ? 'bg-yellow-400/20 border border-yellow-400/30'
                    : isMe
                      ? 'bg-white/10 border border-white/10'
                      : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? 'bg-yellow-400 text-yellow-900'
                        : index === 1
                          ? 'bg-gray-300 text-gray-700'
                          : index === 2
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-white/20 text-white/60'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className={`font-medium ${isPlayerWinner ? 'text-yellow-300' : 'text-white'}`}>
                    {player.name}
                    {isMe && ' (你)'}
                  </span>
                </div>
                <span className="text-white/60 text-sm">
                  {player.victoryPoints} 分
                </span>
              </div>
            )
          })}
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2">
          <Button
            className="w-full h-11"
            onClick={() => {
              if (roomId) {
                window.location.href = `/catan/room/${roomId}`
              }
            }}
          >
            <RotateCcw className="size-4 mr-2" />
            再来一局
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 text-white border-white/20 hover:bg-white/10"
            onClick={() => {
              if (roomId) leaveRoom(roomId)
              clearSession()
              window.location.href = '/catan'
            }}
          >
            <Home className="size-4 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
