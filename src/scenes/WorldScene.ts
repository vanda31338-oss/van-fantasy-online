import Phaser from 'phaser';
import { BALANCE } from '../data/balance';
import { ITEMS } from '../data/items';
import { SKILLS, scale, type SkillDef, type SkillEffect } from '../data/skills';
import { AudioManager } from '../core/AudioManager';
import { resolveAttack } from '../core/Combat';
import { Controls } from '../core/Controls';
import { Bus, Ev } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { TILE } from '../gfx/procedural/environment';
import { VfxManager } from '../gfx/VfxManager';
import { Actor } from '../entities/Actor';
import { Monster } from '../entities/Monster';
import { Player } from '../entities/Player';
import { COLORS, txt } from '../ui/theme';

export interface MinimapInfo {
  key: string; // texture key
  tilesW: number;
  tilesH: number;
}

export interface DamageOpts {
  multiplier?: number;
  type?: 'physical' | 'magic';
  element?: import('../data/balance').ElementId;
  knockback?: number;
  vfx?: string;
  alwaysHit?: boolean;
  silent?: boolean;
}

/**
 * Shared base for every walkable map (town + dungeons): map/collision setup,
 * player control, combat resolution, monster AI, regen, rewards and death.
 */
export abstract class WorldScene extends Phaser.Scene {
  player!: Player;
  monsters!: Phaser.GameObjects.Group;
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  vfx!: VfxManager;
  mapW = 0;
  mapH = 0;
  minimap!: MinimapInfo;
  abstract readonly isTown: boolean;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private autosaveAcc = 0;
  private regenAcc = 0;
  protected busHandlers: [string, (...a: any[]) => void][] = [];
  transitioning = false;
  private stuck = { x: 0, y: 0, t: 0, dir: 1, detourUntil: 0 };
  private kbMoving = false;
  private kbAttack = false;

  /** Build the tile map, props and obstacles. Must set mapW/mapH/minimap. */
  protected abstract buildMap(): void;
  /** Where the player appears. */
  protected abstract playerSpawn(): { x: number; y: number };
  protected abstract bgm(): string;
  /** Per-frame hook for subclasses. */
  protected updateWorld(_dt: number) {}

