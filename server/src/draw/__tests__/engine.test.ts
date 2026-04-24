import { describe, it, expect } from 'vitest';
import { initGame, selectWord, autoSelectWord, judgeGuess, calculateGuesserScore, calculateDrawerScore } from '../engine.js';
import type { DrawPlayer, GameConfig, DrawGameState } from '../types.js';

/** 创建测试用玩家列表 */
function createTestPlayers(count: number): DrawPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `玩家${i}`,
    socketId: `socket-${i}`,
    score: 0,
    isHost: i === 0,
    isConnected: true,
    isReady: true,
    hasGuessedCorrect: false,
    guessedAt: null,
  }));
}

const defaultConfig: GameConfig = { rounds: 2, turnDuration: 90 };

describe('initGame', () => {
  it('应正确初始化游戏状态', () => {
    const players = createTestPlayers(4);
    const state = initGame(players, 'room-001', defaultConfig);

    expect(state.roomId).toBe('room-001');
    expect(state.players).toHaveLength(4);
    expect(state.config).toEqual(defaultConfig);
    expect(state.currentRound).toBe(1);
    expect(state.currentTurnIndex).toBe(0);
    expect(state.phase).toBe('word_select');
    expect(state.currentWord).toBeNull();
    expect(state.hintState).toBeNull();
    expect(state.usedWords).toEqual([]);
    expect(state.drawHistory).toEqual([]);
    expect(state.correctGuessCount).toBe(0);
    expect(state.winnerId).toBeNull();
  });

  it('Drawer 轮转顺序应按玩家加入顺序', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, 'room-002', defaultConfig);

    expect(state.drawerOrder).toEqual([0, 1, 2]);
  });

  it('第一个 Turn 的 Drawer 应为 drawerOrder[0]', () => {
    const players = createTestPlayers(5);
    const state = initGame(players, 'room-003', defaultConfig);

    expect(state.currentDrawerIndex).toBe(state.drawerOrder[0]);
    expect(state.currentDrawerIndex).toBe(0);
  });

  it('应从词库选取 3 个候选词语', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-004', defaultConfig);

    expect(state.candidateWords).toHaveLength(3);
    // 3 个候选词语难度分别为 easy、medium、hard
    expect(state.candidateWords![0].difficulty).toBe('easy');
    expect(state.candidateWords![1].difficulty).toBe('medium');
    expect(state.candidateWords![2].difficulty).toBe('hard');
  });

  it('应重置所有玩家的分数和猜对状态', () => {
    const players = createTestPlayers(3);
    // 模拟玩家有旧分数
    players[0].score = 100;
    players[1].hasGuessedCorrect = true;

    const state = initGame(players, 'room-005', defaultConfig);

    state.players.forEach(p => {
      expect(p.score).toBe(0);
      expect(p.hasGuessedCorrect).toBe(false);
      expect(p.guessedAt).toBeNull();
    });
  });
});

describe('selectWord', () => {
  it('应正确选定候选词语', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, 'room-010', defaultConfig);
    const selectedText = state.candidateWords![1].text;

    const newState = selectWord(state, 1);

    expect(newState.currentWord).toBe(selectedText);
    expect(newState.phase).toBe('drawing');
    expect(newState.candidateWords).toBeNull();
    expect(newState.usedWords).toContain(selectedText);
  });

  it('应初始化 hintState', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-011', defaultConfig);
    const selectedText = state.candidateWords![0].text;

    const newState = selectWord(state, 0);

    expect(newState.hintState).not.toBeNull();
    expect(newState.hintState!.chars).toEqual([...selectedText]);
    expect(newState.hintState!.revealedIndices).toEqual([]);
  });

  it('应设置 turnStartTime', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-012', defaultConfig);
    const before = Date.now();

    const newState = selectWord(state, 0);

    expect(newState.turnStartTime).toBeGreaterThanOrEqual(before);
    expect(newState.turnStartTime).toBeLessThanOrEqual(Date.now());
  });

  it('无效的 wordIndex 应返回原状态', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-013', defaultConfig);

    expect(selectWord(state, -1)).toBe(state);
    expect(selectWord(state, 3)).toBe(state);
    expect(selectWord(state, 99)).toBe(state);
  });

  it('candidateWords 为 null 时应返回原状态', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-014', defaultConfig);
    const stateNoCandidates = { ...state, candidateWords: null };

    expect(selectWord(stateNoCandidates, 0)).toBe(stateNoCandidates);
  });
});

describe('autoSelectWord', () => {
  it('应自动选定一个候选词语', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, 'room-020', defaultConfig);

    const newState = autoSelectWord(state);

    expect(newState.currentWord).not.toBeNull();
    expect(newState.phase).toBe('drawing');
    expect(newState.candidateWords).toBeNull();
    expect(newState.hintState).not.toBeNull();
  });

  it('选定的词语应来自候选列表', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-021', defaultConfig);
    const candidateTexts = state.candidateWords!.map(w => w.text);

    const newState = autoSelectWord(state);

    expect(candidateTexts).toContain(newState.currentWord);
  });

  it('candidateWords 为 null 时应返回原状态', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-022', defaultConfig);
    const stateNoCandidates = { ...state, candidateWords: null };

    expect(autoSelectWord(stateNoCandidates)).toBe(stateNoCandidates);
  });

  it('candidateWords 为空数组时应返回原状态', () => {
    const players = createTestPlayers(2);
    const state = initGame(players, 'room-023', defaultConfig);
    const stateEmpty = { ...state, candidateWords: [] };

    expect(autoSelectWord(stateEmpty)).toBe(stateEmpty);
  });
});

