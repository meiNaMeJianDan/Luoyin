/**
 * 你画我猜游戏引擎 — 核心逻辑模块
 *
 * 所有函数设计为纯函数（接收状态，返回新状态），便于测试。
 * 唯一的副作用来源是选词时的随机数生成（通过 words.ts 模块）。
 */

import type {
  DrawPlayer,
  GameConfig,
  DrawGameState,
  WordHintState,
  PlayerRanking,
  ClientDrawPlayer,
  ClientDrawGameState,
} from './types.js';
import { pickCandidateWords } from './words.js';

/**
 * 初始化游戏状态
 * - 按玩家加入顺序（players 数组索引）设置 Drawer 轮转顺序
 * - 第一个 Turn 的 Drawer 为 drawerOrder[0]
 * - 从词库选取 3 个候选词语
 * - 初始阶段为 word_select
 * - hintState 初始为 null（选词后才设置）
 */
export function initGame(
  players: DrawPlayer[],
  roomId: string,
  config: GameConfig,
): DrawGameState {
  // Drawer 轮转顺序：按玩家加入顺序（即数组索引）
  const drawerOrder = players.map((_, index) => index);

  // 从词库选取 3 个候选词语（初始无已用词）
  const candidateWords = pickCandidateWords([]);

  return {
    roomId,
    players: players.map(p => ({
      ...p,
      score: 0,
      hasGuessedCorrect: false,
      guessedAt: null,
    })),
    config,
    currentRound: 1,
    currentTurnIndex: 0,
    drawerOrder,
    currentDrawerIndex: drawerOrder[0],
    phase: 'word_select',
    currentWord: null,
    candidateWords,
    hintState: null,
    usedWords: [],
    drawHistory: [],
    turnStartTime: 0,
    correctGuessCount: 0,
    winnerId: null,
  };
}

/**
 * Drawer 从 3 个候选词语中选定一个
 * - wordIndex: 0/1/2，对应候选词语列表中的索引
 * - 设置 currentWord 为选定词语
 * - 将选定词语加入 usedWords
 * - 初始化 hintState（chars 为词语字符数组，revealedIndices 为空）
 * - 清空 candidateWords
 * - 阶段变为 drawing
 * - 设置 turnStartTime 为当前时间戳
 */
export function selectWord(
  state: DrawGameState,
  wordIndex: number,
): DrawGameState {
  const candidates = state.candidateWords;
  if (!candidates || wordIndex < 0 || wordIndex >= candidates.length) {
    return state;
  }

  const selectedWord = candidates[wordIndex].text;

  // 初始化提示状态：字符数组 + 空的已揭示索引
  const hintState: WordHintState = {
    chars: [...selectedWord],
    revealedIndices: [],
  };

  return {
    ...state,
    currentWord: selectedWord,
    usedWords: [...state.usedWords, selectedWord],
    hintState,
    candidateWords: null,
    phase: 'drawing',
    turnStartTime: Date.now(),
  };
}

/**
 * 超时未选词时自动随机选定一个候选词语
 * 逻辑同 selectWord，随机选择 0/1/2
 */
export function autoSelectWord(state: DrawGameState): DrawGameState {
  if (!state.candidateWords || state.candidateWords.length === 0) {
    return state;
  }

  const randomIndex = Math.floor(Math.random() * state.candidateWords.length);
  return selectWord(state, randomIndex);
}

/**
 * 计算 Guesser 猜对得分
 * - ratio = 剩余时间 / 总时间
 * - score = floor(ratio × 100)
 * - 最低 10 分
 */
export function calculateGuesserScore(remainingTime: number, totalTime: number): number {
  const ratio = remainingTime / totalTime;
  const score = Math.floor(ratio * 100);
  return Math.max(score, 10);
}

/**
 * 计算 Drawer 得分
 * - 每有一位 Guesser 猜对，Drawer 获得 10 分
 */
export function calculateDrawerScore(correctCount: number): number {
  return correctCount * 10;
}

/**
 * 猜词判定：返回判定结果和更新后的状态
 * - 去除消息前后空格
 * - 校验：阶段为 drawing，玩家不是 Drawer，玩家未猜对
 * - 完全匹配：标记猜对、计算得分、Drawer 加分
 * - 子串匹配（目标词语包含消息 或 消息包含目标词语，但不完全匹配）：返回 close
 * - 否则：返回 wrong
 */
