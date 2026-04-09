// 分类选项与快速链接管理路由
// 提供分类选项更新、快速链接的创建、更新、删除 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../../db.js';
import { validate, validateId } from '../../middleware/validation.js';
import { categoryOptionSchema, quickLinkSchema } from './schemas.js';

const router = Router();

// PUT /options - 更新分类选项
router.put('/options', validate(categoryOptionSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { key, value } = req.body;

    // 更新对应 key 的 value
    const result = db.prepare('UPDATE category_options SET value = ? WHERE key = ?').run(value, key);

    if (result.changes === 0) {
      // key 不存在时插入新记录
      db.prepare('INSERT INTO category_options (key, value) VALUES (?, ?)').run(key, value);
    }

    // 查询更新后的记录
    const row = db.prepare('SELECT * FROM category_options WHERE key = ?').get(key) as any;
    res.status(200).json({ data: { id: row.id, key: row.key, value: row.value } });
  } catch (error) {
    console.error('更新分类选项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /quick-links - 创建快速链接
router.post('/quick-links', validate(quickLinkSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { name, icon, color, link } = req.body;

    const result = db.prepare(`
      INSERT INTO quick_links (name, icon, color, link)
      VALUES (?, ?, ?, ?)
    `).run(name, icon, color, link);

    // 查询刚插入的完整记录
    const row = db.prepare('SELECT * FROM quick_links WHERE id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json({ data: { id: row.id, name: row.name, icon: row.icon, color: row.color, link: row.link } });
  } catch (error) {
    console.error('创建快速链接失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /quick-links/:id - 更新快速链接
router.put('/quick-links/:id', validateId, validate(quickLinkSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { name, icon, color, link } = req.body;

    // 检查快速链接是否存在
    const existing = db.prepare('SELECT id FROM quick_links WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '快速链接不存在' });
      return;
    }

    db.prepare(`
      UPDATE quick_links
      SET name = ?, icon = ?, color = ?, link = ?
      WHERE id = ?
    `).run(name, icon, color, link, id);

    // 查询更新后的完整记录
    const row = db.prepare('SELECT * FROM quick_links WHERE id = ?').get(id) as any;
    res.status(200).json({ data: { id: row.id, name: row.name, icon: row.icon, color: row.color, link: row.link } });
  } catch (error) {
    console.error('更新快速链接失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /quick-links/:id - 删除快速链接
router.delete('/quick-links/:id', validateId, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    // 检查快速链接是否存在
    const existing = db.prepare('SELECT id FROM quick_links WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '快速链接不存在' });
      return;
    }

    db.prepare('DELETE FROM quick_links WHERE id = ?').run(id);

    res.status(200).json({ data: { message: '快速链接删除成功' } });
  } catch (error) {
    console.error('删除快速链接失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
