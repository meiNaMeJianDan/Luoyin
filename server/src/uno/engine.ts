/**
 * UNO 游戏引擎 — 核心逻辑模块
 *
 * 所有函数设计为纯函数（接收状态，返回新状态），便于测试。
 * 唯一的副作用来源是洗牌时的随机数生成。
 */

import type {
  Card,
  CardColor,
  CardValue,
  GameState,
  Player,
  Direction,
  ClientGameState,
  ClientPlayer,
  ChallengeResult,
} from './types.js';

// ============================================================
// 2.1 — 牌组初始化和洗牌
// ============================================================

/**
 * 生成标准 108 张 UNO 牌
 * - 76 张数字牌：每色 0×1 + 1~9×2
 * - 24 张功能牌：Skip/Reverse/Draw_Two 每色×2
 * - 8 张万能牌：Wild×4 + Wild_Draw_Four×4
 */
export function createDeck(): Card[] {
  const cards: Card[] = [];
  const colors: CardColor[] = ['red', 'yellow', 'blue', 'green'];

  for (const color of colors) {
    // 数字 0：每色 1 张
    cards.push({ id: `${color}-0-0`, color, type: 'number', value: 0 });

    // 数字 1~9：每色各 2 张
    for (let n = 1; n <= 9; n++) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: `${color}-${n}-${copy}`,
          color,
          type: 'number',
          value: n as CardValue,
        });
      }
    }

    // 功能牌：Skip / Reverse / Draw_Two 每色各 2 张
    const actions: CardValue[] = ['skip', 'reverse', 'draw_two'];
    for (const action of actions) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: `${color}-${action}-${copy}`,
          color,
          type: 'action',
          value: action,
        });
      }
    }
  }

  // 万能牌：Wild×4 + Wild_Draw_Four×4
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `wild-wild-${i}`, color: 'wild', type: 'wild', value: 'wild' });
  }
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `wild-wild_draw_four-${i}`,
      color: 'wild',
      type: 'wild',
      value: 'wild_draw_four',
    });
  }

  return cards;
}

/**
 * Fisher-Yates 洗牌算法
 * 返回一个新的洗好的数组，不修改原数组。
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 弃牌堆重洗到摸牌堆
 * 保留弃牌堆堆顶牌，其余牌洗牌后放入摸牌堆。
 * 返回新的 GameState。
 */
export function reshuffleDiscardToDraw(state: GameState): GameState {
  if (state.discardPile.length <= 1) {
    // 弃牌堆只有堆顶牌或为空，无法重洗
    return state;
  }

  const topCard = state.discardPile[state.discardPile.length - 1];
  const cardsToReshuffle = state.discardPile.slice(0, -1);
  const newDrawPile = [...state.drawPile, ...shuffleDeck(cardsToReshuffle)];

  return {
    ...state,
    drawPile: newDrawPile,
    discardPile: [topCard],
  };
}

// ============================================================
// 2.4 — 出牌合法性判断
// ============================================================

/**
 * 判断单张牌是否可出
 * 合法条件（满足其一即可）：
 * 1. 牌为 Wild 或 Wild_Draw_Four
 * 2. 牌颜色与当前有效颜色相同
 * 3. 牌的值与堆顶牌的值相同
 */
export function isValidPlay(
  card: Card,
  topCard: Card,
  currentColor: CardColor,
): boolean {
  // 万能牌始终可出
  if (card.type === 'wild') return true;
  // 当前颜色为 wild（起始牌为 Wild 时），任何牌都可出
  if (currentColor === 'wild') return true;
  // 同色
  if (card.color === currentColor) return true;
  // 同值（数字相同或功能相同）
  if (card.value === topCard.value) return true;
  return false;
}

/**
 * 获取手牌中所有可出的牌
 */
export function getPlayableCards(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
): Card[] {
  return hand.filter((card) => isValidPlay(card, topCard, currentColor));
}

// ============================================================
// 2.6 — 出牌和摸牌操作
// ============================================================

/**
 * 推进到下一回合
 * 根据当前方向计算下一位玩家索引，并重置回合计时。
 */
export function advanceTurn(state: GameState): GameState {
  const playerCount = state.players.length;
  const step = state.direction === 'clockwise' ? 1 : -1;
  const nextIndex =
    (state.currentPlayerIndex + step + playerCount) % playerCount;

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnStartTime: Date.now(),
  };
}

