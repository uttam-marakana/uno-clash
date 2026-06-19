import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGameState,
  applyPlayCard,
  applyDrawCard,
  applyPassTurn,
  applyCallUno,
  applyCatchUnoFailure,
  currentPlayer,
  isLegalPlay,
} from "../game/rules";
import { decideBotMove, botShouldCallUno } from "../bots/botAI";

const BOT_MOVE_DELAY_MS = 900;

export function useLocalGame(players) {
  const [state, setState] = useState(() => createGameState(players));
  const botTimerRef = useRef(null);

  const reset = useCallback(() => {
    setState(createGameState(players));
  }, [players]);

  const playCard = useCallback((playerId, card, chosenColor) => {
    setState((s) => {
      try {
        return applyPlayCard(s, playerId, card, chosenColor);
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

  // Drive bot turns automatically.
  useEffect(() => {
    if (state.status !== "playing") return;
    const player = currentPlayer(state);
    if (!player.isBot) return;

    botTimerRef.current = setTimeout(() => {
      const move = decideBotMove(state, player.id);

      setState((s) => {
        // Re-derive in case state shifted (defensive; single-threaded JS
        // makes this unlikely, but keeps the function honest).
        try {
          if (move.type === "play") {
            let next = applyPlayCard(s, player.id, move.card, move.chosenColor);
            const newHand = next.hands[player.id];
            if (botShouldCallUno(newHand)) {
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

  return { state, playCard, drawCard, passTurn, callUno, catchUnoFailure, reset };
}

export function canCurrentPlayerAct(state, playerId) {
  return currentPlayer(state).id === playerId;
}

export function hasAnyLegalMove(state, playerId) {
  const hand = state.hands[playerId];
  return hand.some((c) => isLegalPlay(state, c));
}
