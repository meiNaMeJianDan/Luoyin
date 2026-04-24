/**
 * 发展卡组件 — 显示成本、Bonus、声望
 */

import type { DevelopmentCard as DevelopmentCardType, GemColor } from '../context/SplendorGameContext'
import { GEM_STYLES } from './GemToken'

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']

/** 等级对应的背景色 */
const LEVEL_BG: Record<number, string> = {
  1: 'from-green-50 to-green-100',
  2: 'from-blue-50 to-blue-100',
  3: 'from-purple-50 to-purple-100',
}

interface DevelopmentCardProps {
  card: DevelopmentCardType
  onClick?: () => void
  compact?: boolean
}

export function DevelopmentCard({ card, onClick, compact }: DevelopmentCardProps) {
  const bonusStyle = GEM_STYLES[card.bonus]

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-b ${LEVEL_BG[card.level] || LEVEL_BG[1]} rounded-lg border border-gray-200 shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}
        ${compact ? 'p-1.5 min-w-[60px]' : 'p-2 min-w-[80px]'}`}
    >
      {/* 顶部：声望 + Bonus */}
      <div className="flex items-center justify-between mb-1">
        <span className={`font-bold ${compact ? 'text-sm' : 'text-lg'} ${card.prestige > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
          {card.prestige > 0 ? card.prestige : ''}
        </span>
        <span className={`${compact ? 'text-sm' : 'text-base'}`}>{bonusStyle.emoji}</span>
      </div>

      {/* 底部：成本 */}
      <div className={`flex flex-wrap gap-0.5 ${compact ? 'mt-0.5' : 'mt-1'}`}>
        {GEM_COLORS.filter(c => card.cost[c] > 0).map(color => (
          <span
            key={color}
            className={`inline-flex items-center justify-center rounded-full text-[10px] font-bold w-5 h-5
              ${GEM_STYLES[color].bg} ${color === 'diamond' ? 'text-gray-700 border' : 'text-white'}`}
          >
            {card.cost[color]}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 牌堆背面组件 */
export function CardBack({ level, count, onClick }: { level: number; count: number; onClick?: () => void }) {
  const colors: Record<number, string> = { 1: 'bg-green-600', 2: 'bg-blue-600', 3: 'bg-purple-600' }
  return (
    <div
      onClick={onClick}
      className={`${colors[level] || colors[1]} rounded-lg min-w-[60px] h-full flex flex-col items-center justify-center text-white
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
    >
      <span className="text-xs font-bold">Lv.{level}</span>
      <span className="text-[10px] opacity-70">{count} 张</span>
    </div>
  )
}
