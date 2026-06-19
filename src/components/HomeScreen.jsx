const MODES = [
  {
    id: "local",
    title: "Pass and play",
    desc: "2-4 players, one device, take turns passing it around.",
  },
  {
    id: "bots",
    title: "Vs bots",
    desc: "You against 1-3 computer opponents.",
  },
  {
    id: "online",
    title: "Play online",
    desc: "Join a room with a code, or browse open public games.",
  },
];

export default function HomeScreen({ onChooseMode }) {
  return (
    <div className="flex flex-col items-center gap-8 px-4 py-12 sm:py-16">
      <div className="text-center">
        <h1 className="font-display text-5xl sm:text-6xl font-bold text-card-stock tracking-tight">
          <span className="text-uno-red">U</span>
          <span className="text-uno-yellow">N</span>
          <span className="text-uno-green">O</span>
        </h1>
        <p className="text-card-stock/60 mt-2 text-sm">match the color, dodge the draws</p>
      </div>

      <div className="grid gap-3 w-full max-w-sm">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onChooseMode(m.id)}
            className={`text-left rounded-xl border border-card-stock/15 bg-felt-2/60 px-5 py-4 transition
              hover:bg-felt-2 hover:border-uno-yellow/50 hover:-translate-y-0.5
            `}
          >
            <p className="font-display text-card-stock text-lg">{m.title}</p>
            <p className="text-card-stock/55 text-sm mt-1">{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
