/**
 * 公共宝石池 — 6种宝石筹码
 */

import type { GemColor, GemMap } from '../context/SplendorGameContext'
import { GemToken } from './GemToken'

const GEM_ORDER: (GemColor | 'gold')[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold']

interface GemPoolProps {
  gemPool: GemMap
  onGemClick?: (color: GemColor) => void
  disabled?: boolean
}

export function GemPool({ gemPool, onGemClick, disabled }: GemPoolProps) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <p className="text-xs text-white/60 font-medium">宝石池</p>
      {GEM_ORDER.map(color => (
        <GemToken
          key={color}
          color={color}
          count={gemPool[color]}
          size="lg"
          onClick={color !== 'gold' && onGemClick ? () => onGemClick(color as GemColor) : undefined}
          disabled={disabled || gemPool[color] === 0}
        />
      ))}
    </div>
  )
}
