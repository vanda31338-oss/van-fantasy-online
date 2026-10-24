import Phaser from 'phaser';
import { BALANCE } from '../data/balance';
import { CLASSES } from '../data/classes';
import { DUNGEONS } from '../data/dungeons';
import { ITEMS, RARITY_COLORS, type ItemCategory } from '../data/items';
import type { NpcDef } from '../data/npcs';
import { AudioManager } from '../core/AudioManager';
import { Bus, Ev } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { STAT_KEYS, type StatBlock } from '../core/types';
import type { WorldScene } from '../scenes/WorldScene';
import type { DungeonResult } from '../scenes/DungeonScene';
import { COLORS, drawPanel, txt } from './theme';
import { Button, Modal, confirmDialog, toast } from './widgets';

const STAT_INFO: Record<keyof StatBlock, string> = {
  str: 'Physical ATK',
  vit: 'Max HP, DEF, HP regen',
  int: 'MATK, Max MP, MP regen, pets',
  dex: 'Accuracy, attack & cast speed',
  luk: 'Crit, dodge, drop rate',
};

// ====================================================================== Character / stats
export function openStatsPanel(scene: Phaser.Scene) {
  const m = new Modal(scene, 420, 260, 'CHARACTER');
  const c = m.content;
  const ch = GameState.char;
  const cls = CLASSES[ch.classId];
  const dyn: Phaser.GameObjects.GameObject[] = [];
  const render = () => {
    dyn.forEach((o) => o.destroy());
    dyn.length = 0;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      c.add(o);
      dyn.push(o);
      return o;
    };
    const d = GameState.derived;
    add(txt(scene, 16, 28, `${ch.name}`, 8, { color: COLORS.textGold }));
    add(txt(scene, 16, 40, `${cls.name}  Lv ${ch.level}`, 8));
    add(txt(scene, 16, 52, `EXP ${ch.exp} / ${GameState.expToNext()}`, 8, { font: 'body', color: COLORS.textDim }));
    add(txt(scene, 16, 72, `Stat points: ${ch.statPoints}`, 8, { color: ch.statPoints ? COLORS.textGreen : COLORS.textDim }));
    STAT_KEYS.forEach((k, i) => {
      const y = 92 + i * 26;
      add(txt(scene, 16, y, k.toUpperCase(), 8, { color: COLORS.textGold }));
      add(txt(scene, 56, y, `${ch.stats[k]}`, 8));
      add(txt(scene, 16, y + 11, STAT_INFO[k], 8, { font: 'body', color: COLORS.textDim }));
      if (ch.statPoints > 0) {
        add(new Button(scene, 116, y + 6, '+1', () => { GameState.allocateStat(k, 1); render(); }, { w: 30, h: 22, color: COLORS.good }));
        add(new Button(scene, 152, y + 6, '+5', () => { GameState.allocateStat(k, 5); render(); }, { w: 34, h: 22, color: COLORS.good }));
      }
    });
    add(txt(scene, 16, 226, `Recommended: ${cls.recommended}`, 8, { font: 'body', color: COLORS.textBlue }));
    const rows: [string, string][] = [
      ['HP', `${Math.round(ch.hp)} / ${d.maxHp}`], ['MP', `${Math.round(ch.mp)} / ${d.maxMp}`],
      ['ATK', `${d.atk}`], ['MATK', `${d.matk}`], ['DEF', `${d.def}`], ['MDEF', `${d.mdef}`],
      ['HIT', `${d.hit}`], ['FLEE', `${d.flee}`], ['CRIT', `${d.crit.toFixed(1)}%`],
      ['ASPD', `${d.aspd.toFixed(2)}/s`], ['Cast Spd', `x${d.castSpeed.toFixed(2)}`],
      ['Gold', `${ch.gold}`],
    ];
    const g = scene.add.graphics();
    drawPanel(g, 210, 28, 196, 218, { fill: COLORS.panelInner, gold: false });
    add(g);
    rows.forEach(([k, v], i) => {
      add(txt(scene, 222, 40 + i * 16, k, 8, { color: COLORS.textDim }));
      add(txt(scene, 394, 40 + i * 16, v, 8).setOrigin(1, 0));
    });
  };
  render();
  m.onClose(() => GameState.save());
  return m;
}

