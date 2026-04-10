import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateMap,
  getHexVertices,
  getHexEdges,
  getEdgeVertices,
  getAdjacentVertices,
  getAdjacentEdges,
  getEdgeEndpoints,
  getAdjacentHexes,
  getEdgeAdjacentHexes,
  areVerticesAdjacent,
  getAllVertexIds,
  getAllEdgeIds,
  serializeMap,
  deserializeMap,
  resetAdjacencyCache,
  HEX_POSITIONS,
} from '../map.js';

beforeEach(() => {
  resetAdjacencyCache();
});

describe('六边形地图坐标系', () => {
  it('应有 19 个六边形位置', () => {
    expect(HEX_POSITIONS).toHaveLength(19);
  });

  it('每个六边形应有 6 个顶点', () => {
    for (const { q, r } of HEX_POSITIONS) {
      const vertices = getHexVertices(q, r);
      expect(vertices).toHaveLength(6);
      // 所有顶点 ID 应唯一
      expect(new Set(vertices).size).toBe(6);
    }
  });

  it('每个六边形应有 6 条边', () => {
    for (const { q, r } of HEX_POSITIONS) {
      const edges = getHexEdges(q, r);
      expect(edges).toHaveLength(6);
      expect(new Set(edges).size).toBe(6);
    }
  });
});

describe('顶点和边的数量', () => {
  it('标准卡坦岛地图应有 54 个顶点', () => {
    const vertices = getAllVertexIds();
    expect(vertices.length).toBe(54);
  });

  it('标准卡坦岛地图应有 72 条边', () => {
    const edges = getAllEdgeIds();
    expect(edges.length).toBe(72);
  });
});

describe('邻接关系', () => {
  it('顶点邻接关系应对称', () => {
    const vertices = getAllVertexIds();
    for (const v of vertices) {
      const neighbors = getAdjacentVertices(v);
      for (const n of neighbors) {
        expect(getAdjacentVertices(n)).toContain(v);
      }
    }
  });

  it('内部顶点应有 3 个相邻顶点，边缘顶点应有 2 个', () => {
    const vertices = getAllVertexIds();
    for (const v of vertices) {
      const count = getAdjacentVertices(v).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it('内部顶点应有 3 条相邻边，边缘顶点应有 2 条', () => {
    const vertices = getAllVertexIds();
    for (const v of vertices) {
      const count = getAdjacentEdges(v).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it('每条边应有恰好 2 个端点', () => {
    const edges = getAllEdgeIds();
    for (const e of edges) {
      const [v1, v2] = getEdgeEndpoints(e);
      expect(v1).not.toBe(v2);
      // 端点应是有效顶点
      expect(getAllVertexIds()).toContain(v1);
      expect(getAllVertexIds()).toContain(v2);
    }
  });

  it('边的端点应互为相邻顶点', () => {
    const edges = getAllEdgeIds();
    for (const e of edges) {
      const [v1, v2] = getEdgeEndpoints(e);
      expect(areVerticesAdjacent(v1, v2)).toBe(true);
      expect(areVerticesAdjacent(v2, v1)).toBe(true);
    }
  });

  it('如果顶点是边的端点，则该边应在顶点的相邻边列表中', () => {
    const edges = getAllEdgeIds();
    for (const e of edges) {
      const [v1, v2] = getEdgeEndpoints(e);
      expect(getAdjacentEdges(v1)).toContain(e);
      expect(getAdjacentEdges(v2)).toContain(e);
    }
  });

  it('每个顶点应相邻 1-3 个六边形', () => {
    const map = generateMap();
    const vertices = getAllVertexIds();
    for (const v of vertices) {
      const hexes = getAdjacentHexes(v, map.tiles);
      expect(hexes.length).toBeGreaterThanOrEqual(1);
      expect(hexes.length).toBeLessThanOrEqual(3);
    }
  });

  it('每条边应相邻 1-2 个六边形', () => {
    const map = generateMap();
    const edges = getAllEdgeIds();
    for (const e of edges) {
      const hexes = getEdgeAdjacentHexes(e, map.tiles);
      expect(hexes.length).toBeGreaterThanOrEqual(1);
      expect(hexes.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('地图生成', () => {
  it('应生成 19 个地块', () => {
    const map = generateMap();
    expect(map.tiles).toHaveLength(19);
  });

  it('地形分布应正确：4森林+3山丘+4牧场+4田地+3山地+1沙漠', () => {
    const map = generateMap();
    const counts: Record<string, number> = {};
    for (const tile of map.tiles) {
      counts[tile.terrain] = (counts[tile.terrain] ?? 0) + 1;
    }
    expect(counts['forest']).toBe(4);
    expect(counts['hills']).toBe(3);
    expect(counts['pasture']).toBe(4);
    expect(counts['fields']).toBe(4);
    expect(counts['mountains']).toBe(3);
    expect(counts['desert']).toBe(1);
  });

  it('应有 18 个点数标记分配给非沙漠地块', () => {
    const map = generateMap();
    const withToken = map.tiles.filter(t => t.numberToken !== null);
    const withoutToken = map.tiles.filter(t => t.numberToken === null);
    expect(withToken).toHaveLength(18);
    expect(withoutToken).toHaveLength(1);
    expect(withoutToken[0].terrain).toBe('desert');
  });

  it('点数分布应正确', () => {
    const map = generateMap();
    const tokens = map.tiles
      .map(t => t.numberToken)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    expect(tokens).toEqual([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]);
  });

  it('应有 9 个港口（4通用+5特定资源）', () => {
    const map = generateMap();
    expect(map.harbors).toHaveLength(9);
    const genericCount = map.harbors.filter(h => h.type === 'generic').length;
    const specificCount = map.harbors.filter(h => h.type !== 'generic').length;
    expect(genericCount).toBe(4);
    expect(specificCount).toBe(5);
  });

  it('特定资源港口应各有一个', () => {
    const map = generateMap();
    const specificTypes = map.harbors
      .filter(h => h.type !== 'generic')
      .map(h => h.type)
      .sort();
    expect(specificTypes).toEqual(['brick', 'ore', 'sheep', 'wheat', 'wood']);
  });

  it('强盗应初始在沙漠地块上', () => {
    const map = generateMap();
    const robberTiles = map.tiles.filter(t => t.hasRobber);
    expect(robberTiles).toHaveLength(1);
    expect(robberTiles[0].terrain).toBe('desert');
  });

  it('顶点和边初始应为空', () => {
    const map = generateMap();
    expect(Object.keys(map.vertices)).toHaveLength(0);
    expect(Object.keys(map.edges)).toHaveLength(0);
  });
});

describe('序列化与反序列化', () => {
  it('往返序列化应保持一致', () => {
    const map = generateMap();
    const json = serializeMap(map);
    const restored = deserializeMap(json);
    expect(restored).toEqual(map);
  });

  it('带建筑的地图序列化应保持一致', () => {
    const map = generateMap();
    // 添加一些建筑
    const vertices = getAllVertexIds();
    map.vertices[vertices[0]] = { type: 'settlement', playerId: 'p1' };
    map.vertices[vertices[1]] = { type: 'city', playerId: 'p2' };
    const edges = getAllEdgeIds();
    map.edges[edges[0]] = { playerId: 'p1' };

    const json = serializeMap(map);
    const restored = deserializeMap(json);
    expect(restored).toEqual(map);
  });
});
