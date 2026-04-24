/**
 * 游戏操作日志组件
 *
 * 按时间顺序显示翻牌、按铃、淘汰等操作日志
 * 自动滚动到最新日志
 */

import React, { useEffect, useRef } from 'react'
import type { HalliLogEntry } from '../context/HalliGameContext'

/** 操作类型图标映射 */
const ACTION_ICON: Record<HalliLogEntry['action'], string> = {
  flip: '🃏',
  ring_correct: '🔔',
  ring_wrong: '❌',
  eliminated: '💀',
  recycle: '♻️',
  game_over: '🏆',
}

/** 操作类型颜色映射 */
const ACTION_COLOR: Record<HalliLogEntry['action'], string> = {
  flip: 'text-blue-600',
  ring_correct: 'text-green-600',
  ring_wrong: 'text-red-600',
  eliminated: 'text-gray-600',
  recycle: 'text-purple-600',
  game_over: 'text-yellow-600',
}

interface GameLogProps {
  /** 日志列表 */
  log: HalliLogEntry[]
}

/** 格式化时间戳 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

/** 游戏操作日志组件 */
export const GameLog = React.memo(function GameLog({ log }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到最新日志
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [log.length])

  return (
    <div className="w-full max-w-sm bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-3 py-2 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">📋 游戏日志</h3>
      </div>

      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto px-3 py-2 space-y-1.5"
      >
        {log.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">暂无操作记录</p>
        ) : (
          log.map((entry, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <span className="text-gray-400 shrink-0 font-mono">
                {formatTime(entry.timestamp)}
              </span>
              <span className="shrink-0">{ACTION_ICON[entry.action]}</span>
              <span className={`${ACTION_COLOR[entry.action]} break-all`}>
                {entry.details}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
})
