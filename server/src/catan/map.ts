import type { AxialCoord, HexTile, HexMap, Harbor, TerrainType, HarborType } from './types.js';

// ============================================================
// 常量定义
// ============================================================

/** 19 个六边形轴坐标位置（尖顶六边形，axial coordinates） */
export const HEX_POSITIONS: AxialCoord[] = [
  // 中心
  { q: 0, r: 0 },
  // 内圈（6 个）
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  // 外圈（12 个）
  { q: 2, r: 0 }, { q: 1, r: 1 }, { q: 0, r: 2 },
  { q: -1, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 1 },
  { q: -2, r: 0 }, { q: -1, r: -1 }, { q: 0, r: -2 },
  { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 2, r: -1 },
];

/** 有效六边形坐标集合（用于快速查找） */
export const HEX_SET = new Set(HEX_POSITIONS.map(c => `${c.q},${c.r}`));

/** 地形池：4森林 + 3山丘 + 4牧场 + 4田地 + 3山地 + 1沙漠 = 19 */
const TERRAIN_POOL: TerrainType[] = [
  'forest', 'forest', 'forest', 'forest',
  'hills', 'hills', 'hills',
  'pasture', 'pasture', 'pasture', 'pasture',
  'fields', 'fields', 'fields', 'fields',
  'mountains', 'mountains', 'mountains',
  'desert',
];

/** 点数池：1×2, 2×3, 2×4, 2×5, 2×6, 2×8, 2×9, 2×10, 2×11, 1×12 = 18 */
const NUMBER_TOKEN_POOL: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

// ============================================================
// 工具函数
// ============================================================

