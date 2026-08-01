import { useState } from "react";
import ColorPicker from "./ColorPicker";
import { GUN_TYPES, type PublicRoomInfo } from "../net/types";

interface Props {
  room: PublicRoomInfo;
  onSelectColor: (color: string) => void;
  onReady: (ready: boolean) => void;
}

export default function Lobby({ room, onSelectColor, onReady }: Props) {
  const [copied, setCopied] = useState(false);
  const gun = GUN_TYPES[room.gunType];
  const isPlayer = room.youAre === "player1" || room.youAre === "player2";
  const me = room.youAre === "player1" ? room.player1 : room.youAre === "player2" ? room.player2 : null;
  const opponent = room.youAre === "player1" ? room.player2 : room.youAre === "player2" ? room.player1 : null;

  const roomUrl = `${window.location.origin}/${room.code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable; ignore
    }
  };

  return (
    <div className="panel">
      <div className="room-code-box">
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ROOM CODE</div>
          <code>{room.code}</code>
        </div>
        <button className="secondary-btn" onClick={copyLink}>
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Gun type: <strong style={{ color: "var(--text)" }}>{gun.name}</strong> ({gun.hp} HP · {gun.bulletType} bullets) —
        chosen by the host, shared by both players.
      </p>

      {!room.player2 && (
        <div className="error-box" style={{ color: "#ffd98f", background: "rgba(255,217,143,0.08)", borderColor: "rgba(255,217,143,0.3)" }}>
          Waiting for a second player to join via the room link…
        </div>
      )}

      <div className="lobby-slots">
        <div className="slot">
          <h4>Player 1 (Host){room.youAre === "player1" ? " — You" : ""}</h4>
          <span className={`status-dot ${room.player1?.connected ? "online" : "offline"}`} />
          {room.player1?.connected ? "Connected" : "Offline"}
          <div>
            {room.player1?.color ? (
              <span className="swatch" style={{ background: room.player1.color, display: "inline-block", marginTop: 8 }} />
            ) : (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No color yet</span>
            )}
          </div>
          <span className={`ready-badge ${room.player1?.ready ? "ready" : ""}`}>
            {room.player1?.ready ? "Ready" : "Not ready"}
          </span>
        </div>

        <div className="slot">
          <h4>Player 2 (Joiner){room.youAre === "player2" ? " — You" : ""}</h4>
          {room.player2 ? (
            <>
              <span className={`status-dot ${room.player2.connected ? "online" : "offline"}`} />
              {room.player2.connected ? "Connected" : "Offline"}
              <div>
                {room.player2.color ? (
                  <span className="swatch" style={{ background: room.player2.color, display: "inline-block", marginTop: 8 }} />
                ) : (
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No color yet</span>
                )}
              </div>
              <span className={`ready-badge ${room.player2.ready ? "ready" : ""}`}>
                {room.player2.ready ? "Ready" : "Not ready"}
              </span>
            </>
          ) : (
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Empty — share the link!</span>
          )}
        </div>
      </div>

      {isPlayer && (
        <>
          <div className="divider" />
          <h3 style={{ marginTop: 0 }}>Your gun color</h3>
          <ColorPicker
            selected={me?.color ?? null}
            taken={opponent?.color ?? null}
            disabled={me?.ready}
            onSelect={onSelectColor}
          />

          <button
            className="primary-btn"
            disabled={!me?.color || !room.player2}
            onClick={() => onReady(!me?.ready)}
          >
            {me?.ready ? "Cancel Ready" : "Ready Up"}
          </button>
        </>
      )}
    </div>
  );
}
