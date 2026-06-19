import { useState } from "react";
import { usePlayerId, useOnlineGame } from "../hooks/useOnlineGame";
import OnlineLobbyScreen from "../components/OnlineLobbyScreen";
import WaitingRoomScreen from "../components/WaitingRoomScreen";
import GameTable from "../components/GameTable";

export default function OnlineGamePage({ onExit }) {
  const { uid, error: authError } = usePlayerId();
  const [code, setCode] = useState(null);

  const online = useOnlineGame(code);

  if (authError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
        <p className="text-uno-red text-sm">
          Couldn't connect to the online service. Check your Firebase config.
        </p>
        <button onClick={onExit} className="text-card-stock/60 text-sm underline">
          back to menu
        </button>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-card-stock/60 font-mono">Connecting…</p>
      </div>
    );
  }

  if (!code) {
    return <OnlineLobbyScreen playerId={uid} onBack={onExit} onEnterRoom={setCode} />;
  }

  if (!online.game || online.game.status === "lobby") {
    return (
      <>
        <WaitingRoomScreen
          game={online.game}
          playerId={uid}
          onStart={online.start}
          onLeave={() => {
            online.leave(uid);
            setCode(null);
          }}
        />
        {online.error && (
          <p className="text-uno-red text-sm text-center -mt-4">{online.error.message}</p>
        )}
      </>
    );
  }

  return (
    <>
      <GameTable
        state={online.game}
        myPlayerId={uid}
        onPlay={online.play}
        onDraw={online.draw}
        onPass={online.pass}
        onCallUno={online.callUno}
        onCatchFailure={online.catchFailure}
        onRematch={online.rematch}
        onExit={() => {
          online.leave(uid);
          setCode(null);
        }}
      />
      {online.error && (
        <p className="text-uno-red text-sm text-center fixed bottom-4 inset-x-0">
          {online.error.message}
        </p>
      )}
    </>
  );
}
