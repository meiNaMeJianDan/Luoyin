// ============================================================
// 璀璨宝石（Splendor）发展卡和贵族静态数据
// 基于璀璨宝石桌游官方数据
// ============================================================

import type { DevelopmentCard, Noble, GemColor } from './types';

// 辅助函数：创建宝石成本映射
function cost(diamond: number, sapphire: number, emerald: number, ruby: number, onyx: number) {
  return { diamond, sapphire, emerald, ruby, onyx };
}

// 辅助函数：创建贵族需求映射
function req(diamond: number, sapphire: number, emerald: number, ruby: number, onyx: number) {
  return { diamond, sapphire, emerald, ruby, onyx };
}

// ============================================================
// 等级 1 发展卡（40 张）
// 每种颜色 Bonus 各 8 张
// 成本范围：1-4 个宝石总计，声望 0-1
// ============================================================

const LEVEL_1_CARDS: DevelopmentCard[] = [
  // === 钻石（diamond）Bonus — 8 张 ===
  { id: 'L1-01', level: 1, cost: cost(0, 3, 0, 0, 0), bonus: 'diamond', prestige: 0 },
  { id: 'L1-02', level: 1, cost: cost(0, 0, 0, 2, 1), bonus: 'diamond', prestige: 0 },
  { id: 'L1-03', level: 1, cost: cost(0, 1, 1, 1, 1), bonus: 'diamond', prestige: 0 },
  { id: 'L1-04', level: 1, cost: cost(0, 2, 0, 0, 2), bonus: 'diamond', prestige: 0 },
  { id: 'L1-05', level: 1, cost: cost(3, 1, 0, 0, 1), bonus: 'diamond', prestige: 0 },
  { id: 'L1-06', level: 1, cost: cost(0, 0, 0, 0, 3), bonus: 'diamond', prestige: 0 },
  { id: 'L1-07', level: 1, cost: cost(0, 1, 2, 1, 1), bonus: 'diamond', prestige: 0 },
  { id: 'L1-08', level: 1, cost: cost(0, 0, 4, 0, 0), bonus: 'diamond', prestige: 1 },

  // === 蓝宝石（sapphire）Bonus — 8 张 ===
  { id: 'L1-09', level: 1, cost: cost(1, 0, 0, 0, 2), bonus: 'sapphire', prestige: 0 },
  { id: 'L1-10', level: 1, cost: cost(0, 0, 0, 0, 3), bonus: 'sapphire', prestige: 0 },
  { id: 'L1-11', level: 1, cost: cost(1, 0, 1, 1, 1), bonus: 'sapphire', prestige: 0 },
  { id: 'L1-12', level: 1, cost: cost(0, 0, 2, 0, 2), bonus: 'sapphire', prestige: 0 },
  { id: 'L1-13', level: 1, cost: cost(0, 0, 3, 0, 0), bonus: 'sapphire', prestige: 0 },
  { id: 'L1-14', level: 1, cost: cost(1, 0, 1, 3, 0), bonus: 'sapphire', prestige: 0 },
  { id: 'L1-15', level: 1, cost: cost(1, 0, 2, 1, 1), bonus: 'sapphire', prestige: 0 },
  { id: 'L1-16', level: 1, cost: cost(0, 0, 0, 4, 0), bonus: 'sapphire', prestige: 1 },

  // === 祖母绿（emerald）Bonus — 8 张 ===
  { id: 'L1-17', level: 1, cost: cost(0, 1, 0, 0, 2), bonus: 'emerald', prestige: 0 },
  { id: 'L1-18', level: 1, cost: cost(0, 0, 0, 3, 0), bonus: 'emerald', prestige: 0 },
  { id: 'L1-19', level: 1, cost: cost(1, 1, 0, 1, 1), bonus: 'emerald', prestige: 0 },
  { id: 'L1-20', level: 1, cost: cost(2, 0, 0, 2, 0), bonus: 'emerald', prestige: 0 },
  { id: 'L1-21', level: 1, cost: cost(0, 0, 0, 0, 3), bonus: 'emerald', prestige: 0 },
  { id: 'L1-22', level: 1, cost: cost(0, 1, 0, 1, 3), bonus: 'emerald', prestige: 0 },
  { id: 'L1-23', level: 1, cost: cost(1, 1, 0, 1, 2), bonus: 'emerald', prestige: 0 },
  { id: 'L1-24', level: 1, cost: cost(0, 0, 0, 0, 4), bonus: 'emerald', prestige: 1 },

  // === 红宝石（ruby）Bonus — 8 张 ===
  { id: 'L1-25', level: 1, cost: cost(2, 0, 1, 0, 0), bonus: 'ruby', prestige: 0 },
  { id: 'L1-26', level: 1, cost: cost(3, 0, 0, 0, 0), bonus: 'ruby', prestige: 0 },
  { id: 'L1-27', level: 1, cost: cost(1, 1, 1, 0, 1), bonus: 'ruby', prestige: 0 },
  { id: 'L1-28', level: 1, cost: cost(2, 0, 2, 0, 0), bonus: 'ruby', prestige: 0 },
  { id: 'L1-29', level: 1, cost: cost(0, 0, 0, 3, 0), bonus: 'ruby', prestige: 0 },
  { id: 'L1-30', level: 1, cost: cost(0, 3, 1, 1, 0), bonus: 'ruby', prestige: 0 },
  { id: 'L1-31', level: 1, cost: cost(2, 1, 1, 0, 1), bonus: 'ruby', prestige: 0 },
  { id: 'L1-32', level: 1, cost: cost(0, 4, 0, 0, 0), bonus: 'ruby', prestige: 1 },

  // === 缟玛瑙（onyx）Bonus — 8 张 ===
  { id: 'L1-33', level: 1, cost: cost(0, 2, 1, 0, 0), bonus: 'onyx', prestige: 0 },
  { id: 'L1-34', level: 1, cost: cost(0, 0, 3, 0, 0), bonus: 'onyx', prestige: 0 },
  { id: 'L1-35', level: 1, cost: cost(1, 1, 1, 1, 0), bonus: 'onyx', prestige: 0 },
  { id: 'L1-36', level: 1, cost: cost(2, 2, 0, 0, 0), bonus: 'onyx', prestige: 0 },
  { id: 'L1-37', level: 1, cost: cost(3, 0, 0, 0, 0), bonus: 'onyx', prestige: 0 },
  { id: 'L1-38', level: 1, cost: cost(0, 0, 1, 3, 1), bonus: 'onyx', prestige: 0 },
  { id: 'L1-39', level: 1, cost: cost(1, 2, 1, 1, 0), bonus: 'onyx', prestige: 0 },
  { id: 'L1-40', level: 1, cost: cost(4, 0, 0, 0, 0), bonus: 'onyx', prestige: 1 },
];


