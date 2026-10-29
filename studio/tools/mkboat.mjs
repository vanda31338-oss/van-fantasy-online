// Pixel art for the "speedboat Pattaya → Koh Larn, warped to the Moon" project: boat, wreck, moon rabbit, props, sunglasses.
// node tools/mkboat.mjs qa/moonboat/maps.json
import fs from 'fs';
import { grid } from './pixgrid.mjs';
const O = '#0b0a12';
const maps = {};
const W = '#f2efe6', W2 = '#d8d2c4', W3 = '#b5b0a5', WH = '#ffffff', RED = '#b52b35', RED2 = '#e0533f', BLUE = '#2253a3', BLUE2 = '#3e8de0', DARK = '#16141f', GLASS = '#8fd3ff';

// racing speedboat, side view facing right; the cockpit above the gunwale is open so the driver stands inside it
{ const p = grid(112, 36);
  p.poly([[4, 18], [96, 18], [111, 11], [105, 25], [88, 34], [12, 34], [4, 29]], W);
  p.poly([[4, 26], [108, 19], [105, 25], [88, 34], [12, 34], [4, 29]], W2); p.poly([[6, 29], [104, 23], [102, 26], [88, 33], [12, 33]], RED); p.line(6, 29, 104, 23, RED2);
  p.line(6, 22, 100, 20, BLUE); p.line(6, 23, 100, 21, BLUE2); p.line(4, 18, 96, 18, WH); p.line(96, 18, 111, 11, WH);
  p.rect(5, 15, 92, 3, W3); p.rect(5, 15, 92, 1, W); for (const x of [20, 40, 86]) p.rect(x, 12, 1, 3, '#b3b9d1'); p.line(20, 12, 40, 12, '#b3b9d1'); p.line(80, 13, 104, 11, '#b3b9d1');
  p.poly([[64, 15], [72, 3], [78, 3], [74, 15]], '#3d3a5c'); p.poly([[66, 14], [72, 5], [76, 5], [72, 14]], GLASS); p.line(72, 5, 69, 11, WH); p.px(75, 6, WH);
  p.rect(56, 9, 4, 6, '#545577'); p.circle(57, 8, 2, DARK); p.px(57, 8, '#7a7fa3');
  p.rect(0, 6, 7, 20, DARK); p.rect(0, 6, 7, 3, '#545577'); p.rect(1, 12, 5, 2, RED2); p.rect(2, 26, 3, 6, '#3d3a5c'); p.px(1, 7, '#b3b9d1');
  p.line(10, 15, 10, 4, '#8c8a86'); p.rect(11, 4, 6, 1, RED); p.rect(11, 5, 6, 1, W); p.rect(11, 6, 6, 1, BLUE); p.rect(11, 7, 6, 1, W); p.rect(11, 8, 6, 1, RED);
  for (const [x, y] of [[30, 25], [36, 25], [42, 24]]) p.px(x, y, BLUE);
  p.outline(O); maps.speedboat = p.out(); }

