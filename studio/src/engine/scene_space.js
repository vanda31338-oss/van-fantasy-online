// Castaway → portal → the Moon: island, sea, jungle, warp tunnel and lunar primitives + their ambient life.
(function (G) {
  const LSE = G.LSE; const S = LSE.Scene; const PR = S.prims; const W = S.W, H = S.H, M = S.M; const TAU = Math.PI * 2;
  const sh = (c, k) => LSE.shade(c, k); const mix = (a, b, t) => LSE.mix(a, b, t);
  const LW = W + 2 * M; const A = S.ambientExt;
  const fullE = (p, fn) => { const cs = [p.ctx, p.ectx, p.bctx].filter(Boolean); cs.forEach((c) => { c.save(); c.translate(-M, 0); }); try { fn(); } finally { cs.forEach((c) => c.restore()); } };
  const noise = (x, y, s) => (Math.sin(x * 0.21 + s) + Math.sin(y * 0.27 + s * 1.7) + Math.sin((x + y) * 0.13 + s * 2.3) + Math.sin((x - y) * 0.09 + s * 0.7) * 1.4) / 4.4;

  // ---------- sea & island ----------
  // open sea from the horizon (o.y) to the shore (o.y1): deeper blue far away, turquoise near, wave dashes, a sun-glitter column at o.sunx
  PR.ocean = (p, o, r) => fullE(p, () => {
    const y0 = o.y, y1 = o.y1 || y0 + 40, c = o.color || '#1f6f8b', c2 = o.color2 || '#5fc9d6';
    p.ditherV(0, y0, LW, y1 - y0, c, c2, 5);
    for (let yy = y0 + 2, gap = 2; yy < y1 - 1; yy += gap, gap = Math.min(7, gap + 1)) {
      const f = (yy - y0) / (y1 - y0), len = 2 + Math.round(f * 7);
      for (let x = Math.floor(r() * 14); x < LW; x += 12 + Math.floor(r() * 16) + len) { p.rect(x, yy, len, 1, sh(mix(c, c2, f), 0.14)); if (r() < 0.25) p.rect(x + 1, yy + 1, len - 2, 1, sh(mix(c, c2, f), -0.08)); }
    }
    p.rect(0, y0, LW, 1, o.edge || sh(c2, 0.2));
    if (o.sunx != null) { const sx = o.sunx + M; for (let yy = y0 + 1; yy < y1; yy += 2) { const w = 4 + (yy - y0) * 0.45; for (let k = 0; k < 3; k++) if (r() < 0.75) p.glow(sx - w / 2 + r() * w, yy, 1 + Math.floor(r() * 3), 1, r() < 0.5 ? '#fff6c2' : '#ffe66b'); } }
  });
  // distant islets on the horizon line o.y, each a hump with one or two tiny palms
  PR.islet = (p, o, r) => {
    const c = o.color || '#24605a', lit = sh(c, 0.12);
    (o.xs || [52, 214]).forEach((x, i) => {
      const w = (o.ws && o.ws[i]) || 44, h = (o.hs && o.hs[i]) || 9, y = o.y; const pts = [];
      for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push([x - w / 2 + t * w, y - h * Math.pow(Math.sin(Math.PI * t), 0.7) * (1 + 0.18 * Math.sin(t * 11 + i))]); }
      pts.push([x + w / 2, y], [x - w / 2, y]); p.poly(pts, c);
      for (let k = 1; k < 8; k++) { const [px, py] = pts[k]; p.px(px, Math.round(py), lit); }
      for (let n = 0; n < (i % 2 ? 1 : 2); n++) { const tx = Math.round(x - w * 0.15 + n * w * 0.28), ty = Math.round(y - h + 1); p.rect(tx, ty - 7, 1, 7, sh(c, -0.1)); for (const d of [-3, -2, -1, 1, 2, 3]) p.px(tx + d, ty - 7 + Math.abs(d) * 0.6, sh(c, -0.05)); p.px(tx, ty - 8, sh(c, -0.05)); }
      p.rect(x - w / 2 + 2, y, w - 4, 1, sh(c, 0.25)); // surf line
    });
  };
  // coconut palm: curved banded trunk, 8 drooping fronds with leaflets lit from the top-left, coconut cluster
  PR.palm2 = (p, o, r) => {
    const x = o.x, y = o.y, h = o.h || 90, lean = o.lean ?? 0.4, tr = o.trunk || '#8a5232', g = o.color || '#3f7a2e', gd = o.dark || '#2e5a23', gl = o.lite || '#7cbf3f';
    let tx = x, ty = y - h;
    for (let s = 0; s <= h; s++) { const u = s / h; const cx = x + lean * u * u * h * 0.38; const wv = Math.max(2, Math.round(5 - u * 2.5)); const yy = y - s;
      p.rect(Math.round(cx - wv / 2), yy, wv, 1, (s % 5 === 0) ? sh(tr, -0.2) : tr); p.px(Math.round(cx - wv / 2), yy, sh(tr, 0.16)); p.px(Math.round(cx + wv / 2) - 1, yy, sh(tr, -0.16)); if (s === h) { tx = Math.round(cx); ty = yy; } }
    const fronds = o.fronds || 8;
    const sc = o.crown || 1;
    const frond = (a, L, front) => { // a spine arching up then drooping, with long leaflets hanging from it (lit side on top)
      const pts = []; for (let k = 0; k <= L; k++) { const u = k / L; pts.push([tx + Math.cos(a) * L * u, ty - Math.sin(a) * L * u * 0.5 - Math.sin(Math.PI * u) * L * 0.18 + u * u * L * 0.62]); }
      const dir = Math.cos(a) >= 0 ? 1 : -1;
      for (let k = 2; k < pts.length; k++) { const [fx, fy] = pts[k]; const u = k / L; const ll = Math.max(2, Math.round((1 - u * 0.75) * 8 * sc)); const sway = (k % 2) ? 1 : 0;
        const c1 = front ? (k % 3 === 0 ? sh(g, -0.08) : g) : gd; p.line(fx, fy, fx + dir * (2 + sway), fy + ll, c1); p.line(fx, fy, fx - dir * (1 + sway), fy + ll - 1, front ? sh(g, -0.12) : sh(gd, -0.05));
        if (front && k % 2 === 0) p.px(fx + dir, fy + 1, gl); }
      for (let k = 0; k + 1 < pts.length; k++) { p.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], front ? sh(g, 0.1) : gd); if (front) p.px(pts[k][0], pts[k][1] - 1, k < L * 0.6 ? gl : sh(g, 0.12)); }
    };
    for (let k = 0; k < fronds; k++) { const a = 0.2 + (Math.PI - 0.4) * k / (fronds - 1) + (r() - 0.5) * 0.2; frond(a, (22 + r() * 8) * sc, false); } // back fronds, in shadow
    for (let k = 0; k < fronds + 2; k++) { const a = -0.35 + (Math.PI + 0.7) * k / (fronds + 1) + (r() - 0.5) * 0.15; frond(a, (28 + r() * 10) * sc, true); }
    for (const [dx, dy, cc] of [[-2, 3, '#5c3424'], [2, 4, '#5c3424'], [0, 6, o.nut || '#7cbf3f'], [3, 1, '#8a5232']]) { p.circle(tx + dx, ty + dy, 2, cc); p.px(tx + dx - 1, ty + dy - 1, sh(cc, 0.25)); }
  };
  // wet sand strip with a static foam rim (the rolling surf is the "surf" ambient)
  PR.shore = (p, o, r) => fullE(p, () => {
    const y = o.y, h = o.h || 10, c = o.color || '#b8773f';
    p.ditherV(0, y, LW, h, sh(c, -0.12), c, 3);
    for (let x = 0; x < LW; x++) { const yy = y + Math.round(Math.sin(x * 0.11) * 1.5 + Math.sin(x * 0.037) * 2); p.px(x, yy, '#f2efe6'); if (r() < 0.3) p.px(x, yy + 1, 'rgba(242,239,230,0.6)'); if (r() < 0.05) p.px(x, yy + 3, '#d8d2c4'); }
  });
  // wrecked wooden boat lying tilted on the sand: planks, a hole with ribs, a broken mast and a torn sail
  PR.wreck = (p, o) => {
    const x = o.x, y = o.y, w = o.w || 86, c = o.color || '#8a5232', d = sh(c, -0.2), l = sh(c, 0.14), dark = '#3b1f1a';
    p.poly([[x - w / 2 - 4, y + 2], [x + w / 2 + 6, y + 2], [x + w / 2 - 2, y - 3], [x - w / 2 + 6, y - 2]], 'rgba(59,31,26,0.45)'); // shadow on sand
    p.poly([[x - w / 2, y - 15], [x + w / 2, y - 22], [x + w / 2 - 9, y], [x - w / 2 + 12, y + 1]], c);
    for (let k = 1; k <= 3; k++) { const f = k / 4; p.line(x - w / 2 + 3 + f * 9, y - 15 + f * 16, x + w / 2 - 2 - f * 9, y - 22 + f * 22, d); }
    p.line(x - w / 2, y - 15, x + w / 2, y - 22, l); p.line(x - w / 2, y - 16, x + w / 2, y - 23, sh(l, 0.1));
    p.poly([[x + w * 0.12, y - 17], [x + w * 0.34, y - 20], [x + w * 0.3, y - 6], [x + w * 0.16, y - 4]], dark);
    for (let k = 0; k < 4; k++) p.line(x + w * 0.15 + k * 4, y - 17 - k * 0.6, x + w * 0.17 + k * 3.5, y - 5, d);
    p.rect(x - w / 2 + 2, y - 15, 3, 13, d); // stern post
    const mx = x - 8, my = y - 18; p.line(mx, my, mx + 16, my - 44, '#5c3424'); p.line(mx + 1, my, mx + 17, my - 44, sh('#5c3424', 0.1));
    p.poly([[mx + 14, my - 38], [mx + 34, my - 30], [mx + 28, my - 14], [mx + 20, my - 18], [mx + 8, my - 12]], '#d8d2c4');
    p.poly([[mx + 14, my - 38], [mx + 30, my - 31], [mx + 22, my - 24]], '#f2efe6'); p.rect(mx + 24, my - 24, 3, 2, '#b5b0a5'); p.rect(mx + 18, my - 20, 2, 2, '#b5b0a5');
    p.line(mx + 16, my - 44, x + w / 2 - 4, y - 22, '#d9a35b');
  };
  // S·O·S laid out in stones on the sand (perspective: rows squashed)
  const LETTERS = { S: ['.###', '#...', '.##.', '...#', '###.'], O: ['.##.', '#..#', '#..#', '#..#', '.##.'] };
  PR.sos = (p, o) => {
    const s2 = o.s || 1.3; let x = o.x - 34 * s2; const y = o.y - 12 * s2, sx = 4 * s2, sy = 2.6 * s2;
    for (const ch of 'SOS') { LETTERS[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v !== '#') return; const px = Math.round(x + i * sx), py = Math.round(y + j * sy); p.rect(px, py, 4, 3, '#8c8a86'); p.rect(px, py, 3, 1, '#d8d2c4'); p.px(px + 3, py + 2, '#5f5d5a'); p.rect(px, py + 3, 4, 1, 'rgba(59,31,26,0.4)'); })); x += 5 * sx + 6 * s2; }
  };
  // castaway hut (front view): A-frame thatched roof of palm leaves, a dark doorway, bamboo posts, a water bottle hanging by the door
  PR.hut = (p, o) => {
    const x = o.x, y = o.y, w = o.w || 50, c = o.color || '#d9a35b', h = o.h || 40;
    p.poly([[x - w / 2 - 4, y + 2], [x + w / 2 + 8, y + 2], [x + w / 2 + 4, y - 2], [x - w / 2, y - 2]], 'rgba(59,31,26,0.45)');
    p.rect(x - w / 2 + 3, y - h * 0.42, w - 6, h * 0.42, '#8a5232'); for (let xx = x - w / 2 + 3; xx < x + w / 2 - 3; xx += 4) { p.rect(xx, y - h * 0.42, 1, h * 0.42, '#5c3424'); p.px(xx + 1, y - h * 0.42 + 1, '#b8773f'); }
    p.poly([[x - 7, y], [x - 7, y - h * 0.36], [x, y - h * 0.48], [x + 7, y - h * 0.36], [x + 7, y]], '#231f33'); p.rect(x - 6, y - 2, 12, 2, '#3b1f1a');
    const ax = x, ay = y - h; const L = [x - w / 2 - 6, y - h * 0.38], R = [x + w / 2 + 6, y - h * 0.38];
    p.poly([[ax, ay], R, L], sh(c, -0.1));
    for (let k = 0; k < 7; k++) { const u = (k + 1) / 8; const yl = ay + (L[1] - ay) * u; const half = (R[0] - L[0]) / 2 * u; for (let xx = ax - half; xx <= ax + half; xx += 3) { const side = xx < ax; p.line(xx, yl, xx + (side ? -1 : 1), yl + 4, side ? (k % 2 ? c : sh(c, 0.12)) : (k % 2 ? sh(c, -0.16) : sh(c, -0.06))); } }
    p.line(ax, ay, L[0], L[1], sh(c, 0.2)); p.line(ax, ay, R[0], R[1], sh(c, -0.25)); p.line(ax - 1, ay - 2, ax + 1, ay - 2, '#5c3424'); p.line(ax, ay - 3, ax + 3, ay - 6, '#5c3424');
    for (const ex of [L[0] + 2, R[0] - 2]) for (let k = 0; k < 3; k++) p.line(ex + (k - 1) * 2, L[1], ex + (k - 1) * 3, L[1] + 4 + k, k % 2 ? '#3f7a2e' : '#7cbf3f');
    p.rect(x + 9, y - h * 0.34, 3, 6, '#8fd3ff'); p.px(x + 9, y - h * 0.34, '#ffffff'); p.line(x + 10, y - h * 0.4, x + 10, y - h * 0.35, '#d9a35b');
  };
  // campfire base (stone ring + crossed logs + embers); the flame itself is the "flame" ambient
  PR.campfire = (p, o) => {
    const x = o.x, y = o.y;
    for (let k = 0; k < 7; k++) { const a = Math.PI * (k / 6); const sx = Math.round(x + Math.cos(a) * 9), sy = Math.round(y - 1 + Math.sin(a) * 2); p.rect(sx - 2, sy - 2, 4, 3, '#5f5d5a'); p.rect(sx - 2, sy - 2, 3, 1, '#8c8a86'); }
    p.line(x - 7, y - 1, x + 6, y - 5, '#5c3424'); p.line(x - 6, y - 5, x + 7, y - 1, '#8a5232'); p.line(x - 6, y - 4, x + 6, y - 2, '#3b1f1a');
    for (const [dx, dy] of [[-2, -2], [1, -3], [3, -2], [0, -1]]) p.glow(x + dx, y + dy, 1, 1, '#ff8a4c');
  };
  PR.coconuts = (p, o, r) => { for (let k = 0; k < (o.n || 3); k++) { const cx = o.x + k * 7 - (o.n || 3) * 3 + Math.round(r() * 2), cy = o.y - 3 + (k % 2); const cc = k === 1 ? '#3f7a2e' : '#5c3424'; p.circle(cx, cy, 3, cc); p.circle(cx - 1, cy - 1, 1, sh(cc, 0.25)); p.px(cx + 1, cy + 1, sh(cc, -0.2)); p.rect(cx - 3, cy + 3, 7, 1, 'rgba(59,31,26,0.35)'); } };
  // little shells, starfish and pebbles scattered over a strip (near layer)
  PR.shells = (p, o, r) => { const w = o.w || 120; for (let k = 0; k < (o.n || 8); k++) { const x = o.x - w / 2 + r() * w, y = o.y + r() * 10; const t = r();
    if (t < 0.25) { const c = '#ff8a4c'; p.px(x, y - 2, c); p.rect(x - 2, y, 5, 1, c); p.px(x - 1, y + 1, c); p.px(x + 1, y + 1, c); p.px(x, y - 1, c); p.px(x, y, '#ffc14a'); }
    else if (t < 0.6) { p.rect(x - 1, y, 3, 2, '#f2efe6'); p.px(x - 1, y + 1, '#d8d2c4'); p.px(x + 1, y, '#ffffff'); } else { p.rect(x, y, 2, 1, '#8c8a86'); p.px(x, y, '#b5b0a5'); } } };
  // beach floor life: wind ripples, damp patches, a seaweed line, a footprint trail (fills the sand under the actors)
  PR.sanddetail = (p, o, r) => fullE(p, () => {
    const y0 = o.y0, y1 = o.y1 || H, c = o.color || '#f2d38a';
    for (let k = 0; k < (o.patches || 6); k++) { const cx = r() * LW, cy = y0 + 10 + r() * (y1 - y0 - 20), rw = 14 + r() * 30, rh = 3 + r() * 5; for (let yy = -rh; yy <= rh; yy++) for (let xx = -rw; xx <= rw; xx++) if ((xx * xx) / (rw * rw) + (yy * yy) / (rh * rh) < 1 && ((xx + yy) & 1)) p.px(cx + xx, cy + yy, sh(c, -0.1)); }
    for (let yy = y0 + 6, gap = 5; yy < y1; yy += gap, gap = Math.min(16, gap + 1.5)) { const ph = r() * 6; for (let x = 0; x < LW; x += 2) { if (Math.sin(x * 0.05 + ph + yy) < 0.2) continue; const dy = Math.round(Math.sin(x * 0.09 + ph) * 1.5); p.px(x, yy + dy, sh(c, -0.07)); if ((x & 3) === 0) p.px(x, yy + dy - 1, sh(c, 0.06)); } }
    if (o.weed != null) for (let x = 0; x < LW; x += 1 + Math.floor(r() * 3)) { const yy = o.weed + Math.round(Math.sin(x * 0.07) * 2 + r() * 2); p.px(x, yy, r() < 0.6 ? '#2e5a23' : '#5c3424'); }
    if (o.steps) { const [ax, ay, bx, by] = o.steps; const n = Math.round(Math.hypot(bx - ax, by - ay) / 7); for (let k = 0; k < n; k++) { const u = k / n; const x = ax + M + (bx - ax) * u + (k % 2 ? 2 : -2), y = ay + (by - ay) * u; p.rect(x, y, 3, 2, sh(c, -0.16)); p.px(x, y, sh(c, -0.24)); } }
  });
  PR.driftwood = (p, o) => { const x = o.x, y = o.y, w = o.w || 34; p.poly([[x - w / 2, y - 3], [x + w / 2, y - 6], [x + w / 2 + 2, y - 3], [x - w / 2 + 2, y]], '#b5b0a5'); p.line(x - w / 2, y - 3, x + w / 2, y - 6, '#d8d2c4'); p.line(x - w / 2 + 3, y - 1, x + w / 2 - 2, y - 4, '#8c8a86'); p.line(x + 4, y - 5, x + 9, y - 11, '#b5b0a5'); p.px(x + 9, y - 11, '#d8d2c4'); p.rect(x - w / 2, y, w, 1, 'rgba(59,31,26,0.35)'); };
  PR.bottle = (p, o) => { const x = o.x, y = o.y; p.poly([[x - 6, y - 2], [x + 3, y - 5], [x + 4, y - 2], [x - 5, y + 1]], '#24605a'); p.line(x - 5, y - 2, x + 3, y - 5, '#6fd6b0'); p.rect(x + 4, y - 5, 3, 2, '#2f9c86'); p.rect(x + 7, y - 5, 2, 2, '#8a5232'); p.rect(x - 3, y - 3, 4, 2, '#f2efe6'); p.px(x - 2, y - 3, '#d8d2c4'); };
  // jungle floor: fern tufts, roots, pebbles, purple-lit near the portal (o.rimx)
  PR.undergrowth = (p, o, r) => fullE(p, () => {
    const y0 = o.y0, y1 = o.y1 || H, c = o.color || '#24605a', rim = o.rim || '#9b5de5', rx = o.rimx != null ? o.rimx + M : null;
    for (let i = 0; i < (o.count || 60); i++) { const x = r() * LW, y = y0 + Math.pow(r(), 1.4) * (y1 - y0); const f = (y - y0) / (y1 - y0); const near = rx != null && Math.abs(x - rx) < 70 - f * 20;
      const col = mix(c, '#0b0a12', 0.15 + r() * 0.35); const n = 3 + Math.floor(r() * 4), hh = 3 + f * 9 + r() * 4;
      for (let k = 0; k < n; k++) { const dx = (k - (n - 1) / 2) * (1.5 + f); p.line(x, y, x + dx * 1.6, y - hh + Math.abs(dx), col); if (near) p.px(x + dx * 1.6 + (rx > x ? 1 : -1), y - hh + Math.abs(dx), rim); } }
    for (let i = 0; i < (o.pebbles || 18); i++) { const x = r() * LW, y = y0 + r() * (y1 - y0); const near = rx != null && Math.abs(x - rx) < 60; p.rect(x, y, 3, 2, '#3d3a5c'); p.px(x + (near && rx > x ? 2 : 0), y, near ? rim : '#545577'); }
    for (let k = 0; k < (o.roots || 3); k++) { let x = r() * LW, y = y0 + r() * 10; for (let s = 0; s < 40; s++) { x += 1.5; y += Math.sin(s * 0.3 + k) * 0.8 + 0.25; p.px(x, y, '#3b1f1a'); p.px(x, y - 1, s % 4 ? '#3b1f1a' : '#5c3424'); } }
  });
  PR.beachgrass = (p, o, r) => { for (let k = 0; k < (o.n || 5); k++) { const x = o.x + k * 4 - (o.n || 5) * 2, y = o.y; for (let b = -2; b <= 2; b++) { const hh = 5 + Math.round(r() * 6); p.line(x, y, x + b * 2, y - hh, b % 2 ? '#7cbf3f' : '#3f7a2e'); } } };

  // Pratumnak hill with the white PATTAYA CITY letters on its slope, a few towers and palms at its foot (o.y = waterline)
  PR.signhill = (p, o, r) => {
    const x = o.x, y = o.y, w = o.w || 120, h = o.h || 46, c = o.color || '#2e5a23'; const pts = [];
    for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push([x - w / 2 + t * w, y - h * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8) * (1 + 0.08 * Math.sin(t * 17))]); }
    pts.push([x + w / 2, y], [x - w / 2, y]); p.poly(pts, c);
    for (let k = 0; k < 70; k++) { const t = r(), xx = x - w / 2 + t * w, top = y - h * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8); const yy = top + 2 + r() * (y - top - 2); p.px(xx, yy, r() < 0.5 ? sh(c, 0.12) : sh(c, -0.1)); }
    p.text(o.text || 'PATTAYA CITY', x - w * 0.06, y - h * 0.52, o.size || 7, '#f2efe6', { weight: 700 });
    for (let k = 0; k < 5; k++) { const bx = x - w / 2 + 6 + k * 9, bh = 8 + (k * 7) % 11; p.rect(bx, y - bh, 6, bh, k % 2 ? '#d8d2c4' : '#b3b9d1'); for (let yy = y - bh + 2; yy < y - 1; yy += 2) p.rect(bx + 1, yy, 4, 1, '#7a7fa3'); }
  };
  // speed on the water: foam streaks rushing past (o.y0..o.y1) and a white wake trailing the boat from o.x leftwards at o.y
  A.wake = (ctx, a, e) => { if (e.which !== 'back') return; const R = e.rnd; const P1 = S.period(a.period || 0.8, e.L);
    for (let i = 0; i < (a.count || 26); i++) { const y = Math.round(a.y0 + Math.pow(R(), 0.8) * (a.y1 - a.y0)), ph = R(), sp = R() < 0.5 ? 1 : 2, len = 4 + Math.round(R() * 10 * (y - a.y0) / (a.y1 - a.y0 + 1));
      const u = LSE.frac(e.t * sp / P1 + ph, 1); const x = Math.round(W + 20 - u * (W + 60)); ctx.fillStyle = R() < 0.6 ? 'rgba(242,239,230,0.75)' : 'rgba(143,211,255,0.7)'; ctx.fillRect(x, y, len, 1); }
    const ph2 = TAU * (LSE.tick(e.t, e.beat / 4) % 8) / 8; // churn on the 16ths so the loop closes
    if (a.x != null) { for (let k = 0; k < 70; k++) { const xx = a.x - k * 2, wob = Math.round(Math.sin(k * 0.6 - ph2) * (1 + k / 30)); const spread = Math.round(k / 12);
      ctx.fillStyle = k % 3 ? '#f2efe6' : '#8fd3ff'; ctx.fillRect(xx, a.y + wob - spread, 2, 1); ctx.fillRect(xx, a.y + wob + spread + 1, 2, 1); if (k < 20 && (k + LSE.tick(e.t, e.beat / 4)) % 4 === 0) ctx.fillRect(xx - 1, a.y - 2 - (k % 4), 1, 1); } } };
  // spray bursting off the bow in little arcs (front)
  A.spray = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 0.5, e.L);
    for (let i = 0; i < (a.count || 16); i++) { const ph = R(), vx = 0.4 + R() * 1.2, vy = 1 + R() * 1.4; const u = LSE.frac(e.t / P1 + ph, 1); const x = Math.round(a.x + vx * u * 26), y = Math.round(a.y - vy * u * 22 + u * u * 30);
      ctx.globalAlpha = 1 - u; ctx.fillStyle = R() < 0.5 ? '#ffffff' : '#8fd3ff'; ctx.fillRect(x, y, u < 0.3 ? 2 : 1, 1); } ctx.globalAlpha = 1; };
  // a parasail drifting across the sky: canopy, lines and a dangling rider, towed by a tiny boat on the horizon
  A.parasail = (ctx, a, e) => { if (e.which !== 'sky') return; const P1 = S.period(a.period || 24, e.L); const u = LSE.frac(e.t, P1); const x = Math.round(-30 + u * (W + 60)), y = a.y + Math.round(Math.sin(u * TAU * 2) * 3);
    const cols = a.colors || ['#e0533f', '#ffe66b', '#2253a3', '#f2efe6']; for (let k = 0; k < 8; k++) { ctx.fillStyle = cols[k % cols.length]; const xx = x - 8 + k * 2; const top = y - Math.round(Math.sin(Math.PI * (k + 0.5) / 8) * 5); ctx.fillRect(xx, top, 2, 3); }
    ctx.fillStyle = 'rgba(22,20,31,0.6)'; for (let k = 0; k < 9; k++) { ctx.fillRect(x - 7 + k, y + 3 + Math.round(k * 0.4), 1, 1); ctx.fillRect(x + 7 - k, y + 3 + Math.round(k * 0.4), 1, 1); }
    ctx.fillStyle = '#16141f'; ctx.fillRect(x - 1, y + 8, 2, 3); ctx.fillStyle = '#ffc14a'; ctx.fillRect(x - 1, y + 7, 2, 1);
    ctx.fillStyle = 'rgba(22,20,31,0.35)'; const bx = x + 60, by = a.boatY || 212; for (let k = 0; k <= 30; k++) { const t2 = k / 30; ctx.fillRect(Math.round(x + (bx - x) * t2), Math.round(y + 11 + (by - y - 11) * t2), 1, 1); } ctx.fillStyle = '#f2efe6'; ctx.fillRect(bx - 3, by - 1, 7, 2); };

  // ---------- jungle & portal ----------
  // night jungle foliage: banana leaves, fern fans and bushes; o.rimx lights the leaf edges facing the portal (o.rim colour)
  PR.jungle = (p, o, r) => fullE(p, () => {
    const y = o.y, h = o.h || 90, c = o.color || '#14261c', c2 = o.color2 || '#1b3a3a', rim = o.rim || '#9b5de5', rx = o.rimx != null ? o.rimx + M : null;
    const side = o.side || 'both'; const inSide = (x) => side === 'both' || (side === 'left' ? x < LW * 0.42 : x > LW * 0.58);
    const leaf = (x0, y0, ang, L, wd, col) => { const pts = [], back = []; for (let k = 0; k <= 8; k++) { const u = k / 8, wv = Math.sin(Math.PI * u) * wd; const cx = x0 + Math.cos(ang) * L * u, cy = y0 + Math.sin(ang) * L * u + u * u * L * 0.25; pts.push([cx - Math.sin(ang) * wv, cy + Math.cos(ang) * wv]); back.unshift([cx + Math.sin(ang) * wv, cy - Math.cos(ang) * wv]); }
      const poly = pts.concat(back); if (rx != null) { const dx = rx > x0 ? 1 : -1; p.poly(poly.map(([a, b]) => [a + dx, b - 1]), rim); } p.poly(poly, col); p.line(x0, y0, x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L + L * 0.25, sh(col, 0.1)); };
    for (let i = 0; i < (o.count || 26); i++) { const x = r() * LW; if (!inSide(x)) continue; const yy = y - r() * h * 0.7; const t = r(); const col = mix(c, c2, r());
      if (t < 0.5) { for (let k = 0; k < 3; k++) leaf(x, yy, -Math.PI / 2 + (k - 1) * 0.7 + (r() - 0.5) * 0.3, 18 + r() * 16, 4 + r() * 3, col); }
      else if (t < 0.8) { for (let k = 0; k < 6; k++) leaf(x, yy + 10, -Math.PI / 2 + (k - 2.5) * 0.32, 14 + r() * 10, 1.6, col); }
      else { for (let k = 0; k < 4; k++) { const bx = x + (r() - 0.5) * 16, by = yy + 8 + r() * 6, br = 5 + r() * 5; if (rx != null) p.circle(bx + (rx > bx ? 1 : -1), by - 1, br, rim); p.circle(bx, by, br, col); } } }
    p.rect(0, y, LW, H - y, c);
  });
  // a hovering warp ring: dark core, glowing double rim, floating rune stones and a pool of light on the ground (o.y = centre)
  PR.portal = (p, o, r) => {
    const x = o.x, y = o.y, rad = o.r || 30, c = o.color || '#c77dff', c2 = o.color2 || '#4ff0ff', core = o.core || '#2a1440';
    if (o.ground) { for (let yy = -4; yy <= 4; yy++) for (let xx = -rad - 10; xx <= rad + 10; xx++) if ((xx * xx) / ((rad + 10) * (rad + 10)) + (yy * yy) / 16 <= 1 && ((xx + yy) & 1)) p.px(x + xx, o.ground + yy, mix(c, '#0b0a12', 0.55 + 0.4 * Math.abs(xx) / (rad + 10))); }
    for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) { const d = Math.sqrt(xx * xx + yy * yy * 1.15); if (d <= rad - 2) p.px(x + xx, y + yy, mix(core, '#5b2a86', Math.max(0, 1 - d / rad) * 0.9)); }
    for (let a = 0; a < TAU; a += 0.02) { const ex = x + Math.cos(a) * rad, ey = y + Math.sin(a) * rad / 1.07; p.glow(ex, ey, 1, 1, c); p.glow(x + Math.cos(a) * (rad - 2), y + Math.sin(a) * (rad - 2) / 1.07, 1, 1, c2); if (Math.sin(a * 3) > 0.6) p.glow(x + Math.cos(a) * (rad + 1), y + Math.sin(a) * (rad + 1) / 1.07, 1, 1, '#ffffff'); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2, sx = Math.round(x + Math.cos(a) * (rad + 7)), sy = Math.round(y + Math.sin(a) * (rad + 7) / 1.07); p.rect(sx - 2, sy - 2, 4, 4, '#3d3a5c'); p.rect(sx - 2, sy - 2, 4, 1, '#7a7fa3'); p.glow(sx - 1, sy, 2, 1, c2); }
  };

  // a soft pool of coloured light on the ground (portal glow, fire) — dithered, brightest at the centre
  PR.lightpool = (p, o) => { const x = o.x, y = o.y, rx = o.rx || 50, ry = o.ry || 9, c = o.color || '#9b5de5';
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) { const e = (xx * xx) / (rx * rx) + (yy * yy) / (ry * ry); if (e > 1) continue; const b = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][((yy + 64) & 3) * 4 + ((xx + 64) & 3)] / 16; if (b < (1 - e) * 0.85) p.px(x + xx, y + yy, e < 0.25 ? sh(c, 0.12) : c); } };
  // ---------- warp tunnel ----------
  PR.tunnel = (p, o) => fullE(p, () => {
    const cx = (o.x ?? 135) + M, cy = o.y ?? 200; const cols = o.colors || ['#0b0a12', '#16141f', '#2a1440', '#5b2a86', '#9b5de5', '#c77dff', '#fff6c2'];
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < LW; xx++) { const d = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) * 0.6); const f = Math.max(0, 1 - d / 260); const band = f * (cols.length - 1); const b0 = Math.floor(band); const fr = band - b0;
      const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(yy & 3) * 4 + (xx & 3)] / 16; p.px(xx, yy, cols[Math.min(cols.length - 1, fr > bay ? b0 + 1 : b0)]); }
  });

  // ---------- the Moon ----------
  // Earth hanging in the black sky: oceans, continents, clouds, a night side with city lights and a thin blue atmosphere
  PR.earth = (p, o) => {
    const x = o.x, y = o.y, R = o.r || 26, seed = o.seed || 3.1; const L = [-0.62, -0.5, 0.6];
    for (let yy = -R - 2; yy <= R + 2; yy++) for (let xx = -R - 2; xx <= R + 2; xx++) {
      const d2 = xx * xx + yy * yy; if (d2 > (R + 2) * (R + 2)) continue;
      if (d2 > R * R) { const nx = xx / R, ny = yy / R; if (nx * L[0] + ny * L[1] > -0.1 && ((xx + yy) & 1 || d2 <= (R + 1) * (R + 1))) p.glow(x + xx, y + yy, 1, 1, d2 <= (R + 1) * (R + 1) ? '#8fd3ff' : '#3e8de0'); continue; }
      const nx = xx / R, ny = yy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); const lit = nx * L[0] + ny * L[1] + nz * L[2];
      const lon = Math.atan2(nx, nz) * 9, lat = ny * 14; const land = noise(lon * 3, lat * 3, seed) + 0.15 * Math.sin(lat * 0.9); const cloud = noise(lon * 4 + 40, lat * 6, seed + 9);
      let col = land > 0.12 ? (Math.abs(ny) > 0.82 ? '#f2efe6' : land > 0.35 ? '#d9a35b' : land > 0.22 ? '#7cbf3f' : '#2f9c86') : (land > 0.02 ? '#3e8de0' : '#2253a3');
      if (Math.abs(ny) > 0.9) col = '#f2efe6'; if (cloud > 0.3) col = cloud > 0.45 ? '#ffffff' : mix(col, '#f2efe6', 0.6);
      const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][((yy + 64) & 3) * 4 + ((xx + 64) & 3)] / 16;
      if (lit < -0.05) { col = mix(col, '#0b0a12', 0.82); if (land > 0.18 && cloud < 0.2 && ((xx * 7 + yy * 13) % 11 === 0)) { p.glow(x + xx, y + yy, 1, 1, '#ffc14a'); continue; } }
      else if (lit < 0.12) col = mix(col, '#0b0a12', lit < 0.03 + bay * 0.09 ? 0.55 : 0.25); else if (lit > 0.75) col = sh(col, 0.06);
      p.px(x + xx, y + yy, col);
    }
  };
  // rugged lunar horizon: grey ridges with crater dips, lit from the left
  PR.moonhills = (p, o, r) => fullE(p, () => {
    const y = o.y, amp = o.amp || 22, c = o.color || '#545577', lit = o.lite || sh(c, 0.18), dk = sh(c, -0.12); const ph = [r() * 6, r() * 6, r() * 6];
    let prev = null;
    for (let x = 0; x < LW; x++) { let v = Math.sin(x * 0.018 + ph[0]) * 0.55 + Math.sin(x * 0.047 + ph[1]) * 0.3 + Math.abs(Math.sin(x * 0.11 + ph[2])) * 0.25; const top = Math.round(y - (v * 0.5 + 0.5) * amp);
      p.rect(x, top, 1, H - top, c); if (prev != null && top <= prev) p.px(x, top, lit); else p.px(x, top, dk); if (prev != null && top < prev - 1) p.rect(x, top, 1, prev - top, lit); prev = top; }
    for (let k = 0; k < (o.craters || 5); k++) { const cx = r() * LW, cy = y + 4 + r() * 10, w = 8 + r() * 14; for (let xx = -w / 2; xx <= w / 2; xx++) { const dd = Math.round(Math.sqrt(1 - (2 * xx / w) ** 2) * 2); p.rect(cx + xx, cy - dd, 1, dd + 1, xx < 0 ? dk : lit); } }
  });
  // one crater: dark bowl, the far (sun-facing) inner wall lit, a bright rim
  PR.crater = (p, o) => {
    const x = o.x, y = o.y, w = o.w || 30, h = o.h || 7, c = o.color || '#7a7fa3';
    for (let yy = -h; yy <= h; yy++) for (let xx = -w; xx <= w; xx++) { const e = (xx * xx) / (w * w) + (yy * yy) / (h * h); if (e > 1) continue; const inner = e < 0.78;
      p.px(x + xx, y + yy, !inner ? (yy < 0 ? sh(c, 0.2) : sh(c, 0.08)) : xx > w * 0.15 ? mix(c, '#3d3a5c', 0.15) : xx > -w * 0.25 ? mix(c, '#3d3a5c', 0.5) : mix(c, '#2f2a47', 0.72)); }
    p.rect(x + w * 0.35, y - h + 2, w * 0.3, 1, sh(c, 0.28));
  };
  // lunar ground: regolith speckle + scattered small craters (full width, drawn over the ground band from o.y0 to the bottom)
  PR.regolith = (p, o, r) => fullE(p, () => {
    const y0 = o.y0, c = o.color || '#7a7fa3';
    for (let i = 0; i < LW * 4; i++) { const yy = y0 + Math.pow(r(), 1.2) * (H - y0), xx = r() * LW; p.px(xx, yy, r() < 0.5 ? sh(c, -0.12) : sh(c, 0.1)); }
    for (let k = 0; k < (o.craters || 10); k++) { const yy = y0 + 6 + Math.pow(r(), 0.8) * (H - y0 - 10), f = (yy - y0) / (H - y0); PR.crater(p, { x: r() * LW, y: yy, w: 4 + f * 20 + r() * 6, h: 1 + f * 4 + r() * 2, color: c }); }
  });
  // boulder with lit top-left facets, a dark underside and a hard black shadow (no air to soften it)
  PR.boulder = (p, o, r) => {
    const x = o.x, y = o.y, s = o.s || 1, c = o.color || '#8c8a86'; const pts = []; const n = 9;
    for (let k = 0; k < n; k++) { const a = Math.PI + k / (n - 1) * Math.PI; const rr = (9 + r() * 5) * s; pts.push([x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 0.85]); }
    p.poly([[x - 2 * s, y], [x + 30 * s, y + 1], [x + 26 * s, y + 4 * s], [x, y + 3 * s]], '#0b0a12');
    p.poly(pts.concat([[x + 12 * s, y], [x - 12 * s, y]]), c);
    p.poly([[x - 8 * s, y - 9 * s], [x + 2 * s, y - 12 * s], [x - 2 * s, y - 4 * s]], sh(c, 0.2)); p.poly([[x + 4 * s, y - 2 * s], [x + 12 * s, y - 4 * s], [x + 11 * s, y], [x + 2 * s, y]], sh(c, -0.22));
    p.px(x - 6 * s, y - 10 * s, sh(c, 0.35)); p.px(x + 5 * s, y - 7 * s, sh(c, -0.15));
  };
  PR.footprints = (p, o) => { const n = o.n || 8, c = o.color || '#3d3a5c'; for (let k = 0; k < n; k++) { const u = k / Math.max(1, n - 1); const x = Math.round(o.x0 + (o.x1 - o.x0) * u), y = Math.round(o.y0 + ((o.y1 ?? o.y0) - o.y0) * u) + (k % 2 ? 3 : 0); p.rect(x, y, 4, 2, c); p.rect(x + 1, y, 2, 1, sh(c, 0.12)); } };

  // ---------- ambient life ----------
  // surf rolling up the wet sand and back (o.y = shore line, amp = how far it runs up)
  A.surf = (ctx, a, e) => { if (e.which !== 'back') return; const P1 = S.period(a.period || 3.2, e.L);
    for (let w = 0; w < 2; w++) { const u = LSE.frac(e.t / P1 + w * 0.5, 1); const k = Math.sin(Math.PI * Math.min(1, u * 1.6)); if (u > 0.62) continue; const yy = a.y + Math.round(k * (a.amp || 7));
      for (let x = 0; x < W; x++) { const y2 = yy + Math.round(Math.sin(x * 0.09 + w * 2 + u * 3) * 1.4); if (((x + w * 3) % 23) < 2) continue; ctx.fillStyle = '#f2efe6'; ctx.fillRect(x, y2, 1, 1); if ((x + w) % 3 === 0) { ctx.fillStyle = 'rgba(95,201,214,0.55)'; ctx.fillRect(x, y2 - 1, 1, 1); } if (x % 7 === 0 && u < 0.3) { ctx.fillStyle = 'rgba(242,239,230,0.6)'; ctx.fillRect(x, y2 + 2, 1, 1); } } } };
  // twinkling sun glitter over a patch of water (glow pass)
  A.glitter = (ctx, a, e) => { if (e.which !== 'glow') return; const R = e.rnd; for (let i = 0; i < (a.count || 18); i++) { const x = Math.round((a.x0 ?? 0) + R() * ((a.x1 ?? W) - (a.x0 ?? 0)) - e.camX * (a.k ?? 0.25)), y = Math.round(a.y0 + R() * (a.y1 - a.y0)), ph = Math.floor(R() * 8);
    if ((LSE.tick(e.t, e.beat / 2) + ph) % 8 > 1) continue; ctx.fillStyle = a.color || '#fff6c2'; ctx.fillRect(x, y, 2, 1); if (ph % 2) { ctx.fillRect(x, y - 1, 1, 3); } } };
  // campfire flame: three nested tongues flickering on the 16ths + rising sparks (back + glow)
  A.flame = (ctx, a, e) => { if (e.which !== 'back' && e.which !== 'glow') return; const x = Math.round(a.x - e.camX * (a.k ?? 1)), y = a.y, s = a.s || 1; const f = LSE.tick(e.t, e.beat / 4) % 4;
    const tongue = (hh, ww, c, dx) => { ctx.fillStyle = c; for (let k = 0; k < hh; k++) { const wv = Math.max(1, Math.round(ww * (1 - k / hh) * (k < 2 ? 0.8 : 1))); ctx.fillRect(x + dx - (wv >> 1) + ((k + f) % 3 === 0 ? (f % 2 ? 1 : -1) : 0), y - 3 - k, wv, 1); } };
    tongue((10 + [0, 2, 1, 3][f]) * s, 8 * s, '#e0533f', 0); tongue((7 + [1, 0, 2, 1][f]) * s, 5 * s, '#ff8a4c', [0, 1, 0, -1][f]); tongue((4 + [0, 1, 1, 0][f]) * s, 3 * s, '#ffe66b', 0); tongue(2, 1, '#fff6c2', 0);
    if (e.which === 'glow') { const P1 = S.period(a.period || 1.6, e.L); const R = e.rnd; for (let i = 0; i < 5; i++) { const ph = R(), dx = (R() - 0.5) * 10; const u = LSE.frac(e.t / P1 + ph, 1); ctx.fillStyle = u < 0.5 ? '#ffc14a' : '#e0533f'; ctx.fillRect(Math.round(x + dx + Math.sin(u * 9 + i) * 2), Math.round(y - 12 - u * 28), 1, 1); } } };
  // a red crab scuttling sideways in bursts along the sand
  A.crab = (ctx, a, e) => { if (e.which !== 'back') return; const P1 = S.period(a.period || 7, e.L); const u = LSE.frac(e.t, P1); const m = LSE.clamp((u - 0.15) / 0.3, 0, 1), back = LSE.clamp((u - 0.6) / 0.3, 0, 1); const k = m - back;
    const x = Math.round(a.x0 + (a.x1 - a.x0) * k - e.camX * (a.k ?? 1)), y = a.y; const leg = LSE.tick(e.t, e.beat / 4) % 2 && m > 0 && back < 1 ? 1 : 0; const c = a.color || '#e0533f';
    ctx.fillStyle = c; ctx.fillRect(x - 3, y - 4, 7, 3); ctx.fillStyle = sh(c, 0.2); ctx.fillRect(x - 2, y - 4, 5, 1); ctx.fillStyle = c; ctx.fillRect(x - 5, y - 6, 2, 2); ctx.fillRect(x + 4, y - 6, 2, 2);
    ctx.fillStyle = '#0b0a12'; ctx.fillRect(x - 1, y - 6, 1, 1); ctx.fillRect(x + 1, y - 6, 1, 1); ctx.fillStyle = sh(c, -0.2); for (const dx of [-3, -1, 1, 3]) ctx.fillRect(x + dx + (leg ? (dx < 0 ? -1 : 1) : 0), y - 1, 1, 1); };
  // the portal's swirl: spiral arms turning inside the ring + sparks orbiting outside (glow pass), a slow pulse on the core
  A.portal = (ctx, a, e) => { if (e.which !== 'glow' && e.which !== 'back') return; const x = a.x - e.camX * (a.k ?? 0.55), y = a.y, rad = a.r || 30; const P1 = S.period(a.period || 2.4, e.L); const rot = TAU * e.t / P1;
    if (e.which === 'back') { const pulse = 0.18 + 0.12 * Math.sin(TAU * e.t / P1); ctx.globalAlpha = pulse; ctx.fillStyle = '#9b5de5'; for (let yy = -rad + 3; yy <= rad - 3; yy++) for (let xx = -rad + 3; xx <= rad - 3; xx++) if (xx * xx + yy * yy * 1.15 < (rad - 3) * (rad - 3) && ((xx + yy) & 1)) ctx.fillRect(Math.round(x + xx), y + yy, 1, 1); ctx.globalAlpha = 1; return; }
    const cols = ['#ffffff', '#4ff0ff', '#c77dff', '#9b5de5'];
    for (let arm = 0; arm < 4; arm++) for (let s = 0.08; s < 1; s += 0.035) { const ang = s * TAU * 1.15 + rot + arm * TAU / 4; const rr = s * (rad - 3); ctx.fillStyle = cols[Math.min(3, Math.floor(s * 4))]; ctx.fillRect(Math.round(x + Math.cos(ang) * rr), Math.round(y + Math.sin(ang) * rr / 1.07), s < 0.5 ? 2 : 1, 1); }
    for (let k = 0; k < 10; k++) { const ang = -rot * 0.6 + k / 10 * TAU; const rr = rad + 3 + ((k * 7) % 5); if ((LSE.tick(e.t, e.beat / 2) + k) % 4 === 0) continue; ctx.fillStyle = k % 2 ? '#4ff0ff' : '#ffffff'; ctx.fillRect(Math.round(x + Math.cos(ang) * rr), Math.round(y + Math.sin(ang) * rr / 1.07), 1, 1); } };
  // warp tunnel: star streaks rushing out of the centre (back pass), the brightest ones again in the glow pass
  A.warp = (ctx, a, e) => { if (e.which !== 'back' && e.which !== 'glow') return; const R = e.rnd; const cx = a.x ?? 135, cy = a.y ?? 200; const P1 = S.period(a.period || 0.9, e.L);
    for (let i = 0; i < (a.count || 90); i++) { const ang = R() * TAU, ph = R(), sp = R() < 0.6 ? 1 : 2, c = R(); // whole-number speeds keep the loop seamless const u = LSE.frac(e.t * sp / P1 + ph, 1); const d0 = 6 + u * u * 260, len = 2 + u * u * 34;
      if (e.which === 'glow' && c < 0.6) continue; ctx.fillStyle = c < 0.4 ? '#c77dff' : c < 0.7 ? '#4ff0ff' : '#ffffff'; const n = Math.round(len);
      for (let k = 0; k < n; k++) { const dd = d0 + k; ctx.fillRect(Math.round(cx + Math.cos(ang) * dd), Math.round(cy + Math.sin(ang) * dd * 0.85), 1, 1); } } };
  // shooting stars across the sky now and then
  A.meteor = (ctx, a, e) => { if (e.which !== 'sky') return; const P1 = S.period(a.period || 5, e.L); const u = LSE.frac(e.t, P1); const span = 0.16; if (u > span) return; const k = u / span;
    const x0 = (a.x || 220), y0 = (a.y || 40); const x = Math.round(x0 - k * 90), y = Math.round(y0 + k * 34); for (let t = 0; t < 10; t++) { ctx.globalAlpha = 1 - t / 10; ctx.fillStyle = t < 2 ? '#ffffff' : '#b3b9d1'; ctx.fillRect(x + t * 2, y - Math.round(t * 0.76), 2, 1); } ctx.globalAlpha = 1; };
  // fine regolith dust kicked up and floating slowly (one-sixth gravity), in front of the actors
  A.lowdust = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 6, e.L);
    for (let i = 0; i < (a.count || 14); i++) { const x0 = (a.x0 ?? 20) + R() * ((a.x1 ?? 250) - (a.x0 ?? 20)), ph = R(); const u = LSE.frac(e.t / P1 + ph, 1); const hgt = Math.sin(Math.PI * u) * (a.h || 18); ctx.globalAlpha = 0.65 * Math.sin(Math.PI * u); ctx.fillStyle = a.color || '#b3b9d1'; ctx.fillRect(Math.round(x0 + u * 10 - e.camX), Math.round(a.y - hgt), 1, 1); } ctx.globalAlpha = 1; };
})(typeof window !== 'undefined' ? window : globalThis);
