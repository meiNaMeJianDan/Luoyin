// 仪表盘统计路由
// 提供各数据表记录数的统计接口，用于后台管理仪表盘概览

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../../db.js';
import type { DashboardStats } from '../../types.js';

const router = Router();

// GET /stats - 获取仪表盘统计数据
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // 查询各表的记录总数
    const gameCount = (db.prepare('SELECT COUNT(*) as count FROM games').get() as any).count;
    const detailCount = (db.prepare('SELECT COUNT(*) as count FROM game_details').get() as any).count;
    const faqCount = (db.prepare('SELECT COUNT(*) as count FROM faqs').get() as any).count;
    const guideStepCount = (db.prepare('SELECT COUNT(*) as count FROM guide_steps').get() as any).count;
    const quickLinkCount = (db.prepare('SELECT COUNT(*) as count FROM quick_links').get() as any).count;
    const categoryOptionCount = (db.prepare('SELECT COUNT(*) as count FROM category_options').get() as any).count;

    const stats: DashboardStats = {
      gameCount,
      detailCount,
      faqCount,
      guideStepCount,
      quickLinkCount,
      categoryOptionCount,
    };

    res.status(200).json({ data: stats });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
