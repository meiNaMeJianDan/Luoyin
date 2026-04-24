/**
 * 德国心脏病游戏引擎 — 核心逻辑模块
 *
 * 所有函数设计为纯函数（接收状态，返回新状态），便于测试。
 * 唯一的副作用来源是洗牌时的随机数生成。
 */

import type {
  FruitCard,
  FruitType,
  FruitCount,
  HalliPlayer,
  HalliGameState,
  ClientHalliPlayer,
  ClientHalliGameState,
} from './types.js';
import { FRUIT_TYPES, CARD_DISTRIBUTION } from './types.js';

// ============================================================
// 3.1 — 牌组生成
// ============================================================

/**
 * 生成标准 56 张水果牌组
 *
 * 每种水果 14 张，数量分布：
 * - 1 个水果 × 3 张
 * - 2 个水果 × 3 张
 * - 3 个水果 × 3 张
 * - 4 个水果 × 2 张
 * - 5 个水果 × 3 张
 *
 * 每张牌的 ID 格式："水果-数量-副本序号"
 */
export function createDeck(): FruitCard[] {
  const cards: FruitCard[] = [];

  for (const fruit of FRUIT_TYPES) {
    for (const [countStr, copies] of Object.entries(CARD_DISTRIBUTION)) {
      const count = Number(countStr);
      for (let copy = 0; copy < copies; copy++) {
        cards.push({
          id: `${fruit}-${count}-${copy}`,
          fruit,
          count,
        });
      }
    }
  }

  return cards;
}

// ============================================================
// 3.2 — Fisher-Yates 洗牌
// ============================================================

/**
 * Fisher-Yates 洗牌算法
 * 返回一个新的洗好的数组，不修改原数组。
 */
export function shuffleDeck(deck: FruitCard[]): FruitCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// 3.3 — 游戏初始化（洗牌 + 发牌）
// ============================================================

/**
 * 初始化游戏状态
 *
 * - 生成并洗牌
 * - 按轮询方式均匀发牌给所有玩家
 * - 每位玩家获得 floor(56/N) 或 ceil(56/N) 张牌，差值不超过 1
 * - 初始阶段为 flip，从第一位玩家开始
 */
export function initGame(
  players: HalliPlayer[],
  roomId: string = '',
): HalliGameState {
  const deck = shuffleDeck(createDeck());

  // 按轮询方式发牌：依次分配给每位玩家
  const playerCount = players.length;
  const piles: FruitCard[][] = Array.from({ length: playerCount }, () => []);

  for (let i = 0; i < deck.length; i++) {
    piles[i % playerCount].push(deck[i]);
  }

  // 初始化玩家状态
  const gamePlayers: HalliPlayer[] = players.map((p, idx) => ({
    ...p,
    drawPile: piles[idx],
    discardPile: [],
    isEliminated: false,
    eliminationOrder: null,
  }));

  // 初始水果计数（所有堆顶牌为空，计数全为 0）
  const topFruitCounts: FruitCount = {
    banana: 0,
    strawberry: 0,
    cherry: 0,
    lime: 0,
  };

  return {
    roomId,
    players: gamePlayers,
    currentPlayerIndex: 0,
    phase: 'flip',
    bellRings: [],
    topFruitCounts,
    bellConditionMet: false,
    winnerId: null,
    eliminationCount: 0,
    turnStartTime: Date.now(),
    log: [],
  };
}

// ============================================================
// 3.5 — 牌组序列化 / 反序列化
// ============================================================

/**
 * 序列化牌组为 JSON 字符串
 */
export function serializeDeck(deck: FruitCard[]): string {
  return JSON.stringify(deck);
}

/**
 * 反序列化 JSON 字符串为牌组
 */
export function deserializeDeck(json: string): FruitCard[] {
  return JSON.parse(json) as FruitCard[];
}

// ============================================================
// 2.5 — 翻牌和回合轮转逻辑
// ============================================================

/**
 * 计算所有未淘汰玩家 Discard_Pile 堆顶牌中每种水果的总数
 *
 * 遍历所有未淘汰玩家，取其 Discard_Pile 堆顶牌（最后一个元素），
 * 累加对应水果的数量。
 */
