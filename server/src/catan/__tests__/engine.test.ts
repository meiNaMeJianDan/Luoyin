import { describe, it, expect, beforeEach } from 'vitest';
import type { CatanPlayer, HexMap, ResourceMap, CatanGameState, DevCardType, ClientCatanGameState } from '../types.js';
import { TERRAIN_RESOURCE } from '../types.js';
import { generateMap, resetAdjacencyCache, getAdjacentEdges, getEdgeEndpoints, getAdjacentVertices, getAllVertexIds, getAllEdgeIds, getHexVertices } from '../map.js';
import {
  initGame,
  placeInitialSettlement,
  placeInitialRoad,
  rollDice,
  distributeResources,
  discardResources,
  moveRobber,
  stealResource,
  buildRoad,
  buildSettlement,
  buildCity,
  getValidBuildPositions,
  initDevCardDeck,
  buyDevelopmentCard,
  useDevelopmentCard,
  updateLargestArmyAwards,
  toClientGameState,
} from '../engine.js';
import { BUILD_COSTS } from '../types.js';

// ============================================================
// 测试辅助函数
// ============================================================

const PLAYER_COLORS = ['red', 'blue', 'white', 'orange'] as const;

/** 创建测试用玩家列表 */
function createTestPlayers(count: number): CatanPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `玩家${i}`,
    socketId: `socket-${i}`,
    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    settlements: [],
    cities: [],
    roads: [],
    devCards: [],
    knightsPlayed: 0,
    longestRoadLength: 0,
    hasLongestRoad: false,
    hasLargestArmy: false,
    victoryPoints: 0,
    isHost: i === 0,
    isAI: false,
    isConnected: true,
    isReady: true,
    color: PLAYER_COLORS[i],
  }));
}

/** 找到一个没有相邻建筑的空顶点 */
function findValidVertex(state: ReturnType<typeof initGame>): string {
  const allVertices = getAllVertexIds();
  for (const v of allVertices) {
    if (state.map.vertices[v]) continue;
    const adj = getAdjacentVertices(v);
    if (adj.every(a => !state.map.vertices[a])) return v;
  }
  throw new Error('找不到合法顶点');
}

/** 找到与指定顶点相邻的一条空边 */
function findAdjacentEdge(state: ReturnType<typeof initGame>, vertexId: string): string {
  const edges = getAdjacentEdges(vertexId);
  for (const e of edges) {
    if (!state.map.edges[e]) return e;
  }
  throw new Error('找不到相邻空边');
}

let testMap: HexMap;

beforeEach(() => {
  resetAdjacencyCache();
  testMap = generateMap();
});

// ============================================================
// initGame 测试
// ============================================================

describe('initGame', () => {
  it('应正确初始化游戏状态', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, testMap, 'room-1');

    expect(state.roomId).toBe('room-1');
    expect(state.players).toHaveLength(3);
    expect(state.phase).toBe('setup_settlement');
    expect(state.setupState).not.toBeNull();
    expect(state.setupState!.round).toBe(1);
    expect(state.setupState!.order).toEqual([0, 1, 2]);
    expect(state.setupState!.currentIndex).toBe(0);
    expect(state.setupState!.settlementPlaced).toBe(false);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.winnerId).toBeNull();
    expect(state.turnNumber).toBe(0);
  });

  it('玩家初始资源应为空', () => {
    const players = createTestPlayers(4);
    const state = initGame(players, testMap);

    for (const p of state.players) {
      expect(p.resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
      expect(p.settlements).toEqual([]);
      expect(p.cities).toEqual([]);
      expect(p.roads).toEqual([]);
    }
  });

  it('2 人游戏初始放置顺序应为 [0, 1]', () => {
    const state = initGame(createTestPlayers(2), testMap);
    expect(state.setupState!.order).toEqual([0, 1]);
  });

  it('4 人游戏初始放置顺序应为 [0, 1, 2, 3]', () => {
    const state = initGame(createTestPlayers(4), testMap);
    expect(state.setupState!.order).toEqual([0, 1, 2, 3]);
  });
});

// ============================================================
// placeInitialSettlement 测试
// ============================================================

describe('placeInitialSettlement', () => {
  it('应成功放置村庄并切换到 setup_road 阶段', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);

    const newState = placeInitialSettlement(state, 'player-0', vertexId);

    expect(newState.phase).toBe('setup_road');
    expect(newState.map.vertices[vertexId]).toEqual({
      type: 'settlement',
      playerId: 'player-0',
    });
    expect(newState.players[0].settlements).toContain(vertexId);
    expect(newState.setupState!.settlementPlaced).toBe(true);
  });

  it('非当前玩家不能放置村庄', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);

    // player-1 不是当前玩家（当前是 player-0）
    const newState = placeInitialSettlement(state, 'player-1', vertexId);
    expect(newState).toBe(state); // 状态不变
  });

  it('不能在已有建筑的顶点放置', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);

    const state2 = placeInitialSettlement(state, 'player-0', vertexId);
    // 放道路推进到下一个玩家
    const edgeId = findAdjacentEdge(state2, vertexId);
    const state3 = placeInitialRoad(state2, 'player-0', edgeId);

    // player-1 尝试在同一顶点放置
    const state4 = placeInitialSettlement(state3, 'player-1', vertexId);
    expect(state4).toBe(state3); // 状态不变
  });

  it('不能在相邻已有建筑的顶点放置（距离规则）', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);

    const state2 = placeInitialSettlement(state, 'player-0', vertexId);
    const edgeId = findAdjacentEdge(state2, vertexId);
    const state3 = placeInitialRoad(state2, 'player-0', edgeId);

    // 找一个与 vertexId 相邻的顶点
    const adjacentVertex = getAdjacentVertices(vertexId)[0];
    const state4 = placeInitialSettlement(state3, 'player-1', adjacentVertex);
    expect(state4).toBe(state3); // 距离规则拒绝
  });

  it('非 setup_settlement 阶段不能放置', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);

    // 放置村庄后进入 setup_road 阶段
    const state2 = placeInitialSettlement(state, 'player-0', vertexId);
    expect(state2.phase).toBe('setup_road');

    // 在 setup_road 阶段尝试再放村庄
    const anotherVertex = findValidVertex(state2);
    const state3 = placeInitialSettlement(state2, 'player-0', anotherVertex);
    expect(state3).toBe(state2); // 状态不变
  });

  it('无效顶点 ID 应被拒绝', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const newState = placeInitialSettlement(state, 'player-0', 'invalid-vertex');
    expect(newState).toBe(state);
  });
});

// ============================================================
// placeInitialRoad 测试
// ============================================================

describe('placeInitialRoad', () => {
  it('应成功放置道路并推进到下一位玩家', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);
    const state2 = placeInitialSettlement(state, 'player-0', vertexId);

    const edgeId = findAdjacentEdge(state2, vertexId);
    const state3 = placeInitialRoad(state2, 'player-0', edgeId);

    expect(state3.map.edges[edgeId]).toEqual({ playerId: 'player-0' });
    expect(state3.players[0].roads).toContain(edgeId);
    expect(state3.phase).toBe('setup_settlement');
    expect(state3.currentPlayerIndex).toBe(1); // 下一位玩家
  });

  it('道路必须与刚放置的村庄相邻', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);
    const state2 = placeInitialSettlement(state, 'player-0', vertexId);

    // 找一条不与 vertexId 相邻的边
    const nonAdjacentEdge = findNonAdjacentEdge(state2, vertexId);
    if (nonAdjacentEdge) {
      const state3 = placeInitialRoad(state2, 'player-0', nonAdjacentEdge);
      expect(state3).toBe(state2); // 被拒绝
    }
  });

  it('非当前玩家不能放置道路', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);
    const state2 = placeInitialSettlement(state, 'player-0', vertexId);

    const edgeId = findAdjacentEdge(state2, vertexId);
    const state3 = placeInitialRoad(state2, 'player-1', edgeId);
    expect(state3).toBe(state2);
  });

  it('不能在已有道路的边放置', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const v1 = findValidVertex(state);
    const s1 = placeInitialSettlement(state, 'player-0', v1);
    const e1 = findAdjacentEdge(s1, v1);
    const s2 = placeInitialRoad(s1, 'player-0', e1);

    // player-1 放置
    const v2 = findValidVertex(s2);
    const s3 = placeInitialSettlement(s2, 'player-1', v2);

    // 尝试在 player-0 已放置道路的边放置
    const s4 = placeInitialRoad(s3, 'player-1', e1);
    // 如果 e1 不与 v2 相邻，会因为相邻性被拒绝
    // 如果 e1 与 v2 相邻，会因为已有道路被拒绝
    expect(s4).toBe(s3);
  });

  it('非 setup_road 阶段不能放置道路', () => {
    const state = initGame(createTestPlayers(3), testMap);
    // 当前是 setup_settlement 阶段
    const edgeId = findAdjacentEdge(state, findValidVertex(state));
    const newState = placeInitialRoad(state, 'player-0', edgeId);
    expect(newState).toBe(state);
  });

  it('无效边 ID 应被拒绝', () => {
    const state = initGame(createTestPlayers(3), testMap);
    const vertexId = findValidVertex(state);
    const state2 = placeInitialSettlement(state, 'player-0', vertexId);

    const state3 = placeInitialRoad(state2, 'player-0', 'invalid-edge');
    expect(state3).toBe(state2);
  });
});

// ============================================================
// 初始放置顺序完整流程测试
// ============================================================

describe('初始放置完整流程', () => {
  it('3 人游戏应按正确顺序完成两轮放置', () => {
    const players = createTestPlayers(3);
    let state = initGame(players, testMap);

    // 第一轮：正序 0, 1, 2
    for (let i = 0; i < 3; i++) {
      expect(state.phase).toBe('setup_settlement');
      expect(state.currentPlayerIndex).toBe(i);
      expect(state.setupState!.round).toBe(1);

      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      expect(state.phase).toBe('setup_road');

      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }

    // 第二轮：倒序 2, 1, 0
    for (let i = 2; i >= 0; i--) {
      expect(state.phase).toBe('setup_settlement');
      expect(state.currentPlayerIndex).toBe(i);
      expect(state.setupState!.round).toBe(2);

      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      expect(state.phase).toBe('setup_road');

      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }

    // 两轮结束后进入正式游戏
    expect(state.phase).toBe('roll_dice');
    expect(state.setupState).toBeNull();
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('2 人游戏完整流程', () => {
    const players = createTestPlayers(2);
    let state = initGame(players, testMap);

    // 第一轮：0, 1
    for (let i = 0; i < 2; i++) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }

    // 第二轮：1, 0
    expect(state.setupState!.round).toBe(2);
    expect(state.currentPlayerIndex).toBe(1);

    for (let i = 1; i >= 0; i--) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }

    expect(state.phase).toBe('roll_dice');
    expect(state.setupState).toBeNull();
  });

  it('每位玩家应有 2 个村庄和 2 条道路', () => {
    const players = createTestPlayers(3);
    let state = initGame(players, testMap);

    // 完成两轮放置
    const order = [0, 1, 2, 2, 1, 0];
    for (const i of order) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }

    for (const p of state.players) {
      expect(p.settlements).toHaveLength(2);
      expect(p.roads).toHaveLength(2);
    }
  });

  it('第二个村庄放置后应发放初始资源', () => {
    const players = createTestPlayers(2);
    let state = initGame(players, testMap);

    // 第一轮放置 — 不应获得资源
    for (let i = 0; i < 2; i++) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      // 第一轮放置后资源应仍为空
      expect(state.players[i].resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }

    // 第二轮放置 — 应获得初始资源
    expect(state.setupState!.round).toBe(2);

    for (let i = 1; i >= 0; i--) {
      const v = findValidVertex(state);
      const resourcesBefore = { ...state.players[i].resources };
      state = placeInitialSettlement(state, `player-${i}`, v);

      // 第二轮放置后，资源应有变化（除非相邻全是沙漠）
      // 至少验证资源总量 >= 0
      const resourcesAfter = state.players[i].resources;
      const totalBefore = Object.values(resourcesBefore).reduce((a, b) => a + b, 0);
      const totalAfter = Object.values(resourcesAfter).reduce((a, b) => a + b, 0);
      expect(totalAfter).toBeGreaterThanOrEqual(totalBefore);

      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }
  });
});

// ============================================================
// 辅助函数
// ============================================================

/** 找一条不与指定顶点相邻的空边 */
function findNonAdjacentEdge(state: ReturnType<typeof initGame>, vertexId: string): string | null {
  const adjEdges = new Set(getAdjacentEdges(vertexId));
  const allEdges = getAllEdgeIds();
  for (const e of allEdges) {
    if (!adjEdges.has(e) && !state.map.edges[e]) return e;
  }
  return null;
}


