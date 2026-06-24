# Uno

A web version of Uno built with React, Vite, and Tailwind CSS. Supports
three ways to play:

- **Pass and play** — 2-4 humans sharing one device, with a "pass the
  device" gate between turns so hands stay private.
- **Vs bots** — you against 1-3 simple AI opponents.
- **Online** — real multiplayer over Firebase Firestore, joinable by room
  code or from a public lobby list.

## Stack

- React 19 + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Firebase: Firestore (game state) + Anonymous Auth (stable player id per
  browser session, no account needed)

## Getting started

```bash
npm install
npm run dev
```

Local pass-and-play and vs-bots modes work immediately with no setup.
Online mode needs your own Firebase project — see below.

## Connecting Firebase (for online play)

1. Create a project at https://console.firebase.google.com
2. Enable **Firestore Database** (any region; start in test mode while
   developing).
3. Enable **Authentication → Sign-in method → Anonymous**.
4. In Project settings → General → Your apps, register a web app and copy
   the config object into `src/lib/firebase.js`, replacing the
   `YOUR_...` placeholders.
5. (Recommended before sharing publicly) Deploy the security rules in
   `firestore.rules` — see the comments in that file for the security
   model and its limits. The short version: client-side Firestore
   transactions stop accidental race conditions between honest players,
   but a determined user could bypass them by calling Firestore directly.
   For real cheat-resistance, move move-validation into a Cloud Function
   using the same `src/game/rules.js` logic server-side.

Until Firebase is configured, choosing "Play online" will show a
connection error — local modes are unaffected.

## How the game logic is organized

```
src/
  game/
    cards.js        card codes, deck construction, labels/scoring
    rules.js        pure state-transition functions: play, draw, pass,
                     call uno, catch a missed uno call. Single source of
                     truth for legality - used by BOTH local play and the
                     Firestore transactions for online play, so the rules
                     can't drift between modes.
  bots/
    botAI.js         simple bot decision logic (built on rules.js)
  hooks/
    useLocalGame.js   local game loop incl. bot turn driving
    useOnlineGame.js  Firestore subscription + auth + action dispatch
  lib/
    firebase.js       Firebase app init - put your config here
    onlineGame.js      lobby/room management + transactional move writes
  pages/
    LocalGamePage.jsx  local mode wrapper (pass-device gating)
    OnlineGamePage.jsx online mode wrapper (lobby -> room -> game)
  components/
    GameTable.jsx      shared gameplay UI for both local and online modes
    Card.jsx, Hand.jsx, TableCenter.jsx, OpponentStrip.jsx, ...
```

`rules.js` is intentionally framework-agnostic (plain functions, JSON-safe
state) so it can run identically inside a Firestore transaction (online)
or a React state setter (local) — same engine, two transports.

## Game state shape

Each game is one Firestore document (or one local React state object)
shaped like:

```js
{
  players: [{ id, name, isBot }],
  hands: { [playerId]: ["R7", "GSKIP", ...] },
  deck: ["B3", "WILD", ...],
  discard: ["Y9", ...],          // last element is the top card
  currentColor: "R",              // active color, incl. chosen color after a wild
  currentPlayerIndex: 0,
  direction: 1,                   // 1 or -1
  pendingDraw: 0,                 // stacked draw-2/draw-4 the next player owes
  unoCalled: { [playerId]: true },
  status: "playing",              // lobby | playing | round-over | game-over
  winnerId: null,
  turnPlayedCard: false,          // false | true | "drew"
}
```

Card codes: `"<color><value>"` e.g. `"R7"`, `"GSKIP"`, `"BREV"`,
`"YDRAW2"`, or colorless `"WILD"` / `"WD4"`.

## Testing

The rules engine (`src/game/rules.js`) has a zero-dependency test suite —
plain Node scripts, no test framework needed, since the engine itself has
no external dependencies:

```bash
npm test
```

