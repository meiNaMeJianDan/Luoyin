/**
 * 顶点组件
 *
 * 渲染顶点上的村庄（小三角/房子）或城市（大方块），用玩家颜色区分
 * 支持空顶点的点击放置（高亮可建造位置）
 */

import type { PlayerColor, BuildingType } from '../types'

/** 玩家颜色映射到实际颜色值 */
const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  white: '#e5e7eb',
  orange: '#f97316',
}

interface VertexProps {
  id: string
  x: number
  y: number
  building?: BuildingType
  playerColor?: PlayerColor
  valid?: boolean
  onClick?: (id: string) => void
}

export default function Vertex({ id, x, y, building, playerColor, valid, onClick }: VertexProps) {
  const color = playerColor ? PLAYER_COLORS[playerColor] : '#fff'

  // 空顶点 + 不可建造 → 不渲染
  if (!building && !valid) return null

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick?.(id)}
      className={valid ? 'cursor-pointer' : ''}
      role={valid ? 'button' : undefined}
      aria-label={building ? `${building} (${playerColor})` : '可建造位置'}
    >
      {building === 'city' ? (
        /* 城市：大方块 */
        <rect
          x={-11}
          y={-11}
          width={22}
          height={22}
          rx={3}
          fill={color}
          stroke="#000"
          strokeWidth={2}
        />
      ) : building === 'settlement' ? (
        /* 村庄：小房子形状 */
        <path
          d="M0,-11 L10,0 L10,9 L-10,9 L-10,0 Z"
          fill={color}
          stroke="#000"
          strokeWidth={2}
        />
      ) : valid ? (
        /* 可建造位置：半透明圆点 */
        <circle
          r={9}
          fill="rgba(255,255,255,0.6)"
          stroke="#fff"
          strokeWidth={2}
          className="animate-pulse"
        />
      ) : null}
    </g>
  )
}
