/**
 * 卡坦岛计时器管理模块
 *
 * 管理回合超时、丢弃超时、强盗移动超时、抢夺超时和 AI 操作延迟。
 * 提供 startTimer / clearTimer / hasTimer 接口，回调函数由外部传入。
 * 参考 UNO 计时器模块的实现模式。
 */

// ============================================================
// 超时常量（毫秒）
// ============================================================

/** 回合操作超时：60 秒 */
export const TURN_TIMEOUT = 60 * 1000;

/** 丢弃资源超时：30 秒 */
export const DISCARD_TIMEOUT = 30 * 1000;

/** 强盗移动超时：30 秒 */
export const ROBBER_TIMEOUT = 30 * 1000;

/** 抢夺资源超时：15 秒 */
export const STEAL_TIMEOUT = 15 * 1000;

/** AI 操作延迟范围：2～4 秒 */
export const AI_DELAY_MIN = 2 * 1000;
export const AI_DELAY_MAX = 4 * 1000;

// ============================================================
// 计时器类型
// ============================================================

/** 计时器类型 */
export type CatanTimerType = 'turn' | 'discard' | 'robber' | 'steal' | 'ai';

/** 所有计时器类型列表（用于批量清除） */
const ALL_TIMER_TYPES: CatanTimerType[] = ['turn', 'discard', 'robber', 'steal', 'ai'];

/** 计时器存储，key 为 `${roomId}:${type}` */
const timers: Map<string, NodeJS.Timeout> = new Map();

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 生成计时器的存储 key
 * 格式：roomId:timerType
 */
function timerKey(roomId: string, type: CatanTimerType): string {
  return `${roomId}:${type}`;
}

/**
 * 获取指定类型的默认超时时长（毫秒）
 */
function getDefaultTimeout(type: CatanTimerType): number {
  switch (type) {
    case 'turn':
      return TURN_TIMEOUT;
    case 'discard':
      return DISCARD_TIMEOUT;
    case 'robber':
      return ROBBER_TIMEOUT;
    case 'steal':
      return STEAL_TIMEOUT;
    case 'ai':
      // AI 延迟为 2～4 秒随机
      return AI_DELAY_MIN + Math.floor(Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN + 1));
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
  type: CatanTimerType,
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
export function clearTimer(roomId: string, type?: CatanTimerType): void {
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
    for (const t of ALL_TIMER_TYPES) {
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
 *
 * @param roomId - 房间 ID
 * @param type - 计时器类型
 * @returns 是否有活跃计时器
 */
export function hasTimer(roomId: string, type: CatanTimerType): boolean {
  return timers.has(timerKey(roomId, type));
}
