// Run with: node src/game/__tests__/elimination.test.mjs

import {
  createGameState,
  applyTimeoutAction,
  applyPlayCard,
  currentPlayer,
} from "../rules.js";

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

test("Timeout auto-plays the highest legal plain-number card", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["R2", "R9", "RSKIP", "B3"]);
  state = applyTimeoutAction(state, "p0");
  // R9 is the highest legal plain-number card (R2 also legal, R9 > R2).
  assert(!state.hands["p0"].includes("R9"), "R9 should have been auto-played");
  assert(state.hands["p0"].includes("R2"), "R2 should remain in hand");
  assert(state.hands["p0"].includes("RSKIP"), "RSKIP should never be auto-played");
  assert(state.discard[state.discard.length - 1] === "R9", "R9 should be on top of discard");
});

test("Timeout never auto-plays action or wild cards even if they're the only legal move", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["RSKIP", "WILD", "B3"]); // only RSKIP/WILD legal (R-color or wild)
  const before = state.hands["p0"].length;
  state = applyTimeoutAction(state, "p0");
  // Should have drawn instead of playing RSKIP or WILD.
  assert(state.hands["p0"].length === before + 1, "should have drawn exactly 1 card");
  assert(state.hands["p0"].includes("RSKIP"), "RSKIP should remain untouched");
  assert(state.hands["p0"].includes("WILD"), "WILD should remain untouched");
});

test("Timeout draws when no legal move exists at all", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["B3", "Y4"]); // nothing matches R5 or is wild
  const before = state.hands["p0"].length;
  state = applyTimeoutAction(state, "p0");
  assert(state.hands["p0"].length === before + 1, "should draw exactly 1 card on no legal move");
});

test("missedTurns increments on timeout and resets to 0 on a manual play", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["B3", "Y4"]); // no legal move -> forced draw
  state = applyTimeoutAction(state, "p0");
  assert(state.missedTurns["p0"] === 1, `expected missedTurns=1, got ${state.missedTurns["p0"]}`);

  // p1, p2 take a no-op turn each so it's p0's turn again - simulate by
  // directly manipulating currentPlayerIndex via timeouts (simplest: just
  // call timeout for whoever is current until it's p0 again).
  while (currentPlayer(state).id !== "p0") {
    state = withHand(state, currentPlayer(state).id, ["Y1"]); // no legal move, will draw
    state = applyTimeoutAction(state, currentPlayer(state).id);
  }
  state = withHand(state, "p0", ["B3", "Y4"]);
  state = applyTimeoutAction(state, "p0");
  assert(state.missedTurns["p0"] === 2, `expected missedTurns=2, got ${state.missedTurns["p0"]}`);

  // Now give p0 a manual legal play - should reset to 0.
  while (currentPlayer(state).id !== "p0") {
    state = withHand(state, currentPlayer(state).id, ["Y1"]);
    state = applyTimeoutAction(state, currentPlayer(state).id);
  }
  state = withHand(state, "p0", ["R7", "B3"]);
  state = applyPlayCard(state, "p0", "R7"); // manual, legal (matches color R)
  assert(state.missedTurns["p0"] === 0, `expected reset to 0, got ${state.missedTurns["p0"]}`);
});

test("3 consecutive timeouts eliminates the player; hand is cleared", () => {
  let state = freshState(3, "R5");

  function forceTimeout(pid, hand) {
    state = withHand(state, pid, hand);
    state = applyTimeoutAction(state, pid);
  }

  // Drive p0 through 3 consecutive misses (cycling other players' turns
  // forward with their own no-op timeouts in between).
  for (let i = 0; i < 3; i++) {
    forceTimeout("p0", ["B3", "Y4"]); // no legal move -> counts as a miss
    while (currentPlayer(state).id !== "p0" && !state.eliminatedIds.includes("p0")) {
      forceTimeout(currentPlayer(state).id, ["Y1"]);
    }
  }

  assert(state.eliminatedIds.includes("p0"), "p0 should be eliminated after 3 misses");
  assert(state.hands["p0"].length === 0, "eliminated player's hand should be cleared");
  assert(currentPlayer(state).id !== "p0", "turn should have moved off the eliminated player");
});

test("Turn order skips eliminated players going forward", () => {
  let state = freshState(3, "R5");
  state = { ...state, eliminatedIds: ["p1"], currentPlayerIndex: 0 };
  state = withHand(state, "p0", ["R3"]);
  // p0 plays a plain card - next turn should skip eliminated p1 and land on p2.
  state = withHand(state, "p0", ["R3", "B3"]);
  state = applyPlayCard(state, "p0", "R3");
  assert(currentPlayer(state).id === "p2", `expected p2 (skipping eliminated p1), got ${currentPlayer(state).id}`);
});

test("Game ends immediately when elimination leaves only one active player", () => {
  let state = freshState(3, "R5");
  state = { ...state, eliminatedIds: ["p1"] }; // p1 already out, p0 and p2 remain

  function forceTimeout(pid, hand) {
    state = withHand(state, pid, hand);
    state = applyTimeoutAction(state, pid);
  }

  // Drive p0 (currentPlayerIndex=0) through 3 misses; should eliminate
  // p0, leaving only p2 active -> instant win for p2.
  for (let i = 0; i < 3; i++) {
    forceTimeout("p0", ["B3", "Y4"]);
    if (state.status === "round-over") break;
    while (currentPlayer(state).id !== "p0" && state.status === "playing") {
      forceTimeout(currentPlayer(state).id, ["Y1"]);
    }
  }

  assert(state.status === "round-over", "game should be over");
  assert(state.winnerId === "p2", `expected p2 to win by elimination, got ${state.winnerId}`);
});

console.log(failed === 0 ? "\nAll elimination tests passed." : `\n${failed} test(s) failed.`);
process.exitCode = failed === 0 ? 0 : 1;
