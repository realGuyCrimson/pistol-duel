import Matter from "matter-js";
import { nanoid } from "nanoid";
import {
  ArenaDef,
  BombSnapshot,
  BulletSnapshot,
  BulletType,
  CannonSnapshot,
  GunSnapshot,
  GunTypeDef,
  PlayerRole,
  StateSnapshot,
  WallDef,
} from "../types.js";
import {
  BOMB_EXPLOSION_RADIUS,
  BOMB_KNOCKBACK,
  BOMB_RADIUS,
  BULLET_LIFETIME_MS,
  BULLET_RADIUS,
  BULLET_SPEED,
  CANNON_BULLET_SPEED,
  CANNON_HP,
  CANNON_RADIUS,
  CATEGORY_BOMB,
  CATEGORY_CANNON,
  CATEGORY_GUN,
  CATEGORY_WALL,
  COMPUTER_GUN_AIM_TOLERANCE,
  COMPUTER_GUN_COLORS,
  COMPUTER_GUN_FIRE_COOLDOWN_MS,
  FIRE_COOLDOWN_MS,
  GRAVITY_Y,
  LINEAR_DAMPING,
  RECOIL_IMPULSE,
  WAVY_AMPLITUDE,
  WAVY_MAX_DISTANCE,
  WAVY_WAVELENGTH,
} from "./constants.js";
import { distance, normalize, reflect, segmentVsRect, shortestAngleDiff } from "./math.js";

const { Engine, World, Bodies, Body } = Matter;

const BORDER_THICKNESS = 60;

export type SimEvent =
  | { kind: "hit"; targetKind: "player" | "computer" | "cannon"; targetId: string; x: number; y: number }
  | { kind: "destroy"; targetKind: "player" | "computer" | "cannon" | "bomb"; targetId: string; x: number; y: number }
  | { kind: "bombExplode"; x: number; y: number; radius: number }
  | { kind: "shot"; owner: string; x: number; y: number };

interface PlayerGunState {
  role: PlayerRole;
  body: Matter.Body;
  color: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  lastFireAt: number;
  radius: number;
}

interface ComputerGunState {
  id: string;
  body: Matter.Body;
  color: string;
  bulletType: BulletType;
  hp: number;
  maxHp: number;
  alive: boolean;
  nextFireAt: number;
  radius: number;
}

interface CannonState {
  id: string;
  body: Matter.Body;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  nextFireAt: number;
  fireIntervalMs: number;
  radius: number;
}

interface BombState {
  id: string;
  body: Matter.Body;
  alive: boolean;
  radius: number;
}

interface BulletState {
  id: string;
  owner: string;
  type: BulletType;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  spawnX: number;
  spawnY: number;
  distanceTraveled: number;
  bounced: boolean;
  createdAt: number;
  speed: number;
}

export class Simulation {
  private engine: Matter.Engine;
  private arena: ArenaDef;
  private gunType: GunTypeDef;
  private wallSegments: WallDef[] = [];
  private players: Partial<Record<PlayerRole, PlayerGunState>> = {};
  private computerGuns: Map<string, ComputerGunState> = new Map();
  private cannons: Map<string, CannonState> = new Map();
  private bombs: Map<string, BombState> = new Map();
  private bullets: Map<string, BulletState> = new Map();
  private tickCount = 0;
  private pendingEvents: SimEvent[] = [];
  private startedAt = Date.now();

  constructor(arena: ArenaDef, gunType: GunTypeDef) {
    this.arena = arena;
    this.gunType = gunType;
    this.engine = Engine.create();
    this.engine.gravity.y = GRAVITY_Y;
    this.buildArena();
  }

