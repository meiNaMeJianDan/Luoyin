// FAQ 与新手指南步骤管理路由
// 提供 FAQ 和指南步骤的创建、更新、删除、排序 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../../db.js';
import { validate, validateId } from '../../middleware/validation.js';
import { faqSchema, guideStepSchema, reorderSchema } from './schemas.js';

const router = Router();

// ============================================
// FAQ 管理路由
// ============================================

// POST /faqs - 创建 FAQ
router.post('/faqs', validate(faqSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { question, answer } = req.body;

    // 获取当前最大 sort_order，新记录排在最后
    const maxRow = db.prepare('SELECT MAX(sort_order) as max_order FROM faqs').get() as any;
    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = db.prepare(`
      INSERT INTO faqs (question, answer, sort_order)
      VALUES (?, ?, ?)
    `).run(question, answer, sortOrder);

    // 查询刚插入的完整记录
    const row = db.prepare('SELECT * FROM faqs WHERE id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json({ data: { id: row.id, question: row.question, answer: row.answer, sort_order: row.sort_order } });
  } catch (error) {
    console.error('创建 FAQ 失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /faqs/reorder - FAQ 排序（必须在 :id 路由之前注册）
router.put('/faqs/reorder', validate(reorderSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { ids } = req.body;

    // 使用事务批量更新 sort_order
    const reorder = db.transaction((idList: number[]) => {
      const stmt = db.prepare('UPDATE faqs SET sort_order = ? WHERE id = ?');
      idList.forEach((id, index) => stmt.run(index, id));
    });
    reorder(ids);

    res.status(200).json({ data: { message: 'FAQ 排序更新成功' } });
  } catch (error) {
    console.error('FAQ 排序失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /faqs/:id - 更新 FAQ
router.put('/faqs/:id', validateId, validate(faqSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { question, answer } = req.body;

    // 检查 FAQ 是否存在
    const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'FAQ 不存在' });
      return;
    }

    db.prepare('UPDATE faqs SET question = ?, answer = ? WHERE id = ?').run(question, answer, id);

    // 查询更新后的完整记录
    const row = db.prepare('SELECT * FROM faqs WHERE id = ?').get(id) as any;
    res.status(200).json({ data: { id: row.id, question: row.question, answer: row.answer, sort_order: row.sort_order } });
  } catch (error) {
    console.error('更新 FAQ 失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /faqs/:id - 删除 FAQ
router.delete('/faqs/:id', validateId, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    // 检查 FAQ 是否存在
    const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'FAQ 不存在' });
      return;
    }

    db.prepare('DELETE FROM faqs WHERE id = ?').run(id);

    res.status(200).json({ data: { message: 'FAQ 删除成功' } });
  } catch (error) {
    console.error('删除 FAQ 失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ============================================
// 指南步骤管理路由
// ============================================

// POST /steps - 创建指南步骤
router.post('/steps', validate(guideStepSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { step, description } = req.body;

    // 获取当前最大 sort_order，新记录排在最后
    const maxRow = db.prepare('SELECT MAX(sort_order) as max_order FROM guide_steps').get() as any;
    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = db.prepare(`
      INSERT INTO guide_steps (step, description, sort_order)
      VALUES (?, ?, ?)
    `).run(step, description, sortOrder);

    // 查询刚插入的完整记录
    const row = db.prepare('SELECT * FROM guide_steps WHERE id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json({ data: { id: row.id, step: row.step, description: row.description, sort_order: row.sort_order } });
  } catch (error) {
    console.error('创建指南步骤失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /steps/reorder - 指南步骤排序（必须在 :id 路由之前注册）
router.put('/steps/reorder', validate(reorderSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { ids } = req.body;

    // 使用事务批量更新 sort_order
    const reorder = db.transaction((idList: number[]) => {
      const stmt = db.prepare('UPDATE guide_steps SET sort_order = ? WHERE id = ?');
      idList.forEach((id, index) => stmt.run(index, id));
    });
    reorder(ids);

    res.status(200).json({ data: { message: '指南步骤排序更新成功' } });
  } catch (error) {
    console.error('指南步骤排序失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /steps/:id - 更新指南步骤
router.put('/steps/:id', validateId, validate(guideStepSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { step, description } = req.body;

    // 检查指南步骤是否存在
    const existing = db.prepare('SELECT id FROM guide_steps WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '指南步骤不存在' });
      return;
    }

    db.prepare('UPDATE guide_steps SET step = ?, description = ? WHERE id = ?').run(step, description, id);

    // 查询更新后的完整记录
    const row = db.prepare('SELECT * FROM guide_steps WHERE id = ?').get(id) as any;
    res.status(200).json({ data: { id: row.id, step: row.step, description: row.description, sort_order: row.sort_order } });
  } catch (error) {
    console.error('更新指南步骤失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /steps/:id - 删除指南步骤
router.delete('/steps/:id', validateId, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    // 检查指南步骤是否存在
    const existing = db.prepare('SELECT id FROM guide_steps WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '指南步骤不存在' });
      return;
    }

    db.prepare('DELETE FROM guide_steps WHERE id = ?').run(id);

    res.status(200).json({ data: { message: '指南步骤删除成功' } });
  } catch (error) {
    console.error('删除指南步骤失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
