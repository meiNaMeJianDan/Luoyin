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
  const rows = db.prepare('SELECT question, answer FROM faqs ORDER BY sort_order ASC').all() as { question: string; answer: string }[];

  // 将数据库字段 question/answer 映射为 q/a
  const faqs: FAQ[] = rows.map((row) => ({
    q: row.question,
    a: row.answer,
  }));

  res.json({ data: faqs });
});

// GET /api/guide/steps - 获取基础流程步骤列表，按 sort_order 排序
router.get('/steps', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT step, description FROM guide_steps ORDER BY sort_order ASC').all() as { step: string; description: string }[];

  // 将数据库字段 description 映射为 desc
  const steps: GuideStep[] = rows.map((row) => ({
    step: row.step,
    desc: row.description,
  }));

  res.json({ data: steps });
});

export default router;