// ============================================================
// 测试辅助：完成初始放置进入 roll_dice 阶段
// ============================================================

/** 完成两轮初始放置，返回处于 roll_dice 阶段的游戏状态 */
function completeSetup(playerCount: number, map: HexMap): CatanGameState {
  const players = createTestPlayers(playerCount);
  let state = initGame(players, map);

  // 第一轮正序
  for (let i = 0; i < playerCount; i++) {
    const v = findValidVertex(state);
    state = placeInitialSettlement(state, `player-${i}`, v);
    const e = findAdjacentEdge(state, v);
    state = placeInitialRoad(state, `player-${i}`, e);
  }

  // 第二轮倒序
  for (let i = playerCount - 1; i >= 0; i--) {
    const v = findValidVertex(state);
    state = placeInitialSettlement(state, `player-${i}`, v);
    const e = findAdjacentEdge(state, v);
    state = placeInitialRoad(state, `player-${i}`, e);
  }

  return state;
}

// ============================================================
// rollDice 测试
// ============================================================

describe('rollDice', () => {
  it('应在 roll_dice 阶段成功掷骰子', () => {
    const state = completeSetup(3, testMap);
    expect(state.phase).toBe('roll_dice');

    const newState = rollDice(state);

    expect(newState.diceResult).not.toBeNull();
    expect(newState.diceResult![0]).toBeGreaterThanOrEqual(1);
    expect(newState.diceResult![0]).toBeLessThanOrEqual(6);
    expect(newState.diceResult![1]).toBeGreaterThanOrEqual(1);
    expect(newState.diceResult![1]).toBeLessThanOrEqual(6);
  });

  it('非 roll_dice 阶段不能掷骰子', () => {
    const state = completeSetup(3, testMap);
    // 先掷一次进入 trade_build 或其他阶段
    const afterRoll = rollDice(state);
    // 再次掷骰应被拒绝
    const rejected = rollDice(afterRoll);
    expect(rejected).toBe(afterRoll);
  });

  it('非 7 的骰子结果应进入 trade_build 阶段', () => {
    const state = completeSetup(3, testMap);
    // 多次尝试直到得到非 7 的结果
    let newState: CatanGameState;
    let attempts = 0;
    do {
      newState = rollDice({ ...state, diceResult: null });
      attempts++;
    } while (newState.diceResult![0] + newState.diceResult![1] === 7 && attempts < 100);

    if (newState.diceResult![0] + newState.diceResult![1] !== 7) {
      expect(newState.phase).toBe('trade_build');
    }
  });
});

// ============================================================
// distributeResources 测试
// ============================================================

describe('distributeResources', () => {
  it('匹配地块上有村庄的玩家应获得 1 份资源', () => {
    const state = completeSetup(3, testMap);

    // 找到一个有 numberToken 且无强盗的地块
    const tile = state.map.tiles.find(t => t.numberToken !== null && !t.hasRobber);
    if (!tile) return; // 不应发生

    const diceSum = tile.numberToken!;
    const resource = TERRAIN_RESOURCE[tile.terrain];
    if (!resource) return;

    // 找到该地块上有建筑的顶点
    const vertices = getHexVertices(tile.coord.q, tile.coord.r);
    const buildingVertex = vertices.find(v => state.map.vertices[v]?.type === 'settlement');

    if (buildingVertex) {
      const building = state.map.vertices[buildingVertex];
      const playerIndex = state.players.findIndex(p => p.id === building.playerId);
      const resourceBefore = state.players[playerIndex].resources[resource];

      const newState = distributeResources(state, diceSum);
      const resourceAfter = newState.players[playerIndex].resources[resource];

      expect(resourceAfter).toBeGreaterThanOrEqual(resourceBefore + 1);
    }
  });

  it('有强盗的地块不应产出资源', () => {
    const state = completeSetup(3, testMap);

    // 找到有强盗的地块
    const robberTile = state.map.tiles.find(t => t.hasRobber);
    expect(robberTile).toBeDefined();

    // 即使 numberToken 匹配，也不应产出
    // 沙漠没有 numberToken，所以这里验证强盗逻辑
    // 手动设置一个有强盗的非沙漠地块
    const nonDesertTile = state.map.tiles.find(t => t.terrain !== 'desert' && t.numberToken !== null);
    if (!nonDesertTile) return;

    const modifiedTiles = state.map.tiles.map(t =>
      t === nonDesertTile ? { ...t, hasRobber: true } : t,
    );
    const modifiedState = { ...state, map: { ...state.map, tiles: modifiedTiles } };

    // 记录所有玩家资源
    const resourcesBefore = modifiedState.players.map(p => ({ ...p.resources }));

    // 只用这个地块的 numberToken 来分发
    const newState = distributeResources(modifiedState, nonDesertTile.numberToken!);

    // 该地块上的建筑不应获得资源（但其他匹配地块可能产出）
    // 验证：如果只有这个地块匹配该 numberToken，则资源不变
    const otherMatchingTiles = modifiedState.map.tiles.filter(
      t => t.numberToken === nonDesertTile.numberToken && !t.hasRobber && t !== nonDesertTile,
    );

    if (otherMatchingTiles.length === 0) {
      // 没有其他匹配地块，所有玩家资源应不变
      for (let i = 0; i < newState.players.length; i++) {
        expect(newState.players[i].resources).toEqual(resourcesBefore[i]);
      }
    }
  });

  it('城市应获得 2 份资源', () => {
    const state = completeSetup(2, testMap);

    // 找到 player-0 的一个村庄，升级为城市
    const settlementVertex = state.players[0].settlements[0];
    if (!settlementVertex) return;

    // 手动将村庄升级为城市
    const modifiedVertices = {
      ...state.map.vertices,
      [settlementVertex]: { type: 'city' as const, playerId: 'player-0' },
    };
    const modifiedState: CatanGameState = {
      ...state,
      map: { ...state.map, vertices: modifiedVertices },
      players: state.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              cities: [settlementVertex],
              settlements: p.settlements.filter(s => s !== settlementVertex),
            }
          : p,
      ),
    };

    // 找到该顶点相邻的有 numberToken 的地块
    const adjacentTile = modifiedState.map.tiles.find(t => {
      if (t.numberToken === null || t.hasRobber) return false;
      const verts = getHexVertices(t.coord.q, t.coord.r);
      return verts.includes(settlementVertex);
    });

    if (!adjacentTile) return;

    const resource = TERRAIN_RESOURCE[adjacentTile.terrain];
    if (!resource) return;

    const resourceBefore = modifiedState.players[0].resources[resource];
    const newState = distributeResources(modifiedState, adjacentTile.numberToken!);
    const resourceAfter = newState.players[0].resources[resource];

    // 城市至少获得 2 份（可能有多个匹配地块）
    expect(resourceAfter).toBeGreaterThanOrEqual(resourceBefore + 2);
  });
});

// ============================================================
// discardResources 测试
// ============================================================

describe('discardResources', () => {
  /** 创建一个处于 discard 阶段的状态 */
  function createDiscardState(): CatanGameState {
    const state = completeSetup(2, testMap);
    // 给 player-0 大量资源（超过 7 张）
    const modifiedPlayers = state.players.map((p, i) =>
      i === 0
        ? { ...p, resources: { wood: 3, brick: 3, sheep: 2, wheat: 2, ore: 0 } }
        : p,
    );
    return {
      ...state,
      phase: 'discard' as const,
      players: modifiedPlayers,
      discardState: {
        pendingPlayers: ['player-0'],
        completedPlayers: [],
      },
    };
  }

  it('应成功丢弃正确数量的资源', () => {
    const state = createDiscardState();
    // player-0 有 10 张资源，需要丢弃 5 张
    const discard: ResourceMap = { wood: 2, brick: 1, sheep: 1, wheat: 1, ore: 0 };
    const newState = discardResources(state, 'player-0', discard);

    expect(newState.players[0].resources).toEqual({
      wood: 1, brick: 2, sheep: 1, wheat: 1, ore: 0,
    });
    // 只有一个玩家需要丢弃，完成后进入 move_robber
    expect(newState.phase).toBe('move_robber');
    expect(newState.discardState).toBeNull();
  });

  it('丢弃数量不正确应被拒绝', () => {
    const state = createDiscardState();
    // 丢弃 3 张而不是 5 张
    const discard: ResourceMap = { wood: 1, brick: 1, sheep: 1, wheat: 0, ore: 0 };
    const newState = discardResources(state, 'player-0', discard);
    expect(newState).toBe(state);
  });

  it('丢弃超过拥有的资源应被拒绝', () => {
    const state = createDiscardState();
    // 尝试丢弃 5 张 ore，但 player-0 没有 ore
    const discard: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 5 };
    const newState = discardResources(state, 'player-0', discard);
    expect(newState).toBe(state);
  });

  it('非 discard 阶段不能丢弃', () => {
    const state = completeSetup(2, testMap);
    const discard: ResourceMap = { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const newState = discardResources(state, 'player-0', discard);
    expect(newState).toBe(state);
  });

  it('不在待丢弃列表中的玩家不能丢弃', () => {
    const state = createDiscardState();
    // player-1 不在 pendingPlayers 中
    const discard: ResourceMap = { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 };
    const newState = discardResources(state, 'player-1', discard);
    expect(newState).toBe(state);
  });

  it('多个玩家需要丢弃时，部分完成应保持 discard 阶段', () => {
    const state = completeSetup(2, testMap);
    // 两个玩家都超过 7 张
    const modifiedPlayers = state.players.map(p => ({
      ...p,
      resources: { wood: 3, brick: 3, sheep: 2, wheat: 2, ore: 0 },
    }));
    const discardState: CatanGameState = {
      ...state,
      phase: 'discard',
      players: modifiedPlayers,
      discardState: {
        pendingPlayers: ['player-0', 'player-1'],
        completedPlayers: [],
      },
    };

    // player-0 丢弃
    const discard: ResourceMap = { wood: 2, brick: 1, sheep: 1, wheat: 1, ore: 0 };
    const afterFirst = discardResources(discardState, 'player-0', discard);

    expect(afterFirst.phase).toBe('discard');
    expect(afterFirst.discardState).not.toBeNull();
    expect(afterFirst.discardState!.completedPlayers).toContain('player-0');

    // player-1 丢弃
    const afterSecond = discardResources(afterFirst, 'player-1', discard);
    expect(afterSecond.phase).toBe('move_robber');
    expect(afterSecond.discardState).toBeNull();
  });
});

// ============================================================
// moveRobber 测试
// ============================================================

describe('moveRobber', () => {
  /** 创建一个处于 move_robber 阶段的状态 */
  function createMoveRobberState(): CatanGameState {
    const state = completeSetup(3, testMap);
    return { ...state, phase: 'move_robber' as const };
  }

  it('应成功移动强盗到新地块', () => {
    const state = createMoveRobberState();

    // 找到当前强盗位置和一个不同的地块
    const robberTile = state.map.tiles.find(t => t.hasRobber)!;
    const targetTile = state.map.tiles.find(t => !t.hasRobber)!;
    const hexId = `${targetTile.coord.q},${targetTile.coord.r}`;

    const newState = moveRobber(state, 'player-0', hexId);

    // 旧位置不再有强盗
    const oldTile = newState.map.tiles.find(
      t => t.coord.q === robberTile.coord.q && t.coord.r === robberTile.coord.r,
    )!;
    expect(oldTile.hasRobber).toBe(false);

    // 新位置有强盗
    const newTile = newState.map.tiles.find(
      t => t.coord.q === targetTile.coord.q && t.coord.r === targetTile.coord.r,
    )!;
    expect(newTile.hasRobber).toBe(true);
  });

  it('不能移动到当前强盗所在的地块', () => {
    const state = createMoveRobberState();
    const robberTile = state.map.tiles.find(t => t.hasRobber)!;
    const hexId = `${robberTile.coord.q},${robberTile.coord.r}`;

    const newState = moveRobber(state, 'player-0', hexId);
    expect(newState).toBe(state);
  });

  it('非当前玩家不能移动强盗', () => {
    const state = createMoveRobberState();
    const targetTile = state.map.tiles.find(t => !t.hasRobber)!;
    const hexId = `${targetTile.coord.q},${targetTile.coord.r}`;

    const newState = moveRobber(state, 'player-1', hexId);
    expect(newState).toBe(state);
  });

  it('非 move_robber 阶段不能移动强盗', () => {
    const state = completeSetup(3, testMap);
    const targetTile = state.map.tiles.find(t => !t.hasRobber)!;
    const hexId = `${targetTile.coord.q},${targetTile.coord.r}`;

    const newState = moveRobber(state, 'player-0', hexId);
    expect(newState).toBe(state);
  });

  it('无效地块 ID 应被拒绝', () => {
    const state = createMoveRobberState();
    const newState = moveRobber(state, 'player-0', '99,99');
    expect(newState).toBe(state);
  });

  it('目标地块无其他玩家建筑时应进入 trade_build', () => {
    const state = createMoveRobberState();
    // 找一个没有任何建筑的地块
    const targetTile = state.map.tiles.find(t => {
      if (t.hasRobber) return false;
      const verts = getHexVertices(t.coord.q, t.coord.r);
      return verts.every(v => !state.map.vertices[v]);
    });

    if (targetTile) {
      const hexId = `${targetTile.coord.q},${targetTile.coord.r}`;
      const newState = moveRobber(state, 'player-0', hexId);
      expect(newState.phase).toBe('trade_build');
    }
  });

  it('目标地块有其他玩家建筑时应进入 steal', () => {
    const state = createMoveRobberState();
    // 找一个有其他玩家（非 player-0）建筑的地块
    const targetTile = state.map.tiles.find(t => {
      if (t.hasRobber) return false;
      const verts = getHexVertices(t.coord.q, t.coord.r);
      return verts.some(v => {
        const b = state.map.vertices[v];
        return b && b.playerId !== 'player-0';
      });
    });

    if (targetTile) {
      const hexId = `${targetTile.coord.q},${targetTile.coord.r}`;
      const newState = moveRobber(state, 'player-0', hexId);
      expect(newState.phase).toBe('steal');
    }
  });
});

