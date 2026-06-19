import { cardColor, cardValue, isWild, ACTION, WILD_DRAW4 } from "../game/cards";

const COLOR_BG = {
  R: "bg-uno-red",
  Y: "bg-uno-yellow",
  G: "bg-uno-green",
  B: "bg-uno-blue",
};

function FaceContent({ card }) {
  const value = cardValue(card);
  if (value === ACTION.SKIP) {
    return <span className="text-2xl">⊘</span>;
  }
  if (value === ACTION.REVERSE) {
    return <span className="text-2xl">⇄</span>;
  }
  if (value === ACTION.DRAW2) {
    return <span className="text-lg font-display font-bold">+2</span>;
  }
  return <span className="text-2xl font-display font-bold">{value}</span>;
}

export default function Card({
  card,
  faceDown = false,
  size = "md",
  selected = false,
  disabled = false,
  onClick,
  style,
}) {
  const sizes = {
    sm: "w-10 h-14 text-xs",
    md: "w-14 h-20 sm:w-16 sm:h-24",
    lg: "w-20 h-28 sm:w-24 sm:h-32",
  };

  if (faceDown) {
    return (
      <div
        className={`${sizes[size]} rounded-lg border-2 border-card-stock/30 bg-felt-2 flex items-center justify-center shrink-0 deal-in`}
        style={style}
        aria-hidden="true"
      >
        <span className="font-display text-uno-yellow text-[10px] tracking-widest -rotate-12 opacity-70">
          UNO
        </span>
      </div>
    );
  }

  const wild = isWild(card);
  const bg = wild
    ? "bg-uno-black"
    : COLOR_BG[cardColor(card)];
  const textColor = wild ? "text-card-stock" : "text-card-stock";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${sizes[size]} relative shrink-0 rounded-lg border-2 border-card-stock ${bg} flex items-center justify-center deal-in transition-transform
        ${onClick && !disabled ? "cursor-pointer hover:-translate-y-2" : ""}
        ${selected ? "-translate-y-3 ring-2 ring-uno-yellow" : ""}
        ${disabled && onClick ? "opacity-50 cursor-not-allowed" : ""}
      `}
      aria-label={card}
    >
      <span className={`${textColor} drop-shadow-sm`}>
        {card === "WILD" ? (
          <WildGlyph />
        ) : card === WILD_DRAW4 ? (
          <span className="text-base font-display font-bold">+4</span>
        ) : (
          <FaceContent card={card} />
        )}
      </span>
      {!wild && (
        <span
          className={`absolute top-1 left-1.5 text-[9px] font-display font-bold ${textColor} opacity-80`}
        >
          {cardValue(card) === ACTION.SKIP
            ? "⊘"
            : cardValue(card) === ACTION.REVERSE
            ? "⇄"
            : cardValue(card) === ACTION.DRAW2
            ? "+2"
            : cardValue(card)}
        </span>
      )}
    </button>
  );
}

function WildGlyph() {
  return (
    <span className="grid grid-cols-2 gap-0.5 w-5 h-5">
      <span className="bg-uno-red rounded-sm" />
      <span className="bg-uno-blue rounded-sm" />
      <span className="bg-uno-yellow rounded-sm" />
      <span className="bg-uno-green rounded-sm" />
    </span>
  );
}
