/**
 * 卡坦岛游戏引擎 — 核心逻辑模块
 *
 * 所有函数设计为纯函数（接收状态，返回新状态），便于测试。
 * 如果操作非法，返回原始状态不变。
 */

import type {
  CatanPlayer,
  CatanGameState,
  HexMap,
  ResourceType,
  ResourceMap,
  SetupState,
  GamePhase,
  TradeRatios,
  TradeProposal,
  DevCardType,
  DevCardDeck,
  DevCardParams,
} from './types.js';
import { TERRAIN_RESOURCE, BUILD_COSTS } from './types.js';
import {
  getAdjacentVertices,
  getAdjacentEdges,
  getEdgeEndpoints,
  getAdjacentHexes,
  getAllVertexIds,
  getAllEdgeIds,
  shuffle,
} from './map.js';

// ============================================================
// 辅助函数
// ============================================================

/** 创建空资源映射 */
function emptyResources(): ResourceMap {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

/** 检查顶点 ID 是否有效 */
function isValidVertex(vertexId: string): boolean {
  return getAllVertexIds().includes(vertexId);
}

/** 检查边 ID 是否有效 */
function isValidEdge(edgeId: string): boolean {
  return getAllEdgeIds().includes(edgeId);
}

// ============================================================
// 4.1 — 游戏初始化
// ============================================================

/**
 * 初始化游戏状态（进入初始放置阶段）
 *
 * - 设置玩家初始状态（空资源、空建筑）
 * - 生成初始放置顺序：第一轮正序 (0,1,...,N-1)
 * - 游戏阶段设为 setup_settlement
 */
export function initGame(
  players: CatanPlayer[],
  map: HexMap,
  roomId: string = '',
  enableDevCards: boolean = false,
): CatanGameState {
  const playerCount = players.length;

  // 第一轮正序
  const firstRoundOrder = Array.from({ length: playerCount }, (_, i) => i);

  const setupState: SetupState = {
    round: 1,
    order: firstRoundOrder,
    currentIndex: 0,
    settlementPlaced: false,
  };

  return {
    roomId,
    map,
    players: players.map(p => ({
      ...p,
      resources: emptyResources(),
      settlements: [],
      cities: [],
      roads: [],
      devCards: [],
      knightsPlayed: 0,
      longestRoadLength: 0,
      hasLongestRoad: false,
      hasLargestArmy: false,
      victoryPoints: 0,
    })),
    currentPlayerIndex: firstRoundOrder[0],
    phase: 'setup_settlement',
    setupState,
    diceResult: null,
    discardState: null,
    currentTrade: null,
    devCardDeck: enableDevCards ? initDevCardDeck() : null,
    devCardUsedThisTurn: false,
    devCardBoughtThisTurn: [],
    turnNumber: 0,
    winnerId: null,
    turnStartTime: Date.now(),
    log: [],
  };
}

// ============================================================
// 4.1 — 初始放置：村庄
// ============================================================

/**
 * 初始放置阶段：放置村庄
 *
 * 校验规则：
 * 1. 当前阶段必须是 setup_settlement
 * 2. 操作玩家必须是当前轮到的玩家
 * 3. 顶点 ID 必须有效
 * 4. 该顶点无建筑
 * 5. 该顶点的所有相邻顶点均无建筑（距离规则）
 * 6. 初始放置阶段不需要连通性检查
 *
 * 第二个村庄放置后，根据相邻地块地形发放初始资源。
 */
export function placeInitialSettlement(
  state: CatanGameState,
  playerId: string,
  vertexId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'setup_settlement') return state;
  if (!state.setupState) return state;

  // 玩家校验：必须是当前轮到的玩家
  const currentPlayerIdx = state.setupState.order[state.setupState.currentIndex];
  if (state.players[currentPlayerIdx]?.id !== playerId) return state;

  // 顶点有效性校验
  if (!isValidVertex(vertexId)) return state;

  // 顶点无建筑校验
  if (state.map.vertices[vertexId]) return state;

  // 距离规则：相邻顶点均无建筑
  const adjacentVertices = getAdjacentVertices(vertexId);
  for (const adjV of adjacentVertices) {
    if (state.map.vertices[adjV]) return state;
  }

  // 放置村庄
  const newVertices = {
    ...state.map.vertices,
    [vertexId]: { type: 'settlement' as const, playerId },
  };

  // 更新玩家的 settlements 列表
  const newPlayers = state.players.map((p, i) =>
    i === currentPlayerIdx
      ? { ...p, settlements: [...p.settlements, vertexId] }
      : p,
  );

  // 第二轮放置村庄后，发放初始资源
  let finalPlayers = newPlayers;
  if (state.setupState.round === 2) {
    const adjacentHexes = getAdjacentHexes(vertexId, state.map.tiles);
    const resourceGains = emptyResources();
    for (const hex of adjacentHexes) {
      const resource = TERRAIN_RESOURCE[hex.terrain];
      if (resource) {
        resourceGains[resource] += 1;
      }
    }
    finalPlayers = finalPlayers.map((p, i) =>
      i === currentPlayerIdx
        ? {
            ...p,
            resources: addResources(p.resources, resourceGains),
          }
        : p,
    );
  }

  const newMap: HexMap = { ...state.map, vertices: newVertices };

  // 更新 setupState：标记村庄已放置，等待放道路
  const newSetupState: SetupState = {
    ...state.setupState,
    settlementPlaced: true,
  };

  return {
    ...state,
    map: newMap,
    players: finalPlayers,
    phase: 'setup_road',
    setupState: newSetupState,
  };
}

// ============================================================
// 4.1 — 初始放置：道路
// ============================================================

/**
 * 初始放置阶段：放置道路
 *
 * 校验规则：
 * 1. 当前阶段必须是 setup_road
 * 2. 操作玩家必须是当前轮到的玩家
 * 3. 边 ID 必须有效
 * 4. 该边无道路
 * 5. 道路必须与刚放置的村庄相邻（边的端点之一是刚放置的村庄所在顶点）
 *
 * 放置完成后，推进到下一位玩家或下一轮。
 */
export function placeInitialRoad(
  state: CatanGameState,
  playerId: string,
  edgeId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'setup_road') return state;
  if (!state.setupState) return state;
  if (!state.setupState.settlementPlaced) return state;

  // 玩家校验
  const currentPlayerIdx = state.setupState.order[state.setupState.currentIndex];
  if (state.players[currentPlayerIdx]?.id !== playerId) return state;

  // 边有效性校验
  if (!isValidEdge(edgeId)) return state;

  // 边无道路校验
  if (state.map.edges[edgeId]) return state;

  // 道路必须与刚放置的村庄相邻
  const player = state.players[currentPlayerIdx];
  const lastSettlement = player.settlements[player.settlements.length - 1];
  const [v1, v2] = getEdgeEndpoints(edgeId);
  if (v1 !== lastSettlement && v2 !== lastSettlement) return state;

  // 放置道路
  const newEdges = {
    ...state.map.edges,
    [edgeId]: { playerId },
  };

  const newPlayers = state.players.map((p, i) =>
    i === currentPlayerIdx
      ? { ...p, roads: [...p.roads, edgeId] }
      : p,
  );

  const newMap: HexMap = { ...state.map, edges: newEdges };

  // 推进初始放置顺序
  const { nextSetupState, nextPhase, nextPlayerIndex } = advanceSetup(state.setupState, state.players.length);

  return {
    ...state,
    map: newMap,
    players: newPlayers,
    phase: nextPhase,
    setupState: nextSetupState,
    currentPlayerIndex: nextPlayerIndex,
    turnStartTime: Date.now(),
  };
}

