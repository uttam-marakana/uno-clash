import { useNavigate } from "react-router-dom";
import HomeScreen from "../components/HomeScreen";

const ROUTE_FOR_MODE = {
  local: "/local",
  bots: "/bots",
  online: "/online",
};

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <HomeScreen
      onChooseMode={(mode) => navigate(ROUTE_FOR_MODE[mode] ?? "/")}
    />
  );
}
