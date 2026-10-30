// 游戏管理路由
// 提供游戏的创建、更新、删除 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { execute, queryOne, withTransaction } from '../../db.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
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
    // game_rank：避免使用 MySQL 保留字 rank
    rank: row.game_rank ?? undefined,
    comment: row.comment ?? undefined,
    isTrending: row.is_trending === 1,
  };
}

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

// POST / - 创建游戏
router.post('/', validate(gameSchema), asyncHandler(async (req: Request, res: Response) => {
  const { title, type, players, time, image, difficulty, tags, isHot, rank, comment, isTrending } = req.body;

  const result = await execute(
    `INSERT INTO games (title, type, players, time, image, difficulty, tags, is_hot, game_rank, comment, is_trending)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
  );

  // 查询刚插入的完整记录
  const row = await queryOne('SELECT * FROM games WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: rowToGame(row) });
}));

// PUT /:id - 更新游戏
router.put('/:id', validateId, validate(gameSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { title, type, players, time, image, difficulty, tags, isHot, rank, comment, isTrending } = req.body;

  // 检查游戏是否存在
  const existing = await queryOne('SELECT id FROM games WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: '游戏不存在' });
    return;
  }

  await execute(
    `UPDATE games
     SET title = ?, type = ?, players = ?, time = ?, image = ?, difficulty = ?, tags = ?,
         is_hot = ?, game_rank = ?, comment = ?, is_trending = ?
     WHERE id = ?`,
    [
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
    ],
  );

  // 查询更新后的完整记录
  const row = await queryOne('SELECT * FROM games WHERE id = ?', [id]);
  res.status(200).json({ data: rowToGame(row) });
}));

// DELETE /:id - 删除游戏（级联删除游戏详情）
router.delete('/:id', validateId, asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // 检查游戏是否存在
  const existing = await queryOne('SELECT id FROM games WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: '游戏不存在' });
    return;
  }

  // 先删除关联的游戏详情，再删除游戏本身
  await withTransaction(async (connection) => {
    await connection.query('DELETE FROM game_details WHERE game_id = ?', [id]);
    await connection.query('DELETE FROM games WHERE id = ?', [id]);
  });

  res.status(200).json({ data: { message: '游戏删除成功' } });
}));

// POST /:id/details - 创建游戏详情
router.post('/:id/details', validateId, validate(gameDetailSchema), asyncHandler(async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);

  // 校验游戏是否存在
  const game = await queryOne('SELECT id FROM games WHERE id = ?', [gameId]);
  if (!game) {
    res.status(404).json({ error: '游戏不存在' });
    return;
  }

  // 校验详情是否已存在（不允许重复创建）
  const existingDetail = await queryOne('SELECT id FROM game_details WHERE game_id = ?', [gameId]);
  if (existingDetail) {
    res.status(409).json({ error: '该游戏已存在详情记录' });
    return;
  }

  const { introduction, objective, victoryConditions, gameplaySteps, tips } = req.body;

  await execute(
    `INSERT INTO game_details (game_id, introduction, objective, victory_conditions, gameplay_steps, tips)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      gameId,
      introduction,
      objective,
      JSON.stringify(victoryConditions),
      JSON.stringify(gameplaySteps),
      JSON.stringify(tips),
    ],
  );

  // 查询刚插入的完整记录
  const row = await queryOne('SELECT * FROM game_details WHERE game_id = ?', [gameId]);
  res.status(201).json({ data: rowToGameDetail(row) });
}));

// PUT /:id/details - 更新游戏详情
router.put('/:id/details', validateId, validate(gameDetailSchema), asyncHandler(async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);

  // 校验游戏是否存在
  const game = await queryOne('SELECT id FROM games WHERE id = ?', [gameId]);
  if (!game) {
    res.status(404).json({ error: '游戏不存在' });
    return;
  }

  // 校验详情是否存在
  const existingDetail = await queryOne('SELECT id FROM game_details WHERE game_id = ?', [gameId]);
  if (!existingDetail) {
    res.status(404).json({ error: '游戏详情不存在' });
    return;
  }

  const { introduction, objective, victoryConditions, gameplaySteps, tips } = req.body;

  await execute(
    `UPDATE game_details
     SET introduction = ?, objective = ?, victory_conditions = ?, gameplay_steps = ?, tips = ?
     WHERE game_id = ?`,
    [
      introduction,
      objective,
      JSON.stringify(victoryConditions),
      JSON.stringify(gameplaySteps),
      JSON.stringify(tips),
      gameId,
    ],
  );

  // 查询更新后的完整记录
  const row = await queryOne('SELECT * FROM game_details WHERE game_id = ?', [gameId]);
  res.status(200).json({ data: rowToGameDetail(row) });
}));

// DELETE /:id/details - 删除游戏详情
router.delete('/:id/details', validateId, asyncHandler(async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);

  // 校验游戏详情是否存在
  const existingDetail = await queryOne('SELECT id FROM game_details WHERE game_id = ?', [gameId]);
  if (!existingDetail) {
    res.status(404).json({ error: '游戏详情不存在' });
    return;
  }

  await execute('DELETE FROM game_details WHERE game_id = ?', [gameId]);

  res.status(200).json({ data: { message: '游戏详情删除成功' } });
}));

export default router;
