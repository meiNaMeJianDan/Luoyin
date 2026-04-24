// ============================================================
// 璀璨宝石（Splendor）游戏引擎 — 纯函数实现
// ============================================================

import type {
  SplendorPlayer,
  SplendorGameState,
  GemMap,
  BasicGemMap,
  GemColor,
  CardLevel,
  DevelopmentCard,
  Noble,
  ClientSplendorPlayer,
  ClientSplendorGameState,
  HiddenReservedCard,
  PlayerRanking,
} from './types.js';

import {
  GEM_COLORS,
  GEM_COUNT_BY_PLAYERS,
  GOLD_COUNT,
  DISPLAY_SIZE,
  NOBLE_COUNT_BY_PLAYERS,
  MAX_GEMS_IN_HAND,
  MAX_RESERVED_CARDS,
  MIN_GEMS_FOR_TAKE_TWO,
  VICTORY_PRESTIGE,
} from './types.js';

import {
  getLevel1Cards,
  getLevel2Cards,
  getLevel3Cards,
  getAllNobles,
  getCardById,
  getNobleById,
} from './cards.js';

// ============================================================
// 辅助函数
// ============================================================

/**
 * Fisher-Yates 洗牌算法
 * 返回一个新的随机排列数组，不修改原数组
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================
// 游戏初始化
// ============================================================

/**
 * 初始化游戏状态
 * 根据玩家人数设置宝石池、洗牌、翻开展示卡、抽取贵族
 */
export function initGame(players: SplendorPlayer[], roomId: string): SplendorGameState {
  const playerCount = players.length;

  // 根据玩家人数初始化宝石池
  const gemCount = GEM_COUNT_BY_PLAYERS[playerCount];
  const gemPool: GemMap = {
    diamond: gemCount,
    sapphire: gemCount,
    emerald: gemCount,
    ruby: gemCount,
    onyx: gemCount,
    gold: GOLD_COUNT,
  };

  // 洗牌 3 个等级的牌堆（存储卡牌 ID）
  const level1Ids = shuffle(getLevel1Cards().map(c => c.id));
  const level2Ids = shuffle(getLevel2Cards().map(c => c.id));
  const level3Ids = shuffle(getLevel3Cards().map(c => c.id));

  // 从每个等级牌堆翻开 4 张到展示区（从数组末尾取出，末尾为顶部）
  const display1 = level1Ids.splice(-DISPLAY_SIZE, DISPLAY_SIZE);
  const display2 = level2Ids.splice(-DISPLAY_SIZE, DISPLAY_SIZE);
  const display3 = level3Ids.splice(-DISPLAY_SIZE, DISPLAY_SIZE);

  // 随机抽取（玩家数+1）张贵族
  const nobleCount = NOBLE_COUNT_BY_PLAYERS[playerCount];
  const allNobleIds = shuffle(getAllNobles().map(n => n.id));
  const selectedNobles = allNobleIds.slice(0, nobleCount);

  // 初始化所有玩家状态（宝石为 0，卡牌/贵族为空）
  const initializedPlayers: SplendorPlayer[] = players.map(p => ({
    ...p,
    gems: { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 },
    purchasedCards: [],
    reservedCards: [],
    nobles: [],
    prestige: 0,
  }));

  return {
    roomId,
    players: initializedPlayers,
    currentPlayerIndex: 0,
    phase: 'player_turn',
    gemPool,
    decks: {
      1: level1Ids,
      2: level2Ids,
      3: level3Ids,
    } as Record<CardLevel, string[]>,
    display: {
      1: display1,
      2: display2,
      3: display3,
    } as Record<CardLevel, string[]>,
    nobles: selectedNobles,
    isLastRound: false,
    lastRoundTriggerIndex: null,
    turnNumber: 1,
    winnerId: null,
    turnStartTime: Date.now(),
    log: [],
  };
}

// ============================================================
// 玩家 Bonus 计算
// ============================================================

/**
 * 计算玩家的 Bonus 总数
 * 遍历已购买的发展卡，统计每种颜色的 Bonus 数量
 */
