// Randomized end-to-end simulation using the real bot decision logic
// (src/bots/botAI.js) to drive every "player" - this exercises the exact
// draw-then-play-or-pass branching used by useLocalGame.js, across many
// player counts and random seeds, checking for:
//   - card conservation (always exactly 108 cards across deck+discard+hands)
//   - termination (no infinite loops / stuck states)
//   - no thrown errors from legal bot-chosen moves
//
// Run with: node src/game/__tests__/simulation.test.mjs

import {
  createGameState,
  applyPlayCard,
  applyDrawCard,
  applyPassTurn,
  applyCallUno,
  currentPlayer,
  isLegalPlay,
} from "../rules.js";
import { decideBotMove, botShouldCallUno } from "../../bots/botAI.js";

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickColor(rng) {
  return ["R", "Y", "G", "B"][Math.floor(rng() * 4)];
}

function runOneGame(seed, numPlayers) {
  const rng = mulberry32(seed);
  const players = Array.from({ length: numPlayers }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isBot: i !== 0,
  }));

  let state = createGameState(players, rng);
  let turns = 0;
  const maxTurns = 8000;

  while (state.status === "playing" && turns < maxTurns) {
    const player = currentPlayer(state);

    if (state.turnPlayedCard === "drew") {
      const hand = state.hands[player.id];
      const lastDrawn = hand[hand.length - 1];
      if (isLegalPlay(state, lastDrawn)) {
        state = applyPlayCard(
          state,
          player.id,
          lastDrawn,
          lastDrawn.startsWith("W") ? pickColor(rng) : null
        );
      } else {
        state = applyPassTurn(state, player.id);
      }
    } else {
      const move = decideBotMove(state, player.id);
      if (move.type === "play") {
        state = applyPlayCard(state, player.id, move.card, move.chosenColor);
        if (botShouldCallUno(state.hands[player.id] || [])) {
          state = applyCallUno(state, player.id);
        }
      } else if (move.type === "draw") {
        state = applyDrawCard(state, player.id);
      } else if (move.type === "pass") {
        state = applyPassTurn(state, player.id);
      } else {
        throw new Error(`Unknown move type: ${move.type}`);
      }
    }

    const total =
      state.deck.length +
      state.discard.length +
      players.reduce((s, p) => s + state.hands[p.id].length, 0);
    if (total !== 108) {
      throw new Error(`Card conservation violated at turn ${turns}: total=${total}`);
    }

    turns++;
  }

  if (turns >= maxTurns) {
    throw new Error(`Did not terminate within ${maxTurns} turns (seed ${seed}, players ${numPlayers})`);
  }

  return turns;
}

let failures = 0;
let totalGames = 0;
const turnCounts = [];

for (let numPlayers = 2; numPlayers <= 4; numPlayers++) {
  for (let seed = 0; seed < 150; seed++) {
    totalGames++;
    try {
      turnCounts.push(runOneGame(seed * 7919 + numPlayers, numPlayers));
    } catch (err) {
      failures++;
      console.log(`FAIL (players=${numPlayers}, seed=${seed}): ${err.message}`);
    }
  }
}

console.log(`${totalGames} games simulated, ${failures} failures.`);
if (turnCounts.length) {
  const avg = turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length;
  console.log(
    `Avg turns to finish: ${avg.toFixed(1)}, min: ${Math.min(...turnCounts)}, max: ${Math.max(...turnCounts)}`
  );
}

process.exitCode = failures === 0 ? 0 : 1;
