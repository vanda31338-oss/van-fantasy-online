import { PixelCanvas, shade } from './PixelCanvas';

/**
 * Procedural monster sheets: 8 frames in one row.
 * 0-1 idle, 2-3 walk, 4 attack wind-up, 5 attack strike, 6 hurt, 7 dead.
 */
const OUTLINE = '#2b1d33';

interface BlobFrame { sx: number; sy: number; lift: number; lean: number; eyes: 'open' | 'angry' | 'x' | 'closed' }
const BLOB_FRAMES: BlobFrame[] = [
  { sx: 1, sy: 1, lift: 0, lean: 0, eyes: 'open' },
  { sx: 1.07, sy: 0.93, lift: 0, lean: 0, eyes: 'open' },
  { sx: 0.92, sy: 1.1, lift: 2, lean: 0, eyes: 'open' },
  { sx: 1.1, sy: 0.86, lift: 0, lean: 0, eyes: 'closed' },
  { sx: 1.14, sy: 0.8, lift: 0, lean: -1, eyes: 'angry' },
  { sx: 0.9, sy: 1.08, lift: 1, lean: 2, eyes: 'angry' },
  { sx: 1.06, sy: 0.92, lift: 0, lean: -1, eyes: 'x' },
  { sx: 1.25, sy: 0.45, lift: 0, lean: 0, eyes: 'x' },
];

function eyesAt(pc: PixelCanvas, x: number, y: number, kind: BlobFrame['eyes'], big = false, color = '#2a1a2a') {
  const gap = big ? 8 : 4;
  for (const ex of [x - gap / 2, x + gap / 2]) {
    const rx = Math.round(ex);
    if (kind === 'open') {
      pc.rect(rx, y, big ? 2 : 1, big ? 3 : 2, color);
      pc.px(rx, y, '#ffffff');
    } else if (kind === 'closed') {
      pc.hline(rx - 1, rx + (big ? 1 : 0), y + 1, color);
    } else if (kind === 'angry') {
      pc.rect(rx, y, big ? 2 : 1, big ? 3 : 2, color);
      const dir = ex < x ? 1 : -1;
      pc.px(rx - dir, y - 1, color);
      if (big) pc.px(rx - 2 * dir, y - 2, color);
    } else {
      pc.px(rx - 1, y - 1, color); pc.px(rx + 1, y + 1, color); pc.px(rx, y, color);
      pc.px(rx + 1, y - 1, color); pc.px(rx - 1, y + 1, color);
    }
  }
}

function drawSlime(pc: PixelCanvas, fw: number, fh: number, f: BlobFrame, o: {
  color: string; rx: number; ry: number; wings?: boolean; crown?: boolean; moss?: boolean; big?: boolean;
}) {
  const rx = o.rx * f.sx, ry = o.ry * f.sy;
  const ground = fh - 2;
  const cx = fw / 2 + f.lean, cy = ground - ry - f.lift;
  const light = shade(o.color, 0.35), dark = shade(o.color, -0.22);
  if (o.wings && f.sy > 0.6) {
    const wy = cy - ry * 0.3;
    for (const side of [-1, 1]) {
      const wx = cx + side * (rx + 1);
      pc.ellipse(wx, wy - 1, 2.5, 2, '#ffffff', { dark: '#e0e6ff' });
      pc.px(wx + side * 2, wy - 3, '#ffffff');
    }
  }
  pc.ellipse(cx, cy, rx, ry, o.color, { light, dark });
  // flat bottom
  pc.hline(Math.round(cx - rx * 0.8), Math.round(cx + rx * 0.8), ground, dark);
  // gloss
  pc.rect(Math.round(cx - rx * 0.55), Math.round(cy - ry * 0.55), o.big ? 4 : 2, 1, '#ffffff');
  pc.px(Math.round(cx - rx * 0.62), Math.round(cy - ry * 0.35), '#ffffff');
  if (o.moss) {
    const spots = [[-0.5, -0.4], [0.3, -0.6], [0.6, 0.1], [-0.7, 0.3], [0.1, -0.2]];
    for (const [sx, sy] of spots) pc.ellipse(cx + sx * rx, cy + sy * ry, 3, 2, '#4f8a2e', { light: '#6fb040' });
  }
  if (f.sy > 0.6) {
    const ey = Math.round(cy - (o.big ? 3 : 1));
    eyesAt(pc, cx + 1, ey, f.eyes, o.big);
    pc.px(Math.round(cx + 1), ey + (o.big ? 5 : 3), shade(o.color, -0.5));
    if (o.big) {
      // big mouth with teeth
      pc.rect(Math.round(cx - 3), ey + 6, 9, 3, '#5a1a2a');
      pc.px(Math.round(cx - 2), ey + 6, '#ffffff'); pc.px(Math.round(cx + 4), ey + 6, '#ffffff');
    }
    pc.px(Math.round(cx - (o.big ? 6 : 3)), ey + (o.big ? 4 : 2), '#ff7a9a');
    pc.px(Math.round(cx + (o.big ? 8 : 5)), ey + (o.big ? 4 : 2), '#ff7a9a');
  }
  if (o.crown) {
    const top = Math.round(cy - ry) - 1;
    const x0 = Math.round(cx - 6);
    pc.rect(x0, top - 3, 13, 4, '#f2c440');
    pc.hline(x0, x0 + 12, top, '#c08a20');
    for (const i of [0, 3, 6, 9, 12]) { pc.px(x0 + i, top - 4, '#f2c440'); pc.px(x0 + i, top - 5, '#f2c440'); }
    pc.px(x0 + 6, top - 2, '#e83a5a'); pc.px(x0 + 2, top - 2, '#3ac0e8'); pc.px(x0 + 10, top - 2, '#3ac0e8');
    // little flower
    pc.px(x0 + 14, top + 1, '#ff8ac8'); pc.px(x0 + 15, top, '#ff8ac8'); pc.px(x0 + 16, top + 1, '#ff8ac8'); pc.px(x0 + 15, top + 1, '#fff07a');
  }
}