export function getPlayerBonus(player: SplendorPlayer): BasicGemMap {
  const bonus: BasicGemMap = { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 };
  for (const cardId of player.purchasedCards) {
    const card = getCardById(cardId);
    if (card) {
      bonus[card.bonus] += 1;
    }
  }
  return bonus;
}

// ============================================================
// 序列化 / 反序列化
// ============================================================

/** 序列化游戏状态为 JSON 字符串 */
export function serializeGameState(state: SplendorGameState): string {
  return JSON.stringify(state);
}

/** 反序列化 JSON 字符串为游戏状态 */
export function deserializeGameState(json: string): SplendorGameState {
  return JSON.parse(json) as SplendorGameState;
}

// ============================================================
// 辅助函数：宝石计算
// ============================================================

/** 计算宝石映射中的宝石总数 */
export function getTotalGems(gems: GemMap): number {
  return gems.diamond + gems.sapphire + gems.emerald + gems.ruby + gems.onyx + gems.gold;
}

/** 创建全 0 的 GemMap */
export function emptyGemMap(): GemMap {
  return { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 };
}

// ============================================================
// 任务 5.1 — 宝石拿取逻辑
// ============================================================

/**
 * 拿取 3 种不同颜色的普通宝石各 1 个
 * - 校验：阶段为 player_turn，操作者为当前玩家
 * - 校验：gems 数组长度 1-3，颜色互不相同，不含黄金
 * - 校验：每种颜色在 Gem_Pool 中至少有 1 个
 * - 如果可选颜色不足 3 种，允许拿取实际可用种类数
 */
export function takeThreeGems(
  state: SplendorGameState,
  playerId: string,
  gems: GemColor[],
): SplendorGameState | { error: string } {
  // 阶段校验
  if (state.phase !== 'player_turn' && state.phase !== 'last_round') {
    return { error: '当前阶段不允许此操作' };
  }

  // 当前玩家校验
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { error: '不是你的回合' };
  }

  // 长度校验
  if (gems.length < 1 || gems.length > 3) {
    return { error: '所选宝石颜色不足' };
  }

  // 不含黄金校验
  for (const gem of gems) {
    if ((gem as string) === 'gold') {
      return { error: '不能主动拿取黄金宝石' };
    }
  }

  // 颜色互不相同校验
  const uniqueGems = new Set(gems);
  if (uniqueGems.size !== gems.length) {
    return { error: '所选宝石颜色不足' };
  }

  // 计算可选颜色数量（Gem_Pool 中至少有 1 个的颜色）
  const availableColors = GEM_COLORS.filter(c => state.gemPool[c] > 0);

  // 如果可选颜色不足 3 种，允许拿取实际可用种类数；否则必须拿 3 种
  if (availableColors.length >= 3 && gems.length < 3) {
    return { error: '所选宝石颜色不足' };
  }

  // 如果可选颜色不足，拿取数量不能超过可用种类数
  if (gems.length > availableColors.length) {
    return { error: '所选宝石颜色不足' };
  }

  // 校验每种颜色在 Gem_Pool 中至少有 1 个
  for (const gem of gems) {
    if (state.gemPool[gem] < 1) {
      return { error: '所选宝石颜色不足' };
    }
  }

  // 执行拿取：从 Gem_Pool 移除宝石到玩家手中
  const newGemPool = { ...state.gemPool };
  const newPlayerGems = { ...currentPlayer.gems };
  for (const gem of gems) {
    newGemPool[gem] -= 1;
    newPlayerGems[gem] += 1;
  }

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, gems: newPlayerGems } : p,
  );

  // 检查是否需要归还宝石
  const totalGems = getTotalGems(newPlayerGems);
  const newPhase = totalGems > MAX_GEMS_IN_HAND ? 'return_gems' as const : state.phase;

  return {
    ...state,
    gemPool: newGemPool,
    players: newPlayers,
    phase: newPhase,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'take_gems' as const,
        details: `拿取宝石：${gems.join(', ')}`,
      },
    ],
  };
}

