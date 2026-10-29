// Beat sheet + real voice timings -> circular timeline (tracks, captions, sfx, hooks) + self-checks.
(function (G) {
  const LSE = G.LSE;
  const T = (LSE.Timeline = {});
  const ONE_SHOT = { slash: 6, thrust: 8, spellcast: 7, shoot: 13, hurt: 6, jump: 5, backslash: 13, emote: 3, sit: 3 };
  const CYCLIC = ['walk', 'run', 'idle', 'combat'];
  T.ACTIONS = ['idle', 'walk', 'run', 'slash', 'backslash', 'thrust', 'spellcast', 'shoot', 'hurt', 'jump', 'emote', 'sit', 'combat', 'fly'];
  T.HOOKS = ['event', 'direction', 'question', 'fact', 'cut', 'enter'];
  T.FX = ['flash', 'shake', 'glitch', 'zoom', 'crack', 'light', 'rgb', 'scan', 'dark', 'shatter'];
  T.TRANSITIONS = ['stonecrack', 'blooddrip', 'batswarm', 'lightning', 'sandstorm', 'glitchwipe', 'pixeldissolve', 'fireburst', 'waterripple', 'goldflash', 'pixelshatter'];
  // contact frames -> sfx (frame index within one-shot / cycle)
  const CONTACT = { slash: [[1, 'whoosh'], [3, 'hit']], backslash: [[2, 'whoosh'], [5, 'hit']], thrust: [[2, 'whoosh'], [5, 'hit']], spellcast: [[2, 'shimmer']], shoot: [[4, 'creak'], [9, 'whoosh']], hurt: [[0, 'hit']], jump: [[1, 'whoosh'], [4, 'step']], emote: [[0, 'blip']] };
  const TRANS_SFX = { stonecrack: 'grind', blooddrip: 'drip', batswarm: 'flap', lightning: 'thunder', sandstorm: 'sand', glitchwipe: 'glitch', pixeldissolve: 'glitch', pixelshatter: 'glitch', fireburst: 'boom', waterripple: 'splash', goldflash: 'coin' };

  // split Thai caption "line1|line2" with *key*; returns [{text, key, line}]
  T.parseCaption = function (cap) {
    // phrases split on spaces, but a *keyword* may contain spaces ("*17 ปี*") and stays one yellow segment
    const segs = []; const lines = String(cap || '').split('|').slice(0, 2);
    lines.forEach((ln, li) => {
      const re = /\*([^*]+)\*|([^\s*]+)|(\s+)/g; let m; let space = true;
      while ((m = re.exec(ln.trim()))) {
        if (m[3]) { space = true; continue; }
        if (m[1]) segs.push({ text: m[1].trim(), key: true, line: li, join: !space && segs.length > 0 && segs[segs.length - 1].line === li });
        else segs.push({ text: m[2], key: false, line: li, join: !space && segs.length > 0 && segs[segs.length - 1].line === li });
        space = false;
      }
    });
    return segs;
  };
  T.captionChars = (cap) => String(cap || '').replace(/\*/g, '').split('|').map((s) => [...s.replace(/\s/g, '')].length);

  // Planned clock (before voice): ~4.5 s per row
  T.plannedTimings = function (rows, spc) { spc = spc || 0.09; let t = 0.05; return rows.map((r) => { const d = Math.max(1.6, Math.min(7, [...String(r.voice || '').replace(/\s/g, '')].length * spc + 0.12)); const o = { t0: t, t1: t + d - 0.35 }; t += d; return o; }); };

  // compile(beats, {sentences:[{t0,t1,words?:[{text,start,end}]}], clock:{bpm,bars,L}}, cast)
  T.compile = function (beats, voice, cast) {
    const rows = (beats.rows || []).map((r) => Object.assign({}, r));
    const issues = [];
    if (!rows.length) throw new Error('ไม่มีแถวในบท');
    const sent = voice && voice.sentences && voice.sentences.length >= rows.length ? voice.sentences : T.plannedTimings(rows, beats.cps ? 1 / beats.cps : 0);
    const vEnd = sent[rows.length - 1].t1;
    const cps = (() => { const n = rows.reduce((a, r) => a + [...String(r.voice || '').replace(/\s/g, '')].length, 0); return n / Math.max(1, vEnd); })();
    const clock = voice && voice.clock ? voice.clock : voice && voice.sentences ? LSE.Audio.fitClockVoice(vEnd, sent.map((s) => s.t0), cps) : LSE.Audio.fitClock(vEnd, 100, 128, beats.bpm);
    const { bpm, bars, L } = clock; const beat = 60 / bpm, s16 = beat / 4, s8 = beat / 2;
    const q16 = (t) => Math.round(t / s16) * s16, q8 = (t) => Math.round(t / s8) * s8;
    const wrap = (t) => ((t % L) + L) % L;
    // force the loop: last row returns to row 0's scene (a Long chapter plays once and may end anywhere; beats.loopCut lets the loop cut back on the voice bridge)
    if (!beats.chapter && !beats.loopCut && rows.length > 1 && rows[rows.length - 1].scene !== rows[0].scene) { issues.push({ level: 'fix', msg: 'แถวสุดท้ายเปลี่ยนฉากกลับเป็นฉากแรกเพื่อให้วนต่อเนื่อง' }); rows[rows.length - 1].scene = rows[0].scene; }
    // row spans: start at sentence onset (row 0 at 0)
    const span = rows.map((r, i) => ({ t0: i === 0 ? 0 : q16(sent[i].t0 - 0.06), t1: 0 }));
    span.forEach((s, i) => { s.t1 = i + 1 < span.length ? span[i + 1].t0 : L; });
    const tracks = {}; const sfx = []; const fx = []; const trans = []; const caps = []; const hooks = [];
    const castIds = new Set((cast || []).map((c) => c.id)); const propIds = new Set((cast || []).filter((c) => c.kind && c.kind !== 'char').map((c) => c.id));
    const hud = []; const BED = { rain: 1.8, fan: 1.3, wind: 1.4, fire: 0.9, sand: 0.8 };
    const actor = (id) => (tracks[id] = tracks[id] || { id, keys: [], acts: [], vis: [] });
    const labels = [], cards = [], insets = [], appear = {}, bams = [], dizzy = [];
    rows.forEach((r, i) => {
      const s = span[i]; const dur = s.t1 - s.t0;
      const st0 = sent[i]; const wordsI = st0.words || null; const vText = String(r.voice || '');
      // time of a word as it is spoken (falls back to its position in the sentence)
      const wt = (w, dflt) => {
        if (!w) return dflt;
        let t = wordsI && wordsI.length ? timeOfText(wordsI, vText, w, st0) : null;
        if (t == null) { const k = vText.replace(/\s/g, '').indexOf(String(w).replace(/\s/g, '')); t = k >= 0 ? st0.t0 + (k / Math.max(1, vText.replace(/\s/g, '').length)) * (st0.t1 - st0.t0) : dflt; }
        return LSE.clamp(t, s.t0, s.t1 - 0.05);
      };
      // moves
      for (const mv of r.moves || []) {
        if (!mv || !mv.actor) continue;
        if (castIds.size && !castIds.has(mv.actor)) { issues.push({ level: 'warn', msg: `แถว ${i + 1}: ไม่รู้จักตัวละคร ${mv.actor}` }); continue; }
        const tr = actor(mv.actor);
        const from = num(mv.from, num(mv.x, 135)), to = num(mv.to, from);
        const a0 = mv.at_word ? wt(mv.at_word, s.t0) : s.t0 + LSE.clamp(num(mv.at, 0), 0, 0.95) * dur;
        const a1 = mv.until != null ? s.t0 + LSE.clamp(num(mv.until, 1), 0.05, 1) * dur : s.t1;
        let dir = mv.dir || (to > from ? 'e' : to < from ? 'w' : 's');
        const y = num(mv.y, 0), yTo = num(mv.y_to, y); // y < 0 = up in the air; y_to: climb / dive during the move
        const moves = to !== from || yTo !== y;
        tr.vis.push([s.t0, s.t1]);
        tr.keys.push({ t: s.t0, x: from, y, dir, scale: mv.scale || 1, row: i });
        const isProp = propIds.has(mv.actor); const startLate = moves && a0 > s.t0 + 0.02;
        if (startLate) tr.keys.push({ t: a0, x: from, y, dir, scale: mv.scale || 1, row: i }); // stays put until the word, then moves
        if (moves) tr.keys.push({ t: Math.max(startLate ? a0 + 0.2 : s.t0 + 0.01, a1 - 0.01), x: to, y: yTo, dir, scale: mv.scale || 1, row: i });
        if (mv.sfx && LSE.Audio.has(mv.sfx)) sfx.push({ t: q16(a0), type: mv.sfx, deg: 2, vel: num(mv.vel, 0.55), acc: true });
        if (isProp) { if (mv.enter) hooks.push({ t: a0, type: 'enter' }); continue; } // props slide: no walk cycle, no footsteps
        let act = T.ACTIONS.includes(mv.action) ? mv.action : (to !== from ? 'walk' : 'idle');
        const moving = moves;
        tr.acts.push({ t0: s.t0, t1: s.t1, base: act === 'fly' ? 'fly' : moving ? (act === 'run' ? 'run' : 'walk') : (act === 'combat' ? 'combat' : 'idle'), row: i, moveT0: s.t0, moveT1: a1 }); // fly also hovers in place
        if (ONE_SHOT[act]) {
          // one-shot action on the 8th grid; repeat each 2 beats if `repeat`
          const reps = mv.repeat ? Math.max(1, Math.floor((s.t1 - a0) / (beat * 2))) : 1;
          for (let k = 0; k < reps; k++) {
            let ts = q8(a0 + k * beat * 2);
            if (i === 0 && k === 0 && num(mv.at, 0) === 0 && !mv.at_word) ts = wrap(-2 * s16); // frame 0 already mid-action
            tr.acts.push({ t: ts, anim: act, frames: ONE_SHOT[act], row: i });
            for (const [f, type] of CONTACT[act] || []) sfx.push({ t: wrap(ts + f * s16), type, deg: f, vel: type === 'hit' ? 0.7 : 0.5, acc: type === 'hit' });
          }
        }
        if ((act === 'fly' || mv.wings) && mv.flap !== false) for (let t = s.t0; t < s.t1 - 0.01; t += beat) sfx.push({ t: q8(t), type: 'flap', vel: 0.35 });
        if (moving && act !== 'fly') { // footsteps on contact frames (walk cycle: frames 1..8 at 16ths, contacts at 1 and 5)
          const stepEvery = act === 'run' ? s16 * 4 : s16 * 4; const startStep = Math.ceil(s.t0 / (s16 * 4)) * s16 * 4;
          for (let t = startStep; t < a1; t += stepEvery) sfx.push({ t: wrap(t), type: 'step', deg: (Math.round(t / s16) / 4) % 2 ? 4 : 0, vel: 0.22 });
        }
        if (mv.enter) hooks.push({ t: s.t0, type: 'enter' });
      }
      // props
      for (const pr of r.props || []) {
        if (!pr || !pr.prop) continue; const tr = actor(pr.prop); tr.prop = true;
        const ta = pr.at_word ? q16(wt(pr.at_word, s.t0)) : s.t0;
        tr.vis.push([ta, s.t1]); tr.keys.push({ t: s.t0, x: num(pr.x, 135), y: num(pr.y, 0), dir: pr.flip ? 'w' : 'e', motion: pr.motion || 'float', scale: pr.scale || 1, row: i });
        if (pr.at_word) { (appear[pr.prop] = appear[pr.prop] || []).push(ta); sfx.push({ t: ta, type: pr.sfx || 'ting', deg: 4, vel: num(pr.vel, 0.45), acc: true }); hooks.push({ t: ta, type: 'event', row: i }); }
        if (pr.motion === 'glint' || pr.motion === 'pulse') for (let t = s.t0; t < s.t1; t += beat * 4) sfx.push({ t: q8(t + beat), type: 'coin', deg: 4, vel: 0.12 });
        
      }
      // camera: zoom, focus, slow pan across the row, punch-in on a word
      r.camera = Object.assign({ zoom: 2 }, r.camera || {});
      if (r.camera.punch_word) { r.camera.punchT = q16(wt(r.camera.punch_word, s.t0 + dur * 0.5)); hooks.push({ t: r.camera.punchT, type: 'direction', row: i }); sfx.push({ t: r.camera.punchT, type: 'whoosh', vel: 0.3 }); }
      // story beats pinned to the words that are spoken
      for (const c of r.cues || []) {
        if (!c) continue; const t = q16(Math.min(s.t1 - 0.05, (c.at_word ? wt(c.at_word, s.t0) : s.t0 + LSE.clamp(num(c.at, 0.5), 0, 0.95) * dur) + num(c.delay, 0)));
        // comedy beats: a comic burst word ("ป๊าบ!"), dizzy stars, a head-spin (quick direction flips)
        if (c.bam) bams.push({ t, actor: c.actor || null, text: String(c.bam).slice(0, 10), t1: Math.min(s.t1, t + num(c.bamDur, 0.9)), row: i });
        if (c.dizzy && c.actor) { dizzy.push({ actor: c.actor, t0: t, t1: Math.min(s.t1, t + num(c.dizzy, 1.2)), row: i }); sfx.push({ t: q16(t + 0.4), type: 'boing', deg: 2, vel: 0.4, acc: true }); }
        if (c.spin && c.actor) { const tr = actor(c.actor); const seq = ['e', 's', 'w', 'n']; const n = Math.max(1, Math.round(num(c.spin, 1) * 4)); for (let k = 0; k <= n; k++) tr.keys.push({ t: t + 0.04 + k * 0.075, x: null, dir: k === n ? (c.dir || 'w') : seq[k % 4], row: i, dirOnly: true }); }
        if (c.actor && (castIds.size === 0 || castIds.has(c.actor))) { const tr = actor(c.actor); const act = ONE_SHOT[c.action] ? c.action : null; if (act) { tr.acts.push({ t, anim: act, frames: ONE_SHOT[act], row: i, hold: !!c.hold || !!c.still, still: !!c.still, until: s.t1 }); if (!c.still) for (const [f, type] of CONTACT[act] || []) sfx.push({ t: wrap(t + f * s16), type, deg: f, vel: 0.5 }); } if (c.dir) tr.keys.push({ t, x: null, dir: c.dir, row: i, dirOnly: true }); }
        if (c.fx && T.FX.includes(c.fx)) fx.push({ t, type: c.fx, dur: num(c.fxDur, c.fx === 'shatter' ? 0.8 : 0.35) });
        if (c.sfx && LSE.Audio.has(c.sfx)) sfx.push({ t, type: c.sfx, deg: 4, vel: num(c.vel, 0.6), acc: true, hero: !!c.loud });
        hooks.push({ t, type: 'event', row: i });
      }
      for (const lb of r.labels || []) { if (!lb || !lb.text) continue; const t0 = q16(lb.at_word ? wt(lb.at_word, s.t0) : s.t0 + 0.15); labels.push({ actor: lb.actor, text: String(lb.text).slice(0, 28), t0, t1: Math.min(s.t1, t0 + 2.8), row: i }); }
      // day / money counter: every change is a hook with a cash sound
      for (const hu of (Array.isArray(r.hud) ? r.hud : r.hud ? [r.hud] : [])) { const t0 = i === 0 && !hu.at_word ? 0 : q16(hu.at_word ? wt(hu.at_word, s.t0) : s.t0); const prev = hud.length ? hud[hud.length - 1] : null;
        const day = hu.day != null ? num(hu.day, 1) : prev ? prev.day : 1, money = hu.money != null ? num(hu.money, 0) : prev ? prev.money : 0;
        hud.push({ t: t0, day, money, d: prev ? money - prev.money : 0, dd: prev ? day - prev.day : 0, off: !!hu.off, row: i });
        const HS = { coin: ['cashout', 'cashin'], o2: ['blip', 'shimmer'], clock: ['tap', 'tap'], heart: ['hit', 'shimmer'], floor: ['blip', 'blip'] }[(beats.hud || {}).icon] || ['cashout', 'cashin']; // the counter's own sound
        if (prev && money < prev.money) sfx.push({ t: t0, type: HS[0], deg: 4, vel: 0.55, acc: true }); else if (prev && money > prev.money) sfx.push({ t: t0, type: HS[1], deg: 4, vel: 0.6, acc: true });
        if (prev && (money !== prev.money || day !== prev.day)) hooks.push({ t: t0, type: 'fact', row: i }); }
      // looping texture bed under a row (rain on the roof, a fan, wind)
      { const smp = LSE.Audio.samples[r.bed]; const per = BED[r.bed] || (smp ? Math.max(0.8, smp.length / LSE.Audio.SR - 0.3) : 0); // synthetic or recorded loop
        if (r.bed && per) for (let t = s.t0; t < s.t1 - 0.3; t += per) sfx.push({ t, type: r.bed, vel: num(r.bedVel, 0.5), len: s.t1 + 0.15 - t }); }
      if (r.card && r.card.text) { const t0 = q16(r.card.at_word ? wt(r.card.at_word, s.t0) : s.t0 + 0.1); cards.push({ text: String(r.card.text).slice(0, 24), t0, t1: Math.min(s.t1, t0 + 2.4), row: i }); hooks.push({ t: t0, type: 'fact', row: i }); sfx.push({ t: t0, type: 'stamp', vel: 0.5, acc: true }); }
      if (r.inset && (r.inset.headline || r.inset.prop)) { const t0 = q16(r.inset.at_word ? wt(r.inset.at_word, s.t0) : s.t0 + 0.2); insets.push(Object.assign({}, r.inset, { t0, t1: Math.min(s.t1, t0 + num(r.inset.dur, 2.6)), row: i })); hooks.push({ t: t0, type: 'cut', row: i }); sfx.push({ t: t0, type: r.inset.kind === 'newspaper' ? 'paper' : 'ting', vel: 0.6, acc: true }); }
      // caption & timings
      const segs = T.parseCaption(r.caption);
      const st = sent[i]; const words = st.words || null; const voiceText = String(r.voice || '');
      const total = segs.reduce((a, g) => a + g.text.length, 0) || 1; let acc = 0;
      const popT = segs.map((g) => {
        let tt;
        if (words && words.length) { tt = timeOfText(words, voiceText, g.text, st); }
        if (tt == null) tt = st.t0 + (acc / total) * (st.t1 - st.t0) * 0.85;
        acc += g.text.length;
        return i === 0 ? 0 : LSE.clamp(q16(tt), s.t0, s.t1 - s16);
      });
      caps.push({ t0: s.t0, t1: s.t1, segs: segs.map((g, k) => Object.assign({}, g, { t: popT[k] })), row: i, question: /\?/.test(r.caption || '') });
      if (i > 0 && beats.captionBlips) popT.forEach((t, k) => sfx.push({ t, type: 'blip', deg: [0, 2, 4, 7, 4, 2][k % 6], vel: 0.15 }));
      // hooks
      const h = r.hook || {}; const htype = T.HOOKS.includes(h.type) ? h.type : (i === 0 ? 'event' : 'cut');
      const ht = i === 0 ? 0.25 : s.t0 + 0.02;
      hooks.push({ t: ht, type: htype, fx: h.fx, row: i });
      if (h.fx && T.FX.includes(h.fx)) fx.push({ t: i === 0 ? q16(0.25) : s.t0, type: h.fx, dur: 0.35 });
      else if (i === 0) fx.push({ t: q16(0.25), type: 'flash', dur: 0.3 });
      if (segs.some((g) => g.key)) { const k = segs.findIndex((g) => g.key); hooks.push({ t: popT[k] || s.t0, type: 'fact', row: i }); }
      if (/\?/.test(r.caption || '')) hooks.push({ t: s.t0 + 0.1, type: 'question', row: i });
      for (const m of r.hooks || []) { const at = s.t0 + LSE.clamp(num(m.at, 0.5), 0.05, 0.95) * dur; hooks.push({ t: at, type: T.HOOKS.includes(m.type) ? m.type : 'event', row: i, fx: m.fx }); if (m.fx && T.FX.includes(m.fx)) fx.push({ t: q8(at), type: m.fx, dur: 0.3 }); if (m.fx === 'glitch' || m.fx === 'rgb') sfx.push({ t: q8(at), type: 'glitch', deg: 7, vel: 0.35 }); if (m.fx === 'shake' || m.fx === 'crack') sfx.push({ t: q8(at), type: 'boom', vel: 0.5 }); }
      if (h.fx === 'glitch' || h.fx === 'rgb') sfx.push({ t: q8(ht), type: 'glitch', deg: 7, vel: 0.4 });
      if (i === 0) sfx.push({ t: q16(0.25), type: h.fx === 'crack' ? 'crack' : 'boom', vel: 0.55 });
      // transitions at row start
      if (r.transition && T.TRANSITIONS.includes(r.transition) && i > 0) { trans.push({ t: s.t0, type: r.transition, row: i }); sfx.push({ t: q8(s.t0 - s8), type: TRANS_SFX[r.transition] || 'whoosh', vel: 0.6, acc: true }); }
      // CTA
      if (r.cta) {
        let ct = null; const w = r.cta_word || ({ like: 'ไลก์', share: 'แชร์', subscribe: 'ซับสไครบ์' })[r.cta];
        if (words && words.length && w) ct = timeOfText(words, voiceText, w, st);
        if (ct == null) { const idx = voiceText.indexOf(w || ''); ct = st.t0 + (idx > 0 ? idx / Math.max(1, voiceText.length) : 0.45) * (st.t1 - st.t0); }
        r.__cta = { t: q16(ct), type: r.cta, row: i };
        hooks.push({ t: q16(ct), type: 'event', row: i, cta: true });
        sfx.push({ t: q16(ct), type: 'ting', deg: 7, vel: 0.55, acc: true }); sfx.push({ t: q16(ct) + beat, type: 'tap', deg: 4, vel: 0.5, acc: true });
      }
      // music section
      r.__mood = LSE.Audio.MOODS.includes(r.music) ? r.music : null;
    });
    // mood sections from rows (bar index of row start)
    const sections = []; rows.forEach((r, i) => { const bar = Math.floor(span[i].t0 / (beat * 4)); const m = r.__mood || (sections.length ? sections[sections.length - 1].mood : 'mysterious'); if (!sections.length || sections[sections.length - 1].mood !== m) sections.push({ bar, mood: m }); });
    // circular sort & loop closure on tracks
    for (const id in tracks) {
      const tr = tracks[id]; tr.keys.sort((a, b) => a.t - b.t); tr.acts.sort((a, b) => (a.t ?? a.t0) - (b.t ?? b.t0));
    }
    // micro-hook gap filler (every <= 3.2 s)
    const hk = hooks.slice().sort((a, b) => a.t - b.t);
    const alt = ['zoom', 'light', 'zoom', 'glitch']; let ai = 0;
    for (let k = 0; k < hk.length; k++) {
      const a = hk[k].t, b = k + 1 < hk.length ? hk[k + 1].t : L + hk[0].t;
      let gap = b - a;
      while (gap > 3.2) {
        const t = q8(a + Math.min(3.0, gap / 2)); const type = alt[ai++ % alt.length];
        fx.push({ t: wrap(t), type, dur: 0.28, auto: true }); hooks.push({ t: wrap(t), type: type === 'zoom' ? 'direction' : 'event', auto: true });
        if (type === 'glitch') sfx.push({ t: wrap(t), type: 'glitch', deg: 7, vel: 0.2 }); else if (type === 'zoom') sfx.push({ t: wrap(t), type: 'whoosh', vel: 0.2 });
        gap -= (t - a); hk.splice(k + 1, 0, { t }); break;
      }
    }
    const ctas = rows.map((r) => r.__cta).filter(Boolean);
    const tl = { chapter: !!beats.chapter, L, bpm, bars, beat, rows, span, cps, bams, dizzy, tracks, labels, cards, insets, appear, hud: hud.length ? { days: num((beats.hud || {}).days, 7), unit: (beats.hud || {}).unit ?? '฿', label: (beats.hud || {}).label || 'วันที่', icon: (beats.hud || {}).icon || 'coin', suffix: (beats.hud || {}).suffix || '', steps: hud.sort((a, b) => a.t - b.t) } : null, sfx: sfx.map((e) => Object.assign(e, { t: wrap(e.t) })), fx, trans, caps, hooks: hooks.sort((a, b) => a.t - b.t), cta: ctas[0] || null, sections, key: beats.key || 'D', scale: beats.scale || 'aeolian', title: beats.title || '' };
    tl.issues = issues.concat(T.check(tl));
    return tl;

    function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
  };

  // locate a text fragment inside word timings (Thai: match on characters without spaces)
  function timeOfText(words, sentence, frag, st) {
    const norm = (s) => String(s).replace(/[\s.,!?…"'“”]/g, '');
    const f = norm(frag); if (!f) return null;
    let acc = ''; const marks = [];
    for (const w of words) { const nw = norm(w.text); marks.push([acc.length, acc.length + nw.length, w.start, w.end]); acc += nw; }
    const idx = acc.indexOf(f); if (idx < 0) return null;
    for (const [p0, p1, a, b] of marks) if (idx >= p0 && idx < p1) return a + (b - a) * ((idx - p0) / Math.max(1, p1 - p0));
    return st.t0;
  }
  T.timeOfText = timeOfText;

  T.captionIssues = (tl) => tl.rows.map((r, i) => (T.captionChars(r.caption).some((n) => n > 22) ? { level: 'warn', msg: `ซับแถว ${i + 1} ยาวเกิน 22 ตัวอักษรต่อบรรทัด` } : null)).filter(Boolean);
  T.check = function (tl) {
    const out = []; const L = tl.L;
    // hooks gap
    const hs = tl.hooks.map((h) => h.t).sort((a, b) => a - b); let maxGap = 0;
    for (let i = 0; i < hs.length; i++) { const g = (i + 1 < hs.length ? hs[i + 1] : hs[0] + L) - hs[i]; maxGap = Math.max(maxGap, g); }
    tl.maxHookGap = maxGap;
    if (!hs.length || hs[0] > 1) out.push({ level: 'error', msg: 'ไม่มีฮุกภายใน 1 วินาทีแรก' });
    if (maxGap > 3.5) out.push({ level: 'warn', msg: `ช่วงไม่มีฮุกนาน ${maxGap.toFixed(1)} วินาที` });
    // CTA rules
    const ctaRows = tl.rows.filter((r) => r.cta);
    if (tl.chapter) { // a Long chapter: CTA only where the outline plans one
      if (ctaRows.length > 1) out.push({ level: 'warn', msg: `ตอนนี้มี CTA ${ctaRows.length} ครั้ง (ควรมีไม่เกิน 1)` });
      if (tl.L < 30 || tl.L > 100) out.push({ level: 'warn', msg: `ตอนนี้ยาว ${tl.L.toFixed(1)} วินาที (เป้าหมาย 45–75)` });
      return out.concat(T.captionIssues(tl));
    }
    if (ctaRows.length !== 1) out.push({ level: 'error', msg: `ต้องมี CTA หนึ่งครั้งพอดี (ตอนนี้ ${ctaRows.length})` });
    if (tl.cta) {
      const f = tl.cta.t / L;
      if (f < 0.5 || f > 0.65) out.push({ level: 'warn', msg: `CTA อยู่ที่ ${(f * 100).toFixed(0)}% ของคลิป (ควร 50–65%)` });
      if (tl.cta.t < 15) out.push({ level: 'error', msg: 'CTA อยู่ใน 15 วินาทีแรก' });
      if (L - tl.cta.t < 8) out.push({ level: 'error', msg: 'CTA อยู่ใน 8 วินาทีสุดท้าย' });
      for (const tr of tl.trans) if (Math.abs(tr.t - tl.cta.t) < 4) out.push({ level: 'warn', msg: 'ทรานซิชันใหญ่ใกล้ CTA เกิน 4 วินาที' });
    }
    // transitions
    const types = tl.trans.map((t) => t.type);
    if (new Set(types).size !== types.length) out.push({ level: 'warn', msg: 'ทรานซิชันใหญ่ซ้ำแบบกัน' });
    if (tl.trans.some((t) => t.t < 3)) out.push({ level: 'warn', msg: 'ทรานซิชันใหญ่อยู่ใน 3 วินาทีแรก' });
    if (tl.trans.length < 2 || tl.trans.length > 3) out.push({ level: 'info', msg: `มีทรานซิชันใหญ่ ${tl.trans.length} จุด (แนะนำ 2–3)` });
    out.push(...T.captionIssues(tl));
    if (tl.L < 38 || tl.L > 62) out.push({ level: 'warn', msg: `ความยาวคลิป ${tl.L.toFixed(1)} วินาที (เป้าหมาย 40–60)` });
    return out;
  };

  // evaluate an actor/prop track at time t (circular)
  T.trackAt = function (tr, t, L) {
    const vis = tr.vis.some(([a, b]) => t >= a - 1e-6 && t < b - 1e-6);
    if (!vis || !tr.keys.length) return null;
    const ks = tr.pos || (tr.pos = tr.keys.filter((k) => !k.dirOnly)); let k0 = null, k1 = null;
    if (!ks.length) return null;
    for (let i = 0; i < ks.length; i++) if (ks[i].t <= t + 1e-9) k0 = ks[i];
    if (!k0) k0 = ks[ks.length - 1];
    const idx = ks.indexOf(k0); k1 = ks[(idx + 1) % ks.length];
    let x = k0.x, y = k0.y;
    // interpolate only inside the same row span (cuts are hard), or across the loop seam
    const t1 = k1.t <= k0.t ? k1.t + L : k1.t;
    const sameRow = k1.row === k0.row || (k1.t <= k0.t && k1.row === 0);
    if (sameRow && t1 > k0.t) { const f = LSE.clamp((t - k0.t) / (t1 - k0.t), 0, 1); x = LSE.lerp(k0.x, k1.x, f); y = LSE.lerp(k0.y, k1.y, f); }
    let dir = k0.dir; // a cue can turn the actor on a word
    if (tr.keys.length !== ks.length) for (const k of tr.keys) if (k.dirOnly && k.row === k0.row && k.t <= t + 1e-9) dir = k.dir;
    return { x, y, dir, scale: k0.scale || 1, motion: k0.motion, row: k0.row, k0, k1 };
  };
  // which animation frame for an actor at t
  T.actAt = function (tr, t, L, beat) {
    const s16 = beat / 4;
    let shot = null; // most recent one-shot (circular)
    for (const a of tr.acts) if (a.anim) { let dt = t - a.t; if (dt < 0) dt += L; const span = a.hold ? Math.max(a.frames * s16, (a.until - a.t)) : a.frames * s16 + s16 * 2; if (dt < span && (!shot || dt < shot.dt)) shot = { a, dt }; }
    const flyNow = tr.acts.some((a) => !a.anim && a.base === 'fly' && t >= a.t0 && t < a.t1); // a hit or a wave in mid-air stays in the air
    if (shot) { const f = shot.a.still ? shot.a.frames - 1 : Math.min(shot.a.frames - 1, LSE.tick(shot.dt, s16)); return { anim: shot.a.anim, frame: f, fly: flyNow }; } // still: already in the end pose (stays lying across shots)
    let base = 'idle', moving = false;
    for (const a of tr.acts) if (!a.anim && t >= a.t0 && t < a.t1) { base = a.base; moving = a.base !== 'idle' && a.base !== 'combat' && t < a.moveT1; }
    if (!moving && (base === 'walk' || base === 'run')) base = 'idle';
    const cyc = LSE.LPC.CYCLES[base === 'fly' ? 'idle' : base] || LSE.LPC.CYCLES.idle;
    const step = base === 'idle' || base === 'combat' ? beat / 2 : s16;
    const f = cyc[LSE.tick(t, step) % cyc.length];
    return { anim: base === 'fly' ? 'idle' : base, frame: f, fly: base === 'fly' };
  };
})(typeof window !== 'undefined' ? window : globalThis);
