import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { createBattleGame } from "../game/createGame";
import type { ArenaInfo, StateSnapshot } from "../net/types";
import type { FxEvent } from "../game/fx";

interface PlayerHud {
  color: string | null;
  hp: number;
  maxHp: number;
}

interface Props {
  arena: ArenaInfo;
  snapshotRef: React.RefObject<StateSnapshot | null>;
  fxQueueRef: React.RefObject<FxEvent[]>;
  onFire: () => void;
  player1: PlayerHud | null;
  player2: PlayerHud | null;
}

export default function BattleView({ arena, snapshotRef, fxQueueRef, onFire, player1, player2 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    gameRef.current = createBattleGame(hostRef.current, {
      arena,
      snapshotRef: snapshotRef as { current: StateSnapshot | null },
      fxQueueRef: fxQueueRef as { current: FxEvent[] },
      onFire,
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="battle-wrap">
      <div className="battle-canvas-host" ref={hostRef}>
        <div className="hud">
          <HeartRow player={player1} align="left" />
          <HeartRow player={player2} align="right" />
        </div>
        <div className="tap-hint">TAP / CLICK / SPACE TO FIRE</div>
      </div>
    </div>
  );
}

function HeartRow({ player, align }: { player: PlayerHud | null; align: "left" | "right" }) {
  if (!player) return <div />;
  const hearts = Array.from({ length: player.maxHp }).map((_, i) => (
    <span
      key={i}
      className={`hp-heart ${i < player.hp ? "" : "lost"}`}
      style={i < player.hp && player.color ? { background: player.color, boxShadow: `0 0 6px ${player.color}` } : undefined}
    />
  ));
  return (
    <div className="hp-bar-group" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
      {hearts}
    </div>
  );
}
