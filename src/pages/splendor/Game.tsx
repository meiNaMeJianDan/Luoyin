/**
 * 璀璨宝石游戏主页面
 *
 * 中央布局：上方贵族、中间发展卡展示区、右侧宝石池、底部玩家信息、顶部对手信息
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { useGame } from './hooks/useGame'
import { NobleRow } from './components/NobleRow'
import { CardDisplay } from './components/CardDisplay'
import { GemPool } from './components/GemPool'
import { PlayerBoard } from './components/PlayerBoard'
import { OpponentInfo } from './components/OpponentInfo'
import { TurnIndicator } from './components/TurnIndicator'
import { GameLog } from './components/GameLog'
import { CardDetailDialog } from './components/CardDetailDialog'
import { GemSelectDialog } from './components/GemSelectDialog'
import { NobleCard } from './components/NobleCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  DevelopmentCard,
  GemColor,
  CardLevel,
} from './context/SplendorGameContext'

export default function SplendorGame() {
  const {
    gameState,
    playerId,
    isConnected,
    excessGems,
    choosableNobles,
    takeGems,
    buyCard,
    reserveCard,
    reserveDeck,
    returnGems,
    selectNoble,
  } = useGame()
  const navigate = useNavigate()

  // 弹窗状态
  const [selectedCard, setSelectedCard] = useState<DevelopmentCard | null>(null)
  const [showGemDialog, setShowGemDialog] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [showNobleDialog, setShowNobleDialog] = useState(false)

  // 游戏结束时自动跳转
  useEffect(() => {
    if (gameState?.phase === 'finished' && gameState.roomId) {
      const timer = setTimeout(() => {
        navigate(`/splendor/result/${gameState.roomId}`)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, gameState?.roomId, navigate])

  // 需要归还宝石时弹窗
  useEffect(() => {
    if (excessGems > 0) setShowReturnDialog(true)
  }, [excessGems])

  // 需要选择贵族时弹窗
  useEffect(() => {
    if (choosableNobles.length > 0) setShowNobleDialog(true)
  }, [choosableNobles])

  const handleCardClick = useCallback((card: DevelopmentCard) => {
    setSelectedCard(card)
  }, [])

  const handleDeckClick = useCallback((level: CardLevel) => {
    reserveDeck(level)
  }, [reserveDeck])

  const handleGemClick = useCallback(() => {
    setShowGemDialog(true)
  }, [])

  // 加载状态
  if (!gameState || !playerId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">加载游戏中...</p>
      </div>
    )
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const myPlayer = gameState.players.find(p => p.id === playerId)
  const opponents = gameState.players.filter(p => p.id !== playerId)
  const isMyTurn = currentPlayer?.id === playerId
  const canAct = isMyTurn && (gameState.phase === 'player_turn' || gameState.phase === 'last_round')

  // 判断是否可以购买选中的卡
  const canBuySelected = (() => {
    if (!selectedCard || !myPlayer || !canAct) return false
    // 简单判断：检查成本是否可负担（考虑 bonus）
    const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']
    let goldNeeded = 0
    for (const color of GEM_COLORS) {
      const actualCost = Math.max(0, selectedCard.cost[color] - myPlayer.bonus[color])
      const paid = Math.min(actualCost, myPlayer.gems[color])
      goldNeeded += actualCost - paid
    }
    return goldNeeded <= myPlayer.gems.gold
  })()

  const canReserveSelected = canAct && myPlayer && myPlayer.reservedCardCount < 3

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-green-900 flex flex-col overflow-hidden relative">
      {/* 断线提示 */}
      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm py-1 flex items-center justify-center gap-1">
          <WifiOff className="size-3" /> 连接中断，正在重连...
        </div>
      )}

      {/* 顶部：回合指示器 */}
      <div className="flex-shrink-0 pt-3 pb-2">
        <TurnIndicator
          currentPlayerName={currentPlayer?.name || '玩家'}
          phase={gameState.phase}
          turnStartTime={gameState.turnStartTime}
          isLastRound={gameState.isLastRound}
        />
      </div>

      {/* 对手信息 */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex gap-2 justify-center flex-wrap">
          {opponents.map(p => (
            <OpponentInfo
              key={p.id}
              player={p}
              isCurrentTurn={p.id === currentPlayer?.id}
            />
          ))}
        </div>
      </div>

      {/* 中央区域 */}
      <div className="flex-1 flex gap-4 px-4 py-2 min-h-0">
        {/* 左侧+中间：贵族 + 发展卡 */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* 贵族展示区 */}
          <NobleRow nobles={gameState.nobles} />

          {/* 发展卡展示区 */}
          <div className="flex-1 min-h-0">
            <CardDisplay
              display={gameState.display}
              deckCounts={gameState.deckCounts}
              onCardClick={handleCardClick}
              onDeckClick={canAct ? handleDeckClick : undefined}
            />
          </div>
        </div>

        {/* 右侧：宝石池 + 日志 */}
        <div className="flex-shrink-0 flex flex-col gap-2 w-[80px]">
          <GemPool
            gemPool={gameState.gemPool}
            onGemClick={canAct ? handleGemClick : undefined}
            disabled={!canAct}
          />
        </div>

        {/* 日志（大屏） */}
        <div className="hidden lg:block flex-shrink-0 w-56">
          <GameLog log={gameState.log} />
        </div>
      </div>

      {/* 底部：当前玩家信息 */}
      {myPlayer && (
        <div className="flex-shrink-0 px-4 pb-3">
          <PlayerBoard
            player={myPlayer}
            onReservedCardClick={canAct ? handleCardClick : undefined}
          />
        </div>
      )}

      {/* 小屏日志 */}
      <div className="lg:hidden flex-shrink-0 px-4 pb-3">
        <GameLog log={gameState.log} />
      </div>

      {/* 卡牌详情弹窗 */}
      <CardDetailDialog
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onBuy={canAct ? buyCard : undefined}
        onReserve={canAct ? reserveCard : undefined}
        canBuy={canBuySelected}
        canReserve={!!canReserveSelected}
      />

      {/* 宝石选择弹窗 */}
      <GemSelectDialog
        open={showGemDialog}
        onClose={() => setShowGemDialog(false)}
        mode="take"
        available={gameState.gemPool}
        onConfirm={(gems, mode) => takeGems(gems, mode)}
      />

      {/* 宝石归还弹窗 */}
      {myPlayer && (
        <GemSelectDialog
          open={showReturnDialog}
          onClose={() => setShowReturnDialog(false)}
          mode="return"
          available={myPlayer.gems}
          returnCount={excessGems}
          onConfirm={() => {}}
          onReturnConfirm={(gems) => returnGems(gems)}
        />
      )}

      {/* 贵族选择弹窗 */}
      <Dialog open={showNobleDialog} onOpenChange={(o) => !o && setShowNobleDialog(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>选择一位贵族</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 justify-center flex-wrap">
            {choosableNobles.map(noble => (
              <NobleCard
                key={noble.id}
                noble={noble}
                onClick={() => {
                  selectNoble(noble.id)
                  setShowNobleDialog(false)
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
