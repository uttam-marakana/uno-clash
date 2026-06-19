// Lightweight assertion-based tests for action card behavior (skip,
// reverse, draw two, wild draw four, stacking, and illegal-move
// rejection). Run with: node src/game/__tests__/actionCards.test.mjs
//
// These don't depend on a test framework on purpose - the rules engine
// is plain JS with no external deps, so a zero-dependency script keeps
// it that way and runs anywhere Node does.

import {
  createGameState,
  applyPlayCard,
  applyDrawCard,
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
  let state = createGameState(players, () => 0.999);
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

test("Skip card skips the next player (3p)", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["RSKIP", "B3"]);
  assert(currentPlayer(state).id === "p0", "p0 should start");
  state = applyPlayCard(state, "p0", "RSKIP");
  assert(currentPlayer(state).id === "p2", `expected p2, got ${currentPlayer(state).id}`);
});

test("Reverse flips direction with 3 players", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["RREV", "B3"]);
  state = applyPlayCard(state, "p0", "RREV");
  assert(state.direction === -1, "direction should now be -1");
  assert(currentPlayer(state).id === "p2", `expected p2, got ${currentPlayer(state).id}`);
});

test("Reverse acts as a skip in 2-player games", () => {
  let state = freshState(2, "R5");
  state = withHand(state, "p0", ["RREV", "B3"]);
  state = applyPlayCard(state, "p0", "RREV");
  assert(currentPlayer(state).id === "p0", `expected p0 to go again, got ${currentPlayer(state).id}`);
});

test("Draw Two forces next player to draw 2 and lose turn", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["RDRAW2", "B3"]);
  state = applyPlayCard(state, "p0", "RDRAW2");
  assert(state.pendingDraw === 2, `expected pendingDraw=2, got ${state.pendingDraw}`);
  assert(currentPlayer(state).id === "p1", `expected p1, got ${currentPlayer(state).id}`);

  const before = state.hands["p1"].length;
  state = applyDrawCard(state, "p1");
  assert(state.hands["p1"].length === before + 2, "p1 should draw exactly 2 cards");
  assert(state.pendingDraw === 0, "pendingDraw should clear");
  assert(currentPlayer(state).id === "p2", `expected p2 next, got ${currentPlayer(state).id}`);
});

test("Draw Two can be stacked with another Draw Two", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["RDRAW2", "B3"]);
  state = applyPlayCard(state, "p0", "RDRAW2");
  state = withHand(state, "p1", ["YDRAW2", "G4"]);
  state = applyPlayCard(state, "p1", "YDRAW2");
  assert(state.pendingDraw === 4, `expected stacked pendingDraw=4, got ${state.pendingDraw}`);

  const before = state.hands["p2"].length;
  state = applyDrawCard(state, "p2");
  assert(state.hands["p2"].length === before + 4, "p2 should draw the full stack of 4");
});

test("Wild Draw Four requires a chosen color and sets pendingDraw=4", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["WD4", "B3"]);
  let threw = false;
  try {
    applyPlayCard(state, "p0", "WD4");
  } catch {
    threw = true;
  }
  assert(threw, "should throw without a chosen color");

  state = applyPlayCard(state, "p0", "WD4", "B");
  assert(state.currentColor === "B", `expected currentColor=B, got ${state.currentColor}`);
  assert(state.pendingDraw === 4, `expected pendingDraw=4, got ${state.pendingDraw}`);
});

test("Out-of-turn play is rejected", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p1", ["R7"]);
  let threw = false;
  try {
    applyPlayCard(state, "p1", "R7");
  } catch {
    threw = true;
  }
  assert(threw, "should throw for out-of-turn play");
});

test("Mismatched color/value play is rejected", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["B3"]);
  let threw = false;
  try {
    applyPlayCard(state, "p0", "B3");
  } catch {
    threw = true;
  }
  assert(threw, "should throw for illegal color/value mismatch");
});

test("Cannot bypass a pending draw stack with an unrelated card", () => {
  let state = freshState(3, "R5");
  state = withHand(state, "p0", ["RDRAW2", "B3"]);
  state = applyPlayCard(state, "p0", "RDRAW2");
  state = withHand(state, "p1", ["R9", "YDRAW2"]);
  let threw = false;
  try {
    applyPlayCard(state, "p1", "R9");
  } catch {
    threw = true;
  }
  assert(threw, "should reject a non-draw card while pendingDraw is active");
});

console.log(failed === 0 ? "\nAll action card tests passed." : `\n${failed} test(s) failed.`);
process.exitCode = failed === 0 ? 0 : 1;
