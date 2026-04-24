/**
 * 回合指示器 + 倒计时
 */

import { useState, useEffect } from 'react'
import type { SplendorGamePhase } from '../context/SplendorGameContext'

const TURN_TIMEOUT = 60 // 秒

interface TurnIndicatorProps {
  currentPlayerName: string
  phase: SplendorGamePhase
  turnStartTime: number
  isLastRound?: boolean
}

export function TurnIndicator({ currentPlayerName, phase, turnStartTime, isLastRound }: TurnIndicatorProps) {
  const [remaining, setRemaining] = useState(TURN_TIMEOUT)

  useEffect(() => {
    const update = () => {
      const elapsed = Math.floor((Date.now() - turnStartTime) / 1000)
      setRemaining(Math.max(0, TURN_TIMEOUT - elapsed))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [turnStartTime])

  const phaseText: Record<SplendorGamePhase, string> = {
    player_turn: '行动阶段',
    return_gems: '归还宝石',
    choose_noble: '选择贵族',
    last_round: '最后一轮',
    finished: '游戏结束',
  }

  const progress = (remaining / TURN_TIMEOUT) * 100

  return (
    <div className="text-center space-y-1">
      <div className="flex items-center justify-center gap-2">
        <span className="text-white font-bold text-sm">{currentPlayerName}</span>
        <span className="text-white/60 text-xs">· {phaseText[phase]}</span>
        {isLastRound && <span className="text-red-400 text-xs font-bold animate-pulse">最后一轮！</span>}
      </div>
      {phase !== 'finished' && (
        <div className="w-48 mx-auto h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              remaining <= 10 ? 'bg-red-400' : remaining <= 30 ? 'bg-yellow-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
