import { useState } from "react";

export default function LocalSetupScreen({ mode, onStart, onBack }) {
  const isBots = mode === "bots";
  const [humanName, setHumanName] = useState("You");
  const [totalPlayers, setTotalPlayers] = useState(isBots ? 4 : 3);
  const [humanNames, setHumanNames] = useState(["Player 2", "Player 3", "Player 4"]);

  function handleStart() {
    const players = [];
    if (isBots) {
      players.push({ id: "p1", name: humanName.trim() || "You", isBot: false });
      for (let i = 1; i < totalPlayers; i++) {
        players.push({ id: `bot${i}`, name: `Bot ${i}`, isBot: true });
      }
    } else {
      players.push({ id: "p1", name: humanName.trim() || "Player 1", isBot: false });
      for (let i = 1; i < totalPlayers; i++) {
        players.push({
          id: `p${i + 1}`,
          name: humanNames[i - 1]?.trim() || `Player ${i + 1}`,
          isBot: false,
        });
      }
    }
    onStart(players);
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-12 max-w-sm mx-auto">
      <h2 className="font-display text-2xl text-card-stock">
        {isBots ? "Set up vs bots" : "Set up pass and play"}
      </h2>

      <div className="w-full flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-card-stock/60 text-xs uppercase tracking-wide">Your name</span>
          <input
            value={humanName}
            onChange={(e) => setHumanName(e.target.value)}
            maxLength={16}
            className="bg-felt-2 border border-card-stock/20 rounded-md px-3 py-2 text-card-stock focus:outline-none focus:ring-2 focus:ring-uno-yellow"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-card-stock/60 text-xs uppercase tracking-wide">
            {isBots ? "Total players (incl. you)" : "Number of players"}
          </span>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setTotalPlayers(n)}
                className={`flex-1 py-2 rounded-md border text-sm font-display transition
                  ${totalPlayers === n
                    ? "bg-uno-yellow text-ink border-uno-yellow"
                    : "border-card-stock/20 text-card-stock/70 hover:border-card-stock/40"}
                `}
              >
                {n}
              </button>
            ))}
          </div>
        </label>

        {!isBots &&
          Array.from({ length: totalPlayers - 1 }).map((_, i) => (
            <label key={i} className="flex flex-col gap-1">
              <span className="text-card-stock/60 text-xs uppercase tracking-wide">
                Player {i + 2} name
              </span>
              <input
                value={humanNames[i]}
                onChange={(e) => {
                  const copy = [...humanNames];
                  copy[i] = e.target.value;
                  setHumanNames(copy);
                }}
                maxLength={16}
                className="bg-felt-2 border border-card-stock/20 rounded-md px-3 py-2 text-card-stock focus:outline-none focus:ring-2 focus:ring-uno-yellow"
              />
            </label>
          ))}
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-md border border-card-stock/20 text-card-stock/70 font-display text-sm hover:border-card-stock/40"
        >
          back
        </button>
        <button
          onClick={handleStart}
          className="flex-1 py-2.5 rounded-md bg-uno-red text-card-stock font-display text-sm hover:scale-[1.02] transition"
        >
          start game
        </button>
      </div>
    </div>
  );
}
