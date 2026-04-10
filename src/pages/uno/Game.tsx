/**
 * UNO 游戏主页面
 *
 * 三国杀风格环形座位布局：自己在底部，其他玩家围绕在上方和两侧
 * 出牌倒计时进度条
 */

import { useState, useEffect } from 'react'
import { useGame } from './hooks/useGame'
import HandCards from './components/HandCards'
import DiscardPile from './components/DiscardPile'
import DrawPile from './components/DrawPile'
import PlayerInfo from './components/PlayerInfo'
import ColorPicker from './components/ColorPicker'
import ChallengeDialog from './components/ChallengeDialog'
import UnoButton from './components/UnoButton'
import GameMessages from './components/GameMessages'
import DirectionIndicator from './components/DirectionIndicator'
import type { CardColor, ClientPlayer } from './context/GameContext'
import { WifiOff } from 'lucide-react'

/** 倒计时进度条组件 */
function CountdownBar({ turnStartTime }: { turnStartTime: number }) {
  const [progress, setProgress] = useState(100)
  const [seconds, setSeconds] = useState(30)

  useEffect(() => {
    const update = () => {
      const elapsed = (Date.now() - turnStartTime) / 1000
      const remaining = Math.max(0, 30 - elapsed)
      setProgress((remaining / 30) * 100)
      setSeconds(Math.ceil(remaining))
    }
    update()
    const timer = setInterval(update, 100)
    return () => clearInterval(timer)
  }, [turnStartTime])

  const barColor = progress > 50 ? 'bg-green-400' : progress > 20 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold min-w-[2ch] ${progress <= 20 ? 'text-red-400 animate-pulse' : 'text-white/70'}`}>
        {seconds}
      </span>
    </div>
  )
}

export default function UnoGame() {
  const {
    gameState, playerId, connected, messages,
    playCard, drawCard, callUno, reportUno,
    chooseColor, challengeWild4, acceptWild4,
  } = useGame()

  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)
  const [showUnoButton, setShowUnoButton] = useState(false)

  const myIndex = gameState?.players.findIndex((p) => p.id === playerId) ?? -1
  const isMyTurn = gameState?.currentPlayerIndex === myIndex
  const currentPhase = gameState?.phase

  useEffect(() => {
    if (gameState && myIndex >= 0) {
      setShowUnoButton(gameState.myHand.length === 2 && isMyTurn)
    }
  }, [gameState?.myHand.length, isMyTurn, myIndex, gameState])

  const handleNeedChooseColor = (cardId: string) => {
    setPendingCardId(cardId)
    setColorPickerOpen(true)
  }

  const handleChooseColor = (color: CardColor) => {
    setColorPickerOpen(false)
    if (pendingCardId) { playCard(pendingCardId, color); setPendingCardId(null) }
    else { chooseColor(color) }
  }

  const showChallenge = currentPhase === 'challenging' && isMyTurn
  const showColorPickerDialog = currentPhase === 'choosing_color' && isMyTurn && !colorPickerOpen

  if (!gameState) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-white/60">加载游戏中...</p></div>
  }

  // 三国杀布局：将其他玩家分为上方、左侧、右侧
  const otherPlayers = gameState.players.filter((_, i) => i !== myIndex)
  const { top, left, right } = distributePlayersAround(otherPlayers)

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 via-emerald-900 to-gray-900 flex flex-col relative overflow-hidden">
      {!connected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm py-1 flex items-center justify-center gap-1">
          <WifiOff className="size-3" /> 连接中断，正在重连...
        </div>
      )}

      {/* 全局倒计时进度条 */}
      <div className="px-3 pt-2">
        <CountdownBar turnStartTime={gameState.turnStartTime} />
      </div>

      {/* 上方玩家 + 方向指示 */}
      <div className="flex-shrink-0 px-3 pt-1 pb-1">
        <div className="flex items-center justify-between mb-1">
          <DirectionIndicator direction={gameState.direction} />
          {isMyTurn && (
            <span className="bg-yellow-500/80 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-medium animate-pulse">
              你的回合
            </span>
          )}
        </div>
        {top.length > 0 && (
          <div className="flex justify-center gap-1.5 flex-wrap">
            {top.map((p) => (
              <PlayerInfo key={p.id} player={p}
                isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === p.id}
                isSelf={false} onReportUno={() => reportUno(p.id)} />
            ))}
          </div>
        )}
      </div>

      {/* 中间区域：左侧玩家 + 牌堆 + 右侧玩家 */}
      <div className="flex-1 flex items-center px-2 min-h-0">
        {/* 左侧玩家 */}
        <div className="w-28 flex-shrink-0 space-y-1.5">
          {left.map((p) => (
            <PlayerInfo key={p.id} player={p}
              isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === p.id}
              isSelf={false} onReportUno={() => reportUno(p.id)} />
          ))}
        </div>

        {/* 中央牌堆 */}
        <div className="flex-1 flex items-center justify-center gap-6">
          <DiscardPile topCard={gameState.topCard} currentColor={gameState.currentColor} />
          <DrawPile count={gameState.drawPileCount} isMyTurn={isMyTurn && currentPhase === 'playing'} onDraw={drawCard} />
        </div>

        {/* 右侧玩家 */}
        <div className="w-28 flex-shrink-0 space-y-1.5">
          {right.map((p) => (
            <PlayerInfo key={p.id} player={p}
              isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === p.id}
              isSelf={false} onReportUno={() => reportUno(p.id)} />
          ))}
        </div>
      </div>

      {/* 底部：消息 + 自己信息 + 手牌 */}
      <div className="flex-shrink-0 space-y-1 pb-3">
        <div className="px-3"><GameMessages messages={messages} /></div>
        {myIndex >= 0 && (
          <div className="px-3">
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <span className="text-blue-300 font-medium">{gameState.players[myIndex]?.name}（我）</span>
              <span>· {gameState.myHand.length} 张牌</span>
              {gameState.players[myIndex]?.calledUno && (
                <span className="bg-red-500 text-white px-1 rounded text-[10px]">UNO</span>
              )}
            </div>
          </div>
        )}
        <HandCards cards={gameState.myHand} playableCardIds={gameState.playableCardIds}
          isMyTurn={isMyTurn && currentPhase === 'playing'}
          onPlayCard={(cardId) => playCard(cardId)} onNeedChooseColor={handleNeedChooseColor} />
      </div>

      <UnoButton visible={showUnoButton} onCallUno={callUno} />
      <ColorPicker open={colorPickerOpen || showColorPickerDialog} onChoose={handleChooseColor} />
      <ChallengeDialog open={showChallenge} onChallenge={challengeWild4} onAccept={acceptWild4} />
    </div>
  )
}

/**
 * 三国杀风格分配：将其他玩家分配到上方、左侧、右侧
 * 1 人：上方
 * 2 人：左、右
 * 3 人：左、上、右
 * 4+ 人：左侧一半、上方溢出、右侧一半
 */
function distributePlayersAround(others: ClientPlayer[]) {
  const n = others.length
  if (n === 0) return { top: [], left: [], right: [] }
  if (n === 1) return { top: others, left: [], right: [] }
  if (n === 2) return { top: [], left: [others[0]], right: [others[1]] }
  if (n === 3) return { top: [others[1]], left: [others[0]], right: [others[2]] }

  // 4+ 人：左右各放一部分，剩余放上方
  const leftCount = Math.floor((n - 1) / 3)
  const rightCount = Math.floor((n - 1) / 3)
  const left = others.slice(0, leftCount)
  const right = others.slice(n - rightCount)
  const top = others.slice(leftCount, n - rightCount)
  return { top, left, right }
}