/**
 * 执行出牌，更新游戏状态
 * - 验证牌在玩家手中且合法
 * - 将牌从手牌移到弃牌堆
 * - 处理 Wild 牌颜色选择
 * - 处理功能牌效果
 * - 检查胜利
 * - 推进回合
 *
 * 返回更新后的 GameState；非法操作返回原状态不变。
 */
export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  chosenColor?: CardColor,
): GameState {
  // 找到玩家
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = player.hand[cardIndex];
  const topCard = state.discardPile[state.discardPile.length - 1];

  // 合法性检查
  if (!topCard || !isValidPlay(card, topCard, state.currentColor)) {
    return state;
  }

  // 从手牌移除该牌
  const newHand = [...player.hand.slice(0, cardIndex), ...player.hand.slice(cardIndex + 1)];
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: newHand, calledUno: false } : p,
  );

  // 记录出牌前的颜色（用于 Wild+4 质疑）
  const previousColor = state.currentColor;

  // 确定新的当前颜色
  let newColor: CardColor = state.currentColor;
  if (card.type === 'wild') {
    // Wild 牌需要指定颜色
    newColor = chosenColor && chosenColor !== 'wild' ? chosenColor : 'red';
  } else {
    newColor = card.color;
  }

  let newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, card],
    currentColor: newColor,
    lastPlayedCard: card,
    lastPlayerId: playerId,
    previousColor,
  };

  // 检查胜利
  if (newHand.length === 0) {
    return {
      ...newState,
      winnerId: playerId,
      phase: 'finished',
    };
  }

  // 处理 Wild_Draw_Four：进入质疑阶段
  if (card.value === 'wild_draw_four') {
    // 先推进到下一位玩家（被质疑/被罚的玩家）
    newState = advanceTurn(newState);
    return {
      ...newState,
      phase: 'challenging',
      pendingDrawCount: 4,
    };
  }

  // 处理 Wild（无 Draw_Four）：如果已经指定了颜色，直接推进
  if (card.value === 'wild') {
    if (chosenColor) {
      return advanceTurn(newState);
    }
    // 未指定颜色，进入选色阶段
    return {
      ...newState,
      phase: 'choosing_color',
    };
  }

  // 处理功能牌效果
  if (card.type === 'action') {
    newState = applyActionEffect(newState, card);
    return newState;
  }

  // 普通数字牌：直接推进回合
  return advanceTurn(newState);
}

/**
 * 从摸牌堆取牌
 * - 如果摸牌堆为空，先尝试重洗弃牌堆
 * - 如果重洗后仍为空，跳过摸牌
 * 返回 { state, drawnCard }，drawnCard 为 null 表示无牌可摸。
 */
export function drawCard(
  state: GameState,
  playerId: string,
): { state: GameState; drawnCard: Card | null } {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return { state, drawnCard: null };

  let currentState = state;

  // 摸牌堆为空时尝试重洗
  if (currentState.drawPile.length === 0) {
    currentState = reshuffleDiscardToDraw(currentState);
  }

  // 重洗后仍为空，跳过摸牌
  if (currentState.drawPile.length === 0) {
    return { state: currentState, drawnCard: null };
  }

  // 取摸牌堆顶部的牌
  const drawnCard = currentState.drawPile[currentState.drawPile.length - 1];
  const newDrawPile = currentState.drawPile.slice(0, -1);

  const newPlayers = currentState.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: [...p.hand, drawnCard] } : p,
  );

  return {
    state: {
      ...currentState,
      drawPile: newDrawPile,
      players: newPlayers,
    },
    drawnCard,
  };
}

// ============================================================
// 2.9 — 功能牌效果处理
// ============================================================

/**
 * 处理功能牌效果
 * - Skip：跳过下一位玩家
 * - Reverse：反转方向；2 人时等同 Skip
 * - Draw_Two：下一位玩家摸 2 张并跳过
 * - Wild / Wild_Draw_Four 的颜色指定在 playCard 中处理
 */
