import { Server } from "socket.io";
import { nanoid } from "nanoid";
import {
  GunTypeId,
  PlayerRole,
  PublicRoomInfo,
  RoomStatus,
  WinnerResult,
} from "../types.js";
import { GUN_TYPES, COUNTDOWN_SECONDS, RECONNECT_WINDOW_MS, ROOM_EMPTY_TIMEOUT_MS, TICK_MS, COLOR_PALETTE } from "../game/constants.js";
import { pickRandomArena } from "../game/arenas.js";
import { Simulation } from "../game/Simulation.js";

interface PlayerSlot {
  socketId: string;
  token: string;
  color: string | null;
  ready: boolean;
  connected: boolean;
  disconnectTimer: NodeJS.Timeout | null;
}

export class Room {
  code: string;
  status: RoomStatus = "waiting";
  gunTypeId: GunTypeId;
  arena = pickRandomArena();
  player1: PlayerSlot;
  player2: PlayerSlot | null = null;
  sim: Simulation | null = null;
  private tickHandle: NodeJS.Timeout | null = null;
  private countdownHandle: NodeJS.Timeout | null = null;
  private emptyTimer: NodeJS.Timeout | null = null;
  private rematchVotes = new Set<PlayerRole>();
  private io: Server;
  private onEmpty: () => void;

  constructor(code: string, gunTypeId: GunTypeId, hostSocketId: string, io: Server, onEmpty: () => void) {
    this.code = code;
    this.gunTypeId = gunTypeId;
    this.io = io;
    this.onEmpty = onEmpty;
    this.player1 = {
      socketId: hostSocketId,
      token: nanoid(16),
      color: null,
      ready: false,
      connected: true,
      disconnectTimer: null,
    };
  }

  get gunType() {
    return GUN_TYPES[this.gunTypeId];
  }

  roleOfSocket(socketId: string): PlayerRole | null {
    if (this.player1.socketId === socketId) return "player1";
    if (this.player2 && this.player2.socketId === socketId) return "player2";
    return null;
  }

  slotFor(role: PlayerRole): PlayerSlot | null {
    return role === "player1" ? this.player1 : this.player2;
  }

  /** Attempt to join as a fresh player or reconnect via token. */
  join(socketId: string, token?: string): { role: PlayerRole; token: string } | "full" | "not_found_token" {
    // reconnect attempt
    if (token) {
      if (this.player1.token === token) {
        this.reconnectSlot(this.player1, socketId);
        return { role: "player1", token: this.player1.token };
      }
      if (this.player2 && this.player2.token === token) {
        this.reconnectSlot(this.player2, socketId);
        return { role: "player2", token: this.player2.token };
      }
    }

    if (!this.player2) {
      this.player2 = {
        socketId,
        token: nanoid(16),
        color: null,
        ready: false,
        connected: true,
        disconnectTimer: null,
      };
      this.status = "lobby";
      this.clearEmptyTimer();
      return { role: "player2", token: this.player2.token };
    }
    return "full";
  }

  private reconnectSlot(slot: PlayerSlot, socketId: string) {
    slot.socketId = socketId;
    slot.connected = true;
    if (slot.disconnectTimer) {
      clearTimeout(slot.disconnectTimer);
      slot.disconnectTimer = null;
    }
    this.clearEmptyTimer();
  }

  handleDisconnect(socketId: string, onForfeit: (winner: WinnerResult) => void) {
    const role = this.roleOfSocket(socketId);
    if (!role) return;
    const slot = this.slotFor(role);
    if (!slot) return;
    slot.connected = false;

    if (this.status === "active") {
      slot.disconnectTimer = setTimeout(() => {
        if (!slot.connected) {
          onForfeit(role === "player1" ? "player2" : "player1");
        }
      }, RECONNECT_WINDOW_MS);
    } else if (this.status === "waiting" || this.status === "lobby" || this.status === "countdown") {
      slot.disconnectTimer = setTimeout(() => {
        if (!slot.connected) {
          if (role === "player2") {
            this.player2 = null;
            this.status = "waiting";
            this.broadcastRoomInfo();
          }
        }
      }, RECONNECT_WINDOW_MS);
    }

    const bothGone = !this.player1.connected && (!this.player2 || !this.player2.connected);
    if (bothGone) {
      this.emptyTimer = setTimeout(() => this.onEmpty(), ROOM_EMPTY_TIMEOUT_MS);
    }
  }

  private clearEmptyTimer() {
    if (this.emptyTimer) {
      clearTimeout(this.emptyTimer);
      this.emptyTimer = null;
    }
  }

  selectColor(role: PlayerRole, color: string): boolean {
    if (!COLOR_PALETTE.includes(color as any)) return false;
    const other = role === "player1" ? this.player2 : this.player1;
    if (other && other.color === color) return false;
    const slot = this.slotFor(role);
    if (!slot) return false;
    slot.color = color;
    return true;
  }

  setReady(role: PlayerRole, ready: boolean): boolean {
    const slot = this.slotFor(role);
    if (!slot) return false;
    if (ready && !slot.color) return false;
    slot.ready = ready;
    return true;
  }

  bothReady(): boolean {
    return !!(this.player1.ready && this.player2 && this.player2.ready && this.player1.color && this.player2.color);
  }

