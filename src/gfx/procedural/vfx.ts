import { PixelCanvas, rng, shade } from './PixelCanvas';

/** Procedural placeholder VFX sprite sheets (frames in one row). */
export function generateVfxSheet(proc: string, fw: number, fh: number, frames: number): HTMLCanvasElement {
  const pc = new PixelCanvas(fw * frames, fh);
  const [kind, arg] = proc.split(':');
  const color = arg ?? '#ffffff';
  const cx = fw / 2, cy = fh / 2;
  for (let f = 0; f < frames; f++) {
    pc.frame(f * fw, 0, fw, fh);
    const t = frames > 1 ? f / (frames - 1) : 0;
    switch (kind) {
      case 'slash':
      case 'slash_heavy':
      case 'slash_wide': {
        const wide = kind === 'slash_wide';
        const heavy = kind === 'slash_heavy';
        const r = wide ? 30 : heavy ? 25 : 18;
        const thick = wide ? 6 : heavy ? 8 : 5;
        const span = wide ? 170 : 150;
        const start = -span / 2 - 10;
        const head = start + span * Math.min(1, (f + 1) / (frames - 1));
        const tail = start + span * Math.max(0, (f - 1) / (frames - 1));
        const fade = f === frames - 1 ? 0.45 : 1;
        for (let a = tail; a <= head; a += 1.5) {
          const rad = (a * Math.PI) / 180;
          const k = (a - tail) / Math.max(1, head - tail);
          const th = Math.max(1, Math.round(thick * k));
          for (let d = 0; d < th; d++) {
            const rr = r - d;
            const c = d <= 1 ? '#ffffff' : d <= 3 ? (heavy ? '#fff0a0' : '#d8f0ff') : heavy ? '#ffc040' : '#8ac8ff';
            pc.px(cx - 6 + Math.cos(rad) * rr, cy + Math.sin(rad) * rr, c, Math.round(255 * fade * (0.4 + 0.6 * k)));
          }
        }
        break;
      }
      case 'spark':
      case 'spark_big': {
        const big = kind === 'spark_big';
        const rays = big ? 8 : 4;
        const len = Math.round((big ? 16 : 9) * Math.sin(Math.PI * (0.25 + t * 0.75)));
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2 + (big ? 0.2 : 0.78);
          for (let d = 1; d <= len; d++) pc.px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, d < len / 2 ? '#ffffff' : '#ffe08a');
        }
        if (t < 0.7) pc.ellipse(cx, cy, 2.5 - t * 2, 2.5 - t * 2, '#ffffff');
        break;
      }
      case 'burst_fire': {
        const r = 3 + t * 11;
        pc.ellipse(cx, cy, r, r, '#ff7a2a', { alpha: Math.round(255 * (1 - t * 0.6)) });
        pc.ellipse(cx, cy, r * 0.6, r * 0.6, '#ffd040', { alpha: Math.round(255 * (1 - t)) });
        if (t < 0.5) pc.ellipse(cx, cy, r * 0.3, r * 0.3, '#ffffff');
        break;
      }
      case 'orb': {
        const r = 3.5 + (f % 2) * 0.8;
        pc.ellipse(cx, cy, r + 2, r + 2, color, { alpha: 90 });
        pc.ellipse(cx, cy, r, r, color, { light: '#ffffff' });
        pc.px(cx - 1, cy - 1, '#ffffff');
        pc.px(cx - 6 + f, cy + 2, color, 160);
        break;
      }
      case 'claw': {
        const n = Math.min(3, f + 1);
        for (let i = 0; i < n; i++) {
          const o = (i - 1) * 5;
          pc.line(cx - 6 + o, cy - 7, cx + 4 + o, cy + 7, f === frames - 1 ? '#ff8a8a' : '#ffffff');
        }
        break;
      }
      case 'pillar': {
        const w = Math.round(4 + 16 * Math.sin(Math.PI * t));
        const alpha = Math.round(220 * (1 - t * 0.5));
        pc.rect(cx - w / 2, 0, w, fh - 6, '#fff3a0', alpha);
        pc.rect(cx - w / 4, 0, w / 2, fh - 6, '#ffffff', alpha);
        pc.ellipseOutline(cx, fh - 8, 8 + t * 16, 3 + t * 5, '#ffe060', 255, 2);
        const r = rng(f + 7);
        for (let i = 0; i < 8; i++) pc.px(r() * fw, fh * (1 - t) * r() + 4, '#ffffff');
        break;
      }
      case 'ring': {
        pc.ellipseOutline(cx, cy + 6, 6 + t * 16, 3 + t * 7, color, Math.round(255 * (1 - t * 0.7)), 2);
        const r = rng(f + 3);
        for (let i = 0; i < 5; i++) pc.px(cx + (r() - 0.5) * 30, cy + 6 - t * 18 - r() * 8, shade(color, 0.4));
        break;
      }
      case 'sparkle': {
        const r = rng(13);
        for (let i = 0; i < 6; i++) {
          const x = 6 + r() * (fw - 12), y0 = fh - 6 - r() * 10;
          const y = y0 - t * 22 - i;
          const s = (i + f) % 3 === 0 ? 2 : 1;
          pc.px(x, y, '#ffffff');
          if (s > 1) { pc.px(x - 1, y, color); pc.px(x + 1, y, color); pc.px(x, y - 1, color); pc.px(x, y + 1, color); }
        }
        pc.ellipseOutline(cx, fh - 6, 6 + t * 8, 2 + t * 3, color, Math.round(200 * (1 - t)));
        break;
      }
      case 'poof': {
        const r = rng(21);
        for (let i = 0; i < 5; i++) {
          const a = r() * Math.PI * 2;
          const d = 2 + t * 9;
          const rad = 3 + (1 - t) * 3;
          pc.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, rad, rad, '#f0ecf4', { dark: '#c8c0d4', alpha: Math.round(255 * (1 - t * 0.8)) });
        }
        break;
      }
      case 'shockwave': {
        pc.ellipseOutline(cx, cy, 6 + t * 26, 3 + t * 14, '#e0c890', Math.round(255 * (1 - t * 0.6)), 3);
        const r = rng(f + 11);
        for (let i = 0; i < 6; i++) pc.rect(cx + (r() - 0.5) * 50 * t, cy - 4 - r() * 10 * (1 - t), 2, 2, '#8a6a3a');
        break;
      }
      case 'swirl': {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + f * 0.6;
          const d = 4 + i * 0.9;
          pc.px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, i % 2 ? '#c8a0ff' : '#ffffff');
        }
        break;
      }
      default:
        pc.ellipse(cx, cy, 4, 4, '#ff00ff');
    }
  }
  return pc.commit();
}
