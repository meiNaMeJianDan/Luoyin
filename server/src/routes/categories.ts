// 分类选项路由
// 提供分类筛选选项和分类快速链接 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import type { CategoryOptions, QuickLink } from '../types.js';

const router = Router();

// GET /api/categories/options - 获取筛选选项（types、playerCounts、durations）
router.get('/options', asyncHandler(async (_req: Request, res: Response) => {
  // option_key：避免使用 MySQL 保留字 key
  const rows = await query<{ option_key: string; value: string }>(
    'SELECT option_key, `value` FROM category_options',
  );

  // 将 3 条记录组合成一个 CategoryOptions 对象
  const options: CategoryOptions = {
    types: [],
    playerCounts: [],
    durations: [],
  };

  for (const row of rows) {
    const parsed = JSON.parse(row.value) as string[];
    if (row.option_key === 'types') {
      options.types = parsed;
    } else if (row.option_key === 'playerCounts') {
      options.playerCounts = parsed;
    } else if (row.option_key === 'durations') {
      options.durations = parsed;
    }
  }

  res.json({ data: options });
}));

// GET /api/categories/quick-links - 获取分类快速链接列表
router.get('/quick-links', asyncHandler(async (_req: Request, res: Response) => {
  const rows = await query<QuickLink>('SELECT id, name, icon, color, link FROM quick_links');

  res.json({ data: rows });
}));

export default router;
