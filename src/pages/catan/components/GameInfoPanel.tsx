/**
 * 右侧游戏信息面板
 *
 * 上方：所有玩家分数与状态（当前回合玩家高亮）
 * 下方：游戏日志（滚动列表，最新置顶）
 * 显示当前回合数和游戏阶段
 */

import { useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ClientCatanGameState, GameLogEntry, ClientCatanPlayer } from '../types'

/** 玩家颜色映射 */
const COLOR_BG: Record<string, string> = {
  red: 'bg-red-500/20 border-red-500/40',
  blue: 'bg-blue-500/20 border-blue-500/40',
  white: 'bg-gray-300/20 border-gray-300/40',
  orange: 'bg-orange-500/20 border-orange-500/40',
}

const COLOR_TEXT: Record<string, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  white: 'text-gray-300',
  orange: 'text-orange-400',
}

/** 游戏阶段中文名 */
const PHASE_NAMES: Record<string, string> = {
  setup_settlement: '放置村庄',
  setup_road: '放置道路',
  roll_dice: '掷骰子',
  discard: '丢弃资源',
  move_robber: '移动强盗',
  steal: '抢夺资源',
  trade_build: '交易/建造',
  finished: '游戏结束',
}

interface GameInfoPanelProps {
  gameState: ClientCatanGameState
  playerId: string | null
  collapsed?: boolean
  onToggle?: () => void
}

function PlayerRow({ player, isCurrent, isMe }: {
  player: ClientCatanPlayer
  isCurrent: boolean
  isMe: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all ${
        isCurrent
          ? `${COLOR_BG[player.color]} border-opacity-100`
          : 'border-transparent hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
          player.color === 'red' ? 'bg-red-500' :
          player.color === 'blue' ? 'bg-blue-500' :
          player.color === 'white' ? 'bg-gray-300' :
          'bg-orange-500'
        }`} />
        <span className={`text-xs truncate ${COLOR_TEXT[player.color]} ${isCurrent ? 'font-bold' : ''}`}>
          {player.name}{isMe ? '(你)' : ''}
        </span>
        {!player.isConnected && (
          <span className="text-[10px] text-red-400">⚡</span>
        )}
        {player.isAI && (
          <span className="text-[10px] text-blue-300">🤖</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {player.hasLongestRoad && <span className="text-[10px]">🛤</span>}
        {player.hasLargestArmy && <span className="text-[10px]">⚔</span>}
        <span className="text-yellow-300 text-xs font-bold">{player.victoryPoints}</span>
        <span className="text-white/30 text-[10px]">🃏{player.resourceCount}</span>
      </div>
    </div>
  )
}

function LogEntry({ entry, players }: { entry: GameLogEntry; players: ClientCatanPlayer[] }) {
  const player = players.find(p => p.id === entry.playerId)
  const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="text-[11px] py-0.5 leading-relaxed">
      <span className="text-white/30">{time}</span>{' '}
      <span className={COLOR_TEXT[player?.color || 'white']}>{player?.name || '系统'}</span>{' '}
      <span className="text-white/60">{entry.details}</span>
    </div>
  )
}

export default function GameInfoPanel({ gameState, playerId, collapsed, onToggle }: GameInfoPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null)

  // 新日志自动滚动到顶部
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameState.log.length])

  // 折叠模式
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur text-white px-3 py-6 rounded-l-xl shadow-lg active:bg-black/90"
      >
        <span className="text-sm font-medium">📊</span>
      </button>
    )
  }

  const currentPlayerIndex = gameState.currentPlayerIndex
  const reversedLog = [...gameState.log].reverse()

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-sm rounded-xl p-3 space-y-3 overflow-y-auto">
      {/* 游戏状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">回合 {gameState.turnNumber}</span>
          <span className="bg-white/10 text-white/70 text-[10px] px-1.5 py-0.5 rounded">
            {PHASE_NAMES[gameState.phase] || gameState.phase}
          </span>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="lg:hidden text-white/40 hover:text-white/80 text-xs">
            ✕
          </button>
        )}
      </div>

      {/* 玩家列表 */}
      <div className="space-y-1">
        <p className="text-white/50 text-xs font-medium">玩家</p>
        {gameState.players.map((player, index) => (
          <PlayerRow
            key={player.id}
            player={player}
            isCurrent={index === currentPlayerIndex}
            isMe={player.id === playerId}
          />
        ))}
      </div>

      {/* 游戏日志 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="text-white/50 text-xs font-medium mb-1">日志</p>
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 pr-2">
            <div ref={logEndRef} />
            {reversedLog.length === 0 ? (
              <p className="text-white/20 text-xs text-center py-4">暂无日志</p>
            ) : (
              reversedLog.map((entry, i) => (
                <LogEntry key={i} entry={entry} players={gameState.players} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
