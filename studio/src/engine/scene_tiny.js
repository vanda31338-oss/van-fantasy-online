// "Shrunk to 2 cm in your own room": everyday things drawn at giant scale (1 px ≈ 0.4 mm) — pillow and blanket hills,
// the bed edge cliff, wood planks, wall and baseboard, a flip-flop, the stand fan's base, a power cord — plus wind and big drops.
(function (G) {
  const LSE = G.LSE; const S = LSE.Scene; const PR = S.prims; const W = S.W, H = S.H, M = S.M; const TAU = Math.PI * 2;
  const sh = (c, k) => LSE.shade(c, k); const mix = (a, b, t) => LSE.mix(a, b, t);
  const LW = W + 2 * M; const A = S.ambientExt;
  const fullE = (p, fn) => { const cs = [p.ctx, p.ectx, p.bctx].filter(Boolean); cs.forEach((c) => { c.save(); c.translate(-M, 0); }); try { fn(); } finally { cs.forEach((c) => c.restore()); } };

  // soft fabric landscape (pillow / blanket) from o.y down: rolling folds on top, a woven texture, a stitched seam
  PR.fabric = (p, o, r) => fullE(p, () => {
    const y0 = o.y, c = o.color || '#e8edf7', c2 = o.color2 || sh(c, -0.12), dk = sh(c, -0.25), lt = sh(c, 0.08);
    const folds = o.folds || [{ x: 60, w: 140, h: 26 }, { x: 210, w: 120, h: 16 }];
    const top = (x) => { let t = 0; for (const f of folds) { const d = (x - M - f.x) / (f.w / 2); if (Math.abs(d) < 1) t = Math.max(t, f.h * (0.5 + 0.5 * Math.cos(d * Math.PI))); } return y0 - t; };
    for (let x = 0; x < LW; x++) { const t = Math.round(top(x)); p.rect(x, t, 1, H - t, c); p.px(x, t, lt); p.px(x, t + 1, lt);
      const slope = top(x + 1) - top(x - 1); if (slope > 0.4) p.rect(x, t + 2, 1, 6, c2); if (slope > 1) p.rect(x, t + 2, 1, 12, dk); }
    for (let yy = y0 - 30; yy < H; yy += 3) for (let x = (yy % 6 === 0 ? 0 : 2); x < LW; x += 4) if (yy > top(x) + 3) p.px(x, yy, c2); // weave
    for (let k = 0; k < (o.creases || 7); k++) { const cx = r() * LW, cy = y0 + 20 + r() * (H - y0 - 40), len = 30 + r() * 60; for (let i = 0; i < len; i++) p.px(cx + i, cy + Math.sin(i / 9) * 3, dk); }
    if (o.seam) for (let x = 0; x < LW; x += 9) { p.rect(x, o.seam, 5, 2, o.thread || '#b3b9d1'); p.px(x, o.seam + 2, dk); }
    if (o.pattern) for (let yy = y0 + 18; yy < H; yy += 42) for (let x = ((yy / 42) & 1) * 30; x < LW; x += 60) { if (yy < top(x) + 6) continue; p.circle(x, yy, 7, o.pattern); p.circle(x - 2, yy - 2, 3, sh(o.pattern, 0.2)); }
  });
  // the mattress edge: Ton stands on the sheet at o.y, the side drops away to a far floor ~12 storeys below
  PR.bededge = (p, o, r) => {
    const x = o.x, y = o.y, c = o.color || '#e8edf7', side = o.side || '#9a9fb8';
    p.rect(0, y, x, 6, c); p.rect(0, y, x, 1, '#ffffff'); p.poly([[0, y + 6], [x, y + 6], [x + 6, y + 30], [0, y + 34]], sh(c, -0.1)); // sheet hem rolling over
    for (let k = 0; k < 5; k++) p.line(k * x / 5 + 10, y + 7, k * x / 5 + 16, y + 30, sh(c, -0.22));
    p.rect(0, y + 34, x - 4, H - y - 34, side); for (let yy = y + 40; yy < H; yy += 22) p.rect(0, yy, x - 4, 2, sh(side, -0.15)); // quilted side
    for (let yy = y + 50; yy < H; yy += 22) for (let xx = 8; xx < x - 10; xx += 24) { p.px(xx, yy, sh(side, 0.2)); p.px(xx + 1, yy, sh(side, -0.25)); }
    p.ditherV(x, y + 20, W - x + M, H - y - 20, '#2f2a47', '#16141f', 5); // the drop
    const fy = H - 40; p.rect(x, fy, W - x + M, 40, '#5c3424'); for (let xx = x; xx < W + M; xx += 9) p.rect(xx, fy, 1, 40, '#3b1f1a'); // floor far below, tiny planks
    p.rect(x + 40, fy - 3, 16, 3, o.slipper || '#2253a3'); p.rect(x + 44, fy - 5, 6, 2, sh(o.slipper || '#2253a3', -0.2)); // a far-away slipper
  };
  // giant wood planks: the floor surface from o.y to the bottom, seams running toward the viewer, wavy grain, dusty gaps
  PR.giantwood = (p, o, r) => fullE(p, () => {
    const y0 = o.y, c = o.color || '#b8773f', c2 = sh(c, -0.12), c3 = sh(c, -0.3), lt = sh(c, 0.12);
    p.rect(0, y0, LW, H - y0, c);
    for (let yy = y0 + 3; yy < H; yy += 4 + Math.floor((yy - y0) / 40)) { const ph = r() * 20; for (let x = 0; x < LW; x++) if (Math.sin(x / (14 + (yy % 9)) + ph) > 0.55) p.px(x, yy + Math.round(Math.sin(x / 23 + ph) * 1.5), c2); }
    for (let k = 0; k < 6; k++) { const kx = r() * LW, ky = y0 + 30 + r() * (H - y0 - 50); for (let rr = 6; rr > 0; rr -= 2) p.ellipse ? p.ellipse(kx, ky, rr * 2, rr, c2) : p.circle(kx, ky, rr, rr % 4 ? c2 : c3); } // knots
    for (const sx of o.seams || [70, 250]) { const X = sx + M; for (let yy = y0; yy < H; yy++) { const xx = Math.round(X + (X - LW / 2) * (yy - y0) / 300); p.rect(xx, yy, 3 + Math.floor((yy - y0) / 60), 1, c3); p.px(xx - 1, yy, lt); if (r() < 0.05) p.px(xx + 1, yy, '#9a958b'); } }
    p.rect(0, y0, LW, 1, lt);
  });
  // the wall behind: giant plaster bumps, a white baseboard on the floor line, a power socket bigger than you
  PR.giantwall = (p, o, r) => fullE(p, () => {
    const y1 = o.y, c = o.color || '#d8d2c4', c2 = sh(c, -0.08);
    p.rect(0, 0, LW, y1, c); for (let i = 0; i < LW * 6; i++) { const x = r() * LW, yy = r() * y1; p.px(x, yy, r() < 0.5 ? c2 : sh(c, 0.05)); }
    for (let k = 0; k < 12; k++) { const x = r() * LW, yy = r() * (y1 - 40); p.circle(x, yy, 3 + r() * 5, c2); p.px(x - 1, yy - 2, sh(c, 0.1)); }
    const bh = o.board || 46; p.rect(0, y1 - bh, LW, bh, '#f2efe6'); p.rect(0, y1 - bh, LW, 4, '#ffffff'); p.rect(0, y1 - bh + 4, LW, 2, '#d8d2c4'); p.rect(0, y1 - 3, LW, 3, '#b5b0a5');
    if (o.socket != null) { const sx = o.socket + M, sy = y1 - bh - 110; p.rect(sx, sy, 70, 90, '#f2efe6'); p.rect(sx, sy, 70, 3, '#ffffff'); p.rect(sx + 67, sy, 3, 90, '#b5b0a5'); p.rect(sx, sy + 87, 70, 3, '#b5b0a5');
      for (const dy of [22, 56]) { p.rect(sx + 22, sy + dy, 7, 14, '#16141f'); p.rect(sx + 41, sy + dy, 7, 14, '#16141f'); } }
  });
  // giant flip-flop, side view: a sole as thick as you are tall, rubber texture, the strap arch you can hide under
  PR.slipper = (p, o, r) => {
    const x = o.x, y = o.y, w = o.w || 300, c = o.color || '#2253a3', sole = o.sole || '#f2efe6', t = o.t || 46;
    p.rect(x, y - t, w, t, sole); p.rect(x, y - t, w, 6, c); p.rect(x, y - t, w, 2, sh(c, 0.2)); p.rect(x, y - 4, w, 4, sh(sole, -0.2));
    for (let xx = x + 4; xx < x + w; xx += 8) for (let yy = y - t + 10; yy < y - 6; yy += 7) p.px(xx + ((yy / 7) & 1) * 4, yy, sh(sole, -0.1));
    p.text && o.brand ? p.text(o.brand, x + w / 2, y - t / 2 + 6, 12, sh(sole, -0.25), {}) : null;
    const ax = o.arch ?? x + w * 0.45, aw = o.archw || 120, ah = o.archh || 78; // the strap: a thick rubber band arching up and over
    for (let k = 0; k <= aw; k++) { const u = k / aw; const yy = y - t - Math.sin(u * Math.PI) * ah; p.rect(ax + k, Math.round(yy) - 10, 1, 12, k < aw * 0.15 || k > aw * 0.85 ? sh(c, -0.1) : c); p.px(ax + k, Math.round(yy) - 10, sh(c, 0.25)); p.px(ax + k, Math.round(yy) + 1, sh(c, -0.3)); }
    p.rect(ax + aw / 2 - 8, y - t - 8, 16, 8, sh(c, -0.25)); // toe post
  };
  // stand fan: the base dome and the pole rising out of frame
  PR.fanbase = (p, o, r) => {
    const x = o.x, y = o.y, R = o.r || 150, c = o.color || '#f2efe6';
    for (let yy = 0; yy < R * 0.45; yy++) { const w = Math.sqrt(1 - Math.pow(yy / (R * 0.45), 2)) * R; p.rect(x - w, y - yy, w * 2, 1, yy > R * 0.38 ? sh(c, 0.1) : yy < 6 ? sh(c, -0.25) : c); }
    p.rect(x - 22, -10, 44, y - R * 0.4 + 10, '#b5b0a5'); p.rect(x - 22, -10, 8, y - R * 0.4 + 10, '#e8edf7'); p.rect(x + 14, -10, 8, y - R * 0.4 + 10, '#8c8a86');
    p.rect(x - 30, y - R * 0.45 - 14, 60, 14, sh(c, -0.1)); p.rect(x + R * 0.5, y - R * 0.3, 40, 20, '#3d3a5c'); p.glow(x + R * 0.5 + 6, y - R * 0.3 + 6, 6, 6, '#7cbf3f'); // speed buttons
  };
  // power cord lying on the floor like a fat pipe
  PR.cord = (p, o) => { const pts = o.pts || [[-20, 300], [80, 296], [160, 304], [290, 298]], c = o.color || '#16141f', t = o.t || 12;
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const n = Math.max(1, Math.abs(x1 - x0)); for (let k = 0; k <= n; k++) { const xx = x0 + (x1 - x0) * k / n, yy = y0 + (y1 - y0) * k / n; p.rect(xx, yy - t, 1, t, c); p.px(xx, yy - t + 2, '#545577'); p.px(xx, yy - t + 3, '#3d3a5c'); } } };
  PR.dustbunny = (p, o, r) => { const x = o.x, y = o.y, s = o.s || 1; for (let k = 0; k < 60 * s; k++) { const a = r() * TAU, d = Math.pow(r(), 0.6) * 16 * s; p.px(x + Math.cos(a) * d * 1.4, y - 10 * s + Math.sin(a) * d * 0.7, r() < 0.5 ? '#9a958b' : '#b5b0a5'); }
    for (let k = 0; k < 10; k++) { const a = r() * TAU; p.line(x, y - 10 * s, x + Math.cos(a) * 24 * s, y - 10 * s + Math.sin(a) * 12 * s, '#8c8a86'); } };
  PR.crumbs = (p, o, r) => { for (let k = 0; k < (o.n || 10); k++) { const x = (o.x0 ?? 20) + r() * ((o.x1 ?? 250) - (o.x0 ?? 20)), y = o.y + r() * (o.h || 30), s = 2 + Math.floor(r() * 5); p.rect(x, y - s, s + 2, s, o.color || '#d9a35b'); p.px(x, y - s, '#f2d38a'); } };

  // ---------- ambients ----------
  // fan wind: fast streaks + flying dust from one side (loop-exact: integer laps per loop)
  A.windstreak = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 0.8, e.L); const dir = a.dir || 1;
    for (let i = 0; i < (a.count || 18); i++) { const ph = R(), yy = Math.round((a.y0 ?? 60) + R() * ((a.y1 ?? 300) - (a.y0 ?? 60))), len = 20 + Math.floor(R() * 50); const u = LSE.frac(e.t / P1 + ph, 1); const x = Math.round(dir > 0 ? -60 + u * (W + 120) : W + 60 - u * (W + 120));
      ctx.globalAlpha = 0.35 + 0.3 * R(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, yy, len, 1); if (i % 3 === 0) { ctx.fillStyle = '#9a958b'; ctx.fillRect(x + len + 4, yy - 1, 3, 2); } }
    ctx.globalAlpha = 1; };
  // big water drops falling and bursting on the ground (back pass) — each about a quarter of your height
  A.bigdrops = (ctx, a, e) => { if (e.which !== 'back') return; const R = e.rnd; const P1 = S.period(a.period || 1.6, e.L); const g = a.ground ?? 300;
    for (let i = 0; i < (a.count || 5); i++) { const ph = R(), x = Math.round((a.x0 ?? 20) + R() * ((a.x1 ?? 250) - (a.x0 ?? 20))); const u = LSE.frac(e.t / P1 + ph, 1); const s = a.s || 6;
      if (u < 0.7) { const y = Math.round((a.y0 ?? -20) + (u / 0.7) * (u / 0.7) * (g - (a.y0 ?? -20))); ctx.fillStyle = '#8fd3ff'; ctx.beginPath(); ctx.ellipse(x, y, s, s * 1.15, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8edf7'; ctx.fillRect(x - s / 2, y - s / 2, 2, 3); ctx.fillStyle = '#3e8de0'; ctx.fillRect(x - s + 1, y + s - 1, s * 2 - 2, 1); }
      else { const k = (u - 0.7) / 0.3; ctx.fillStyle = '#8fd3ff'; for (let j = -3; j <= 3; j++) ctx.fillRect(Math.round(x + j * k * 10), Math.round(g - 2 - Math.sin(k * Math.PI) * 14 * (1 - Math.abs(j) / 4)), 2, 2); ctx.globalAlpha = 1 - k; ctx.fillRect(Math.round(x - 12 * k - 4), g, Math.round(24 * k + 8), 1); ctx.globalAlpha = 1; } } };
  // the flood: a moving water surface with glints at o.y (front pass, drawn over feet) and sinking ripples
  A.flood = (ctx, a, e) => { if (e.which !== 'front') return; const y = a.y ?? 300, h = a.h ?? 40; const P1 = S.period(a.period || 2, e.L); const ph = TAU * e.t / P1;
    ctx.globalAlpha = a.alpha ?? 0.55; ctx.fillStyle = a.color || '#3e8de0'; for (let x = 0; x < W; x++) { const t = Math.round(Math.sin(x / 14 + ph) * 2 + Math.sin(x / 5 - ph * 2) * 0.6); ctx.fillRect(x, y + t, 1, h - t); } ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8edf7'; for (let x = (LSE.tick(e.t, e.beat / 2) * 3) % 17; x < W; x += 17) ctx.fillRect(x, y + Math.round(Math.sin(x / 14 + ph) * 2), 5, 1); };
})(typeof window !== 'undefined' ? window : globalThis);