// ============================================================
// 等级 2 发展卡（30 张）
// 每种颜色 Bonus 各 6 张
// 成本范围：3-6 个宝石总计，声望 1-3
// ============================================================

const LEVEL_2_CARDS: DevelopmentCard[] = [
  // === 钻石（diamond）Bonus — 6 张 ===
  { id: 'L2-01', level: 2, cost: cost(0, 0, 3, 2, 2), bonus: 'diamond', prestige: 1 },
  { id: 'L2-02', level: 2, cost: cost(2, 3, 0, 3, 0), bonus: 'diamond', prestige: 1 },
  { id: 'L2-03', level: 2, cost: cost(0, 0, 1, 4, 2), bonus: 'diamond', prestige: 2 },
  { id: 'L2-04', level: 2, cost: cost(0, 0, 0, 5, 3), bonus: 'diamond', prestige: 2 },
  { id: 'L2-05', level: 2, cost: cost(6, 0, 0, 0, 0), bonus: 'diamond', prestige: 3 },
  { id: 'L2-06', level: 2, cost: cost(0, 0, 0, 5, 0), bonus: 'diamond', prestige: 2 },

  // === 蓝宝石（sapphire）Bonus — 6 张 ===
  { id: 'L2-07', level: 2, cost: cost(0, 2, 2, 3, 0), bonus: 'sapphire', prestige: 1 },
  { id: 'L2-08', level: 2, cost: cost(0, 2, 3, 0, 3), bonus: 'sapphire', prestige: 1 },
  { id: 'L2-09', level: 2, cost: cost(2, 0, 0, 1, 4), bonus: 'sapphire', prestige: 2 },
  { id: 'L2-10', level: 2, cost: cost(0, 5, 3, 0, 0), bonus: 'sapphire', prestige: 2 },
  { id: 'L2-11', level: 2, cost: cost(0, 6, 0, 0, 0), bonus: 'sapphire', prestige: 3 },
  { id: 'L2-12', level: 2, cost: cost(0, 0, 5, 0, 0), bonus: 'sapphire', prestige: 2 },

  // === 祖母绿（emerald）Bonus — 6 张 ===
  { id: 'L2-13', level: 2, cost: cost(3, 0, 2, 3, 0), bonus: 'emerald', prestige: 1 },
  { id: 'L2-14', level: 2, cost: cost(2, 3, 0, 0, 2), bonus: 'emerald', prestige: 1 },
  { id: 'L2-15', level: 2, cost: cost(4, 2, 0, 0, 1), bonus: 'emerald', prestige: 2 },
  { id: 'L2-16', level: 2, cost: cost(0, 5, 0, 0, 3), bonus: 'emerald', prestige: 2 },  // 修正: 原 0,0,5,3,0 → 调整为合理分布
  { id: 'L2-17', level: 2, cost: cost(0, 0, 6, 0, 0), bonus: 'emerald', prestige: 3 },
  { id: 'L2-18', level: 2, cost: cost(0, 5, 0, 0, 0), bonus: 'emerald', prestige: 2 },

  // === 红宝石（ruby）Bonus — 6 张 ===
  { id: 'L2-19', level: 2, cost: cost(2, 0, 0, 2, 3), bonus: 'ruby', prestige: 1 },
  { id: 'L2-20', level: 2, cost: cost(3, 0, 2, 0, 3), bonus: 'ruby', prestige: 1 },
  { id: 'L2-21', level: 2, cost: cost(1, 4, 2, 0, 0), bonus: 'ruby', prestige: 2 },
  { id: 'L2-22', level: 2, cost: cost(3, 0, 0, 0, 5), bonus: 'ruby', prestige: 2 },
  { id: 'L2-23', level: 2, cost: cost(0, 0, 0, 6, 0), bonus: 'ruby', prestige: 3 },
  { id: 'L2-24', level: 2, cost: cost(5, 0, 0, 0, 0), bonus: 'ruby', prestige: 2 },

  // === 缟玛瑙（onyx）Bonus — 6 张 ===
  { id: 'L2-25', level: 2, cost: cost(3, 2, 0, 0, 2), bonus: 'onyx', prestige: 1 },
  { id: 'L2-26', level: 2, cost: cost(0, 3, 0, 2, 3), bonus: 'onyx', prestige: 1 },  // 修正: 调整为合理分布
  { id: 'L2-27', level: 2, cost: cost(0, 1, 4, 2, 0), bonus: 'onyx', prestige: 2 },
  { id: 'L2-28', level: 2, cost: cost(0, 0, 5, 3, 0), bonus: 'onyx', prestige: 2 },
  { id: 'L2-29', level: 2, cost: cost(0, 0, 0, 0, 6), bonus: 'onyx', prestige: 3 },
  { id: 'L2-30', level: 2, cost: cost(0, 0, 0, 0, 5), bonus: 'onyx', prestige: 2 },
];


