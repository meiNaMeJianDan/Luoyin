/**
 * 底部操作栏
 *
 * 掷骰子、建造（道路/村庄/城市下拉）、交易、发展卡、结束回合
 * 按钮状态随游戏阶段变化（非当前回合/资源不足时禁用）
 * 建造按钮点击后切换地图的交互模式（高亮可建造位置）
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ClientCatanGameState, ResourceMap, ResourceType, DevCardType } from '../types'

/** 建造费用 */
const BUILD_COSTS: Record<string, Record<ResourceType, number>> = {
  road: { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 },
  city: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
  devCard: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 },
}

/** 发展卡中文名称映射 */
const DEV_CARD_NAMES: Record<DevCardType, string> = {
  knight: '🗡 骑士卡',
  victory_point: '⭐ 胜利分',
  road_building: '🛤 道路建设',
  year_of_plenty: '🎁 发明',
  monopoly: '💰 垄断',
}

/** 资源中文名称映射 */
const RESOURCE_NAMES: Record<ResourceType, string> = {
  wood: '🪵 木材',
  brick: '🧱 黏土',
  sheep: '🐑 羊毛',
  wheat: '🌾 小麦',
  ore: '⛏ 矿石',
}

/** 检查资源是否足够 */
function canAfford(resources: ResourceMap, cost: Record<ResourceType, number>): boolean {
  return (Object.keys(cost) as ResourceType[]).every(
    res => resources[res] >= cost[res]
  )
}

export type InteractionMode = 'normal' | 'building_road' | 'building_settlement' | 'building_city' | 'move_robber'

interface ActionBarProps {
  gameState: ClientCatanGameState
  playerId: string | null
  interactionMode: InteractionMode
  onRollDice: () => void
  onEndTurn: () => void
  onOpenTrade: () => void
  onSetInteractionMode: (mode: InteractionMode) => void
  onBuyDevCard?: () => void
  onUseDevCard?: (cardType: string, params?: Record<string, unknown>) => void
}

