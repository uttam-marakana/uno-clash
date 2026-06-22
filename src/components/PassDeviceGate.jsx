export default function PassDeviceGate({ player, onReady }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/95 fade-in">
      <div className="flex flex-col items-center gap-4 sm:gap-5 text-center px-6">
        <p className="text-card-stock/50 text-xs sm:text-sm">Pass the device to</p>
        <p className="font-display text-2xl xs:text-3xl text-uno-yellow">{player.name}</p>
        <button
          onClick={onReady}
          className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-md bg-uno-red text-card-stock font-display text-xs sm:text-sm"
        >
          I'm ready
        </button>
      </div>
    </div>
  );
}
