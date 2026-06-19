import { legalMoves, isLegalPlay } from "../game/rules.js";
import { isWild, cardColor, COLORS } from "../game/cards.js";

/**
 * Decide a bot's move for the current state. Returns one of:
 *   { type: "play", card, chosenColor? }
 *   { type: "draw" }
 *   { type: "pass" }
 */
export function decideBotMove(state, playerId) {
  const hand = state.hands[playerId];

  if (state.turnPlayedCard === "drew") {
    // Already drew this turn - play the new card if it's legal, else pass.
    const lastDrawn = hand[hand.length - 1];
    if (isLegalPlay(state, lastDrawn)) {
      return buildPlay(lastDrawn, hand);
    }
    return { type: "pass" };
  }

  const moves = legalMoves(state, hand);
  if (moves.length === 0) {
    return { type: "draw" };
  }

  // Prefer non-wild cards first (save wilds for when stuck), then prefer
  // action cards (skip/reverse/draw2) over plain numbers to be mildly
  // aggressive, then highest-value numbers to shed points.
  const sorted = [...moves].sort((a, b) => priority(b) - priority(a));
  const chosen = sorted[0];
  return buildPlay(chosen, hand);
}

function buildPlay(card, hand) {
  if (isWild(card)) {
    return { type: "play", card, chosenColor: bestColor(hand, card) };
  }
  return { type: "play", card };
}

function priority(card) {
  if (isWild(card)) return 0;
  const v = card.slice(1);
  if (v === "DRAW2") return 3;
  if (v === "SKIP" || v === "REV") return 2;
  return 1;
}

/**
 * Choose the color the bot has the most of in hand (excluding the wild
 * itself), to maximize future playable cards.
 */
function bestColor(hand, excludeCard) {
  const counts = { R: 0, Y: 0, G: 0, B: 0 };
  hand.forEach((c) => {
    if (c === excludeCard) return;
    const color = cardColor(c);
    if (color) counts[color] += 1;
  });
  return COLORS.reduce((best, c) => (counts[c] > counts[best] ? c : best), "R");
}

/**
 * Should the bot call Uno this turn? Always yes when it just dropped to 1
 * card (kept simple/honest - bots don't bluff or forget).
 */
export function botShouldCallUno(hand) {
  return hand.length === 1;
}