export function applyActionEffect(state: GameState, card: Card): GameState {
  const playerCount = state.players.length;

  switch (card.value) {
    case 'skip': {
      // 跳过下一位：推进两次
      const afterFirst = advanceTurn(state);
      return advanceTurn(afterFirst);
    }

    case 'reverse': {
      if (playerCount === 2) {
        // 2 人游戏：Reverse 等同 Skip
        const afterFirst = advanceTurn(state);
        return advanceTurn(afterFirst);
      }
      // 反转方向
      const newDirection: Direction =
        state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
      return advanceTurn({ ...state, direction: newDirection });
    }

    case 'draw_two': {
      // 下一位玩家摸 2 张并跳过
      let newState = advanceTurn(state);
      const targetIndex = newState.currentPlayerIndex;

      // 摸 2 张牌
      for (let i = 0; i < 2; i++) {
        const result = drawCard(newState, newState.players[targetIndex].id);
        newState = result.state;
      }

      // 跳过该玩家
      return advanceTurn(newState);
    }

    default:
      // Wild / Wild_Draw_Four 的效果在 playCard 中已处理
      return advanceTurn(state);
  }
}

// ============================================================
// 2.11 — Wild+4 质疑机制
// ============================================================

/**
 * 检查 Wild+4 质疑
 * - 检查出牌方在出牌时是否持有与前一张堆顶颜色相同的牌
 * - 质疑成功：出牌方摸 4 张，质疑方正常回合
 * - 质疑失败：质疑方摸 6 张（4+2 罚牌）并跳过回合
 */
export function checkChallenge(
  state: GameState,
  challengerId: string,
): { state: GameState; result: ChallengeResult } {
  const challengerIndex = state.players.findIndex((p) => p.id === challengerId);
  if (challengerIndex === -1) {
    return {
      state,
      result: {
        success: false,
        challengerId,
        challengedId: '',
        penaltyCards: 0,
      },
    };
  }

  // 被质疑方是上一个出牌的玩家
  const challengedId = state.lastPlayerId ?? '';
  const challengedIndex = state.players.findIndex((p) => p.id === challengedId);
  if (challengedIndex === -1) {
    return {
      state,
      result: {
        success: false,
        challengerId,
        challengedId,
        penaltyCards: 0,
      },
    };
  }

  const challengedPlayer = state.players[challengedIndex];
  const prevColor = state.previousColor;

  // 检查被质疑方手牌中是否有与前一堆顶颜色相同的牌
  const hasMatchingColor = challengedPlayer.hand.some(
    (c) => c.color === prevColor && c.type !== 'wild',
  );

  let newState: GameState = { ...state, phase: 'playing' };

  if (hasMatchingColor) {
    // 质疑成功：出牌方摸 4 张
    for (let i = 0; i < 4; i++) {
      const result = drawCard(newState, challengedId);
      newState = result.state;
    }

    // 质疑方正常进行回合（currentPlayerIndex 已经指向质疑方）
    newState = {
      ...newState,
      pendingDrawCount: 0,
      turnStartTime: Date.now(),
    };

    return {
      state: newState,
      result: {
        success: true,
        challengerId,
        challengedId,
        penaltyCards: 4,
      },
    };
  } else {
    // 质疑失败：质疑方摸 6 张（4 + 2 罚牌）并跳过回合
    for (let i = 0; i < 6; i++) {
      const result = drawCard(newState, challengerId);
      newState = result.state;
    }

    // 跳过质疑方回合
    newState = advanceTurn({
      ...newState,
      pendingDrawCount: 0,
    });

    return {
      state: newState,
      result: {
        success: false,
        challengerId,
        challengedId,
        penaltyCards: 6,
      },
    };
  }
}

// ============================================================
// 2.13 — 游戏初始化和胜利判定
// ============================================================

/**
 * 初始化游戏
 * - 生成并洗牌
 * - 为每位玩家发 7 张牌
 * - 翻起始牌（Wild_Draw_Four 重翻）
 * - 处理起始牌为 Wild/Action 的特殊效果
 * - 随机选择首位出牌者
 */
