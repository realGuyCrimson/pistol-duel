import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import { GunTypeId } from "../types.js";
import { Room } from "./Room.js";

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
const genCode = customAlphabet(codeAlphabet, 6);

export class RoomManager {
  private rooms = new Map<string, Room>();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  private uniqueCode(): string {
    let code = genCode();
    while (this.rooms.has(code)) code = genCode();
    return code;
  }

  createRoom(hostSocketId: string, gunTypeId: GunTypeId): Room {
    const code = this.uniqueCode();
    const room = new Room(code, gunTypeId, hostSocketId, this.io, () => this.removeRoom(code));
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removeRoom(code: string) {
    const room = this.rooms.get(code);
    if (room) {
      room.destroyRoom();
      this.rooms.delete(code);
    }
  }

  findRoomBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.roleOfSocket(socketId)) return room;
    }
    return undefined;
  }
}
