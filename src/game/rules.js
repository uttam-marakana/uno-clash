import { buildDeck, cardColor, cardValue, isWild, ACTION, WILD_DRAW4 } from "./cards.js";

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create a brand new game state.
 * players: array of { id, name, isBot }
 */
export function createGameState(players, rng = Math.random) {
  let deck = shuffle(buildDeck(), rng);

  const hands = {};
  players.forEach((p) => {
    hands[p.id] = deck.splice(0, 7);
  });

  // First discard card must not be a wild draw four (house-rule standard);
  // if drawn, shuffle it back in and try again.
  let discardTop;
  do {
    discardTop = deck.shift();
    if (discardTop === WILD_DRAW4) deck.push(discardTop);
  } while (discardTop === WILD_DRAW4);

  return {
    players: players.map((p) => ({ id: p.id, name: p.name, isBot: !!p.isBot })),
    hands,
    deck,
    discard: [discardTop],
    currentColor: cardColor(discardTop) || pickRandomColor(rng),
    currentPlayerIndex: 0,
    direction: 1, // 1 = clockwise, -1 = counter-clockwise
    pendingDraw: 0, // accumulated draw-2/draw-4 stack the next player must take
    unoCalled: {}, // playerId -> bool, true once they've called uno at 1 card
    status: "playing", // playing | round-over | game-over
    winnerId: null,
    log: [`Game started. Top card: ${discardTop}`],
    turnPlayedCard: false, // whether current player has played this turn (for draw-then-pass)
  };
}

function pickRandomColor(rng) {
  const colors = ["R", "Y", "G", "B"];
  return colors[Math.floor(rng() * colors.length)];
}

export function topCard(state) {
  return state.discard[state.discard.length - 1];
}

export function currentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

/**
 * Is `card` legal to play right now, given state.currentColor / topCard,
 * and any pending draw stack (which restricts to matching draw cards only,
 * under the common "stacking" house rule support).
 */
export function isLegalPlay(state, card, allowStackingDraws = true) {
  const top = topCard(state);

  if (state.pendingDraw > 0) {
    // Must counter with same draw type if stacking is allowed, else must draw.
    if (!allowStackingDraws) return false;
    const v = cardValue(card);
    const topV = cardValue(top);
    if (v === ACTION.DRAW2 && topV === ACTION.DRAW2) return true;
    if (card === WILD_DRAW4 && top === WILD_DRAW4) return true;
    return false;
  }

  if (isWild(card)) return true;
  if (cardColor(card) === state.currentColor) return true;
  if (cardValue(card) === cardValue(top) && !isWild(top)) return true;
  return false;
}

export function legalMoves(state, hand) {
  return hand.filter((c) => isLegalPlay(state, c));
}

function nextIndex(state, fromIndex = state.currentPlayerIndex, steps = 1) {
  const n = state.players.length;
  let idx = fromIndex;
  idx = (idx + state.direction * steps + n * steps) % n;
  return idx;
}

/**
 * Apply playing `card` from `playerId`'s hand. `chosenColor` is required
 * when the card is a wild. Returns a new state object (does not mutate).
 * Throws on illegal moves so callers (transactions, bots) can reject them.
 */
export function applyPlayCard(state, playerId, card, chosenColor = null) {
  const player = currentPlayer(state);
  if (player.id !== playerId) throw new Error("Not your turn");

  const hand = state.hands[playerId];
  if (!hand.includes(card)) throw new Error("Card not in hand");
  if (!isLegalPlay(state, card)) throw new Error("Illegal card for current state");
  if (isWild(card) && !chosenColor) throw new Error("Must choose a color for wild");

  const next = structuredCloneLike(state);
  const idx = hand.indexOf(card);
  next.hands[playerId] = [...hand.slice(0, idx), ...hand.slice(idx + 1)];
  next.discard = [...state.discard, card];
  next.currentColor = isWild(card) ? chosenColor : cardColor(card);
  next.turnPlayedCard = true;
  delete next.unoCalled[playerId];

  next.log = [...state.log, `${player.name} played ${card}`];

  // Round-over check.
  if (next.hands[playerId].length === 0) {
    next.status = "round-over";
    next.winnerId = playerId;
    next.log.push(`${player.name} wins the round!`);
    return next;
  }

  // Resolve action effects.
  const value = cardValue(card);
  let advanceSteps = 1;

  if (value === ACTION.REVERSE) {
    next.direction = state.direction * -1;
    // In 2-player games, reverse acts like a skip.
    if (state.players.length === 2) advanceSteps = 2;
    next.log.push("Direction reversed");
  } else if (value === ACTION.SKIP) {
    advanceSteps = 2;
    next.log.push(`${nextPlayerName(state)} was skipped`);
  } else if (value === ACTION.DRAW2) {
    next.pendingDraw = state.pendingDraw + 2;
    advanceSteps = 1;
  } else if (card === WILD_DRAW4) {
    next.pendingDraw = state.pendingDraw + 4;
    advanceSteps = 1;
  }

  next.currentPlayerIndex = nextIndex(next, state.currentPlayerIndex, advanceSteps);
  next.turnPlayedCard = false;
  return next;
}

