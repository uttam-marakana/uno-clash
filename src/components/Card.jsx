import { cardColor, cardValue, isWild, ACTION, WILD_DRAW4 } from "../game/cards";

const COLOR_BG = {
  R: "bg-uno-red",
  Y: "bg-uno-yellow",
  G: "bg-uno-green",
  B: "bg-uno-blue",
};

// Fixed pixel sizes per size keyword and breakpoint - cards keep a steady
// 2:3 aspect ratio and grow gradually across breakpoints rather than
// jumping at a single sm: boundary, so they read clearly on small phones
// through to desktop without ever overflowing their grid cell.
const SIZE_CLASSES = {
  sm: "w-9 h-13 xs:w-10 xs:h-14 sm:w-11 sm:h-16",
  md: "w-12 h-17 xs:w-13 xs:h-19 sm:w-14 sm:h-20 md:w-16 md:h-23 lg:w-[4.25rem] lg:h-[6.1rem]",
  lg: "w-16 h-23 xs:w-[4.5rem] xs:h-[6.5rem] sm:w-20 sm:h-28 md:w-24 md:h-[8.5rem]",
};

const FACE_TEXT = {
  sm: "text-[10px]",
  md: "text-sm xs:text-base sm:text-lg md:text-xl",
  lg: "text-lg xs:text-xl sm:text-2xl md:text-3xl",
};

const CORNER_TEXT = {
  sm: "text-[6px]",
  md: "text-[7px] sm:text-[8px] md:text-[9px]",
  lg: "text-[8px] sm:text-[9px] md:text-[10px]",
};

function FaceContent({ card, textSize }) {
  const value = cardValue(card);
  if (value === ACTION.SKIP) {
    return <span className={textSize}>⊘</span>;
  }
  if (value === ACTION.REVERSE) {
    return <span className={textSize}>⇄</span>;
  }
  if (value === ACTION.DRAW2) {
    return <span className={`${textSize} font-display font-bold`}>+2</span>;
  }
  return <span className={`${textSize} font-display font-bold`}>{value}</span>;
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
  const sizeClass = SIZE_CLASSES[size];
  const faceText = FACE_TEXT[size];
  const cornerText = CORNER_TEXT[size];

  if (faceDown) {
    return (
      <div
        className={`${sizeClass} rounded-lg border-2 border-card-stock/30 bg-felt-2 flex items-center justify-center shrink-0 deal-in`}
        style={style}
        aria-hidden="true"
      >
        <span className="font-display text-uno-yellow text-[7px] xs:text-[8px] sm:text-[10px] tracking-widest -rotate-12 opacity-70">
          UNO
        </span>
      </div>
    );
  }

  const wild = isWild(card);
  const bg = wild ? "bg-uno-black" : COLOR_BG[cardColor(card)];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${sizeClass} relative shrink-0 rounded-lg sm:rounded-xl border-2 border-card-stock ${bg} flex items-center justify-center deal-in transition-transform
        ${onClick && !disabled ? "cursor-pointer hover:-translate-y-2" : ""}
        ${selected ? "-translate-y-3 ring-2 sm:ring-3 ring-accent" : ""}
        ${disabled && onClick ? "opacity-50 cursor-not-allowed" : ""}
      `}
      aria-label={card}
      aria-pressed={selected}
    >
      <span className="text-card-stock drop-shadow-sm">
        {card === "WILD" ? (
          <WildGlyph size={size} />
        ) : card === WILD_DRAW4 ? (
          <span className={`${faceText} font-display font-bold`}>+4</span>
        ) : (
          <FaceContent card={card} textSize={faceText} />
        )}
      </span>
      {!wild && (
        <span
          className={`absolute top-0.5 left-1 sm:top-1 sm:left-1.5 ${cornerText} font-display font-bold text-card-stock opacity-80`}
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

function WildGlyph({ size }) {
  const glyphSize = size === "lg" ? "w-6 h-6 sm:w-8 sm:h-8" : "w-4 h-4 sm:w-5 sm:h-5";
  return (
    <span className={`grid grid-cols-2 gap-0.5 ${glyphSize}`}>
      <span className="bg-uno-red rounded-sm" />
      <span className="bg-uno-blue rounded-sm" />
      <span className="bg-uno-yellow rounded-sm" />
      <span className="bg-uno-green rounded-sm" />
    </span>
  );
}
