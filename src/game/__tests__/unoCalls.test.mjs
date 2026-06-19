// Run with: node src/game/__tests__/unoCalls.test.mjs

import { createGameState, applyPlayCard, applyCallUno, applyCatchUnoFailure } from "../rules.js";

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
}

function freshState(numPlayers, forcedTop = "R5") {
  const players = Array.from({ length: numPlayers }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isBot: false,
  }));
  let state = createGameState(players, () => 0.5);
  state = { ...state, discard: [forcedTop], currentColor: forcedTop[0] };
  return state;
}

function withHand(state, playerId, hand) {
  return { ...state, hands: { ...state.hands, [playerId]: hand } };
}

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL: ${name} -> ${err.message}`);
  }
}

test("Catching a player at 1 card who didn't call uno gives 2 penalty cards", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["R7", "B3"]);
  state = applyPlayCard(state, "p0", "R7");
  assert(state.hands["p0"].length === 1, "p0 should have 1 card left");
  assert(!state.unoCalled["p0"], "p0 should not have called uno yet");

  const before = state.hands["p0"].length;
  state = applyCatchUnoFailure(state, "p1", "p0");
  assert(state.hands["p0"].length === before + 2, "p0 should draw 2 penalty cards");
});

test("Cannot catch a player who already called uno", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["R7", "B3"]);
  state = applyPlayCard(state, "p0", "R7");
  state = applyCallUno(state, "p0");

  let threw = false;
  try {
    applyCatchUnoFailure(state, "p1", "p0");
  } catch {
    threw = true;
  }
  assert(threw, "should throw - already called uno");
});

test("Cannot catch a player who has more than 1 card", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["R7", "B3", "Y2"]);
  let threw = false;
  try {
    applyCatchUnoFailure(state, "p1", "p0");
  } catch {
    threw = true;
  }
  assert(threw, "should throw - not at exactly 1 card");
});

test("Playing your last card wins the round", () => {
  let state = freshState(2, "R5");
  state = withHand(state, "p0", ["R3"]);
  state = applyPlayCard(state, "p0", "R3");
  assert(state.status === "round-over", "round should be over");
  assert(state.winnerId === "p0", "p0 should be declared winner");
});

console.log(failed === 0 ? "\nAll uno-call tests passed." : `\n${failed} test(s) failed.`);
process.exitCode = failed === 0 ? 0 : 1;
