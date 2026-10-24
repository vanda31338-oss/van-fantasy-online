import Phaser from 'phaser';
import { CLASSES } from '../data/classes';
import type { ElementId } from '../data/balance';
import { GameState } from '../core/GameState';
import { Actor } from './Actor';
import type { WorldScene } from '../scenes/WorldScene';
import { txt } from '../ui/theme';

export class Player extends Actor {
  nextAttackAt = 0;
  invulnUntil = 0;
  skillReadyAt: Record<string, number> = {};
  nameText: Phaser.GameObjects.Text;
  castBar: Phaser.GameObjects.Graphics;
  casting: { skillId: string; start: number; end: number } | null = null;
  /** Auto-walk destination (NPC interaction / approach target). */
  moveTarget: { x: number; y: number; range: number; onArrive?: () => void } | null = null;

  constructor(world: WorldScene, x: number, y: number) {
    super(world, x, y, CLASSES[GameState.char.classId].sprite, 'player', 5);
    this.nameText = txt(world, x, y, GameState.char.name, 8, { font: 'body', color: '#ffffff', stroke: '#1a1030', strokeThickness: 2 }).setOrigin(0.5, 0);
    this.castBar = world.add.graphics();
  }

  get cls() {
    return CLASSES[GameState.char.classId];
  }
  get maxHp() { return GameState.derived.maxHp; }
  get hp() { return GameState.char.hp; }
  set hp(v: number) { GameState.char.hp = Math.max(0, Math.min(this.maxHp, v)); }
  get maxMp() { return GameState.derived.maxMp; }
  get mp() { return GameState.char.mp; }
  set mp(v: number) { GameState.char.mp = Math.max(0, Math.min(this.maxMp, v)); }
  get level() { return GameState.char.level; }
  get atk() { return GameState.derived.atk; }
  get matk() { return GameState.derived.matk; }
  get def() { return GameState.derived.def; }
  get mdef() { return GameState.derived.mdef; }
  get hit() { return GameState.derived.hit; }
  get flee() { return GameState.derived.flee; }
  get crit() { return GameState.derived.crit; }
  get element(): ElementId { return GameState.derived.element; }
  get displayName() { return GameState.char.name; }

  attackIntervalMs() {
    return 1000 / GameState.derived.aspd;
  }

  syncVisuals() {
    super.syncVisuals();
    this.nameText.setPosition(Math.round(this.x), Math.round(this.y + 2));
    this.nameText.setDepth(this.y + 1);
    this.castBar.clear();
    if (this.casting) {
      const t = this.now();
      const p = Phaser.Math.Clamp((t - this.casting.start) / (this.casting.end - this.casting.start), 0, 1);
      const x = Math.round(this.x - 12), y = Math.round(this.y - 36);
      this.castBar.fillStyle(0x0f0b1e, 1).fillRect(x - 1, y - 1, 26, 5);
      this.castBar.fillStyle(0x7ab8ff, 1).fillRect(x, y, Math.round(24 * p), 3);
      this.castBar.setDepth(this.y + 2);
    }
    if (this.invulnUntil > this.now()) this.setAlpha(Math.floor(this.now() / 100) % 2 ? 0.5 : 1);
    else this.setAlpha(1);
  }

  destroy(fromScene?: boolean) {
    this.nameText?.destroy();
    this.castBar?.destroy();
    super.destroy(fromScene);
  }
}
