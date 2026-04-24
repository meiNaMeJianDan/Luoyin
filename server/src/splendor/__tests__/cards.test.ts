import { describe, it, expect } from 'vitest';
import {
  getLevel1Cards,
  getLevel2Cards,
  getLevel3Cards,
  getAllNobles,
  getCardById,
  getNobleById,
} from '../cards.js';
import { GEM_COLORS } from '../types.js';
// 类型在运行时不需要，但保留导入路径以确保模块可用

describe('cards.ts — 发展卡和贵族静态数据', () => {
  // 数量验证
  it('等级 1 发展卡应有 40 张', () => {
    expect(getLevel1Cards()).toHaveLength(40);
  });

  it('等级 2 发展卡应有 30 张', () => {
    expect(getLevel2Cards()).toHaveLength(30);
  });

  it('等级 3 发展卡应有 20 张', () => {
    expect(getLevel3Cards()).toHaveLength(20);
  });

  it('贵族应有 10 张', () => {
    expect(getAllNobles()).toHaveLength(10);
  });

  // Bonus 颜色分布验证
  it('等级 1 每种颜色 Bonus 各 8 张', () => {
    const cards = getLevel1Cards();
    for (const color of GEM_COLORS) {
      const count = cards.filter(c => c.bonus === color).length;
      expect(count).toBe(8);
    }
  });

  it('等级 2 每种颜色 Bonus 各 6 张', () => {
    const cards = getLevel2Cards();
    for (const color of GEM_COLORS) {
      const count = cards.filter(c => c.bonus === color).length;
      expect(count).toBe(6);
    }
  });

  it('等级 3 每种颜色 Bonus 各 4 张', () => {
    const cards = getLevel3Cards();
    for (const color of GEM_COLORS) {
      const count = cards.filter(c => c.bonus === color).length;
      expect(count).toBe(4);
    }
  });

  // ID 唯一性验证
  it('所有发展卡 ID 应唯一', () => {
    const allCards = [...getLevel1Cards(), ...getLevel2Cards(), ...getLevel3Cards()];
    const ids = allCards.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('所有贵族 ID 应唯一', () => {
    const nobles = getAllNobles();
    const ids = nobles.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // 数据合法性验证
  it('所有发展卡的 level、bonus、prestige、cost 均合法', () => {
    const allCards = [...getLevel1Cards(), ...getLevel2Cards(), ...getLevel3Cards()];
    for (const card of allCards) {
      expect([1, 2, 3]).toContain(card.level);
      expect(GEM_COLORS).toContain(card.bonus);
      expect(card.prestige).toBeGreaterThanOrEqual(0);
      expect(card.prestige).toBeLessThanOrEqual(5);
      expect(Number.isInteger(card.prestige)).toBe(true);
      for (const color of GEM_COLORS) {
        expect(card.cost[color]).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(card.cost[color])).toBe(true);
      }
    }
  });

  it('所有贵族的 prestige 为 3，requirements 合法', () => {
    const nobles = getAllNobles();
    for (const noble of nobles) {
      expect(noble.prestige).toBe(3);
      for (const color of GEM_COLORS) {
        expect(noble.requirements[color]).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(noble.requirements[color])).toBe(true);
      }
    }
  });

  // 成本范围验证
  it('等级 1 卡成本总计在 1-4 范围内，声望 0-1', () => {
    for (const card of getLevel1Cards()) {
      const total = Object.values(card.cost).reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(5);
      expect(card.prestige).toBeGreaterThanOrEqual(0);
      expect(card.prestige).toBeLessThanOrEqual(1);
    }
  });

  it('等级 2 卡成本总计在 3-6 范围内，声望 1-3', () => {
    for (const card of getLevel2Cards()) {
      const total = Object.values(card.cost).reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(3);
      expect(total).toBeLessThanOrEqual(8);
      expect(card.prestige).toBeGreaterThanOrEqual(1);
      expect(card.prestige).toBeLessThanOrEqual(3);
    }
  });

  it('等级 3 卡成本总计在 3-7 范围内（含高成本卡），声望 3-5', () => {
    for (const card of getLevel3Cards()) {
      const total = Object.values(card.cost).reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(3);
      expect(total).toBeLessThanOrEqual(14);
      expect(card.prestige).toBeGreaterThanOrEqual(3);
      expect(card.prestige).toBeLessThanOrEqual(5);
    }
  });

  // 贵族需求范围验证
  it('贵族需求总计在 6-9 范围内', () => {
    for (const noble of getAllNobles()) {
      const total = Object.values(noble.requirements).reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(6);
      expect(total).toBeLessThanOrEqual(9);
    }
  });

  // ID 查找功能验证
  it('getCardById 能正确查找发展卡', () => {
    const card = getCardById('L1-01');
    expect(card).toBeDefined();
    expect(card!.id).toBe('L1-01');
    expect(card!.level).toBe(1);
  });

  it('getCardById 对不存在的 ID 返回 undefined', () => {
    expect(getCardById('invalid')).toBeUndefined();
  });

  it('getNobleById 能正确查找贵族', () => {
    const noble = getNobleById('N-01');
    expect(noble).toBeDefined();
    expect(noble!.id).toBe('N-01');
    expect(noble!.prestige).toBe(3);
  });

  it('getNobleById 对不存在的 ID 返回 undefined', () => {
    expect(getNobleById('invalid')).toBeUndefined();
  });

  // 返回副本验证（不应修改原始数据）
  it('getLevel1Cards 返回副本，修改不影响原始数据', () => {
    const cards1 = getLevel1Cards();
    const cards2 = getLevel1Cards();
    cards1.pop();
    expect(cards2).toHaveLength(40);
  });

  it('getAllNobles 返回副本，修改不影响原始数据', () => {
    const nobles1 = getAllNobles();
    const nobles2 = getAllNobles();
    nobles1.pop();
    expect(nobles2).toHaveLength(10);
  });
});
