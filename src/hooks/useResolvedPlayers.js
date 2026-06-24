import { useLocation } from "react-router-dom";
import { loadSession } from "../lib/gameSession";

/**
 * Resolves the player roster for a /play/:mode route.
 *
 * - Fresh navigation from the setup form passes `players` via router
 *   state (location.state.players) - used first when present.
 * - A page reload loses router state entirely, so we fall back to
 *   whatever roster was saved alongside the last in-progress session for
 *   this mode (sessionStorage), if any.
 * - If neither is available, there's nothing to play - the caller should
 *   redirect back to the matching setup screen.
 */
export function useResolvedPlayers(mode) {
  const location = useLocation();
  const fromNav = location.state?.players;
  if (fromNav) return fromNav;

  const saved = loadSession(mode);
  return saved?.players ?? null;
}
