import { Vec2, WallDef } from "../types.js";

export function rotateToLocal(px: number, py: number, cx: number, cy: number, angle: number): Vec2 {
  const dx = px - cx;
  const dy = py - cy;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

export function rotateToWorld(x: number, y: number, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export interface RectHit {
  t: number;
  point: Vec2;
  normal: Vec2;
}

/** Ray/segment (p0->p1) intersection against a possibly-rotated rectangle. Returns closest hit or null. */
export function segmentVsRect(
  p0: Vec2,
  p1: Vec2,
  rect: WallDef
): RectHit | null {
  const angle = rect.angle ?? 0;
  const l0 = rotateToLocal(p0.x, p0.y, rect.x, rect.y, angle);
  const l1 = rotateToLocal(p1.x, p1.y, rect.x, rect.y, angle);
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;

  const dx = l1.x - l0.x;
  const dy = l1.y - l0.y;

  let tmin = 0;
  let tmax = 1;
  let normalLocal: Vec2 = { x: 0, y: 0 };

  // X slab
  if (Math.abs(dx) < 1e-9) {
    if (l0.x < -halfW || l0.x > halfW) return null;
  } else {
    let t1 = (-halfW - l0.x) / dx;
    let t2 = (halfW - l0.x) / dx;
    let nSign = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      nSign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      normalLocal = { x: nSign, y: 0 };
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  // Y slab
  if (Math.abs(dy) < 1e-9) {
    if (l0.y < -halfH || l0.y > halfH) return null;
  } else {
    let t1 = (-halfH - l0.y) / dy;
    let t2 = (halfH - l0.y) / dy;
    let nSign = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      nSign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      normalLocal = { x: 0, y: nSign };
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  if (tmin < 0 || tmin > 1) return null;
  // tmin === 0 means segment started inside the rect; ignore (shouldn't normally happen for bullets)
  if (tmin <= 1e-6) return null;

  const point: Vec2 = { x: p0.x + (p1.x - p0.x) * tmin, y: p0.y + (p1.y - p0.y) * tmin };
  const normal = rotateToWorld(normalLocal.x, normalLocal.y, angle);
  return { t: tmin, point, normal };
}

export function reflect(dirX: number, dirY: number, nx: number, ny: number): Vec2 {
  const dot = dirX * nx + dirY * ny;
  return { x: dirX - 2 * dot * nx, y: dirY - 2 * dot * ny };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(x: number, y: number): Vec2 {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

export function shortestAngleDiff(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
