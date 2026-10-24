import Phaser from 'phaser';
import { getDungeon, type DungeonDef } from '../data/dungeons';
import { MONSTERS } from '../data/monsters';
import { AudioManager } from '../core/AudioManager';
import { Bus, Ev } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { rng } from '../gfx/procedural/PixelCanvas';
import { T } from '../gfx/procedural/environment';
import type { Monster } from '../entities/Monster';
import { COLORS } from '../ui/theme';
import { WorldScene } from './WorldScene';

export interface DungeonResult {
  dungeonName: string;
  cleared: boolean;
  timeSec: number;
  exp: number;
  gold: number;
  items: Record<string, number>;
}

type Phase = 'intro' | 'wave' | 'between' | 'boss' | 'cleared' | 'failed';

/** Leveling dungeon: waves of monsters, then a boss, then a result screen. */
export class DungeonScene extends WorldScene {
  readonly isTown = false;
  dungeon!: DungeonDef;
  phase: Phase = 'intro';
  waveIndex = 0;
  dungeonLevel = 1;
  boss: Monster | null = null;
  private waveMonsters = new Set<Monster>();
  private startTime = 0;
  private run = { exp: 0, gold: 0, items: {} as Record<string, number> };
  private blockedSpots: { x: number; y: number; r: number }[] = [];
  private lastBossHp = -1;

  constructor() {
    super('Dungeon');
  }

  init(data: { dungeonId: string }) {
    this.dungeon = getDungeon(data.dungeonId ?? 'whispering_greenwood');
    this.phase = 'intro';
    this.waveIndex = 0;
    this.boss = null;
    this.waveMonsters = new Set();
    this.run = { exp: 0, gold: 0, items: {} };
    this.blockedSpots = [];
    this.lastBossHp = -1;
    const d = this.dungeon;
    this.dungeonLevel = Phaser.Math.Clamp(GameState.char.level, d.levelMin, d.levelMax);
  }

  protected bgm() {
    return this.dungeon.bgm;
  }

  protected playerSpawn() {
    return { x: this.mapW / 2, y: this.mapH - 56 };
  }

