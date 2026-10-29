// Frame renderer (540x960 output, 270x480 art), captions, CTA, watermark, FX, transitions, player, seam test.
(function (G) {
  const LSE = G.LSE;
  const AW = 270, AH = 480;
  LSE.OUT = { W: 540, H: 960, AW, AH };
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  let ditherLevels = null;
  function dithers() { // 17 coverage levels of a 4x4 Bayer mask, art resolution
    if (ditherLevels) return ditherLevels;
    ditherLevels = [];
    for (let lv = 0; lv <= 16; lv++) {
      const { c, ctx } = LSE.canvas(AW, AH); const id = ctx.createImageData(AW, AH);
      for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) if (BAYER4[(y & 3) * 4 + (x & 3)] < lv) id.data[(y * AW + x) * 4 + 3] = 255;
      ctx.putImageData(id, 0, 0); ditherLevels.push(c);
    }
    return ditherLevels;
  }
  function tinted(mask, color) { const { c, ctx } = LSE.canvas(mask.width, mask.height); ctx.drawImage(mask, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height); return c; }
  const tintCache = new Map();
  function ditherFill(ctx, cover, color) { const lv = Math.max(0, Math.min(16, Math.round(cover * 16))); if (!lv) return; const k = color + lv; let c = tintCache.get(k); if (!c) { c = tinted(dithers()[lv], color); tintCache.set(k, c); } ctx.drawImage(c, 0, 0); }

  // ---------- text ----------
  LSE.FONTS = { prompt: '"LSE Prompt", "Prompt", "Noto Sans Thai", sans-serif', kanit: '"LSE Kanit", "Kanit", "Noto Sans Thai", sans-serif', sarabun: '"LSE Sarabun", "Sarabun", "Noto Sans Thai Looped", sans-serif' };
  LSE.FONT = LSE.FONTS.prompt;
  function textBitmap(text, size, fill, opts) {
    opts = opts || {};
    const fam = LSE.FONTS[opts.font] || LSE.FONT; const wt = opts.font === 'kanit' ? 600 : 700;
    const key = [text, size, fill, opts.outline, fam].join('|');
    textBitmap.cache = textBitmap.cache || new Map();
    if (textBitmap.cache.has(key)) return textBitmap.cache.get(key);
    const { ctx: m } = LSE.canvas(4, 4); m.font = `${wt} ${size}px ${fam}`; const ls = Math.max(1, Math.round(size * 0.025)) + 'px'; try { m.letterSpacing = ls; } catch (e) { /* older browsers */ }
    const ow = Math.max(3, Math.round(size * 0.16)); const sh = Math.max(2, Math.round(size * 0.07));
    const w = Math.ceil(m.measureText(text).width) + ow * 2 + sh + 4; const h = Math.ceil(size * 1.75) + sh;
    const { c, ctx } = LSE.canvas(w, h);
    ctx.font = `${wt} ${size}px ${fam}`; try { ctx.letterSpacing = ls; } catch (e) { /* older browsers */ } ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const x = ow + 2, y = Math.round(h / 2 - sh / 2); const ol = opts.outline || '#0b0a12';
    // one hard drop shadow, then a thick round outline, then the fill: crisp and easy to read on any scene
    ctx.fillStyle = ol; ctx.strokeStyle = ol; ctx.lineWidth = ow * 2;
    ctx.strokeText(text, x, y + sh); ctx.fillText(text, x, y + sh);
    ctx.strokeText(text, x, y);
    // hard outer edge: the outline is fully opaque or absent, no soft fringe that turns to mush after video encoding
    const id = ctx.getImageData(0, 0, w, h); const d = id.data; const oc = LSE.hexToRgb(ol);
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] >= 110) { d[i] = oc[0]; d[i + 1] = oc[1]; d[i + 2] = oc[2]; d[i + 3] = 255; } else d[i + 3] = 0; }
    ctx.putImageData(id, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
    const res = { c, w, h, tw: w - (ow * 2 + sh + 4), pad: x };
    if (textBitmap.cache.size > 400) textBitmap.cache.clear();
    textBitmap.cache.set(key, res);
    return res;
  }
  LSE.textBitmap = textBitmap;

  // ---------- Renderer ----------
  // proj: {timeline, scenes:{id:built}, cast:{id:{kind, comp|sprite|bitmap, scale}}, palette, title, channel, captionColors, captionSize, titleOn}
  class Renderer {
    constructor(proj, opts) {
      const S = (opts && opts.scale) || 1; this.S = S; this.OW = 540 * S; this.OH = 960 * S; this.K = 2 * S;
      const { OW, OH } = this;
      this.p = proj; this.art = LSE.canvas(AW, AH); this.out = LSE.canvas(OW, OH);
      this.tmp = LSE.canvas(AW, AH); this.chan = [LSE.canvas(AW, AH), LSE.canvas(AW, AH), LSE.canvas(AW, AH)];
      this.capLayout = new Map();
      this.scan = this.makeScan();
    }
    makePanel() { const { OW, OH, K } = this; // dark band behind captions: solid core, Bayer-dithered edges so it still reads as pixel art
      const h = Math.round(OH * 0.12) + 16; const { c, ctx } = LSE.canvas(OW, h); const x0 = Math.round(OW * 0.12), x1 = Math.round(OW * 0.88);
      for (let y = 0; y < h; y += 2) for (let x = x0; x < x1; x += 2) {
        const e = Math.min(1, Math.min(y, h - y) / 12) * Math.min(1, Math.min(x - x0, x1 - x) / 24);
        const th = BAYER4[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] / 16;
        if (e >= 1 || e > th) { ctx.fillStyle = 'rgba(11,10,18,0.5)'; ctx.fillRect(x, y, 2, 2); }
      }
      return c;
    }
    makeScan() { const { OW, OH, K } = this; const { c, ctx } = LSE.canvas(OW, OH); ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < OH; y += 4) ctx.fillRect(0, y, OW, 2); return c; }
    get tl() { return this.p.timeline; }
    rowAt(t) { const sp = this.tl.span; for (let i = sp.length - 1; i >= 0; i--) if (t >= sp[i].t0 - 1e-9) return i; return 0; }
    activeFx(t, type) { for (const f of this.tl.fx) { if (f.type !== type) continue; let dt = t - f.t; if (dt < 0 && f.t + f.dur > this.tl.L) dt += this.tl.L; if (dt >= 0 && dt < f.dur) return { f, p: dt / f.dur }; } return null; }

    camInfo(t, row, ri) {
      const tl = this.tl, L = tl.L; const cam = row.camera || {}; const sp = tl.span[ri];
      let zoom = Math.max(1, Math.min(3, Math.round(cam.zoom || 2)));
      if (cam.punchT != null && t >= cam.punchT - 1e-6) zoom = Math.min(3, zoom + 1);
      if (this.activeFx(t, 'zoom')) zoom = Math.min(3, zoom + 1);
      let focusX = typeof cam.focus === 'number' ? cam.focus : 135;
      let lift = Number(cam.lift) || 0; // px above the ground line to frame (an actor high in the air)
      if (typeof cam.focus === 'string' && tl.tracks[cam.focus]) { const st = LSE.Timeline.trackAt(tl.tracks[cam.focus], t, L); if (st) { focusX = st.x; if (cam.lift == null && st.y < -20) lift = -st.y + 20; } }
      const prog = sp ? LSE.clamp((t - sp.t0) / Math.max(0.01, sp.t1 - sp.t0), 0, 1) : 0;
      if (cam.pan) focusX += Number(cam.pan) * (prog - 0.5);
      return { zoom, focusX: Math.round(focusX), lift: Math.round(lift) };
    }
    // colour grade + vignette per shot (mood) so scenes are not flat
    applyGrade(ctx, row) {
      const g = row.grade || ({ mysterious: 'night', tense: 'cold', epic: 'warm', sad: 'cold', triumphant: 'gold' })[row.music] || 'night';
      const tint = { warm: '#ff8a4c', gold: '#ffc14a', cold: '#3e8de0', night: '#2253a3', red: '#b52b35', green: '#2f9c86' }[g];
      if (tint) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = g === 'night' || g === 'cold' ? 0.2 : 0.3; ctx.fillStyle = tint; ctx.fillRect(0, 0, AW, AH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      if (!this.vignette) { const { c, ctx: v } = LSE.canvas(AW, AH); const id = v.createImageData(AW, AH);
        for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) { const dx = (x - AW / 2) / (AW / 2), dy = (y - AH * 0.45) / (AH * 0.62); const d = Math.sqrt(dx * dx + dy * dy); const a = LSE.clamp((d - 0.72) * 1.4, 0, 0.75); const q = Math.floor(a * 4 + BAYER4[(y & 3) * 4 + (x & 3)] / 16) / 4; if (q > 0) { const i = (y * AW + x) * 4; id.data[i] = 8; id.data[i + 1] = 6; id.data[i + 2] = 16; id.data[i + 3] = Math.round(q * 200); } }
        v.putImageData(id, 0, 0); this.vignette = c; }
      ctx.drawImage(this.vignette, 0, 0);
    }
    // world -> art canvas
    drawWorld(tW, ctx, tAbs) {
      const t = tAbs == null ? tW : tAbs; const tl = this.tl, L = tl.L, beat = tl.beat; const ri = this.rowAt(tW); const row = tl.rows[ri];
      const built = this.p.scenes[row.scene] || Object.values(this.p.scenes)[0];
      if (!built) { ctx.fillStyle = '#16141f'; ctx.fillRect(0, 0, AW, AH); return { zoom: 1, fx: 0, fy: 0 }; }
      const g = built.spec.ground.y; built.__row = ri;
      const drift = Math.sin(2 * Math.PI * t / LSE.Scene.period(12, L)) * 6;
      const { zoom, focusX, lift } = this.camInfo(tW, row, ri);
      const camX = Math.round(drift + (focusX - 135) * 0.15);
      ctx.clearRect(0, 0, AW, AH);
      LSE.Scene.drawLayer(ctx, built, 'sky', camX); LSE.Scene.drawAmbient(ctx, built, t, L, tl.bpm, 'sky', camX); LSE.Scene.drawLayer(ctx, built, 'far', camX); LSE.Scene.drawLayer(ctx, built, 'mid', camX);
      LSE.Scene.drawAmbient(ctx, built, t, L, tl.bpm, 'back', camX);
      LSE.Scene.drawLayer(ctx, built, 'ground', camX);
      // actors & props sorted by depth (y)
      const list = [];
      for (const id in tl.tracks) { const tr = tl.tracks[id]; const st = LSE.Timeline.trackAt(tr, tW, L); if (!st) continue; list.push({ id, tr, st }); }
      list.sort((a, b) => a.st.y - b.st.y || (a.tr.prop ? -1 : 1));
      // actors go to their own layer so lit background pixels (shop interiors, signs) can be kept off them later
      const act = this.actC || (this.actC = LSE.canvas(AW, AH)); act.ctx.clearRect(0, 0, AW, AH);
      for (const it of list) this.drawEntity(act.ctx, it, t, g, camX);
      ctx.drawImage(act.c, 0, 0);
      LSE.Scene.drawLayer(ctx, built, 'near', camX);
      LSE.Scene.drawAmbient(ctx, built, t, L, tl.bpm, 'front', camX);
      if (built.spec.reflect) this.reflect(ctx, built.spec.reflect, t);
      LSE.Scene.drawLight(ctx, built, t, tl.bpm, camX);
      const BG = ['far', 'mid', 'ground'];
      { const gc = this.glowC || (this.glowC = LSE.canvas(AW, AH)); const gx = gc.ctx; gx.globalCompositeOperation = 'source-over'; gx.clearRect(0, 0, AW, AH);
        if (LSE.Scene.hasGlow(built, BG)) LSE.Scene.drawGlow(gx, built, t, tl.bpm, camX, BG); LSE.Scene.drawAmbient(gx, built, t, L, tl.bpm, 'glow', camX);
        gx.globalCompositeOperation = 'destination-out'; gx.drawImage(act.c, 0, 0); gx.globalCompositeOperation = 'source-over'; ctx.drawImage(gc.c, 0, 0); }
      LSE.Scene.drawGlow(ctx, built, t, tl.bpm, camX, ['near']);
      this.applyGrade(ctx, row);
      const lf = this.activeFx(t, 'light'); if (lf && built.light) { ctx.globalAlpha = 0.5 * (1 - lf.p); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = built.light.L.color; ctx.fillRect(0, 0, AW, AH); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      return { zoom, focusX, g, lift };
    }
    // water: mirror the band above the waterline, rippled row by row (loop-safe), tinted with the water colour
    reflect(ctx, rf, t) {
      const y0 = Math.round(rf.y), h = Math.min(rf.h || 80, y0, AH - y0); if (h <= 0) return; const tmp = this.tmp.ctx; const P1 = LSE.Scene.period(rf.period || 3, this.tl.L);
      tmp.clearRect(0, 0, AW, AH); tmp.drawImage(this.art.c, 0, y0 - h, AW, h, 0, 0, AW, h);
      for (let k = 0; k < h; k++) { const dx = Math.round(Math.sin(k * 0.7 + 2 * Math.PI * t / P1) * (1 + k / h * 2)); const a = (rf.alpha || 0.45) * (1 - k / h * 0.7);
        if ((k & 1) && k > h * 0.5) continue; ctx.globalAlpha = a; ctx.drawImage(this.tmp.c, 0, h - 1 - k, AW, 1, dx, y0 + k, AW, 1); }
      ctx.globalAlpha = rf.tintAlpha || 0.28; ctx.fillStyle = rf.tint || '#183057'; ctx.fillRect(0, y0, AW, h); ctx.globalAlpha = 1;
      ctx.fillStyle = rf.edge || 'rgba(143,211,255,0.55)'; for (let x = LSE.tick(t, this.tl.beat / 2) % 7; x < AW; x += 7) ctx.fillRect(x, y0, 3, 1);
    }
    // a soft breathing glow + orbiting sparkles behind a character (the hero's golden wings, the angel); loop-safe (beat cycles)
    aura(ctx, au, x, y, s, t) {
      const beat = this.tl.beat; const r = (au.r || 26) * s; const k = 0.75 + 0.25 * Math.sin(2 * Math.PI * t / (beat * 2));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); const c = au.color || '#ffe66b';
      g.addColorStop(0, LSE.rgba(c, (au.alpha || 0.45) * k)); g.addColorStop(0.55, LSE.rgba(c, (au.alpha || 0.45) * 0.35 * k)); g.addColorStop(1, LSE.rgba(c, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      const n = au.sparks ?? 6; const ph = LSE.tick(t, beat / 4) % 16;
      for (let i = 0; i < n; i++) { const a = (i / n + ph / 16) * Math.PI * 2; const rr = r * (0.55 + 0.25 * ((i * 7 + ph) % 4) / 3); const px = Math.round(x + Math.cos(a) * rr), py = Math.round(y + Math.sin(a) * rr * 0.8);
        ctx.fillStyle = (i + ph) % 3 ? (au.spark || '#fff6c2') : '#ffffff'; ctx.fillRect(px, py, 1, 1); if ((i + ph) % 4 === 0) { ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3); } }
    }
    drawEntity(ctx, it, t, g, camX) {
      const tl = this.tl; const c = this.p.cast[it.id]; if (!c) return;
      const { st } = it; const beat = tl.beat; const x = Math.round(st.x - camX * 0.2); const tw = ((t % tl.L) + tl.L) % tl.L;
      if (c.kind === 'char' && c.comp) {
        const a = LSE.Timeline.actAt(it.tr, tw, tl.L, beat);
        const an = c.comp.anims[a.anim] || c.comp.anims.idle || c.comp.anims.walk; if (!an) return;
        const dir = LSE.LPC.dirRow(st.dir); const fi = Math.min(an.n - 1, a.frame);
        const s = Math.max(1, Math.round(st.scale * (c.scale || 1)));
        const bob = a.fly ? Math.round(Math.sin(2 * Math.PI * t / beat) * 2) - 14 : 0;
        const fy = g + st.y + bob;
        if (!a.fly) { ctx.fillStyle = 'rgba(8,6,16,0.45)'; ctx.fillRect(x - 8 * s, fy - 1, 16 * s, 2); ctx.fillRect(x - 6 * s, fy - 2, 12 * s, 1); }
        if (c.aura && (!c.aura.rows || c.aura.rows.includes(st.row))) this.aura(ctx, c.aura, x, fy - (c.aura.y ?? 30) * s, s, t);
        ctx.drawImage(an.canvas, fi * an.fs, dir * an.fs, an.fs, an.fs, x - (an.fs / 2) * s, fy - (an.off + 62) * s, an.fs * s, an.fs * s);
      } else if (c.bitmap || c.frames) {
        let bm = c.bitmap; const s = Math.max(1, Math.round(st.scale * (c.scale || 1)));
        if (c.frames) { const a = LSE.Timeline.actAt(it.tr, tw, tl.L, beat); const set = (a.anim !== 'idle' && a.anim !== 'walk' && c.frames.action && c.frames.action.length) ? c.frames.action : c.frames.idle; bm = set[LSE.tick(tw, beat / 2) % set.length] || set[0]; }
        if (!bm) return;
        let y = g + st.y; let pop = 0; const ap = tl.appear && tl.appear[it.id]; if (ap) for (const ta of ap) { const d = tw - ta; if (d >= 0 && d < 0.3) pop = 1 - d / 0.3; } y -= Math.round(pop * 8); let flip = c.facing ? (c.facing === 'e' ? st.dir === 'w' : st.dir === 'e') : false; let alpha = 1;
        const m = st.motion;
        if (m === 'float') y += Math.round(Math.sin(2 * Math.PI * t / (beat * 4)) * 3) - 6;
        if (m === 'flicker') alpha = LSE.tick(t, beat / 4) % 4 === 0 ? 0.6 : 1;
        if (m === 'spin' && LSE.tick(t, beat / 2) % 4 === 2) flip = !flip;
        ctx.globalAlpha = alpha;
        const w = bm.width * s, h = bm.height * s;
        if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(bm, -w / 2, y - h, w, h); ctx.restore(); }
        else ctx.drawImage(bm, x - w / 2, y - h, w, h);
        ctx.globalAlpha = 1;
        if (pop > 0.4) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pop * 0.7; ctx.drawImage(bm, Math.round(x - w / 2), y - h, w, h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        if (m === 'glint' || m === 'pulse') { const ph = LSE.frac(t, beat * 2); if (ph < 0.25) { const gx = x - w / 4 + Math.round(ph * 4 * w / 2), gy = y - h + 3; ctx.fillStyle = '#ffffff'; ctx.fillRect(gx, gy - 2, 1, 5); ctx.fillRect(gx - 2, gy, 5, 1); } }
      }
    }

    // full frame -> this.out (540x960)
    frame(t) { const { OW, OH, K } = this;
      const tl = this.tl; t = ((t % tl.L) + tl.L) % tl.L;
      const art = this.art.ctx; const info = this.drawWorld(t, art);
      this.applyTransitions(t, art);
      this.applyArtFx(t, art);
      const o = this.out.ctx; o.imageSmoothingEnabled = false;
      o.fillStyle = '#0b0a12'; o.fillRect(0, 0, OW, OH);
      // camera crop (integer zoom), shake
      const z = info.zoom; const sw = AW / z, sh = AH / z;
      let sx = LSE.clamp(Math.round((info.focusX || 135) - sw / 2), 0, AW - sw), sy = Math.round((info.g || 274) - (info.lift || 0) - 0.57 * AH / z);
      sy = LSE.clamp(sy, 0, AH - sh);
      this.camState = { sx, sy, sw, sh, camX: Math.round(Math.sin(2 * Math.PI * t / LSE.Scene.period(12, tl.L)) * 6 + ((info.focusX || 135) - 135) * 0.15), g: info.g };
      const shk = this.activeFx(t, 'shake') || this.activeFx(t, 'crack');
      let ox = 0, oy = 0; if (shk) { const r = LSE.rng(Math.floor(t * 30) + 3); ox = Math.round((r() - 0.5) * 6) * K; oy = Math.round((r() - 0.5) * 4) * K; }
      const glitch = this.activeFx(t, 'glitch') || this.activeFx(t, 'rgb') || this.activeFx(t, 'shatter') || this.transGlitch(t);
      if (glitch) this.rgbSplit(o, sx, sy, sw, sh, ox, oy, t, glitch);
      else o.drawImage(this.art.c, sx, sy, sw, sh, ox, oy, OW, OH);
      if (this.activeFx(t, 'scan') || (glitch && glitch.p < 0.7)) o.drawImage(this.scan, 0, 0);
      this.drawOverlayText(o, t);
      const fl = this.activeFx(t, 'flash'); if (fl) { o.globalAlpha = 0.75 * (1 - fl.p); o.fillStyle = '#ffffff'; o.fillRect(0, 0, OW, OH); o.globalAlpha = 1; }
      const dk = this.activeFx(t, 'dark'); if (dk) { o.globalAlpha = 0.5 * Math.sin(Math.PI * dk.p); o.fillStyle = '#0b0a12'; o.fillRect(0, 0, OW, OH); o.globalAlpha = 1; }
      return this.out.c;
    }
    transGlitch(t) { for (const tr of this.tl.trans) if (tr.type === 'glitchwipe' || tr.type === 'pixeldissolve' || tr.type === 'pixelshatter') { const p = (t - (tr.t - 0.45)) / 0.9; if (p >= 0 && p <= 1 && tr.type !== 'pixeldissolve') return { p }; } return null; }
    rgbSplit(o, sx, sy, sw, sh, ox, oy, t, g) { const { OW, OH, K } = this;
      const r = LSE.rng(Math.floor(t * 30) * 7 + 1); const dx = (1 + Math.round(r() * 2)) * K;
      const cols = ['#ff0000', '#00ff00', '#0000ff'];
      this.chan.forEach((ch, i) => { const c = ch.ctx; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, AW, AH); c.drawImage(this.art.c, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = cols[i]; c.fillRect(0, 0, AW, AH); c.globalCompositeOperation = 'destination-in'; c.drawImage(this.art.c, 0, 0); });
      o.fillStyle = '#000'; o.fillRect(0, 0, OW, OH); o.globalCompositeOperation = 'lighter';
      o.drawImage(this.chan[0].c, sx, sy, sw, sh, ox - dx, oy, OW, OH);
      o.drawImage(this.chan[1].c, sx, sy, sw, sh, ox, oy, OW, OH);
      o.drawImage(this.chan[2].c, sx, sy, sw, sh, ox + dx, oy, OW, OH);
      o.globalCompositeOperation = 'source-over';
      // displaced slices
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) { const y = Math.floor(r() * OH / 8) * 8, h = (2 + Math.floor(r() * 6)) * 8, s = Math.round((r() - 0.5) * 16) * K; o.drawImage(o.canvas, 0, y, OW, h, s, y, OW, h); }
    }
    applyArtFx(t, ctx) {
      const sf = this.activeFx(t, 'shatter'); if (sf) this.shatterArt(ctx, Math.sin(Math.PI * sf.p) * 0.7, Math.round(sf.f.t * 1000) + Math.floor(t * 15));
      const cr = this.activeFx(t, 'crack');
      if (cr) { const r = LSE.rng(Math.round(cr.f.t * 100)); ctx.fillStyle = '#f2efe6'; const n = 6, len = 40 + cr.p * 160; for (let k = 0; k < n; k++) { let x = 135, y = 200; const a = (k / n) * Math.PI * 2 + r(); for (let s = 0; s < len; s += 2) { x += Math.cos(a + (r() - 0.5) * 1.2) * 2; y += Math.sin(a + (r() - 0.5) * 1.2) * 2; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); } } }
    }
    // the frame breaks into pixel blocks that jump apart (k 0..1), stepped at 15 fps like a crashing game
    shatterArt(ctx, k, seed) {
      if (k <= 0.02) return; const c = this.shC || (this.shC = LSE.canvas(AW, AH)); c.ctx.clearRect(0, 0, AW, AH); c.ctx.drawImage(ctx.canvas, 0, 0);
      ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, AW, AH); const R = LSE.rng(seed); const B = 9;
      for (let y = 0; y < AH; y += B) for (let x = 0; x < AW; x += B) { const r1 = R(), r2 = R(), r3 = R(); if (r3 < k * 0.32) continue;
        const dx = Math.round((r1 - 0.5) * k * 30 + (x - 135) / 135 * k * 16), dy = Math.round((r2 - 0.5) * k * 20 + k * k * r2 * 26); ctx.drawImage(c.c, x, y, B, B, x + dx, y + dy, B, B); }
      ctx.globalCompositeOperation = 'lighter'; for (let n = 0; n < 40 * k; n++) { ctx.globalAlpha = 0.45; ctx.fillStyle = R() < 0.5 ? '#ff4fa3' : '#4ff0ff'; ctx.fillRect(Math.floor(R() * 30) * B, Math.floor(R() * 54) * B, B * (1 + Math.floor(R() * 3)), B); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    applyTransitions(t, ctx) {
      for (const tr of this.tl.trans) {
        const p = (t - (tr.t - 0.45)) / 0.9; if (p < 0 || p > 1) continue;
        const cover = 1 - Math.abs(2 * p - 1); const r = LSE.rng(Math.round(tr.t * 1000) + Math.floor(t * 30));
        switch (tr.type) {
          case 'pixeldissolve': ditherFill(ctx, cover, '#0b0a12'); break;
          case 'stonecrack': { ditherFill(ctx, cover, '#545577'); ctx.fillStyle = '#16141f'; for (let k = 0; k < 8 * cover; k++) { let x = r() * AW, y = r() * AH; for (let s = 0; s < 40; s++) { x += (r() - 0.5) * 4; y += 2; ctx.fillRect(x | 0, y | 0, 1, 1); } } break; }
          case 'blooddrip': { const R = LSE.rng(Math.round(tr.t * 1000)); ctx.fillStyle = '#7d1c2b'; for (let x = 0; x < AW; x += 3) { const len = (0.4 + R() * 0.8) * cover * AH * 1.2; ctx.fillRect(x, 0, 3, Math.round(len)); ctx.fillStyle = '#b52b35'; ctx.fillRect(x + 1, 0, 1, Math.round(len * 0.9)); ctx.fillStyle = '#7d1c2b'; } break; }
          case 'batswarm': { const R = LSE.rng(Math.round(tr.t * 1000)); ctx.fillStyle = '#0b0a12'; const n = Math.round(260 * cover); for (let k = 0; k < n; k++) { const bx = (R() * AW * 1.6 - AW * 0.3 + p * AW * 0.6) | 0, by = (R() * AH) | 0; const f = (Math.floor(t * 20) + k) % 2; ctx.fillRect(bx - 1, by, 4, 3); ctx.fillRect(bx - 5, by + (f ? -1 : 2), 4, 1); ctx.fillRect(bx + 3, by + (f ? -1 : 2), 4, 1); } ditherFill(ctx, Math.max(0, cover - 0.3), '#0b0a12'); break; }
          case 'lightning': { if (p > 0.35 && p < 0.65) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, AW, AH); } ctx.fillStyle = '#ffffff'; if (p > 0.3 && p < 0.6) { let x = 80 + r() * 110, y = 0; while (y < 330) { const nx = x + (r() - 0.5) * 30, ny = y + 12 + r() * 14; LSE.Scene.painter(ctx).line(x, y, nx, ny, '#ffe66b'); x = nx; y = ny; } } ditherFill(ctx, cover * 0.4, '#2f2a47'); break; }
          case 'sandstorm': { ditherFill(ctx, cover * 0.85, '#d9a35b'); ctx.fillStyle = '#f2d38a'; for (let k = 0; k < 300 * cover; k++) ctx.fillRect((r() * AW) | 0, (r() * AH) | 0, 4, 1); break; }
          case 'fireburst': { ctx.fillStyle = '#ff8a4c'; LSE.Scene.painter(ctx).circle(135, 220, Math.round(cover * 320), cover > 0.5 ? '#ffc14a' : '#e0533f'); break; }
          case 'waterripple': { ditherFill(ctx, cover, '#2253a3'); ctx.fillStyle = '#8fd3ff'; for (let y = 0; y < AH; y += 10) for (let x = (y * 3 + Math.floor(t * 60)) % 20; x < AW; x += 20) ctx.fillRect(x, y, 8, 1); break; }
          case 'goldflash': { ditherFill(ctx, cover * 0.9, '#ffc14a'); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 60 * cover; k++) { const x = (r() * AW) | 0, y = (r() * AH) | 0; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } break; }
          case 'glitchwipe': ditherFill(ctx, cover * 0.5, '#0b0a12'); break;
          case 'pixelshatter': this.shatterArt(ctx, cover, Math.round(tr.t * 1000) + Math.floor(t * 15)); break;
        }
      }
    }

    // ---------- captions / title / CTA / watermark ----------
    capLayoutFor(cap) {
      if (this.capLayout.has(cap)) return this.capLayout.get(cap);
      const { OW, S } = this; const P = this.p;
      const size0 = Math.round((P.captionSize || 38) * S); const panelW = OW * 0.70; const colors = P.captionColors || {}; const font = P.captionFont;
      const gap = (sz) => sz * 0.32; const jgap = (sz) => Math.round(sz * 0.1);
      let size = size0, lines;
      for (; size >= 18 * S; size -= 2) {
        lines = [[], []];
        for (const sg of cap.segs) lines[sg.line].push(sg);
        let ok = true;
        for (const ln of lines) { const w = ln.reduce((a, sg, i) => a + textBitmap(sg.text, size, '#fff', { font }).tw + (i ? (sg.join ? jgap(size) : gap(size)) : 0), 0); if (w > panelW) ok = false; }
        if (ok) break;
      }
      const res = { size, gap: gap(size), jgap: jgap(size), lines: lines.filter((l) => l.length).map((ln) => { const items = ln.map((sg) => ({ sg, bm: textBitmap(sg.text, size, sg.key ? (colors.key || '#ffe66b') : (colors.text || '#ffffff'), { outline: colors.outline, font }) })); const w = items.reduce((a, it, i) => a + it.bm.tw + (i ? (it.sg.join ? jgap(size) : gap(size)) : 0), 0); return { items, w }; }) };
      this.capLayout.set(cap, res); return res;
    }
    // name tags over heads, info cards, close-up insets: they make the picture say what the voice says
    drawStoryOverlays(o, t) {
      const { OW, OH, S } = this; const tl = this.tl; const P = this.p; const cs = this.camState; const font = P.captionFont; const CX = OW / 2;
      const ease = (d, dur) => LSE.clamp(d / dur, 0, 1);
      const plate = (x, y, w, h, fill, border, u) => { o.fillStyle = '#0b0a12'; o.fillRect(x - u, y - u, w + 2 * u, h + 2 * u); o.fillStyle = border; o.fillRect(x, y, w, h); o.fillStyle = fill; o.fillRect(x + u, y + u, w - 2 * u, h - 2 * u); o.fillStyle = 'rgba(0,0,0,0.25)'; o.fillRect(x + u, y + h - 2 * u, w - 2 * u, u); };
      // insets (newspaper front page / prop close-up)
      for (const ins of tl.insets || []) {
        if (t < ins.t0 || t >= ins.t1) continue; const d = t - ins.t0; const u = 3 * S;
        const drop = d < 0.12 ? Math.round((1 - d / 0.12) * 60 * S) : 0; const jolt = d >= 0.12 && d < 0.2 ? 4 * S : 0;
        const w = Math.round(OW * 0.7), x = Math.round(CX - w / 2);
        if (ins.kind === 'newspaper') {
          const h = Math.round(OH * 0.25), y = Math.round(OH * 0.25) - drop + jolt;
          plate(x, y, w, h, '#f2efe6', '#b8a98f', u);
          const mast = textBitmap(ins.masthead || 'หนังสือพิมพ์รายวัน', Math.round(20 * S), '#16141f', { outline: '#f2efe6', font });
          o.drawImage(mast.c, Math.round(CX - mast.pad - mast.tw / 2), y + 6 * u);
          o.fillStyle = '#16141f'; o.fillRect(x + 6 * u, y + 6 * u + mast.h, w - 12 * u, u); o.fillRect(x + 6 * u, y + 7 * u + mast.h + u, w - 12 * u, Math.max(1, S));
          const hb = textBitmap(ins.headline || '', Math.round(46 * S), '#b52b35', { outline: '#16141f', font }); const sc = Math.min(1, (w - 16 * u) / hb.tw);
          o.drawImage(hb.c, Math.round(CX - (hb.pad + hb.tw / 2) * sc), Math.round(y + h * 0.5 - hb.h * sc / 2), Math.round(hb.w * sc), Math.round(hb.h * sc));
          if (ins.sub) { const sb = textBitmap(ins.sub, Math.round(20 * S), '#3d3a5c', { outline: '#f2efe6', font }); o.drawImage(sb.c, Math.round(CX - sb.pad - sb.tw / 2), Math.round(y + h - 12 * u - sb.h / 2)); }
          o.fillStyle = '#b3b9d1'; for (let k = 0; k < 3; k++) { const cx0 = x + 8 * u + k * (w - 16 * u) / 3; for (let r = 0; r < 3; r++) o.fillRect(Math.round(cx0), Math.round(y + h - 8 * u + r * 2 * u), Math.round((w - 16 * u) / 3 - 4 * u), u); }
        } else if (ins.prop && this.p.cast[ins.prop] && (this.p.cast[ins.prop].bitmap || this.p.cast[ins.prop].frames)) {
          const c = this.p.cast[ins.prop]; const bm = c.bitmap || c.frames.idle[0];
          const k = Math.max(2, Math.floor(Math.min((w * 0.6) / bm.width, (OH * 0.2) / bm.height))); const h = bm.height * k + 24 * u; const y = Math.round(OH * 0.24) - drop + jolt;
          plate(x, y, w, h, '#16141f', '#ffc14a', u);
          o.drawImage(bm, Math.round(CX - bm.width * k / 2), y + 8 * u, bm.width * k, bm.height * k);
          if (ins.caption) { const cb = textBitmap(ins.caption, Math.round(26 * S), '#ffe66b', { font }); o.drawImage(cb.c, Math.round(CX - cb.pad - cb.tw / 2), Math.round(y + h - 8 * u - cb.h / 2)); }
        }
      }
      // info card (dates, numbers, places) under the title
      let cardBottom = 0; const insetOn = (tl.insets || []).some((ins) => t >= ins.t0 && t < ins.t1);
      const hudBottom = tl.hud ? this.drawHud(o, t, plate, font) : 0; cardBottom = hudBottom; this.hudBottom = hudBottom;
      for (const cd of tl.cards || []) {
        if (t < cd.t0 || t >= cd.t1) continue; const d = t - cd.t0; const u = 3 * S;
        const bm = textBitmap(cd.text, Math.round(44 * S), '#ffe66b', { outline: '#0b0a12', font });
        const w = bm.tw + 24 * u, h = bm.h + 6 * u, x = Math.round(CX - w / 2), y = Math.round(hudBottom ? hudBottom + 10 * S : OH * 0.215) - (d < 0.1 ? Math.round((1 - d / 0.1) * 20 * S) : 0);
        plate(x, y, w, h, '#231f33', '#ffc14a', u); cardBottom = Math.max(cardBottom, y + h);
        o.drawImage(bm.c, Math.round(CX - bm.pad - bm.tw / 2), Math.round(y + h / 2 - bm.h / 2));
      }
      // name tags that follow the character's head
      if (cs && !insetOn) for (const lb of tl.labels || []) {
        if (t < lb.t0 || t >= lb.t1 || !lb.actor) continue; if ((tl.bams || []).some((b) => b.actor === lb.actor && t >= b.t - 0.05 && t < b.t1 + 0.4)) continue; const tr = tl.tracks[lb.actor]; if (!tr) continue;
        const st = LSE.Timeline.trackAt(tr, t, tl.L); if (!st) continue; const c = this.p.cast[lb.actor]; const sc = Math.max(1, Math.round(st.scale * ((c && c.scale) || 1)));
        const ax = st.x - cs.camX * 0.2, ay = cs.g + st.y - 50 * sc;
        const kx = OW / cs.sw, ky = OH / cs.sh; let px = (ax - cs.sx) * kx, py = (ay - cs.sy) * ky;
        const u = 2 * S; let bm = textBitmap(lb.text, Math.round(27 * S), '#ffffff', { outline: '#0b0a12', font });
        if (bm.tw + 14 * u > OW * 0.78) bm = textBitmap(lb.text, Math.floor(27 * S * (OW * 0.78 - 14 * u) / bm.tw), '#ffffff', { outline: '#0b0a12', font }); // long tags shrink instead of clipping
        const w = bm.tw + 14 * u, h = bm.h - 2 * u; px = LSE.clamp(px, OW * 0.05 + w / 2, OW * 0.85 - w / 2); py = Math.max(OH * 0.22 + h, cardBottom + 6 * u + h, py - 6 * u);
        const d = t - lb.t0; const hop = d < 0.12 ? Math.round((1 - d / 0.12) * 10 * S) : 0;
        const x = Math.round(px - w / 2), y = Math.round(py - h) - hop;
        plate(x, y, w, h, '#16141f', '#ffc14a', u);
        o.fillStyle = '#ffc14a'; o.fillRect(Math.round(px - 2 * u), y + h + u, 4 * u, u); o.fillRect(Math.round(px - u), y + h + 2 * u, 2 * u, u);
        o.drawImage(bm.c, Math.round(px - bm.pad - bm.tw / 2), Math.round(y + h / 2 - bm.h / 2));
      }
    }
    // story clock: day plate with 7 pips + money plate (coin, counting number, shake/flash and a floating delta on change)
    drawHud(o, t, plate, font) {
      const { OW, OH, S } = this; const H = this.tl.hud; const st = H.steps; let k = st.length - 1; for (let i = 0; i < st.length; i++) if (st[i].t <= t + 1e-6) k = i;
      const cur = st[k]; const dt = ((t - cur.t) % this.tl.L + this.tl.L) % this.tl.L; const prev = k > 0 ? st[k - 1] : st[st.length - 1];
      if (cur.off) return 0; // counter hidden on this stretch (e.g. a timer that only starts later)
      const y = Math.round(OH * 0.198), u = 2 * S, gap = 12 * S;
      const dayTxt = `${H.label} ${cur.day}/${H.days}`; const dayBm = textBitmap(dayTxt, Math.round(25 * S), '#ffffff', { outline: '#0b0a12', font });
      const cnt = cur.d && dt < 0.4 ? Math.round(prev.money + (cur.money - prev.money) * (dt / 0.4)) : cur.money;
      const down = cur.d < 0 && dt < 0.6, up = cur.d > 0 && dt < 0.6;
      const low = (H.icon === 'o2' || H.icon === 'heart') && cnt <= 25; // the air is running out: the bubble turns red and the number blinks
      const monCol = down ? (LSE.tick(dt, 0.08) % 2 ? '#ff6b5a' : '#ffffff') : up ? '#6fd6b0' : low ? (LSE.tick(t, this.tl.beat / 2) % 2 ? '#ff6b5a' : '#ffe66b') : '#ffe66b';
      const monBm = textBitmap(`${H.unit}${cnt}${H.suffix || ''}`, Math.round(34 * S), monCol, { outline: '#0b0a12', font });
      const noDays = !H.days; // a plain counter (a timer) without the day plate
      const dw = noDays ? -gap : dayBm.tw + 16 * u, mw = monBm.tw + 30 * u, ph = Math.round(Math.max(dayBm.h, monBm.h) * 0.78);
      const x0 = Math.round(OW / 2 - (dw + gap + mw) / 2); const dayPop = cur.dd && dt < 0.25 ? Math.round((1 - dt / 0.25) * 8 * S) : 0;
      if (!noDays) {
      plate(x0, y - dayPop, dw, ph, '#16141f', '#7a7fa3', u);
      o.drawImage(dayBm.c, Math.round(x0 + dw / 2 - dayBm.pad - dayBm.tw / 2), Math.round(y - dayPop + ph * 0.42 - dayBm.h / 2));
      const pip = 4 * u, pg = 2 * u, pw = H.days * pip + (H.days - 1) * pg; let px = Math.round(x0 + dw / 2 - pw / 2); const py = y - dayPop + ph - pip - 3 * u;
      for (let d = 1; d <= H.days; d++) { o.fillStyle = d < cur.day ? '#ffc14a' : d === cur.day ? (LSE.tick(t, this.tl.beat) % 2 ? '#ffffff' : '#ffe66b') : '#3d3a5c'; o.fillRect(px, py, pip, pip); px += pip + pg; }
      }
      const shake = down ? Math.round(Math.sin(dt * 60) * 4 * S * (1 - dt / 0.6)) : 0; const mx = x0 + dw + gap + shake;
      plate(mx, y, mw, ph, '#16141f', down ? '#e0533f' : up ? '#2f9c86' : '#ffc14a', u);
      const cu = 2 * S, cx = mx + 8 * u, cy = Math.round(y + ph / 2); // pixel coin
      // counter icon: a coin (money) or an oxygen bubble (air left)
      const ICONS = { coin: [['..oooo..', '.oyyyyo.', 'oyywwyyo', 'oyywyyyo', 'oyyyyyYo', 'oyyyyYYo', '.oYYYYo.', '..oooo..'], { o: '#0b0a12', y: '#ffc14a', Y: '#d9a35b', w: '#fff6c2' }],
        o2: [['..oooo..', '.obbbbo.', 'obwwbbbo', 'obwbbbBo', 'obbbbbBo', 'obbbbBBo', '.oBBBBo.', '..oooo..'], { o: '#0b0a12', b: low ? '#ff8a4c' : '#8fd3ff', B: low ? '#e0533f' : '#3e8de0', w: '#ffffff' }],
        heart: [['.oo..oo.', 'orroorro', 'orwrrrro', 'orrrrrro', '.orrrro.', '..orro..', '...oo...', '........'], { o: '#0b0a12', r: low ? '#ff8a4c' : '#e0533f', w: '#fff6c2' }],
        floor: [['..oooo..', '.obbbbo.', '.obwbwo.', '.obbbbo.', '.obwbwo.', '.obbbbo.', '.obbdbo.', 'oooooooo'], { o: '#0b0a12', b: '#7a7fa3', w: '#ffe66b', d: '#3d3a5c' }],
        clock: [['...oo...', '..oooo..', '.owwwwo.', 'owwrwwwo', 'owwrrwwo', 'owwwwwwo', '.owwwwo.', '..oooo..'], { o: '#0b0a12', w: '#f2efe6', r: '#e0533f' }] };
      const [coin, cpal] = ICONS[H.icon] || ICONS.coin;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const ch = coin[r][c]; if (ch === '.') continue; o.fillStyle = cpal[ch]; o.fillRect(cx + c * cu * 1.5 - 6 * cu, cy + r * cu * 1.5 - 6 * cu, Math.ceil(cu * 1.5), Math.ceil(cu * 1.5)); }
      o.drawImage(monBm.c, Math.round(mx + 17 * u + (mw - 17 * u) / 2 - monBm.pad - monBm.tw / 2), Math.round(y + ph / 2 - monBm.h / 2));
      if (cur.d && dt < 1.1) { const p = dt / 1.1; const dBm = textBitmap((cur.d > 0 ? '+' : '') + cur.d, Math.round(30 * S), cur.d > 0 ? '#6fd6b0' : '#ff6b5a', { outline: '#0b0a12', font });
        o.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3; o.drawImage(dBm.c, Math.round(mx + mw - dBm.w * 0.6), Math.round(y + ph - p * 46 * S)); o.globalAlpha = 1; }
      return y + ph + u;
    }
    // screen position of an actor's head (follows camera and zoom)
    headAt(id, t) { const cs = this.camState, tl = this.tl; if (!cs) return null; const tr = tl.tracks[id]; if (!tr) return null; const st = LSE.Timeline.trackAt(tr, t, tl.L); if (!st) return null;
      const c = this.p.cast[id]; const sc = Math.max(1, Math.round(st.scale * ((c && c.scale) || 1))); const ax = st.x - cs.camX * 0.2, ay = cs.g + st.y - 50 * sc;
      return { x: (ax - cs.sx) * (this.OW / cs.sw), y: (ay - cs.sy) * (this.OH / cs.sh), k: this.OW / cs.sw }; }
    // comedy overlays: dizzy stars circling a head, comic burst word with a pop
    drawComic(o, t) {
      const { S } = this; const tl = this.tl; const font = this.p.captionFont;
      for (const dz of tl.dizzy || []) { if (t < dz.t0 || t >= dz.t1) continue; const hp = this.headAt(dz.actor, t); if (!hp) continue; const u = Math.max(2, Math.round(hp.k * 0.6));
        for (let k = 0; k < 3; k++) { const a = (t - dz.t0) * 9 + k * 2.094; const x = Math.round(hp.x + Math.cos(a) * hp.k * 8), y = Math.round(hp.y + hp.k * 3 + Math.sin(a) * hp.k * 2.2);
          o.fillStyle = '#0b0a12'; o.fillRect(x - 3 * u, y - u, 7 * u, 3 * u); o.fillRect(x - u, y - 3 * u, 3 * u, 7 * u); o.fillStyle = k === 1 ? '#ffffff' : '#ffe66b'; o.fillRect(x - 2 * u, y, 5 * u, u); o.fillRect(x, y - 2 * u, u, 5 * u); o.fillRect(x - u, y - u, 3 * u, 3 * u); } }
      for (const bm of tl.bams || []) { const t0 = bm.t; if (t < t0 || t >= bm.t1) continue; const d = t - t0; const hp = bm.actor ? this.headAt(bm.actor, t) : null;
        const cx = hp ? LSE.clamp(hp.x + 70 * S, this.OW * 0.24, this.OW * 0.8) : this.OW / 2, cy = hp ? Math.max((this.hudBottom || this.OH * 0.24) + 90 * S, hp.y + 10 * S) : this.OH * 0.42; const k = d < 0.06 ? 0.4 + d / 0.06 * 0.9 : d < 0.14 ? 1.3 - (d - 0.06) / 0.08 * 0.3 : 1; const R = 60 * S * k;
        const fade = Math.max(0, Math.min(1, (bm.t1 - t) / 0.15)); o.globalAlpha = fade; o.save(); o.translate(Math.round(cx + (d < 0.2 ? Math.sin(d * 90) * 4 * S : 0)), Math.round(cy)); o.rotate(-0.14);
        const star = (r0, r1, col) => { o.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? r1 : r0 * (i % 4 === 0 ? 1.08 : 0.94); o.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r); } o.closePath(); o.fillStyle = col; o.fill(); };
        star(R + 8 * S, (R + 8 * S) * 0.68, '#0b0a12'); star(R, R * 0.66, '#ffe66b'); star(R * 0.74, R * 0.5, '#ff8a4c');
        const tb = textBitmap(bm.text, Math.round(38 * S * Math.min(1, k)), '#ffffff', { outline: '#b52b35', font }); o.drawImage(tb.c, Math.round(-tb.pad - tb.tw / 2), Math.round(-tb.h / 2));
        o.restore(); o.globalAlpha = 1; }
    }
    drawOverlayText(o, t) {
      const { OW, OH, S } = this; const tl = this.tl; const beat = tl.beat; const P = this.p; const CX = OW / 2;
      // title 13-20%, centred
      if (P.titleOn !== false && (P.title || tl.title)) {
        const bm = textBitmap(P.title || tl.title, Math.round(48 * S), P.captionColors?.title || '#ffe66b', { outline: P.captionColors?.outline, font: P.captionFont });
        const s = Math.min(1, (OW * 0.70) / bm.tw);
        o.drawImage(bm.c, Math.round(CX - (bm.pad + bm.tw / 2) * s), Math.round(OH * 0.165 - bm.h * s / 2), Math.round(bm.w * s), Math.round(bm.h * s));
      }
      this.drawStoryOverlays(o, t); this.drawComic(o, t);
      // caption panel 62-74%, every line centred on the frame
      const cap = tl.caps.find((c) => t >= c.t0 && t < c.t1) || tl.caps[0];
      if (cap) {
        const lay = this.capLayoutFor(cap); const y0 = OH * 0.62, y1 = OH * 0.74;
        if (!this.panel) this.panel = this.makePanel();
        if (cap.segs.some((g) => t >= g.t - 1e-6)) o.drawImage(this.panel, 0, Math.round(y0 - 8 * S));
        const lh = lay.size * 1.5; const total = lay.lines.length * lh; let y = (y0 + y1) / 2 - total / 2 + lh / 2;
        // on the CTA row the button sits inside the band, left of the text (space reserved for the whole row so nothing jumps)
        const cta = tl.cta; const ctaRow = cta && cap.row === cta.row; const cu = 3 * S, bw = 24 * cu, bgap = 14 * S;
        const maxW = Math.max(...lay.lines.map((l) => l.w)); const textCX = ctaRow ? CX + (bw + bgap) / 2 : CX;
        for (const ln of lay.lines) {
          let x = textCX - ln.w / 2;
          ln.items.forEach((it, i) => {
            if (i) x += it.sg.join ? lay.jgap : lay.gap;
            const on = t >= it.sg.t - 1e-6;
            if (on) {
              const dt = t - it.sg.t; const hop = cap.row === 0 && t < 0.01 ? 0 : (dt < beat / 8 ? 6 : dt < beat / 4 ? 3 : 0) * S;
              o.drawImage(it.bm.c, Math.round(x - it.bm.pad), Math.round(y - it.bm.h / 2 - hop));
            }
            x += it.bm.tw;
          });
          y += lh;
        }
        // CTA button pops above the caption as the word is spoken ("วิ๊ง"), then gets tapped on the next beat
        if (ctaRow && t >= cta.t) LSE.CTA.draw(o, cta.type, t - cta.t, beat, Math.round(textCX - maxW / 2 - bgap - bw / 2), Math.round((y0 + y1) / 2 + 11 * cu), cu);
      }
      // watermark (faint, drifting, never in the right 15%)
      const wm = P.watermark;
      if (wm && wm.on && wm.text) {
        const PP = LSE.Scene.period(16, tl.L); const ph = (Math.sin(2 * Math.PI * t / PP) + 1) / 2;
        const bm = textBitmap(wm.text, Math.round(20 * S), '#ffffff', { font: P.captionFont });
        const minX = OW * 0.05, maxX = OW * 0.85 - bm.w;
        const x = minX + (maxX - minX) * ph; const y = { top: OH * 0.06, middle: OH * 0.5, bottom: OH * 0.86 }[wm.pos || 'top'];
        const glitch = Math.floor(t / (beat * 16)) !== Math.floor((t - beat / 2) / (beat * 16)) && t > beat;
        o.globalAlpha = (wm.opacity ?? 0.22) * (glitch ? 1.6 : 1);
        if (glitch) { o.globalCompositeOperation = 'lighter'; o.drawImage(bm.c, Math.round(x - 3 * S), Math.round(y - bm.h / 2)); o.globalCompositeOperation = 'source-over'; }
        o.drawImage(bm.c, Math.round(x), Math.round(y - bm.h / 2));
        o.globalAlpha = 1;
      }
    }

    // seam self-test: frame(0) vs frame(L) must be identical
    seamTest() { const { OW, OH, K } = this;
      const a = this.frame(0); const A = a.getContext('2d').getImageData(0, 0, OW, OH).data.slice();
      // evaluate at exactly L without modulo shortcut for ambient: render with t=L directly
      const tl = this.tl; const save = tl.L; const B0 = this.frameRaw(save);
      let diff = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== B0[i] || A[i + 1] !== B0[i + 1] || A[i + 2] !== B0[i + 2]) diff++;
      return { diff, prevDiff: this.neighbourDiff() };
    }
    frameRaw(t) { const { OW, OH, K } = this; // like frame() but ambient/actors use absolute time (no wrap) to prove the periods divide L
      const tl = this.tl; const wrapRowT = ((t % tl.L) + tl.L) % tl.L;
      const art = this.art.ctx;
      const ri = this.rowAt(wrapRowT); const row = tl.rows[ri]; const built = this.p.scenes[row.scene] || Object.values(this.p.scenes)[0];
      // draw with the absolute t for periodic things, wrapped t for the timeline lookups
      const saveRow = this.rowAt.bind(this);
      this.rowAt = () => ri;
      const info = this.drawWorld(wrapRowT, art, t);
      this.rowAt = saveRow;
      this.applyTransitions(wrapRowT, art);
      const o = this.out.ctx; o.fillStyle = '#0b0a12'; o.fillRect(0, 0, OW, OH);
      const z = info.zoom; const sw = AW / z, sh = AH / z;
      const sx = LSE.clamp(Math.round((info.focusX || 135) - sw / 2), 0, AW - sw), sy = LSE.clamp(Math.round((info.g || 274) - (info.lift || 0) - 0.57 * AH / z), 0, AH - sh);
      o.drawImage(this.art.c, sx, sy, sw, sh, 0, 0, OW, OH);
      this.camState = { sx, sy, sw, sh, camX: Math.round(Math.sin(2 * Math.PI * t / LSE.Scene.period(12, tl.L)) * 6 + ((info.focusX || 135) - 135) * 0.15), g: info.g };
      this.drawOverlayText(o, wrapRowT);
      const fl = this.activeFx(wrapRowT, 'flash'); if (fl) { o.globalAlpha = 0.75 * (1 - fl.p); o.fillStyle = '#ffffff'; o.fillRect(0, 0, OW, OH); o.globalAlpha = 1; }
      return o.getImageData(0, 0, OW, OH).data;
    }
    neighbourDiff() { const { OW, OH, K } = this; // how different the last frame is from frame 0 (continuity info)
      const L = this.tl.L; const a = this.frame(L - 1 / 30).getContext('2d').getImageData(0, 0, OW, OH).data.slice(); const b = this.frame(0).getContext('2d').getImageData(0, 0, OW, OH).data;
      let d = 0; for (let i = 0; i < a.length; i += 16) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) d++;
      return d / (a.length / 16);
    }
  }
  LSE.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
