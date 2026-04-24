/**
 * 游戏操作日志
 */

import { useRef, useEffect } from 'react'
import type { SplendorLogEntry } from '../context/SplendorGameContext'

const ACTION_ICONS: Record<string, string> = {
  take_gems: '💎',
  buy_card: '🃏',
  reserve_card: '📋',
  return_gems: '↩️',
  noble_visit: '👑',
  game_over: '🏆',
}

interface GameLogProps {
  log: SplendorLogEntry[]
}

export function GameLog({ log }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [log.length])

  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-3">
      <p className="text-xs text-white/40 font-medium mb-2">操作日志</p>
      <div ref={scrollRef} className="max-h-[200px] overflow-y-auto space-y-1">
        {log.length === 0 && (
          <p className="text-xs text-white/20">暂无操作记录</p>
        )}
        {log.slice(-20).map((entry, i) => (
          <div key={i} className="text-[11px] text-white/60 flex items-start gap-1">
            <span>{ACTION_ICONS[entry.action] || '•'}</span>
            <span>{entry.details}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
