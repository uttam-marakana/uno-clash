import { useState } from "react";
import { useLocalGame } from "../hooks/useLocalGame";
import GameTable from "../components/GameTable";
import PassDeviceGate from "../components/PassDeviceGate";

export default function LocalGamePage({ players, mode, onExit }) {
  const humanCount = players.filter((p) => !p.isBot).length;
  const isPassAndPlay = humanCount > 1;

  // Whether the device is currently locked behind the pass-device gate.
  // Starts true for pass-and-play (first human must tap "I'm ready"
  // before seeing their hand) and false for solo/bots mode (no gate).
  const [gateOpen, setGateOpen] = useState(!isPassAndPlay);

  // The turn timer must not tick while the gate is up - the player
  // hasn't even seen their hand yet, so a countdown running against them
  // unseen would be unfair. gateOpen (this render's value) is exactly
  // what useLocalGame needs as its timerEnabled flag.
  //
  // sessionMode ("local" | "bots") tells the hook to persist game state
  // to sessionStorage and restore it on mount, so reloading this page
  // mid-game picks up exactly where it left off instead of dealing fresh.
  const {
    state,
    playCard,
    drawCard,
    passTurn,
    callUno,
    catchUnoFailure,
    reset,
    leaveSession,
    secondsLeft,
  } = useLocalGame(players, { timerEnabled: gateOpen, sessionMode: mode });

  const currentPlayerObj = state.players[state.currentPlayerIndex];
  const currentId = currentPlayerObj?.id;

  // Tracks the most recent turn-holder id we've reacted to, purely to
  // detect when the active turn has moved to someone new. Kept separate
  // from gateOpen itself so re-evaluating this comparison on every render
  // doesn't fight with onReady's dismissal of the gate.
  const [lastSeenTurn, setLastSeenTurn] = useState(isPassAndPlay ? null : currentId);

  if (isPassAndPlay && lastSeenTurn !== currentId) {
    setLastSeenTurn(currentId);
    setGateOpen(!!currentPlayerObj?.isBot);
  }

  function handleExit() {
    leaveSession();
    onExit();
  }

  if (isPassAndPlay && currentPlayerObj && !currentPlayerObj.isBot && !gateOpen) {
    return (
      <PassDeviceGate
        player={currentPlayerObj}
        onReady={() => setGateOpen(true)}
      />
    );
  }

  const myPlayerId = isPassAndPlay ? currentId : players[0].id;

  return (
    <GameTable
      state={state}
      myPlayerId={myPlayerId}
      secondsLeft={secondsLeft}
      onPlay={playCard}
      onDraw={drawCard}
      onPass={passTurn}
      onCallUno={callUno}
      onCatchFailure={catchUnoFailure}
      onRematch={reset}
      onExit={handleExit}
    />
  );
}
