/**
 * 卡坦岛游戏主页面
 *
 * "中央核心+四周辅助"布局：
 *   中央：HexMap（50-60%）
 *   左侧：PlayerPanel（15-20%）
 *   右侧：GameInfoPanel（15-20%）
 *   底部：ActionBar（10-15%）
 *   右下角悬浮：ChatBox
 *   骰子结果：DiceDisplay（覆盖在地图上方）
 *
 * 管理交互模式状态（building_road/building_settlement/building_city/normal）
 */

import { useState, useEffect, useCallback } from 'react'
import { useGame } from './hooks/useGame'
import HexMap from './components/HexMap'
import PlayerPanel from './components/PlayerPanel'
import GameInfoPanel from './components/GameInfoPanel'
import ActionBar, { type InteractionMode } from './components/ActionBar'
import DiceDisplay from './components/DiceDisplay'
import TradeDialog from './components/TradeDialog'
import ChatBox from './components/ChatBox'
import { WifiOff } from 'lucide-react'
import type { HexTile, ResourceType, ResourceMap } from './types'

/** 资源信息 */
const RESOURCES: { type: ResourceType; icon: string; name: string }[] = [
  { type: 'wood', icon: '🌲', name: '木材' },
  { type: 'brick', icon: '🧱', name: '黏土' },
  { type: 'sheep', icon: '🐑', name: '羊毛' },
  { type: 'wheat', icon: '🌾', name: '小麦' },
  { type: 'ore', icon: '⛰️', name: '矿石' },
]

