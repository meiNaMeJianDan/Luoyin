/**
 * 六边形地图组件
 *
 * SVG 容器组合所有 HexTile、Vertex、Edge
 * 实现轴坐标到像素坐标的转换（pointy-top hex）
 * 计算所有顶点和边的像素坐标
 * 渲染港口标识
 */

import { useMemo, useState } from 'react'
import HexTileComponent from './HexTile'
import Vertex from './Vertex'
import Edge from './Edge'
import type {
  ClientCatanGameState,
  HexTile,
  PlayerColor,
} from '../types'

/** 六边形尺寸 */
const HEX_SIZE = 50

/** sqrt(3) 常量 */
const SQRT3 = Math.sqrt(3)

/** 轴坐标转像素坐标（flat-top） */
function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (1.5 * q),
    y: size * (SQRT3 / 2 * q + SQRT3 * r),
  }
}

/**
 * 计算 flat-top 六边形 (q,r) 的第 i 个顶点的像素坐标
 * flat-top 顶点角度：0°, 60°, 120°, 180°, 240°, 300°
 * i=0 右, i=1 右上, i=2 左上, i=3 左, i=4 左下, i=5 右下
 */
function hexCornerPixel(q: number, r: number, i: number, size: number): { x: number; y: number } {
  const center = axialToPixel(q, r, size)
  const angle = (Math.PI / 180) * (60 * i)
  return {
    x: center.x + size * Math.cos(angle),
    y: center.y + size * Math.sin(angle),
  }
}

/**
 * 建立顶点 ID → 像素坐标的映射
 *
 * 后端 getHexVertices(q,r) 返回 6 个顶点 ID，顺序为：
 *   [V_N, V_NE, V_SE, V_S, V_SW, V_NW]
 * 对应 pointy-top 的方向。
 *
 * 在 flat-top 中，六边形的 6 个角（从 0° 顺时针）为：
 *   i=0 右, i=1 右上, i=2 左上, i=3 左, i=4 左下, i=5 右下
 *
 * 后端顶点顺序 → flat-top 角索引的映射：
 *   V_N(北)  → i=1(右上) 或 i=2(左上)... 需要根据几何关系确定
 *
 * 最可靠的方式：对每个六边形的 6 个顶点 ID，按后端定义的顺序
 * 映射到 flat-top 的 6 个角。后端顺序是：
 *   0: V_N   → flat-top 的"上"方向 → 角 i=1 (60°, 右上)
 *   1: V_NE  → flat-top 的"右上"   → 角 i=0 (0°, 右)
 *   2: V_SE  → flat-top 的"右下"   → 角 i=5 (300°, 右下)
 *   3: V_S   → flat-top 的"下"     → 角 i=4 (240°, 左下)
 *   4: V_SW  → flat-top 的"左下"   → 角 i=3 (180°, 左)... 不对
 *
 * 实际上最简单的方式是：直接用每个六边形的 6 个顶点 ID 和 6 个角坐标，
 * 如果同一个顶点 ID 被多个六边形共享，它们计算出的坐标应该相同。
 * 所以只需要对每个六边形，把 getHexVertexIds 的 6 个 ID 映射到 6 个角。
 */

/**
 * 后端 getHexVertexIds(q,r) 返回的 6 个顶点按以下顺序：
 *   [V_N, V_NE, V_SE, V_S, V_SW, V_NW]
 *
 * 对于 flat-top 六边形，6 个角的角度为 0°,60°,120°,180°,240°,300°
 * 对应方向：右, 右上, 左上, 左, 左下, 右下
 *
 * pointy-top 的方向名 → flat-top 的角索引：
 *   N(上)   → 介于左上和右上之间 → 角 90° → 不是标准角
 *
 * 这说明 pointy-top 的顶点编码和 flat-top 的角不能直接对应。
 * 需要换一种方式：直接从顶点 ID 解析 (q,r,d) 并用 flat-top 公式计算。
 *
 * 在后端 map.ts 中：
 *   d=0: 六边形 (q,r) 的"北"顶点
 *   d=1: 六边形 (q,r) 的"东北"顶点
 *
 * 对于 flat-top 六边形 (q,r)：
 *   6 个角的角度 = 0°, 60°, 120°, 180°, 240°, 300°
 *   对应 flat-top 的方向：E, NE, NW, W, SW, SE
 *
 * 后端 getHexVertices(q,r) 的映射关系：
 *   index 0: (q,r,0)         = V_N  → 在 flat-top 中对应 NE 角 (60°) 和 NW 角 (120°) 之间
 *
 * 这不行。让我换个思路：直接用 flat-top 的角来建立映射。
 */

