/**
 * 璀璨宝石 AI 玩家策略模块
 *
 * 实现 AI 决策逻辑：购买优先、宝石拿取策略、预留策略。
 * AI 决策返回操作描述对象，由 socket 层调用引擎函数执行。
 * 参考 Halli Galli AI 模块的实现模式。
 */

import type {
  SplendorGameState,
  GemColor,
  GemMap,
  AiAction,
  DevelopmentCard,
  Noble,
  CardLevel,
} from './types.js';
import { GEM_COLORS, MIN_GEMS_FOR_TAKE_TWO, MAX_RESERVED_CARDS } from './types.js';
import { getCardById, getNobleById } from './cards.js';
import { calculatePayment, getPlayerBonus } from './engine.js';

// ============================================================
// AI 决策：主操作
// ============================================================

/**
 * AI 决策：返回要执行的操作
 * 策略优先级：
 * 1. 优先购买可负担的高声望发展卡
 * 2. 拿取距离目标卡最缺少的宝石
 * 3. 预留高价值卡牌
 */
export function aiDecideAction(state: SplendorGameState, playerId: string): AiAction {
  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    // 兜底：拿取可用宝石
    return fallbackTakeGems(state);
  }

  // 1. 尝试购买可负担的最高声望卡
  const buyAction = tryBuyBestCard(state, player);
  if (buyAction) return buyAction;

  // 2. 尝试拿取最需要的宝石
  const takeAction = tryTakeNeededGems(state, player);
  if (takeAction) return takeAction;

  // 3. 尝试预留高价值卡
  const reserveAction = tryReserveCard(state, player);
  if (reserveAction) return reserveAction;

  // 4. 兜底：拿取任意可用宝石
  return fallbackTakeGems(state);
}

// ============================================================
// AI 决策：归还宝石
// ============================================================

/** AI 归还宝石决策：归还最不需要的宝石 */
export function aiDecideReturnGems(
  state: SplendorGameState,
  playerId: string,
  excessCount: number,
): GemMap {
  const player = state.players.find(p => p.id === playerId);
  const returnGems: GemMap = { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 };

  if (!player) return returnGems;

  // 计算每种宝石的"需求度"（越低越优先归还）
  const bonus = getPlayerBonus(player);
  const allGemKeys: (GemColor | 'gold')[] = [...GEM_COLORS, 'gold'];

  // 按需求度排序：已有 bonus 多的颜色宝石优先归还，黄金最后归还
  const sortedKeys = allGemKeys
    .filter(k => player.gems[k] > 0)
    .sort((a, b) => {
      // 黄金最后归还
      if (a === 'gold') return 1;
      if (b === 'gold') return -1;
      // bonus 多的颜色优先归还（因为有折扣，宝石不太需要）
      return (bonus[b as GemColor] || 0) - (bonus[a as GemColor] || 0);
    });

  let remaining = excessCount;
  for (const key of sortedKeys) {
    if (remaining <= 0) break;
    const canReturn = Math.min(player.gems[key], remaining);
    returnGems[key] = canReturn;
    remaining -= canReturn;
  }

  return returnGems;
}

// ============================================================
// AI 决策：选择贵族
// ============================================================

/** AI 选择贵族决策：选择第一个可用贵族 */
export function aiDecideNoble(
  _state: SplendorGameState,
  _playerId: string,
  nobles: Noble[],
): string {
  return nobles[0]?.id ?? '';
}

// ============================================================
// 内部辅助函数
// ============================================================

/** 尝试购买可负担的最高声望卡 */
function tryBuyBestCard(
  state: SplendorGameState,
  player: SplendorGameState['players'][0],
): AiAction | null {
  // 收集所有可购买的卡（展示区 + 预留区）
  const candidates: { card: DevelopmentCard; source: 'display' | 'reserved' }[] = [];

  // 展示区的卡
  for (const level of [3, 2, 1] as CardLevel[]) {
    for (const cardId of state.display[level]) {
      const card = getCardById(cardId);
      if (!card) continue;
      const result = calculatePayment(player, card);
      if (result.canAfford) {
        candidates.push({ card, source: 'display' });
      }
    }
  }

  // 预留区的卡
  for (const cardId of player.reservedCards) {
    const card = getCardById(cardId);
    if (!card) continue;
    const result = calculatePayment(player, card);
    if (result.canAfford) {
      candidates.push({ card, source: 'reserved' });
    }
  }

  if (candidates.length === 0) return null;

  // 按声望降序排列，声望相同时优先高等级
  candidates.sort((a, b) => {
    if (b.card.prestige !== a.card.prestige) return b.card.prestige - a.card.prestige;
    return b.card.level - a.card.level;
  });

  return { type: 'buy_card', cardId: candidates[0].card.id };
}

