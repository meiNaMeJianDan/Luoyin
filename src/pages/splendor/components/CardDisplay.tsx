/**
 * 发展卡展示区 — 3行×4列，左侧牌堆计数
 */

import type { DevelopmentCard as DevelopmentCardType, CardLevel } from '../context/SplendorGameContext'
import { DevelopmentCard, CardBack } from './DevelopmentCard'

interface CardDisplayProps {
  display: Record<CardLevel, DevelopmentCardType[]>
  deckCounts: Record<CardLevel, number>
  onCardClick?: (card: DevelopmentCardType) => void
  onDeckClick?: (level: CardLevel) => void
}

export function CardDisplay({ display, deckCounts, onCardClick, onDeckClick }: CardDisplayProps) {
  const levels: CardLevel[] = [3, 2, 1]

  return (
    <div className="space-y-2">
      {levels.map(level => (
        <div key={level} className="flex gap-2 items-stretch">
          {/* 牌堆 */}
          <div className="w-[60px] min-h-[80px]">
            <CardBack
              level={level}
              count={deckCounts[level]}
              onClick={deckCounts[level] > 0 ? () => onDeckClick?.(level) : undefined}
            />
          </div>
          {/* 展示区 4 张卡 */}
          <div className="flex gap-2 flex-1">
            {display[level].map(card => (
              <DevelopmentCard
                key={card.id}
                card={card}
                onClick={() => onCardClick?.(card)}
              />
            ))}
            {/* 空位占位 */}
            {Array.from({ length: Math.max(0, 4 - display[level].length) }).map((_, i) => (
              <div key={`empty-${level}-${i}`} className="min-w-[80px] rounded-lg border-2 border-dashed border-white/10" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