  protected buildMap() {
    const d = this.dungeon;
    const W = d.width, H = d.height;
    const r = rng(d.id.length * 977 + 13);
    const tiles: number[][] = [];
    for (let y = 0; y < H; y++) {
      const row: number[] = [];
      for (let x = 0; x < W; x++) {
        const v = r();
        row.push(v < 0.06 ? T.FOREST_FLOWER : v < 0.5 ? T.FOREST2 : T.FOREST);
      }
      tiles.push(row);
    }
    // a winding dirt trail from the entrance to the boss clearing
    let cx = Math.floor(W / 2);
    for (let y = H - 1; y >= 3; y--) {
      for (let dx = -1; dx <= 1; dx++) if (tiles[y][cx + dx] !== undefined) tiles[y][cx + dx] = T.PATH;
      if (y % 3 === 0) cx = Phaser.Math.Clamp(cx + (r() < 0.5 ? -1 : 1), 8, W - 9);
    }
    this.addTileLayer(tiles);
    const solids: { x: number; y: number; w: number; h: number; color: number }[] = [];
    const mw = this.mapW, mh = this.mapH;

    // Dense tree border with solid collision bands
    const band = 40;
    this.addBlocker(mw / 2, band / 2, mw, band);
    this.addBlocker(mw / 2, mh - band / 4, mw, band / 2);
    this.addBlocker(band / 2, mh / 2, band, mh);
    this.addBlocker(mw - band / 2, mh / 2, band, mh);
    for (let x = 0; x <= mw; x += 22) {
      this.addProp(r() < 0.5 ? 'prop_tree' : 'prop_pine', x + r() * 8, 30 + r() * 10);
      if (Math.abs(x - mw / 2) > 40) this.addProp(r() < 0.5 ? 'prop_tree' : 'prop_pine', x + r() * 8, mh + 8);
    }
    for (let y = 40; y <= mh; y += 26) {
      this.addProp(r() < 0.5 ? 'prop_tree' : 'prop_pine', 10 + r() * 10, y + r() * 8);
      this.addProp(r() < 0.5 ? 'prop_tree' : 'prop_pine', mw - 10 - r() * 10, y + r() * 8);
    }
    solids.push({ x: 0, y: 0, w: mw, h: band, color: 0x2f8040 }, { x: 0, y: 0, w: band, h: mh, color: 0x2f8040 }, { x: mw - band, y: 0, w: band, h: mh, color: 0x2f8040 });

    // Interior clusters (kept away from the spawn and the boss clearing)
    const spawn = { x: mw / 2, y: mh - 56 };
    const bossSpot = { x: mw / 2, y: 110 };
    let placed = 0, tries = 0;
    while (placed < 26 && tries < 400) {
      tries++;
      const x = 70 + r() * (mw - 140), y = 80 + r() * (mh - 150);
      if (Phaser.Math.Distance.Between(x, y, spawn.x, spawn.y) < 90) continue;
      if (Phaser.Math.Distance.Between(x, y, bossSpot.x, bossSpot.y) < 110) continue;
      if (this.blockedSpots.some((b) => Phaser.Math.Distance.Between(x, y, b.x, b.y) < b.r + 40)) continue;
      const kind = r();
      if (kind < 0.55) {
        this.addProp(r() < 0.6 ? 'prop_tree' : 'prop_pine', x, y, { w: 10, h: 8 });
        this.blockedSpots.push({ x, y: y - 4, r: 12 });
        solids.push({ x: x - 8, y: y - 16, w: 16, h: 16, color: 0x2f8040 });
      } else if (kind < 0.8) {
        this.addProp('prop_rock', x, y, { w: 14, h: 6 });
        this.blockedSpots.push({ x, y: y - 3, r: 10 });
        solids.push({ x: x - 8, y: y - 8, w: 16, h: 8, color: 0x8a8094 });
      } else {
        this.addProp('prop_bush', x, y, { w: 16, h: 6 });
        this.blockedSpots.push({ x, y: y - 3, r: 10 });
      }
      placed++;
    }
    for (let i = 0; i < 18; i++) this.addProp('prop_flowers', 60 + r() * (mw - 120), 70 + r() * (mh - 120));

    const colorOf = (t: number) => (t === T.PATH ? 0xcfb07a : 0x58a645);
    this.buildMinimap('minimap_dungeon', tiles, colorOf, solids);
  }

  create() {
    super.create();
    this.startTime = this.game.getTime();
    this.time.delayedCall(900, () => {
      Bus.emit(Ev.WAVE, this.dungeon.name, `Recommended Lv ${this.dungeon.levelMin}-${this.dungeon.levelMax}`);
      this.time.delayedCall(1800, () => this.startWave(0));
    });
  }

