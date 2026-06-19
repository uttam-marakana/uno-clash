import { useState } from "react";
import Hand from "./Hand";
import TableCenter, { ColorPickerModal } from "./TableCenter";
import OpponentStrip from "./OpponentStrip";
import { isWild } from "../game/cards";
import { hasAnyLegalMove } from "../hooks/useLocalGame";

export default function GameTable({
  state,
  myPlayerId,
  onPlay,
  onDraw,
  onPass,
  onCallUno,
  onCatchFailure,
  onRematch,
  onExit,
}) {
  const [pendingWild, setPendingWild] = useState(null);

  if (!state) return null;

  const myHand = state.hands[myPlayerId] || [];
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === myPlayerId;
  const others = state.players.filter((p) => p.id !== myPlayerId);

  function handleSelectCard(card) {
    if (!isMyTurn) return;
    if (isWild(card)) {
      setPendingWild(card);
      return;
    }
    onPlay(myPlayerId, card);
  }

  function handleChooseColor(color) {
    if (pendingWild) {
      onPlay(myPlayerId, pendingWild, color);
      setPendingWild(null);
    }
  }

  const iCanDraw =
    isMyTurn && state.turnPlayedCard !== "drew" && state.status === "playing";
  const iMustPass = isMyTurn && state.turnPlayedCard === "drew";
  const iHaveNoMoves =
    isMyTurn && state.turnPlayedCard !== "drew" && !hasAnyLegalMove(state, myPlayerId);

  const roundOver = state.status === "round-over";
  const winner = roundOver ? state.players.find((p) => p.id === state.winnerId) : null;

  return (
    <div className="relative px-3 py-6 sm:py-10 flex flex-col gap-6 min-h-screen">
    {/* <div className="relative max-w-3xl mx-auto px-3 py-6 sm:py-10 flex flex-col gap-6 min-h-screen"> */}
      <div className="flex flex-wrap justify-center gap-2">
        {others.map((p) => (
          <OpponentStrip
            key={p.id}
            player={p}
            cardCount={state.hands[p.id]?.length ?? 0}
            isCurrentTurn={state.players[state.currentPlayerIndex]?.id === p.id}
            calledUno={!!state.unoCalled[p.id]}
            onCatchUno={
              state.hands[p.id]?.length === 1 && !state.unoCalled[p.id]
                ? () => onCatchFailure(myPlayerId, p.id)
                : null
            }
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 relative">
        <TableCenter
          state={state}
          onDraw={() => onDraw(myPlayerId)}
          canDraw={iCanDraw}
          deckCount={state.deck.length}
        />

        {pendingWild && <ColorPickerModal onChoose={handleChooseColor} />}

        {roundOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/80 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <p className="font-display text-2xl text-uno-yellow">
                {winner?.id === myPlayerId ? "You win!" : `${winner?.name} wins!`}
              </p>
              {onRematch && (
                <button
                  onClick={onRematch}
                  className="px-5 py-2 rounded-md bg-uno-red text-card-stock font-display text-sm"
                >
                  play again
                </button>
              )}
              <button
                onClick={onExit}
                className="text-card-stock/60 text-sm hover:text-card-stock/90"
              >
                back to menu
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-card-stock/50 text-xs font-mono h-4">
          {isMyTurn
            ? iMustPass
              ? "Play the card you drew, or pass"
              : iHaveNoMoves
              ? "No legal moves — draw a card"
              : "Your turn"
            : `Waiting for ${state.players[state.currentPlayerIndex]?.name}…`}
        </p>

        <Hand
          hand={myHand}
          state={state}
          isCurrentPlayer={isMyTurn}
          onSelectCard={handleSelectCard}
          size="lg"
        />

        <div className="flex gap-3 mt-1">
          {myHand.length === 1 && !state.unoCalled[myPlayerId] && (
            <button
              onClick={() => onCallUno(myPlayerId)}
              className="px-4 py-1.5 rounded-full bg-uno-yellow text-ink font-display text-xs glow-pulse"
            >
              call uno!
            </button>
          )}
          {iMustPass && (
            <button
              onClick={() => onPass(myPlayerId)}
              className="px-4 py-1.5 rounded-full border border-card-stock/30 text-card-stock/80 font-display text-xs"
            >
              pass
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
