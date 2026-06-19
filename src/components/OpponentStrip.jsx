export default function OpponentStrip({ player, cardCount, isCurrentTurn, calledUno, onCatchUno }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition
        ${isCurrentTurn ? "bg-card-stock/10 ring-1 ring-uno-yellow/70" : ""}
      `}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-display text-sm text-card-stock/90 truncate max-w-[90px]">
          {player.name}
        </span>
        {player.isBot && (
          <span className="text-[10px] text-card-stock/40 uppercase tracking-wide">bot</span>
        )}
      </div>
      <div className="flex -space-x-3">
        {Array.from({ length: Math.min(cardCount, 7) }).map((_, i) => (
          <div
            key={i}
            className="w-5 h-7 rounded-sm border border-card-stock/30 bg-felt-2"
            style={{ zIndex: i }}
          />
        ))}
        {cardCount > 7 && (
          <span className="text-[10px] text-card-stock/50 ml-2 self-center">+{cardCount - 7}</span>
        )}
      </div>
      <span className="text-[11px] text-card-stock/50">{cardCount} card{cardCount === 1 ? "" : "s"}</span>

      {cardCount === 1 && !calledUno && onCatchUno && (
        <button
          onClick={onCatchUno}
          className="mt-1 text-[10px] font-display bg-uno-red text-card-stock px-2 py-0.5 rounded-full hover:scale-105 transition"
        >
          catch!
        </button>
      )}
      {cardCount === 1 && calledUno && (
        <span className="mt-1 text-[10px] font-display text-uno-yellow">UNO!</span>
      )}
    </div>
  );
}
