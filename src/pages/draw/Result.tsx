/**
 * 你画我猜结算页面
 *
 * 按总分从高到低排列所有玩家，展示排名和分数。
 * 提供返回首页按钮。
 */

import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useGame } from './hooks/useGame'
import { Trophy, Medal, Award } from 'lucide-react'

/** 排名图标 */
const RANK_ICONS = [
  <Trophy key="1" className="size-5 text-yellow-500" />,
  <Medal key="2" className="size-5 text-gray-400" />,
  <Award key="3" className="size-5 text-orange-400" />,
]

export default function DrawResult() {
  const navigate = useNavigate()
  const { gameState } = useGame()

  const players = gameState?.players
    ? [...gameState.players].sort((a, b) => b.score - a.score)
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">🏆 游戏结束</h1>

        {players.length > 0 ? (
          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all ${
                  index === 0
                    ? 'bg-yellow-50 border-2 border-yellow-400 shadow-sm'
                    : index === 1
                      ? 'bg-gray-50 border-2 border-gray-300'
                      : index === 2
                        ? 'bg-orange-50 border-2 border-orange-300'
                        : 'bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* 排名图标或数字 */}
                  {index < 3 ? (
                    RANK_ICONS[index]
                  ) : (
                    <span className="text-sm font-bold text-gray-400 w-5 text-center">
                      {index + 1}
                    </span>
                  )}
                  <span className="font-medium text-gray-800">{player.name}</span>
                </div>
                <span className="font-bold text-indigo-600">{player.score} 分</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400">暂无数据</p>
        )}

        <Button className="w-full" onClick={() => navigate('/draw')}>
          返回首页
        </Button>
      </div>
    </div>
  )
}
