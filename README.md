# Pistol Duel — Multiplayer Web App

A 2-player, server-authoritative physics duel inspired by KAYAC's *Pistol Duel*.
Single tap fires your gun; recoil (Newtonian impulse + torque) is your only
means of movement. Destroy the other gun before yours is destroyed.

Full design spec: [`plan.md`](plan.md). Original game analysis: [`pistol_duel_game_breakdown.md`](pistol_duel_game_breakdown.md).

## Stack

- **Client** (`client/`): React 19 + TypeScript + Phaser 3 + Vite, deployed to Netlify.
- **Server** (`server/`): Node.js + TypeScript + Socket.io + Matter.js, runs on this
  computer and is exposed to the internet via a Cloudflare quick tunnel.

The server is fully authoritative: physics, gravity, HP, collisions, and the
win condition are all computed server-side at 60 ticks/sec. Clients only send
`fire` taps and color/ready choices, and render the snapshots they receive.

## Currently live

- **Game (frontend):** http://merry-cactus-0716af.netlify.app — password `My-Drop-Site`
  - This is an **anonymous Netlify deploy**: `netlify-cli` on this machine isn't
    logged into an account (that requires a one-time browser click I can't do
    for you), so it can't create a permanent site on its own. Anonymous
    deploys are password-gated and **expire ~60 minutes after deploy unless
    claimed**. To make it permanent, password-free, and fix the deep-link
    caveat below:
    ```
    netlify login          # opens a browser — approve it once
    cd client
    netlify deploy --prod --dir=dist
    ```
  - **Known caveat on this anonymous deploy only:** opening a room link
    directly (e.g. pasting `.../F8LAE7` into a fresh tab) 404s — unclaimed
    drop deploys don't seem to process the `_redirects`/`netlify.toml` SPA
    rewrite rule. Workaround: open the site root and use the **"Join a
    room"** code box instead of the raw link (client-side navigation, so it
    doesn't hit the server for that path). This is standard, well-supported
    Netlify behavior for a normal logged-in deploy — the `netlify login` +
    redeploy above resolves it permanently, verified via `netlify.toml`'s
    `[[redirects]]` + `public/_redirects`.
  - Verified end-to-end (Playwright, two browser contexts) against this exact
    live URL: room creation, join-by-code, color pick, ready-up, countdown,
    battle rendering, hits, and victory all work through the real Netlify
    deploy + Cloudflare tunnel + local server.
- **Game server (backend):** runs locally on this machine on port 3001,
  tunneled publicly via `cloudflared` at the URL baked into
  `client/netlify.toml`'s `VITE_SERVER_URL`. Free "quick tunnels" get a new
  random URL every restart — if the client can't reach the server, the
  tunnel probably restarted; see **Restarting everything** below.

## Development

Two dev servers, run from two terminals:

```
cd server && npm run dev      # http://localhost:3001
cd client && npm run dev      # http://localhost:5173, proxies to localhost:3001 by default
```

Open http://localhost:5173 in two browser tabs/windows to play both sides
locally (no tunnel needed for local dev).

## Production build

```
cd server && npm run build && npm start        # compiles to dist/, runs on :3001

cd client
netlify deploy --prod --dir=dist                # or --allow-anonymous if not logged in
```

`VITE_SERVER_URL` **must** be set at build time to whatever public URL reaches
the server (the cloudflared tunnel URL, or a permanent host — see below).
There is no runtime config; the client is a static bundle. Since `netlify
deploy` re-runs `npm run build` itself (per `netlify.toml`), the value lives
in `client/netlify.toml`'s `[build.environment]` block rather than a shell
env var — **edit that file** whenever the public server URL changes, then
redeploy. (For local-only builds without Netlify's build step, `VITE_SERVER_URL=... npm run build` also works.)

## Restarting everything (server + tunnel)

From the project root:

```
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

This builds and starts the server, then starts a `cloudflared` quick tunnel
and prints the new public URL. **Whenever this URL changes, rebuild and
redeploy the client** with the new `VITE_SERVER_URL` (see above) — the old
Netlify deploy will otherwise point at a dead tunnel.

## A more permanent setup (optional)

The free quick tunnel is fine for testing but its URL is not stable across
restarts, and it only stays up while this computer is on. For a durable
public game, either of these avoids that:

1. **Named Cloudflare Tunnel** (still runs on this computer, needs a free
   Cloudflare account + a domain): gives a fixed hostname that survives
   restarts. See `cloudflared tunnel login` / `cloudflared tunnel create`.
2. **Deploy the server itself** to a small persistent host (Railway, Fly.io,
   Render, a VPS) as `plan.md` originally suggested — `server/` builds to a
   plain Node app (`npm run build && npm start`), no code changes needed.

## Gameplay

- Host picks a gun type (HP/bullet type), creates a room, shares the URL
  (`/<ROOMCODE>`).
- Second player joins via the link. Both pick a color (7-color palette, no
  duplicates) and ready up.
- 3-2-1 countdown, server picks a random arena, battle starts.
- Tap/click the canvas (or press Space) to fire. Recoil pushes and spins your
  gun — there is no other movement control, exactly like the original.
- Gun types: **Pocket Pistol** (1 HP, straight bullets), **Service Revolver**
  (2 HP, bullets bounce once off teal walls), **Heavy Magnum** (3 HP, wavy
  bullets).
- Arenas include static walls, bouncy wall segments, gravity-affected bombs
  (explode + knock back nearby guns when shot), static cannons (2 HP, auto-aim
  at players), and neutral black/white computer guns (random size, auto-aim,
  destroyable).
- First gun to 0 HP loses; simultaneous destruction is a draw. Rematch keeps
  the gun type and HP, picks a new random arena, colors carry over.

## Project layout

```
server/src/
  types.ts            shared network types
  game/constants.ts    tunable physics/gameplay numbers
  game/arenas.ts        arena layouts
  game/math.ts           segment/rect intersection, reflection helpers
  game/Simulation.ts       per-room Matter.js world + bullets/AI/collisions
  rooms/Room.ts             room state machine (lobby -> countdown -> battle -> rematch)
  rooms/RoomManager.ts       room codes + lifecycle
  socket/handlers.ts          socket.io event wiring
  index.ts                     express + socket.io bootstrap

client/src/
  net/socket.ts        socket.io-client singleton + session persistence
  net/types.ts           mirrors server/src/types.ts
  pages/Home.tsx           gun picker, create/join room
  pages/RoomPage.tsx        room state machine + socket event wiring
  components/Lobby.tsx        color picker, ready-up
  components/BattleView.tsx    Phaser host + HP HUD
  game/BattleScene.ts            renders server snapshots, captures fire input
```

## Security notes

The server never trusts client input beyond "fire" and color/ready choices:
fire rate is cooldown-limited server-side, colors are validated against the
palette and uniqueness, and all physics/HP/collision/victory logic is
computed server-side. Clients cannot claim hits or a win.
