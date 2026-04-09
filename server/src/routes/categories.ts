// 分类选项路由
// 提供分类筛选选项和分类快速链接 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db.js';
import type { CategoryOptions, QuickLink } from '../types.js';

const router = Router();

// GET /api/categories/options - 获取筛选选项（types、playerCounts、durations）
router.get('/options', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM category_options').all() as { key: string; value: string }[];

  // 将 3 条记录组合成一个 CategoryOptions 对象
  const options: CategoryOptions = {
    types: [],
    playerCounts: [],
    durations: [],
  };

  for (const row of rows) {
    const parsed = JSON.parse(row.value) as string[];
    if (row.key === 'types') {
      options.types = parsed;
    } else if (row.key === 'playerCounts') {
      options.playerCounts = parsed;
    } else if (row.key === 'durations') {
      options.durations = parsed;
    }
  }

  res.json({ data: options });
});

// GET /api/categories/quick-links - 获取分类快速链接列表
router.get('/quick-links', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name, icon, color, link FROM quick_links').all() as QuickLink[];

  res.json({ data: rows });
});

export default router;
