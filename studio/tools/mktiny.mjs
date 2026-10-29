// Props + creatures for "ตัวหดเหลือ 2 เซน" (shrunk to 2 cm in your own room), drawn at the giant scale of the clip
// (Ton is 48 px = 2 cm, so 1 px ≈ 0.4 mm): rice grain, bottle cap, broom bristles, dustpan, the cat's face and paw, red ants,
// plus a normal-scale trash bin and a banana-peel overlay for the last shot. node tools/mktiny.mjs qa/tiny/maps.json
import fs from 'fs';
import { grid } from './pixgrid.mjs';
const O = '#0b0a12';
const maps = {};
const WH = '#ffffff', W = '#f2efe6', W2 = '#d8d2c4', DK = '#16141f';

// one grain of cooked rice, 7 mm: plump, pearly, translucent edge
{ const p = grid(42, 22); p.ellipse(21, 12, 19, 8, '#e8edf7'); p.ellipse(19, 10, 15, 5, W); p.ellipse(16, 8, 8, 2, WH); p.ellipse(28, 15, 8, 3, '#d8d2c4');
  p.px(8, 12, '#b3b9d1'); p.px(34, 9, '#b3b9d1'); p.line(10, 17, 30, 18, '#b3b9d1'); p.outline('#8c8a86'); maps.rice = p.out(); }
// plastic bottle cap, 3 cm wide, open side up: a little boat
{ const p = grid(80, 36); const c = '#2253a3', c2 = '#3e8de0', c3 = '#183057';
  p.poly([[2, 4], [78, 4], [74, 32], [6, 32]], c); p.rect(2, 4, 76, 4, c2); p.rect(2, 4, 76, 1, '#8fd3ff'); p.rect(6, 30, 68, 2, c3);
  for (let x = 6; x < 76; x += 4) p.line(x, 9, x - (x - 40) * 0.05, 30, c3); p.rect(8, 6, 64, 2, '#183057'); p.px(12, 5, WH); p.px(13, 5, WH);
  p.outline(O); maps.cap = p.out(); }
// broom bristles sweeping in from the side: a wall of straw fibres
{ const p = grid(200, 240); const cs = ['#d9a35b', '#b8773f', '#f2d38a', '#8a5232'];
  for (let x = 0; x < 200; x += 2) { const top = 0, bot = 228 + Math.round(Math.sin(x * 0.7) * 6 + Math.sin(x * 0.13) * 5); const c = cs[(x * 7) % 4]; const lean = (x % 6) - 3;
    p.line(x, top, x + lean, bot, c); if (x % 4 === 0) p.line(x + 1, top, x + 1 + lean, bot - 4, cs[(x * 3 + 1) % 4]); }
  p.rect(0, 0, 200, 30, '#b52b35'); p.rect(0, 0, 200, 6, '#e0533f'); p.rect(0, 26, 200, 4, '#7d1c2b'); for (let x = 6; x < 200; x += 18) p.rect(x, 8, 2, 16, '#7d1c2b');
  p.outline('#3b1f1a'); maps.broom = p.out(); }
// dustpan lip: green plastic slope lying on the floor
{ const p = grid(220, 64); const c = '#3f7a2e', c2 = '#7cbf3f', c3 = '#2e5a23';
  p.poly([[0, 60], [220, 60], [220, 4], [0, 40]], c); p.poly([[0, 40], [220, 4], [220, 10], [0, 46]], c2); p.rect(0, 58, 220, 2, c3);
  for (let x = 10; x < 220; x += 22) p.line(x, 46 - x * 0.16, x, 58, c3); p.outline(O); maps.dustpan = p.out(); }
// a cat paw (orange tabby) swiping down: pink toe beans, claws out
{ const p = grid(112, 86); const f = '#ff8a4c', f2 = '#e0533f', f3 = '#b8773f', pink = '#ff4fa3';
  p.ellipse(56, 52, 50, 32, f); p.ellipse(50, 44, 40, 22, '#ffc14a'); for (const x of [20, 40, 62, 84]) { p.ellipse(x + 6, 70, 11, 10, f); p.ellipse(x + 6, 74, 6, 5, pink); p.line(x + 4, 80, x + 2, 85, W); p.line(x + 8, 80, x + 9, 85, W); }
  p.ellipse(56, 58, 16, 9, pink); for (let k = 0; k < 4; k++) p.line(20 + k * 20, 20, 30 + k * 20, 40, f2); p.rect(30, 0, 52, 24, f); for (let k = 0; k < 3; k++) p.line(36 + k * 16, 2, 40 + k * 16, 22, f3);
  p.outline(O); maps.paw = p.out(); }