export function countTopFruits(state: HalliGameState): FruitCount {
  const counts: FruitCount = {
    banana: 0,
    strawberry: 0,
    cherry: 0,
    lime: 0,
  };

  for (const player of state.players) {
    // 跳过已淘汰玩家
    if (player.isEliminated) continue;
    // 取 Discard_Pile 堆顶牌（数组最后一个元素）
    const topCard = player.discardPile[player.discardPile.length - 1];
    if (topCard) {
      counts[topCard.fruit] += topCard.count;
    }
  }

  return counts;
}

/**
 * 检查是否满足按铃条件
 *
 * 当任意一种水果在所有堆顶牌中的总数恰好为 5 时，返回 true。
 */
export function checkBellCondition(state: HalliGameState): boolean {
  const counts = countTopFruits(state);
  return FRUIT_TYPES.some((fruit) => counts[fruit] === 5);
}

/**
 * 翻转 Discard_Pile 为新的 Draw_Pile（不重新洗牌）
 *
 * 将指定玩家的 Discard_Pile 翻转（reverse）作为新的 Draw_Pile。
 * 翻转后 Discard_Pile 清空。
 */
export function recycleDiscardPile(
  state: HalliGameState,
  playerId: string,
): HalliGameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  // 只有 Draw_Pile 为空且 Discard_Pile 不为空时才翻转
  if (player.drawPile.length > 0 || player.discardPile.length === 0) {
    return state;
  }

  // 翻转 Discard_Pile 为新的 Draw_Pile（reverse 模拟物理翻转）
  const newDrawPile = [...player.discardPile].reverse();
  const newPlayers = state.players.map((p, idx) =>
    idx === playerIndex
      ? { ...p, drawPile: newDrawPile, discardPile: [] }
      : p,
  );

  return {
    ...state,
    players: newPlayers,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'recycle' as const,
        details: `${player.name} 的弃牌堆翻转为新的摸牌堆`,
      },
    ],
  };
}

/**
 * 执行翻牌操作
 *
 * 校验：阶段为 flip，操作者为当前玩家，玩家未淘汰。
 * 如果 Draw_Pile 为空且 Discard_Pile 不为空，先翻转 Discard_Pile。
 * 取 Draw_Pile 顶部一张牌放到 Discard_Pile 顶部。
 * 重新计算水果总数和按铃条件，进入 bell_window 阶段。
 */
export function flipCard(
  state: HalliGameState,
  playerId: string,
): HalliGameState {
  // 校验阶段
  if (state.phase !== 'flip') return state;

  // 校验操作者是否为当前玩家
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return state;

  // 校验玩家未淘汰
  if (currentPlayer.isEliminated) return state;

  // 如果 Draw_Pile 为空且 Discard_Pile 不为空，先翻转 Discard_Pile
  let workingState = state;
  if (
    currentPlayer.drawPile.length === 0 &&
    currentPlayer.discardPile.length > 0
  ) {
    workingState = recycleDiscardPile(workingState, playerId);
  }

  // 翻转后重新获取玩家引用
  const player = workingState.players[workingState.currentPlayerIndex];

  // 如果 Draw_Pile 仍为空，无法翻牌（理论上不应发生，因为 checkElimination 会先处理）
  if (player.drawPile.length === 0) return workingState;

  // 取 Draw_Pile 顶部一张牌（数组最后一个元素）放到 Discard_Pile 顶部
  const flippedCard = player.drawPile[player.drawPile.length - 1];
  const newDrawPile = player.drawPile.slice(0, -1);
  const newDiscardPile = [...player.discardPile, flippedCard];

  const newPlayers = workingState.players.map((p, idx) =>
    idx === workingState.currentPlayerIndex
      ? { ...p, drawPile: newDrawPile, discardPile: newDiscardPile }
      : p,
  );

  // 构建翻牌后的临时状态，用于计算水果总数
  const stateAfterFlip: HalliGameState = {
    ...workingState,
    players: newPlayers,
  };

  // 重新计算水果总数和按铃条件
  const topFruitCounts = countTopFruits(stateAfterFlip);
  const bellConditionMet = checkBellCondition(stateAfterFlip);

  return {
    ...stateAfterFlip,
    phase: 'bell_window',
    bellRings: [],
    topFruitCounts,
    bellConditionMet,
    log: [
      ...workingState.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'flip' as const,
        details: `${player.name} 翻开了 ${flippedCard.count} 个 ${flippedCard.fruit}`,
      },
    ],
  };
}

