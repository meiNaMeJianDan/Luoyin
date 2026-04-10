/**
 * 卡坦岛 AI 托管策略模块
 *
 * 实现简单贪心 AI 策略，用于掉线玩家托管和 AI 玩家自动操作。
 * AI 决策返回操作描述对象，由 socket 层调用引擎函数执行。
 * 参考 UNO AI 模块的实现模式。
 */

import type {
  CatanGameState,
  ResourceType,
  ResourceMap,
} from './types.js';
import { BUILD_COSTS, TERRAIN_RESOURCE } from './types.js';
import {
  getAdjacentVertices,
  getAdjacentEdges,
  getAdjacentHexes,
  getEdgeEndpoints,
  getAllVertexIds,
  getHexVertices,
} from './map.js';
import { getValidBuildPositions } from './engine.js';

// ============================================================
// AI 决策返回类型
// ============================================================

/** AI 初始放置村庄决策 */
export interface AiSetupSettlementAction {
  action: 'place_settlement';
  vertexId: string;
}

/** AI 初始放置道路决策 */
export interface AiSetupRoadAction {
  action: 'place_road';
  edgeId: string;
}

/** AI 掷骰决策 */
export interface AiRollDiceAction {
  action: 'roll_dice';
}

/** AI 建造道路决策 */
export interface AiBuildRoadAction {
  action: 'build_road';
  edgeId: string;
}

/** AI 建造村庄决策 */
export interface AiBuildSettlementAction {
  action: 'build_settlement';
  vertexId: string;
}

/** AI 建造城市决策 */
export interface AiBuildCityAction {
  action: 'build_city';
  vertexId: string;
}

/** AI 结束回合决策 */
export interface AiEndTurnAction {
  action: 'end_turn';
}

/** AI 丢弃资源决策 */
export interface AiDiscardAction {
  action: 'discard';
  resources: ResourceMap;
}

/** AI 移动强盗决策 */
export interface AiMoveRobberAction {
  action: 'move_robber';
  hexId: string;
}

/** AI 抢夺决策 */
export interface AiStealAction {
  action: 'steal';
  targetPlayerId: string;
}

/** AI 决策联合类型 */
export type AiAction =
  | AiSetupSettlementAction
  | AiSetupRoadAction
  | AiRollDiceAction
  | AiBuildRoadAction
  | AiBuildSettlementAction
  | AiBuildCityAction
  | AiEndTurnAction
  | AiDiscardAction
  | AiMoveRobberAction
  | AiStealAction;

// ============================================================
// 辅助函数
// ============================================================

/** 计算玩家手牌总数 */
function totalResources(resources: ResourceMap): number {
  return resources.wood + resources.brick + resources.sheep + resources.wheat + resources.ore;
}

/** 检查资源是否足够支付费用 */
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
// 9.2.1 — 初始放置决策
// ============================================================

/**
 * AI 初始放置决策
 *
 * 策略：
 * - 村庄：选择相邻资源最多样化的顶点（不同资源类型数量最多）
 * - 道路：选择与刚放置的村庄相邻的随机空边
 *
 * @param state - 当前游戏状态
 * @param playerId - AI 玩家 ID
 * @returns 放置村庄或道路的操作描述
 */
export function aiDecideSetup(
  state: CatanGameState,
  playerId: string,
): AiSetupSettlementAction | AiSetupRoadAction {
  if (state.phase === 'setup_settlement') {
    return aiDecideSetupSettlement(state, playerId);
  }
  // setup_road 阶段
  return aiDecideSetupRoad(state, playerId);
}

/**
 * AI 选择初始村庄位置
 *
 * 贪心策略：选择相邻资源种类最多样化的合法顶点。
 * 如果多样性相同，优先选择相邻地块数量更多的顶点。
 */