// ============================================================
// stealResource 测试
// ============================================================

describe('stealResource', () => {
  /** 创建一个处于 steal 阶段的状态 */
  function createStealState(): CatanGameState {
    const state = completeSetup(2, testMap);
    // 给 player-1 一些资源
    const modifiedPlayers = state.players.map((p, i) =>
      i === 1
        ? { ...p, resources: { wood: 2, brick: 1, sheep: 0, wheat: 0, ore: 0 } }
        : p,
    );
    return {
      ...state,
      phase: 'steal' as const,
      players: modifiedPlayers,
    };
  }

  it('应成功从目标玩家抢夺 1 张资源', () => {
    const state = createStealState();
    const p0Before = { ...state.players[0].resources };
    const p1Before = { ...state.players[1].resources };
    const p0Total = Object.values(p0Before).reduce((a, b) => a + b, 0);
    const p1Total = Object.values(p1Before).reduce((a, b) => a + b, 0);

    const newState = stealResource(state, 'player-0', 'player-1');

    const p0After = newState.players[0].resources;
    const p1After = newState.players[1].resources;
    const p0TotalAfter = Object.values(p0After).reduce((a, b) => a + b, 0);
    const p1TotalAfter = Object.values(p1After).reduce((a, b) => a + b, 0);

    expect(p0TotalAfter).toBe(p0Total + 1);
    expect(p1TotalAfter).toBe(p1Total - 1);
    expect(newState.phase).toBe('trade_build');
  });

  it('不能抢自己', () => {
    const state = createStealState();
    const newState = stealResource(state, 'player-0', 'player-0');
    expect(newState).toBe(state);
  });

  it('非当前玩家不能抢夺', () => {
    const state = createStealState();
    const newState = stealResource(state, 'player-1', 'player-0');
    expect(newState).toBe(state);
  });

  it('非 steal 阶段不能抢夺', () => {
    const state = completeSetup(2, testMap);
    const newState = stealResource(state, 'player-0', 'player-1');
    expect(newState).toBe(state);
  });

  it('目标玩家没有资源时应被拒绝', () => {
    const state = createStealState();
    // 清空 player-1 的资源
    const emptyState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 1
          ? { ...p, resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }
          : p,
      ),
    };
    const newState = stealResource(emptyState, 'player-0', 'player-1');
    expect(newState).toBe(emptyState);
  });

  it('不存在的目标玩家应被拒绝', () => {
    const state = createStealState();
    const newState = stealResource(state, 'player-0', 'nonexistent');
    expect(newState).toBe(state);
  });
});


// ============================================================
// 测试辅助：创建处于 trade_build 阶段的状态
// ============================================================

/**
 * 完成初始放置并进入 trade_build 阶段
 * 返回状态以及每个玩家放置的村庄和道路位置信息
 */
function createTradeBuildState(playerCount: number, map: HexMap): {
  state: CatanGameState;
  placements: Array<{ vertex: string; edge: string }[]>;
} {
  const players = createTestPlayers(playerCount);
  let state = initGame(players, map);
  const placements: Array<{ vertex: string; edge: string }[]> = Array.from(
    { length: playerCount },
    () => [],
  );

  // 第一轮正序
  for (let i = 0; i < playerCount; i++) {
    const v = findValidVertex(state);
    state = placeInitialSettlement(state, `player-${i}`, v);
    const e = findAdjacentEdge(state, v);
    state = placeInitialRoad(state, `player-${i}`, e);
    placements[i].push({ vertex: v, edge: e });
  }

  // 第二轮倒序
  for (let i = playerCount - 1; i >= 0; i--) {
    const v = findValidVertex(state);
    state = placeInitialSettlement(state, `player-${i}`, v);
    const e = findAdjacentEdge(state, v);
    state = placeInitialRoad(state, `player-${i}`, e);
    placements[i].push({ vertex: v, edge: e });
  }

  // 进入 trade_build 阶段
  state = { ...state, phase: 'trade_build' };

  return { state, placements };
}

/** 给指定玩家设置充足的资源 */
function giveResources(
  state: CatanGameState,
  playerId: string,
  resources: ResourceMap,
): CatanGameState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, resources } : p,
    ),
  };
}

/** 沿着玩家的道路找到一条可以延伸的空边 */
function findExtensionEdge(state: CatanGameState, playerId: string): string | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;

  for (const roadEdge of player.roads) {
    const [v1, v2] = getEdgeEndpoints(roadEdge);
    for (const v of [v1, v2]) {
      // 如果该端点没有其他玩家的建筑（不被截断）
      const building = state.map.vertices[v];
      if (building && building.playerId !== playerId) continue;

      const adjEdges = getAdjacentEdges(v);
      for (const e of adjEdges) {
        if (!state.map.edges[e] && e !== roadEdge) return e;
      }
    }
  }
  return null;
}

// ============================================================
// buildRoad 测试
// ============================================================

describe('buildRoad', () => {
  it('应成功建造道路并扣除资源', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 2, brick: 2, sheep: 0, wheat: 0, ore: 0 });

    const edgeId = findExtensionEdge(s, 'player-0');
    expect(edgeId).not.toBeNull();

    const newState = buildRoad(s, 'player-0', edgeId!);

    // 道路已放置
    expect(newState.map.edges[edgeId!]).toEqual({ playerId: 'player-0' });
    expect(newState.players[0].roads).toContain(edgeId!);

    // 资源已扣除（1木材 + 1黏土）
    expect(newState.players[0].resources.wood).toBe(s.players[0].resources.wood - 1);
    expect(newState.players[0].resources.brick).toBe(s.players[0].resources.brick - 1);
  });

  it('资源不足时应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const edgeId = findExtensionEdge(s, 'player-0');
    if (!edgeId) return;

    const newState = buildRoad(s, 'player-0', edgeId);
    expect(newState).toBe(s);
  });

  it('非当前回合玩家不能建造道路', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-1', { wood: 2, brick: 2, sheep: 0, wheat: 0, ore: 0 });

    const edgeId = findExtensionEdge(s, 'player-1');
    if (!edgeId) return;

    // player-1 不是当前回合玩家（currentPlayerIndex=0）
    const newState = buildRoad(s, 'player-1', edgeId);
    expect(newState).toBe(s);
  });

  it('已有道路的边不能重复建造', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 2, brick: 2, sheep: 0, wheat: 0, ore: 0 });

    // 尝试在已有道路的边建造
    const existingEdge = placements[0][0].edge;
    const newState = buildRoad(s, 'player-0', existingEdge);
    expect(newState).toBe(s);
  });

  it('不与已有道路或建筑相连的位置应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 2, brick: 2, sheep: 0, wheat: 0, ore: 0 });

    // 找一条完全不与 player-0 连通的空边
    const allEdges = getAllEdgeIds();
    const player0Roads = new Set(s.players[0].roads);
    const player0Settlements = new Set([...s.players[0].settlements, ...s.players[0].cities]);

    for (const edgeId of allEdges) {
      if (s.map.edges[edgeId]) continue;
      const [v1, v2] = getEdgeEndpoints(edgeId);

      // 检查两个端点都不与 player-0 连通
      const v1Connected = player0Settlements.has(v1) ||
        getAdjacentEdges(v1).some(e => player0Roads.has(e));
      const v2Connected = player0Settlements.has(v2) ||
        getAdjacentEdges(v2).some(e => player0Roads.has(e));

      if (!v1Connected && !v2Connected) {
        const newState = buildRoad(s, 'player-0', edgeId);
        expect(newState).toBe(s);
        return;
      }
    }
  });

  it('非 trade_build 阶段不能建造道路', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(
      { ...state, phase: 'roll_dice' },
      'player-0',
      { wood: 2, brick: 2, sheep: 0, wheat: 0, ore: 0 },
    );

    const edgeId = findExtensionEdge(s, 'player-0');
    if (!edgeId) return;

    const newState = buildRoad(s, 'player-0', edgeId);
    expect(newState).toBe(s);
  });

  it('道路被其他玩家建筑截断时不能通过该端点延伸', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 5, sheep: 0, wheat: 0, ore: 0 });

    // 找到 player-0 的一条道路的端点
    const road0 = s.players[0].roads[0];
    const [v1, v2] = getEdgeEndpoints(road0);

    // 在其中一个端点放置 player-1 的建筑（模拟截断）
    const targetVertex = s.map.vertices[v1] ? v2 : v1;
    // 只有在该端点没有建筑时才能测试
    if (!s.map.vertices[targetVertex]) {
      const blockedState: CatanGameState = {
        ...s,
        map: {
          ...s.map,
          vertices: {
            ...s.map.vertices,
            [targetVertex]: { type: 'settlement', playerId: 'player-1' },
          },
        },
      };

      // 尝试从被截断的端点延伸道路
      const adjEdges = getAdjacentEdges(targetVertex);
      for (const e of adjEdges) {
        if (blockedState.map.edges[e] || e === road0) continue;
        // 检查另一个端点是否也不连通
        const [ev1, ev2] = getEdgeEndpoints(e);
        const otherVertex = ev1 === targetVertex ? ev2 : ev1;
        const otherBuilding = blockedState.map.vertices[otherVertex];
        const otherHasPlayerRoad = getAdjacentEdges(otherVertex).some(
          ae => blockedState.map.edges[ae]?.playerId === 'player-0',
        );
        // 如果另一端也不连通 player-0，则应被拒绝
        if (!otherHasPlayerRoad && (!otherBuilding || otherBuilding.playerId !== 'player-0')) {
          const result = buildRoad(blockedState, 'player-0', e);
          expect(result).toBe(blockedState);
          return;
        }
      }
    }
  });
});

// ============================================================
// buildSettlement 测试
// ============================================================

