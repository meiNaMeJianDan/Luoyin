/**
 * 卡牌详情弹窗 — 购买/预留按钮
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { DevelopmentCard, GemColor } from '../context/SplendorGameContext'
import { GEM_STYLES } from './GemToken'

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']

interface CardDetailDialogProps {
  card: DevelopmentCard | null
  open: boolean
  onClose: () => void
  onBuy?: (cardId: string) => void
  onReserve?: (cardId: string) => void
  canBuy?: boolean
  canReserve?: boolean
}

export function CardDetailDialog({
  card,
  open,
  onClose,
  onBuy,
  onReserve,
  canBuy = false,
  canReserve = false,
}: CardDetailDialogProps) {
  if (!card) return null

  const bonusStyle = GEM_STYLES[card.bonus]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>发展卡详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 卡牌信息 */}
          <div className="text-center space-y-2">
            <div className="text-3xl">{bonusStyle.emoji}</div>
            <p className="text-sm text-gray-500">等级 {card.level} · {bonusStyle.label} Bonus</p>
            {card.prestige > 0 && (
              <p className="text-lg font-bold text-yellow-600">声望 +{card.prestige}</p>
            )}
          </div>

          {/* 成本 */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">购买成本</p>
            <div className="flex gap-2 justify-center">
              {GEM_COLORS.filter(c => card.cost[c] > 0).map(color => (
                <div key={color} className="flex items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${GEM_STYLES[color].bg} ${color === 'diamond' ? 'text-gray-700 border' : 'text-white'}`}>
                    {card.cost[color]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {onBuy && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={!canBuy}
                onClick={() => { onBuy(card.id); onClose() }}
              >
                {canBuy ? '购买' : '资源不足'}
              </Button>
            )}
            {onReserve && (
              <Button
                variant="outline"
                className="flex-1"
                disabled={!canReserve}
                onClick={() => { onReserve(card.id); onClose() }}
              >
                预留
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
