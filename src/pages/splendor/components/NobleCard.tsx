/**
 * 贵族卡组件
 */

import type { Noble, GemColor } from '../context/SplendorGameContext'
import { GEM_STYLES } from './GemToken'

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']

interface NobleCardProps {
  noble: Noble
  onClick?: () => void
}

export function NobleCard({ noble, onClick }: NobleCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300 p-2 min-w-[70px] shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg font-bold text-amber-600">👑</span>
        <span className="text-sm font-bold text-amber-700">{noble.prestige}</span>
      </div>
      <p className="text-[10px] text-gray-500 truncate mb-1">{noble.name}</p>
      <div className="flex flex-wrap gap-0.5">
        {GEM_COLORS.filter(c => noble.requirements[c] > 0).map(color => (
          <span
            key={color}
            className={`inline-flex items-center justify-center rounded-full text-[10px] font-bold w-5 h-5
              ${GEM_STYLES[color].bg} ${color === 'diamond' ? 'text-gray-700 border' : 'text-white'}`}
          >
            {noble.requirements[color]}
          </span>
        ))}
      </div>
    </div>
  )
}