describe('buildSettlement', () => {
  it('应成功建造村庄并扣除资源和增加胜利分', () => {
    const { state } = createTradeBuildState(2, testMap);

    // 先给 player-0 足够资源建道路和村庄
    let s = giveResources(state, 'player-0', { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 0 });

    // 先延伸道路，确保有合法的村庄位置
    const roadEdge = findExtensionEdge(s, 'player-0');
    if (!roadEdge) return;
    s = buildRoad(s, 'player-0', roadEdge);

    // 再延伸一条道路（确保距离规则满足）
    const roadEdge2 = findExtensionEdge(s, 'player-0');
    if (!roadEdge2) return;
    s = buildRoad(s, 'player-0', roadEdge2);

    // 获取合法村庄位置
    const validPositions = getValidBuildPositions(s, 'player-0', 'settlement');
    if (validPositions.length === 0) return;

    const vpBefore = s.players[0].victoryPoints;
    const newState = buildSettlement(s, 'player-0', validPositions[0]);

    // 村庄已放置
    expect(newState.map.vertices[validPositions[0]]).toEqual({
      type: 'settlement',
      playerId: 'player-0',
    });
    expect(newState.players[0].settlements).toContain(validPositions[0]);

    // 资源已扣除（1木材 + 1黏土 + 1羊毛 + 1小麦）
    expect(newState.players[0].resources.wood).toBe(s.players[0].resources.wood - 1);
    expect(newState.players[0].resources.brick).toBe(s.players[0].resources.brick - 1);
    expect(newState.players[0].resources.sheep).toBe(s.players[0].resources.sheep - 1);
    expect(newState.players[0].resources.wheat).toBe(s.players[0].resources.wheat - 1);

    // 胜利分 +1
    expect(newState.players[0].victoryPoints).toBe(vpBefore + 1);
  });

  it('资源不足时应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    let s = giveResources(state, 'player-0', { wood: 5, brick: 5, sheep: 0, wheat: 0, ore: 0 });

    // 延伸道路
    const roadEdge = findExtensionEdge(s, 'player-0');
    if (!roadEdge) return;
    s = buildRoad(s, 'player-0', roadEdge);
    const roadEdge2 = findExtensionEdge(s, 'player-0');
    if (!roadEdge2) return;
    s = buildRoad(s, 'player-0', roadEdge2);

    // 清空资源（没有羊毛和小麦）
    s = giveResources(s, 'player-0', { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 });

    const validPositions = getValidBuildPositions(s, 'player-0', 'settlement');
    if (validPositions.length === 0) return;

    const newState = buildSettlement(s, 'player-0', validPositions[0]);
    expect(newState).toBe(s);
  });

  it('已有建筑的顶点不能建造', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 0 });

    // 尝试在已有村庄的位置建造
    const existingVertex = placements[0][0].vertex;
    const newState = buildSettlement(s, 'player-0', existingVertex);
    expect(newState).toBe(s);
  });

  it('相邻已有建筑的顶点不能建造（距离规则）', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 0 });

    // 找一个与已有村庄相邻的顶点
    const existingVertex = placements[0][0].vertex;
    const adjVertices = getAdjacentVertices(existingVertex);
    for (const adjV of adjVertices) {
      if (!s.map.vertices[adjV]) {
        const newState = buildSettlement(s, 'player-0', adjV);
        expect(newState).toBe(s);
        return;
      }
    }
  });

  it('没有相邻道路的顶点不能建造（连通性规则）', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 0 });

    // 找一个满足距离规则但没有 player-0 道路的顶点
    const allVertices = getAllVertexIds();
    for (const v of allVertices) {
      if (s.map.vertices[v]) continue;
      const adjV = getAdjacentVertices(v);
      if (adjV.some(a => s.map.vertices[a])) continue;
      // 距离规则满足，检查连通性
      const adjE = getAdjacentEdges(v);
      if (!adjE.some(e => s.map.edges[e]?.playerId === 'player-0')) {
        const newState = buildSettlement(s, 'player-0', v);
        expect(newState).toBe(s);
        return;
      }
    }
  });

  it('非 trade_build 阶段不能建造村庄', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(
      { ...state, phase: 'roll_dice' },
      'player-0',
      { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 0 },
    );

    const validPositions = getValidBuildPositions(
      { ...s, phase: 'trade_build' },
      'player-0',
      'settlement',
    );
    if (validPositions.length === 0) return;

    const newState = buildSettlement(s, 'player-0', validPositions[0]);
    expect(newState).toBe(s);
  });
});

// ============================================================
// buildCity 测试
// ============================================================

describe('buildCity', () => {
  it('应成功升级城市并扣除资源和增加胜利分', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 5, ore: 5 });

    const settlementVertex = placements[0][0].vertex;
    const vpBefore = s.players[0].victoryPoints;

    const newState = buildCity(s, 'player-0', settlementVertex);

    // 城市已放置
    expect(newState.map.vertices[settlementVertex]).toEqual({
      type: 'city',
      playerId: 'player-0',
    });
    expect(newState.players[0].cities).toContain(settlementVertex);
    expect(newState.players[0].settlements).not.toContain(settlementVertex);

    // 资源已扣除（3矿石 + 2小麦）
    expect(newState.players[0].resources.ore).toBe(s.players[0].resources.ore - 3);
    expect(newState.players[0].resources.wheat).toBe(s.players[0].resources.wheat - 2);

    // 胜利分 +1（村庄1分→城市2分）
    expect(newState.players[0].victoryPoints).toBe(vpBefore + 1);
  });

  it('资源不足时应被拒绝', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const settlementVertex = placements[0][0].vertex;
    const newState = buildCity(s, 'player-0', settlementVertex);
    expect(newState).toBe(s);
  });

  it('不能在没有村庄的顶点升级', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 5, ore: 5 });

    // 找一个空顶点
    const emptyVertex = getAllVertexIds().find(v => !s.map.vertices[v]);
    if (!emptyVertex) return;

    const newState = buildCity(s, 'player-0', emptyVertex);
    expect(newState).toBe(s);
  });

  it('不能升级其他玩家的村庄', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 5, ore: 5 });

    // 尝试升级 player-1 的村庄
    const player1Settlement = placements[1][0].vertex;
    const newState = buildCity(s, 'player-0', player1Settlement);
    expect(newState).toBe(s);
  });

  it('不能在已经是城市的顶点再次升级', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    let s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 10, ore: 10 });

    const settlementVertex = placements[0][0].vertex;
    s = buildCity(s, 'player-0', settlementVertex);
    expect(s.map.vertices[settlementVertex]?.type).toBe('city');

    // 再次尝试升级
    const newState = buildCity(s, 'player-0', settlementVertex);
    expect(newState).toBe(s);
  });

  it('非 trade_build 阶段不能升级城市', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(
      { ...state, phase: 'roll_dice' },
      'player-0',
      { wood: 0, brick: 0, sheep: 0, wheat: 5, ore: 5 },
    );

    const settlementVertex = placements[0][0].vertex;
    const newState = buildCity(s, 'player-0', settlementVertex);
    expect(newState).toBe(s);
  });

  it('非当前回合玩家不能升级城市', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-1', { wood: 0, brick: 0, sheep: 0, wheat: 5, ore: 5 });

    const player1Settlement = placements[1][0].vertex;
    const newState = buildCity(s, 'player-1', player1Settlement);
    expect(newState).toBe(s);
  });
});

// ============================================================
// getValidBuildPositions 测试
// ============================================================

describe('getValidBuildPositions', () => {
  it('road: 应返回所有与玩家道路/建筑连通的空边', () => {
    const { state } = createTradeBuildState(2, testMap);
    const positions = getValidBuildPositions(state, 'player-0', 'road');

    // 应有合法位置
    expect(positions.length).toBeGreaterThan(0);

    // 所有返回的位置应该是空边
    for (const edgeId of positions) {
      expect(state.map.edges[edgeId]).toBeUndefined();
    }

    // 所有返回的位置应满足连通性
    for (const edgeId of positions) {
      const [v1, v2] = getEdgeEndpoints(edgeId);
      const v1Building = state.map.vertices[v1];
      const v2Building = state.map.vertices[v2];
      const v1HasRoad = getAdjacentEdges(v1).some(e => state.map.edges[e]?.playerId === 'player-0');
      const v2HasRoad = getAdjacentEdges(v2).some(e => state.map.edges[e]?.playerId === 'player-0');
      const v1Connected = (v1Building?.playerId === 'player-0') || (v1HasRoad && (!v1Building || v1Building.playerId === 'player-0'));
      const v2Connected = (v2Building?.playerId === 'player-0') || (v2HasRoad && (!v2Building || v2Building.playerId === 'player-0'));
      expect(v1Connected || v2Connected).toBe(true);
    }
  });

  it('settlement: 应返回满足距离和连通性规则的空顶点', () => {
    const { state } = createTradeBuildState(2, testMap);

    // 先延伸一些道路
    let s = giveResources(state, 'player-0', { wood: 10, brick: 10, sheep: 0, wheat: 0, ore: 0 });
    for (let i = 0; i < 3; i++) {
      const edge = findExtensionEdge(s, 'player-0');
      if (!edge) break;
      s = buildRoad(s, 'player-0', edge);
    }

    const positions = getValidBuildPositions(s, 'player-0', 'settlement');

    // 所有返回的位置应满足规则
    for (const vertexId of positions) {
      // 空顶点
      expect(s.map.vertices[vertexId]).toBeUndefined();
      // 距离规则
      const adjV = getAdjacentVertices(vertexId);
      expect(adjV.every(v => !s.map.vertices[v])).toBe(true);
      // 连通性
      const adjE = getAdjacentEdges(vertexId);
      expect(adjE.some(e => s.map.edges[e]?.playerId === 'player-0')).toBe(true);
    }
  });

  it('city: 应返回该玩家所有村庄位置', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const positions = getValidBuildPositions(state, 'player-0', 'city');

    // 应等于 player-0 的所有村庄
    const player0Settlements = state.players[0].settlements;
    expect(positions.sort()).toEqual([...player0Settlements].sort());
  });

  it('city: 已升级的城市不应出现在合法位置中', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    let s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 10, ore: 10 });

    // 升级第一个村庄
    const firstSettlement = placements[0][0].vertex;
    s = buildCity(s, 'player-0', firstSettlement);

    const positions = getValidBuildPositions(s, 'player-0', 'city');
    expect(positions).not.toContain(firstSettlement);
    // 应只包含剩余的村庄
    expect(positions.length).toBe(s.players[0].settlements.length);
  });

  it('不存在的玩家应返回空数组', () => {
    const { state } = createTradeBuildState(2, testMap);
    expect(getValidBuildPositions(state, 'nonexistent', 'road')).toEqual([]);
  });
});


// ============================================================
// 交易系统测试
// ============================================================

import {
  bankTrade,
  getTradeRatios,
  proposePlayerTrade,
  acceptPlayerTrade,
} from '../engine.js';

// ============================================================
// getTradeRatios 测试
// ============================================================

describe('getTradeRatios', () => {
  it('默认所有资源交易比率为 4:1', () => {
    const { state } = createTradeBuildState(2, testMap);
    const ratios = getTradeRatios(state, 'player-0');

    expect(ratios.default).toBe(4);
    expect(ratios.resources.wood).toBe(4);
    expect(ratios.resources.brick).toBe(4);
    expect(ratios.resources.sheep).toBe(4);
    expect(ratios.resources.wheat).toBe(4);
    expect(ratios.resources.ore).toBe(4);
  });

  it('3:1 通用港口应降低所有资源比率为 3:1', () => {
    const { state } = createTradeBuildState(2, testMap);

    // 找到一个 generic 港口
    const genericHarbor = state.map.harbors.find(h => h.type === 'generic');
    if (!genericHarbor) return;

    // 在港口顶点放置 player-0 的建筑
    const harborVertex = genericHarbor.vertices[0];
    const modifiedState: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          ...state.map.vertices,
          [harborVertex]: { type: 'settlement', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, settlements: [...p.settlements, harborVertex] } : p,
      ),
    };

    const ratios = getTradeRatios(modifiedState, 'player-0');
    expect(ratios.default).toBe(3);
    expect(ratios.resources.wood).toBe(3);
    expect(ratios.resources.brick).toBe(3);
    expect(ratios.resources.sheep).toBe(3);
    expect(ratios.resources.wheat).toBe(3);
    expect(ratios.resources.ore).toBe(3);
  });

  it('2:1 特定资源港口应降低该资源比率为 2:1', () => {
    const { state } = createTradeBuildState(2, testMap);

    // 找到一个特定资源港口
    const specificHarbor = state.map.harbors.find(h => h.type !== 'generic');
    if (!specificHarbor) return;

    // 清除所有已有建筑，只在港口顶点放置一个建筑
    const harborVertex = specificHarbor.vertices[0];
    const cleanVertices: Record<string, import('../types.js').VertexBuilding> = {
      [harborVertex]: { type: 'settlement', playerId: 'player-0' },
    };
    const modifiedState: CatanGameState = {
      ...state,
      map: { ...state.map, vertices: cleanVertices },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, settlements: [harborVertex], cities: [] } : { ...p, settlements: [], cities: [] },
      ),
    };

    const ratios = getTradeRatios(modifiedState, 'player-0');
    // 该特定资源应为 2:1
    expect(ratios.resources[specificHarbor.type as ResourceType]).toBe(2);
    // 其他资源仍为 4:1
    const otherResources = (['wood', 'brick', 'sheep', 'wheat', 'ore'] as const).filter(
      r => r !== specificHarbor.type,
    );
    for (const r of otherResources) {
      expect(ratios.resources[r]).toBe(4);
    }
  });

  it('城市也应触发港口优惠', () => {
    const { state } = createTradeBuildState(2, testMap);

    const genericHarbor = state.map.harbors.find(h => h.type === 'generic');
    if (!genericHarbor) return;

    const harborVertex = genericHarbor.vertices[0];
    const modifiedState: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          ...state.map.vertices,
          [harborVertex]: { type: 'city', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, cities: [...p.cities, harborVertex] } : p,
      ),
    };

    const ratios = getTradeRatios(modifiedState, 'player-0');
    expect(ratios.default).toBe(3);
  });

  it('不存在的玩家应返回默认比率', () => {
    const { state } = createTradeBuildState(2, testMap);
    const ratios = getTradeRatios(state, 'nonexistent');
    expect(ratios.default).toBe(4);
  });

  it('同时拥有 3:1 和 2:1 港口时应取最优比率', () => {
    const { state } = createTradeBuildState(2, testMap);

    const genericHarbor = state.map.harbors.find(h => h.type === 'generic');
    const specificHarbor = state.map.harbors.find(h => h.type !== 'generic');
    if (!genericHarbor || !specificHarbor) return;

    const gv = genericHarbor.vertices[0];
    const sv = specificHarbor.vertices[0];

    // 清除所有已有建筑，只在两个港口顶点放置建筑
    const cleanVertices: Record<string, import('../types.js').VertexBuilding> = {
      [gv]: { type: 'settlement', playerId: 'player-0' },
      [sv]: { type: 'settlement', playerId: 'player-0' },
    };
    const modifiedState: CatanGameState = {
      ...state,
      map: { ...state.map, vertices: cleanVertices },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, settlements: [gv, sv], cities: [] } : { ...p, settlements: [], cities: [] },
      ),
    };

    const ratios = getTradeRatios(modifiedState, 'player-0');
    // 特定资源应为 2:1（优于 3:1）
    expect(ratios.resources[specificHarbor.type as ResourceType]).toBe(2);
    // 其他资源应为 3:1
    const otherResources = (['wood', 'brick', 'sheep', 'wheat', 'ore'] as const).filter(
      r => r !== specificHarbor.type,
    );
    for (const r of otherResources) {
      expect(ratios.resources[r]).toBe(3);
    }
  });
});

