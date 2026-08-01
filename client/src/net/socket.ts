import { io, Socket } from "socket.io-client";

export const SERVER_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined) || "http://localhost:3001";

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

export interface RoomSession {
  code: string;
  token: string;
  role: "player1" | "player2";
}

const sessionKey = (code: string) => `pd_session_${code.toUpperCase()}`;

export function saveSession(session: RoomSession) {
  sessionStorage.setItem(sessionKey(session.code), JSON.stringify(session));
}

export function loadSession(code: string): RoomSession | null {
  const raw = sessionStorage.getItem(sessionKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomSession;
  } catch {
    return null;
  }
}

export function clearSession(code: string) {
  sessionStorage.removeItem(sessionKey(code));
}
