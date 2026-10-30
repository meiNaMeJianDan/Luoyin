// 仪表盘统计路由
// 提供各数据表记录数的统计接口，用于后台管理仪表盘概览

import { Router } from 'express';
import type { Request, Response } from 'express';
import { queryOne } from '../../db.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import type { DashboardStats } from '../../types.js';

const router = Router();

/** 查询单表记录数 */
async function countOf(table: string): Promise<number> {
  const row = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
  return Number(row?.count ?? 0);
}

// GET /stats - 获取仪表盘统计数据
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const [gameCount, detailCount, faqCount, guideStepCount, quickLinkCount, categoryOptionCount] =
    await Promise.all([
      countOf('games'),
      countOf('game_details'),
      countOf('faqs'),
      countOf('guide_steps'),
      countOf('quick_links'),
      countOf('category_options'),
    ]);

  const stats: DashboardStats = {
    gameCount,
    detailCount,
    faqCount,
    guideStepCount,
    quickLinkCount,
    categoryOptionCount,
  };

  res.status(200).json({ data: stats });
}));

export default router;