// 最终方案：不从顶点 ID 反推坐标，而是遍历所有六边形的 6 个角，
// 建立 顶点ID → 像素坐标 的映射。
// 关键：getHexVertexIds(q,r) 返回的 6 个 ID 按顺序对应六边形的 6 个角。
// 后端定义的顺序是 [V_N, V_NE, V_SE, V_S, V_SW, V_NW]
// 在 flat-top 中，我们需要确定这 6 个方向对应哪 6 个角。
//
// flat-top 六边形的 6 个角（从 0° 开始顺时针）：
//   角0(0°)=E, 角1(60°)=NE, 角2(120°)=NW, 角3(180°)=W, 角4(240°)=SW, 角5(300°)=SE
//
// 后端顶点顺序 [N, NE, SE, S, SW, NW] 对应 flat-top 角索引：
//   N  → 介于 NE(60°) 和 NW(120°) 之间 → 90° → 不是角！
//
// 结论：pointy-top 的顶点编码和 flat-top 的角不兼容。
// 需要用不同的方式计算顶点坐标。

/**
 * 从顶点 ID 计算像素坐标（兼容 flat-top 渲染）
 *
 * 思路：每个顶点被 3 个六边形共享。找到共享该顶点的所有六边形，
 * 取它们中心坐标的平均值，再加上方向偏移。
 *
 * 更简单的方式：利用后端的顶点编码规则。
 * 在后端 map.ts 中，顶点 (q,r,0) 是六边形 (q,r) 的"北"顶点，
 * 顶点 (q,r,1) 是六边形 (q,r) 的"东北"顶点。
 *
 * 对于 pointy-top：
 *   d=0 (N): center + (0, -size)
 *   d=1 (NE): center + (sqrt3/2 * size, -size/2)
 *
 * 对于 flat-top，我们需要旋转 30°：
 *   pointy-top 的角度 a → flat-top 的角度 a - 30°
 *   d=0 (N, 90°): → flat-top 60° → center + (size*cos60°, -size*sin60°) = (size/2, -sqrt3/2*size)
 *   d=1 (NE, 30°): → flat-top 0° → center + (size, 0)
 */
function vertexToPixel(vertexId: string, size: number): { x: number; y: number } {
  const parts = vertexId.split(',')
  const q = Number(parts[0])
  const r = Number(parts[1])
  const d = Number(parts[2])
  const center = axialToPixel(q, r, size)

  if (d === 0) {
    // pointy-top N (90°) → flat-top 旋转 -30° → 60°
    return {
      x: center.x + size * Math.cos(Math.PI / 3),
      y: center.y - size * Math.sin(Math.PI / 3),
    }
  }
  // d === 1: pointy-top NE (30°) → flat-top 旋转 -30° → 0°
  return {
    x: center.x + size,
    y: center.y,
  }
}

/** 港口类型中文名和颜色 */
const HARBOR_INFO: Record<string, { label: string; color: string }> = {
  generic: { label: '3:1', color: '#f5f5f5' },
  wood: { label: '🌲2:1', color: '#2d6a2e' },
  brick: { label: '🧱2:1', color: '#b5651d' },
  sheep: { label: '🐑2:1', color: '#7ec850' },
  wheat: { label: '🌾2:1', color: '#daa520' },
  ore: { label: '⛰️2:1', color: '#808080' },
}

interface HexMapProps {
  gameState: ClientCatanGameState
  playerId: string | null
  onVertexClick?: (vertexId: string) => void
  onEdgeClick?: (edgeId: string) => void
  onHexClick?: (tile: HexTile) => void
  interactionMode?: 'normal' | 'building_road' | 'building_settlement' | 'building_city' | 'move_robber'
}

