// STEP 3 — cast & set: cards with live previews, per-card approve/edit/versions, image -> pixel converter, palette.
(function () {
  const App = window.App; const h = App.h; const C = App.Claude;
  const S3 = (App.Steps[3] = {});
  const ACT = { idle: 'ยืน', walk: 'เดิน', action: 'ท่าเรื่อง' };
  const KIND = { char: 'ตัวละคร', prop: 'ของ', scene: 'ฉาก' };

  App.projPalette = () => { const p = App.st.project; return (p && p.palette && p.palette.length) ? p.palette : (p && p.castMeta && p.castMeta.palette && p.castMeta.palette.length >= 8 ? p.castMeta.palette : App.projChannel().palette); };
  // cards made for the Long video carry scope 'long': the Short never sees them, the Long uses every card
  const all = () => Object.values(App.st.cards).sort((a, b) => (a.order || 0) - (b.order || 0));
  const cards = () => all().filter((c) => c.scope !== 'long');
  App.allCards = all;
  App.castCards = (scope) => (scope === 'long' ? all() : cards()).filter((c) => c.kind !== 'scene');
  App.sceneCards = (scope) => (scope === 'long' ? all() : cards()).filter((c) => c.kind === 'scene');
  // a card changed: whichever step it belongs to needs a re-check
  const touched = async (card) => { if (card.scope === 'long') { if (App.Long) await App.Long.touched(); } else if (App.stepState(3) === 'ok') await App.markLater(3); };

  // ---------- generation ----------
  S3.busy = false;
  S3.generate = async function () {
    const p = App.st.project; if (S3.busy) return; S3.busy = true; S3.err = null; S3.stream = ''; App.render();
    try {
      await LSE.LPC.load(); await App.loadLibrary();
      const v = await C.cast(p.pitch, ({ text }) => { S3.stream = text; const el = App.$('#castStream'); if (el) el.textContent = text.slice(-500); });
      // replace Claude cards (image cards stay)
      for (const c of cards()) if (c.source !== 'image') await App.delCard(c.id);
      await S3.addElements(v, null, 0);
      const pal = (v.palette || []).filter(LSE.isHex).map((x) => (x.startsWith('#') ? x : '#' + x).toLowerCase());
      await App.saveProject({ castMeta: { proportions: v.proportions || [], palette: pal }, palette: null });
      if (App.stepState(3) === 'ok') await App.markLater(3); else await App.setStep(3, 'draft');
    } catch (e) { S3.err = e; }
    S3.busy = false; if (App.st.step === 3) App.render();
    S3.drawPending();
  };
  // Claude's elements + scenes -> cards (pixel drawing queued); scope 'long' marks the Long video's additions
  S3.addElements = async function (v, scope, order) {
    const extra = scope ? { scope } : {};
    for (const e of v.elements) {
      const card = Object.assign({}, e, extra, { order: order++, approved: false, source: 'claude', status: needsDrawing(e) ? 'drawing' : 'ok' });
      if (card.kind === 'char' && card.type !== 'creature') { card.recipe.overlays = (e.overlays || []).filter((o) => o.template && LSE.Headgear.TEMPLATES.includes(o.template)).map((o) => ({ template: o.template, colors: o.colors || {}, z: o.z || 130 })); card.overlays = (e.overlays || []).filter((o) => !o.template); }
      if (card.kind === 'prop' && e.library && App.st.library[e.library]) { card.map = App.st.library[e.library].map; card.status = 'ok'; card.fromLibrary = e.library; }
      await App.saveCard(card.id, card); await App.addVersion('card', strip(card), 'สร้างใหม่', card.id);
    }
    const review = await S3.canReview();
    for (const sc of v.scenes) {
      const L = sc.library && App.st.library[sc.library] && App.st.library[sc.library].kind === 'scene' ? App.st.library[sc.library] : null; // a saved set reused as is
      const card = Object.assign({ kind: 'scene' }, sc, extra, { order: order++, approved: false, source: 'claude', status: L ? 'ok' : review ? 'polish' : 'ok' });
      if (L) { card.spec = App.clone(L.spec); card.look = card.look || L.look; card.fromLibrary = sc.library; }
      await App.saveCard(card.id, card); await App.addVersion('card', strip(card), L ? 'จากคลังฉาก' : 'สร้างใหม่', card.id);
    }
  };
  function needsDrawing(e) { return (e.kind === 'prop' && !e.map && !e.library) || (e.type === 'creature' && !e.frames) || (e.kind === 'char' && e.type !== 'creature' && (e.overlays || []).some((o) => !o.template)); }
  function strip(card) { const c = App.clone(card); delete c._id; return c; }

  // pixel drawing + review queue (2 at a time): 'drawing' -> shapes from Claude -> 'polish' -> Claude looks at the render and fixes it -> 'ok'
  S3.canReview = async function () {
    if (S3._review != null) return S3._review;
    try { const lim = App.caps.sample && (await App.caps.sample.limits()); S3._review = !!(lim && lim.images); } catch (e) { S3._review = false; }
    return S3._review;
  };
  const artMap = (d) => LSE.Pixel.toMap(d);
  S3.drawPending = async function () {
    if (S3.drawing) return; S3.drawing = true;
    const pal = App.projPalette(); const review = await S3.canReview();
    const q = all().filter((c) => c.status === 'drawing' || c.status === 'polish');
    const work = async (c) => {
      const was = c.status;
      try {
        if (was === 'drawing') {
          if (c.kind === 'prop') { const r = await C.drawProp(c, pal); c.art = r.draw; c.map = artMap(r.draw); await App.addToLibrary(c, 'prop'); }
          else if (c.type === 'creature') { const r = await C.drawCreature(c, pal); c.artFrames = r.frames; c.frames = LSE.Pixel.framesFromOps(r.frames); c.facing = r.facing || 'e'; await App.addToLibrary(c, 'creature'); }
          else if (c.kind === 'char') {
            c.recipe.overlays = (c.recipe.overlays || []).filter((o) => o.template);
            for (const ov of (c.overlays || []).filter((o) => !o.template)) { const r = await C.drawOverlay(c, ov, pal); const d = { s: artMap(r.dirs.s), n: artMap(r.dirs.n), e: artMap(r.dirs.e) }; c.recipe.overlays.push({ what: ov.what, z: ov.z || 130, dy: ov.dy ?? -2, anchorY: 0, dirs: { s: d.s, n: d.n, e: d.e, w: { pal: d.e.pal, rows: d.e.rows.map((row) => [...row].reverse().join('')) } } }); }
            if (c.recipe.overlays.length) await App.addToLibrary(c, 'overlay');
          }
          c.status = review && (c.kind === 'prop' || c.type === 'creature') ? 'polish' : 'ok'; c.err = null;
        } else { await S3.polishCard(c, c.polishFor); c.status = 'ok'; delete c.polishFor; }
      } catch (e) { if (was === 'drawing') { c.status = 'error'; c.err = App.errText(e); } else { c.status = 'ok'; c.polishNote = 'ขัดเกลาไม่สำเร็จ: ' + App.errText(e); delete c.polishFor; } }
      await App.saveCard(c.id, c);
      if (was === 'drawing') await App.addVersion('card', strip(c), c.status === 'error' ? 'วาดไม่สำเร็จ' : 'วาดพิกเซล', c.id);
      S3.refreshCard(c.id);
      if (c.status === 'polish') q.push(c);
    };
    const runners = [0, 1].map(async () => { while (q.length) await work(q.shift()); });
    await Promise.all(runners); S3.drawing = false;
    if (all().some((c) => c.status === 'drawing' || c.status === 'polish')) S3.drawPending(); // queued while this pass ran
  };

  // how a card renders, as PNGs for the review pass
  const png = (cv) => new Promise((r) => cv.toBlob(r, 'image/png'));
  function checker(ctx, w, hh) { for (let y = 0; y < hh; y += 16) for (let x = 0; x < w; x += 16) { ctx.fillStyle = ((x + y) / 16) % 2 ? '#14121c' : '#0b0a12'; ctx.fillRect(x, y, 16, 16); } }
  function person(ctx, x, ground) { ctx.fillStyle = '#7a7fa3'; ctx.fillRect(x - 5, ground - 48, 10, 10); ctx.fillRect(x - 7, ground - 37, 14, 20); ctx.fillRect(x - 6, ground - 17, 5, 17); ctx.fillRect(x + 1, ground - 17, 5, 17); }
  S3.snapshot = async function (card) {
    if (card.kind === 'scene') {
      const built = sceneBuilt(card); const big = LSE.canvas(540, 960); const art = LSE.canvas(270, 480);
      App.drawScenePreview(art.ctx, built, 1.2); big.ctx.imageSmoothingEnabled = false; big.ctx.drawImage(art.c, 0, 0, 540, 960);
      return [await png(big.c)];
    }
    const e = await castEntry(card);
    if (e.kind === 'char') {
      const an = e.comp.anims.walk || Object.values(e.comp.anims)[0]; const z = 4; const fs = an.fs; const o = LSE.canvas(fs * 2 * z, fs * z); checker(o.ctx, o.c.width, o.c.height); o.ctx.imageSmoothingEnabled = false;
      ['s', 'e'].forEach((d, i) => o.ctx.drawImage(an.canvas, 0, LSE.LPC.dirRow(d) * fs, fs, fs, i * fs * z, 0, fs * z, fs * z));
      return [await png(o.c)];
    }
    const bms = e.bitmap ? [e.bitmap] : [...(e.frames.idle || []), ...(e.frames.action || [])]; if (!bms.length || !bms[0]) return [];
    const bw = Math.max(...bms.map((b) => b.width)), bh = Math.max(...bms.map((b) => b.height)); const z = Math.max(2, Math.min(8, Math.floor(320 / Math.max(bw, bh))));
    const zoom = LSE.canvas(bms.length * (bw + 2) * z, bh * z); checker(zoom.ctx, zoom.c.width, zoom.c.height); zoom.ctx.imageSmoothingEnabled = false;
    bms.forEach((b, i) => zoom.ctx.drawImage(b, i * (bw + 2) * z, (bh - b.height) * z, b.width * z, b.height * z));
    const W = Math.max(90, bw + 40), H = Math.max(64, bh + 14); const one = LSE.canvas(W, H); one.ctx.fillStyle = '#2f2a47'; one.ctx.fillRect(0, 0, W, H); one.ctx.fillStyle = '#3d3a5c'; one.ctx.fillRect(0, H - 6, W, 6);
    person(one.ctx, 12, H - 6); one.ctx.drawImage(bms[0], 26, H - 6 - bms[0].height);
    const real = LSE.canvas(W * 3, H * 3); real.ctx.imageSmoothingEnabled = false; real.ctx.drawImage(one.c, 0, 0, W * 3, H * 3);
    return [await png(zoom.c), await png(real.c)];
  };
  S3.polishCard = async function (c, note) {
    const images = (await S3.snapshot(c)).filter(Boolean); if (!images.length) return;
    const r = await C.polish(c, images, App.projPalette(), note);
    c.polishNote = (r.ok ? 'Claude ตรวจภาพแล้ว: ' : 'Claude ขัดเกลาจากภาพ: ') + (r.notes || (r.ok ? 'ดีแล้ว' : 'ปรับแล้ว'));
    if (r.ok) return;
    if (c.kind === 'prop' && r.art) { c.art = r.art; c.map = artMap(r.art); }
    else if (c.type === 'creature' && r.artFrames) { c.artFrames = r.artFrames; c.frames = LSE.Pixel.framesFromOps(r.artFrames); }
    else if (c.kind === 'scene' && r.spec) c.spec = r.spec;
    else if (c.kind === 'char' && r.recipe) c.recipe = Object.assign({}, r.recipe, { overlays: (c.recipe && c.recipe.overlays) || [] });
    await App.addVersion('card', strip(c), 'ขัดเกลาจากภาพ' + (r.notes ? ': ' + r.notes : ''), c.id);
  };

  // ---------- pixel library ----------
  App.loadLibrary = async function () { try { App.st.library = {}; for (const l of await App.db.list('library')) App.st.library[l._id] = l; } catch (e) { /* empty */ } };
  App.addToLibrary = async function (card, kind) {
    const id = App.uid('lib'); const item = { name: card.name, kind, look: card.look || '', at: Date.now(), from: App.st.pid };
    if (kind === 'prop') item.map = card.map; if (kind === 'creature') { item.frames = card.frames; item.facing = card.facing; } if (kind === 'overlay') item.overlays = card.recipe.overlays;
    try { const sz = JSON.stringify(item).length; if (sz < 200000) { await App.db.set('library/' + id, item); App.st.library[id] = item; } } catch (e) { /* library is optional */ }
  };

  // ---------- scene library: finished sets kept across projects ----------
  App.sceneLibrary = () => Object.entries(App.st.library || {}).filter(([, l]) => l.kind === 'scene').sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  // props a set refers to by card id are inlined as pixel maps so the set works in any project
  const portableSpec = (spec) => { const lib = {}; for (const c of all()) lib[c.id] = c; const fix = (arr) => (arr || []).map((q) => (q && q.p === 'prop' && lib[q.ref] && lib[q.ref].map ? Object.assign({}, q, { p: 'map', map: lib[q.ref].map, ref: undefined }) : q));
    const o = App.clone(spec || {}); for (const k of ['far', 'mid', 'near']) if (o[k]) o[k] = fix(o[k]); if (o.ground && o.ground.prims) o.ground.prims = fix(o.ground.prims); return o; };
  App.saveSceneToLibrary = async function (card) {
    const dup = App.sceneLibrary().find(([, l]) => l.name === card.name && JSON.stringify(l.spec) === JSON.stringify(portableSpec(card.spec)));
    if (dup) return App.toast('ฉากนี้อยู่ในคลังแล้ว');
    const id = App.uid('lib'); const item = { kind: 'scene', name: card.name, look: card.look || '', role: card.role || '', spec: portableSpec(card.spec), at: Date.now(), from: App.st.pid };
    if (JSON.stringify(item).length > 400000) return App.toast('ฉากนี้ใหญ่เกินจะเก็บเข้าคลัง', 'warn');
    await App.db.set('library/' + id, item); App.st.library[id] = item; App.toast('เก็บ "' + card.name + '" เข้าคลังฉากแล้ว');
  };
  function sceneThumb(spec) {
    const cv = h('canvas', { width: 135, height: 240, class: 'lib-thumb' }); const S = LSE.Scene;
    try { const b = S.build(Object.assign({ id: 'lib' }, App.clone(spec)), { palette: App.projPalette() }); const t = LSE.canvas(270, 480); const L = 8, bpm = 120;
      for (const l of ['sky', 'far', 'mid']) S.drawLayer(t.ctx, b, l, 0); S.drawAmbient(t.ctx, b, 1, L, bpm, 'back', 0); S.drawLayer(t.ctx, b, 'ground', 0); S.drawLayer(t.ctx, b, 'near', 0); S.drawLight(t.ctx, b, 1, bpm, 0); S.drawGlow(t.ctx, b, 1, bpm, 0);
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(t.c, 0, 0, 135, 240); } catch (e) { /* broken spec: blank thumb */ }
    return cv;
  }
  App.openSceneLibrary = function (scope) {
    const modal = App.$('#modal'); modal.hidden = false; modal.innerHTML = ''; const close = () => { modal.hidden = true; modal.innerHTML = ''; };
    const items = App.sceneLibrary(); const grid = h('div', { class: 'lib-grid' });
    if (!items.length) grid.append(h('p', { class: 'muted' }, 'ยังไม่มีฉากในคลัง กด "เก็บเข้าคลังฉาก" บนการ์ดฉากที่ชอบ'));
    for (const [id, l] of items) grid.append(h('div', { class: 'lib-item' }, sceneThumb(l.spec), h('b', {}, l.name), h('span', { class: 'small muted' }, l.look || ''),
      h('div', { class: 'row' }, h('button', { class: 'btn sm pri', onclick: async () => {
        const n = all().filter((c) => c.kind === 'scene').length; let cid = 's' + (n + 1); while (App.st.cards[cid]) cid += 'b';
        const order = Math.max(0, ...all().map((c) => c.order || 0)) + 1;
        const card = { id: cid, kind: 'scene', name: l.name, role: l.role || '', look: l.look || '', spec: App.clone(l.spec), order, approved: false, source: 'library', fromLibrary: id, status: 'ok' }; if (scope) card.scope = scope;
        await App.saveCard(cid, card); await App.addVersion('card', strip(card), 'จากคลังฉาก', cid); await touched(card); close(); App.render(); App.toast('เพิ่มฉาก "' + l.name + '" แล้ว');
      } }, 'ใช้ฉากนี้'), h('button', { class: 'btn sm ghost', onclick: async (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = 'กดอีกครั้งเพื่อลบ'; return; } await App.db.del('library/' + id); delete App.st.library[id]; App.openSceneLibrary(scope); } }, 'ลบจากคลัง'))));
    modal.append(h('div', { class: 'dlg wide' }, h('div', { class: 'dlg-h' }, h('h2', {}, 'คลังฉาก (' + items.length + ')'), h('span', { class: 'sp' }), h('button', { class: 'btn ghost', onclick: close }, 'ปิด')), grid));
  };

  // ---------- previews ----------
  const compCache = new Map();
  async function castEntry(card) {
    const pal = App.projPalette(); const key = LSE.hash(JSON.stringify([card.recipe, card.map, card.frames, card.type, pal]));
    if (!compCache.has(key)) compCache.set(key, LSE.buildCastEntry(card, pal));
    return compCache.get(key);
  }
  const sceneCache = new Map();
  function sceneBuilt(card) {
    const pal = App.projPalette(); const key = LSE.hash(JSON.stringify([card.spec, pal]));
    if (!sceneCache.has(key)) { const lib = {}; for (const c of all()) lib[c.id] = c; sceneCache.set(key, LSE.Scene.build(Object.assign({ id: card.id, name: card.name }, card.spec || {}), { palette: pal, resolve: (ref) => lib[ref] && lib[ref].map })); }
    return sceneCache.get(key);
  }
  App.sceneBuilt = sceneBuilt; App.castEntry = castEntry;
  function makePreview(card) {
    const st = { dir: 's', anim: 'idle', zoom: card.kind === 'prop' ? 4 : 2, playing: true };
    const cv = h('canvas', { width: 128, height: 128 }); const ctx = cv.getContext('2d');
    const stage = h('div', { class: 'stage' }, cv); const tools = h('div', { class: 'tools' }); const wrapEl = h('div', { class: 'stage-wrap' }, stage, tools);
    const bpm = 112, beat = 60 / bpm;
    let entry = null, built = null;
    const btn = (label, on, active) => { const b = h('button', { class: active ? 'on' : '', onclick: () => { on(); drawTools(); } }, label); return b; };
    function drawTools() {
      tools.innerHTML = '';
      tools.append(btn(st.playing ? '❚❚' : '▶', () => (st.playing = !st.playing)));
      if (card.kind === 'char') {
        for (const d of ['n', 'w', 's', 'e']) tools.append(btn({ n: '↑', w: '←', s: '↓', e: '→' }[d], () => (st.dir = d), st.dir === d));
        for (const a of ['idle', 'walk', 'action']) tools.append(btn(ACT[a], () => (st.anim = a), st.anim === a));
      }
      if (card.kind !== 'scene') tools.append(btn('4×', () => { st.zoom = st.zoom === 4 ? (card.kind === 'prop' ? 2 : 2) : 4; size(); }, st.zoom === 4));
    }
    function size() {
      if (card.kind === 'scene') { cv.width = 180; cv.height = 320; cv.style.width = '180px'; return; }
      let w = 64, hh = 64;
      if (entry && entry.kind === 'char') { const an = entry.comp.anims.walk || Object.values(entry.comp.anims)[0]; w = hh = an ? an.fs : 64; if (entry.comp.anims[actionName()] && entry.comp.anims[actionName()].fs > w) w = hh = entry.comp.anims[actionName()].fs; }
      else if (entry && (entry.bitmap || entry.frames)) { const bm = entry.bitmap || entry.frames.idle[0]; if (bm) { w = bm.width + 16; hh = bm.height + 16; } }
      cv.width = w * st.zoom; cv.height = hh * st.zoom; ctx.imageSmoothingEnabled = false;
    }
    const actionName = () => (card.action && card.action !== 'walk' && card.action !== 'idle' ? (card.action === 'fly' ? 'idle' : card.action) : 'slash');
    const prev = {
      el: cv, playing: true, draw: (t) => {
        if (!st.playing) return;
        if (card.kind === 'scene') { if (!built) return; App.drawScenePreview(ctx, built, t); return; }
        if (!entry) return;
        ctx.clearRect(0, 0, cv.width, cv.height); const z = st.zoom;
        if (entry.kind === 'char') {
          let a = st.anim === 'action' ? actionName() : st.anim; let an = entry.comp.anims[a] || entry.comp.anims.idle || entry.comp.anims.walk; if (!an) return;
          const s16 = beat / 4; let fi;
          if (a === 'walk') fi = LSE.LPC.CYCLES.walk[LSE.tick(t, s16) % 8];
          else if (a === 'idle') fi = LSE.LPC.CYCLES.idle[LSE.tick(t, beat / 2) % 4];
          else { const per = an.n + 4; fi = Math.min(an.n - 1, LSE.tick(t, s16) % per); }
          const off = (cv.width / z - an.fs) / 2;
          ctx.drawImage(an.canvas, fi * an.fs, LSE.LPC.dirRow(st.dir) * an.fs, an.fs, an.fs, off * z, (cv.height / z - an.fs) * z, an.fs * z, an.fs * z);
        } else {
          let bm = entry.bitmap; if (entry.frames) { const set = st.anim === 'action' && entry.frames.action.length ? entry.frames.action : entry.frames.idle; bm = set[LSE.tick(t, beat / 2) % set.length]; }
          if (!bm) return; let y = 8, alpha = 1; const m = card.motion;
          if (m === 'float') y += Math.round(Math.sin(2 * Math.PI * t / (beat * 4)) * 3) + 3;
          if (m === 'flicker') alpha = LSE.tick(t, beat / 4) % 4 === 0 ? 0.6 : 1;
          ctx.globalAlpha = alpha; ctx.drawImage(bm, 8 * z, y * z, bm.width * z, bm.height * z); ctx.globalAlpha = 1;
          if (m === 'glint' || m === 'pulse') { const ph = LSE.frac(t, beat * 2); if (ph < 0.25) { const gx = (8 + bm.width * (0.2 + ph * 2.4)) * z, gy = (y + 3) * z; ctx.fillStyle = '#fff'; ctx.fillRect(gx, gy - 2 * z, z, 5 * z); ctx.fillRect(gx - 2 * z, gy, 5 * z, z); } }
        }
      },
    };
    (async () => {
      try {
        if (card.kind === 'scene') built = sceneBuilt(card); else if (card.status !== 'drawing') entry = await castEntry(card);
        size(); drawTools();
      } catch (e) { stage.append(h('div', { class: 'err-line', style: { position: 'absolute', inset: '8px auto auto 8px' } }, 'แสดงพรีวิวไม่ได้: ' + App.errText(e))); }
    })();
    App.previews.add(prev);
    return wrapEl;
  }
  App.drawScenePreview = function (ctx, built, t) {
    const L = 16, bpm = 112; const art = App._sceneArt || (App._sceneArt = LSE.canvas(270, 480)); const a = art.ctx;
    const camX = Math.round(Math.sin(2 * Math.PI * t / 8) * 14);
    a.clearRect(0, 0, 270, 480);
    LSE.Scene.drawLayer(a, built, 'sky', camX); LSE.Scene.drawAmbient(a, built, t % L, L, bpm, 'sky', camX); LSE.Scene.drawLayer(a, built, 'far', camX); LSE.Scene.drawLayer(a, built, 'mid', camX); LSE.Scene.drawAmbient(a, built, t % L, L, bpm, 'back', camX);
    LSE.Scene.drawLayer(a, built, 'ground', camX); LSE.Scene.drawLayer(a, built, 'near', camX); LSE.Scene.drawAmbient(a, built, t % L, L, bpm, 'front', camX); LSE.Scene.drawLight(a, built, t, bpm, camX);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(art.c, 0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  // ---------- card ----------
  function cardEl(card) {
    const el = h('article', { class: 'card ' + (card.approved ? 'ok' : ''), id: 'card-' + card.id });
    const desc = card.kind === 'char' ? (card.type === 'creature' ? 'สัตว์/อสูร (วาดพิกเซล)' : 'LPC ' + ((card.recipe && card.recipe.body) || '') + (card.recipe && card.recipe.overlays && card.recipe.overlays.length ? ' + ' + card.recipe.overlays.map((o) => o.what).join(', ') : '')) : card.kind === 'prop' ? 'ของ · ' + (card.motion || 'none') + (card.fromLibrary ? ' · จากคลังพิกเซล' : '') : 'ฉาก';
    el.append(
      card.status === 'drawing' ? h('div', { class: 'stage' }, App.thinking('Claude กำลังวาดพิกเซล…')) : makePreview(card),
      card.status === 'polish' ? h('div', { class: 'polish-badge' }, h('span', { class: 'px' }), 'Claude กำลังดูภาพและขัดเกลา…') : '',
      h('div', { class: 'body' },
        h('span', { class: 'kind' }, (KIND[card.kind] || card.kind).toUpperCase() + ' · ' + card.id),
        h('span', { class: 'nm' }, card.name || '-'),
        h('span', { class: 'small' }, card.role || ''),
        h('span', { class: 'small muted' }, card.look || ''),
        h('span', { class: 'small muted' }, desc),
        card.polishNote ? h('span', { class: 'small polish-note' }, card.polishNote) : null,
        card.status === 'error' ? h('div', { class: 'err-line' }, 'วาดไม่สำเร็จ: ' + (card.err || '')) : null),
      h('div', { class: 'acts' },
        h('button', { class: 'btn sm ' + (card.approved ? 'ok' : ''), disabled: card.status === 'drawing' || card.status === 'polish', onclick: async () => { card.approved = !card.approved; await App.saveCard(card.id, card); if (!card.approved) await touched(card); App.render(); } }, card.approved ? '✓ ยืนยันแล้ว' : 'ยืนยัน'),
        h('button', { class: 'btn sm', disabled: card.status === 'drawing' || card.status === 'polish', onclick: () => editBox.hidden = !editBox.hidden }, 'แก้ไข'),
        card.status === 'ok' && App.caps.sample ? h('button', { class: 'btn sm ghost', title: 'Claude ดูภาพจริงของการ์ดนี้ แล้วแก้จุดที่ยังไม่สวย (ใช้ Claude 1 ครั้ง)', onclick: async () => { if (!(await S3.canReview())) return App.toast('มุมมองนี้ส่งรูปให้ Claude ไม่ได้', 'warn'); card.status = 'polish'; card.approved = false; await App.saveCard(card.id, card); S3.refreshCard(card.id); S3.drawPending(); } }, 'ขัดเกลาจากภาพ') : null,
        card.kind === 'scene' && card.status === 'ok' ? h('button', { class: 'btn sm ghost', title: 'เก็บฉากนี้ไว้ใช้ในโปรเจกต์อื่น', onclick: () => App.saveSceneToLibrary(card) }, 'เก็บเข้าคลังฉาก') : null,
        card.status === 'error' ? h('button', { class: 'btn sm', onclick: () => { card.status = 'drawing'; App.saveCard(card.id, card).then(() => { App.render(); S3.drawPending(); }); } }, 'วาดใหม่') : null,
        h('span', { class: 'sp' }), verEl(card)));
    const ta = h('textarea', { rows: 2, placeholder: 'แก้เฉพาะการ์ดนี้ เช่น "ผมเป็นงูสีเขียวมรกต ตาเรืองแสง"' });
    const st = h('div', {});
    const editBox = h('div', { class: 'edit-box', hidden: true, style: { margin: '0 12px 12px' } }, ta, h('div', { class: 'row' }, h('button', { class: 'btn sm pri', onclick: async (e) => {
      const note = ta.value.trim(); if (!note) return; e.target.disabled = true; st.innerHTML = ''; st.append(App.thinking('Claude กำลังแก้การ์ดนี้…'));
      try { await S3.editCard(card, note); } catch (err) { st.innerHTML = ''; st.append(h('div', { class: 'err-line' }, App.errText(err))); e.target.disabled = false; }
    } }, 'ส่งให้ Claude แก้'), card.source === 'image' ? h('button', { class: 'btn sm danger', onclick: async () => { await App.delCard(card.id); App.render(); } }, 'ลบการ์ด') : null), st);
    el.append(editBox);
    return el;
  }
  function verEl(card) {
    const box = h('span', { class: 'ver' });
    App.versions('card', card.id).then((vs) => { if (vs.length < 2) return; for (const v of vs) box.append(h('button', { class: v.n === card.vn || (!card.vn && v === vs[vs.length - 1]) ? 'on' : '', title: v.note, onclick: async () => { const c = Object.assign(App.clone(v.data), { approved: false, vn: v.n, order: card.order }); await App.saveCard(card.id, c); await touched(c); App.render(); } }, 'v' + v.n)); });
    return box;
  }
  App.cardEl = cardEl;
  S3.refreshCard = function (id) { const old = App.$('#card-' + id); const c = App.st.cards[id]; if (old && c) old.replaceWith(cardEl(c)); };
  S3.editCard = async function (card, note) {
    await LSE.LPC.load();
    let images = null; // image-born cards: show Claude the current pixels too
    if (card.source === 'image' && App.caps.sample) { try { const lim = await App.caps.sample.limits(); if (lim.images) { const m = card.map || (card.frames && card.frames.idle[0]) || (card.spec && card.spec.far[0] && card.spec.far[0].map); if (m) { const bm = LSE.Pixel.bitmap(m); const big = LSE.canvas(bm.width * 4, bm.height * 4); big.ctx.drawImage(bm, 0, 0, big.c.width, big.c.height); images = [await new Promise((r) => big.c.toBlob(r, 'image/png'))]; } } } catch (e) { images = null; } }
    const nv = await C.editCard(card, note, App.projPalette(), images);
    const keep = { order: card.order, source: card.source, map: card.map, frames: card.frames, facing: card.facing, scope: card.scope, art: card.art, artFrames: card.artFrames };
    const c = Object.assign({}, keep, nv, { id: card.id, kind: card.kind, approved: false, status: 'ok' });
    if (c.kind === 'char' && c.type !== 'creature') c.recipe = Object.assign({}, nv.recipe || card.recipe, { overlays: (card.recipe && card.recipe.overlays) || [] });
    if (nv.map && !LSE.Pixel.validate(nv.map)) c.map = nv.map;
    if (nv.art && !LSE.Pixel.validateOps(nv.art)) { c.art = nv.art; c.map = artMap(nv.art); }
    if (nv.artFrames && nv.artFrames.base) { c.artFrames = nv.artFrames; c.frames = LSE.Pixel.framesFromOps(nv.artFrames); }
    if (nv.redraw || (c.kind === 'char' && c.type !== 'creature' && JSON.stringify((nv.overlays || []).map((o) => o.what)) !== JSON.stringify(((card.recipe && card.recipe.overlays) || []).map((o) => o.what)))) {
      if (c.kind === 'prop' && !nv.map && !nv.art) c.status = 'drawing';
      if (c.type === 'creature' && !nv.artFrames) c.status = 'drawing';
      if (c.kind === 'char' && c.type !== 'creature' && (nv.overlays || []).length) { c.overlays = nv.overlays; c.status = 'drawing'; }
    }
    delete c.redraw; delete c.vn; delete c.polishNote;
    if (c.status === 'ok' && (c.kind === 'prop' || c.kind === 'scene' || c.type === 'creature') && (await S3.canReview())) { c.status = 'polish'; c.polishFor = note; } // look at the result once, with the request in mind
    await App.saveCard(c.id, c);
    const v = await App.addVersion('card', strip(c), note, c.id); c.vn = v.n; await App.saveCard(c.id, c);
    await touched(c);
    App.render(); if (c.status === 'drawing' || c.status === 'polish') S3.drawPending();
  };

  // ---------- palette ----------
  App.buildLockedPalette = async function () {
    const counts = new Map(); const add = (hex, w) => { if (!LSE.isHex(hex)) return; hex = (hex.startsWith('#') ? hex : '#' + hex).toLowerCase(); counts.set(hex, (counts.get(hex) || 0) + (w || 1)); };
    for (const c of App.projPalette()) add(c, 50);
    for (const c of cards()) {
      const walk = (o) => { if (!o || typeof o !== 'object') return; for (const k in o) { const v = o[k]; if (typeof v === 'string' && LSE.isHex(v)) add(v, 3); else if (typeof v === 'object') walk(v); } };
      if (c.kind === 'scene') walk(c.spec);
      for (const m of [c.map, ...(c.frames ? [...(c.frames.idle || []), ...(c.frames.action || [])] : []), ...((c.recipe && c.recipe.overlays) || []).flatMap((o) => Object.values(o.dirs || {}))]) if (m && m.pal) for (const k in m.pal) add(m.pal[k], 6);
      if (c.kind === 'char' && c.type !== 'creature') { try { const e = await LSE.buildCastEntry(Object.assign({}, c), []); const an = e.comp.anims.walk || Object.values(e.comp.anims)[0]; if (an) { const d = an.canvas.getContext('2d').getImageData(0, 0, Math.min(an.canvas.width, 192), an.canvas.height).data; for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 200) add(LSE.rgbToHex(d[i], d[i + 1], d[i + 2]), 0.2); } } catch (e) { /* skip */ } }
    }
    // reduce to <= 40 by greedy merge in OKLab (keep the heaviest), keep >= 24
    let cols = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex, w]) => ({ hex, w, lab: LSE.rgbToOklab(...LSE.hexToRgb(hex)) }));
    const out = [];
    for (const c of cols) { if (out.length >= 40) break; if (out.some((o) => Math.hypot((o.lab[0] - c.lab[0]) * 1.3, o.lab[1] - c.lab[1], o.lab[2] - c.lab[2]) < 0.045)) continue; out.push(c); }
    for (const c of App.projChannel().palette) { if (out.length >= 24) break; if (!out.some((o) => o.hex === c)) out.push({ hex: c, lab: LSE.rgbToOklab(...LSE.hexToRgb(c)) }); }
    return out.sort((a, b) => a.lab[0] - b.lab[0]).map((o) => o.hex);
  };
  function palettePanel() {
    const p = App.st.project; const pal = App.projPalette(); const locked = !!(p.palette && p.palette.length);
    const ta = h('textarea', { rows: 2, placeholder: 'วางรายการ hex เพื่อเพิ่มหรือแทนที่' });
    const save = async (np) => { await App.saveProject({ palette: np }); compCache.clear(); sceneCache.clear(); if (App.stepState(3) === 'ok') await App.markLater(3); App.render(); };
    return h('div', { class: 'panel col' },
      h('div', { class: 'row' }, h('h3', {}, 'พาเลตโปรเจกต์'), h('span', { class: 'pill ' + (locked ? 'ok' : 'warn') }, locked ? 'ล็อกแล้ว ' + pal.length + ' สี' : 'ร่าง ' + pal.length + ' สี (ล็อกเมื่อยืนยันขั้นนี้)'), h('span', { class: 'sp' }),
        h('button', { class: 'btn sm', onclick: async () => save(await App.buildLockedPalette()) }, 'สร้างพาเลตจากการ์ด')),
      h('p', { class: 'small muted' }, 'ทุกสไปรต์ ของ ฉาก รูปจากภายนอก สีเน้นซับ และปุ่ม CTA จะถูกจับให้ตรงกับพาเลตนี้ ชั้นภาพ LPC คงเฉดของตัวเองแต่ถูกแมปไปหาสีที่ใกล้ที่สุด คลิกสีเพื่อลบ'),
      h('div', { class: 'swatches' }, ...pal.map((c, i) => h('button', { class: 'sw', style: { background: c }, title: c, onclick: () => { const np = pal.slice(); np.splice(i, 1); save(np); } })),
        (() => { const inp = h('input', { type: 'color', value: '#ffc14a', title: 'เพิ่มสี', style: { width: '30px', height: '28px', padding: '0', border: '0' } }); inp.addEventListener('change', () => save([...new Set(pal.concat(inp.value.toLowerCase()))])); return inp; })()),
      ta, h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => { const a = LSE.parseHexList(ta.value); if (a.length) save([...new Set(pal.concat(a))]); } }, 'เพิ่มสีจากรายการ'), h('button', { class: 'btn sm', onclick: () => { const a = LSE.parseHexList(ta.value); if (a.length) save(a); } }, 'แทนที่ทั้งหมด')));
  }

  // ---------- image -> pixel card ----------
  App.openConverter = function (scope) { // scope 'long': the card belongs to the Long video
    const modal = App.$('#modal'); modal.hidden = false; modal.innerHTML = '';
    const close = () => { document.removeEventListener('paste', onPaste); modal.hidden = true; modal.innerHTML = ''; };
    modal.onclick = (e) => { if (e.target === modal) close(); };
    let img = null; const st = { grid: 48, bg: 'auto', snap: true, colors: 12, outline: true, kind: 'prop', motion: 'none' };
    const src = h('canvas', { width: 1, height: 1 }); const out = h('canvas', { width: 1, height: 1 });
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', id: 'convFile' });
    const drop = h('div', { class: 'drop' }, h('p', {}, 'ลากรูปมาวาง · ', h('label', { for: 'convFile', style: { textDecoration: 'underline', cursor: 'pointer' } }, 'เลือกไฟล์'), ' · หรือกด Ctrl+V เพื่อวางรูป'), h('p', { class: 'small' }, 'ลิงก์รูปจากเว็บมักโหลดไม่ได้เพราะนโยบายความปลอดภัยของหน้า ให้คลิกขวาที่รูป → คัดลอกรูปภาพ แล้วกด Ctrl+V ที่นี่'), file);
    const name = h('input', { type: 'text', placeholder: 'ชื่อ เช่น หน้ากากตุตันคาเมน' }); const desc = h('input', { type: 'text', placeholder: 'อธิบายว่ามันคืออะไรและบทบาทในเรื่อง' });
    const info = h('p', { class: 'small muted' });
    const rng = (label, min, max, step, key, fmt) => { const r = h('input', { type: 'range', min, max, step, value: st[key] === 'auto' ? 0.5 : st[key] }); const lab = h('span', { class: 'small muted' }, label + ': ' + (fmt ? fmt(st[key]) : st[key])); r.addEventListener('input', () => { st[key] = +r.value; lab.textContent = label + ': ' + (fmt ? fmt(st[key]) : st[key]); run(); }); return h('div', { class: 'col', style: { gap: '2px' } }, lab, r); };
    let srcBlob = null;
    function load(blob) { if (!blob || !/^image\//.test(blob.type)) { App.toast('ไฟล์นี้ไม่ใช่รูปภาพ', 'warn'); return; } srcBlob = blob; const u = URL.createObjectURL(blob); LSE.loadImage(u).then((im) => { img = im; src.width = Math.min(400, im.naturalWidth); src.height = Math.round(src.width * im.naturalHeight / im.naturalWidth); src.getContext('2d').drawImage(im, 0, 0, src.width, src.height); run(); }); }
    function run() {
      if (!img) return; const isScene = st.kind === 'scene';
      const res = LSE.Pixel.convert(img, { grid: isScene ? 135 : st.grid, bgStrength: isScene ? 0 : st.bg, palette: st.snap ? App.projPalette() : null, colors: st.colors, outline: !isScene && st.outline });
      out.width = res.image.width; out.height = res.image.height; out.getContext('2d').putImageData(res.image, 0, 0); out.dataset.ok = '1';
      info.textContent = `${res.image.width}×${res.image.height} px · ${res.bgRemoved ? 'ลบพื้นหลังแล้ว' : 'ไม่ลบพื้นหลัง'}${res.plainBorder ? ' (ขอบเป็นสีเรียบ ใช้อัตโนมัติ)' : ''} · ${st.snap ? 'ล็อกสีกับพาเลตโปรเจกต์' : 'k-means ' + st.colors + ' สี'}`;
    }
    const onPaste = (e) => { const items = [...(e.clipboardData && e.clipboardData.items || [])]; const it = items.find((i) => i.type.startsWith('image/')); if (it) { e.preventDefault(); load(it.getAsFile()); return; } const txt = e.clipboardData && e.clipboardData.getData('text'); if (txt && /^https?:\/\//.test(txt.trim())) App.toast('วางลิงก์รูปไม่ได้เพราะหน้านี้โหลดรูปจากเว็บอื่นไม่ได้ ให้คลิกขวาที่รูป → คัดลอกรูปภาพ แล้วกด Ctrl+V', 'warn'); };
    document.addEventListener('paste', onPaste);
    file.addEventListener('change', () => load(file.files[0]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); }); drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) load(f); else App.toast('ลากลิงก์มาใช้ไม่ได้ ให้คัดลอกรูปแล้วกด Ctrl+V', 'warn'); });
    const kindSel = h('select', {}, h('option', { value: 'prop' }, 'ของ / พร็อพ'), h('option', { value: 'creature' }, 'ตัวละคร/สัตว์ (นิ่ง)'), h('option', { value: 'scene' }, 'ฉากหลัง (เต็มจอ)'));
    kindSel.addEventListener('change', () => { st.kind = kindSel.value; run(); });
    const motionSel = h('select', {}, ...['none', 'float', 'glint', 'flicker', 'spin', 'pulse'].map((m) => h('option', { value: m }, m))); motionSel.addEventListener('change', () => (st.motion = motionSel.value));
    const snapChk = h('input', { type: 'checkbox', checked: true }); snapChk.addEventListener('change', () => { st.snap = snapChk.checked; run(); });
    const olChk = h('input', { type: 'checkbox', checked: true }); olChk.addEventListener('change', () => { st.outline = olChk.checked; run(); });
    const addBtn = h('button', { class: 'btn pri', onclick: async () => {
      if (!out.dataset.ok) return App.toast('ยังไม่มีรูป', 'warn');
      const map = LSE.Pixel.fromImageData(out.getContext('2d').getImageData(0, 0, out.width, out.height));
      const id = (st.kind === 'scene' ? 's' : 'p') + 'img' + Math.random().toString(36).slice(2, 5);
      const n = name.value.trim() || 'จากรูป'; const order = Math.max(0, ...cards().map((c) => c.order || 0)) + 1;
      let card;
      if (st.kind === 'scene') card = { id, kind: 'scene', name: n, role: desc.value, look: 'แปลงจากรูปเป็นพิกเซลในพาเลตโปรเจกต์', source: 'image', order, approved: false, status: 'ok', spec: { sky: { top: '#0b0a12', bottom: '#2f2a47' }, far: [{ p: 'map', map, x: 135, y: 480, scale: 2 }], mid: [], near: [], ground: { y: 274, color: '#3d3a5c', texture: 'stone' }, ambient: [{ type: 'dust', count: 18 }] } };
      else if (st.kind === 'creature') card = { id, kind: 'char', type: 'creature', name: n, role: desc.value, look: 'แปลงจากรูป', source: 'image', order, approved: false, status: 'ok', frames: { idle: [map], action: [map] }, facing: 'e', action: 'idle' };
      else card = { id, kind: 'prop', name: n, role: desc.value, look: 'แปลงจากรูปเป็นพิกเซลในพาเลตโปรเจกต์', source: 'image', order, approved: false, status: 'ok', motion: st.motion, map };
      if (st.kind === 'scene') { delete card.spec.ground.prims; }
      if (scope) card.scope = scope;
      if (App.caps.assets && srcBlob && srcBlob.size < 15e6) { try { const a = await App.caps.assets.upload(srcBlob); card.srcAsset = a.id; } catch (e) { /* keeping the original is optional */ } }
      await App.saveCard(id, card); await App.addVersion('card', strip(card), 'จากรูป', id);
      if (st.kind !== 'scene') await App.addToLibrary(card, st.kind === 'creature' ? 'creature' : 'prop');
      await touched(card);
      close(); App.render(); App.toast('เพิ่มการ์ด "' + n + '" แล้ว');
    } }, 'เพิ่มเป็นการ์ดใหม่');
    modal.append(h('div', { class: 'dlg' }, h('div', { class: 'dlg-h' }, h('h2', {}, '+ เพิ่มฉาก/ของจากรูป'), h('span', { class: 'sp' }), h('button', { class: 'btn ghost', onclick: close }, 'ปิด')),
      h('div', { class: 'col' }, drop,
        h('div', { class: 'conv' }, h('div', { class: 'col' }, h('span', { class: 'label' }, 'ต้นฉบับ'), src), h('div', { class: 'col' }, h('span', { class: 'label' }, 'พิกเซลอาร์ต'), out, info)),
        h('div', { class: 'form2' }, h('label', { class: 'field' }, h('span', {}, 'ชื่อ'), name), h('label', { class: 'field' }, h('span', {}, 'คืออะไร'), desc),
          h('label', { class: 'field' }, h('span', {}, 'ใช้เป็น'), kindSel), h('label', { class: 'field' }, h('span', {}, 'การเคลื่อนไหว (ของ)'), motionSel)),
        h('div', { class: 'form2' }, rng('ความละเอียด (พิกเซล)', 16, 96, 1, 'grid'), rng('ความแรงการลบพื้นหลัง', 0, 1, 0.05, 'bg', (v) => (v === 'auto' ? 'อัตโนมัติ' : v)), rng('จำนวนสี (เมื่อไม่ล็อกพาเลต)', 4, 24, 1, 'colors')),
        h('div', { class: 'row' }, h('label', { class: 'row small' }, snapChk, 'ล็อกสีกับพาเลตโปรเจกต์'), h('label', { class: 'row small' }, olChk, 'เส้นขอบ 1px'), h('span', { class: 'sp' }), addBtn))));
  };

  // ---------- render ----------
  S3.render = function (main) {
    const p = App.st.project;
    const all = cards(); const nOk = all.filter((c) => c.approved).length;
    main.append(App.stepHead(3, 'ตัวละคร ของ และฉาก', 'ตรวจทีละการ์ด กด ยืนยัน หรือ แก้ไข เฉพาะการ์ดนั้น ขั้นนี้ผ่านเมื่อยืนยันครบทุกการ์ด',
      h('div', { class: 'row' }, h('span', { class: 'pill ' + (nOk === all.length && all.length ? 'ok' : 'acc') }, 'ยืนยันแล้ว ' + nOk + '/' + all.length))));
    if (S3.busy) { main.append(h('div', { class: 'panel' }, App.thinking('Claude กำลังคัดตัวละคร ของ และออกแบบฉาก (เลือกชั้นภาพ LPC จากแคตตาล็อก)…', h('div', { class: 'stream', id: 'castStream' }, (S3.stream || '').slice(-500))))); return; }
    if (S3.err) main.append(h('div', { class: 'err-line', style: { marginBottom: '12px' } }, 'สร้างการ์ดไม่สำเร็จ: ' + App.errText(S3.err)));
    if (!all.length) { main.append(h('div', { class: 'panel col' }, h('p', {}, 'ยังไม่มีการ์ด'), h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: () => S3.generate() }, 'ให้ Claude เสนอตัวละครและฉาก'), h('button', { class: 'btn', onclick: () => App.openConverter() }, '+ เพิ่มฉาก/ของจากรูป'), h('button', { class: 'btn', onclick: () => App.openSceneLibrary() }, '+ ฉากจากคลัง')))); return; }
    const chars = all.filter((c) => c.kind !== 'scene'), scenes = all.filter((c) => c.kind === 'scene');
    main.append(
      h('div', { class: 'row', style: { marginBottom: '12px' } }, h('h2', {}, 'ตัวละครและของ (' + chars.length + ')'), h('span', { class: 'sp' }), h('button', { class: 'btn', onclick: () => App.openConverter() }, '+ เพิ่มฉาก/ของจากรูป'),
        h('button', { class: 'btn ghost', onclick: (e) => { if (e.target.dataset.sure) S3.generate(); else { e.target.dataset.sure = 1; e.target.textContent = 'กดอีกครั้งเพื่อสร้างใหม่ทั้งหมด'; } } }, 'สร้างใหม่ทั้งหมด')),
      h('div', { class: 'cards' }, ...chars.map(cardEl)),
      h('div', { class: 'row', style: { margin: '22px 0 12px' } }, h('h2', {}, 'ฉาก (' + scenes.length + ')'), h('span', { class: 'sp' }), h('button', { class: 'btn', onclick: () => App.openSceneLibrary() }, '+ ฉากจากคลัง (' + App.sceneLibrary().length + ')')),
      h('div', { class: 'cards' }, ...scenes.map(cardEl)));
    const props = (p.castMeta && p.castMeta.proportions) || [];
    if (props.length) main.append(h('div', { class: 'panel col', style: { marginTop: '18px' } }, h('h3', {}, 'ตารางสัดส่วน (มนุษย์ LPC สูง ~48 px ที่ 1×)'),
      h('div', { class: 'tbl' }, h('table', { class: 'facts' }, h('thead', {}, h('tr', {}, h('th', {}, 'สิ่งที่'), h('th', {}, 'สูง (px)'), h('th', {}, 'เหตุผล'))), h('tbody', {}, ...props.map((r) => h('tr', {}, h('td', {}, r.name), h('td', { class: 'mono' }, String(r.height_px ?? '')), h('td', {}, r.why || ''))))))));
    main.append(h('div', { style: { marginTop: '14px' } }, palettePanel()));
    const ready = all.length && nOk === all.length && !all.some((c) => c.status === 'drawing' || c.status === 'polish');
    main.append(h('div', { class: 'panel' }, h('div', { class: 'actions', style: { border: 0, margin: 0, padding: 0 } },
      h('button', { class: 'btn ok', disabled: !ready, onclick: async (e) => { e.target.disabled = true; const pal = await App.buildLockedPalette(); await App.saveProject({ palette: (p.palette && p.palette.length) ? p.palette : pal }); compCache.clear(); sceneCache.clear(); await App.approveStep(3); if (!p.beats) App.Steps[4].generate(); } }, ready ? 'ยืนยันขั้นนี้และล็อกพาเลต' : 'ยืนยันให้ครบทุกการ์ดก่อน (' + nOk + '/' + all.length + ')'),
      h('button', { class: 'btn', onclick: async () => { for (const c of all) if (c.status === 'ok' && !c.approved) { c.approved = true; await App.saveCard(c.id, c); } App.render(); } }, 'ยืนยันทุกการ์ดที่เหลือ'))));
    if (all.some((c) => c.status === 'drawing' || c.status === 'polish')) S3.drawPending();
  };
})();
