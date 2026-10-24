import Phaser from 'phaser';
import { BALANCE, levelColor, type ElementId } from '../data/balance';
import { MONSTERS, type MonsterDef } from '../data/monsters';
import { GameState } from '../core/GameState';
import { Actor } from './Actor';
import type { WorldScene } from '../scenes/WorldScene';
import { txt } from '../ui/theme';

type AiState = 'idle' | 'wander' | 'chase' | 'windup' | 'return';

export class Monster extends Actor {
  /** Static monster definition (data/monsters.ts). */
  readonly info: MonsterDef;
  private _level: number;
  private _hp: number;
  readonly stats: { maxHp: number; atk: number; def: number; mdef: number; hit: number; flee: number; exp: number; gold: number };
  readonly isBoss: boolean;
  spawnX: number;
  spawnY: number;
  /** Threat table: who this monster wants to hit. */
  threat = new Map<Actor, number>();
  target: Actor | null = null;
  ai: AiState = 'idle';
  alwaysAggro = false;
  nextAttackAt = 0;
  windupEndAt = 0;
  nextWanderAt = 0;
  wanderTo: { x: number; y: number } | null = null;
  enraged = false;
  mechanicReadyAt: number[] = [];
  nameText: Phaser.GameObjects.Text;
  hpBar: Phaser.GameObjects.Graphics;
  lastHitAt = -99999;

  constructor(world: WorldScene, x: number, y: number, monsterId: string, level: number) {
    const def = MONSTERS[monsterId];
    super(world, x, y, def.sprite, 'monster', def.bodyRadius);
    this.info = def;
    this._level = level;
    this.isBoss = !!def.boss;
    const M = BALANCE.monster;
    const bossHp = this.isBoss ? M.bossHpMult : 1;
    this.stats = {
      maxHp: Math.round(M.hp(level) * def.hpMult * bossHp),
      atk: M.atk(level) * def.atkMult,
      def: M.def(level) * def.defMult,
      mdef: M.mdef(level) * def.defMult,
      hit: M.hit(level),
      flee: M.flee(level),
      exp: Math.round(M.exp(level) * def.expMult * (this.isBoss ? M.bossExpMult : 1)),
      gold: Math.round(M.gold(level) * def.goldMult * (this.isBoss ? M.bossGoldMult : 1)),
    };
    this._hp = this.stats.maxHp;
    this.spawnX = x;
    this.spawnY = y;
    if (def.scale) this.setScale(def.scale);
    const now = this.now();
    this.nextWanderAt = now + Phaser.Math.Between(500, 3000);
    this.mechanicReadyAt = (def.boss?.mechanics ?? []).map((m) => now + m.everySec * 1000 * 0.6);
    const label = this.isBoss ? `${def.name}` : `${def.name} Lv${level}`;
    this.nameText = txt(world, x, y, label, 8, {
      font: 'body', color: levelColor(level, GameState.char.level), stroke: '#1a1030', strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.hpBar = world.add.graphics();
  }

  get maxHp() { return this.stats.maxHp; }
  get hp() { return this._hp; }
  set hp(v: number) { this._hp = Math.max(0, Math.min(this.stats.maxHp, v)); }
  get level() { return this._level; }
  get atk() { return this.stats.atk * (1 + this.buffSum('atkPct')) * (this.enraged ? 1.15 : 1); }
  get matk() { return this.atk; }
  get def() { return Math.max(0, this.stats.def * (1 + this.buffSum('defPct'))); }
  get mdef() { return Math.max(0, this.stats.mdef * (1 + this.buffSum('mdefPct'))); }
  get hit() { return this.stats.hit; }
  get flee() { return this.stats.flee; }
  get crit() { return this.isBoss ? 5 : 2; }
  get element(): ElementId { return this.info.element; }
  get displayName() { return this.info.name; }

  get moveSpeed() {
    return this.info.moveSpeed * (1 + this.buffSum('moveSpeedPct')) * (this.enraged ? this.info.boss!.enrageSpeedMult : 1);
  }

  get attackInterval() {
    return (this.info.attackIntervalSec * 1000) / (1 + this.buffSum('aspdPct')) / (this.enraged ? this.info.boss!.enrageAtkSpeedMult : 1);
  }

  addThreat(a: Actor, amount: number) {
    if (a.dead) return;
    this.threat.set(a, (this.threat.get(a) ?? 0) + amount);
  }

  /** Highest-threat living target. */
  pickTarget(): Actor | null {
    let best: Actor | null = null;
    let bestT = -1;
    for (const [a, t] of this.threat) {
      if (a.dead || !a.active) {
        this.threat.delete(a);
        continue;
      }
      if (t > bestT) {
        best = a;
        bestT = t;
      }
    }
    return best;
  }

  refreshNameColor() {
    this.nameText.setColor(levelColor(this._level, GameState.char.level));
  }

  protected onTintCleared() {
    if (this.enraged) this.setTint(0xffb8b0);
  }

  syncVisuals() {
    super.syncVisuals();
    const h = this.displayHeight;
    const top = Math.round(this.y - h * this.originY - 2);
    this.nameText.setPosition(Math.round(this.x), top - 4);
    this.nameText.setDepth(this.y + 1000);
    this.hpBar.clear();
    if (!this.isBoss && !this.dead && this.hp < this.maxHp) {
      const w = 20, x = Math.round(this.x - w / 2), y = top - 2;
      this.hpBar.fillStyle(0x0f0b1e, 1).fillRect(x - 1, y - 1, w + 2, 4);
      this.hpBar.fillStyle(0xe8455a, 1).fillRect(x, y, Math.max(1, Math.round((w * this.hp) / this.maxHp)), 2);
      this.hpBar.setDepth(this.y + 1000);
    }
  }

  destroy(fromScene?: boolean) {
    this.nameText?.destroy();
    this.hpBar?.destroy();
    super.destroy(fromScene);
  }
}
