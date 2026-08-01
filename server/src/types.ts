export type GunTypeId = "pistol" | "revolver" | "magnum";
export type BulletType = "straight" | "bounce" | "wavy";
export type PlayerRole = "player1" | "player2";
export type RoomStatus =
  | "waiting"
  | "lobby"
  | "countdown"
  | "active"
  | "ended";

export interface Vec2 {
  x: number;
  y: number;
}

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

export interface ComputerGunDef {
  x: number;
  y: number;
}

export interface ArenaDef {
  id: string;
  name: string;
  width: number;
  height: number;
  spawnPoints: [Vec2, Vec2];
  walls: WallDef[];
  divisions: WallDef[];
  bombs: BombDef[];
  cannons: CannonDef[];
  computerGuns: ComputerGunDef[];
}

// ---- Networked snapshot shapes ----

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
  arena?: { id: string; name: string; width: number; height: number; walls: WallDef[]; divisions: WallDef[]; bombs: BombDef[]; cannons: CannonDef[] };
  player1: { color: string | null; ready: boolean; connected: boolean; hp: number; maxHp: number } | null;
  player2: { color: string | null; ready: boolean; connected: boolean; hp: number; maxHp: number } | null;
  youAre: PlayerRole | "spectator";
}

export type WinnerResult = "player1" | "player2" | "draw";
