import Card from "./Card";
import { isLegalPlay } from "../game/rules";

export default function Hand({
  hand,
  state,
  isCurrentPlayer,
  faceDown = false,
  selectedCard,
  onSelectCard,
  size = "md",
}) {
  const overlap =
    hand.length <= 5 ? 0 : hand.length <= 8 ? 24 : hand.length <= 12 ? 40 : 55;

  return (
    <div className="flex justify-center px-2 py-2 overflow-x-auto flex-wrap gap-6.75">
    {/* <div className="flex justify-center px-2 py-2 overflow-x-auto"> */} {/* -- IGNORE  gap-6.75 [  gap: 15px 18px;] -- */}
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
            className="shrink-0 transition-all duration-200"
            style={{
              // marginLeft: i === 0 ? 0 : -overlap,
              zIndex: isSelected ? 999 : i,
              transform: isSelected ? "translateY(-16px)" : "translateY(0)",
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