// the same boat after the warp: capsized, snapped in two, motor in the air, a life ring and bits around it
{ const p = grid(128, 50);
  p.poly([[4, 44], [58, 40], [62, 22], [52, 18], [10, 26]], W); p.poly([[4, 44], [58, 40], [60, 32], [8, 36]], W2); p.poly([[10, 26], [52, 18], [50, 24], [12, 31]], RED); p.line(12, 31, 50, 24, RED2);
  p.line(8, 36, 58, 34, BLUE); p.poly([[56, 18], [62, 22], [58, 40], [54, 38], [58, 30], [53, 26]], '#3d3a5c'); for (const y of [24, 28, 32, 36]) p.line(54, y, 59, y + 1, W3);
  p.rect(20, 6, 7, 16, DARK); p.rect(20, 4, 7, 3, '#545577'); p.rect(21, 10, 5, 2, RED2); p.line(23, 4, 18, 0, '#3d3a5c'); p.line(23, 4, 28, 0, '#3d3a5c'); p.px(18, 0, '#b3b9d1'); p.px(28, 0, '#b3b9d1');
  p.poly([[68, 46], [118, 40], [126, 22], [114, 14], [76, 28], [70, 36]], W); p.poly([[70, 36], [76, 28], [84, 31], [78, 40], [70, 44]], '#3d3a5c'); for (const y of [32, 36, 40]) p.line(71, y, 80, y - 1, W3);
  p.poly([[84, 44], [118, 40], [122, 32], [90, 37]], W2); p.poly([[90, 30], [114, 16], [120, 20], [94, 34]], RED); p.line(92, 33, 118, 19, RED2); p.line(86, 40, 120, 34, BLUE); p.line(114, 14, 126, 22, WH);
  p.poly([[96, 16], [102, 4], [108, 6], [104, 18]], '#3d3a5c'); p.poly([[98, 15], [103, 6], [106, 7], [102, 16]], GLASS); p.px(103, 7, WH);
  p.circle(40, 46, 4, RED2); p.circle(40, 46, 2, W); p.px(36, 46, W); p.px(44, 46, W); p.px(40, 42, W); p.px(40, 50 - 1, W);
  for (const [x, y, w, c] of [[64, 46, 4, W3], [90, 47, 3, RED], [110, 46, 5, W2], [2, 47, 3, W3]]) p.rect(x, y, w, 2, c);
  p.outline(O); maps.wreck = p.out(); }

// moon rabbit sitting at its mortar, facing left: idle = pounding mochi (pestle up / down, a blink), action = a flying kick
const rabbit = (pose) => { const p = grid(44, 40); const fur = W, fur2 = W2, fur3 = W3, pink = '#ff4fa3';
  if (pose !== 'kick1' && pose !== 'kick2') {
    p.ellipse(7, 31, 7, 4, '#8a5232'); p.rect(1, 31, 13, 7, '#8a5232'); p.rect(1, 31, 13, 1, '#b8773f'); p.rect(2, 37, 11, 2, '#5c3424'); p.ellipse(7, 30, 5, 2, WH); p.px(5, 29, '#e8edf7');
  }
  const bx = 26, by = 26;
  if (pose === 'kick1' || pose === 'kick2') { // standing on the right leg, the left leg shooting out toward the victim
    p.ellipse(bx, by - 2, 8, 9, fur); p.ellipse(bx + 3, by + 1, 5, 7, fur2); p.rect(bx + 2, by + 6, 4, 8, fur2); p.rect(bx + 1, by + 13, 7, 2, fur3);
    const kx = pose === 'kick2' ? 4 : 12; p.line(bx - 5, by + 2, kx, by + 6, fur); p.line(bx - 5, by + 3, kx, by + 7, fur2); p.ellipse(kx, by + 6, 3, 2, fur); p.px(kx - 2, by + 6, pink);
    if (pose === 'kick2') for (const k of [0, 1, 2]) p.line(kx + 6 + k * 4, by + 1 + k, kx + 9 + k * 4, by + 1 + k, '#ffe66b');
  } else {
    p.ellipse(bx, by + 4, 9, 9, fur); p.ellipse(bx + 3, by + 6, 6, 7, fur2); p.ellipse(bx + 2, by + 12, 8, 2, fur3); p.circle(bx + 8, by + 8, 2, fur);
  }
  const hx = bx - 4, hy = by - 9; p.ellipse(hx, hy, 7, 6, fur); p.ellipse(hx + 2, hy + 2, 5, 4, fur2); p.ellipse(hx - 4, hy + 1, 2, 2, fur);
  for (const [ex, lean] of [[hx - 1, -1], [hx + 3, 1]]) { p.line(ex, hy - 4, ex + lean, hy - 16, fur); p.line(ex + 1, hy - 4, ex + 1 + lean, hy - 16, fur); p.line(ex + 2, hy - 5, ex + 2 + lean, hy - 14, fur2); p.line(ex + 1, hy - 6, ex + 1 + lean, hy - 14, pink); }
  if (pose === 'blink') p.line(hx - 5, hy - 1, hx - 3, hy - 1, DARK); else { p.rect(hx - 5, hy - 2, 2, 2, DARK); p.px(hx - 5, hy - 2, WH); }
  p.px(hx - 8, hy + 1, pink); p.px(hx - 7, hy + 3, fur3); p.px(hx - 6, hy + 3, fur3);
  if (pose === 'up' || pose === 'blink') { p.line(bx - 6, by, bx - 14, by - 10, fur); p.line(bx - 14, by - 10, 10, 8, '#b8773f'); p.rect(4, 4, 9, 6, '#8a5232'); p.rect(4, 4, 9, 1, '#d9a35b'); }
  if (pose === 'down') { p.line(bx - 6, by + 2, bx - 15, by + 2, fur); p.line(bx - 15, by + 2, 12, 22, '#b8773f'); p.rect(3, 22, 10, 6, '#8a5232'); p.rect(3, 22, 10, 1, '#d9a35b'); p.px(1, 28, WH); p.px(14, 27, WH); p.px(0, 25, WH); }
  p.outline(O); return p.out(); };
