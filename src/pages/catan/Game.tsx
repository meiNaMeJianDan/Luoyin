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
import type { HexTile } from './types'

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

  // 骰子结果变化时显示动画
  useEffect(() => {
    if (gameState?.diceResult) {
      setDiceVisible(true)
      const timer = setTimeout(() => setDiceVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [gameState?.diceResult?.[0], gameState?.diceResult?.[1]])

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
    </div>
  )
}
