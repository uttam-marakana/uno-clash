import { useNavigate } from "react-router-dom";
import LocalSetupScreen from "../components/LocalSetupScreen";

export default function LocalSetupPage() {
  const navigate = useNavigate();

  return (
    <LocalSetupScreen
      mode="local"
      onBack={() => navigate("/")}
      onStart={(players) => navigate("/play/local", { state: { players } })}
    />
  );
}