maps.rabbit = { idle: [rabbit('up'), rabbit('down'), rabbit('up'), rabbit('down'), rabbit('blink'), rabbit('down')], action: [rabbit('kick1'), rabbit('kick2'), rabbit('kick2'), rabbit('kick1')] };

// score card on a stick: "10" big in red, "/10" small
{ const p = grid(24, 34); p.rect(11, 18, 2, 16, '#8a5232'); p.rect(11, 18, 1, 16, '#b8773f'); p.rect(1, 1, 22, 18, W); p.rect(1, 1, 22, 2, WH); p.rect(21, 1, 2, 18, W2); p.rect(1, 17, 22, 2, W3);
  const D = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 0: ['###', '#.#', '#.#', '#.#', '###'] };
  let dx = 4; for (const d of '10') { D[d].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') p.rect(dx + x * 2, 4 + y * 2, 2, 2, RED); })); dx += 8; }
  p.px(17, 14, DARK); p.px(18, 13, DARK); p.rect(19, 13, 1, 3, DARK); p.rect(21, 13, 1, 3, DARK); p.px(21, 13, DARK);
  p.outline(O); maps.scorecard = p.out(); }
// saliva bubbles boiling on the tongue
{ const p = grid(18, 14); for (const [x, y, r] of [[5, 9, 3], [11, 7, 4], [15, 11, 2], [8, 3, 2], [14, 2, 1]]) { p.circle(x, y, r, GLASS); if (r > 1) p.circle(x, y, r - 1, '#e8edf7'); p.px(x - 1, y - 1, WH); }
  p.outline('#3e8de0'); maps.bubbles = p.out(); }
// sunglasses overlay (s / n / e) for the driver
const shades = (view) => { const p = grid(20, 8);
  if (view === 's') { p.rect(2, 2, 7, 4, DARK); p.rect(11, 2, 7, 4, DARK); p.rect(9, 2, 2, 1, DARK); p.rect(0, 2, 2, 1, DARK); p.rect(18, 2, 2, 1, DARK); p.px(3, 3, '#4ff0ff'); p.px(12, 3, '#4ff0ff'); p.px(4, 3, '#ff4fa3'); p.px(13, 3, '#ff4fa3'); }
  if (view === 'e') { p.rect(12, 2, 6, 4, DARK); p.rect(4, 2, 8, 1, DARK); p.px(13, 3, '#4ff0ff'); p.px(14, 3, '#ff4fa3'); }
  if (view === 'n') { p.rect(1, 2, 18, 1, DARK); }
  return p.out(); };
maps.shades = { s: shades('s'), n: shades('n'), e: shades('e') }; maps.shades.w = { pal: maps.shades.e.pal, rows: maps.shades.e.rows.map((r) => [...r].reverse().join('')) };
const out = process.argv[2] || 'qa/moonboat/maps.json'; fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(out, JSON.stringify(maps));
console.log(Object.keys(maps).join(', '));