// ============================================================
// 初始放置顺序管理
// ============================================================

/**
 * 推进初始放置顺序
 *
 * 第一轮正序 (0, 1, ..., N-1)，第二轮倒序 (N-1, ..., 1, 0)。
 * 每位玩家每轮放置 1 个 Settlement + 1 条 Road。
 * 两轮结束后进入正式游戏（roll_dice 阶段）。
 */
function advanceSetup(
  setupState: SetupState,
  playerCount: number,
): {
  nextSetupState: SetupState | null;
  nextPhase: GamePhase;
  nextPlayerIndex: number;
} {
  const nextIndex = setupState.currentIndex + 1;

  if (nextIndex < setupState.order.length) {
    // 当前轮还有玩家未放置
    const newSetupState: SetupState = {
      ...setupState,
      currentIndex: nextIndex,
      settlementPlaced: false,
    };
    return {
      nextSetupState: newSetupState,
      nextPhase: 'setup_settlement',
      nextPlayerIndex: setupState.order[nextIndex],
    };
  }

  // 当前轮所有玩家已放置完毕
  if (setupState.round === 1) {
    // 进入第二轮（倒序）
    const secondRoundOrder = Array.from({ length: playerCount }, (_, i) => playerCount - 1 - i);
    const newSetupState: SetupState = {
      round: 2,
      order: secondRoundOrder,
      currentIndex: 0,
      settlementPlaced: false,
    };
    return {
      nextSetupState: newSetupState,
      nextPhase: 'setup_settlement',
      nextPlayerIndex: secondRoundOrder[0],
    };
  }

  // 第二轮也结束了，进入正式游戏
  return {
    nextSetupState: null,
    nextPhase: 'roll_dice',
    nextPlayerIndex: 0,
  };
}

// ============================================================
// 资源辅助函数
// ============================================================

/** 两个资源映射相加 */
function addResources(a: ResourceMap, b: ResourceMap): ResourceMap {
  return {
    wood: a.wood + b.wood,
    brick: a.brick + b.brick,
    sheep: a.sheep + b.sheep,
    wheat: a.wheat + b.wheat,
    ore: a.ore + b.ore,
  };
}

import { getHexVertices } from './map.js';

// ============================================================
// 辅助函数（资源计算）
// ============================================================

/** 计算玩家手牌总数 */
function totalResources(resources: ResourceMap): number {
  return resources.wood + resources.brick + resources.sheep + resources.wheat + resources.ore;
}

/** 从资源映射中减去指定资源，返回新映射 */
function subtractResources(a: ResourceMap, b: ResourceMap): ResourceMap {
  return {
    wood: a.wood - b.wood,
    brick: a.brick - b.brick,
    sheep: a.sheep - b.sheep,
    wheat: a.wheat - b.wheat,
    ore: a.ore - b.ore,
  };
}

/** 检查资源映射中所有值是否非负 */
function hasEnoughResources(resources: ResourceMap, cost: ResourceMap): boolean {
  return (
    resources.wood >= cost.wood &&
    resources.brick >= cost.brick &&
    resources.sheep >= cost.sheep &&
    resources.wheat >= cost.wheat &&
    resources.ore >= cost.ore
  );
}

// ============================================================
// 4.3 — 掷骰与资源产出
// ============================================================

/**
 * 掷骰子
 *
 * 校验规则：
 * 1. 当前阶段必须是 roll_dice
 *
 * 逻辑：
 * - 生成两个 1-6 随机数，计算总和
 * - 如果总和不是 7：调用 distributeResources 分发资源，进入 trade_build 阶段
 * - 如果总和是 7：检查所有手牌超过 7 张的玩家
 *   - 有需要丢弃的玩家 → 进入 discard 阶段
 *   - 没有 → 直接进入 move_robber 阶段
 */
export function rollDice(state: CatanGameState): CatanGameState {
  // 阶段校验
  if (state.phase !== 'roll_dice') return state;

  // 生成两个 1-6 随机数
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const diceSum = die1 + die2;

  const stateWithDice: CatanGameState = {
    ...state,
    diceResult: [die1, die2],
  };

  if (diceSum !== 7) {
    // 分发资源，进入 trade_build 阶段
    const distributed = distributeResources(stateWithDice, diceSum);
    return {
      ...distributed,
      phase: 'trade_build',
    };
  }

  // 骰子为 7：检查需要丢弃资源的玩家
  const pendingPlayers = state.players
    .filter(p => totalResources(p.resources) > 7)
    .map(p => p.id);

  if (pendingPlayers.length > 0) {
    return {
      ...stateWithDice,
      phase: 'discard',
      discardState: {
        pendingPlayers,
        completedPlayers: [],
      },
    };
  }

  // 没有需要丢弃的玩家，直接进入 move_robber 阶段
  return {
    ...stateWithDice,
    phase: 'move_robber',
  };
}

/**
 * 资源产出计算
 *
 * 遍历所有地块，找到 numberToken === diceSum 且 hasRobber === false 的地块。
 * 对于每个匹配地块的每个有建筑的顶点：村庄+1份资源，城市+2份资源。
 */
export function distributeResources(state: CatanGameState, diceSum: number): CatanGameState {
  // 收集每位玩家的资源增量
  const gains: Map<string, ResourceMap> = new Map();
  for (const p of state.players) {
    gains.set(p.id, emptyResources());
  }

  for (const tile of state.map.tiles) {
    // 跳过不匹配的地块、有强盗的地块、沙漠
    if (tile.numberToken !== diceSum || tile.hasRobber) continue;

    const resource = TERRAIN_RESOURCE[tile.terrain];
    if (!resource) continue;

    // 获取该地块的 6 个顶点
    const vertices = getHexVertices(tile.coord.q, tile.coord.r);
    for (const vertexId of vertices) {
      const building = state.map.vertices[vertexId];
      if (!building) continue;

      const playerGains = gains.get(building.playerId);
      if (!playerGains) continue;

      if (building.type === 'settlement') {
        playerGains[resource] += 1;
      } else if (building.type === 'city') {
        playerGains[resource] += 2;
      }
    }
  }

  // 应用资源增量到玩家
  const newPlayers = state.players.map(p => {
    const playerGains = gains.get(p.id)!;
    return {
      ...p,
      resources: addResources(p.resources, playerGains),
    };
  });

  return {
    ...state,
    players: newPlayers,
  };
}

/**
 * 丢弃资源（骰子为 7 时手牌超过 7 张的玩家）
 *
 * 校验规则：
 * 1. 当前阶段必须是 discard
 * 2. 该玩家在 pendingPlayers 中且未完成丢弃
 * 3. 丢弃的资源总量必须等于手牌总量的一半（向下取整）
 * 4. 玩家必须拥有足够的资源来丢弃
 *
 * 所有需要丢弃的玩家完成后，进入 move_robber 阶段。
 */