// ====================================================================== Inventory
const TABS: { cat: ItemCategory; label: string }[] = [
  { cat: 'equipment', label: 'Equip' },
  { cat: 'consumable', label: 'Items' },
  { cat: 'material', label: 'Mats' },
  { cat: 'gem_rune', label: 'Gems' },
];

export function openInventoryPanel(scene: Phaser.Scene, world: WorldScene) {
  const m = new Modal(scene, 440, 270, 'INVENTORY');
  const c = m.content;
  let tab: ItemCategory = 'consumable';
  let selected: string | null = null;
  const dyn: Phaser.GameObjects.GameObject[] = [];
  const render = () => {
    dyn.forEach((o) => o.destroy());
    dyn.length = 0;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      c.add(o);
      dyn.push(o);
      return o;
    };
    TABS.forEach((t, i) => {
      add(new Button(scene, 48 + i * 66, 40, t.label, () => { tab = t.cat; selected = null; render(); }, { w: 62, h: 22, color: tab === t.cat ? COLORS.btnLight : COLORS.panelLight }));
    });
    add(txt(scene, 16, 248, `Gold: ${GameState.char.gold}`, 8, { color: COLORS.textGold }));
    add(txt(scene, 270, 248, `${GameState.usedSlots()} / ${GameState.char.inventoryCapacity}`, 8, { color: COLORS.textDim }).setOrigin(1, 0));
    const items = GameState.itemsByCategory(tab);
    const cols = 9, cell = 28, gx = 16, gy = 58;
    for (let i = 0; i < cols * 6; i++) {
      const x = gx + (i % cols) * cell, y = gy + Math.floor(i / cols) * cell;
      const stack = items[i];
      const g = add(scene.add.graphics());
      g.fillStyle(0x0f0b1e, 1).fillRect(x, y, cell - 2, cell - 2);
      g.fillStyle(stack && stack.uid === selected ? 0x6a5ab0 : 0x2a2450, 1).fillRect(x + 1, y + 1, cell - 4, cell - 4);
      if (!stack) continue;
      const def = ITEMS[stack.itemId];
      add(scene.add.image(x + 13, y + 13, def.icon));
      if (stack.qty > 1) add(txt(scene, x + cell - 3, y + cell - 11, `${stack.qty}`, 8, { font: 'body', stroke: '#000', strokeThickness: 2 }).setOrigin(1, 0));
      const z = add(scene.add.zone(x, y, cell - 2, cell - 2).setOrigin(0).setInteractive());
      z.on('pointerup', () => { selected = stack.uid; AudioManager.sfx('ui_click'); render(); });
    }
    // details
    const g = add(scene.add.graphics());
    drawPanel(g, 278, 58, 148, 200, { fill: COLORS.panelInner, gold: false });
    const stack = GameState.char.inventory.find((s) => s.uid === selected);
    if (!stack) {
      add(txt(scene, 352, 140, items.length ? 'Tap an item' : 'Nothing here yet', 8, { font: 'body', color: COLORS.textDim, align: 'center' }).setOrigin(0.5));
      return;
    }
    const def = ITEMS[stack.itemId];
    add(scene.add.image(300, 82, def.icon).setScale(2));
    add(txt(scene, 322, 70, def.name, 8, { font: 'body', color: RARITY_COLORS[def.rarity], wrap: 100 }));
    add(txt(scene, 322, 92, `x${stack.qty}`, 8, { font: 'body', color: COLORS.textDim }));
    add(txt(scene, 288, 108, def.description, 8, { font: 'body', wrap: 128 }));
    add(txt(scene, 288, 170, `Sell value: ${def.sellPrice}g`, 8, { font: 'body', color: COLORS.textGold }));
    if (def.use) {
      add(new Button(scene, 316, 200, 'Use', () => { world.useItem(def.id); render(); }, { w: 60, h: 22, color: COLORS.good }));
    }
    if (def.use?.potion) {
      add(new Button(scene, 316, 228, 'Slot 1', () => { GameState.char.potionSlots[0] = def.id; Bus.emit(Ev.INVENTORY_CHANGED); toast(scene, 'Set to quick slot 1'); }, { w: 60, h: 22 }));
      add(new Button(scene, 386, 228, 'Slot 2', () => { GameState.char.potionSlots[1] = def.id; Bus.emit(Ev.INVENTORY_CHANGED); toast(scene, 'Set to quick slot 2'); }, { w: 60, h: 22 }));
    }
  };
  render();
  const off = () => Bus.off(Ev.INVENTORY_CHANGED, render);
  Bus.on(Ev.INVENTORY_CHANGED, render);
  m.onClose(off);
  m.once(Phaser.GameObjects.Events.DESTROY, off);
  return m;
}

