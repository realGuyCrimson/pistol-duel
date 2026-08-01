export type FxEvent =
  | { kind: "hit"; targetKind: "player" | "computer" | "cannon"; targetId: string; x: number; y: number }
  | { kind: "destroy"; targetKind: "player" | "computer" | "cannon" | "bomb"; targetId: string; x: number; y: number }
  | { kind: "bombExplode"; x: number; y: number; radius: number }
  | { kind: "shot"; owner: string; x: number; y: number };
