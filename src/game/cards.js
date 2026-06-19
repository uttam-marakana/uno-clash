// Card codes are compact strings so they store cheaply in Firestore docs:
//   "<color><value>"   e.g. "R7", "Y0", "GSKIP", "BREV", "RDRAW2"
//   "WILD" / "WD4" for colorless wilds (color is chosen when played)
//
// Colors: R (red), Y (yellow), G (green), B (blue)

export const COLORS = ["R", "Y", "G", "B"];

export const COLOR_NAMES = {
  R: "red",
  Y: "yellow",
  G: "green",
  B: "blue",
};

export const ACTION = {
  SKIP: "SKIP",
  REVERSE: "REV",
  DRAW2: "DRAW2",
};

export const WILD = "WILD";
export const WILD_DRAW4 = "WD4";

function numberCards(color) {
  const cards = [`${color}0`];
  for (let n = 1; n <= 9; n++) {
    cards.push(`${color}${n}`, `${color}${n}`); // two of each 1-9
  }
  return cards;
}

function actionCards(color) {
  const cards = [];
  [ACTION.SKIP, ACTION.REVERSE, ACTION.DRAW2].forEach((a) => {
    cards.push(`${color}${a}`, `${color}${a}`); // two of each action card
  });
  return cards;
}

/**
 * Build a fresh, unshuffled 108-card Uno deck.
 */
export function buildDeck() {
  let deck = [];
  COLORS.forEach((color) => {
    deck = deck.concat(numberCards(color), actionCards(color));
  });
  for (let i = 0; i < 4; i++) deck.push(WILD);
  for (let i = 0; i < 4; i++) deck.push(WILD_DRAW4);
  return deck;
}

export function cardColor(card) {
  if (card === WILD || card === WILD_DRAW4) return null;
  return card[0];
}

export function cardValue(card) {
  if (card === WILD || card === WILD_DRAW4) return card;
  return card.slice(1);
}

export function isWild(card) {
  return card === WILD || card === WILD_DRAW4;
}

export function isAction(card) {
  const v = cardValue(card);
  return v === ACTION.SKIP || v === ACTION.REVERSE || v === ACTION.DRAW2;
}

export function isNumber(card) {
  return !isWild(card) && !isAction(card);
}

/**
 * Score value of a card when tallying points at round end.
 */
export function cardScore(card) {
  if (card === WILD_DRAW4 || card === WILD) return 50;
  const v = cardValue(card);
  if (v === ACTION.SKIP || v === ACTION.REVERSE || v === ACTION.DRAW2) return 20;
  return Number(v);
}

/**
 * Display label for a card, e.g. "Red 7", "Green skip", "Wild draw four".
 */
export function cardLabel(card) {
  if (card === WILD) return "Wild";
  if (card === WILD_DRAW4) return "Wild draw four";
  const color = COLOR_NAMES[cardColor(card)];
  const v = cardValue(card);
  if (v === ACTION.SKIP) return `${cap(color)} skip`;
  if (v === ACTION.REVERSE) return `${cap(color)} reverse`;
  if (v === ACTION.DRAW2) return `${cap(color)} draw two`;
  return `${cap(color)} ${v}`;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