export function discardResources(
  state: CatanGameState,
  playerId: string,
  resources: ResourceMap,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'discard') return state;
  if (!state.discardState) return state;

  // 玩家必须在待丢弃列表中
  if (!state.discardState.pendingPlayers.includes(playerId)) return state;
  // 玩家不能已经完成丢弃
  if (state.discardState.completedPlayers.includes(playerId)) return state;

  // 找到该玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 丢弃数量必须等于手牌总量的一半（向下取整）
  const requiredDiscard = Math.floor(totalResources(player.resources) / 2);
  const discardTotal = totalResources(resources);
  if (discardTotal !== requiredDiscard) return state;

  // 检查丢弃的每种资源不超过玩家拥有的数量
  if (!hasEnoughResources(player.resources, resources)) return state;

  // 检查丢弃的资源没有负数
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  for (const r of resourceTypes) {
    if (resources[r] < 0) return state;
  }

  // 执行丢弃
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, resources: subtractResources(p.resources, resources) }
      : p,
  );

  // 更新丢弃状态
  const newCompletedPlayers = [...state.discardState.completedPlayers, playerId];
  const allCompleted = state.discardState.pendingPlayers.every(
    pid => newCompletedPlayers.includes(pid),
  );

  if (allCompleted) {
    // 所有玩家完成丢弃，进入 move_robber 阶段
    return {
      ...state,
      players: newPlayers,
      phase: 'move_robber',
      discardState: null,
    };
  }

  // 还有玩家未完成丢弃
  return {
    ...state,
    players: newPlayers,
    discardState: {
      ...state.discardState,
      completedPlayers: newCompletedPlayers,
    },
  };
}

/**
 * 移动强盗到新地块
 *
 * 校验规则：
 * 1. 当前阶段必须是 move_robber
 * 2. 操作玩家必须是当前回合玩家
 * 3. 目标地块必须存在
 * 4. 强盗必须移动到不同的地块
 *
 * 移动后检查目标地块是否有其他玩家的建筑：
 * - 有 → 进入 steal 阶段
 * - 没有 → 进入 trade_build 阶段
 */
export function moveRobber(
  state: CatanGameState,
  playerId: string,
  hexId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'move_robber') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  // 解析目标地块坐标
  const parts = hexId.split(',');
  if (parts.length !== 2) return state;
  const targetQ = Number(parts[0]);
  const targetR = Number(parts[1]);

  // 目标地块必须存在
  const targetTileIndex = state.map.tiles.findIndex(
    t => t.coord.q === targetQ && t.coord.r === targetR,
  );
  if (targetTileIndex === -1) return state;

  // 强盗必须移动到不同的地块
  const targetTile = state.map.tiles[targetTileIndex];
  if (targetTile.hasRobber) return state;

  // 移动强盗：移除旧位置，设置新位置
  const newTiles = state.map.tiles.map(t => ({
    ...t,
    hasRobber: t.coord.q === targetQ && t.coord.r === targetR,
  }));

  const newMap: HexMap = { ...state.map, tiles: newTiles };

  // 检查目标地块是否有其他玩家的建筑
  const targetVertices = getHexVertices(targetQ, targetR);
  const otherPlayersWithBuildings = new Set<string>();
  for (const vertexId of targetVertices) {
    const building = state.map.vertices[vertexId];
    if (building && building.playerId !== playerId) {
      otherPlayersWithBuildings.add(building.playerId);
    }
  }

  if (otherPlayersWithBuildings.size > 0) {
    // 有其他玩家的建筑，进入 steal 阶段
    return {
      ...state,
      map: newMap,
      phase: 'steal',
    };
  }

  // 没有其他玩家的建筑，进入 trade_build 阶段
  return {
    ...state,
    map: newMap,
    phase: 'trade_build',
  };
}

/**
 * 从目标玩家随机抢夺 1 张资源
 *
 * 校验规则：
 * 1. 当前阶段必须是 steal
 * 2. 操作玩家必须是当前回合玩家
 * 3. 目标玩家必须存在且不是自己
 * 4. 目标玩家必须有资源可抢
 *
 * 完成后进入 trade_build 阶段。
 */
export function stealResource(
  state: CatanGameState,
  playerId: string,
  targetPlayerId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'steal') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  // 不能抢自己
  if (playerId === targetPlayerId) return state;

  // 找到目标玩家
  const targetIndex = state.players.findIndex(p => p.id === targetPlayerId);
  if (targetIndex === -1) return state;

  const target = state.players[targetIndex];

  // 目标玩家必须有资源
  if (totalResources(target.resources) === 0) return state;

  // 构建可抢夺的资源列表
  const stealableResources: ResourceType[] = [];
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  for (const r of resourceTypes) {
    for (let i = 0; i < target.resources[r]; i++) {
      stealableResources.push(r);
    }
  }

  // 随机选择一张资源
  const stolenResource = stealableResources[Math.floor(Math.random() * stealableResources.length)];

  // 执行抢夺
  const currentPlayerIndex = state.currentPlayerIndex;
  const newPlayers = state.players.map((p, i) => {
    if (i === currentPlayerIndex) {
      return {
        ...p,
        resources: { ...p.resources, [stolenResource]: p.resources[stolenResource] + 1 },
      };
    }
    if (i === targetIndex) {
      return {
        ...p,
        resources: { ...p.resources, [stolenResource]: p.resources[stolenResource] - 1 },
      };
    }
    return p;
  });

  return {
    ...state,
    players: newPlayers,
    phase: 'trade_build',
  };
}


// ============================================================
// 4.5 — 建造系统
// ============================================================

/**
 * 建造道路
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 操作玩家必须是当前回合玩家
 * 3. 边 ID 必须有效
 * 4. 该边无道路
 * 5. 边的至少一个端点满足连通性：
 *    a. 有该玩家的建筑（村庄/城市）
 *    b. 有该玩家的另一条道路，且该端点没有其他玩家的建筑（不被截断）
 * 6. 资源足够（1木材 + 1黏土）
 */
export function buildRoad(
  state: CatanGameState,
  playerId: string,
  edgeId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  // 边有效性校验
  if (!isValidEdge(edgeId)) return state;

  // 边无道路校验
  if (state.map.edges[edgeId]) return state;

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 资源检查
  const cost = BUILD_COSTS['road'];
  if (!hasEnoughResources(player.resources, cost)) return state;

  // 连通性校验：边的至少一个端点满足条件
  const [v1, v2] = getEdgeEndpoints(edgeId);
  if (!isRoadConnected(state, playerId, v1) && !isRoadConnected(state, playerId, v2)) {
    return state;
  }

  // 扣除资源
  const newResources = subtractResources(player.resources, cost);

  // 放置道路
  const newEdges = { ...state.map.edges, [edgeId]: { playerId } };
  const newMap: HexMap = { ...state.map, edges: newEdges };

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, resources: newResources, roads: [...p.roads, edgeId] }
      : p,
  );

  const stateAfterBuild: CatanGameState = {
    ...state,
    map: newMap,
    players: newPlayers,
  };

  // 建造道路后更新最长道路称号
  return updateLongestRoadAwards(stateAfterBuild);
}

/**
 * 建造村庄
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 操作玩家必须是当前回合玩家
 * 3. 顶点 ID 必须有效
 * 4. 该顶点无建筑
 * 5. 相邻顶点均无建筑（距离规则：间隔至少 2 条边）
 * 6. 顶点至少有一条相邻边是该玩家的道路（连通性规则）
 * 7. 资源足够（1木材 + 1黏土 + 1羊毛 + 1小麦）
 *
 * 建造成功后 victoryPoints +1
 */
