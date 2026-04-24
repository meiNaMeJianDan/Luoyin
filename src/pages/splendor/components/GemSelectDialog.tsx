/**
 * 宝石选择弹窗 — 拿取/归还模式
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { GemColor, GemMap } from '../context/SplendorGameContext'
import { GemToken } from './GemToken'

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']

interface GemSelectDialogProps {
  open: boolean
  onClose: () => void
  mode: 'take' | 'return'
  /** 拿取模式：宝石池数量；归还模式：玩家持有数量 */
  available: GemMap
  /** 归还模式：需要归还的数量 */
  returnCount?: number
  onConfirm: (gems: GemColor[], mode: 'three' | 'two') => void
  onReturnConfirm?: (gems: GemMap) => void
}

export function GemSelectDialog({
  open,
  onClose,
  mode,
  available,
  returnCount = 0,
  onConfirm,
  onReturnConfirm,
}: GemSelectDialogProps) {
  const [selected, setSelected] = useState<GemColor[]>([])
  const [returnGems, setReturnGems] = useState<GemMap>({
    diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0,
  })

  const handleToggle = (color: GemColor) => {
    if (mode === 'take') {
      setSelected(prev => {
        if (prev.includes(color)) return prev.filter(c => c !== color)
        if (prev.length >= 3) return prev
        return [...prev, color]
      })
    }
  }

  const handleReturnChange = (color: GemColor | 'gold', delta: number) => {
    setReturnGems(prev => {
      const newVal = Math.max(0, Math.min(available[color], prev[color] + delta))
      return { ...prev, [color]: newVal }
    })
  }

  const totalReturn = Object.values(returnGems).reduce((a, b) => a + b, 0)

  const handleConfirm = () => {
    if (mode === 'take') {
      // 判断是拿 2 个同色还是 3 种不同色
      if (selected.length === 1) {
        onConfirm(selected, 'two')
      } else {
        onConfirm(selected, 'three')
      }
      setSelected([])
    } else {
      onReturnConfirm?.(returnGems)
      setReturnGems({ diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setSelected([]); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'take' ? '选择宝石' : `归还宝石（需归还 ${returnCount} 个）`}</DialogTitle>
        </DialogHeader>

        {mode === 'take' ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">选择 1-3 种不同颜色各拿 1 个，或选择 1 种拿 2 个（需≥4）</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {GEM_COLORS.map(color => (
                <div key={color} className="flex flex-col items-center gap-1">
                  <GemToken
                    color={color}
                    count={available[color]}
                    size="lg"
                    onClick={() => handleToggle(color)}
                    disabled={available[color] === 0}
                  />
                  {selected.includes(color) && (
                    <span className="text-xs text-emerald-600 font-bold">✓</span>
                  )}
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={selected.length === 0}
              onClick={handleConfirm}
            >
              确认拿取（{selected.length} 种）
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {([...GEM_COLORS, 'gold'] as (GemColor | 'gold')[]).filter(c => available[c] > 0).map(color => (
                <div key={color} className="flex items-center justify-between">
                  <GemToken color={color} count={available[color]} size="sm" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReturnChange(color, -1)}
                      disabled={returnGems[color] === 0}
                      className="w-6 h-6 rounded bg-gray-200 text-xs disabled:opacity-30"
                    >-</button>
                    <span className="w-4 text-center text-sm font-bold">{returnGems[color]}</span>
                    <button
                      onClick={() => handleReturnChange(color, 1)}
                      disabled={returnGems[color] >= available[color]}
                      className="w-6 h-6 rounded bg-gray-200 text-xs disabled:opacity-30"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={totalReturn !== returnCount}
              onClick={handleConfirm}
            >
              确认归还（{totalReturn}/{returnCount}）
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
