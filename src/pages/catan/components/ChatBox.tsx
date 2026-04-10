/**
 * 聊天窗口组件
 *
 * 右下角悬浮聊天窗口，可最小化/展开
 * 显示聊天消息列表，输入框+发送按钮
 */

import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CatanChatMessage, ClientCatanPlayer } from '../types'

/** 玩家颜色映射 */
const COLOR_TEXT: Record<string, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  white: 'text-gray-300',
  orange: 'text-orange-400',
}

interface ChatBoxProps {
  messages: CatanChatMessage[]
  players: ClientCatanPlayer[]
  playerId: string | null
  onSend: (message: string) => void
}

export default function ChatBox({ messages, players, playerId, onSend }: ChatBoxProps) {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(messages.length)

  // 新消息计数
  useEffect(() => {
    if (!expanded && messages.length > prevCountRef.current) {
      setUnread(prev => prev + (messages.length - prevCountRef.current))
    }
    prevCountRef.current = messages.length
  }, [messages.length, expanded])

  // 展开时清除未读
  useEffect(() => {
    if (expanded) {
      setUnread(0)
      // 滚动到底部
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [expanded])

  // 新消息自动滚动
  useEffect(() => {
    if (expanded) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, expanded])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 查找玩家颜色
  const getPlayerColor = (pid: string) => {
    const player = players.find(p => p.id === pid)
    return player?.color || 'white'
  }

  // 最小化状态
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 right-4 z-40 bg-black/60 backdrop-blur text-white px-3 py-2 rounded-full shadow-lg hover:bg-black/80 transition-colors flex items-center gap-1.5"
      >
        💬
        {unread > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-72 bg-gray-900/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={{ maxHeight: '320px' }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-white text-sm font-medium">💬 聊天</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-white/40 hover:text-white/80 text-xs"
        >
          ✕
        </button>
      </div>

      {/* 消息列表 */}
      <ScrollArea className="flex-1 min-h-0" style={{ height: '200px' }}>
        <div className="p-2 space-y-1">
          {messages.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-4">暂无消息</p>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.playerId === playerId
              const color = getPlayerColor(msg.playerId)
              return (
                <div key={i} className="text-xs leading-relaxed">
                  <span className={`font-medium ${COLOR_TEXT[color]}`}>
                    {msg.playerName}{isMe ? '(你)' : ''}
                  </span>
                  <span className="text-white/60 ml-1">{msg.message}</span>
                </div>
              )
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* 输入框 */}
      <div className="flex items-center gap-1 p-2 border-t border-white/10">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          maxLength={200}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white text-xs px-2 py-1.5 rounded-lg transition-colors"
        >
          发送
        </button>
      </div>
    </div>
  )
}
