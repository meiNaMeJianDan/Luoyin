/**
 * 你画我猜计时器管理模块
 *
 * 管理 Turn 倒计时、选词超时、提示揭示定时器、Turn 结算展示、Drawer 掉线超时。
 * 提供 startTimer / clearTimer / hasTimer / clearAllTimers 接口，回调函数由外部传入。
 * 参考 Halli Galli 计时器模块的实现模式。
 */

import {
  WORD_SELECT_TIMEOUT,
  TURN_SUMMARY_DURATION,
  DRAWER_DISCONNECT_TIMEOUT,
} from './types.js';

// ============================================================
// 计时器类型
// ============================================================

/** 计时器类型 */
export type DrawTimerType =
  | 'turn'               // Turn 倒计时
  | 'word_select'        // 选词超时（15 秒）
  | 'hint_1'             // 第一次提示揭示（40% 时间点）
  | 'hint_2'             // 第二次提示揭示（70% 时间点）
  | 'turn_summary'       // Turn 结算展示（5 秒）
  | 'drawer_disconnect'; // Drawer 掉线超时（10 秒）

/** 所有计时器类型列表（用于批量清除） */
const ALL_TIMER_TYPES: DrawTimerType[] = [
  'turn',
  'word_select',
  'hint_1',
  'hint_2',
  'turn_summary',
  'drawer_disconnect',
];

/** 计时器存储，key 为 `${roomId}:${type}` */
const timers: Map<string, NodeJS.Timeout> = new Map();

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 生成计时器的存储 key
 * 格式：roomId:timerType
 */
function timerKey(roomId: string, type: DrawTimerType): string {
  return `${roomId}:${type}`;
}

/**
 * 获取指定类型的默认超时时长（毫秒）
 * turn 类型没有默认值，必须由外部传入 durationMs
 */
function getDefaultTimeout(type: DrawTimerType): number {
  switch (type) {
    case 'turn':
      // Turn 倒计时由外部传入（取决于游戏配置 turnDuration）
      return 0;
    case 'word_select':
      return WORD_SELECT_TIMEOUT * 1000;
    case 'hint_1':
      // 提示揭示时间由外部根据 turnDuration 计算后传入
      return 0;
    case 'hint_2':
      // 提示揭示时间由外部根据 turnDuration 计算后传入
      return 0;
    case 'turn_summary':
      return TURN_SUMMARY_DURATION * 1000;
    case 'drawer_disconnect':
      return DRAWER_DISCONNECT_TIMEOUT * 1000;
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
  type: DrawTimerType,
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
export function clearTimer(roomId: string, type?: DrawTimerType): void {
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
export function hasTimer(roomId: string, type: DrawTimerType): boolean {
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