export default function CatanGame() {
  const {
    gameState,
    playerId,
    connected,
    chatMessages,
    // 游戏操作
    rollDice,
    placeSettlement,
    placeRoad,
    buildRoad,
    buildSettlement,
    buildCity,
    moveRobber,
    stealResource,
    discardResources,
    bankTrade,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    endTurn,
    buyDevCard,
    useDevCard,
    sendChat,
  } = useGame()

  // 交互模式
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('normal')
  // 交易对话框
  const [tradeOpen, setTradeOpen] = useState(false)
  // 骰子显示
  const [diceVisible, setDiceVisible] = useState(false)
  // 丢弃资源选择
  const [discardSelection, setDiscardSelection] = useState<ResourceMap>({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 })

  // 骰子结果变化时显示动画
  useEffect(() => {
    if (gameState?.diceResult) {
      setDiceVisible(true)
      const timer = setTimeout(() => setDiceVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [gameState?.diceResult?.[0], gameState?.diceResult?.[1]])

  // 收到交易请求时自动弹出交易对话框（非发起者）
  useEffect(() => {
    if (gameState?.currentTrade && gameState.currentTrade.proposerId !== playerId) {
      setTradeOpen(true)
    }
  }, [gameState?.currentTrade?.id])

  // 阶段变化时自动切换交互模式
  useEffect(() => {
    if (!gameState) return
    const phase = gameState.phase
    const myIndex = gameState.players.findIndex(p => p.id === playerId)
    const isMyTurn = gameState.currentPlayerIndex === myIndex

    if (!isMyTurn) {
      setInteractionMode('normal')
      return
    }

    if (phase === 'move_robber') {
      setInteractionMode('move_robber')
    } else if (phase === 'setup_settlement' || phase === 'setup_road') {
      // setup 阶段由 HexMap 自动高亮
      setInteractionMode('normal')
    } else if (phase !== 'trade_build') {
      setInteractionMode('normal')
    }
  }, [gameState?.phase, gameState?.currentPlayerIndex, playerId])

  // 顶点点击处理
  const handleVertexClick = useCallback((vertexId: string) => {
    if (!gameState) return
    const phase = gameState.phase

    if (phase === 'setup_settlement') {
      placeSettlement(vertexId)
    } else if (interactionMode === 'building_settlement') {
      buildSettlement(vertexId)
      setInteractionMode('normal')
    } else if (interactionMode === 'building_city') {
      buildCity(vertexId)
      setInteractionMode('normal')
    }
  }, [gameState?.phase, interactionMode, placeSettlement, buildSettlement, buildCity])

  // 边点击处理
  const handleEdgeClick = useCallback((edgeId: string) => {
    if (!gameState) return
    const phase = gameState.phase

    if (phase === 'setup_road') {
      placeRoad(edgeId)
    } else if (interactionMode === 'building_road') {
      buildRoad(edgeId)
      setInteractionMode('normal')
    }
  }, [gameState?.phase, interactionMode, placeRoad, buildRoad])

  // 六边形点击处理（移动强盗）
  const handleHexClick = useCallback((tile: HexTile) => {
    if (!gameState) return
    if (gameState.phase === 'move_robber' || interactionMode === 'move_robber') {
      const hexId = `${tile.coord.q},${tile.coord.r}`
      moveRobber(hexId)
      setInteractionMode('normal')
    }
  }, [gameState?.phase, interactionMode, moveRobber])

  // 加载中
  if (!gameState) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/60">加载游戏中...</p>
      </div>
    )
  }

  const currentPlayer = gameState.players.find(p => p.id === playerId)

  return (
    <div className="h-screen bg-gradient-to-br from-blue-900 via-emerald-900 to-amber-900 flex flex-col overflow-hidden relative">
      {/* 断线提示 */}
      {!connected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm py-1 flex items-center justify-center gap-1">
          <WifiOff className="size-3" /> 连接中断，正在重连...
        </div>
      )}

      {/* 骰子显示（覆盖在地图上方） */}
      <DiceDisplay diceResult={gameState.diceResult} visible={diceVisible} />

      {/* 主体布局 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧面板：玩家资源（始终显示） */}
        <div className="w-[200px] lg:w-[240px] flex-shrink-0 p-2">
          <PlayerPanel
            player={currentPlayer}
            resources={gameState.myResources}
          />
        </div>

        {/* 中央地图区 */}
        <div className="flex-1 relative min-w-0 p-2">
          <HexMap
            gameState={gameState}
            playerId={playerId}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            onHexClick={handleHexClick}
            interactionMode={interactionMode}
          />
        </div>

        {/* 右侧面板：游戏信息（始终显示） */}
        <div className="w-[200px] lg:w-[240px] flex-shrink-0 p-2">
          <GameInfoPanel
            gameState={gameState}
            playerId={playerId}
          />
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex-shrink-0 px-2 pb-2 lg:px-4 lg:pb-3">
        <ActionBar
          gameState={gameState}
          playerId={playerId}
          interactionMode={interactionMode}
          onRollDice={rollDice}
          onEndTurn={endTurn}
          onOpenTrade={() => setTradeOpen(true)}
          onSetInteractionMode={setInteractionMode}
          onBuyDevCard={buyDevCard}
          onUseDevCard={useDevCard}
        />
      </div>

      {/* 聊天窗口 */}
      <ChatBox
        messages={chatMessages}
        players={gameState.players}
        playerId={playerId}
        onSend={sendChat}
      />

      {/* 交易对话框 */}
      <TradeDialog
        open={tradeOpen}
        onClose={() => setTradeOpen(false)}
        myResources={gameState.myResources}
        tradeRatios={gameState.tradeRatios}
        currentTrade={gameState.currentTrade}
        players={gameState.players}
        playerId={playerId}
        onBankTrade={bankTrade}
        onProposeTrade={proposeTrade}
        onAcceptTrade={acceptTrade}
        onRejectTrade={rejectTrade}
      />

      {/* 抢夺目标选择弹窗（steal 阶段） */}
      {gameState.phase === 'steal' && gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === playerId) && (() => {
        // 找到强盗所在地块周围有建筑的其他玩家
        const robberTile = gameState.map.tiles.find(t => t.hasRobber)
        const stealCandidateIds = new Set<string>()
        if (robberTile) {
          // 获取强盗地块的 6 个顶点
          const hexVerts = getHexVertexIdsForSteal(robberTile.coord.q, robberTile.coord.r)
          for (const vid of hexVerts) {
            const building = gameState.map.vertices[vid]
            if (building && building.playerId !== playerId) {
              stealCandidateIds.add(building.playerId)
            }
          }
        }
        const candidates = gameState.players.filter(p => stealCandidateIds.has(p.id) && p.resourceCount > 0)

        if (candidates.length === 0) return null

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-sm w-full mx-4 space-y-3">
              <h3 className="text-white font-bold text-center text-lg">选择抢夺目标</h3>
              <p className="text-white/50 text-sm text-center">选择强盗周围的一个玩家抢夺 1 张资源</p>
              <div className="space-y-2">
                {candidates.map(p => (
                  <button
                    key={p.id}
                    onClick={() => stealResource(p.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        p.color === 'red' ? 'bg-red-500' :
                        p.color === 'blue' ? 'bg-blue-500' :
                        p.color === 'white' ? 'bg-gray-300' :
                        'bg-orange-500'
                      }`} />
                      <span className="text-white font-medium">{p.name}</span>
                    </div>
                    <span className="text-white/60 text-sm">🃏 {p.resourceCount}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* 丢弃资源弹窗（discard 阶段，手牌超过 7 张的玩家需要丢弃一半） */}
      {gameState.phase === 'discard' && gameState.discardState &&
        gameState.discardState.pendingPlayers.includes(playerId ?? '') &&
        !gameState.discardState.completedPlayers.includes(playerId ?? '') && (() => {
          const myTotal = Object.values(gameState.myResources).reduce((a, b) => a + b, 0)
          const requiredDiscard = Math.floor(myTotal / 2)
          const selectedTotal = Object.values(discardSelection).reduce((a, b) => a + b, 0)
          const canConfirm = selectedTotal === requiredDiscard

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4">
                <h3 className="text-white font-bold text-center text-lg">丢弃资源</h3>
                <p className="text-white/50 text-sm text-center">
                  你有 {myTotal} 张资源，需要丢弃 {requiredDiscard} 张（已选 {selectedTotal}/{requiredDiscard}）
                </p>
                <div className="space-y-2">
                  {RESOURCES.map(({ type, icon, name }) => {
                    const have = gameState.myResources[type]
                    const selected = discardSelection[type]
                    if (have === 0) return null
                    return (
                      <div key={type} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <span className="text-white text-sm">{name}</span>
                          <span className="text-white/40 text-xs">（拥有 {have}）</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDiscardSelection(prev => ({
                              ...prev,
                              [type]: Math.max(0, prev[type] - 1),
                            }))}
                            disabled={selected <= 0}
                            className="w-7 h-7 rounded bg-white/10 text-white disabled:opacity-30 text-sm"
                          >-</button>
                          <span className="text-white font-bold w-5 text-center">{selected}</span>
                          <button
                            onClick={() => setDiscardSelection(prev => ({
                              ...prev,
                              [type]: Math.min(have, prev[type] + 1),
                            }))}
                            disabled={selected >= have || selectedTotal >= requiredDiscard}
                            className="w-7 h-7 rounded bg-white/10 text-white disabled:opacity-30 text-sm"
                          >+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={() => {
                    discardResources(discardSelection)
                    setDiscardSelection({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 })
                  }}
                  disabled={!canConfirm}
                  className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-medium transition-colors"
                >
                  确认丢弃 ({selectedTotal}/{requiredDiscard})
                </button>
              </div>
            </div>
          )
        })()}
    </div>
  )
}

/** 获取六边形 (q, r) 的 6 个顶点 ID（复制自 HexMap） */
function getHexVertexIdsForSteal(q: number, r: number): string[] {
  return [
    `${q},${r},0`,
    `${q},${r},1`,
    `${q},${r + 1},0`,
    `${q - 1},${r + 1},1`,
    `${q - 1},${r + 1},0`,
    `${q - 1},${r},1`,
  ]
}
