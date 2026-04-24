/**
 * 塔罗占卜首页
 * 提供三种占卜模式选择
 */

import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const modes = [
  {
    key: 'single',
    title: '✨ 单张抽牌',
    subtitle: '每日运势',
    description: '抽取一张牌，了解今日的能量指引和运势方向。适合快速占卜和日常指引。',
    count: 1,
  },
  {
    key: 'three',
    title: '🔮 三张牌阵',
    subtitle: '过去 / 现在 / 未来',
    description: '经典的时间线牌阵，揭示事情的发展脉络。了解过去的影响、当前的状态和未来的趋势。',
    count: 3,
  },
  {
    key: 'celtic',
    title: '🌟 凯尔特十字',
    subtitle: '深度解读',
    description: '最经典的十张牌阵，从多个维度深入分析你的处境，包括现状、挑战、潜意识、外部影响等。',
    count: 10,
  },
] as const

export default function TarotHome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 flex flex-col">
      {/* 顶部装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-[10%] w-2 h-2 bg-purple-300 rounded-full animate-pulse" />
        <div className="absolute top-20 right-[20%] w-1.5 h-1.5 bg-violet-300 rounded-full animate-pulse [animation-delay:0.5s]" />
        <div className="absolute top-40 left-[30%] w-1 h-1 bg-indigo-300 rounded-full animate-pulse [animation-delay:1s]" />
        <div className="absolute top-32 right-[35%] w-2 h-2 bg-purple-200 rounded-full animate-pulse [animation-delay:1.5s]" />
        <div className="absolute top-16 left-[60%] w-1.5 h-1.5 bg-violet-200 rounded-full animate-pulse [animation-delay:0.8s]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 py-12">
        {/* 标题区域 */}
        <div className="text-center mb-12 space-y-3">
          <h1 className="text-5xl font-black bg-gradient-to-r from-amber-200 via-purple-200 to-violet-200 bg-clip-text text-transparent">
            🔮 塔罗占卜
          </h1>
          <p className="text-purple-300/80 text-lg">探索内心的智慧，聆听宇宙的指引</p>
        </div>

        {/* 模式选择 */}
        <div className="grid gap-6 w-full max-w-lg">
          {modes.map((mode) => (
            <Card
              key={mode.key}
              className="bg-white/10 backdrop-blur border-purple-400/20 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group"
              onClick={() => navigate(`/tarot/reading/${mode.key}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-100 group-hover:text-white transition-colors text-xl">
                  {mode.title}
                </CardTitle>
                <CardDescription className="text-purple-300/70">
                  {mode.subtitle} · {mode.count} 张牌
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-purple-200/60 text-sm leading-relaxed">{mode.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 底部导航 */}
        <div className="mt-12 flex gap-4">
          <Button
            variant="outline"
            className="border-purple-400/30 text-purple-200 hover:bg-purple-800/30 hover:text-white bg-transparent"
            onClick={() => navigate('/tarot/history')}
          >
            📜 占卜历史
          </Button>
          <Button
            variant="outline"
            className="border-purple-400/30 text-purple-200 hover:bg-purple-800/30 hover:text-white bg-transparent"
            onClick={() => navigate('/')}
          >
            🏠 返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