/** 尝试拿取最需要的宝石 */
function tryTakeNeededGems(
  state: SplendorGameState,
  player: SplendorGameState['players'][0],
): AiAction | null {
  const bonus = getPlayerBonus(player);

  // 找到最想购买的目标卡（展示区中声望最高的可接近的卡）
  const targetColors = findNeededColors(state, player, bonus);

  // 尝试拿取 2 个同色宝石
  for (const color of targetColors) {
    if (state.gemPool[color] >= MIN_GEMS_FOR_TAKE_TWO) {
      return { type: 'take_two', gem: color };
    }
  }

  // 尝试拿取 3 种不同颜色各 1 个
  const availableColors = targetColors.filter(c => state.gemPool[c] > 0);
  // 补充其他可用颜色
  for (const c of GEM_COLORS) {
    if (!availableColors.includes(c) && state.gemPool[c] > 0) {
      availableColors.push(c);
    }
  }

  if (availableColors.length >= 3) {
    return { type: 'take_three', gems: availableColors.slice(0, 3) };
  }
  if (availableColors.length > 0) {
    return { type: 'take_three', gems: availableColors.slice(0, availableColors.length) };
  }

  return null;
}

/** 找到最需要的宝石颜色（按需求度排序） */
function findNeededColors(
  state: SplendorGameState,
  player: SplendorGameState['players'][0],
  bonus: Record<GemColor, number>,
): GemColor[] {
  // 统计所有展示区卡牌的成本需求
  const needMap: Record<GemColor, number> = { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 };

  for (const level of [3, 2, 1] as CardLevel[]) {
    for (const cardId of state.display[level]) {
      const card = getCardById(cardId);
      if (!card) continue;
      for (const color of GEM_COLORS) {
        const need = Math.max(0, card.cost[color] - bonus[color] - player.gems[color]);
        needMap[color] += need;
      }
    }
  }

  // 按需求度降序排列
  return GEM_COLORS
    .filter(c => needMap[c] > 0)
    .sort((a, b) => needMap[b] - needMap[a]);
}

/** 尝试预留高价值卡 */
function tryReserveCard(
  state: SplendorGameState,
  player: SplendorGameState['players'][0],
): AiAction | null {
  if (player.reservedCards.length >= MAX_RESERVED_CARDS) return null;

  // 找展示区中声望最高的卡预留
  let bestCard: DevelopmentCard | null = null;
  for (const level of [3, 2, 1] as CardLevel[]) {
    for (const cardId of state.display[level]) {
      const card = getCardById(cardId);
      if (!card) continue;
      if (!bestCard || card.prestige > bestCard.prestige) {
        bestCard = card;
      }
    }
  }

  if (bestCard && bestCard.prestige >= 2) {
    return { type: 'reserve_card', cardId: bestCard.id };
  }

  return null;
}

/** 兜底：拿取任意可用宝石 */
function fallbackTakeGems(state: SplendorGameState): AiAction {
  const available = GEM_COLORS.filter(c => state.gemPool[c] > 0);

  // 尝试拿 2 个同色
  for (const c of available) {
    if (state.gemPool[c] >= MIN_GEMS_FOR_TAKE_TWO) {
      return { type: 'take_two', gem: c };
    }
  }

  // 拿取可用的不同颜色
  if (available.length > 0) {
    return { type: 'take_three', gems: available.slice(0, Math.min(3, available.length)) };
  }

  // 极端情况：所有宝石都没了，盲抽预留
  for (const level of [1, 2, 3] as CardLevel[]) {
    if (state.decks[level].length > 0) {
      return { type: 'reserve_deck', level };
    }
  }

  // 最终兜底
  return { type: 'take_three', gems: ['diamond'] };
}