export function judgeGuess(
  state: DrawGameState,
  playerId: string,
  message: string,
): { state: DrawGameState; result: 'correct' | 'close' | 'wrong' } {
  const trimmed = message.trim();

  // 校验：阶段必须为 drawing
  if (state.phase !== 'drawing') {
    return { state, result: 'wrong' };
  }

  // 校验：玩家不能是当前 Drawer
  const drawerPlayerIndex = state.currentDrawerIndex;
  const drawerPlayer = state.players[drawerPlayerIndex];
  if (drawerPlayer && drawerPlayer.id === playerId) {
    return { state, result: 'wrong' };
  }

  // 校验：玩家未猜对
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.hasGuessedCorrect) {
    return { state, result: 'wrong' };
  }

  const targetWord = state.currentWord;
  if (!targetWord) {
    return { state, result: 'wrong' };
  }

  // 完全匹配（忽略前后空格）
  if (trimmed === targetWord) {
    // 计算 Guesser 得分
    const totalTime = state.config.turnDuration;
    const elapsed = (Date.now() - state.turnStartTime) / 1000;
    const remainingTime = Math.max(totalTime - elapsed, 0);
    const guesserScore = calculateGuesserScore(remainingTime, totalTime);

    // 更新后的猜对人数
    const newCorrectCount = state.correctGuessCount + 1;

    // 更新玩家列表
    const updatedPlayers = state.players.map(p => {
      if (p.id === playerId) {
        // 标记 Guesser 猜对并加分
        return {
          ...p,
          hasGuessedCorrect: true,
          guessedAt: Date.now(),
          score: p.score + guesserScore,
        };
      }
      if (p.id === drawerPlayer.id) {
        // Drawer 得分 +10
        return {
          ...p,
          score: p.score + 10,
        };
      }
      return p;
    });

    return {
      result: 'correct',
      state: {
        ...state,
        players: updatedPlayers,
        correctGuessCount: newCorrectCount,
      },
    };
  }

  // 子串匹配：目标词语是消息的子串，或消息是目标词语的子串（但不完全匹配）
  if (trimmed.includes(targetWord) || targetWord.includes(trimmed)) {
    return { state, result: 'close' };
  }

  // 不匹配
  return { state, result: 'wrong' };
}

/**
 * 结束当前 Turn
 * - Drawer 的最终得分已在 judgeGuess 中累加，这里不需要再加
 * - 阶段变为 turn_summary
 */
export function endTurn(state: DrawGameState): DrawGameState {
  return {
    ...state,
    phase: 'turn_summary',
  };
}

/**
 * 推进到下一个 Turn
 * - currentTurnIndex++
 * - 如果 currentTurnIndex >= 玩家数量：currentRound++, currentTurnIndex = 0
 * - 如果 currentRound > config.rounds：游戏结束，phase = finished，计算 winnerId
 * - 设置新的 Drawer（drawerOrder[currentTurnIndex]）
 * - 重置所有玩家的 hasGuessedCorrect 和 guessedAt
 * - 清空 drawHistory、currentWord、hintState
 * - correctGuessCount = 0
 * - 从词库选取 3 个新候选词语（排除 usedWords）
 * - phase = word_select
 */
export function advanceTurn(state: DrawGameState): DrawGameState {
  const playerCount = state.players.length;
  let nextTurnIndex = state.currentTurnIndex + 1;
  let nextRound = state.currentRound;

  // 如果当前 Round 的所有 Turn 已完成，进入下一 Round
  if (nextTurnIndex >= playerCount) {
    nextRound++;
    nextTurnIndex = 0;

    // 如果所有 Round 已完成，游戏结束
    if (nextRound > state.config.rounds) {
      // 计算得分最高的玩家作为胜利者
      const winner = state.players.reduce((best, p) =>
        p.score > best.score ? p : best,
        state.players[0],
      );

      return {
        ...state,
        currentRound: nextRound,
        currentTurnIndex: nextTurnIndex,
        phase: 'finished',
        winnerId: winner.id,
        currentWord: null,
        candidateWords: null,
        hintState: null,
        drawHistory: [],
        correctGuessCount: 0,
      };
    }
  }

  // 设置新的 Drawer
  const newDrawerIndex = state.drawerOrder[nextTurnIndex];

  // 重置所有玩家的猜对状态
  const resetPlayers = state.players.map(p => ({
    ...p,
    hasGuessedCorrect: false,
    guessedAt: null,
  }));

  // 从词库选取 3 个新候选词语（排除已用词）
  const candidateWords = pickCandidateWords(state.usedWords);

  return {
    ...state,
    players: resetPlayers,
    currentRound: nextRound,
    currentTurnIndex: nextTurnIndex,
    currentDrawerIndex: newDrawerIndex,
    phase: 'word_select',
    currentWord: null,
    candidateWords,
    hintState: null,
    drawHistory: [],
    turnStartTime: 0,
    correctGuessCount: 0,
  };
}