This runs:
- `actionCards.test.mjs` — Skip, Reverse (incl. the 2-player "acts as
  skip" rule), Draw Two, Draw Two stacking, Wild Draw Four, and illegal-
  move rejection (out of turn, color/value mismatch, bypassing a pending
  draw stack).
- `unoCalls.test.mjs` — calling Uno, catching a missed call, and the
  round-over/winner path.
- `simulation.test.mjs` — 450 randomized full games (2-4 players, driven
  by the real bot AI) checking that the total card count always stays at
  108 across deck + discard + all hands, and that every game actually
  terminates rather than getting stuck.

`npm run lint` runs ESLint, including React hooks rules that catch
effect/state misuse (e.g. calling `setState` synchronously inside an
effect - see `LocalGamePage.jsx` for the "adjust state during render"
pattern used instead, per https://react.dev/learn/you-might-not-need-an-effect).

## Recent additions

- **Exit button** during gameplay, with a tap-to-confirm step (tap once
  for a "tap again to quit" prompt, tap again to actually leave; clicking
  elsewhere cancels it).
- **Wild card select/deselect**: tapping a Wild or Wild Draw Four card
  selects it without immediately opening the color picker. Tap it again
  to deselect and pick a different card instead, or tap "confirm card" to
  open the color picker and commit. Regular colored/number cards still
  play instantly on tap, unchanged.
- **15-second turn timer** for human turns (`src/hooks/useLocalGame.js`,
  `applyTimeoutAction` in `src/game/rules.js`): if a player doesn't act in
  time, the highest legal plain-number card is auto-played; if only
  action/wild cards are legal (or none at all), a card is drawn instead.
  Auto-plays/draws never use Skip, Reverse, Draw Two, or Wild cards.
  3 consecutive misses (resets to 0 on any manual play) eliminates the
  player — their hand is discarded and turn order continues around them.
  If elimination leaves only one player standing, they win immediately.
  The timer pauses entirely behind the pass-device gate in multi-human
  local play, so nobody's clock runs while they can't see their hand yet.
- **New color theme** ("Midnight Arcade" - deep indigo/violet table
  instead of green felt) and a fuller responsive type/sizing scale across
  breakpoints (added a custom `xs` breakpoint at 420px for small phones).
  The hand of cards now lays out in a true responsive CSS grid
  (`src/components/Hand.jsx`) instead of flex-wrap, so it stays evenly
  spaced and never overflows from a 320px phone up through desktop, even
  with a swollen hand after several forced draws.
- **Real URL routing** (`react-router-dom`) for every mode instead of one
  in-memory screen state machine:
  - `/` home, `/bots` and `/local` setup forms, `/online` lobby
  - `/play/bots`, `/play/local` active local games
  - `/play/online/:code` active online games, with the room code itself
    in the URL
  - **Reloading no longer bounces you to the home screen.** Local/bots
    games persist their full live state (hand, score, turn, missed-turn
    counts - everything) to `sessionStorage` (`src/lib/gameSession.js`)
    and restore it on mount if the URL still points at an in-progress
    game; online games just resubscribe to the same Firestore room since
    the code is part of the URL. Visiting a `/play/...` URL with nothing
    to resume redirects back to the matching setup screen instead of
    crashing. A `vercel.json` rewrite is included so a hard reload on any
    of these paths is served `index.html` rather than 404ing at the host
    level before React Router gets a chance to run.

### A concurrency bug found during testing

While verifying the turn timer in a real browser (Playwright, headless
Chromium), pass-and-play turn order occasionally skipped a player. Root
cause: the countdown `setInterval` id was stored in a single shared
`ref`, so if a new timer effect ran before the previous one's cleanup had
fired, the new interval's id overwrote the ref and the old interval was
never cleared - it kept ticking in the background, occasionally firing an
extra timeout for the wrong player. Fixed by having each effect instance
capture its own interval id in a local closure variable instead of a
shared ref, plus a defensive check that a timeout can only act on the
player it was actually created for. Verified fixed by running the exact
turn sequence in a real browser repeatedly (7 consecutive correct runs)
after the change.

## Building for production

```bash
npm run build
```

Deploy `dist/` to any static host (Firebase Hosting, Vercel, Netlify).
