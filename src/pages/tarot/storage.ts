/**
 * 塔罗占卜本地存储
 *
 * - tarot_history：全部占卜记录（最多保留 50 条）
 * - tarot_daily：当日固定运势。只保存当天的记录，过期自动失效
 */

import type { TarotReading } from './data'

export type ReadingMode = 'single' | 'three' | 'celtic'

/** 历史记录存储键 */
export const HISTORY_KEY = 'tarot_history'
/** 每日运势存储键 */
export const DAILY_KEY = 'tarot_daily'

const MAX_HISTORY = 50

/** 生成本地日期键：YYYY-MM-DD（按本地时区，避免 UTC 跨天） */
export function getTodayKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 生成唯一记录 ID */
export function createReadingId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** 读取全部历史记录 */
export function loadHistory(): TarotReading[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 写入历史记录（超出上限自动截断） */
export function saveHistory(history: TarotReading[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch {
    // localStorage 不可用时静默失败
  }
}

/** 新增一条记录，返回更新后的列表 */
export function addReading(reading: TarotReading): TarotReading[] {
  const history = loadHistory().filter((item) => item.id !== reading.id)
  const next = [reading, ...history].slice(0, MAX_HISTORY)
  saveHistory(next)
  return next
}

/** 清空全部历史记录 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    // 忽略
  }
}

/** 每日运势记录结构 */
export interface DailyReading {
  /** 日期键 YYYY-MM-DD */
  date: string
  reading: TarotReading
}

/** 读取当天的每日运势；不是今天或不存在时返回 null */
export function loadDailyReading(): DailyReading | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DailyReading
    if (!parsed?.reading?.cards?.length) return null
    // 只接受每日运势模式，且必须属于今天
    if (parsed.reading.mode !== 'single') return null
    if (parsed.date !== getTodayKey()) return null
    return parsed
  } catch {
    return null
  }
}

/** 固化当天的每日运势 */
export function saveDailyReading(reading: TarotReading): void {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify({ date: getTodayKey(), reading }))
  } catch {
    // 忽略
  }
}

/** 重置当天的每日运势（不影响历史记录） */
export function clearDailyReading(): void {
  try {
    localStorage.removeItem(DAILY_KEY)
  } catch {
    // 忽略
  }
}
