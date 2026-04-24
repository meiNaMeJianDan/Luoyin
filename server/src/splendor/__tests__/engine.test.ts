import { describe, it, expect } from 'vitest';
import {
  initGame,
  getPlayerBonus,
  serializeGameState,
  deserializeGameState,
  shuffle,
} from '../engine.js';
import type { SplendorPlayer } from '../types.js';
import {
  GEM_COLORS,
  GEM_COUNT_BY_PLAYERS,
  GOLD_COUNT,
  DISPLAY_SIZE,
  NOBLE_COUNT_BY_PLAYERS,
  CARDS_PER_LEVEL,
} from '../types.js';

// 辅助函数：创建测试玩家
function createTestPlayers(count: number): SplendorPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `玩家${i + 1}`,
    socketId: `socket-${i + 1}`,
    gems: { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 },
    purchasedCards: [],
    reservedCards: [],
    nobles: [],
    prestige: 0,
    isHost: i === 0,
    isAI: false,
    isConnected: true,
    isReady: true,
  }));
}

describe('shuffle — Fisher-Yates 洗牌', () => {
  it('返回与原数组相同长度的新数组', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(arr.length);
  });

  it('不修改原数组', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('包含所有原始元素', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffle(arr);
    expect(result.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b));
  });

  it('空数组返回空数组', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('单元素数组返回相同元素', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

describe('initGame — 游戏初始化', () => {
  for (const playerCount of [2, 3, 4]) {
    describe(`${playerCount} 人游戏`, () => {
      const players = createTestPlayers(playerCount);
      const state = initGame(players, 'room-001');

      it('宝石池中每种普通宝石数量正确', () => {
        const expected = GEM_COUNT_BY_PLAYERS[playerCount];
        for (const color of GEM_COLORS) {
          expect(state.gemPool[color]).toBe(expected);
        }
      });

      it('黄金万能宝石固定为 5 个', () => {
        expect(state.gemPool.gold).toBe(GOLD_COUNT);
      });

      it('每个等级展示区有 4 张卡', () => {
        expect(state.display[1]).toHaveLength(DISPLAY_SIZE);
        expect(state.display[2]).toHaveLength(DISPLAY_SIZE);
        expect(state.display[3]).toHaveLength(DISPLAY_SIZE);
      });

      it('牌堆 + 展示区总数等于该等级总卡牌数', () => {
        expect(state.decks[1].length + state.display[1].length).toBe(CARDS_PER_LEVEL[1]);
        expect(state.decks[2].length + state.display[2].length).toBe(CARDS_PER_LEVEL[2]);
        expect(state.decks[3].length + state.display[3].length).toBe(CARDS_PER_LEVEL[3]);
      });

      it('贵族数量等于玩家数 + 1', () => {
        expect(state.nobles).toHaveLength(NOBLE_COUNT_BY_PLAYERS[playerCount]);
      });

      it('所有玩家初始宝石为 0', () => {
        for (const p of state.players) {
          for (const color of GEM_COLORS) {
            expect(p.gems[color]).toBe(0);
          }
          expect(p.gems.gold).toBe(0);
        }
      });

      it('所有玩家已购买卡/预留卡/贵族为空', () => {
        for (const p of state.players) {
          expect(p.purchasedCards).toHaveLength(0);
          expect(p.reservedCards).toHaveLength(0);
          expect(p.nobles).toHaveLength(0);
          expect(p.prestige).toBe(0);
        }
      });

      it('初始阶段为 player_turn，从第一位玩家开始', () => {
        expect(state.phase).toBe('player_turn');
        expect(state.currentPlayerIndex).toBe(0);
      });

      it('roomId 正确设置', () => {
        expect(state.roomId).toBe('room-001');
      });

      it('isLastRound 为 false，winnerId 为 null', () => {
        expect(state.isLastRound).toBe(false);
        expect(state.winnerId).toBeNull();
      });
    });
  }

  it('展示区和牌堆中的卡牌 ID 不重复', () => {
    const state = initGame(createTestPlayers(4), 'room-002');
    const allIds = [
      ...state.decks[1], ...state.decks[2], ...state.decks[3],
      ...state.display[1], ...state.display[2], ...state.display[3],
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe('getPlayerBonus — 玩家 Bonus 计算', () => {
  it('无已购买卡时所有 Bonus 为 0', () => {
    const player = createTestPlayers(1)[0];
    const bonus = getPlayerBonus(player);
    for (const color of GEM_COLORS) {
      expect(bonus[color]).toBe(0);
    }
  });

  it('正确统计已购买卡的 Bonus', () => {
    const player = createTestPlayers(1)[0];
    // L1-01 的 bonus 是 diamond，L1-09 的 bonus 是 sapphire
    player.purchasedCards = ['L1-01', 'L1-02', 'L1-09'];
    const bonus = getPlayerBonus(player);
    expect(bonus.diamond).toBe(2); // L1-01 和 L1-02 都是 diamond bonus
    expect(bonus.sapphire).toBe(1); // L1-09 是 sapphire bonus
    expect(bonus.emerald).toBe(0);
    expect(bonus.ruby).toBe(0);
    expect(bonus.onyx).toBe(0);
  });
});

describe('serializeGameState / deserializeGameState — 序列化往返', () => {
  it('序列化后反序列化应产生等价对象', () => {
    const state = initGame(createTestPlayers(3), 'room-003');
    const json = serializeGameState(state);
    const restored = deserializeGameState(json);
    expect(restored).toEqual(state);
  });

  it('序列化结果为有效 JSON 字符串', () => {
    const state = initGame(createTestPlayers(2), 'room-004');
    const json = serializeGameState(state);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
