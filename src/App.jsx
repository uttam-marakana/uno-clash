import { Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import HomePage from "./pages/HomePage";
import BotsSetupPage from "./pages/BotsSetupPage";
import LocalSetupPage from "./pages/LocalSetupPage";
import PlayBotsPage from "./pages/PlayBotsPage";
import PlayLocalPage from "./pages/PlayLocalPage";
import OnlineLobbyPage from "./pages/OnlineLobbyPage";
import PlayOnlinePage from "./pages/PlayOnlinePage";

export default function App() {
  return (
    <div className="felt-texture min-h-screen">
      <Analytics />
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/bots" element={<BotsSetupPage />} />
        <Route path="/local" element={<LocalSetupPage />} />
        <Route path="/online" element={<OnlineLobbyPage />} />

        <Route path="/play/bots" element={<PlayBotsPage />} />
        <Route path="/play/local" element={<PlayLocalPage />} />
        <Route path="/play/online/:code" element={<PlayOnlinePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