/**
 * 拿取同一种颜色的普通宝石 2 个
 * - 校验：阶段为 player_turn，操作者为当前玩家
 * - 校验：该颜色在 Gem_Pool 中 >= 4
 */
export function takeTwoGems(
  state: SplendorGameState,
  playerId: string,
  gem: GemColor,
): SplendorGameState | { error: string } {
  // 阶段校验
  if (state.phase !== 'player_turn' && state.phase !== 'last_round') {
    return { error: '当前阶段不允许此操作' };
  }

  // 当前玩家校验
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { error: '不是你的回合' };
  }

  // 不含黄金校验
  if ((gem as string) === 'gold') {
    return { error: '不能主动拿取黄金宝石' };
  }

  // 该颜色在 Gem_Pool 中 >= 4
  if (state.gemPool[gem] < MIN_GEMS_FOR_TAKE_TWO) {
    return { error: '该颜色宝石数量不足，无法拿取2个' };
  }

  // 执行拿取
  const newGemPool = { ...state.gemPool };
  const newPlayerGems = { ...currentPlayer.gems };
  newGemPool[gem] -= 2;
  newPlayerGems[gem] += 2;

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, gems: newPlayerGems } : p,
  );

  // 检查是否需要归还宝石
  const totalGems = getTotalGems(newPlayerGems);
  const newPhase = totalGems > MAX_GEMS_IN_HAND ? 'return_gems' as const : state.phase;

  return {
    ...state,
    gemPool: newGemPool,
    players: newPlayers,
    phase: newPhase,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'take_gems' as const,
        details: `拿取 2 个 ${gem} 宝石`,
      },
    ],
  };
}

// ============================================================
// 任务 5.2 — 宝石归还逻辑
// ============================================================

/**
 * 归还多余宝石（宝石超过 10 个时）
 * - 校验：阶段为 return_gems
 * - 校验：归还的宝石不超过玩家持有量
 * - 校验：归还后手中宝石总数等于 10
 */
export function returnGems(
  state: SplendorGameState,
  playerId: string,
  gems: GemMap,
): SplendorGameState | { error: string } {
  // 阶段校验
  if (state.phase !== 'return_gems') {
    return { error: '当前阶段不允许此操作' };
  }

  // 当前玩家校验
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { error: '不是你的回合' };
  }

  // 校验归还的宝石不超过玩家持有量
  const allGemKeys: (GemColor | 'gold')[] = [...GEM_COLORS, 'gold'];
  for (const key of allGemKeys) {
    if (gems[key] < 0) {
      return { error: '归还宝石数量不正确' };
    }
    if (gems[key] > currentPlayer.gems[key]) {
      return { error: '归还宝石数量不正确' };
    }
  }

  // 计算归还后的宝石总数
  const returnTotal = getTotalGems(gems);
  if (returnTotal === 0) {
    return { error: '归还宝石数量不正确' };
  }

  const currentTotal = getTotalGems(currentPlayer.gems);
  if (currentTotal - returnTotal !== MAX_GEMS_IN_HAND) {
    return { error: '归还宝石数量不正确' };
  }

  // 执行归还：从玩家手中归还到 Gem_Pool
  const newGemPool = { ...state.gemPool };
  const newPlayerGems = { ...currentPlayer.gems };
  for (const key of allGemKeys) {
    newGemPool[key] += gems[key];
    newPlayerGems[key] -= gems[key];
  }

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, gems: newPlayerGems } : p,
  );

  // 归还完成后恢复到 player_turn 或 last_round 阶段
  const newPhase = state.isLastRound ? 'last_round' as const : 'player_turn' as const;

  return {
    ...state,
    gemPool: newGemPool,
    players: newPlayers,
    phase: newPhase,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'return_gems' as const,
        details: `归还宝石`,
      },
    ],
  };
}

// ============================================================
// 任务 6.1 — 购买发展卡操作
// ============================================================

