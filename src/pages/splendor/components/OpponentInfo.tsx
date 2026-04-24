/**
 * 对手信息组件 — 昵称、声望、Bonus、宝石总数
 */

import type { ClientSplendorPlayer, GemColor } from '../context/SplendorGameContext'
import { GEM_STYLES } from './GemToken'

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']

interface OpponentInfoProps {
  player: ClientSplendorPlayer
  isCurrentTurn: boolean
}

export function OpponentInfo({ player, isCurrentTurn }: OpponentInfoProps) {
  const totalGems = Object.values(player.gems).reduce((a, b) => a + b, 0)

  return (
    <div className={`rounded-lg px-3 py-2 text-xs transition-all ${
      isCurrentTurn
        ? 'bg-emerald-500/30 border border-emerald-400 shadow-lg'
        : 'bg-white/10'
    } ${!player.isConnected ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-bold truncate max-w-[80px]">
          {player.name}
          {player.isAI && ' 🤖'}
        </span>
        <span className="text-yellow-300 font-bold">⭐{player.prestige}</span>
      </div>
      <div className="flex gap-1 mb-1">
        {GEM_COLORS.map(color => (
          <span key={color} className="text-[10px]">
            {GEM_STYLES[color].emoji}{player.bonus[color]}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-white/50">
        <span>💎{totalGems} 📋{player.reservedCardCount} 🃏{player.purchasedCardCount}</span>
      </div>
      {!player.isConnected && <span className="text-red-300 text-[10px]">离线</span>}
    </div>
  )
}
