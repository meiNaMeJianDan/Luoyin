// 种子数据脚本
// 直接执行 docker/mysql/init.sql，把建表语句和种子数据写入 MySQL。
// 可通过 `npm run seed` 执行；脚本会重建表，重复执行结果一致。

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// init.sql 位于项目根目录的 docker/mysql/ 下（src 与 dist 相对层级一致）
const SQL_PATH = process.env.INIT_SQL_PATH
  || path.resolve(__dirname, '..', '..', 'docker', 'mysql', 'init.sql');

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** 执行种子数据填充 */
async function seed(): Promise<void> {
  if (!fs.existsSync(SQL_PATH)) {
    throw new Error(`未找到初始化脚本: ${SQL_PATH}`);
  }

  const sql = fs.readFileSync(SQL_PATH, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: envNumber('DB_PORT', 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'boardgame',
    charset: 'utf8mb4',
    // init.sql 包含多条语句，需要开启多语句执行
    multipleStatements: true,
  });

  try {
    await connection.query(sql);

    const tables = [
      ['Games', 'games'],
      ['GameDetails', 'game_details'],
      ['CategoryOptions', 'category_options'],
      ['QuickLinks', 'quick_links'],
      ['FAQs', 'faqs'],
      ['GuideSteps', 'guide_steps'],
    ] as const;

    console.log('✅ 种子数据填充完成：');
    for (const [label, table] of tables) {
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = Number((rows as { count: number }[])[0]?.count ?? 0);
      console.log(`   - ${label}: ${count} 条`);
    }
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('❌ 种子数据填充失败:', error);
  process.exit(1);
});