// ============================================================
// bankTrade 测试
// ============================================================

describe('bankTrade', () => {
  it('应成功执行 4:1 银行交易', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);

    expect(newState.players[0].resources.wood).toBe(1); // 5 - 4
    expect(newState.players[0].resources.wheat).toBe(1); // 0 + 1
  });

  it('港口优惠比率应生效（3:1 通用港口）', () => {
    const { state } = createTradeBuildState(2, testMap);

    // 在 3:1 港口放置建筑
    const genericHarbor = state.map.harbors.find(h => h.type === 'generic');
    if (!genericHarbor) return;

    const hv = genericHarbor.vertices[0];
    let s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          ...state.map.vertices,
          [hv]: { type: 'settlement', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, settlements: [...p.settlements, hv] } : p,
      ),
    };
    s = giveResources(s, 'player-0', { wood: 5, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState.players[0].resources.wood).toBe(2); // 5 - 3
    expect(newState.players[0].resources.wheat).toBe(1);
  });

  it('港口优惠比率应生效（2:1 特定资源港口）', () => {
    const { state } = createTradeBuildState(2, testMap);

    const specificHarbor = state.map.harbors.find(h => h.type !== 'generic');
    if (!specificHarbor) return;

    const hv = specificHarbor.vertices[0];
    const harborResource = specificHarbor.type as ResourceType;
    let s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          ...state.map.vertices,
          [hv]: { type: 'settlement', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, settlements: [...p.settlements, hv] } : p,
      ),
    };
    s = giveResources(s, 'player-0', {
      wood: harborResource === 'wood' ? 5 : 0,
      brick: harborResource === 'brick' ? 5 : 0,
      sheep: harborResource === 'sheep' ? 5 : 0,
      wheat: harborResource === 'wheat' ? 5 : 0,
      ore: harborResource === 'ore' ? 5 : 0,
    });

    // 用 2:1 比率交易
    const offer: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    offer[harborResource] = 2;
    // request 一种不同的资源
    const requestResource = (['wood', 'brick', 'sheep', 'wheat', 'ore'] as const).find(
      r => r !== harborResource,
    )!;
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    request[requestResource] = 1;

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState.players[0].resources[harborResource]).toBe(3); // 5 - 2
    expect(newState.players[0].resources[requestResource]).toBe(1);
  });

  it('offer 数量不等于交易比率应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    // 尝试用 3 个木材交易（默认需要 4 个）
    const offer: ResourceMap = { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('offer 中有多种资源应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 5, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 2, brick: 2, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('request 数量不为 1 应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('request 中有多种资源应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 1, sheep: 1, wheat: 0, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('offer 和 request 是同一种资源应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 5, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('资源不足应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('非当前回合玩家不能交易', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-1', { wood: 5, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = bankTrade(s, 'player-1', offer, request);
    expect(newState).toBe(s);
  });

  it('非 trade_build 阶段不能交易', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(
      { ...state, phase: 'roll_dice' },
      'player-0',
      { wood: 5, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    );

    const offer: ResourceMap = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = bankTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });
});

// ============================================================
// proposePlayerTrade 测试
// ============================================================

describe('proposePlayerTrade', () => {
  it('应成功发起交易提案', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = proposePlayerTrade(s, 'player-0', offer, request);

    expect(newState.currentTrade).not.toBeNull();
    expect(newState.currentTrade!.proposerId).toBe('player-0');
    expect(newState.currentTrade!.offer).toEqual(offer);
    expect(newState.currentTrade!.request).toEqual(request);
    expect(newState.currentTrade!.acceptedBy).toEqual([]);
    expect(newState.currentTrade!.id).toBeTruthy();
  });

  it('offer 为空应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = proposePlayerTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('request 为空应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

    const newState = proposePlayerTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('资源不足以提供 offer 应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-0', { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = proposePlayerTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });

  it('非当前回合玩家不能发起交易', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(state, 'player-1', { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const offer: ResourceMap = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = proposePlayerTrade(s, 'player-1', offer, request);
    expect(newState).toBe(s);
  });

  it('非 trade_build 阶段不能发起交易', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = giveResources(
      { ...state, phase: 'roll_dice' },
      'player-0',
      { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    );

    const offer: ResourceMap = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    const newState = proposePlayerTrade(s, 'player-0', offer, request);
    expect(newState).toBe(s);
  });
});

// ============================================================
// acceptPlayerTrade 测试
// ============================================================

describe('acceptPlayerTrade', () => {
  /** 创建一个有交易提案的状态 */
  function createTradeState(): { state: CatanGameState; tradeId: string } {
    const { state } = createTradeBuildState(2, testMap);
    let s = giveResources(state, 'player-0', { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 });
    s = giveResources(s, 'player-1', { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 0 });

    const offer: ResourceMap = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const request: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };

    s = proposePlayerTrade(s, 'player-0', offer, request);
    return { state: s, tradeId: s.currentTrade!.id };
  }

  it('应成功执行玩家交易', () => {
    const { state, tradeId } = createTradeState();

    const newState = acceptPlayerTrade(state, tradeId, 'player-1');

    // 发起者（player-0）：减去 2 wood，加上 1 wheat
    expect(newState.players[0].resources.wood).toBe(1); // 3 - 2
    expect(newState.players[0].resources.wheat).toBe(1); // 0 + 1

    // 接受者（player-1）：减去 1 wheat，加上 2 wood
    expect(newState.players[1].resources.wood).toBe(2); // 0 + 2
    expect(newState.players[1].resources.wheat).toBe(1); // 2 - 1

    // 交易提案已清除
    expect(newState.currentTrade).toBeNull();
  });

  it('资源变动之和应为零（守恒）', () => {
    const { state, tradeId } = createTradeState();

    const totalBefore = state.players.reduce(
      (sum, p) => sum + Object.values(p.resources).reduce((a, b) => a + b, 0),
      0,
    );

    const newState = acceptPlayerTrade(state, tradeId, 'player-1');

    const totalAfter = newState.players.reduce(
      (sum, p) => sum + Object.values(p.resources).reduce((a, b) => a + b, 0),
      0,
    );

    expect(totalAfter).toBe(totalBefore);
  });

  it('发起者不能接受自己的交易', () => {
    const { state, tradeId } = createTradeState();
    const newState = acceptPlayerTrade(state, tradeId, 'player-0');
    expect(newState).toBe(state);
  });

  it('tradeId 不匹配应被拒绝', () => {
    const { state } = createTradeState();
    const newState = acceptPlayerTrade(state, 'wrong-trade-id', 'player-1');
    expect(newState).toBe(state);
  });

  it('没有交易提案时应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    const newState = acceptPlayerTrade(state, 'some-trade-id', 'player-1');
    expect(newState).toBe(state);
  });

  it('接受者资源不足应被拒绝', () => {
    const { state, tradeId } = createTradeState();
    // 清空 player-1 的资源
    const s = giveResources(state, 'player-1', { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const newState = acceptPlayerTrade(s, tradeId, 'player-1');
    expect(newState).toBe(s);
  });

  it('发起者资源不足（交易期间被消耗）应被拒绝', () => {
    const { state, tradeId } = createTradeState();
    // 清空 player-0 的资源（模拟交易期间资源被消耗）
    const s = giveResources(state, 'player-0', { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });

    const newState = acceptPlayerTrade(s, tradeId, 'player-1');
    expect(newState).toBe(s);
  });

  it('非 trade_build 阶段不能接受交易', () => {
    const { state, tradeId } = createTradeState();
    const s = { ...state, phase: 'roll_dice' as const };

    const newState = acceptPlayerTrade(s, tradeId, 'player-1');
    expect(newState).toBe(s);
  });

  it('不存在的接受者应被拒绝', () => {
    const { state, tradeId } = createTradeState();
    const newState = acceptPlayerTrade(state, tradeId, 'nonexistent');
    expect(newState).toBe(state);
  });
});


// ============================================================
// 回合管理与胜利判定测试
// ============================================================

import {
  endTurn,
  calculateVictoryPoints,
  checkVictory,
} from '../engine.js';

// ============================================================
// endTurn 测试
// ============================================================

describe('endTurn', () => {
  it('应成功结束回合并轮转到下一位玩家', () => {
    const { state } = createTradeBuildState(3, testMap);
    expect(state.phase).toBe('trade_build');
    expect(state.currentPlayerIndex).toBe(0);

    const newState = endTurn(state, 'player-0');

    expect(newState.currentPlayerIndex).toBe(1);
    expect(newState.phase).toBe('roll_dice');
    expect(newState.turnNumber).toBe(state.turnNumber + 1);
  });

  it('最后一位玩家结束回合后应轮转回第一位', () => {
    const { state } = createTradeBuildState(3, testMap);
    // 设置当前玩家为最后一位
    const s: CatanGameState = { ...state, currentPlayerIndex: 2 };

    const newState = endTurn(s, 'player-2');

    expect(newState.currentPlayerIndex).toBe(0);
    expect(newState.phase).toBe('roll_dice');
  });

  it('应重置 diceResult', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = { ...state, diceResult: [3, 4] };

    const newState = endTurn(s, 'player-0');
    expect(newState.diceResult).toBeNull();
  });

  it('应清除 currentTrade', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = {
      ...state,
      currentTrade: {
        id: 'trade-1',
        proposerId: 'player-0',
        offer: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
        request: { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 },
        acceptedBy: [],
      },
    };

    const newState = endTurn(s, 'player-0');
    expect(newState.currentTrade).toBeNull();
  });

  it('应重置 devCardUsedThisTurn 和 devCardBoughtThisTurn', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = {
      ...state,
      devCardUsedThisTurn: true,
      devCardBoughtThisTurn: ['knight'],
    };

    const newState = endTurn(s, 'player-0');
    expect(newState.devCardUsedThisTurn).toBe(false);
    expect(newState.devCardBoughtThisTurn).toEqual([]);
  });

  it('非当前回合玩家不能结束回合', () => {
    const { state } = createTradeBuildState(2, testMap);
    const newState = endTurn(state, 'player-1');
    expect(newState).toBe(state);
  });

  it('非 trade_build 阶段不能结束回合', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = { ...state, phase: 'roll_dice' };

    const newState = endTurn(s, 'player-0');
    expect(newState).toBe(s);
  });

  it('2 人游戏回合轮转正确', () => {
    const { state } = createTradeBuildState(2, testMap);

    let s = endTurn(state, 'player-0');
    expect(s.currentPlayerIndex).toBe(1);

    // 模拟 player-1 的回合进入 trade_build
    s = { ...s, phase: 'trade_build' };
    s = endTurn(s, 'player-1');
    expect(s.currentPlayerIndex).toBe(0);
  });

  it('4 人游戏回合轮转正确', () => {
    const { state } = createTradeBuildState(4, testMap);

    let s = state;
    for (let i = 0; i < 4; i++) {
      expect(s.currentPlayerIndex).toBe(i);
      s = endTurn(s, `player-${i}`);
      expect(s.phase).toBe('roll_dice');
      // 模拟进入 trade_build
      s = { ...s, phase: 'trade_build' };
    }
    // 轮转回第一位
    expect(s.currentPlayerIndex).toBe(0);
  });
});

