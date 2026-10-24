import Phaser from 'phaser';
import { BASE_CLASSES, CLASSES, type BaseClassId } from '../data/classes';
import { AudioManager } from '../core/AudioManager';
import { GameState } from '../core/GameState';
import { SaveManager, newCharacter, validateName } from '../core/SaveManager';
import { animKey } from '../gfx/AssetLoader';
import { COLORS, drawPanel, txt } from '../ui/theme';
import { Button, toast } from '../ui/widgets';
import { coverBackground } from './TitleScene';
import { styleInput } from './CharSelectScene';

export class CharCreateScene extends Phaser.Scene {
  private slot = 0;
  private picked: BaseClassId = 'swordsman';
  private name = '';

  constructor() {
    super('CharCreate');
  }

  init(data: { slot: number; picked?: BaseClassId; name?: string }) {
    this.slot = data.slot ?? 0;
    this.picked = data.picked ?? 'swordsman';
    this.name = data.name ?? '';
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    coverBackground(this, 0.65);
    txt(this, W / 2, 10, 'CREATE CHARACTER', 16, { color: COLORS.textGold, stroke: '#1a1030', strokeThickness: 4 }).setOrigin(0.5, 0);

    txt(this, W / 2 - 150, 42, 'Name', 8, { color: COLORS.text });
    const input = this.add.dom(W / 2 + 20, 46, 'input');
    const el = input.node as HTMLInputElement;
    styleInput(el, 200);
    el.placeholder = '3-12 letters/numbers';
    el.value = this.name;
    const err = txt(this, W / 2 + 20, 62, '', 8, { font: 'body', color: COLORS.textRed }).setOrigin(0.5, 0);
    el.addEventListener('input', () => {
      el.value = el.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
      this.name = el.value;
      err.setText('');
    });

    const gap = 10;
    const cw = Math.min(196, Math.floor((W - 30 - gap * 2) / 3)), chh = 222;
    const x0 = Math.round((W - (cw * 3 + gap * 2)) / 2), y0 = 78;
    BASE_CLASSES.forEach((id, i) => {
      const cls = CLASSES[id];
      const x = x0 + i * (cw + gap), cx = x + cw / 2;
      const sel = this.picked === id;
      const g = this.add.graphics();
      drawPanel(g, x, y0, cw, chh, { fill: sel ? 0x3a3270 : COLORS.panel, gold: sel });
      this.add.image(cx, y0 + 70, 'shadow').setScale(2);
      const spr = this.add.sprite(cx, y0 + 70, cls.sprite, 0).setOrigin(0.5, 0.94).setScale(2);
      spr.play(animKey(cls.sprite, sel ? 'walk' : 'idle'));
      if (!cls.available) spr.setAlpha(0.55);
      txt(this, cx, y0 + 78, cls.name, 8, { color: sel ? COLORS.textGold : COLORS.text }).setOrigin(0.5, 0);
      txt(this, cx, y0 + 92, cls.role, 8, { font: 'body', color: COLORS.textBlue }).setOrigin(0.5, 0);
      txt(this, x + 10, y0 + 108, cls.description, 8, { font: 'body', wrap: cw - 20, color: COLORS.text });
      txt(this, x + 10, y0 + 170, 'Recommended stats', 8, { font: 'body', color: COLORS.textDim });
      txt(this, x + 10, y0 + 182, cls.recommended, 8, { color: COLORS.textGreen });
      if (!cls.available) {
        const rib = this.add.graphics();
        rib.fillStyle(0xb83a4a, 0.95).fillRect(x + 4, y0 + 20, cw - 8, 16);
        txt(this, cx, y0 + 24, 'Coming in M2', 8, { color: '#ffffff' }).setOrigin(0.5, 0);
      }
      const z = this.add.zone(x, y0, cw, chh).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        AudioManager.sfx('ui_click');
        if (!cls.available) {
          toast(this, `${cls.name} arrives in the next update!`, COLORS.textGold);
          return;
        }
        this.scene.restart({ slot: this.slot, picked: id, name: el.value });
      });
    });
    txt(this, W / 2, y0 + chh + 4, 'Class choice is permanent.', 8, { font: 'body', color: COLORS.textDim }).setOrigin(0.5, 0);

    new Button(this, 60, H - 20, 'Back', () => this.scene.start('CharSelect', { selected: this.slot }), { w: 90, h: 26, color: COLORS.panelLight });
    new Button(this, W - 80, H - 20, 'Create', () => {
      const name = el.value.trim();
      const e = validateName(name);
      if (e) {
        err.setText(e);
        AudioManager.sfx('refine_fail');
        return;
      }
      const c = newCharacter(name, this.picked);
      SaveManager.saveCharacter(this.slot, c);
      AudioManager.sfx('level_up');
      GameState.start(this.slot);
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Town'));
    }, { w: 130, h: 26, color: COLORS.good });
  }
}
