// Draw prop pixel maps with tiny raster commands -> {pal, rows} JSON (the format cards use). node tools/mkmaps.mjs out.json [ops.json]
import fs from 'fs';
import { grid } from './pixgrid.mjs';
const O = '#0b0a12';
const maps = {}; const specs = {};
// 100-baht note: red, ornamental border, lotus emblem (no portrait), big 100
{ const p = grid(28, 15); p.rect(1, 1, 26, 13, '#b52b35'); p.rect(2, 2, 24, 11, '#e0533f'); p.rect(2, 2, 24, 1, '#ff8a4c'); for (let x = 3; x < 25; x += 2) { p.px(x, 3, '#b52b35'); p.px(x + 1, 11, '#b52b35'); }
  p.circle(8, 7, 3, '#ffc14a'); p.circle(8, 7, 2, '#ff8a4c'); p.px(8, 4, '#ffe66b'); p.px(6, 6, '#ffe66b'); p.px(10, 6, '#ffe66b'); p.px(8, 7, '#ffe66b');
  const D = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 0: ['###', '#.#', '#.#', '#.#', '###'] }; let dx = 14; for (const d of '100') { D[d].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') p.px(dx + x, 5 + y, '#fff6c2'); })); dx += 4; }
  p.rect(13, 10, 12, 1, '#7d1c2b'); p.rect(25, 2, 1, 11, '#7d1c2b'); p.outline(O); maps.note100 = p.out(); specs.note100 = p.spec(); }
// rice sack + five eggs
{ const p = grid(30, 20); p.rect(2, 5, 13, 14, '#f2efe6'); p.rect(3, 3, 11, 3, '#f2efe6'); p.rect(5, 1, 7, 3, '#d8d2c4'); p.rect(6, 2, 5, 1, '#b52b35'); p.rect(11, 5, 4, 14, '#d8d2c4'); for (let y = 7; y < 18; y += 2) p.rect(3, y, 8, 1, '#e8e2d4');
  p.rect(4, 9, 8, 5, '#2253a3'); p.rect(5, 10, 6, 3, '#3e8de0'); p.px(6, 11, '#ffe66b'); p.px(8, 11, '#ffe66b'); p.px(10, 11, '#ffe66b'); p.rect(3, 18, 12, 1, '#b5b0a5');
  p.rect(16, 13, 14, 6, '#b8773f'); p.rect(16, 13, 14, 1, '#d9a35b'); for (let k = 0; k < 5; k++) { const ex = 17 + (k % 3) * 4 + (k > 2 ? 2 : 0), ey = k > 2 ? 9 : 11; p.ellipse(ex + 1, ey, 2, 2, '#f2d38a'); p.px(ex, ey - 1, '#fff6c2'); p.px(ex + 2, ey + 1, '#d9a35b'); }
  p.outline(O); maps.riceegg = p.out(); specs.riceegg = p.spec(); }
// the same sack soaked: darker, sagging, drips
{ const p = grid(18, 22); p.rect(2, 7, 13, 13, '#b5b0a5'); p.rect(3, 5, 11, 3, '#b5b0a5'); p.rect(5, 3, 7, 3, '#8c8a86'); p.rect(11, 7, 4, 13, '#8c8a86'); p.rect(4, 10, 8, 5, '#183057'); p.rect(5, 11, 6, 3, '#2253a3'); p.rect(3, 15, 11, 5, '#7a7fa3');
  for (const [x, y] of [[4, 20], [9, 21], [13, 20]]) { p.px(x, y, '#8fd3ff'); } p.rect(1, 20, 16, 1, '#3e8de0'); p.outline(O); maps.ricewet = p.out(); specs.ricewet = p.spec(); }
// bunch of morning glory tied with a red rubber band
{ const p = grid(20, 18); for (let k = 0; k < 7; k++) p.line(9 + (k - 3) * 0.4, 17, 4 + k * 2, 5 + (k % 3), '#7cbf3f');
  for (let k = 0; k < 9; k++) { const x = 2 + k * 2, y = 2 + ((k * 7) % 5); const c = ['#3f7a2e', '#7cbf3f', '#2e5a23'][k % 3]; p.rect(x - 1, y, 4, 2, c); p.px(x, y - 1, c); p.px(x + 1, y - 2, c); p.px(x - 2, y + 2, c); p.px(x + 3, y + 2, c); p.px(x, y, '#c3e66b'); }
  p.rect(7, 12, 5, 2, '#e0533f'); p.px(7, 12, '#ff8a4c'); p.outline(O); maps.phakbung = p.out(); specs.phakbung = p.spec(); }
// woven sack full of plastic bottles
{ const p = grid(22, 26); for (let k = 0; k < 6; k++) { const x = 3 + k * 3, y = 1 + (k % 2) * 2; p.rect(x, y + 2, 3, 6, ['#8fd3ff', '#6fd6b0', '#f2efe6', '#3e8de0'][k % 4]); p.rect(x + 1, y, 1, 2, '#2253a3'); p.px(x, y + 3, '#ffffff'); }
  p.ellipse(11, 16, 9, 9, '#d8d2c4'); p.rect(3, 8, 17, 3, '#d8d2c4'); for (let y = 9; y < 25; y += 2) for (let x = 2; x < 21; x++) if ((x + y) % 4 === 0) p.px(x, y, '#b5b0a5'); p.rect(14, 10, 6, 14, '#b5b0a5'); p.rect(2, 9, 18, 1, '#2253a3'); p.rect(2, 11, 18, 1, '#2253a3');
  p.outline(O); maps.sack = p.out(); specs.sack = p.spec(); }
