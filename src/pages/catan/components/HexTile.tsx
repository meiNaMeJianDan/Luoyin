/**
 * 单个六边形地块组件
 *
 * 使用 SVG 绘制尖顶六边形（pointy-top），显示地形颜色、资源点数、强盗标识
 * 支持鼠标悬浮高亮和点击回调
 */

import { useMemo } from 'react'
import type { HexTile as HexTileType } from '../types'

/** 地形颜色映射 */
const TERRAIN_COLORS: Record<string, string> = {
  forest: '#2d6a2e',     // 森林=绿色
  hills: '#b5651d',      // 山丘=棕色
  pasture: '#7ec850',    // 牧场=浅绿
  fields: '#daa520',     // 田地=金黄
  mountains: '#808080',  // 山地=灰色
  desert: '#d2b48c',     // 沙漠=沙色
}

/** 地形中文名 */
const TERRAIN_NAMES: Record<string, string> = {
  forest: '森林',
  hills: '山丘',
  pasture: '牧场',
  fields: '田地',
  mountains: '山地',
  desert: '沙漠',
}

/** 地形资源图标 */
const TERRAIN_ICONS: Record<string, string> = {
  forest: '🌲',
  hills: '🧱',
  pasture: '🐑',
  fields: '🌾',
  mountains: '⛰️',
  desert: '🏜️',
}

interface HexTileProps {
  tile: HexTileType
  x: number
  y: number
  size: number
  onClick?: (tile: HexTileType) => void
  onHover?: (tile: HexTileType | null) => void
  highlighted?: boolean
}

/** 生成平顶六边形（flat-top）的 6 个顶点 */
function hexPoints(size: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    // flat-top: 角度从 0° 开始
    const angle = (Math.PI / 180) * (60 * i)
    const px = size * Math.cos(angle)
    const py = size * Math.sin(angle)
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`)
  }
  return points.join(' ')
}

export default function HexTile({ tile, x, y, size, onClick, onHover, highlighted }: HexTileProps) {
  const points = useMemo(() => hexPoints(size), [size])
  const fillColor = TERRAIN_COLORS[tile.terrain] || '#ccc'
  const { numberToken, hasRobber } = tile

  // 6 和 8 用红色高亮
  const isHighNumber = numberToken === 6 || numberToken === 8

  // 点数对应的概率点（用于显示概率指示）
  const dots = numberToken ? Math.min(5, 6 - Math.abs(numberToken - 7)) : 0

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick?.(tile)}
      onMouseEnter={() => onHover?.(tile)}
      onMouseLeave={() => onHover?.(null)}
      className="cursor-pointer"
      role="button"
      aria-label={`${TERRAIN_NAMES[tile.terrain]}${numberToken ? ` ${numberToken}` : ''}`}
    >
      {/* 六边形底色 */}
      <polygon
        points={points}
        fill={fillColor}
        stroke={highlighted ? '#fff' : 'rgba(0,0,0,0.3)'}
        strokeWidth={highlighted ? 2.5 : 1.5}
        className="transition-all duration-150"
        opacity={highlighted ? 1 : 0.9}
      />

      {/* 悬浮高亮叠加层 */}
      <polygon
        points={points}
        fill="white"
        opacity={0}
        className="hover:opacity-15 transition-opacity duration-150"
      />

      {/* 地形资源图标（在点数上方） */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        y={numberToken !== null ? -size * 0.35 : 0}
        fontSize={size * 0.35}
      >
        {TERRAIN_ICONS[tile.terrain] || ''}
      </text>

      {/* 资源点数标记 */}
      {numberToken !== null && (
        <>
          <circle r={size * 0.28} fill="#f5f0dc" stroke="#8b7355" strokeWidth={1} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            dy={-1}
            fontSize={size * 0.28}
            fontWeight="bold"
            fill={isHighNumber ? '#dc2626' : '#333'}
          >
            {numberToken}
          </text>
          {/* 概率点 */}
          <g transform={`translate(0, ${size * 0.16})`}>
            {Array.from({ length: dots }).map((_, i) => (
              <circle
                key={i}
                cx={(i - (dots - 1) / 2) * 4}
                cy={0}
                r={1.5}
                fill={isHighNumber ? '#dc2626' : '#666'}
              />
            ))}
          </g>
        </>
      )}

      {/* 强盗标识 */}
      {hasRobber && (
        <>
          <circle r={size * 0.22} fill="rgba(0,0,0,0.7)" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.25}
          >
            💀
          </text>
        </>
      )}
    </g>
  )
}