  private buildArena() {
    const { width, height, walls, divisions } = this.arena;
    const staticBodies: Matter.Body[] = [];

    const addWall = (w: WallDef) => {
      const body = Bodies.rectangle(w.x, w.y, w.w, w.h, {
        isStatic: true,
        angle: w.angle ?? 0,
        restitution: 0.55,
        friction: 0.02,
        frictionStatic: 0.02,
        collisionFilter: { category: CATEGORY_WALL, mask: CATEGORY_GUN | CATEGORY_BOMB },
      });
      staticBodies.push(body);
      this.wallSegments.push(w);
    };

    for (const w of [...walls, ...divisions]) addWall(w);

    // border
    const t = BORDER_THICKNESS;
    const borders: WallDef[] = [
      { x: width / 2, y: -t / 2, w: width + t * 2, h: t },
      { x: width / 2, y: height + t / 2, w: width + t * 2, h: t },
      { x: -t / 2, y: height / 2, w: t, h: height + t * 2 },
      { x: width + t / 2, y: height / 2, w: t, h: height + t * 2 },
    ];
    for (const b of borders) addWall(b);

    World.add(this.engine.world, staticBodies);

    // bombs
    for (const b of this.arena.bombs) {
      const id = `bomb-${nanoid(6)}`;
      const body = Bodies.circle(b.x, b.y, BOMB_RADIUS, {
        frictionAir: 0.012,
        restitution: 0.3,
        density: 0.0016,
        collisionFilter: { category: CATEGORY_BOMB, mask: CATEGORY_WALL },
      });
      World.add(this.engine.world, body);
      this.bombs.set(id, { id, body, alive: true, radius: BOMB_RADIUS });
    }

    // cannons (static)
    for (const c of this.arena.cannons) {
      const id = `cannon-${nanoid(6)}`;
      const body = Bodies.circle(c.x, c.y, CANNON_RADIUS, {
        isStatic: true,
        collisionFilter: { category: CATEGORY_CANNON, mask: 0 },
      });
      World.add(this.engine.world, body);
      this.cannons.set(id, {
        id,
        body,
        angle: 0,
        hp: CANNON_HP,
        maxHp: CANNON_HP,
        alive: true,
        nextFireAt: this.startedAt + c.fireIntervalMs,
        fireIntervalMs: c.fireIntervalMs,
        radius: CANNON_RADIUS,
      });
    }

    // computer guns
    const cgTypes: GunTypeDef[] = Object.values({
      pistol: { hp: 1, bulletType: "straight" as BulletType, radius: 20 },
      revolver: { hp: 2, bulletType: "bounce" as BulletType, radius: 24 },
      magnum: { hp: 3, bulletType: "wavy" as BulletType, radius: 28 },
    }).map((v, i) => ({ id: ["pistol", "revolver", "magnum"][i] as any, name: "", mass: 1, ...v }));

    for (const cg of this.arena.computerGuns) {
      const id = `cpu-${nanoid(6)}`;
      const roll = cgTypes[Math.floor(Math.random() * cgTypes.length)];
      const color = COMPUTER_GUN_COLORS[Math.floor(Math.random() * COMPUTER_GUN_COLORS.length)];
      const body = Bodies.circle(cg.x, cg.y, roll.radius, {
        frictionAir: LINEAR_DAMPING * 8,
        restitution: 0.65,
        density: 0.0018,
        collisionFilter: { category: CATEGORY_GUN, mask: CATEGORY_WALL | CATEGORY_GUN },
      });
      World.add(this.engine.world, body);
      this.computerGuns.set(id, {
        id,
        body,
        color,
        bulletType: roll.bulletType,
        hp: roll.hp,
        maxHp: roll.hp,
        alive: true,
        nextFireAt: Date.now() + 800 + Math.random() * 1200,
        radius: roll.radius,
      });
    }
  }