/**
 * 计算玩家购买某张卡需要支付的宝石
 * 考虑 Bonus 折扣和黄金万能宝石
 * - 优先使用对应颜色宝石，不足部分使用黄金万能宝石
 */
export function calculatePayment(
  player: SplendorPlayer,
  card: DevelopmentCard,
): { canAfford: true; payment: GemMap } | { canAfford: false } {
  const bonus = getPlayerBonus(player);
  const payment = emptyGemMap();
  let goldNeeded = 0;

  // 对每种颜色计算实际需要支付的宝石数
  for (const color of GEM_COLORS) {
    const actualCost = Math.max(0, card.cost[color] - bonus[color]);
    // 优先使用对应颜色宝石
    const colorPaid = Math.min(actualCost, player.gems[color]);
    payment[color] = colorPaid;
    // 不足部分累计到黄金需求
    goldNeeded += actualCost - colorPaid;
  }

  // 使用黄金万能宝石补足剩余
  if (goldNeeded > player.gems.gold) {
    return { canAfford: false };
  }

  payment.gold = goldNeeded;
  return { canAfford: true, payment };
}

/**
 * 从牌堆补充一张卡到展示区
 * 内部辅助函数
 */
function refillDisplay(
  decks: Record<CardLevel, string[]>,
  display: Record<CardLevel, string[]>,
  level: CardLevel,
): { decks: Record<CardLevel, string[]>; display: Record<CardLevel, string[]> } {
  const newDecks = {
    1: [...decks[1]],
    2: [...decks[2]],
    3: [...decks[3]],
  } as Record<CardLevel, string[]>;
  const newDisplay = {
    1: [...display[1]],
    2: [...display[2]],
    3: [...display[3]],
  } as Record<CardLevel, string[]>;

  // 如果展示区未满且牌堆非空，从牌堆顶部（数组末尾）补充
  if (newDisplay[level].length < DISPLAY_SIZE && newDecks[level].length > 0) {
    const topCard = newDecks[level].pop()!;
    newDisplay[level].push(topCard);
  }

  return { decks: newDecks, display: newDisplay };
}

/**
 * 购买展示区或预留区中的发展卡
 * - 校验：阶段为 player_turn，操作者为当前玩家
 * - 支持购买展示区和预留区的卡
 * - 扣除宝石归还 Gem_Pool，卡移至已购买列表
 * - 更新 prestige，展示区空位从牌堆补充
 */
export function buyCard(
  state: SplendorGameState,
  playerId: string,
  cardId: string,
): SplendorGameState | { error: string } {
  // 阶段校验
  if (state.phase !== 'player_turn' && state.phase !== 'last_round') {
    return { error: '当前阶段不允许此操作' };
  }

  // 当前玩家校验
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { error: '不是你的回合' };
  }

  // 查找卡牌
  const card = getCardById(cardId);
  if (!card) {
    return { error: '该卡不在展示区中' };
  }

  // 判断卡在展示区还是预留区
  const level = card.level;
  const inDisplay = state.display[level].includes(cardId);
  const inReserved = currentPlayer.reservedCards.includes(cardId);

  if (!inDisplay && !inReserved) {
    return { error: '该卡不在展示区中' };
  }

  // 计算支付方案
  const paymentResult = calculatePayment(currentPlayer, card);
  if (!paymentResult.canAfford) {
    return { error: '资源不足' };
  }

  const { payment } = paymentResult;

  // 扣除宝石归还 Gem_Pool
  const newGemPool = { ...state.gemPool };
  const newPlayerGems = { ...currentPlayer.gems };
  const allGemKeys: (GemColor | 'gold')[] = [...GEM_COLORS, 'gold'];
  for (const key of allGemKeys) {
    newPlayerGems[key] -= payment[key];
    newGemPool[key] += payment[key];
  }

  // 更新已购买列表和预留列表
  const newPurchasedCards = [...currentPlayer.purchasedCards, cardId];
  const newReservedCards = inReserved
    ? currentPlayer.reservedCards.filter(id => id !== cardId)
    : currentPlayer.reservedCards;

  // 更新声望
  const newPrestige = currentPlayer.prestige + card.prestige;

  // 更新展示区和牌堆
  let newDecks = state.decks;
  let newDisplay = state.display;

  if (inDisplay) {
    // 从展示区移除
    newDisplay = {
      1: [...state.display[1]],
      2: [...state.display[2]],
      3: [...state.display[3]],
    } as Record<CardLevel, string[]>;
    newDisplay[level] = newDisplay[level].filter(id => id !== cardId);

    // 从牌堆补充
    const refilled = refillDisplay(state.decks, newDisplay, level);
    newDecks = refilled.decks;
    newDisplay = refilled.display;
  }

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? {
          ...p,
          gems: newPlayerGems,
          purchasedCards: newPurchasedCards,
          reservedCards: newReservedCards,
          prestige: newPrestige,
        }
      : p,
  );

  return {
    ...state,
    gemPool: newGemPool,
    players: newPlayers,
    decks: newDecks,
    display: newDisplay,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'buy_card' as const,
        details: `购买发展卡 ${cardId}`,
      },
    ],
  };
}

