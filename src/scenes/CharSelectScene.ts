import Phaser from 'phaser';
import { CLASSES } from '../data/classes';
import { AudioManager } from '../core/AudioManager';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { animKey } from '../gfx/AssetLoader';
import { COLORS, drawPanel, txt } from '../ui/theme';
import { Button, Modal, toast } from '../ui/widgets';
import { restartOnResize } from '../ui/resize';
import { coverBackground } from './TitleScene';
import { openSettingsPanel } from '../ui/panels';

export class CharSelectScene extends Phaser.Scene {
  private selected = 0;

  constructor() {
    super('CharSelect');
  }

  init(data: { selected?: number }) {
    if (data?.selected !== undefined) this.selected = data.selected;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    coverBackground(this, 0.6);
    AudioManager.playMusic('bgm_title');
    txt(this, W / 2, 14, 'SELECT CHARACTER', 16, { color: COLORS.textGold, stroke: '#1a1030', strokeThickness: 4 }).setOrigin(0.5, 0);

    const slots = SaveManager.file.slots;
    const gap = 12;
    const cw = Math.min(180, Math.floor((W - 40 - gap * 2) / 3)), ch = 220;
    const total = cw * 3 + gap * 2;
    const x0 = Math.round((W - total) / 2), y0 = 44;
    const cards: Phaser.GameObjects.Graphics[] = [];
    const drawCard = (i: number) => {
      const g = cards[i];
      g.clear();
      const x = x0 + i * (cw + gap);
      drawPanel(g, x, y0, cw, ch, { fill: i === this.selected ? 0x3a3270 : COLORS.panel, gold: i === this.selected });
    };
    slots.forEach((c, i) => {
      const x = x0 + i * (cw + gap), cx = x + cw / 2;
      const g = this.add.graphics();
      cards.push(g);
      drawCard(i);
      txt(this, cx, y0 + 12, `SLOT ${i + 1}`, 8, { color: COLORS.textDim }).setOrigin(0.5, 0);
      if (c) {
        const cls = CLASSES[c.classId];
        this.add.image(cx, y0 + 112, 'shadow').setScale(2);
        const spr = this.add.sprite(cx, y0 + 112, cls.sprite, 0).setOrigin(0.5, 0.94).setScale(3);
        spr.play(animKey(cls.sprite, i === this.selected ? 'walk' : 'idle'));
        txt(this, cx, y0 + 128, c.name, 8, { color: COLORS.text }).setOrigin(0.5, 0);
        txt(this, cx, y0 + 144, cls.name, 8, { font: 'body', color: COLORS.textBlue }).setOrigin(0.5, 0);
        txt(this, cx, y0 + 160, `Level ${c.level}`, 8, { color: COLORS.textGold }).setOrigin(0.5, 0);
        const hrs = Math.floor(c.playTimeSec / 3600), mins = Math.floor((c.playTimeSec % 3600) / 60);
        txt(this, cx, y0 + 178, `Played ${hrs}h ${mins}m`, 8, { font: 'body', color: COLORS.textDim }).setOrigin(0.5, 0);
      } else {
        txt(this, cx, y0 + 80, 'Empty Slot', 8, { color: COLORS.textDim }).setOrigin(0.5, 0);
        txt(this, cx, y0 + 112, '+', 32, { color: COLORS.textGold }).setOrigin(0.5);
        txt(this, cx, y0 + 150, 'Tap to create', 8, { font: 'body', color: COLORS.textDim }).setOrigin(0.5, 0);
      }
      const z = this.add.zone(x, y0, cw, ch).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        AudioManager.sfx('ui_click');
        if (this.selected === i) {
          if (c) this.enter(i);
          else this.scene.start('CharCreate', { slot: i });
          return;
        }
        this.selected = i;
        this.scene.restart({ selected: i });
      });
    });

    const by = H - 26;
    const sel = slots[this.selected];
    new Button(this, 60, by, 'Back', () => this.scene.start('Title'), { w: 90, h: 28, color: COLORS.panelLight });
    new Button(this, 160, by, 'Settings', () => openSettingsPanel(this), { w: 100, h: 28, color: COLORS.panelLight });
    if (sel) {
      new Button(this, W - 230, by, 'Delete', () => this.confirmDelete(this.selected), { w: 90, h: 28, color: COLORS.danger });
      new Button(this, W - 90, by, 'Enter World', () => this.enter(this.selected), { w: 150, h: 28, color: COLORS.good });
    } else {
      new Button(this, W - 90, by, 'Create', () => this.scene.start('CharCreate', { slot: this.selected }), { w: 150, h: 28, color: COLORS.good });
    }
    restartOnResize(this, () => ({ selected: this.selected }));
  }

  private enter(slot: number) {
    AudioManager.unlock();
    GameState.start(slot);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Town'));
  }

  private confirmDelete(slot: number) {
    const c = SaveManager.file.slots[slot];
    if (!c) return;
    const m = new Modal(this, 300, 150, 'DELETE CHARACTER');
    m.content.add(txt(this, 150, 30, `Type "${c.name}" to confirm.\nThis cannot be undone!`, 8, { font: 'body', align: 'center', color: COLORS.textRed }).setOrigin(0.5, 0));
    const W = this.scale.width, H = this.scale.height;
    const input = this.add.dom(W / 2, H / 2 + 4, 'input').setDepth(1100);
    const el = input.node as HTMLInputElement;
    styleInput(el, 160);
    el.placeholder = c.name;
    const del = new Button(this, 150, 126, 'Delete forever', () => {
      if (el.value !== c.name) {
        toast(this, 'Name does not match', COLORS.textRed);
        return;
      }
      SaveManager.deleteCharacter(slot);
      m.close();
      toast(this, `${c.name} was deleted`);
      this.scene.restart({ selected: slot });
    }, { w: 150, h: 26, color: COLORS.danger, disabled: true });
    el.addEventListener('input', () => del.setDisabled(el.value !== c.name));
    m.content.add(del);
    m.onClose(() => input.destroy());
  }
}

export function styleInput(el: HTMLInputElement, width: number) {
  el.type = 'text';
  el.maxLength = 12;
  el.autocomplete = 'off';
  el.spellcheck = false;
  el.setAttribute('autocapitalize', 'off');
  el.setAttribute('autocorrect', 'off');
  Object.assign(el.style, {
    width: `${width}px`,
    height: '24px',
    fontFamily: '"Pixelify Sans", monospace',
    fontSize: '16px',
    color: '#fff4d8',
    background: '#0f0b1e',
    border: '2px solid #e8c050',
    borderRadius: '2px',
    padding: '0 6px',
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>);
}
