import { useNavigate } from "react-router-dom";
import LocalSetupScreen from "../components/LocalSetupScreen";

export default function BotsSetupPage() {
  const navigate = useNavigate();

  return (
    <LocalSetupScreen
      mode="bots"
      onBack={() => navigate("/")}
      onStart={(players) => navigate("/play/bots", { state: { players } })}
    />
  );
}
