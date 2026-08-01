import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { socket, saveSession, loadSession } from "../net/socket";
import type {
  ArenaInfo,
  PublicRoomInfo,
  StateSnapshot,
  WinnerResult,
} from "../net/types";
import type { FxEvent } from "../game/fx";
import Lobby from "../components/Lobby";
import BattleView from "../components/BattleView";

interface RematchInfo {
  requestedByMe: boolean;
  opponentRequested: boolean;
  declined: boolean;
}

export default function RoomPage() {
  const { code = "" } = useParams();
  const upperCode = code.toUpperCase();

  const [roomInfo, setRoomInfo] = useState<PublicRoomInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [full, setFull] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [arenaInfo, setArenaInfo] = useState<ArenaInfo | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [winner, setWinner] = useState<WinnerResult | null>(null);
  const [rematch, setRematch] = useState<RematchInfo>({ requestedByMe: false, opponentRequested: false, declined: false });
  const [hp1, setHp1] = useState<number | null>(null);
  const [hp2, setHp2] = useState<number | null>(null);

  const snapshotRef = useRef<StateSnapshot | null>(null);
  const fxQueueRef = useRef<FxEvent[]>([]);

  useEffect(() => {
    if (!upperCode) return;

    const attemptJoin = () => {
      const session = loadSession(upperCode);
      socket.emit("join_room", { code: upperCode, token: session?.token });
    };

    if (socket.connected) attemptJoin();
    socket.on("connect", attemptJoin);

    const onRoomJoined = (payload: { code: string; token: string; role: "player1" | "player2" }) => {
      saveSession({ code: upperCode, token: payload.token, role: payload.role });
      setNotFound(false);
      setFull(false);
    };
    const onRoomNotFound = () => setNotFound(true);
    const onRoomFull = () => setFull(true);
    const onRoomInfo = (info: PublicRoomInfo) => setRoomInfo(info);
    const onArenaSelected = (a: ArenaInfo) => {
      setArenaInfo(a);
      setWinner(null);
      setRematch({ requestedByMe: false, opponentRequested: false, declined: false });
    };
    const onCountdownTick = (p: { value: number }) => setCountdown(p.value);
    const onBattleStart = () => {
      setCountdown(null);
      setWinner(null);
      snapshotRef.current = null;
    };
    const onStateUpdate = (snap: StateSnapshot) => {
      snapshotRef.current = snap;
      const p1 = snap.guns.find((g) => g.id === "player1");
      const p2 = snap.guns.find((g) => g.id === "player2");
      if (p1) setHp1(p1.hp);
      if (p2) setHp2(p2.hp);
    };
    const onHit = (ev: any) => fxQueueRef.current.push({ kind: "hit", ...ev });
    const onDestroy = (ev: any) => fxQueueRef.current.push({ kind: "destroy", ...ev });
    const onBombExplode = (ev: any) => fxQueueRef.current.push({ kind: "bombExplode", ...ev });
    const onShot = (ev: any) => fxQueueRef.current.push({ kind: "shot", ...ev });
    const onBattleEnd = (p: { winner: WinnerResult }) => setWinner(p.winner);
    const onRematchPending = () => {
      setRematch((r) => ({ ...r, opponentRequested: true }));
    };
    const onRematchDeclined = () => setRematch((r) => ({ ...r, declined: true }));
    const onRematchStart = () => {
      setWinner(null);
      setCountdown(null);
      setHp1(null);
      setHp2(null);
      setRematch({ requestedByMe: false, opponentRequested: false, declined: false });
    };
    const onErrorMessage = (p: { message: string }) => setErrorMsg(p.message);

    socket.on("room_joined", onRoomJoined);
    socket.on("room_created", onRoomJoined as any);
    socket.on("room_not_found", onRoomNotFound);
    socket.on("room_full", onRoomFull);
    socket.on("room_info", onRoomInfo);
    socket.on("arena_selected", onArenaSelected);
    socket.on("countdown_tick", onCountdownTick);
    socket.on("battle_start", onBattleStart);
    socket.on("state_update", onStateUpdate);
    socket.on("hit_event", onHit);
    socket.on("destroy_event", onDestroy);
    socket.on("bomb_explode", onBombExplode);
    socket.on("shot_event", onShot);
    socket.on("battle_end", onBattleEnd);
    socket.on("rematch_pending", onRematchPending);
    socket.on("rematch_declined", onRematchDeclined);
    socket.on("rematch_start", onRematchStart);
    socket.on("error_message", onErrorMessage);

    return () => {
      socket.off("connect", attemptJoin);
      socket.off("room_joined", onRoomJoined);
      socket.off("room_created", onRoomJoined as any);
      socket.off("room_not_found", onRoomNotFound);
      socket.off("room_full", onRoomFull);
      socket.off("room_info", onRoomInfo);
      socket.off("arena_selected", onArenaSelected);
      socket.off("countdown_tick", onCountdownTick);
      socket.off("battle_start", onBattleStart);
      socket.off("state_update", onStateUpdate);
      socket.off("hit_event", onHit);
      socket.off("destroy_event", onDestroy);
      socket.off("bomb_explode", onBombExplode);
      socket.off("shot_event", onShot);
      socket.off("battle_end", onBattleEnd);
      socket.off("rematch_pending", onRematchPending);
      socket.off("rematch_declined", onRematchDeclined);
      socket.off("rematch_start", onRematchStart);
      socket.off("error_message", onErrorMessage);
    };
  }, [upperCode]);

  const selectColor = (color: string) => socket.emit("select_color", { color });
  const setReady = (ready: boolean) => socket.emit("ready_up", { ready });
  const fire = () => socket.emit("fire");
  const requestRematch = () => {
    setRematch((r) => ({ ...r, requestedByMe: true }));
    socket.emit("rematch_request");
  };

  if (notFound) {
    return (
      <div className="app-shell">
        <h1 className="title">Room not found</h1>
        <p className="subtitle">The code "{upperCode}" doesn't match an active room.</p>
        <Link className="link-back" to="/">
          ← Back to home
        </Link>
      </div>
    );
  }

  if (full) {
    return (
      <div className="app-shell">
        <h1 className="title">Room is full</h1>
        <p className="subtitle">This duel already has two players.</p>
        <Link className="link-back" to="/">
          ← Back to home
        </Link>
      </div>
    );
  }

  if (!roomInfo) {
    return (
      <div className="app-shell">
        <h1 className="title">🔫 PISTOL DUEL</h1>
        <p className="subtitle">Joining room {upperCode}…</p>
        {errorMsg && <div className="error-box">{errorMsg}</div>}
      </div>
    );
  }

  const isBattlePhase = roomInfo.status === "countdown" || roomInfo.status === "active" || roomInfo.status === "ended";

  return (
    <div className="app-shell">
      <h1 className="title">🔫 PISTOL DUEL</h1>
      {errorMsg && <div className="error-box">{errorMsg}</div>}

      {!isBattlePhase && (
        <Lobby room={roomInfo} onSelectColor={selectColor} onReady={setReady} />
      )}

      {isBattlePhase && arenaInfo && (
        <div style={{ position: "relative", width: "100%", maxWidth: 1000 }}>
          <BattleView
            arena={arenaInfo}
            snapshotRef={snapshotRef}
            fxQueueRef={fxQueueRef}
            onFire={fire}
            player1={
              roomInfo.player1
                ? { color: roomInfo.player1.color, hp: hp1 ?? roomInfo.player1.hp, maxHp: roomInfo.player1.maxHp }
                : null
            }
            player2={
              roomInfo.player2
                ? { color: roomInfo.player2.color, hp: hp2 ?? roomInfo.player2.hp, maxHp: roomInfo.player2.maxHp }
                : null
            }
          />

          {countdown !== null && (
            <div className="overlay-center">
              <div className="countdown-number">{countdown > 0 ? countdown : "FIGHT!"}</div>
              <div className="subtitle" style={{ marginBottom: 0 }}>{arenaInfo.name}</div>
            </div>
          )}

          {winner && (
            <div className="overlay-center">
              <div className="victory-panel">
                <div className="victory-title">
                  {winner === "draw"
                    ? "Draw!"
                    : winner === roomInfo.youAre
                    ? "You Win!"
                    : "You Lose!"}
                </div>
                <p className="subtitle">
                  {rematch.declined
                    ? "Opponent left the duel."
                    : rematch.requestedByMe
                    ? "Waiting for opponent to accept rematch…"
                    : rematch.opponentRequested
                    ? "Opponent wants a rematch!"
                    : "Good game."}
                </p>
                <div className="row" style={{ justifyContent: "center" }}>
                  {!rematch.declined && (
                    <button className="primary-btn" style={{ width: "auto" }} onClick={requestRematch} disabled={rematch.requestedByMe}>
                      {rematch.requestedByMe ? "Waiting…" : "Rematch"}
                    </button>
                  )}
                  <Link className="secondary-btn" to="/" style={{ textDecoration: "none" }}>
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