// ====================================================================== Settings
export function openSettingsPanel(scene: Phaser.Scene) {
  const m = new Modal(scene, 340, 230, 'SETTINGS');
  const c = m.content;
  const s = SaveManager.settings;
  const dyn: Phaser.GameObjects.GameObject[] = [];
  const render = () => {
    dyn.forEach((o) => o.destroy());
    dyn.length = 0;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      c.add(o);
      dyn.push(o);
      return o;
    };
    const vol = (label: string, y: number, key: 'musicVolume' | 'sfxVolume') => {
      add(txt(scene, 20, y - 4, label, 8));
      add(new Button(scene, 160, y, '-', () => { s[key] = Math.max(0, Math.round((s[key] - 0.1) * 10) / 10); apply(); }, { w: 28, h: 24 }));
      const g = add(scene.add.graphics());
      g.fillStyle(0x0f0b1e, 1).fillRect(180, y - 5, 92, 10);
      g.fillStyle(COLORS.gold, 1).fillRect(181, y - 4, Math.round(90 * s[key]), 8);
      add(new Button(scene, 292, y, '+', () => { s[key] = Math.min(1, Math.round((s[key] + 0.1) * 10) / 10); apply(); }, { w: 28, h: 24 }));
    };
    vol('Music', 44, 'musicVolume');
    vol('Sound FX', 76, 'sfxVolume');
    add(txt(scene, 20, 104, 'Damage numbers', 8));
    add(new Button(scene, 250, 108, s.damageNumbers ? 'ON' : 'OFF', () => { s.damageNumbers = !s.damageNumbers; apply(); }, { w: 70, h: 24, color: s.damageNumbers ? COLORS.good : COLORS.btnDisabled }));
    add(txt(scene, 20, 136, 'VFX quality', 8));
    (['low', 'medium', 'high'] as const).forEach((q, i) => {
      add(new Button(scene, 160 + i * 62, 140, q === 'low' ? 'Low' : q === 'medium' ? 'Med' : 'High', () => { s.vfxQuality = q; apply(); }, { w: 58, h: 24, color: s.vfxQuality === q ? COLORS.btnLight : COLORS.panelLight }));
    });
    add(new Button(scene, 90, 196, 'Fullscreen', () => toggleFullscreen(scene), { w: 120, h: 26 }));
    add(new Button(scene, 250, 196, 'Save now', () => { if (GameState.loaded) GameState.save(); else SaveManager.persist(); toast(scene, 'Game saved'); }, { w: 120, h: 26, color: COLORS.good }));
  };
  const apply = () => {
    AudioManager.applyVolumes();
    SaveManager.persist();
    Bus.emit(Ev.SETTINGS_CHANGED);
    render();
  };
  render();
  return m;
}

export function toggleFullscreen(scene: Phaser.Scene) {
  try {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else {
      scene.scale.startFullscreen();
      (screen.orientation as any)?.lock?.('landscape').catch(() => {});
    }
  } catch {
    /* not supported (e.g. iPhone Safari) */
  }
}

