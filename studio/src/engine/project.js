// Runtime assembly (cast composites, scenes, timeline, audio stems), the looping player, and MP4/WebM export.
(function (G) {
  const LSE = G.LSE;
  const A = LSE.Audio;

  LSE.buildRuntime = async function (P, opts) {
    await A.loadSfxLibrary(); // recorded effects (slap, shriek, bus, traffic …) are known before the timeline places them
    opts = opts || {}; const prog = opts.onProgress || (() => {});
    await LSE.LPC.load();
    const palette = P.palette && P.palette.length ? P.palette : LSE.DEFAULT_PALETTE;
    const snap = LSE.makeSnapper(palette); snap.id = 'pal' + LSE.hash(palette.join());
    const cast = {}; const lib = {};
    for (const c of P.cast || []) lib[c.id] = c;
    let n = 0;
    for (const c of P.cast || []) {
      prog('ประกอบตัวละคร ' + (c.name || c.id), ++n / ((P.cast || []).length + (P.scenes || []).length + 2));
      cast[c.id] = await LSE.buildCastEntry(c, palette, snap);
    }
    const scenes = {};
    for (const s of P.scenes || []) { prog('วาดฉาก ' + (s.name || s.id), ++n / ((P.cast || []).length + (P.scenes || []).length + 2)); scenes[s.id] = LSE.Scene.build(Object.assign({ id: s.id, name: s.name }, s.spec || {}), { palette, resolve: (ref) => lib[ref] && lib[ref].map }); }
    // voice clock
    let voiceInfo = null;
    if (P.voice && P.voice.sentences && P.voice.sentences.length) {
      const off = 0.05; const dur = P.voice.dur || P.voice.sentences[P.voice.sentences.length - 1].t1;
      const chars = ((P.beats && P.beats.rows) || []).reduce((a, r) => a + [...String(r.voice || '').replace(/\s/g, '')].length, 0);
      const clock = A.fitClockVoice(dur + off, P.voice.sentences.map((s) => s.t0 + off), chars / Math.max(1, dur)); // tempo matched to the speech
      voiceInfo = { clock, sentences: P.voice.sentences.map((s) => ({ t0: s.t0 + off, t1: s.t1 + off, words: (s.words || []).map((w) => ({ text: w.text, start: w.start + off, end: w.end + off })) })), off };
    }
    const timeline = LSE.Timeline.compile(Object.assign({ title: P.title }, P.beats), voiceInfo, (P.cast || []).map((c) => ({ id: c.id })));
    prog('แต่งเพลงและเสียงประกอบ', 0.9);
    const stems = LSE.buildStems(timeline, P.voice, voiceInfo);
    const renderer = new LSE.Renderer({ timeline, scenes, cast, palette, snap, title: P.title, titleOn: P.titleOn, watermark: P.watermark, captionColors: P.captionColors, captionSize: P.captionSize, ctaColor: P.ctaColor, captionFont: P.captionFont }, { scale: opts.scale || 2 });
    prog('พร้อม', 1);
    return { timeline, scenes, cast, renderer, stems, palette };
  };

  LSE.buildCastEntry = async function (c, palette, snap) {
    if (!snap) { snap = LSE.makeSnapper(palette || LSE.DEFAULT_PALETTE); snap.id = 'pal' + LSE.hash((palette || []).join()); }
    if (c.kind === 'char' && c.recipe && c.type !== 'creature') {
      const comp = await LSE.LPC.composite(c.recipe, { palette });
      return { kind: 'char', comp, scale: c.scale || 1, aura: c.aura || null };
    }
    if (c.frames && (c.frames.idle || c.frames.action)) {
      const mk = (arr) => (arr || []).filter((m) => !LSE.Pixel.validate(m)).map((m) => LSE.Pixel.bitmap(m, snap));
      const seq = (bms, order) => (Array.isArray(order) && bms.length ? order.map((i) => bms[i % bms.length]) : bms); // idleSeq/actionSeq replay stored frames (big creatures stay small in the db)
      return { kind: 'creature', frames: { idle: seq(mk(c.frames.idle), c.frames.idleSeq), action: seq(mk(c.frames.action), c.frames.actionSeq) }, facing: c.facing || 'e', scale: c.scale || 1 };
    }
    if (c.map && !LSE.Pixel.validate(c.map)) return { kind: 'prop', bitmap: LSE.Pixel.bitmap(c.map, snap), scale: c.scale || 1, facing: c.facing || null };
    return { kind: 'prop', bitmap: null };
  };

  // stems: music (pre-ducked), sfx, voice (mono placed on the loop) — all equal length, loop-ready
  LSE.buildStems = function (tl, voice, voiceInfo) {
    const plan = { bpm: tl.bpm, bars: tl.bars, key: tl.key, scale: tl.scale, sections: tl.sections, seed: LSE.hash(tl.title || 'x'), segs: tl.span.map((s, i) => ({ t: i && voiceInfo && voiceInfo.sentences[i] ? voiceInfo.sentences[i].t0 : s.t0, mood: tl.rows[i].__mood || tl.rows[i].music })) };
    // with a narration the music follows its sentences
    const music = voice && voice.pcm ? A.renderMusicVoice(plan) : A.renderMusic(plan); const N = music[0].length;
    A.peq(music, 220, 0.8, -6); A.peq(music, 2800, 1.2, -2.5); // leave room for the narrator (body + presence band)
    // accents (hits, ting, slams) stay clear; textures (steps, glints…) sit far under the voice
    const acc = A.renderSfx(tl.sfx, plan, 'acc'), tex = A.renderSfx(tl.sfx, plan, 'tex'), hero = A.renderSfx(tl.sfx, plan, 'hero');
    { let pk = 0; for (const c of hero) for (let i = 0; i < c.length; i++) pk = Math.max(pk, Math.abs(c[i])); if (pk > 0) A.gain(hero, 0.7 / pk); } // big gag hits peak about 4 dB under full scale
    let vbuf = null; let vL = -15;
    if (voice && voice.pcm) {
      vbuf = new Float32Array(N); const pcm = voice.sr === A.SR ? voice.pcm : A.resample(voice.pcm, voice.sr, A.SR);
      const off = Math.round((voiceInfo ? voiceInfo.off : 0.05) * A.SR);
      for (let i = 0; i < pcm.length && i + off < N; i++) vbuf[i + off] = pcm[i];
      vL = A.lufs([vbuf], A.SR);
      if (!(vL > -40)) vL = -15;
    }
    const mL = A.lufs(music, A.SR); const targetM = vL - 1; // ducked by 0.38 (-8.4 dB) => melody stays audible ~9 dB under the voice
    A.gain(music, Math.pow(10, (targetM - mL) / 20));
    const aL = A.lufs(acc, A.SR); if (aL > -60) A.gain(acc, Math.pow(10, ((vL - 6.5) - aL) / 20));
    const xL = A.lufs(tex, A.SR); if (xL > -60) A.gain(tex, Math.pow(10, ((vL - 11.5) - xL) / 20));
    const regions = voiceInfo ? voiceInfo.sentences.map((s) => ({ t0: s.t0, t1: s.t1 })) : (tl.span || []).map((s) => ({ t0: s.t0 + 0.05, t1: s.t1 - 0.4 }));
    const speaking = voice && voice.pcm ? regions : [];
    const duck = A.duckEnv(N, speaking, 0.38), duckS = A.duckEnv(N, speaking, 0.68), duckT = A.duckEnv(N, speaking, 0.42);
    const sfx = [new Float32Array(N), new Float32Array(N)];
    for (let i = 0; i < N; i++) { music[0][i] *= duck[i]; music[1][i] *= duck[i]; sfx[0][i] = acc[0][i] * duckS[i] + tex[0][i] * duckT[i] + hero[0][i]; sfx[1][i] = acc[1][i] * duckS[i] + tex[1][i] * duckT[i] + hero[1][i]; }
    const meter = { voice: vL, musicDucked: A.lufs(music, A.SR), sfx: A.lufs(sfx, A.SR) };
    return { music, sfx, voice: vbuf, N, L: tl.L, meter };
  };

  // ---------------- Player ----------------
  class Player {
    constructor(canvas, rt, opts) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
      this.once = !!(opts && opts.once); this.onEnd = null; // once: plays to the end and calls onEnd (Long chapters) instead of looping
      this.rt = rt; this.t = 0; this.playing = false; this.mutes = { music: false, sfx: false, voice: false }; this.onTime = null;
      this.draw(0);
    }
    setRuntime(rt) { const was = this.playing; this.stop(); this.rt = rt; this.bufs = null; this.t = 0; this.draw(0); if (was) this.play(); }
    ensureAudio() {
      if (!this.ac) { const AC = G.AudioContext || G.webkitAudioContext; try { this.ac = new AC({ sampleRate: A.SR }); } catch (e) { this.ac = new AC(); } }
      if (!this.bufs) {
        const st = this.rt.stems; const mk = (chs) => { const b = this.ac.createBuffer(chs.length, chs[0].length, A.SR); chs.forEach((c, i) => b.copyToChannel(c, i)); return b; };
        this.bufs = { music: mk(st.music), sfx: mk(st.sfx), voice: st.voice ? mk([st.voice]) : null };
        this.gains = {}; for (const k of ['music', 'sfx', 'voice']) { const g = this.ac.createGain(); g.connect(this.ac.destination); g.gain.value = this.mutes[k] ? 0 : 1; this.gains[k] = g; }
      }
    }
    play() {
      if (this.playing || !this.rt) return; this.ensureAudio(); this.ac.resume && this.ac.resume();
      const L = this.rt.timeline.L; const when = this.ac.currentTime + 0.05; this.srcs = [];
      for (const k of ['music', 'sfx', 'voice']) { const b = this.bufs[k]; if (!b) continue; const s = this.ac.createBufferSource(); s.buffer = b; s.loop = !this.once; s.loopStart = 0; s.loopEnd = b.duration; s.connect(this.gains[k]); s.start(when, this.t % L); this.srcs.push(s); }
      this.t0 = when - this.t; this.playing = true; this.loop();
    }
    stop() { if (!this.playing) return; this.t = this.now(); for (const s of this.srcs || []) try { s.stop(); } catch (e) { /* already stopped */ } this.srcs = []; this.playing = false; cancelAnimationFrame(this.raf); }
    toggle() { this.playing ? this.stop() : this.play(); }
    now() { if (!this.playing) return this.t; const L = this.rt.timeline.L; const e = this.ac.currentTime - this.t0; return this.once ? Math.min(Math.max(0, e), L - 1 / 60) : ((e % L) + L) % L; }
    seek(t) { const was = this.playing; this.stop(); this.t = t; this.draw(t); if (was) this.play(); }
    mute(k, on) { this.mutes[k] = on; if (this.gains) this.gains[k].gain.value = on ? 0 : 1; }
    loop() { this.raf = requestAnimationFrame(() => { if (!this.playing) return; if (this.once && this.ac.currentTime - this.t0 >= this.rt.timeline.L) { this.stop(); this.t = 0; if (this.onEnd) this.onEnd(); return; } this.draw(this.now()); this.loop(); }); }
    draw(t) {
      if (!this.rt) return; const f = this.rt.renderer.frame(t);
      this.ctx.imageSmoothingEnabled = false; this.ctx.drawImage(f, 0, 0, this.cv.width, this.cv.height);
      if (this.onTime) this.onTime(t);
    }
  }
  LSE.Player = Player;

  // ---------------- Export (WebCodecs) ----------------
  LSE.exportSupport = async function () {
    const out = { video: null, audio: null, container: null };
    if (typeof G.VideoEncoder === 'undefined') return out;
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42E028']) { try { const s = await VideoEncoder.isConfigSupported({ codec, width: 1080, height: 1920, bitrate: 8e6, framerate: 30 }); if (s.supported) { out.video = codec; out.container = 'mp4'; break; } } catch (e) { /* try next */ } }
    if (!out.video) { try { const s = await VideoEncoder.isConfigSupported({ codec: 'vp09.00.40.08', width: 1080, height: 1920, bitrate: 8e6, framerate: 30 }); if (s.supported) { out.video = 'vp09.00.40.08'; out.container = 'webm'; } } catch (e) { /* none */ } }
    if (typeof G.AudioEncoder !== 'undefined') {
      if (out.container === 'mp4') { try { const s = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 }); if (s.supported) out.audio = 'aac'; } catch (e) { /* fall back */ } }
      if (!out.audio) { try { const s = await AudioEncoder.isConfigSupported({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 }); if (s.supported) out.audio = 'opus'; } catch (e) { /* none */ } }
    }
    return out;
  };

  LSE.exportVideo = (rt, onProgress, signal, opts) => LSE.exportSequence(1, async () => rt, onProgress, signal, opts);
  // n runtimes back to back in one file (a Long video = its chapters); getRt(k) builds each one only when it is encoded
  LSE.exportSequence = async function (n, getRt, onProgress, signal, opts) {
    opts = opts || {};
    const sup = await LSE.exportSupport();
    if (!sup.video) throw new Error('เบราว์เซอร์นี้เข้ารหัสวิดีโอไม่ได้ (ไม่มี WebCodecs)');
    const W = 1080, H = 1920, FPS = 30, SR = 48000;
    const useMp4 = sup.container === 'mp4';
    const Mux = useMp4 ? G.Mp4Muxer : G.WebMMuxer; if (!Mux) throw new Error('โหลดตัวรวมไฟล์วิดีโอไม่สำเร็จ');
    const target = new Mux.ArrayBufferTarget();
    const muxer = useMp4
      ? new Mux.Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: sup.audio ? { codec: sup.audio === 'aac' ? 'aac' : 'opus', sampleRate: SR, numberOfChannels: 2 } : undefined, fastStart: 'in-memory' })
      : new Mux.Muxer({ target, video: { codec: 'V_VP9', width: W, height: H, frameRate: FPS }, audio: sup.audio ? { codec: 'A_OPUS', sampleRate: SR, numberOfChannels: 2 } : undefined });
    let err = null;
    const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = e; } });
    ve.configure({ codec: sup.video, width: W, height: H, bitrate: opts.bitrate || 8e6, framerate: FPS, latencyMode: 'quality' });
    const ae = sup.audio ? new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { err = e; } }) : null;
    if (ae) ae.configure({ codec: sup.audio === 'aac' ? 'mp4a.40.2' : 'opus', sampleRate: SR, numberOfChannels: 2, bitrate: 160000 });
    const big = LSE.canvas(W, H);
    let f0 = 0; // frames written before this segment; video and audio of every segment start at f0 / FPS
    for (let k = 0; k < n; k++) {
      const seg = (x) => (k + x) / n; const tag = n > 1 ? `ตอน ${k + 1}/${n} · ` : '';
      onProgress && onProgress(seg(0), tag + 'เตรียมภาพและเสียง');
      const rt = await getRt(k); const frames = Math.round(rt.timeline.L * FPS);
      for (let i = 0; i < frames; i++) {
        if (signal && signal.aborted) throw new Error('ยกเลิกแล้ว');
        if (err) throw err;
        const f = rt.renderer.frame(i / FPS); let src = f;
        if (f.width !== W) { big.ctx.imageSmoothingEnabled = false; big.ctx.drawImage(f, 0, 0, W, H); src = big.c; }
        const gi = f0 + i;
        const vf = new VideoFrame(src, { timestamp: Math.round(gi * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        ve.encode(vf, { keyFrame: gi % 60 === 0 }); vf.close();
        if (ve.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
        if (i % 10 === 0) { onProgress && onProgress(seg(i / frames * 0.9), `${tag}เรนเดอร์ภาพ ${i}/${frames}`); await new Promise((r) => setTimeout(r, 0)); }
      }
      if (ae) {
        onProgress && onProgress(seg(0.92), tag + 'เข้ารหัสเสียง');
        const mix = A.mix(rt.stems, {}); const N = Math.round(frames / FPS * SR); const a0 = Math.round(f0 / FPS * SR); const chunk = 4800;
        for (let s = 0; s < N; s += chunk) {
          const m = Math.min(chunk, N - s); const data = new Float32Array(m * 2);
          data.set(mix[0].subarray(s, Math.min(s + m, mix[0].length)), 0); data.set(mix[1].subarray(s, Math.min(s + m, mix[1].length)), m);
          const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round((a0 + s) * 1e6 / SR), data });
          ae.encode(ad); ad.close();
        }
      }
      f0 += frames;
    }
    await ve.flush(); if (ae) await ae.flush();
    if (err) throw err;
    muxer.finalize();
    onProgress && onProgress(1, 'เสร็จแล้ว');
    return { blob: new Blob([target.buffer], { type: useMp4 ? 'video/mp4' : 'video/webm' }), ext: useMp4 ? 'mp4' : 'webm', sup, seconds: f0 / FPS };
  };
})(typeof window !== 'undefined' ? window : globalThis);
