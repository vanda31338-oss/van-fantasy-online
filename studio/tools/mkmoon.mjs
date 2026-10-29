// Prop pixel maps + the bubble-helmet overlay for the "warp to the Moon from a desert island" project. node tools/mkmoon.mjs qa/moon/maps.json
import fs from 'fs';
import { grid } from './pixgrid.mjs';
const O = '#0b0a12';
const maps = {};
// coconut cracked open on top with a straw, light from the top-left
{ const p = grid(18, 18); p.circle(9, 10, 7, '#5c3424'); p.ellipse(8, 9, 6, 5, '#8a5232'); p.ellipse(7, 7, 3, 2, '#b8773f'); p.px(5, 6, '#d9a35b');
  for (const [x, y] of [[4, 12], [7, 14], [11, 13], [13, 10], [12, 6]]) p.line(x, y, x + 1, y - 2, '#3b1f1a');
  p.ellipse(9, 4, 5, 2, '#f2efe6'); p.ellipse(9, 4, 3, 1, '#d8d2c4'); p.rect(7, 4, 5, 1, '#8fd3ff');
  p.line(11, 4, 15, 0, '#e0533f'); p.line(12, 4, 16, 0, '#ff8a4c'); p.px(15, 1, '#fff6c2');
  p.rect(5, 16, 9, 1, '#3b1f1a'); p.outline(O); maps.coconut = p.out(); }
// battered orange backpack with straps and a pocket
{ const p = grid(18, 20); p.rect(3, 4, 12, 15, '#e0533f'); p.rect(3, 4, 12, 2, '#ff8a4c'); p.rect(3, 4, 2, 15, '#ff8a4c'); p.rect(13, 6, 2, 13, '#b52b35');
  p.rect(5, 1, 8, 4, '#b52b35'); p.rect(6, 1, 6, 1, '#e0533f'); p.rect(5, 10, 8, 6, '#b52b35'); p.rect(5, 10, 8, 1, '#ff8a4c'); p.rect(8, 12, 2, 1, '#ffe66b');
  p.rect(2, 8, 1, 9, '#5c3424'); p.rect(15, 8, 1, 9, '#5c3424'); p.rect(4, 18, 10, 1, '#7d1c2b'); p.px(6, 6, '#fff6c2'); p.rect(9, 6, 3, 1, '#7d1c2b');
  p.outline(O); maps.backpack = p.out(); }
// oxygen tank (steel, yellow band, O2 label) with a hose and a mask
{ const p = grid(22, 28); p.rect(4, 6, 9, 20, '#8c8a86'); p.rect(4, 6, 3, 20, '#d8d2c4'); p.rect(11, 6, 2, 20, '#5f5d5a'); p.ellipse(8, 6, 4, 2, '#b5b0a5'); p.rect(6, 1, 5, 4, '#545577'); p.rect(6, 1, 2, 4, '#7a7fa3'); p.rect(5, 0, 7, 1, '#3d3a5c');
  p.rect(4, 12, 9, 3, '#ffc14a'); p.rect(4, 12, 9, 1, '#ffe66b'); p.rect(6, 17, 5, 4, '#f2efe6'); p.px(7, 18, '#2253a3'); p.px(8, 19, '#2253a3'); p.px(9, 18, '#2253a3'); p.rect(4, 25, 9, 1, '#3d3a5c');
  p.line(11, 2, 16, 4, '#2f2a47'); p.line(16, 4, 18, 12, '#2f2a47'); p.line(17, 4, 19, 12, '#3d3a5c');
  p.ellipse(18, 16, 3, 4, '#3e8de0'); p.ellipse(17, 15, 1, 2, '#8fd3ff'); p.px(16, 14, '#ffffff'); p.rect(15, 19, 7, 1, '#16141f');
  p.outline(O); maps.o2tank = p.out(); }
