export type GunTypeId = "pistol" | "revolver" | "magnum";
export type BulletType = "straight" | "bounce" | "wavy";
export type PlayerRole = "player1" | "player2";
export type RoomStatus = "waiting" | "lobby" | "countdown" | "active" | "ended";

export interface GunTypeDef {
  id: GunTypeId;
  name: string;
  hp: number;
  bulletType: BulletType;
  mass: number;
  radius: number;
}

export interface WallDef {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  bouncy?: boolean;
}

export interface CannonDef {
  x: number;
  y: number;
  fireIntervalMs: number;
}

export interface BombDef {
  x: number;
  y: number;
}

export interface ArenaInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  walls: WallDef[];
  divisions: WallDef[];
  bombs: BombDef[];
  cannons: CannonDef[];
}

export interface GunSnapshot {
  id: string;
  kind: "player1" | "player2" | "computer";
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  color: string;
  alive: boolean;
  radius: number;
}

export interface BulletSnapshot {
  id: string;
  x: number;
  y: number;
  type: BulletType;
  owner: string;
}

export interface BombSnapshot {
  id: string;
  x: number;
  y: number;
  alive: boolean;
  radius: number;
}

export interface CannonSnapshot {
  id: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  radius: number;
}

export interface StateSnapshot {
  tick: number;
  guns: GunSnapshot[];
  bullets: BulletSnapshot[];
  bombs: BombSnapshot[];
  cannons: CannonSnapshot[];
}

export interface PublicRoomInfo {
  code: string;
  status: RoomStatus;
  gunType: GunTypeId;
  arena?: ArenaInfo;
  player1: { color: string | null; ready: boolean; connected: boolean; hp: number; maxHp: number } | null;
  player2: { color: string | null; ready: boolean; connected: boolean; hp: number; maxHp: number } | null;
  youAre: PlayerRole | "spectator";
}

export type WinnerResult = "player1" | "player2" | "draw";

export interface HitEvent {
  kind: "hit";
  targetKind: "player" | "computer" | "cannon";
  targetId: string;
  x: number;
  y: number;
}

export interface DestroyEvent {
  kind: "destroy";
  targetKind: "player" | "computer" | "cannon" | "bomb";
  targetId: string;
  x: number;
  y: number;
}

export interface BombExplodeEvent {
  x: number;
  y: number;
  radius: number;
}

export interface ShotEvent {
  owner: string;
  x: number;
  y: number;
}

export const COLOR_PALETTE = [
  "#e6194b",
  "#f58231",
  "#ffe119",
  "#3cb44b",
  "#4363d8",
  "#911eb4",
  "#a259e6",
] as const;

export const GUN_TYPES: Record<GunTypeId, GunTypeDef> = {
  pistol: { id: "pistol", name: "Pocket Pistol", hp: 1, bulletType: "straight", mass: 1, radius: 22 },
  revolver: { id: "revolver", name: "Service Revolver", hp: 2, bulletType: "bounce", mass: 1.6, radius: 26 },
  magnum: { id: "magnum", name: "Heavy Magnum", hp: 3, bulletType: "wavy", mass: 2.2, radius: 30 },
};
