// API 客户端模块
// 封装所有后端 API 请求，提供类型安全的异步函数

// ============ 前端类型定义 ============

/** 游戏基础信息 */
export interface Game {
  id: number;
  title: string;
  type: string;
  players: string;
  time: string;
  image: string;
  difficulty: string;
  tags: string[];
  isHot: boolean;
  rank?: number;
  comment?: string;
  isTrending: boolean;
}

/** 获胜条件 */
export interface VictoryCondition {
  text?: string;
  image?: string | null;
}

/** 玩法步骤 */
export interface GameplayStep {
  title: string;
  desc: string | string[];
  image?: string | null;
}

/** 游戏详情 */
export interface GameDetail {
  gameId: number;
  introduction: string;
  objective: string;
  victoryConditions: VictoryCondition[];
  gameplaySteps: GameplayStep[];
  tips: string[];
}

/** 分类筛选选项 */
export interface CategoryOptions {
  types: string[];
  playerCounts: string[];
  durations: string[];
}

/** 分类快速链接 */
export interface QuickLink {
  id?: number;
  name: string;
  icon: string;
  color: string;
  link: string;
}

/** 新手常见问题 */
export interface FAQ {
  id?: number;
  q: string;
  a: string;
  sort_order?: number;
}

/** 新手指南步骤 */
export interface GuideStep {
  id?: number;
  step: string;
  desc: string;
  sort_order?: number;
}

// ============ API 客户端配置 ============

/** 基础 URL，支持 VITE_API_BASE_URL 环境变量覆盖 */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ============ 通用 fetch 封装 ============

/**
 * 通用请求函数
 * - 自动提取响应体中的 data 字段
 * - 非 2xx 响应解析 error 字段并抛出异常
 */
async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);

  if (!res.ok) {
    // 尝试解析错误响应中的 error 字段
    let message = `请求失败: ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) {
        message = body.error;
      }
    } catch {
      // 解析失败则使用默认错误信息
    }
    throw new Error(message);
  }

  const body = await res.json();
  return body.data as T;
}

// ============ 游戏相关 API ============

/** 获取所有游戏列表 */
export async function fetchAllGames(): Promise<Game[]> {
  return request<Game[]>('/api/games');
}

/** 获取热门游戏列表 */
export async function fetchTrendingGames(): Promise<Game[]> {
  return request<Game[]>('/api/games/trending');
}

/** 获取排行榜游戏列表（按 rank 升序） */
export async function fetchRankedGames(): Promise<Game[]> {
  return request<Game[]>('/api/games/ranked');
}

/** 根据 ID 获取指定游戏 */
export async function fetchGameById(id: number): Promise<Game> {
  return request<Game>(`/api/games/${id}`);
}

/** 根据游戏 ID 获取游戏详情 */
export async function fetchGameDetails(id: number): Promise<GameDetail> {
  return request<GameDetail>(`/api/games/${id}/details`);
}

// ============ 分类相关 API ============

/** 获取分类筛选选项 */
export async function fetchCategoryOptions(): Promise<CategoryOptions> {
  return request<CategoryOptions>('/api/categories/options');
}

/** 获取分类快速链接列表 */
export async function fetchQuickLinks(): Promise<QuickLink[]> {
  return request<QuickLink[]>('/api/categories/quick-links');
}

// ============ 新手指南 API ============

/** 获取新手常见问题列表 */
export async function fetchFAQs(): Promise<FAQ[]> {
  return request<FAQ[]>('/api/guide/faqs');
}

/** 获取新手指南步骤列表 */
export async function fetchGuideSteps(): Promise<GuideStep[]> {
  return request<GuideStep[]>('/api/guide/steps');
}