// small stack of coins
{ const p = grid(16, 10); for (let k = 0; k < 4; k++) { p.rect(2, 7 - k * 2, 8, 2, k % 2 ? '#b3b9d1' : '#d8d2c4'); p.rect(2, 7 - k * 2, 8, 1, '#f2efe6'); } p.rect(10, 6, 5, 3, '#ffc14a'); p.rect(10, 6, 5, 1, '#ffe66b'); p.outline(O); maps.coins = p.out(); specs.coins = p.spec(); }
// plate of rice with curry and a fried egg
{ const p = grid(20, 10); p.ellipse(10, 6, 9, 3, '#f2efe6'); p.ellipse(10, 6, 7, 2, '#d8d2c4'); p.ellipse(8, 4, 4, 2, '#ffffff'); p.ellipse(13, 5, 3, 2, '#e0533f'); p.px(12, 4, '#ff8a4c'); p.circle(6, 4, 1, '#ffc14a'); p.rect(4, 9, 12, 1, '#b3b9d1'); for (const x of [8, 10, 12]) { p.px(x, 0, '#f2efe6'); p.px(x + 1, 1, '#f2efe6'); } p.outline(O); maps.plate = p.out(); specs.plate = p.spec(); }
// classic red & cream Bangkok bus, side view facing left: open windows with passengers, lit route board, folding door
{ const w = 150, h = 62, p = grid(w, h); const red = '#b52b35', rd = '#7d1c2b', cream = '#f2d38a', cd = '#d9a35b', glass = '#3d3a5c';
  p.rect(6, 6, w - 10, 46, cream); p.rect(3, 10, 4, 42, cream); p.rect(5, 4, w - 12, 3, '#d8d2c4'); p.rect(8, 2, w - 20, 2, '#b5b0a5'); for (let x = 12; x < w - 14; x += 18) p.rect(x, 1, 8, 1, '#8c8a86');
  p.rect(3, 32, w - 7, 18, red); p.rect(3, 30, w - 7, 2, cd); p.rect(3, 48, w - 7, 4, rd); p.rect(w - 6, 6, 2, 46, cd); p.rect(3, 40, w - 7, 1, '#e0533f');
  for (let k = 0; k < 9; k++) { const wx = 30 + k * 12; p.rect(wx, 11, 10, 15, glass); p.rect(wx, 11, 10, 1, '#545577'); p.rect(wx, 18, 10, 1, '#7a7fa3'); p.rect(wx + 1, 12, 2, 5, '#8fd3ff');
    if (k % 3 !== 2) { const hc = ['#16141f', '#3b1f1a', '#16141f'][k % 3]; p.circle(wx + 5, 20, 2, '#b8773f'); p.rect(wx + 3, 17, 5, 2, hc); p.rect(wx + 2, 23, 7, 3, ['#3e8de0', '#f2efe6', '#e0533f'][k % 3]); } }
  p.rect(4, 10, 18, 20, glass); p.rect(5, 11, 4, 17, '#8fd3ff'); p.rect(10, 12, 1, 15, '#7a7fa3'); p.rect(4, 5, 18, 5, '#16141f'); p.rect(6, 6, 14, 3, '#ffe66b'); for (const x of [8, 11, 14, 17]) p.px(x, 7, '#b52b35');
  p.rect(23, 30, 10, 20, '#3d3a5c'); p.rect(27, 30, 1, 20, '#16141f'); p.rect(23, 30, 10, 1, '#16141f'); p.rect(24, 46, 8, 1, '#8c8a86');
  p.rect(2, 40, 3, 4, '#fff6c2'); p.rect(2, 45, 3, 2, '#ffc14a'); p.rect(w - 5, 38, 2, 4, '#e0533f'); p.rect(2, 50, 6, 2, '#5f5d5a'); p.rect(w - 9, 50, 6, 2, '#5f5d5a');
  for (let x = 40; x < 110; x += 4) p.px(x, 36, '#ffe66b'); p.rect(118, 34, 18, 8, '#f2efe6'); p.rect(121, 35, 3, 6, '#b52b35'); p.rect(126, 35, 3, 6, '#b52b35'); p.rect(131, 35, 3, 6, '#b52b35');
  for (const cx of [32, 122]) { p.circle(cx, 53, 7, '#0b0a12'); p.circle(cx, 53, 4, '#545577'); p.circle(cx, 53, 2, '#b3b9d1'); p.rect(cx - 10, 44, 20, 3, rd); p.rect(cx - 9, 45, 18, 1, '#16141f'); }
  p.outline(O); maps.bus = p.out(); specs.bus = p.spec(); }
const out = process.argv[2] || 'maps.json'; fs.writeFileSync(out, JSON.stringify(maps));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(specs)); console.log(Object.keys(maps).map((k) => k + ' ' + maps[k].rows[0].length + 'x' + maps[k].rows.length).join(', '));
