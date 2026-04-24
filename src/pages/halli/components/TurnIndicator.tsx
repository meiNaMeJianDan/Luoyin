/**
 * 回合指示器组件
 *
 * 显示当前回合玩家名称和倒计时进度条
 */

import React, { useState, useEffect, useRef } from 'react'
import type { HalliGamePhase } from '../context/HalliGameContext'

/** 各阶段超时时间（毫秒） */
const PHASE_DURATION: Partial<Record<HalliGamePhase, number>> = {
  flip: 5000,
  bell_window: 3000,
}

interface TurnIndicatorProps {
  /** 当前回合玩家名称 */
  currentPlayerName: string
  /** 游戏阶段 */
  phase: HalliGamePhase
  /** 回合开始时间戳 */
  turnStartTime: number
}

/** 回合指示器组件 */
export const TurnIndicator = React.memo(function TurnIndicator({
  currentPlayerName,
  phase,
  turnStartTime,
}: TurnIndicatorProps) {
  const [progress, setProgress] = useState(100)
  const rafRef = useRef<number>(0)

  const duration = PHASE_DURATION[phase] || 0

  useEffect(() => {
    if (!duration || !turnStartTime) {
      setProgress(100)
      return
    }

    const updateProgress = () => {
      const elapsed = Date.now() - turnStartTime
      const remaining = Math.max(0, 1 - elapsed / duration)
      setProgress(remaining * 100)

      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(updateProgress)
      }
    }

    rafRef.current = requestAnimationFrame(updateProgress)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [duration, turnStartTime])

  // 阶段文案
  const phaseLabel =
    phase === 'flip'
      ? '翻牌阶段'
      : phase === 'bell_window'
        ? '🔔 按铃窗口'
        : phase === 'bell_judging'
          ? '判定中...'
          : '游戏结束'

  // 进度条颜色
  const barColor =
    phase === 'bell_window'
      ? progress < 30
        ? 'bg-red-500'
        : 'bg-yellow-500'
      : progress < 30
        ? 'bg-red-500'
        : 'bg-blue-500'

  return (
    <div className="w-full max-w-md mx-auto px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          {currentPlayerName} · {phaseLabel}
        </span>
        {duration > 0 && (
          <span className="text-xs text-gray-500">
            {Math.ceil((progress / 100) * (duration / 1000))}s
          </span>
        )}
      </div>

      {/* 进度条 */}
      {duration > 0 && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
})
