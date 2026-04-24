/**
 * 德国心脏病 AI 玩家策略模块
 *
 * 实现 AI 翻牌延迟和按铃反应时间策略。
 * AI 决策返回操作描述对象，由 socket 层调用引擎函数执行。
 * 参考 UNO 和 Catan AI 模块的实现模式。
 */

import type { HalliGameState } from './types.js';
import {
  AI_FLIP_DELAY_MIN,
  AI_FLIP_DELAY_MAX,
  AI_BELL_DELAY_MIN,
  AI_BELL_DELAY_MAX,
} from './types.js';

// ============================================================
// AI 决策返回类型
// ============================================================

/** AI 翻牌决策 */
export interface AiFlipAction {
  action: 'flip';
  /** 延迟时间（毫秒） */
  delay: number;
}

/** AI 按铃决策 */
export interface AiBellRingAction {
  action: 'ring';
  /** 反应时间（毫秒） */
  delay: number;
}

/** AI 跳过按铃决策 */
export interface AiBellSkipAction {
  action: 'skip';
}

/** AI 按铃决策联合类型 */
export type AiBellAction = AiBellRingAction | AiBellSkipAction;

// ============================================================
// 辅助函数
// ============================================================

/**
 * 生成 [min, max] 范围内的随机整数
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// 10.1 — AI 翻牌决策
// ============================================================

/**
 * AI 翻牌决策
 *
 * 策略：延迟 1-2 秒后自动翻牌，模拟人类思考时间。
 *
 * @param _state    当前游戏状态（预留，当前策略不依赖状态）
 * @param _playerId AI 玩家 ID（预留）
 * @returns 翻牌操作描述，包含随机延迟
 */
export function aiDecideFlip(
  _state: HalliGameState,
  _playerId: string,
): AiFlipAction {
  return {
    action: 'flip',
    delay: randomDelay(AI_FLIP_DELAY_MIN, AI_FLIP_DELAY_MAX),
  };
}

// ============================================================
// 10.2 / 10.3 — AI 按铃决策
// ============================================================

/**
 * AI 按铃决策
 *
 * 策略：
 * - 满足按铃条件时（bellConditionMet 为 true），以 500-1500ms 的随机反应时间按铃
 * - 不满足按铃条件时，返回 skip，AI 不会错误按铃
 *
 * @param state    当前游戏状态
 * @param _playerId AI 玩家 ID（预留）
 * @returns 按铃或跳过操作描述
 */
export function aiDecideBell(
  state: HalliGameState,
  _playerId: string,
): AiBellAction {
  if (state.bellConditionMet) {
    return {
      action: 'ring',
      delay: randomDelay(AI_BELL_DELAY_MIN, AI_BELL_DELAY_MAX),
    };
  }

  return { action: 'skip' };
}