// Thai fishing boat, side view facing left: blue-red hull with an eye, white cabin, mast with flags, nets and floats
{ const w = 132, h = 54, p = grid(w, h); const hb = '#2253a3', hl = '#3e8de0', red = '#b52b35';
  p.poly([[2, 32], [124, 32], [129, 26], [126, 44], [16, 46]], hb); p.poly([[2, 32], [124, 32], [126, 35], [6, 36]], hl);
  p.rect(10, 37, 114, 3, red); p.rect(10, 37, 114, 1, '#e0533f'); p.rect(16, 43, 108, 2, '#183057'); p.line(2, 32, 16, 46, '#183057');
  p.ellipse(14, 36, 3, 2, '#f2efe6'); p.px(14, 36, '#16141f'); p.px(13, 35, '#ffffff');
  p.rect(70, 14, 34, 18, '#f2efe6'); p.rect(70, 14, 34, 2, '#ffffff'); p.rect(102, 14, 2, 18, '#d8d2c4'); p.rect(68, 11, 38, 3, red); p.rect(68, 11, 38, 1, '#e0533f');
  for (let k = 0; k < 3; k++) { p.rect(74 + k * 10, 18, 7, 6, '#3d3a5c'); p.rect(74 + k * 10, 18, 7, 1, '#545577'); p.px(75 + k * 10, 19, '#8fd3ff'); }
  p.rect(40, 2, 2, 30, '#5c3424'); p.rect(40, 2, 1, 30, '#8a5232'); p.line(41, 3, 120, 22, '#d9a35b'); p.line(41, 3, 6, 30, '#d9a35b');
  for (const [x, c] of [[44, '#ffe66b'], [52, '#e0533f'], [60, '#2f9c86'], [68, '#ffc14a']]) { const y = 4 + (x - 41) * 0.24; p.poly([[x, y], [x + 5, y + 1], [x + 1, y + 5]], c); }
  p.rect(20, 22, 18, 10, '#24605a'); for (let x = 21; x < 37; x += 2) for (let y = 23; y < 32; y += 2) p.px(x, y, '#6fd6b0'); p.rect(20, 22, 18, 1, '#2f9c86');
  for (const x of [24, 30, 36]) { p.circle(x, 34, 1, '#ff8a4c'); } p.rect(108, 26, 8, 6, '#8a5232'); p.rect(108, 26, 8, 1, '#b8773f');
  p.outline(O); maps.boat = p.out(); }
// glass bubble helmet overlay (s / n / e): a clear dome (transparent inside), white glints, a metal collar
const helmet = (view) => { const p = grid(30, 30); const cx = 14.5, cy = 13.5, R = 13;
  for (let a = 0; a < Math.PI * 2; a += 0.01) { p.px(cx + Math.cos(a) * R, cy + Math.sin(a) * R, Math.sin(a) < 0.1 ? '#e8edf7' : '#b3b9d1'); }
  for (let a = Math.PI * 1.08; a < Math.PI * 1.42; a += 0.02) { p.px(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2), '#ffffff'); p.px(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), '#e8edf7'); }
  if (view === 'e') { for (let a = -0.5; a < 0.2; a += 0.03) p.px(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2), '#8fd3ff'); p.px(cx + R - 4, cy - 5, '#ffffff'); }
  if (view === 's') p.px(cx + 6, cy - 8, '#ffffff');
  p.rect(5, 24, 20, 4, '#7a7fa3'); p.rect(5, 24, 20, 1, '#d8d2c4'); p.rect(5, 27, 20, 1, '#545577'); p.rect(7, 25, 2, 2, '#ffc14a'); if (view !== 'n') p.rect(21, 25, 2, 2, '#4ff0ff'); else p.rect(12, 25, 6, 2, '#3d3a5c');
  return p.out(); };
maps.helmet = { s: helmet('s'), n: helmet('n'), e: helmet('e') };
maps.helmet.w = { pal: maps.helmet.e.pal, rows: maps.helmet.e.rows.map((r) => [...r].reverse().join('')) };
const out = process.argv[2] || 'qa/moon/maps.json'; fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(out, JSON.stringify(maps));
console.log(Object.keys(maps).map((k) => k + ' ' + (maps[k].rows ? maps[k].rows[0].length + 'x' + maps[k].rows.length : 'views')).join(', '));
