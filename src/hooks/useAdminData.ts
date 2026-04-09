// 管理后台 Mutation Hooks
// 封装所有后台管理系统的写操作 hooks，使用 @tanstack/react-query 的 useMutation
// 每个 mutation 成功后自动刷新对应的查询缓存

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGame,
  updateGame,
  deleteGame,
  createGameDetail,
  updateGameDetail,
  deleteGameDetail,
  updateCategoryOption,
  createQuickLink,
  updateQuickLink,
  deleteQuickLink,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  reorderFAQs,
  createGuideStep,
  updateGuideStep,
  deleteGuideStep,
  reorderGuideSteps,
  uploadImage,
  fetchDashboardStats,
} from '@/api/adminClient';
import type {
  GameInput,
  GameDetailInput,
  QuickLinkInput,
  FAQInput,
  GuideStepInput,
  DashboardStats,
} from '@/api/adminClient';

// ============ 游戏管理 Mutation Hooks ============

/** 创建游戏 */
export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GameInput) => createGame(data),
    onSuccess: () => {
      // 刷新所有游戏相关列表
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/** 更新游戏 */
export function useUpdateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GameInput }) => updateGame(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

/** 删除游戏（级联删除详情） */
export function useDeleteGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}


// ============ 游戏详情管理 Mutation Hooks ============

/** 创建游戏详情 */
export function useCreateGameDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, data }: { gameId: number; data: GameDetailInput }) =>
      createGameDetail(gameId, data),
    onSuccess: (_data, variables) => {
      // 刷新该游戏的详情查询
      queryClient.invalidateQueries({ queryKey: ['games', variables.gameId, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/** 更新游戏详情 */
export function useUpdateGameDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, data }: { gameId: number; data: GameDetailInput }) =>
      updateGameDetail(gameId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['games', variables.gameId, 'details'] });
    },
  });
}

/** 删除游戏详情 */
export function useDeleteGameDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: number) => deleteGameDetail(gameId),
    onSuccess: (_data, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['games', gameId, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ============ 分类选项管理 Mutation Hook ============

/** 更新分类选项 */
export function useUpdateCategoryOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; value: string[] }) => updateCategoryOption(data),
    onSuccess: () => {
      // 刷新分类选项查询
      queryClient.invalidateQueries({ queryKey: ['categories', 'options'] });
    },
  });
}

// ============ 快速链接管理 Mutation Hooks ============

/** 创建快速链接 */
export function useCreateQuickLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QuickLinkInput) => createQuickLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'quickLinks'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/** 更新快速链接 */
export function useUpdateQuickLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuickLinkInput }) => updateQuickLink(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'quickLinks'] });
    },
  });
}

/** 删除快速链接 */
export function useDeleteQuickLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteQuickLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'quickLinks'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}


// ============ FAQ 管理 Mutation Hooks ============

/** 创建常见问题 */
export function useCreateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FAQInput) => createFAQ(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'faqs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/** 更新常见问题 */
export function useUpdateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FAQInput }) => updateFAQ(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'faqs'] });
    },
  });
}

/** 删除常见问题 */
export function useDeleteFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFAQ(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'faqs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/** 重新排序常见问题 */
export function useReorderFAQs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => reorderFAQs(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'faqs'] });
    },
  });
}

// ============ 指南步骤管理 Mutation Hooks ============

/** 创建指南步骤 */
export function useCreateGuideStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GuideStepInput) => createGuideStep(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'steps'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/** 更新指南步骤 */
export function useUpdateGuideStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GuideStepInput }) => updateGuideStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'steps'] });
    },
  });
}

/** 删除指南步骤 */
export function useDeleteGuideStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGuideStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'steps'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

/** 重新排序指南步骤 */
export function useReorderGuideSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => reorderGuideSteps(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide', 'steps'] });
    },
  });
}

// ============ 图片上传 Mutation Hook ============

/** 上传图片，返回图片路径 */
export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => uploadImage(file),
  });
}

// ============ 仪表盘统计查询 Hook ============

/** 获取仪表盘统计数据 */
export function useDashboardStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ['admin', 'stats'],
    queryFn: fetchDashboardStats,
  });
}
