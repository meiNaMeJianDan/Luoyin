// 请求校验中间件
// 提供通用的 zod schema 校验和路径参数 id 校验

import type { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

/**
 * 格式化 zod 错误信息为用户友好的字符串
 * 将多个字段错误合并为逗号分隔的描述
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.join('.');
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .join(', ');
}

/**
 * 通用请求体校验中间件工厂函数
 * 接收 zod schema 作为参数，返回 Express 中间件
 * 校验失败返回 HTTP 400，响应格式 { error: "具体字段错误描述" }
 */
export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: formatZodError(result.error) });
      return;
    }
    // 将校验后的数据写回 req.body，确保类型安全
    req.body = result.data;
    next();
  };
}

/**
 * 路径参数 :id 校验中间件
 * 检查 req.params.id 是否为纯数字字符串
 * 非数字返回 HTTP 400
 */
export function validateId(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: '无效的 ID' });
    return;
  }
  next();
}