export function buildSettlement(
  state: CatanGameState,
  playerId: string,
  vertexId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  // 顶点有效性校验
  if (!isValidVertex(vertexId)) return state;

  // 顶点无建筑校验
  if (state.map.vertices[vertexId]) return state;

  // 距离规则：相邻顶点均无建筑
  const adjacentVertices = getAdjacentVertices(vertexId);
  for (const adjV of adjacentVertices) {
    if (state.map.vertices[adjV]) return state;
  }

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 资源检查
  const cost = BUILD_COSTS['settlement'];
  if (!hasEnoughResources(player.resources, cost)) return state;

  // 连通性规则：顶点至少有一条相邻边是该玩家的道路
  const adjacentEdges = getAdjacentEdges(vertexId);
  const hasConnectedRoad = adjacentEdges.some(
    e => state.map.edges[e]?.playerId === playerId,
  );
  if (!hasConnectedRoad) return state;

  // 扣除资源
  const newResources = subtractResources(player.resources, cost);

  // 放置村庄
  const newVertices = {
    ...state.map.vertices,
    [vertexId]: { type: 'settlement' as const, playerId },
  };
  const newMap: HexMap = { ...state.map, vertices: newVertices };

  // 更新玩家：资源、村庄列表、胜利分 +1
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          resources: newResources,
          settlements: [...p.settlements, vertexId],
          victoryPoints: p.victoryPoints + 1,
        }
      : p,
  );

  return {
    ...state,
    map: newMap,
    players: newPlayers,
  };
}

/**
 * 建造城市（升级村庄）
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 操作玩家必须是当前回合玩家
 * 3. 顶点 ID 必须有效
 * 4. 该顶点有该玩家的村庄
 * 5. 资源足够（3矿石 + 2小麦）
 *
 * 建造成功后 victoryPoints 从 1 变 2（净增 +1）
 */
export function buildCity(
  state: CatanGameState,
  playerId: string,
  vertexId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  // 顶点有效性校验
  if (!isValidVertex(vertexId)) return state;

  // 该顶点必须有该玩家的村庄
  const building = state.map.vertices[vertexId];
  if (!building || building.playerId !== playerId || building.type !== 'settlement') {
    return state;
  }

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 资源检查
  const cost = BUILD_COSTS['city'];
  if (!hasEnoughResources(player.resources, cost)) return state;

  // 扣除资源
  const newResources = subtractResources(player.resources, cost);

  // 升级为城市
  const newVertices = {
    ...state.map.vertices,
    [vertexId]: { type: 'city' as const, playerId },
  };
  const newMap: HexMap = { ...state.map, vertices: newVertices };

  // 更新玩家：资源、从 settlements 移到 cities、胜利分 +1（村庄1分→城市2分）
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          resources: newResources,
          settlements: p.settlements.filter(s => s !== vertexId),
          cities: [...p.cities, vertexId],
          victoryPoints: p.victoryPoints + 1,
        }
      : p,
  );

  return {
    ...state,
    map: newMap,
    players: newPlayers,
  };
}

/**
 * 获取玩家可合法建造的位置（不检查资源，只检查位置合法性）
 */
export function getValidBuildPositions(
  state: CatanGameState,
  playerId: string,
  buildType: 'road' | 'settlement' | 'city',
): string[] {
  if (buildType === 'road') {
    return getValidRoadPositions(state, playerId);
  }
  if (buildType === 'settlement') {
    return getValidSettlementPositions(state, playerId);
  }
  // city
  return getValidCityPositions(state, playerId);
}

// ============================================================
// 建造位置合法性内部函数
// ============================================================

/**
 * 道路连通性检查：判断某个端点是否满足道路连通条件
 *
 * 条件（满足其一即可）：
 * a. 该端点有该玩家的建筑（村庄/城市）
 * b. 该端点有该玩家的另一条道路，且该端点没有其他玩家的建筑（不被截断）
 */
function isRoadConnected(
  state: CatanGameState,
  playerId: string,
  vertexId: string,
): boolean {
  const building = state.map.vertices[vertexId];

  // 条件 a：该端点有该玩家的建筑
  if (building && building.playerId === playerId) return true;

  // 如果该端点有其他玩家的建筑，道路被截断
  if (building && building.playerId !== playerId) return false;

  // 条件 b：该端点有该玩家的另一条道路
  const adjEdges = getAdjacentEdges(vertexId);
  return adjEdges.some(e => state.map.edges[e]?.playerId === playerId);
}

/** 获取所有合法的道路建造位置 */
function getValidRoadPositions(state: CatanGameState, playerId: string): string[] {
  const allEdges = getAllEdgeIds();
  const result: string[] = [];

  for (const edgeId of allEdges) {
    // 边已有道路，跳过
    if (state.map.edges[edgeId]) continue;

    // 连通性校验
    const [v1, v2] = getEdgeEndpoints(edgeId);
    if (isRoadConnected(state, playerId, v1) || isRoadConnected(state, playerId, v2)) {
      result.push(edgeId);
    }
  }

  return result;
}

/** 获取所有合法的村庄建造位置 */
function getValidSettlementPositions(state: CatanGameState, playerId: string): string[] {
  const allVertices = getAllVertexIds();
  const result: string[] = [];

  for (const vertexId of allVertices) {
    // 顶点已有建筑，跳过
    if (state.map.vertices[vertexId]) continue;

    // 距离规则：相邻顶点均无建筑
    const adjacentVertices = getAdjacentVertices(vertexId);
    if (adjacentVertices.some(v => state.map.vertices[v])) continue;

    // 连通性规则：至少有一条相邻边是该玩家的道路
    const adjacentEdges = getAdjacentEdges(vertexId);
    if (!adjacentEdges.some(e => state.map.edges[e]?.playerId === playerId)) continue;

    result.push(vertexId);
  }

  return result;
}

/** 获取所有合法的城市升级位置 */
function getValidCityPositions(state: CatanGameState, playerId: string): string[] {
  // 城市只能在该玩家已有的村庄位置升级
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  return [...player.settlements];
}


// ============================================================
// 4.8 — 交易系统
// ============================================================

/**
 * 计算玩家可用的交易比率
 *
 * 规则：
 * - 默认所有资源 4:1
 * - 如果玩家在 3:1 通用港口有建筑（村庄/城市），所有资源降为 3:1
 * - 如果玩家在特定资源 2:1 港口有建筑，该资源降为 2:1
 * - 返回每种资源的最优比率
 */
export function getTradeRatios(state: CatanGameState, playerId: string): TradeRatios {
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  const ratios: Record<ResourceType, number> = {
    wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4,
  };
  let defaultRatio = 4;

  // 收集玩家所有建筑所在的顶点
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { default: defaultRatio, resources: ratios };

  const playerVertices = new Set([...player.settlements, ...player.cities]);

  // 遍历所有港口，检查玩家是否在港口顶点有建筑
  for (const harbor of state.map.harbors) {
    const hasBuilding = harbor.vertices.some(v => playerVertices.has(v));
    if (!hasBuilding) continue;

    if (harbor.type === 'generic') {
      // 3:1 通用港口：所有资源降为 3:1（如果当前比率更高）
      defaultRatio = Math.min(defaultRatio, 3);
      for (const r of resourceTypes) {
        ratios[r] = Math.min(ratios[r], 3);
      }
    } else {
      // 2:1 特定资源港口
      ratios[harbor.type] = Math.min(ratios[harbor.type], 2);
    }
  }

  return { default: defaultRatio, resources: ratios };
}

