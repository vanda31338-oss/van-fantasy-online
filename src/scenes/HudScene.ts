import Phaser from 'phaser';
import { CLASSES } from '../data/classes';
import { ITEMS } from '../data/items';
import type { NpcDef } from '../data/npcs';
import { SKILLS, scale } from '../data/skills';
import { AudioManager } from '../core/AudioManager';
import { Controls } from '../core/Controls';
import { Bus, Ev } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { Joystick } from '../ui/Joystick';
import {
  openDebugPanel, openDefeatPanel, openDialog, openDungeonMenu, openInventoryPanel, openMainMenu, openResultPanel, openStatsPanel,
} from '../ui/panels';
import { COLORS, drawPanel, txt } from '../ui/theme';
import { toast } from '../ui/widgets';
import { safeInsets } from '../ui/safeArea';
import { restartOnResize } from '../ui/resize';
import type { WorldScene } from './WorldScene';
import type { DungeonResult, DungeonScene } from './DungeonScene';
import type { Monster } from '../entities/Monster';

interface RoundButton {
  x: number;
  y: number;
  r: number;
  g: Phaser.GameObjects.Graphics;
  cd: Phaser.GameObjects.Graphics;
  icon?: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  count?: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Arc;
}

export const DEBUG_ENABLED = import.meta.env.DEV || /[?&]debug=1/.test(location.search);

/** Always-on-top HUD + touch controls for the active world scene. */
export class HudScene extends Phaser.Scene {
  private worldKey = 'Town';
  private world!: WorldScene;
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private lvText!: Phaser.GameObjects.Text;
  private buffIcons: Phaser.GameObjects.GameObject[] = [];
  private skillBtns: RoundButton[] = [];
  private potionBtns: RoundButton[] = [];
  private attackBtn!: RoundButton;
  private minimapImg!: Phaser.GameObjects.Image;
  private minimapDots!: Phaser.GameObjects.Graphics;
  private minimapBox = { x: 0, y: 0, w: 0, h: 0, scale: 1 };
  private savingText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Container;
  private bossBarG!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private joystick!: Joystick;
  private modalOpen = () => this.children.list.some((o) => o.name === 'modal');
  private L = { left: 0, right: 0, top: 0, bottom: 0 };
  private busHandlers: [string, (...a: any[]) => void][] = [];
  private lastBuffSig = '';

  constructor() {
    super('Hud');
  }

  init(data: { worldKey: string }) {
    this.worldKey = data.worldKey ?? 'Town';
    this.skillBtns = [];
    this.potionBtns = [];
    this.buffIcons = [];
    this.busHandlers = [];
    this.lastBuffSig = '';
  }

  private onBus(ev: string, fn: (...a: any[]) => void) {
    Bus.on(ev, fn);
    this.busHandlers.push([ev, fn]);
  }

