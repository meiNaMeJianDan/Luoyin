// 数据库连接与初始化模块
// 使用 better-sqlite3 创建 SQLite 数据库连接，并初始化所有表结构

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件路径：server/data.db
const DB_PATH = path.join(__dirname, '..', 'data.db');

let db: Database.Database | null = null;

/** 初始化数据库表结构 */
function initTables(database: Database.Database): void {
  database.exec(`
    -- 游戏基础信息表
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      players TEXT NOT NULL,
      time TEXT NOT NULL,
      image TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      tags TEXT NOT NULL,
      is_hot INTEGER NOT NULL DEFAULT 0,
      rank INTEGER,
      comment TEXT,
      is_trending INTEGER NOT NULL DEFAULT 0
    );

    -- 游戏详情表
    CREATE TABLE IF NOT EXISTS game_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL UNIQUE,
      introduction TEXT NOT NULL,
      objective TEXT NOT NULL,
      victory_conditions TEXT NOT NULL,
      gameplay_steps TEXT NOT NULL,
      tips TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    -- 分类筛选选项表
    CREATE TABLE IF NOT EXISTS category_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );

    -- 分类快速链接表
    CREATE TABLE IF NOT EXISTS quick_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      link TEXT NOT NULL
    );

    -- 新手常见问题表
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- 新手指南步骤表
    CREATE TABLE IF NOT EXISTS guide_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
}

/** 获取数据库实例，首次调用时创建连接并初始化表结构 */
export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  try {
    db = new Database(DB_PATH);
    // 启用 WAL 模式提升并发读取性能
    db.pragma('journal_mode = WAL');
    // 启用外键约束
    db.pragma('foreign_keys = ON');
    // 初始化表结构
    initTables(db);
    return db;
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
}
