/**
 * 单张塔罗牌组件
 * 支持正面/背面显示、翻转动画、正逆位
 */

import { cn } from '@/lib/utils'
import type { TarotCard as TarotCardType } from '../data'

interface TarotCardProps {
  card?: TarotCardType
  isReversed?: boolean
  isFlipped?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
  position?: string
}

const sizeMap = {
  sm: { card: 'w-20 h-32', emoji: 'text-2xl', name: 'text-[10px]', pos: 'text-[9px]' },
  md: { card: 'w-28 h-44', emoji: 'text-4xl', name: 'text-xs', pos: 'text-[10px]' },
  lg: { card: 'w-36 h-56', emoji: 'text-5xl', name: 'text-sm', pos: 'text-xs' },
}

export default function TarotCard({
  card,
  isReversed = false,
  isFlipped = false,
  size = 'md',
  onClick,
  className,
  position,
}: TarotCardProps) {
  const s = sizeMap[size]

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {/* 位置标签 */}
      {position ? (
        <span className={cn('text-purple-200 font-medium mb-1', s.pos)}>{position}</span>
      ) : null}

      {/* 卡牌容器 — 3D 翻转 */}
      <div
        className={cn(s.card, 'cursor-pointer [perspective:600px]')}
        onClick={onClick}
      >
        <div
          className={cn(
            'relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]',
            isFlipped && '[transform:rotateY(180deg)]',
          )}
        >
          {/* 背面 */}
          <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl overflow-hidden shadow-lg border-2 border-purple-400/50">
            <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-800 to-violet-900 flex items-center justify-center relative">
              {/* 神秘图案 */}
              <div className="absolute inset-2 border border-purple-400/30 rounded-lg" />
              <div className="absolute inset-4 border border-purple-400/20 rounded-md" />
              <span className="text-3xl opacity-80">✨</span>
              {/* 四角星星 */}
              <span className="absolute top-2 left-2 text-[10px] text-purple-300/60">⭐</span>
              <span className="absolute top-2 right-2 text-[10px] text-purple-300/60">⭐</span>
              <span className="absolute bottom-2 left-2 text-[10px] text-purple-300/60">⭐</span>
              <span className="absolute bottom-2 right-2 text-[10px] text-purple-300/60">⭐</span>
            </div>
          </div>

          {/* 正面 */}
          <div
            className={cn(
              'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl overflow-hidden shadow-lg border-2',
              isReversed ? 'border-red-400/60' : 'border-amber-400/60',
            )}
          >
            <div
              className={cn(
                'w-full h-full bg-gradient-to-b from-slate-50 to-amber-50 flex flex-col items-center justify-center gap-1 p-1',
                isReversed && '[transform:rotate(180deg)]',
              )}
            >
              <span className={cn(s.emoji, 'drop-shadow')}>{card?.emoji}</span>
              <span className={cn(s.name, 'font-bold text-gray-800 text-center leading-tight')}>
                {card?.name}
              </span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                  isReversed
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600',
                )}
              >
                {isReversed ? '逆位' : '正位'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