// ====================================================================== NPC dialogue
export function openDialog(scene: Phaser.Scene, npc: NpcDef, onAction: (npc: NpcDef) => void) {
  const W = scene.scale.width, H = scene.scale.height;
  const root = scene.add.container(0, 0).setDepth(900).setName('modal');
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.25).setOrigin(0).setInteractive();
  root.add(dim);
  const pw = Math.min(520, W - 40), ph = 92;
  const px = Math.round((W - pw) / 2), py = H - ph - 10;
  const g = scene.add.graphics();
  drawPanel(g, px, py, pw, ph);
  root.add(g);
  if (npc.sprite) {
    const portrait = scene.add.sprite(px + 30, py + 54, npc.sprite, 0).setScale(2);
    root.add(portrait);
  }
  const tx = px + (npc.sprite ? 60 : 14);
  root.add(txt(scene, tx, py + 10, npc.name, 8, { color: COLORS.textGold }));
  root.add(txt(scene, tx + npc.name.length * 8 + 8, py + 10, npc.title, 8, { font: 'body', color: COLORS.textDim }));
  const body = txt(scene, tx, py + 26, '', 16, { font: 'body', wrap: pw - (tx - px) - 14, lineSpacing: 0 });
  body.setFontSize(16);
  root.add(body);
  const more = txt(scene, px + pw - 16, py + ph - 14, '▼', 8, { color: COLORS.textGold }).setOrigin(0.5);
  root.add(more);
  scene.tweens.add({ targets: more, y: more.y + 2, yoyo: true, repeat: -1, duration: 350 });
  let line = 0;
  let typing: Phaser.Time.TimerEvent | null = null;
  let full = '';
  const buttons: Phaser.GameObjects.GameObject[] = [];
  const close = () => root.destroy();
  const showLine = () => {
    full = npc.lines[line];
    let i = 0;
    body.setText('');
    typing?.remove();
    typing = scene.time.addEvent({
      delay: 18, repeat: full.length - 1,
      callback: () => { i++; body.setText(full.slice(0, i)); if (i >= full.length) { typing = null; onLineDone(); } },
    });
    more.setVisible(false);
  };
  const onLineDone = () => {
    if (line < npc.lines.length - 1) {
      more.setVisible(true);
      return;
    }
    // last line: offer actions
    const bx = px + pw - 70;
    const by = py - 16;
    const closeBtn = new Button(scene, bx, by, 'Close', close, { w: 100, h: 26, color: COLORS.panelLight });
    root.add(closeBtn);
    buttons.push(closeBtn);
    if (npc.action !== 'none') {
      const label = npc.actionLabel ?? (npc.action === 'shop' ? 'Shop' : npc.action === 'blacksmith' ? 'Blacksmith' : npc.action === 'runes' ? 'Runes' : npc.action === 'class_master' ? 'Class Change' : 'Quests');
      const actBtn = new Button(scene, bx - 120, by, label, () => { close(); onAction(npc); }, { w: 130, h: 26, color: COLORS.btnLight });
      root.add(actBtn);
      buttons.push(actBtn);
    }
  };
  dim.on('pointerup', () => {
    if (typing) {
      typing.remove();
      typing = null;
      body.setText(full);
      onLineDone();
      return;
    }
    if (line < npc.lines.length - 1) {
      line++;
      AudioManager.sfx('ui_click');
      showLine();
    } else if (buttons.length === 0) close();
  });
  showLine();
  return root;
}

