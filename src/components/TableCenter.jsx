import Card from "./Card";
import { COLOR_NAMES } from "../game/cards";

const COLOR_RING = {
  R: "ring-uno-red",
  Y: "ring-uno-yellow",
  G: "ring-uno-green",
  B: "ring-uno-blue",
};

export default function TableCenter({ state, onDraw, canDraw, deckCount }) {
  const top = state.discard[state.discard.length - 1];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6">
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        className={`relative w-13 h-19 xs:w-14 xs:h-20 sm:w-20 sm:h-28 md:w-24 md:h-[8.5rem] rounded-lg border-2 border-card-stock/40 bg-felt-2 flex flex-col items-center justify-center transition
          ${canDraw ? "cursor-pointer hover:-translate-y-1 glow-pulse" : "opacity-60 cursor-not-allowed"}
        `}
        aria-label="Draw a card"
      >
        <span className="font-display text-uno-yellow text-[8px] sm:text-[10px] tracking-widest opacity-80">
          DRAW
        </span>
        <span className="text-card-stock/50 text-[10px] sm:text-xs mt-0.5 sm:mt-1">{deckCount} left</span>
      </button>

      <div className="relative">
        <div
          className={`rounded-lg sm:rounded-xl ring-2 sm:ring-4 ${COLOR_RING[state.currentColor] || "ring-card-stock/40"}`}
        >
          <Card card={top} size="lg" />
        </div>
        {state.pendingDraw > 0 && (
          <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-uno-red text-card-stock text-[10px] sm:text-xs font-display font-bold rounded-full w-5.5 h-5.5 sm:w-7 sm:h-7 flex items-center justify-center pop">
            +{state.pendingDraw}
          </span>
        )}
      </div>
    </div>
  );
}

export function ColorPickerModal({ onChoose }) {
  const colors = [
    { code: "R", label: COLOR_NAMES.R, bg: "bg-uno-red" },
    { code: "Y", label: COLOR_NAMES.Y, bg: "bg-uno-yellow" },
    { code: "G", label: COLOR_NAMES.G, bg: "bg-uno-green" },
    { code: "B", label: COLOR_NAMES.B, bg: "bg-uno-blue" },
  ];

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/70 backdrop-blur-sm rounded-xl fade-in">
      <div className="bg-felt-2 border border-card-stock/20 rounded-xl p-4 sm:p-5 flex flex-col items-center gap-2.5 sm:gap-3">
        <p className="font-display text-xs sm:text-sm text-card-stock/90">Choose a color</p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {colors.map((c) => (
            <button
              key={c.code}
              onClick={() => onChoose(c.code)}
              className={`${c.bg} w-13 h-13 sm:w-16 sm:h-16 rounded-lg border-2 border-card-stock/60 hover:scale-105 transition capitalize text-card-stock text-[10px] sm:text-xs font-display font-bold flex items-center justify-center`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
