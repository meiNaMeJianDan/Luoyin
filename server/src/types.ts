// 共享类型定义文件
// 定义后端 API 使用的所有数据接口

/** 游戏基础信息 */
export interface Game {
  id: number;
  title: string;
  type: string;
  players: string;
  time: string;
  image: string;
  difficulty: string;
  tags: string[];
  isHot: boolean;
  rank?: number;
  comment?: string;
  isTrending: boolean;
}

/** 获胜条件 */
export interface VictoryCondition {
  text?: string;
  image?: string | null;
}

/** 玩法步骤 */
export interface GameplayStep {
  title: string;
  desc: string | string[];
  image?: string | null;
}

/** 游戏详情 */
export interface GameDetail {
  gameId: number;
  introduction: string;
  objective: string;
  victoryConditions: VictoryCondition[];
  gameplaySteps: GameplayStep[];
  tips: string[];
}

/** 分类筛选选项 */
export interface CategoryOptions {
  types: string[];
  playerCounts: string[];
  durations: string[];
}

/** 分类快速链接 */
export interface QuickLink {
  id?: number;
  name: string;
  icon: string;
  color: string;
  link: string;
}

/** 新手常见问题 */
export interface FAQ {
  id?: number;
  q: string;
  a: string;
  sort_order?: number;
}

/** 新手指南步骤 */
export interface GuideStep {
  id?: number;
  step: string;
  desc: string;
  sort_order?: number;
}

/** 成功响应 */
export interface SuccessResponse<T> {
  data: T;
}

/** 错误响应 */
export interface ErrorResponse {
  error: string;
}

// ============================================
// 管理 API 输入类型定义
// 用于后台管理系统的创建/更新操作
// ============================================

/** 游戏创建/更新输入类型（不含 id） */
export interface GameInput {
  title: string;
  type: string;
  players: string;
  time: string;
  image: string;
  difficulty: string;
  tags: string[];
  isHot?: boolean;
  rank?: number | null;
  comment?: string | null;
  isTrending?: boolean;
}

/** 游戏详情创建/更新输入类型（不含 gameId） */
export interface GameDetailInput {
  introduction: string;
  objective: string;
  victoryConditions: VictoryCondition[];
  gameplaySteps: GameplayStep[];
  tips: string[];
}

/** 快速链接创建/更新输入类型 */
export interface QuickLinkInput {
  name: string;
  icon: string;
  color: string;
  link: string;
}

/** 常见问题创建/更新输入类型 */
export interface FAQInput {
  question: string;
  answer: string;
}

/** 指南步骤创建/更新输入类型 */
export interface GuideStepInput {
  step: string;
  description: string;
}

/** 仪表盘统计数据 */
export interface DashboardStats {
  gameCount: number;
  detailCount: number;
  faqCount: number;
  guideStepCount: number;
  quickLinkCount: number;
  categoryOptionCount: number;
}
