// Pure-JS DSP: looped music by mood, SFX on the beat grid, voice ducking, loudness. No Web Audio scheduling.
(function (G) {
  const LSE = G.LSE;
  const A = (LSE.Audio = { SR: 48000 });
  const TAU = Math.PI * 2;
  const SCALES = A.SCALES = {
    hijaz: [0, 1, 4, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10], harmonic_minor: [0, 2, 3, 5, 7, 8, 11], pent_minor: [0, 3, 5, 7, 10],
    ionian: [0, 2, 4, 5, 7, 9, 11], thai_pent: [0, 2, 4, 7, 9], insen: [0, 1, 5, 7, 10],
  };
  const KEYS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  A.MOODS = ['mysterious', 'tense', 'epic', 'sad', 'triumphant'];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  A.loopLength = (bpm, bars) => bars * 4 * 60 / bpm;
  A.fitClock = function (voiceDur, lo, hi, bpmHint) { // choose bpm/bars so L = whole bars just after the voice
    lo = lo || 100; hi = hi || 128; const tail = 0.35;
    let best = null;
    for (let bars = 8; bars <= 40; bars++) {
      const bpm = bars * 240 / (voiceDur + tail);
      if (bpm < lo || bpm > hi) continue;
      const score = Math.abs(bpm - (bpmHint || 112));
      if (!best || score < best.score) best = { bars, bpm: Math.round(bpm * 1000) / 1000, score };
    }
    if (!best) { const bpm = bpmHint || 112; const bars = Math.ceil((voiceDur + tail) * bpm / 240); best = { bars, bpm }; }
    best.L = A.loopLength(best.bpm, best.bars);
    return best;
  };

  function Buf(n) { return [new Float32Array(n), new Float32Array(n)]; }
  function addMono(buf, start, sig, pan, gain) { // circular add
    const n = buf[0].length; const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
    let i0 = Math.round(start) % n; if (i0 < 0) i0 += n;
    for (let k = 0; k < sig.length; k++) { const i = (i0 + k) % n; buf[0][i] += sig[k] * gl; buf[1][i] += sig[k] * gr; }
  }
  // ---- instruments (return Float32Array mono) ----
  const SR = () => A.SR;
  function env(n, a, d, s, r, len) { // ADSR in seconds; len = gate seconds
    const sr = SR(); const e = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; let v; if (t < a) v = t / a; else if (t < a + d) v = 1 - (1 - s) * (t - a) / d; else if (t < len) v = s; else v = s * Math.exp(-(t - len) / Math.max(0.01, r)); e[i] = v; }
    return e;
  }
  const I = A.inst = {};
  I.kick = (vel) => { const sr = SR(), n = (0.45 * sr) | 0, o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; const f = 45 + 95 * Math.exp(-t * 28); ph += TAU * f / sr; o[i] = Math.sin(ph) * Math.exp(-t * 7) * vel + (i < 40 ? (Math.random() - 0.5) * 0.3 * vel : 0); } return o; };
  I.taiko = (vel) => { const sr = SR(), n = (0.7 * sr) | 0, o = new Float32Array(n); let ph = 0, lp = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (70 + 40 * Math.exp(-t * 12)) / sr; lp += 0.08 * ((Math.random() * 2 - 1) - lp); o[i] = (Math.sin(ph) * 0.9 + lp * 0.6 * Math.exp(-t * 18)) * Math.exp(-t * 5) * vel; } return o; };
  I.snare = (vel) => { const sr = SR(), n = (0.25 * sr) | 0, o = new Float32Array(n); let hp = 0, prev = 0; for (let i = 0; i < n; i++) { const t = i / sr; const w = Math.random() * 2 - 1; hp = 0.85 * (hp + w - prev); prev = w; o[i] = (hp * 0.6 * Math.exp(-t * 18) + Math.sin(TAU * 185 * t) * 0.4 * Math.exp(-t * 30)) * vel; } return o; };
  I.hat = (vel, open) => { const sr = SR(), n = ((open ? 0.18 : 0.05) * sr) | 0, o = new Float32Array(n); let hp = 0, prev = 0; for (let i = 0; i < n; i++) { const t = i / sr; const w = Math.random() * 2 - 1; hp = 0.6 * (hp + w - prev); prev = w; o[i] = hp * Math.exp(-t * (open ? 18 : 70)) * vel * 0.5; } return o; };
  I.shaker = (vel) => { const sr = SR(), n = (0.07 * sr) | 0, o = new Float32Array(n); let hp = 0, prev = 0; for (let i = 0; i < n; i++) { const t = i / sr; const w = Math.random() * 2 - 1; hp = 0.7 * (hp + w - prev); prev = w; const e = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 60); o[i] = hp * e * vel * 0.35; } return o; };
  I.bass = (m, dur, vel) => { const sr = SR(), f = mtof(m), n = ((dur + 0.08) * sr) | 0, o = new Float32Array(n), e = env(n, 0.005, 0.12, 0.6, 0.06, dur); let ph = 0, lp = 0; for (let i = 0; i < n; i++) { ph += f / sr; const saw = 2 * (ph % 1) - 1; const sq = (ph % 1) < 0.5 ? 1 : -1; const x = saw * 0.6 + sq * 0.4; const cut = 0.05 + 0.12 * e[i]; lp += cut * (x - lp); o[i] = (lp + Math.sin(TAU * ph) * 0.5) * e[i] * vel; } return o; };
  I.pad = (ms, dur, vel) => { const sr = SR(), n = ((dur + 0.8) * sr) | 0, o = new Float32Array(n), e = env(n, 0.6, 0.4, 0.8, 0.7, dur); const phs = []; for (const m of ms) for (const dt of [-0.07, 0.07]) phs.push({ f: mtof(m) * Math.pow(2, dt / 12), p: Math.random() }); let lp = 0; for (let i = 0; i < n; i++) { let x = 0; for (const p of phs) { p.p += p.f / sr; x += 2 * (p.p % 1) - 1; } x /= phs.length; lp += 0.035 * (x - lp); o[i] = lp * e[i] * vel * 1.6; } return o; };
  I.pluck = (m, vel, bright) => { // Karplus-Strong (oud / harp / koto colour)
    const sr = SR(), f = mtof(m), n = (1.4 * sr) | 0, o = new Float32Array(n); const L = Math.max(2, Math.round(sr / f)); const b = new Float32Array(L);
    for (let i = 0; i < L; i++) b[i] = (Math.random() * 2 - 1) * (bright || 0.8);
    let idx = 0; const damp = 0.996;
    for (let i = 0; i < n; i++) { const nx = (idx + 1) % L; const v = (b[idx] + b[nx]) * 0.5 * damp; o[i] = b[idx] * vel; b[idx] = v; idx = nx; }
    return o;
  };
  I.lead = (m, dur, vel) => { const sr = SR(), f = mtof(m), n = ((dur + 0.15) * sr) | 0, o = new Float32Array(n), e = env(n, 0.02, 0.1, 0.7, 0.12, dur); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; const vib = 1 + 0.006 * Math.sin(TAU * 5.5 * t) * Math.min(1, t * 3); ph += f * vib / sr; const tri = 1 - 4 * Math.abs((ph % 1) - 0.5); const sq = (ph % 1) < 0.5 ? 0.5 : -0.5; o[i] = (tri * 0.7 + sq * 0.25) * e[i] * vel; } return o; };
  I.drone = (m, dur, vel) => { const sr = SR(), n = ((dur + 0.5) * sr) | 0, o = new Float32Array(n), e = env(n, 0.5, 0.1, 1, 0.5, dur); const f1 = mtof(m), f2 = mtof(m + 7); for (let i = 0; i < n; i++) { const t = i / sr; o[i] = (Math.sin(TAU * f1 * t) * 0.6 + Math.sin(TAU * f2 * t) * 0.3 + Math.sin(TAU * f1 * 2 * t) * 0.1) * e[i] * vel; } return o; };
  I.riser = (dur, vel) => { const sr = SR(), n = (dur * sr) | 0, o = new Float32Array(n); let hp = 0, prev = 0; for (let i = 0; i < n; i++) { const t = i / n; const w = Math.random() * 2 - 1; const k = 0.2 + 0.75 * t; hp = k * (hp + w - prev); prev = w; o[i] = hp * t * t * vel * 0.5; } return o; };

  // soft flute: sine + a little 2nd harmonic, breath noise, delayed vibrato
  I.flute = (m, dur, vel) => { const sr = SR(), f = mtof(m), n = ((dur + 0.25) * sr) | 0, o = new Float32Array(n), e = env(n, 0.06, 0.15, 0.8, 0.2, dur); let ph = 0, lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; const vib = 1 + (t > 0.18 ? 0.009 * Math.sin(TAU * 5.2 * t) : 0); ph += f * vib / sr; lp += 0.12 * ((Math.random() * 2 - 1) - lp); o[i] = (Math.sin(TAU * ph) + 0.18 * Math.sin(2 * TAU * ph) + 0.06 * Math.sin(3 * TAU * ph) + lp * 0.12) * e[i] * vel; } return o; };
  // ranat (Thai xylophone): bright wooden mallet, slightly inharmonic overtones
  I.ranat = (m, vel) => { const sr = SR(), f = mtof(m), n = (0.9 * sr) | 0, o = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; o[i] = (Math.sin(TAU * f * t) * Math.exp(-t * 7) + 0.45 * Math.sin(TAU * f * 3.9 * t) * Math.exp(-t * 22) + 0.2 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t * 45) + (i < 90 ? (Math.random() - 0.5) * 0.5 * (1 - i / 90) : 0)) * vel; } return o; };
  I.musicbox = (m, vel) => { const sr = SR(), f = mtof(m), n = (1.2 * sr) | 0, o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; o[i] = (Math.sin(TAU * f * t) * Math.exp(-t * 3.5) + 0.3 * Math.sin(TAU * f * 3 * t) * Math.exp(-t * 9) + 0.12 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 16)) * vel; } return o; };
  // ching (small Thai cymbals): open "ching" or damped "chap"
  I.ching = (vel, damped) => { const sr = SR(), n = ((damped ? 0.08 : 0.6) * sr) | 0, o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; let x = 0; for (const fr of [3150, 4720, 6210, 7980]) x += Math.sin(TAU * fr * t); o[i] = x * 0.25 * Math.exp(-t * (damped ? 60 : 6)) * vel; } return o; };
  // ---- warm "chill" kit: electric piano, marimba, round bass, soft drums (no bright metals) ----
  I.ep = (ms, dur, vel) => { const sr = SR(), n = ((dur + 0.6) * sr) | 0, o = new Float32Array(n), e = env(n, 0.008, 0.6, 0.45, 0.5, dur);
    const fs = ms.map((m) => mtof(m)); for (let i = 0; i < n; i++) { const t = i / sr; const trem = 0.85 + 0.15 * Math.sin(TAU * 4.2 * t); let x = 0;
      for (const f of fs) x += Math.sin(TAU * f * t) + 0.22 * Math.sin(TAU * f * 2 * t) * Math.exp(-t * 3) + 0.08 * Math.sin(TAU * f * 7 * t) * Math.exp(-t * 18); o[i] = x / fs.length * e[i] * trem * vel; } return o; };
  I.marimba = (m, vel) => { const sr = SR(), f = mtof(m), n = (0.8 * sr) | 0, o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; o[i] = (Math.sin(TAU * f * t) * Math.exp(-t * 6) + 0.25 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 30)) * vel; } return o; };
  I.sub = (m, dur, vel) => { const sr = SR(), f = mtof(m), n = ((dur + 0.1) * sr) | 0, o = new Float32Array(n), e = env(n, 0.01, 0.2, 0.7, 0.08, dur); for (let i = 0; i < n; i++) { const t = i / sr; const x = Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t); o[i] = Math.tanh(x * 1.4) * 0.8 * e[i] * vel; } return o; };
  I.softkick = (vel) => { const sr = SR(), n = (0.35 * sr) | 0, o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (48 + 60 * Math.exp(-t * 30)) / sr; o[i] = Math.sin(ph) * Math.exp(-t * 9) * vel; } return o; };
  I.rim = (vel) => { const sr = SR(), n = (0.12 * sr) | 0, o = new Float32Array(n); let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr; lp += 0.35 * ((Math.random() * 2 - 1) - lp); o[i] = (Math.sin(TAU * 820 * t) * 0.5 + lp * 0.6) * Math.exp(-t * 45) * vel; } return o; };
  I.brush = (vel) => { const sr = SR(), n = (0.09 * sr) | 0, o = new Float32Array(n); let lp = 0, lp2 = 0; for (let i = 0; i < n; i++) { const t = i / sr; lp += 0.25 * ((Math.random() * 2 - 1) - lp); lp2 += 0.25 * (lp - lp2); const e = t < 0.015 ? t / 0.015 : Math.exp(-(t - 0.015) * 40); o[i] = lp2 * e * vel * 1.6; } return o; };
  // ---- reverb (Schroeder), circular: run twice so the tail wraps into bar 1 ----
  function reverbCircular(inp, mix) {
    const n = inp.length, sr = SR(); const out = new Float32Array(n);
    const combs = [1557, 1617, 1491, 1422].map((d) => ({ b: new Float32Array(Math.round(d * sr / 44100)), i: 0, fb: 0.8 }));
    const aps = [225, 556].map((d) => ({ b: new Float32Array(Math.round(d * sr / 44100)), i: 0 }));
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < n; k++) {
      const x = inp[k] * 0.25; let y = 0;
      for (const c of combs) { const v = c.b[c.i]; c.b[c.i] = x + v * c.fb; c.i = (c.i + 1) % c.b.length; y += v; }
      for (const a of aps) { const v = a.b[a.i]; const w = y + v * 0.5; a.b[a.i] = w; a.i = (a.i + 1) % a.b.length; y = v - w * 0.5; }
      if (pass === 1) out[k] = y * mix;
    }
    return out;
  }

  // ---- music ----
  // plan: {bpm, bars, key:'D', scale:'hijaz', sections:[{bar, mood}], seed}
  A.renderMusic = function (plan) {
    const sr = SR(); const bpm = plan.bpm; const beat = 60 / bpm; const bars = plan.bars;
    const N = Math.round(A.loopLength(bpm, bars) * sr);
    const dry = Buf(N), wet = new Float32Array(N);
    const root = 36 + (KEYS[plan.key] ?? 2); const sc = SCALES[plan.scale] || SCALES.aeolian;
    const deg = (d, oct) => { const len = sc.length; const o = Math.floor(d / len); return root + sc[((d % len) + len) % len] + 12 * (o + (oct || 0)); };
    const chord = (d, oct) => [deg(d, oct), deg(d + 2, oct), deg(d + 4, oct)];
    const rnd = LSE.rng(plan.seed || 7);
    const PROG = { mysterious: [0, 0, 5, 1], tense: [0, 1, 0, 1], epic: [0, 5, 3, 4], sad: [0, 5, 2, 6], triumphant: [5, 6, 0, 0] };
    const sections = (plan.sections && plan.sections.length ? plan.sections : [{ bar: 0, mood: 'mysterious' }]).slice().sort((a, b) => a.bar - b.bar);
    const moodAt = (bar) => { let m = sections[0].mood; for (const s of sections) if (bar >= s.bar) m = s.mood; return A.MOODS.includes(m) ? m : 'mysterious'; };
    // motif (2 bars of 8th notes), seeded
    const motif = []; for (let i = 0; i < 16; i++) motif.push(rnd() < 0.62 ? [0, 2, 4, 1, 3, 5, 7][(rnd() * 7) | 0] + (rnd() < 0.2 ? 7 : 0) : null);
    const at = (bar, b16) => (bar * 16 + b16) * beat / 4 * sr;
    const thai = plan.scale === 'thai_pent' || plan.scale === 'insen';
    const RHY = { mysterious: [[[0, 4], [6, 2], [8, 6], [14, 2]], [[0, 2], [4, 4], [8, 4], [12, 4]]], tense: [[[0, 2], [2, 2], [4, 1], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]], [[0, 3], [3, 1], [4, 2], [8, 3], [11, 1], [12, 4]]],
      sad: [[[0, 6], [6, 2], [8, 8]], [[0, 4], [4, 4], [8, 6], [14, 2]]], epic: [[[0, 3], [3, 1], [4, 4], [8, 3], [11, 1], [12, 4]], [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]]], triumphant: [[[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]], [[0, 4], [4, 2], [6, 2], [8, 8]]] };
    const TIMBRE = { mysterious: 'musicbox', tense: 'pluck', sad: 'flute', epic: 'lead', triumphant: 'lead' };
    const MOT = []; for (let i = 0; i < 24; i++) MOT.push((rnd() * 6) | 0); const mel = { prev: 0 };
    for (let bar = 0; bar < bars; bar++) {
      const mood = moodAt(bar); const pd = PROG[mood][bar % 4]; const last = bar === bars - 1;
      const nextMood = moodAt(bar + 1);
      // pulse: never stops
      const K = { mysterious: [0, 8], tense: [0, 4, 8, 12], epic: [0, 6, 8, 14], sad: [0], triumphant: [0, 4, 8, 12] }[mood];
      for (const s of K) addMono(dry, at(bar, s), mood === 'epic' ? I.taiko(0.9) : I.kick(mood === 'mysterious' || mood === 'sad' ? 0.55 : 0.8), 0, 0.9);
      if (mood === 'epic' || mood === 'triumphant') for (const s of [4, 12]) addMono(dry, at(bar, s), I.snare(0.7), 0.1, 0.8);
      if (mood === 'tense' || mood === 'triumphant') for (let s = 0; s < 16; s += mood === 'tense' ? 1 : 2) addMono(dry, at(bar, s), I.hat(s % 4 === 2 ? 0.6 : 0.35), 0.3, 0.6);
      if (mood === 'mysterious' || mood === 'sad' || mood === 'epic') for (let s = 2; s < 16; s += 4) addMono(dry, at(bar, s), I.shaker(0.7), -0.3, 0.7);
      // bass
      if (mood === 'tense') for (let s = 0; s < 16; s += 2) addMono(dry, at(bar, s), I.bass(deg(pd + (s % 8 === 6 ? 1 : 0), 0), beat / 2 * 0.9, 0.5), 0, 0.8);
      else if (mood === 'epic' || mood === 'triumphant') for (let s = 0; s < 16; s += 2) addMono(dry, at(bar, s), I.bass(deg(pd, 0), beat / 2 * 0.8, 0.5), 0, 0.8);
      else addMono(dry, at(bar, 0), I.bass(deg(pd, 0), beat * 3.6, 0.45), 0, 0.8);
      // pad / drone
      const pad = I.pad(chord(pd, 2), beat * 4, mood === 'sad' ? 0.5 : 0.38);
      addMono(dry, at(bar, 0), pad, -0.2, 0.55); addWet(at(bar, 0), pad, 0.5);
      if (mood === 'mysterious' || mood === 'tense') addMono(dry, at(bar, 0), I.drone(root + 12, beat * 4, 0.18), 0.15, 0.6);
      // arp / pluck
      const arpStep = mood === 'sad' ? 4 : 2;
      const ch = chord(pd, 3);
      for (let s = 0; s < 16; s += arpStep) {
        if (mood === 'mysterious' && rnd() < 0.3) continue;
        const m = ch[(s / arpStep) % 3] + ((s / arpStep) % 6 >= 3 ? 12 : 0);
        const sg = I.pluck(m, 0.32, mood === 'epic' ? 0.9 : 0.7); addMono(dry, at(bar, s), sg, (s % 4 ? 0.35 : -0.35), 0.55); addWet(at(bar, s), sg, 0.4);
      }
      // groove under every mood so the clip never sits still (soft for mysterious / sad)
      if (mood === 'mysterious' || mood === 'sad') { for (const st of [6, 10]) addMono(dry, at(bar, st), I.kick(0.4), 0, 0.7); addMono(dry, at(bar, 8), I.snare(0.32), 0.05, 0.55); for (let st = 0; st < 16; st += 2) addMono(dry, at(bar, st + (st % 4 === 2 ? 0.35 : 0)), I.hat(st % 4 === 2 ? 0.32 : 0.18), 0.3, 0.5); }
      if (mood === 'tense') for (const st of [4, 12]) addMono(dry, at(bar, st), I.snare(0.45), 0.05, 0.6);
      // melody: 4-bar phrases (A A' B A''), chord tones on strong steps, stepwise in between, resolves at the phrase end
      { const ph = bar % 4, sec = Math.floor(bar / 4) % 4, R = RHY[mood][(ph + (sec === 2 ? 1 : 0)) % RHY[mood].length]; const lift = sec === 2 ? 2 : 0;
        for (let k = 0; k < R.length; k++) { const [st, len] = R[k]; if (ph === 3 && k === R.length - 1 && sec === 1) continue; // breath before B
          let d; if (ph === 3 && k === R.length - 1) d = 0; else if (st % 8 === 0) d = [0, 2, 4][(MOT[(ph * 4 + k) % MOT.length] + 3) % 3]; else d = mel.prev + [-1, 1, -2, 1, 2, -1][(MOT[(ph * 4 + k + sec) % MOT.length]) % 6];
          d = Math.max(-2, Math.min(9, d)); mel.prev = d; const m = deg(pd + d + lift, 3); const dur = len * beat / 4;
          const tim = TIMBRE[mood]; let sg;
          if (tim === 'flute') sg = I.flute(m, dur * 0.95, 0.3); else if (tim === 'musicbox') sg = I.musicbox(m + 12, 0.32); else if (tim === 'pluck') sg = I.pluck(m + 12, 0.42, 0.9); else sg = I.lead(m, dur * 0.9, 0.26);
          addMono(dry, at(bar, st), sg, 0.08, 0.9); addWet(at(bar, st), sg, 0.55);
          if (thai || mood === 'epic' || mood === 'triumphant') { const rn = I.ranat(m + 12, 0.28); addMono(dry, at(bar, st), rn, -0.25, 0.8); addWet(at(bar, st), rn, 0.35); if (len >= 4) { const r2 = I.ranat(m + 12, 0.2); addMono(dry, at(bar, st + 1), r2, -0.25, 0.7); } }
          if ((mood === 'triumphant' || mood === 'epic') && st % 4 === 0) { const h = I.lead(deg(pd + d + lift + 2, 3), dur * 0.85, 0.12); addMono(dry, at(bar, st), h, -0.1, 0.8); }
        } }
      if (thai) for (let st = 0; st < 16; st += 4) { addMono(dry, at(bar, st + 2), I.ching(0.45, false), 0.4, 0.7); addMono(dry, at(bar, st), I.ching(0.35, true), 0.4, 0.6); }
      // section changes and the loop turnaround: riser + fill into the next bar / bar 1
      if (last || nextMood !== mood) {
        addMono(dry, at(bar, 8), I.riser(beat * 2, 0.6), 0, 0.7);
        for (const s of [12, 13, 14, 15]) addMono(dry, at(bar, s), I.snare(0.35 + (s - 12) * 0.12), 0, 0.6);
      }
    }
    function addWet(start, sig, g) { const n = N; let i0 = Math.round(start) % n; for (let k = 0; k < sig.length; k++) wet[(i0 + k) % n] += sig[k] * g; }
    const rv = reverbCircular(wet, 0.35);
    for (let i = 0; i < N; i++) { dry[0][i] += rv[i]; dry[1][i] += rv[(i + 240) % N]; }
    return dry;
  };

  // ---- music that follows the narration ----
  // plan.segs = [{t, mood}] one per spoken sentence. Harmony changes on each sentence onset, the instruments never
  // change (only layers come and go with a smoothed energy level), a steady groove holds the speech pace, and a short
  // ranat pickup answers the end of every sentence leading into the next one (call and response).
  A.renderMusicVoice = function (plan) {
    const sr = SR(); const bpm = plan.bpm; const beat = 60 / bpm; const bars = plan.bars; const s16 = beat / 4;
    const N = Math.round(A.loopLength(bpm, bars) * sr); const total = bars * 16;
    const dry = Buf(N), wet = new Float32Array(N);
    const root = 36 + (KEYS[plan.key] ?? 2); const sc = SCALES[plan.scale] || SCALES.aeolian; const thai = plan.scale === 'thai_pent' || plan.scale === 'insen';
    const deg = (d, oct) => { const len = sc.length; const o = Math.floor(d / len); return root + sc[((d % len) + len) % len] + 12 * (o + (oct || 0)); };
    const chord = (d, oct) => [deg(d, oct), deg(d + 2, oct), deg(d + 4, oct)];
    const at = (st) => st * s16 * sr;
    const add = (st, sig, pan, g, w) => { addMono(dry, at(st), sig, pan, g); if (w) { const n = N; let i0 = Math.round(at(st)) % n; for (let k = 0; k < sig.length; k++) wet[(i0 + k) % n] += sig[k] * g * w; } };
    // segments on the 8th grid, energy 1..4 smoothed (never jumps more than one step), the loop ends where it began
    const LV = { sad: 2, mysterious: 2, tense: 3, triumphant: 3, epic: 4 }; // an easy, steady bed: moods only add a little
    let segs = (plan.segs || [{ t: 0, mood: 'mysterious' }]).map((g) => ({ a: Math.min(total - 2, Math.max(0, Math.round(g.t / s16))), lv: LV[g.mood] || 2 })).sort((x, y) => x.a - y.a); // accents on the 16th nearest the spoken onset
    segs[0].a = 0; segs = segs.filter((g, i) => i === 0 || g.a - segs[i - 1].a >= 4);
    for (let i = 1; i < segs.length; i++) segs[i].lv = Math.max(segs[i - 1].lv - 1, Math.min(segs[i - 1].lv + 1, segs[i].lv));
    if (segs.length > 2) segs[segs.length - 1].lv = Math.max(segs[0].lv, Math.min(segs[0].lv + 1, segs[segs.length - 1].lv));
    const PROG = [0, 3, 1, 4, 0, 2, 3, 4]; segs.forEach((g, i) => { g.b = i + 1 < segs.length ? segs[i + 1].a : total; g.pd = PROG[i % PROG.length]; });
    const segAt = (st) => { let r = segs[0]; for (const g of segs) if (st >= g.a) r = g; return r; };
    const sw = (st) => st + (st % 2 === 1 ? 0.33 : 0); // gentle swing on the off 16ths
    const ch7 = (d) => [deg(d, 2), deg(d + 2, 2), deg(d + 4, 2), deg(d + 6, 2)]; // warm 4-note voicing around middle C
    const PAT = [0, 2, 1, 3, 2, 1, 0, 2]; // marimba figure on 8ths
    for (let st = 0; st < total; st++) {
      const g = segAt(st), lv = g.lv, b16 = st % 16, ch = chord(g.pd, 3);
      // half-time pocket: soft kick on 1 (+ the "and" of 2), rim on 3, brushes on 8ths — relaxed under fast talking
      if (b16 === 0 || (lv >= 2 && b16 === 6) || (lv >= 3 && b16 === 11)) add(sw(st), I.softkick(lv >= 3 ? 0.75 : 0.6), 0, 0.85);
      if (lv >= 2 && b16 === 8) add(st, I.rim(0.5), 0.1, 0.55, 0.25);
      if (lv >= 2 && st % 2 === 0) add(sw(st), I.brush(b16 % 4 === 2 ? 0.55 : 0.32), 0.25, 0.5);
      if (lv >= 4 && st % 2 === 1) add(sw(st), I.brush(0.22), -0.25, 0.45);
      // round bass: sentence downbeat + a lazy bossa push
      if (st === g.a) add(st, I.sub(deg(g.pd, 0), lv === 1 ? Math.min(8, g.b - g.a) * s16 : s16 * 3, 0.7), 0, 0.85);
      else if (lv >= 2 && (b16 === 0 || b16 === 6 || b16 === 10)) add(sw(st), I.sub(deg(g.pd + (b16 === 10 ? 4 : 0), 0), s16 * 2.5, 0.5), 0, 0.8);
      // electric-piano chord for each sentence, re-struck softly every half bar
      if (st === g.a || (st > g.a && (st - g.a) % 8 === 0 && st + 2 < g.b)) { const ep = I.ep(ch7(g.pd), Math.min(8, g.b - st) * s16 + 0.15, st === g.a ? 0.32 : 0.24); add(st, ep, -0.15, 0.6, 0.45); }
      // marimba figure in the middle register (no high bells)
      if (lv === 1 && st % 4 === 0) add(st, I.marimba(ch[(st / 4) % 3] - 12, 0.2), 0.2, 0.5, 0.4); // quiet sections still move gently
      if (lv >= 2 && st % 2 === 0) { const k = PAT[Math.floor(st / 2) % PAT.length]; const m = k === 3 ? ch[0] + 12 : ch[k] - 12; if (!(lv === 2 && b16 % 4 === 2)) add(sw(st), I.marimba(m, 0.26), (st % 4 < 2 ? -0.25 : 0.25), 0.55, 0.3); }
      // answer phrase into the next sentence: three marimba notes (low, warm)
      if (lv >= 2 && st === g.b - 6 && g.b - g.a >= 10) { const nx = segAt(g.b % total); [[0, 4], [2, 2], [4, 1]].forEach(([o, d]) => add(st + o, I.marimba(deg(nx.pd + d, 3), 0.3), 0.15, 0.6, 0.45)); }
      // full energy: a mellow EP top line, still under 600 Hz
      if (lv >= 4 && b16 % 8 === 4) { const m = deg(g.pd + [4, 2, 5, 3][(st / 8 | 0) % 4], 3); add(st, I.ep([m], beat * 1.5, 0.2), 0.05, 0.6, 0.6); }
      const nxt = segs.find((x) => x.a === st + 8); if (nxt && nxt.lv > lv + 0) { for (const r of [4, 6]) add(st + r, I.rim(0.3), 0, 0.45); }
    }
    const rv = reverbCircular(wet, 0.3);
    for (let i = 0; i < N; i++) { dry[0][i] += rv[i]; dry[1][i] += rv[(i + 240) % N]; }
    for (const c of dry) { let y = 0; const k = 1 - Math.exp(-TAU * 3200 / sr); for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) { y += k * (c[i] - y); if (pass) c[i] = y; } } // soft top end, circular
    return dry;
  };
  // tempo for a narrated loop: whole bars just after the voice, and the sentence onsets landing as close to the 8th grid as possible
  A.fitClockVoice = function (voiceDur, onsets, cps) {
    const fast = (cps || 12) >= 13.5; const lo = fast ? 100 : 88, hi = fast ? 126 : 112, hint = fast ? 112 : 96; const tail = 0.35; let best = null; // drums play half-time on top
    for (let bars = 8; bars <= 48; bars++) { const bpm = bars * 240 / (voiceDur + tail); if (bpm < lo || bpm > hi) continue; const e = 30 / bpm;
      const err = onsets.length ? onsets.reduce((a, t) => a + Math.abs(t / e - Math.round(t / e)), 0) / onsets.length : 0;
      const score = err + Math.abs(bpm - hint) / 60; if (!best || score < best.score) best = { bars, bpm: Math.round(bpm * 1000) / 1000, score, err }; }
    if (!best) return A.fitClock(voiceDur, lo, hi, hint);
    best.L = A.loopLength(best.bpm, best.bars); return best;
  };
  // ---- SFX: events [{t (s), type, deg?, vel?, pan?}] ----
  A.SFX = ['step', 'whoosh', 'hit', 'shimmer', 'flap', 'grind', 'squeak', 'blip', 'tap', 'glitch', 'sand', 'thunder', 'drip', 'creak', 'coin', 'heart', 'boom', 'hiss', 'crack', 'splash', 'ting', 'buzz', 'paper', 'stamp', 'fire', 'wind', 'cashout', 'cashin', 'engine', 'rain', 'bell', 'fan', 'slap', 'boing', 'swish', 'shriek', 'bus', 'merit', 'traffic', 'horn', 'pluck'];
  A.renderSfx = function (events, plan, only) {
    const sr = SR(); const N = Math.round(A.loopLength(plan.bpm, plan.bars) * sr); const out = Buf(N);
    const root = 48 + (KEYS[plan.key] ?? 2); const sc = SCALES[plan.scale] || SCALES.aeolian;
    const note = (d) => { const len = sc.length; d = d || 0; return root + sc[((d % len) + len) % len] + 12 * Math.floor(d / len); };
    for (const e of events || []) {
      if (only === 'hero' ? !e.hero : e.hero) continue; // punchline hits get their own stem
      if (only === 'acc' && !e.acc) continue; if (only === 'tex' && e.acc) continue;
      const s = synth(e.type, note(e.deg), e.vel ?? 0.7, e);
      if (s) addMono(out, e.t * sr, s, e.pan || 0, 1);
    }
    return out;
  };
  function noise(n, color) { const o = new Float32Array(n); let lp = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (color === 'brown') { lp = (lp + 0.02 * w) / 1.02; o[i] = lp * 3.5; } else o[i] = w; } return o; }
  // recorded sound effects (ElevenLabs library): name -> Float32Array at A.SR; they win over the synthesized ones
  A.samples = {}; A.SFX_URL = 'sfx/library.json';
  A.has = (type) => A.SFX.includes(type) || !!A.samples[type];
  A.loadSfxLibrary = async function (url) {
    if (A.samplesLoaded) return A.samples; A.samplesLoaded = true;
    try { const j = await (await fetch(url || A.SFX_URL)).json(); for (const k in j.sounds || {}) { const b = atob(j.sounds[k].pcm16); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      const i16 = new Int16Array(u.buffer); const f = new Float32Array(i16.length); for (let i = 0; i < f.length; i++) f[i] = i16[i] / 32768; A.samples[k] = A.resample(f, j.sr || 32000, A.SR); } }
    catch (e) { /* no library: synthesized sounds only */ }
    return A.samples;
  };
  function synth(type, m, vel, opt) {
    if (A.samples[type]) { const s0 = A.samples[type], fo = Math.round(0.3 * SR()), n = opt && opt.len ? Math.min(s0.length, Math.round(opt.len * SR())) : s0.length, o = new Float32Array(n); // len: cut a bed at the end of its shot (fading out)
      for (let i = 0; i < n; i++) o[i] = s0[i] * vel * (n < s0.length && i > n - fo ? (n - i) / fo : 1); return o; }
    const sr = SR(); const f = mtof(m);
    const mk = (dur, fn) => { const n = (dur * sr) | 0, o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = fn(i / sr, i, n) * vel; return o; };
    switch (type) {
      case 'step': { let lp = 0; return mk(0.09, (t) => { lp += 0.15 * ((Math.random() * 2 - 1) - lp); return (lp * 0.8 + Math.sin(TAU * f * 0.5 * t) * 0.5) * Math.exp(-t * 45) * 0.7; }); }
      case 'whoosh': { let lp = 0; return mk(0.35, (t, i, n) => { const k = 0.02 + 0.4 * Math.sin(Math.PI * i / n); lp += k * ((Math.random() * 2 - 1) - lp); return lp * Math.sin(Math.PI * i / n) * 0.9; }); }
      case 'hit': { let ph = 0; return mk(0.4, (t) => { ph += TAU * (60 + 140 * Math.exp(-t * 40)) / sr; return (Math.sin(ph) * Math.exp(-t * 9) + (Math.random() - 0.5) * Math.exp(-t * 35) * 0.9 + Math.sin(TAU * f * 2 * t) * 0.25 * Math.exp(-t * 6)); }); }
      case 'shimmer': return mk(1.0, (t) => { let x = 0; for (let k = 0; k < 4; k++) { const tt = t - k * 0.06; if (tt > 0) x += Math.sin(TAU * f * 4 * [1, 1.25, 1.5, 2][k] * tt) * Math.exp(-tt * 5); } return x * 0.22; });
      case 'flap': { let lp = 0; return mk(0.22, (t) => { lp += 0.06 * ((Math.random() * 2 - 1) - lp); const e = Math.exp(-((t - 0.04) ** 2) / 0.0008) + 0.6 * Math.exp(-((t - 0.13) ** 2) / 0.0008); return lp * e * 3; }); }
      case 'grind': { const nz = noise((1.1 * sr) | 0, 'brown'); return mk(1.1, (t, i, n) => nz[i] * (0.6 + 0.4 * Math.sin(TAU * 13 * t)) * Math.sin(Math.PI * i / n) * 0.8); }
      case 'crack': { let lp = 0; return mk(0.5, (t) => { lp += 0.5 * ((Math.random() * 2 - 1) - lp); return lp * (Math.exp(-t * 20) + (Math.random() < 0.004 ? 1 : 0)) * 0.9; }); }
      case 'squeak': return mk(0.12, (t) => Math.sin(TAU * (f * 8 + 900 * t) * t) * Math.exp(-t * 25) * 0.25);
      case 'blip': return mk(0.18, (t) => (Math.sin(TAU * f * 2 * t) * 0.7 + Math.sin(TAU * f * 4 * t) * 0.15) * Math.exp(-t * 22) * 0.28);
      case 'buzz': return mk(1.2, (t, i, n) => { const f0 = 520 + 60 * Math.sin(TAU * 6 * t); const saw = 2 * ((t * f0) % 1) - 1; return saw * 0.12 * Math.sin(Math.PI * i / n) * (0.7 + 0.3 * Math.sin(TAU * 23 * t)); });
      case 'paper': { let hp = 0, pr = 0; return mk(0.45, (t) => { const w = Math.random() * 2 - 1; hp = 0.55 * (hp + w - pr); pr = w; const g = (Math.sin(TAU * 18 * t) > 0.3 ? 1 : 0.35); return hp * g * Math.exp(-t * 5) * 0.5; }); }
      case 'stamp': { let ph = 0; return mk(0.35, (t) => { ph += TAU * (90 + 80 * Math.exp(-t * 50)) / sr; return Math.sin(ph) * Math.exp(-t * 14) * 0.9 + (Math.random() - 0.5) * Math.exp(-t * 60) * 0.6; }); }
      case 'fire': { let lp = 0; return mk(1.0, (t, i, n) => { lp += 0.08 * ((Math.random() * 2 - 1) - lp); const pop = Math.random() < 0.002 ? (Math.random() - 0.5) * 2 : 0; return (lp * 0.5 + pop) * Math.sin(Math.PI * i / n) * 0.6; }); }
      case 'wind': { let lp = 0; return mk(1.6, (t, i, n) => { const k = 0.01 + 0.03 * (0.5 + 0.5 * Math.sin(TAU * 0.7 * t)); lp += k * ((Math.random() * 2 - 1) - lp); return lp * 3 * Math.sin(Math.PI * i / n); }); }
      case 'ting': return mk(0.7, (t) => { let x = 0; for (const [m, d] of [[4, 0], [6, 0.045], [8, 0.09]]) { const tt = t - d; if (tt > 0) x += Math.sin(TAU * f * m * tt) * Math.exp(-tt * 9) * (1 + 0.3 * Math.sin(TAU * 7 * tt)); } return x * 0.2; });
      case 'tap': return mk(0.25, (t) => (Math.sin(TAU * f * 4 * t) * Math.exp(-t * 30) + Math.sin(TAU * f * 6 * t) * Math.exp(-t * 18) * 0.5) * 0.35);
      case 'glitch': return mk(0.22, (t) => { const q = Math.round((t * 90) % 1 * 4) / 4; const sq = Math.sin(TAU * (f * 3 + (q * 700)) * t) > 0 ? 1 : -1; return sq * 0.18 * (t < 0.2 ? 1 : 0) * (Math.floor(t * 60) % 3 ? 1 : 0.2); });
      case 'sand': case 'hiss': { let hp = 0, pr = 0; return mk(0.9, (t, i, n) => { const w = Math.random() * 2 - 1; hp = 0.75 * (hp + w - pr); pr = w; return hp * Math.sin(Math.PI * i / n) * 0.35; }); }
      case 'thunder': case 'boom': { const nz = noise((1.8 * sr) | 0, 'brown'); return mk(1.8, (t, i) => nz[i] * (Math.exp(-t * 2.2) * (type === 'boom' ? 1.4 : 1)) + (type === 'boom' ? Math.sin(TAU * 42 * t) * Math.exp(-t * 3) : 0)); }
      case 'drip': return mk(0.2, (t) => Math.sin(TAU * (f * 4 * (1 + 2 * Math.exp(-t * 40))) * t) * Math.exp(-t * 20) * 0.3);
      case 'creak': return mk(0.6, (t) => Math.sign(Math.sin(TAU * (90 + 30 * Math.sin(TAU * 3 * t)) * t)) * (Math.random() < 0.3 ? 1 : 0.4) * Math.sin(Math.PI * t / 0.6) * 0.12);
      case 'coin': return mk(0.5, (t) => (Math.sin(TAU * f * 8 * t) * (t < 0.08 ? 1 : 0) + Math.sin(TAU * f * 12 * t) * (t >= 0.08 ? 1 : 0)) * Math.exp(-t * 7) * 0.22);
      case 'heart': return mk(0.5, (t) => (Math.sin(TAU * 55 * t) * (Math.exp(-((t - 0.02) ** 2) / 0.0006) + 0.7 * Math.exp(-((t - 0.22) ** 2) / 0.0006))) * 0.9);
      case 'splash': { let lp = 0; return mk(0.7, (t) => { lp += 0.3 * ((Math.random() * 2 - 1) - lp); return lp * Math.exp(-t * 5) * 0.7; }); }
      // money going down: three falling square blips; money coming in: rising coin arpeggio
      case 'cashout': return mk(0.5, (t) => { const k = Math.min(2, Math.floor(t / 0.11)); const fr = f * [6, 4.5, 3][k]; const tt = t - k * 0.11; return (Math.sin(TAU * fr * tt) > 0 ? 1 : -1) * Math.exp(-tt * 14) * 0.13; });
      case 'cashin': return mk(0.6, (t) => { let x = 0; [0, 0.07, 0.14].forEach((d, k) => { const tt = t - d; if (tt > 0) x += Math.sin(TAU * f * [8, 10, 12][k] * tt) * Math.exp(-tt * 10); }); return x * 0.15; });
      case 'engine': { let lp = 0; return mk(1.6, (t, i, n) => { lp += 0.04 * ((Math.random() * 2 - 1) - lp); const rpm = 38 + 10 * Math.exp(-t * 2); const hiss = t > 1.1 ? (Math.random() - 0.5) * 0.5 * Math.exp(-(t - 1.1) * 6) : 0; return (Math.sin(TAU * rpm * t) * 0.5 + Math.sin(TAU * rpm * 2.02 * t) * 0.25 + lp * 2) * Math.sin(Math.PI * i / n) * 0.45 + hiss; }); }
      case 'rain': { let hp = 0, pr = 0; return mk(2.0, (t, i, n) => { const w = Math.random() * 2 - 1; hp = 0.6 * (hp + w - pr); pr = w; return hp * Math.sin(Math.PI * i / n) * 0.22 + (Math.random() < 0.0015 ? (Math.random() - 0.5) * 0.6 : 0); }); }
      case 'bell': return mk(2.4, (t) => { let x = 0; for (const [m, a, d] of [[2, 1, 1.4], [5.4, 0.5, 2.6], [8.9, 0.25, 4], [3.01, 0.4, 1.8]]) x += Math.sin(TAU * f * m * t) * a * Math.exp(-t * d); return x * 0.16; });
      case 'fan': { let lp = 0; return mk(1.5, (t, i, n) => { lp += 0.05 * ((Math.random() * 2 - 1) - lp); return (lp * 1.6 + Math.sin(TAU * 31 * t) * 0.08) * (0.8 + 0.2 * Math.sin(TAU * 9 * t)) * Math.sin(Math.PI * i / n) * 0.5; }); }
      // cartoon slap "ป๊าบ": sharp crack + skin thump + a little air
      case 'slap': { let hp = 0, pr = 0, ph = 0; return mk(0.32, (t) => { const w = Math.random() * 2 - 1; hp = 0.5 * (hp + w - pr); pr = w; ph += TAU * (210 + 160 * Math.exp(-t * 60)) / sr; return (hp * 1.4 * Math.exp(-t * 70) + Math.sin(ph) * 0.9 * Math.exp(-t * 22) + w * 0.15 * Math.exp(-t * 12)) * 0.9; }); }
      case 'boing': return mk(0.6, (t) => { const f0 = 180 + 220 * Math.sin(TAU * 7 * t) * Math.exp(-t * 4); return Math.sin(TAU * f0 * t) * Math.exp(-t * 4) * 0.35; });
      case 'swish': { let lp = 0; return mk(0.18, (t, i, n) => { const k = 0.05 + 0.6 * (i / n); lp += k * ((Math.random() * 2 - 1) - lp); return lp * Math.sin(Math.PI * i / n) * 0.7; }); }
      default: { const near = { shriek: 'squeak', bus: 'engine', merit: 'shimmer', traffic: 'engine', horn: 'blip', pluck: 'crack' }[String(type).replace(/_\d+$/, '')]; return near ? synth(near, m, vel) : null; } // library missing: nearest synth
    }
  }

  // ---- loudness (BS.1770-ish, gated), mono or stereo arrays ----
  A.lufs = function (chs, sr, from, to) {
    sr = sr || SR(); from = Math.max(0, Math.floor((from || 0) * sr)); to = Math.min(chs[0].length, Math.floor((to == null ? chs[0].length / sr : to) * sr));
    const blk = Math.round(0.4 * sr), hop = Math.round(0.1 * sr); const pw = [];
    const kws = chs.map((x) => kweight(x.subarray(from, to), sr));
    for (let s = 0; s + blk <= to - from; s += hop) { let e = 0; for (const k of kws) { for (let i = s; i < s + blk; i++) e += k[i] * k[i]; } pw.push(e / blk); }
    if (!pw.length) return -70;
    const L = (p) => -0.691 + 10 * Math.log10(p + 1e-12);
    let g = pw.filter((p) => L(p) > -70); if (!g.length) return -70;
    const rel = L(g.reduce((a, b) => a + b, 0) / g.length) - 10; g = g.filter((p) => L(p) > rel);
    return L(g.reduce((a, b) => a + b, 0) / Math.max(1, g.length));
  };
  function biquad(x, b0, b1, b2, a1, a2) { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
  function kweight(x, sr) { // high shelf +4 dB @1.5k, high-pass 38 Hz (RBJ)
    let w = TAU * 1500 / sr, A0 = Math.pow(10, 4 / 40), al = Math.sin(w) / 2 * Math.SQRT2, cs = Math.cos(w);
    let b0 = A0 * ((A0 + 1) + (A0 - 1) * cs + 2 * Math.sqrt(A0) * al), b1 = -2 * A0 * ((A0 - 1) + (A0 + 1) * cs), b2 = A0 * ((A0 + 1) + (A0 - 1) * cs - 2 * Math.sqrt(A0) * al);
    let a0 = (A0 + 1) - (A0 - 1) * cs + 2 * Math.sqrt(A0) * al, a1 = 2 * ((A0 - 1) - (A0 + 1) * cs), a2 = (A0 + 1) - (A0 - 1) * cs - 2 * Math.sqrt(A0) * al;
    let y = biquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
    w = TAU * 38 / sr; cs = Math.cos(w); al = Math.sin(w) / 2 / 0.5;
    b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    return biquad(y, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
  }
  // peaking EQ (RBJ), in place on every channel: carve the voice band out of the music bed
  A.peq = (chs, f0, q, db) => { const sr = SR(), Aa = Math.pow(10, db / 40), w = TAU * f0 / sr, al = Math.sin(w) / (2 * q), cs = Math.cos(w);
    const a0 = 1 + al / Aa; const b0 = (1 + al * Aa) / a0, b1 = -2 * cs / a0, b2 = (1 - al * Aa) / a0, a1 = -2 * cs / a0, a2 = (1 - al / Aa) / a0;
    for (let c = 0; c < chs.length; c++) { const y = biquad(chs[c], b0, b1, b2, a1, a2); chs[c].set(y); } return chs; };
  A.gain = (chs, g) => { for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= g; return chs; };

  // duck envelope from voice regions [{t0,t1}] -> Float32Array (gain per sample) circular
  A.duckEnv = function (N, regions, depth) {
    const sr = SR(); const e = new Float32Array(N).fill(1); depth = depth ?? 0.32;
    const att = 0.06 * sr, rel = 0.25 * sr;
    for (const r of regions || []) {
      const a = Math.round(r.t0 * sr), b = Math.round(r.t1 * sr);
      for (let i = a - att; i < b + rel; i++) {
        let g = depth;
        if (i < a) g = 1 - (1 - depth) * ((i - (a - att)) / att);
        else if (i > b) g = depth + (1 - depth) * ((i - b) / rel);
        const k = ((i % N) + N) % N; if (g < e[k]) e[k] = g;
      }
    }
    return e;
  };
  // resample mono Float32 (linear) to SR
  A.resample = function (x, from, to) { if (from === to) return x; const n = Math.round(x.length * to / from), o = new Float32Array(n), r = from / to; for (let i = 0; i < n; i++) { const p = i * r, i0 = p | 0, f = p - i0; o[i] = (x[i0] || 0) * (1 - f) + (x[i0 + 1] || 0) * f; } return o; };

  // full mix -> stereo; stems: {music, sfx, voice(mono, already placed at loop timeline)}, mutes
  A.mix = function (st, opts) {
    const N = st.music[0].length; const out = Buf(N); opts = opts || {};
    const duck = opts.duck || null;
    for (let i = 0; i < N; i++) {
      const d = duck ? duck[i] : 1;
      let l = 0, r = 0;
      if (!opts.muteMusic) { l += st.music[0][i] * d; r += st.music[1][i] * d; }
      if (!opts.muteSfx && st.sfx) { l += st.sfx[0][i]; r += st.sfx[1][i]; }
      if (!opts.muteVoice && st.voice) { l += st.voice[i]; r += st.voice[i]; }
      out[0][i] = Math.tanh(l * 0.95) / 0.95; out[1][i] = Math.tanh(r * 0.95) / 0.95;
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
