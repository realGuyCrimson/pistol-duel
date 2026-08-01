import { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/RoomManager.js";
import { GunTypeId, PlayerRole } from "../types.js";
import { GUN_TYPES } from "../game/constants.js";

interface SocketData {
  roomCode?: string;
  role?: PlayerRole;
}

export function registerHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on("create_room", (payload: { gunType?: string }) => {
      const gunType = payload?.gunType;
      if (!gunType || !(gunType in GUN_TYPES)) {
        socket.emit("error_message", { message: "Invalid gun type." });
        return;
      }
      const room = roomManager.createRoom(socket.id, gunType as GunTypeId);
      socket.join(room.code);
      data.roomCode = room.code;
      data.role = "player1";
      socket.emit("room_created", { code: room.code, token: room.player1.token, role: "player1" });
      room.broadcastRoomInfo();
    });

    socket.on("join_room", (payload: { code?: string; token?: string }) => {
      const code = (payload?.code || "").trim().toUpperCase();
      if (!code) {
        socket.emit("room_not_found", {});
        return;
      }
      const room = roomManager.getRoom(code);
      if (!room) {
        socket.emit("room_not_found", {});
        return;
      }
      const result = room.join(socket.id, payload?.token);
      if (result === "full") {
        socket.emit("room_full", {});
        return;
      }
      if (result === "not_found_token") {
        socket.emit("room_not_found", {});
        return;
      }
      socket.join(room.code);
      data.roomCode = room.code;
      data.role = result.role;
      socket.emit("room_joined", { code: room.code, token: result.token, role: result.role, gunType: room.gunTypeId });
      room.broadcastRoomInfo();
    });

    socket.on("select_color", (payload: { color?: string }) => {
      const room = data.roomCode ? roomManager.getRoom(data.roomCode) : undefined;
      if (!room || !data.role || !payload?.color) return;
      const ok = room.selectColor(data.role, payload.color);
      if (!ok) {
        socket.emit("error_message", { message: "Color unavailable." });
        return;
      }
      room.broadcastRoomInfo();
    });

    socket.on("ready_up", (payload: { ready?: boolean }) => {
      const room = data.roomCode ? roomManager.getRoom(data.roomCode) : undefined;
      if (!room || !data.role) return;
      const ok = room.setReady(data.role, !!payload?.ready);
      if (!ok) {
        socket.emit("error_message", { message: "Choose a color before readying up." });
        return;
      }
      room.broadcastRoomInfo();
      if (room.bothReady() && room.status === "lobby") {
        room.beginCountdown();
      }
    });

    socket.on("fire", () => {
      const room = data.roomCode ? roomManager.getRoom(data.roomCode) : undefined;
      if (!room || !data.role) return;
      room.fire(data.role);
    });

    socket.on("rematch_request", () => {
      const room = data.roomCode ? roomManager.getRoom(data.roomCode) : undefined;
      if (!room || !data.role || room.status !== "ended") return;
      room.requestRematch(data.role);
    });

    socket.on("rematch_decline", () => {
      const room = data.roomCode ? roomManager.getRoom(data.roomCode) : undefined;
      if (!room || !data.role) return;
      room.declineRematch(data.role);
    });

    socket.on("leave_room", () => {
      handleLeave();
    });

    socket.on("disconnect", () => {
      handleLeave();
    });

    function handleLeave() {
      const room = data.roomCode ? roomManager.getRoom(data.roomCode) : undefined;
      if (!room) return;
      room.handleDisconnect(socket.id, (winner) => {
        room.forfeit(winner);
        room.broadcastRoomInfo();
      });
      room.broadcastRoomInfo();
    }
  });
}