  /** A free spot inside the arena, away from obstacles and (optionally) the player. */
  private freeSpot(minPlayerDist = 110): { x: number; y: number } {
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(70, this.mapW - 70);
      const y = Phaser.Math.Between(70, this.mapH - 70);
      if (this.blockedSpots.some((b) => Phaser.Math.Distance.Between(x, y, b.x, b.y) < b.r + 12)) continue;
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minPlayerDist) continue;
      return { x, y };
    }
    return { x: this.mapW / 2, y: this.mapH / 2 };
  }

  private startWave(i: number) {
    if (this.phase === 'failed' || this.player.dead) return;
    const wave = this.dungeon.waves[i];
    this.waveIndex = i;
    this.phase = 'wave';
    Bus.emit(Ev.WAVE, `Wave ${i + 1} / ${this.dungeon.waves.length}`, '');
    const d = this.dungeon;
    const lvl = Phaser.Math.Clamp(this.dungeonLevel + (wave.levelOffset ?? 0), d.levelMin, d.levelMax);
    for (const entry of wave.monsters) {
      for (let k = 0; k < entry.count; k++) {
        const spot = this.freeSpot();
        this.vfx.play('spawn', spot.x, spot.y);
        const m = this.spawnMonster(entry.id, spot.x, spot.y, Math.max(1, lvl + (Math.random() < 0.3 ? -1 : 0)));
        this.waveMonsters.add(m);
        // stagger the charge so the player is not swarmed all at once
        this.time.delayedCall(Phaser.Math.Between(1200, 7000), () => { if (!m.dead) m.alwaysAggro = true; });
      }
    }
  }

  private startBoss() {
    if (this.phase === 'failed' || this.player.dead) return;
    this.phase = 'boss';
    const def = MONSTERS[this.dungeon.boss];
    const d = this.dungeon;
    const lvl = Phaser.Math.Clamp(GameState.char.level + 1, Math.min(d.levelMax, d.levelMin + 2), d.levelMax);
    const x = this.mapW / 2, y = 120;
    Bus.emit(Ev.WAVE, `${def.name} appears!`, def.boss?.title ?? '');
    AudioManager.playMusic(this.dungeon.bossBgm);
    AudioManager.sfx('boss_roar');
    this.cameras.main.shake(500, 0.005);
    this.vfx.play('spawn', x, y, { scale: 2.5 });
    this.boss = this.spawnMonster(def.id, x, y, lvl, true);
    this.boss.nameText.setText(`${def.name} Lv${lvl}`);
  }

  protected onMonsterKilled(m: Monster) {
    if (m === this.boss) {
      this.onBossDefeated();
      return;
    }
    if (this.phase !== 'wave' || !this.waveMonsters.has(m)) return;
    this.waveMonsters.delete(m);
    if (this.waveMonsters.size === 0) {
      this.phase = 'between';
      const next = this.waveIndex + 1;
      if (next < this.dungeon.waves.length) {
        this.toast('Wave cleared!', COLORS.textGreen);
        this.time.delayedCall(1800, () => this.startWave(next));
      } else {
        this.toast('All waves cleared! Something stirs...', COLORS.textGold);
        this.time.delayedCall(2200, () => this.startBoss());
      }
    }
  }

  protected onRewards(exp: number, gold: number, items: Record<string, number>) {
    this.run.exp += exp;
    this.run.gold += gold;
    for (const [k, v] of Object.entries(items)) this.run.items[k] = (this.run.items[k] ?? 0) + v;
  }

  private onBossDefeated() {
    this.phase = 'cleared';
    Bus.emit(Ev.BOSS_HP, null);
    const timeSec = Math.round((this.game.getTime() - this.startTime) / 1000);
    AudioManager.stopMusic();
    AudioManager.sfx('victory');
    this.cameras.main.flash(300, 255, 255, 220);
    // sweep up leftover minions (no rewards)
    for (const o of this.monsters.getChildren().slice()) {
      const mm = o as Monster;
      if (!mm.dead) {
        (mm as any).noRewards = true;
        this.killMonster(mm, mm);
      }
    }
    const rec = GameState.char.stats_record.dungeonClears;
    rec[this.dungeon.id] = (rec[this.dungeon.id] ?? 0) + 1;
    this.time.delayedCall(2600, () => {
      GameState.save();
      const result: DungeonResult = { dungeonName: this.dungeon.name, cleared: true, timeSec, ...this.run };
      (this.scene.get('Hud') as any)?.showResult?.(result);
    });
  }

  protected updateWorld() {
    if (this.boss && !this.boss.dead) {
      const hp = Math.ceil(this.boss.hp);
      if (hp !== this.lastBossHp) {
        this.lastBossHp = hp;
        Bus.emit(Ev.BOSS_HP, `${this.boss.info.name}, ${this.boss.info.boss?.title ?? ''}`, hp, this.boss.maxHp, this.boss.enraged);
      }
    }
  }

  killPlayer() {
    this.phase = 'failed';
    super.killPlayer();
  }

  leaveDungeon() {
    GameState.save();
    this.goTo('Town');
  }

  retry() {
    GameState.save();
    this.goTo('Dungeon', { dungeonId: this.dungeon.id });
  }
}
