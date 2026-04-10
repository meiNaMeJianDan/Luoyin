/**
 * 左侧玩家资源面板
 *
 * 显示当前玩家头像/昵称/胜利分、5 类资源卡（图标+数量）
 * 资源变动动画（数字跳动）、建造费用提示
 */

import { useState, useEffect, useRef } from 'react'
import type { ResourceMap, ResourceType, ClientCatanPlayer } from '../types'

/** 资源图标和中文名 */
const RESOURCE_INFO: { type: ResourceType; icon: string; name: string; color: string }[] = [
  { type: 'wood', icon: '🌲', name: '木材', color: '#2d6a2e' },
  { type: 'brick', icon: '🧱', name: '黏土', color: '#b5651d' },
  { type: 'sheep', icon: '🐑', name: '羊毛', color: '#7ec850' },
  { type: 'wheat', icon: '🌾', name: '小麦', color: '#daa520' },
  { type: 'ore', icon: '⛰️', name: '矿石', color: '#808080' },
]

/** 建造费用 */
const BUILD_COSTS: { name: string; costs: Partial<Record<ResourceType, number>> }[] = [
  { name: '道路', costs: { wood: 1, brick: 1 } },
  { name: '村庄', costs: { wood: 1, brick: 1, sheep: 1, wheat: 1 } },
  { name: '城市', costs: { wheat: 2, ore: 3 } },
]

/** 玩家颜色映射 */
const COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  white: 'bg-gray-200',
  orange: 'bg-orange-500',
}

interface PlayerPanelProps {
  player: ClientCatanPlayer | undefined
  resources: ResourceMap
  collapsed?: boolean
  onToggle?: () => void
}

/** 资源数字动画 hook */
function useAnimatedValue(value: number) {
  const [display, setDisplay] = useState(value)
  const [animating, setAnimating] = useState(false)
  const prevRef = useRef(value)

  useEffect(() => {
    if (prevRef.current !== value) {
      setAnimating(true)
      setDisplay(value)
      prevRef.current = value
      const timer = setTimeout(() => setAnimating(false), 500)
      return () => clearTimeout(timer)
    }
  }, [value])

  return { display, animating }
}

function ResourceItem({ type, icon, name, count }: {
  type: ResourceType; icon: string; name: string; count: number
}) {
  const { display, animating } = useAnimatedValue(count)

  return (
    <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xl lg:text-lg">{icon}</span>
        <span className="text-white/70 text-sm lg:text-xs">{name}</span>
      </div>
      <span
        className={`font-bold text-base lg:text-sm tabular-nums transition-all duration-300 ${
          animating ? 'text-yellow-300 scale-125' : 'text-white'
        }`}
      >
        {display}
      </span>
    </div>
  )
}

export default function PlayerPanel({ player, resources, collapsed, onToggle }: PlayerPanelProps) {
  if (!player) return null

  // 折叠模式（平板端）
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur text-white px-3 py-6 rounded-r-xl shadow-lg active:bg-black/90"
      >
        <span className="text-sm font-medium">📦</span>
      </button>
    )
  }

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-sm rounded-xl p-3 space-y-3 overflow-y-auto">
      {/* 玩家信息 */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full ${COLOR_MAP[player.color] || 'bg-gray-500'} flex items-center justify-center text-xs font-bold text-white`}>
          {player.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{player.name}</p>
          <p className="text-yellow-300 text-xs">⭐ {player.victoryPoints} 分</p>
        </div>
        {/* 平板端折叠按钮 */}
        {onToggle && (
          <button onClick={onToggle} className="lg:hidden text-white/40 hover:text-white/80 text-xs">
            ✕
          </button>
        )}
      </div>

      {/* 称号标识 */}
      <div className="flex flex-wrap gap-1">
        {player.hasLongestRoad && (
          <span className="bg-amber-600/30 text-amber-300 text-[10px] px-1.5 py-0.5 rounded">🛤 最长道路</span>
        )}
        {player.hasLargestArmy && (
          <span className="bg-purple-600/30 text-purple-300 text-[10px] px-1.5 py-0.5 rounded">⚔ 最大骑士团</span>
        )}
      </div>

      {/* 资源卡 */}
      <div className="space-y-0.5">
        <p className="text-white/50 text-xs font-medium mb-1">资源</p>
        {RESOURCE_INFO.map(info => (
          <ResourceItem
            key={info.type}
            type={info.type}
            icon={info.icon}
            name={info.name}
            count={resources[info.type]}
          />
        ))}
        <div className="border-t border-white/10 mt-1 pt-1">
          <div className="flex items-center justify-between px-2">
            <span className="text-white/50 text-xs">总计</span>
            <span className="text-white font-bold text-sm">
              {Object.values(resources).reduce((a, b) => a + b, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 建造费用提示 */}
      <div className="space-y-1">
        <p className="text-white/50 text-xs font-medium">建造费用</p>
        {BUILD_COSTS.map(item => {
          const canAfford = Object.entries(item.costs).every(
            ([res, cost]) => resources[res as ResourceType] >= (cost || 0)
          )
          return (
            <div
              key={item.name}
              className={`text-xs px-2 py-1 rounded ${canAfford ? 'text-green-300 bg-green-900/20' : 'text-white/30'}`}
            >
              <span className="font-medium">{item.name}：</span>
              {Object.entries(item.costs).map(([res, cost]) => {
                const info = RESOURCE_INFO.find(r => r.type === res)
                return (
                  <span key={res} className="ml-1">
                    {info?.icon}{cost}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
