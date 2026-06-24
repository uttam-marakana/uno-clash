import { Navigate, useNavigate } from "react-router-dom";
import { useResolvedPlayers } from "../hooks/useResolvedPlayers";
import LocalGamePage from "./LocalGamePage";

export default function PlayLocalPage() {
  const navigate = useNavigate();
  const players = useResolvedPlayers("local");

  if (!players) {
    return <Navigate to="/local" replace />;
  }

  return (
    <LocalGamePage
      players={players}
      mode="local"
      onExit={() => navigate("/")}
    />
  );
}
