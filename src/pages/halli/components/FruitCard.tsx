/**
 * 水果牌渲染组件
 *
 * 根据水果种类和数量渲染对应的水果 emoji 图标
 * 支持牌面朝上（显示水果）和牌面朝下（显示背面）两种模式
 */

import React from 'react'
import type { FruitCard as FruitCardType, FruitType } from '../context/HalliGameContext'

/** 水果 emoji 映射 */
const FRUIT_EMOJI: Record<FruitType, string> = {
  banana: '🍌',
  strawberry: '🍓',
  cherry: '🍒',
  lime: '🍋',
}

/** 水果背景色映射 */
const FRUIT_BG: Record<FruitType, string> = {
  banana: 'bg-yellow-50 border-yellow-300',
  strawberry: 'bg-red-50 border-red-300',
  cherry: 'bg-pink-50 border-pink-300',
  lime: 'bg-green-50 border-green-300',
}

/** 尺寸映射 */
const SIZE_MAP = {
  sm: { card: 'w-14 h-20', emoji: 'text-sm', gap: 'gap-0.5' },
  md: { card: 'w-20 h-28', emoji: 'text-lg', gap: 'gap-1' },
  lg: { card: 'w-28 h-40', emoji: 'text-2xl', gap: 'gap-1' },
} as const

interface FruitCardProps {
  /** 水果牌数据，null 表示空位 */
  card: FruitCardType | null
  /** 是否牌面朝下 */
  faceDown?: boolean
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
}

/** 水果牌渲染组件 */
export const FruitCardComponent = React.memo(function FruitCardComponent({
  card,
  faceDown = false,
  size = 'md',
}: FruitCardProps) {
  const sizeStyle = SIZE_MAP[size]

  // 空牌位
  if (!card) {
    return (
      <div
        className={`${sizeStyle.card} rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center`}
      >
        <span className="text-gray-300 text-xs">空</span>
      </div>
    )
  }

  // 牌面朝下
  if (faceDown) {
    return (
      <div
        className={`${sizeStyle.card} rounded-lg border-2 border-indigo-400 bg-indigo-100 flex items-center justify-center shadow-sm`}
      >
        <div className="w-3/4 h-3/4 rounded bg-indigo-200 border border-indigo-300 flex items-center justify-center">
          <span className="text-indigo-400 text-lg">🃏</span>
        </div>
      </div>
    )
  }

  // 牌面朝上：显示水果 emoji
  const emoji = FRUIT_EMOJI[card.fruit]
  const bgClass = FRUIT_BG[card.fruit]

  return (
    <div
      className={`${sizeStyle.card} rounded-lg border-2 ${bgClass} flex flex-col items-center justify-center shadow-sm ${sizeStyle.gap}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-0.5">
        {Array.from({ length: card.count }, (_, i) => (
          <span key={i} className={sizeStyle.emoji}>
            {emoji}
          </span>
        ))}
      </div>
    </div>
  )
})