/** Fisher-Yates 洗牌算法 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 解析 "q,r,d" 格式的 ID */
function parseId(id: string): [number, number, number] {
  const parts = id.split(',');
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

// ============================================================
// 顶点与边的规范化编码
// ============================================================

/**
 * 顶点编码（尖顶六边形 pointy-top，"q,r,d" 格式，d ∈ {0, 1}）：
 *   d=0: 六边形的"北"顶点（最上方尖角）
 *   d=1: 六边形的"东北"顶点（右上方）
 *
 * 每个六边形有 6 个顶点，但只"拥有" d=0 和 d=1 两个。
 * 其余 4 个顶点由相邻六边形的 d=0/d=1 表示，保证全局唯一。
 *
 * 六边形 (q,r) 的 6 个顶点映射（通过像素坐标验证）：
 *   V_N  = (q, r, 0)          V_NE = (q, r, 1)
 *   V_SE = (q, r+1, 0)        V_S  = (q-1, r+1, 1)
 *   V_SW = (q-1, r+1, 0)      V_NW = (q-1, r, 1)
 */

/** 获取六边形 (q, r) 的 6 个顶点 ID */
export function getHexVertices(q: number, r: number): string[] {
  return [
    `${q},${r},0`,           // V_N  北
    `${q},${r},1`,           // V_NE 东北
    `${q},${r + 1},0`,       // V_SE 东南
    `${q - 1},${r + 1},1`,   // V_S  南
    `${q - 1},${r + 1},0`,   // V_SW 西南
    `${q - 1},${r},1`,       // V_NW 西北
  ];
}

/**
 * 边编码（"q,r,d" 格式，d ∈ {0, 1, 2}）：
 *   d=0: "东"边 — 连接 V_NE(q,r,1) 和 V_SE(q,r+1,0)
 *   d=1: "东南"边 — 连接 V_SE(q,r+1,0) 和 V_S(q-1,r+1,1)
 *   d=2: "南"边 — 连接 V_S(q-1,r+1,1) 和 V_SW(q-1,r+1,0)
 *
 * 每个六边形有 6 条边，只"拥有" d=0/1/2 三条。
 * 其余 3 条由相邻六边形的 d 表示：
 *   NE边 = (q+1, r-1, 2)    W边 = (q-1, r, 0)    NW边 = (q, r-1, 1)
 */

/** 获取六边形 (q, r) 的 6 条边 ID */
export function getHexEdges(q: number, r: number): string[] {
  return [
    `${q + 1},${r - 1},2`,   // NE边
    `${q},${r},0`,            // E边
    `${q},${r},1`,            // SE边
    `${q},${r},2`,            // S边
    `${q - 1},${r},0`,        // W边
    `${q},${r - 1},1`,        // NW边
  ];
}

/** 获取边的两个端点顶点 ID（直接计算，不依赖缓存） */
export function getEdgeVertices(edgeId: string): [string, string] {
  if (edgeVerticesCacheMap) {
    const cached = edgeVerticesCacheMap.get(edgeId);
    if (cached) return cached;
  }
  const [q, r, d] = parseId(edgeId);
  if (d === 0) return [`${q},${r},1`, `${q},${r + 1},0`];
  if (d === 1) return [`${q},${r + 1},0`, `${q - 1},${r + 1},1`];
  return [`${q - 1},${r + 1},1`, `${q - 1},${r + 1},0`];
}

// ============================================================
// 邻接关系缓存（模块级单例，首次访问时计算）
// ============================================================

let vertexToAdjacentVertices: Map<string, string[]> | null = null;
let vertexToAdjacentEdges: Map<string, string[]> | null = null;
let edgeVerticesCacheMap: Map<string, [string, string]> | null = null;
let vertexToAdjacentHexCoords: Map<string, AxialCoord[]> | null = null;
let edgeToAdjacentHexCoords: Map<string, AxialCoord[]> | null = null;
let allVertexIds: Set<string> | null = null;
let allEdgeIds: Set<string> | null = null;

/** 预计算所有邻接关系并缓存 */
function ensureAdjacencyComputed(): void {
  if (vertexToAdjacentVertices !== null) return;

  const vertexSet = new Set<string>();
  const edgeSet = new Set<string>();
  const vtxToHexes = new Map<string, Set<string>>();
  const edgToHexes = new Map<string, Set<string>>();

  // 遍历所有六边形，收集顶点和边
  for (const { q, r } of HEX_POSITIONS) {
    const hexKey = `${q},${r}`;
    for (const v of getHexVertices(q, r)) {
      vertexSet.add(v);
      if (!vtxToHexes.has(v)) vtxToHexes.set(v, new Set());
      vtxToHexes.get(v)!.add(hexKey);
    }
    for (const e of getHexEdges(q, r)) {
      edgeSet.add(e);
      if (!edgToHexes.has(e)) edgToHexes.set(e, new Set());
      edgToHexes.get(e)!.add(hexKey);
    }
  }

  allVertexIds = vertexSet;
  allEdgeIds = edgeSet;

  // 计算每条边的两个端点
  edgeVerticesCacheMap = new Map();
  for (const edgeId of edgeSet) {
    const [v1, v2] = getEdgeVertices(edgeId);
    if (vertexSet.has(v1) && vertexSet.has(v2)) {
      edgeVerticesCacheMap.set(edgeId, [v1, v2]);
    }
  }

  // 计算顶点的相邻边（边的端点包含该顶点）
  vertexToAdjacentEdges = new Map();
  for (const v of vertexSet) vertexToAdjacentEdges.set(v, []);
  for (const [edgeId, [v1, v2]] of edgeVerticesCacheMap) {
    vertexToAdjacentEdges.get(v1)?.push(edgeId);
    vertexToAdjacentEdges.get(v2)?.push(edgeId);
  }

  // 计算顶点的相邻顶点（通过共享边连接）
  vertexToAdjacentVertices = new Map();
  for (const v of vertexSet) {
    const neighbors = new Set<string>();
    for (const edgeId of vertexToAdjacentEdges.get(v) ?? []) {
      const [v1, v2] = edgeVerticesCacheMap.get(edgeId)!;
      if (v1 !== v) neighbors.add(v1);
      if (v2 !== v) neighbors.add(v2);
    }
    vertexToAdjacentVertices.set(v, [...neighbors]);
  }

  // 计算顶点相邻六边形坐标
  vertexToAdjacentHexCoords = new Map();
  for (const [v, hexKeys] of vtxToHexes) {
    if (vertexSet.has(v)) {
      vertexToAdjacentHexCoords.set(v, [...hexKeys].map(k => {
        const [q, r] = k.split(',').map(Number);
        return { q, r };
      }));
    }
  }

  // 计算边相邻六边形坐标
  edgeToAdjacentHexCoords = new Map();
  for (const [e, hexKeys] of edgToHexes) {
    if (edgeSet.has(e)) {
      edgeToAdjacentHexCoords.set(e, [...hexKeys].map(k => {
        const [q, r] = k.split(',').map(Number);
        return { q, r };
      }));
    }
  }
}

/** 重置邻接关系缓存（用于测试） */
export function resetAdjacencyCache(): void {
  vertexToAdjacentVertices = null;
  vertexToAdjacentEdges = null;
  edgeVerticesCacheMap = null;
  vertexToAdjacentHexCoords = null;
  edgeToAdjacentHexCoords = null;
  allVertexIds = null;
  allEdgeIds = null;
}

// ============================================================
// 公开的邻接查询 API
// ============================================================

/** 获取顶点的所有相邻顶点 */
export function getAdjacentVertices(vertexId: string): string[] {
  ensureAdjacencyComputed();
  return vertexToAdjacentVertices!.get(vertexId) ?? [];
}

/** 获取顶点的所有相邻边 */
export function getAdjacentEdges(vertexId: string): string[] {
  ensureAdjacencyComputed();
  return vertexToAdjacentEdges!.get(vertexId) ?? [];
}

/** 获取边的两个端点顶点（使用缓存） */
export function getEdgeEndpoints(edgeId: string): [string, string] {
  ensureAdjacencyComputed();
  return edgeVerticesCacheMap!.get(edgeId) ?? getEdgeVertices(edgeId);
}

/** 获取顶点相邻的所有地块 */
export function getAdjacentHexes(vertexId: string, tiles: HexTile[]): HexTile[] {
  ensureAdjacencyComputed();
  const coords = vertexToAdjacentHexCoords!.get(vertexId) ?? [];
  const tileMap = new Map(tiles.map(t => [`${t.coord.q},${t.coord.r}`, t]));
  return coords
    .map(c => tileMap.get(`${c.q},${c.r}`))
    .filter((t): t is HexTile => t !== undefined);
}

/** 获取边相邻的所有地块 */
export function getEdgeAdjacentHexes(edgeId: string, tiles: HexTile[]): HexTile[] {
  ensureAdjacencyComputed();
  const coords = edgeToAdjacentHexCoords!.get(edgeId) ?? [];
  const tileMap = new Map(tiles.map(t => [`${t.coord.q},${t.coord.r}`, t]));
  return coords
    .map(c => tileMap.get(`${c.q},${c.r}`))
    .filter((t): t is HexTile => t !== undefined);
}

/** 检查两个顶点是否相邻（共享一条边） */
export function areVerticesAdjacent(v1: string, v2: string): boolean {
  ensureAdjacencyComputed();
  const adj = vertexToAdjacentVertices!.get(v1);
  return adj !== undefined && adj.includes(v2);
}

/** 获取所有有效顶点 ID */
export function getAllVertexIds(): string[] {
  ensureAdjacencyComputed();
  return [...allVertexIds!];
}

/** 获取所有有效边 ID */
export function getAllEdgeIds(): string[] {
  ensureAdjacencyComputed();
  return [...allEdgeIds!];
}

// ============================================================
// 港口生成
// ============================================================

/** 找到连接两个相邻顶点的边 ID */
function getEdgeConnecting(v1: string, v2: string): string {
  ensureAdjacencyComputed();
  const edges1 = vertexToAdjacentEdges!.get(v1) ?? [];
  const edges2Set = new Set(vertexToAdjacentEdges!.get(v2) ?? []);
  for (const e of edges1) {
    if (edges2Set.has(e)) return e;
  }
  return `edge:${v1}|${v2}`;
}

/**
 * 生成 9 个港口（4 个 3:1 通用 + 5 个 2:1 特定资源）
 * 港口位于地图边缘，每个关联两个相邻的边缘顶点
 *
 * 标准卡坦岛地图边缘有 30 条边，我们选择 9 条边作为港口位置。
 * 港口均匀分布在地图周围，每个港口关联一条边缘边的两个端点。
 *
 * 外圈六边形（顺时针从右开始）：
 *   (2,0), (2,-1), (2,-2), (1,-2), (0,-2), (-1,-1),
 *   (-2,0), (-2,1), (-2,2), (-1,2), (0,2), (1,1)
 *
 * 我们选择外圈六边形的外侧边作为港口位置。
 * 每个外圈六边形有 2-3 条外侧边（不与其他六边形共享的边）。
 * 从这些外侧边中选 9 条，均匀分布。
 */
function generateHarbors(): Harbor[] {
  ensureAdjacencyComputed();

  const harborTypes: HarborType[] = shuffle([
    'generic', 'generic', 'generic', 'generic',
    'wood', 'brick', 'sheep', 'wheat', 'ore',
  ]);

  // 找到所有边缘边（只被 1 个六边形共享的边）
  const edgeHexCount = new Map<string, number>();
  for (const { q, r } of HEX_POSITIONS) {
    for (const e of getHexEdges(q, r)) {
      edgeHexCount.set(e, (edgeHexCount.get(e) ?? 0) + 1);
    }
  }

  // 边缘边：只被 1 个六边形拥有
  const borderEdges: string[] = [];
  for (const [edgeId, count] of edgeHexCount) {
    if (count === 1 && allEdgeIds!.has(edgeId)) {
      borderEdges.push(edgeId);
    }
  }

  // 计算每条边缘边的角度（相对于地图中心），用于排序
  const edgeAngles = borderEdges.map(edgeId => {
    const [v1, v2] = getEdgeEndpoints(edgeId);
    // 用 pointy-top 的坐标计算角度（只用于排序，不影响渲染）
    const [q1, r1] = v1.split(',').map(Number);
    const [q2, r2] = v2.split(',').map(Number);
    const mx = (q1 + q2) / 2;
    const mr = (r1 + r2) / 2;
    const angle = Math.atan2(mr, mx);
    return { edgeId, angle };
  });

  // 按角度排序
  edgeAngles.sort((a, b) => a.angle - b.angle);

  // 均匀选择 9 条边
  const totalBorder = edgeAngles.length;
  const step = totalBorder / 9;
  const selectedEdges: string[] = [];
  for (let i = 0; i < 9; i++) {
    const idx = Math.round(i * step) % totalBorder;
    selectedEdges.push(edgeAngles[idx].edgeId);
  }

  return selectedEdges.map((edgeId, i) => {
    const [v1, v2] = getEdgeEndpoints(edgeId);
    return {
      type: harborTypes[i],
      vertices: [v1, v2] as [string, string],
      edgeId,
    };
  });
}

// ============================================================
// 地图生成
// ============================================================

/** 生成标准 19 地块六边形地图 */
export function generateMap(): HexMap {
  ensureAdjacencyComputed();

  // 洗牌地形池并分配给 19 个坐标
  const terrains = shuffle(TERRAIN_POOL);
  const tiles: HexTile[] = HEX_POSITIONS.map((coord, i) => ({
    coord,
    terrain: terrains[i],
    numberToken: null,
    hasRobber: terrains[i] === 'desert',
  }));

  // 为非沙漠地块分配点数
  const numberTokens = shuffle(NUMBER_TOKEN_POOL);
  let tokenIndex = 0;
  for (const tile of tiles) {
    if (tile.terrain !== 'desert') {
      tile.numberToken = numberTokens[tokenIndex++];
    }
  }

  // 生成港口
  const harbors = generateHarbors();

  return { tiles, harbors, vertices: {}, edges: {} };
}

// ============================================================
// 序列化与反序列化
// ============================================================

/** 序列化地图为 JSON 字符串 */
export function serializeMap(map: HexMap): string {
  return JSON.stringify(map);
}

/** 反序列化 JSON 字符串为地图对象 */
export function deserializeMap(json: string): HexMap {
  return JSON.parse(json) as HexMap;
}
