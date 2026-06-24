import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGameState,
  applyPlayCard,
  applyDrawCard,
  applyPassTurn,
  applyCallUno,
  applyCatchUnoFailure,
  applyTimeoutAction,
  currentPlayer,
  isLegalPlay,
} from "../game/rules";
import { decideBotMove, botShouldCallUno } from "../bots/botAI";
import { saveSession, loadSession, clearSession } from "../lib/gameSession";

const BOT_MOVE_DELAY_MS = 900;
export const TURN_TIMER_SECONDS = 15;

function sameRoster(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((p, i) => p.id === b[i].id && p.isBot === b[i].isBot);
}

/**
 * @param {Array} players - the player roster for this session.
 * @param {object} options
 * @param {boolean} options.timerEnabled
 * @param {string} [options.sessionMode] - "local" | "bots" | undefined.
 *   When provided, game state is persisted to sessionStorage under this
 *   key and restored on mount if a matching in-progress session exists
 *   (same player roster), so a page reload doesn't lose the game.
 */
export function useLocalGame(players, { timerEnabled = true, sessionMode = null } = {}) {
  const [state, setState] = useState(() => {
    if (sessionMode) {
      const saved = loadSession(sessionMode);
      if (saved && sameRoster(saved.players, players) && saved.gameState?.status === "playing") {
        return saved.gameState;
      }
    }
    return createGameState(players);
  });
  const [secondsLeft, setSecondsLeft] = useState(TURN_TIMER_SECONDS);
  const botTimerRef = useRef(null);

  // Persist on every state change while the round is still live. Once a
  // round ends, clear the saved session so a reload after a win/loss
  // starts fresh rather than re-showing a finished round-over screen.
  useEffect(() => {
    if (!sessionMode) return;
    if (state.status === "playing") {
      saveSession(sessionMode, players, state);
    } else {
      clearSession(sessionMode);
    }
  }, [sessionMode, players, state]);

  const reset = useCallback(() => {
    const fresh = createGameState(players);
    setState(fresh);
    setSecondsLeft(TURN_TIMER_SECONDS);
    if (sessionMode) saveSession(sessionMode, players, fresh);
  }, [players, sessionMode]);

  const leaveSession = useCallback(() => {
    if (sessionMode) clearSession(sessionMode);
  }, [sessionMode]);

  const playCard = useCallback((playerId, card, chosenColor) => {
    setState((s) => {
      try {
        return applyPlayCard(s, playerId, card, chosenColor, true);
      } catch (err) {
        console.warn("playCard rejected:", err.message);
        return s;
      }
    });
  }, []);

  const drawCard = useCallback((playerId) => {
    setState((s) => {
      try {
        return applyDrawCard(s, playerId);
      } catch (err) {
        console.warn("drawCard rejected:", err.message);
        return s;
      }
    });
  }, []);

  const passTurn = useCallback((playerId) => {
    setState((s) => {
      try {
        return applyPassTurn(s, playerId);
      } catch (err) {
        console.warn("passTurn rejected:", err.message);
        return s;
      }
    });
  }, []);

  const callUno = useCallback((playerId) => {
    setState((s) => applyCallUno(s, playerId));
  }, []);

  const catchUnoFailure = useCallback((accuserId, targetId) => {
    setState((s) => {
      try {
        return applyCatchUnoFailure(s, accuserId, targetId);
      } catch (err) {
        console.warn("catchUnoFailure rejected:", err.message);
        return s;
      }
    });
  }, []);

  // Drive bot turns automatically. Bots are unaffected by the human turn
  // timer - they always act on their own short delay.
  useEffect(() => {
    if (state.status !== "playing") return;
    const player = currentPlayer(state);
    if (!player.isBot) return;

    botTimerRef.current = setTimeout(() => {
      const move = decideBotMove(state, player.id);

      setState((s) => {
        try {
          if (move.type === "play") {
            let next = applyPlayCard(s, player.id, move.card, move.chosenColor, true);
            const newHand = next.hands[player.id];
            if (newHand && botShouldCallUno(newHand)) {
              next = applyCallUno(next, player.id);
            }
            return next;
          }
          if (move.type === "draw") {
            return applyDrawCard(s, player.id);
          }
          if (move.type === "pass") {
            return applyPassTurn(s, player.id);
          }
          return s;
        } catch (err) {
          console.warn("Bot move rejected:", err.message);
          return s;
        }
      });
    }, BOT_MOVE_DELAY_MS);

    return () => clearTimeout(botTimerRef.current);
  }, [state]);

  // Human turn countdown. Resets whenever the active player or
  // turnPlayedCard phase changes, ticks down once per second, and
  // triggers an auto-action via applyTimeoutAction when it hits 0.
  // Disabled while timerEnabled is false (e.g. a pass-and-play gate is up
  // and the current human hasn't seen their hand yet) or during a bot's
  // turn (bots have their own pacing above).
  const player = state.status === "playing" ? currentPlayer(state) : null;
  const isHumanTurn = !!player && !player.isBot;
  const currentPlayerId = player?.id ?? null;
  const turnKey = `${state.currentPlayerIndex}:${state.turnPlayedCard}:${state.status}:${timerEnabled}`;

  // Adjust-state-during-render: when the turn phase changes, the displayed
  // countdown should immediately snap back to the full duration rather
  // than waiting for the effect below to run on the next tick. This is
  // the React-documented pattern for resetting state in response to a
  // prop/derived-value change, without calling setState inside an effect.
  const [lastTurnKey, setLastTurnKey] = useState(turnKey);
  if (turnKey !== lastTurnKey) {
    setLastTurnKey(turnKey);
    setSecondsLeft(TURN_TIMER_SECONDS);
  }

  useEffect(() => {
    if (!timerEnabled || !isHumanTurn) return;

    // Capture the player this interval was created for. If a stale
    // interval somehow ever fires after the turn has already moved on
    // (shouldn't happen with the closure-local id below, but kept as a
    // defensive guard), it must not act on someone else's behalf.
    const turnPlayerId = currentPlayerId;

    const intervalId = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setState((current) => {
            if (current.status !== "playing") return current;
            const activePlayer = currentPlayer(current);
            if (!activePlayer || activePlayer.isBot) return current;
            if (activePlayer.id !== turnPlayerId) return current;
            try {
              return applyTimeoutAction(current, activePlayer.id);
            } catch (err) {
              console.warn("Timeout action rejected:", err.message);
              return current;
            }
          });
          return TURN_TIMER_SECONDS;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
    // turnKey captures every value this effect's behavior actually
    // depends on (which player, which phase, whether the timer is armed)
    // in one comparable string, so re-arming the interval on turnKey
    // change is exactly the exhaustive-deps contract, just deduplicated.
  }, [turnKey, timerEnabled, isHumanTurn, currentPlayerId]);

  return {
    state,
    playCard,
    drawCard,
    passTurn,
    callUno,
    catchUnoFailure,
    reset,
    leaveSession,
    secondsLeft,
    isHumanTurn,
  };
}

export function canCurrentPlayerAct(state, playerId) {
  return currentPlayer(state).id === playerId;
}

export function hasAnyLegalMove(state, playerId) {
  const hand = state.hands[playerId];
  return hand.some((c) => isLegalPlay(state, c));
}
