const COLOR_FOR = (secondsLeft, total) => {
  const ratio = secondsLeft / total;
  if (ratio > 0.6) return { text: "text-timer-safe", ring: "stroke-timer-safe" };
  if (ratio > 0.3) return { text: "text-timer-warn", ring: "stroke-timer-warn" };
  return { text: "text-timer-danger", ring: "stroke-timer-danger" };
};

export default function TurnTimer({ secondsLeft, total }) {
  const ratio = Math.max(0, Math.min(1, secondsLeft / total));
  const { text } = COLOR_FOR(secondsLeft, total);
  const urgent = secondsLeft <= 2;

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${urgent ? "timer-tick" : ""}`}
      role="timer"
      aria-label={`${secondsLeft} seconds left`}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0 -rotate-90">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-card-stock/15"
          strokeWidth="3"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          className={text}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className={`font-display text-xs sm:text-sm tabular-nums ${text}`}>
        {secondsLeft}s
      </span>
    </div>
  );
}
