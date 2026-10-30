// 分类选项与快速链接管理路由
// 提供分类选项更新、快速链接的创建、更新、删除 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { execute, queryOne } from '../../db.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate, validateId } from '../../middleware/validation.js';
import { categoryOptionSchema, quickLinkSchema } from './schemas.js';

const router = Router();

// PUT /options - 更新分类选项
router.put('/options', validate(categoryOptionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { key, value } = req.body;

  // 更新对应 key 的 value（option_key：避免使用 MySQL 保留字 key）
  const result = await execute(
    'UPDATE category_options SET `value` = ? WHERE option_key = ?',
    [value, key],
  );

  if (result.affectedRows === 0) {
    // key 不存在时插入新记录
    await execute('INSERT INTO category_options (option_key, `value`) VALUES (?, ?)', [key, value]);
  }

  // 查询更新后的记录
  const row = await queryOne<any>(
    'SELECT id, option_key, `value` FROM category_options WHERE option_key = ?',
    [key],
  );
  res.status(200).json({ data: { id: row.id, key: row.option_key, value: row.value } });
}));

// POST /quick-links - 创建快速链接
router.post('/quick-links', validate(quickLinkSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, icon, color, link } = req.body;

  const result = await execute(
    'INSERT INTO quick_links (name, icon, color, link) VALUES (?, ?, ?, ?)',
    [name, icon, color, link],
  );

  // 查询刚插入的完整记录
  const row = await queryOne<any>('SELECT * FROM quick_links WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: { id: row.id, name: row.name, icon: row.icon, color: row.color, link: row.link } });
}));

// PUT /quick-links/:id - 更新快速链接
router.put('/quick-links/:id', validateId, validate(quickLinkSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, icon, color, link } = req.body;

  // 检查快速链接是否存在
  const existing = await queryOne('SELECT id FROM quick_links WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: '快速链接不存在' });
    return;
  }

  await execute(
    'UPDATE quick_links SET name = ?, icon = ?, color = ?, link = ? WHERE id = ?',
    [name, icon, color, link, id],
  );

  // 查询更新后的完整记录
  const row = await queryOne<any>('SELECT * FROM quick_links WHERE id = ?', [id]);
  res.status(200).json({ data: { id: row.id, name: row.name, icon: row.icon, color: row.color, link: row.link } });
}));

// DELETE /quick-links/:id - 删除快速链接
router.delete('/quick-links/:id', validateId, asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // 检查快速链接是否存在
  const existing = await queryOne('SELECT id FROM quick_links WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: '快速链接不存在' });
    return;
  }

  await execute('DELETE FROM quick_links WHERE id = ?', [id]);

  res.status(200).json({ data: { message: '快速链接删除成功' } });
}));

export default router;
