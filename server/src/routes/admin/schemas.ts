// 管理 API 请求体校验 schema
// 使用 zod 定义所有管理接口的输入校验规则

import { z } from 'zod';

/** 游戏创建/更新校验 schema */
export const gameSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  type: z.string().min(1, '类型不能为空'),
  players: z.string().min(1, '玩家人数不能为空'),
  time: z.string().min(1, '游戏时长不能为空'),
  image: z.string().min(1, '图片路径不能为空'),
  difficulty: z.string().min(1, '难度不能为空'),
  tags: z.array(z.string()).min(1, '标签不能为空'),
  isHot: z.boolean().optional().default(false),
  rank: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
  isTrending: z.boolean().optional().default(false),
});

/** 游戏详情创建/更新校验 schema */
export const gameDetailSchema = z.object({
  introduction: z.string().min(1, '简介不能为空'),
  objective: z.string().min(1, '目标不能为空'),
  victoryConditions: z.array(z.object({
    text: z.string().optional(),
    image: z.string().nullable().optional(),
  })).min(1, '获胜条件不能为空'),
  gameplaySteps: z.array(z.object({
    title: z.string(),
    desc: z.union([z.string(), z.array(z.string())]),
    image: z.string().nullable().optional(),
  })).min(1, '玩法步骤不能为空'),
  tips: z.array(z.string()).min(1, '新手提示不能为空'),
});

/** 快速链接校验 schema */
export const quickLinkSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  icon: z.string().min(1, '图标不能为空'),
  color: z.string().min(1, '颜色不能为空'),
  link: z.string().min(1, '链接不能为空'),
});

/** FAQ 校验 schema */
export const faqSchema = z.object({
  question: z.string().min(1, '问题不能为空'),
  answer: z.string().min(1, '答案不能为空'),
});

/** 指南步骤校验 schema */
export const guideStepSchema = z.object({
  step: z.string().min(1, '步骤名不能为空'),
  description: z.string().min(1, '描述不能为空'),
});

/** 排序校验 schema */
export const reorderSchema = z.object({
  ids: z.array(z.number()).min(1, 'ID 列表不能为空'),
});

/** 分类选项更新校验 schema */
export const categoryOptionSchema = z.object({
  key: z.string().min(1, '选项键不能为空'),
  value: z.string().min(1, '选项值不能为空'),
});
