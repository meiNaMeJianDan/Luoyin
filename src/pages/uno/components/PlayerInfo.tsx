/**
 * 其他玩家信息组件
 *
 * 显示昵称、手牌数量、是否为当前回合
 * 当前回合玩家高亮显示
 */

import { cn } from '@/lib/utils'
import type { ClientPlayer } from '../context/GameContext'
import { UserRound, Bot, WifiOff } from 'lucide-react'

interface PlayerInfoProps {
  player: ClientPlayer
  isCurrentTurn: boolean
  isSelf: boolean
  onReportUno?: () => void
}

export default function PlayerInfo({
  player,
  isCurrentTurn,
  isSelf,
  onReportUno,
}: PlayerInfoProps) {
  // 手牌剩 1 张且未喊 UNO，可以举报
  const canReport = player.handCount === 1 && !player.calledUno && !isSelf

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300',
        isCurrentTurn
          ? 'bg-yellow-400/90 text-yellow-900 shadow-lg shadow-yellow-400/30 scale-105'
          : 'bg-white/20 text-white',
        !player.isConnected && 'opacity-60',
      )}
    >
      {/* 头像 */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center',
        isCurrentTurn ? 'bg-yellow-600/30' : 'bg-white/20',
      )}>
        {player.isAI ? (
          <Bot className="size-4" />
        ) : (
          <UserRound className="size-4" />
        )}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium truncate">{player.name}</span>
          {!player.isConnected && <WifiOff className="size-3 text-red-300" />}
          {player.calledUno && (
            <span className="text-[10px] bg-red-500 text-white px-1 rounded">UNO</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs opacity-70">{player.handCount} 张牌</span>
        </div>
      </div>

      {/* 举报按钮 */}
      {canReport && (
        <button
          onClick={onReportUno}
          className="text-[10px] bg-red-500/80 hover:bg-red-500 text-white px-2 py-0.5 rounded-full transition-colors"
        >
          举报
        </button>
      )}
    </div>
  )
}