describe('calculateGuesserScore', () => {
  it('剩余时间等于总时间时应返回 100 分', () => {
    expect(calculateGuesserScore(90, 90)).toBe(100);
  });

  it('剩余时间为 0 时应返回最低 10 分', () => {
    expect(calculateGuesserScore(0, 90)).toBe(10);
  });

  it('应按 floor(ratio × 100) 计算', () => {
    // 45/90 = 0.5 → 50
    expect(calculateGuesserScore(45, 90)).toBe(50);
    // 30/90 = 0.333... → 33
    expect(calculateGuesserScore(30, 90)).toBe(33);
  });

  it('得分低于 10 时应返回 10', () => {
    // 5/90 ≈ 0.055 → floor = 5 → max(5, 10) = 10
    expect(calculateGuesserScore(5, 90)).toBe(10);
  });
});

describe('calculateDrawerScore', () => {
  it('无人猜对时应返回 0', () => {
    expect(calculateDrawerScore(0)).toBe(0);
  });

  it('每有一位猜对应得 10 分', () => {
    expect(calculateDrawerScore(1)).toBe(10);
    expect(calculateDrawerScore(3)).toBe(30);
    expect(calculateDrawerScore(7)).toBe(70);
  });
});

describe('judgeGuess', () => {
  /** 创建一个处于 drawing 阶段的游戏状态 */
  function createDrawingState(playerCount: number = 3): DrawGameState {
    const players = createTestPlayers(playerCount);
    const state = initGame(players, 'room-100', defaultConfig);
    // 选词进入 drawing 阶段
    return selectWord(state, 0);
  }

  it('完全匹配目标词语应返回 correct', () => {
    const state = createDrawingState();
    const targetWord = state.currentWord!;
    // player-1 是 Guesser（player-0 是 Drawer）
    const { result, state: newState } = judgeGuess(state, 'player-1', targetWord);

    expect(result).toBe('correct');
    const guesser = newState.players.find(p => p.id === 'player-1')!;
    expect(guesser.hasGuessedCorrect).toBe(true);
    expect(guesser.guessedAt).not.toBeNull();
    expect(guesser.score).toBeGreaterThan(0);
    expect(newState.correctGuessCount).toBe(1);
  });

  it('带前后空格的消息应正确匹配', () => {
    const state = createDrawingState();
    const targetWord = state.currentWord!;
    const { result } = judgeGuess(state, 'player-1', `  ${targetWord}  `);

    expect(result).toBe('correct');
  });

  it('Drawer 猜词应返回 wrong 且状态不变', () => {
    const state = createDrawingState();
    const targetWord = state.currentWord!;
    // player-0 是 Drawer
    const { result, state: newState } = judgeGuess(state, 'player-0', targetWord);

    expect(result).toBe('wrong');
    expect(newState).toBe(state);
  });

  it('已猜对的玩家再次猜词应返回 wrong 且状态不变', () => {
    const state = createDrawingState();
    const targetWord = state.currentWord!;
    // 先让 player-1 猜对
    const { state: stateAfterCorrect } = judgeGuess(state, 'player-1', targetWord);
    // 再次猜词
    const { result, state: finalState } = judgeGuess(stateAfterCorrect, 'player-1', targetWord);

    expect(result).toBe('wrong');
    expect(finalState).toBe(stateAfterCorrect);
  });

  it('非 drawing 阶段应返回 wrong 且状态不变', () => {
    const players = createTestPlayers(3);
    const state = initGame(players, 'room-101', defaultConfig);
    // 此时阶段为 word_select
    const { result, state: newState } = judgeGuess(state, 'player-1', '任意消息');

    expect(result).toBe('wrong');
    expect(newState).toBe(state);
  });

  it('消息包含目标词语作为子串（但不完全匹配）应返回 close', () => {
    const state = createDrawingState();
    const targetWord = state.currentWord!;
    // 消息包含目标词语但有额外内容
    const { result, state: newState } = judgeGuess(state, 'player-1', `是${targetWord}吗`);

    expect(result).toBe('close');
    expect(newState).toBe(state);
  });

  it('目标词语包含消息作为子串（但不完全匹配）应返回 close', () => {
    const state = createDrawingState();
    const targetWord = state.currentWord!;
    // 如果目标词语长度 > 1，取第一个字符作为消息
    if (targetWord.length > 1) {
      const partial = targetWord.substring(0, targetWord.length - 1);
      const { result, state: newState } = judgeGuess(state, 'player-1', partial);

      expect(result).toBe('close');
      expect(newState).toBe(state);
    }
  });

  it('完全不匹配应返回 wrong', () => {
    const state = createDrawingState();
    const { result, state: newState } = judgeGuess(state, 'player-1', 'zzzzzzzzzzz_不可能匹配');

    expect(result).toBe('wrong');
    expect(newState).toBe(state);
  });

  it('猜对后 Drawer 应获得 10 分', () => {
    const state = createDrawingState();
    const targetWord = state.currentWord!;
    const drawerBefore = state.players[0].score;

    const { state: newState } = judgeGuess(state, 'player-1', targetWord);
    const drawerAfter = newState.players[0].score;

    expect(drawerAfter - drawerBefore).toBe(10);
  });

  it('多人猜对后 correctGuessCount 应递增', () => {
    const state = createDrawingState(4);
    const targetWord = state.currentWord!;

    const { state: s1 } = judgeGuess(state, 'player-1', targetWord);
    expect(s1.correctGuessCount).toBe(1);

    const { state: s2 } = judgeGuess(s1, 'player-2', targetWord);
    expect(s2.correctGuessCount).toBe(2);
  });
});
