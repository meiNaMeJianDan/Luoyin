/**
 * UNO 喊牌按钮组件
 *
 * 手牌剩余 2 张且出牌后将剩余 1 张时显示
 * 3 秒内可点击喊 UNO
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface UnoButtonProps {
  visible: boolean
  onCallUno: () => void
}

export default function UnoButton({ visible, onCallUno }: UnoButtonProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      // 3 秒后自动隐藏
      const timer = setTimeout(() => setShow(false), 3000)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [visible])

  if (!show) return null

  return (
    <button
      onClick={() => {
        onCallUno()
        setShow(false)
      }}
      className={cn(
        'fixed bottom-32 right-4 z-50',
        'w-16 h-16 rounded-full',
        'bg-red-500 hover:bg-red-600 active:scale-90',
        'text-white font-black text-lg',
        'shadow-lg shadow-red-500/50',
        'animate-bounce transition-transform',
        'flex items-center justify-center',
      )}
    >
      UNO!
    </button>
  )
}