function drawSproutcap(pc: PixelCanvas, i: number) {
  const f = BLOB_FRAMES[i];
  const ground = 22;
  const lift = f.lift, lean = f.lean;
  const dead = i === 7;
  if (dead) {
    pc.ellipse(12, 19, 9, 3.5, '#e0503a', { dark: '#b03a2a' });
    pc.px(9, 18, '#ffffff'); pc.px(14, 19, '#ffffff');
    return;
  }
  // feet
  const step = i === 2 ? 1 : i === 3 ? -1 : 0;
  pc.rect(9 + step, ground - 1, 2, 2, '#c8a87a');
  pc.rect(13 - step, ground - 1, 2, 2, '#c8a87a');
  // stem
  const sy = ground - 8 - lift;
  pc.rect(8 + Math.round(lean / 2), sy, 8, 8, '#f4e8cc');
  pc.rect(8 + Math.round(lean / 2), sy, 2, 8, '#dccaa4');
  eyesAt(pc, 12.5 + lean / 2, sy + 4, f.eyes);
  pc.px(9 + Math.round(lean / 2), sy + 6, '#ff9aa8'); pc.px(15 + Math.round(lean / 2), sy + 6, '#ff9aa8');
  // cap
  const capY = sy - 3 + (i === 4 ? 1 : 0);
  pc.ellipse(12 + lean, capY, 9.5 * f.sx, 5.5 * f.sy, '#e8543a', { light: '#ff8a64', dark: '#b83a2a' });
  pc.hline(4 + lean, 20 + lean, capY + 3, '#b83a2a');
  for (const [dx, dy] of [[-5, -2], [0, -3], [4, -1], [-2, 0], [6, 1]]) {
    pc.px(12 + lean + dx, capY + dy, '#ffffff');
    pc.px(12 + lean + dx + 1, capY + dy, '#fff0e0');
  }
  // sprout
  pc.px(12 + lean, capY - 6, '#5ab040'); pc.px(13 + lean, capY - 7, '#7ad050'); pc.px(11 + lean, capY - 7, '#7ad050');
}

