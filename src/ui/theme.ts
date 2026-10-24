import Phaser from 'phaser';

export const FONT = '"Press Start 2P", monospace';
export const FONT_BODY = '"Pixelify Sans", "Press Start 2P", sans-serif';

export const COLORS = {
  panel: 0x1d1838,
  panelInner: 0x2a2450,
  panelLight: 0x3a3266,
  border: 0x0f0b1e,
  gold: 0xe8c050,
  goldDark: 0x9a7a2a,
  text: '#fff4d8',
  textDim: '#b8b0d0',
  textGold: '#ffd76a',
  textRed: '#ff6a6a',
  textGreen: '#7ee07e',
  textBlue: '#7ab8ff',
  hp: 0xe8455a,
  hpDark: 0x7a1a2a,
  mp: 0x4a7cf0,
  mpDark: 0x1a2a7a,
  exp: 0xffd040,
  btn: 0x4a3a8a,
  btnLight: 0x6a5ab0,
  btnDisabled: 0x3a3848,
  danger: 0xb83a4a,
  good: 0x3a9a5a,
};

export interface TextOpts {
  color?: string;
  stroke?: string;
  strokeThickness?: number;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  font?: 'title' | 'body';
  lineSpacing?: number;
}

/** Pixel text helper. Sizes should be multiples of 8 for Press Start 2P, 8/16/24 for body font. */
export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 8, o: TextOpts = {}) {
  // The body font has a smaller x-height; size 8 maps to a readable 12px.
  const px = o.font === 'body' && size <= 8 ? 12 : size;
  const t = scene.add.text(x, y, s, {
    fontFamily: o.font === 'body' ? FONT_BODY : FONT,
    fontSize: `${px}px`,
    color: o.color ?? COLORS.text,
    stroke: o.stroke ?? '#1a1030',
    strokeThickness: o.strokeThickness ?? 0,
    align: o.align ?? 'left',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing ?? 2,
  });
  t.setResolution(1);
  return t;
}

/** Draw a fantasy-style framed panel. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, opts: { fill?: number; alpha?: number; gold?: boolean } = {}) {
  const fill = opts.fill ?? COLORS.panel;
  g.fillStyle(COLORS.border, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle(opts.gold === false ? 0x5a4a8a : COLORS.gold, 1);
  g.fillRect(x + 2, y + 1, w - 4, h - 2);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillStyle(COLORS.border, 1);
  g.fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(fill, opts.alpha ?? 0.96);
  g.fillRect(x + 4, y + 4, w - 8, h - 8);
  g.fillStyle(0xffffff, 0.06);
  g.fillRect(x + 4, y + 4, w - 8, 2);
  if (opts.gold !== false) {
    // corner studs
    g.fillStyle(0xfff0a0, 1);
    for (const [cx, cy] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) g.fillRect(cx, cy, 2, 2);
  }
}

export function drawButtonBg(g: Phaser.GameObjects.Graphics, w: number, h: number, color: number, pressed = false) {
  g.clear();
  const x = -w / 2, y = -h / 2;
  g.fillStyle(COLORS.border, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(25).color, 1);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(color, 1);
  g.fillRect(x + 2, y + 2 + (pressed ? 2 : 0), w - 4, h - 6);
  g.fillStyle(0xffffff, pressed ? 0.05 : 0.18);
  g.fillRect(x + 3, y + 3 + (pressed ? 2 : 0), w - 6, 2);
}
