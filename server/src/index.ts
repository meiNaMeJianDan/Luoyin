// Express 服务入口文件
// 配置 Express 应用、CORS、静态文件服务，启动时连接数据库

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';
import gamesRouter from './routes/games.js';
import categoriesRouter from './routes/categories.js';
import guideRouter from './routes/guide.js';
import adminGamesRouter from './routes/admin/games.js';
import adminCategoriesRouter from './routes/admin/categories.js';
import adminGuideRouter from './routes/admin/guide.js';
import adminUploadRouter from './routes/admin/upload.js';
import adminStatsRouter from './routes/admin/stats.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 启用 JSON 请求体解析
app.use(express.json());

// 配置 CORS，允许前端开发服务器访问
app.use(cors({
  origin: 'http://localhost:5173',
}));

// 配置静态文件服务，提供游戏图片资源
// 使用 path.join 确保跨平台兼容
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// 可配置端口，默认 3001，支持环境变量 PORT 覆盖
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// 注册只读 API 路由
app.use('/api/games', gamesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/guide', guideRouter);

// 注册管理 API 路由
app.use('/api/admin/games', adminGamesRouter);
app.use('/api/admin/categories', adminCategoriesRouter);
app.use('/api/admin/guide', adminGuideRouter);
app.use('/api/admin/upload', adminUploadRouter);
app.use('/api/admin', adminStatsRouter);

// 注册错误处理中间件（必须在路由之后）
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务
function start(): void {
  // 启动时连接数据库（getDb 内部会处理连接失败并 process.exit(1)）
  getDb();

  app.listen(PORT, () => {
    console.log(`服务已启动，监听端口 ${PORT}`);
  });
}

// 仅在直接运行时启动服务，导入时不自动启动
// 判断当前模块是否为入口模块
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  start();
}

// 导出 app 实例供测试使用
export { app, start };