/**
 * 推进到下一位未淘汰玩家的回合
 *
 * 从当前玩家索引开始顺时针查找下一位未淘汰玩家，
 * 设置新的 currentPlayerIndex，阶段设为 flip。
 */
export function advanceTurn(state: HalliGameState): HalliGameState {
  const playerCount = state.players.length;
  let nextIndex = (state.currentPlayerIndex + 1) % playerCount;

  // 顺时针查找下一位未淘汰玩家（最多循环一圈）
  for (let i = 0; i < playerCount; i++) {
    if (!state.players[nextIndex].isEliminated) {
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        phase: 'flip',
        bellRings: [],
        turnStartTime: Date.now(),
      };
    }
    nextIndex = (nextIndex + 1) % playerCount;
  }

  // 所有玩家都被淘汰（理论上不应发生）
  return state;
}

/**
 * 检查并标记已淘汰的玩家
 *
 * Draw_Pile 和 Discard_Pile 均为空的玩家标记为淘汰。
 */
export function checkElimination(state: HalliGameState): HalliGameState {
  let eliminationCount = state.eliminationCount;
  const newLog = [...state.log];

  const newPlayers = state.players.map((player) => {
    // 已经淘汰的跳过
    if (player.isEliminated) return player;

    // 两堆均为空则淘汰
    if (player.drawPile.length === 0 && player.discardPile.length === 0) {
      eliminationCount++;
      newLog.push({
        timestamp: Date.now(),
        playerId: player.id,
        action: 'eliminated' as const,
        details: `${player.name} 已被淘汰`,
      });
      return {
        ...player,
        isEliminated: true,
        eliminationOrder: eliminationCount,
      };
    }

    return player;
  });

  return {
    ...state,
    players: newPlayers,
    eliminationCount,
    log: newLog,
  };
}

// ============================================================
// 4.1 — 按铃判定和胜利逻辑
// ============================================================

/**
 * 检查胜利条件
 *
 * 仅剩一位未淘汰玩家时，游戏阶段变为 finished，
 * 设置 winnerId 为该玩家的 ID，并添加 game_over 日志。
 */
export function checkVictory(state: HalliGameState): HalliGameState {
  const activePlayers = state.players.filter((p) => !p.isEliminated);

  // 仅剩一位未淘汰玩家时判定胜利
  if (activePlayers.length !== 1) return state;

  const winner = activePlayers[0];

  return {
    ...state,
    phase: 'finished',
    winnerId: winner.id,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId: winner.id,
        action: 'game_over' as const,
        details: `${winner.name} 获得胜利！`,
      },
    ],
  };
}

/**
 * 处理按铃操作
 *
 * 校验：阶段为 bell_window，玩家未淘汰。
 * 判定按铃是否正确（bellConditionMet）：
 * - 正确按铃：收集所有未淘汰玩家的 Discard_Pile，放入按铃玩家 Draw_Pile 底部
 * - 错误按铃：从按铃玩家 Draw_Pile 顶部取牌，向每位未淘汰的其他玩家各分发 1 张
 * 按铃后检查淘汰和胜利条件，推进到下一回合。
 */
