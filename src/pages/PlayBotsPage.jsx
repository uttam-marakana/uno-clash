import { Navigate, useNavigate } from "react-router-dom";
import { useResolvedPlayers } from "../hooks/useResolvedPlayers";
import LocalGamePage from "./LocalGamePage";

export default function PlayBotsPage() {
  const navigate = useNavigate();
  const players = useResolvedPlayers("bots");

  if (!players) {
    // No in-progress session and nothing passed via navigation (e.g. the
    // URL was opened directly with nothing to resume) - send back to setup.
    return <Navigate to="/bots" replace />;
  }

  return (
    <LocalGamePage
      players={players}
      mode="bots"
      onExit={() => navigate("/")}
    />
  );
}