// ============================================================
// 任务 7.1 — 预留发展卡操作
// ============================================================

/**
 * 预留展示区中的一张发展卡
 * - 校验：阶段为 player_turn，预留上限 3 张
 * - 卡从展示区移至预留列表，给予 1 个黄金（无黄金时不给）
 * - 展示区空位从牌堆补充
 */
export function reserveDisplayCard(
  state: SplendorGameState,
  playerId: string,
  cardId: string,
): SplendorGameState | { error: string } {
  // 阶段校验
  if (state.phase !== 'player_turn' && state.phase !== 'last_round') {
    return { error: '当前阶段不允许此操作' };
  }

  // 当前玩家校验
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { error: '不是你的回合' };
  }

  // 预留上限校验
  if (currentPlayer.reservedCards.length >= MAX_RESERVED_CARDS) {
    return { error: '预留卡已达上限（3张）' };
  }

  // 查找卡牌
  const card = getCardById(cardId);
  if (!card) {
    return { error: '该卡不在展示区中' };
  }

  // 校验卡在展示区
  const level = card.level;
  if (!state.display[level].includes(cardId)) {
    return { error: '该卡不在展示区中' };
  }

  // 从展示区移除
  const newDisplay = {
    1: [...state.display[1]],
    2: [...state.display[2]],
    3: [...state.display[3]],
  } as Record<CardLevel, string[]>;
  newDisplay[level] = newDisplay[level].filter(id => id !== cardId);

  // 从牌堆补充
  const refilled = refillDisplay(state.decks, newDisplay, level);

  // 给予黄金万能宝石（如果 Gem_Pool 中有）
  const newGemPool = { ...state.gemPool };
  const newPlayerGems = { ...currentPlayer.gems };
  if (newGemPool.gold > 0) {
    newGemPool.gold -= 1;
    newPlayerGems.gold += 1;
  }

  // 更新预留列表
  const newReservedCards = [...currentPlayer.reservedCards, cardId];

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, gems: newPlayerGems, reservedCards: newReservedCards }
      : p,
  );

  // 检查是否需要归还宝石
  const totalGems = getTotalGems(newPlayerGems);
  const newPhase = totalGems > MAX_GEMS_IN_HAND ? 'return_gems' as const : state.phase;

  return {
    ...state,
    gemPool: newGemPool,
    players: newPlayers,
    decks: refilled.decks,
    display: refilled.display,
    phase: newPhase,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'reserve_card' as const,
        details: `预留展示区发展卡 ${cardId}`,
      },
    ],
  };
}

/**
 * 预留某等级牌堆顶部的一张发展卡（盲抽）
 * - 校验：阶段为 player_turn，预留上限 3 张，牌堆非空
 * - 牌堆顶部卡移至预留列表，给予 1 个黄金
 */