  create() {
    this.world = this.scene.get(this.worldKey) as WorldScene;
    this.input.addPointer(3);
    const ins = safeInsets(this);
    this.L = { left: Math.max(6, ins.left), right: Math.max(6, ins.right), top: Math.max(4, ins.top), bottom: Math.max(4, ins.bottom) };
    const W = this.scale.width, H = this.scale.height;

    this.buildStatusPanel();
    this.buildMinimap();
    this.buildActionButtons();
    this.buildBossBar();

    this.joystick = new Joystick(this, () => new Phaser.Geom.Rectangle(0, 70, W * 0.5, H - 70), () => this.modalOpen());

    this.savingText = txt(this, W - this.L.right - 4, this.minimapBox.y + this.minimapBox.h + 6, 'Saving...', 8, { font: 'body', color: COLORS.textGold, stroke: '#1a1030', strokeThickness: 2 })
      .setOrigin(1, 0).setVisible(false);
    const offSave = SaveManager.onSaving((s) => this.savingText?.active && this.savingText.setVisible(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offSave);

    this.onBus(Ev.PLAYER_CHANGED, () => this.refreshBars());
    this.onBus(Ev.INVENTORY_CHANGED, () => this.refreshPotions());
    this.onBus(Ev.TOAST, (msg: string, color?: string) => toast(this, msg, color));
    this.onBus(Ev.BOSS_HP, (name: string | null, hp?: number, max?: number, enraged?: boolean) => this.updateBossBar(name, hp ?? 0, max ?? 1, !!enraged));
    this.onBus(Ev.WAVE, (title: string, sub: string) => this.banner(title, sub));
    this.onBus('npc:talk', (npc: NpcDef) => this.talk(npc));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [ev, fn] of this.busHandlers) Bus.off(ev, fn);
      Controls.reset();
    });

    restartOnResize(this, () => ({ worldKey: this.worldKey }));

    this.refreshBars();
    this.refreshPotions();
  }

  // ------------------------------------------------------------------ top-left status
  private buildStatusPanel() {
    const x = this.L.left, y = this.L.top;
    const g = this.add.graphics();
    drawPanel(g, x, y, 168, 50, { alpha: 0.82 });
    const cls = CLASSES[GameState.char.classId];
    const pg = this.add.graphics();
    pg.fillStyle(0x0f0b1e, 1).fillRect(x + 6, y + 6, 38, 38);
    pg.fillStyle(0x3a3266, 1).fillRect(x + 7, y + 7, 36, 36);
    const portrait = this.add.image(x + 25, y + 30, cls.sprite, 0).setScale(1);
    portrait.setCrop(4, 2, 24, 22);
    portrait.setScale(1.5).setPosition(x + 25, y + 34);
    this.lvText = txt(this, x + 50, y + 7, '', 8, { font: 'body', color: COLORS.textGold });
    this.bars = this.add.graphics();
    this.hpText = txt(this, x + 160, y + 17, '', 8, { font: 'body', stroke: '#1a1030', strokeThickness: 2 }).setOrigin(1, 0);
    this.mpText = txt(this, x + 160, y + 28, '', 8, { font: 'body', stroke: '#1a1030', strokeThickness: 2 }).setOrigin(1, 0);
  }

  private refreshBars() {
    if (!GameState.loaded || !this.bars) return;
    const c = GameState.char, d = GameState.derived;
    const x = this.L.left + 50, y = this.L.top;
    const w = 112;
    const g = this.bars;
    g.clear();
    const bar = (by: number, h: number, pct: number, col: number, dark: number) => {
      g.fillStyle(0x0f0b1e, 1).fillRect(x - 1, by - 1, w + 2, h + 2);
      g.fillStyle(dark, 1).fillRect(x, by, w, h);
      g.fillStyle(col, 1).fillRect(x, by, Math.round(w * Phaser.Math.Clamp(pct, 0, 1)), h);
      g.fillStyle(0xffffff, 0.25).fillRect(x, by, Math.round(w * Phaser.Math.Clamp(pct, 0, 1)), 1);
    };
    bar(y + 19, 7, c.hp / d.maxHp, COLORS.hp, COLORS.hpDark);
    bar(y + 30, 7, c.mp / d.maxMp, COLORS.mp, COLORS.mpDark);
    bar(y + 41, 3, c.exp / GameState.expToNext(), COLORS.exp, 0x4a3a10);
    this.lvText.setText(`Lv${c.level} ${c.name}`);
    this.hpText.setText(`${Math.ceil(c.hp)}/${d.maxHp}`);
    this.mpText.setText(`${Math.floor(c.mp)}/${d.maxMp}`);
    this.refreshBuffs();
  }

  private refreshBuffs() {
    const sig = GameState.buffs.map((b) => b.id).join(',');
    if (sig === this.lastBuffSig) return;
    this.lastBuffSig = sig;
    this.buffIcons.forEach((o) => o.destroy());
    this.buffIcons = [];
    GameState.buffs.forEach((b, i) => {
      if (!b.icon) return;
      const img = this.add.image(this.L.left + 8 + i * 18, this.L.top + 60, b.icon).setScale(0.75).setOrigin(0, 0.5);
      this.buffIcons.push(img);
    });
  }

  // ------------------------------------------------------------------ top-right minimap + menu
  private buildMinimap() {
    const W = this.scale.width;
    const mm = this.world.minimap;
    const boxW = 104, boxH = 66;
    const x = W - this.L.right - boxW, y = this.L.top;
    const g = this.add.graphics();
    drawPanel(g, x, y, boxW, boxH, { alpha: 0.9 });
    const s = Math.min((boxW - 10) / mm.tilesW, (boxH - 10) / mm.tilesH);
    const iw = mm.tilesW * s, ih = mm.tilesH * s;
    this.minimapBox = { x: x + (boxW - iw) / 2, y: y + (boxH - ih) / 2, w: iw, h: ih, scale: s };
    this.minimapImg = this.add.image(this.minimapBox.x, this.minimapBox.y, mm.key).setOrigin(0).setScale(s);
    this.minimapDots = this.add.graphics();
    this.minimapBox.h = boxH;
    this.minimapBox.y = y;
    (this.minimapImg as any).__inner = { x: x + (boxW - iw) / 2, y: y + (boxH - ih) / 2 };
    // Menu button
    const mb = this.makeRound(x - 26, y + 22, 20, 'icon_menu', () => this.openMenu());
    mb.icon?.setScale(1.5);
    if (DEBUG_ENABLED) {
      const db = txt(this, x - 26, y + 50, 'DBG', 8, { color: '#ff8a8a', stroke: '#1a1030', strokeThickness: 2 }).setOrigin(0.5).setInteractive();
      db.on('pointerup', () => openDebugPanel(this, this.world));
    }
  }

  private drawMinimapDots() {
    const inner = (this.minimapImg as any).__inner as { x: number; y: number };
    const s = this.minimapBox.scale / 16;
    const g = this.minimapDots;
    g.clear();
    for (const o of this.world.monsters.getChildren()) {
      const m = o as Monster;
      if (m.dead) continue;
      g.fillStyle(m.isBoss ? 0xff3a3a : 0xff8a5a, 1).fillRect(Math.round(inner.x + m.x * s) - 1, Math.round(inner.y + m.y * s) - 1, m.isBoss ? 4 : 2, m.isBoss ? 4 : 2);
    }
    const npcs = (this.world as any).npcs as { x: number; y: number }[] | undefined;
    npcs?.forEach((n) => g.fillStyle(0xffe040, 1).fillRect(Math.round(inner.x + n.x * s) - 1, Math.round(inner.y + n.y * s) - 1, 2, 2));
    const p = this.world.player;
    if (p) {
      g.fillStyle(0xffffff, 1).fillRect(Math.round(inner.x + p.x * s) - 2, Math.round(inner.y + p.y * s) - 2, 4, 4);
      g.fillStyle(0x3a8aff, 1).fillRect(Math.round(inner.x + p.x * s) - 1, Math.round(inner.y + p.y * s) - 1, 2, 2);
    }
  }

  // ------------------------------------------------------------------ bottom-right combat buttons
  private makeRound(x: number, y: number, r: number, icon: string | null, onDown: () => void, onUp?: () => void): RoundButton {
    const g = this.add.graphics();
    const cd = this.add.graphics();
    const btn: RoundButton = { x, y, r, g, cd, zone: this.add.circle(x, y, r + 3, 0xffffff, 0.001).setInteractive({ useHandCursor: true }) };
    if (icon) btn.icon = this.add.image(x, y, icon);
    this.drawRound(btn, false);
    btn.zone.on('pointerdown', () => {
      this.drawRound(btn, true);
      onDown();
    });
    const up = () => {
      this.drawRound(btn, false);
      onUp?.();
    };
    btn.zone.on('pointerup', up);
    btn.zone.on('pointerout', up);
    return btn;
  }

  private drawRound(b: RoundButton, pressed: boolean, tint = 0x2a2450) {
    const g = b.g;
    g.clear();
    g.fillStyle(0x0f0b1e, 0.9).fillCircle(b.x, b.y, b.r + 2);
    g.fillStyle(COLORS.gold, 1).fillCircle(b.x, b.y, b.r + 1);
    g.fillStyle(0x0f0b1e, 1).fillCircle(b.x, b.y, b.r - 1);
    g.fillStyle(pressed ? 0x6a5ab0 : tint, 0.92).fillCircle(b.x, b.y, b.r - 2);
    g.fillStyle(0xffffff, pressed ? 0.05 : 0.12).fillCircle(b.x - b.r * 0.25, b.y - b.r * 0.3, b.r * 0.45);
  }

  private buildActionButtons() {
    const W = this.scale.width, H = this.scale.height;
    const ax = W - this.L.right - 46, ay = H - this.L.bottom - 46;
    this.attackBtn = this.makeRound(ax, ay, 30, 'icon_attack', () => { Controls.attackHeld = true; }, () => { Controls.attackHeld = false; });
    this.attackBtn.icon?.setScale(1.5);
    // 5 skill buttons on an arc (left → up) around the attack button
    const R = 94;
    const angles = [172, 196, 220, 244, 268];
    angles.forEach((deg, i) => {
      const a = Phaser.Math.DegToRad(deg);
      const x = ax + Math.cos(a) * R, y = ay + Math.sin(a) * R;
      const b = this.makeRound(x, y, 19, null, () => Controls.push('skill', i));
      b.label = txt(this, x, y, '', 8, { stroke: '#1a1030', strokeThickness: 3 }).setOrigin(0.5).setDepth(5);
      this.skillBtns.push(b);
    });
    this.refreshSkillIcons();
    // auto toggles + potion quick slots on the right edge
    const px = W - this.L.right - 22;
    const toggle = (y: number, label: string, unlockLv: number) => {
      const g = this.add.graphics();
      g.fillStyle(0x0f0b1e, 0.85).fillRoundedRect(px - 21, y - 10, 42, 20, 4);
      g.lineStyle(1, 0x5a4a8a, 1).strokeRoundedRect(px - 21, y - 10, 42, 20, 4);
      txt(this, px, y, label, 8, { font: 'body', color: '#8a8698', stroke: '#1a1030', strokeThickness: 2, align: 'center' }).setOrigin(0.5);
      const z = this.add.zone(px, y, 44, 24).setInteractive();
      z.on('pointerup', () => toast(this, `${label} unlocks at Lv ${unlockLv} (next update)`, COLORS.textGold));
    };
    toggle(this.L.top + 80, 'AUTO', 5);
    toggle(this.L.top + 104, 'A-POT', 8);
    [0, 1].forEach((i) => {
      const y = this.L.top + 136 + i * 40;
      const b = this.makeRound(px, y, 18, null, () => Controls.push('potion', i));
      b.count = txt(this, px + 15, y + 6, '', 8, { font: 'body', stroke: '#1a1030', strokeThickness: 2 }).setOrigin(1, 0).setDepth(5);
      this.potionBtns.push(b);
    });
  }

  private refreshSkillIcons() {
    this.skillBtns.forEach((b, i) => {
      b.icon?.destroy();
      b.icon = undefined;
      const id = GameState.char.skillSlots[i];
      if (id && SKILLS[id]) b.icon = this.add.image(b.x, b.y, SKILLS[id].icon).setScale(1.5).setDepth(1);
    });
  }

  private refreshPotions() {
    this.potionBtns.forEach((b, i) => {
      b.icon?.destroy();
      const id = GameState.char.potionSlots[i];
      b.icon = id ? this.add.image(b.x, b.y, ITEMS[id].icon).setScale(1.5).setDepth(1) : undefined;
      const n = id ? GameState.countItem(id) : 0;
      b.count?.setText(id ? `${n}` : '').setColor(n ? COLORS.text : COLORS.textRed);
      b.icon?.setAlpha(n ? 1 : 0.4);
    });
  }

  private updateCooldowns() {
    const now = this.game.getTime();
    const p = this.world.player;
    if (!p) return;
    this.skillBtns.forEach((b, i) => {
      b.cd.clear();
      const id = GameState.char.skillSlots[i];
      if (!id) {
        b.label?.setText('');
        return;
      }
      const def = SKILLS[id];
      const lv = GameState.char.skills[id] ?? 1;
      const ready = p.skillReadyAt[id] ?? 0;
      const total = Math.max(0.3, scale(def.cooldown, lv)) * 1000;
      const left = ready - now;
      if (left > 0) {
        const frac = left / total;
        b.cd.fillStyle(0x000000, 0.6).slice(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).fillPath();
        b.label?.setText(left > 1000 ? `${Math.ceil(left / 1000)}` : (left / 1000).toFixed(1));
      } else b.label?.setText('');
      const cost = Math.round(scale(def.mpCost, lv));
      b.icon?.setTint(p.mp < cost ? 0x5a6aff : 0xffffff);
    });
    const pcd = this.world.potionCooldownLeft();
    this.potionBtns.forEach((b) => {
      b.cd.clear();
      if (pcd > 0) b.cd.fillStyle(0x000000, 0.55).slice(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pcd / 1500), false).fillPath();
    });
  }

  // ------------------------------------------------------------------ boss bar & banners
  private buildBossBar() {
    const W = this.scale.width;
    this.bossBar = this.add.container(W / 2, this.L.top + 6).setVisible(false);
    this.bossBarG = this.add.graphics();
    this.bossName = txt(this, 0, 0, '', 8, { color: '#ffd0d0', stroke: '#1a1030', strokeThickness: 3 }).setOrigin(0.5, 0);
    this.bossBar.add([this.bossBarG, this.bossName]);
  }

  private updateBossBar(name: string | null, hp: number, max: number, enraged: boolean) {
    if (!this.bossBar) return;
    if (!name) {
      this.bossBar.setVisible(false);
      return;
    }
    this.bossBar.setVisible(true);
    this.bossName.setText(name + (enraged ? '  [ENRAGED]' : ''));
    const w = Math.min(240, this.scale.width - 380), h = 8;
    const g = this.bossBarG;
    g.clear();
    g.fillStyle(0x0f0b1e, 1).fillRect(-w / 2 - 2, 12, w + 4, h + 4);
    g.fillStyle(0x4a1020, 1).fillRect(-w / 2, 14, w, h);
    g.fillStyle(enraged ? 0xff3a2a : 0xd8304a, 1).fillRect(-w / 2, 14, Math.round((w * hp) / max), h);
    g.fillStyle(0xffffff, 0.3).fillRect(-w / 2, 14, Math.round((w * hp) / max), 2);
  }

  banner(title: string, sub: string) {
    const W = this.scale.width, H = this.scale.height;
    const t = txt(this, W / 2, H * 0.32, title, 16, { color: COLORS.textGold, stroke: '#1a1030', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setAlpha(0);
    const s = txt(this, W / 2, H * 0.32 + 20, sub, 8, { font: 'body', color: COLORS.text, stroke: '#1a1030', strokeThickness: 3 }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [t, s], alpha: 1, x: { from: W / 2 - 30, to: W / 2 }, duration: 300, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: [t, s], alpha: 0, delay: 1800, duration: 400, onComplete: () => { t.destroy(); s.destroy(); } });
  }

  // ------------------------------------------------------------------ menus & dialogs
  private openMenu() {
    if (this.modalOpen()) return;
    Controls.reset();
    this.joystick.release();
    openMainMenu(this, {
      world: this.world,
      isDungeon: !this.world.isTown,
      onLeaveDungeon: () => (this.world as DungeonScene).leaveDungeon(),
      onCharacterSelect: () => {
        GameState.save();
        AudioManager.stopMusic();
        this.scene.stop(this.worldKey);
        this.scene.start('CharSelect');
      },
      debug: DEBUG_ENABLED,
      onDebug: () => openDebugPanel(this, this.world),
    });
  }

  private talk(npc: NpcDef) {
    Controls.reset();
    this.joystick.release();
    openDialog(this, npc, (n) => {
      if (n.action === 'dungeon') openDungeonMenu(this, this.world);
      else if (n.comingSoon) toast(this, n.comingSoon, COLORS.textGold);
    });
  }

  showDefeat(expLost: number) {
    this.joystick.release();
    openDefeatPanel(this, expLost, () => this.world.respawnInTown());
  }

  showResult(r: DungeonResult) {
    this.joystick.release();
    Controls.reset();
    const d = this.world as DungeonScene;
    openResultPanel(this, r, () => d.leaveDungeon(), () => d.retry());
  }

  openStats() {
    openStatsPanel(this);
  }

  openInventory() {
    openInventoryPanel(this, this.world);
  }

  update() {
    if (!GameState.loaded || !this.world?.player) return;
    this.updateCooldowns();
    this.drawMinimapDots();
    if (this.modalOpen() && (Controls.attackHeld || Controls.manual)) {
      Controls.attackHeld = false;
      this.joystick.release();
    }
  }
}
