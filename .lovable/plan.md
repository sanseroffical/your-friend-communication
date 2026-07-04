# Plaza cleanup + Games + Calling + Admin + Discord

Big batch, split into 5 focused workstreams. Everything ships behind existing routes/panels — no new top-level pages.

## 1. Plaza cleanup (`src/components/plaza/PlazaScene.tsx`, `RoomEnvironment.tsx`, `Plaza.tsx`)

- **Visuals**: swap ambient + single directional light for `<Environment preset="sunset">` + soft directional with shadow map 1024, add subtle fog, replace flat sky with gradient shader background. Upgrade ground to PBR material (roughness 0.8, subtle normal noise).
- **Declutter**: audit props, remove duplicates, group decorative items into a single `<InstancedMesh>` (trees, lamps, benches). Cap decorative props at ~40.
- **Perf**: wrap far props in `<Detailed>` LOD with 2 levels; enable `frameloop="demand"` when tab hidden; memoize geometry/material singletons; disable shadows on small props.
- **UI overlay**: consolidate floating HUD into one bottom bar (`PlazaHUD`) — chat toggle, avatar, exit, settings. Move mini-map to a collapsible top-right card. Add `glass` styling to match app.

## 2. New games (4)

- **2D arcade — Breakout Blitz** (`src/components/games/BreakoutBlitzGame.tsx`): timed brick-breaker with power-ups. Uses `useGameScores("breakout_blitz")`.
- **2D arcade — Frogger Dash** (`src/components/games/FroggerDashGame.tsx`): lane-crossing, score = lanes cleared.
- **3D GameShell — Sky Surfer** (`src/components/games/three/SkySurfer.tsx`): endless slalom through rings, reuses `GameShell` + gamepad profile "sky_surfer".
- **Party — Trivia Royale** (`src/components/games/party/TriviaRoyale.tsx`): realtime lobby via Supabase Realtime channel `trivia:<room>`, host picks category, 10 questions, live scoreboard. Uses existing `TriviaGame` question bank.
- **PvP — Duel Arena** (`src/components/plaza/PvPArena.tsx` extension): add "Best of 5" mode + rematch button + ELO stored in new `pvp_stats` table.
- Register all in `MiniGamesPanel.tsx` and `Games.tsx`.

## 3. Calling fix (`src/utils/webrtc.ts`, `src/components/VideoCall.tsx`)

Root cause suspected: signaling messages sent before both peers subscribe → offer/answer dropped; no TURN server → NAT'd peers can't connect.

- Add STUN + free TURN (`openrelay.metered.ca`) fallbacks to `RTCPeerConnection` config.
- Queue outgoing ICE candidates until remote description is set; buffer offers until callee subscribes to signaling channel.
- Add `presence` handshake: both sides broadcast `ready` before offer is sent.
- Add connection-state logging + on-screen status ("Connecting… / Connected / Reconnecting").
- Auto-retry ICE restart on `disconnected` for 10s before hanging up.

## 4. Admin powers (`src/components/AdminPanel.tsx` + new RPCs)

- **Bulk moderation**: multi-select messages in admin view → `admin_bulk_delete_messages(ids uuid[])` security definer RPC.
- **IP ban**: new `banned_ips` table + `admin_ban_ip(ip inet, reason)` RPC. Edge function `check-ip-ban` called on sign-in blocks banned IPs.
- **Server announcement**: broadcast dialog → inserts into existing `announcements` table with `is_pinned` for 24h + toast to all connected clients via Realtime broadcast.
- **Maintenance mode**: `app_settings` singleton row `{ maintenance: bool, message: text }`. When true, non-admins see full-screen "We'll be right back" overlay. Toggle from admin panel.

## 5. Discord

- **OAuth linking (per-user)**: Discord OAuth isn't a native Cloud provider, so use a manual flow — new edge function `discord-oauth` handles the code exchange, stores `discord_id`, `discord_username`, `discord_avatar` on `profiles`. Requires user-provided `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` (I'll request via add_secret after you approve). Profile card shows Discord badge when linked.
- **Webhook relay**: admin-configurable `DISCORD_WEBHOOK_URL` secret. Edge function `discord-notify` posts embeds when: new user report filed, new feature request, admin announcement. Toggle per-event in admin panel.

## Technical details

**New tables** (single migration): `banned_ips`, `pvp_stats`, `app_settings`, plus `discord_id`/`discord_username`/`discord_avatar` columns on `profiles`. Full RLS + GRANTs. Admin-only writes via `has_role(auth.uid(), 'admin')`.

**New edge functions**: `discord-oauth` (JWT verified), `discord-notify` (JWT verified, admin-only), `check-ip-ban` (public — called during auth).

**New secrets to request after approval**: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_WEBHOOK_URL`.

## Order of implementation
1. Migration (tables + columns + policies + GRANTs) — approve first
2. Plaza cleanup + games (frontend only, ships fast)
3. Calling fix + verify with Playwright on two contexts
4. Admin tools wired to new RPCs
5. Discord (after you provide the 3 secrets)

## Out of scope for this batch
- Voice/video group calls (only 1:1 fix)
- Discord bot commands (webhook one-way only)
- Custom game creator / user-submitted games
