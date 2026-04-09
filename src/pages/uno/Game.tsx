/**
 * UNO 游戏主页面
 *
 * 组装所有游戏组件：弃牌堆、摸牌堆、手牌、玩家信息、
 * 颜色选择弹窗、质疑决策弹窗、UNO 喊牌按钮、消息提示、方向指示
 * 支持移动端响应式布局
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
import type { CardColor } from './context/GameContext'
import { WifiOff } from 'lucide-react'

export default function UnoGame() {
  const {
    gameState,
    playerId,
    connected,
    messages,
    playCard,
    drawCard,
    callUno,
    reportUno,
    chooseColor,
    challengeWild4,
    acceptWild4,
  } = useGame()

  // 颜色选择弹窗状态
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)

  // UNO 按钮显示状态
  const [showUnoButton, setShowUnoButton] = useState(false)

  // 倒计时
  const [countdown, setCountdown] = useState(30)

  // 当前玩家索引
  const myIndex = gameState?.players.findIndex((p) => p.id === playerId) ?? -1
  const isMyTurn = gameState?.currentPlayerIndex === myIndex
  const currentPhase = gameState?.phase

  // 倒计时逻辑
  useEffect(() => {
    if (!gameState?.turnStartTime) return
    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000)
      setCountdown(Math.max(0, 30 - elapsed))
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [gameState?.turnStartTime])

  // 检查是否需要显示 UNO 按钮（手牌剩 2 张时）
  useEffect(() => {
    if (gameState && myIndex >= 0) {
      const myHandCount = gameState.myHand.length
      if (myHandCount === 2 && isMyTurn) {
        setShowUnoButton(true)
      } else {
        setShowUnoButton(false)
      }
    }
  }, [gameState?.myHand.length, isMyTurn, myIndex, gameState])

  // 处理需要选颜色的出牌
  const handleNeedChooseColor = (cardId: string) => {
    setPendingCardId(cardId)
    setColorPickerOpen(true)
  }

  // 选择颜色后出牌
  const handleChooseColor = (color: CardColor) => {
    setColorPickerOpen(false)
    if (pendingCardId) {
      playCard(pendingCardId, color)
      setPendingCardId(null)
    } else {
      // 选色阶段（已出牌，等待选色）
      chooseColor(color)
    }
  }

  // 是否处于质疑阶段且轮到我
  const showChallenge = currentPhase === 'challenging' && isMyTurn
  // 是否处于选色阶段且轮到我（已出牌后的选色）
  const showColorPicker = currentPhase === 'choosing_color' && isMyTurn && !colorPickerOpen

  // 其他玩家（排除自己）
  const otherPlayers = gameState?.players.filter((_, i) => i !== myIndex) || []

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">加载游戏中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-emerald-900 to-gray-900 flex flex-col relative overflow-hidden">
      {/* 连接中断提示 */}
      {!connected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm py-1.5 flex items-center justify-center gap-1">
          <WifiOff className="size-3" />
          连接中断，正在重连...
        </div>
      )}

      {/* 顶部：其他玩家信息 + 方向指示 */}
      <div className="flex-shrink-0 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <DirectionIndicator direction={gameState.direction} />
          <div className="flex items-center gap-2 text-white/70 text-xs">
            {isMyTurn && (
              <span className="bg-yellow-500/80 text-yellow-900 px-2 py-0.5 rounded-full font-medium animate-pulse">
                你的回合 {countdown}s
              </span>
            )}
          </div>
        </div>

        {/* 其他玩家 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {otherPlayers.map((player) => (
            <PlayerInfo
              key={player.id}
              player={player}
              isCurrentTurn={
                gameState.players[gameState.currentPlayerIndex]?.id === player.id
              }
              isSelf={false}
              onReportUno={() => reportUno(player.id)}
            />
          ))}
        </div>
      </div>

      {/* 中央：弃牌堆 + 摸牌堆 */}
      <div className="flex-1 flex items-center justify-center gap-8 px-4">
        <DiscardPile
          topCard={gameState.topCard}
          currentColor={gameState.currentColor}
        />
        <DrawPile
          count={gameState.drawPileCount}
          isMyTurn={isMyTurn && currentPhase === 'playing'}
          onDraw={drawCard}
        />
      </div>

      {/* 底部：消息区域 + 手牌 */}
      <div className="flex-shrink-0 space-y-2 pb-4">
        {/* 消息区域 */}
        <div className="px-3">
          <GameMessages messages={messages} />
        </div>

        {/* 自己的信息 */}
        {myIndex >= 0 && (
          <div className="px-3">
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <span>{gameState.players[myIndex]?.name}</span>
              <span>· {gameState.myHand.length} 张牌</span>
              {gameState.players[myIndex]?.calledUno && (
                <span className="bg-red-500 text-white px-1 rounded text-[10px]">UNO</span>
              )}
            </div>
          </div>
        )}

        {/* 手牌 */}
        <HandCards
          cards={gameState.myHand}
          playableCardIds={gameState.playableCardIds}
          isMyTurn={isMyTurn && currentPhase === 'playing'}
          onPlayCard={(cardId) => playCard(cardId)}
          onNeedChooseColor={handleNeedChooseColor}
        />
      </div>

      {/* UNO 喊牌按钮 */}
      <UnoButton visible={showUnoButton} onCallUno={callUno} />

      {/* 颜色选择弹窗 */}
      <ColorPicker
        open={colorPickerOpen || showColorPicker}
        onChoose={handleChooseColor}
      />

      {/* 质疑决策弹窗 */}
      <ChallengeDialog
        open={showChallenge}
        onChallenge={challengeWild4}
        onAccept={acceptWild4}
      />
    </div>
  )
}
