/**
 * 交易对话框
 *
 * 银行交易：选择提供和期望的资源，显示交易比率
 * 玩家交易：选择提供和期望的资源，广播交易请求
 * 收到交易请求时显示接受/拒绝按钮
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ResourceMap, ResourceType, TradeRatios, TradeProposal, ClientCatanPlayer } from '../types'

/** 资源信息 */
const RESOURCES: { type: ResourceType; icon: string; name: string }[] = [
  { type: 'wood', icon: '🌲', name: '木材' },
  { type: 'brick', icon: '🧱', name: '黏土' },
  { type: 'sheep', icon: '🐑', name: '羊毛' },
  { type: 'wheat', icon: '🌾', name: '小麦' },
  { type: 'ore', icon: '⛰️', name: '矿石' },
]

const emptyResources = (): ResourceMap => ({
  wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
})

/** 资源选择器 */
function ResourceSelector({
  label,
  resources,
  maxResources,
  onChange,
}: {
  label: string
  resources: ResourceMap
  maxResources?: ResourceMap
  onChange: (resources: ResourceMap) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-white/70">{label}</p>
      <div className="grid grid-cols-5 gap-1">
        {RESOURCES.map(({ type, icon, name }) => {
          const count = resources[type]
          const max = maxResources ? maxResources[type] : 99
          return (
            <div key={type} className="flex flex-col items-center gap-1">
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] text-white/50">{name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (count > 0) {
                      onChange({ ...resources, [type]: count - 1 })
                    }
                  }}
                  disabled={count <= 0}
                  className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 disabled:opacity-30"
                >
                  -
                </button>
                <span className="text-white font-bold text-sm w-4 text-center">{count}</span>
                <button
                  onClick={() => {
                    if (count < max) {
                      onChange({ ...resources, [type]: count + 1 })
                    }
                  }}
                  disabled={count >= max}
                  className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface TradeDialogProps {
  open: boolean
  onClose: () => void
  myResources: ResourceMap
  tradeRatios: TradeRatios
  currentTrade: TradeProposal | null
  players: ClientCatanPlayer[]
  playerId: string | null
  onBankTrade: (offer: ResourceMap, request: ResourceMap) => void
  onProposeTrade: (offer: ResourceMap, request: ResourceMap) => void
  onAcceptTrade: (tradeId: string) => void
  onRejectTrade: (tradeId: string) => void
}

export default function TradeDialog({
  open,
  onClose,
  myResources,
  tradeRatios,
  currentTrade,
  players,
  playerId,
  onBankTrade,
  onProposeTrade,
  onAcceptTrade,
  onRejectTrade,
}: TradeDialogProps) {
  const [tab, setTab] = useState<'bank' | 'player'>('bank')
  const [offer, setOffer] = useState<ResourceMap>(emptyResources())
  const [request, setRequest] = useState<ResourceMap>(emptyResources())

  // 银行交易校验
  const bankTradeValid = (() => {
    // 必须恰好提供一种资源，数量等于该资源的交易比率
    const offerEntries = (Object.entries(offer) as [ResourceType, number][]).filter(([, v]) => v > 0)
    const requestEntries = (Object.entries(request) as [ResourceType, number][]).filter(([, v]) => v > 0)
    if (offerEntries.length !== 1 || requestEntries.length !== 1) return false
    const [offerType, offerCount] = offerEntries[0]
    const [, requestCount] = requestEntries[0]
    const ratio = tradeRatios.resources[offerType]
    return offerCount === ratio && requestCount === 1 && myResources[offerType] >= offerCount
  })()

  // 玩家交易校验
  const playerTradeValid = (() => {
    const hasOffer = Object.values(offer).some(v => v > 0)
    const hasRequest = Object.values(request).some(v => v > 0)
    // 检查资源足够
    const canAfford = (Object.keys(offer) as ResourceType[]).every(
      res => myResources[res] >= offer[res]
    )
    return hasOffer && hasRequest && canAfford
  })()

  const handleTrade = () => {
    if (tab === 'bank' && bankTradeValid) {
      onBankTrade(offer, request)
    } else if (tab === 'player' && playerTradeValid) {
      onProposeTrade(offer, request)
    }
    setOffer(emptyResources())
    setRequest(emptyResources())
    onClose()
  }

  // 收到交易请求
  const incomingTrade = currentTrade && currentTrade.proposerId !== playerId

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">交易</DialogTitle>
        </DialogHeader>

        {/* 收到的交易请求 */}
        {incomingTrade && currentTrade && (
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 space-y-2">
            <p className="text-yellow-300 text-sm font-medium">
              📨 {players.find(p => p.id === currentTrade.proposerId)?.name} 发起了交易请求
            </p>
            <div className="flex items-center gap-2 text-xs">
              <div>
                <span className="text-white/50">提供：</span>
                {(Object.entries(currentTrade.offer) as [ResourceType, number][])
                  .filter(([, v]) => v > 0)
                  .map(([type, count]) => {
                    const info = RESOURCES.find(r => r.type === type)
                    return <span key={type} className="ml-1">{info?.icon}{count}</span>
                  })}
              </div>
              <span className="text-white/30">→</span>
              <div>
                <span className="text-white/50">期望：</span>
                {(Object.entries(currentTrade.request) as [ResourceType, number][])
                  .filter(([, v]) => v > 0)
                  .map(([type, count]) => {
                    const info = RESOURCES.find(r => r.type === type)
                    return <span key={type} className="ml-1">{info?.icon}{count}</span>
                  })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onAcceptTrade(currentTrade.id)} className="bg-green-600 hover:bg-green-500">
                ✅ 接受
              </Button>
              <Button size="sm" variant="outline" onClick={() => onRejectTrade(currentTrade.id)} className="border-white/20 text-primary">
                ❌ 拒绝
              </Button>
            </div>
          </div>
        )}

        {/* 交易类型切换 */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setTab('bank')}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              tab === 'bank' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
            }`}
          >
            🏦 银行交易
          </button>
          <button
            onClick={() => setTab('player')}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              tab === 'player' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
            }`}
          >
            🤝 玩家交易
          </button>
        </div>

        {/* 银行交易比率提示 */}
        {tab === 'bank' && (
          <div className="text-[11px] text-white/40 flex flex-wrap gap-2">
            {RESOURCES.map(({ type, icon }) => (
              <span key={type}>
                {icon} {tradeRatios.resources[type]}:1
              </span>
            ))}
          </div>
        )}

        {/* 提供资源 */}
        <ResourceSelector
          label="提供"
          resources={offer}
          maxResources={myResources}
          onChange={setOffer}
        />

        {/* 箭头 */}
        <div className="text-center text-white/30 text-lg">⬇</div>

        {/* 期望资源 */}
        <ResourceSelector
          label="期望"
          resources={request}
          onChange={setRequest}
        />

        {/* 确认按钮 */}
        <Button
          onClick={handleTrade}
          disabled={tab === 'bank' ? !bankTradeValid : !playerTradeValid}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-30"
        >
          {tab === 'bank' ? '确认银行交易' : '发起交易请求'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
