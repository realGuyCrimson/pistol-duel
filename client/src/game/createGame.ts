import Phaser from "phaser";
import { BattleScene, type BattleSceneInit } from "./BattleScene";

export function createBattleGame(parent: HTMLElement, init: BattleSceneInit): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: init.arena.width,
    height: init.arena.height,
    backgroundColor: "#05070c",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { antialias: true, pixelArt: false },
  });

  game.scene.add("battle", BattleScene, true, init);
  return game;
}
