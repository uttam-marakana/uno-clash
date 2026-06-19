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
  return (
    <div className="flex justify-center -space-x-3 sm:-space-x-4 px-2 overflow-x-auto py-2">
      {hand.map((card, i) => {
        const isLastCard = i === hand.length - 1;
        const onlyLastPlayable = state.turnPlayedCard === "drew";
        const legal =
          isCurrentPlayer && (!onlyLastPlayable || isLastCard)
            ? isLegalPlay(state, card)
            : false;
        return (
          <Card
            key={`${card}-${i}`}
            card={card}
            faceDown={faceDown}
            size={size}
            selected={selectedCard === `${card}-${i}`}
            disabled={isCurrentPlayer ? !legal : true}
            onClick={
              isCurrentPlayer && !faceDown
                ? () => onSelectCard(card, `${card}-${i}`)
                : undefined
            }
            style={{ zIndex: i }}
          />
        );
      })}
    </div>
  );
}
