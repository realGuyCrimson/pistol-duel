import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket, saveSession } from "../net/socket";
import { GUN_TYPES, type GunTypeId } from "../net/types";

export default function Home() {
  const navigate = useNavigate();
  const [gunType, setGunType] = useState<GunTypeId>("pistol");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const createRoom = () => {
    setCreating(true);
    setError(null);
    socket.emit("create_room", { gunType });
    socket.once("room_created", (payload: { code: string; token: string; role: "player1" }) => {
      saveSession({ code: payload.code, token: payload.token, role: payload.role });
      setCreating(false);
      navigate(`/${payload.code}`);
    });
  };

  const joinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/${code}`);
  };

  return (
    <div className="app-shell">
      <h1 className="title">🔫 PISTOL DUEL</h1>
      <p className="subtitle">
        <span className={`status-dot ${connected ? "online" : "offline"}`} />
        {connected ? "Connected to server" : "Connecting to server…"}
      </p>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>1. Choose your gun</h3>
        <div className="gun-grid">
          {Object.values(GUN_TYPES).map((g) => (
            <button
              key={g.id}
              className={`gun-card ${gunType === g.id ? "selected" : ""}`}
              onClick={() => setGunType(g.id)}
            >
              <h3>{g.name}</h3>
              <p>Bullet: {g.bulletType}</p>
              <p>Mass: {g.mass.toFixed(1)}x</p>
              <div className="hp-pips">
                {Array.from({ length: g.hp }).map((_, i) => (
                  <span className="hp-pip" key={i} />
                ))}
              </div>
            </button>
          ))}
        </div>

        <button className="primary-btn" onClick={createRoom} disabled={creating || !connected}>
          {creating ? "Creating room…" : "Create Room"}
        </button>
        {error && <div className="error-box">{error}</div>}

        <div className="divider" />

        <h3 style={{ marginTop: 0 }}>Join a room</h3>
        <div className="row">
          <input
            type="text"
            placeholder="ROOM CODE"
            value={joinCode}
            maxLength={6}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinByCode()}
          />
          <button className="secondary-btn" onClick={joinByCode} disabled={!joinCode.trim()}>
            Join
          </button>
        </div>
      </div>

      <p className="subtitle" style={{ marginTop: 20, maxWidth: 500 }}>
        No usernames. The host picks the gun, then shares the room link. Whoever destroys the
        other gun first wins. One tap fires — recoil is your only movement.
      </p>
    </div>
  );
}
