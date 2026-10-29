// LPC compositor: catalog, recolour, recipe -> per-animation frame canvases (+ head overlays).
(function (G) {
  const LSE = G.LSE;
  const DIRS = ['n', 'w', 's', 'e']; // LPC row order: up, left, down, right
  const LPC = (LSE.LPC = { DIRS, catalog: null, base: 'lpc/' });
  const imgCache = new Map();
  const recolorCache = new Map();

  LPC.load = async function (base) {
    if (LPC.catalog) return LPC.catalog;
    if (base) LPC.base = base;
    const r = await fetch(LPC.base + 'catalog.json');
    if (!r.ok) throw new Error('โหลดแคตตาล็อก LPC ไม่ได้ (' + r.status + ')');
    LPC.catalog = await r.json();
    return LPC.catalog;
  };

  // compact catalog text for prompts: id|name|type|bodies|variants or recolour materials
  LPC.promptIndex = function () {
    const c = LPC.catalog; if (!c) return '';
    const lines = [];
    for (const [id, it] of Object.entries(c.items)) {
      const col = it.r ? 'recolor:' + it.r.map((x) => x.k + '=' + x.m).join(',') : 'variants:' + it.v.join('/');
      lines.push(`${id}|${it.n}|${it.c}|${it.b.join('/')}|${col}${it.mb ? '|matchbody' : ''}`);
    }
    return lines.join('\n');
  };
  LPC.materialVariants = function () {
    const p = LPC.catalog.palettes; const o = {};
    for (const m in p) o[m] = Object.keys(p[m]);
    return o;
  };
  LPC.search = function (q) {
    const c = LPC.catalog; q = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    for (const [id, it] of Object.entries(c.items)) {
      const hay = (id + ' ' + it.n + ' ' + it.t + ' ' + it.c + ' ' + (it.tags || []).join(' ')).toLowerCase();
      if (q.every((w) => hay.includes(w))) out.push({ id, name: it.n, cat: it.c, bodies: it.b, variants: it.r ? null : it.v, recolor: it.r ? it.r.map((x) => ({ key: x.k, material: x.m })) : null });
      if (out.length >= 25) break;
    }
    return out;
  };
  LPC.variantsOf = function (id) {
    const it = LPC.catalog.items[id]; if (!it) throw new Error('ไม่มีชิ้นนี้ในแคตตาล็อก: ' + id);
    if (it.r) return { id, recolor: it.r.map((x) => ({ key: x.k, material: x.m, options: Object.keys(LPC.catalog.palettes[x.m]) })) };
    return { id, variants: it.v };
  };

  function sheetImg(file) {
    if (!imgCache.has(file)) imgCache.set(file, LSE.loadImage(LPC.base + file.replace(/^lpc\//, '')));
    return imgCache.get(file);
  }

  // recolour an LPC sheet: map source ramp (material base) -> chosen variant ramp, per channel
  async function recolored(sheetKey, channels) {
    const c = LPC.catalog; const sh = c.sheets[sheetKey];
    const img = await sheetImg(sh.f);
    if (!channels || !channels.length) return img;
    const ck = sheetKey + JSON.stringify(channels);
    if (recolorCache.has(ck)) return recolorCache.get(ck);
    const { c: cv, ctx } = LSE.canvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, img.width, img.height); const d = id.data;
    const maps = [];
    for (const ch of channels) {
      const pal = c.palettes[ch.m]; if (!pal) continue;
      const src = pal[ch.base] || pal[c.bases[ch.m]]; const dst = pal[ch.to];
      const fx = ch.fx && LSE.Headgear.skinFx(ch.fx);
      if (!src || (!dst && !fx) || (ch.to === ch.base && !fx)) continue;
      maps.push({ src: src.map(LSE.hexToRgb), dst: (dst || src).map(LSE.hexToRgb), fx: fx ? { ramp: fx.ramp.map(LSE.hexToRgb), pattern: fx.pattern } : null });
    }
    if (maps.length) {
      const memo = new Map(); const W = img.width;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        let hit = memo.get(key);
        if (hit === undefined) {
          hit = null;
          outer: for (const m of maps) for (let k = 0; k < m.src.length; k++) { const s0 = m.src[k]; if (Math.abs(s0[0] - d[i]) <= 1 && Math.abs(s0[1] - d[i + 1]) <= 1 && Math.abs(s0[2] - d[i + 2]) <= 1) { hit = { m, k }; break outer; } }
          memo.set(key, hit);
        }
        if (!hit) continue;
        let to;
        if (hit.m.fx) { const p = i >> 2; const x = p % W, y = (p / W) | 0; const k = Math.max(0, Math.min(hit.m.fx.ramp.length - 1, hit.m.fx.pattern(x % 64, y % 64, Math.round(hit.k * (hit.m.fx.ramp.length - 1) / Math.max(1, hit.m.src.length - 1))))); to = hit.m.fx.ramp[k]; }
        else to = hit.m.dst[hit.k] || hit.m.dst[hit.m.dst.length - 1];
        d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2];
      }
      ctx.putImageData(id, 0, 0);
    }
    recolorCache.set(ck, cv);
    return cv;
  }

  // re-dye a whole layer in one hue (e.g. wings: every person a different colour): the sheet's own light/dark
  // shading is stretched onto a ramp dark -> tint -> near-white, outlines stay dark
  const tintCache = new Map();
  function tinted(key, img, hex) {
    const ck = key + '|' + hex; if (tintCache.has(ck)) return tintCache.get(ck);
    const { c: cv, ctx } = LSE.canvas(img.width, img.height); ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, img.width, img.height); const d = id.data; const T = LSE.hexToRgb(hex);
    let lo = 1, hi = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; if (l > 0.12) { lo = Math.min(lo, l); hi = Math.max(hi, l); } }
    const span = Math.max(0.05, hi - lo); const dark = T.map((v) => Math.round(v * 0.22)), lite = T.map((v) => Math.round(v + (255 - v) * 0.6));
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue; const l0 = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      if (l0 <= 0.12) { d[i] = dark[0] >> 1; d[i + 1] = dark[1] >> 1; d[i + 2] = Math.max(18, dark[2] >> 1); continue; }
      const l = LSE.clamp((l0 - lo) / span, 0, 1); const o = l < 0.6 ? dark.map((v, k) => v + (T[k] - v) * (l / 0.6)) : T.map((v, k) => v + (lite[k] - v) * ((l - 0.6) / 0.4));
      d[i] = Math.round(o[0]); d[i + 1] = Math.round(o[1]); d[i + 2] = Math.round(o[2]);
    }
    ctx.putImageData(id, 0, 0); tintCache.set(ck, cv); return cv;
  }

  // Normalise a recipe: body + layers [{id, v, colors:{color_1: variant}}]
  LPC.normalize = function (recipe) {
    const c = LPC.catalog; const body = c.bodies.includes(recipe.body) ? recipe.body : 'male';
    const skin = recipe.skin || 'light';
    const out = []; const warn = [];
    for (const L of recipe.layers || []) {
      const it = c.items[L.id];
      if (!it) { warn.push('ไม่มีชิ้น ' + L.id); continue; }
      let b = body;
      if (!it.b.includes(b)) { b = it.b.includes('male') ? 'male' : it.b[0]; if (b !== body) warn.push(L.id + ' ไม่มีแบบ ' + body + ' ใช้ ' + b); }
      let v = it.r ? '' : (it.v.includes(L.v) ? L.v : it.v[0]);
      const sheet = it.s[b + '|' + v];
      if (!sheet) { warn.push('ไม่มีชีต ' + L.id); continue; }
      let channels = null;
      if (it.r) {
        channels = it.r.map((ch) => {
          let to = (L.colors && L.colors[ch.k]) || null;
          if (!to && ch.m === 'body' && it.mb) to = skin;
          if (!to && ch.m === 'body' && L.id === 'body') to = skin;
          const opts = c.palettes[ch.m];
          if (!to || !opts[to]) to = ch.m === 'body' ? (opts[skin] ? skin : ch.base) : ch.base;
          const fx = recipe.skinFx && ch.m === 'body' && (it.mb || L.id === 'body' || it.c === 'head') ? recipe.skinFx : null;
          return { m: ch.m, base: ch.base, to, fx };
        });
      }
      out.push({ id: L.id, item: it, sheet, channels, v, tint: L.tint || null, dx: L.dx | 0, dy: L.dy | 0 });
    }
    return { body, skin, layers: out, warn };
  };

  LPC.creditsFor = function (recipe) {
    const n = LPC.normalize(recipe); const ids = new Set();
    for (const L of n.layers) for (const i of L.item.cr) ids.add(i);
    return [...ids].map((i) => LPC.catalog.credits[i]);
  };

  // Composite: returns {body, anims:{name:{fs, n, seq, canvas}}, anchor(anim,dir,i)}
  // overlays: [{z, dirs:{n:map,w:map,s:map,e:map}, anchor:'head', dx, dy}] drawn with the head
  LPC.composite = async function (recipe, opts) {
    opts = opts || {};
    const c = LPC.catalog; const N = LPC.normalize(recipe);
    const wanted = opts.anims || Object.keys(c.std);
    const draws = []; // {z, img, blocks}
    for (const L of N.layers) {
      const sh = c.sheets[L.sheet];
      let img = await recolored(L.sheet, L.channels);
      if (L.tint) img = tinted(L.sheet + JSON.stringify(L.channels), img, L.tint);
      for (const li in sh.L) draws.push({ z: L.item.z[+li] ?? 100, img, blocks: sh.L[li], id: L.id, head: L.item.c === 'head' && L.item.t === 'head', dx: L.dx, dy: L.dy });
    }
    for (const ov of recipe.overlays || []) draws.push({ z: ov.z ?? 125, overlay: ov });
    draws.sort((a, b) => a.z - b.z);
    const snap = opts.palette ? (opts.strict ? LSE.makeSnapper(opts.palette) : LSE.makeHarmonizer(opts.palette)) : null;
    const heads = draws.filter((d) => d.head); const mcv = LSE.canvas(64, 64);
    const headMask = (a, r, idx) => { const m = mcv.ctx; m.clearRect(0, 0, 64, 64); for (const d of heads) { const b = d.blocks[a] || (FALLBACK[a] && d.blocks[FALLBACK[a][0]]); if (!b || b[5]) continue; const ii = d.blocks[a] ? idx : FALLBACK[a][1](idx); if (ii >= b[3]) continue; m.drawImage(d.img, b[0] + ii * 64, b[1] + (b[4] === 1 ? 0 : r) * 64, 64, 64, 0, 0, 64, 64); } const px = m.getImageData(0, 0, 64, 64).data; const mk = new Uint8Array(64 * 64); for (let k = 0; k < mk.length; k++) mk[k] = px[k * 4 + 3] > 100 ? 1 : 0; return mk; };
    const anims = {};
    for (const a of wanted) {
      const std = c.std[a]; if (!std) continue;
      let fs = 64 + 2 * (recipe.pad | 0), seq = null, n = std[0]; // pad: room around the body (big extra wings)
      for (const d of draws) {
        const b = d.blocks && d.blocks[a];
        if (b && b[5]) { const cu = c.customs[b[5]]; if (cu && cu.fs >= fs) { fs = cu.fs; seq = cu.seq; n = cu.seq[0].length; } }
      }
      // any layer with this anim at all?
      if (!draws.some((d) => d.blocks && d.blocks[a])) continue;
      const rows = 4;
      const { c: cv, ctx } = LSE.canvas(fs * n, fs * rows);
      const off = (fs - 64) / 2;
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < n; i++) {
          const stdIdx = seq ? seq[r][i] : i;
          const cx = i * fs, cy = r * fs;
          for (const d of draws) {
            if (d.overlay) { if (d.overlay.template && LSE.Headgear[d.overlay.template]) LSE.Headgear[d.overlay.template](ctx, headMask(a, r, stdIdx), r, cx + off, cy + off, d.overlay.colors || {}, i); else drawOverlay(ctx, d.overlay, N.body, a, r, stdIdx, cx + off, cy + off); continue; }
            let b = d.blocks[a]; let useIdx = stdIdx;
            if (!b) { const fb = FALLBACK[a]; if (!fb || !d.blocks[fb[0]]) continue; b = d.blocks[fb[0]]; if (b[5]) continue; useIdx = fb[1](stdIdx); }
            const [bx, by, bfs, bn, brows, cust] = b;
            if (cust) {
              if (i >= bn) continue;
              const o2 = (fs - bfs) / 2;
              ctx.drawImage(d.img, bx + i * bfs, by + Math.min(r, brows - 1) * bfs, bfs, bfs, cx + o2 + (d.dx || 0), cy + o2 + (d.dy || 0), bfs, bfs);
            } else {
              if (useIdx >= bn) continue;
              const rr = brows === 1 ? 0 : r;
              if (d.dx || d.dy) { ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, fs, fs); ctx.clip(); ctx.drawImage(d.img, bx + useIdx * 64, by + rr * 64, 64, 64, cx + off + (d.dx || 0), cy + off + (d.dy || 0), 64, 64); ctx.restore(); }
              else ctx.drawImage(d.img, bx + useIdx * 64, by + rr * 64, 64, 64, cx + off, cy + off, 64, 64);
            }
          }
        }
      }
      if (snap) { const id = ctx.getImageData(0, 0, cv.width, cv.height); LSE.snapImageData(id, snap); ctx.putImageData(id, 0, 0); }
      anims[a] = { fs, n, seq, canvas: cv, off };
    }
    return { body: N.body, anims, warn: N.warn, recipe };
  };

  // a layer without an animation borrows a pose from walk (frame 0 = standing)
  const FALLBACK = { idle: ['walk', () => 0], combat: ['walk', () => 0], run: ['walk', (i) => (i % 8) + 1], jump: ['walk', () => 0], sit: ['walk', () => 0], emote: ['walk', () => 0], backslash: ['slash', (i) => Math.min(5, Math.floor(i / 2))] };

  LPC.anchor = function (body, anim, dirRow, idx) {
    const t = LPC.catalog.anchors[body] || LPC.catalog.anchors.male;
    const a = t[anim] || t.walk; const row = a[Math.min(dirRow, a.length - 1)] || a[0];
    return row[Math.min(idx, row.length - 1)] || row[0];
  };

  function drawOverlay(ctx, ov, body, anim, r, stdIdx, x0, y0) {
    const dir = DIRS[r];
    const map = (ov.dirs && (ov.dirs[dir] || (dir === 'e' && ov.dirs.w && { flip: true, ...ov.dirs.w }) || (dir === 'w' && ov.dirs.e && { flip: true, ...ov.dirs.e }) || ov.dirs.s)) || ov.map;
    if (!map) return;
    const bm = LSE.Pixel.bitmap(map.flip ? Object.assign({}, map, { flip: true }) : map);
    const an = LPC.anchor(body, anim, anim === 'hurt' ? 0 : r, stdIdx);
    const ax = an[0], top = an[1];
    const dx = ov.dx || 0, dy = ov.dy || 0;
    // overlay anchored: centre x on head centre, bottom of overlay at headTop + h*anchorY
    const ay = ov.anchorY != null ? ov.anchorY : 0.5;
    ctx.drawImage(bm, Math.round(x0 + ax - bm.width / 2 + dx), Math.round(y0 + top - bm.height * ay + dy));
  }

  // playback helpers
  LPC.CYCLES = { walk: [1, 2, 3, 4, 5, 6, 7, 8], idle: [0, 0, 1, 1], combat: [0, 0, 1, 1], run: [0, 1, 2, 3, 4, 5, 6, 7], jump: [0, 1, 2, 3, 4, 1], sit: [0, 1, 2], emote: [0, 1, 2, 2] };
  LPC.dirRow = (d) => Math.max(0, DIRS.indexOf(d || 's'));
})(typeof window !== 'undefined' ? window : globalThis);