/**
 * 银行/港口交易
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 操作玩家必须是当前回合玩家
 * 3. offer 中只能有一种资源（银行交易是同种资源换任意资源）
 * 4. request 中只能有一种资源，数量为 1
 * 5. offer 的数量必须等于该资源的交易比率
 * 6. 玩家必须有足够的资源
 */
export function bankTrade(
  state: CatanGameState,
  playerId: string,
  offer: ResourceMap,
  request: ResourceMap,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

  // offer 中只能有一种资源，且数量 > 0
  const offerEntries = resourceTypes.filter(r => offer[r] > 0);
  if (offerEntries.length !== 1) return state;
  const offerResource = offerEntries[0];
  const offerAmount = offer[offerResource];

  // 检查 offer 中没有负数
  if (resourceTypes.some(r => offer[r] < 0)) return state;

  // request 中只能有一种资源，数量为 1
  const requestEntries = resourceTypes.filter(r => request[r] > 0);
  if (requestEntries.length !== 1) return state;
  const requestResource = requestEntries[0];
  if (request[requestResource] !== 1) return state;

  // 检查 request 中没有负数
  if (resourceTypes.some(r => request[r] < 0)) return state;

  // offer 和 request 不能是同一种资源
  if (offerResource === requestResource) return state;

  // 获取交易比率
  const tradeRatios = getTradeRatios(state, playerId);
  const requiredAmount = tradeRatios.resources[offerResource];

  // offer 的数量必须等于该资源的交易比率
  if (offerAmount !== requiredAmount) return state;

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 玩家必须有足够的资源
  if (!hasEnoughResources(player.resources, offer)) return state;

  // 执行交易：扣除 offer，增加 request
  const newResources = subtractResources(player.resources, offer);
  newResources[requestResource] += 1;

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, resources: newResources } : p,
  );

  return { ...state, players: newPlayers };
}

/**
 * 发起玩家交易
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 操作玩家必须是当前回合玩家
 * 3. offer 中至少有一种资源数量 > 0
 * 4. request 中至少有一种资源数量 > 0
 * 5. 玩家必须有足够的资源来提供 offer
 *
 * 生成唯一 tradeId，设置 state.currentTrade
 */
export function proposePlayerTrade(
  state: CatanGameState,
  playerId: string,
  offer: ResourceMap,
  request: ResourceMap,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

  // 检查没有负数
  if (resourceTypes.some(r => offer[r] < 0 || request[r] < 0)) return state;

  // offer 中至少有一种资源数量 > 0
  const hasOffer = resourceTypes.some(r => offer[r] > 0);
  if (!hasOffer) return state;

  // request 中至少有一种资源数量 > 0
  const hasRequest = resourceTypes.some(r => request[r] > 0);
  if (!hasRequest) return state;

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 玩家必须有足够的资源来提供 offer
  if (!hasEnoughResources(player.resources, offer)) return state;

  // 生成唯一 tradeId
  const tradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const trade: TradeProposal = {
    id: tradeId,
    proposerId: playerId,
    offer,
    request,
    acceptedBy: [],
  };

  return { ...state, currentTrade: trade };
}

/**
 * 接受玩家交易
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 必须有当前交易提案
 * 3. tradeId 必须匹配当前交易
 * 4. 接受者不能是发起者
 * 5. 双方资源都必须足够
 *
 * 执行资源交换，清除 currentTrade
 */
export function acceptPlayerTrade(
  state: CatanGameState,
  tradeId: string,
  accepterId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 必须有当前交易提案
  if (!state.currentTrade) return state;

  // tradeId 必须匹配
  if (state.currentTrade.id !== tradeId) return state;

  // 接受者不能是发起者
  if (state.currentTrade.proposerId === accepterId) return state;

  // 找到发起者和接受者
  const proposerIndex = state.players.findIndex(p => p.id === state.currentTrade!.proposerId);
  const accepterIndex = state.players.findIndex(p => p.id === accepterId);
  if (proposerIndex === -1 || accepterIndex === -1) return state;

  const proposer = state.players[proposerIndex];
  const accepter = state.players[accepterIndex];
  const { offer, request } = state.currentTrade;

  // 发起者必须有足够的 offer 资源
  if (!hasEnoughResources(proposer.resources, offer)) return state;

  // 接受者必须有足够的 request 资源（发起者的 request 是接受者需要提供的）
  if (!hasEnoughResources(accepter.resources, request)) return state;

  // 执行资源交换
  // 发起者：减去 offer，加上 request
  const newProposerResources = addResources(subtractResources(proposer.resources, offer), request);
  // 接受者：减去 request，加上 offer
  const newAccepterResources = addResources(subtractResources(accepter.resources, request), offer);

  const newPlayers = state.players.map((p, i) => {
    if (i === proposerIndex) return { ...p, resources: newProposerResources };
    if (i === accepterIndex) return { ...p, resources: newAccepterResources };
    return p;
  });

  return { ...state, players: newPlayers, currentTrade: null };
}


// ============================================================
// 6.1 — 回合管理与胜利判定
// ============================================================

/**
 * 计算玩家胜利分
 *
 * 胜利分 = 村庄数 × 1 + 城市数 × 2 + 最长道路奖励（0 或 2）
 *         + 最大骑士团奖励（0 或 2）+ 胜利分发展卡数
 */
export function calculateVictoryPoints(state: CatanGameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;

  let vp = 0;

  // 村庄数 × 1
  vp += player.settlements.length;

  // 城市数 × 2
  vp += player.cities.length * 2;

  // 最长道路奖励（0 或 2）
  if (player.hasLongestRoad) {
    vp += 2;
  }

  // 最大骑士团奖励（0 或 2）
  if (player.hasLargestArmy) {
    vp += 2;
  }

  // 胜利分发展卡数
  vp += player.devCards.filter(c => c === 'victory_point').length;

  return vp;
}

/**
 * 检查是否有玩家达到胜利条件（10 分）
 *
 * 如果有玩家达到 10 分，设置 phase 为 finished，winnerId 为该玩家 ID。
 * 返回更新后的状态。
 */
export function checkVictory(state: CatanGameState): CatanGameState {
  // 已经结束的游戏不再检查
  if (state.phase === 'finished') return state;

  for (const player of state.players) {
    const vp = calculateVictoryPoints(state, player.id);
    if (vp >= 10) {
      return {
        ...state,
        phase: 'finished',
        winnerId: player.id,
        // 同步更新所有玩家的 victoryPoints
        players: state.players.map(p => ({
          ...p,
          victoryPoints: calculateVictoryPoints(state, p.id),
        })),
      };
    }
  }

  return state;
}

/**
 * 结束回合并轮转玩家
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 操作玩家必须是当前回合玩家
 *
 * 逻辑：
 * - 清除 currentTrade
 * - 玩家索引轮转：(currentPlayerIndex + 1) % playerCount
 * - 回合数 +1
 * - 阶段重置为 roll_dice
 * - 重置 diceResult、devCardUsedThisTurn、devCardBoughtThisTurn
 */
export function endTurn(state: CatanGameState, playerId: string): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  const playerCount = state.players.length;
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % playerCount;

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    phase: 'roll_dice',
    turnNumber: state.turnNumber + 1,
    diceResult: null,
    currentTrade: null,
    devCardUsedThisTurn: false,
    devCardBoughtThisTurn: [],
    turnStartTime: Date.now(),
  };
}