function aiDecideSetupSettlement(
  state: CatanGameState,
  _playerId: string,
): AiSetupSettlementAction {
  const allVertices = getAllVertexIds();
  let bestVertex = allVertices[0];
  let bestScore = -1;

  for (const vertexId of allVertices) {
    // 顶点已有建筑，跳过
    if (state.map.vertices[vertexId]) continue;

    // 距离规则：相邻顶点均无建筑
    const adjacentVertices = getAdjacentVertices(vertexId);
    if (adjacentVertices.some(v => state.map.vertices[v])) continue;

    // 计算相邻地块的资源多样性
    const adjacentHexes = getAdjacentHexes(vertexId, state.map.tiles);
    const resourceTypes = new Set<ResourceType>();
    for (const hex of adjacentHexes) {
      const resource = TERRAIN_RESOURCE[hex.terrain];
      if (resource) {
        resourceTypes.add(resource);
      }
    }

    // 评分：资源种类数 × 10 + 相邻非沙漠地块数
    const score = resourceTypes.size * 10 + adjacentHexes.filter(h => h.terrain !== 'desert').length;

    if (score > bestScore) {
      bestScore = score;
      bestVertex = vertexId;
    }
  }

  return { action: 'place_settlement', vertexId: bestVertex };
}

/**
 * AI 选择初始道路位置
 *
 * 策略：选择与刚放置的村庄相邻的随机空边。
 */
function aiDecideSetupRoad(
  state: CatanGameState,
  playerId: string,
): AiSetupRoadAction {
  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    // 兜底：返回第一条可用边
    return { action: 'place_road', edgeId: '0,0,0' };
  }

  // 最后放置的村庄
  const lastSettlement = player.settlements[player.settlements.length - 1];
  if (!lastSettlement) {
    return { action: 'place_road', edgeId: '0,0,0' };
  }

  // 获取该村庄相邻的所有边
  const adjacentEdges = getAdjacentEdges(lastSettlement);
  const availableEdges = adjacentEdges.filter(e => !state.map.edges[e]);

  if (availableEdges.length === 0) {
    return { action: 'place_road', edgeId: adjacentEdges[0] };
  }

  // 随机选择一条空边
  const randomIndex = Math.floor(Math.random() * availableEdges.length);
  return { action: 'place_road', edgeId: availableEdges[randomIndex] };
}

// ============================================================
// 9.2.2 — 掷骰阶段决策
// ============================================================

/**
 * AI 掷骰阶段决策
 *
 * 策略：直接掷骰，无需额外判断。
 */
export function aiDecideRollPhase(
  _state: CatanGameState,
  _playerId: string,
): AiRollDiceAction {
  return { action: 'roll_dice' };
}

// ============================================================
// 9.2.3 — 交易/建造阶段决策
// ============================================================

/**
 * AI 交易/建造阶段决策
 *
 * 贪心优先级：建造城市 > 建造村庄 > 建造道路 > 结束回合
 * 检查资源是否足够，选择第一个可执行的操作。
 */
export function aiDecideTradeBuild(
  state: CatanGameState,
  playerId: string,
): AiBuildCityAction | AiBuildSettlementAction | AiBuildRoadAction | AiEndTurnAction {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { action: 'end_turn' };

  const resources = player.resources;

  // 优先级 1：建造城市（3矿石 + 2小麦）
  if (hasEnoughResources(resources, BUILD_COSTS['city'])) {
    const validCities = getValidBuildPositions(state, playerId, 'city');
    if (validCities.length > 0) {
      return { action: 'build_city', vertexId: validCities[0] };
    }
  }

  // 优先级 2：建造村庄（1木材 + 1黏土 + 1羊毛 + 1小麦）
  if (hasEnoughResources(resources, BUILD_COSTS['settlement'])) {
    const validSettlements = getValidBuildPositions(state, playerId, 'settlement');
    if (validSettlements.length > 0) {
      return { action: 'build_settlement', vertexId: validSettlements[0] };
    }
  }

  // 优先级 3：建造道路（1木材 + 1黏土）
  if (hasEnoughResources(resources, BUILD_COSTS['road'])) {
    const validRoads = getValidBuildPositions(state, playerId, 'road');
    if (validRoads.length > 0) {
      // 选择一条随机道路，增加多样性
      const randomIndex = Math.floor(Math.random() * validRoads.length);
      return { action: 'build_road', edgeId: validRoads[randomIndex] };
    }
  }

  // 无法建造任何东西，结束回合
  return { action: 'end_turn' };
}

// ============================================================
// 9.2.4 — 丢弃资源决策
// ============================================================

/**
 * AI 丢弃资源决策
 *
 * 策略：优先丢弃数量最多的资源类型，尽量保留资源多样性。
 * 丢弃数量 = 手牌总量的一半（向下取整）。
 */
