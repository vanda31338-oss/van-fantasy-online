// Props for "ทั้งเมืองมีปีก" (everyone suddenly gets wings): rider's motorbike with a delivery box, a crashed car,
// the phone with the order, the chicken-rice box and a 50-baht note. node tools/mkwings.mjs qa/wings/maps.json
import fs from 'fs';
import { grid } from './pixgrid.mjs';
const O = '#0b0a12';
const maps = {};
const G1 = '#2e5a23', G2 = '#3f7a2e', G3 = '#7cbf3f', WH = '#ffffff', W = '#f2efe6', W2 = '#d8d2c4', DK = '#16141f', D2 = '#2f2a47', D3 = '#3d3a5c', ST = '#8c8a86', ST2 = '#b5b0a5', GL = '#8fd3ff';

// delivery motorbike facing right: green scooter body, black seat, big green box with a white band and a bowl icon
{ const p = grid(58, 40);
  for (const cx of [12, 46]) { p.circle(cx, 32, 7, DK); p.circle(cx, 32, 5, D3); p.circle(cx, 32, 2, ST2); p.px(cx - 2, 29, ST); }
  p.poly([[8, 28], [20, 22], [36, 22], [44, 18], [50, 20], [52, 28], [40, 30], [22, 30]], G2); p.poly([[20, 22], [36, 22], [34, 25], [22, 25]], G3);
  p.rect(18, 18, 18, 4, DK); p.rect(18, 18, 18, 1, D3); // seat
  p.line(46, 18, 44, 8, D3); p.line(47, 18, 45, 8, DK); p.rect(41, 6, 8, 2, DK); p.circle(50, 15, 2, '#fff6c2'); p.px(50, 15, WH); // fork, bar, headlight
  p.rect(22, 30, 16, 2, D2); p.rect(4, 26, 6, 2, '#e0533f'); p.rect(30, 26, 10, 1, ST);
  p.rect(1, 2, 20, 17, G1); p.rect(2, 2, 18, 15, G2); p.rect(2, 2, 18, 2, G3); p.rect(2, 9, 18, 3, W); p.rect(18, 4, 2, 13, G1); // box
  p.ellipse(11, 10, 3, 2, G1); p.rect(8, 9, 7, 1, W); p.px(11, 7, G1); p.rect(1, 18, 20, 1, DK);
  p.outline(O); maps.bike = p.out(); }

// sedan that crashed into a pole: crumpled bonnet up, cracked windscreen, door hanging open, a wheel off
{ const p = grid(76, 38); const R = '#b52b35', R2 = '#e0533f', R3 = '#7d1c2b';
  p.circle(18, 31, 6, DK); p.circle(18, 31, 3, ST); p.circle(60, 33, 5, DK); p.circle(60, 33, 2, ST); p.ellipse(70, 35, 4, 2, DK); // last wheel flat & off
  p.poly([[4, 30], [6, 20], [18, 18], [26, 8], [48, 8], [56, 16], [66, 14], [74, 6], [72, 22], [70, 30]], R);
  p.poly([[6, 20], [18, 18], [26, 8], [48, 8], [46, 12], [28, 12], [20, 21], [6, 23]], R2);
  p.poly([[28, 11], [36, 11], [36, 18], [22, 19]], GL); p.poly([[38, 11], [46, 11], [52, 17], [38, 18]], GL);
  p.line(40, 12, 48, 17, WH); p.line(44, 11, 41, 17, WH); p.line(42, 14, 50, 13, WH); // cracks
  p.poly([[56, 16], [66, 14], [74, 6], [70, 4], [62, 10]], R3); // crumpled bonnet up
  for (let x = 58; x < 70; x += 3) p.line(x, 13, x + 3, 9, R2);
  p.rect(4, 26, 66, 2, R3); p.rect(70, 20, 4, 4, '#fff6c2'); p.rect(2, 22, 3, 4, '#ff8a4c');
  p.poly([[22, 19], [10, 10], [10, 22], [20, 28]], R3); p.poly([[20, 19], [12, 12], [12, 20], [19, 25]], GL); // door hanging open
  for (const [x, y] of [[30, 34], [44, 35], [52, 34], [8, 36]]) p.rect(x, y, 3, 1, GL);
  p.outline(O); maps.crashcar = p.out(); }