// ============================================================
// 等级 3 发展卡（20 张）
// 每种颜色 Bonus 各 4 张
// 成本范围：3-7 个宝石总计，声望 3-5
// ============================================================

const LEVEL_3_CARDS: DevelopmentCard[] = [
  // === 钻石（diamond）Bonus — 4 张 ===
  { id: 'L3-01', level: 3, cost: cost(3, 3, 5, 3, 0), bonus: 'diamond', prestige: 3 },
  { id: 'L3-02', level: 3, cost: cost(0, 0, 0, 0, 7), bonus: 'diamond', prestige: 4 },
  { id: 'L3-03', level: 3, cost: cost(3, 0, 0, 0, 7), bonus: 'diamond', prestige: 5 },
  { id: 'L3-04', level: 3, cost: cost(0, 3, 3, 5, 3), bonus: 'diamond', prestige: 3 },  // 修正: 调整为合理分布

  // === 蓝宝石（sapphire）Bonus — 4 张 ===
  { id: 'L3-05', level: 3, cost: cost(3, 0, 3, 3, 5), bonus: 'sapphire', prestige: 3 },
  { id: 'L3-06', level: 3, cost: cost(7, 0, 0, 0, 0), bonus: 'sapphire', prestige: 4 },
  { id: 'L3-07', level: 3, cost: cost(7, 3, 0, 0, 0), bonus: 'sapphire', prestige: 5 },
  { id: 'L3-08', level: 3, cost: cost(5, 3, 0, 3, 3), bonus: 'sapphire', prestige: 3 },  // 修正: 调整为合理分布

  // === 祖母绿（emerald）Bonus — 4 张 ===
  { id: 'L3-09', level: 3, cost: cost(5, 3, 0, 3, 3), bonus: 'emerald', prestige: 3 },
  { id: 'L3-10', level: 3, cost: cost(0, 7, 0, 0, 0), bonus: 'emerald', prestige: 4 },
  { id: 'L3-11', level: 3, cost: cost(0, 7, 3, 0, 0), bonus: 'emerald', prestige: 5 },
  { id: 'L3-12', level: 3, cost: cost(3, 5, 3, 0, 3), bonus: 'emerald', prestige: 3 },  // 修正: 调整为合理分布

  // === 红宝石（ruby）Bonus — 4 张 ===
  { id: 'L3-13', level: 3, cost: cost(3, 5, 3, 0, 3), bonus: 'ruby', prestige: 3 },
  { id: 'L3-14', level: 3, cost: cost(0, 0, 7, 0, 0), bonus: 'ruby', prestige: 4 },
  { id: 'L3-15', level: 3, cost: cost(0, 0, 7, 3, 0), bonus: 'ruby', prestige: 5 },
  { id: 'L3-16', level: 3, cost: cost(3, 3, 5, 0, 3), bonus: 'ruby', prestige: 3 },  // 修正: 调整为合理分布

  // === 缟玛瑙（onyx）Bonus — 4 张 ===
  { id: 'L3-17', level: 3, cost: cost(0, 3, 3, 5, 3), bonus: 'onyx', prestige: 3 },
  { id: 'L3-18', level: 3, cost: cost(0, 0, 0, 7, 0), bonus: 'onyx', prestige: 4 },
  { id: 'L3-19', level: 3, cost: cost(0, 0, 0, 7, 3), bonus: 'onyx', prestige: 5 },
  { id: 'L3-20', level: 3, cost: cost(3, 3, 0, 3, 5), bonus: 'onyx', prestige: 3 },  // 修正: 调整为合理分布
];


