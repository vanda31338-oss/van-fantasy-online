import Phaser from 'phaser';
import type { ElementId } from '../data/balance';
import { BALANCE } from '../data/balance';
import { spriteAsset } from '../data/assetManifest';
import { animKey } from '../gfx/AssetLoader';
import type { ActiveBuff } from '../core/Stats';
import type { Faction } from '../core/types';
import type { BuffStat } from '../data/skills';
import type { WorldScene } from '../scenes/WorldScene';

/** Base class for anything that fights: player, monsters, (later) pets. */
export abstract class Actor extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly world: WorldScene;
  readonly faction: Faction;
  readonly spriteKey: string;
  readonly bodyRadius: number;
  shadow: Phaser.GameObjects.Image;
  facing: 1 | -1 = 1;
  dead = false;
  /** Runtime buffs / debuffs. */
  buffs: ActiveBuff[] = [];
  stunUntil = 0;
  knockUntil = 0;
  actionUntil = 0;
  private flashUntil = 0;

  constructor(world: WorldScene, x: number, y: number, spriteKey: string, faction: Faction, bodyRadius: number) {
    super(world, x, y, spriteKey, 0);
    this.world = world;
    this.faction = faction;
    this.spriteKey = spriteKey;
    this.bodyRadius = bodyRadius;
    const a = spriteAsset(spriteKey);
    this.setOrigin(a.originX ?? 0.5, a.originY ?? 0.92);
    world.add.existing(this);
    world.physics.add.existing(this);
    const feetX = a.frameWidth * (a.originX ?? 0.5);
    const feetY = a.frameHeight * (a.originY ?? 0.92);
    this.body.setCircle(bodyRadius, feetX - bodyRadius, feetY - bodyRadius * 1.5);
    this.body.setCollideWorldBounds(true);
    this.shadow = world.add.image(x, y, 'shadow');
    this.shadow.setScale((bodyRadius * 2.4) / 16, Math.max(0.8, bodyRadius / 7));
    this.playAnim('idle');
  }

  abstract get maxHp(): number;
  abstract get hp(): number;
  abstract set hp(v: number);
  abstract get level(): number;
  abstract get atk(): number;
  abstract get matk(): number;
  abstract get def(): number;
  abstract get mdef(): number;
  abstract get hit(): number;
  abstract get flee(): number;
  abstract get crit(): number;
  abstract get element(): ElementId;
  abstract get displayName(): string;

  now() {
    return this.world.game.getTime();
  }

  buffSum(k: BuffStat) {
    return this.buffs.reduce((a, b) => a + (b.stats[k] ?? 0), 0);
  }

  playAnim(name: string, timeScale = 1) {
    const key = animKey(this.spriteKey, name);
    if (!this.scene.anims.exists(key)) return;
    this.anims.timeScale = timeScale;
    if (this.anims.currentAnim?.key === key && this.anims.isPlaying && name !== 'attack' && name !== 'cast') return;
    this.play(key);
  }

  /** Play a one-shot action anim that blocks idle/walk switching for its duration. */
  action(name: string, durationMs?: number) {
    const key = animKey(this.spriteKey, name);
    const anim = this.scene.anims.get(key);
    if (!anim) return;
    const natural = (anim.frames.length / anim.frameRate) * 1000;
    const dur = durationMs ?? natural;
    const ts = Math.max(1, natural / Math.max(60, dur));
    this.anims.timeScale = ts;
    this.play(key);
    this.actionUntil = this.now() + dur;
  }

  setFacing(dir: number) {
    if (dir === 0) return;
    this.facing = dir > 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  faceTowards(x: number) {
    this.setFacing(x - this.x);
  }

  flash() {
    this.setTintFill(0xffffff);
    this.flashUntil = this.now() + BALANCE.combat.hitFlashMs;
  }

  knockback(fromX: number, fromY: number, speed: number = BALANCE.combat.knockbackSpeed) {
    if (this.dead || speed <= 0) return;
    const ang = Math.atan2(this.y - fromY, this.x - fromX);
    this.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    this.knockUntil = this.now() + BALANCE.combat.knockbackMs;
  }

  isStunned() {
    return this.now() < this.stunUntil;
  }

  isKnocked() {
    return this.now() < this.knockUntil;
  }

  inAction() {
    return this.now() < this.actionUntil;
  }

  distTo(o: { x: number; y: number }) {
    return Phaser.Math.Distance.Between(this.x, this.y, o.x, o.y);
  }

  /** Remove expired buffs; returns true if anything changed. */
  tickBuffs(): boolean {
    const t = this.now();
    const before = this.buffs.length;
    this.buffs = this.buffs.filter((b) => b.expiresAt > t);
    return this.buffs.length !== before;
  }

  /** Called every frame by the world scene after AI/movement. */
  syncVisuals() {
    const t = this.now();
    if (this.flashUntil && t >= this.flashUntil) {
      this.flashUntil = 0;
      this.clearTint();
      this.onTintCleared();
    }
    this.shadow.setPosition(this.x, this.y);
    this.shadow.setDepth(this.y - 1);
    this.setDepth(this.y);
    if (!this.dead && !this.inAction()) {
      const moving = this.body.velocity.lengthSq() > 25 && !this.isKnocked();
      this.playAnim(moving ? 'walk' : 'idle');
    }
  }

  /** Hook for subclasses that keep a permanent tint (e.g. enraged boss). */
  protected onTintCleared() {}

  destroy(fromScene?: boolean) {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
