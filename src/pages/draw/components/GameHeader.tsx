/**
 * 游戏头部
 *
 * 显示当前 Round/Turn 信息、倒计时进度条、当前 Drawer 标识。
 */

import React, { useState, useEffect, useRef } from 'react'
import type { DrawGamePhase } from '../context/DrawGameContext'
import { Clock, Paintbrush } from 'lucide-react'

interface GameHeaderProps {
  /** 当前轮次 */
  round: number
  /** 当前回合索引 */
  turn: number
  /** Turn 开始时间戳（ms） */
  turnStartTime: number
  /** Turn 持续时间（秒） */
  turnDuration: number
  /** 当前 Drawer 昵称 */
  drawerName: string
  /** 当前游戏阶段 */
  phase: DrawGamePhase
}

const GameHeader = React.memo(function GameHeader({
  round,
  turn,
  turnStartTime,
  turnDuration,
  drawerName,
  phase,
}: GameHeaderProps) {
  const [remaining, setRemaining] = useState(turnDuration)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (phase !== 'drawing') {
      setRemaining(turnDuration)
      return
    }

    const update = () => {
      const elapsed = (Date.now() - turnStartTime) / 1000
      const left = Math.max(0, turnDuration - elapsed)
      setRemaining(Math.ceil(left))
      rafRef.current = requestAnimationFrame(update)
    }

    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, turnStartTime, turnDuration])

  const progress = phase === 'drawing' ? (remaining / turnDuration) * 100 : 100

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow px-4 py-2.5 space-y-2">
      {/* 信息行 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 font-medium">
          第 {round} 轮 · 第 {turn + 1} 回合
        </span>
        <div className="flex items-center gap-1.5 text-amber-600">
          <Paintbrush className="size-3.5" />
          <span className="font-medium">{drawerName}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="size-3.5" />
          <span className={`font-bold tabular-nums ${remaining <= 10 ? 'text-red-500' : ''}`}>
            {remaining}s
          </span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            remaining <= 10 ? 'bg-red-500' : remaining <= 30 ? 'bg-yellow-400' : 'bg-indigo-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
})

export default GameHeader