export function aiDecideDiscard(
  state: CatanGameState,
  playerId: string,
): AiDiscardAction {
  const player = state.players.find(p => p.id === playerId);
  const resources = player ? { ...player.resources } : { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

  const total = totalResources(resources);
  let toDiscard = Math.floor(total / 2);

  const discardMap: ResourceMap = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const remaining = { ...resources };

  // 按数量从多到少排序资源类型，优先丢弃数量最多的
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

  while (toDiscard > 0) {
    // 每轮重新排序，找到当前数量最多的资源
    resourceTypes.sort((a, b) => remaining[b] - remaining[a]);

    const topResource = resourceTypes[0];
    if (remaining[topResource] <= 0) break;

    // 丢弃一张该资源
    discardMap[topResource] += 1;
    remaining[topResource] -= 1;
    toDiscard -= 1;
  }

  return { action: 'discard', resources: discardMap };
}

// ============================================================
// 9.2.5 — 移动强盗决策
// ============================================================

/**
 * AI 移动强盗决策
 *
 * 策略：移动到有其他玩家建筑的地块（优先选择有更多其他玩家建筑的地块）。
 * 避免移动到自己有建筑的地块。
 */
export function aiDecideRobber(
  state: CatanGameState,
  playerId: string,
): AiMoveRobberAction {
  let bestHexId = '';
  let bestScore = -1;

  for (const tile of state.map.tiles) {
    // 跳过当前强盗所在地块
    if (tile.hasRobber) continue;

    const hexId = `${tile.coord.q},${tile.coord.r}`;
    const vertices = getHexVertices(tile.coord.q, tile.coord.r);

    let otherPlayerBuildings = 0;
    let myBuildings = 0;

    for (const vertexId of vertices) {
      const building = state.map.vertices[vertexId];
      if (!building) continue;

      if (building.playerId === playerId) {
        myBuildings += 1;
      } else {
        otherPlayerBuildings += building.type === 'city' ? 2 : 1;
      }
    }

    // 评分：其他玩家建筑数越多越好，自己有建筑则扣分
    const score = otherPlayerBuildings * 10 - myBuildings * 20;

    if (score > bestScore) {
      bestScore = score;
      bestHexId = hexId;
    }
  }

  // 兜底：如果没找到合适的地块，选择第一个非强盗地块
  if (!bestHexId) {
    const fallback = state.map.tiles.find(t => !t.hasRobber);
    bestHexId = fallback ? `${fallback.coord.q},${fallback.coord.r}` : '0,0';
  }

  return { action: 'move_robber', hexId: bestHexId };
}

// ============================================================
// 9.2.6 — 抢夺决策
// ============================================================

/**
 * AI 抢夺决策
 *
 * 策略：从强盗所在地块有建筑的其他玩家中，选择资源最多的玩家。
 */
export function aiDecideSteal(
  state: CatanGameState,
  playerId: string,
): AiStealAction {
  // 找到强盗所在地块
  const robberTile = state.map.tiles.find(t => t.hasRobber);
  if (!robberTile) {
    // 兜底：选择第一个其他玩家
    const otherPlayer = state.players.find(p => p.id !== playerId);
    return { action: 'steal', targetPlayerId: otherPlayer?.id ?? '' };
  }

  // 获取强盗地块上有建筑的其他玩家
  const vertices = getHexVertices(robberTile.coord.q, robberTile.coord.r);
  const candidateIds = new Set<string>();

  for (const vertexId of vertices) {
    const building = state.map.vertices[vertexId];
    if (building && building.playerId !== playerId) {
      candidateIds.add(building.playerId);
    }
  }

  if (candidateIds.size === 0) {
    // 没有可抢夺的玩家，选择第一个其他玩家
    const otherPlayer = state.players.find(p => p.id !== playerId);
    return { action: 'steal', targetPlayerId: otherPlayer?.id ?? '' };
  }

  // 从候选玩家中选择资源最多的
  let bestTargetId = '';
  let maxResources = -1;

  for (const candidateId of candidateIds) {
    const candidate = state.players.find(p => p.id === candidateId);
    if (!candidate) continue;

    const total = totalResources(candidate.resources);
    if (total > maxResources) {
      maxResources = total;
      bestTargetId = candidateId;
    }
  }

  return { action: 'steal', targetPlayerId: bestTargetId };
}
