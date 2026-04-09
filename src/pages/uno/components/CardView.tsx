/**
 * 单张 UNO 牌渲染组件
 *
 * 根据牌的颜色、类型、值渲染对应的卡牌样式
 * 支持高亮（可出）和灰显（不可出）状态
 * 支持牌背面渲染
 */

import { cn } from '@/lib/utils'
import type { Card, CardColor } from '../context/GameContext'
import { Ban, RefreshCw, Plus, Palette, HelpCircle } from 'lucide-react'

/** 颜色映射 */
const colorMap: Record<CardColor, string> = {
  red: 'bg-red-500 border-red-600',
  yellow: 'bg-yellow-400 border-yellow-500',
  blue: 'bg-blue-500 border-blue-600',
  green: 'bg-green-500 border-green-600',
  wild: 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 border-purple-500',
}

const colorTextMap: Record<CardColor, string> = {
  red: 'text-red-100',
  yellow: 'text-yellow-900',
  blue: 'text-blue-100',
  green: 'text-green-100',
  wild: 'text-white',
}

/** 获取牌面显示内容 */
function getCardDisplay(card: Card) {
  switch (card.value) {
    case 'skip':
      return { icon: <Ban className="size-6" />, label: '禁' }
    case 'reverse':
      return { icon: <RefreshCw className="size-6" />, label: '转' }
    case 'draw_two':
      return { icon: <Plus className="size-6" />, label: '+2' }
    case 'wild':
      return { icon: <Palette className="size-6" />, label: '变' }
    case 'wild_draw_four':
      return { icon: <Plus className="size-6" />, label: '+4' }
    default:
      return { icon: null, label: String(card.value) }
  }
}

interface CardViewProps {
  card?: Card
  /** 是否可出（高亮） */
  playable?: boolean
  /** 是否显示背面 */
  faceDown?: boolean
  /** 点击回调 */
  onClick?: () => void
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CardView({
  card,
  playable = false,
  faceDown = false,
  onClick,
  size = 'md',
  className,
}: CardViewProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md',
    md: 'w-14 h-20 text-sm rounded-lg',
    lg: 'w-20 h-28 text-base rounded-xl',
  }

  // 牌背面
  if (faceDown || !card) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600',
          'flex items-center justify-center shadow-md',
          'select-none',
          className,
        )}
      >
        <div className="text-white font-black opacity-50">
          <HelpCircle className="size-5" />
        </div>
      </div>
    )
  }

  const { icon, label } = getCardDisplay(card)

  return (
    <div
      onClick={onClick}
      className={cn(
        sizeClasses[size],
        colorMap[card.color],
        colorTextMap[card.color],
        'border-2 flex flex-col items-center justify-center shadow-md',
        'font-bold select-none transition-all duration-200',
        playable && 'cursor-pointer hover:-translate-y-2 hover:shadow-xl ring-2 ring-white/50',
        !playable && onClick === undefined && 'opacity-50',
        onClick && !playable && 'cursor-pointer hover:opacity-70',
        className,
      )}
    >
      {icon ? (
        <div className="flex flex-col items-center gap-0.5">
          {icon}
          <span className="text-[10px] leading-none">{label}</span>
        </div>
      ) : (
        <span className={cn(
          size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-lg',
          'font-black drop-shadow-sm',
        )}>
          {label}
        </span>
      )}
    </div>
  )
}
