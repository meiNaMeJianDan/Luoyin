/**
 * 出牌方向指示组件
 *
 * 显示当前出牌方向（顺时针/逆时针）
 */

import type { Direction } from '../context/GameContext'
import { RotateCw, RotateCcw } from 'lucide-react'

interface DirectionIndicatorProps {
  direction: Direction
}

export default function DirectionIndicator({ direction }: DirectionIndicatorProps) {
  const isClockwise = direction === 'clockwise'

  return (
    <div className="flex items-center gap-1 text-white/70 text-xs">
      {isClockwise ? (
        <RotateCw className="size-4 animate-spin" style={{ animationDuration: '3s' }} />
      ) : (
        <RotateCcw className="size-4 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
      )}
      <span>{isClockwise ? '顺时针' : '逆时针'}</span>
    </div>
  )
}
