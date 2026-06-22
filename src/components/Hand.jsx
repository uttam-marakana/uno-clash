import Card from "./Card";
import { isLegalPlay } from "../game/rules";

// Responsive column counts for the hand grid at each breakpoint - tuned so
// a full starting hand (7 cards) fits on one or two rows on every screen
// size, and a swollen hand (10-15+ cards after forced draws) still lays
// out in a clean, evenly-spaced grid instead of overflowing or wrapping
// unpredictably.
const GRID_COLS =
  "grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7";

export default function Hand({
  hand,
  state,
  isCurrentPlayer,
  faceDown = false,
  selectedCard,
  onSelectCard,
  size = "md",
}) {
  return (
    <div
      className={`grid ${GRID_COLS} gap-1.5 sm:gap-2 md:gap-2.5 justify-center w-full max-w-full px-2 py-2 place-items-center`}
    >
      {hand.map((card, i) => {
        const isLastCard = i === hand.length - 1;
        const onlyLastPlayable = state.turnPlayedCard === "drew";

        const legal =
          isCurrentPlayer && (!onlyLastPlayable || isLastCard)
            ? isLegalPlay(state, card)
            : false;

        const cardId = `${card}-${i}`;
        const isSelected = selectedCard === cardId;

        return (
          <div
            key={cardId}
            className="transition-all duration-200"
            style={{
              zIndex: isSelected ? 999 : i,
              transform: isSelected ? "translateY(-12px)" : "translateY(0)",
            }}
          >
            <Card
              card={card}
              faceDown={faceDown}
              size={size}
              selected={isSelected}
              disabled={isCurrentPlayer ? !legal : true}
              onClick={
                isCurrentPlayer && !faceDown
                  ? () => onSelectCard(card, cardId)
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
