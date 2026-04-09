/**
 * UNO AI 玩家策略模块
 *
 * 实现 AI 出牌决策、颜色选择和质疑策略。
 * AI 按固定优先级出牌，不进行复杂博弈分析。
 */

import type { Card, CardColor, AiDecision } from './types.js';
import { getPlayableCards } from './engine.js';

// ============================================================
// 5.1 — AI 出牌策略
// ============================================================

/**
 * AI 出牌决策
 *
 * 优先级：同色 > 同值 > Wild > Wild_Draw_Four
 * 无牌可出则摸牌。
 * AI 手牌剩余 1 张时自动喊 UNO（由调用方处理）。
 */
export function aiDecide(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
): AiDecision {
  const playable = getPlayableCards(hand, topCard, currentColor);

  // 无牌可出，摸牌
  if (playable.length === 0) {
    return { action: 'draw' };
  }

  // 按优先级分类可出的牌
  const sameColor: Card[] = [];   // 同色牌（非万能牌）
  const sameValue: Card[] = [];   // 同值牌（非同色、非万能牌）
  const wilds: Card[] = [];       // Wild 牌
  const wildDraw4: Card[] = [];   // Wild_Draw_Four 牌

  for (const card of playable) {
    if (card.value === 'wild_draw_four') {
      wildDraw4.push(card);
    } else if (card.value === 'wild') {
      wilds.push(card);
    } else if (card.color === currentColor) {
      sameColor.push(card);
    } else {
      sameValue.push(card);
    }
  }

  // 按优先级选择：同色 > 同值 > Wild > Wild_Draw_Four
  let chosen: Card;
  if (sameColor.length > 0) {
    chosen = sameColor[0];
  } else if (sameValue.length > 0) {
    chosen = sameValue[0];
  } else if (wilds.length > 0) {
    chosen = wilds[0];
  } else {
    chosen = wildDraw4[0];
  }

  // 万能牌需要选择颜色
  const chosenColor = chosen.type === 'wild' ? aiChooseColor(hand) : undefined;

  return {
    action: 'play',
    card: chosen,
    chosenColor,
  };
}

/**
 * AI 选择颜色
 *
 * 选择手牌中数量最多的颜色（不含 wild）。
 * 如果手牌中没有有色牌，默认选红色。
 */
export function aiChooseColor(hand: Card[]): CardColor {
  const colorCount: Record<string, number> = {
    red: 0,
    yellow: 0,
    blue: 0,
    green: 0,
  };

  for (const card of hand) {
    if (card.color !== 'wild') {
      colorCount[card.color]++;
    }
  }

  // 找出数量最多的颜色
  let bestColor: CardColor = 'red';
  let maxCount = 0;

  for (const [color, count] of Object.entries(colorCount)) {
    if (count > maxCount) {
      maxCount = count;
      bestColor = color as CardColor;
    }
  }

  return bestColor;
}

/**
 * AI 是否质疑 Wild+4
 *
 * 策略：始终不质疑（保守策略）
 */
export function aiShouldChallenge(): boolean {
  return false;
}
