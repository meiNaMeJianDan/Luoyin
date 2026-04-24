/**
 * 牌阵布局组件
 * 根据占卜模式渲染不同的牌阵布局
 */

import type { DrawnCard } from '../data'
import TarotCard from './TarotCard'

interface SpreadLayoutProps {
  mode: 'single' | 'three' | 'celtic'
  cards: DrawnCard[]
  flippedIndices: Set<number>
  onCardClick: (index: number) => void
}

/** 三张牌阵位置名称 */
const threePositions = ['过去', '现在', '未来']

/** 凯尔特十字牌阵位置名称 */
const celticPositions = [
  '现状',
  '挑战',
  '过去',
  '未来',
  '目标',
  '潜意识',
  '建议',
  '外部影响',
  '希望与恐惧',
  '最终结果',
]

function getPositions(mode: string): string[] {
  if (mode === 'three') return threePositions
  if (mode === 'celtic') return celticPositions
  return ['每日运势']
}

export default function SpreadLayout({ mode, cards, flippedIndices, onCardClick }: SpreadLayoutProps) {
  const positions = getPositions(mode)

  // 单张牌阵
  if (mode === 'single') {
    return (
      <div className="flex justify-center py-8">
        {cards[0] ? (
          <TarotCard
            card={cards[0].card}
            isReversed={cards[0].isReversed}
            isFlipped={flippedIndices.has(0)}
            size="lg"
            position={positions[0]}
            onClick={() => onCardClick(0)}
          />
        ) : null}
      </div>
    )
  }

  // 三张牌阵
  if (mode === 'three') {
    return (
      <div className="flex justify-center items-end gap-4 sm:gap-8 py-8">
        {cards.map((dc, i) => (
          <TarotCard
            key={dc.card.id}
            card={dc.card}
            isReversed={dc.isReversed}
            isFlipped={flippedIndices.has(i)}
            size="lg"
            position={positions[i]}
            onClick={() => onCardClick(i)}
          />
        ))}
      </div>
    )
  }

  // 凯尔特十字牌阵
  // 布局：左侧十字形(6张) + 右侧竖列(4张)
  // sm 牌尺寸约 80×128，需要足够间距避免重叠
  const cw = 88  // 牌宽 + 间距
  const ch = 140 // 牌高 + 间距
  const cx = cw * 2 // 十字中心 x
  const cy = ch * 1.5 // 十字中心 y
  const crossW = cw * 5 // 十字区域宽度
  const crossH = ch * 3.5 // 十字区域高度

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 py-8 overflow-x-auto">
      {/* 左侧十字形 */}
      <div className="relative shrink-0" style={{ width: crossW, height: crossH }}>
        {/* 4: 目标 — 上 */}
        <div className="absolute" style={{ left: cx, top: 0 }}>
          <TarotCard card={cards[4]?.card} isReversed={cards[4]?.isReversed} isFlipped={flippedIndices.has(4)} size="sm" position={positions[4]} onClick={() => onCardClick(4)} />
        </div>
        {/* 2: 过去 — 左 */}
        <div className="absolute" style={{ left: 0, top: cy }}>
          <TarotCard card={cards[2]?.card} isReversed={cards[2]?.isReversed} isFlipped={flippedIndices.has(2)} size="sm" position={positions[2]} onClick={() => onCardClick(2)} />
        </div>
        {/* 0: 现状 — 中心 */}
        <div className="absolute z-10" style={{ left: cx, top: cy }}>
          <TarotCard card={cards[0]?.card} isReversed={cards[0]?.isReversed} isFlipped={flippedIndices.has(0)} size="sm" position={positions[0]} onClick={() => onCardClick(0)} />
        </div>
        {/* 1: 挑战 — 中心横置（叠在现状上方），pointer-events-none 防止遮挡其他牌 */}
        <div className="absolute z-20 pointer-events-none" style={{ left: cx + 10, top: cy + 20 }}>
          <div className="[transform:rotate(90deg)] origin-center pointer-events-auto">
            <TarotCard card={cards[1]?.card} isReversed={cards[1]?.isReversed} isFlipped={flippedIndices.has(1)} size="sm" onClick={() => onCardClick(1)} />
          </div>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-purple-200 whitespace-nowrap">{positions[1]}</span>
        </div>
        {/* 3: 未来 — 右 */}
        <div className="absolute" style={{ left: cx * 2, top: cy }}>
          <TarotCard card={cards[3]?.card} isReversed={cards[3]?.isReversed} isFlipped={flippedIndices.has(3)} size="sm" position={positions[3]} onClick={() => onCardClick(3)} />
        </div>
        {/* 5: 潜意识 — 下 */}
        <div className="absolute" style={{ left: cx, top: cy + ch }}>
          <TarotCard card={cards[5]?.card} isReversed={cards[5]?.isReversed} isFlipped={flippedIndices.has(5)} size="sm" position={positions[5]} onClick={() => onCardClick(5)} />
        </div>
      </div>

      {/* 右侧竖列 (6-9)，从下到上 */}
      <div className="flex flex-col-reverse gap-3 shrink-0">
        {[6, 7, 8, 9].map((i) => (
          <TarotCard
            key={cards[i]?.card.id ?? i}
            card={cards[i]?.card}
            isReversed={cards[i]?.isReversed}
            isFlipped={flippedIndices.has(i)}
            size="sm"
            position={positions[i]}
            onClick={() => onCardClick(i)}
          />
        ))}
      </div>
    </div>
  )
}
