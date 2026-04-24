/**
 * 当前玩家信息区 — 宝石、Bonus、预留卡、贵族
 */

import type { ClientSplendorPlayer, DevelopmentCard as DevelopmentCardType } from '../context/SplendorGameContext'
import { GemToken } from './GemToken'
import { DevelopmentCard } from './DevelopmentCard'
import { GEM_STYLES } from './GemToken'
import type { GemColor } from '../context/SplendorGameContext'

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']

interface PlayerBoardProps {
  player: ClientSplendorPlayer
  onReservedCardClick?: (card: DevelopmentCardType) => void
}

export function PlayerBoard({ player, onReservedCardClick }: PlayerBoardProps) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-3 space-y-2">
      {/* 玩家名和声望 */}
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-sm">{player.name}</span>
        <span className="text-yellow-300 font-bold text-sm">⭐ {player.prestige}</span>
      </div>

      {/* 宝石筹码 */}
      <div className="flex gap-1.5 flex-wrap">
        {[...GEM_COLORS, 'gold' as const].map(color => (
          <GemToken key={color} color={color} count={player.gems[color]} size="sm" />
        ))}
      </div>

      {/* Bonus */}
      <div className="flex gap-1.5">
        {GEM_COLORS.map(color => (
          <div key={color} className="flex items-center gap-0.5">
            <span className="text-xs">{GEM_STYLES[color].emoji}</span>
            <span className="text-xs text-white/70 font-bold">{player.bonus[color]}</span>
          </div>
        ))}
      </div>

      {/* 预留卡 */}
      {player.reservedCards.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-white/40">预留卡</p>
          <div className="flex gap-1">
            {player.reservedCards.map((card, i) => {
              if ('cost' in card) {
                return (
                  <DevelopmentCard
                    key={card.id}
                    card={card}
                    compact
                    onClick={() => onReservedCardClick?.(card)}
                  />
                )
              }
              return (
                <div key={i} className="w-10 h-14 rounded bg-gray-600 flex items-center justify-center text-[10px] text-white/50">
                  Lv.{card.level}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
