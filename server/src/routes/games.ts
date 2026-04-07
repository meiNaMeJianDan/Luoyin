// 游戏相关路由
// 提供游戏列表、热门游戏、排行榜、游戏详情等 API 接口

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db.js';
import type { Game, GameDetail } from '../types.js';

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

// GET /api/games - 获取所有游戏列表
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM games').all();
  const games = rows.map(rowToGame);
  res.json({ data: games });
});

// GET /api/games/trending - 获取热门游戏（isTrending 为 true）
// 注意：必须在 /:id 路由之前注册，避免 "trending" 被当作 :id 解析
router.get('/trending', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM games WHERE is_trending = 1').all();
  const games = rows.map(rowToGame);
  res.json({ data: games });
});

// GET /api/games/ranked - 获取排行榜游戏，按 rank 升序排列
// 注意：必须在 /:id 路由之前注册，避免 "ranked" 被当作 :id 解析
router.get('/ranked', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM games WHERE rank IS NOT NULL ORDER BY rank ASC').all();
  const games = rows.map(rowToGame);
  res.json({ data: games });
});

// GET /api/games/:id - 获取指定游戏
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  // id 非数字返回 400
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: '无效的游戏 ID' });
    return;
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(Number(id));

  if (!row) {
    res.status(404).json({ error: '游戏不存在' });
    return;
  }

  res.json({ data: rowToGame(row) });
});

// GET /api/games/:id/details - 获取游戏详情
router.get('/:id/details', (req: Request, res: Response) => {
  const { id } = req.params;

  // id 非数字返回 400
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: '无效的游戏 ID' });
    return;
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM game_details WHERE game_id = ?').get(Number(id));

  if (!row) {
    res.status(404).json({ error: '游戏详情不存在' });
    return;
  }

  res.json({ data: rowToGameDetail(row) });
});

export default router;