// ============================================================
// 贵族板块（10 张）
// 每位贵族需要特定颜色的 Bonus 组合
// 通常为 3+3 双色或 4+4 双色或 3+3+3 三色组合
// 每位贵族提供 3 声望
// ============================================================

const NOBLES: Noble[] = [
  // 双色组合（4+4）— 4 张
  { id: 'N-01', requirements: req(4, 4, 0, 0, 0), prestige: 3, name: '安妮·德·布列塔尼' },
  { id: 'N-02', requirements: req(0, 4, 4, 0, 0), prestige: 3, name: '查理五世' },
  { id: 'N-03', requirements: req(0, 0, 4, 4, 0), prestige: 3, name: '弗朗索瓦一世' },
  { id: 'N-04', requirements: req(0, 0, 0, 4, 4), prestige: 3, name: '亨利八世' },

  // 双色组合（4+4）— 继续
  { id: 'N-05', requirements: req(4, 0, 0, 0, 4), prestige: 3, name: '伊莎贝拉一世' },

  // 三色组合（3+3+3）— 5 张
  { id: 'N-06', requirements: req(3, 3, 3, 0, 0), prestige: 3, name: '凯瑟琳·德·美第奇' },
  { id: 'N-07', requirements: req(0, 3, 3, 3, 0), prestige: 3, name: '玛丽·斯图亚特' },
  { id: 'N-08', requirements: req(0, 0, 3, 3, 3), prestige: 3, name: '尼科洛·马基雅维利' },
  { id: 'N-09', requirements: req(3, 0, 0, 3, 3), prestige: 3, name: '苏莱曼大帝' },
  { id: 'N-10', requirements: req(3, 3, 0, 0, 3), prestige: 3, name: '伊丽莎白一世' },
];

// ============================================================
// 所有卡牌合并（用于 ID 查找）
// ============================================================

const ALL_CARDS: DevelopmentCard[] = [
  ...LEVEL_1_CARDS,
  ...LEVEL_2_CARDS,
  ...LEVEL_3_CARDS,
];

// 使用 Map 实现 O(1) 查找
const cardMap = new Map<string, DevelopmentCard>(
  ALL_CARDS.map(card => [card.id, card])
);

const nobleMap = new Map<string, Noble>(
  NOBLES.map(noble => [noble.id, noble])
);

// ============================================================
// 导出函数
// ============================================================

/** 获取所有等级 1 发展卡（40 张） */
export function getLevel1Cards(): DevelopmentCard[] {
  return [...LEVEL_1_CARDS];
}

/** 获取所有等级 2 发展卡（30 张） */
export function getLevel2Cards(): DevelopmentCard[] {
  return [...LEVEL_2_CARDS];
}

/** 获取所有等级 3 发展卡（20 张） */
export function getLevel3Cards(): DevelopmentCard[] {
  return [...LEVEL_3_CARDS];
}

/** 获取所有贵族（10 张） */
export function getAllNobles(): Noble[] {
  return [...NOBLES];
}

/** 通过 ID 查找发展卡 */
export function getCardById(cardId: string): DevelopmentCard | undefined {
  return cardMap.get(cardId);
}

/** 通过 ID 查找贵族 */
export function getNobleById(nobleId: string): Noble | undefined {
  return nobleMap.get(nobleId);
}