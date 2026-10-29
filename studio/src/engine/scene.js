// Procedural pixel-art scene painter (270x480 portrait) + ambient life. Scene = compact JSON spec.
(function (G) {
  const LSE = G.LSE;
  const S = (LSE.Scene = {});
  const W = 270, H = 480, M = 24; // layer canvases are W+2M wide for parallax
  S.W = W; S.H = H; S.M = M;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

  // ---------- low-level painters ----------
  function P(ctx, ectx, bctx) {
    const api = {
      ctx, ectx, bctx, blinkMode: false,
      // lit pixels (windows, neon, bulbs): drawn on the layer and again on the emissive layer that stays bright after the darkness pass
      glow(x, y, w, h, c) { api.rect(x, y, w, h, c); const e = api.blinkMode ? bctx : ectx; if (e) { e.fillStyle = c; e.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); } },
      gpx(x, y, c) { api.glow(x | 0, y | 0, 1, 1, c); },
      // 1-bit text (Thai signs): rendered with the UI font, thresholded so every pixel is solid
      text(str, x, y, size, c, o) { o = o || {}; const fam = LSE.FONTS ? (LSE.FONTS[o.font] || LSE.FONTS.kanit) : 'sans-serif';
        const t = LSE.canvas(Math.ceil(str.length * size * 1.1) + 8, Math.ceil(size * 2)); const g = t.ctx; g.font = `${o.weight || 600} ${size}px ${fam}`; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(str, 2, Math.round(size));
        const tw = Math.ceil(g.measureText(str).width); const id = g.getImageData(0, 0, t.c.width, t.c.height).data; const x0 = Math.round(o.align === 'left' ? x : x - tw / 2) - 2, y0 = Math.round(y - size);
        for (let yy = 0; yy < t.c.height; yy++) for (let xx = 0; xx < t.c.width; xx++) if (id[(yy * t.c.width + xx) * 4 + 3] >= (o.th || 120)) (o.glow ? api.gpx : api.px)(x0 + xx, y0 + yy, c);
        return tw; },
      px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      poly(pts, c) { // scanline fill of polygon [[x,y],...]
        ctx.fillStyle = c;
        let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
          const xs = [];
          for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
          }
          xs.sort((p, q) => p - q);
          for (let i = 0; i + 1 < xs.length; i += 2) ctx.fillRect(Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]), 1);
        }
      },
      line(x0, y0, x1, y1, c) {
        ctx.fillStyle = c; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for (let n = 0; n < 2000; n++) { ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      },
      circle(cx, cy, r, c) { ctx.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } },
      ditherV(x, y, w, h, c1, c2, steps) { // vertical gradient c1->c2 with Bayer dither
        steps = steps || 6;
        for (let yy = 0; yy < h; yy++) {
          const t = yy / Math.max(1, h - 1);
          const band = t * (steps - 1); const b0 = Math.floor(band), f = band - b0;
          const ca = LSE.mix(c1, c2, b0 / (steps - 1)), cb = LSE.mix(c1, c2, Math.min(steps - 1, b0 + 1) / (steps - 1));
          for (let xx = 0; xx < w; xx++) { ctx.fillStyle = f > bay(x + xx, y + yy) ? cb : ca; ctx.fillRect(x + xx, y + yy, 1, 1); }
        }
      },
    };
    return api;
  }
  S.painter = P;

  // ridge line generator (silhouettes)
  function ridge(rnd, w, amp, freq, jag) {
    const pts = []; const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    for (let x = 0; x <= w; x++) {
      let v = Math.sin(x * freq + ph[0]) * 0.55 + Math.sin(x * freq * 2.3 + ph[1]) * 0.3 + Math.sin(x * freq * 5.1 + ph[2]) * 0.15;
      if (jag) v += (rnd() - 0.5) * jag;
      pts.push(v * amp);
    }
    return pts;
  }

  // prims draw in frame coordinates (x 0..270); the layer context is translated by the parallax margin M.
  // Full-width painters (sky, land, walls…) run in raw layer space through full().
  const full = (p, fn) => { p.ctx.save(); p.ctx.translate(-M, 0); try { fn(); } finally { p.ctx.restore(); } };
  // ---------- primitives ----------
  const PR = (S.prims = {});
  PR.rect = (p, o) => p.rect(o.x, o.y, o.w, o.h, o.color);
  PR.hills = PR.dunes = PR.mountains = (p, o, r, kind) => full(p, () => {
    const w = W + 2 * M; const jag = o.p === 'mountains' ? 0.25 : 0; const freq = o.p === 'mountains' ? 0.045 : 0.022;
    const rg = ridge(r, w, o.amp || (o.p === 'mountains' ? 40 : 14), o.freq || freq, jag);
    const base = o.y, bottom = o.bottom || H;
    for (let x = 0; x < w; x++) {
      const top = Math.round(base - rg[x] - (o.amp || 14));
      p.rect(x, top, 1, bottom - top, o.color);
      if (o.edge) p.rect(x, top, 1, 1, o.edge);
      if (o.shade && rg[x + 1] !== undefined && rg[x + 1] > rg[x]) p.rect(x, top + 1, 1, Math.min(6, bottom - top), o.shade);
    }
  });
  PR.pyramid = (p, o) => {
    const x = o.x, y = o.y, w = o.w || 120, h = o.h || Math.round(w * 0.62);
    const c = o.color || '#d9a35b', sh = o.shade || LSE.shade(c, -0.18), ln = o.line || LSE.shade(c, -0.1);
    p.poly([[x - w / 2, y], [x, y - h], [x, y]], c);
    p.poly([[x, y - h], [x + w / 2, y], [x, y]], sh);
    for (let yy = y - h + 6; yy < y; yy += 5) { const half = (yy - (y - h)) / h * w / 2; p.rect(x - half + 1, yy, half - 1, 1, ln); p.rect(x, yy, half - 1, 1, LSE.shade(sh, -0.06)); }
    if (o.cap) p.poly([[x - 6, y - h + 9], [x, y - h], [x + 6, y - h + 9]], o.cap);
    if (o.door) { p.rect(x - 4, y - 14, 8, 14, '#0b0a12'); p.rect(x - 5, y - 15, 10, 1, ln); }
  };
  PR.obelisk = (p, o) => { const h = o.h || 90, w = o.w || 12, c = o.color || '#b8773f'; p.poly([[o.x - w / 2, o.y], [o.x - w / 2 + 2, o.y - h], [o.x, o.y - h - 8], [o.x + w / 2 - 2, o.y - h], [o.x + w / 2, o.y]], c); p.rect(o.x, o.y - h, w / 2 - 2, h, LSE.shade(c, -0.15)); for (let i = 0; i < 6; i++) p.rect(o.x - 2, o.y - h + 10 + i * 12, 2, 5, LSE.shade(c, -0.25)); };
  PR.columns = (p, o) => {
    const xs = o.xs || [40, 230], h = o.h || 140, w = o.w || 16, c = o.color || '#b3b9d1', y = o.y; const sh = LSE.shade(c, -0.16), hi = LSE.shade(c, 0.08);
    for (const x0 of xs) {
      const x = x0 - w / 2;
      p.rect(x, y - h, w, h, c); p.rect(x + w - 4, y - h, 4, h, sh); p.rect(x + 2, y - h, 2, h, hi);
      if (o.style !== 'egypt') for (let i = 5; i < w - 3; i += 4) p.rect(x + i, y - h + 8, 1, h - 14, sh);
      if (o.style === 'egypt') { for (let k = 0; k < 4; k++) p.rect(x, y - h + 12 + k * 18, w, 2, o.band || '#2253a3'); p.poly([[x - 4, y - h], [x + w + 4, y - h], [x + w, y - h + 10], [x, y - h + 10]], c); }
      else if (o.style === 'gothic') { p.poly([[x - 2, y - h], [x + w / 2, y - h - 12], [x + w + 2, y - h]], sh); }
      else { p.rect(x - 3, y - h - 6, w + 6, 6, c); p.rect(x - 3, y - h - 2, w + 6, 2, sh); }
      p.rect(x - 3, y - 5, w + 6, 5, c); p.rect(x - 3, y - 2, w + 6, 2, sh);
      if (o.broken && LSE.hash(String(x0)) % 2) p.poly([[x, y - h], [x + w, y - h], [x + w, y - h + 14], [x + w / 2, y - h + 6], [x, y - h + 18]], o.bg || '#16141f');
    }
    if (o.lintel) { p.rect(Math.min(...xs) - w, y - h - 14, Math.max(...xs) - Math.min(...xs) + 2 * w, 9, c); p.rect(Math.min(...xs) - w, y - h - 6, Math.max(...xs) - Math.min(...xs) + 2 * w, 2, sh); }
  };
  PR.wall = (p, o, r) => (o.x == null ? full(p, () => wall(p, o, r)) : wall(p, o, r));
  function wall(p, o, r) {
    const c = o.color || '#5c3424', c2 = o.color2 || LSE.shade(c, -0.12), m = o.mortar || LSE.shade(c, -0.22);
    const x = o.x || 0, y = o.y || 0, w = o.w || W + 2 * M, h = o.h || 200;
    p.rect(x, y, w, h, c);
    const bw = o.pattern === 'block' ? 26 : 14, bh = o.pattern === 'block' ? 14 : 7;
    for (let yy = 0; yy < h; yy += bh) {
      p.rect(x, y + yy, w, 1, m);
      const off = ((yy / bh) & 1) * (bw / 2);
      for (let xx = -off; xx < w; xx += bw) { p.rect(x + xx, y + yy, 1, bh, m); if (r() < 0.35) p.rect(x + xx + 2, y + yy + 2, bw - 4, bh - 4, c2); if (r() < 0.12) p.rect(x + xx + 3 + (r() * (bw - 6)) | 0, y + yy + 3, 2, 1, LSE.shade(c, 0.07)); }
    }
  }
  PR.hieroglyphs = (p, o, r) => (o.x == null ? full(p, () => glyphs(p, o, r)) : glyphs(p, o, r));
  function glyphs(p, o, r) {
    const c = o.color || '#3b1f1a', x = o.x || 0, y = o.y, w = o.w || W + 2 * M, h = o.h || 24;
    if (o.bg) p.rect(x, y, w, h, o.bg);
    p.rect(x, y, w, 1, c); p.rect(x, y + h - 1, w, 1, c);
    for (let xx = x + 3; xx < x + w - 6; xx += 9) {
      const g = (r() * 7) | 0; const gx = xx, gy = y + 4, gh = h - 8;
      if (g === 0) { p.rect(gx + 2, gy, 2, gh, c); p.rect(gx, gy + 2, 6, 2, c); } // ankh-ish
      else if (g === 1) { p.circle(gx + 3, gy + 3, 2, c); p.rect(gx + 2, gy + 6, 2, gh - 6, c); }
      else if (g === 2) { p.rect(gx, gy + gh - 3, 6, 2, c); p.rect(gx + 1, gy + 2, 2, gh - 4, c); p.rect(gx + 3, gy, 3, 2, c); } // bird
      else if (g === 3) { for (let k = 0; k < 3; k++) p.rect(gx, gy + 1 + k * 4, 6, 1, c); } // water
      else if (g === 4) { p.poly([[gx, gy + gh], [gx + 3, gy], [gx + 6, gy + gh]], c); }
      else if (g === 5) { p.rect(gx, gy + 2, 6, 3, c); p.px(gx + 1, gy + 3, o.bg || '#d9a35b'); p.rect(gx + 2, gy + 5, 1, gh - 6, c); } // eye
      else { p.rect(gx + 1, gy, 4, gh, c); p.rect(gx + 2, gy + 1, 2, gh - 2, o.bg || '#d9a35b'); } // cartouche
    }
  }
  PR.arch = PR.door = (p, o) => {
    const x = o.x, y = o.y, w = o.w || 40, h = o.h || 60, c = o.color || '#3d3a5c', inner = o.inner || '#0b0a12';
    p.rect(x - w / 2 - 4, y - h, w + 8, h, c);
    p.rect(x - w / 2, y - h + w / 2, w, h - w / 2, inner); p.circle(x, y - h + w / 2, w / 2 - 1, inner);
    if (o.glow) { p.rect(x - w / 2 + 3, y - 4, w - 6, 4, o.glow); }
  };
  PR.window = (p, o) => {
    const x = o.x, y = o.y, w = o.w || 22, h = o.h || 46, f = o.color || '#2f2a47', g = o.glass || '#8fd3ff';
    p.rect(x - w / 2 - 2, y - h - 2, w + 4, h + 2, f);
    p.poly([[x - w / 2, y], [x - w / 2, y - h + w / 2], [x, y - h], [x + w / 2, y - h + w / 2], [x + w / 2, y]], g);
    p.rect(x - 1, y - h, 2, h, f); p.rect(x - w / 2, y - h / 2, w, 2, f);
    if (o.lit === false) return;
    p.rect(x - w / 2 + 2, y - h / 2 + 4, 3, 6, LSE.shade(g, 0.12));
  };
  PR.stalactites = (p, o, r) => full(p, () => { const c = o.color || '#2f2a47'; for (let x = 0; x < W + 2 * M; x += 6 + (r() * 10) | 0) { const len = 8 + r() * (o.len || 40); p.poly([[x, o.y || 0], [x + 6, o.y || 0], [x + 3, (o.y || 0) + len]], c); p.px(x + 3, (o.y || 0) + len - 2, LSE.shade(c, 0.12)); } });
  PR.rocks = (p, o, r) => { // cave walls on both sides
    const c = o.color || '#2f2a47', e = o.edge || LSE.shade(c, 0.1);
    const side = (left) => { const rg = ridge(r, H, 14, 0.03, 0.3); for (let y = 0; y < H; y++) { const wv = Math.round((o.w || 40) + rg[y]); if (left) { p.rect(-M, y, wv + M, 1, c); p.px(wv, y, e); } else { p.rect(W - wv, y, wv + M, 1, c); p.px(W - wv - 1, y, e); } } };
    side(true); side(false);
  };
  PR.trees = (p, o, r) => {
    for (const x of o.xs || [30, 240]) {
      const h = o.h || 70, c = o.color || '#183057', y = o.y;
      if (o.kind === 'palm') { p.rect(x - 1, y - h, 3, h, o.trunk || '#5c3424'); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; p.line(x, y - h, x + Math.cos(a) * 18, y - h + Math.abs(Math.sin(a)) * 10 + 2, c); p.line(x, y - h + 1, x + Math.cos(a) * 16, y - h + Math.abs(Math.sin(a)) * 10 + 3, c); } }
      else if (o.kind === 'dead') { p.rect(x - 1, y - h, 3, h, c); for (let k = 0; k < 5; k++) { const yy = y - h + 6 + k * (h / 6), dir = k % 2 ? 1 : -1; p.line(x, yy, x + dir * (10 + r() * 10), yy - 8 - r() * 6, c); } }
      else { for (let k = 0; k < 5; k++) { const wv = 6 + k * 5; p.poly([[x - wv, y - h + 12 + k * (h / 6)], [x, y - h + k * (h / 7)], [x + wv, y - h + 12 + k * (h / 6)]], c); } p.rect(x - 1, y - 8, 3, 8, o.trunk || '#3b1f1a'); }
    }
  };
  PR.castle = (p, o) => { const x = o.x, y = o.y, w = o.w || 120, h = o.h || 90, c = o.color || '#16141f'; p.rect(x - w / 2, y - h * 0.55, w, h * 0.55, c); for (const tx of [-0.42, -0.1, 0.25, 0.42]) { const tw = 14, th = h * (0.7 + Math.abs(tx) * 0.5); p.rect(x + tx * w - tw / 2, y - th, tw, th, c); p.poly([[x + tx * w - tw / 2 - 2, y - th], [x + tx * w, y - th - 16], [x + tx * w + tw / 2 + 2, y - th]], c); if (o.lit) p.rect(x + tx * w - 1, y - th + 10, 2, 3, o.lit); } for (let k = 0; k < w; k += 6) p.rect(x - w / 2 + k, y - h * 0.55 - 3, 3, 3, c); };
  PR.temple = (p, o) => { const x = o.x, y = o.y, w = o.w || 140, h = o.h || 80, c = o.color || '#7a7fa3'; p.rect(x - w / 2, y - 6, w, 6, c); const n = 6; for (let i = 0; i < n; i++) p.rect(x - w / 2 + 6 + i * (w - 18) / (n - 1), y - h + 14, 6, h - 20, c); p.rect(x - w / 2 - 2, y - h + 8, w + 4, 6, c); p.poly([[x - w / 2 - 4, y - h + 8], [x, y - h - 12], [x + w / 2 + 4, y - h + 8]], c); };
  PR.moon = PR.sun = (p, o) => { const r = o.r || (o.p === 'sun' ? 16 : 12), c = o.color || (o.p === 'sun' ? '#ffe66b' : '#f2efe6'); if (o.glow) { p.circle(o.x, o.y, r + 6, o.glow); } p.circle(o.x, o.y, r, c); if (o.p === 'moon') { p.circle(o.x + 3, o.y - 2, 2, LSE.shade(c, -0.08)); p.circle(o.x - 4, o.y + 4, 1, LSE.shade(c, -0.08)); } };
  PR.clouds = (p, o, r) => full(p, () => { const c = o.color || '#3d3a5c'; for (let i = 0; i < (o.count || 4); i++) { const x = r() * (W + 2 * M), y = o.y + r() * 30, w = 30 + r() * 50; p.rect(x, y, w, 4, c); p.rect(x + 6, y - 3, w - 14, 3, c); p.rect(x + 14, y - 6, w * 0.4, 3, c); } });
  PR.sea = (p, o) => full(p, () => { p.ditherV(0, o.y, W + 2 * M, (o.bottom || H) - o.y, o.color || '#2253a3', o.color2 || '#183057', 5); });
  PR.statue = (p, o) => { const x = o.x, y = o.y, h = o.h || 46, c = o.color || '#7a7fa3', s = LSE.shade(c, -0.15); const k = h / 46; p.rect(x - 9 * k, y - 4 * k, 18 * k, 4 * k, s); p.rect(x - 5 * k, y - 30 * k, 10 * k, 26 * k, c); p.rect(x - 8 * k, y - 28 * k, 3 * k, 14 * k, c); p.rect(x + 5 * k, y - 28 * k, 3 * k, 14 * k, s); p.circle(x, y - 35 * k, 5 * k, c); p.rect(x + 1 * k, y - 30 * k, 4 * k, 26 * k, s); if (o.pose === 'scream') { p.rect(x - 1, y - 35 * k, 2, 2, s); } };
  PR.sarcophagus = (p, o) => { const x = o.x, y = o.y, gold = o.color || '#d9a35b', blue = o.color2 || '#2253a3', s = LSE.shade(gold, -0.2); const w = o.w || 24, h = o.h || 58; p.poly([[x - w / 2, y], [x - w / 2 + 2, y - h + 10], [x, y - h], [x + w / 2 - 2, y - h + 10], [x + w / 2, y]], gold); p.rect(x + 2, y - h + 8, w / 2 - 4, h - 8, s); p.rect(x - 6, y - h + 6, 12, 10, LSE.shade(gold, 0.08)); for (let k = 0; k < 4; k++) p.rect(x - w / 2 + 3, y - h + 22 + k * 7, w - 6, 2, blue); p.px(x - 3, y - h + 10, '#0b0a12'); p.px(x + 2, y - h + 10, '#0b0a12'); p.rect(x - 4, y - h + 18, 8, 2, blue); };
  // the mummy lying in its glass case on a stone plinth (KV62 today); o.w = case length
  PR.mummycase = (p, o) => { const x = o.x, y = o.y, w = o.w || 72, st = o.color || '#545577', lin = o.linen || '#f2d38a', band = LSE.shade(lin, -0.22); const L = x - w / 2, R = x + w / 2;
    p.rect(L - 2, y - 10, w + 4, 10, st); p.rect(L - 2, y - 10, w + 4, 1, LSE.shade(st, 0.18)); p.rect(L - 2, y - 2, w + 4, 2, LSE.shade(st, -0.25));
    for (let k = 0; k < 3; k++) p.rect(L + 6 + k * (w - 12) / 2 - 3, y - 7, 6, 3, LSE.shade(st, -0.15));
    const by = y - 11; // mummy: head on the left, feet taper on the right
    p.poly([[L + 8, by], [L + 8, by - 7], [L + 14, by - 9], [R - 14, by - 8], [R - 6, by - 5], [R - 4, by - 2], [R - 6, by]], lin);
    for (let xx = L + 12; xx < R - 6; xx += 4) p.rect(xx, by - 8, 1, 8, band);
    p.rect(L + 14, by - 9, R - L - 28, 1, LSE.shade(lin, 0.12));
    p.circle(L + 9, by - 5, 5, lin); p.rect(L + 6, by - 6, 6, 1, band); p.rect(L + 6, by - 3, 6, 1, band); p.px(L + 7, by - 5, '#3b1f1a');
    const gt = y - 34, gl = 'rgba(143,211,255,0.16)', ge = 'rgba(200,235,255,0.55)'; // glass case
    p.rect(L - 1, gt, w + 2, by - gt + 1, gl); p.rect(L - 1, gt, w + 2, 1, ge); p.rect(L - 1, gt, 1, by - gt + 1, ge); p.rect(R, gt, 1, by - gt + 1, ge);
    for (let k = 0; k < 6; k++) p.px(L + 4 + k, gt + 2 + k, 'rgba(255,255,255,0.7)'); };
  PR.coffin = (p, o) => { const x = o.x, y = o.y, c = o.color || '#3b1f1a', w = o.w || 34, h = o.h || 14; p.poly([[x - w / 2, y - h / 2], [x - w / 2 + 8, y - h], [x + w / 2, y - h + 2], [x + w / 2, y - 2], [x - w / 2 + 8, y]], c); p.rect(x - w / 2 + 8, y - h + 1, w - 10, 1, LSE.shade(c, 0.1)); p.rect(x - 2, y - h + 4, 6, 1, o.cross || '#b8773f'); p.rect(x, y - h + 2, 1, 6, o.cross || '#b8773f'); };
  PR.chest = (p, o) => { const x = o.x, y = o.y, wood = o.color || '#8a5232', g = o.gold || '#ffc14a'; p.rect(x - 11, y - 12, 22, 12, wood); p.rect(x - 12, y - 18, 24, 7, LSE.shade(wood, 0.06)); p.rect(x - 12, y - 12, 24, 1, LSE.shade(wood, -0.2)); p.rect(x - 12, y - 18, 2, 18, g); p.rect(x + 10, y - 18, 2, 18, g); p.rect(x - 2, y - 14, 4, 4, g); if (o.open) { p.rect(x - 10, y - 21, 20, 4, g); p.px(x - 6, y - 22, '#ffffff'); } };
  PR.urn = (p, o) => { const x = o.x, y = o.y, c = o.color || '#b8773f', s = LSE.shade(c, -0.18); p.rect(x - 3, y - 18, 6, 2, c); p.rect(x - 2, y - 16, 4, 2, s); p.circle(x, y - 8, 6, c); p.rect(x, y - 13, 5, 11, s); p.rect(x - 4, y - 2, 8, 2, s); if (o.head) p.circle(x, y - 20, 3, o.head); };
  PR.torch = (p, o) => { p.rect(o.x - 1, o.y, 3, 10, '#5c3424'); p.rect(o.x - 2, o.y - 2, 5, 3, '#3b1f1a'); };
  PR.candles = (p, o) => { for (let i = 0; i < (o.count || 3); i++) { const x = o.x + i * 6, h = 6 + (i * 5) % 7; p.rect(x, o.y - h, 3, h, o.color || '#f2efe6'); } };
  PR.skulls = (p, o) => { for (let i = 0; i < (o.count || 3); i++) { const x = o.x + i * 9 - (i % 2) * 3, y = o.y - (i % 2) * 4; p.rect(x, y - 6, 7, 5, '#f2efe6'); p.rect(x + 1, y - 1, 5, 2, '#b3b9d1'); p.px(x + 1, y - 4, '#0b0a12'); p.px(x + 4, y - 4, '#0b0a12'); } };
  PR.cobweb = (p, o) => { const s = o.size || 26, c = o.color || '#7a7fa3', x = o.x, y = o.y, dx = o.corner === 'right' ? -1 : 1; for (let k = 0; k < 4; k++) p.line(x, y, x + dx * s * Math.cos(k * 0.45), y + s * Math.sin(k * 0.45 + 0.1), c); for (let rr = 6; rr < s; rr += 6) for (let k = 0; k < 3; k++) p.line(x + dx * rr * Math.cos(k * 0.45), y + rr * Math.sin(k * 0.45 + 0.1), x + dx * rr * Math.cos((k + 1) * 0.45), y + rr * Math.sin((k + 1) * 0.45 + 0.1), c); };
  PR.chains = (p, o) => { for (let k = 0; k < (o.len || 40); k += 4) { p.rect(o.x - 1, o.y + k, 3, 3, o.color || '#545577'); p.px(o.x, o.y + k + 1, '#0b0a12'); } };
  PR.banner = (p, o) => { const x = o.x, y = o.y, w = o.w || 20, h = o.h || 44, c = o.color || '#7d1c2b'; p.rect(x - w / 2 - 2, y, w + 4, 2, '#b8773f'); p.poly([[x - w / 2, y + 2], [x + w / 2, y + 2], [x + w / 2, y + h], [x, y + h - 6], [x - w / 2, y + h]], c); p.rect(x + w / 2 - 3, y + 2, 3, h - 4, LSE.shade(c, -0.15)); if (o.emblem) p.circle(x, y + h / 2 - 2, 4, o.emblem); };
  PR.stairs = (p, o) => { const n = o.steps || 6, w = o.w || 80, sh = 5, c = o.color || '#545577'; for (let i = 0; i < n; i++) { p.rect(o.x - w / 2 + i * 4, o.y - (i + 1) * sh, w - i * 8, sh, i % 2 ? c : LSE.shade(c, 0.05)); p.rect(o.x - w / 2 + i * 4, o.y - (i + 1) * sh, w - i * 8, 1, LSE.shade(c, 0.12)); } };
  PR.gold = (p, o, r) => { const w = o.w || 40; for (let i = 0; i < w * 1.6; i++) { const x = o.x - w / 2 + r() * w, hh = (1 - Math.abs((x - o.x) / (w / 2))) * 10; const y = o.y - r() * hh; p.rect(x, y, 3, 2, r() < 0.3 ? '#ffe66b' : '#ffc14a'); if (r() < 0.1) p.px(x + 1, y - 1, '#ffffff'); } };
  PR.floor = (p, o, r) => full(p, () => floor(p, o, r));
  function floor(p, o, r) { // textured ground band
    const y = o.y, h = (o.bottom || H) - y, c = o.color || '#8a5232', c2 = o.color2 || LSE.shade(c, -0.1), w = W + 2 * M;
    p.ditherV(0, y, w, h, c, o.far || LSE.shade(c, -0.25), 4);
    const tex = o.texture || 'sand';
    if (tex === 'tiles' || tex === 'stone') { for (let yy = y + 4, k = 6; yy < y + h; yy += k, k = Math.min(30, k + 3)) { p.rect(0, yy, w, 1, c2); const tw = k * 3; for (let xx = ((yy / k) & 1) * tw / 2; xx < w; xx += tw) p.rect(xx, yy, 1, k, c2); } }
    else if (tex === 'grass') { for (let i = 0; i < w * 3; i++) p.px(r() * w, y + r() * h, r() < 0.5 ? c2 : LSE.shade(c, 0.08)); }
    else if (tex === 'water') { for (let yy = y + 3; yy < y + h; yy += 6) for (let xx = (yy % 12); xx < w; xx += 16) p.rect(xx, yy, 6, 1, LSE.shade(c, 0.1)); }
    else if (tex === 'wood') { for (let yy = y; yy < y + h; yy += 7) { p.rect(0, yy, w, 1, c2); for (let xx = (yy * 7) % 40; xx < w; xx += 40) p.rect(xx, yy, 1, 7, c2); } }
    else { for (let i = 0; i < w * 2; i++) { const yy = y + Math.pow(r(), 1.5) * h; p.rect(r() * w, yy, 2, 1, r() < 0.5 ? c2 : LSE.shade(c, 0.07)); } }
    p.rect(0, y, w, 1, o.edge || LSE.shade(c, 0.1));
  }
  PR.tent = (p, o) => { const x = o.x, y = o.y, w = o.w || 44, h = o.h || 30, c = o.color || '#d9a35b', sh = LSE.shade(c, -0.18); p.poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]], c); p.poly([[x, y - h], [x + w / 2, y], [x + 4, y]], sh); p.poly([[x - 5, y], [x, y - h * 0.55], [x + 5, y]], '#3b1f1a'); p.line(x, y - h, x, y - h - 6, '#5c3424'); p.rect(x - w / 2 - 2, y - 1, w + 4, 1, LSE.shade(c, -0.3)); };
  PR.bed = (p, o) => { const x = o.x, y = o.y, w = o.w || 56, c = o.color || '#5c3424', sheet = o.sheet || '#f2efe6'; p.rect(x - w / 2, y - 10, w, 10, c); p.rect(x - w / 2, y - 22, 5, 22, c); p.rect(x + w / 2 - 4, y - 16, 4, 16, c); p.rect(x - w / 2 + 5, y - 14, w - 9, 5, sheet); p.rect(x - w / 2 + 5, y - 15, 12, 3, '#ffffff'); p.rect(x - w / 2 + 18, y - 14, w - 22, 2, LSE.shade(sheet, -0.12)); p.rect(x - w / 2, y - 2, w, 2, LSE.shade(c, -0.2)); };
  PR.lamp = (p, o) => { const x = o.x, y = o.y, h = o.h || 70, c = o.color || '#16141f'; p.rect(x - 1, y - h, 3, h, c); p.rect(x - 4, y - 3, 9, 3, c); p.rect(x - 4, y - h - 8, 9, 8, c); p.rect(x - 3, y - h - 7, 7, 6, o.lit || '#ffe66b'); p.rect(x - 2, y - h - 6, 2, 3, '#ffffff'); p.rect(x - 5, y - h - 9, 11, 1, c); };
  PR.papers = (p, o) => { for (let i = 0; i < (o.count || 3); i++) { const x = o.x + i * 12, y = o.y - (i % 2) * 2; p.rect(x - 6, y - 8, 12, 8, '#f2efe6'); p.rect(x - 6, y - 8, 12, 1, '#b3b9d1'); p.rect(x - 4, y - 6, 8, 1, '#16141f'); p.rect(x - 4, y - 4, 6, 1, '#7a7fa3'); p.rect(x - 4, y - 2, 7, 1, '#7a7fa3'); } };
  PR.desk = (p, o) => { const x = o.x, y = o.y, w = o.w || 40, c = o.color || '#5c3424'; p.rect(x - w / 2, y - 14, w, 3, LSE.shade(c, 0.08)); p.rect(x - w / 2 + 2, y - 11, 3, 11, c); p.rect(x + w / 2 - 5, y - 11, 3, 11, c); p.rect(x - w / 2 + 2, y - 11, w - 4, 2, LSE.shade(c, -0.15)); };
  PR.seal = (p, o) => { const x = o.x, y = o.y, w = o.w || 40, h = o.h || 64, c = o.color || '#d9a35b'; p.rect(x - w / 2, y - h, w, h, c); p.rect(x - w / 2, y - h, w, 2, LSE.shade(c, 0.1)); for (let yy = y - h + 8; yy < y - 6; yy += 12) for (let xx = x - w / 2 + 6 + ((yy / 12) % 2) * 6; xx < x + w / 2 - 4; xx += 12) { p.circle(xx, yy, 3, LSE.shade(c, -0.18)); p.px(xx, yy, LSE.shade(c, -0.32)); } p.rect(x - w / 2 - 3, y - h - 3, w + 6, 3, o.frame || '#5c3424'); p.rect(x - w / 2 - 3, y - h, 3, h, o.frame || '#5c3424'); p.rect(x + w / 2, y - h, 3, h, o.frame || '#5c3424'); };
  PR.map = (p, o) => { if (!o.map) return; const bm = LSE.Pixel.bitmap(o.flip ? Object.assign({}, o.map, { flip: true }) : o.map); const s = Math.max(1, Math.round(o.scale || 1)); p.ctx.drawImage(bm, Math.round(o.x - bm.width * s / 2), Math.round(o.y - bm.height * s), bm.width * s, bm.height * s); };
  PR.prop = (p, o, r, ctx2) => { const m = ctx2 && ctx2.resolve ? ctx2.resolve(o.ref) : null; if (m) PR.map(p, Object.assign({}, o, { map: m })); };

  // ---------- scene build (cached layers) ----------
  S.defaults = function (sc) {
    sc = Object.assign({}, sc || {});
    sc.sky = Object.assign({ top: '#0b0a12', bottom: '#2f2a47', bands: 6 }, sc.sky || {});
    sc.ground = Object.assign({ y: 300, color: '#5c3424', texture: 'sand' }, sc.ground || {});
    sc.far = sc.far || []; sc.mid = sc.mid || []; sc.near = sc.near || []; sc.ambient = sc.ambient || [];
    sc.light = sc.light || null;
    return sc;
  };

  S.build = function (spec, opts) {
    opts = opts || {};
    const sc = S.defaults(spec);
    const seed = LSE.hash(JSON.stringify([sc.id, sc.name, sc.far.length, sc.mid.length]));
    const snap = opts.palette ? LSE.makeSnapper(opts.palette) : null;
    const LW = W + 2 * M;
    const mk = () => { const r = LSE.canvas(LW, H); r.ctx.translate(M, 0); return r; };
    const emits = {}; const mkE = (name) => { const e = mk(), b = mk(); emits[name] = { e, b }; return [e.ctx, b.ctx]; };
    const layers = {};
    // sky+far
    { const { c, ctx } = mk(); const p = P(ctx); const gy = sc.ground.y + 10;
      // sky: two-colour gradient, or multi-stop [[0..1, colour], ...] for dusk / morning skies
      if (Array.isArray(sc.sky.stops) && sc.sky.stops.length > 1) full(p, () => { const st = sc.sky.stops; for (let k = 0; k + 1 < st.length; k++) { const y0 = Math.round(st[k][0] * gy), y1 = Math.round(st[k + 1][0] * gy); if (y1 > y0) p.ditherV(0, y0, LW, y1 - y0, st[k][1], st[k + 1][1], sc.sky.bands || 4); } });
      else full(p, () => p.ditherV(0, 0, LW, gy, sc.sky.top, sc.sky.bottom, sc.sky.bands || 6));
      // outdoor scenes: a land plane from the horizon to the ground line so distant buildings stand on the ground
      const STAND = ['pyramid', 'obelisk', 'temple', 'castle', 'statue', 'trees', 'columns', 'sarcophagus', 'coffin', 'mummycase', 'door', 'arch', 'stairs'];
      const bases = sc.far.filter((o) => o && STAND.includes(o.p) && o.y < sc.ground.y).map((o) => o.y);
      const hasWall = sc.far.some((o) => o && (o.p === 'wall' || o.p === 'rocks'));
      const horizon = sc.horizon != null ? sc.horizon : (bases.length && !hasWall ? Math.min(...bases) : null);
      const gFar = sc.ground.far || LSE.shade(sc.ground.color, -0.25); c.__horizon = horizon; c.__gFar = gFar;
      if (horizon != null && horizon < sc.ground.y) full(p, () => { p.ditherV(0, horizon, LW, sc.ground.y - horizon + 12, LSE.mix(sc.sky.bottom, gFar, 0.6), gFar, 3); p.rect(0, horizon, LW, 1, LSE.mix(sc.sky.bottom, gFar, 0.35)); });
      layers.sky = finish(c, ctx);
    }
    { const { c, ctx } = mk(); const p = P(ctx, ...mkE('far')); const horizon = layers.sky.__horizon;
      runPrims(p, sc.far, seed + 1, opts);
      // contact shadows where far buildings meet the land
      const STAND = ['pyramid', 'obelisk', 'temple', 'castle', 'statue', 'trees', 'columns', 'sarcophagus', 'coffin', 'mummycase', 'door', 'arch', 'stairs']; const gFar = layers.sky.__gFar;
      for (const o of sc.far) if (o && STAND.includes(o.p) && horizon != null) { const w = o.p === 'pyramid' ? (o.w || 120) : (o.w || 20) + 6; p.rect(o.x - w / 2 - 2, o.y, w + 4, 1, LSE.shade(gFar, -0.12)); p.rect(o.x - w / 2 + 2, o.y + 1, w - 4, 1, LSE.mix(LSE.shade(gFar, -0.12), gFar, 0.5)); }
      layers.far = finish(c, ctx); }
    { const { c, ctx } = mk(); runPrims(P(ctx, ...mkE('mid')), sc.mid, seed + 2, opts); layers.mid = finish(c, ctx); }
    { const { c, ctx } = mk(); const p = P(ctx, ...mkE('ground')); PR.floor(p, Object.assign({ y: sc.ground.y }, sc.ground), LSE.rng(seed + 3)); runPrims(p, sc.ground.prims || [], seed + 4, opts); layers.ground = finish(c, ctx); }
    { const { c, ctx } = mk(); runPrims(P(ctx, ...mkE('near')), sc.near, seed + 5, opts); layers.near = finish(c, ctx); }
    // emissive layers + a dithered pixel bloom around every lit pixel
    const glow = {};
    for (const k in emits) { const { e, b } = emits[k]; const E = finish(e.c, e.ctx), B = finish(b.c, b.ctx); const he = halo(E), hb = halo(B); if (he || hb) glow[k] = { e: E, b: B, he, hb }; }
    // light: dithered darkness + warm pool (static), flicker variant
    let light = null;
    const lights = (sc.lights && sc.lights.length ? sc.lights : sc.light ? [sc.light] : []).map((l) => Object.assign({ x: 135, y: 200, radius: 150, color: '#ff8a4c', dark: 0.55 }, l));
    if (lights.length) light = { base: lightCanvas(lights, 0), flick: lightCanvas(lights, 1), L: lights[0] };
    return { spec: sc, layers, light, glow, torches: collectTorches(sc) };

    function finish(c, ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (snap) { const id = ctx.getImageData(0, 0, c.width, c.height); const d = id.data; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) { d[i + 3] = 0; continue; } const v = snap(d[i], d[i + 1], d[i + 2]); d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; } ctx.putImageData(id, 0, 0); }
      return c;
    }
    function lightCanvas(Ls, flick) { // several light pools: darkness is the least-dark of them, the glow comes from the nearest
      const { c, ctx } = LSE.canvas(LW, H);
      const id = ctx.createImageData(LW, H); const d = id.data; const lcs = Ls.map((L) => LSE.hexToRgb(L.color)); const dk = Math.max(...Ls.map((L) => L.dark));
      for (let y = 0; y < H; y++) for (let x = 0; x < LW; x++) {
        let dark = dk, best = 9, bi = 0;
        Ls.forEach((L, k) => { const R = L.radius * (flick && L.flicker !== false ? 1.06 : 1); const dist = Math.hypot(x - (L.x + M), (y - L.y) * 0.9) / R; dark = Math.min(dark, LSE.clamp((dist - 0.35) * 1.1, 0, 1) * L.dark); if (dist < best) { best = dist; bi = k; } });
        const i = (y * LW + x) * 4;
        const q = Math.floor(dark * 4 + bay(x, y)) / 4; // 4-step dithered darkness
        if (q > 0) { d[i] = 8; d[i + 1] = 6; d[i + 2] = 16; d[i + 3] = Math.round(q * 255 * 0.9); }
        else if (best < 0.45) { const glow = Math.floor((0.45 - best) * 6 + bay(x, y)) / 6; if (glow > 0) { const lc = lcs[bi]; d[i] = lc[0]; d[i + 1] = lc[1]; d[i + 2] = lc[2]; d[i + 3] = Math.round(glow * (Ls[bi].glow || 70)); } }
      }
      ctx.putImageData(id, 0, 0);
      return c;
    }
  };
  function runPrims(p, list, seed, opts) {
    list.forEach((o, i) => { const f = PR[o && o.p]; if (!f) return; p.blinkMode = !!o.blink; try { f(p, o, LSE.rng(seed * 31 + i), opts); } catch (e) { /* ignore a broken primitive */ } p.blinkMode = false; });
  }
  // pixel bloom: up to 3 px around lit pixels, alpha falling off on a Bayer pattern (stays crisp, no blur)
  const HALO = [0, 0.55, 0.32, 0.16];
  function halo(src) {
    const w = src.width, h = src.height; const sd = src.getContext('2d').getImageData(0, 0, w, h).data; let any = false;
    const A = new Float32Array(w * h), C = new Int32Array(w * h).fill(-1);
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sd[(y * w + x) * 4 + 3] >= 128;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (sd[i * 4 + 3] < 128) continue;
      let nb = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) nb++; if (nb < 4) continue; // tiny specks (distant windows) get no bloom
      any = true;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const dd = Math.max(Math.abs(dx), Math.abs(dy)) + (Math.abs(dx) + Math.abs(dy) > 4 ? 1 : 0); if (!dd || dd > 3) continue; const j = yy * w + xx; if (HALO[dd] > A[j]) { A[j] = HALO[dd]; C[j] = i; } } }
    if (!any) return null;
    const { c, ctx } = LSE.canvas(w, h); const id = ctx.createImageData(w, h); const d = id.data;
    for (let j = 0; j < w * h; j++) { if (C[j] < 0 || sd[j * 4 + 3] >= 128) continue; const x = j % w, y = (j / w) | 0; if (A[j] < 0.3 && bay(x, y) > A[j] * 2.2) continue; const i = C[j] * 4; d[j * 4] = sd[i]; d[j * 4 + 1] = sd[i + 1]; d[j * 4 + 2] = sd[i + 2]; d[j * 4 + 3] = Math.round(Math.min(1, A[j] * 1.25) * 255); }
    ctx.putImageData(id, 0, 0); return c;
  }
  // emissive pass, drawn after the darkness so lights stay lit; blinking signs drop out on a few 8th notes (loop-safe)
  S.hasGlow = (built, layers) => !!built.glow && layers.some((n) => built.glow[n]);
  S.drawGlow = function (ctx, built, t, bpm, camX, layers) {
    if (!built.glow) return; const beat = 60 / bpm; const k = { far: 0.25, mid: 0.55, ground: 1, near: 1.25 };
    const off8 = LSE.tick(t, beat / 2) % 16; const blinkOn = !(off8 === 5 || off8 === 13 || off8 === 14);
    for (const name of layers || ['far', 'mid', 'ground', 'near']) { const g = built.glow[name]; if (!g) continue; const x = Math.round(-M - camX * k[name]);
      ctx.globalCompositeOperation = 'screen'; if (g.he) ctx.drawImage(g.he, x, 0); if (g.hb && blinkOn) ctx.drawImage(g.hb, x, 0); ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(g.e, x, 0); if (blinkOn) ctx.drawImage(g.b, x, 0); }
  };
  function collectTorches(sc) {
    const out = [];
    for (const k of ['far', 'mid', 'near']) for (const o of sc[k]) { if (o.p === 'torch') out.push({ x: o.x, y: o.y - 2, layer: k }); if (o.p === 'candles') for (let i = 0; i < (o.count || 3); i++) out.push({ x: o.x + i * 6 + 1, y: o.y - 6 - (i * 5) % 7, layer: k, small: true }); }
    for (const a of sc.ambient) if (a.type === 'torch') out.push({ x: a.x, y: a.y, layer: a.layer || 'mid' });
    return out;
  }

  // ---------- ambient life ----------
  // every period snaps to L / k so the loop stays seamless
  S.period = (want, L) => L / Math.max(1, Math.round(L / want));
  S.ambientExt = {}; // type -> fn(ctx, a, {t, L, beat, which: sky|back|front|glow, camX, sc, rnd})
  const TAU = Math.PI * 2;

  S.drawLayer = function (ctx, built, name, camX, scale) {
    const k = { sky: 0.1, far: 0.25, mid: 0.55, ground: 1, near: 1.25 }[name];
    const off = Math.round(-M - camX * k);
    ctx.drawImage(built.layers[name], off, 0);
    return off;
  };

  // draw ambient that belongs behind actors ('back') or in front ('front')
  S.drawAmbient = function (ctx, built, t, L, bpm, which, camX) {
    const sc = built.spec; const beat = 60 / bpm;
    const rnd = LSE.rng(LSE.hash(sc.name || 'scene') + 7);
    for (const a of sc.ambient) {
      if (a.rows && built.__row != null && !a.rows.includes(built.__row)) continue; // ambient only on some shots (rain on day 6)
      const ext = S.ambientExt[a.type];
      if (ext) { ext(ctx, a, { t, L, beat, which, camX, sc, rnd: LSE.rng(LSE.hash(a.type + (a.x || 0) + (a.y || 0) + (a.y0 || 0))) }); continue; }
      if (which === 'glow') continue;
      const front = ['fog', 'rain', 'sand', 'dust', 'embers', 'fireflies'].includes(a.type) && a.front !== false;
      const sky = a.type === 'stars';
      if (which === 'sky' ? !sky : (sky || (which === 'front') !== front)) continue;
      const n = a.count || 20; const col = a.color;
      if (a.type === 'dust' || a.type === 'fireflies' || a.type === 'magic') {
        const P1 = S.period(a.period || 8, L);
        for (let i = 0; i < n; i++) {
          const x0 = rnd() * W, y0 = (a.y0 || 60) + rnd() * ((a.y1 || 400) - (a.y0 || 60)), ph = rnd() * TAU, amp = 4 + rnd() * 10;
          const k = 1 + (i % 3);
          const x = x0 + Math.sin(TAU * t * k / P1 + ph) * amp, y = y0 + Math.cos(TAU * t * k / P1 + ph * 1.3) * amp * 0.6;
          const on = a.type === 'dust' ? 1 : (Math.sin(TAU * t * k / P1 + ph * 3) > -0.2 ? 1 : 0);
          if (!on) continue;
          ctx.fillStyle = col || (a.type === 'dust' ? 'rgba(255,230,170,0.55)' : a.type === 'magic' ? '#9b5de5' : '#ffe66b');
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
          if (a.type !== 'dust' && (i & 1)) { ctx.globalAlpha = 0.35; ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); ctx.globalAlpha = 1; }
        }
      } else if (a.type === 'fog') {
        const P1 = S.period(a.period || 16, L); const y = a.y || sc.ground.y - 20; const h = a.h || 26;
        const f = fogStrip(col || '#7a7fa3', h, a.alpha || 0.35);
        const off = -LSE.frac(t, P1) * f.width;
        ctx.drawImage(f, Math.round(off), y); ctx.drawImage(f, Math.round(off + f.width), y);
      } else if (a.type === 'stars') {
        const P1 = S.period(a.period || 4, L);
        for (let i = 0; i < (a.count || 40); i++) { const x = rnd() * W, y = rnd() * (a.y1 || 200), ph = rnd(); const on = LSE.frac(t + ph * P1, P1) < 0.85; ctx.fillStyle = on ? (col || '#f2efe6') : '#545577'; ctx.fillRect(x | 0, y | 0, 1, 1); if (i % 9 === 0 && on) { ctx.fillRect((x | 0) - 1, y | 0, 3, 1); ctx.fillRect(x | 0, (y | 0) - 1, 1, 3); } }
      } else if (a.type === 'bats') {
        const P1 = S.period(a.period || 6, L);
        for (let i = 0; i < (a.count || 4); i++) {
          const ph = rnd() * TAU, cx = 40 + rnd() * 190, cy = (a.y || 90) + rnd() * 50;
          const x = cx + Math.sin(TAU * t / P1 + ph) * 60, y = cy + Math.sin(2 * TAU * t / P1 + ph) * 14;
          const flap = (LSE.tick(t, beat / 4) + i) % 2;
          ctx.fillStyle = col || '#0b0a12';
          ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 2);
          if (flap) { ctx.fillRect(Math.round(x) - 4, Math.round(y) - 1, 3, 1); ctx.fillRect(Math.round(x) + 2, Math.round(y) - 1, 3, 1); }
          else { ctx.fillRect(Math.round(x) - 4, Math.round(y) + 1, 3, 1); ctx.fillRect(Math.round(x) + 2, Math.round(y) + 1, 3, 1); }
        }
      } else if (a.type === 'waves') {
        const P1 = S.period(a.period || 4, L); const y0 = a.y || sc.ground.y;
        ctx.fillStyle = col || '#8fd3ff';
        for (let r = 0; r < 6; r++) { const yy = y0 + r * 9; const sh = LSE.frac(t + r * 0.17 * P1, P1) * 24; for (let x = -24 + sh; x < W; x += 24) ctx.fillRect(Math.round(x), yy, 7 + (r % 3), 1); }
      } else if (a.type === 'sand' || a.type === 'rain' || a.type === 'embers' || a.type === 'drips' || a.type === 'snow' || a.type === 'ash') {
        const P1 = S.period(a.period || (a.type === 'sand' ? 3 : a.type === 'rain' ? 1 : 6), L);
        for (let i = 0; i < n; i++) {
          const ph = rnd(), x0 = rnd() * W, y0 = rnd() * H; const u = LSE.frac(t + ph * P1, P1);
          let x = x0, y = y0, w = 1, h = 1;
          if (a.type === 'sand') { x = (x0 + u * W * 1.2) % (W + 20) - 10; y = (a.y0 || 150) + (y0 % ((a.y1 || 420) - (a.y0 || 150))); w = 3; ctx.fillStyle = col || 'rgba(242,211,138,0.7)'; }
          else if (a.type === 'rain') { y = u * H; w = 1; h = 4; ctx.fillStyle = col || 'rgba(143,211,255,0.6)'; }
          else if (a.type === 'embers' || a.type === 'ash') { y = (a.y || sc.ground.y) - u * 220; x = x0 + Math.sin(TAU * u * 2 + ph * 6) * 6; ctx.fillStyle = col || (u < 0.5 ? '#ffc14a' : '#e0533f'); if (a.type === 'ash') ctx.fillStyle = col || '#7a7fa3'; }
          else if (a.type === 'snow') { y = u * H; x = x0 + Math.sin(TAU * u * 3 + ph * 6) * 5; ctx.fillStyle = col || '#ffffff'; }
          else { x = (a.xs ? a.xs[i % a.xs.length] : x0); y = (a.y || 20) + u * ((sc.ground.y) - (a.y || 20)); ctx.fillStyle = col || '#8fd3ff'; h = 2; }
          ctx.fillRect(Math.round(x), Math.round(y), w, h);
        }
      } else if (a.type === 'eyes') {
        const P1 = S.period(a.period || 4, L);
        for (let i = 0; i < (a.count || 3); i++) { const x = (a.xs && a.xs[i]) || 20 + rnd() * 230, y = (a.ys && a.ys[i]) || 120 + rnd() * 120, ph = rnd(); const open = LSE.frac(t + ph * P1, P1) < 0.9; if (!open) continue; ctx.fillStyle = col || '#ffe66b'; ctx.fillRect(x | 0, y | 0, 2, 1); ctx.fillRect((x | 0) + 5, y | 0, 2, 1); }
      }
    }
    // torch flames (3-frame, advance on 8th notes)
    if (which === 'back') for (const tch of built.torches) {
      const k = { far: 0.25, mid: 0.55, near: 1.25 }[tch.layer] || 0.55;
      const x = Math.round(tch.x - camX * k), y = Math.round(tch.y);
      const f = [0, 1, 2, 1][LSE.tick(t, beat / 2) % 4]; const s = tch.small ? 0.5 : 1;
      flame(ctx, x, y, f, s);
    }
  };
  function flame(ctx, x, y, f, s) {
    const h = [7, 9, 8][f] * s, w = s < 1 ? 2 : 4;
    ctx.fillStyle = '#e0533f'; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = '#ffc14a'; ctx.fillRect(x - w / 2 + (s < 1 ? 0 : 1), y - h + 2, Math.max(1, w - 2), h - 2);
    ctx.fillStyle = '#ffe66b'; ctx.fillRect(x - (f === 1 ? 0 : 1) * (s < 1 ? 0 : 1), y - h * 0.6, 1, Math.max(1, h * 0.4));
  }
  const fogCache = new Map();
  function fogStrip(col, h, alpha) {
    const k = col + h + alpha; if (fogCache.has(k)) return fogCache.get(k);
    const { c, ctx } = LSE.canvas(W + 30, h); const rgb = LSE.hexToRgb(col); const id = ctx.createImageData(c.width, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < c.width; x++) {
      const fw = TAU / c.width; // integer harmonics so the strip tiles seamlessly
      const v = (Math.sin(x * fw * 2 + y * 0.2) * 0.5 + Math.sin(x * fw * 5 - y * 0.13) * 0.5) * 0.5 + 0.5;
      const edge = 1 - Math.abs(y - h / 2) / (h / 2);
      const a = v * edge * alpha; const q = Math.floor(a * 3 + bay(x, y)) / 3;
      const i = (y * c.width + x) * 4; if (q > 0) { id.data[i] = rgb[0]; id.data[i + 1] = rgb[1]; id.data[i + 2] = rgb[2]; id.data[i + 3] = Math.round(q * 150); }
    }
    // make it tile horizontally: blend seam
    ctx.putImageData(id, 0, 0); fogCache.set(k, c); return c;
  }

  S.drawLight = function (ctx, built, t, bpm, camX) {
    if (!built.light) return;
    const beat = 60 / bpm; const fl = LSE.tick(t, beat / 2) % 4 === 3;
    ctx.drawImage(fl ? built.light.flick : built.light.base, Math.round(-M - camX * 0.55), 0);
  };
})(typeof window !== 'undefined' ? window : globalThis);
