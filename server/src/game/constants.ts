import { GunTypeDef, GunTypeId } from "../types.js";

export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;

export const GRAVITY_Y = 0.35; // gentle downward pull (Matter default is ~1.0)

export const GUN_TYPES: Record<GunTypeId, GunTypeDef> = {
  pistol: {
    id: "pistol",
    name: "Pocket Pistol",
    hp: 1,
    bulletType: "straight",
    mass: 1,
    radius: 22,
  },
  revolver: {
    id: "revolver",
    name: "Service Revolver",
    hp: 2,
    bulletType: "bounce",
    mass: 1.6,
    radius: 26,
  },
  magnum: {
    id: "magnum",
    name: "Heavy Magnum",
    hp: 3,
    bulletType: "wavy",
    mass: 2.2,
    radius: 30,
  },
};

export const COLOR_PALETTE = [
  "#e6194b", // red
  "#f58231", // orange
  "#ffe119", // yellow
  "#3cb44b", // green
  "#4363d8", // blue
  "#911eb4", // indigo
  "#a259e6", // violet
] as const;

export const COMPUTER_GUN_COLORS = ["#111111", "#f4f4f4"] as const;

export const FIRE_COOLDOWN_MS = 320;
export const BULLET_SPEED = 14; // px per physics step (at 60hz)
export const BULLET_RADIUS = 6;
export const BULLET_LIFETIME_MS = 4000;
export const RECOIL_IMPULSE = 0.028;
export const ANGULAR_DAMPING = 0.985; // per-tick multiplier to settle spin
export const LINEAR_DAMPING = 0.0022; // matter frictionAir

export const WAVY_AMPLITUDE = 55;
export const WAVY_WAVELENGTH = 260;
export const WAVY_MAX_DISTANCE = WAVY_WAVELENGTH * 2;

export const BOMB_RADIUS = 26;
export const BOMB_EXPLOSION_RADIUS = 160;
export const BOMB_KNOCKBACK = 0.06;

export const CANNON_RADIUS = 28;
export const CANNON_HP = 2;
export const CANNON_BULLET_SPEED = 10;

export const COMPUTER_GUN_FIRE_COOLDOWN_MS = 1400;
export const COMPUTER_GUN_AIM_TOLERANCE = 0.18; // radians

export const COUNTDOWN_SECONDS = 3;

export const ROOM_EMPTY_TIMEOUT_MS = 5 * 60 * 1000;
export const RECONNECT_WINDOW_MS = 30 * 1000;

export const CATEGORY_WALL = 0x0001;
export const CATEGORY_GUN = 0x0002;
export const CATEGORY_BOMB = 0x0004;
export const CATEGORY_CANNON = 0x0008;
