// 游戏管理路由
// 提供游戏的创建、更新、删除 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../../db.js';
import { validate, validateId } from '../../middleware/validation.js';
import { gameSchema, gameDetailSchema } from './schemas.js';
import type { Game, GameDetail } from '../../types.js';

const router = Router();

/** 数据库行转换为 Game 对象 */
function rowToGame(row: any): Game {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    players: row.players,
    time: row.time,
    image: row.image,
    difficulty: row.difficulty,
    tags: JSON.parse(row.tags),
    isHot: row.is_hot === 1,
    rank: row.rank ?? undefined,
    comment: row.comment ?? undefined,
    isTrending: row.is_trending === 1,
  };
}

// POST / - 创建游戏
router.post('/', validate(gameSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { title, type, players, time, image, difficulty, tags, isHot, rank, comment, isTrending } = req.body;

    const result = db.prepare(`
      INSERT INTO games (title, type, players, time, image, difficulty, tags, is_hot, rank, comment, is_trending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      type,
      players,
      time,
      image,
      difficulty,
      JSON.stringify(tags),
      isHot ? 1 : 0,
      rank ?? null,
      comment ?? null,
      isTrending ? 1 : 0,
    );

    // 查询刚插入的完整记录
    const row = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: rowToGame(row) });
  } catch (error) {
    console.error('创建游戏失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// PUT /:id - 更新游戏
router.put('/:id', validateId, validate(gameSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { title, type, players, time, image, difficulty, tags, isHot, rank, comment, isTrending } = req.body;

    // 检查游戏是否存在
    const existing = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '游戏不存在' });
      return;
    }

    db.prepare(`
      UPDATE games
      SET title = ?, type = ?, players = ?, time = ?, image = ?, difficulty = ?, tags = ?,
          is_hot = ?, rank = ?, comment = ?, is_trending = ?
      WHERE id = ?
    `).run(
      title,
      type,
      players,
      time,
      image,
      difficulty,
      JSON.stringify(tags),
      isHot ? 1 : 0,
      rank ?? null,
      comment ?? null,
      isTrending ? 1 : 0,
      id,
    );

    // 查询更新后的完整记录
    const row = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
    res.status(200).json({ data: rowToGame(row) });
  } catch (error) {
    console.error('更新游戏失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /:id - 删除游戏（级联删除游戏详情）
router.delete('/:id', validateId, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    // 检查游戏是否存在
    const existing = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '游戏不存在' });
      return;
    }

    // 先删除关联的游戏详情，再删除游戏本身
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM game_details WHERE game_id = ?').run(id);
      db.prepare('DELETE FROM games WHERE id = ?').run(id);
    });
    deleteTransaction();

    res.status(200).json({ data: { message: '游戏删除成功' } });
  } catch (error) {
    console.error('删除游戏失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/** 数据库行转换为 GameDetail 对象 */
function rowToGameDetail(row: any): GameDetail {
  return {
    gameId: row.game_id,
    introduction: row.introduction,
    objective: row.objective,
    victoryConditions: JSON.parse(row.victory_conditions),
    gameplaySteps: JSON.parse(row.gameplay_steps),
    tips: JSON.parse(row.tips),
  };
}

// POST /:id/details - 创建游戏详情
router.post('/:id/details', validateId, validate(gameDetailSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const gameId = Number(req.params.id);

    // 校验游戏是否存在
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(gameId);
    if (!game) {
      res.status(404).json({ error: '游戏不存在' });
      return;
    }

    // 校验详情是否已存在（不允许重复创建）
    const existingDetail = db.prepare('SELECT id FROM game_details WHERE game_id = ?').get(gameId);
    if (existingDetail) {
      res.status(409).json({ error: '该游戏已存在详情记录' });
      return;
    }

    const { introduction, objective, victoryConditions, gameplaySteps, tips } = req.body;

    db.prepare(`
      INSERT INTO game_details (game_id, introduction, objective, victory_conditions, gameplay_steps, tips)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      gameId,
      introduction,
      objective,
      JSON.stringify(victoryConditions),
      JSON.stringify(gameplaySteps),
      JSON.stringify(tips),
    );

    // 查询刚插入的完整记录
    const row = db.prepare('SELECT * FROM game_details WHERE game_id = ?').get(gameId);
    res.status(201).json({ data: rowToGameDetail(row) });
  } catch (error) {
    console.error('创建游戏详情失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /:id/details - 更新游戏详情
router.put('/:id/details', validateId, validate(gameDetailSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const gameId = Number(req.params.id);

    // 校验游戏是否存在
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(gameId);
    if (!game) {
      res.status(404).json({ error: '游戏不存在' });
      return;
    }

    // 校验详情是否存在
    const existingDetail = db.prepare('SELECT id FROM game_details WHERE game_id = ?').get(gameId);
    if (!existingDetail) {
      res.status(404).json({ error: '游戏详情不存在' });
      return;
    }

    const { introduction, objective, victoryConditions, gameplaySteps, tips } = req.body;

    db.prepare(`
      UPDATE game_details
      SET introduction = ?, objective = ?, victory_conditions = ?, gameplay_steps = ?, tips = ?
      WHERE game_id = ?
    `).run(
      introduction,
      objective,
      JSON.stringify(victoryConditions),
      JSON.stringify(gameplaySteps),
      JSON.stringify(tips),
      gameId,
    );

    // 查询更新后的完整记录
    const row = db.prepare('SELECT * FROM game_details WHERE game_id = ?').get(gameId);
    res.status(200).json({ data: rowToGameDetail(row) });
  } catch (error) {
    console.error('更新游戏详情失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /:id/details - 删除游戏详情
router.delete('/:id/details', validateId, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const gameId = Number(req.params.id);

    // 校验游戏详情是否存在
    const existingDetail = db.prepare('SELECT id FROM game_details WHERE game_id = ?').get(gameId);
    if (!existingDetail) {
      res.status(404).json({ error: '游戏详情不存在' });
      return;
    }

    db.prepare('DELETE FROM game_details WHERE game_id = ?').run(gameId);

    res.status(200).json({ data: { message: '游戏详情删除成功' } });
  } catch (error) {
    console.error('删除游戏详情失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
