/**
 * 单个玩家牌区组件
 *
 * 显示玩家昵称、Draw_Pile 剩余牌数、Discard_Pile 堆顶牌面
 * 已淘汰玩家牌区置灰并显示"已淘汰"标识
 * 高亮当前翻牌玩家的牌区边框
 */

import React from 'react'
import type { ClientHalliPlayer } from '../context/HalliGameContext'
import { FruitCardComponent } from './FruitCard'
import { CardFlipAnimation } from './CardFlipAnimation'

interface PlayerAreaProps {
  /** 玩家信息 */
  player: ClientHalliPlayer
  /** 是否为当前翻牌玩家 */
  isCurrentTurn: boolean
  /** 是否为自己 */
  isSelf: boolean
}

/** 单个玩家牌区组件 */
export const PlayerArea = React.memo(function PlayerArea({
  player,
  isCurrentTurn,
  isSelf,
}: PlayerAreaProps) {
  const isEliminated = player.isEliminated

  // 边框样式
  const borderClass = isCurrentTurn
    ? 'border-amber-400 ring-2 ring-amber-300 shadow-lg'
    : isSelf
      ? 'border-blue-300'
      : 'border-gray-200'

  return (
    <div
      className={`relative rounded-xl border-2 p-3 transition-all duration-300 ${borderClass} ${
        isEliminated ? 'opacity-50 grayscale bg-gray-100' : 'bg-white'
      }`}
    >
      {/* 已淘汰标识 */}
      {isEliminated && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full rotate-[-12deg]">
            已淘汰
          </span>
        </div>
      )}

      {/* 玩家昵称 */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-sm font-medium truncate max-w-[80px] ${
            isSelf ? 'text-blue-600' : 'text-gray-700'
          }`}
        >
          {player.name}
          {isSelf && ' (我)'}
        </span>
        {player.isAI && (
          <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
            AI
          </span>
        )}
        {!player.isConnected && !player.isAI && (
          <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
            离线
          </span>
        )}
      </div>

      {/* 牌区 */}
      <div className="flex items-center gap-2">
        {/* Draw_Pile 剩余牌数 */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-20 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-lg">
              {player.drawPileCount}
            </span>
          </div>
          <span className="text-xs text-gray-400 mt-1">摸牌堆</span>
        </div>

        {/* Discard_Pile 堆顶牌面 */}
        <div className="flex flex-col items-center">
          {player.topCard ? (
            <CardFlipAnimation card={player.topCard} isFlipping={false} />
          ) : (
            <FruitCardComponent card={null} size="md" />
          )}
          <span className="text-xs text-gray-400 mt-1">
            翻牌堆{player.discardPileCount > 0 ? ` (${player.discardPileCount})` : ''}
          </span>
        </div>
      </div>

      {/* 当前回合指示 */}
      {isCurrentTurn && !isEliminated && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <span className="bg-amber-400 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
            翻牌中
          </span>
        </div>
      )}
    </div>
  )
})