function nextPlayerName(state) {
  const idx = nextIndex(state, state.currentPlayerIndex, 1);
  return state.players[idx].name;
}

/**
 * Draw card(s) for the current player. If there's a pending draw stack
 * (from a Draw Two / Wild Draw Four), this clears it and passes the turn.
 * Otherwise it's a voluntary draw of 1 card; the player may then either
 * play that card (if legal) or pass via applyPassTurn.
 */
export function applyDrawCard(state, playerId) {
  const player = currentPlayer(state);
  if (player.id !== playerId) throw new Error("Not your turn");

  const next = structuredCloneLike(state);
  const drawCount = state.pendingDraw > 0 ? state.pendingDraw : 1;

  ensureDeckHasCards(next, drawCount);
  const drawn = next.deck.splice(0, drawCount);
  next.hands[playerId] = [...next.hands[playerId], ...drawn];
  next.log = [...next.log, `${player.name} drew ${drawCount} card${drawCount > 1 ? "s" : ""}`];

  if (state.pendingDraw > 0) {
    next.pendingDraw = 0;
    next.currentPlayerIndex = nextIndex(next, state.currentPlayerIndex, 1);
    next.turnPlayedCard = false;
  } else {
    next.turnPlayedCard = "drew"; // drew voluntarily, may play-or-pass
  }

  return next;
}

/**
 * Pass the turn after a voluntary draw that couldn't/wouldn't be played.
 */
export function applyPassTurn(state, playerId) {
  const player = currentPlayer(state);
  if (player.id !== playerId) throw new Error("Not your turn");
  if (state.turnPlayedCard !== "drew") {
    throw new Error("Can only pass after drawing");
  }
  const next = structuredCloneLike(state);
  next.currentPlayerIndex = nextIndex(next, state.currentPlayerIndex, 1);
  next.turnPlayedCard = false;
  return next;
}

/**
 * Player declares "Uno" - call when they have exactly 1 card left, any
 * time before the next player completes their turn.
 */
export function applyCallUno(state, playerId) {
  const next = structuredCloneLike(state);
  next.unoCalled[playerId] = true;
  return next;
}

/**
 * Catch another player who has 1 card and hasn't called uno - they draw
 * 2 penalty cards.
 */
export function applyCatchUnoFailure(state, accuserId, targetId) {
  const target = state.players.find((p) => p.id === targetId);
  if (!target) throw new Error("No such player");
  if (state.hands[targetId].length !== 1) throw new Error("Target doesn't have exactly 1 card");
  if (state.unoCalled[targetId]) throw new Error("Target already called uno");

  const next = structuredCloneLike(state);
  ensureDeckHasCards(next, 2);
  const drawn = next.deck.splice(0, 2);
  next.hands[targetId] = [...next.hands[targetId], ...drawn];
  next.log = [...next.log, `${target.name} was caught without calling Uno - drew 2`];
  return next;
}

function ensureDeckHasCards(state, count) {
  while (state.deck.length < count) {
    if (state.discard.length <= 1) {
      // Nothing to reshuffle from - extremely unlikely, but guard anyway.
      return;
    }
    const top = state.discard[state.discard.length - 1];
    const rest = state.discard.slice(0, -1);
    state.deck = [...state.deck, ...shuffle(rest)];
    state.discard = [top];
  }
}

// Firestore-friendly deep clone (no functions/symbols in our state shape,
// so JSON round-trip is fine and avoids relying on structuredClone global).
function structuredCloneLike(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function scoreHand(hand) {
  return hand.reduce((sum, c) => sum + cardScoreSafe(c), 0);
}

function cardScoreSafe(card) {
  // Local import cycle avoidance - inline mirror of cardScore.
  if (card === "WD4" || card === "WILD") return 50;
  const v = card.slice(card[0] === "W" ? 0 : 1);
  if (v === "SKIP" || v === "REV" || v === "DRAW2") return 20;
  return Number(v) || 0;
}
