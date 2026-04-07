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
  name: string;
  icon: string;
  color: string;
  link: string;
}

/** 新手常见问题 */
export interface FAQ {
  q: string;
  a: string;
}

/** 新手指南步骤 */
export interface GuideStep {
  step: string;
  desc: string;
}

/** 成功响应 */
export interface SuccessResponse<T> {
  data: T;
}

/** 错误响应 */
export interface ErrorResponse {
  error: string;
}