  beginCountdown() {
    if (this.status !== "lobby") return;
    this.arena = pickRandomArena();
    this.status = "countdown";
    this.broadcastRoomInfo();
    this.io.to(this.code).emit("arena_selected", {
      id: this.arena.id,
      name: this.arena.name,
      width: this.arena.width,
      height: this.arena.height,
      walls: this.arena.walls,
      divisions: this.arena.divisions,
      bombs: this.arena.bombs,
      cannons: this.arena.cannons,
    });

    let n = COUNTDOWN_SECONDS;
    const tick = () => {
      this.io.to(this.code).emit("countdown_tick", { value: n });
      if (n <= 0) {
        this.startBattle();
        return;
      }
      n--;
      this.countdownHandle = setTimeout(tick, 1000);
    };
    tick();
  }

  private startBattle() {
    this.status = "active";
    this.sim = new Simulation(this.arena, this.gunType);
    this.sim.addPlayer("player1", this.player1.color!);
    if (this.player2) this.sim.addPlayer("player2", this.player2.color!);

    this.broadcastRoomInfo();
    this.io.to(this.code).emit("battle_start", { serverTime: Date.now() });

    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    if (!this.sim) return;
    this.sim.step(TICK_MS);

    const events = this.sim.drainEvents();
    for (const ev of events) {
      if (ev.kind === "hit") {
        this.io.to(this.code).emit("hit_event", ev);
      } else if (ev.kind === "destroy") {
        this.io.to(this.code).emit("destroy_event", ev);
      } else if (ev.kind === "bombExplode") {
        this.io.to(this.code).emit("bomb_explode", ev);
      } else if (ev.kind === "shot") {
        this.io.to(this.code).emit("shot_event", ev);
      }
    }

    this.io.to(this.code).emit("state_update", this.sim.getSnapshot());

    const result = this.sim.isBattleOver();
    if (result.over && result.winner) {
      this.endBattle(result.winner);
    }
  }

  fire(role: PlayerRole) {
    if (this.status !== "active" || !this.sim) return;
    this.sim.handleFire(role);
  }

  forfeit(winner: WinnerResult) {
    if (this.status !== "active") return;
    this.endBattle(winner);
  }

  private endBattle(winner: WinnerResult) {
    this.status = "ended";
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    this.rematchVotes.clear();
    this.broadcastRoomInfo();
    this.io.to(this.code).emit("battle_end", { winner });
  }

  requestRematch(role: PlayerRole): "waiting" | "starting" {
    this.rematchVotes.add(role);
    if (this.rematchVotes.has("player1") && this.rematchVotes.has("player2") && this.player2) {
      this.rematchVotes.clear();
      this.player1.ready = true;
      if (this.player2) this.player2.ready = true;
      if (this.sim) {
        this.sim.destroy();
        this.sim = null;
      }
      this.status = "lobby";
      this.io.to(this.code).emit("rematch_start", {});
      this.beginCountdown();
      return "starting";
    }
    this.io.to(this.code).emit("rematch_pending", { from: role });
    return "waiting";
  }

  declineRematch(role: PlayerRole) {
    this.io.to(this.code).emit("rematch_declined", { from: role });
  }

  destroyRoom() {
    if (this.tickHandle) clearInterval(this.tickHandle);
    if (this.countdownHandle) clearTimeout(this.countdownHandle);
    if (this.emptyTimer) clearTimeout(this.emptyTimer);
    if (this.player1.disconnectTimer) clearTimeout(this.player1.disconnectTimer);
    if (this.player2?.disconnectTimer) clearTimeout(this.player2.disconnectTimer);
    if (this.sim) this.sim.destroy();
  }

  getPublicInfo(forRole: PlayerRole | "spectator"): PublicRoomInfo {
    const hp1 = this.sim?.getPlayerHp("player1");
    const hp2 = this.sim?.getPlayerHp("player2");
    return {
      code: this.code,
      status: this.status,
      gunType: this.gunTypeId,
      arena:
        this.status === "countdown" || this.status === "active" || this.status === "ended"
          ? {
              id: this.arena.id,
              name: this.arena.name,
              width: this.arena.width,
              height: this.arena.height,
              walls: this.arena.walls,
              divisions: this.arena.divisions,
              bombs: this.arena.bombs,
              cannons: this.arena.cannons,
            }
          : undefined,
      player1: this.player1
        ? {
            color: this.player1.color,
            ready: this.player1.ready,
            connected: this.player1.connected,
            hp: hp1?.hp ?? this.gunType.hp,
            maxHp: this.gunType.hp,
          }
        : null,
      player2: this.player2
        ? {
            color: this.player2.color,
            ready: this.player2.ready,
            connected: this.player2.connected,
            hp: hp2?.hp ?? this.gunType.hp,
            maxHp: this.gunType.hp,
          }
        : null,
      youAre: forRole,
    };
  }

  broadcastRoomInfo() {
    this.io.to(this.player1.socketId).emit("room_info", this.getPublicInfo("player1"));
    if (this.player2) {
      this.io.to(this.player2.socketId).emit("room_info", this.getPublicInfo("player2"));
    }
  }
}
