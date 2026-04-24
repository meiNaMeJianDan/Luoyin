/**
 * 词语提示显示
 *
 * 显示下划线占位符或已揭示字符。
 * Drawer 看到完整词语。
 */

import React from 'react'

interface WordHintProps {
  /** 提示字符数组（'_' 表示未揭示，其他为已揭示字符） */
  hint: string[]
  /** 当前词语（仅 Drawer 可见，Guesser 为 null） */
  currentWord?: string | null
}

const WordHint = React.memo(function WordHint({ hint, currentWord }: WordHintProps) {
  /* Drawer 直接显示完整词语 */
  if (currentWord) {
    return (
      <div className="flex items-center justify-center gap-1 py-2">
        <span className="text-lg font-bold text-amber-600 tracking-widest">{currentWord}</span>
        <span className="text-xs text-amber-400 ml-2">（你来画）</span>
      </div>
    )
  }

  /* Guesser 显示提示 */
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {hint.map((char, index) => (
        <span
          key={index}
          className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-base font-bold ${
            char === '_'
              ? 'bg-gray-100 text-gray-300 border border-gray-200'
              : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
          }`}
        >
          {char === '_' ? '\u00A0' : char}
        </span>
      ))}
      <span className="text-xs text-gray-400 ml-2">（{hint.length} 个字）</span>
    </div>
  )
})

export default WordHint
