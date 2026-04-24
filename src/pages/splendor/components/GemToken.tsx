/**
 * 宝石筹码组件 — 圆形彩色图标+数量
 */

import type { GemColor } from '../context/SplendorGameContext'

/** 宝石颜色映射 */
const GEM_STYLES: Record<GemColor | 'gold', { bg: string; emoji: string; label: string }> = {
  diamond: { bg: 'bg-white border-gray-300', emoji: '💎', label: '钻石' },
  sapphire: { bg: 'bg-blue-500', emoji: '💙', label: '蓝宝石' },
  emerald: { bg: 'bg-green-500', emoji: '💚', label: '祖母绿' },
  ruby: { bg: 'bg-red-500', emoji: '❤️', label: '红宝石' },
  onyx: { bg: 'bg-gray-800', emoji: '🖤', label: '缟玛瑙' },
  gold: { bg: 'bg-yellow-400', emoji: '⭐', label: '黄金' },
}

interface GemTokenProps {
  color: GemColor | 'gold'
  count: number
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
}

export function GemToken({ color, count, size = 'md', onClick, disabled }: GemTokenProps) {
  const style = GEM_STYLES[color]
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm'

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${sizeClass} ${style.bg} rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all
        ${onClick && !disabled ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : 'cursor-default'}
        ${disabled ? 'opacity-40' : ''}
        ${color === 'diamond' ? 'text-gray-700' : 'text-white'}`}
      title={`${style.label}: ${count}`}
    >
      <span className="leading-none">{style.emoji}</span>
      {size !== 'sm' && <span className="text-[10px] leading-none">{count}</span>}
    </button>
  )
}

export { GEM_STYLES }
