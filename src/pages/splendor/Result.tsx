/**
 * 璀璨宝石结算页面
 *
 * 按声望排名，显示声望、卡牌数、贵族数
 */

import { useNavigate } from 'react-router-dom'
import { Trophy, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGame } from './hooks/useGame'
import { clearSession } from './hooks/useSocket'

export default function SplendorResult() {
  const { gameState, playerId, rankings, leaveRoom } = useGame()
  const navigate = useNavigate()

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">加载结算信息...</p>
      </div>
    )
  }

  const { winnerId } = gameState
  const winner = gameState.players.find((p) => p.id === winnerId)
  const isWinner = winnerId === playerId

  // 使用服务端排名或按声望排序
  const sortedPlayers = rankings.length > 0
    ? rankings
    : gameState.players
        .map(p => ({
          playerId: p.id,
          playerName: p.name,
          prestige: p.prestige,
          purchasedCardCount: p.purchasedCardCount,
          nobleCount: p.nobles.length,
          rank: 0,
        }))
        .sort((a, b) => b.prestige !== a.prestige ? b.prestige - a.prestige : a.purchasedCardCount - b.purchasedCardCount)
        .map((p, i) => ({ ...p, rank: i + 1 }))

  const handleGoHome = () => {
    leaveRoom()
    clearSession()
    navigate('/splendor')
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
          {sortedPlayers.map((player, index) => {
            const isMe = player.playerId === playerId
            const isPlayerWinner = player.playerId === winnerId
            return (
              <div
                key={player.playerId}
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
                    {player.playerName}
                    {isMe ? ' (你)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-white/60 text-xs">
                  <span>⭐{player.prestige}</span>
                  <span>🃏{player.purchasedCardCount}</span>
                  <span>👑{player.nobleCount}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2">
          <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" onClick={handleGoHome}>
            <Home className="size-4 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
