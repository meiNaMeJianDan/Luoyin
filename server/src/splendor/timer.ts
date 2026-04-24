/**
 * 璀璨宝石计时器管理模块
 *
 * 管理回合超时、AI 操作延迟、宝石归还超时和贵族选择超时。
 * 参考 Halli Galli 计时器模块的实现模式。
 */

import {
  TURN_TIMEOUT,
  AI_ACTION_DELAY_MIN,
  AI_ACTION_DELAY_MAX,
} from './types.js';

// ============================================================
// 计时器类型
// ============================================================

/** 计时器类型 */
export type SplendorTimerType = 'turn' | 'ai_action' | 'return_gems' | 'choose_noble';

/** 所有计时器类型列表（用于批量清除） */
const ALL_TIMER_TYPES: SplendorTimerType[] = ['turn', 'ai_action', 'return_gems', 'choose_noble'];

/** 计时器存储，key 为 `${roomId}:${type}` */
const timers: Map<string, NodeJS.Timeout> = new Map();

// ============================================================
// 内部辅助函数
// ============================================================

/** 生成计时器的存储 key */
function timerKey(roomId: string, type: SplendorTimerType): string {
  return `${roomId}:${type}`;
}

/** 获取指定类型的默认超时时长（毫秒） */
function getDefaultTimeout(type: SplendorTimerType): number {
  switch (type) {
    case 'turn':
      return TURN_TIMEOUT * 1000;
    case 'ai_action':
      // AI 操作延迟为 2～4 秒随机
      return AI_ACTION_DELAY_MIN + Math.floor(Math.random() * (AI_ACTION_DELAY_MAX - AI_ACTION_DELAY_MIN + 1));
    case 'return_gems':
      return TURN_TIMEOUT * 1000;
    case 'choose_noble':
      return TURN_TIMEOUT * 1000;
  }
}

// ============================================================
// 公开接口
// ============================================================

/**
 * 启动计时器
 * @returns 实际超时时长（毫秒）
 */
export function startTimer(
  roomId: string,
  type: SplendorTimerType,
  callback: () => void,
  durationMs?: number,
): number {
  // 先清除同类型的旧计时器
  clearTimer(roomId, type);

  const timeout = durationMs ?? getDefaultTimeout(type);
  const timer = setTimeout(callback, timeout);

  timers.set(timerKey(roomId, type), timer);

  return timeout;
}

/** 清除计时器 */
export function clearTimer(roomId: string, type?: SplendorTimerType): void {
  if (type) {
    const key = timerKey(roomId, type);
    const timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.delete(key);
    }
  } else {
    clearAllTimers(roomId);
  }
}

/** 检查指定计时器是否正在运行 */
export function hasTimer(roomId: string, type: SplendorTimerType): boolean {
  return timers.has(timerKey(roomId, type));
}

/** 清除房间所有计时器 */
export function clearAllTimers(roomId: string): void {
  for (const t of ALL_TIMER_TYPES) {
    const key = timerKey(roomId, t);
    const timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.delete(key);
    }
  }
}
