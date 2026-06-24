// Persists local (pass-and-play) and vs-bots game sessions to
// sessionStorage, so reloading the page mid-game restores the actual
// hand/score/turn state instead of dropping back to a fresh deal.
//
// sessionStorage (not localStorage) is deliberate: a finished or
// abandoned game shouldn't resurrect itself in a brand new tab days
// later, but it should survive an accidental refresh in the same tab.

const KEY_PREFIX = "uno-session:";

function keyFor(mode) {
  return `${KEY_PREFIX}${mode}`;
}

/**
 * Save the full session (the player roster used to create the game, plus
 * the live game state) for a given mode ("local" | "bots").
 */
export function saveSession(mode, players, gameState) {
  try {
    sessionStorage.setItem(
      keyFor(mode),
      JSON.stringify({ players, gameState, savedAt: Date.now() })
    );
  } catch {
    // Storage full or unavailable (private browsing, etc.) - the game
    // still works, it just won't survive a reload. Not worth surfacing
    // to the player as an error.
  }
}

/**
 * Load a previously saved session for a mode, or null if there isn't one
 * (or it failed to parse, e.g. corrupted/old-shape data).
 */
export function loadSession(mode) {
  try {
    const raw = sessionStorage.getItem(keyFor(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.players || !parsed?.gameState) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(mode) {
  try {
    sessionStorage.removeItem(keyFor(mode));
  } catch {
    // Ignore - nothing meaningful to recover from here.
  }
}
