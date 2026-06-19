import { useState } from "react";
import { useLocalGame } from "../hooks/useLocalGame";
import GameTable from "../components/GameTable";
import PassDeviceGate from "../components/PassDeviceGate";

export default function LocalGamePage({ players, onExit }) {
  const { state, playCard, drawCard, passTurn, callUno, catchUnoFailure, reset } =
    useLocalGame(players);

  const humanCount = players.filter((p) => !p.isBot).length;
  const isPassAndPlay = humanCount > 1;

  const currentPlayerObj = state.players[state.currentPlayerIndex];
  const currentId = currentPlayerObj?.id;

  // Tracks which player's turn the device is currently "unlocked" for.
  // Whenever the active turn moves to a *different* player, this becomes
  // stale and the gate should show again (for humans) before revealing
  // their hand. Follows React's documented "adjusting state during
  // render" pattern: a second piece of state remembers the last-seen
  // turn id so we can detect the change purely during render, without
  // an effect (refs aren't safe to read during render).
  const [unlockedFor, setUnlockedFor] = useState(isPassAndPlay ? null : currentId);
  const [lastSeenTurn, setLastSeenTurn] = useState(currentId);

  if (isPassAndPlay && lastSeenTurn !== currentId) {
    setLastSeenTurn(currentId);
    // Bots don't need the gate - just unlock immediately for them so the
    // bot-driving timer in useLocalGame can proceed without a human tap.
    setUnlockedFor(currentPlayerObj?.isBot ? currentId : null);
  }

  const needsGate =
    isPassAndPlay && currentPlayerObj && !currentPlayerObj.isBot && unlockedFor !== currentId;

  if (needsGate) {
    return (
      <PassDeviceGate
        player={currentPlayerObj}
        onReady={() => setUnlockedFor(currentId)}
      />
    );
  }

  // In pass-and-play, the table is shown from the current turn-holder's
  // point of view once unlocked. In bots/solo mode there's only ever one
  // human, so always show their seat regardless of whose turn it is.
  const myPlayerId = isPassAndPlay ? currentId : players[0].id;

  return (
    <GameTable
      state={state}
      myPlayerId={myPlayerId}
      onPlay={playCard}
      onDraw={drawCard}
      onPass={passTurn}
      onCallUno={callUno}
      onCatchFailure={catchUnoFailure}
      onRematch={reset}
      onExit={onExit}
    />
  );
}
