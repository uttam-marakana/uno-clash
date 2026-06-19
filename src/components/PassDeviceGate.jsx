export default function PassDeviceGate({ player, onReady }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/95">
      <div className="flex flex-col items-center gap-5 text-center px-6">
        <p className="text-card-stock/50 text-sm">Pass the device to</p>
        <p className="font-display text-3xl text-uno-yellow">{player.name}</p>
        <button
          onClick={onReady}
          className="px-6 py-2.5 rounded-md bg-uno-red text-card-stock font-display text-sm"
        >
          I'm ready
        </button>
      </div>
    </div>
  );
}