export function reserveDeckCard(
  state: SplendorGameState,
  playerId: string,
  level: CardLevel,
): SplendorGameState | { error: string } {
  // 阶段校验
  if (state.phase !== 'player_turn' && state.phase !== 'last_round') {
    return { error: '当前阶段不允许此操作' };
  }

  // 当前玩家校验
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { error: '不是你的回合' };
  }

  // 预留上限校验
  if (currentPlayer.reservedCards.length >= MAX_RESERVED_CARDS) {
    return { error: '预留卡已达上限（3张）' };
  }

  // 牌堆非空校验
  if (state.decks[level].length === 0) {
    return { error: '该等级牌堆已空' };
  }

  // 从牌堆顶部（数组末尾）取出一张卡
  const newDecks = {
    1: [...state.decks[1]],
    2: [...state.decks[2]],
    3: [...state.decks[3]],
  } as Record<CardLevel, string[]>;
  const topCardId = newDecks[level].pop()!;

  // 给予黄金万能宝石（如果 Gem_Pool 中有）
  const newGemPool = { ...state.gemPool };
  const newPlayerGems = { ...currentPlayer.gems };
  if (newGemPool.gold > 0) {
    newGemPool.gold -= 1;
    newPlayerGems.gold += 1;
  }

  // 更新预留列表
  const newReservedCards = [...currentPlayer.reservedCards, topCardId];

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, gems: newPlayerGems, reservedCards: newReservedCards }
      : p,
  );

  // 检查是否需要归还宝石
  const totalGems = getTotalGems(newPlayerGems);
  const newPhase = totalGems > MAX_GEMS_IN_HAND ? 'return_gems' as const : state.phase;

  return {
    ...state,
    gemPool: newGemPool,
    players: newPlayers,
    decks: newDecks,
    display: state.display,
    phase: newPhase,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'reserve_card' as const,
        details: `盲抽预留等级 ${level} 发展卡`,
      },
    ],
  };
}

// ============================================================
// 任务 8.1 — 贵族拜访逻辑
// ============================================================

/**
 * 检查玩家是否满足贵族拜访条件
 * 返回可拜访的贵族列表
 */
export function checkNobleVisit(state: SplendorGameState, playerId: string): Noble[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  const bonus = getPlayerBonus(player);
  const visitableNobles: Noble[] = [];

  for (const nobleId of state.nobles) {
    const noble = getNobleById(nobleId);
    if (!noble) continue;

    // 检查玩家的 Bonus 是否满足贵族的 requirements
    let satisfied = true;
    for (const color of GEM_COLORS) {
      if (bonus[color] < noble.requirements[color]) {
        satisfied = false;
        break;
      }
    }

    if (satisfied) {
      visitableNobles.push(noble);
    }
  }

  return visitableNobles;
}

/**
 * 自动执行贵族拜访（仅满足一位贵族时自动拜访）
 * 如果满足 0 位或多位贵族，不做任何操作
 */
export function autoNobleVisit(state: SplendorGameState, playerId: string): SplendorGameState {
  const visitableNobles = checkNobleVisit(state, playerId);

  // 仅满足一位贵族时自动拜访
  if (visitableNobles.length !== 1) {
    return state;
  }

  const noble = visitableNobles[0];
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // 贵族从公共展示区移至玩家列表
  const newNobles = state.nobles.filter(id => id !== noble.id);
  const newPlayerNobles = [...player.nobles, noble.id];
  const newPrestige = player.prestige + noble.prestige;

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, nobles: newPlayerNobles, prestige: newPrestige }
      : p,
  );

  return {
    ...state,
    nobles: newNobles,
    players: newPlayers,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'noble_visit' as const,
        details: `贵族 ${noble.name} 来访`,
      },
    ],
  };
}

/**
 * 选择一位贵族进行拜访（满足多位贵族条件时）
 * - 校验：阶段为 choose_noble
 * - 校验：所选贵族在可拜访列表中
 */