export function initGame(players: Player[], roomId: string = ''): GameState {
  let deck = shuffleDeck(createDeck());

  // 为每位玩家发 7 张牌
  const gamePlayers = players.map((p) => ({
    ...p,
    hand: [] as Card[],
    calledUno: false,
  }));

  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < gamePlayers.length; j++) {
      const card = deck.pop()!;
      gamePlayers[j].hand.push(card);
    }
  }

  // 翻起始牌：如果是 Wild_Draw_Four 则放回重洗重翻
  let startCard = deck.pop()!;
  while (startCard.value === 'wild_draw_four') {
    deck = shuffleDeck([startCard, ...deck]);
    startCard = deck.pop()!;
  }

  // 确定起始颜色
  let currentColor: CardColor =
    startCard.color === 'wild' ? 'wild' : startCard.color;

  // 随机选择首位出牌者
  const firstPlayerIndex = Math.floor(Math.random() * gamePlayers.length);

  let state: GameState = {
    roomId,
    players: gamePlayers,
    drawPile: deck,
    discardPile: [startCard],
    currentPlayerIndex: firstPlayerIndex,
    direction: 'clockwise',
    currentColor,
    phase: 'playing',
    lastPlayedCard: startCard,
    lastPlayerId: null,
    pendingDrawCount: 0,
    winnerId: null,
    turnStartTime: Date.now(),
    previousColor: currentColor,
  };

  // 处理起始牌为功能牌的特殊效果
  if (startCard.type === 'action') {
    state = applyActionEffect(state, startCard);
  }

  // 起始牌为 Wild（非 Wild_Draw_Four）：视为无色牌，第一位玩家可出任意牌
  // currentColor 保持 'wild'，isValidPlay 中 wild 类型始终可出
  // 但非 wild 牌也需要能出，所以 'wild' 作为 currentColor 时任何牌都可出
  // 这在 isValidPlay 中不直接支持，需要特殊处理
  // 实际上 currentColor = 'wild' 意味着任何颜色都匹配

  return state;
}

/**
 * 检查是否有玩家手牌为 0，返回胜利者 ID 或 null
 */
export function checkWinner(state: GameState): string | null {
  const winner = state.players.find((p) => p.hand.length === 0);
  return winner ? winner.id : null;
}

/**
 * 将完整游戏状态转换为客户端可见状态
 * - 当前玩家可以看到自己的手牌
 * - 其他玩家只能看到手牌数量
 */
export function toClientGameState(
  state: GameState,
  playerId: string,
): ClientGameState {
  const topCard = state.discardPile[state.discardPile.length - 1];
  const currentPlayer = state.players.find((p) => p.id === playerId);
  const myHand = currentPlayer ? currentPlayer.hand : [];

  const playableCards = topCard
    ? getPlayableCards(myHand, topCard, state.currentColor)
    : [];

  const clientPlayers: ClientPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    handCount: p.hand.length,
    isHost: p.isHost,
    isAI: p.isAI,
    isConnected: p.isConnected,
    calledUno: p.calledUno,
  }));

  return {
    roomId: state.roomId,
    players: clientPlayers,
    topCard,
    drawPileCount: state.drawPile.length,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    currentColor: state.currentColor,
    phase: state.phase,
    myHand,
    playableCardIds: playableCards.map((c) => c.id),
    winnerId: state.winnerId,
    turnStartTime: state.turnStartTime,
    lastPlayedCard: state.lastPlayedCard,
    lastPlayerId: state.lastPlayerId,
  };
}

// ============================================================
// 2.17 — UNO 喊牌与举报逻辑
// ============================================================

/**
 * 标记玩家已喊 UNO
 * 返回更新后的 GameState。
 */
export function handleCallUno(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // 只有手牌剩余 1 张时才能喊 UNO
  if (player.hand.length !== 1) return state;

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, calledUno: true } : p,
  );

  return { ...state, players: newPlayers };
}

/**
 * 举报未喊 UNO 的玩家
 * - 被举报玩家手牌为 1 张且未喊 UNO → 罚摸 2 张
 * - 被举报玩家已喊 UNO → 忽略
 * - 被举报玩家手牌不为 1 张 → 忽略
 *
 * 返回 { state, success }
 */
export function handleReportUno(
  state: GameState,
  reporterId: string,
  targetId: string,
): { state: GameState; success: boolean } {
  const targetIndex = state.players.findIndex((p) => p.id === targetId);
  if (targetIndex === -1) return { state, success: false };

  const target = state.players[targetIndex];

  // 已喊 UNO 或手牌不为 1 张 → 忽略
  if (target.calledUno || target.hand.length !== 1) {
    return { state, success: false };
  }

  // 举报时间窗口检查：如果被举报玩家不是上一个出牌的玩家，说明已经过了举报窗口
  if (state.lastPlayerId !== targetId) {
    return { state, success: false };
  }

  // 罚摸 2 张
  let newState = state;
  for (let i = 0; i < 2; i++) {
    const result = drawCard(newState, targetId);
    newState = result.state;
  }

  return { state: newState, success: true };
}