  create() {
    this.transitioning = false;
    Controls.reset();
    this.vfx = new VfxManager(this);
    this.obstacles = this.physics.add.staticGroup();
    this.monsters = this.add.group();
    this.buildMap();
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
    const sp = this.playerSpawn();
    this.player = new Player(this, sp.x, sp.y);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.monsters, this.obstacles);
    this.physics.add.collider(this.monsters, this.monsters);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapW, this.mapH);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.fadeIn(300, 0, 0, 0);

    this.setupKeyboard();
    this.onBus(Ev.LEVEL_UP, (level: number) => this.onLevelUp(level));

    AudioManager.playMusic(this.bgm());
    this.scene.stop('Hud');
    this.scene.launch('Hud', { worldKey: this.scene.key });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  protected onBus(ev: string, fn: (...a: any[]) => void) {
    Bus.on(ev, fn);
    this.busHandlers.push([ev, fn]);
  }

  private cleanup() {
    for (const [ev, fn] of this.busHandlers) Bus.off(ev, fn);
    this.busHandlers = [];
    Bus.emit(Ev.BOSS_HP, null);
  }

  private setupKeyboard() {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,SPACE,ONE,TWO,THREE,FOUR,FIVE,Q,E') as Record<string, Phaser.Input.Keyboard.Key>;
    const k = this.keys;
    k.ONE.on('down', () => Controls.push('skill', 0));
    k.TWO.on('down', () => Controls.push('skill', 1));
    k.THREE.on('down', () => Controls.push('skill', 2));
    k.FOUR.on('down', () => Controls.push('skill', 3));
    k.FIVE.on('down', () => Controls.push('skill', 4));
    k.Q.on('down', () => Controls.push('potion', 0));
    k.E.on('down', () => Controls.push('potion', 1));
  }

  // ================================================================ map helpers
  protected addTileLayer(tiles: number[][]) {
    const map = this.make.tilemap({ data: tiles, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage('tileset', 'tileset', TILE, TILE, 0, 0)!;
    const layer = map.createLayer(0, ts, 0, 0)!;
    layer.setDepth(-10000);
    this.mapW = tiles[0].length * TILE;
    this.mapH = tiles.length * TILE;
    return layer;
  }

  /** Add an invisible static collision box (x,y = centre). */
  protected addBlocker(x: number, y: number, w: number, h: number) {
    const z = this.add.zone(x, y, w, h);
    this.physics.add.existing(z, true);
    this.obstacles.add(z);
    return z;
  }

  /** A world prop with y-sorting and an optional collision footprint at its base. */
  protected addProp(key: string, x: number, y: number, collide?: { w: number; h: number; oy?: number }) {
    const img = this.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, 1);
    img.setDepth(y);
    if (collide) this.addBlocker(x, y - collide.h / 2 - (collide.oy ?? 0), collide.w, collide.h);
    return img;
  }

  /** Build a minimap texture from tile data + extra solid rects. */
  protected buildMinimap(key: string, tiles: number[][], colorOf: (t: number) => number, solids: { x: number; y: number; w: number; h: number; color: number }[]) {
    const h = tiles.length, w = tiles[0].length;
    if (this.textures.exists(key)) this.textures.remove(key);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = '#' + colorOf(tiles[y][x]).toString(16).padStart(6, '0');
      ctx.fillRect(x, y, 1, 1);
    }
    for (const s of solids) {
      ctx.fillStyle = '#' + s.color.toString(16).padStart(6, '0');
      ctx.fillRect(Math.floor(s.x / TILE), Math.floor(s.y / TILE), Math.max(1, Math.round(s.w / TILE)), Math.max(1, Math.round(s.h / TILE)));
    }
    this.textures.addCanvas(key, canvas);
    this.minimap = { key, tilesW: w, tilesH: h };
  }

  // ================================================================ main loop
  update(_time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const now = this.game.getTime();
    GameState.tickPlayTime(dt);
    this.readKeyboard(now);
    for (const a of Controls.drain()) {
      if (a.type === 'skill') this.useSkillSlot(a.index);
      else this.usePotionSlot(a.index);
    }
    this.updatePlayer(now);
    this.monsters.getChildren().forEach((m) => this.updateMonster(m as Monster, now));
    this.tickRegen(dt);
    this.tickBuffs();
    this.updateWorld(dt);
    this.player.syncVisuals();
    this.monsters.getChildren().forEach((m) => (m as Monster).syncVisuals());
    this.autosaveAcc += dt;
    if (this.autosaveAcc >= BALANCE.save.autoSaveIntervalSec) {
      this.autosaveAcc = 0;
      GameState.save();
    }
  }

  private readKeyboard(now: number) {
    const k = this.keys;
    if (!k) return;
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (x || y) {
      const len = Math.hypot(x, y);
      Controls.setMove(x / len, y / len, now);
      this.kbMoving = true;
    } else if (this.kbMoving) {
      this.kbMoving = false;
      Controls.setMove(0, 0, now);
    }
    const kbAttack = k.J.isDown || k.SPACE.isDown;
    if (kbAttack) {
      Controls.attackHeld = true;
      this.kbAttack = true;
    } else if (this.kbAttack) {
      this.kbAttack = false;
      Controls.attackHeld = false;
    }
  }

  // ================================================================ player
  private updatePlayer(now: number) {
    const p = this.player;
    if (p.dead) {
      p.body.setVelocity(0, 0);
      return;
    }
    if (p.isKnocked()) return;
    const speed = GameState.derived.moveSpeed;
    if (Controls.manual) {
      p.moveTarget = null;
      if (p.casting) this.cancelCast();
      p.body.setVelocity(Controls.moveX * speed, Controls.moveY * speed);
      if (Math.abs(Controls.moveX) > 0.15) p.setFacing(Controls.moveX);
    } else if (p.casting || p.inAction()) {
      p.body.setVelocity(0, 0);
    } else if (p.moveTarget) {
      const mt = p.moveTarget;
      const d = Phaser.Math.Distance.Between(p.x, p.y, mt.x, mt.y);
      if (d <= mt.range) {
        p.body.setVelocity(0, 0);
        p.moveTarget = null;
        mt.onArrive?.();
      } else {
        let a = Math.atan2(mt.y - p.y, mt.x - p.x);
        // Simple steering: if we stop making progress, slide around the obstacle for a moment.
        const moved = Phaser.Math.Distance.Between(p.x, p.y, this.stuck.x, this.stuck.y);
        if (now - this.stuck.t > 160) {
          if (moved < 1.5 && now > this.stuck.detourUntil) {
            this.stuck.dir = -this.stuck.dir || 1;
            this.stuck.detourUntil = now + 450;
          }
          this.stuck = { ...this.stuck, x: p.x, y: p.y, t: now };
        }
        if (now < this.stuck.detourUntil) a += this.stuck.dir * Phaser.Math.DegToRad(80);
        p.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
        p.setFacing(Math.cos(a));
      }
    } else {
      p.body.setVelocity(0, 0);
    }
    if (Controls.attackHeld) this.tryAttack(now);
  }

  /** Nearest living monster within range of the player (keeps the current target if valid). */
  acquireTarget(range: number): Monster | null {
    let best: Monster | null = null;
    let bestD = range;
    for (const o of this.monsters.getChildren()) {
      const m = o as Monster;
      if (m.dead) continue;
      const d = this.player.distTo(m) - m.bodyRadius;
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  tryAttack(now: number) {
    const p = this.player;
    if (p.dead || p.casting || now < p.nextAttackAt || this.isTown) return;
    const cls = p.cls;
    const target = this.acquireTarget(Math.max(BALANCE.combat.autoTargetRange, cls.attackRange + 20));
    if (target) {
      const reach = cls.attackRange + target.bodyRadius;
      if (p.distTo(target) > reach) {
        if (!Controls.manual) p.moveTarget = { x: target.x, y: target.y, range: reach - 4 };
        return;
      }
      p.faceTowards(target.x);
    }
    p.moveTarget = null;
    const interval = p.attackIntervalMs();
    p.nextAttackAt = now + interval;
    p.action('attack', Math.min(interval * 0.9, 380));
    AudioManager.sfx('swing');
    const hitDelay = Math.min(140, interval * 0.35);
    if (cls.projectileVfx && target) {
      this.time.delayedCall(hitDelay, () => this.fireProjectile(p, target, cls.projectileVfx!, 260, () => this.dealDamage(p, target, { type: cls.magicBasicAttack ? 'magic' : 'physical' })));
      return;
    }
    this.vfx.play('slash', p.x, p.y, { flipX: p.facing < 0 });
    this.time.delayedCall(hitDelay, () => {
      if (p.dead) return;
      const reach = cls.attackRange + 8;
      const victims = target && !target.dead && p.distTo(target) <= reach + target.bodyRadius ? [target] : this.monstersInCone(p, reach, 60).slice(0, 1);
      for (const m of victims) this.dealDamage(p, m, { type: cls.magicBasicAttack ? 'magic' : 'physical', knockback: m.isBoss ? 0 : 50 });
    });
  }

  fireProjectile(from: Actor, to: Actor, vfxId: string, speed: number, onHit: () => void) {
    const s = this.vfx.play(vfxId, from.x + from.facing * 8, from.y);
    if (!s) return onHit();
    const d = Phaser.Math.Distance.Between(s.x, s.y, to.x, to.y - 12);
    this.tweens.add({
      targets: s, x: to.x, y: to.y - 12, duration: (d / speed) * 1000,
      onUpdate: () => s.setDepth(s.y + 30),
      onComplete: () => { s.destroy(); if (!to.dead && to.active) onHit(); },
    });
  }

  monstersInCone(a: Actor, radius: number, halfAngleDeg: number): Monster[] {
    const res: Monster[] = [];
    const face = a.facing > 0 ? 0 : Math.PI;
    for (const o of this.monsters.getChildren()) {
      const m = o as Monster;
      if (m.dead) continue;
      const d = a.distTo(m) - m.bodyRadius;
      if (d > radius) continue;
      const ang = Math.atan2(m.y - a.y, m.x - a.x);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - face));
      if (d < 10 || diff <= Phaser.Math.DegToRad(halfAngleDeg)) res.push(m);
    }
    return res.sort((x, y) => a.distTo(x) - a.distTo(y));
  }

  monstersInCircle(x: number, y: number, radius: number): Monster[] {
    return (this.monsters.getChildren() as Monster[]).filter((m) => !m.dead && Phaser.Math.Distance.Between(x, y, m.x, m.y) - m.bodyRadius <= radius);
  }

  // ================================================================ skills
  useSkillSlot(i: number) {
    const id = GameState.char.skillSlots[i];
    if (!id) return this.toast('Empty skill slot');
    this.castSkill(id, i);
  }

  skillCost(def: SkillDef) {
    const lv = GameState.char.skills[def.id] ?? 1;
    return Math.round(scale(def.mpCost, lv));
  }

  castSkill(id: string, slotIndex: number) {
    const p = this.player;
    const def = SKILLS[id];
    const lv = GameState.char.skills[id] ?? 0;
    if (!def || p.dead) return;
    if (!lv) return this.toast('Skill not learned yet');
    if (GameState.char.level < def.unlockLevel) return this.toast(`Unlocks at Lv ${def.unlockLevel}`);
    if (this.isTown && def.effects.some((e) => e.kind === 'damage')) return this.toast('You cannot fight in town');
    const now = this.game.getTime();
    if (p.casting) return;
    if (now < (p.skillReadyAt[id] ?? 0)) return;
    const cost = this.skillCost(def);
    if (p.mp < cost) {
      AudioManager.sfx('ui_click');
      return this.toast('Not enough MP', COLORS.textBlue);
    }
    const needsTarget = def.effects.some((e) => (e.kind === 'damage' && (e.area === 'single' || e.area === 'target_circle')) || (e.kind === 'debuff' && e.area === 'single'));
    let target: Monster | null = null;
    if (needsTarget) {
      target = this.acquireTarget(Math.max(BALANCE.combat.autoTargetRange, def.range + 40));
      if (!target) return this.toast('No target in range');
      if (p.distTo(target) > def.range + target.bodyRadius) {
        p.moveTarget = { x: target.x, y: target.y, range: def.range + target.bodyRadius - 4, onArrive: () => this.castSkill(id, slotIndex) };
        return;
      }
      p.faceTowards(target.x);
    } else {
      const near = this.acquireTarget(def.range + 30);
      if (near) p.faceTowards(near.x);
    }
    p.mp -= cost;
    p.skillReadyAt[id] = now + Math.max(0.3, scale(def.cooldown, lv)) * 1000;
    Bus.emit(Ev.SKILL_USED, id);
    Bus.emit(Ev.PLAYER_CHANGED);
    const castMs = (def.castTime / GameState.derived.castSpeed) * 1000;
    if (castMs > 50) {
      p.casting = { skillId: id, start: now, end: now + castMs };
      p.action('cast', castMs);
      p.body.setVelocity(0, 0);
      this.time.delayedCall(castMs, () => {
        if (!p.casting || p.casting.skillId !== id) return;
        p.casting = null;
        this.executeSkill(def, lv, target);
      });
    } else {
      p.action(def.anim ?? 'attack', 300);
      this.time.delayedCall(110, () => this.executeSkill(def, lv, target));
    }
  }

  cancelCast() {
    const p = this.player;
    if (!p.casting) return;
    const def = SKILLS[p.casting.skillId];
    p.mp += this.skillCost(def);
    p.skillReadyAt[def.id] = 0;
    p.casting = null;
    p.actionUntil = 0;
    this.toast('Cast interrupted');
  }

  private executeSkill(def: SkillDef, lv: number, target: Monster | null) {
    const p = this.player;
    if (p.dead) return;
    if (def.sfx) AudioManager.sfx(def.sfx);
    if (def.vfx?.cast) this.vfx.play(def.vfx.cast, p.x, p.y, { flipX: p.facing < 0, follow: def.effects.every((e) => e.kind === 'buff') ? p : undefined });
    for (const e of def.effects) this.applyEffect(def, e, lv, target);
  }

  private effectTargets(e: { area: string; radius?: number; maxTargets?: number }, range: number, target: Monster | null): Monster[] {
    const p = this.player;
    let list: Monster[] = [];
    if (e.area === 'single') list = target && !target.dead ? [target] : [];
    else if (e.area === 'cone') list = this.monstersInCone(p, e.radius ?? range, 70);
    else if (e.area === 'circle') list = this.monstersInCircle(p.x, p.y, e.radius ?? range);
    else if (e.area === 'target_circle' && target) list = this.monstersInCircle(target.x, target.y, e.radius ?? 30);
    return list.slice(0, e.maxTargets ?? 99);
  }

  private applyEffect(def: SkillDef, e: SkillEffect, lv: number, target: Monster | null) {
    const p = this.player;
    const now = this.game.getTime();
    if (e.kind === 'damage') {
      const victims = this.effectTargets(e, def.range, target);
      const hits = e.hits ?? 1;
      for (const m of victims) {
        for (let h = 0; h < hits; h++) {
          this.time.delayedCall(h * 90, () => {
            if (m.dead) return;
            this.dealDamage(p, m, {
              multiplier: scale(e.multiplier, lv), type: e.damageType, element: e.element,
              knockback: m.isBoss ? 0 : e.knockback ?? 0, vfx: def.vfx?.hit,
            });
          });
        }
      }
    } else if (e.kind === 'buff') {
      const stats: Record<string, number> = {};
      for (const [k, s] of Object.entries(e.stats)) stats[k] = scale(s!, lv);
      const dur = scale(e.duration, lv) * 1000;
      const existing = GameState.buffs.findIndex((b) => b.id === e.buffId);
      if (existing >= 0) GameState.buffs.splice(existing, 1);
      GameState.buffs.push({ id: e.buffId, name: def.name, stats, expiresAt: now + dur, duration: dur, icon: def.icon });
      GameState.recompute();
      this.floatText(p.x, p.y - 30, def.name, COLORS.textGold);
    } else if (e.kind === 'debuff') {
      const stats: Record<string, number> = {};
      for (const [k, s] of Object.entries(e.stats)) stats[k] = scale(s!, lv);
      const dur = scale(e.duration, lv) * 1000;
      for (const m of this.effectTargets(e, def.range, target)) {
        const i = m.buffs.findIndex((b) => b.id === e.buffId);
        if (i >= 0) m.buffs.splice(i, 1);
        m.buffs.push({ id: e.buffId, name: def.name, stats, expiresAt: now + dur, duration: dur });
        this.floatText(m.x, m.y - 26, def.name, '#c8a0ff');
        m.addThreat(p, 10);
      }
    }
  }

  // ================================================================ potions & items
  usePotionSlot(i: number) {
    const itemId = GameState.char.potionSlots[i];
    if (!itemId) return;
    this.useItem(itemId);
  }

  private potionReadyAt = 0;

  useItem(itemId: string): boolean {
    const def = ITEMS[itemId];
    const p = this.player;
    if (!def?.use || p.dead) return false;
    const now = this.game.getTime();
    if (def.use.potion && now < this.potionReadyAt) return false;
    if (GameState.countItem(itemId) <= 0) {
      this.toast(`No ${def.name} left`);
      return false;
    }
    const u = def.use;
    const hp = (u.healHp ?? 0) + (u.healHpPct ?? 0) * p.maxHp;
    const mp = (u.healMp ?? 0) + (u.healMpPct ?? 0) * p.maxMp;
    if (hp > 0 && p.hp >= p.maxHp && mp <= 0) {
      this.toast('HP is already full');
      return false;
    }
    if (mp > 0 && p.mp >= p.maxMp && hp <= 0) {
      this.toast('MP is already full');
      return false;
    }
    GameState.removeItem(itemId, 1);
    if (hp > 0) {
      p.hp += hp;
      this.floatText(p.x, p.y - 30, `+${Math.round(hp)}`, COLORS.textGreen);
      this.vfx.play('heal', p.x, p.y, { follow: p });
    }
    if (mp > 0) {
      p.mp += mp;
      this.floatText(p.x + 8, p.y - 22, `+${Math.round(mp)}`, COLORS.textBlue);
      this.vfx.play('mana', p.x, p.y, { follow: p });
    }
    if (u.potion) this.potionReadyAt = now + BALANCE.potions.cooldownMs;
    AudioManager.sfx('potion');
    Bus.emit(Ev.PLAYER_CHANGED);
    return true;
  }

  potionCooldownLeft() {
    return Math.max(0, this.potionReadyAt - this.game.getTime());
  }

  // ================================================================ combat resolution
  dealDamage(attacker: Actor, target: Actor, o: DamageOpts = {}) {
    if (target.dead || attacker.dead) return;
    const now = this.game.getTime();
    if (target instanceof Player && now < target.invulnUntil) return;
    if (target instanceof Player && (window as any).__godMode) return;
    const magic = o.type === 'magic';
    const res = resolveAttack({
      power: magic ? attacker.matk : attacker.atk,
      multiplier: o.multiplier ?? 1,
      defense: magic ? target.mdef : target.def,
      critChance: attacker.crit,
      attackElement: o.element ?? attacker.element,
      defendElement: target.element,
      hit: attacker.hit,
      flee: target.flee,
      alwaysHit: o.alwaysHit,
    });
    if (target instanceof Monster) {
      target.addThreat(attacker, Math.max(1, res.damage));
      target.lastHitAt = now;
    }
    if (res.miss) {
      this.floatText(target.x, target.y - 24, 'MISS', '#c8c0d8');
      return;
    }
    target.hp -= res.damage;
    target.flash();
    if (o.knockback) target.knockback(attacker.x, attacker.y, o.knockback);
    const isPlayerHit = target instanceof Player;
    const color = isPlayerHit ? '#ff8a7a' : res.crit ? '#ffe040' : '#ffffff';
    this.floatText(target.x + Phaser.Math.Between(-4, 4), target.y - 26, `${res.damage}${res.crit ? '!' : ''}`, color, res.crit);
    if (!o.silent) {
      this.vfx.play(o.vfx ?? (attacker instanceof Monster ? 'monster_hit' : 'hit'), target.x, target.y);
      AudioManager.sfx(isPlayerHit ? 'player_hurt' : res.crit ? 'crit' : 'hit');
    }
    if (res.crit && !isPlayerHit) this.cameras.main.shake(70, 0.002);
    if (isPlayerHit) {
      Bus.emit(Ev.PLAYER_CHANGED);
      if (res.damage > target.maxHp * 0.12) this.cameras.main.shake(100, 0.004);
    }
    if (target.hp <= 0) {
      if (target instanceof Monster) this.killMonster(target, attacker);
      else if (target instanceof Player) this.killPlayer();
    }
  }

  floatText(x: number, y: number, s: string, color: string, big = false) {
    if (!SaveManager.settings.damageNumbers && /^[0-9+]/.test(s)) return;
    const t = txt(this, Math.round(x), Math.round(y), s, big ? 16 : 8, { color, stroke: '#1a1030', strokeThickness: 3, font: big ? 'title' : 'title' })
      .setOrigin(0.5)
      .setDepth(100000);
    if (big) t.setScale(1.4);
    this.tweens.add({ targets: t, scale: big ? 1 : 1, duration: 120 });
    this.tweens.add({
      targets: t, y: y - 20, alpha: { from: 1, to: 0 }, duration: 750, delay: 250, ease: 'Cubic.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  toast(msg: string, color: string = COLORS.text) {
    Bus.emit(Ev.TOAST, msg, color);
  }

  // ================================================================ monsters
  spawnMonster(id: string, x: number, y: number, level: number, alwaysAggro = false): Monster {
    const m = new Monster(this, x, y, id, level);
    m.alwaysAggro = alwaysAggro;
    this.monsters.add(m);
    return m;
  }

  private updateMonster(m: Monster, now: number) {
    if (m.dead) return;
    m.tickBuffs();
    if (m.isKnocked()) return;
    if (m.isStunned()) {
      m.body.setVelocity(0, 0);
      return;
    }
    // aggro acquisition
    const p = this.player;
    if (!p.dead && !m.threat.has(p)) {
      const d = m.distTo(p);
      if (m.alwaysAggro || d < m.info.aggroRadius) m.addThreat(p, 1);
    }
    let target = m.pickTarget();
    if (target && !m.alwaysAggro && Phaser.Math.Distance.Between(m.x, m.y, m.spawnX, m.spawnY) > BALANCE.monster.leashDistance) {
      m.threat.clear();
      target = null;
      m.ai = 'return';
    }
    if (target && target.dead) target = null;
    m.target = target;

    if (m.isBoss) this.updateBossMechanics(m, now);

    if (m.ai === 'windup') {
      m.body.setVelocity(0, 0);
      if (now >= m.windupEndAt) {
        m.ai = 'chase';
        m.action('attack', 260);
        if (target && m.distTo(target) <= m.info.attackRange + target.bodyRadius + 8) this.dealDamage(m, target);
      }
      return;
    }

    if (target) {
      m.ai = 'chase';
      const reach = m.info.attackRange + target.bodyRadius;
      const d = m.distTo(target);
      m.faceTowards(target.x);
      if (d > reach) {
        const a = Math.atan2(target.y - m.y, target.x - m.x);
        const sp = m.moveSpeed;
        m.body.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
      } else {
        m.body.setVelocity(0, 0);
        if (now >= m.nextAttackAt && !m.inAction()) {
          m.ai = 'windup';
          m.windupEndAt = now + m.info.windupSec * 1000;
          m.nextAttackAt = now + m.attackInterval;
          m.action('attack', m.info.windupSec * 1000);
          m.anims.pause(m.anims.currentAnim!.frames[0]);
        }
      }
      return;
    }

    // no target: return home or wander
    if (m.ai === 'return') {
      const d = Phaser.Math.Distance.Between(m.x, m.y, m.spawnX, m.spawnY);
      if (d < 6) {
        m.ai = 'idle';
        m.hp = m.maxHp;
        m.body.setVelocity(0, 0);
      } else {
        const a = Math.atan2(m.spawnY - m.y, m.spawnX - m.x);
        m.body.setVelocity(Math.cos(a) * m.moveSpeed * 1.5, Math.sin(a) * m.moveSpeed * 1.5);
        m.setFacing(Math.cos(a));
      }
      return;
    }
    if (now >= m.nextWanderAt) {
      m.nextWanderAt = now + Phaser.Math.Between(2000, 4500);
      if (Math.random() < 0.6) {
        const r = 40;
        m.wanderTo = { x: m.spawnX + Phaser.Math.Between(-r, r), y: m.spawnY + Phaser.Math.Between(-r, r) };
      } else m.wanderTo = null;
    }
    if (m.wanderTo) {
      const d = Phaser.Math.Distance.Between(m.x, m.y, m.wanderTo.x, m.wanderTo.y);
      if (d < 4) {
        m.wanderTo = null;
        m.body.setVelocity(0, 0);
      } else {
        const a = Math.atan2(m.wanderTo.y - m.y, m.wanderTo.x - m.x);
        m.body.setVelocity(Math.cos(a) * m.moveSpeed * 0.5, Math.sin(a) * m.moveSpeed * 0.5);
        m.setFacing(Math.cos(a));
      }
    } else m.body.setVelocity(0, 0);
  }

  private updateBossMechanics(m: Monster, now: number) {
    const boss = m.info.boss!;
    if (!m.enraged && m.hp <= m.maxHp * boss.enrageAtPct) {
      m.enraged = true;
      m.setTint(0xffb8b0);
      AudioManager.sfx('boss_roar');
      this.cameras.main.shake(400, 0.006);
      this.toast(`${m.info.name} is enraged!`, COLORS.textRed);
      this.vfx.play('buff_aura', m.x, m.y, { follow: m, scale: 2, tint: 0xff4040 });
    }
    if (!m.target || m.ai === 'windup') return;
    boss.mechanics.forEach((mech, i) => {
      if (now < m.mechanicReadyAt[i]) return;
      const interval = mech.everySec * 1000 * (m.enraged ? 0.7 : 1);
      m.mechanicReadyAt[i] = now + interval;
      if (mech.kind === 'aoe_slam') {
        const t = m.target!;
        const zones: { x: number; y: number }[] = [{ x: t.x, y: t.y }];
        for (let k = 1; k < mech.zones + (m.enraged ? 2 : 0); k++) {
          const a = Math.random() * Math.PI * 2;
          const r = 30 + Math.random() * 60;
          zones.push({ x: Phaser.Math.Clamp(t.x + Math.cos(a) * r, 16, this.mapW - 16), y: Phaser.Math.Clamp(t.y + Math.sin(a) * r, 16, this.mapH - 16) });
        }
        m.action('attack', mech.telegraphSec * 1000);
        m.ai = 'windup';
        m.windupEndAt = now + mech.telegraphSec * 1000;
        m.nextAttackAt = m.windupEndAt + 600;
        AudioManager.sfx('boss_roar');
        for (const z of zones) this.telegraph(z.x, z.y, mech.radius, mech.telegraphSec * 1000, () => {
          this.vfx.play('slam', z.x, z.y);
          AudioManager.sfx('slam');
          this.cameras.main.shake(120, 0.004);
          if (!this.player.dead && Phaser.Math.Distance.Between(z.x, z.y, this.player.x, this.player.y) <= mech.radius + this.player.bodyRadius) {
            this.dealDamage(m, this.player, { multiplier: mech.multiplier, alwaysHit: true, silent: true });
          }
        });
      } else if (mech.kind === 'summon_minions') {
        const alive = (this.monsters.getChildren() as Monster[]).filter((x) => !x.dead && x.info.id === mech.monsterId).length;
        const n = Math.min(mech.count, mech.maxAlive - alive);
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2;
          const x = Phaser.Math.Clamp(m.x + Math.cos(a) * 40, 20, this.mapW - 20);
          const y = Phaser.Math.Clamp(m.y + Math.sin(a) * 30, 20, this.mapH - 20);
          this.vfx.play('spawn', x, y);
          const minion = this.spawnMonster(mech.monsterId, x, y, Math.max(1, m.level - 2), true);
          (minion as any).noRewards = true;
        }
        if (n > 0) this.toast(`${m.info.name} calls for help!`, COLORS.textGold);
      }
    });
  }

  /** Red telegraphed AoE circle that fills up, then resolves. */
  telegraph(x: number, y: number, radius: number, ms: number, onDone: () => void) {
    const g = this.add.graphics().setDepth(-5000);
    const start = this.game.getTime();
    const draw = () => {
      const t = Phaser.Math.Clamp((this.game.getTime() - start) / ms, 0, 1);
      g.clear();
      g.fillStyle(0xff2a2a, 0.18).fillEllipse(x, y, radius * 2, radius * 1.4);
      g.lineStyle(1, 0xff3a3a, 0.9).strokeEllipse(x, y, radius * 2, radius * 1.4);
      g.fillStyle(0xff3a3a, 0.35).fillEllipse(x, y, radius * 2 * t, radius * 1.4 * t);
    };
    draw();
    const ev = this.time.addEvent({ delay: 30, loop: true, callback: draw });
    this.time.delayedCall(ms, () => {
      ev.remove();
      g.destroy();
      onDone();
    });
  }

  killMonster(m: Monster, killer: Actor) {
    if (m.dead) return;
    m.dead = true;
    m.body.setVelocity(0, 0);
    m.body.enable = false;
    m.clearTint();
    m.action('death', 500);
    m.nameText.setVisible(false);
    AudioManager.sfx('monster_die');
    this.time.delayedCall(350, () => this.vfx.play('death_poof', m.x, m.y));
    this.tweens.add({ targets: [m, m.shadow], alpha: 0, delay: 450, duration: 300, onComplete: () => { this.monsters.remove(m); m.destroy(); } });
    if (killer.faction !== 'monster' && !(m as any).noRewards) this.grantRewards(m);
    this.onMonsterKilled(m);
  }

  /** Subclass hook (dungeon wave tracking, quests). */
  protected onMonsterKilled(_m: Monster) {}
  /** Subclass hook for reward accounting. */
  protected onRewards(_exp: number, _gold: number, _items: Record<string, number>) {}

  private grantRewards(m: Monster) {
    GameState.char.stats_record.kills++;
    const exp = m.stats.exp;
    const gold = Math.round(m.stats.gold * Phaser.Math.FloatBetween(0.8, 1.2));
    const items: Record<string, number> = {};
    const dropMult = GameState.derived.dropRate;
    for (const d of m.info.drops) {
      if (Math.random() < Math.min(1, d.chance * dropMult)) {
        const qty = Phaser.Math.Between(d.min ?? 1, d.max ?? 1);
        items[d.itemId] = (items[d.itemId] ?? 0) + qty;
      }
    }
    this.floatText(m.x, m.y - 34, `+${exp} EXP`, '#c8f0ff');
    GameState.addExp(exp);
    this.dropLoot(m.x, m.y, gold, items);
    this.onRewards(exp, gold, items);
  }

  /** Pop loot icons out of a monster and fly them to the player. */
  private dropLoot(x: number, y: number, gold: number, items: Record<string, number>) {
    const entries: { icon: string; apply: () => void }[] = [];
    if (gold > 0) entries.push({ icon: 'icon_gold', apply: () => { GameState.addGold(gold); AudioManager.sfx('coin'); } });
    for (const [id, qty] of Object.entries(items)) {
      entries.push({
        icon: ITEMS[id]?.icon ?? 'icon_gold',
        apply: () => {
          const left = GameState.addItem(id, qty);
          if (left > 0) this.toast('Inventory full!', COLORS.textRed);
          else this.toast(`+${qty} ${ITEMS[id].name}`, '#d8f0c0');
        },
      });
    }
    entries.forEach((e, i) => {
      const img = this.add.image(x, y - 8, e.icon).setDepth(y + 500);
      const tx = x + (i - (entries.length - 1) / 2) * 12;
      this.tweens.add({
        targets: img, x: tx, y: { value: y - 26, ease: 'Quad.easeOut' }, duration: 260,
        onComplete: () => this.tweens.add({
          targets: img, y: y - 4, duration: 200, ease: 'Bounce.easeOut',
          onComplete: () => this.time.delayedCall(250 + i * 60, () => this.tweens.add({
            targets: img, x: { getEnd: () => this.player.x }, y: { getEnd: () => this.player.y - 12 }, scale: 0.5, duration: 280, ease: 'Quad.easeIn',
            onComplete: () => { img.destroy(); e.apply(); },
          })),
        }),
      });
    });
  }

  // ================================================================ player state
  private tickRegen(dt: number) {
    const p = this.player;
    if (p.dead) return;
    const mult = this.isTown ? BALANCE.derived.townRegenMultiplier : 1;
    this.regenAcc += dt;
    p.hp += GameState.derived.hpRegen * dt * mult;
    p.mp += GameState.derived.mpRegen * dt * mult;
    if (this.regenAcc > 0.25) {
      this.regenAcc = 0;
      Bus.emit(Ev.PLAYER_CHANGED);
    }
  }

  private tickBuffs() {
    const now = this.game.getTime();
    const before = GameState.buffs.length;
    for (let i = GameState.buffs.length - 1; i >= 0; i--) if (GameState.buffs[i].expiresAt <= now) GameState.buffs.splice(i, 1);
    if (GameState.buffs.length !== before) GameState.recompute();
  }

  private onLevelUp(level: number) {
    const p = this.player;
    this.vfx.play('level_up', p.x, p.y, { follow: p });
    AudioManager.sfx('level_up');
    this.floatText(p.x, p.y - 44, 'LEVEL UP!', '#ffe040', true);
    this.toast(`Level ${level}! +${BALANCE.statPointsPerLevel} stat points`, COLORS.textGold);
    (this.monsters.getChildren() as Monster[]).forEach((m) => m.refreshNameColor());
  }

  killPlayer() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    p.casting = null;
    p.moveTarget = null;
    p.body.setVelocity(0, 0);
    p.action('death', 900);
    Controls.reset();
    AudioManager.sfx('defeat');
    for (const o of this.monsters.getChildren()) (o as Monster).threat.delete(p);
    const lost = GameState.applyDeathPenalty();
    this.time.delayedCall(1200, () => {
      const hud = this.scene.get('Hud') as any;
      hud?.showDefeat?.(lost);
    });
  }

  /** Respawn in town with full HP/MP. */
  respawnInTown() {
    GameState.char.hp = GameState.derived.maxHp;
    GameState.char.mp = GameState.derived.maxMp;
    GameState.buffs.length = 0;
    GameState.recompute();
    GameState.save();
    this.goTo('Town', { respawn: true });
  }

  goTo(sceneKey: string, data: object = {}) {
    if (this.transitioning) return;
    this.transitioning = true;
    Controls.reset();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(sceneKey, data));
  }

  /** Debug helpers. */
  debugKillAll() {
    (this.monsters.getChildren() as Monster[]).slice().forEach((m) => !m.dead && this.killMonster(m, this.player));
  }
}