export function selectNoble(
  state: SplendorGameState,
  playerId: string,
  nobleId: string,
): SplendorGameState | { error: string } {
  // 阶段校验
  if (state.phase !== 'choose_noble') {
    return { error: '当前阶段不允许此操作' };
  }

  // 当前玩家校验
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { error: '不是你的回合' };
  }

  // 校验所选贵族在可拜访列表中
  const visitableNobles = checkNobleVisit(state, playerId);
  const noble = visitableNobles.find(n => n.id === nobleId);
  if (!noble) {
    return { error: '无效的贵族选择' };
  }

  // 贵族从公共展示区移至玩家列表
  const newNobles = state.nobles.filter(id => id !== nobleId);
  const newPlayerNobles = [...currentPlayer.nobles, nobleId];
  const newPrestige = currentPlayer.prestige + noble.prestige;

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, nobles: newPlayerNobles, prestige: newPrestige }
      : p,
  );

  // 选择完成后恢复到 player_turn 或 last_round 阶段
  const newPhase = state.isLastRound ? 'last_round' as const : 'player_turn' as const;

  return {
    ...state,
    nobles: newNobles,
    players: newPlayers,
    phase: newPhase,
    log: [
      ...state.log,
      {
        timestamp: Date.now(),
        playerId,
        action: 'noble_visit' as const,
        details: `选择贵族 ${noble.name} 来访`,
      },
    ],
  };
}

// ============================================================
// 任务 8.2 — 回合管理和胜利判定
// ============================================================

/**
 * 推进到下一位玩家的回合
 * currentPlayerIndex 按 (currentIndex + 1) % playerCount 递增
 */
export function advanceTurn(state: SplendorGameState): SplendorGameState {
  const playerCount = state.players.length;
  const nextIndex = (state.currentPlayerIndex + 1) % playerCount;

  // 如果是最后一轮且回到了触发玩家，说明本轮结束，交给 checkVictory 处理
  const newTurnNumber = nextIndex === 0 ? state.turnNumber + 1 : state.turnNumber;

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnNumber: newTurnNumber,
    turnStartTime: Date.now(),
    phase: state.isLastRound ? 'last_round' as const : 'player_turn' as const,
  };
}

/**
 * 检查胜利条件
 * - 当任意玩家声望 >= 15 时，标记 isLastRound = true
 * - 最后一轮结束后（回到触发玩家的前一位之后），结算胜负
 */
export function checkVictory(state: SplendorGameState): SplendorGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // 如果尚未触发最后一轮，检查当前玩家是否达到 15 分
  if (!state.isLastRound && currentPlayer.prestige >= VICTORY_PRESTIGE) {
    return {
      ...state,
      isLastRound: true,
      lastRoundTriggerIndex: state.currentPlayerIndex,
      phase: 'last_round' as const,
    };
  }

  // 如果已经是最后一轮，检查本轮是否结束
  // 本轮结束条件：下一位玩家就是触发最后一轮的玩家
  if (state.isLastRound && state.lastRoundTriggerIndex !== null) {
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (nextIndex === state.lastRoundTriggerIndex) {
      // 本轮结束，结算胜负
      // 找出声望最高的玩家，平局时比较已购买卡牌数量（少者获胜）
      let winnerId: string | null = null;
      let maxPrestige = -1;
      let minCards = Infinity;

      for (const player of state.players) {
        if (player.prestige > maxPrestige) {
          maxPrestige = player.prestige;
          minCards = player.purchasedCards.length;
          winnerId = player.id;
        } else if (player.prestige === maxPrestige && player.purchasedCards.length < minCards) {
          minCards = player.purchasedCards.length;
          winnerId = player.id;
        }
      }

      return {
        ...state,
        phase: 'finished' as const,
        winnerId,
        log: [
          ...state.log,
          {
            timestamp: Date.now(),
            playerId: winnerId || '',
            action: 'game_over' as const,
            details: `游戏结束`,
          },
        ],
      };
    }
  }

  return state;
}

/**
 * 获取最终排名
 * 按声望降序排列，平局时已购买发展卡数量少者排名靠前
 */
