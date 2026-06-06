# 3D Games Arcade

Add a full 3D games suite using React Three Fiber, accessible from both the Plaza and a new standalone `/games` route. Visual style: "advanced" — physically-based shading, post-processing (bloom + vignette), particle effects, and the existing purple-glass UI for menus/HUDs.

## The 5 Games

1. **Neon Racer** — Time-trial racer on a glowing track. WASD/arrow steering, drift particles, lap timer, ghost of best run, online leaderboard.
2. **Plaza Parkour** — First/third-person parkour course with moving platforms, wall-runs, checkpoints, and a global speedrun leaderboard.
3. **Asteroid Gunner** — 6DOF space shooter. Procedural asteroid field, homing missiles, shield/health, wave-based scoring, high-score table.
4. **Tower Stacker 3D** — Physics block-stacking with rigid bodies (Rapier). Wind/sway mechanic, height score, daily seed.
5. **Plaza Arena** (multiplayer) — Up to 8-player real-time deathmatch in a small 3D arena. Supabase Realtime for presence, position sync, and hit events. Respawns, kill feed, round timer, ELO-lite ranking.

## Architecture

```text
src/
  pages/
    Games.tsx              new /games hub
    games/
      NeonRacer.tsx
      PlazaParkour.tsx
      AsteroidGunner.tsx
      TowerStacker.tsx
      PlazaArena.tsx
  components/games/
    GameShell.tsx          glass HUD frame, pause, exit, settings
    Leaderboard.tsx        shared score panel
    Minimap.tsx
    fx/
      PostFX.tsx           bloom + vignette + chromatic
      Particles.tsx
    arena/
      NetPlayer.tsx        remote player avatar
      useArenaNetcode.ts   Realtime channel hook
  hooks/
    useGameScores.ts       read/write scores
```

Plaza integration: add an **Arcade Cabinet** model on the Plaza grid that, when interacted with, opens an in-world overlay listing the 5 games (reuses `Games.tsx` content). The standalone route remains the canonical home.

## Tech

- `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0`, `three@^0.160`
- `@react-three/rapier@^1.5` for physics (Tower Stacker, Parkour, Racer collisions)
- `@react-three/postprocessing@^2.16` for bloom/vignette
- Multiplayer: Supabase Realtime broadcast (position @ 15 Hz) + presence; authoritative hit checks done client-side with server-side rate limiting via RPC (game-jam scope, not anti-cheat hardened).
- Keyboard + gamepad input (Gamepad API), mobile touch joystick fallback.

## Backend

New tables (with proper GRANTs + RLS, per project conventions):

- `game_scores` — `user_id`, `game_id` (text), `score` (numeric), `meta` (jsonb), `created_at`. Insert: authenticated user inserts own row. Select: public read for leaderboards.
- `arena_matches` — `id`, `started_at`, `ended_at`, `winner_id`.
- `arena_match_players` — `match_id`, `user_id`, `kills`, `deaths`, `score`.
- RPC `submit_game_score(game_id, score, meta)` — SECURITY DEFINER, validates score sanity (per-game caps), awards XP via existing XP RPC.

Realtime topic policy: extend the existing `realtime.messages` topic allowlist to include `arena-{matchId}` patterns scoped to authenticated users.

## UX / Style

- Hub page: bento-grid of 5 game cards using the existing glassmorphism. Each card shows a live `<Canvas>` mini-preview (low DPR) of the game's signature visual.
- HUD: top bar with glass blur, purple accent, neon score readouts. Pause menu with resume/restart/quit.
- Loading: skeleton with progress bar; lazy-load each game route with `React.lazy`.
- Accessibility: respect `prefers-reduced-motion` (disable post-FX bloom intensity, freeze particles). Keyboard remap stored in localStorage.

## Performance

- Lazy import each game; preload Three only on hub.
- `dpr={[1, 1.5]}`, frustum culling, instanced meshes for asteroids/blocks, single shared `Suspense` per game.
- Multiplayer broadcasts batched and interpolated (no per-frame sends).

## Out of scope (this round)

- Custom 3D character animations / rigged models (use primitives + drei helpers).
- Voice chat in arena.
- Anti-cheat beyond basic score caps.
- Tournament/bracket system.

## Build order

1. DB migration (scores, matches, RPC, realtime topic policy).
2. Install deps + `GameShell`, `PostFX`, `Leaderboard`.
3. `/games` hub route + Plaza arcade cabinet entry point.
4. Tower Stacker → Asteroid Gunner → Neon Racer → Plaza Parkour (single-player first, share systems).
5. Plaza Arena multiplayer last (largest risk).
6. Wire XP rewards, leaderboards, mobile controls, QA pass.
