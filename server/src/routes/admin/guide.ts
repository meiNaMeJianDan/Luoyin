// FAQ 与新手指南步骤管理路由
// 提供 FAQ 和指南步骤的创建、更新、删除、排序 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { execute, queryOne, withTransaction } from '../../db.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate, validateId } from '../../middleware/validation.js';
import { faqSchema, guideStepSchema, reorderSchema } from './schemas.js';

const router = Router();

// ============================================
// FAQ 管理路由
// ============================================

// POST /faqs - 创建 FAQ
router.post('/faqs', validate(faqSchema), asyncHandler(async (req: Request, res: Response) => {
  const { question, answer } = req.body;

  // 获取当前最大 sort_order，新记录排在最后
  const maxRow = await queryOne<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM faqs',
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;

  const result = await execute(
    'INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)',
    [question, answer, sortOrder],
  );

  // 查询刚插入的完整记录
  const row = await queryOne<any>('SELECT * FROM faqs WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: { id: row.id, question: row.question, answer: row.answer, sort_order: row.sort_order } });
}));

// PUT /faqs/reorder - FAQ 排序（必须在 :id 路由之前注册）
router.put('/faqs/reorder', validate(reorderSchema), asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: number[] };

  // 使用事务批量更新 sort_order
  await withTransaction(async (connection) => {
    for (const [index, id] of ids.entries()) {
      await connection.query('UPDATE faqs SET sort_order = ? WHERE id = ?', [index, id]);
    }
  });

  res.status(200).json({ data: { message: 'FAQ 排序更新成功' } });
}));

// PUT /faqs/:id - 更新 FAQ
router.put('/faqs/:id', validateId, validate(faqSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { question, answer } = req.body;

  // 检查 FAQ 是否存在
  const existing = await queryOne('SELECT id FROM faqs WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'FAQ 不存在' });
    return;
  }

  await execute('UPDATE faqs SET question = ?, answer = ? WHERE id = ?', [question, answer, id]);

  // 查询更新后的完整记录
  const row = await queryOne<any>('SELECT * FROM faqs WHERE id = ?', [id]);
  res.status(200).json({ data: { id: row.id, question: row.question, answer: row.answer, sort_order: row.sort_order } });
}));

// DELETE /faqs/:id - 删除 FAQ
router.delete('/faqs/:id', validateId, asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // 检查 FAQ 是否存在
  const existing = await queryOne('SELECT id FROM faqs WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'FAQ 不存在' });
    return;
  }

  await execute('DELETE FROM faqs WHERE id = ?', [id]);

  res.status(200).json({ data: { message: 'FAQ 删除成功' } });
}));

// ============================================
// 指南步骤管理路由
// ============================================

// POST /steps - 创建指南步骤
router.post('/steps', validate(guideStepSchema), asyncHandler(async (req: Request, res: Response) => {
  const { step, description } = req.body;

  // 获取当前最大 sort_order，新记录排在最后
  const maxRow = await queryOne<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM guide_steps',
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;

  const result = await execute(
    'INSERT INTO guide_steps (step, description, sort_order) VALUES (?, ?, ?)',
    [step, description, sortOrder],
  );

  // 查询刚插入的完整记录
  const row = await queryOne<any>('SELECT * FROM guide_steps WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: { id: row.id, step: row.step, description: row.description, sort_order: row.sort_order } });
}));

// PUT /steps/reorder - 指南步骤排序（必须在 :id 路由之前注册）
router.put('/steps/reorder', validate(reorderSchema), asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: number[] };

  // 使用事务批量更新 sort_order
  await withTransaction(async (connection) => {
    for (const [index, id] of ids.entries()) {
      await connection.query('UPDATE guide_steps SET sort_order = ? WHERE id = ?', [index, id]);
    }
  });

  res.status(200).json({ data: { message: '指南步骤排序更新成功' } });
}));

// PUT /steps/:id - 更新指南步骤
router.put('/steps/:id', validateId, validate(guideStepSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { step, description } = req.body;

  // 检查指南步骤是否存在
  const existing = await queryOne('SELECT id FROM guide_steps WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: '指南步骤不存在' });
    return;
  }

  await execute('UPDATE guide_steps SET step = ?, description = ? WHERE id = ?', [step, description, id]);

  // 查询更新后的完整记录
  const row = await queryOne<any>('SELECT * FROM guide_steps WHERE id = ?', [id]);
  res.status(200).json({ data: { id: row.id, step: row.step, description: row.description, sort_order: row.sort_order } });
}));

// DELETE /steps/:id - 删除指南步骤
router.delete('/steps/:id', validateId, asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // 检查指南步骤是否存在
  const existing = await queryOne('SELECT id FROM guide_steps WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: '指南步骤不存在' });
    return;
  }

  await execute('DELETE FROM guide_steps WHERE id = ?', [id]);

  res.status(200).json({ data: { message: '指南步骤删除成功' } });
}));

export default router;
