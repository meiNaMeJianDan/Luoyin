/**
 * 消息提示区域组件
 *
 * 展示出牌、摸牌、喊 UNO、举报、质疑等操作的实时消息
 */

import { useEffect, useRef } from 'react'
import type { GameMessage } from '../context/GameContext'

interface GameMessagesProps {
  messages: GameMessage[]
}

export default function GameMessages({ messages }: GameMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  // 只显示最近 10 条
  const recentMessages = messages.slice(-10)

  return (
    <div
      ref={scrollRef}
      className="w-full max-h-28 overflow-y-auto space-y-0.5 px-2 py-1 bg-black/20 rounded-lg backdrop-blur-sm"
    >
      {recentMessages.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-2">暂无消息</p>
      ) : (
        recentMessages.map((msg) => (
          <p key={msg.id} className="text-xs text-white/80 leading-relaxed">
            {msg.text}
          </p>
        ))
      )}
    </div>
  )
}
