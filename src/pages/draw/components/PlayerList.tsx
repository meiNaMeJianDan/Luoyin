/**
 * 玩家列表
 *
 * 显示每位玩家的昵称、当前总分、在线状态。
 * 用画笔图标标注当前 Drawer，高亮 Drawer 卡片。
 * 已猜对的 Guesser 显示对勾标识。
 */

import React from 'react'
import type { ClientDrawPlayer } from '../context/DrawGameContext'
import { Paintbrush, Check, WifiOff } from 'lucide-react'

interface PlayerListProps {
  /** 玩家列表 */
  players: ClientDrawPlayer[]
  /** 当前 Drawer 的索引 */
  currentDrawerIndex: number
  /** 当前玩家 ID（用于高亮自己） */
  currentPlayerId: string
}

const PlayerList = React.memo(function PlayerList({
  players,
  currentDrawerIndex,
  currentPlayerId,
}: PlayerListProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow overflow-hidden h-full flex flex-col">
      <div className="px-4 py-2.5 border-b border-gray-100 text-sm font-semibold text-gray-700">
        玩家列表
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {players.map((player, index) => {
          const isDrawer = index === currentDrawerIndex
          const isSelf = player.id === currentPlayerId
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                isDrawer
                  ? 'bg-amber-50 border border-amber-300'
                  : isSelf
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Drawer 画笔图标 */}
                {isDrawer && <Paintbrush className="size-4 text-amber-500 shrink-0" />}
                {/* 猜对对勾 */}
                {!isDrawer && player.hasGuessedCorrect && (
                  <Check className="size-4 text-green-500 shrink-0" />
                )}
                <span
                  className={`text-sm font-medium truncate ${
                    !player.isConnected ? 'text-gray-400' : isDrawer ? 'text-amber-700' : 'text-gray-800'
                  }`}
                >
                  {player.name}
                  {isSelf && <span className="text-xs text-indigo-400 ml-1">（我）</span>}
                </span>
                {/* 离线标识 */}
                {!player.isConnected && <WifiOff className="size-3 text-red-400 shrink-0" />}
              </div>
              <span className="text-sm font-bold text-indigo-600 shrink-0">{player.score}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default PlayerList
