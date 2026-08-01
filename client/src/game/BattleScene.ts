import Phaser from "phaser";
import type { ArenaInfo, StateSnapshot } from "../net/types";
import type { FxEvent } from "./fx";

const BULLET_COLORS: Record<string, number> = {
  straight: 0xffffff,
  bounce: 0x4fd7ff,
  wavy: 0xff6ad5,
};

interface GunVisual {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  barrel: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface CannonVisual {
  container: Phaser.GameObjects.Container;
  barrel: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export interface BattleSceneInit {
  arena: ArenaInfo;
  snapshotRef: { current: StateSnapshot | null };
  fxQueueRef: { current: FxEvent[] };
  onFire: () => void;
}

export class BattleScene extends Phaser.Scene {
  private arena!: ArenaInfo;
  private snapshotRef!: { current: StateSnapshot | null };
  private fxQueueRef!: { current: FxEvent[] };
  private onFire!: () => void;

  private guns = new Map<string, GunVisual>();
  private bullets = new Map<string, Phaser.GameObjects.Arc>();
  private bombs = new Map<string, Phaser.GameObjects.Container>();
  private cannons = new Map<string, CannonVisual>();
  private fxLayer!: Phaser.GameObjects.Layer;

  constructor() {
    super("battle");
  }

  init(data: BattleSceneInit) {
    this.arena = data.arena;
    this.snapshotRef = data.snapshotRef;
    this.fxQueueRef = data.fxQueueRef;
    this.onFire = data.onFire;
  }

  create() {
    const { width, height } = this.arena;

    // floor
    const floor = this.add.graphics();
    floor.fillStyle(0x0b0f18, 1);
    floor.fillRect(0, 0, width, height);
    floor.lineStyle(2, 0x1f2636, 1);
    for (let x = 0; x <= width; x += 80) floor.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 80) floor.lineBetween(0, y, width, y);

    // border
    const border = this.add.graphics();
    border.lineStyle(4, 0x3a4258, 1);
    border.strokeRect(2, 2, width - 4, height - 4);

    // static walls & divisions
    const wallLayer = this.add.graphics();
    for (const w of [...this.arena.walls, ...this.arena.divisions]) {
      const color = w.bouncy ? 0x35e0c9 : 0x4a5468;
      wallLayer.save();
      wallLayer.translateCanvas(w.x, w.y);
      wallLayer.rotateCanvas(w.angle ?? 0);
      wallLayer.fillStyle(color, 1);
      wallLayer.fillRoundedRect(-w.w / 2, -w.h / 2, w.w, w.h, 4);
      if (w.bouncy) {
        wallLayer.lineStyle(2, 0x8ff5e6, 0.9);
        wallLayer.strokeRoundedRect(-w.w / 2, -w.h / 2, w.w, w.h, 4);
      }
      wallLayer.restore();
    }

    this.fxLayer = this.add.layer();

    this.input.on("pointerdown", () => this.onFire());
    this.input.keyboard?.on("keydown-SPACE", () => this.onFire());

    this.cameras.main.setBackgroundColor(0x05070c);
  }

  update() {
    const snap = this.snapshotRef.current;
    if (snap) {
      this.syncGuns(snap);
      this.syncBullets(snap);
      this.syncBombs(snap);
      this.syncCannons(snap);
    }
    if (this.fxQueueRef.current.length) {
      const events = this.fxQueueRef.current.splice(0, this.fxQueueRef.current.length);
      for (const ev of events) this.playFx(ev);
    }
  }

