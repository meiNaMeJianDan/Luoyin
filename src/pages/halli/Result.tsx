/**
 * 德国心脏病结算页面
 *
 * 显示所有玩家最终排名（按淘汰顺序倒序排列，最后淘汰的排名靠前）
 * 显示胜利者信息（高亮显示）
 * 提供"返回首页"按钮
 */

import { useNavigate } from 'react-router-dom'
import { Trophy, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGame } from './hooks/useGame'
import { clearSession } from './hooks/useSocket'
import type { ClientHalliPlayer } from './context/HalliGameContext'

/** 根据淘汰顺序计算排名：胜利者第1，最后淘汰的第2，依次类推 */
function getRankedPlayers(players: ClientHalliPlayer[], winnerId: string | null): ClientHalliPlayer[] {
  const winner = players.find((p) => p.id === winnerId)
  const eliminated = players
    .filter((p) => p.isEliminated)
    .sort((a, b) => (b.eliminationOrder ?? 0) - (a.eliminationOrder ?? 0))

  const ranked: ClientHalliPlayer[] = []
  if (winner) ranked.push(winner)
  ranked.push(...eliminated)

  // 添加未分类的玩家（理论上不应该出现）
  const rankedIds = new Set(ranked.map((p) => p.id))
  const remaining = players.filter((p) => !rankedIds.has(p.id))
  ranked.push(...remaining)

  return ranked
}

export default function HalliResult() {
  const { gameState, playerId, leaveRoom } = useGame()
  const navigate = useNavigate()

  // 加载状态
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">加载结算信息...</p>
      </div>
    )
  }

  const { winnerId, players } = gameState
  const winner = players.find((p) => p.id === winnerId)
  const isWinner = winnerId === playerId
  const rankedPlayers = getRankedPlayers(players, winnerId)

  const handleGoHome = () => {
    leaveRoom()
    clearSession()
    navigate('/halli')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-emerald-900 to-gray-900 flex items-center justify-center p-4">
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
          <p className="text-white/60 text-sm font-medium mb-3">最终排名</p>
          {rankedPlayers.map((player, index) => {
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
                    {isMe ? ' (你)' : ''}
                  </span>
                </div>
                <span className="text-white/60 text-sm">
                  {isPlayerWinner
                    ? '🏆 冠军'
                    : player.isEliminated
                      ? '💀 已淘汰'
                      : ''}
                </span>
              </div>
            )
          })}
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2">
          <Button className="w-full h-11" onClick={handleGoHome}>
            <Home className="size-4 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
