// 管理 API 客户端模块
// 封装所有后台管理系统的写操作 API 请求，提供类型安全的异步函数

import { BASE_URL } from './client';
import type { Game, GameDetail, QuickLink, FAQ, GuideStep } from './client';

// ============ 管理 API 输入类型定义 ============

/** 游戏创建/更新输入类型（不含 id） */
export interface GameInput {
  title: string;
  type: string;
  players: string;
  time: string;
  image: string;
  difficulty: string;
  tags: string[];
  isHot?: boolean;
  rank?: number | null;
  comment?: string | null;
  isTrending?: boolean;
}

/** 游戏详情创建/更新输入类型（不含 gameId） */
export interface GameDetailInput {
  introduction: string;
  objective: string;
  victoryConditions: { text?: string; image?: string | null }[];
  gameplaySteps: { title: string; desc: string | string[]; image?: string | null }[];
  tips: string[];
}

/** 快速链接创建/更新输入类型 */
export interface QuickLinkInput {
  name: string;
  icon: string;
  color: string;
  link: string;
}

/** 常见问题创建/更新输入类型 */
export interface FAQInput {
  question: string;
  answer: string;
}

/** 指南步骤创建/更新输入类型 */
export interface GuideStepInput {
  step: string;
  description: string;
}

/** 仪表盘统计数据 */
export interface DashboardStats {
  gameCount: number;
  detailCount: number;
  faqCount: number;
  guideStepCount: number;
  quickLinkCount: number;
  categoryOptionCount: number;
}

// ============ 通用写操作请求封装 ============

/**
 * 通用写操作请求函数
 * - 支持 POST/PUT/DELETE 方法
 * - 自动设置 Content-Type 为 application/json
 * - 非 2xx 响应解析 error 字段并抛出异常
 * - 成功时提取响应体中的 data 字段
 */
async function mutationRequest<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);

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

// ============ 游戏管理 API ============

/** 创建游戏 */
export async function createGame(data: GameInput): Promise<Game> {
  return mutationRequest<Game>('POST', '/api/admin/games', data);
}

/** 更新游戏 */
export async function updateGame(id: number, data: GameInput): Promise<Game> {
  return mutationRequest<Game>('PUT', `/api/admin/games/${id}`, data);
}

/** 删除游戏 */
export async function deleteGame(id: number): Promise<void> {
  await mutationRequest<{ message: string }>('DELETE', `/api/admin/games/${id}`);
}

// ============ 游戏详情管理 API ============

/** 创建游戏详情 */
export async function createGameDetail(gameId: number, data: GameDetailInput): Promise<GameDetail> {
  return mutationRequest<GameDetail>('POST', `/api/admin/games/${gameId}/details`, data);
}

/** 更新游戏详情 */
export async function updateGameDetail(gameId: number, data: GameDetailInput): Promise<GameDetail> {
  return mutationRequest<GameDetail>('PUT', `/api/admin/games/${gameId}/details`, data);
}

/** 删除游戏详情 */
export async function deleteGameDetail(gameId: number): Promise<void> {
  await mutationRequest<{ message: string }>('DELETE', `/api/admin/games/${gameId}/details`);
}

// ============ 分类选项管理 API ============

/** 更新分类选项 */
export async function updateCategoryOption(data: { key: string; value: string[] }): Promise<void> {
  await mutationRequest<unknown>('PUT', '/api/admin/categories/options', data);
}

// ============ 快速链接管理 API ============

/** 创建快速链接 */
export async function createQuickLink(data: QuickLinkInput): Promise<QuickLink> {
  return mutationRequest<QuickLink>('POST', '/api/admin/categories/quick-links', data);
}

/** 更新快速链接 */
export async function updateQuickLink(id: number, data: QuickLinkInput): Promise<QuickLink> {
  return mutationRequest<QuickLink>('PUT', `/api/admin/categories/quick-links/${id}`, data);
}

/** 删除快速链接 */
export async function deleteQuickLink(id: number): Promise<void> {
  await mutationRequest<{ message: string }>('DELETE', `/api/admin/categories/quick-links/${id}`);
}

// ============ FAQ 管理 API ============

/** 创建常见问题 */
export async function createFAQ(data: FAQInput): Promise<FAQ> {
  return mutationRequest<FAQ>('POST', '/api/admin/guide/faqs', data);
}

/** 更新常见问题 */
export async function updateFAQ(id: number, data: FAQInput): Promise<FAQ> {
  return mutationRequest<FAQ>('PUT', `/api/admin/guide/faqs/${id}`, data);
}

/** 删除常见问题 */
export async function deleteFAQ(id: number): Promise<void> {
  await mutationRequest<{ message: string }>('DELETE', `/api/admin/guide/faqs/${id}`);
}

/** 重新排序常见问题 */
export async function reorderFAQs(ids: number[]): Promise<void> {
  await mutationRequest<{ message: string }>('PUT', '/api/admin/guide/faqs/reorder', { ids });
}

// ============ 指南步骤管理 API ============

/** 创建指南步骤 */
export async function createGuideStep(data: GuideStepInput): Promise<GuideStep> {
  return mutationRequest<GuideStep>('POST', '/api/admin/guide/steps', data);
}

/** 更新指南步骤 */
export async function updateGuideStep(id: number, data: GuideStepInput): Promise<GuideStep> {
  return mutationRequest<GuideStep>('PUT', `/api/admin/guide/steps/${id}`, data);
}

/** 删除指南步骤 */
export async function deleteGuideStep(id: number): Promise<void> {
  await mutationRequest<{ message: string }>('DELETE', `/api/admin/guide/steps/${id}`);
}

/** 重新排序指南步骤 */
export async function reorderGuideSteps(ids: number[]): Promise<void> {
  await mutationRequest<{ message: string }>('PUT', '/api/admin/guide/steps/reorder', { ids });
}

// ============ 图片上传 API ============

/**
 * 上传图片
 * 使用 FormData 发送 multipart/form-data 请求
 * @returns 上传后的图片路径（如 "/images/xxx.png"）
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/admin/upload`, {
    method: 'POST',
    body: formData,
    // 注意：不设置 Content-Type，让浏览器自动设置 multipart/form-data 及 boundary
  });

  if (!res.ok) {
    let message = `上传失败: ${res.status}`;
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
  return body.data.path as string;
}

// ============ 仪表盘统计 API ============

/** 获取仪表盘统计数据 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${BASE_URL}/api/admin/stats`);

  if (!res.ok) {
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
  return body.data as DashboardStats;
}
