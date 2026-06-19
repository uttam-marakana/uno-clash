import { useState } from "react";
import HomeScreen from "./components/HomeScreen";
import LocalSetupScreen from "./components/LocalSetupScreen";
import LocalGamePage from "./pages/LocalGamePage";
import OnlineGamePage from "./pages/OnlineGamePage";
import { Analytics } from "@vercel/analytics/react"

export default function App() {
  const [screen, setScreen] = useState("home"); // home | setup | local-game | online
  const [setupMode, setSetupMode] = useState(null); // "local" | "bots"
  const [localPlayers, setLocalPlayers] = useState(null);

  function handleChooseMode(mode) {
    if (mode === "online") {
      setScreen("online");
    } else {
      setSetupMode(mode);
      setScreen("setup");
    }
  }

  function handleStartLocal(players) {
    setLocalPlayers(players);
    setScreen("local-game");
  }

  function handleExit() {
    setLocalPlayers(null);
    setSetupMode(null);
    setScreen("home");
  }

  return (
    <div className="felt-texture min-h-screen">
        <Analytics />
      {screen === "home" && <HomeScreen onChooseMode={handleChooseMode} />}

      {screen === "setup" && (
        <LocalSetupScreen
          mode={setupMode}
          onStart={handleStartLocal}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "local-game" && localPlayers && (
        <LocalGamePage players={localPlayers} onExit={handleExit} />
      )}

      {screen === "online" && <OnlineGamePage onExit={handleExit} />}
    </div>
  );
}
