import {
  buildDeck,
  cardColor,
  cardValue,
  isWild,
  isNumber,
  ACTION,
  WILD_DRAW4,
} from "./cards.js";

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
    missedTurns: players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}), // consecutive auto-played turns per player
    eliminatedIds: [], // playerIds removed from the round for missing 3 turns in a row
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

function isEliminated(state, playerId) {
  return (state.eliminatedIds || []).includes(playerId);
}

function activePlayerCount(state) {
  return state.players.length - (state.eliminatedIds?.length || 0);
}

/**
 * Advance `steps` active (non-eliminated) player-slots from `fromIndex`,
 * wrapping around state.players and skipping anyone in eliminatedIds.
 * If everyone but the current player is eliminated, returns fromIndex
 * unchanged (caller is responsible for ending the game in that case).
 */
function nextIndex(state, fromIndex = state.currentPlayerIndex, steps = 1) {
  const n = state.players.length;
  if (activePlayerCount(state) <= 1) return fromIndex;

  let idx = fromIndex;
  let remaining = steps;
  // Safety cap so a corrupted eliminatedIds list can't spin forever.
  let guard = n * Math.max(steps, 1) * 4 + 8;

  while (remaining > 0 && guard-- > 0) {
    idx = (idx + state.direction + n) % n;
    if (!isEliminated(state, state.players[idx].id)) {
      remaining -= 1;
    }
  }
  return idx;
}

/**
 * Apply playing `card` from `playerId`'s hand. `chosenColor` is required
 * when the card is a wild. Returns a new state object (does not mutate).
 * Throws on illegal moves so callers (transactions, bots) can reject them.
 */
export function applyPlayCard(state, playerId, card, chosenColor = null, isManual = true) {
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

  if (!next.missedTurns) next.missedTurns = {};
  next.missedTurns[playerId] = isManual ? 0 : (state.missedTurns?.[playerId] || 0) + 1;

  next.log = [
    ...state.log,
    isManual ? `${player.name} played ${card}` : `${player.name} timed out - auto-played ${card}`,
  ];

  // Round-over check.
  if (next.hands[playerId].length === 0) {
    next.status = "round-over";
    next.winnerId = playerId;
    next.log.push(`${player.name} wins the round!`);
    return next;
  }

  if (!isManual && next.missedTurns[playerId] >= 3) {
    return eliminatePlayer(next, playerId);
  }

  // Resolve action effects.
  const value = cardValue(card);
  let advanceSteps = 1;

  if (value === ACTION.REVERSE) {
    next.direction = state.direction * -1;
    // Acts like a skip when only 2 active players remain.
    if (activePlayerCount(next) <= 2) advanceSteps = 2;
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
 * Remove a player from the round for missing 3 turns in a row: their
 * hand is discarded entirely (not returned to the deck, to keep this
 * simple and match the requested behavior), they're flagged in
 * eliminatedIds so turn order skips them going forward, and if only one
 * active player remains, that player wins immediately.
 */
function eliminatePlayer(state, playerId) {
  const next = structuredCloneLike(state);
  const player = next.players.find((p) => p.id === playerId);

  next.hands[playerId] = [];
  next.eliminatedIds = [...(next.eliminatedIds || []), playerId];
  delete next.unoCalled[playerId];
  next.log = [...next.log, `${player?.name || playerId} was eliminated after 3 missed turns`];

  const remaining = next.players.filter((p) => !next.eliminatedIds.includes(p.id));
  if (remaining.length === 1) {
    next.status = "round-over";
    next.winnerId = remaining[0].id;
    next.log.push(`${remaining[0].name} wins - everyone else was eliminated!`);
    next.turnPlayedCard = false;
    return next;
  }

  next.currentPlayerIndex = nextIndex(next, state.currentPlayerIndex, 1);
  next.turnPlayedCard = false;
  return next;
}

/**
 * Called when a player's turn timer (5s) expires without a manual action.
 * Picks the highest-value plain NUMBER card that's currently legal to
 * play (never an action or wild card, per house rule); if none exists,
 * draws a card instead and ends the turn immediately (the auto-drawn
 * card is never auto-played, even if it would've been legal - this is a
 * "miss", not a real turn).
 *
 * Either branch counts as a miss: increments missedTurns[playerId], and
 * eliminates the player if that reaches 3 in a row.
 */
export function applyTimeoutAction(state, playerId) {
  const player = currentPlayer(state);
  if (player.id !== playerId) throw new Error("Not your turn");

  const hand = state.hands[playerId];

  // If the player already drew this turn (turnPlayedCard === "drew") and
  // is now stuck deciding whether to play the drawn card or pass, timing
  // out here just passes - drawing again would create extra cards.
  if (state.turnPlayedCard === "drew") {
    return applyMissedTurnPass(state, playerId);
  }

  const candidates = hand.filter((c) => isNumber(c) && isLegalPlay(state, c));

  if (candidates.length > 0) {
    const best = candidates.reduce((a, b) => (Number(cardValue(b)) > Number(cardValue(a)) ? b : a));
    return applyPlayCard(state, playerId, best, null, false);
  }

  // No legal plain-number card (either none legal at all, or only
  // action/wild cards are legal) - draw instead, counted as a miss.
  return applyMissedTurnDraw(state, playerId);
}

function applyMissedTurnDraw(state, playerId) {
  const player = currentPlayer(state);
  const next = structuredCloneLike(state);
  const drawCount = state.pendingDraw > 0 ? state.pendingDraw : 1;

  ensureDeckHasCards(next, drawCount);
  const drawn = next.deck.splice(0, drawCount);
  next.hands[playerId] = [...next.hands[playerId], ...drawn];

  if (!next.missedTurns) next.missedTurns = {};
  next.missedTurns[playerId] = (state.missedTurns?.[playerId] || 0) + 1;

  next.log = [
    ...next.log,
    `${player.name} timed out - drew ${drawCount} card${drawCount > 1 ? "s" : ""}`,
  ];
  next.pendingDraw = 0;
  next.turnPlayedCard = false;

  if (next.missedTurns[playerId] >= 3) {
    return eliminatePlayer(next, playerId);
  }

  next.currentPlayerIndex = nextIndex(next, state.currentPlayerIndex, 1);
  return next;
}

function applyMissedTurnPass(state, playerId) {
  const player = currentPlayer(state);
  const next = structuredCloneLike(state);

  if (!next.missedTurns) next.missedTurns = {};
  next.missedTurns[playerId] = (state.missedTurns?.[playerId] || 0) + 1;
  next.log = [...next.log, `${player.name} timed out - turn passed`];
  next.turnPlayedCard = false;

  if (next.missedTurns[playerId] >= 3) {
    return eliminatePlayer(next, playerId);
  }

  next.currentPlayerIndex = nextIndex(next, state.currentPlayerIndex, 1);
  return next;
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
