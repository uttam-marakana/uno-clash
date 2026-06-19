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
    <div className="flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-card-stock/40 bg-felt-2 flex flex-col items-center justify-center transition
          ${canDraw ? "cursor-pointer hover:-translate-y-1 glow-pulse" : "opacity-60 cursor-not-allowed"}
        `}
        aria-label="Draw a card"
      >
        <span className="font-display text-uno-yellow text-[10px] tracking-widest opacity-80">
          DRAW
        </span>
        <span className="text-card-stock/50 text-xs mt-1">{deckCount} left</span>
      </button>

      <div className="relative">
        <div
          className={`rounded-lg ring-4 ${COLOR_RING[state.currentColor] || "ring-card-stock/40"}`}
        >
          <Card card={top} size="lg" />
        </div>
        {state.pendingDraw > 0 && (
          <span className="absolute -top-2 -right-2 bg-uno-red text-card-stock text-xs font-display font-bold rounded-full w-7 h-7 flex items-center justify-center pop">
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/70 backdrop-blur-sm rounded-xl">
      <div className="bg-felt-2 border border-card-stock/20 rounded-xl p-5 flex flex-col items-center gap-3">
        <p className="font-display text-sm text-card-stock/90">Choose a color</p>
        <div className="grid grid-cols-2 gap-3">
          {colors.map((c) => (
            <button
              key={c.code}
              onClick={() => onChoose(c.code)}
              className={`${c.bg} w-16 h-16 rounded-lg border-2 border-card-stock/60 hover:scale-105 transition capitalize text-card-stock text-xs font-display font-bold flex items-center justify-center`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