// ====================================================================== Dungeon teleport
export function openDungeonMenu(scene: Phaser.Scene, world: WorldScene) {
  const m = new Modal(scene, 440, 286, 'DUNGEON TELEPORT');
  const c = m.content;
  const lvl = GameState.char.level;
  c.add(txt(scene, 16, 28, 'Leveling Dungeons', 8, { color: COLORS.textGold }));
  DUNGEONS.forEach((d, i) => {
    const y = 48 + i * 25;
    const g = scene.add.graphics();
    g.fillStyle(i % 2 ? 0x2a2450 : 0x241f46, 1).fillRect(12, y - 2, 416, 23);
    c.add(g);
    const locked = !d.implemented;
    c.add(txt(scene, 20, y + 4, d.name, 8, { font: 'body', color: locked ? '#7a7690' : COLORS.text }));
    const lvColor = lvl < d.levelMin ? COLORS.textRed : lvl > d.levelMax ? '#9a9a9a' : COLORS.textGreen;
    c.add(txt(scene, 230, y + 4, `Lv ${d.levelMin}-${d.levelMax}`, 8, { font: 'body', color: locked ? '#7a7690' : lvColor }));
    const cleared = GameState.char.stats_record.dungeonClears[d.id];
    if (cleared) c.add(txt(scene, 300, y + 4, `Clears: ${cleared}`, 8, { font: 'body', color: COLORS.textDim }));
    c.add(new Button(scene, 392, y + 9, locked ? 'Soon' : 'Enter', () => {
      m.close();
      world.goTo('Dungeon', { dungeonId: d.id });
    }, { w: 60, h: 21, disabled: locked, color: COLORS.good }));
  });
  c.add(txt(scene, 220, 254, 'Equipment Dungeons & Boss Arena: coming in a later update', 8, { font: 'body', color: COLORS.textDim, align: 'center' }).setOrigin(0.5, 0));
  return m;
}

// ====================================================================== Results / defeat
export function openResultPanel(scene: Phaser.Scene, r: DungeonResult, onTown: () => void, onRetry: () => void) {
  const m = new Modal(scene, 360, 240, undefined, { closable: false, dim: 0.65 });
  const c = m.content;
  const title = txt(scene, 180, 16, r.cleared ? 'DUNGEON CLEARED!' : 'DUNGEON FAILED', 16, { color: r.cleared ? COLORS.textGold : COLORS.textRed, stroke: '#1a1030', strokeThickness: 4 }).setOrigin(0.5, 0);
  c.add(title);
  scene.tweens.add({ targets: title, scale: { from: 1.4, to: 1 }, duration: 400, ease: 'Back.easeOut' });
  c.add(txt(scene, 180, 40, r.dungeonName, 8, { font: 'body', color: COLORS.textDim }).setOrigin(0.5, 0));
  const mm = Math.floor(r.timeSec / 60), ss = `${r.timeSec % 60}`.padStart(2, '0');
  const rows: [string, string, string][] = [
    ['Clear time', `${mm}:${ss}`, COLORS.text],
    ['EXP gained', `${r.exp}`, '#c8f0ff'],
    ['Gold gained', `${r.gold}`, COLORS.textGold],
  ];
  rows.forEach(([k, v, col], i) => {
    c.add(txt(scene, 40, 62 + i * 16, k, 8, { color: COLORS.textDim }));
    c.add(txt(scene, 320, 62 + i * 16, v, 8, { color: col }).setOrigin(1, 0));
  });
  c.add(txt(scene, 40, 116, 'Loot', 8, { color: COLORS.textDim }));
  const loot = Object.entries(r.items);
  if (!loot.length) c.add(txt(scene, 40, 132, 'No items this time.', 8, { font: 'body', color: COLORS.textDim }));
  loot.slice(0, 10).forEach(([id, qty], i) => {
    const x = 50 + (i % 5) * 60, y = 140 + Math.floor(i / 5) * 26;
    const def = ITEMS[id];
    c.add(scene.add.image(x, y, def.icon));
    c.add(txt(scene, x + 10, y - 4, `x${qty}`, 8, { font: 'body', color: RARITY_COLORS[def.rarity] }));
  });
  c.add(new Button(scene, 110, 214, 'Return to Town', () => { m.destroy(); onTown(); }, { w: 150, h: 26, color: COLORS.good }));
  c.add(new Button(scene, 260, 214, 'Run Again', () => { m.destroy(); onRetry(); }, { w: 120, h: 26 }));
  return m;
}

