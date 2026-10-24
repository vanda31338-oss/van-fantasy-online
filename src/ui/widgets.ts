import Phaser from 'phaser';
import { AudioManager } from '../core/AudioManager';
import { COLORS, drawButtonBg, drawPanel, txt } from './theme';

export interface ButtonOpts {
  w?: number;
  h?: number;
  color?: number;
  size?: number;
  icon?: string;
  disabled?: boolean;
  sfx?: boolean;
}

/** Rectangular pixel button. Position is its centre. */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private color: number;
  private _disabled = false;
  readonly bw: number;
  readonly bh: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, o: ButtonOpts = {}) {
    super(scene, x, y);
    this.bw = o.w ?? Math.max(60, text.length * (o.size ?? 8) + 20);
    this.bh = o.h ?? 26;
    this.color = o.color ?? COLORS.btn;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    let tx = 0;
    if (o.icon) {
      this.icon = scene.add.image(-this.bw / 2 + 12, 0, o.icon);
      this.add(this.icon);
      tx = 8;
    }
    this.label = txt(scene, tx, 0, text, o.size ?? 8, { align: 'center' }).setOrigin(0.5, 0.5);
    this.add(this.label);
    this.setSize(this.bw, this.bh);
    this.setInteractive({ useHandCursor: true });
    let down = false;
    this.on('pointerdown', () => {
      if (this._disabled) return;
      down = true;
      this.redraw(true);
    });
    this.on('pointerout', () => {
      down = false;
      this.redraw(false);
    });
    this.on('pointerup', () => {
      if (!down || this._disabled) return;
      down = false;
      this.redraw(false);
      if (o.sfx !== false) AudioManager.sfx('ui_click');
      onClick();
    });
    this.setDisabled(!!o.disabled);
    scene.add.existing(this);
  }

  private redraw(pressed: boolean) {
    drawButtonBg(this.bg, this.bw, this.bh, this._disabled ? COLORS.btnDisabled : this.color, pressed);
    this.label.setY(pressed ? 1 : 0);
    this.label.setColor(this._disabled ? '#8a8698' : COLORS.text);
  }

  setDisabled(d: boolean) {
    this._disabled = d;
    this.redraw(false);
    return this;
  }

  setText(s: string) {
    this.label.setText(s);
    return this;
  }

  setColor(c: number) {
    this.color = c;
    this.redraw(false);
    return this;
  }
}

/** A dimmed full-screen overlay with a framed panel. Blocks input below it. */
export class Modal extends Phaser.GameObjects.Container {
  readonly panel: Phaser.GameObjects.Graphics;
  readonly content: Phaser.GameObjects.Container;
  readonly pw: number;
  readonly ph: number;
  private onCloseCb?: () => void;

  constructor(scene: Phaser.Scene, w: number, h: number, title?: string, opts: { closable?: boolean; dim?: number } = {}) {
    super(scene, 0, 0);
    const W = scene.scale.width, H = scene.scale.height;
    const dim = scene.add.rectangle(0, 0, W, H, 0x000000, opts.dim ?? 0.55).setOrigin(0).setInteractive();
    this.add(dim);
    this.pw = w;
    this.ph = h;
    const px = Math.round((W - w) / 2), py = Math.round((H - h) / 2);
    this.panel = scene.add.graphics();
    drawPanel(this.panel, px, py, w, h);
    this.add(this.panel);
    // swallow taps on the panel itself
    this.add(scene.add.zone(px, py, w, h).setOrigin(0).setInteractive());
    if (title) {
      const t = txt(scene, W / 2, py + 10, title, 8, { color: COLORS.textGold }).setOrigin(0.5, 0);
      this.add(t);
    }
    this.content = scene.add.container(px, py);
    this.add(this.content);
    if (opts.closable !== false) {
      const close = new Button(scene, px + w - 16, py + 14, 'X', () => this.close(), { w: 22, h: 20, color: COLORS.danger });
      this.add(close);
    }
    this.setDepth(1000);
    this.setName('modal');
    scene.add.existing(this);
  }

  onClose(cb: () => void) {
    this.onCloseCb = cb;
    return this;
  }

  close() {
    this.onCloseCb?.();
    this.destroy();
  }
}

export function toast(scene: Phaser.Scene, message: string, color: string = COLORS.text, y = 70) {
  const W = scene.scale.width;
  const t = txt(scene, W / 2, y, message, 8, { color, stroke: '#1a1030', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setDepth(2000);
  scene.tweens.add({ targets: t, y: y - 14, alpha: { from: 1, to: 0 }, delay: 1300, duration: 600, onComplete: () => t.destroy() });
  return t;
}

/** Simple confirm dialog. */
export function confirmDialog(scene: Phaser.Scene, title: string, message: string, onYes: () => void, yesLabel = 'Yes') {
  const m = new Modal(scene, 280, 120, title, { closable: false });
  m.content.add(txt(scene, 140, 34, message, 8, { align: 'center', wrap: 250, font: 'body' }).setOrigin(0.5, 0));
  m.content.add(new Button(scene, 80, 96, 'Cancel', () => m.close(), { w: 90 }));
  m.content.add(new Button(scene, 200, 96, yesLabel, () => { m.close(); onYes(); }, { w: 90, color: COLORS.danger }));
  return m;
}
