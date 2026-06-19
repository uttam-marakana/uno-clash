import { useCallback, useEffect, useState } from "react";
import { ensureAnonAuth } from "../lib/firebase";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  subscribeToGame,
  subscribePublicLobbies,
  playCardOnline,
  drawCardOnline,
  passTurnOnline,
  callUnoOnline,
  catchUnoFailureOnline,
  rematch,
} from "../lib/onlineGame";

export function usePlayerId() {
  const [uid, setUid] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    ensureAnonAuth().then(setUid).catch(setError);
  }, []);

  return { uid, error };
}

export function useOnlineGame(code) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    const unsub = subscribeToGame(
      code,
      (g) => setGame(g),
      (err) => setError(err)
    );
    return unsub;
  }, [code]);

  const actions = {
    start: useCallback(() => startGame(code).catch((e) => setError(e)), [code]),
    play: useCallback(
      (playerId, card, color) =>
        playCardOnline(code, playerId, card, color).catch((e) => setError(e)),
      [code]
    ),
    draw: useCallback(
      (playerId) => drawCardOnline(code, playerId).catch((e) => setError(e)),
      [code]
    ),
    pass: useCallback(
      (playerId) => passTurnOnline(code, playerId).catch((e) => setError(e)),
      [code]
    ),
    callUno: useCallback(
      (playerId) => callUnoOnline(code, playerId).catch((e) => setError(e)),
      [code]
    ),
    catchFailure: useCallback(
      (accuserId, targetId) =>
        catchUnoFailureOnline(code, accuserId, targetId).catch((e) => setError(e)),
      [code]
    ),
    leave: useCallback(
      (playerId) => leaveRoom({ code, playerId }).catch((e) => setError(e)),
      [code]
    ),
    rematch: useCallback(() => rematch(code).catch((e) => setError(e)), [code]),
  };

  return { game, error, clearError: () => setError(null), ...actions };
}

export function usePublicLobbies() {
  const [lobbies, setLobbies] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = subscribePublicLobbies(setLobbies, setError);
    return unsub;
  }, []);

  return { lobbies, error };
}

export { createRoom, joinRoom };