export function openDefeatPanel(scene: Phaser.Scene, expLost: number, onRespawn: () => void) {
  const m = new Modal(scene, 300, 140, undefined, { closable: false, dim: 0.7 });
  const c = m.content;
  c.add(txt(scene, 150, 18, 'YOU WERE DEFEATED', 8, { color: COLORS.textRed }).setOrigin(0.5, 0));
  c.add(txt(scene, 150, 44, `You lost ${expLost} EXP.\nGear up, use potions, and try again!`, 8, { font: 'body', align: 'center' }).setOrigin(0.5, 0));
  c.add(new Button(scene, 150, 110, 'Return to Town', () => { m.destroy(); onRespawn(); }, { w: 160, h: 28, color: COLORS.good }));
  return m;
}

// ====================================================================== Main menu
export interface MenuActions {
  world: WorldScene;
  isDungeon: boolean;
  onLeaveDungeon: () => void;
  onCharacterSelect: () => void;
  debug: boolean;
  onDebug: () => void;
}

export function openMainMenu(scene: Phaser.Scene, a: MenuActions) {
  const m = new Modal(scene, 300, 230, 'MENU');
  const c = m.content;
  const soon = (what: string) => () => toast(scene, `${what} arrives in a later update`, COLORS.textGold);
  const items: [string, () => void, boolean?][] = [
    ['Character', () => { m.close(); openStatsPanel(scene); }],
    ['Inventory', () => { m.close(); openInventoryPanel(scene, a.world); }],
    ['Equipment', soon('Equipment'), true],
    ['Skills', soon('The skill tree'), true],
    ['Quests', soon('The quest log'), true],
    ['Guide Book', soon('The Guide Book'), true],
    ['Settings', () => { m.close(); openSettingsPanel(scene); }],
    a.isDungeon
      ? ['Leave Dungeon', () => confirmDialog(scene, 'Leave dungeon?', 'Your progress in this run will be lost.', () => { m.close(); a.onLeaveDungeon(); }, 'Leave')]
      : ['Char Select', () => { m.close(); a.onCharacterSelect(); }],
  ];
  items.forEach(([label, fn, dim], i) => {
    const x = 80 + (i % 2) * 140, y = 48 + Math.floor(i / 2) * 36;
    const b = new Button(scene, x, y, label, fn, { w: 128, h: 28, color: dim ? COLORS.panelLight : COLORS.btn });
    if (dim) b.label.setColor(COLORS.textDim);
    c.add(b);
  });
  if (a.debug) c.add(new Button(scene, 150, 204, 'Debug Panel', () => { m.close(); a.onDebug(); }, { w: 140, h: 22, color: COLORS.danger }));
  return m;
}

// ====================================================================== Debug panel (dev / ?debug=1)
export function openDebugPanel(scene: Phaser.Scene, world: WorldScene) {
  const m = new Modal(scene, 320, 200, 'DEBUG');
  const c = m.content;
  const acts: [string, () => void][] = [
    ['+1 Level', () => GameState.addExp(GameState.expToNext() - GameState.char.exp)],
    ['+5 Levels', () => { for (let i = 0; i < 5; i++) GameState.addExp(GameState.expToNext() - GameState.char.exp); }],
    ['+1000 Gold', () => GameState.addGold(1000)],
    ['+10 Potions', () => { GameState.addItem('hp_potion_s', 10); GameState.addItem('mp_potion_s', 10); }],
    ['Full Heal', () => { GameState.char.hp = GameState.derived.maxHp; GameState.char.mp = GameState.derived.maxMp; Bus.emit(Ev.PLAYER_CHANGED); }],
    ['Kill All', () => world.debugKillAll()],
    ['God Mode', () => { (window as any).__godMode = !(window as any).__godMode; toast(scene, `God mode ${(window as any).__godMode ? 'ON' : 'OFF'}`); }],
    ['Lv Cap Check', () => toast(scene, `Lv cap ${BALANCE.levelCap}, next ${GameState.expToNext()} EXP`)],
  ];
  acts.forEach(([label, fn], i) => {
    c.add(new Button(scene, 84 + (i % 2) * 152, 44 + Math.floor(i / 2) * 34, label, () => { fn(); toast(scene, label); }, { w: 140, h: 26 }));
  });
  return m;
}
