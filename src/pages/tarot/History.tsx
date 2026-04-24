/**
 * 塔罗占卜历史记录页面
 * 从 localStorage 读取并展示历史占卜记录
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { TarotReading } from './data'

const modeLabels: Record<string, string> = {
  single: '每日运势',
  three: '三张牌阵',
  celtic: '凯尔特十字',
}

function loadHistory(): TarotReading[] {
  try {
    const raw = localStorage.getItem('tarot_history')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function TarotHistory() {
  const navigate = useNavigate()
  const [history, setHistory] = useState(loadHistory)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 按时间倒序（已在保存时 unshift，但以防万一）
  const sorted = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [history])

  const handleClear = () => {
    localStorage.removeItem('tarot_history')
    setHistory([])
    setExpandedId(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-100">📜 占卜历史</h1>
          <p className="text-purple-300/60 mt-2 text-sm">查看你过去的占卜记录</p>
        </div>

        {/* 操作栏 */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-purple-300/60 text-sm">共 {sorted.length} 条记录</span>
          {sorted.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="border-red-400/30 text-red-300 hover:bg-red-900/30 bg-transparent"
              onClick={handleClear}
            >
              🗑️ 清除全部
            </Button>
          ) : null}
        </div>

        {/* 历史列表 */}
        {sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔮</div>
            <p className="text-purple-300/60">还没有占卜记录</p>
            <Button
              className="mt-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white"
              onClick={() => navigate('/tarot')}
            >
              去占卜一下
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((reading) => {
              const isExpanded = expandedId === reading.id
              return (
                <div
                  key={reading.id}
                  className="bg-white/10 backdrop-blur rounded-xl border border-purple-400/20 overflow-hidden transition-all"
                >
                  {/* 摘要行 */}
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                  >
                    <span className="text-lg">
                      {reading.mode === 'single' ? '✨' : reading.mode === 'three' ? '🔮' : '🌟'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-purple-100 font-medium text-sm">
                        {modeLabels[reading.mode] ?? reading.mode}
                      </div>
                      <div className="text-purple-300/50 text-xs">{formatDate(reading.date)}</div>
                    </div>
                    {/* 缩略牌面 */}
                    <div className="flex gap-1 shrink-0">
                      {reading.cards.slice(0, 5).map((dc) => (
                        <span key={dc.card.id} className="text-sm" title={dc.card.name}>
                          {dc.card.emoji}
                        </span>
                      ))}
                      {reading.cards.length > 5 ? (
                        <span className="text-purple-400/60 text-xs">+{reading.cards.length - 5}</span>
                      ) : null}
                    </div>
                    <span className="text-purple-400/60 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* 展开详情 */}
                  {isExpanded ? (
                    <div className="px-4 pb-4 space-y-3 border-t border-purple-400/10 pt-3">
                      {reading.cards.map((dc) => (
                        <div key={dc.card.id} className="flex items-start gap-3">
                          <span className="text-xl shrink-0">{dc.card.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-100 text-sm font-medium">{dc.card.name}</span>
                              <Badge
                                className={
                                  dc.isReversed
                                    ? 'bg-red-500/20 text-red-300 border-red-400/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                }
                              >
                                {dc.isReversed ? '逆位' : '正位'}
                              </Badge>
                              {dc.position ? (
                                <span className="text-purple-400/60 text-xs">📍 {dc.position}</span>
                              ) : null}
                            </div>
                            <p className="text-purple-200/60 text-xs mt-1 leading-relaxed">
                              {dc.isReversed ? dc.card.reversed : dc.card.upright}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {/* 底部导航 */}
        <div className="flex justify-center gap-4 mt-10 pb-8">
          <Button
            variant="outline"
            className="border-purple-400/30 text-purple-200 hover:bg-purple-800/30 bg-transparent"
            onClick={() => navigate('/tarot')}
          >
            🏠 返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
