// 图片上传路由
// 处理管理后台的图片上传功能，支持 JPEG、PNG、WebP 格式

import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// 允许的图片 MIME 类型
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

// 文件大小上限：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 配置 multer 磁盘存储
const storage = multer.diskStorage({
  // 上传目标目录
  destination: path.join(__dirname, '../../../public/images'),
  // 使用 UUID 重命名文件，保留原始扩展名
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// 创建 multer 实例
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPEG、PNG、WebP 格式'));
    }
  },
});

// POST / - 上传单张图片
router.post('/', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err: any) => {
    // 处理 multer 错误
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: '文件大小超过 5MB 上限' });
          return;
        }
        res.status(400).json({ error: `上传错误: ${err.message}` });
        return;
      }
      // 自定义错误（如格式不支持）
      res.status(400).json({ error: err.message });
      return;
    }

    // 未提供文件
    if (!req.file) {
      res.status(400).json({ error: '请选择要上传的图片文件' });
      return;
    }

    // 返回图片相对路径
    const imagePath = `/images/${req.file.filename}`;
    res.status(201).json({ data: { path: imagePath } });
  });
});

export default router;