function drawWolf(pc: PixelCanvas, i: number) {
  const fur = '#8aa88a', furDark = '#5f7d64', belly = '#d8e4c8';
  if (i === 7) {
    pc.ellipse(16, 19, 11, 3.5, fur, { dark: furDark });
    pc.ellipse(26, 18, 4, 3, fur, { dark: furDark });
    pc.px(27, 17, '#2a1a2a');
    return;
  }
  const lunge = i === 5 ? 3 : i === 4 ? -2 : i === 6 ? -2 : 0;
  const bob = i === 1 || i === 3 ? 1 : 0;
  // tail
  const tailUp = i === 4 ? -2 : i % 2 ? 1 : 0;
  pc.line(7 + lunge, 13 + bob, 3 + lunge, 8 + tailUp, furDark, 2);
  pc.px(2 + lunge, 7 + tailUp, belly);
  // legs (phase)
  const ph = i === 2 ? 1 : i === 3 ? -1 : 0;
  const legs: [number, number][] = [[9, ph], [12, -ph], [17, -ph], [20, ph]];
  legs.forEach(([x, o], k) => {
    pc.rect(x + lunge + o, 18, 2, 4, k % 2 ? furDark : fur);
    pc.rect(x + lunge + o, 21, 3, 1, '#4a4a4a');
  });
  // body
  pc.ellipse(15 + lunge, 14 + bob, 8.5, 5, fur, { light: '#a8c4a4', dark: furDark });
  pc.hline(11 + lunge, 19 + lunge, 18 + bob, belly);
  // mane tuft
  pc.px(19 + lunge, 9 + bob, '#5aa060'); pc.px(17 + lunge, 9 + bob, '#5aa060');
  // head
  const hy = 10 + bob + (i === 5 ? 1 : 0);
  pc.ellipse(23 + lunge, hy, 4.5, 4, fur, { light: '#a8c4a4', dark: furDark });
  pc.rect(25 + lunge, hy + 1, 4, 2, fur);
  pc.px(29 + lunge, hy + 1, '#2a1a2a');
  // ears
  pc.px(20 + lunge, hy - 5, fur); pc.px(20 + lunge, hy - 4, fur); pc.px(21 + lunge, hy - 4, fur);
  pc.px(23 + lunge, hy - 5, fur); pc.px(23 + lunge, hy - 4, fur); pc.px(24 + lunge, hy - 4, fur);
  pc.px(20 + lunge, hy - 4, '#ff9aa8');
  // eye
  if (i === 6) { pc.px(24 + lunge, hy - 1, '#2a1a2a'); pc.px(25 + lunge, hy, '#2a1a2a'); }
  else { pc.rect(24 + lunge, hy - 1, 1, 2, '#2a1a2a'); pc.px(25 + lunge, hy - 1, i >= 4 ? '#ff4a4a' : '#ffffff'); }
  if (i === 5) { pc.hline(25 + lunge, 28 + lunge, hy + 3, '#5a1a2a'); pc.px(26 + lunge, hy + 3, '#ffffff'); }
}

function drawBramble(pc: PixelCanvas, i: number) {
  const f = BLOB_FRAMES[i];
  if (i === 7) {
    pc.ellipse(12, 20, 8, 3, '#4a8a3a', { dark: '#2f6a2a' });
    pc.px(8, 18, '#3a6a2a'); pc.px(15, 18, '#3a6a2a');
    return;
  }
  const ground = 22;
  const cx = 12 + f.lean, ry = 6 * f.sy, rx = 6.5 * f.sx;
  const cy = ground - 2 - ry - f.lift;
  // root feet
  const step = i === 2 ? 1 : i === 3 ? -1 : 0;
  pc.line(cx - 3, cy + ry, cx - 4 + step, ground, '#7a5a3a');
  pc.line(cx + 3, cy + ry, cx + 4 - step, ground, '#7a5a3a');
  // thorns
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + 0.3;
    pc.px(cx + Math.cos(ang) * (rx + 1.5), cy + Math.sin(ang) * (ry + 1.5), '#c8d880');
  }
  pc.ellipse(cx, cy, rx, ry, '#4caa4a', { light: '#7ad06a', dark: '#2f7a34' });
  // leaves on top
  pc.ellipse(cx - 3, cy - ry - 1, 3, 1.5, '#7ad06a', { dark: '#4caa4a' });
  pc.ellipse(cx + 3, cy - ry - 2, 3, 1.5, '#8ae07a', { dark: '#4caa4a' });
  pc.px(cx + 1, cy - ry - 4, '#ff6a8a');
  eyesAt(pc, cx + 1, Math.round(cy - 1), f.eyes === 'open' ? 'angry' : f.eyes, false, '#8a1a1a');
  pc.hline(Math.round(cx - 1), Math.round(cx + 2), Math.round(cy + 3), '#1f4a24');
}

export function generateMonsterSheet(kind: string, fw: number, fh: number): HTMLCanvasElement {
  const pc = new PixelCanvas(fw * 8, fh);
  for (let i = 0; i < 8; i++) {
    pc.frame(i * fw, 0, fw, fh);
    switch (kind) {
      case 'puffjelly':
        drawSlime(pc, fw, fh, BLOB_FRAMES[i], { color: '#ff9ccc', rx: 8, ry: 6.5, wings: true });
        break;
      case 'gobbleglob':
        drawSlime(pc, fw, fh, BLOB_FRAMES[i], { color: '#7ec850', rx: 24, ry: 18, crown: true, moss: true, big: true });
        break;
      case 'sproutcap':
        drawSproutcap(pc, i);
        break;
      case 'greenfang':
        drawWolf(pc, i);
        break;
      case 'bramble':
        drawBramble(pc, i);
        break;
      default:
        drawSlime(pc, fw, fh, BLOB_FRAMES[i], { color: '#aaaaaa', rx: 8, ry: 6 });
    }
    pc.outline(OUTLINE);
  }
  return pc.commit();
}
