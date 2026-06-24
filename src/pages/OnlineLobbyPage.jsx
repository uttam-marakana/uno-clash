import { useNavigate } from "react-router-dom";
import { usePlayerId } from "../hooks/useOnlineGame";
import OnlineLobbyScreen from "../components/OnlineLobbyScreen";

export default function OnlineLobbyPage() {
  const navigate = useNavigate();
  const { uid, error: authError } = usePlayerId();

  if (authError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
        <p className="text-uno-red text-sm">
          Couldn't connect to the online service. Check your Firebase config.
        </p>
        <button onClick={() => navigate("/")} className="text-card-stock/60 text-sm underline">
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

  return (
    <OnlineLobbyScreen
      playerId={uid}
      onBack={() => navigate("/")}
      onEnterRoom={(code) => navigate(`/play/online/${code}`)}
    />
  );
}
