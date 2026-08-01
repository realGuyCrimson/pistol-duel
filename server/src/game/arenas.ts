import { ArenaDef } from "../types.js";

export const ARENA_WIDTH = 1600;
export const ARENA_HEIGHT = 900;

const P1_SPAWN = { x: 160, y: 450 };
const P2_SPAWN = { x: 1440, y: 450 };

export const ARENAS: ArenaDef[] = [
  {
    id: "open-yard",
    name: "Open Yard",
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    spawnPoints: [P1_SPAWN, P2_SPAWN],
    walls: [
      { x: 800, y: 150, w: 220, h: 24, bouncy: true },
      { x: 800, y: 750, w: 220, h: 24, bouncy: true },
    ],
    divisions: [{ x: 800, y: 450, w: 24, h: 260 }],
    bombs: [
      { x: 500, y: 250 },
      { x: 1100, y: 650 },
    ],
    cannons: [{ x: 800, y: 450, fireIntervalMs: 2600 }],
    computerGuns: [
      { x: 800, y: 200 },
      { x: 800, y: 700 },
    ],
  },
  {
    id: "crossfire",
    name: "Crossfire Lanes",
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    spawnPoints: [P1_SPAWN, P2_SPAWN],
    walls: [
      { x: 500, y: 300, w: 300, h: 22, bouncy: true },
      { x: 1100, y: 600, w: 300, h: 22, bouncy: true },
      { x: 500, y: 600, w: 22, h: 220 },
      { x: 1100, y: 300, w: 22, h: 220 },
    ],
    divisions: [{ x: 800, y: 450, w: 24, h: 900 }],
    bombs: [{ x: 800, y: 180 }, { x: 800, y: 720 }],
    cannons: [
      { x: 400, y: 450, fireIntervalMs: 3000 },
      { x: 1200, y: 450, fireIntervalMs: 3000 },
    ],
    computerGuns: [{ x: 800, y: 450 }],
  },
  {
    id: "bunker",
    name: "The Bunker",
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    spawnPoints: [P1_SPAWN, P2_SPAWN],
    walls: [
      { x: 650, y: 250, w: 26, h: 320 },
      { x: 950, y: 650, w: 26, h: 320 },
      { x: 400, y: 450, w: 180, h: 22, bouncy: true },
      { x: 1200, y: 450, w: 180, h: 22, bouncy: true },
    ],
    divisions: [
      { x: 800, y: 300, w: 260, h: 22 },
      { x: 800, y: 600, w: 260, h: 22 },
    ],
    bombs: [{ x: 800, y: 450 }],
    cannons: [{ x: 800, y: 150, fireIntervalMs: 2400 }, { x: 800, y: 750, fireIntervalMs: 2400 }],
    computerGuns: [
      { x: 650, y: 450 },
      { x: 950, y: 450 },
    ],
  },
  {
    id: "wide-open",
    name: "Wide Open",
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    spawnPoints: [P1_SPAWN, P2_SPAWN],
    walls: [
      { x: 800, y: 450, w: 200, h: 200, angle: Math.PI / 4, bouncy: true },
    ],
    divisions: [],
    bombs: [
      { x: 400, y: 700 },
      { x: 1200, y: 200 },
    ],
    cannons: [{ x: 800, y: 150, fireIntervalMs: 3200 }],
    computerGuns: [{ x: 400, y: 250 }, { x: 1200, y: 650 }],
  },
];

export function pickRandomArena(): ArenaDef {
  return ARENAS[Math.floor(Math.random() * ARENAS.length)];
}
