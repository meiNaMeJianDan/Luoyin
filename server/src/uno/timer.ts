/**
 * UNO 计时器管理模块
 *
 * 管理回合超时、颜色选择超时、质疑决策超时和 AI 操作延迟。
 * 提供 startTimer / clearTimer 接口，回调函数由外部传入。
 */

// ============================================================
// 超时常量（毫秒）
// ============================================================

/** 回合操作超时：60 秒 */
export const TURN_TIMEOUT = 60 * 1000;

/** 颜色选择超时：15 秒 */
export const COLOR_CHOOSE_TIMEOUT = 30 * 1000;

/** 质疑决策超时：10 秒 */
export const CHALLENGE_TIMEOUT = 10 * 1000;

/** AI 操作延迟范围：2～4 秒 */
export const AI_DELAY_MIN = 2 * 1000;
export const AI_DELAY_MAX = 4 * 1000;

// ============================================================
// 计时器类型
// ============================================================

export type TimerType = 'turn' | 'color' | 'challenge' | 'ai';

/** 计时器存储，key 为 roomId */
const timers: Map<string, NodeJS.Timeout> = new Map();

// ============================================================
// 6.1 — 计时器管理接口
// ============================================================

/**
 * 生成计时器的存储 key
 * 格式：roomId:timerType
 */
function timerKey(roomId: string, type: TimerType): string {
  return `${roomId}:${type}`;
}

/**
 * 获取指定类型的超时时长（毫秒）
 */
function getTimeout(type: TimerType): number {
  switch (type) {
    case 'turn':
      return TURN_TIMEOUT;
    case 'color':
      return COLOR_CHOOSE_TIMEOUT;
    case 'challenge':
      return CHALLENGE_TIMEOUT;
    case 'ai':
      // AI 延迟为 2～4 秒随机
      return AI_DELAY_MIN + Math.floor(Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN + 1));
  }
}

/**
 * 启动计时器
 *
 * @param roomId - 房间 ID
 * @param type - 计时器类型
 * @param callback - 超时回调函数
 * @returns 超时时长（毫秒），供前端倒计时使用
 */
export function startTimer(
  roomId: string,
  type: TimerType,
  callback: () => void,
): number {
  // 先清除同类型的旧计时器
  clearTimer(roomId, type);

  const timeout = getTimeout(type);
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
export function clearTimer(roomId: string, type?: TimerType): void {
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
    const types: TimerType[] = ['turn', 'color', 'challenge', 'ai'];
    for (const t of types) {
      const key = timerKey(roomId, t);
      const timer = timers.get(key);
      if (timer) {
        clearTimeout(timer);
        timers.delete(key);
      }
    }
  }
}

/**
 * 检查指定计时器是否正在运行
 */
export function hasTimer(roomId: string, type: TimerType): boolean {
  return timers.has(timerKey(roomId, type));
}