  private syncGuns(snap: StateSnapshot) {
    const seen = new Set<string>();
    for (const g of snap.guns) {
      seen.add(g.id);
      let visual = this.guns.get(g.id);
      const colorNum = Phaser.Display.Color.HexStringToColor(g.color).color;

      if (!visual) {
        const container = this.add.container(g.x, g.y);
        const body = this.add.circle(0, 0, g.radius, colorNum);
        body.setStrokeStyle(3, 0x0a0d14, 1);
        const barrel = this.add.rectangle(0, 0, g.radius * 1.5, 7, 0xffffff).setOrigin(0, 0.5);
        container.add([body, barrel]);
        const label = this.add
          .text(g.x, g.y - g.radius - 16, `${g.hp}/${g.maxHp}`, {
            fontSize: "13px",
            color: "#eef1f8",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        visual = { container, body, barrel, label };
        this.guns.set(g.id, visual);
      }

      if (!g.alive) {
        visual.container.destroy();
        visual.label.destroy();
        this.guns.delete(g.id);
        continue;
      }

      visual.container.setPosition(g.x, g.y);
      visual.container.setRotation(g.angle);
      visual.body.setFillStyle(colorNum);
      visual.label.setPosition(g.x, g.y - g.radius - 16);
      visual.label.setText(`${g.hp}/${g.maxHp}`);
    }
    for (const id of Array.from(this.guns.keys())) {
      if (!seen.has(id)) {
        const v = this.guns.get(id)!;
        v.container.destroy();
        v.label.destroy();
        this.guns.delete(id);
      }
    }
  }

  private syncBullets(snap: StateSnapshot) {
    const seen = new Set<string>();
    for (const b of snap.bullets) {
      seen.add(b.id);
      let arc = this.bullets.get(b.id);
      const color = BULLET_COLORS[b.type] ?? 0xffffff;
      if (!arc) {
        arc = this.add.circle(b.x, b.y, 6, color);
        arc.setStrokeStyle(2, color, 0.4);
        this.bullets.set(b.id, arc);
      }
      arc.setPosition(b.x, b.y);
    }
    for (const id of Array.from(this.bullets.keys())) {
      if (!seen.has(id)) {
        this.bullets.get(id)!.destroy();
        this.bullets.delete(id);
      }
    }
  }

  private syncBombs(snap: StateSnapshot) {
    const seen = new Set<string>();
    for (const b of snap.bombs) {
      if (!b.alive) continue;
      seen.add(b.id);
      let container = this.bombs.get(b.id);
      if (!container) {
        container = this.add.container(b.x, b.y);
        const body = this.add.circle(0, 0, b.radius, 0x7a0f0f);
        body.setStrokeStyle(3, 0xff5f5f, 0.8);
        const core = this.add.circle(0, 0, b.radius * 0.4, 0xff5f5f);
        container.add([body, core]);
        this.tweens.add({
          targets: core,
          alpha: { from: 1, to: 0.35 },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
        this.bombs.set(b.id, container);
      }
      container.setPosition(b.x, b.y);
    }
    for (const id of Array.from(this.bombs.keys())) {
      if (!seen.has(id)) {
        this.bombs.get(id)!.destroy();
        this.bombs.delete(id);
      }
    }
  }

  private syncCannons(snap: StateSnapshot) {
    const seen = new Set<string>();
    for (const c of snap.cannons) {
      if (!c.alive) {
        continue;
      }
      seen.add(c.id);
      let visual = this.cannons.get(c.id);
      if (!visual) {
        const container = this.add.container(c.x, c.y);
        const body = this.add.circle(0, 0, c.radius, 0x596076);
        body.setStrokeStyle(3, 0x8a93a6, 1);
        const barrel = this.add.rectangle(0, 0, c.radius * 1.6, 9, 0xd9dde6).setOrigin(0, 0.5);
        container.add([body, barrel]);
        const label = this.add
          .text(c.x, c.y - c.radius - 14, `${c.hp}/${c.maxHp}`, { fontSize: "12px", color: "#c7ccda" })
          .setOrigin(0.5);
        visual = { container, barrel, label };
        this.cannons.set(c.id, visual);
      }
      visual.container.setPosition(c.x, c.y);
      visual.container.setRotation(c.angle);
      visual.label.setPosition(c.x, c.y - c.radius - 14);
      visual.label.setText(`${c.hp}/${c.maxHp}`);
    }
    for (const id of Array.from(this.cannons.keys())) {
      if (!seen.has(id)) {
        const v = this.cannons.get(id)!;
        v.container.destroy();
        v.label.destroy();
        this.cannons.delete(id);
      }
    }
  }

  private playFx(ev: FxEvent) {
    if (ev.kind === "hit") {
      const ring = this.add.circle(ev.x, ev.y, 10, 0xffffff, 0.9);
      this.fxLayer.add(ring);
      this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
    } else if (ev.kind === "destroy") {
      const burst = this.add.circle(ev.x, ev.y, 16, 0xff9a3d, 0.9);
      this.fxLayer.add(burst);
      this.tweens.add({ targets: burst, scale: 3.2, alpha: 0, duration: 420, onComplete: () => burst.destroy() });
      this.cameras.main.shake(120, 0.006);
    } else if (ev.kind === "bombExplode") {
      const ring = this.add.circle(ev.x, ev.y, 8, 0xffaa33, 0.85);
      ring.setStrokeStyle(4, 0xffdd88, 1);
      this.fxLayer.add(ring);
      this.tweens.add({
        targets: ring,
        radius: ev.radius,
        alpha: 0,
        duration: 380,
        onComplete: () => ring.destroy(),
      });
      this.cameras.main.shake(220, 0.01);
    } else if (ev.kind === "shot") {
      const flash = this.add.circle(ev.x, ev.y, 5, 0xfff2b0, 0.9);
      this.fxLayer.add(flash);
      this.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
    }
  }
}
