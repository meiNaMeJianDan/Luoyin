/**
 * 德国心脏病游戏主页面
 *
 * 集成 GameBoard、TurnIndicator、GameLog 等子组件
 * 使用 useGame hook 获取游戏状态和操作方法
 * 游戏结束时自动跳转到结算页
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { useGame } from './hooks/useGame'
import { GameBoard } from './components/GameBoard'
import { TurnIndicator } from './components/TurnIndicator'
import { GameLog } from './components/GameLog'

export default function HalliGame() {
  const { gameState, playerId, isConnected, flipCard, ringBell } = useGame()
  const navigate = useNavigate()

  // 游戏结束时自动跳转到结算页
  useEffect(() => {
    if (gameState?.phase === 'finished' && gameState.roomId) {
      const timer = setTimeout(() => {
        navigate(`/halli/result/${gameState.roomId}`)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, gameState?.roomId, navigate])

  // 加载状态
  if (!gameState || !playerId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">加载游戏中...</p>
      </div>
    )
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const currentPlayerName = currentPlayer?.name || '玩家'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex flex-col overflow-hidden relative">
      {/* 断线提示 */}
      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm py-1 flex items-center justify-center gap-1">
          <WifiOff className="size-3" /> 连接中断，正在重连...
        </div>
      )}

      {/* 顶部：回合指示器 */}
      <div className="flex-shrink-0 pt-3">
        <TurnIndicator
          currentPlayerName={currentPlayerName}
          phase={gameState.phase}
          turnStartTime={gameState.turnStartTime}
        />
      </div>

      {/* 中央：游戏面板 */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-4 py-2">
        <div className="flex gap-4 items-start w-full max-w-[900px]">
          {/* 游戏主面板 */}
          <div className="flex-1 min-w-0">
            <GameBoard
              gameState={gameState}
              playerId={playerId}
              onFlip={flipCard}
              onRing={ringBell}
            />
          </div>

          {/* 右侧：游戏日志 */}
          <div className="hidden lg:block flex-shrink-0 w-64">
            <GameLog log={gameState.log} />
          </div>
        </div>
      </div>

      {/* 底部：移动端日志（小屏幕显示） */}
      <div className="lg:hidden flex-shrink-0 px-4 pb-3">
        <GameLog log={gameState.log} />
      </div>
    </div>
  )
}
