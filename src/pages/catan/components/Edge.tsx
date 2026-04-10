/**
 * 边组件
 *
 * 渲染边上的道路（粗线段），用玩家颜色区分
 * 支持空边的点击放置（高亮可建造位置）
 */

import type { PlayerColor } from '../types'

/** 玩家颜色映射 */
const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  white: '#e5e7eb',
  orange: '#f97316',
}

interface EdgeProps {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  hasRoad?: boolean
  playerColor?: PlayerColor
  valid?: boolean
  onClick?: (id: string) => void
}

export default function Edge({ id, x1, y1, x2, y2, hasRoad, playerColor, valid, onClick }: EdgeProps) {
  const color = playerColor ? PLAYER_COLORS[playerColor] : '#fff'

  // 空边 + 不可建造 → 不渲染
  if (!hasRoad && !valid) return null

  // 中点坐标（用于点击区域）
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  return (
    <g
      onClick={() => onClick?.(id)}
      className={valid ? 'cursor-pointer' : ''}
      role={valid ? 'button' : undefined}
      aria-label={hasRoad ? `道路 (${playerColor})` : '可建造道路'}
    >
      {hasRoad ? (
        /* 已建造的道路：粗线段 */
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
        />
      ) : valid ? (
        /* 可建造位置：半透明虚线 */
        <>
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
          {/* 扩大点击区域 */}
          <circle cx={mx} cy={my} r={8} fill="transparent" />
        </>
      ) : null}
    </g>
  )
}
