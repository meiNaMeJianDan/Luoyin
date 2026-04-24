/**
 * 词语选择器
 *
 * Drawer 选词弹窗，显示 3 个候选词语（含难度标识），15 秒倒计时。
 */

import React, { useState, useEffect, useRef } from 'react'
import type { Word } from '../context/DrawGameContext'

interface WordSelectorProps {
  /** 候选词语列表 */
  words: Word[]
  /** 选词回调 */
  onSelect: (index: number) => void
}

/** 难度标签颜色映射 */
const DIFFICULTY_STYLE: Record<string, { label: string; className: string }> = {
  easy: { label: '简单', className: 'bg-green-100 text-green-700' },
  medium: { label: '中等', className: 'bg-yellow-100 text-yellow-700' },
  hard: { label: '困难', className: 'bg-red-100 text-red-700' },
}

/** 选词超时（秒） */
const WORD_SELECT_TIMEOUT = 15

const WordSelector = React.memo(function WordSelector({ words, onSelect }: WordSelectorProps) {
  const [countdown, setCountdown] = useState(WORD_SELECT_TIMEOUT)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setCountdown(WORD_SELECT_TIMEOUT)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [words])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95">
        {/* 标题 */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-gray-800">选择一个词语来画</h2>
          <p className="text-sm text-gray-500">
            剩余 <span className={`font-bold ${countdown <= 5 ? 'text-red-500' : 'text-indigo-500'}`}>{countdown}</span> 秒
          </p>
        </div>

        {/* 候选词语 */}
        <div className="space-y-2">
          {words.map((word, index) => {
            const style = DIFFICULTY_STYLE[word.difficulty] ?? DIFFICULTY_STYLE.easy
            return (
              <button
                key={index}
                onClick={() => onSelect(index)}
                className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
              >
                <span className="text-base font-semibold text-gray-800">{word.text}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.className}`}>
                  {style.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default WordSelector
