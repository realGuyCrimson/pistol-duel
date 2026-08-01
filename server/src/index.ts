import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { RoomManager } from "./rooms/RoomManager.js";
import { registerHandlers } from "./socket/handlers.js";
import { GUN_TYPES, COLOR_PALETTE } from "./game/constants.js";
import { ARENAS } from "./game/arenas.js";

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pistol-duel-server", time: Date.now() });
});

app.get("/config", (_req, res) => {
  res.json({
    gunTypes: GUN_TYPES,
    colors: COLOR_PALETTE,
    arenaCount: ARENAS.length,
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager(io);
registerHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`[pistol-duel] server listening on http://localhost:${PORT}`);
});
