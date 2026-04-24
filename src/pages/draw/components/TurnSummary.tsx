/**
 * Turn 结算叠加层
 *
 * 在 Canvas 区域叠加显示目标词语和得分变化。
 */

import React from 'react'
import type { TurnScore } from '../context/DrawGameContext'

interface TurnSummaryProps {
  /** 目标词语 */
  word: string
  /** 各玩家得分变化 */
  scores: TurnScore[]
  /** 是否可见 */
  visible: boolean
}

const TurnSummary = React.memo(function TurnSummary({ word, scores, visible }: TurnSummaryProps) {
  if (!visible) return null

  /* 按得分从高到低排序 */
  const sorted = [...scores].filter((s) => s.scoreGained > 0).sort((a, b) => b.scoreGained - a.scoreGained)

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs space-y-4 animate-in fade-in zoom-in-95">
        {/* 答案 */}
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">答案是</p>
          <p className="text-2xl font-black text-indigo-600">{word}</p>
        </div>

        {/* 得分列表 */}
        {sorted.length > 0 ? (
          <div className="space-y-1.5">
            {sorted.map((s) => (
              <div
                key={s.playerId}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm"
              >
                <span className="text-gray-700 font-medium">{s.playerName}</span>
                <span className="text-green-600 font-bold">+{s.scoreGained}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400">本回合无人猜对</p>
        )}
      </div>
    </div>
  )
})

export default TurnSummary