// the cat's face filling the frame (orange tabby): idle = pupils look left / right / blink, action = pupils blown wide + mouth open
const cat = (pose) => { const p = grid(232, 200); const f = '#ff8a4c', f2 = '#e0533f', fl = '#ffc14a', pink = '#ff4fa3', w = W;
  p.poly([[20, 70], [40, 0], [86, 46]], f); p.poly([[34, 58], [44, 16], [74, 46]], pink); p.poly([[212, 70], [192, 0], [146, 46]], f); p.poly([[198, 58], [188, 16], [158, 46]], pink);
  p.ellipse(116, 120, 114, 82, f); p.ellipse(116, 104, 96, 60, fl); for (let k = 0; k < 5; k++) p.line(76 + k * 20, 40, 82 + k * 18, 70, f2); // forehead stripes
  for (const [x, s] of [[30, 1], [202, -1]]) for (let k = 0; k < 3; k++) p.line(x, 110 + k * 12, x + 26 * s, 116 + k * 10, f2);
  p.ellipse(116, 160, 46, 30, w); // muzzle
  const eye = (cx) => { p.ellipse(cx, 104, 30, 26, DK); p.ellipse(cx, 104, 27, 23, '#7cbf3f'); p.ellipse(cx, 98, 22, 14, '#b8e05a');
    if (pose === 'blink') { p.rect(cx - 30, 92, 60, 24, f); p.line(cx - 28, 104, cx + 28, 104, DK); p.line(cx - 28, 105, cx + 28, 105, DK); return; }
    const off = pose === 'left' ? -9 : pose === 'right' ? 9 : 0; const pw = pose === 'wide' ? 15 : 4; p.ellipse(cx + off, 104, pw, 21, DK); p.ellipse(cx + off - 8, 94, 4, 4, WH); p.px(cx + off + 6, 112, WH); };
  eye(70); eye(162);
  p.poly([[104, 146], [128, 146], [116, 158]], pink); p.line(116, 158, 116, 166, DK); p.line(116, 166, 104, 172, DK); p.line(116, 166, 128, 172, DK);
  if (pose === 'wide') { p.ellipse(116, 182, 20, 12, '#7d1c2b'); p.ellipse(116, 186, 12, 6, pink); p.poly([[100, 172], [104, 186], [108, 172]], w); p.poly([[124, 172], [128, 186], [132, 172]], w); }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.line(116 + s * 40, 160 + k * 6, 116 + s * 110, 148 + k * 12, w);
  p.outline(O); return p.out(); };
maps.cat = { idle: [cat('left'), cat('right'), cat('blink')], idleSeq: [0, 0, 1, 1, 2, 0], action: [cat('wide')] };
// red weaver ant, 1 cm: half your height, side view facing right; idle = walking legs, action = mandibles up (carrying)
const ant = (pose) => { const p = grid(44, 24); const c = '#b52b35', c2 = '#e0533f', c3 = '#7d1c2b';
  p.ellipse(8, 13, 7, 5, c); p.ellipse(6, 11, 4, 2, c2); p.ellipse(20, 12, 5, 3, c); p.ellipse(32, 10, 6, 5, c); p.ellipse(31, 8, 3, 2, c2); p.circle(34, 8, 1, DK); p.px(33, 7, WH);
  const lg = pose === 'b' ? 1 : -1; for (const [x, d] of [[16, 1], [20, -1], [24, 1]]) { p.line(x, 14, x - 4 * d * lg, 22, c3); p.line(x - 4 * d * lg, 22, x - 6 * d * lg, 23, c3); }
  p.line(34, 5, 40, 0, c3); p.line(36, 6, 43, 3, c3); // antennae
  if (pose === 'carry') { p.line(37, 10, 43, 6, c3); p.line(37, 12, 43, 10, c3); } else { p.line(37, 12, 42, 13, c3); }
  p.outline(O); return p.out(); };
maps.ant = { idle: [ant('a'), ant('b')], action: [ant('carry'), ant('carry')] };
// normal-scale green trash bin with the lid flipped open (the last shot: you are back to full size, inside it)
{ const p = grid(46, 52); const c = '#2f9c86', c2 = '#6fd6b0', c3 = '#24605a';
  p.poly([[4, 12], [42, 12], [38, 50], [8, 50]], c); p.rect(4, 12, 38, 3, c2); for (const x of [12, 20, 28, 35]) p.line(x, 16, x - (x - 23) * 0.1, 48, c3); p.rect(8, 48, 30, 2, c3);
  p.poly([[0, 8], [20, 0], [24, 3], [4, 12]], c2); p.rect(18, 22, 10, 6, W2); p.px(20, 24, DK); p.px(25, 24, DK);
  p.outline(O); maps.bin = p.out(); }
// banana peel draped on the head (overlay s / n / e, w mirrored)
const peel = (v) => { const p = grid(22, 14); const y = '#ffe66b', y2 = '#ffc14a', b = '#8a5232';
  if (v === 'n') { p.ellipse(11, 4, 8, 3, y); p.line(3, 6, 1, 12, y2); p.line(19, 6, 21, 12, y2); p.px(11, 1, b); return p.out(); }
  p.ellipse(11, 4, 7, 3, y); p.px(11, 0, b); p.line(4, 5, 0, 13, y2); p.line(5, 5, 2, 13, y); p.line(18, 5, 22, 12, y2); p.line(17, 5, 20, 13, y); if (v === 'e') p.line(12, 6, 16, 13, y2); return p.out(); };
maps.peel = { s: peel('s'), n: peel('n'), e: peel('e') }; maps.peel.w = { pal: maps.peel.e.pal, rows: maps.peel.e.rows.map((r) => [...r].reverse().join('')) };
const out = process.argv[2] || 'qa/tiny/maps.json'; fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(out, JSON.stringify(maps));
console.log(Object.keys(maps).join(', '));
