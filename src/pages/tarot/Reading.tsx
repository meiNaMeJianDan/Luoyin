/**
 * 塔罗占卜页面
 * 根据 URL 参数 mode 决定抽牌数量和牌阵布局
 */

import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { drawRandomCards, type DrawnCard, type TarotReading } from './data'
import SpreadLayout from './components/SpreadLayout'

type Mode = 'single' | 'three' | 'celtic'

const modeConfig: Record<Mode, { title: string; count: number }> = {
  single: { title: '每日运势', count: 1 },
  three: { title: '三张牌阵', count: 3 },
  celtic: { title: '凯尔特十字', count: 10 },
}

/** 三张牌阵位置名称 */
const threePositions = ['过去', '现在', '未来']

/** 凯尔特十字牌阵位置名称 */
const celticPositions = [
  '现状', '挑战', '过去', '未来', '目标',
  '潜意识', '建议', '外部影响', '希望与恐惧', '最终结果',
]

function getPositionName(mode: Mode, index: number): string {
  if (mode === 'three') return threePositions[index] ?? ''
  if (mode === 'celtic') return celticPositions[index] ?? ''
  return '每日运势'
}

/** 保存占卜记录到 localStorage */
function saveReading(mode: Mode, cards: DrawnCard[]) {
  const reading: TarotReading = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    mode,
    cards,
  }
  try {
    const raw = localStorage.getItem('tarot_history')
    const history: TarotReading[] = raw ? JSON.parse(raw) : []
    history.unshift(reading)
    // 最多保留 50 条
    localStorage.setItem('tarot_history', JSON.stringify(history.slice(0, 50)))
  } catch {
    // localStorage 不可用时静默失败
  }
}

export default function TarotReading() {
  const { mode: rawMode } = useParams<{ mode: string }>()
  const navigate = useNavigate()

  const mode: Mode = (rawMode === 'single' || rawMode === 'three' || rawMode === 'celtic')
    ? rawMode
    : 'single'

  const config = modeConfig[mode]

  const [cards, setCards] = useState<DrawnCard[]>([])
  const [flippedIndices, setFlippedIndices] = useState<Set<number>>(new Set())
  const [isStarted, setIsStarted] = useState(false)
  const [allRevealed, setAllRevealed] = useState(false)

  // 开始占卜
  const handleStart = useCallback(() => {
    const drawn = drawRandomCards(config.count)
    // 给每张牌设置位置名称
    const withPositions = drawn.map((dc, i) => ({
      ...dc,
      position: getPositionName(mode, i),
    }))
    setCards(withPositions)
    setIsStarted(true)
    setFlippedIndices(new Set())
    setAllRevealed(false)
  }, [config.count, mode])

  // 点击翻牌
  const handleCardClick = useCallback((index: number) => {
    setFlippedIndices((prev) => {
      if (prev.has(index)) return prev
      const next = new Set(prev)
      next.add(index)
      // 检查是否全部翻开
      if (next.size === cards.length && cards.length > 0) {
        // 延迟标记全部翻开，让最后一张动画完成
        setTimeout(() => {
          setAllRevealed(true)
          saveReading(mode, cards)
        }, 600)
      }
      return next
    })
  }, [cards, mode])

  // 一键翻开所有牌
  const handleRevealAll = useCallback(() => {
    const all = new Set(cards.map((_, i) => i))
    setFlippedIndices(all)
    setTimeout(() => {
      setAllRevealed(true)
      saveReading(mode, cards)
    }, 600)
  }, [cards, mode])

  // 重新占卜
  const handleReset = useCallback(() => {
    setCards([])
    setFlippedIndices(new Set())
    setIsStarted(false)
    setAllRevealed(false)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-100">🔮 {config.title}</h1>
          <p className="text-purple-300/60 mt-2 text-sm">
            {isStarted ? '点击牌面翻开查看' : '准备好后点击开始占卜'}
          </p>
        </div>

        {/* 未开始 — 显示开始按钮 */}
        {!isStarted ? (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="text-6xl animate-pulse">🔮</div>
            <p className="text-purple-200/70 text-center max-w-md">
              静下心来，在心中默念你想要了解的问题，然后点击下方按钮开始占卜。
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-8 py-3 text-lg"
              onClick={handleStart}
            >
              ✨ 开始占卜
            </Button>
          </div>
        ) : (
          <>
            {/* 牌阵布局 */}
            <SpreadLayout
              mode={mode}
              cards={cards}
              flippedIndices={flippedIndices}
              onCardClick={handleCardClick}
            />

            {/* 一键翻开按钮 */}
            {!allRevealed && flippedIndices.size < cards.length ? (
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  className="border-purple-400/30 text-purple-200 hover:bg-purple-800/30 bg-transparent"
                  onClick={handleRevealAll}
                >
                  一键翻开所有牌
                </Button>
              </div>
            ) : null}
          </>
        )}

        {/* 详细解读区域 — 全部翻开后显示 */}
        {allRevealed ? (
          <div className="mt-10 space-y-6">
            <h2 className="text-xl font-bold text-purple-100 text-center">📖 详细解读</h2>
            <div className="grid gap-4">
              {cards.map((dc, i) => (
                <div
                  key={dc.card.id}
                  className="bg-white/10 backdrop-blur rounded-xl border border-purple-400/20 p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* 牌面信息 */}
                    <div className="text-center shrink-0">
                      <div className="text-3xl mb-1">{dc.card.emoji}</div>
                      <div className="text-purple-100 font-bold text-sm">{dc.card.name}</div>
                      <Badge
                        className={
                          dc.isReversed
                            ? 'bg-red-500/20 text-red-300 border-red-400/30 mt-1'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30 mt-1'
                        }
                      >
                        {dc.isReversed ? '逆位' : '正位'}
                      </Badge>
                    </div>

                    {/* 解读内容 */}
                    <div className="flex-1 space-y-2">
                      {/* 位置 */}
                      <div className="text-purple-300 text-sm font-medium">
                        📍 {dc.position ?? getPositionName(mode, i)}
                      </div>

                      {/* 含义 */}
                      <p className="text-purple-100/90 text-sm leading-relaxed">
                        {dc.isReversed ? dc.card.reversed : dc.card.upright}
                      </p>

                      {/* 牌面描述 */}
                      <p className="text-purple-300/50 text-xs">{dc.card.description}</p>

                      {/* 关键词 */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {dc.card.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/20"
                          >
                            {kw}
                          </span>
                        ))}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20">
                          {dc.card.element}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* 底部操作按钮 */}
        <div className="flex justify-center gap-4 mt-10 pb-8">
          <Button
            variant="outline"
            className="border-purple-400/30 text-purple-200 hover:bg-purple-800/30 bg-transparent"
            onClick={handleReset}
          >
            🔄 重新占卜
          </Button>
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