export function getFinalRankings(state: SplendorGameState): PlayerRanking[] {
  const rankings: PlayerRanking[] = state.players.map(player => ({
    playerId: player.id,
    playerName: player.name,
    prestige: player.prestige,
    purchasedCardCount: player.purchasedCards.length,
    nobleCount: player.nobles.length,
    rank: 0,
  }));

  // 排序：声望降序，平局时卡牌数量升序
  rankings.sort((a, b) => {
    if (b.prestige !== a.prestige) return b.prestige - a.prestige;
    return a.purchasedCardCount - b.purchasedCardCount;
  });

  // 分配排名
  for (let i = 0; i < rankings.length; i++) {
    if (
      i > 0 &&
      rankings[i].prestige === rankings[i - 1].prestige &&
      rankings[i].purchasedCardCount === rankings[i - 1].purchasedCardCount
    ) {
      // 完全相同则排名相同
      rankings[i].rank = rankings[i - 1].rank;
    } else {
      rankings[i].rank = i + 1;
    }
  }

  return rankings;
}

// ============================================================
// 任务 8.5 — 状态脱敏
// ============================================================

/**
 * 将完整游戏状态转换为客户端可见状态（脱敏）
 * - 当前玩家预留卡显示完整 DevelopmentCard
 * - 其他玩家预留卡仅显示等级（HiddenReservedCard）
 * - 牌堆仅显示剩余数量
 */
export function toClientGameState(
  state: SplendorGameState,
  playerId: string,
): ClientSplendorGameState {
  // 转换玩家信息
  const clientPlayers: ClientSplendorPlayer[] = state.players.map(player => {
    const bonus = getPlayerBonus(player);
    const isCurrentPlayer = player.id === playerId;

    // 预留卡处理
    let reservedCards: (DevelopmentCard | HiddenReservedCard)[];
    if (isCurrentPlayer) {
      // 当前玩家：显示完整发展卡信息
      reservedCards = player.reservedCards
        .map(cardId => getCardById(cardId))
        .filter((card): card is DevelopmentCard => card !== undefined);
    } else {
      // 其他玩家：仅显示等级
      reservedCards = player.reservedCards
        .map(cardId => {
          const card = getCardById(cardId);
          if (!card) return null;
          return { level: card.level } as HiddenReservedCard;
        })
        .filter((card): card is HiddenReservedCard => card !== null);
    }

    return {
      id: player.id,
      name: player.name,
      gems: { ...player.gems },
      bonus,
      purchasedCardCount: player.purchasedCards.length,
      reservedCardCount: player.reservedCards.length,
      reservedCards,
      nobles: [...player.nobles],
      prestige: player.prestige,
      isHost: player.isHost,
      isAI: player.isAI,
      isConnected: player.isConnected,
    };
  });

  // 展示区：将卡牌 ID 转换为完整的 DevelopmentCard
  const clientDisplay = {
    1: state.display[1]
      .map(id => getCardById(id))
      .filter((c): c is DevelopmentCard => c !== undefined),
    2: state.display[2]
      .map(id => getCardById(id))
      .filter((c): c is DevelopmentCard => c !== undefined),
    3: state.display[3]
      .map(id => getCardById(id))
      .filter((c): c is DevelopmentCard => c !== undefined),
  } as Record<CardLevel, DevelopmentCard[]>;

  // 贵族展示区：将贵族 ID 转换为完整的 Noble
  const clientNobles: Noble[] = state.nobles
    .map(id => getNobleById(id))
    .filter((n): n is Noble => n !== undefined);

  // 牌堆仅显示剩余数量
  const deckCounts = {
    1: state.decks[1].length,
    2: state.decks[2].length,
    3: state.decks[3].length,
  } as Record<CardLevel, number>;

  return {
    roomId: state.roomId,
    players: clientPlayers,
    currentPlayerIndex: state.currentPlayerIndex,
    phase: state.phase,
    gemPool: { ...state.gemPool },
    deckCounts,
    display: clientDisplay,
    nobles: clientNobles,
    isLastRound: state.isLastRound,
    turnNumber: state.turnNumber,
    winnerId: state.winnerId,
    turnStartTime: state.turnStartTime,
    log: [...state.log],
  };
}