// ============================================================
// 6.3 — 最长道路计算（DFS 算法）
// ============================================================

/**
 * 计算玩家最长连续道路长度
 *
 * 算法：
 * 1. 收集该玩家所有道路边
 * 2. 构建邻接图：顶点 → 相连的该玩家道路边列表
 * 3. 对于每条道路边的每个端点，启动 DFS：
 *    - 维护已访问边集合
 *    - 在每个顶点，如果该顶点有其他玩家的建筑（村庄/城市），则道路被截断，停止延伸
 *    - 否则，遍历该顶点连接的所有未访问的该玩家道路边，递归搜索
 *    - 记录最大深度
 * 4. 返回所有 DFS 路径中的最大长度
 *
 * 时间复杂度 O(E × 2^E)，但卡坦岛中单个玩家最多 15 条道路，实际搜索空间很小。
 */
export function calculateLongestRoad(state: CatanGameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.roads.length === 0) return 0;

  // 构建邻接图：顶点 → 该玩家的道路边列表
  const vertexToEdges = new Map<string, string[]>();
  for (const edgeId of player.roads) {
    const [v1, v2] = getEdgeEndpoints(edgeId);
    if (!vertexToEdges.has(v1)) vertexToEdges.set(v1, []);
    if (!vertexToEdges.has(v2)) vertexToEdges.set(v2, []);
    vertexToEdges.get(v1)!.push(edgeId);
    vertexToEdges.get(v2)!.push(edgeId);
  }

  let maxLength = 0;

  /**
   * DFS 递归搜索
   * @param vertex 当前所在顶点
   * @param visitedEdges 已访问的边集合
   * @param depth 当前路径长度（已走过的边数）
   */
  function dfs(vertex: string, visitedEdges: Set<string>, depth: number): void {
    if (depth > maxLength) {
      maxLength = depth;
    }

    const edges = vertexToEdges.get(vertex) ?? [];
    for (const edgeId of edges) {
      if (visitedEdges.has(edgeId)) continue;

      // 获取边的另一个端点
      const [v1, v2] = getEdgeEndpoints(edgeId);
      const nextVertex = v1 === vertex ? v2 : v1;

      // 检查下一个顶点是否被其他玩家的建筑截断
      const building = state.map.vertices[nextVertex];
      if (building && building.playerId !== playerId) {
        // 道路被截断：这条边可以计入长度，但不能继续延伸
        if (depth + 1 > maxLength) {
          maxLength = depth + 1;
        }
        continue;
      }

      // 继续 DFS
      visitedEdges.add(edgeId);
      dfs(nextVertex, visitedEdges, depth + 1);
      visitedEdges.delete(edgeId);
    }
  }

  // 对于每条道路边的每个端点，启动 DFS
  for (const edgeId of player.roads) {
    const [v1, v2] = getEdgeEndpoints(edgeId);

    // 从 v1 端点开始
    const visited1 = new Set<string>([edgeId]);
    // 检查 v1 是否被截断
    const buildingV1 = state.map.vertices[v1];
    if (!buildingV1 || buildingV1.playerId === playerId) {
      dfs(v1, visited1, 1);
    } else {
      // v1 被截断，只计这条边本身
      if (1 > maxLength) maxLength = 1;
    }

    // 从 v2 端点开始
    const visited2 = new Set<string>([edgeId]);
    const buildingV2 = state.map.vertices[v2];
    if (!buildingV2 || buildingV2.playerId === playerId) {
      dfs(v2, visited2, 1);
    } else {
      if (1 > maxLength) maxLength = 1;
    }
  }

  return maxLength;
}

/**
 * 更新所有玩家的最长道路称号和胜利分
 *
 * 规则：
 * - 重新计算所有玩家的 longestRoadLength
 * - 当某玩家最长连续道路 ≥ 5 且为所有玩家中最长时，授予"最长道路"称号和 2 额外胜利分
 * - 当另一位玩家超过当前持有者时，称号转移
 * - 平局时保持当前持有者不变（先到先得原则）
 * - 重新计算所有玩家的 victoryPoints
 */
export function updateLongestRoadAwards(state: CatanGameState): CatanGameState {
  // 计算所有玩家的最长道路长度
  const roadLengths = state.players.map(p => calculateLongestRoad(state, p.id));

  // 找到当前持有最长道路称号的玩家索引
  const currentHolderIndex = state.players.findIndex(p => p.hasLongestRoad);

  // 找到最大道路长度
  const maxLength = Math.max(...roadLengths);

  // 确定新的最长道路持有者
  let newHolderIndex = -1;

  if (maxLength >= 5) {
    // 找到所有达到最大长度的玩家
    const candidates = roadLengths
      .map((len, idx) => ({ len, idx }))
      .filter(c => c.len === maxLength);

    if (candidates.length === 1) {
      // 只有一个玩家达到最大长度，直接授予
      newHolderIndex = candidates[0].idx;
    } else {
      // 多个玩家平局
      if (currentHolderIndex !== -1 && roadLengths[currentHolderIndex] === maxLength) {
        // 当前持有者仍在平局中，保持不变
        newHolderIndex = currentHolderIndex;
      } else {
        // 当前持有者不在平局中（或没有持有者），没有人获得称号
        newHolderIndex = -1;
      }
    }
  }

  // 更新玩家状态
  const newPlayers = state.players.map((p, i) => {
    const newLongestRoadLength = roadLengths[i];
    const newHasLongestRoad = i === newHolderIndex;

    // 重新计算胜利分
    let vp = p.settlements.length + p.cities.length * 2;
    if (newHasLongestRoad) vp += 2;
    if (p.hasLargestArmy) vp += 2;
    vp += p.devCards.filter(c => c === 'victory_point').length;

    return {
      ...p,
      longestRoadLength: newLongestRoadLength,
      hasLongestRoad: newHasLongestRoad,
      victoryPoints: vp,
    };
  });

  return { ...state, players: newPlayers };
}


// ============================================================
// 6.6 — 状态脱敏函数
// ============================================================

import type {
  ClientCatanPlayer,
  ClientCatanGameState,
} from './types.js';

/**
 * 将完整游戏状态转换为客户端可见状态（脱敏）
 *
 * - 隐藏其他玩家的资源手牌具体内容，仅显示数量
 * - 隐藏其他玩家的发展卡具体内容，仅显示数量
 * - 包含当前玩家自己的完整资源、发展卡、可建造位置、交易比率
 */
