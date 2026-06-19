export default function WaitingRoomScreen({ game, playerId, onStart, onLeave }) {
  if (!game) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-card-stock/60 font-mono">Loading room…</p>
      </div>
    );
  }

  const isHost = game.hostId === playerId;
  const canStart = game.seats.length >= 2;

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-12 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-card-stock/50 text-xs uppercase tracking-widest">room code</p>
        <p className="font-display text-4xl text-uno-yellow tracking-widest">{game.code}</p>
        <p className="text-card-stock/40 text-xs mt-1">share this with friends to join</p>
      </div>

      <div className="w-full rounded-xl border border-card-stock/15 bg-felt-2/60 p-4">
        <p className="font-display text-sm text-card-stock mb-3">
          Players ({game.seats.length}/4)
        </p>
        <ul className="flex flex-col gap-2">
          {game.seats.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-card-stock/80 text-sm"
            >
              <span>{s.name}</span>
              {s.id === game.hostId && (
                <span className="text-uno-yellow text-xs">host</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="w-full py-2.5 rounded-md bg-uno-red text-card-stock font-display text-sm disabled:opacity-40"
        >
          {canStart ? "start game" : "need at least 2 players"}
        </button>
      ) : (
        <p className="text-card-stock/60 text-sm">Waiting for the host to start…</p>
      )}

      <button
        onClick={onLeave}
        className="text-card-stock/50 text-sm hover:text-card-stock/80"
      >
        ← leave room
      </button>
    </div>
  );
}
