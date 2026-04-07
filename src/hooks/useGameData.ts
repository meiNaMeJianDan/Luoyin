// React Query Hooks
// 封装所有页面的数据获取逻辑，提供 data、isLoading、error 状态

import { useQuery } from '@tanstack/react-query';
import {
  fetchTrendingGames,
  fetchQuickLinks,
  fetchAllGames,
  fetchCategoryOptions,
  fetchGameById,
  fetchGameDetails,
  fetchRankedGames,
  fetchFAQs,
  fetchGuideSteps,
} from '@/api/client';
import type {
  Game,
  GameDetail,
  CategoryOptions,
  QuickLink,
  FAQ,
  GuideStep,
} from '@/api/client';

// ============ Home 页面 ============

/** 获取热门游戏列表 */
export function useTrendingGames() {
  return useQuery<Game[], Error>({
    queryKey: ['games', 'trending'],
    queryFn: fetchTrendingGames,
  });
}

/** 获取分类快速链接 */
export function useQuickLinks() {
  return useQuery<QuickLink[], Error>({
    queryKey: ['categories', 'quickLinks'],
    queryFn: fetchQuickLinks,
  });
}

// ============ Categories 页面 ============

/** 获取所有游戏列表 */
export function useAllGames() {
  return useQuery<Game[], Error>({
    queryKey: ['games', 'all'],
    queryFn: fetchAllGames,
  });
}

/** 获取分类筛选选项 */
export function useCategoryOptions() {
  return useQuery<CategoryOptions, Error>({
    queryKey: ['categories', 'options'],
    queryFn: fetchCategoryOptions,
  });
}

// ============ GameDetail 页面 ============

/** 根据 ID 获取游戏基础信息 */
export function useGameById(id: number) {
  return useQuery<Game, Error>({
    queryKey: ['games', id],
    queryFn: () => fetchGameById(id),
    enabled: id > 0,
  });
}

/** 根据游戏 ID 获取游戏详情 */
export function useGameDetails(id: number) {
  return useQuery<GameDetail, Error>({
    queryKey: ['games', id, 'details'],
    queryFn: () => fetchGameDetails(id),
    enabled: id > 0,
  });
}

// ============ Trending 页面 ============

/** 获取排行榜游戏列表（按 rank 升序） */
export function useRankedGames() {
  return useQuery<Game[], Error>({
    queryKey: ['games', 'ranked'],
    queryFn: fetchRankedGames,
  });
}

// ============ BeginnersGuide 页面 ============

/** 获取新手常见问题列表 */
export function useFAQs() {
  return useQuery<FAQ[], Error>({
    queryKey: ['guide', 'faqs'],
    queryFn: fetchFAQs,
  });
}

/** 获取新手指南步骤列表 */
export function useGuideSteps() {
  return useQuery<GuideStep[], Error>({
    queryKey: ['guide', 'steps'],
    queryFn: fetchGuideSteps,
  });
}