export default function ActionBar({
  gameState,
  playerId,
  interactionMode,
  onRollDice,
  onEndTurn,
  onOpenTrade,
  onSetInteractionMode,
  onBuyDevCard,
  onUseDevCard,
}: ActionBarProps) {
  const [showBuildMenu, setShowBuildMenu] = useState(false)
  const [showDevCardPanel, setShowDevCardPanel] = useState(false)
  // 发展卡使用流程中的子状态
  const [devCardAction, setDevCardAction] = useState<{
    type: 'road_building' | 'year_of_plenty' | 'monopoly' | null
    selectedResources?: ResourceType[]
    selectedEdges?: string[]
  }>({ type: null })

  const myIndex = gameState.players.findIndex(p => p.id === playerId)
  const isMyTurn = gameState.currentPlayerIndex === myIndex
  const phase = gameState.phase
  const resources = gameState.myResources
  const myDevCards = gameState.myDevCards ?? []

  // 各阶段按钮启用状态
  const canRoll = isMyTurn && phase === 'roll_dice'
  const canBuild = isMyTurn && phase === 'trade_build'
  const canTrade = isMyTurn && phase === 'trade_build'
  const canEnd = isMyTurn && phase === 'trade_build'

  // 发展卡按钮启用状态：trade_build 或 roll_dice（骑士卡）阶段
  const canUseDevCards = isMyTurn && (phase === 'trade_build' || phase === 'roll_dice')
  const canBuyDevCard = isMyTurn && phase === 'trade_build' && canAfford(resources, BUILD_COSTS.devCard)

  // 统计各类型发展卡数量
  const devCardCounts = myDevCards.reduce<Record<string, number>>((acc, card) => {
    acc[card] = (acc[card] || 0) + 1
    return acc
  }, {})

  // 建造子选项
  const buildOptions = [
    {
      key: 'road' as const,
      label: '🛤 道路',
      mode: 'building_road' as InteractionMode,
      affordable: canAfford(resources, BUILD_COSTS.road),
      hasPositions: gameState.validPositions.roads.length > 0,
    },
    {
      key: 'settlement' as const,
      label: '🏠 村庄',
      mode: 'building_settlement' as InteractionMode,
      affordable: canAfford(resources, BUILD_COSTS.settlement),
      hasPositions: gameState.validPositions.settlements.length > 0,
    },
    {
      key: 'city' as const,
      label: '🏰 城市',
      mode: 'building_city' as InteractionMode,
      affordable: canAfford(resources, BUILD_COSTS.city),
      hasPositions: gameState.validPositions.cities.length > 0,
    },
  ]

  // 初始放置阶段提示
  const isSetup = phase === 'setup_settlement' || phase === 'setup_road'
  const setupHint = phase === 'setup_settlement'
    ? '请在地图上选择一个位置放置村庄'
    : phase === 'setup_road'
      ? '请在地图上选择一条边放置道路'
      : null

  /** 处理使用发展卡 */
  const handleUseDevCard = (cardType: DevCardType) => {
    if (!onUseDevCard) return

    if (cardType === 'knight') {
      // 骑士卡：直接使用，进入移动强盗模式
      onUseDevCard('knight')
      setShowDevCardPanel(false)
    } else if (cardType === 'road_building') {
      // 道路建设：需要选择 2 条道路（简化为提示用户）
      // 实际实现中需要连续点击 2 条边，这里简化为直接发送
      setDevCardAction({ type: 'road_building', selectedEdges: [] })
      setShowDevCardPanel(false)
    } else if (cardType === 'year_of_plenty') {
      // 发明：需要选择 2 种资源
      setDevCardAction({ type: 'year_of_plenty', selectedResources: [] })
    } else if (cardType === 'monopoly') {
      // 垄断：需要选择 1 种资源
      setDevCardAction({ type: 'monopoly', selectedResources: [] })
    }
  }

  /** 处理资源选择（发明/垄断） */
  const handleResourceSelect = (resource: ResourceType) => {
    if (!onUseDevCard) return

    if (devCardAction.type === 'year_of_plenty') {
      const selected = [...(devCardAction.selectedResources ?? []), resource]
      if (selected.length >= 2) {
        onUseDevCard('year_of_plenty', { resources: selected.slice(0, 2) })
        setDevCardAction({ type: null })
        setShowDevCardPanel(false)
      } else {
        setDevCardAction({ ...devCardAction, selectedResources: selected })
      }
    } else if (devCardAction.type === 'monopoly') {
      onUseDevCard('monopoly', { resource })
      setDevCardAction({ type: null })
      setShowDevCardPanel(false)
    }
  }

  // 可使用的发展卡类型（排除胜利分卡）
  const usableCardTypes: DevCardType[] = ['knight', 'road_building', 'year_of_plenty', 'monopoly']
  const allResources: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore']

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 lg:px-4 lg:py-3">
      {/* 初始放置阶段提示 */}
      {isSetup && isMyTurn && (
        <div className="text-center text-yellow-300 text-xs mb-2 animate-pulse">
          {setupHint}
        </div>
      )}

      {/* 丢弃/强盗/抢夺阶段提示 */}
      {phase === 'discard' && (
        <div className="text-center text-red-300 text-xs mb-2">
          有玩家需要丢弃资源...
        </div>
      )}
      {phase === 'move_robber' && isMyTurn && (
        <div className="text-center text-yellow-300 text-xs mb-2 animate-pulse">
          请在地图上选择一个地块移动强盗
        </div>
      )}
      {phase === 'steal' && isMyTurn && (
        <div className="text-center text-yellow-300 text-xs mb-2 animate-pulse">
          请选择一个玩家抢夺资源
        </div>
      )}

      {/* 发展卡资源选择面板（发明/垄断） */}
      {devCardAction.type === 'year_of_plenty' && (
        <div className="text-center text-yellow-300 text-xs mb-2">
          选择 2 种资源（已选 {devCardAction.selectedResources?.length ?? 0}/2）
          <div className="flex justify-center gap-1 mt-1">
            {allResources.map(r => (
              <button
                key={r}
                onClick={() => handleResourceSelect(r)}
                className="px-2 py-1 bg-white/10 rounded text-white/80 hover:bg-white/20 text-xs"
              >
                {RESOURCE_NAMES[r]}
              </button>
            ))}
          </div>
        </div>
      )}
      {devCardAction.type === 'monopoly' && (
        <div className="text-center text-yellow-300 text-xs mb-2">
          选择 1 种资源进行垄断
          <div className="flex justify-center gap-1 mt-1">
            {allResources.map(r => (
              <button
                key={r}
                onClick={() => handleResourceSelect(r)}
                className="px-2 py-1 bg-white/10 rounded text-white/80 hover:bg-white/20 text-xs"
              >
                {RESOURCE_NAMES[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮行 */}
      <div className="flex items-center justify-center gap-2 lg:gap-3 flex-wrap">
        {/* 掷骰子 */}
        <Button
          size="sm"
          disabled={!canRoll}
          onClick={onRollDice}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-sm lg:text-base lg:px-4"
        >
          🎲 掷骰子
        </Button>

        {/* 建造（下拉） */}
        <div className="relative">
          <Button
            size="sm"
            disabled={!canBuild}
            onClick={() => {
              if (interactionMode !== 'normal') {
                onSetInteractionMode('normal')
                setShowBuildMenu(false)
              } else {
                setShowBuildMenu(!showBuildMenu)
                setShowDevCardPanel(false)
              }
            }}
            variant={interactionMode !== 'normal' && interactionMode !== 'move_robber' ? 'default' : 'outline'}
            className={`text-sm lg:text-base lg:px-4 ${
              interactionMode !== 'normal' && interactionMode !== 'move_robber'
                ? 'bg-green-600 hover:bg-green-500'
                : 'border-white/20 text-white bg-white/10 hover:bg-white/20'
            } disabled:opacity-30`}
          >
            🔨 {interactionMode !== 'normal' && interactionMode !== 'move_robber' ? '取消建造' : '建造'}
          </Button>

          {/* 建造下拉菜单 */}
          {showBuildMenu && canBuild && (
            <div className="absolute bottom-full left-0 mb-1 bg-gray-900/95 backdrop-blur border border-white/10 rounded-lg p-1 min-w-[140px] z-50">
              {buildOptions.map(opt => (
                <button
                  key={opt.key}
                  disabled={!opt.affordable || !opt.hasPositions}
                  onClick={() => {
                    onSetInteractionMode(opt.mode)
                    setShowBuildMenu(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/80 transition-colors"
                >
                  {opt.label}
                  {!opt.affordable && <span className="text-red-400 text-[10px] ml-1">资源不足</span>}
                  {opt.affordable && !opt.hasPositions && <span className="text-yellow-400 text-[10px] ml-1">无位置</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 交易 */}
        <Button
          size="sm"
          variant="outline"
          disabled={!canTrade}
          onClick={onOpenTrade}
          className="border-white/20 text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm lg:text-base lg:px-4"
        >
          🤝 交易
        </Button>

        {/* 发展卡 */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            disabled={!canUseDevCards}
            onClick={() => {
              setShowDevCardPanel(!showDevCardPanel)
              setShowBuildMenu(false)
            }}
            className={`text-sm lg:text-base lg:px-4 ${
              showDevCardPanel
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-purple-900/60 border-purple-500/40 text-purple-200 hover:bg-purple-800/60'
            } disabled:opacity-30`}
          >
            📜 发展卡{myDevCards.length > 0 ? ` (${myDevCards.length})` : ''}
          </Button>

          {/* 发展卡面板 */}
          {showDevCardPanel && canUseDevCards && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900/95 backdrop-blur border border-white/10 rounded-lg p-2 min-w-[200px] z-50">
              {/* 购买发展卡按钮 */}
              {phase === 'trade_build' && (
                <button
                  disabled={!canBuyDevCard}
                  onClick={() => {
                    onBuyDevCard?.()
                    setShowDevCardPanel(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/80 transition-colors mb-1 border-b border-white/10 pb-2"
                >
                  🛒 购买发展卡
                  <span className="text-[10px] text-white/50 ml-1">(1矿+1麦+1羊)</span>
                  {!canBuyDevCard && <span className="text-red-400 text-[10px] ml-1">资源不足</span>}
                </button>
              )}

              {/* 持有的发展卡列表 */}
              {myDevCards.length === 0 ? (
                <div className="text-white/40 text-xs text-center py-2">暂无发展卡</div>
              ) : (
                <div className="space-y-0.5">
                  {usableCardTypes.map(cardType => {
                    const count = devCardCounts[cardType] ?? 0
                    if (count === 0) return null
                    return (
                      <button
                        key={cardType}
                        onClick={() => handleUseDevCard(cardType)}
                        className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-white/10 text-white/80 transition-colors"
                      >
                        {DEV_CARD_NAMES[cardType]} ×{count}
                      </button>
                    )
                  })}
                  {/* 胜利分卡（仅显示，不可使用） */}
                  {(devCardCounts['victory_point'] ?? 0) > 0 && (
                    <div className="px-3 py-1.5 text-sm text-white/40">
                      {DEV_CARD_NAMES['victory_point']} ×{devCardCounts['victory_point']}
                      <span className="text-[10px] ml-1">（自动计分）</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 结束回合 */}
        <Button
          size="sm"
          variant="outline"
          disabled={!canEnd}
          onClick={onEndTurn}
          className="border-white/20 text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm lg:text-base lg:px-4"
        >
          ⏭ 结束回合
        </Button>
      </div>
    </div>
  )
}