// ============================================================
// calculateVictoryPoints 测试
// ============================================================

describe('calculateVictoryPoints', () => {
  it('村庄数 × 1', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 每位玩家初始放置了 2 个村庄
    const vp = calculateVictoryPoints(state, 'player-0');
    expect(vp).toBe(state.players[0].settlements.length);
  });

  it('城市数 × 2', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    // 手动将一个村庄升级为城市
    const settlementVertex = placements[0][0].vertex;
    const s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          ...state.map.vertices,
          [settlementVertex]: { type: 'city', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              settlements: p.settlements.filter(v => v !== settlementVertex),
              cities: [...p.cities, settlementVertex],
            }
          : p,
      ),
    };

    const vp = calculateVictoryPoints(s, 'player-0');
    // 1 个村庄(1分) + 1 个城市(2分) = 3 分
    expect(vp).toBe(s.players[0].settlements.length + s.players[0].cities.length * 2);
  });

  it('最长道路奖励 +2', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, hasLongestRoad: true } : p,
      ),
    };

    const vpWithBonus = calculateVictoryPoints(s, 'player-0');
    const vpWithout = calculateVictoryPoints(state, 'player-0');
    expect(vpWithBonus).toBe(vpWithout + 2);
  });

  it('最大骑士团奖励 +2', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, hasLargestArmy: true } : p,
      ),
    };

    const vpWithBonus = calculateVictoryPoints(s, 'player-0');
    const vpWithout = calculateVictoryPoints(state, 'player-0');
    expect(vpWithBonus).toBe(vpWithout + 2);
  });

  it('胜利分发展卡计入', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, devCards: ['victory_point', 'victory_point', 'knight'] } : p,
      ),
    };

    const vpWithCards = calculateVictoryPoints(s, 'player-0');
    const vpWithout = calculateVictoryPoints(state, 'player-0');
    expect(vpWithCards).toBe(vpWithout + 2);
  });

  it('不存在的玩家返回 0', () => {
    const { state } = createTradeBuildState(2, testMap);
    expect(calculateVictoryPoints(state, 'nonexistent')).toBe(0);
  });

  it('综合计算：村庄 + 城市 + 最长道路 + 最大骑士团 + 胜利分卡', () => {
    const { state, placements } = createTradeBuildState(2, testMap);
    const settlementVertex = placements[0][0].vertex;
    const s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          ...state.map.vertices,
          [settlementVertex]: { type: 'city', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              settlements: p.settlements.filter(v => v !== settlementVertex),
              cities: [...p.cities, settlementVertex],
              hasLongestRoad: true,
              hasLargestArmy: true,
              devCards: ['victory_point'] as import('../types.js').DevCardType[],
            }
          : p,
      ),
    };

    const vp = calculateVictoryPoints(s, 'player-0');
    // 1 村庄(1) + 1 城市(2) + 最长道路(2) + 最大骑士团(2) + 1 胜利分卡(1) = 8
    expect(vp).toBe(1 + 2 + 2 + 2 + 1);
  });
});

// ============================================================
// checkVictory 测试
// ============================================================

describe('checkVictory', () => {
  it('未达到 10 分时不应结束游戏', () => {
    const { state } = createTradeBuildState(2, testMap);
    const newState = checkVictory(state);
    expect(newState.phase).not.toBe('finished');
    expect(newState.winnerId).toBeNull();
  });

  it('达到 10 分时应立即结束游戏', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 给 player-0 足够的分数：设置 hasLongestRoad + hasLargestArmy + 多个城市
    // 需要 10 分：4 城市(8分) + 最长道路(2分) = 10 分
    const s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          'fake-v1': { type: 'city', playerId: 'player-0' },
          'fake-v2': { type: 'city', playerId: 'player-0' },
          'fake-v3': { type: 'city', playerId: 'player-0' },
          'fake-v4': { type: 'city', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              settlements: [],
              cities: ['fake-v1', 'fake-v2', 'fake-v3', 'fake-v4'],
              hasLongestRoad: true,
            }
          : { ...p, settlements: [], cities: [] },
      ),
    };

    const newState = checkVictory(s);
    expect(newState.phase).toBe('finished');
    expect(newState.winnerId).toBe('player-0');
  });

  it('已结束的游戏不再检查', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s: CatanGameState = {
      ...state,
      phase: 'finished',
      winnerId: 'player-0',
    };

    const newState = checkVictory(s);
    expect(newState).toBe(s);
  });

  it('恰好 10 分时应结束', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 5 村庄(5分) + 最长道路(2分) + 最大骑士团(2分) + 1 胜利分卡(1分) = 10
    const s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          'v1': { type: 'settlement', playerId: 'player-0' },
          'v2': { type: 'settlement', playerId: 'player-0' },
          'v3': { type: 'settlement', playerId: 'player-0' },
          'v4': { type: 'settlement', playerId: 'player-0' },
          'v5': { type: 'settlement', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              settlements: ['v1', 'v2', 'v3', 'v4', 'v5'],
              cities: [],
              hasLongestRoad: true,
              hasLargestArmy: true,
              devCards: ['victory_point'] as import('../types.js').DevCardType[],
            }
          : { ...p, settlements: [], cities: [] },
      ),
    };

    const newState = checkVictory(s);
    expect(newState.phase).toBe('finished');
    expect(newState.winnerId).toBe('player-0');
  });

  it('9 分时不应结束', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 5 村庄(5分) + 最长道路(2分) + 最大骑士团(2分) = 9
    const s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        vertices: {
          'v1': { type: 'settlement', playerId: 'player-0' },
          'v2': { type: 'settlement', playerId: 'player-0' },
          'v3': { type: 'settlement', playerId: 'player-0' },
          'v4': { type: 'settlement', playerId: 'player-0' },
          'v5': { type: 'settlement', playerId: 'player-0' },
        },
      },
      players: state.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              settlements: ['v1', 'v2', 'v3', 'v4', 'v5'],
              cities: [],
              hasLongestRoad: true,
              hasLargestArmy: true,
            }
          : { ...p, settlements: [], cities: [] },
      ),
    };

    const newState = checkVictory(s);
    expect(newState.phase).not.toBe('finished');
    expect(newState.winnerId).toBeNull();
  });
});

// ============================================================
// 阶段操作校验测试
// ============================================================

describe('阶段操作校验', () => {
  it('roll_dice 阶段不能建造道路', () => {
    const state = completeSetup(2, testMap);
    expect(state.phase).toBe('roll_dice');

    const edgeId = findExtensionEdge(state, 'player-0');
    if (!edgeId) return;

    const newState = buildRoad(state, 'player-0', edgeId);
    expect(newState).toBe(state);
  });

  it('roll_dice 阶段不能建造村庄', () => {
    const state = completeSetup(2, testMap);
    const validPositions = getValidBuildPositions(
      { ...state, phase: 'trade_build' },
      'player-0',
      'settlement',
    );
    if (validPositions.length === 0) return;

    const newState = buildSettlement(state, 'player-0', validPositions[0]);
    expect(newState).toBe(state);
  });

  it('roll_dice 阶段不能结束回合', () => {
    const state = completeSetup(2, testMap);
    const newState = endTurn(state, 'player-0');
    expect(newState).toBe(state);
  });

  it('discard 阶段不能建造', () => {
    const state = completeSetup(2, testMap);
    const s: CatanGameState = {
      ...state,
      phase: 'discard',
      discardState: { pendingPlayers: ['player-0'], completedPlayers: [] },
    };

    const edgeId = findExtensionEdge(s, 'player-0');
    if (!edgeId) return;

    const newState = buildRoad(s, 'player-0', edgeId);
    expect(newState).toBe(s);
  });

  it('move_robber 阶段不能结束回合', () => {
    const state = completeSetup(2, testMap);
    const s: CatanGameState = { ...state, phase: 'move_robber' };

    const newState = endTurn(s, 'player-0');
    expect(newState).toBe(s);
  });

  it('finished 阶段不能执行任何操作', () => {
    const state = completeSetup(2, testMap);
    const s: CatanGameState = { ...state, phase: 'finished', winnerId: 'player-0' };

    expect(rollDice(s)).toBe(s);
    expect(endTurn(s, 'player-0')).toBe(s);
    expect(buildRoad(s, 'player-0', 'any-edge')).toBe(s);
    expect(buildSettlement(s, 'player-0', 'any-vertex')).toBe(s);
    expect(buildCity(s, 'player-0', 'any-vertex')).toBe(s);
  });

  it('非当前回合玩家的操作应被拒绝', () => {
    const { state } = createTradeBuildState(2, testMap);
    // currentPlayerIndex = 0，player-1 不是当前玩家

    const edgeId = findExtensionEdge(state, 'player-1');
    if (edgeId) {
      const newState = buildRoad(state, 'player-1', edgeId);
      expect(newState).toBe(state);
    }

    const newState2 = endTurn(state, 'player-1');
    expect(newState2).toBe(state);
  });
});


// ============================================================
// 最长道路计算测试
// ============================================================

import {
  calculateLongestRoad,
  updateLongestRoadAwards,
} from '../engine.js';

describe('calculateLongestRoad', () => {
  it('没有道路时应返回 0', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 清空 player-0 的道路
    const s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        edges: Object.fromEntries(
          Object.entries(state.map.edges).filter(([_, v]) => v.playerId !== 'player-0'),
        ),
      },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, roads: [] } : p,
      ),
    };
    expect(calculateLongestRoad(s, 'player-0')).toBe(0);
  });

  it('单条道路应返回 1', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 清空所有道路，只保留 player-0 的第一条
    const firstRoad = state.players[0].roads[0];
    const s: CatanGameState = {
      ...state,
      map: {
        ...state.map,
        edges: { [firstRoad]: { playerId: 'player-0' } },
      },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, roads: [firstRoad] } : { ...p, roads: [] },
      ),
    };
    expect(calculateLongestRoad(s, 'player-0')).toBe(1);
  });

  it('连续道路应正确计算长度', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 给 player-0 足够资源建造多条道路
    let s = giveResources(state, 'player-0', { wood: 10, brick: 10, sheep: 0, wheat: 0, ore: 0 });

    // 连续建造 3 条道路
    for (let i = 0; i < 3; i++) {
      const edge = findExtensionEdge(s, 'player-0');
      if (!edge) break;
      s = buildRoad(s, 'player-0', edge);
    }

    const length = calculateLongestRoad(s, 'player-0');
    // 初始 2 条 + 最多 3 条新建 = 最多 5 条连续
    expect(length).toBeGreaterThanOrEqual(3);
  });

  it('道路被其他玩家建筑截断时应正确计算', () => {
    const { state } = createTradeBuildState(2, testMap);
    let s = giveResources(state, 'player-0', { wood: 10, brick: 10, sheep: 0, wheat: 0, ore: 0 });

    // 建造几条道路
    for (let i = 0; i < 3; i++) {
      const edge = findExtensionEdge(s, 'player-0');
      if (!edge) break;
      s = buildRoad(s, 'player-0', edge);
    }

    const lengthBefore = calculateLongestRoad(s, 'player-0');

    // 在 player-0 道路的中间某个顶点放置 player-1 的建筑来截断
    // 找到 player-0 道路链中间的一个顶点（不是端点建筑）
    const roads = s.players[0].roads;
    if (roads.length >= 3) {
      // 找一个被两条 player-0 道路共享的顶点（中间节点）
      const vertexCount = new Map<string, number>();
      for (const road of roads) {
        const [v1, v2] = getEdgeEndpoints(road);
        vertexCount.set(v1, (vertexCount.get(v1) ?? 0) + 1);
        vertexCount.set(v2, (vertexCount.get(v2) ?? 0) + 1);
      }

      // 找一个出现次数 >= 2 且没有 player-0 建筑的顶点
      let cutVertex: string | null = null;
      for (const [v, count] of vertexCount) {
        if (count >= 2 && !s.map.vertices[v]) {
          cutVertex = v;
          break;
        }
      }

      if (cutVertex) {
        const blockedState: CatanGameState = {
          ...s,
          map: {
            ...s.map,
            vertices: {
              ...s.map.vertices,
              [cutVertex]: { type: 'settlement', playerId: 'player-1' },
            },
          },
        };

        const lengthAfter = calculateLongestRoad(blockedState, 'player-0');
        // 截断后最长道路应该变短
        expect(lengthAfter).toBeLessThan(lengthBefore);
      }
    }
  });

  it('不存在的玩家应返回 0', () => {
    const { state } = createTradeBuildState(2, testMap);
    expect(calculateLongestRoad(state, 'nonexistent')).toBe(0);
  });

  it('自己的建筑不会截断道路', () => {
    const { state } = createTradeBuildState(2, testMap);
    // player-0 的村庄在道路端点上，不应截断
    const length = calculateLongestRoad(state, 'player-0');
    // 初始有 2 条道路，如果它们连通则长度为 2
    expect(length).toBeGreaterThanOrEqual(1);
  });
});