// phone with the order popping up: green app header, chicken-rice icon, "30" floor tag, map pin, accept button
{ const p = grid(26, 42);
  p.rect(1, 1, 24, 40, DK); p.rect(2, 2, 22, 38, D2); p.rect(3, 4, 20, 33, W); p.rect(10, 2, 6, 1, D3);
  p.rect(3, 4, 20, 6, G2); p.rect(3, 4, 20, 1, G3); p.rect(5, 6, 9, 2, WH); p.circle(19, 7, 1, '#ffe66b');
  p.ellipse(9, 16, 4, 3, WH); p.ellipse(9, 15, 3, 2, W2); p.rect(6, 13, 6, 2, '#f2d38a'); p.rect(7, 13, 4, 1, '#d9a35b'); p.rect(5, 18, 9, 2, '#b5b0a5'); // rice + chicken
  const D = { 3: ['###', '..#', '.##', '..#', '###'], 0: ['###', '#.#', '#.#', '#.#', '###'] }; let dx = 15; for (const d of '30') { D[d].forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') p.px(dx + x, 13 + y, '#b52b35'); })); dx += 4; }
  p.rect(5, 23, 16, 1, W2); p.rect(5, 25, 12, 1, W2); p.circle(18, 26, 2, '#e0533f'); p.px(18, 26, WH); p.px(18, 29, '#e0533f');
  p.rect(5, 31, 16, 4, G2); p.rect(5, 31, 16, 1, G3); p.rect(9, 32, 8, 2, WH);
  p.outline(O); maps.phone = p.out(); }

// chicken rice in a clear takeaway box with cucumber, coriander and a sauce bag
{ const p = grid(30, 20);
  p.rect(1, 6, 28, 13, '#e8edf7'); p.rect(2, 7, 26, 11, WH); p.rect(1, 6, 28, 1, GL); p.rect(1, 18, 28, 1, ST2);
  p.ellipse(15, 11, 10, 4, W); p.ellipse(13, 10, 7, 3, '#fff6c2');
  for (const x of [8, 12, 16, 20]) { p.rect(x, 8, 4, 3, '#f2d38a'); p.rect(x, 8, 4, 1, '#d9a35b'); }
  p.rect(22, 12, 4, 2, '#7cbf3f'); p.rect(23, 12, 2, 1, '#e8edf7'); p.px(6, 9, '#3f7a2e'); p.px(7, 10, '#7cbf3f');
  p.ellipse(25, 4, 3, 3, '#8a5232'); p.px(24, 3, '#d9a35b'); p.line(25, 1, 26, 0, '#e0533f'); // sauce bag
  p.outline(O); maps.rice = p.out(); }

// a 50-baht note (blue), slightly bent
{ const p = grid(30, 16);
  p.poly([[1, 3], [28, 1], [29, 13], [2, 15]], '#3e8de0'); p.poly([[3, 4], [26, 3], [27, 12], [4, 13]], '#8fd3ff'); p.circle(20, 8, 3, '#3e8de0'); p.circle(20, 8, 2, '#2253a3');
  const D = { 5: ['###', '#..', '###', '..#', '###'], 0: ['###', '#.#', '#.#', '#.#', '###'] }; let dx = 6; for (const d of '50') { D[d].forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') p.px(dx + x, 6 + y, '#183057'); })); dx += 4; }
  p.line(3, 4, 26, 3, WH);
  p.outline('#183057'); maps.note50 = p.out(); }

const out = process.argv[2] || 'qa/wings/maps.json'; fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(out, JSON.stringify(maps));
console.log(Object.keys(maps).map((k) => k + ' ' + maps[k].rows[0].length + 'x' + maps[k].rows.length).join(', '));
