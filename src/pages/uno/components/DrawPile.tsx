/**
 * 摸牌堆组件
 *
 * 显示摸牌堆（牌背面），点击发送摸牌请求
 */

import CardView from './CardView'

interface DrawPileProps {
  count: number
  isMyTurn: boolean
  onDraw: () => void
}

export default function DrawPile({ count, isMyTurn, onDraw }: DrawPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-white/70">摸牌堆</p>
      <div className="relative">
        <div
          onClick={isMyTurn ? onDraw : undefined}
          className={isMyTurn ? 'cursor-pointer' : ''}
        >
          <CardView
            faceDown
            size="lg"
            className={isMyTurn ? 'ring-2 ring-white/50 hover:ring-white hover:shadow-xl transition-all' : ''}
          />
        </div>
        {/* 剩余数量 */}
        <div className="absolute -bottom-1 -left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {count}
        </div>
      </div>
    </div>
  )
}