export function toClientGameState(
  state: CatanGameState,
  playerId: string,
): ClientCatanGameState {
  // 找到当前玩家
  const currentPlayer = state.players.find(p => p.id === playerId);

  // 脱敏玩家列表：隐藏资源和发展卡具体内容
  const players: ClientCatanPlayer[] = state.players.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    resourceCount: totalResources(p.resources),
    settlements: p.settlements,
    cities: p.cities,
    roads: p.roads,
    devCardCount: p.devCards.length,
    knightsPlayed: p.knightsPlayed,
    longestRoadLength: p.longestRoadLength,
    hasLongestRoad: p.hasLongestRoad,
    hasLargestArmy: p.hasLargestArmy,
    victoryPoints: p.victoryPoints,
    isHost: p.isHost,
    isAI: p.isAI,
    isConnected: p.isConnected,
  }));

  // 当前玩家的完整资源和发展卡
  const myResources: ResourceMap = currentPlayer
    ? { ...currentPlayer.resources }
    : emptyResources();

  const myDevCards = currentPlayer ? [...currentPlayer.devCards] : [];

  // 当前玩家可合法建造的位置
  let validPositions: { roads: string[]; settlements: string[]; cities: string[] };

  if (currentPlayer && (state.phase === 'setup_settlement' || state.phase === 'setup_road')) {
    // 初始放置阶段：不需要连通性检查，单独计算合法位置
    const isCurrentTurn = state.setupState
      ? state.players[state.setupState.order[state.setupState.currentIndex]]?.id === playerId
      : false;

    if (isCurrentTurn && state.phase === 'setup_settlement') {
      // 所有满足距离规则的空顶点
      const allVerts = getAllVertexIds();
      const validSettlements: string[] = [];
      for (const v of allVerts) {
        if (state.map.vertices[v]) continue;
        const adj = getAdjacentVertices(v);
        if (adj.some(a => state.map.vertices[a])) continue;
        validSettlements.push(v);
      }
      validPositions = { roads: [], settlements: validSettlements, cities: [] };
    } else if (isCurrentTurn && state.phase === 'setup_road') {
      // 与刚放置的村庄相邻的空边
      const lastSettlement = currentPlayer.settlements[currentPlayer.settlements.length - 1];
      const adjEdges = lastSettlement ? getAdjacentEdges(lastSettlement) : [];
      const validRoads = adjEdges.filter(e => !state.map.edges[e]);
      validPositions = { roads: validRoads, settlements: [], cities: [] };
    } else {
      validPositions = { roads: [], settlements: [], cities: [] };
    }
  } else {
    validPositions = {
      roads: currentPlayer ? getValidBuildPositions(state, playerId, 'road') : [],
      settlements: currentPlayer ? getValidBuildPositions(state, playerId, 'settlement') : [],
      cities: currentPlayer ? getValidBuildPositions(state, playerId, 'city') : [],
    };
  }

  // 当前玩家可用的交易比率
  const tradeRatios = getTradeRatios(state, playerId);

  return {
    roomId: state.roomId,
    map: state.map,
    players,
    currentPlayerIndex: state.currentPlayerIndex,
    phase: state.phase,
    setupState: state.setupState,
    diceResult: state.diceResult,
    discardState: state.discardState,
    currentTrade: state.currentTrade,
    turnNumber: state.turnNumber,
    winnerId: state.winnerId,
    turnStartTime: state.turnStartTime,
    log: state.log,
    myResources,
    myDevCards,
    validPositions,
    tradeRatios,
  };
}


// ============================================================
// 发展卡系统
// ============================================================

/**
 * 创建标准发展卡牌堆并 Fisher-Yates 洗牌
 *
 * 标准牌堆：14 骑士卡 + 5 胜利分卡 + 2 道路建设 + 2 发明 + 2 垄断 = 25 张
 */
export function initDevCardDeck(): DevCardDeck {
  const cards: DevCardType[] = [
    ...Array(14).fill('knight' as DevCardType),
    ...Array(5).fill('victory_point' as DevCardType),
    ...Array(2).fill('road_building' as DevCardType),
    ...Array(2).fill('year_of_plenty' as DevCardType),
    ...Array(2).fill('monopoly' as DevCardType),
  ];
  const shuffled = shuffle(cards);
  return { cards: shuffled, remaining: shuffled.length };
}

/**
 * 购买发展卡
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build
 * 2. 操作玩家必须是当前回合玩家
 * 3. 资源足够：1矿石 + 1小麦 + 1羊毛
 * 4. devCardDeck 不为空且有剩余卡
 *
 * 逻辑：
 * - 从牌堆顶部抽取 1 张发放给玩家
 * - 记录到 devCardBoughtThisTurn（当回合不能使用）
 * - 扣除资源
 * - 如果抽到胜利分卡，自动计入分数并检查胜利
 */
export function buyDevelopmentCard(
  state: CatanGameState,
  playerId: string,
): CatanGameState {
  // 阶段校验
  if (state.phase !== 'trade_build') return state;

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  // 牌堆校验
  if (!state.devCardDeck || state.devCardDeck.remaining <= 0) return state;

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 资源检查：1矿石 + 1小麦 + 1羊毛
  const cost = BUILD_COSTS['devCard'];
  if (!hasEnoughResources(player.resources, cost)) return state;

  // 从牌堆顶部抽取 1 张
  const drawnCard = state.devCardDeck.cards[0];
  const newDeckCards = state.devCardDeck.cards.slice(1);
  const newDeck: DevCardDeck = {
    cards: newDeckCards,
    remaining: newDeckCards.length,
  };

  // 扣除资源，发放卡牌
  const newResources = subtractResources(player.resources, cost);
  const newDevCards = [...player.devCards, drawnCard];

  // 如果抽到胜利分卡，自动计入分数
  const vpBonus = drawnCard === 'victory_point' ? 1 : 0;

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          resources: newResources,
          devCards: newDevCards,
          victoryPoints: p.victoryPoints + vpBonus,
        }
      : p,
  );

  return {
    ...state,
    players: newPlayers,
    devCardDeck: newDeck,
    devCardBoughtThisTurn: [...state.devCardBoughtThisTurn, drawnCard],
  };
}

/**
 * 使用发展卡
 *
 * 校验规则：
 * 1. 当前阶段必须是 trade_build（骑士卡可以在 roll_dice 阶段使用）
 * 2. 操作玩家必须是当前回合玩家
 * 3. 玩家手牌中必须有该卡
 * 4. 本回合未使用过发展卡（devCardUsedThisTurn === false）
 * 5. 该卡不是本回合购买的（不在 devCardBoughtThisTurn 中）
 * 6. 胜利分卡不能主动使用（自动计入分数）
 *
 * 发展卡类型和效果：
 * - 骑士卡 (knight)：进入 move_robber 阶段，knightsPlayed +1
 * - 道路建设 (road_building)：免费建造 2 条道路
 * - 发明 (year_of_plenty)：从银行获取任意 2 张资源
 * - 垄断 (monopoly)：指定一种资源，所有其他玩家该资源全部交给你
 */
export function useDevelopmentCard(
  state: CatanGameState,
  playerId: string,
  cardType: DevCardType,
  params?: DevCardParams,
): CatanGameState {
  // 胜利分卡不能主动使用
  if (cardType === 'victory_point') return state;

  // 阶段校验：骑士卡可以在 roll_dice 阶段使用，其他卡只能在 trade_build 阶段
  if (cardType === 'knight') {
    if (state.phase !== 'trade_build' && state.phase !== 'roll_dice') return state;
  } else {
    if (state.phase !== 'trade_build') return state;
  }

  // 玩家校验：必须是当前回合玩家
  if (state.players[state.currentPlayerIndex]?.id !== playerId) return state;

  // 本回合未使用过发展卡
  if (state.devCardUsedThisTurn) return state;

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  // 玩家手牌中必须有该卡
  const cardIndex = player.devCards.indexOf(cardType);
  if (cardIndex === -1) return state;

  // 该卡不是本回合购买的：检查 devCardBoughtThisTurn 中是否有该类型
  // 需要精确匹配：如果本回合买了 1 张骑士卡，但手牌中有 2 张骑士卡，仍可使用 1 张
  const boughtCount = state.devCardBoughtThisTurn.filter(c => c === cardType).length;
  const handCount = player.devCards.filter(c => c === cardType).length;
  if (handCount <= boughtCount) return state;

  // 从手牌中移除该卡（移除第一张匹配的）
  const newDevCards = [...player.devCards];
  newDevCards.splice(cardIndex, 1);

  // 根据卡牌类型执行效果
  switch (cardType) {
    case 'knight':
      return useKnightCard(state, playerIndex, newDevCards);
    case 'road_building':
      return useRoadBuildingCard(state, playerIndex, newDevCards, params);
    case 'year_of_plenty':
      return useYearOfPlentyCard(state, playerIndex, newDevCards, params);
    case 'monopoly':
      return useMonopolyCard(state, playerIndex, newDevCards, params);
    default:
      return state;
  }
}

