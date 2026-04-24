/**
 * 你画我猜游戏主页面
 *
 * 左中右三栏布局：左侧 PlayerList、中间 CanvasBoard + DrawToolbar + WordHint + GameHeader、右侧 ChatPanel。
 * 集成 WordSelector（选词阶段弹窗）和 TurnSummary（结算叠加层）。
 * 监听 draw:draw_action、draw:undo、draw:clear_canvas、draw:draw_history 事件控制画板。
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useGame } from './hooks/useGame'
import type { DrawAction, DrawToolType, TurnScore } from './context/DrawGameContext'
import CanvasBoard from './components/CanvasBoard'
import type { CanvasBoardRef } from './components/CanvasBoard'
import DrawToolbar from './components/DrawToolbar'
import ChatPanel from './components/ChatPanel'
import PlayerList from './components/PlayerList'
import WordSelector from './components/WordSelector'
import WordHint from './components/WordHint'
import GameHeader from './components/GameHeader'
import TurnSummary from './components/TurnSummary'

export default function DrawGame() {
  const {
    gameState,
    playerId,
    chatMessages,
    canvasCallbacksRef,
    sendDrawAction,
    undo,
    clearCanvas,
    sendChat,
    selectWord,
  } = useGame()

  const canvasRef = useRef<CanvasBoardRef>(null)

  /* 绘画工具状态 */
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(5)
  const [tool, setTool] = useState<DrawToolType>('pen')

  /* Turn 结算叠加层状态 */
  const [turnSummary, setTurnSummary] = useState<{ word: string; scores: TurnScore[] } | null>(null)

  const currentDrawer = gameState?.players[gameState.currentDrawerIndex]
  const isDrawer = currentDrawer?.id === playerId

  // 注册画板回调，让 useGame 中的事件监听器能控制画板
  useEffect(() => {
    canvasCallbacksRef.current = {
      replayAction: (action) => canvasRef.current?.replayAction(action),
      replayHistory: (actions) => canvasRef.current?.replayHistory(actions),
      undoLast: () => canvasRef.current?.undoLast(),
      clearAll: () => canvasRef.current?.clearAll(),
      onTurnEnded: (data) => setTurnSummary(data),
      onTurnStarted: () => setTurnSummary(null),
    }
    return () => {
      canvasCallbacksRef.current = {}
    }
  }, [canvasCallbacksRef])

  // ============================================================
  // 画板回调
  // ============================================================
  const handleDrawAction = useCallback(
    (action: DrawAction) => sendDrawAction(action),
    [sendDrawAction],
  )

  const handleUndo = useCallback(() => {
    canvasRef.current?.undoLast()
    undo()
  }, [undo])

  const handleClear = useCallback(() => {
    canvasRef.current?.clearAll()
    clearCanvas()
  }, [clearCanvas])

  // ============================================================
  // 聊天禁用逻辑
  // ============================================================
  const currentPlayer = gameState?.players.find((p) => p.id === playerId)
  const chatDisabled = (() => {
    if (!gameState || gameState.phase !== 'drawing') return false
    if (isDrawer) return true
    if (currentPlayer?.hasGuessedCorrect) return true
    return false
  })()

  const chatDisabledReason = (() => {
    if (isDrawer) return '画画玩家不能发言'
    if (currentPlayer?.hasGuessedCorrect) return '你已猜对'
    return undefined
  })()

  // ============================================================
  // 加载中
  // ============================================================
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-lg">加载中...</div>
      </div>
    )
  }

  /* 选词阶段：Drawer 看到选词弹窗 */
  const showWordSelector =
    isDrawer &&
    gameState.phase === 'word_select' &&
    gameState.candidateWords &&
    gameState.candidateWords.length > 0

  return (
    <div className="min-h-screen bg-gray-100 p-3 flex flex-col">
      {/* 三栏布局 */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* 左侧：玩家列表 */}
        <div className="w-52 shrink-0 hidden lg:block">
          <PlayerList
            players={gameState.players}
            currentDrawerIndex={gameState.currentDrawerIndex}
            currentPlayerId={playerId ?? ''}
          />
        </div>

        {/* 中间：画板区域 */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* 游戏头部 */}
          <GameHeader
            round={gameState.currentRound}
            turn={gameState.currentTurnIndex}
            turnStartTime={gameState.turnStartTime}
            turnDuration={gameState.turnDuration}
            drawerName={currentDrawer?.name ?? ''}
            phase={gameState.phase}
          />

          {/* 词语提示 */}
          <WordHint
            hint={gameState.hint}
            currentWord={isDrawer ? gameState.currentWord : null}
          />

          {/* 画板（含结算叠加层） */}
          <div className="flex-1 relative min-h-0">
            <CanvasBoard
              ref={canvasRef}
              isDrawer={isDrawer && gameState.phase === 'drawing'}
              color={color}
              lineWidth={lineWidth}
              tool={tool}
              onDrawAction={handleDrawAction}
              onUndo={handleUndo}
              onClear={handleClear}
            />
            {/* Turn 结算叠加层 */}
            {turnSummary && (
              <TurnSummary
                word={turnSummary.word}
                scores={turnSummary.scores}
                visible
              />
            )}
          </div>

          {/* 工具栏（仅 Drawer 在 drawing 阶段可见） */}
          {isDrawer && gameState.phase === 'drawing' && (
            <DrawToolbar
              color={color}
              lineWidth={lineWidth}
              tool={tool}
              onColorChange={setColor}
              onLineWidthChange={setLineWidth}
              onToolChange={setTool}
              onUndo={handleUndo}
              onClear={handleClear}
            />
          )}
        </div>

        {/* 右侧：聊天面板 */}
        <div className="w-64 shrink-0 hidden md:block">
          <ChatPanel
            messages={chatMessages}
            onSend={sendChat}
            disabled={chatDisabled}
            disabledReason={chatDisabledReason}
          />
        </div>
      </div>

      {/* 选词弹窗 */}
      {showWordSelector && (
        <WordSelector words={gameState.candidateWords!} onSelect={selectWord} />
      )}
    </div>
  )
}