export function ringBell(
  state: HalliGameState,
  playerId: string,
): HalliGameState {
  // 校验阶段为 bell_window
  if (state.phase !== 'bell_window') return state;

  // 查找按铃玩家
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // 校验玩家未淘汰
  if (player.isEliminated) return state;

  // 进入 bell_judging 阶段
  let workingState: HalliGameState = {
    ...state,
    phase: 'bell_judging',
  };

  if (workingState.bellConditionMet) {
    // ========== 正确按铃：收集所有未淘汰玩家的 Discard_Pile ==========
    const collectedCards: FruitCard[] = [];
    const newPlayers = workingState.players.map((p) => {
      if (p.isEliminated) return p;
      // 收集该玩家的全部 Discard_Pile
      collectedCards.push(...p.discardPile);
      return { ...p, discardPile: [] };
    });

    // 将收集的牌放入按铃玩家的 Draw_Pile 底部（数组开头）
    const ringerNewDrawPile = [...collectedCards, ...newPlayers[playerIndex].drawPile];
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      drawPile: ringerNewDrawPile,
    };

    workingState = {
      ...workingState,
      players: newPlayers,
      log: [
        ...workingState.log,
        {
          timestamp: Date.now(),
          playerId,
          action: 'ring_correct' as const,
          details: `${player.name} 正确按铃，收集了 ${collectedCards.length} 张牌`,
        },
      ],
    };
  } else {
    // ========== 错误按铃：向其他未淘汰玩家各分发 1 张牌 ==========
    const otherActivePlayers = workingState.players.filter(
      (p) => !p.isEliminated && p.id !== playerId,
    );
    const penaltyCount = Math.min(
      otherActivePlayers.length,
      player.drawPile.length,
    );

    // 从按铃玩家 Draw_Pile 顶部（数组末尾）取牌
    const penaltyCards = player.drawPile.slice(player.drawPile.length - penaltyCount);
    const remainingDrawPile = player.drawPile.slice(0, player.drawPile.length - penaltyCount);

    // 构建需要接收罚牌的玩家 ID 集合
    const receiversIds = new Set(
      otherActivePlayers.slice(0, penaltyCount).map((p) => p.id),
    );

    let cardIdx = 0;
    const newPlayers = workingState.players.map((p) => {
      if (p.id === playerId) {
        return { ...p, drawPile: remainingDrawPile };
      }
      if (!p.isEliminated && p.id !== playerId && receiversIds.has(p.id) && cardIdx < penaltyCards.length) {
        // 将罚牌放到该玩家 Discard_Pile 顶部（数组末尾）
        const card = penaltyCards[cardIdx];
        cardIdx++;
        return { ...p, discardPile: [...p.discardPile, card] };
      }
      return p;
    });

    workingState = {
      ...workingState,
      players: newPlayers,
      log: [
        ...workingState.log,
        {
          timestamp: Date.now(),
          playerId,
          action: 'ring_wrong' as const,
          details: `${player.name} 错误按铃，罚出 ${penaltyCount} 张牌`,
        },
      ],
    };
  }

  // 检查淘汰
  workingState = checkElimination(workingState);

  // 检查胜利条件
  workingState = checkVictory(workingState);

  // 如果游戏已结束，不再推进回合
  if (workingState.phase === 'finished') {
    return workingState;
  }

  // 重新计算水果总数和按铃条件
  const topFruitCounts = countTopFruits(workingState);
  const bellConditionMet = checkBellCondition(workingState);

  workingState = {
    ...workingState,
    topFruitCounts,
    bellConditionMet,
  };

  // 推进到下一回合
  workingState = advanceTurn(workingState);

  return workingState;
}

// ============================================================
// 4.5 — 状态脱敏
// ============================================================

/**
 * 将完整游戏状态转换为客户端可见状态（脱敏）
 *
 * - 隐藏所有玩家 Draw_Pile 的具体牌面，仅暴露牌数（drawPileCount）
 * - Discard_Pile 仅暴露堆顶牌（topCard）和牌数（discardPileCount）
 * - 其余公开信息原样传递
 *
 * @param state   服务端完整游戏状态
 * @param playerId 当前请求的玩家 ID（预留，当前所有玩家视角一致）
 * @returns 客户端可见的脱敏游戏状态
 */
export function toClientGameState(
  state: HalliGameState,
  playerId: string,
): ClientHalliGameState {
  const players: ClientHalliPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    drawPileCount: p.drawPile.length,
    topCard: p.discardPile.length > 0
      ? p.discardPile[p.discardPile.length - 1]
      : null,
    discardPileCount: p.discardPile.length,
    isEliminated: p.isEliminated,
    eliminationOrder: p.eliminationOrder,
    isHost: p.isHost,
    isAI: p.isAI,
    isConnected: p.isConnected,
  }));

  return {
    roomId: state.roomId,
    players,
    currentPlayerIndex: state.currentPlayerIndex,
    phase: state.phase,
    topFruitCounts: state.topFruitCounts,
    bellConditionMet: state.bellConditionMet,
    winnerId: state.winnerId,
    turnStartTime: state.turnStartTime,
    log: state.log,
  };
}