/**
 * 揭示提示字符
 * - 从未揭示的字符位置中随机选择一个
 * - 将该位置添加到 hintState.revealedIndices
 * - 如果所有位置都已揭示或 hintState 为 null，返回原状态
 */
export function revealHintChar(state: DrawGameState): DrawGameState {
  if (!state.hintState) {
    return state;
  }

  const { chars, revealedIndices } = state.hintState;
  const totalChars = chars.length;

  // 找出所有未揭示的字符位置
  const revealedSet = new Set(revealedIndices);
  const unrevealedIndices: number[] = [];
  for (let i = 0; i < totalChars; i++) {
    if (!revealedSet.has(i)) {
      unrevealedIndices.push(i);
    }
  }

  // 如果所有位置都已揭示，返回原状态
  if (unrevealedIndices.length === 0) {
    return state;
  }

  // 随机选择一个未揭示的位置
  const randomIdx = Math.floor(Math.random() * unrevealedIndices.length);
  const newRevealedIndex = unrevealedIndices[randomIdx];

  return {
    ...state,
    hintState: {
      ...state.hintState,
      revealedIndices: [...revealedIndices, newRevealedIndex],
    },
  };
}

/**
 * 检查所有非 Drawer 玩家是否都已猜对
 * - 返回 true 当且仅当所有 Guesser 的 hasGuessedCorrect 为 true
 */
export function allGuessersCorrect(state: DrawGameState): boolean {
  const drawerPlayerIndex = state.currentDrawerIndex;

  return state.players.every((player, index) => {
    // 跳过 Drawer
    if (index === drawerPlayerIndex) {
      return true;
    }
    return player.hasGuessedCorrect;
  });
}

/**
 * 检查游戏是否结束
 * - 如果 phase 为 finished，计算 winnerId（得分最高的玩家）
 * - 否则返回原状态
 */
export function checkGameOver(state: DrawGameState): DrawGameState {
  if (state.phase !== 'finished') {
    return state;
  }

  // 计算得分最高的玩家
  const winner = state.players.reduce((best, p) =>
    p.score > best.score ? p : best,
    state.players[0],
  );

  return {
    ...state,
    winnerId: winner.id,
  };
}

/**
 * 获取最终排名
 * - 按总分从高到低排列所有玩家
 * - 返回 PlayerRanking 数组（rank 从 1 开始）
 */
export function getFinalRankings(state: DrawGameState): PlayerRanking[] {
  // 按分数从高到低排序（不修改原数组）
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  return sorted.map((player, index) => ({
    playerId: player.id,
    playerName: player.name,
    score: player.score,
    rank: index + 1,
  }));
}

/**
 * 将完整游戏状态转换为客户端可见状态（脱敏）
 * - Guesser 看不到 currentWord（设为 null）和 candidateWords（设为 null）
 * - Drawer 可见完整 currentWord 和 candidateWords
 * - 词语提示（hint）：根据 hintState 生成字符数组，已揭示位置显示实际字符，未揭示显示 "_"
 * - 如果 hintState 为 null，hint 为空数组
 * - 玩家信息脱敏：只保留 id、name、score、isHost、isConnected、hasGuessedCorrect
 * - totalGuessers = 玩家数 - 1（排除 Drawer）
 * - turnDuration = state.config.turnDuration
 */
export function toClientGameState(
  state: DrawGameState,
  playerId: string,
): ClientDrawGameState {
  // 判断当前玩家是否为 Drawer
  const drawerPlayer = state.players[state.currentDrawerIndex];
  const isDrawer = drawerPlayer?.id === playerId;

  // 玩家信息脱敏：只保留客户端需要的字段
  const players: ClientDrawPlayer[] = state.players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    isHost: p.isHost,
    isConnected: p.isConnected,
    hasGuessedCorrect: p.hasGuessedCorrect,
  }));

  // 生成词语提示
  let hint: string[] = [];
  if (state.hintState) {
    const revealedSet = new Set(state.hintState.revealedIndices);
    hint = state.hintState.chars.map((char, index) =>
      revealedSet.has(index) ? char : '_',
    );
  }

  return {
    roomId: state.roomId,
    players,
    config: state.config,
    currentRound: state.currentRound,
    currentTurnIndex: state.currentTurnIndex,
    currentDrawerIndex: state.currentDrawerIndex,
    phase: state.phase,
    currentWord: isDrawer ? state.currentWord : null,
    candidateWords: isDrawer ? state.candidateWords : null,
    hint,
    turnStartTime: state.turnStartTime,
    turnDuration: state.config.turnDuration,
    correctGuessCount: state.correctGuessCount,
    totalGuessers: state.players.length - 1,
    winnerId: state.winnerId,
  };
}
