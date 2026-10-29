// "Everyone gets wings": shopping-mall plaza, condo tower, a heaven-light cloud hole, broken street bits + smoke / zap / feathers ambients.
(function (G) {
  const LSE = G.LSE; const S = LSE.Scene; const PR = S.prims; const W = S.W, M = S.M; const TAU = Math.PI * 2;
  const sh = (c, k) => LSE.shade(c, k); const mix = (a, b, t) => LSE.mix(a, b, t);
  const A = S.ambientExt;
  const LIT = ['#ffe66b', '#ffc14a', '#fff6c2', '#f2efe6'];

  // ---------- mall ----------
  // big mall facade standing on o.y: concrete frame, a glass curtain wall with lit shop floors behind it, LED name board,
  // entrance canopy with glass doors, hanging banners
  PR.mall = (p, o, r) => {
    const x = o.x ?? 135, y = o.y, w = o.w || 230, h = o.h || 170, x0 = Math.round(x - w / 2), top = y - h;
    const c = o.color || '#d8d2c4', c2 = sh(c, -0.18), c3 = sh(c, -0.34), glass = o.glass || '#1f6f8b', g2 = sh(glass, 0.18), g3 = sh(glass, -0.2);
    p.rect(x0, top, w, h, c); p.rect(x0, top, w, 2, sh(c, 0.12)); p.rect(x0 + w - 3, top, 3, h, c2);
    // glass wall: 4 floors of shops
    const gx = x0 + 10, gw = w - 20, gy = top + 30, gh = h - 62; p.rect(gx, gy, gw, gh, glass);
    const floors = o.floors || 4, fh = Math.floor(gh / floors);
    for (let f = 0; f < floors; f++) {
      const fy = gy + f * fh; p.rect(gx, fy, gw, 2, c3); p.rect(gx, fy + 2, gw, 1, g3);
      for (let xx = gx + 2; xx < gx + gw - 4; xx += 14 + Math.floor(r() * 8)) { // shop fronts lit behind the glass
        const sw = 8 + Math.floor(r() * 6); const lit = LIT[Math.floor(r() * LIT.length)];
        if (r() < 0.75) { p.glow(xx, fy + 4, sw, fh - 7, mix(lit, glass, 0.45)); p.glow(xx + 1, fy + 4, sw - 2, 1, lit); }
        if (r() < 0.5) { p.rect(xx + 2, fy + fh - 6, 2, 3, g3); p.rect(xx + 5, fy + fh - 7, 2, 4, g3); } // shoppers' silhouettes
      }
    }
    for (let xx = gx; xx < gx + gw; xx += 18) p.rect(xx, gy, 1, gh, c3); // mullions
    for (let k = 0; k < 6; k++) { const rx = gx + 8 + k * 36 + Math.floor(r() * 8); for (let yy = 0; yy < gh; yy += 1) if ((yy + k) % 9 < 3) p.px(rx + Math.round(yy * 0.4), gy + yy, g2); } // sky reflection streaks
    // name board
    const bw = Math.min(w - 40, o.signw || 150); const bx = Math.round(x - bw / 2), by = top + 7;
    p.rect(bx - 1, by - 1, bw + 2, 18, '#0b0a12'); p.rect(bx, by, bw, 16, o.signbg || '#231f33');
    if (o.sign) p.text(o.sign, x, by + 13, o.signsize || 13, o.signcolor || '#ffe66b', { glow: true });
    // vertical banners
    for (const [bxx, col] of [[x0 + 3, o.b1 || '#e0533f'], [x0 + w - 9, o.b2 || '#9b5de5']]) { p.rect(bxx, top + 34, 6, 40, col); p.rect(bxx, top + 34, 6, 2, sh(col, 0.25)); p.rect(bxx + 1, top + 74, 4, 2, sh(col, -0.2)); if (o.bannerText) p.text(o.bannerText, bxx + 3, top + 58, 6, '#fff6c2', {}); }
    // entrance canopy + glass doors
    const ew = Math.min(110, w - 60), ex = Math.round(x - ew / 2), ey = y - 26;
    p.rect(ex - 8, ey - 6, ew + 16, 5, c3); p.rect(ex - 8, ey - 6, ew + 16, 1, sh(c, 0.1)); for (let xx = ex - 6; xx < ex + ew + 8; xx += 6) p.glow(xx, ey - 2, 2, 1, '#fff6c2');
    p.rect(ex, ey, ew, 26, g3); for (let xx = ex; xx < ex + ew; xx += 16) { p.glow(xx + 2, ey + 2, 12, 22, mix('#fff6c2', glass, 0.55)); p.rect(xx, ey, 2, 26, c3); }
    p.rect(ex, y - 1, ew, 1, c3);
  };
  // plaza decorations: planter box with shrubs, bench, tiled fountain ring, a parasol stall
  PR.planter = (p, o, r) => { const x = Math.round(o.x - (o.w || 30) / 2), y = o.y, w = o.w || 30, g = o.color || '#3f7a2e';
    p.rect(x, y - 8, w, 8, '#9a958b'); p.rect(x, y - 8, w, 1, '#d8d2c4'); p.rect(x, y - 1, w, 1, '#5f5d5a');
    for (let k = 0; k < w; k += 3) { const hh = 4 + Math.floor(r() * 6); p.rect(x + k, y - 8 - hh, 4, hh, r() < 0.5 ? g : sh(g, 0.15)); p.px(x + k + 1, y - 9 - hh, sh(g, 0.3)); if (r() < 0.2) p.px(x + k + 2, y - 8 - hh + 2, o.flower || '#ff4fa3'); } };
  PR.bench = (p, o) => { const x = Math.round(o.x - 12), y = o.y; p.rect(x, y - 6, 24, 2, '#8a5232'); p.rect(x, y - 6, 24, 1, '#b8773f'); p.rect(x, y - 11, 24, 2, '#8a5232'); p.rect(x + 2, y - 4, 1, 4, '#3d3a5c'); p.rect(x + 21, y - 4, 1, 4, '#3d3a5c'); p.rect(x + 2, y - 11, 1, 5, '#3d3a5c'); p.rect(x + 21, y - 11, 1, 5, '#3d3a5c'); };
  PR.fountain = (p, o) => { const x = o.x, y = o.y, w = o.w || 50; p.rect(x - w / 2, y - 6, w, 6, '#b5b0a5'); p.rect(x - w / 2, y - 6, w, 1, '#e8edf7'); p.rect(x - w / 2 + 2, y - 5, w - 4, 2, '#3e8de0'); p.rect(x - 2, y - 18, 4, 12, '#9a958b'); p.rect(x - 6, y - 19, 12, 2, '#b5b0a5'); };
  PR.parasol = (p, o) => { const x = o.x, y = o.y, c = o.color || '#e0533f'; p.rect(x, y - 26, 1, 26, '#5f5d5a'); p.poly([[x - 16, y - 24], [x, y - 32], [x + 16, y - 24]], c); for (let k = -14; k <= 14; k += 7) p.rect(x + k, y - 24, 3, 1, k % 14 ? '#f2efe6' : sh(c, -0.2));
    p.rect(x - 12, y - 10, 24, 10, o.table || '#f2efe6'); p.rect(x - 12, y - 10, 24, 1, '#ffffff'); if (o.text) p.text(o.text, x, y - 3, 6, '#b52b35', {}); };

  // ---------- condo tower ----------
  // a residential tower seen close: o.floors rows of balconies (glass rail, AC unit, plants, curtains), windows lit at random;
  // o.open = {floor (from the top, 0-based), col}: that room is brightly lit with the curtains open (someone is home)
  PR.condo = (p, o, r) => {
    const x0 = Math.round((o.x ?? 135) - (o.w || 200) / 2), w = o.w || 200, y = o.y, fh = o.fh || 34, floors = o.floors || 8, top = y - fh * floors;
    const c = o.color || '#b3b9d1', c2 = sh(c, -0.2), c3 = sh(c, -0.4), cols = o.cols || 3, cw = Math.floor(w / cols);
    p.rect(x0, top, w, fh * floors, c); p.rect(x0 + w - 3, top, 3, fh * floors, c2);
    for (let f = 0; f < floors; f++) for (let k = 0; k < cols; k++) {
      const fx = x0 + k * cw + 4, fy = top + f * fh, ww = cw - 8; const open = o.open && o.open.floor === f && o.open.col === k;
      const lit = open || r() < (o.litp ?? 0.35); const wc = open ? '#fff6c2' : lit ? mix(LIT[Math.floor(r() * 4)], '#3d3a5c', 0.35) : '#2f2a47';
      (lit ? p.glow : p.rect)(fx, fy + 4, ww, fh - 14, wc);
      if (!open) { const cur = r() < 0.5 ? '#e8edf7' : '#d9a35b'; p.rect(fx, fy + 4, 4, fh - 14, cur); p.rect(fx + ww - 4, fy + 4, 4, fh - 14, cur); }
      else { p.rect(fx, fy + 4, 2, fh - 14, '#ff8a4c'); p.rect(fx + ww - 2, fy + 4, 2, fh - 14, '#ff8a4c'); p.glow(fx + 6, fy + 8, 6, 3, '#ffffff'); }
      p.rect(fx - 2, fy + fh - 10, ww + 4, 2, c3); // slab
      p.rect(fx - 2, fy + fh - 16, ww + 4, 6, 'rgba(143,211,255,0.35)'); p.rect(fx - 2, fy + fh - 16, ww + 4, 1, '#e8edf7'); // glass rail
      if (r() < 0.5) { p.rect(fx + ww - 10, fy + fh - 15, 8, 5, '#d8d2c4'); p.rect(fx + ww - 9, fy + fh - 14, 3, 3, '#8c8a86'); } // AC unit
      if (r() < 0.45) { p.rect(fx + 2, fy + fh - 15, 4, 5, '#8a5232'); p.rect(fx + 1, fy + fh - 19, 6, 4, '#3f7a2e'); }
      if (o.numbers) p.text(String((o.numbers0 || 30) - f), x0 + k * cw + 2, fy + 9, 6, '#3d3a5c', { align: 'left' });
    }
    for (let k = 1; k < cols; k++) p.rect(x0 + k * cw - 1, top, 2, fh * floors, c2);
  };

  // ---------- heaven ----------
  // the sky tears open: a ring of lit clouds around a white-gold hole, concentric glow rings (the angel comes out of it)
  PR.cloudhole = (p, o, r) => {
    const x = o.x ?? 135, y = o.y ?? 90, R = o.r || 46;
    for (let k = 4; k >= 1; k--) { const rr = R * (0.4 + k * 0.18); const col = ['#fff6c2', '#ffe66b', '#ffc14a', '#ff8a4c'][k - 1]; for (let yy = -rr; yy <= rr; yy++) { const ww = Math.round(Math.sqrt(rr * rr - yy * yy) * 1.4); if ((yy + k) % 2 === 0 || k === 1) p.glow(x - ww, y + yy * 0.62, ww * 2, 1, col); } }
    for (let a = 0; a < TAU; a += 0.16) { const rr = R * (1.05 + r() * 0.25); const cx = x + Math.cos(a) * rr * 1.4, cy = y + Math.sin(a) * rr * 0.62; const s = 6 + Math.floor(r() * 7);
      p.circle(cx, cy, s, o.cloud || '#f2d38a'); p.circle(cx - 1, cy - 2, s - 2, sh(o.cloud || '#f2d38a', 0.15)); p.px(cx - s + 2, cy - 1, '#fff6c2'); }
  };

  // ---------- street wreckage ----------
  // street lamp knocked over at an angle (o.lean radians), bulb sparking
  PR.brokenpole = (p, o) => { const x = o.x, y = o.y, h = o.h || 60, a = o.lean ?? 0.5; const tx = Math.round(x + Math.sin(a) * h), ty = Math.round(y - Math.cos(a) * h);
    p.line(x, y, tx, ty, '#545577'); p.line(x + 1, y, tx + 1, ty, '#3d3a5c'); p.rect(tx - 2, ty - 2, 6, 3, '#3d3a5c'); p.glow(tx, ty, 2, 1, '#fff6c2'); p.rect(x - 3, y - 2, 7, 2, '#3d3a5c'); };
  PR.debris = (p, o, r) => { const x0 = o.x0 ?? 20, x1 = o.x1 ?? 250, y = o.y; for (let k = 0; k < (o.n || 14); k++) { const x = x0 + r() * (x1 - x0), yy = y + Math.floor(r() * 10); p.rect(x, yy, 1 + Math.floor(r() * 4), 1, r() < 0.4 ? '#8fd3ff' : r() < 0.5 ? '#5f5d5a' : '#b5b0a5'); } };

  // ---------- ambients ----------
  // black-grey smoke puffs rising from a fire (back pass), loop-exact
  A.smoke = (ctx, a, e) => { if (e.which !== 'back') return; const P1 = S.period(a.period || 3, e.L); const n = a.count || 10; const x0 = Math.round(a.x - e.camX * (a.k ?? 1));
    for (let k = 0; k < n; k++) { const u = LSE.frac(e.t / P1 + k / n, 1); const yy = Math.round(a.y - u * (a.h || 120)); const xx = Math.round(x0 + Math.sin(u * 5 + k) * 4 + u * (a.drift ?? 18)); const s = Math.round(3 + u * (a.s || 10));
      ctx.globalAlpha = (a.alpha ?? 0.8) * (1 - u * 0.75); ctx.fillStyle = u < 0.2 ? '#4b4a47' : '#2f2a47'; ctx.fillRect(xx - s, yy - s * 0.6, s * 2, s * 1.2); ctx.fillStyle = '#3a3936'; ctx.fillRect(xx - s + 1, yy - s * 0.6, s, 1); }
    ctx.globalAlpha = 1; };
  // electric arcs crackling on a wire point (glow pass), bursts on 1/8 notes
  A.zap = (ctx, a, e) => { if (e.which !== 'glow' && e.which !== 'back') return; const P1 = S.period(a.period || 1, e.L); const u = LSE.frac(e.t, P1); if (u > (a.on ?? 0.6)) return; const f = LSE.tick(e.t, e.beat / 8) % 4; if (f === 3) return;
    const x = Math.round(a.x - e.camX * (a.k ?? 1)), y = a.y; const R = LSE.rng(1 + f * 97 + (a.seed || 0));
    for (let b = 0; b < (a.bolts || 3); b++) { let px = x, py = y; ctx.fillStyle = b % 2 ? '#4ff0ff' : '#ffffff'; for (let s = 0; s < 7; s++) { px += Math.round((R() - 0.5) * 6); py += Math.round((R() - 0.3) * 5); ctx.fillRect(px, py, 1, 1); ctx.fillRect(px + 1, py, 1, 1); } }
    if (e.which === 'glow') { ctx.fillStyle = 'rgba(79,240,255,0.35)'; ctx.fillRect(x - 6, y - 6, 12, 12); } };
  // coloured feathers drifting down after the spell (front pass)
  A.feathers = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 6, e.L); const cols = a.colors || ['#ffe66b', '#ff4fa3', '#4ff0ff', '#9b5de5', '#7cbf3f', '#ff8a4c'];
    for (let i = 0; i < (a.count || 14); i++) { const ph = R(), x0 = (a.x0 ?? 0) + R() * ((a.x1 ?? W) - (a.x0 ?? 0)); const u = LSE.frac(e.t / P1 + ph, 1); const x = Math.round(x0 + Math.sin(u * TAU * 2 + i) * 6 - e.camX * 0.6), y = Math.round((a.y0 ?? 40) + u * ((a.y1 ?? 300) - (a.y0 ?? 40)));
      const c = cols[i % cols.length]; const tilt = (LSE.tick(e.t, e.beat / 2) + i) % 2; ctx.fillStyle = c; ctx.fillRect(x, y, 3, 1); ctx.fillRect(x + (tilt ? 1 : -1), y + 1, 3, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y, 1, 1); } };
  // heaven glow: breathing rings around the cloud hole + slow god-rays (glow pass)
  A.heaven = (ctx, a, e) => { if (e.which !== 'glow') return; const P1 = S.period(a.period || 2, e.L); const k = 0.6 + 0.4 * Math.sin(TAU * e.t / P1); const x = a.x ?? 135, y = a.y ?? 90, R = (a.r || 46) * 1.6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,246,194,${0.75 * k})`); g.addColorStop(0.5, `rgba(255,230,107,${0.3 * k})`); g.addColorStop(1, 'rgba(255,193,74,0)'); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    if (a.beams !== false) { ctx.fillStyle = `rgba(255,246,194,${0.16 * k})`; for (let b = -3; b <= 3; b++) { const bx = x + b * 26; for (let yy = y; yy < (a.y1 || 300); yy += 2) { const ww = 4 + (yy - y) * 0.06; ctx.fillRect(Math.round(bx + (yy - y) * b * 0.22 - ww / 2), yy, Math.round(ww), 1); } } } };
})(typeof window !== 'undefined' ? window : globalThis);
