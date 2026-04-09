// 新手指南路由
// 提供常见问题和基础流程步骤 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db.js';
import type { FAQ, GuideStep } from '../types.js';

const router = Router();

// GET /api/guide/faqs - 获取常见问题列表，按 sort_order 排序
router.get('/faqs', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, question, answer, sort_order FROM faqs ORDER BY sort_order ASC').all() as { id: number; question: string; answer: string; sort_order: number }[];

  // 将数据库字段 question/answer 映射为 q/a，同时返回 id 和 sort_order
  const faqs: FAQ[] = rows.map((row) => ({
    id: row.id,
    q: row.question,
    a: row.answer,
    sort_order: row.sort_order,
  }));

  res.json({ data: faqs });
});

// GET /api/guide/steps - 获取基础流程步骤列表，按 sort_order 排序
router.get('/steps', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, step, description, sort_order FROM guide_steps ORDER BY sort_order ASC').all() as { id: number; step: string; description: string; sort_order: number }[];

  // 将数据库字段 description 映射为 desc，同时返回 id 和 sort_order
  const steps: GuideStep[] = rows.map((row) => ({
    id: row.id,
    step: row.step,
    desc: row.description,
    sort_order: row.sort_order,
  }));

  res.json({ data: steps });
});

export default router;
