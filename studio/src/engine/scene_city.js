// Modern city & Thai everyday-life primitives (skyline, BTS, wires, shophouses, soi, canal, room, temple) + their ambient life.
(function (G) {
  const LSE = G.LSE; const S = LSE.Scene; const PR = S.prims; const W = S.W, H = S.H, M = S.M; const TAU = Math.PI * 2;
  const sh = (c, k) => LSE.shade(c, k);
  const LW = W + 2 * M;
  // full-width painters run in raw layer space (emissive contexts move with them)
  const fullE = (p, fn) => { const cs = [p.ctx, p.ectx, p.bctx].filter(Boolean); cs.forEach((c) => { c.save(); c.translate(-M, 0); }); try { fn(); } finally { cs.forEach((c) => c.restore()); } };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const LIT = ['#ffe66b', '#ffc14a', '#f2efe6', '#fff6c2'];

  // ---------- city ----------
  // tower silhouettes with lit window grids (lit pixels are emissive); o.landmark: {x, h} a pixel-cut skyscraper
  PR.skyline = (p, o, r) => fullE(p, () => {
    const base = o.y, Hm = o.h || 120, c = o.color || '#231f33', c2 = o.color2 || sh(c, 0.1), win = o.win || sh(c, 0.16);
    const lits = o.lit || LIT; const pl = o.litp != null ? o.litp : 0.26; const bm = p.blinkMode;
    let x = -4;
    while (x < LW) {
      const w = (o.minw || 10) + Math.floor(r() * (o.varw || 22)); const tall = r() < 0.2; const h = Math.round(Hm * (tall ? 0.72 + r() * 0.28 : 0.28 + r() * 0.42)); const top = base - h; const style = Math.floor(r() * 5);
      p.rect(x, top, w, h, c); p.rect(x + w - 2, top, 2, h, c2);
      if (style === 1) { const ah = 6 + Math.floor(r() * 10); p.rect(x + (w >> 1), top - ah, 1, ah, c); }
      else if (style === 2) { p.rect(x + 2, top - 4, w - 4, 4, c); p.rect(x + 4, top - 8, w - 8, 4, c); }
      else if (style === 3) p.poly([[x, top], [x + w, top - 7], [x + w, top + 1], [x, top + 1]], c);
      const ww = r() < 0.6 ? 1 : 2, gx = ww + 1 + (r() < 0.4 ? 1 : 0), strip = r() < 0.2;
      for (let yy = top + 3; yy < base - 2; yy += strip ? 4 : 3) {
        if (strip) { if (r() < pl * 1.4) p.glow(x + 2, yy, w - 5, 1, pick(r, lits)); else p.rect(x + 2, yy, w - 5, 1, win); continue; }
        for (let xx = x + 2; xx < x + w - 3; xx += gx) { const q = r(); if (q < pl) p.glow(xx, yy, ww, 1, pick(r, lits)); else if (q < 0.6) p.rect(xx, yy, ww, 1, win); }
      }
      if (tall) { p.blinkMode = true; p.glow(x + (w >> 1), top - (style === 1 ? 12 : 1), 1, 1, '#e0533f'); p.blinkMode = bm; }
      x += w + Math.floor(r() * 3) - 1;
    }
    if (o.landmark) { // MahaNakhon-like: a slim glass tower with a spiral of protruding lit cubes
      const lx = o.landmark.x + M, lh = o.landmark.h || Hm * 1.3, lw = o.landmark.w || 16, top = base - lh;
      p.rect(lx - lw / 2, top, lw, lh, sh(c, 0.06)); p.rect(lx + lw / 2 - 3, top, 3, lh, c2);
      for (let yy = top + 2; yy < base - 2; yy += 3) for (let xx = lx - lw / 2 + 2; xx < lx + lw / 2 - 3; xx += 2) if (r() < 0.35) p.glow(xx, yy, 1, 1, pick(r, ['#8fd3ff', '#f2efe6', '#ffe66b']));
      for (let yy = top + 4; yy < base - 6; yy += 4) { const ph = ((yy - top) / 46) % 1; const side = Math.sin(ph * TAU); const bx = Math.round(lx + side * (lw / 2 - 2)); p.rect(bx - 2, yy, 5, 3, sh(c, 0.2)); if (r() < 0.6) p.glow(bx - 1, yy + 1, 3, 1, '#f2efe6'); }
      p.rect(lx - 1, top - 10, 2, 10, c); p.blinkMode = true; p.glow(lx, top - 11, 1, 1, '#e0533f'); p.blinkMode = bm;
    }
  });
  // elevated rail: concrete beam with parapet + T pillars (o.y = beam top)
  PR.bts = (p, o) => fullE(p, () => {
    const y = o.y, th = o.th || 9, gnd = o.ground || 274, c = o.color || '#9a958b', d = sh(c, -0.28), hi = sh(c, 0.16);
    for (let x = (o.x0 != null ? o.x0 : 30) + M; x < LW + 40; x += o.step || 84) {
      p.rect(x - 4, y + th, 8, gnd - y - th, c); p.rect(x + 1, y + th, 3, gnd - y - th, d); p.rect(x - 4, y + th, 1, gnd - y - th, hi);
      p.poly([[x - 11, y + th], [x + 11, y + th], [x + 5, y + th + 6], [x - 5, y + th + 6]], c); p.rect(x - 11, y + th, 22, 1, d);
    }
    p.rect(0, y - 3, LW, 3, sh(c, -0.08)); for (let x = 0; x < LW; x += 8) p.px(x, y - 3, d);
    p.rect(0, y, LW, th, c); p.rect(0, y, LW, 1, hi); p.rect(0, y + th - 2, LW, 2, d); p.rect(0, y + th, LW, 1, '#16141f');
    for (let x = 0; x < LW; x += 42) p.rect(x, y + 1, 1, th - 3, d);
  });
  // utility poles + sagging cable bundles (the Bangkok "spaghetti"): o.xs pole x, o.y top
  PR.powerlines = (p, o, r) => fullE(p, () => {
    const xs = (o.xs || [40, 200]).map((x) => x + M), y = o.y, gnd = o.ground || 274, n = o.count || 7, c = o.color || '#0b0a12', pc = o.pole || '#8c8a86';
    const pts = [-30, ...xs, LW + 30]; const hy = (k) => y + 2 + k * 2 + (k % 3);
    for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1];
      for (let k = 0; k < n; k++) { const sag = 6 + k * 1.6 + r() * 5; let py = null; for (let x = Math.floor(a); x <= b; x++) { const u = (x - a) / (b - a); const yy = Math.round(hy(k) + sag * 4 * u * (1 - u)); if (py != null && Math.abs(yy - py) > 1) p.rect(x, Math.min(yy, py), 1, Math.abs(yy - py), c); else p.px(x, yy, c); py = yy; } } }
    for (const x of xs) {
      p.rect(x - 2, y - 8, 4, gnd - y + 8, pc); p.rect(x + 1, y - 8, 1, gnd - y + 8, sh(pc, -0.25)); p.rect(x - 2, y - 8, 1, gnd - y + 8, sh(pc, 0.15));
      p.rect(x - 10, y, 20, 2, sh(pc, -0.15)); p.rect(x - 8, y + 7, 16, 2, sh(pc, -0.15));
      for (const dx of [-9, -5, 5, 9]) p.rect(x + dx, y - 2, 1, 2, '#f2efe6');
      if (r() < 0.7) { p.rect(x + 3, y + 14, 8, 11, '#5f5d5a'); p.rect(x + 3, y + 14, 8, 1, '#b5b0a5'); p.rect(x + 4, y + 18, 6, 1, '#3d3a5c'); }
      for (let k = 0; k < 3; k++) { const cx = x - 6 + k * 5, cy = y + 16 + k * 3, rr = 3 + k; for (let a = 0; a < TAU; a += 0.35) p.px(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.7), c); } // tangled loops
      p.rect(x - 1, y + 30, 2, 6, '#ffe66b'); p.rect(x - 1, y + 36, 2, 6, '#0b0a12'); // painted band
    }
  });
  // asphalt road + painted curb + tiled sidewalk (y0 road top, y1 curb, o.y sidewalk front)
  PR.road = (p, o) => fullE(p, () => {
    if (o.near) { // road in front of the sidewalk: painted curb on top, asphalt down to the frame bottom with lane marks
      const y0 = o.y0, y1 = o.y1 || H, cc = o.curb || ['#b52b35', '#f2efe6']; p.rect(0, y0 - 2, LW, 2, '#5f5d5a'); for (let x = 0; x < LW; x += 4) p.rect(x, y0, 4, 3, cc[(x / 4) & 1]); p.rect(0, y0 + 3, LW, 1, '#0b0a12');
      p.ditherV(0, y0 + 4, LW, y1 - y0 - 4, o.color || '#2f2a47', o.far || '#16141f', 4); for (const ly of o.lanes || [y0 + 30, y0 + 70]) for (let x = 0; x < LW; x += 22) p.rect(x, ly, 10, 2, '#b3b9d1');
      if (o.zebra) for (let x = o.zebra; x < o.zebra + 60; x += 8) p.rect(x, y0 + 8, 5, 50, '#d8d2c4'); return; }
    const y0 = o.y0, y1 = o.y1, y = o.y || y1 + 8; p.ditherV(0, y0, LW, y1 - y0, o.far || '#231f33', o.color || '#2f2a47', 4);
    for (let x = 0; x < LW; x += 16) p.rect(x, Math.round((y0 + y1) / 2), 7, 1, '#b3b9d1');
    const cc = o.curb || ['#b52b35', '#f2efe6']; for (let x = 0; x < LW; x += 4) p.rect(x, y1, 4, 2, cc[(x / 4) & 1]);
    p.rect(0, y1 + 2, LW, y - y1 - 2, o.walk || '#8c8a86'); for (let x = 0; x < LW; x += 10) p.rect(x, y1 + 2, 1, y - y1 - 2, '#5f5d5a'); p.rect(0, y1 + 2, LW, 1, '#b5b0a5');
  });
  // Thai shophouse row (ตึกแถว): o.x left, o.y ground, units, uw, gf (ground floor h), fh, floors, shops ['open'|'shut'|'grocery'], signs [{unit, span, text, bg, color, lit}]
  PR.shophouse = (p, o, r) => {
    const x0 = o.x, y = o.y, n = o.units || 3, uw = o.uw || 40, gf = o.gf || 46, fh = o.fh || 32, fl = o.floors || 3;
    const wall = o.color || '#d8d2c4', wsh = sh(wall, -0.14), wdk = sh(wall, -0.32), trim = o.trim || '#8c8a86'; const top = y - gf - fh * (fl - 1) - 6, w = n * uw;
    p.rect(x0, top, w, y - top, wall);
    for (let i = 0; i < w; i++) if (r() < 0.3) { const sy = top + 6 + Math.floor(r() * (fl - 1)) * fh; p.rect(x0 + i, sy, 1, 3 + r() * 12, wsh); }
    p.rect(x0 - 1, top, w + 2, 3, trim); p.rect(x0 - 1, top + 3, w + 2, 1, wdk);
    for (let u = 0; u < n; u++) { const ux = x0 + u * uw; if (r() < 0.55) { const tx = ux + 6 + Math.floor(r() * (uw - 18)); p.rect(tx + 1, top - 3, 1, 3, '#5f5d5a'); p.rect(tx + 8, top - 3, 1, 3, '#5f5d5a'); p.rect(tx, top - 11, 10, 8, '#b3b9d1'); p.rect(tx, top - 11, 10, 1, '#f2efe6'); p.rect(tx + 8, top - 11, 2, 8, '#7a7fa3'); }
      if (r() < 0.35) { const ax = ux + uw - 8; p.rect(ax, top - 14, 1, 14, '#3d3a5c'); p.rect(ax - 3, top - 12, 7, 1, '#3d3a5c'); p.rect(ax - 2, top - 9, 5, 1, '#3d3a5c'); } }
    for (let f = 1; f < fl; f++) { const fy = y - gf - fh * (f - 1);
      p.rect(x0, fy - 2, w, 2, trim); p.rect(x0, fy, w, 1, wdk);
      for (let u = 0; u < n; u++) { const ux = x0 + u * uw, wx = ux + 6, ww = uw - 12, wy = fy - fh + 7, wh = fh - 13; const lit = r() < (o.litp != null ? o.litp : 0.45);
        p.rect(wx - 1, wy - 1, ww + 2, wh + 2, wdk);
        if (lit) { const g = pick(r, ['#ffc14a', '#ffe66b', '#fff6c2', '#8fd3ff']); p.glow(wx, wy, ww, wh, g); p.glow(wx, wy, 4 + Math.floor(r() * 4), wh, pick(r, ['#b52b35', '#2253a3', '#2f9c86', '#9b5de5'])); if (r() < 0.4) p.glow(wx + ww - 7, wy + wh - 6, 4, 6, '#3b1f1a'); }
        else p.rect(wx, wy, ww, wh, '#2f2a47');
        for (let gx = wx + 1; gx < wx + ww; gx += 3) p.rect(gx, wy, 1, wh, '#16141f'); p.rect(wx, wy + (wh >> 1), ww, 1, '#16141f'); p.rect(wx, wy, ww, 1, '#16141f');
        p.rect(wx - 3, wy + wh + 1, ww + 6, 2, trim); p.rect(wx - 3, wy + wh + 3, ww + 6, 1, wdk);
        if (r() < 0.65) for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { const px = wx - 2 + Math.floor(r() * (ww + 2)); p.rect(px, wy + wh - 2, 3, 3, '#b8773f'); p.rect(px - 1, wy + wh - 6, 5, 4, pick(r, ['#3f7a2e', '#2e5a23', '#7cbf3f'])); p.px(px + 1, wy + wh - 7, '#c3e66b'); if (r() < 0.3) p.px(px, wy + wh - 6, '#ff4fa3'); }
        if (r() < 0.5) { const ax = ux + uw - 10, ay = fy - 10; p.rect(ax, ay, 9, 7, '#b5b0a5'); p.rect(ax, ay, 9, 1, '#d8d2c4'); p.rect(ax + 4, ay + 2, 4, 4, '#5f5d5a'); p.px(ax + 5, ay + 3, '#8c8a86'); p.rect(ax + 1, ay + 7, 1, 5, '#5f5d5a'); }
        if (r() < 0.3) { const ly = wy + 3; p.rect(wx, ly, ww, 1, '#3d3a5c'); for (let k = 0; k < 3; k++) p.rect(wx + 2 + k * 7, ly + 1, 4, 5 + (k % 2) * 2, pick(r, ['#e0533f', '#3e8de0', '#f2efe6', '#ffc14a', '#ff4fa3'])); }
      } }
    for (let u = 0; u < n; u++) { const ux = x0 + u * uw, st = (o.shops && o.shops[u]) || (r() < 0.5 ? 'shut' : 'open'); const sx = ux + 3, sw = uw - 6, sy = y - gf + 12, shh = gf - 12;
      if (st === 'shut') { p.rect(sx, sy, sw, shh, '#7a7fa3'); for (let yy = sy + 1; yy < y; yy += 2) p.rect(sx, yy, sw, 1, '#545577'); p.rect(sx, y - 3, sw, 3, '#3d3a5c'); if (r() < 0.5) { const gx = sx + 4 + Math.floor(r() * (sw - 14)); p.rect(gx, y - 12, 8, 2, pick(r, ['#ff4fa3', '#4ff0ff', '#ffe66b'])); p.rect(gx + 2, y - 14, 2, 4, pick(r, ['#ff4fa3', '#4ff0ff'])); } }
      else {
        p.glow(sx, sy, sw, shh, st === 'grocery' ? '#f2d38a' : '#d9a35b'); p.glow(sx + 2, sy + 1, sw - 4, 1, '#ffffff');
        for (let k = 0; k < 3; k++) { const ry = sy + 6 + k * 8; p.glow(sx + 1, ry, sw - 2, 1, '#8a5232'); for (let xx = sx + 2; xx < sx + sw - 2; xx += 2) if (r() < 0.85) p.glow(xx, ry - 3 - Math.floor(r() * 2), 1 + (r() < 0.3 ? 1 : 0), 3, pick(r, ['#e0533f', '#2253a3', '#ffe66b', '#2f9c86', '#f2efe6', '#ff8a4c', '#9b5de5', '#7cbf3f'])); }
        if (st === 'grocery') { p.glow(sx + 2, y - 12, 14, 5, '#f2efe6'); for (let k = 0; k < 4; k++) p.glow(sx + 3 + k * 3, y - 11, 2, 3, pick(r, ['#ffe66b', '#ff8a4c', '#f2efe6'])); }
        p.rect(sx + sw - 16, y - 10, 15, 10, '#5c3424'); p.rect(sx + sw - 16, y - 10, 15, 1, '#8a5232'); p.glow(sx + sw - 13, y - 14, 4, 4, '#8fd3ff');
        if (o.awning !== false) { const aw = ['#e0533f', '#f2efe6']; for (let xx = sx - 2; xx < sx + sw + 2; xx++) { const c = aw[Math.floor((xx - sx) / 3) & 1]; p.rect(xx, sy - 3, 1, 5, c); } p.rect(sx - 2, sy + 2, sw + 4, 1, '#7d1c2b'); }
      }
    }
    for (let u = 0; u <= n; u++) p.rect(x0 + u * uw - 1, top + 4, 2, y - top - 4, wsh);
    for (const sg of o.signs || []) signBox(p, x0 + sg.unit * uw + 2, y - gf + 1, uw * (sg.span || 1) - 4, sg.h || 10, sg);
    for (const vs of o.vsigns || []) { const vx = x0 + vs.unit * uw + (vs.dx || uw - 4); signBox(p, vx, y - gf - fh + 2, 9, vs.h || 30, Object.assign({ vertical: true }, vs)); }
  };
  function signBox(p, x, y, w, h, sg) {
    const bg = sg.bg || '#b52b35', fg = sg.color || '#ffe66b', bd = sg.border || '#0b0a12'; const g = sg.lit !== false ? p.glow : p.rect;
    p.rect(x - 1, y - 1, w + 2, h + 2, bd); g(x, y, w, h, bg); if (sg.neon) { g(x, y, w, 1, fg); g(x, y + h - 1, w, 1, fg); g(x, y, 1, h, fg); g(x + w - 1, y, 1, h, fg); }
    if (!sg.text) return;
    if (sg.vertical) { const chars = Array.from(sg.text); chars.forEach((ch, k) => p.text(ch, x + w / 2, y + 5 + k * 9, sg.size || 8, fg, { glow: sg.lit !== false, th: 110 })); return; }
    p.text(sg.text, x + w / 2, y + h / 2 + (sg.dy || 0), sg.size || Math.min(9, h - 2), fg, { glow: sg.lit !== false, th: sg.th || 120, weight: sg.weight || 600 });
  }
  PR.sign = (p, o) => signBox(p, o.x - (o.w || 40) / 2, o.y - (o.h || 12), o.w || 40, o.h || 12, o);
  // modern street lamp with emissive head (pair with a scene light at the same spot)
  PR.streetlamp = (p, o) => { const x = o.x, y = o.y, h = o.h || 90, c = o.color || '#5f5d5a', d = o.dir || 1; p.rect(x - 1, y - h, 3, h, c); p.rect(x + 1, y - h, 1, h, sh(c, -0.25)); p.rect(x - 3, y - 4, 7, 4, c);
    for (let k = 0; k < 14; k++) p.px(x + d * k, y - h - Math.round(Math.sin(k / 14 * Math.PI / 2) * 5), c); p.rect(x + d * 12 - 4, y - h - 6, 9, 3, '#3d3a5c'); p.glow(x + d * 12 - 3, y - h - 3, 7, 2, '#fff6c2'); p.glow(x + d * 12 - 1, y - h - 1, 3, 1, '#ffffff'); };
  // food cart with striped umbrella, glass box, hanging bulb (steam: ambient 'steam' at the pot)
  PR.cart = (p, o, r) => { const x = o.x, y = o.y, um = o.umbrella || ['#e0533f', '#ffe66b'], st = '#b3b9d1';
    p.circle(x - 11, y - 3, 3, '#16141f'); p.circle(x + 11, y - 3, 3, '#16141f'); p.px(x - 11, y - 3, '#8c8a86'); p.px(x + 11, y - 3, '#8c8a86');
    p.rect(x - 17, y - 18, 34, 13, st); p.rect(x - 17, y - 18, 34, 1, '#f2efe6'); p.rect(x - 17, y - 7, 34, 2, '#7a7fa3'); p.rect(x + 12, y - 18, 5, 13, '#7a7fa3');
    p.rect(x - 14, y - 15, 22, 6, o.panel || '#2253a3'); p.text(o.text || 'ก๋วยเตี๋ยว', x - 3, y - 12, 6, '#ffe66b', { th: 100 });
    p.rect(x - 15, y - 29, 24, 11, '#3d3a5c'); p.glow(x - 14, y - 28, 22, 9, 'rgba(143,211,255,0.55)'); for (let k = 0; k < 5; k++) p.glow(x - 13 + k * 4, y - 22 - (k % 2) * 2, 3, 2, pick(r, ['#ff8a4c', '#f2d38a', '#7cbf3f', '#e0533f']));
    p.rect(x + 9, y - 25, 8, 7, '#8c8a86'); p.rect(x + 8, y - 26, 10, 2, '#b5b0a5');
    p.rect(x - 1, y - 58, 2, 30, '#5f5d5a');
    for (let yy = 0; yy < 12; yy++) { const hw = Math.round(6 + yy * 2.2); for (let xx = -hw; xx <= hw; xx++) p.px(x + xx, y - 70 + yy, um[Math.floor((xx + 40) / 6) & 1]); }
    p.rect(x - 32, y - 58, 65, 1, sh(um[0], -0.3)); for (let xx = -32; xx <= 32; xx += 3) p.px(x + xx, y - 57, um[0]);
    p.rect(x - 8, y - 57, 1, 4, '#16141f'); p.glow(x - 9, y - 53, 3, 3, '#fff6c2');
  };
  PR.busstop = (p, o) => { const x = o.x, y = o.y, c = o.color || '#2253a3';
    p.rect(x - 24, y - 44, 48, 3, c); p.rect(x - 24, y - 41, 48, 1, sh(c, -0.3)); p.rect(x - 22, y - 41, 2, 41, '#8c8a86'); p.rect(x + 20, y - 41, 2, 41, '#8c8a86');
    p.rect(x - 18, y - 38, 26, 22, '#16141f'); p.glow(x - 17, y - 37, 24, 20, '#8fd3ff'); p.glow(x - 15, y - 34, 10, 10, '#ff4fa3'); p.text('SALE', x - 3, y - 22, 7, '#ffffff', { glow: true, font: 'prompt', weight: 700 });
    p.rect(x - 16, y - 10, 30, 2, '#b5b0a5'); p.rect(x - 14, y - 8, 1, 8, '#5f5d5a'); p.rect(x + 11, y - 8, 1, 8, '#5f5d5a');
    p.rect(x + 28, y - 52, 2, 52, '#8c8a86'); p.circle(x + 29, y - 56, 6, '#f2efe6'); p.circle(x + 29, y - 56, 5, '#2253a3'); p.text('รถเมล์', x + 29, y - 56, 6, '#ffffff', { th: 90 }); };
  PR.bins = (p, o, r) => { const x = o.x, y = o.y, cols = o.colors || ['#2f9c86', '#ffc14a', '#2253a3'], n = cols.length;
    for (let k = 0; k < 5; k++) { const bx = x - n * 8 - 10 + Math.floor(r() * (n * 16 + 20)); const rr = 4 + Math.floor(r() * 3); p.circle(bx, y - rr, rr, '#16141f'); p.px(bx - 1, y - rr - 2, '#3d3a5c'); p.px(bx - 2, y - rr - 1, '#3d3a5c'); p.rect(bx, y - rr * 2 - 1, 1, 2, '#16141f'); }
    cols.forEach((c, i) => { const bx = x - (n * 16) / 2 + i * 16; p.rect(bx, y - 17, 13, 17, c); p.rect(bx + 9, y - 17, 4, 17, sh(c, -0.22)); p.rect(bx + 1, y - 17, 1, 17, sh(c, 0.15)); p.rect(bx - 1, y - 20, 15, 3, sh(c, -0.1)); p.rect(bx - 1, y - 20, 15, 1, sh(c, 0.15));
      p.rect(bx + 3, y - 12, 7, 4, '#f2efe6'); p.px(bx + 5, y - 11, c); p.px(bx + 7, y - 10, c); p.rect(bx + 1, y - 1, 2, 1, '#0b0a12'); p.rect(bx + 10, y - 1, 2, 1, '#0b0a12');
      if (i === 1) { p.poly([[bx - 1, y - 20], [bx + 14, y - 24], [bx + 14, y - 22], [bx - 1, y - 18]], sh(c, -0.1)); for (let k = 0; k < 4; k++) p.rect(bx + 2 + k * 3, y - 24 + (k % 2), 2, 4, pick(r, ['#8fd3ff', '#6fd6b0', '#f2efe6'])); } });
    for (let k = 0; k < 6; k++) { const bx = x - n * 8 - 6 + Math.floor(r() * (n * 16 + 12)); p.rect(bx, y - 2, 4, 2, pick(r, ['#8fd3ff', '#6fd6b0', '#f2efe6'])); p.px(bx + 4, y - 2, '#2253a3'); }
    p.poly([[x + n * 8 + 2, y], [x + n * 8 + 4, y - 18], [x + n * 8 + 12, y - 16], [x + n * 8 + 10, y]], '#b8773f'); p.rect(x + n * 8 + 5, y - 12, 5, 1, '#8a5232');
  };
  PR.cat = (p, o) => { const x = o.x, y = o.y, c = o.color || '#16141f'; p.rect(x - 3, y - 5, 6, 5, c); p.rect(x - 2, y - 9, 5, 4, c); p.px(x - 2, y - 10, c); p.px(x + 2, y - 10, c); p.rect(x + 3, y - 2, 4, 1, c); p.px(x + 6, y - 3, c); if (o.eyes !== false) { p.glow(x - 1, y - 8, 1, 1, '#c3e66b'); p.glow(x + 1, y - 8, 1, 1, '#c3e66b'); } };
  PR.moto = (p, o) => { const x = o.x, y = o.y, c = o.color || '#b52b35';
    p.circle(x - 7, y - 3, 3, '#0b0a12'); p.circle(x + 7, y - 3, 3, '#0b0a12'); p.px(x - 7, y - 3, '#8c8a86'); p.px(x + 7, y - 3, '#8c8a86');
    p.poly([[x - 8, y - 6], [x - 2, y - 10], [x + 6, y - 10], [x + 9, y - 6], [x + 2, y - 4]], c); p.rect(x - 6, y - 12, 8, 2, '#16141f'); p.rect(x + 6, y - 15, 1, 7, '#5f5d5a'); p.rect(x + 4, y - 16, 4, 1, '#5f5d5a'); p.px(x - 3, y - 9, sh(c, 0.3)); };
  PR.junkshop = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 96, h = o.h || 60, ry = y - h;
    p.rect(x + 2, ry + 6, w - 4, h - 6, '#231f33'); for (let xx = x + 3; xx < x + w - 2; xx += 3) p.rect(xx, ry + 6, 1, h - 6, '#2f2a47');
    p.rect(x, ry + 2, 3, h - 2, '#5f5d5a'); p.rect(x + w - 3, ry - 2, 3, h + 2, '#5f5d5a');
    p.poly([[x - 6, ry + 6], [x + w + 6, ry - 3], [x + w + 6, ry + 1], [x - 6, ry + 10]], '#8c8a86'); for (let xx = x - 5; xx < x + w + 6; xx += 3) p.line(xx, ry + 6 - Math.round((xx - x + 6) * 9 / (w + 12)), xx, ry + 9 - Math.round((xx - x + 6) * 9 / (w + 12)), '#5f5d5a');
    for (let k = 0; k < 14; k++) p.px(x - 4 + Math.floor(r() * (w + 8)), ry + 4 + Math.floor(r() * 4) - 2, pick(r, ['#8a5232', '#b8773f']));
    signBox(p, x + 8, ry + 12, 58, 12, { text: o.text || 'รับซื้อของเก่า', bg: '#ffe66b', color: '#b52b35', size: 9, lit: true, weight: 700 }); p.rect(x + 70, ry + 10, 1, 3, '#16141f'); p.glow(x + 69, ry + 13, 3, 3, '#fff6c2');
    for (let s = 0; s < 2; s++) for (let k = 0; k < 4 - s; k++) { const bx = x + 6 + s * 20, by = y - 9 - k * 9; p.rect(bx, by, 19, 9, k % 2 ? '#b8773f' : '#d9a35b'); for (let yy = by + 2; yy < by + 9; yy += 2) p.rect(bx, yy, 19, 1, '#8a5232'); p.rect(bx + 5, by, 1, 9, '#16141f'); p.rect(bx + 13, by, 1, 9, '#16141f'); }
    for (let k = 0; k < 3; k++) { const sx = x + 50 + k * 13, sy = y; p.poly([[sx - 6, sy], [sx - 7, sy - 12], [sx - 4, sy - 16], [sx + 4, sy - 16], [sx + 7, sy - 12], [sx + 6, sy]], '#d8d2c4'); for (let yy = sy - 14; yy < sy; yy += 2) p.rect(sx - 5, yy, 10, 1, '#b5b0a5'); for (let b = 0; b < 4; b++) { const bx = sx - 4 + b * 3; p.rect(bx, sy - 19 + (b % 2), 2, 4, pick(r, ['#8fd3ff', '#6fd6b0', '#f2efe6', '#3e8de0'])); p.px(bx, sy - 20 + (b % 2), '#2253a3'); } }
    const sx = x + w - 16; p.rect(sx - 7, y - 5, 14, 5, '#7a7fa3'); p.rect(sx - 7, y - 5, 14, 1, '#b3b9d1'); p.rect(sx - 1, y - 14, 2, 9, '#545577'); p.circle(sx, y - 17, 4, '#f2efe6'); p.rect(sx, y - 19, 1, 3, '#b52b35');
  };
  // ---------- canal life ----------
  PR.stilthouse = (p, o, r) => { const x = o.x, wl = o.y, w = o.w || 60, h = o.h || 32, deck = o.deck != null ? o.deck : wl - 10; const wood = o.color || '#8a5232', wd = sh(wood, -0.25), wl2 = sh(wood, 0.1), roof = o.roof || '#8c8a86';
    for (let sx = x + 1; sx < x + w; sx += 9) { p.rect(sx, deck, 2, wl - deck + 3, '#3b1f1a'); p.px(sx, deck + 2, wd); }
    p.rect(x - 5, deck - 2, w + 10, 3, wd); for (let xx = x - 5; xx < x + w + 5; xx += 4) p.px(xx, deck - 2, wl2);
    const top = deck - 2 - h;
    for (let bx = x; bx < x + w; bx += 3) { p.rect(bx, top, 3, h, ((bx - x) / 3) % 2 ? wood : wl2); if (r() < 0.25) p.rect(bx + 1, top + Math.floor(r() * h), 1, 2, wd); }
    p.rect(x, top, w, 2, wd); p.rect(x + w - 2, top, 2, h, wd);
    const nw = w > 50 ? 2 : 1; for (let k = 0; k < nw; k++) { const wx = x + 6 + k * Math.round(w / 2), wy = top + 8; const lit = r() < (o.litp != null ? o.litp : 0.6);
      p.rect(wx - 1, wy - 1, 14, 12, '#3b1f1a'); if (lit) { p.glow(wx, wy, 12, 10, '#ffc14a'); p.glow(wx + 1, wy + 6, 4, 4, '#b8773f'); } else p.rect(wx, wy, 12, 10, '#16141f');
      p.rect(wx - 5, wy - 1, 4, 12, wl2); p.rect(wx + 14, wy - 1, 4, 12, wl2); for (let yy = wy; yy < wy + 11; yy += 2) { p.px(wx - 4, yy, wd); p.px(wx + 15, yy, wd); } }
    p.rect(x + w - 16, top + 10, 10, h - 10, '#3b1f1a'); p.rect(x + w - 15, top + 11, 8, h - 11, sh(wood, -0.4));
    p.poly([[x - 8, top + 3], [x + w / 2, top - 15], [x + w + 8, top + 3]], roof); p.poly([[x + w / 2, top - 15], [x + w + 8, top + 3], [x + w / 2 + 3, top + 3]], sh(roof, -0.15));
    for (let k = -6; k <= 6; k++) { const xx = x + w / 2 + k * (w / 13); p.line(Math.round(x + w / 2), top - 15, Math.round(xx + k * 0.6), top + 3, sh(roof, -0.25)); }
    for (let k = 0; k < 18; k++) p.px(x - 6 + Math.floor(r() * (w + 12)), top - 8 + Math.floor(r() * 10), pick(r, ['#8a5232', '#b8773f', '#5c3424']));
    p.rect(x - 8, top + 3, w + 16, 1, '#16141f');
    for (let k = 0; k < 3; k++) { const px = x + 2 + Math.floor(r() * (w - 6)); p.rect(px, deck - 5, 4, 3, pick(r, ['#b52b35', '#2253a3', '#b8773f'])); p.rect(px - 1, deck - 10, 6, 5, pick(r, ['#3f7a2e', '#7cbf3f', '#2e5a23'])); if (r() < 0.5) p.px(px + 1, deck - 11, '#ff4fa3'); }
    if (o.laundry !== false) { const ly = top - 2; p.line(x - 8, ly, x + 10, ly + 2, '#16141f'); for (let k = 0; k < 3; k++) p.rect(x - 6 + k * 6, ly + 1, 4, 6 - (k % 2) * 2, pick(r, ['#ff8a4c', '#f2efe6', '#3e8de0', '#ffe66b'])); }
    if (o.ladder) { for (let yy = deck + 1; yy < wl; yy += 3) p.rect(x + w - 12, yy, 6, 1, '#5c3424'); p.rect(x + w - 12, deck, 1, wl - deck, '#3b1f1a'); p.rect(x + w - 7, deck, 1, wl - deck, '#3b1f1a'); }
  };
  PR.morningglory = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 40;
    for (let i = 0; i < w * 1.4; i++) { const u = r() * 2 - 1; const lx = Math.round(x + u * w / 2), hy = Math.round((1 - Math.abs(u)) * 4), ly = y - Math.floor(r() * (hy + 2)); const c = pick(r, ['#2e5a23', '#3f7a2e', '#7cbf3f', '#3f7a2e']);
      p.rect(lx - 1, ly, 3, 1, c); p.px(lx, ly - 1, c); p.px(lx - 2, ly + 1, sh(c, -0.2)); p.px(lx + 2, ly + 1, sh(c, -0.2)); if (r() < 0.25) p.px(lx, ly - 1, '#c3e66b'); }
    for (let k = 0; k < w / 6; k++) { const sx = Math.round(x - w / 2 + r() * w), hh = 3 + Math.floor(r() * 6); p.rect(sx, y - hh, 1, hh, '#7cbf3f'); p.rect(sx - 1, y - hh - 1, 3, 2, '#3f7a2e'); p.px(sx, y - hh - 2, '#c3e66b'); }
    for (let k = 0; k < Math.max(2, w / 12); k++) { const fx = Math.round(x - w / 2 + r() * w), fy = y - 2 - Math.floor(r() * 4); p.rect(fx, fy, 2, 2, '#f2efe6'); p.px(fx + 1, fy + 1, '#ff4fa3'); p.px(fx - 1, fy, '#f2efe6'); }
    p.rect(x - w / 2 - 2, y + 1, w + 4, 1, '#14261c');
  };
  PR.boat = (p, o) => { const x = o.x, y = o.y, w = o.w || 46, c = o.color || '#5c3424'; p.poly([[x - w / 2, y - 6], [x + w / 2 + 4, y - 8], [x + w / 2 - 2, y], [x - w / 2 + 4, y]], c); p.rect(x - w / 2 + 1, y - 6, w + 1, 1, sh(c, 0.25)); p.rect(x - w / 2 + 5, y - 3, w - 6, 1, sh(c, -0.25)); for (let k = 1; k < 4; k++) p.rect(x - w / 2 + k * w / 4, y - 6, 1, 5, sh(c, -0.2)); p.rect(x + w / 2 - 4, y - 14, 1, 8, '#3b1f1a'); };
  // fence: chain-link or concrete-block, optional climbing ivy gourd (ตำลึง): 5-lobed leaves, white flowers, red fruit
  PR.fence = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 80, h = o.h || 30, pc = o.color || '#8c8a86';
    if (o.kind === 'block') { p.rect(x, y - h, w, h, '#b5b0a5'); for (let yy = y - h; yy < y; yy += 6) { p.rect(x, yy, w, 1, '#8c8a86'); for (let xx = x + ((yy / 6) & 1) * 6; xx < x + w; xx += 12) p.rect(xx, yy, 1, 6, '#8c8a86'); } for (let k = 0; k < w; k++) if (r() < 0.2) p.rect(x + k, y - 3 - Math.floor(r() * 5), 1, 3, '#5f5d5a'); p.rect(x - 1, y - h - 2, w + 2, 2, '#d8d2c4'); }
    else { for (let yy = y - h; yy < y; yy++) for (let xx = x; xx < x + w; xx++) if (((xx + yy) & 3) === 0 || ((xx - yy) & 3) === 0) p.px(xx, yy, sh(pc, -0.15)); p.rect(x, y - h, w, 1, pc); for (let px = x; px <= x + w; px += 20) { p.rect(px - 1, y - h - 2, 3, h + 2, pc); p.px(px + 1, y - h - 2, sh(pc, -0.3)); } }
    if (!o.vine) return; const lv = ['#2e5a23', '#3f7a2e', '#7cbf3f'];
    for (let v = 0; v < w / 5; v++) { let vx = x + r() * w, vy = y; const len = h * (0.6 + r() * 0.6);
      for (let s = 0; s < len; s++) { vx += (r() - 0.5) * 1.6; vy -= 1; p.px(vx, vy, '#2e5a23');
        if (s % 4 === 2) { const lx = Math.round(vx + (r() < 0.5 ? -2 : 2)), ly = Math.round(vy); const c = pick(r, lv); p.rect(lx - 1, ly - 1, 3, 3, c); p.px(lx - 2, ly, c); p.px(lx + 2, ly, c); p.px(lx, ly - 2, c); p.px(lx - 1, ly - 1, sh(c, 0.2)); if (r() < 0.25) p.px(lx, ly, '#c3e66b'); }
        if (r() < 0.04) { p.rect(vx + 1, vy, 2, 2, '#f2efe6'); p.px(vx + 2, vy + 1, '#ffe66b'); }
        if (r() < 0.035) { const fc = r() < 0.6 ? '#e0533f' : '#7cbf3f'; p.rect(vx - 2, vy + 1, 2, 3, fc); p.px(vx - 2, vy + 1, fc === '#e0533f' ? '#ff8a4c' : '#c3e66b'); } } }
    for (let k = 0; k < w; k += 3) if (r() < 0.6) { const c = pick(r, lv); p.rect(x + k, y - h - 1 - Math.floor(r() * 3), 3, 2, c); }
  };
  // ---------- small rented room ----------
  PR.window2 = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 40, h = o.h || 32, fr = o.color || '#b5b0a5';
    p.rect(x - 2, y - 2, w + 4, h + 4, fr); p.rect(x - 2, y + h, w + 4, 2, sh(fr, -0.25)); p.ditherV(x, y, w, h, o.sky || '#16141f', o.sky2 || '#2f2a47', 3);
    if (o.view !== 'none') { for (let k = 0; k < 7; k++) { const bw = 4 + Math.floor(r() * 6), bh = 6 + Math.floor(r() * (h - 8)); const bx = x + Math.floor(r() * (w - bw)); p.rect(bx, y + h - bh, bw, bh, '#231f33'); for (let yy = y + h - bh + 2; yy < y + h - 1; yy += 2) for (let xx = bx + 1; xx < bx + bw - 1; xx += 2) if (r() < 0.3) p.glow(xx, yy, 1, 1, pick(r, LIT)); } }
    p.rect(x + (w >> 1) - 1, y, 2, h, fr); for (let gx = x + 3; gx < x + w; gx += 5) p.rect(gx, y, 1, h, '#3d3a5c');
    if (o.curtain) { p.rect(x - 4, y - 4, 9, h + 6, o.curtain); for (let yy = y - 4; yy < y + h + 2; yy += 2) p.px(x - 1, yy, sh(o.curtain, -0.25)); p.rect(x - 6, y - 5, w + 12, 1, '#5f5d5a'); } };
  PR.bulb = (p, o) => { const x = o.x, y = o.y; p.rect(x, o.top || 0, 1, y - (o.top || 0) - 3, '#16141f'); p.rect(x - 1, y - 3, 3, 2, '#3d3a5c'); p.glow(x - 1, y - 1, 3, 4, '#fff6c2'); p.glow(x, y, 1, 2, '#ffffff'); };
  PR.mattress = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 58, c = o.color || '#2253a3';
    p.rect(x - w / 2, y - 6, w, 6, c); p.rect(x - w / 2, y - 6, w, 1, sh(c, 0.2)); for (let xx = x - w / 2 + 3; xx < x + w / 2; xx += 6) p.px(xx, y - 3, '#8fd3ff'); p.rect(x - w / 2, y - 1, w, 1, sh(c, -0.3));
    p.rect(x - w / 2 + 2, y - 10, 13, 4, '#f2efe6'); p.rect(x - w / 2 + 2, y - 7, 13, 1, '#b3b9d1');
    p.poly([[x - 4, y - 6], [x + 2, y - 11], [x + 10, y - 9], [x + w / 2 - 2, y - 6]], o.blanket || '#b52b35'); p.line(x + 1, y - 9, x + 8, y - 7, sh(o.blanket || '#b52b35', -0.25)); };
  PR.standfan = (p, o) => { const x = o.x, y = o.y, h = o.h || 30, c = o.color || '#b3b9d1'; p.rect(x - 6, y - 2, 13, 2, '#7a7fa3'); p.rect(x, y - h + 8, 1, h - 10, c); p.rect(x - 2, y - h + 6, 5, 3, '#7a7fa3');
    const cy = y - h - 2; for (let a = 0; a < TAU; a += 0.2) p.px(Math.round(x + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 9), c); p.rect(x - 9, cy, 19, 1, sh(c, -0.25)); p.rect(x, cy - 9, 1, 19, sh(c, -0.25)); p.rect(x - 1, cy - 1, 3, 3, '#3e8de0'); };
  PR.calendar = (p, o) => { const x = o.x, y = o.y; p.rect(x, y, 14, 17, '#f2efe6'); p.rect(x, y, 14, 4, '#b52b35'); for (let r0 = 0; r0 < 4; r0++) for (let c = 0; c < 4; c++) p.px(x + 2 + c * 3, y + 6 + r0 * 3, '#7a7fa3'); p.rect(x + 7, y + 11, 3, 3, '#e0533f'); p.px(x + 8, y + 12, '#f2efe6'); p.px(x + 7, y - 1, '#16141f'); };
  PR.bucket = (p, o) => { const x = o.x, y = o.y, c = o.color || '#3e8de0'; p.poly([[x - 6, y - 10], [x + 6, y - 10], [x + 5, y], [x - 5, y]], c); p.rect(x - 6, y - 10, 12, 1, sh(c, 0.25)); p.rect(x + 2, y - 9, 3, 9, sh(c, -0.2)); p.rect(x - 5, y - 9, 10, 1, '#8fd3ff'); for (let a = 0; a < Math.PI; a += 0.25) p.px(Math.round(x + Math.cos(a) * 6), Math.round(y - 10 - Math.sin(a) * 5), '#16141f'); };
  PR.shelf = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 30; p.rect(x - w / 2, y, w, 2, '#8a5232'); p.rect(x - w / 2, y + 2, w, 1, '#5c3424');
    for (let xx = x - w / 2 + 1; xx < x + w / 2 - 2; xx += 4) { const hh = 3 + Math.floor(r() * 6); p.rect(xx, y - hh, 3, hh, pick(r, ['#f2efe6', '#e0533f', '#ffc14a', '#2f9c86', '#3e8de0'])); } };
  PR.ricecooker = (p, o) => { const x = o.x, y = o.y; p.rect(x - 7, y - 10, 14, 10, '#f2efe6'); p.rect(x - 8, y - 12, 16, 3, '#d8d2c4'); p.rect(x - 2, y - 14, 4, 2, '#b3b9d1'); p.rect(x + 3, y - 10, 4, 10, '#b3b9d1'); p.glow(x - 4, y - 5, 2, 1, '#e0533f'); };
  PR.stain = (p, o, r) => { for (let i = 0; i < (o.n || 30); i++) { const sx = o.x + (r() - 0.5) * (o.w || 30), sy = o.y + r() * (o.h || 20); p.px(sx, sy, o.color || '#2f2a47'); } };
  PR.clothesrail = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 34; p.rect(x - w / 2, y, w, 1, '#8c8a86'); p.rect(x - w / 2, y - 2, 1, 3, '#5f5d5a'); p.rect(x + w / 2 - 1, y - 2, 1, 3, '#5f5d5a');
    for (let k = 0; k < (o.n || 4); k++) { const hx = x - w / 2 + 4 + k * 8, c = pick(r, ['#e0533f', '#f2efe6', '#3e8de0', '#ffc14a', '#2f9c86', '#16141f']); p.px(hx + 2, y + 1, '#b3b9d1'); p.line(hx - 1, y + 3, hx + 2, y + 1, '#b3b9d1'); p.line(hx + 2, y + 1, hx + 5, y + 3, '#b3b9d1');
      p.rect(hx - 1, y + 3, 7, 12 + (k % 2) * 4, c); p.rect(hx - 2, y + 3, 1, 5, c); p.rect(hx + 6, y + 3, 1, 5, c); p.rect(hx + 4, y + 3, 2, 12 + (k % 2) * 4, sh(c, -0.2)); p.px(hx + 2, y + 4, sh(c, -0.35)); } };
  PR.drawers = (p, o) => { const x = o.x, y = o.y, c = o.color || '#8fd3ff'; p.rect(x - 9, y - 27, 18, 27, '#f2efe6'); for (let k = 0; k < 3; k++) { const dy = y - 26 + k * 9; p.rect(x - 8, dy, 16, 8, k === 1 ? (o.color2 || '#ff4fa3') : c); p.rect(x - 8, dy + 7, 16, 1, sh(c, -0.3)); p.rect(x - 3, dy + 3, 6, 1, '#f2efe6'); } p.rect(x + 6, y - 27, 3, 27, '#d8d2c4'); };
  PR.lowtable = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 26; p.rect(x - w / 2, y - 9, w, 2, '#8a5232'); p.rect(x - w / 2 + 1, y - 7, 2, 7, '#5c3424'); p.rect(x + w / 2 - 3, y - 7, 2, 7, '#5c3424');
    p.rect(x - w / 2 + 2, y - 15, 7, 6, '#b3b9d1'); p.rect(x - w / 2 + 9, y - 13, 2, 1, '#b3b9d1'); p.rect(x - w / 2 + 3, y - 17, 5, 2, '#8c8a86');
    for (let k = 0; k < 3; k++) { p.rect(x + 1 + k * 4, y - 15 + (k === 1 ? -5 : 0), 4, 6, '#f2efe6'); p.rect(x + 1 + k * 4, y - 15 + (k === 1 ? -5 : 0), 4, 2, '#e0533f'); } };
  PR.poster = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 16, h = o.h || 22; p.rect(x, y, w, h, o.color || '#2253a3'); p.ditherV(x + 1, y + 1, w - 2, h - 8, o.c1 || '#ff8a4c', o.c2 || '#7d1c2b', 3); p.circle(x + w / 2, y + h / 2 - 3, 3, '#16141f'); p.rect(x + 2, y + h - 6, w - 4, 1, '#f2efe6'); p.rect(x + 3, y + h - 4, w - 6, 1, '#ffe66b'); p.px(x + 1, y + 1, '#f2efe6'); p.px(x + w - 2, y + 1, '#f2efe6'); };
  PR.clock = (p, o) => { const x = o.x, y = o.y; p.circle(x, y, 5, '#16141f'); p.circle(x, y, 4, '#f2efe6'); p.rect(x, y - 3, 1, 3, '#16141f'); p.rect(x, y, 2, 1, '#e0533f'); };
  PR.gecko = (p, o) => { const x = o.x, y = o.y, c = o.color || '#9a958b'; p.rect(x, y, 1, 5, c); p.px(x, y - 1, c); p.px(x - 1, y + 1, c); p.px(x + 1, y + 1, c); p.px(x - 1, y + 4, c); p.px(x + 1, y + 4, c); p.px(x, y + 6, c); p.px(x + 1, y + 7, c); };
  PR.conduit = (p, o) => { for (const seg of o.path || []) p.line(seg[0], seg[1], seg[2], seg[3], o.color || '#d8d2c4'); if (o.switch) { p.rect(o.switch[0] - 2, o.switch[1] - 3, 5, 6, '#f2efe6'); p.px(o.switch[0], o.switch[1] - 1, '#5f5d5a'); } };
  PR.lotuspot = (p, o, r) => { const x = o.x, y = o.y, s = o.s || 1, c = o.color || '#2253a3'; p.poly([[x - 12 * s, y - 14 * s], [x + 12 * s, y - 14 * s], [x + 8 * s, y], [x - 8 * s, y]], c); p.rect(x - 13 * s, y - 16 * s, 26 * s, 3 * s, sh(c, 0.15)); for (let k = 0; k < 5; k++) p.rect(x - 9 * s + k * 4 * s, y - 10 * s, 2 * s, 2 * s, '#f2efe6');
    for (let k = 0; k < 4; k++) { const lx = x - 10 * s + k * 7 * s; p.rect(lx, y - 19 * s, 7 * s, 3 * s, k % 2 ? '#3f7a2e' : '#2e5a23'); }
    p.rect(x - 1, y - 30 * s, 2, 12 * s, '#3f7a2e'); p.poly([[x - 5 * s, y - 30 * s], [x, y - 38 * s], [x + 5 * s, y - 30 * s], [x, y - 27 * s]], '#ff4fa3'); p.px(x, y - 33 * s, '#f2efe6'); };
  PR.bush = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 30, c = o.color || '#2e5a23'; for (let k = 0; k < w * 1.5; k++) { const u = r() * 2 - 1; const bx = x + u * w / 2, by = y - r() * (1 - Math.abs(u)) * (o.h || 14); p.rect(bx, by, 3, 2, pick(r, [c, sh(c, 0.2), '#3f7a2e'])); } if (o.flowers) for (let k = 0; k < w / 4; k++) { const fx = x + (r() - 0.5) * w * 0.9, fy = y - r() * (o.h || 14) * 0.8; p.rect(fx, fy, 2, 2, o.flowers); p.px(fx, fy, '#ffe66b'); } };
  PR.slippers = (p, o) => { const x = o.x, y = o.y, c = o.color || '#3e8de0'; for (const dx of [0, 9]) { p.rect(x + dx, y - 3, 7, 3, c); p.rect(x + dx, y - 3, 7, 1, sh(c, 0.25)); p.rect(x + dx + 2, y - 4, 3, 1, '#f2efe6'); } };
  PR.coil = (p, o) => { const x = o.x, y = o.y; p.rect(x - 4, y - 1, 9, 1, '#5f5d5a'); for (let a = 0; a < Math.PI * 4; a += 0.3) { const rr = 1 + a * 0.4; p.px(Math.round(x + Math.cos(a) * rr), Math.round(y - 3 + Math.sin(a) * rr * 0.4), '#24605a'); } p.glow(x + 5, y - 3, 1, 1, '#ff8a4c'); };
  // ---------- temple ----------
  // Thai temple hall, front view: white base & stairs with naga, columns, gold doors, three-tier orange roof, gold gable, chofa & bai raka
  PR.wat = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 150, bw = Math.round(w * 0.72); const wh = '#f2efe6', ws = '#b3b9d1', gold = '#ffc14a', gd = '#b8773f', gh = '#ffe66b', tile = o.tile || '#e0533f', td = '#b52b35', gr = o.trim || '#24605a';
    p.rect(x - w / 2, y - 7, w, 7, wh); p.rect(x - w / 2, y - 2, w, 2, ws); p.rect(x - w / 2 + 6, y - 13, w - 12, 6, wh); p.rect(x - w / 2 + 6, y - 9, w - 12, 2, ws);
    for (let k = 0; k < 5; k++) p.rect(x - 14 + k, y - 13 + k * 0 + Math.round(k * 2.6) - 0, 28 - 2 * k, 2, k % 2 ? wh : ws);
    for (const s of [-1, 1]) { const nx = x + s * 16; p.rect(nx - 1, y - 12, 3, 12, gr); p.rect(nx - 1, y - 16, 3, 4, gr); p.px(nx + s, y - 17, gr); p.px(nx + s * 2, y - 17, gold); p.px(nx, y - 13, gold); }
    const yE = y - 13 - 40; p.rect(x - bw / 2, yE, bw, 40, wh); p.rect(x + bw / 2 - 6, yE, 6, 40, ws);
    p.rect(x - bw / 2, yE + 2, bw, 3, gold); p.rect(x - bw / 2, yE + 5, bw, 1, gd);
    for (let k = 0; k < 3; k++) { const dx = x - 14 + k * 11; p.rect(dx - 1, yE + 12, 10, 28, gold); p.rect(dx, yE + 13, 8, 27, '#7d1c2b'); p.rect(dx + 1, yE + 15, 6, 10, gd); p.rect(dx + 2, yE + 16, 4, 8, gold); p.px(dx + 3, yE + 19, gh); p.rect(dx - 2, yE + 9, 12, 3, gold); p.px(dx + 3, yE + 7, gold); p.px(dx + 4, yE + 6, gold); }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const cx = x + s * (24 + k * 13); p.rect(cx - 2, yE + 6, 5, 34, '#ffffff'); p.rect(cx + 2, yE + 6, 1, 34, ws); p.rect(cx - 3, yE + 6, 7, 2, gold); p.rect(cx - 2, yE + 8, 5, 1, gd); p.rect(cx - 3, yE + 38, 7, 2, gold); }
    const band = (xi, yi, xo, yo, th) => { const pts = [[xi, yi], [xo, yo], [xo, yo + th], [xi, yi + th]]; p.poly(pts, tile); for (let k = 2; k < th; k += 2) p.line(xi, yi + k, xo, yo + k, td); p.line(xi, yi, xo, yo, gr); p.line(xi, yi + th, xo, yo + th, gr);
      const n = Math.abs(xo - xi); for (let k = 0; k <= n; k += 2) { const u = k / n; p.px(Math.round(xi + (xo - xi) * u), Math.round(yi + (yo - yi) * u) - 1, gold); }
      const sx = Math.sign(xo - xi); p.px(xo + sx, yo + th - 1, gold); p.px(xo + sx * 2, yo + th - 2, gold); p.px(xo + sx * 2, yo + th - 3, gh); p.px(xo + sx, yo + th - 4, gold); };
    for (const s of [-1, 1]) { band(x + s * bw * 0.3, yE - 20, x + s * (w / 2 + 4), yE + 2, 7); band(x + s * bw * 0.2, yE - 42, x + s * (bw * 0.47), yE - 14, 7); }
    const gw = Math.round(bw * 0.6), gy = yE - 12, gt = yE - 80;
    p.poly([[x - gw / 2, gy], [x, gt], [x + gw / 2, gy]], tile); for (let k = 2; k < 6; k += 2) { p.line(x - gw / 2 + k, gy, x, gt + k, td); p.line(x + gw / 2 - k, gy, x, gt + k, td); }
    const ig = gw / 2 - 7; p.poly([[x - ig, gy - 1], [x, gt + 11], [x + ig, gy - 1]], gold);
    const R2 = LSE.rng(LSE.hash('wat-gable')); for (let k = 0; k < 120; k++) { const u = R2(), v = R2(); const yy = Math.round(gt + 14 + v * (gy - gt - 16)); const half = (yy - (gt + 11)) / (gy - 1 - (gt + 11)) * ig - 2; if (half < 1) continue; const dx = Math.round(u * half); const c = R2() < 0.5 ? gd : gh; p.px(x + dx, yy, c); p.px(x - dx, yy, c); }
    p.circle(x, gt + Math.round((gy - gt) * 0.62), 4, gh); p.circle(x, gt + Math.round((gy - gt) * 0.62), 2, '#e0533f'); p.rect(x - gw / 2, gy, gw, 3, gold); p.rect(x - gw / 2, gy + 3, gw, 1, gd);
    for (const s of [-1, 1]) { for (let k = 0; k <= gw / 2; k += 2) { const u = k / (gw / 2); const xx = Math.round(x + s * (gw / 2) * (1 - u)), yy = Math.round(gy + (gt - gy) * u); p.px(xx + s, yy - 1, gold); if (k % 4 === 0) p.px(xx + s, yy - 2, gh); } p.px(x + s * (gw / 2 + 1), gy - 1, gold); p.px(x + s * (gw / 2 + 2), gy - 3, gold); p.px(x + s * (gw / 2 + 2), gy - 4, gh); }
    for (let k = 1; k <= 6; k++) p.px(x, gt - k, gold); p.px(x + 1, gt - 7, gold); p.px(x + 2, gt - 7, gh); p.px(x + 3, gt - 6, gold); p.px(x + 3, gt - 5, gold); p.px(x - 1, gt - 3, gh);
  };
  PR.chedi = (p, o) => { const x = o.x, y = o.y, h = o.h || 80, c = o.color || '#ffc14a', d = sh(c, -0.3), hi = '#ffe66b'; const b = Math.round(h * 0.36);
    for (let k = 0; k < 3; k++) { const ww = b - k * 6, yy = y - (k + 1) * 5; p.rect(x - ww / 2, yy, ww, 5, c); p.rect(x + ww / 2 - Math.round(ww * 0.3), yy, Math.round(ww * 0.3), 5, d); p.rect(x - ww / 2, yy, ww, 1, hi); }
    const by = y - 15, bh = Math.round(h * 0.32), bw = b - 10;
    for (let yy = 0; yy < bh; yy++) { const hw = Math.round(bw / 2 * (0.3 + 0.7 * Math.pow(yy / bh, 0.6))); p.rect(x - hw, by - bh + yy, hw * 2 + 1, 1, c); p.rect(x + Math.round(hw * 0.4), by - bh + yy, Math.max(1, hw - Math.round(hw * 0.4)), 1, d); p.px(x - Math.round(hw * 0.6), by - bh + yy, hi); }
    const sy = by - bh; p.rect(x - 4, sy - 5, 9, 5, c); p.rect(x + 2, sy - 5, 3, 5, d);
    const sp = h - 15 - bh - 5; for (let k = 0; k < sp; k++) { const hw = Math.max(0, Math.round(3 * (1 - k / sp))); p.rect(x - hw, sy - 5 - k, hw * 2 + 1, 1, k % 3 === 0 ? d : c); if (hw) p.px(x - hw, sy - 5 - k, hi); }
    p.px(x, sy - 5 - sp - 1, '#ffffff'); };
  PR.bigtree = (p, o, r) => { const x = o.x, y = o.y, h = o.h || 90, rad = o.r || 36, c = o.color || '#24605a', hi = o.hi || '#3f7a2e', hi2 = o.hi2 || '#7cbf3f', dk = sh(c, -0.3);
    p.poly([[x - 6, y], [x - 3, y - h + 20], [x + 3, y - h + 20], [x + 7, y]], '#3b1f1a'); p.rect(x + 1, y - h + 20, 2, h - 20, '#5c3424'); p.poly([[x - 9, y], [x - 5, y - 4], [x - 3, y]], '#3b1f1a'); p.poly([[x + 10, y], [x + 5, y - 5], [x + 4, y]], '#3b1f1a');
    p.line(x, y - h + 30, x - 14, y - h + 12, '#3b1f1a'); p.line(x + 1, y - h + 26, x + 16, y - h + 10, '#3b1f1a');
    if (o.sash) { const cs = ['#ffe66b', '#e0533f', '#2f9c86']; cs.forEach((cc, k) => p.rect(x - 5, y - 22 + k * 2, 11, 2, cc)); }
    const cy = y - h; const blobs = []; for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU + r() * 0.5; blobs.push([x + Math.cos(a) * rad * 0.55, cy + Math.sin(a) * rad * 0.35, rad * (0.38 + r() * 0.18)]); } blobs.push([x, cy - rad * 0.1, rad * 0.55]);
    for (const [bx, by, br] of blobs) p.circle(bx, by + 3, Math.round(br), dk);
    for (const [bx, by, br] of blobs) p.circle(bx, by, Math.round(br), c);
    for (const [bx, by, br] of blobs) for (let k = 0; k < br * br * 0.9; k++) { const a = r() * TAU, d = Math.sqrt(r()) * br; const px = bx + Math.cos(a) * d, py = by + Math.sin(a) * d; if (py - by < -br * 0.15 && px - bx < br * 0.3) p.px(px, py, r() < 0.3 ? hi2 : hi); else if (py - by > br * 0.4) p.px(px, py, dk); }
    for (let k = 0; k < rad * 6; k++) { const a = r() * TAU; const [bx, by, br] = blobs[Math.floor(r() * blobs.length)]; p.px(bx + Math.cos(a) * (br + 1), by + Math.sin(a) * (br + 1), r() < 0.5 ? c : hi); } };
  PR.almstable = (p, o, r) => { const x = o.x, y = o.y, w = o.w || 80;
    p.rect(x - w / 2 + 2, y - 10, 2, 10, '#3b1f1a'); p.rect(x + w / 2 - 4, y - 10, 2, 10, '#3b1f1a'); p.rect(x - w / 2, y - 14, w, 3, '#f2efe6'); p.rect(x - w / 2, y - 11, w, 8, '#f2efe6'); for (let xx = x - w / 2 + 4; xx < x + w / 2; xx += 7) p.rect(xx, y - 11, 1, 8, '#b3b9d1'); p.rect(x - w / 2, y - 4, w, 1, '#b3b9d1');
    const pots = o.pots || [-24, -8, 10]; for (const dx of pots) { const px = x + dx; p.rect(px - 6, y - 24, 13, 10, '#b5b0a5'); p.rect(px - 7, y - 25, 15, 2, '#d8d2c4'); p.rect(px + 3, y - 24, 4, 10, '#8c8a86'); p.rect(px - 5, y - 22, 1, 7, '#d8d2c4'); p.rect(px - 3, y - 27, 7, 2, '#8c8a86'); p.rect(px, y - 28, 1, 1, '#5f5d5a'); }
    for (let k = 0; k < 4; k++) p.rect(x + 22, y - 15 - k * 2, 10, 2, k % 2 ? '#f2efe6' : '#d8d2c4');
    const bx = x - w / 2 + 6; p.rect(bx - 1, y - 58, 2, 44, '#5c3424'); p.rect(bx + w - 14, y - 58, 2, 44, '#5c3424'); p.rect(bx, y - 58, w - 13, 17, '#b52b35'); p.rect(bx, y - 58, w - 13, 1, '#e0533f'); p.rect(bx, y - 42, w - 13, 1, '#7d1c2b'); p.rect(bx, y - 41, w - 13, 1, '#ffc14a');
    p.text(o.text || 'โรงทาน', bx + (w - 13) / 2, y - 50, 13, '#ffe66b', { th: 100, weight: 700 }); };
  PR.flags = (p, o) => { const x0 = o.x0, x1 = o.x1, y0 = o.y, sag = o.sag || 10, cols = o.colors || ['#e0533f', '#ffe66b', '#2253a3', '#f2efe6', '#2f9c86', '#ff4fa3'];
    let k = 0; for (let x = x0; x <= x1; x++) { const u = (x - x0) / (x1 - x0); const y = Math.round(y0 + sag * 4 * u * (1 - u)); p.px(x, y, '#3d3a5c'); if ((x - x0) % 7 === 0) { const c = cols[k++ % cols.length]; p.poly([[x, y + 1], [x + 5, y + 1], [x + 2, y + 6]], c); } } };

  // ---------- ambient life ----------
  const A = S.ambientExt;
  // BTS train crossing the viaduct once per period (body behind actors, windows lit in the glow pass)
  A.train = (ctx, a, e) => { if (e.which !== 'back' && e.which !== 'glow') return; const P1 = S.period(a.period || 10, e.L); const u = LSE.frac(e.t + (a.phase || 0) * P1, P1); const span = (a.dur || 3) / P1; if (u > span) return;
    const k = u / span, cars = a.cars || 3, cw = 44, len = cars * (cw + 2), dir = a.dir || 1; const x0 = dir > 0 ? -len - 10 + k * (W + len + 20) : W + 10 - k * (W + len + 20); const ox = Math.round(x0 - e.camX * 0.55), y = a.y - 12;
    for (let c = 0; c < cars; c++) { const cx = ox + c * (cw + 2); const front = dir > 0 ? c === cars - 1 : c === 0;
      if (e.which === 'back') { ctx.fillStyle = a.color || '#d8d2c4'; ctx.fillRect(cx, y, cw, 11); ctx.fillStyle = '#9a958b'; ctx.fillRect(cx, y, cw, 1); ctx.fillRect(cx, y + 10, cw, 1); ctx.fillStyle = a.stripe || '#2f9c86'; ctx.fillRect(cx, y + 7, cw, 2); ctx.fillStyle = a.stripe2 || '#24605a'; ctx.fillRect(cx, y + 9, cw, 1);
        ctx.fillStyle = '#16141f'; ctx.fillRect(cx + 2, y + 2, cw - 4, 4); if (front) { ctx.fillStyle = '#0b0a12'; ctx.fillRect(dir > 0 ? cx + cw - 4 : cx, y, 4, 2); } ctx.fillStyle = '#3d3a5c'; ctx.fillRect(cx + cw, y + 3, 2, 6); }
      else { ctx.fillStyle = '#fff6c2'; for (let wx = cx + 3; wx < cx + cw - 4; wx += 5) ctx.fillRect(wx, y + 3, 3, 2); if (front) { ctx.fillStyle = '#ffffff'; ctx.fillRect(dir > 0 ? cx + cw - 2 : cx + 1, y + 8, 1, 1); ctx.globalAlpha = 0.35; ctx.fillRect(dir > 0 ? cx + cw : cx - 8, y + 8, 8, 1); ctx.globalAlpha = 1; } } } };
  // traffic in two lanes: cars, pink taxis, tuk-tuks, motorbikes; lights in the glow pass
  A.traffic = (ctx, a, e) => { const pass = a.pass || 'back'; if (e.which !== pass && e.which !== 'glow') return; const sc = a.scale || 1; if (sc !== 1) { ctx.save(); ctx.translate(0, a.y0); ctx.scale(sc, sc); ctx.translate(0, -a.y0); } const R = e.rnd; const n = a.count || 6; const P1 = S.period(a.period || 6, e.L);
    for (let i = 0; i < n; i++) { const lane = i % 2, dir = lane ? -1 : 1, kind = Math.floor(R() * 5), body = ['#ff4fa3', '#7cbf3f', '#b3b9d1', '#3d3a5c', '#b52b35', '#2253a3'][Math.floor(R() * 6)], ph = R(), sp = 1 + Math.floor(R() * 2);
      const u = LSE.frac(e.t * sp + ph * P1, P1); const span = W / sc + 80; const x = Math.round(dir > 0 ? -40 + u * span : W / sc + 40 - u * span); const y = (lane ? a.y0 : a.y0 + 6) + 6;
      const len = kind === 3 ? 10 : kind === 2 ? 15 : 24;
      if (e.which === 'back') { ctx.fillStyle = '#0b0a12'; ctx.fillRect(x + 3, y, 3, 1); ctx.fillRect(x + len - 6, y, 3, 1);
        if (kind === 3) { ctx.fillStyle = '#3d3a5c'; ctx.fillRect(x, y - 3, len, 2); ctx.fillStyle = '#16141f'; ctx.fillRect(x + 4, y - 8, 3, 5); ctx.fillRect(x + 4, y - 10, 3, 2); }
        else if (kind === 2) { ctx.fillStyle = '#2253a3'; ctx.fillRect(x, y - 9, len, 2); ctx.fillStyle = '#ffc14a'; ctx.fillRect(x + 1, y - 5, len - 2, 4); ctx.fillStyle = '#16141f'; ctx.fillRect(x + 3, y - 7, 9, 2); }
        else { ctx.fillStyle = body; ctx.fillRect(x, y - 5, len, 4); ctx.fillRect(x + 5, y - 8, len - 11, 3); ctx.fillStyle = '#16141f'; ctx.fillRect(x + 6, y - 7, len - 13, 2); if (body === '#ff4fa3' || body === '#7cbf3f') { ctx.fillStyle = '#ffe66b'; ctx.fillRect(x + (len >> 1) - 2, y - 9, 4, 1); } } }
      else { const fx = dir > 0 ? x + len - 1 : x, bx = dir > 0 ? x : x + len - 1; ctx.fillStyle = '#fff6c2'; ctx.fillRect(fx, y - 4, 1, 1); ctx.globalAlpha = 0.28; ctx.fillRect(dir > 0 ? fx + 1 : fx - 10, y - 4, 10, 1); ctx.globalAlpha = 1; ctx.fillStyle = '#e0533f'; ctx.fillRect(bx, y - 4, 1, 1); } }
    if (sc !== 1) ctx.restore(); };
  A.steam = (ctx, a, e) => { if (e.which !== 'back') return; const P1 = S.period(a.period || 2, e.L); for (const x0 of a.xs || [a.x || 135]) for (let k = 0; k < (a.count || 6); k++) { const u = LSE.frac(e.t + k / (a.count || 6) * P1, P1); const yy = Math.round(a.y - u * (a.h || 20)); const xx = Math.round(x0 + Math.sin(u * 7 + k) * 2 + u * 3);
    if ((xx + yy) & 1 && u > 0.5) continue; ctx.globalAlpha = 0.65 * (1 - u); ctx.fillStyle = a.color || '#f2efe6'; ctx.fillRect(xx, yy, u < 0.4 ? 2 : 1, 1); ctx.globalAlpha = 1; } };
  A.fan = (ctx, a, e) => { if (e.which !== 'back') return; const f = LSE.tick(e.t, e.beat / 8) % 3; const ang = f * TAU / 9; ctx.fillStyle = a.color || '#e8edf7';
    for (let b = 0; b < 3; b++) { const th = ang + b * TAU / 3; for (let d = 2; d < (a.r || 7); d++) { ctx.globalAlpha = 0.85; ctx.fillRect(Math.round(a.x + Math.cos(th) * d), Math.round(a.y + Math.sin(th) * d), 1, 1); ctx.globalAlpha = 0.4; ctx.fillRect(Math.round(a.x + Math.cos(th + 0.3) * d), Math.round(a.y + Math.sin(th + 0.3) * d), 1, 1); } } ctx.globalAlpha = 1; };
  A.birds = (ctx, a, e) => { if (e.which !== 'sky' && e.which !== 'back') return; if ((a.layer || 'sky') !== e.which) return; const R = e.rnd; const P1 = S.period(a.period || 16, e.L);
    for (let i = 0; i < (a.count || 4); i++) { const ph = R(), yy = (a.y || 120) + Math.floor(R() * 30); const u = LSE.frac(e.t + ph * P1, P1); const x = Math.round(-10 + u * (W + 20)), y = Math.round(yy + Math.sin(u * TAU * 2 + i) * 4); const up = (LSE.tick(e.t, e.beat / 2) + i) % 2;
      ctx.fillStyle = a.color || '#16141f'; ctx.fillRect(x, y, 1, 1); ctx.fillRect(x - 1, y - up, 1, 1); ctx.fillRect(x + 1, y - up, 1, 1); ctx.fillRect(x - 2, y - up * 2 + (up ? 0 : 1), 1, 1); ctx.fillRect(x + 2, y - up * 2 + (up ? 0 : 1), 1, 1); } };
  A.rainwin = (ctx, a, e) => { if (e.which !== 'back') return; const R = e.rnd; const P1 = S.period(a.period || 0.6, e.L); ctx.fillStyle = a.color || 'rgba(143,211,255,0.7)';
    for (let i = 0; i < (a.count || 16); i++) { const x = a.x + Math.floor(R() * a.w), ph = R(); const u = LSE.frac(e.t + ph * P1, P1); const y = Math.round(a.y + u * a.h); ctx.fillRect(x, y, 1, Math.min(3, a.y + a.h - y)); } };
  A.flies = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 2, e.L); ctx.fillStyle = a.color || '#0b0a12';
    for (let i = 0; i < (a.count || 5); i++) { const ph = R() * TAU, k = 1 + (i % 3); const x = a.x + Math.sin(TAU * e.t * k / P1 + ph) * 9 + Math.sin(TAU * e.t * 3 / P1 + ph * 2) * 3, y = a.y + Math.cos(TAU * e.t * k / P1 + ph * 1.7) * 5; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); } };
  A.leaves = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 7, e.L);
    for (let i = 0; i < (a.count || 6); i++) { const x0 = (a.x0 || 0) + R() * ((a.x1 || W) - (a.x0 || 0)), ph = R(); const u = LSE.frac(e.t + ph * P1, P1); const y = Math.round((a.y0 || 120) + u * ((a.y1 || 300) - (a.y0 || 120))), x = Math.round(x0 + Math.sin(u * TAU * 2 + i) * 6);
      ctx.fillStyle = i % 3 ? (a.color || '#ffc14a') : '#7cbf3f'; ctx.fillRect(x, y, 2, 1); if (LSE.tick(e.t, e.beat / 2) % 2) ctx.fillRect(x + 1, y - 1, 1, 1); } };
  // ---- more life: people, vehicles, water, wind ----
  const P8 = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  // small background pedestrians (≈22 px), both directions, legs on the beat; some carry bags / umbrellas
  A.walkers = (ctx, a, e) => { if (e.which !== 'back') return; const R = e.rnd; const P1 = S.period(a.period || 14, e.L); const k = a.scale || 1;
    for (let i = 0; i < (a.count || 4); i++) { const dir = R() < 0.5 ? 1 : -1, ph = R(), sp = 1 + Math.floor(R() * 2); const shirt = pick(R, ['#e0533f', '#f2efe6', '#3e8de0', '#ffc14a', '#2f9c86', '#ff4fa3', '#9b5de5']), pants = pick(R, ['#16141f', '#2253a3', '#5c3424', '#3d3a5c']), skin = pick(R, ['#d9a35b', '#b8773f', '#f2d38a']), hair = '#16141f'; const um = a.umbrella || (R() < 0.15), bag = R() < 0.4;
      const u = LSE.frac(e.t * sp + ph * P1, P1); const x = Math.round((dir > 0 ? -12 + u * (W + 24) : W + 12 - u * (W + 24)) - e.camX * 0.55), y = a.y; const st = (LSE.tick(e.t, e.beat / 2) + i) % 2;
      const r = (xx, yy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + Math.round(xx * k), y + Math.round(yy * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); };
      r(-1 - st, -6, 1, 6, pants); r(1 + st, -6, 1, 6, pants); r(-2, -14, 5, 8, shirt); r(-1, -18, 3, 4, skin); r(-1, -19, 3, 1, hair); r(dir > 0 ? 2 : -2, -12 + st, 1, 4, skin);
      if (bag) r(dir > 0 ? -3 : 3, -10, 2, 3, pick(R, ['#f2efe6', '#e0533f'])); if (um) { r(-5, -23, 11, 2, pick(R, ['#e0533f', '#2253a3', '#ffe66b'])); r(0, -21, 1, 3, '#16141f'); } } };
  // scrolling LED marquee on a board (glow pass)
  const mqCache = new Map();
  A.ledsign = (ctx, a, e) => { if (e.which !== 'back' && e.which !== 'glow') return; const w = a.w || 60, h = a.h || 9, x = Math.round(a.x - e.camX * (a.k || 0.55)), y = a.y;
    if (e.which === 'back') { ctx.fillStyle = '#0b0a12'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = a.bg || '#16141f'; ctx.fillRect(x, y, w, h); return; }
    const key = a.text + (a.color || ''); let c = mqCache.get(key); if (!c) { const tw = Math.ceil(a.text.length * (a.size || 7) * 0.9) + 20; const cv = LSE.canvas(tw, h); const p = S.painter(cv.ctx); p.text(a.text, 0, Math.round(h / 2), a.size || 7, a.color || '#ffe66b', { align: 'left', th: 110 }); c = cv.c; mqCache.set(key, c); }
    const P1 = S.period(a.period || 6, e.L); const off = Math.round(LSE.frac(e.t, P1) * c.width); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(c, x + w - off, y); ctx.drawImage(c, x + w - off - c.width, y); ctx.restore(); };
  A.plane = (ctx, a, e) => { if (e.which !== 'sky') return; const P1 = S.period(a.period || 16, e.L); const u = LSE.frac(e.t, P1); const x = Math.round(-10 + u * (W + 20)), y = Math.round(a.y - u * 14); ctx.fillStyle = '#3d3a5c'; ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 1, 2, 3);
    if (LSE.tick(e.t, e.beat / 2) % 2) { ctx.fillStyle = '#e0533f'; ctx.fillRect(x - 3, y, 1, 1); } else { ctx.fillStyle = '#f2efe6'; ctx.fillRect(x + 3, y, 1, 1); } };
  // something that moves along a line for part of each period, then rests (gecko on the wall, a rat)
  A.crawler = (ctx, a, e) => { if (e.which !== 'back') return; const P1 = S.period(a.period || 8, e.L); const u = LSE.frac(e.t, P1); const m = LSE.clamp((u - 0.2) / 0.35, 0, 1); const back = u > 0.7 ? LSE.clamp((u - 0.7) / 0.25, 0, 1) : 0; const k = m - back;
    const x = Math.round(a.x0 + (a.x1 - a.x0) * k), y = Math.round(a.y0 + (a.y1 - a.y0) * k); const c = a.color || '#9a958b'; const leg = LSE.tick(e.t, e.beat / 4) % 2 && m > 0 && m < 1 ? 1 : 0;
    ctx.fillStyle = c; ctx.fillRect(x, y, 1, 5); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x - 1, y + 1 - leg, 1, 1); ctx.fillRect(x + 1, y + 1 + leg, 1, 1); ctx.fillRect(x - 1, y + 4 + leg, 1, 1); ctx.fillRect(x + 1, y + 4 - leg, 1, 1); ctx.fillRect(x, y + 6, 1, 2); };
  // motorbike with rider passing behind the actors; headlight in the glow pass
  A.motopass = (ctx, a, e) => { if (e.which !== 'back' && e.which !== 'glow') return; const P1 = S.period(a.period || 9, e.L); const u = LSE.frac(e.t + (a.phase || 0) * P1, P1); const span = (a.dur || 2.2) / P1; if (u > span) return; const k = u / span, dir = a.dir || -1;
    const x = Math.round(dir > 0 ? -30 + k * (W + 60) : W + 30 - k * (W + 60)), y = a.y; const f = (dx) => x + dx * dir;
    if (e.which === 'glow') { ctx.fillStyle = '#fff6c2'; ctx.fillRect(f(13), y - 10, 1, 2); ctx.globalAlpha = 0.25; ctx.fillRect(dir > 0 ? f(14) : f(14) - 16, y - 10, 16, 2); ctx.globalAlpha = 1; ctx.fillStyle = '#e0533f'; ctx.fillRect(f(-12), y - 9, 1, 1); return; }
    const wl = LSE.tick(e.t, e.beat / 4) % 2; ctx.fillStyle = '#0b0a12'; for (const dx of [-8, 9]) { ctx.fillRect(f(dx) - 3, y - 6, 7, 6); } ctx.fillStyle = '#545577'; for (const dx of [-8, 9]) ctx.fillRect(f(dx) - (wl ? 1 : 0), y - 4, 2, 2);
    const bc = a.color || '#b52b35'; ctx.fillStyle = bc; ctx.fillRect(Math.min(f(-10), f(12)), y - 11, 22, 5); ctx.fillStyle = '#16141f'; ctx.fillRect(Math.min(f(-6), f(4)), y - 13, 10, 2); ctx.fillStyle = '#5f5d5a'; ctx.fillRect(f(11), y - 16, 1, 6);
    const sh = a.shirt || '#ffc14a'; ctx.fillStyle = sh; ctx.fillRect(Math.min(f(-4), f(2)), y - 23, 6, 10); ctx.fillStyle = '#16141f'; ctx.fillRect(Math.min(f(-3), f(1)), y - 13, 4, 4); ctx.fillStyle = a.helmet || '#2253a3'; ctx.fillRect(Math.min(f(-3), f(1)), y - 29, 5, 5); ctx.fillStyle = '#d9a35b'; ctx.fillRect(f(1), y - 25, 1, 2); ctx.fillStyle = sh; ctx.fillRect(Math.min(f(2), f(9)), y - 20, 7, 2); };
  A.cattail = (ctx, a, e) => { if (e.which !== 'back') return; const f = [0, 1, 2, 1][LSE.tick(e.t, e.beat / 2) % 4]; ctx.fillStyle = a.color || '#16141f'; const x = a.x + 3, y = a.y - 2; ctx.fillRect(x, y, 3, 1); ctx.fillRect(x + 3, y - f, 1, 1 + f); ctx.fillRect(x + 4, y - f - 1, 1, 1); };
  // long-tail boat crossing the canal with a wake
  A.longtail = (ctx, a, e) => { if (e.which !== 'back') return; const P1 = S.period(a.period || 12, e.L); const u = LSE.frac(e.t + (a.phase || 0) * P1, P1); const span = (a.dur || 5) / P1; if (u > span) return; const k = u / span, dir = a.dir || 1;
    const x = Math.round((dir > 0 ? -50 + k * (W + 100) : W + 50 - k * (W + 100)) - e.camX * 0.55), y = a.y; const bob = LSE.tick(e.t, e.beat) % 2;
    ctx.fillStyle = 'rgba(242,239,230,0.55)'; for (let w = 4; w < 30; w += 3) { const wx = x - dir * (26 + w); ctx.fillRect(wx, y + 1 + ((w / 3) & 1), 3, 1); }
    ctx.fillStyle = '#5c3424'; ctx.fillRect(x - 22, y - 4 + bob, 40, 4); ctx.fillStyle = '#8a5232'; ctx.fillRect(x - 22, y - 5 + bob, 40, 1); ctx.fillStyle = '#e0533f'; ctx.fillRect(dir > 0 ? x + 16 : x - 22, y - 7 + bob, 6, 3);
    ctx.fillStyle = '#3d3a5c'; ctx.fillRect(x - dir * 22, y - 8 + bob, 2, 4); ctx.fillStyle = '#16141f'; ctx.fillRect(x - dir * 26, y - 3 + bob, 6, 1);
    ctx.fillStyle = '#ffc14a'; ctx.fillRect(x - 6, y - 14 + bob, 5, 9); ctx.fillStyle = '#b8773f'; ctx.fillRect(x - 5, y - 18 + bob, 3, 4); ctx.fillStyle = '#f2d38a'; ctx.fillRect(x - 8, y - 19 + bob, 7, 1); };
  A.ripples = (ctx, a, e) => { if (e.which !== 'back') return; const R = e.rnd; const P1 = S.period(a.period || 2.4, e.L); ctx.fillStyle = a.color || 'rgba(143,211,255,0.6)';
    for (let i = 0; i < (a.count || 6); i++) { const x0 = R() * W, y0 = a.y0 + R() * (a.y1 - a.y0), ph = R(); const u = LSE.frac(e.t + ph * P1, P1); const r = 1 + u * 6; if (u > 0.85) continue; for (let t = 0; t < TAU; t += 0.5) { const xx = Math.round(x0 + Math.cos(t) * r), yy = Math.round(y0 + Math.sin(t) * r * 0.3); if ((xx + yy) & 1) ctx.fillRect(xx, yy, 1, 1); } } };
  A.sparkle = (ctx, a, e) => { if (e.which !== 'glow') return; const R = e.rnd; for (let i = 0; i < (a.count || 10); i++) { const x = Math.round(R() * W), y = Math.round(a.y0 + R() * (a.y1 - a.y0)), ph = Math.floor(R() * 8); if ((LSE.tick(e.t, e.beat / 2) + ph) % 8 > 1) continue; ctx.fillStyle = a.color || '#fff6c2'; ctx.fillRect(x, y, 2, 1); if ((LSE.tick(e.t, e.beat / 2) + ph) % 8 === 0) ctx.fillRect(x, y - 1, 1, 3); } };
  // palm / tree crowns swaying in the wind (a few leaf pixels rocking over the static crown)
  A.sway = (ctx, a, e) => { if (e.which !== 'back') return; const f = [0, 1, 1, 1, 0, -1, -1, -1][LSE.tick(e.t, e.beat / 2) % 8]; // 8 half-beats = one bar, so any whole-bar loop closes ctx.fillStyle = a.color || '#3f7a2e';
    for (const x0 of a.xs || []) { const x = Math.round(x0 - e.camX * (a.k || 0.55)); for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2; const ex = x + Math.round(Math.cos(ang) * 16) + f * (k % 2 ? 1 : 2), ey = a.y + Math.round(Math.abs(Math.sin(ang)) * 9) + 2; ctx.fillRect(ex, ey, 3, 1); ctx.fillRect(ex + (f > 0 ? 1 : -1), ey + 1, 2, 1); } } };
  // bunting that flutters (draws the string and flags every frame)
  A.bunting = (ctx, a, e) => { if (e.which !== 'front') return; const cols = a.colors || ['#e0533f', '#ffe66b', '#2253a3', '#f2efe6', '#2f9c86', '#ff4fa3']; const x0 = a.x0 - Math.round(e.camX * 1.25), x1 = a.x1 - Math.round(e.camX * 1.25), sag = a.sag || 12; let k = 0;
    for (let x = x0; x <= x1; x++) { const u = (x - x0) / (x1 - x0); const y = Math.round(a.y + sag * 4 * u * (1 - u)); ctx.fillStyle = '#3d3a5c'; ctx.fillRect(x, y, 1, 1);
      if ((x - x0) % 7 === 0) { const c = cols[k++ % cols.length]; const fl = (LSE.tick(e.t, e.beat / 2) + k) % 3; ctx.fillStyle = c; for (let r = 0; r < 6; r++) { const w = Math.max(1, 5 - r); ctx.fillRect(x + (fl === 1 ? Math.floor(r / 3) : fl === 2 ? -Math.floor(r / 3) : 0), y + 1 + r, w, 1); } } } };
  A.pigeons = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 6, e.L);
    for (let i = 0; i < (a.count || 3); i++) { const bx = a.x0 + R() * (a.x1 - a.x0), ph = R(); const u = LSE.frac(e.t + ph * P1, P1); const x = Math.round(bx + Math.sin(u * TAU) * 8 - e.camX * 1.25), y = a.y + Math.floor(R() * 6); const peck = (LSE.tick(e.t, e.beat / 2) + i) % 4 === 0;
      ctx.fillStyle = '#7a7fa3'; ctx.fillRect(x - 3, y - 4, 6, 3); ctx.fillStyle = '#545577'; ctx.fillRect(x - 3, y - 3, 2, 2); ctx.fillStyle = '#b3b9d1'; ctx.fillRect(x + 2, peck ? y - 3 : y - 6, 2, 2); ctx.fillStyle = '#2f9c86'; ctx.fillRect(x + 2, peck ? y - 1 : y - 4, 1, 1); ctx.fillStyle = '#e0533f'; ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); } };
  A.clouddrift = (ctx, a, e) => { if (e.which !== 'sky') return; const R = e.rnd; const P1 = S.period(a.period || 40, e.L); ctx.fillStyle = a.color || '#f2efe6';
    for (let i = 0; i < (a.count || 3); i++) { const w = 30 + Math.floor(R() * 40), y = a.y + Math.floor(R() * 40), ph = R(); const x = Math.round(LSE.frac(e.t + ph * P1, P1) * (W + w + 20)) - w - 10; ctx.fillRect(x, y, w, 4); ctx.fillRect(x + 6, y - 3, w - 14, 3); ctx.fillRect(x + 14, y - 6, Math.round(w * 0.4), 3); ctx.globalAlpha = 0.5; ctx.fillStyle = '#b3b9d1'; ctx.fillRect(x + 2, y + 3, w - 4, 1); ctx.globalAlpha = 1; ctx.fillStyle = a.color || '#f2efe6'; } };
  A.dragonfly = (ctx, a, e) => { if (e.which !== 'front') return; const R = e.rnd; const P1 = S.period(a.period || 5, e.L);
    for (let i = 0; i < (a.count || 2); i++) { const cx = a.x0 + R() * (a.x1 - a.x0), cy = a.y0 + R() * (a.y1 - a.y0), ph = R() * TAU; const t = e.t; const x = Math.round(cx + Math.sin(TAU * t / P1 + ph) * 22 + Math.sin(TAU * t * 3 / P1) * 3), y = Math.round(cy + Math.sin(TAU * t * 2 / P1 + ph) * 6);
      ctx.fillStyle = a.color || '#3e8de0'; ctx.fillRect(x, y, 4, 1); ctx.fillStyle = 'rgba(242,239,230,0.8)'; const w = LSE.tick(t, e.beat / 8) % 2; ctx.fillRect(x + 1, y - 1 - w, 1, 1); ctx.fillRect(x + 2, y + 1 + w, 1, 1); } };
  // soft light shafts (cached once per scene, breathing alpha)
  const rayCache = new Map();
  A.rays = (ctx, a, e) => { if (e.which !== 'front') return; const key = JSON.stringify(a); let c = rayCache.get(key);
    if (!c) { const cv = LSE.canvas(W, H); const g = cv.ctx; g.fillStyle = a.color || '#fff6c2'; const R = LSE.rng(LSE.hash(key));
      for (let k = 0; k < (a.count || 4); k++) { const bx = (a.x || 40) + k * (a.gap || 34) + R() * 10, bw = 8 + R() * 12, sl = a.slope || 0.45; for (let y = a.y || 0; y < (a.y1 || 300); y++) { const xs = Math.round(bx + (y - (a.y || 0)) * sl); for (let x = xs; x < xs + bw; x++) if (((x + y) & 1) === 0 && ((x * 3 + y) % 5)) g.fillRect(x, y, 1, 1); } }
      c = cv.c; rayCache.set(key, c); }
    const P1 = S.period(a.period || 6, e.L); ctx.globalAlpha = (a.alpha || 0.12) * (0.75 + 0.25 * Math.sin(TAU * e.t / P1)); ctx.drawImage(c, 0, 0); ctx.globalAlpha = 1; };
})(typeof window !== 'undefined' ? window : globalThis);