/**
 * 骑士卡效果：进入 move_robber 阶段，knightsPlayed +1
 */
function useKnightCard(
  state: CatanGameState,
  playerIndex: number,
  newDevCards: DevCardType[],
): CatanGameState {
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, devCards: newDevCards, knightsPlayed: p.knightsPlayed + 1 }
      : p,
  );

  const newState: CatanGameState = {
    ...state,
    players: newPlayers,
    phase: 'move_robber',
    devCardUsedThisTurn: true,
  };

  // 更新最大骑士团称号
  return updateLargestArmyAwards(newState);
}

/**
 * 道路建设卡效果：免费建造 2 条道路
 * params.edges: [string, string] — 两条道路的边 ID
 */
function useRoadBuildingCard(
  state: CatanGameState,
  playerIndex: number,
  newDevCards: DevCardType[],
  params?: DevCardParams,
): CatanGameState {
  if (!params?.edges || params.edges.length !== 2) return state;

  const playerId = state.players[playerIndex].id;
  const [edge1, edge2] = params.edges;

  // 更新玩家手牌和标记已使用
  let newState: CatanGameState = {
    ...state,
    players: state.players.map((p, i) =>
      i === playerIndex ? { ...p, devCards: newDevCards } : p,
    ),
    devCardUsedThisTurn: true,
  };

  // 免费建造第一条道路（不检查资源，只检查位置合法性）
  newState = buildRoadFree(newState, playerId, edge1);
  if (newState === state) return state; // 第一条道路非法

  // 免费建造第二条道路
  const stateAfterFirst = newState;
  newState = buildRoadFree(newState, playerId, edge2);
  // 第二条道路非法时，仍保留第一条道路的效果
  if (newState === stateAfterFirst) {
    // 只建了一条路也算使用成功
    return updateLongestRoadAwards(stateAfterFirst);
  }

  return updateLongestRoadAwards(newState);
}

/**
 * 免费建造道路（不扣资源，仅检查位置合法性和连通性）
 */
function buildRoadFree(
  state: CatanGameState,
  playerId: string,
  edgeId: string,
): CatanGameState {
  // 边有效性校验
  if (!getAllEdgeIds().includes(edgeId)) return state;

  // 边无道路校验
  if (state.map.edges[edgeId]) return state;

  // 连通性校验
  const [v1, v2] = getEdgeEndpoints(edgeId);
  if (!isRoadConnected(state, playerId, v1) && !isRoadConnected(state, playerId, v2)) {
    return state;
  }

  // 找到玩家
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  // 放置道路
  const newEdges = { ...state.map.edges, [edgeId]: { playerId } };
  const newMap: HexMap = { ...state.map, edges: newEdges };

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, roads: [...p.roads, edgeId] }
      : p,
  );

  return { ...state, map: newMap, players: newPlayers };
}

/**
 * 发明卡效果：从银行获取任意 2 张资源
 * params.resources: [ResourceType, ResourceType]
 */
function useYearOfPlentyCard(
  state: CatanGameState,
  playerIndex: number,
  newDevCards: DevCardType[],
  params?: DevCardParams,
): CatanGameState {
  if (!params?.resources || params.resources.length !== 2) return state;

  const [res1, res2] = params.resources;
  const validResources: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  if (!validResources.includes(res1) || !validResources.includes(res2)) return state;

  const player = state.players[playerIndex];
  const newResources = { ...player.resources };
  newResources[res1] += 1;
  newResources[res2] += 1;

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, devCards: newDevCards, resources: newResources }
      : p,
  );

  return {
    ...state,
    players: newPlayers,
    devCardUsedThisTurn: true,
  };
}

/**
 * 垄断卡效果：指定一种资源，所有其他玩家该资源全部交给你
 * params.resource: ResourceType
 */
function useMonopolyCard(
  state: CatanGameState,
  playerIndex: number,
  newDevCards: DevCardType[],
  params?: DevCardParams,
): CatanGameState {
  if (!params?.resource) return state;

  const targetResource = params.resource;
  const validResources: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  if (!validResources.includes(targetResource)) return state;

  // 计算从其他玩家收集的总量
  let totalCollected = 0;
  const newPlayers = state.players.map((p, i) => {
    if (i === playerIndex) return p; // 先跳过当前玩家
    const amount = p.resources[targetResource];
    totalCollected += amount;
    return {
      ...p,
      resources: { ...p.resources, [targetResource]: 0 },
    };
  });

  // 更新当前玩家：加上收集的资源，更新手牌
  const finalPlayers = newPlayers.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          devCards: newDevCards,
          resources: {
            ...p.resources,
            [targetResource]: p.resources[targetResource] + totalCollected,
          },
        }
      : p,
  );

  return {
    ...state,
    players: finalPlayers,
    devCardUsedThisTurn: true,
  };
}

/**
 * 更新最大骑士团称号和胜利分
 *
 * 规则（类似最长道路）：
 * - 当某玩家使用的骑士卡 >= 3 且为最多时，授予"最大骑士团"称号和 2 额外胜利分
 * - 称号转移和平局规则与最长道路相同
 */
export function updateLargestArmyAwards(state: CatanGameState): CatanGameState {
  const knightCounts = state.players.map(p => p.knightsPlayed);

  // 找到当前持有最大骑士团称号的玩家索引
  const currentHolderIndex = state.players.findIndex(p => p.hasLargestArmy);

  // 找到最大骑士数量
  const maxKnights = Math.max(...knightCounts);

  // 确定新的最大骑士团持有者
  let newHolderIndex = -1;

  if (maxKnights >= 3) {
    // 找到所有达到最大数量的玩家
    const candidates = knightCounts
      .map((count, idx) => ({ count, idx }))
      .filter(c => c.count === maxKnights);

    if (candidates.length === 1) {
      // 只有一个玩家达到最大数量，直接授予
      newHolderIndex = candidates[0].idx;
    } else {
      // 多个玩家平局
      if (currentHolderIndex !== -1 && knightCounts[currentHolderIndex] === maxKnights) {
        // 当前持有者仍在平局中，保持不变
        newHolderIndex = currentHolderIndex;
      } else {
        // 当前持有者不在平局中（或没有持有者），没有人获得称号
        newHolderIndex = -1;
      }
    }
  }

  // 更新玩家状态
  const newPlayers = state.players.map((p, i) => {
    const newHasLargestArmy = i === newHolderIndex;

    // 重新计算胜利分
    let vp = p.settlements.length + p.cities.length * 2;
    if (p.hasLongestRoad) vp += 2;
    if (newHasLargestArmy) vp += 2;
    vp += p.devCards.filter(c => c === 'victory_point').length;

    return {
      ...p,
      hasLargestArmy: newHasLargestArmy,
      victoryPoints: vp,
    };
  });

  return { ...state, players: newPlayers };
}