  addPlayer(role: PlayerRole, color: string) {
    const spawn = role === "player1" ? this.arena.spawnPoints[0] : this.arena.spawnPoints[1];
    const body = Bodies.circle(spawn.x, spawn.y, this.gunType.radius, {
      frictionAir: LINEAR_DAMPING * 8,
      restitution: 0.65,
      density: 0.002 * this.gunType.mass,
      collisionFilter: { category: CATEGORY_GUN, mask: CATEGORY_WALL | CATEGORY_GUN },
    });
    // player1 starts facing right (toward opponent), player2 facing left
    Body.setAngle(body, role === "player1" ? 0 : Math.PI);
    World.add(this.engine.world, body);
    this.players[role] = {
      role,
      body,
      color,
      hp: this.gunType.hp,
      maxHp: this.gunType.hp,
      alive: true,
      lastFireAt: 0,
      radius: this.gunType.radius,
    };
  }

  private nearestAlivePlayer(x: number, y: number): PlayerGunState | null {
    let best: PlayerGunState | null = null;
    let bestDist = Infinity;
    for (const p of Object.values(this.players)) {
      if (!p || !p.alive) continue;
      const d = distance({ x, y }, p.body.position);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  handleFire(role: PlayerRole): boolean {
    const p = this.players[role];
    if (!p || !p.alive) return false;
    const now = Date.now();
    if (now - p.lastFireAt < FIRE_COOLDOWN_MS) return false;
    p.lastFireAt = now;
    this.spawnBullet(role, p.body.position.x, p.body.position.y, p.body.angle, this.gunType.bulletType, BULLET_SPEED, p.radius);
    this.applyRecoil(p.body, p.body.angle, p.radius);
    return true;
  }

  private applyRecoil(body: Matter.Body, angle: number, radius: number) {
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const tip = { x: body.position.x + dir.x * radius, y: body.position.y + dir.y * radius };
    Body.applyForce(body, tip, { x: -dir.x * RECOIL_IMPULSE, y: -dir.y * RECOIL_IMPULSE });
  }

  private spawnBullet(owner: string, x: number, y: number, angle: number, type: BulletType, speed: number, gunRadius: number) {
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const sx = x + dir.x * (gunRadius + BULLET_RADIUS + 2);
    const sy = y + dir.y * (gunRadius + BULLET_RADIUS + 2);
    const id = `b-${nanoid(8)}`;
    this.bullets.set(id, {
      id,
      owner,
      type,
      x: sx,
      y: sy,
      dirX: dir.x,
      dirY: dir.y,
      spawnX: sx,
      spawnY: sy,
      distanceTraveled: 0,
      bounced: false,
      createdAt: Date.now(),
      speed,
    });
    this.pendingEvents.push({ kind: "shot", owner, x: sx, y: sy });
  }

  drainEvents(): SimEvent[] {
    const ev = this.pendingEvents;
    this.pendingEvents = [];
    return ev;
  }

  step(dtMs: number) {
    Engine.update(this.engine, dtMs);
    const now = Date.now();

    this.updateComputerGuns(now);
    this.updateCannons(now);
    this.updateBullets(now);

    this.tickCount++;
  }

  private updateComputerGuns(now: number) {
    const TURN_RATE = 0.09;
    for (const cg of this.computerGuns.values()) {
      if (!cg.alive) continue;
      const target = this.nearestAlivePlayer(cg.body.position.x, cg.body.position.y);
      if (!target) continue;
      const desired = Math.atan2(target.body.position.y - cg.body.position.y, target.body.position.x - cg.body.position.x);
      const diff = shortestAngleDiff(cg.body.angle, desired);
      const step = Math.max(-TURN_RATE, Math.min(TURN_RATE, diff));
      Body.setAngle(cg.body, cg.body.angle + step);
      Body.setAngularVelocity(cg.body, 0);

      if (now >= cg.nextFireAt && Math.abs(diff) < COMPUTER_GUN_AIM_TOLERANCE) {
        this.spawnBullet(`computer:${cg.id}`, cg.body.position.x, cg.body.position.y, cg.body.angle, cg.bulletType, BULLET_SPEED * 0.85, cg.radius);
        this.applyRecoil(cg.body, cg.body.angle, cg.radius);
        cg.nextFireAt = now + COMPUTER_GUN_FIRE_COOLDOWN_MS + Math.random() * 500;
      }
    }
  }

  private updateCannons(now: number) {
    for (const c of this.cannons.values()) {
      if (!c.alive) continue;
      if (now >= c.nextFireAt) {
        const target = this.nearestAlivePlayer(c.body.position.x, c.body.position.y);
        if (target) {
          const angle = Math.atan2(target.body.position.y - c.body.position.y, target.body.position.x - c.body.position.x);
          c.angle = angle;
          this.spawnBullet(`cannon:${c.id}`, c.body.position.x, c.body.position.y, angle, "straight", CANNON_BULLET_SPEED, c.radius);
        }
        c.nextFireAt = now + c.fireIntervalMs;
      }
    }
  }

  private updateBullets(now: number) {
    const toRemove: string[] = [];

    for (const bullet of this.bullets.values()) {
      if (now - bullet.createdAt > BULLET_LIFETIME_MS) {
        toRemove.push(bullet.id);
        continue;
      }

      const prev = { x: bullet.x, y: bullet.y };
      let next: { x: number; y: number };

      if (bullet.type === "wavy") {
        bullet.distanceTraveled += bullet.speed;
        if (bullet.distanceTraveled > WAVY_MAX_DISTANCE) {
          toRemove.push(bullet.id);
          continue;
        }
        const forward = bullet.distanceTraveled;
        const lateral = WAVY_AMPLITUDE * Math.sin((2 * Math.PI * forward) / WAVY_WAVELENGTH);
        const perp = { x: -bullet.dirY, y: bullet.dirX };
        next = {
          x: bullet.spawnX + bullet.dirX * forward + perp.x * lateral,
          y: bullet.spawnY + bullet.dirY * forward + perp.y * lateral,
        };
      } else {
        next = { x: bullet.x + bullet.dirX * bullet.speed, y: bullet.y + bullet.dirY * bullet.speed };
        bullet.distanceTraveled += bullet.speed;
      }

      // tentatively move; resolveBulletAgainstWalls will overwrite x/y with the
      // exact impact/reflection point if the segment crosses a wall this tick
      bullet.x = next.x;
      bullet.y = next.y;

      let destroyed = this.resolveBulletAgainstWalls(bullet, prev, next);

      if (!destroyed) {
        destroyed = this.resolveBulletAgainstEntities(bullet);
      }

      if (destroyed) toRemove.push(bullet.id);

      if (
        !destroyed &&
        (bullet.x < -100 || bullet.x > this.arena.width + 100 || bullet.y < -100 || bullet.y > this.arena.height + 100)
      ) {
        toRemove.push(bullet.id);
      }
    }

    for (const id of toRemove) this.bullets.delete(id);

    // bullet vs bullet (different owners)
    const list = Array.from(this.bullets.values());
    const destroyedIds = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.owner === b.owner) continue;
        if (destroyedIds.has(a.id) || destroyedIds.has(b.id)) continue;
        if (distance(a, b) <= BULLET_RADIUS * 2) {
          destroyedIds.add(a.id);
          destroyedIds.add(b.id);
        }
      }
    }
    for (const id of destroyedIds) this.bullets.delete(id);
  }

  /** returns true if bullet was destroyed (or reflected+kept alive returns false) */
  private resolveBulletAgainstWalls(bullet: BulletState, prev: { x: number; y: number }, next: { x: number; y: number }): boolean {
    let closest: { t: number; point: { x: number; y: number }; normal: { x: number; y: number }; wall: WallDef } | null = null;
    for (const wall of this.wallSegments) {
      const hit = segmentVsRect(prev, next, wall);
      if (hit && (!closest || hit.t < closest.t)) {
        closest = { ...hit, wall };
      }
    }
    if (!closest) return false;

    if (closest.wall.bouncy && bullet.type === "bounce" && !bullet.bounced) {
      const r = reflect(bullet.dirX, bullet.dirY, closest.normal.x, closest.normal.y);
      bullet.dirX = r.x;
      bullet.dirY = r.y;
      bullet.bounced = true;
      bullet.x = closest.point.x + r.x * 2;
      bullet.y = closest.point.y + r.y * 2;
      // wavy-style spawn tracking isn't used for bounce bullets, so no need to reset spawn
      return false;
    }

    bullet.x = closest.point.x;
    bullet.y = closest.point.y;
    return true;
  }

  private resolveBulletAgainstEntities(bullet: BulletState): boolean {
    const isPlayerOwned = bullet.owner === "player1" || bullet.owner === "player2";

    if (isPlayerOwned) {
      // cannons
      for (const c of this.cannons.values()) {
        if (!c.alive) continue;
        if (distance(bullet, c.body.position) <= BULLET_RADIUS + c.radius) {
          c.hp -= 1;
          this.pendingEvents.push({ kind: "hit", targetKind: "cannon", targetId: c.id, x: bullet.x, y: bullet.y });
          if (c.hp <= 0) {
            c.alive = false;
            World.remove(this.engine.world, c.body);
            this.pendingEvents.push({ kind: "destroy", targetKind: "cannon", targetId: c.id, x: c.body.position.x, y: c.body.position.y });
          }
          return true;
        }
      }
      // computer guns
      for (const cg of this.computerGuns.values()) {
        if (!cg.alive) continue;
        if (distance(bullet, cg.body.position) <= BULLET_RADIUS + cg.radius) {
          this.damageComputerGun(cg, bullet);
          return true;
        }
      }
      // bombs
      for (const bomb of this.bombs.values()) {
        if (!bomb.alive) continue;
        if (distance(bullet, bomb.body.position) <= BULLET_RADIUS + bomb.radius) {
          this.explodeBomb(bomb);
          return true;
        }
      }
    }

    // player guns: any non-self bullet can hit a player (opponent bullets, computer guns, cannons)
    for (const p of Object.values(this.players)) {
      if (!p || !p.alive) continue;
      if (bullet.owner === p.role) continue;
      if (distance(bullet, p.body.position) <= BULLET_RADIUS + p.radius) {
        this.damagePlayer(p, bullet);
        return true;
      }
    }

    return false;
  }

  private damagePlayer(p: PlayerGunState, bullet: BulletState) {
    p.hp -= 1;
    const dir = normalize(bullet.dirX, bullet.dirY);
    Body.applyForce(p.body, p.body.position, { x: dir.x * 0.02, y: dir.y * 0.02 });
    this.pendingEvents.push({ kind: "hit", targetKind: "player", targetId: p.role, x: p.body.position.x, y: p.body.position.y });
    if (p.hp <= 0) {
      p.alive = false;
      this.pendingEvents.push({ kind: "destroy", targetKind: "player", targetId: p.role, x: p.body.position.x, y: p.body.position.y });
    }
  }

  private damageComputerGun(cg: ComputerGunState, bullet: BulletState) {
    cg.hp -= 1;
    const dir = normalize(bullet.dirX, bullet.dirY);
    Body.applyForce(cg.body, cg.body.position, { x: dir.x * 0.02, y: dir.y * 0.02 });
    this.pendingEvents.push({ kind: "hit", targetKind: "computer", targetId: cg.id, x: cg.body.position.x, y: cg.body.position.y });
    if (cg.hp <= 0) {
      cg.alive = false;
      World.remove(this.engine.world, cg.body);
      this.pendingEvents.push({ kind: "destroy", targetKind: "computer", targetId: cg.id, x: cg.body.position.x, y: cg.body.position.y });
    }
  }

  private explodeBomb(bomb: BombState) {
    bomb.alive = false;
    const center = { x: bomb.body.position.x, y: bomb.body.position.y };
    World.remove(this.engine.world, bomb.body);
    this.pendingEvents.push({ kind: "bombExplode", x: center.x, y: center.y, radius: BOMB_EXPLOSION_RADIUS });
    this.pendingEvents.push({ kind: "destroy", targetKind: "bomb", targetId: bomb.id, x: center.x, y: center.y });

    const affectAll: { body: Matter.Body; damage: () => void }[] = [];
    for (const p of Object.values(this.players)) {
      if (p && p.alive) affectAll.push({ body: p.body, damage: () => this.damagePlayer(p, { dirX: 0, dirY: -1 } as BulletState) });
    }
    for (const cg of this.computerGuns.values()) {
      if (cg.alive) affectAll.push({ body: cg.body, damage: () => this.damageComputerGun(cg, { dirX: 0, dirY: -1 } as BulletState) });
    }

    for (const entry of affectAll) {
      const d = distance(center, entry.body.position);
      if (d <= BOMB_EXPLOSION_RADIUS) {
        const dir = normalize(entry.body.position.x - center.x, entry.body.position.y - center.y);
        const falloff = 1 - d / BOMB_EXPLOSION_RADIUS;
        Body.applyForce(entry.body, entry.body.position, { x: dir.x * BOMB_KNOCKBACK * falloff, y: dir.y * BOMB_KNOCKBACK * falloff });
        entry.damage();
      }
    }
  }

  isBattleOver(): { over: boolean; winner?: "player1" | "player2" | "draw" } {
    const p1 = this.players.player1;
    const p2 = this.players.player2;
    if (!p1 || !p2) return { over: false };
    const p1Dead = !p1.alive;
    const p2Dead = !p2.alive;
    if (p1Dead && p2Dead) return { over: true, winner: "draw" };
    if (p1Dead) return { over: true, winner: "player2" };
    if (p2Dead) return { over: true, winner: "player1" };
    return { over: false };
  }

  getSnapshot(): StateSnapshot {
    const guns: GunSnapshot[] = [];
    for (const p of Object.values(this.players)) {
      if (!p) continue;
      guns.push({
        id: p.role,
        kind: p.role,
        x: p.body.position.x,
        y: p.body.position.y,
        angle: p.body.angle,
        hp: Math.max(0, p.hp),
        maxHp: p.maxHp,
        color: p.color,
        alive: p.alive,
        radius: p.radius,
      });
    }
    for (const cg of this.computerGuns.values()) {
      guns.push({
        id: cg.id,
        kind: "computer",
        x: cg.body.position.x,
        y: cg.body.position.y,
        angle: cg.body.angle,
        hp: Math.max(0, cg.hp),
        maxHp: cg.maxHp,
        color: cg.color,
        alive: cg.alive,
        radius: cg.radius,
      });
    }

    const bullets: BulletSnapshot[] = Array.from(this.bullets.values()).map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      type: b.type,
      owner: b.owner,
    }));

    const bombs: BombSnapshot[] = Array.from(this.bombs.values()).map((b) => ({
      id: b.id,
      x: b.body.position.x,
      y: b.body.position.y,
      alive: b.alive,
      radius: b.radius,
    }));

    const cannons: CannonSnapshot[] = Array.from(this.cannons.values()).map((c) => ({
      id: c.id,
      x: c.body.position.x,
      y: c.body.position.y,
      angle: c.angle,
      hp: Math.max(0, c.hp),
      maxHp: c.maxHp,
      alive: c.alive,
      radius: c.radius,
    }));

    return { tick: this.tickCount, guns, bullets, bombs, cannons };
  }

  getPlayerHp(role: PlayerRole): { hp: number; maxHp: number } | null {
    const p = this.players[role];
    if (!p) return null;
    return { hp: Math.max(0, p.hp), maxHp: p.maxHp };
  }

  destroy() {
    World.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
