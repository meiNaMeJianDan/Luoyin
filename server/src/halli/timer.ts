/**
 * 德国心脏病计时器管理模块
 *
 * 管理翻牌超时、按铃窗口期、AI 翻牌延迟和 AI 按铃延迟。
 * 提供 startTimer / clearTimer / hasTimer / clearAllTimers 接口，回调函数由外部传入。
 * 参考 UNO 和 Catan 计时器模块的实现模式。
 */

import {
  FLIP_TIMEOUT,
  BELL_WINDOW_DURATION,
  AI_FLIP_DELAY_MIN,
  AI_FLIP_DELAY_MAX,
  AI_BELL_DELAY_MIN,
  AI_BELL_DELAY_MAX,
} from './types';

// ============================================================
// 计时器类型
// ============================================================

/** 计时器类型 */
export type HalliTimerType = 'flip' | 'bell_window' | 'ai_flip' | 'ai_bell';

/** 所有计时器类型列表（用于批量清除） */
const ALL_TIMER_TYPES: HalliTimerType[] = ['flip', 'bell_window', 'ai_flip', 'ai_bell'];

/** 计时器存储，key 为 `${roomId}:${type}` */
const timers: Map<string, NodeJS.Timeout> = new Map();

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 生成计时器的存储 key
 * 格式：roomId:timerType
 */
function timerKey(roomId: string, type: HalliTimerType): string {
  return `${roomId}:${type}`;
}

/**
 * 获取指定类型的默认超时时长（毫秒）
 */
function getDefaultTimeout(type: HalliTimerType): number {
  switch (type) {
    case 'flip':
      return FLIP_TIMEOUT;
    case 'bell_window':
      return BELL_WINDOW_DURATION;
    case 'ai_flip':
      // AI 翻牌延迟为 1～2 秒随机
      return AI_FLIP_DELAY_MIN + Math.floor(Math.random() * (AI_FLIP_DELAY_MAX - AI_FLIP_DELAY_MIN + 1));
    case 'ai_bell':
      // AI 按铃延迟为 500～1500 毫秒随机
      return AI_BELL_DELAY_MIN + Math.floor(Math.random() * (AI_BELL_DELAY_MAX - AI_BELL_DELAY_MIN + 1));
  }
}

// ============================================================
// 公开接口
// ============================================================

/**
 * 启动计时器
 *
 * @param roomId - 房间 ID
 * @param type - 计时器类型
 * @param callback - 超时回调函数
 * @param durationMs - 可选，自定义超时时长（毫秒），不传则使用默认值
 * @returns 实际超时时长（毫秒），供前端倒计时使用
 */
export function startTimer(
  roomId: string,
  type: HalliTimerType,
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

/**
 * 清除计时器
 *
 * @param roomId - 房间 ID
 * @param type - 计时器类型，不传则清除该房间所有计时器
 */
export function clearTimer(roomId: string, type?: HalliTimerType): void {
  if (type) {
    // 清除指定类型
    const key = timerKey(roomId, type);
    const timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.delete(key);
    }
  } else {
    // 清除该房间所有计时器
    clearAllTimers(roomId);
  }
}

/**
 * 检查指定计时器是否正在运行
 *
 * @param roomId - 房间 ID
 * @param type - 计时器类型
 * @returns 是否有活跃计时器
 */
export function hasTimer(roomId: string, type: HalliTimerType): boolean {
  return timers.has(timerKey(roomId, type));
}

/**
 * 清除房间所有计时器
 *
 * @param roomId - 房间 ID
 */
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