export default function HexMap({
  gameState,
  playerId,
  onVertexClick,
  onEdgeClick,
  onHexClick,
  interactionMode = 'normal',
}: HexMapProps) {
  const [scale, setScale] = useState(1)
  const { map, validPositions } = gameState

  // 找到当前玩家信息
  const currentPlayer = gameState.players.find(p => p.id === playerId)

  // 构建玩家 ID → 颜色映射
  const playerColorMap = useMemo(() => {
    const m = new Map<string, PlayerColor>()
    for (const p of gameState.players) {
      m.set(p.id, p.color)
    }
    return m
  }, [gameState.players])

  // 计算所有顶点的像素坐标
  const vertexPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>()
    // 从所有六边形推导顶点
    for (const tile of map.tiles) {
      const { q, r } = tile.coord
      const vertices = getHexVertexIds(q, r)
      for (const vid of vertices) {
        if (!positions.has(vid)) {
          positions.set(vid, vertexToPixel(vid, HEX_SIZE))
        }
      }
    }
    return positions
  }, [map.tiles])

  // 计算所有边的像素坐标（两个端点的坐标）
  const edgePositions = useMemo(() => {
    const positions = new Map<string, { x1: number; y1: number; x2: number; y2: number }>()
    for (const tile of map.tiles) {
      const { q, r } = tile.coord
      const edges = getHexEdgeIds(q, r)
      for (const eid of edges) {
        if (!positions.has(eid)) {
          const [v1, v2] = getEdgeVertexIds(eid)
          const p1 = vertexToPixel(v1, HEX_SIZE)
          const p2 = vertexToPixel(v2, HEX_SIZE)
          positions.set(eid, { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
        }
      }
    }
    return positions
  }, [map.tiles])

  // 判断哪些顶点/边需要高亮
  const validVertexSet = useMemo(() => {
    if (interactionMode === 'building_settlement') return new Set(validPositions.settlements)
    if (interactionMode === 'building_city') return new Set(validPositions.cities)
    // setup 阶段也高亮
    const phase = gameState.phase
    if (phase === 'setup_settlement') return new Set(validPositions.settlements)
    return new Set<string>()
  }, [interactionMode, validPositions, gameState.phase])

  const validEdgeSet = useMemo(() => {
    if (interactionMode === 'building_road') return new Set(validPositions.roads)
    const phase = gameState.phase
    if (phase === 'setup_road') return new Set(validPositions.roads)
    return new Set<string>()
  }, [interactionMode, validPositions, gameState.phase])

  // 是否高亮六边形（移动强盗模式）
  const highlightHexes = interactionMode === 'move_robber' || gameState.phase === 'move_robber'

  // SVG 视口计算 — flat-top 六边形
  const padding = 60
  const viewBox = useMemo(() => {
    const tiles = map?.tiles
    if (!tiles || tiles.length === 0) {
      return '-300 -300 600 600'
    }
    let minX = 0, minY = 0, maxX = 0, maxY = 0
    let first = true
    for (const tile of tiles) {
      const q = tile?.coord?.q ?? 0
      const r = tile?.coord?.r ?? 0
      const { x, y } = axialToPixel(q, r, HEX_SIZE)
      if (first) {
        minX = x - HEX_SIZE
        minY = y - HEX_SIZE
        maxX = x + HEX_SIZE
        maxY = y + HEX_SIZE
        first = false
      } else {
        minX = Math.min(minX, x - HEX_SIZE)
        minY = Math.min(minY, y - HEX_SIZE)
        maxX = Math.max(maxX, x + HEX_SIZE)
        maxY = Math.max(maxY, y + HEX_SIZE)
      }
    }
    return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`
  }, [map])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale(prev => Math.max(0.5, Math.min(2, prev - e.deltaY * 0.001)))
  }

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden" onWheel={handleWheel}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ maxWidth: `${scale * 100}%`, maxHeight: `${scale * 100}%` }}
      >
        {/* 六边形地块层 */}
        {map.tiles.map(tile => {
          const { x, y } = axialToPixel(tile.coord.q, tile.coord.r, HEX_SIZE)
          const isCurrentRobber = tile.hasRobber
          return (
            <HexTileComponent
              key={`${tile.coord.q},${tile.coord.r}`}
              tile={tile}
              x={x}
              y={y}
              size={HEX_SIZE}
              onClick={highlightHexes && !isCurrentRobber ? onHexClick : undefined}
              highlighted={highlightHexes && !isCurrentRobber}
            />
          )
        })}

        {/* 港口层 — 圆形图标 + V 形连线指向两个顶点 */}
        {map.harbors.map((harbor, i) => {
          const [v1Id, v2Id] = harbor.vertices
          const p1 = vertexPositions.get(v1Id)
          const p2 = vertexPositions.get(v2Id)
          if (!p1 || !p2) return null

          // 两个顶点的中点
          const mx = (p1.x + p2.x) / 2
          const my = (p1.y + p2.y) / 2
          // 从地图中心(0,0)向外的方向
          const dist = Math.sqrt(mx * mx + my * my) || 1
          // 港口圆形图标位置：沿外推方向放置在地图外围
          const iconDist = 65
          const ix = mx + (mx / dist) * iconDist
          const iy = my + (my / dist) * iconDist
          const info = HARBOR_INFO[harbor.type]
          const isGeneric = harbor.type === 'generic'

          return (
            <g key={`harbor-${i}`}>
              {/* V 形连线：从图标到两个顶点 */}
              <line x1={ix} y1={iy} x2={p1.x} y2={p1.y}
                stroke={isGeneric ? '#aaa' : info.color} strokeWidth={2} opacity={0.7} />
              <line x1={ix} y1={iy} x2={p2.x} y2={p2.y}
                stroke={isGeneric ? '#aaa' : info.color} strokeWidth={2} opacity={0.7} />
              {/* 两个顶点上的小圆点标记 */}
              <circle cx={p1.x} cy={p1.y} r={3} fill={isGeneric ? '#aaa' : info.color} />
              <circle cx={p2.x} cy={p2.y} r={3} fill={isGeneric ? '#aaa' : info.color} />
              {/* 港口圆形图标 */}
              <circle cx={ix} cy={iy} r={18}
                fill={isGeneric ? '#555' : 'rgba(0,0,0,0.8)'}
                stroke={isGeneric ? '#ccc' : info.color}
                strokeWidth={2} />
              <text x={ix} y={iy}
                textAnchor="middle" dominantBaseline="central"
                fontSize={isGeneric ? 11 : 10}
                fill={isGeneric ? '#fff' : info.color}
                fontWeight="bold">
                {isGeneric ? '?' : info.label}
              </text>
              {/* 通用港口在圆下方显示 3:1 */}
              {isGeneric && (
                <text x={ix} y={iy + 22}
                  textAnchor="middle" fontSize={9} fill="#ccc" fontWeight="bold">
                  3:1
                </text>
              )}
            </g>
          )
        })}

        {/* 边（道路）层 */}
        {Array.from(edgePositions.entries()).map(([edgeId, pos]) => {
          const road = map.edges[edgeId]
          const isValid = validEdgeSet.has(edgeId)
          if (!road && !isValid) return null

          return (
            <Edge
              key={edgeId}
              id={edgeId}
              x1={pos.x1}
              y1={pos.y1}
              x2={pos.x2}
              y2={pos.y2}
              hasRoad={!!road}
              playerColor={road ? playerColorMap.get(road.playerId) : currentPlayer?.color}
              valid={isValid}
              onClick={onEdgeClick}
            />
          )
        })}

        {/* 顶点（建筑）层 */}
        {Array.from(vertexPositions.entries()).map(([vertexId, pos]) => {
          const building = map.vertices[vertexId]
          const isValid = validVertexSet.has(vertexId)
          if (!building && !isValid) return null

          return (
            <Vertex
              key={vertexId}
              id={vertexId}
              x={pos.x}
              y={pos.y}
              building={building?.type}
              playerColor={building ? playerColorMap.get(building.playerId) : currentPlayer?.color}
              valid={isValid}
              onClick={onVertexClick}
            />
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// 辅助函数：复制自后端 map.ts 的顶点/边编码逻辑
// ============================================================

/** 获取六边形 (q, r) 的 6 个顶点 ID */
function getHexVertexIds(q: number, r: number): string[] {
  return [
    `${q},${r},0`,
    `${q},${r},1`,
    `${q},${r + 1},0`,
    `${q - 1},${r + 1},1`,
    `${q - 1},${r + 1},0`,
    `${q - 1},${r},1`,
  ]
}

/** 获取六边形 (q, r) 的 6 条边 ID */
function getHexEdgeIds(q: number, r: number): string[] {
  return [
    `${q + 1},${r - 1},2`,
    `${q},${r},0`,
    `${q},${r},1`,
    `${q},${r},2`,
    `${q - 1},${r},0`,
    `${q},${r - 1},1`,
  ]
}

/** 获取边的两个端点顶点 ID */
function getEdgeVertexIds(edgeId: string): [string, string] {
  const [q, r, d] = edgeId.split(',').map(Number)
  if (d === 0) return [`${q},${r},1`, `${q},${r + 1},0`]
  if (d === 1) return [`${q},${r + 1},0`, `${q - 1},${r + 1},1`]
  return [`${q - 1},${r + 1},1`, `${q - 1},${r + 1},0`]
}
