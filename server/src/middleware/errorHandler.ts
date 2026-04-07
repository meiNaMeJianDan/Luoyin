// 统一错误处理中间件
// 提供未匹配路由处理（404）和全局异常捕获（500）

import type { Request, Response, NextFunction } from 'express';

/**
 * 未匹配路由处理中间件
 * 当请求未被任何路由匹配时，返回 404
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({ error: '接口不存在' });
}

/**
 * 全局错误处理中间件
 * 捕获所有未处理异常，返回 500，不暴露堆栈信息
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 控制台输出错误日志便于调试
  console.error('[错误]', err.message);
  console.error(err.stack);

  res.status(500).json({ error: '服务器内部错误' });
}
