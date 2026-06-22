import { useState } from "react";
import Hand from "./Hand";
import TableCenter, { ColorPickerModal } from "./TableCenter";
import OpponentStrip from "./OpponentStrip";
import TurnTimer from "./TurnTimer";
import { isWild } from "../game/cards";
import { hasAnyLegalMove, TURN_TIMER_SECONDS } from "../hooks/useLocalGame";

export default function GameTable({
  state,
  myPlayerId,
  secondsLeft = TURN_TIMER_SECONDS,
  onPlay,
  onDraw,
  onPass,
  onCallUno,
  onCatchFailure,
  onRematch,
  onExit,
}) {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [awaitingColorChoice, setAwaitingColorChoice] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  if (!state) return null;

  const myHand = state.hands[myPlayerId] || [];
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === myPlayerId;
  const others = state.players.filter((p) => p.id !== myPlayerId);

  const selectedIsWild = selectedCard ? isWild(selectedCard) : false;

  function clearSelection() {
    setSelectedCardId(null);
    setSelectedCard(null);
    setAwaitingColorChoice(false);
  }

  function handleSelectCard(card, cardId) {
    if (!isMyTurn || awaitingColorChoice) return;

    if (isWild(card)) {
      // Tapping an already-selected wild deselects it instead of
      // re-opening the color picker; tapping a different card (wild or
      // not) swaps the selection.
      if (selectedCardId === cardId) {
        clearSelection();
      } else {
        setSelectedCardId(cardId);
        setSelectedCard(card);
      }
      return;
    }

    // Non-wild cards still play instantly on tap, matching prior behavior.
    clearSelection();
    onPlay(myPlayerId, card);
  }

  function handleConfirmWild() {
    setAwaitingColorChoice(true);
  }

  function handleDeselectWild() {
    clearSelection();
  }

  function handleChooseColor(color) {
    if (selectedCard) {
      onPlay(myPlayerId, selectedCard, color);
      clearSelection();
    }
  }

  const iCanDraw =
    isMyTurn && state.turnPlayedCard !== "drew" && state.status === "playing";
  const iMustPass = isMyTurn && state.turnPlayedCard === "drew";
  const iHaveNoMoves =
    isMyTurn && state.turnPlayedCard !== "drew" && !hasAnyLegalMove(state, myPlayerId);

  const roundOver = state.status === "round-over";
  const winner = roundOver ? state.players.find((p) => p.id === state.winnerId) : null;
  const myMissedTurns = state.missedTurns?.[myPlayerId] || 0;
  const iAmEliminated = (state.eliminatedIds || []).includes(myPlayerId);

  const recentlyEliminated =
    state.eliminatedIds && state.eliminatedIds.length > 0
      ? state.players.find((p) => p.id === state.eliminatedIds[state.eliminatedIds.length - 1])
      : null;

  function handleExitClick() {
    if (confirmExit) {
      onExit();
    } else {
      setConfirmExit(true);
    }
  }

  return (
    <div className="relative max-w-3xl mx-auto px-3 py-4 sm:py-8 flex flex-col gap-4 sm:gap-6 min-h-screen">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleExitClick}
          onBlur={() => setConfirmExit(false)}
          className={`shrink-0 rounded-md px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-display transition
            ${confirmExit
              ? "bg-uno-red text-card-stock"
              : "border border-card-stock/25 text-card-stock/70 hover:border-card-stock/50 hover:text-card-stock"}
          `}
        >
          {confirmExit ? "tap again to quit" : "✕ exit"}
        </button>

        {isMyTurn && state.status === "playing" && (
          <TurnTimer secondsLeft={secondsLeft} total={TURN_TIMER_SECONDS} />
        )}
      </div>

      {recentlyEliminated && state.status === "playing" && (
        <p className="text-center text-xs sm:text-sm font-mono text-uno-red/90 -mt-1 fade-in">
          {recentlyEliminated.name} was eliminated after missing 3 turns in a row
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {others.map((p) => (
          <OpponentStrip
            key={p.id}
            player={p}
            cardCount={state.hands[p.id]?.length ?? 0}
            isCurrentTurn={state.players[state.currentPlayerIndex]?.id === p.id}
            calledUno={!!state.unoCalled[p.id]}
            eliminated={(state.eliminatedIds || []).includes(p.id)}
            missedTurns={state.missedTurns?.[p.id] || 0}
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

        {awaitingColorChoice && <ColorPickerModal onChoose={handleChooseColor} />}

        {roundOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/80 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <p className="font-display text-xl sm:text-2xl text-uno-yellow">
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

        {!roundOver && iAmEliminated && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/80 backdrop-blur-sm rounded-xl fade-in">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <p className="font-display text-lg sm:text-xl text-uno-red">
                You were eliminated
              </p>
              <p className="text-card-stock/60 text-xs sm:text-sm max-w-xs">
                You missed 3 turns in a row. The remaining players are still
                playing it out below.
              </p>
              <button
                onClick={onExit}
                className="mt-2 px-5 py-2 rounded-md border border-card-stock/30 text-card-stock/80 font-display text-sm"
              >
                back to menu
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-card-stock/50 text-[11px] sm:text-xs font-mono h-4 text-center px-4">
          {isMyTurn
            ? selectedIsWild && !awaitingColorChoice
              ? "Tap again to deselect, or confirm to choose a color"
              : iMustPass
              ? "Play the card you drew, or pass"
              : iHaveNoMoves
              ? "No legal moves — draw a card"
              : "Your turn"
            : `Waiting for ${state.players[state.currentPlayerIndex]?.name}…`}
        </p>

        {myMissedTurns > 0 && (
          <p className="text-timer-warn text-[10px] sm:text-xs font-display -mt-1">
            ⚠ {myMissedTurns}/3 missed turns — one more miss and you're eliminated
          </p>
        )}

        <Hand
          hand={myHand}
          state={state}
          isCurrentPlayer={isMyTurn}
          selectedCard={selectedIsWild ? selectedCardId : null}
          onSelectCard={handleSelectCard}
          size="lg"
        />

        <div className="flex gap-2 sm:gap-3 mt-1 flex-wrap justify-center">
          {selectedIsWild && !awaitingColorChoice && (
            <>
              <button
                onClick={handleConfirmWild}
                className="px-3 sm:px-4 py-1.5 rounded-full bg-uno-green text-card-stock font-display text-[11px] sm:text-xs"
              >
                confirm card
              </button>
              <button
                onClick={handleDeselectWild}
                className="px-3 sm:px-4 py-1.5 rounded-full border border-card-stock/30 text-card-stock/80 font-display text-[11px] sm:text-xs"
              >
                deselect
              </button>
            </>
          )}

          {myHand.length === 1 && !state.unoCalled[myPlayerId] && (
            <button
              onClick={() => onCallUno(myPlayerId)}
              className="px-3 sm:px-4 py-1.5 rounded-full bg-uno-yellow text-ink font-display text-[11px] sm:text-xs glow-pulse"
            >
              call uno!
            </button>
          )}
          {iMustPass && (
            <button
              onClick={() => onPass(myPlayerId)}
              className="px-3 sm:px-4 py-1.5 rounded-full border border-card-stock/30 text-card-stock/80 font-display text-[11px] sm:text-xs"
            >
              pass
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
