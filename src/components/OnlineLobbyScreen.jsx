import { useState } from "react";
import { usePublicLobbies, createRoom, joinRoom } from "../hooks/useOnlineGame";

export default function OnlineLobbyScreen({ playerId, onBack, onEnterRoom }) {
  const [name, setName] = useState("Player");
  const [joinCode, setJoinCode] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { lobbies, error: lobbyError } = usePublicLobbies();

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom({
        hostId: playerId,
        hostName: name.trim() || "Host",
        isPublic,
      });
      onEnterRoom(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(codeOverride) {
    const code = (codeOverride || joinCode).trim();
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const finalCode = await joinRoom({
        code,
        playerId,
        playerName: name.trim() || "Player",
      });
      onEnterRoom(finalCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-12 max-w-md mx-auto w-full">
      <h2 className="font-display text-2xl text-card-stock">Play online</h2>

      <label className="flex flex-col gap-1 w-full max-w-xs">
        <span className="text-card-stock/60 text-xs uppercase tracking-wide">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          className="bg-felt-2 border border-card-stock/20 rounded-md px-3 py-2 text-card-stock focus:outline-none focus:ring-2 focus:ring-uno-yellow"
        />
      </label>

      <div className="w-full max-w-xs rounded-xl border border-card-stock/15 bg-felt-2/60 p-4 flex flex-col gap-3">
        <p className="font-display text-sm text-card-stock">Create a room</p>
        <label className="flex items-center gap-2 text-sm text-card-stock/70">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          List in public lobby
        </label>
        <button
          onClick={handleCreate}
          disabled={busy}
          className="py-2 rounded-md bg-uno-green text-card-stock font-display text-sm disabled:opacity-50"
        >
          create room
        </button>
      </div>

      <div className="w-full max-w-xs rounded-xl border border-card-stock/15 bg-felt-2/60 p-4 flex flex-col gap-3">
        <p className="font-display text-sm text-card-stock">Join with a code</p>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="e.g. K7XQP"
          maxLength={5}
          className="bg-felt-2 border border-card-stock/20 rounded-md px-3 py-2 text-card-stock tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-uno-yellow"
        />
        <button
          onClick={() => handleJoin()}
          disabled={busy || !joinCode.trim()}
          className="py-2 rounded-md bg-uno-blue text-card-stock font-display text-sm disabled:opacity-50"
        >
          join room
        </button>
      </div>

      {error && <p className="text-uno-red text-sm">{error}</p>}

      <div className="w-full max-w-xs">
        <p className="font-display text-sm text-card-stock/80 mb-2">Public games</p>
        {lobbyError && (
          <p className="text-card-stock/50 text-xs">Couldn't load public lobbies.</p>
        )}
        {lobbies.length === 0 ? (
          <p className="text-card-stock/40 text-sm">No open public games right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lobbies.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between bg-felt-2/60 border border-card-stock/15 rounded-md px-3 py-2"
              >
                <div>
                  <p className="text-card-stock text-sm">{l.hostId ? l.seats?.[0]?.name : "Room"}'s game</p>
                  <p className="text-card-stock/40 text-xs">{l.seats?.length ?? 0}/4 players</p>
                </div>
                <button
                  onClick={() => handleJoin(l.id)}
                  disabled={busy}
                  className="text-xs font-display bg-uno-yellow text-ink px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  join
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onBack}
        className="text-card-stock/50 text-sm hover:text-card-stock/80"
      >
        ← back
      </button>
    </div>
  );
}
