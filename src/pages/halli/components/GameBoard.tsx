/**
 * 游戏主面板组件
 *
 * 采用环形布局，将所有玩家牌区围绕中央铃铛排列
 * 使用 CSS absolute positioning 实现环形布局
 * 组合 PlayerArea、BellButton 组件
 */

import React, { useMemo } from 'react'
import type { ClientHalliGameState } from '../context/HalliGameContext'
import { PlayerArea } from './PlayerArea'
import { BellButton } from './BellButton'

interface GameBoardProps {
  /** 游戏状态 */
  gameState: ClientHalliGameState
  /** 当前玩家 ID */
  playerId: string
  /** 翻牌回调 */
  onFlip: () => void
  /** 按铃回调 */
  onRing: () => void
}

/** 计算环形布局中每个玩家的位置 */
function getPlayerPositions(playerCount: number, selfIndex: number) {
  const positions: Array<{ top: string; left: string; transform: string }> = []

  for (let i = 0; i < playerCount; i++) {
    // 将自己放在底部中央，其他玩家按顺时针排列
    const relativeIndex = (i - selfIndex + playerCount) % playerCount
    // 从底部开始，顺时针排列（-90度为底部起始）
    const angle = (relativeIndex / playerCount) * 360 - 90
    const radian = (angle * Math.PI) / 180

    // 椭圆半径（水平方向更宽）
    const rx = 38 // 水平半径百分比
    const ry = 36 // 垂直半径百分比

    const x = 50 + rx * Math.cos(radian)
    const y = 50 + ry * Math.sin(radian)

    positions.push({
      top: `${y}%`,
      left: `${x}%`,
      transform: 'translate(-50%, -50%)',
    })
  }

  return positions
}

/** 游戏主面板组件 */
export const GameBoard = React.memo(function GameBoard({
  gameState,
  playerId,
  onFlip,
  onRing,
}: GameBoardProps) {
  const { players, currentPlayerIndex, phase } = gameState

  // 找到自己的索引
  const selfIndex = useMemo(
    () => players.findIndex((p) => p.id === playerId),
    [players, playerId],
  )

  // 计算环形布局位置
  const positions = useMemo(
    () => getPlayerPositions(players.length, selfIndex),
    [players.length, selfIndex],
  )

  // 按铃按钮状态
  const isBellDisabled = phase !== 'bell_window'
  const currentPlayer = players[currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === playerId

  return (
    <div className="relative w-full max-w-[700px] aspect-square mx-auto">
      {/* 中央铃铛 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <BellButton onRing={onRing} disabled={isBellDisabled} />
      </div>

      {/* 环形排列的玩家牌区 */}
      {players.map((player, index) => (
        <div
          key={player.id}
          className="absolute z-0"
          style={positions[index]}
        >
          <PlayerArea
            player={player}
            isCurrentTurn={index === currentPlayerIndex}
            isSelf={player.id === playerId}
          />
        </div>
      ))}

      {/* 翻牌按钮（仅自己回合且处于 flip 阶段时显示） */}
      {isMyTurn && phase === 'flip' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={onFlip}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-medium rounded-full shadow-lg transition-all"
          >
            翻牌
          </button>
        </div>
      )}
    </div>
  )
})
