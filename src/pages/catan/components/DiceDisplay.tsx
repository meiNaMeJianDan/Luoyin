/**
 * 骰子显示组件
 *
 * 显示两个骰子结果，简单的掷骰动画（CSS transition）
 */

import { useState, useEffect } from 'react'

/** 骰子面的点阵布局 */
const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DICE_DOTS[value] || []

  return (
    <div
      className={`w-14 h-14 lg:w-16 lg:h-16 bg-white rounded-xl shadow-lg flex items-center justify-center relative transition-transform duration-300 ${
        rolling ? 'animate-spin' : ''
      }`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-2">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={10} fill="#1a1a1a" />
        ))}
      </svg>
    </div>
  )
}

interface DiceDisplayProps {
  diceResult: [number, number] | null
  visible: boolean
}

export default function DiceDisplay({ diceResult, visible }: DiceDisplayProps) {
  const [rolling, setRolling] = useState(false)
  const [displayValues, setDisplayValues] = useState<[number, number]>([1, 1])

  useEffect(() => {
    if (diceResult && visible) {
      // 播放掷骰动画
      setRolling(true)
      // 动画期间随机显示数字
      const interval = setInterval(() => {
        setDisplayValues([
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ])
      }, 80)

      // 动画结束后显示真实结果
      const timer = setTimeout(() => {
        clearInterval(interval)
        setRolling(false)
        setDisplayValues(diceResult)
      }, 600)

      return () => {
        clearInterval(interval)
        clearTimeout(timer)
      }
    }
  }, [diceResult, visible])

  if (!visible || !diceResult) return null

  const sum = diceResult[0] + diceResult[1]
  const isSeven = sum === 7

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-2xl px-5 py-3">
        <DiceFace value={displayValues[0]} rolling={rolling} />
        <DiceFace value={displayValues[1]} rolling={rolling} />
      </div>
      {!rolling && (
        <div className={`text-lg font-bold px-3 py-1 rounded-full ${
          isSeven ? 'bg-red-500/80 text-white' : 'bg-black/60 text-yellow-300'
        }`}>
          = {sum}{isSeven ? ' 🏴‍☠️' : ''}
        </div>
      )}
    </div>
  )
}