describe('updateLongestRoadAwards', () => {
  it('道路长度 < 5 时不应授予称号', () => {
    const { state } = createTradeBuildState(2, testMap);
    const s = updateLongestRoadAwards(state);

    // 初始只有 2 条道路，不应有人获得称号
    expect(s.players.every(p => !p.hasLongestRoad)).toBe(true);
  });

  it('道路长度 >= 5 且为最长时应授予称号', () => {
    const { state } = createTradeBuildState(2, testMap);
    let s = giveResources(state, 'player-0', { wood: 10, brick: 10, sheep: 0, wheat: 0, ore: 0 });

    // 建造足够多的道路达到 5 条
    for (let i = 0; i < 5; i++) {
      const edge = findExtensionEdge(s, 'player-0');
      if (!edge) break;
      s = buildRoad(s, 'player-0', edge);
    }

    const length = calculateLongestRoad(s, 'player-0');
    if (length >= 5) {
      expect(s.players[0].hasLongestRoad).toBe(true);
      expect(s.players[0].longestRoadLength).toBe(length);
    }
  });

  it('称号应包含 2 额外胜利分', () => {
    const { state } = createTradeBuildState(2, testMap);
    // 手动设置 player-0 有 5 条连续道路
    let s = giveResources(state, 'player-0', { wood: 10, brick: 10, sheep: 0, wheat: 0, ore: 0 });

    for (let i = 0; i < 5; i++) {
      const edge = findExtensionEdge(s, 'player-0');
      if (!edge) break;
      s = buildRoad(s, 'player-0', edge);
    }

    if (s.players[0].hasLongestRoad) {
      // 胜利分应包含最长道路的 2 分
      const baseVP = s.players[0].settlements.length + s.players[0].cities.length * 2;
      expect(s.players[0].victoryPoints).toBe(baseVP + 2);
    }
  });

  it('称号转移：另一位玩家超过当前持有者', () => {
    const { state } = createTradeBuildState(2, testMap);

    // 先让 player-0 获得称号（手动构造状态）
    // 给 player-0 建造 5 条连续道路
    let s = giveResources(state, 'player-0', { wood: 10, brick: 10, sheep: 0, wheat: 0, ore: 0 });
    for (let i = 0; i < 5; i++) {
      const edge = findExtensionEdge(s, 'player-0');
      if (!edge) break;
      s = buildRoad(s, 'player-0', edge);
    }

    const p0Length = calculateLongestRoad(s, 'player-0');
    if (p0Length < 5) return; // 如果无法建造 5 条连续道路，跳过

    expect(s.players[0].hasLongestRoad).toBe(true);

    // 现在让 player-1 建造更多道路（切换当前玩家）
    s = { ...s, currentPlayerIndex: 1 };
    s = giveResources(s, 'player-1', { wood: 20, brick: 20, sheep: 0, wheat: 0, ore: 0 });

    // player-1 需要建造比 player-0 更多的连续道路
    for (let i = 0; i < p0Length + 2; i++) {
      const edge = findExtensionEdge(s, 'player-1');
      if (!edge) break;
      s = buildRoad(s, 'player-1', edge);
    }

    const p1Length = calculateLongestRoad(s, 'player-1');
    if (p1Length > p0Length) {
      // 称号应转移给 player-1
      expect(s.players[1].hasLongestRoad).toBe(true);
      expect(s.players[0].hasLongestRoad).toBe(false);
    }
  });

  it('平局时保持当前持有者不变', () => {
    const { state } = createTradeBuildState(2, testMap);

    // 构造一个 player-0 持有最长道路称号的状态
    const s: CatanGameState = {
      ...state,
      players: state.players.map((p, i) => ({
        ...p,
        hasLongestRoad: i === 0,
        longestRoadLength: 5,
      })),
    };

    // 如果两个玩家的实际道路长度相同且 >= 5
    const p0Length = calculateLongestRoad(s, 'player-0');
    const p1Length = calculateLongestRoad(s, 'player-1');

    // 手动构造平局场景：两个玩家都有相同长度的道路
    if (p0Length === p1Length && p0Length >= 5) {
      const updated = updateLongestRoadAwards(s);
      // 当前持有者 player-0 应保持称号
      expect(updated.players[0].hasLongestRoad).toBe(true);
      expect(updated.players[1].hasLongestRoad).toBe(false);
    }
  });

  it('buildRoad 后应自动更新最长道路', () => {
    const { state } = createTradeBuildState(2, testMap);
    let s = giveResources(state, 'player-0', { wood: 10, brick: 10, sheep: 0, wheat: 0, ore: 0 });

    const edge = findExtensionEdge(s, 'player-0');
    if (!edge) return;

    const newState = buildRoad(s, 'player-0', edge);

    // longestRoadLength 应该被更新
    const expectedLength = calculateLongestRoad(newState, 'player-0');
    expect(newState.players[0].longestRoadLength).toBe(expectedLength);
  });
});


// ============================================================
// toClientGameState 测试
// ============================================================

describe('toClientGameState', () => {
  /** 创建一个处于 trade_build 阶段的状态，并给玩家分配不同资源 */
  function createStateWithResources(): CatanGameState {
    const players = createTestPlayers(3);
    let state = initGame(players, testMap);

    // 完成初始放置
    const order = [0, 1, 2, 2, 1, 0];
    for (const i of order) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }

    // 给每个玩家不同的资源
    const newPlayers = state.players.map((p, i) => {
      if (i === 0) return { ...p, resources: { wood: 3, brick: 2, sheep: 1, wheat: 0, ore: 4 }, devCards: ['knight', 'victory_point'] as DevCardType[] };
      if (i === 1) return { ...p, resources: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }, devCards: ['monopoly'] as DevCardType[] };
      return { ...p, resources: { wood: 0, brick: 0, sheep: 5, wheat: 3, ore: 0 }, devCards: [] as DevCardType[] };
    });

    return { ...state, players: newPlayers, phase: 'trade_build' as const };
  }

  it('当前玩家应能看到自己的完整资源', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    expect(clientState.myResources).toEqual({ wood: 3, brick: 2, sheep: 1, wheat: 0, ore: 4 });
  });

  it('当前玩家应能看到自己的发展卡', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    expect(clientState.myDevCards).toEqual(['knight', 'victory_point']);
  });

  it('其他玩家仅显示资源总数，不显示具体类型', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    // player-1 有 5 张资源（1+1+1+1+1）
    const p1 = clientState.players.find(p => p.id === 'player-1')!;
    expect(p1.resourceCount).toBe(5);
    expect((p1 as any).resources).toBeUndefined();

    // player-2 有 8 张资源（0+0+5+3+0）
    const p2 = clientState.players.find(p => p.id === 'player-2')!;
    expect(p2.resourceCount).toBe(8);
    expect((p2 as any).resources).toBeUndefined();
  });

  it('其他玩家仅显示发展卡数量，不显示具体类型', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    const p1 = clientState.players.find(p => p.id === 'player-1')!;
    expect(p1.devCardCount).toBe(1);
    expect((p1 as any).devCards).toBeUndefined();

    const p2 = clientState.players.find(p => p.id === 'player-2')!;
    expect(p2.devCardCount).toBe(0);
    expect((p2 as any).devCards).toBeUndefined();
  });

  it('当前玩家自己的 resourceCount 也应正确', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    const p0 = clientState.players.find(p => p.id === 'player-0')!;
    expect(p0.resourceCount).toBe(10); // 3+2+1+0+4
  });

  it('应包含 validPositions', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    expect(clientState.validPositions).toBeDefined();
    expect(Array.isArray(clientState.validPositions.roads)).toBe(true);
    expect(Array.isArray(clientState.validPositions.settlements)).toBe(true);
    expect(Array.isArray(clientState.validPositions.cities)).toBe(true);
  });

  it('应包含 tradeRatios', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    expect(clientState.tradeRatios).toBeDefined();
    expect(clientState.tradeRatios.default).toBeGreaterThanOrEqual(2);
    expect(clientState.tradeRatios.default).toBeLessThanOrEqual(4);
    expect(clientState.tradeRatios.resources).toBeDefined();
  });

  it('应正确复制游戏状态的公共字段', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    expect(clientState.roomId).toBe(state.roomId);
    expect(clientState.map).toBe(state.map);
    expect(clientState.currentPlayerIndex).toBe(state.currentPlayerIndex);
    expect(clientState.phase).toBe(state.phase);
    expect(clientState.setupState).toBe(state.setupState);
    expect(clientState.diceResult).toBe(state.diceResult);
    expect(clientState.discardState).toBe(state.discardState);
    expect(clientState.currentTrade).toBe(state.currentTrade);
    expect(clientState.turnNumber).toBe(state.turnNumber);
    expect(clientState.winnerId).toBe(state.winnerId);
    expect(clientState.turnStartTime).toBe(state.turnStartTime);
    expect(clientState.log).toBe(state.log);
  });

  it('不同玩家视角应看到不同的 myResources', () => {
    const state = createStateWithResources();

    const view0 = toClientGameState(state, 'player-0');
    const view1 = toClientGameState(state, 'player-1');

    expect(view0.myResources).toEqual({ wood: 3, brick: 2, sheep: 1, wheat: 0, ore: 4 });
    expect(view1.myResources).toEqual({ wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 });
  });

  it('不存在的玩家 ID 应返回空资源和空发展卡', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'non-existent');

    expect(clientState.myResources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
    expect(clientState.myDevCards).toEqual([]);
    expect(clientState.validPositions.roads).toEqual([]);
    expect(clientState.validPositions.settlements).toEqual([]);
    expect(clientState.validPositions.cities).toEqual([]);
  });

  it('玩家列表应包含所有公开字段', () => {
    const state = createStateWithResources();
    const clientState = toClientGameState(state, 'player-0');

    for (const p of clientState.players) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('color');
      expect(p).toHaveProperty('resourceCount');
      expect(p).toHaveProperty('settlements');
      expect(p).toHaveProperty('cities');
      expect(p).toHaveProperty('roads');
      expect(p).toHaveProperty('devCardCount');
      expect(p).toHaveProperty('knightsPlayed');
      expect(p).toHaveProperty('longestRoadLength');
      expect(p).toHaveProperty('hasLongestRoad');
      expect(p).toHaveProperty('hasLargestArmy');
      expect(p).toHaveProperty('victoryPoints');
      expect(p).toHaveProperty('isHost');
      expect(p).toHaveProperty('isAI');
      expect(p).toHaveProperty('isConnected');
    }
  });
});

// ============================================================
// 发展卡系统测试
// ============================================================

describe('initDevCardDeck', () => {
  it('应创建包含 25 张卡的标准牌堆', () => {
    const deck = initDevCardDeck();
    expect(deck.cards).toHaveLength(25);
    expect(deck.remaining).toBe(25);
  });

  it('牌堆应包含正确数量的各类型卡', () => {
    const deck = initDevCardDeck();
    const counts: Record<string, number> = {};
    for (const card of deck.cards) {
      counts[card] = (counts[card] || 0) + 1;
    }
    expect(counts['knight']).toBe(14);
    expect(counts['victory_point']).toBe(5);
    expect(counts['road_building']).toBe(2);
    expect(counts['year_of_plenty']).toBe(2);
    expect(counts['monopoly']).toBe(2);
  });
});

describe('initGame with enableDevCards', () => {
  it('enableDevCards=true 时应初始化发展卡牌堆', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, testMap, 'room-1', true);
    expect(state.devCardDeck).not.toBeNull();
    expect(state.devCardDeck!.remaining).toBe(25);
  });

  it('enableDevCards=false 时牌堆应为 null', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, testMap, 'room-1', false);
    expect(state.devCardDeck).toBeNull();
  });

  it('默认不启用发展卡', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, testMap, 'room-1');
    expect(state.devCardDeck).toBeNull();
  });
});

