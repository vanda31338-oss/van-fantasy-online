// Pixel maps (palette + char rows) and the image -> pixel art converter.
(function (G) {
  const LSE = G.LSE;
  const Pixel = (LSE.Pixel = {});
  const cache = new Map();

  // map: {w,h,pal:{a:'#hex'}, rows:['..aa..'], flip?}
  Pixel.validate = function (m) {
    if (!m || typeof m !== 'object') return 'ไม่มีข้อมูลพิกเซล';
    if (!Array.isArray(m.rows) || !m.rows.length) return 'rows ว่าง';
    if (!m.pal || typeof m.pal !== 'object') return 'ไม่มี pal';
    const w = Math.max(...m.rows.map((r) => String(r).length));
    if (w > 280 || m.rows.length > 280) return 'ใหญ่เกิน 280px';
    return null;
  };
  Pixel.size = function (m) { return { w: Math.max(...m.rows.map((r) => String(r).length)), h: m.rows.length }; };

  Pixel.bitmap = function (m, snap) {
    const key = (m.__k || (m.__k = 'p' + LSE.hash(JSON.stringify([m.pal, m.rows])))) + (m.flip ? 'f' : '') + (snap ? snap.id || '' : '');
    let bm = cache.get(key);
    if (bm) return bm;
    const { w, h } = Pixel.size(m);
    const { c, ctx } = LSE.canvas(Math.max(1, w), Math.max(1, h));
    const img = ctx.createImageData(c.width, c.height); const d = img.data;
    const pal = {};
    for (const k in m.pal) { const v = m.pal[k]; if (LSE.isHex(v)) pal[k] = LSE.hexToRgb(v.startsWith('#') ? v : '#' + v); }
    for (let y = 0; y < h; y++) {
      const row = String(m.rows[y] || '');
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]; const col = pal[ch];
        if (!col) continue;
        let rgb = col; if (snap) rgb = snap(col[0], col[1], col[2]);
        const xx = m.flip ? w - 1 - x : x;
        const i = (y * c.width + xx) * 4;
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    cache.set(key, c);
    return c;
  };

  // ---- shape drawing (how the house props are drawn): {w,h,ops:[[op,...]],outline:'#hex'|null} -> pixel map ----
  // ops, painted in order (later on top): ["rect",x,y,w,h,c] ["line",x0,y0,x1,y1,c] ["circle",cx,cy,r,c] ["ellipse",cx,cy,rx,ry,c]
  // ["poly",[[x,y],...],c] ["px",x,y,c] ["dots",[[x,y],...],c] ["clear",x,y,w,h]; outline = 1px rim drawn last around every shape
  const OPS = ['rect', 'line', 'circle', 'ellipse', 'poly', 'px', 'dots', 'clear'];
  Pixel.validateOps = function (d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.ops) || !d.ops.length) return 'ต้องมี ops';
    if (!(d.w >= 4 && d.w <= 160 && d.h >= 4 && d.h <= 160)) return 'w/h ต้องอยู่ระหว่าง 4–160';
    for (const o of d.ops) if (!Array.isArray(o) || !OPS.includes(o[0])) return 'op ไม่รู้จัก: ' + JSON.stringify(o).slice(0, 40);
    return null;
  };
  Pixel.fromOps = function (d) {
    const w = Math.round(d.w), h = Math.round(d.h); const g = Array.from({ length: h }, () => Array(w).fill(null));
    const col = (c) => (typeof c === 'string' && LSE.isHex(c) ? (c.startsWith('#') ? c : '#' + c).toLowerCase() : null);
    const px = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
    const rect = (x, y, ww, hh, c) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) px(x + i, y + j, c); };
    const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let k = 0; k <= n; k++) px(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c); };
    const ellipse = (cx, cy, rx, ry, c) => { rx = Math.max(0.5, rx); ry = Math.max(0.5, ry); for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) px(cx + x, cy + y, c); };
    const poly = (pts, c) => { // even-odd scanline fill, then the edges so thin shapes stay visible
      if (!Array.isArray(pts) || pts.length < 3) return;
      const ys = pts.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const xs = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + (y + 0.5 - ay) / (by - ay) * (bx - ax)); }
        xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) px(x, y, c);
      }
      for (let i = 0; i < pts.length; i++) line(pts[i][0], pts[i][1], pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1], c);
    };
    for (const o of d.ops || []) {
      const [op, ...a] = o; const c = col(a[a.length - 1]);
      if (op === 'clear') { rect(+a[0], +a[1], +a[2], +a[3], null); continue; }
      if (!c) continue;
      if (op === 'rect') rect(+a[0], +a[1], +a[2], +a[3], c); else if (op === 'line') line(+a[0], +a[1], +a[2], +a[3], c);
      else if (op === 'circle') ellipse(+a[0], +a[1], +a[2] + 0.3, +a[2] + 0.3, c); else if (op === 'ellipse') ellipse(+a[0], +a[1], +a[2], +a[3], c);
      else if (op === 'poly') poly(a[0], c); else if (op === 'px') px(+a[0], +a[1], c); else if (op === 'dots') for (const p of a[0] || []) px(p[0], p[1], c);
    }
    const oc = col(d.outline);
    if (oc) { const o = g.map((r) => r.slice()); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== oc)) o[y][x] = oc; for (let y = 0; y < h; y++) g[y] = o[y]; }
    return Pixel.fromGrid(g);
  };
  Pixel.fromGrid = function (g) {
    const keys = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@$%&*+=?<>~^'; const pal = {}; const idx = new Map();
    const rows = g.map((r) => r.map((c) => { if (!c) return '.'; let k = idx.get(c); if (!k) { k = keys[idx.size] || keys[keys.length - 1]; idx.set(c, k); pal[k] = c; } return k; }).join(''));
    return { w: g[0] ? g[0].length : 0, h: g.length, pal, rows };
  };
  // creature frames: a shared body plus per-frame changes {w,h,outline,base:[ops],idle:[{dx,dy,ops}],action:[…]}
  Pixel.framesFromOps = function (d) {
    const out = {};
    for (const set of ['idle', 'action']) out[set] = (d[set] || []).map((f) => {
      const shifted = (d.base || []).map((o) => shiftOp(o, f.dx || 0, f.dy || 0));
      return Pixel.fromOps({ w: d.w, h: d.h, outline: d.outline, ops: shifted.concat(f.ops || []) });
    });
    return out;
  };
  function shiftOp(o, dx, dy) {
    if (!dx && !dy) return o; const [op, ...a] = o;
    if (op === 'poly' || op === 'dots') return [op, (a[0] || []).map((p) => [p[0] + dx, p[1] + dy]), a[1]];
    if (op === 'line') return [op, a[0] + dx, a[1] + dy, a[2] + dx, a[3] + dy, a[4]];
    return [op, a[0] + dx, a[1] + dy, ...a.slice(2)];
  }
  // a drawing as either form: pixel map or shape ops
  Pixel.toMap = (x) => (x && x.ops ? Pixel.fromOps(x) : x);

  // canvas/ImageData -> pixel map (used by converter and library)
  Pixel.fromImageData = function (img, maxColors) {
    const keys = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@$%&*+=?<>~^';
    const pal = {}; const idx = new Map(); const rows = [];
    for (let y = 0; y < img.height; y++) {
      let s = '';
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        if (img.data[i + 3] < 128) { s += '.'; continue; }
        const hex = LSE.rgbToHex(img.data[i], img.data[i + 1], img.data[i + 2]);
        let k = idx.get(hex);
        if (!k) { k = keys[idx.size] || keys[keys.length - 1]; idx.set(hex, k); pal[k] = hex; }
        s += k;
      }
      rows.push(s);
    }
    return { w: img.width, h: img.height, pal, rows };
  };

  // ---------------- Pixel Forge style converter ----------------
  // opts: {grid (target width px), bgStrength 0..1 (or 'auto'), palette (locked hex list) | colors (k-means count),
  //        saturation, contrast, outline, cleanup}
  Pixel.convert = function (source, opts) {
    opts = Object.assign({ grid: 48, bgStrength: 'auto', colors: 12, saturation: 1.1, contrast: 1.05, outline: true, cleanup: true }, opts || {});
    const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
    const scale = Math.min(1, 640 / Math.max(sw, sh));
    const W = Math.max(1, Math.round(sw * scale)), H = Math.max(1, Math.round(sh * scale));
    const { ctx } = LSE.canvas(W, H);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(source, 0, 0, W, H);
    const src = ctx.getImageData(0, 0, W, H); const d = src.data;
    const alpha = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = d[i * 4 + 3] > 20 ? 1 : 0;

    // 1) background flood fill from the border
    const border = [];
    for (let x = 0; x < W; x++) { border.push(x, x + (H - 1) * W); }
    for (let y = 0; y < H; y++) { border.push(y * W, y * W + W - 1); }
    let bgCol = [0, 0, 0], cnt = 0, varSum = 0;
    for (const p of border) if (alpha[p]) { bgCol[0] += d[p * 4]; bgCol[1] += d[p * 4 + 1]; bgCol[2] += d[p * 4 + 2]; cnt++; }
    if (cnt) bgCol = bgCol.map((v) => v / cnt);
    for (const p of border) if (alpha[p]) { const dr = d[p * 4] - bgCol[0], dg = d[p * 4 + 1] - bgCol[1], db = d[p * 4 + 2] - bgCol[2]; varSum += Math.sqrt(dr * dr + dg * dg + db * db); }
    const plain = cnt > 0 && varSum / cnt < 18;
    let strength = opts.bgStrength === 'auto' ? (plain ? 0.5 : 0) : +opts.bgStrength;
    if (strength > 0 && cnt) {
      const tol = 10 + strength * 90; const bgLab = LSE.rgbToOklab(...bgCol);
      const seen = new Uint8Array(W * H); const stack = [];
      for (const p of border) stack.push(p);
      while (stack.length) {
        const p = stack.pop(); if (seen[p]) continue; seen[p] = 1;
        if (!alpha[p]) { pushN(p); continue; }
        const lab = LSE.rgbToOklab(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
        const dist = Math.hypot(lab[0] - bgLab[0], lab[1] - bgLab[1], lab[2] - bgLab[2]) * 255;
        if (dist <= tol) { alpha[p] = 0; pushN(p); }
      }
      function pushN(p) { const x = p % W, y = (p / W) | 0; if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W); }
    }
    // 2) crop to subject
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    // 3) area-average downsample to an exact grid
    const gw = Math.max(4, Math.min(128, Math.round(opts.grid)));
    const gh = Math.max(4, Math.min(128, Math.round(gw * ch / cw)));
    const out = new ImageData(gw, gh); const o = out.data;
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const sx0 = x0 + gx * cw / gw, sx1 = x0 + (gx + 1) * cw / gw, sy0 = y0 + gy * ch / gh, sy1 = y0 + (gy + 1) * ch / gh;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
        const p = y * W + x; n++;
        if (!alpha[p]) continue;
        r += d[p * 4]; g += d[p * 4 + 1]; b += d[p * 4 + 2]; a++;
      }
      const i = (gy * gw + gx) * 4;
      if (a / Math.max(1, n) >= 0.5) { o[i] = r / a; o[i + 1] = g / a; o[i + 2] = b / a; o[i + 3] = 255; }
    }
    // 4) saturation / contrast in OKLab
    const labs = [];
    for (let i = 0; i < gw * gh; i++) {
      if (!o[i * 4 + 3]) { labs.push(null); continue; }
      let [L, A, B] = LSE.rgbToOklab(o[i * 4], o[i * 4 + 1], o[i * 4 + 2]);
      L = LSE.clamp((L - 0.5) * opts.contrast + 0.5, 0, 1); A *= opts.saturation; B *= opts.saturation;
      labs.push([L, A, B]);
    }
    // 5) palette: locked project palette snap OR k-means (sqrt-count weighted)
    let centers;
    if (opts.palette && opts.palette.length) {
      centers = opts.palette.map((h) => { const c = LSE.hexToRgb(h); return LSE.rgbToOklab(c[0], c[1], c[2]); });
    } else {
      const hist = new Map();
      for (const l of labs) if (l) { const k = l.map((v) => Math.round(v * 60)).join(','); const e = hist.get(k); if (e) e.n++; else hist.set(k, { l, n: 1 }); }
      const pts = [...hist.values()].map((e) => ({ l: e.l, w: Math.sqrt(e.n) }));
      const K = Math.min(opts.colors, pts.length);
      pts.sort((a, b) => b.w - a.w);
      centers = [pts[0].l.slice()];
      while (centers.length < K) { // farthest-point init
        let best = null, bd = -1;
        for (const p of pts) { let m = 1e9; for (const c of centers) m = Math.min(m, dist(p.l, c)); if (m * p.w > bd) { bd = m * p.w; best = p; } }
        centers.push(best.l.slice());
      }
      for (let it = 0; it < 10; it++) {
        const acc = centers.map(() => [0, 0, 0, 0]);
        for (const p of pts) { const ci = nearest(p.l, centers); const a = acc[ci]; a[0] += p.l[0] * p.w; a[1] += p.l[1] * p.w; a[2] += p.l[2] * p.w; a[3] += p.w; }
        acc.forEach((a, i) => { if (a[3]) centers[i] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
      }
    }
    const asg = labs.map((l) => (l ? nearest(l, centers) : -1));
    // 6) clean-up: lone pixels & low-contrast speckles, keep eyes/highlights (high contrast singles)
    if (opts.cleanup) {
      for (let pass = 0; pass < 2; pass++) for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const i = y * gw + x; const c = asg[i]; if (c < 0) continue;
        const nb = []; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; nb.push(xx < 0 || yy < 0 || xx >= gw || yy >= gh ? -1 : asg[yy * gw + xx]); }
        if (nb.includes(c)) continue;
        const solid = nb.filter((v) => v >= 0);
        if (solid.length <= 1) { asg[i] = solid.length ? asg[i] : -1; if (!solid.length) continue; }
        // majority neighbour
        const cntm = {}; for (const v of solid) cntm[v] = (cntm[v] || 0) + 1;
        const maj = +Object.keys(cntm).sort((a, b) => cntm[b] - cntm[a])[0];
        const contrast = Math.abs(centers[c][0] - centers[maj][0]);
        if (contrast < 0.18) asg[i] = maj; // low-contrast speckle; keep strong highlights/eyes
      }
    }
    for (let i = 0; i < gw * gh; i++) {
      if (asg[i] < 0) { o[i * 4 + 3] = 0; continue; }
      const rgb = LSE.oklabToRgb(...centers[asg[i]]);
      o[i * 4] = rgb[0]; o[i * 4 + 1] = rgb[1]; o[i * 4 + 2] = rgb[2]; o[i * 4 + 3] = 255;
    }
    // 7) 1px selective outline: darker shade of the neighbouring colour
    if (opts.outline) {
      const copy = new Uint8ClampedArray(o);
      const pw = gw + 2, ph = gh + 2; // add 1px border room
      const res = new ImageData(pw, ph); const r = res.data;
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const s = (y * gw + x) * 4, t = ((y + 1) * pw + x + 1) * 4; for (let k = 0; k < 4; k++) r[t + k] = copy[s + k]; }
      const snapPal = opts.palette && opts.palette.length ? LSE.makeSnapper(opts.palette) : null;
      const add = [];
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
        const t = (y * pw + x) * 4; if (r[t + 3]) continue;
        let nbc = null;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= pw || yy >= ph) continue; const q = (yy * pw + xx) * 4; if (r[q + 3]) { nbc = [r[q], r[q + 1], r[q + 2]]; break; } }
        if (nbc) { const lab = LSE.rgbToOklab(...nbc); let rgb = LSE.oklabToRgb(Math.max(0.05, lab[0] * 0.45), lab[1] * 0.6, lab[2] * 0.6); if (snapPal) rgb = snapPal(...rgb); add.push([t, rgb]); }
      }
      for (const [t, rgb] of add) { r[t] = rgb[0]; r[t + 1] = rgb[1]; r[t + 2] = rgb[2]; r[t + 3] = 255; }
      return { image: res, bgRemoved: strength > 0, plainBorder: plain };
    }
    return { image: out, bgRemoved: strength > 0, plainBorder: plain };

    function dist(a, b) { return (a[0] - b[0]) ** 2 * 1.3 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; }
    function nearest(l, cs) { let bi = 0, bd = 1e9; for (let i = 0; i < cs.length; i++) { const dd = dist(l, cs[i]); if (dd < bd) { bd = dd; bi = i; } } return bi; }
  };

  // built-in tiny icons (CTA buttons etc.)
  Pixel.ICONS = {
    like: { pal: { o: '#0b0a12', w: '#ffffff', y: '#ffc14a', r: '#e0533f' }, rows: [
      '......oo........', '.....owwo.......', '.....owwo.......', '....owwwo.......', '....owwo........', '...owwwooooooo..',
      'oooowwwwwwwwwwo.', 'owwowwwwwwwwwwo.', 'owwowwwwwwwwwo..', 'owwowwwwwwwwwwo.', 'owwowwwwwwwwwo..', 'owwowwwwwwwwwwo.',
      'owwowwwwwwwwwo..', 'oooowwwwwwwwo...', '...oooooooooo...', '................'] },
    share: { pal: { o: '#0b0a12', w: '#ffffff' }, rows: [
      '..........oo....', '..........owo...', '..........owwo..', '...ooooooowwwo..', '..owwwwwwwwwwwo.', '.owwwwwwwwwwwwwo',
      '.owwwwwwwwwwwwo.', '.owwwooooowwwo..', '.owwo.....owo...', '.owo......oo....', '.owo............', '.oo.............',
      '................', '................', '................', '................'] },
    bell: { pal: { o: '#0b0a12', w: '#ffffff', y: '#ffc14a' }, rows: [
      '.......oo.......', '......owwo......', '.....owwwwo.....', '....owwwwwwo....', '....owwwwwwo....', '...owwwwwwwwo...',
      '...owwwwwwwwo...', '...owwwwwwwwo...', '..owwwwwwwwwwo..', '..owwwwwwwwwwo..', '.owwwwwwwwwwwwo.', '.oooooooooooooo.',
      '......owwo......', '.......oo.......', '................', '................'] },
  };
})(typeof window !== 'undefined' ? window : globalThis);
