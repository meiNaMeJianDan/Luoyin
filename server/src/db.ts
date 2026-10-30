// 数据库连接与查询封装模块
// 使用 mysql2 连接池访问 MySQL，并提供 Promise 化的查询辅助函数

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

/** 读取环境变量并转数字，缺失时使用默认值 */
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** 全局连接池，首次导入时创建 */
const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: envNumber('DB_PORT', 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'boardgame',
  waitForConnections: true,
  connectionLimit: envNumber('DB_POOL_SIZE', 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  // 让 COUNT(*) 等结果以数字返回，并保持 DATETIME 为字符串
  dateStrings: true,
});

/** 初始化数据库：验证连接可用，失败时退出进程 */
export async function initDb(): Promise<void> {
  let connection: PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  } finally {
    connection?.release();
  }
}

/** 查询多行 */
export async function query<T = RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

/** 查询单行，不存在时返回 null */
export async function queryOne<T = RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** 执行写操作，返回受影响行数与自增 ID */
export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.query<ResultSetHeader>(sql, params);
  return result;
}

/** 在事务中执行一组操作，异常时自动回滚 */
export async function withTransaction<T>(
  fn: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export { pool };