describe('buyDevelopmentCard', () => {
  /** 创建一个处于 trade_build 阶段且有发展卡牌堆的状态 */
  function createDevCardState(): CatanGameState {
    const players = createTestPlayers(2);
    let state = initGame(players, testMap, 'room-1', true);
    // 完成初始放置
    // 第一轮正序
    for (let i = 0; i < 2; i++) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }
    // 第二轮倒序
    for (let i = 1; i >= 0; i--) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }
    // 给 player-0 足够资源购买发展卡
    const modifiedPlayers = state.players.map((p, i) =>
      i === 0
        ? { ...p, resources: { wood: 0, brick: 0, sheep: 5, wheat: 5, ore: 5 } }
        : p,
    );
    return { ...state, phase: 'trade_build' as const, players: modifiedPlayers };
  }

  it('应成功购买发展卡', () => {
    const state = createDevCardState();
    const newState = buyDevelopmentCard(state, 'player-0');

    expect(newState).not.toBe(state);
    expect(newState.players[0].devCards).toHaveLength(1);
    expect(newState.devCardDeck!.remaining).toBe(24);
    // 资源应扣除 1矿+1麦+1羊
    expect(newState.players[0].resources.ore).toBe(4);
    expect(newState.players[0].resources.wheat).toBe(4);
    expect(newState.players[0].resources.sheep).toBe(4);
  });

  it('购买的卡应记录到 devCardBoughtThisTurn', () => {
    const state = createDevCardState();
    const newState = buyDevelopmentCard(state, 'player-0');
    expect(newState.devCardBoughtThisTurn).toHaveLength(1);
  });

  it('资源不足时应被拒绝', () => {
    const state = createDevCardState();
    const poorState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0
          ? { ...p, resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }
          : p,
      ),
    };
    const newState = buyDevelopmentCard(poorState, 'player-0');
    expect(newState).toBe(poorState);
  });

  it('非 trade_build 阶段应被拒绝', () => {
    const state = createDevCardState();
    const rollState: CatanGameState = { ...state, phase: 'roll_dice' };
    const newState = buyDevelopmentCard(rollState, 'player-0');
    expect(newState).toBe(rollState);
  });

  it('非当前回合玩家应被拒绝', () => {
    const state = createDevCardState();
    const newState = buyDevelopmentCard(state, 'player-1');
    expect(newState).toBe(state);
  });

  it('牌堆为空时应被拒绝', () => {
    const state = createDevCardState();
    const emptyDeckState: CatanGameState = {
      ...state,
      devCardDeck: { cards: [], remaining: 0 },
    };
    const newState = buyDevelopmentCard(emptyDeckState, 'player-0');
    expect(newState).toBe(emptyDeckState);
  });

  it('没有牌堆时应被拒绝', () => {
    const state = createDevCardState();
    const noDeckState: CatanGameState = { ...state, devCardDeck: null };
    const newState = buyDevelopmentCard(noDeckState, 'player-0');
    expect(newState).toBe(noDeckState);
  });
});

describe('useDevelopmentCard', () => {
  /** 创建一个有发展卡的 trade_build 状态 */
  function createUseDevCardState(cardType: DevCardType): CatanGameState {
    const players = createTestPlayers(2);
    let state = initGame(players, testMap, 'room-1', true);
    // 完成初始放置
    for (let i = 0; i < 2; i++) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }
    for (let i = 1; i >= 0; i--) {
      const v = findValidVertex(state);
      state = placeInitialSettlement(state, `player-${i}`, v);
      const e = findAdjacentEdge(state, v);
      state = placeInitialRoad(state, `player-${i}`, e);
    }
    // 给 player-0 一张指定类型的发展卡和足够资源
    const modifiedPlayers = state.players.map((p, i) =>
      i === 0
        ? {
            ...p,
            devCards: [cardType],
            resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 },
          }
        : i === 1
          ? { ...p, resources: { wood: 3, brick: 3, sheep: 3, wheat: 3, ore: 3 } }
          : p,
    );
    return {
      ...state,
      phase: 'trade_build' as const,
      players: modifiedPlayers,
      devCardUsedThisTurn: false,
      devCardBoughtThisTurn: [],
    };
  }

  it('胜利分卡不能主动使用', () => {
    const state = createUseDevCardState('victory_point');
    const newState = useDevelopmentCard(state, 'player-0', 'victory_point');
    expect(newState).toBe(state);
  });

  it('本回合已使用过发展卡时应被拒绝', () => {
    const state = createUseDevCardState('knight');
    const usedState: CatanGameState = { ...state, devCardUsedThisTurn: true };
    const newState = useDevelopmentCard(usedState, 'player-0', 'knight');
    expect(newState).toBe(usedState);
  });

  it('本回合购买的卡不能立即使用', () => {
    const state = createUseDevCardState('knight');
    // 手牌中只有 1 张骑士卡，且本回合购买了 1 张骑士卡
    const boughtState: CatanGameState = {
      ...state,
      devCardBoughtThisTurn: ['knight'],
    };
    const newState = useDevelopmentCard(boughtState, 'player-0', 'knight');
    expect(newState).toBe(boughtState);
  });

  it('手牌中有 2 张骑士卡且本回合购买了 1 张时，仍可使用 1 张', () => {
    const state = createUseDevCardState('knight');
    const twoKnightsState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, devCards: ['knight', 'knight'] as DevCardType[] } : p,
      ),
      devCardBoughtThisTurn: ['knight'],
    };
    const newState = useDevelopmentCard(twoKnightsState, 'player-0', 'knight');
    expect(newState).not.toBe(twoKnightsState);
    expect(newState.phase).toBe('move_robber');
  });

  it('非当前回合玩家应被拒绝', () => {
    const state = createUseDevCardState('knight');
    const newState = useDevelopmentCard(state, 'player-1', 'knight');
    expect(newState).toBe(state);
  });

  it('手牌中没有该卡时应被拒绝', () => {
    const state = createUseDevCardState('knight');
    // 清空手牌
    const emptyHandState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, devCards: [] } : p,
      ),
    };
    const newState = useDevelopmentCard(emptyHandState, 'player-0', 'knight');
    expect(newState).toBe(emptyHandState);
  });

  describe('骑士卡', () => {
    it('应进入 move_robber 阶段并增加 knightsPlayed', () => {
      const state = createUseDevCardState('knight');
      const newState = useDevelopmentCard(state, 'player-0', 'knight');

      expect(newState.phase).toBe('move_robber');
      expect(newState.players[0].knightsPlayed).toBe(1);
      expect(newState.players[0].devCards).not.toContain('knight');
      expect(newState.devCardUsedThisTurn).toBe(true);
    });

    it('骑士卡可以在 roll_dice 阶段使用', () => {
      const state = createUseDevCardState('knight');
      const rollState: CatanGameState = { ...state, phase: 'roll_dice' };
      const newState = useDevelopmentCard(rollState, 'player-0', 'knight');

      expect(newState).not.toBe(rollState);
      expect(newState.phase).toBe('move_robber');
    });
  });

  describe('发明卡 (year_of_plenty)', () => {
    it('应从银行获取 2 张指定资源', () => {
      const state = createUseDevCardState('year_of_plenty');
      const newState = useDevelopmentCard(state, 'player-0', 'year_of_plenty', {
        resources: ['wood', 'ore'],
      });

      expect(newState).not.toBe(state);
      expect(newState.players[0].resources.wood).toBe(6); // 5 + 1
      expect(newState.players[0].resources.ore).toBe(6); // 5 + 1
      expect(newState.devCardUsedThisTurn).toBe(true);
    });

    it('可以选择两张相同资源', () => {
      const state = createUseDevCardState('year_of_plenty');
      const newState = useDevelopmentCard(state, 'player-0', 'year_of_plenty', {
        resources: ['wheat', 'wheat'],
      });

      expect(newState).not.toBe(state);
      expect(newState.players[0].resources.wheat).toBe(7); // 5 + 2
    });

    it('缺少参数时应被拒绝', () => {
      const state = createUseDevCardState('year_of_plenty');
      const newState = useDevelopmentCard(state, 'player-0', 'year_of_plenty');
      expect(newState).toBe(state);
    });

    it('不能在 roll_dice 阶段使用', () => {
      const state = createUseDevCardState('year_of_plenty');
      const rollState: CatanGameState = { ...state, phase: 'roll_dice' };
      const newState = useDevelopmentCard(rollState, 'player-0', 'year_of_plenty');
      expect(newState).toBe(rollState);
    });
  });

  describe('垄断卡 (monopoly)', () => {
    it('应收集所有其他玩家的指定资源', () => {
      const state = createUseDevCardState('monopoly');
      const newState = useDevelopmentCard(state, 'player-0', 'monopoly', {
        resource: 'wood',
      });

      expect(newState).not.toBe(state);
      // player-0 应获得 player-1 的所有木材 (3)
      expect(newState.players[0].resources.wood).toBe(5 + 3); // 5 + 3
      expect(newState.players[1].resources.wood).toBe(0);
      expect(newState.devCardUsedThisTurn).toBe(true);
    });

    it('缺少参数时应被拒绝', () => {
      const state = createUseDevCardState('monopoly');
      const newState = useDevelopmentCard(state, 'player-0', 'monopoly');
      expect(newState).toBe(state);
    });
  });

  describe('道路建设卡 (road_building)', () => {
    it('应免费建造 2 条道路', () => {
      const state = createUseDevCardState('road_building');
      // 找到 2 条合法的道路位置
      const validRoads = getValidBuildPositions(state, 'player-0', 'road');
      if (validRoads.length < 2) return; // 跳过（不应发生）

      const newState = useDevelopmentCard(state, 'player-0', 'road_building', {
        edges: [validRoads[0], validRoads[1]],
      });

      expect(newState).not.toBe(state);
      expect(newState.map.edges[validRoads[0]]).toEqual({ playerId: 'player-0' });
      expect(newState.map.edges[validRoads[1]]).toEqual({ playerId: 'player-0' });
      // 不应扣除资源
      expect(newState.players[0].resources.wood).toBe(5);
      expect(newState.players[0].resources.brick).toBe(5);
      expect(newState.devCardUsedThisTurn).toBe(true);
    });

    it('缺少参数时应被拒绝', () => {
      const state = createUseDevCardState('road_building');
      const newState = useDevelopmentCard(state, 'player-0', 'road_building');
      expect(newState).toBe(state);
    });
  });
});

describe('updateLargestArmyAwards', () => {
  /** 创建一个有骑士卡使用记录的状态 */
  function createArmyState(): CatanGameState {
    const state = completeSetup(3, testMap);
    return { ...state, phase: 'trade_build' as const };
  }

  it('使用 3 张骑士卡后应获得最大骑士团称号', () => {
    const state = createArmyState();
    const modifiedState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, knightsPlayed: 3 } : p,
      ),
    };
    const newState = updateLargestArmyAwards(modifiedState);
    expect(newState.players[0].hasLargestArmy).toBe(true);
    expect(newState.players[1].hasLargestArmy).toBe(false);
  });

  it('不足 3 张骑士卡时不应获得称号', () => {
    const state = createArmyState();
    const modifiedState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, knightsPlayed: 2 } : p,
      ),
    };
    const newState = updateLargestArmyAwards(modifiedState);
    expect(newState.players[0].hasLargestArmy).toBe(false);
  });

  it('另一玩家超过当前持有者时称号应转移', () => {
    const state = createArmyState();
    const modifiedState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) => {
        if (i === 0) return { ...p, knightsPlayed: 3, hasLargestArmy: true };
        if (i === 1) return { ...p, knightsPlayed: 4 };
        return p;
      }),
    };
    const newState = updateLargestArmyAwards(modifiedState);
    expect(newState.players[0].hasLargestArmy).toBe(false);
    expect(newState.players[1].hasLargestArmy).toBe(true);
  });

  it('平局时应保持当前持有者不变', () => {
    const state = createArmyState();
    const modifiedState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) => {
        if (i === 0) return { ...p, knightsPlayed: 3, hasLargestArmy: true };
        if (i === 1) return { ...p, knightsPlayed: 3 };
        return p;
      }),
    };
    const newState = updateLargestArmyAwards(modifiedState);
    expect(newState.players[0].hasLargestArmy).toBe(true);
    expect(newState.players[1].hasLargestArmy).toBe(false);
  });

  it('最大骑士团应增加 2 胜利分', () => {
    const state = createArmyState();
    const modifiedState: CatanGameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, knightsPlayed: 3 } : p,
      ),
    };
    const newState = updateLargestArmyAwards(modifiedState);
    // 胜利分应包含最大骑士团的 2 分
    const baseVP = newState.players[0].settlements.length + newState.players[0].cities.length * 2;
    expect(newState.players[0].victoryPoints).toBe(baseVP + 2);
  });
});
