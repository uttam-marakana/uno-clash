import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  createGameState,
  applyPlayCard,
  applyDrawCard,
  applyPassTurn,
  applyCallUno,
  applyCatchUnoFailure,
} from "../game/rules";

const GAMES = "games";
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new room in the lobby (waiting for players). The game itself
 * doesn't start (cards aren't dealt) until startGame() is called by the
 * host once enough players have joined.
 */
export async function createRoom({ hostId, hostName, isPublic }) {
  const code = randomRoomCode();
  const ref = doc(db, GAMES, code);

  await setDoc(ref, {
    code,
    isPublic: !!isPublic,
    status: "lobby", // lobby | playing | round-over | game-over
    hostId,
    createdAt: serverTimestamp(),
    seats: [{ id: hostId, name: hostName, isBot: false }],
  });

  return code;
}

export async function joinRoom({ code, playerId, playerName }) {
  const ref = doc(db, GAMES, code.toUpperCase());

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Room not found");
    const data = snap.data();
    if (data.status !== "lobby") throw new Error("Game already started");
    if (data.seats.length >= MAX_PLAYERS) throw new Error("Room is full");
    if (data.seats.some((s) => s.id === playerId)) return; // already joined

    tx.update(ref, {
      seats: [...data.seats, { id: playerId, name: playerName, isBot: false }],
    });
  });

  return code.toUpperCase();
}

export async function leaveRoom({ code, playerId }) {
  const ref = doc(db, GAMES, code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const seats = data.seats.filter((s) => s.id !== playerId);
    tx.update(ref, { seats });
  });
}

/**
 * Host starts the game: deals cards and writes the initial play state.
 * Requires at least MIN_PLAYERS seats filled.
 */
export async function startGame(code) {
  const ref = doc(db, GAMES, code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Room not found");
    const data = snap.data();
    if (data.status !== "lobby") return;
    if (data.seats.length < MIN_PLAYERS) {
      throw new Error(`Need at least ${MIN_PLAYERS} players`);
    }

    const state = createGameState(data.seats);
    tx.update(ref, { ...state, status: "playing" });
  });
}

export function subscribeToGame(code, onChange, onError) {
  const ref = doc(db, GAMES, code);
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError
  );
}

export function subscribePublicLobbies(onChange, onError) {
  const q = query(
    collection(db, GAMES),
    where("isPublic", "==", true),
    where("status", "==", "lobby"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

// --- Transactional move application -----------------------------------
//
// Each of these re-reads the live doc inside a Firestore transaction and
// applies the pure rules-engine function to it, so concurrent clients
// can't both succeed on a stale view of the game (e.g. two players racing
// to play on the same turn). If the move is illegal given the *current*
// server state, the rules engine throws and the transaction aborts
// without writing anything.

async function applyTransactionalMove(code, mutator) {
  const ref = doc(db, GAMES, code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Room not found");
    const state = snap.data();
    const next = mutator(state);
    tx.update(ref, next);
  });
}

export function playCardOnline(code, playerId, card, chosenColor) {
  return applyTransactionalMove(code, (state) =>
    applyPlayCard(state, playerId, card, chosenColor)
  );
}

export function drawCardOnline(code, playerId) {
  return applyTransactionalMove(code, (state) => applyDrawCard(state, playerId));
}

export function passTurnOnline(code, playerId) {
  return applyTransactionalMove(code, (state) => applyPassTurn(state, playerId));
}

export function callUnoOnline(code, playerId) {
  return applyTransactionalMove(code, (state) => applyCallUno(state, playerId));
}

export function catchUnoFailureOnline(code, accuserId, targetId) {
  return applyTransactionalMove(code, (state) =>
    applyCatchUnoFailure(state, accuserId, targetId)
  );
}

export async function rematch(code) {
  const ref = doc(db, GAMES, code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const state = createGameState(data.players);
    tx.update(ref, { ...state, status: "playing" });
  });
}
