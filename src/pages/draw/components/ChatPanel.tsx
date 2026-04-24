/**
 * 聊天面板
 *
 * 显示聊天消息列表（普通消息、系统消息、猜对提示以不同样式区分）。
 * 聊天输入框（Drawer 禁用、已猜对的 Guesser 禁用）。
 */

import React, { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../context/DrawGameContext'
import { Send } from 'lucide-react'

interface ChatPanelProps {
  /** 聊天消息列表 */
  messages: ChatMessage[]
  /** 发送消息回调 */
  onSend: (msg: string) => void
  /** 是否禁用输入 */
  disabled: boolean
  /** 禁用原因提示 */
  disabledReason?: string
}

const ChatPanel = React.memo(function ChatPanel({
  messages,
  onSend,
  disabled,
  disabledReason,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  /* 新消息自动滚动到底部 */
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow overflow-hidden">
      {/* 标题 */}
      <div className="px-4 py-2.5 border-b border-gray-100 text-sm font-semibold text-gray-700">
        聊天 / 猜词
      </div>

      {/* 消息列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {messages.length === 0 && (
          <p className="text-center text-gray-300 text-xs py-4">暂无消息</p>
        )}
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
          placeholder={disabled ? (disabledReason ?? '不可发言') : '输入猜测或聊天...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={disabled}
          maxLength={200}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="p-2 rounded-lg bg-indigo-500 text-white disabled:opacity-40 hover:bg-indigo-600 transition-colors"
          title="发送"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
})

/** 单条消息气泡 */
function ChatBubble({ message }: { message: ChatMessage }) {
  switch (message.type) {
    case 'system':
      return (
        <div className="text-center text-xs text-gray-400 py-0.5">
          {message.message}
        </div>
      )
    case 'correct':
      return (
        <div className="text-center text-xs font-medium text-green-600 bg-green-50 rounded-lg py-1 px-2">
          🎉 {message.message}
        </div>
      )
    case 'close':
      return (
        <div className="text-xs text-orange-500 italic pl-2 py-0.5">
          💡 {message.message}
        </div>
      )
    default:
      return (
        <div className="flex gap-1.5 items-start">
          <span className="font-medium text-indigo-600 shrink-0">{message.playerName}:</span>
          <span className="text-gray-700 break-all">{message.message}</span>
        </div>
      )
  }
}

export default ChatPanel
