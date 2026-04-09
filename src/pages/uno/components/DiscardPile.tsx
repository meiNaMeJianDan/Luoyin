/**
 * 弃牌堆组件
 *
 * 显示弃牌堆堆顶牌
 */

import CardView from './CardView'
import type { Card, CardColor } from '../context/GameContext'

/** 当前颜色指示器的颜色映射 */
const indicatorColors: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
}

interface DiscardPileProps {
  topCard: Card | null
  currentColor: CardColor
}

export default function DiscardPile({ topCard, currentColor }: DiscardPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-white/70">弃牌堆</p>
      <div className="relative">
        {topCard ? (
          <CardView card={topCard} size="lg" />
        ) : (
          <div className="w-20 h-28 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center">
            <span className="text-white/30 text-xs">空</span>
          </div>
        )}
        {/* 当前颜色指示 */}
        {currentColor && currentColor !== 'wild' && (
          <div
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow ${indicatorColors[currentColor] || ''}`}
            title={`当前颜色: ${currentColor}`}
          />
        )}
      </div>
    </div>
  )
}
