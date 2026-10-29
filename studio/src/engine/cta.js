// CTA button: original pixel icons on a bevelled button that pops ("วิ๊ง") with sparkles, a shine sweep,
// a pixel cursor tap on the beat, then a gentle idle bob. Everything is drawn in whole pixel cells (crisp).
(function (G) {
  const LSE = G.LSE;
  const CTA = (LSE.CTA = {});
  const ICON = {
    like: [
      '................', '.........oo.....', '........owwo....', '........owwo....', '.......owwwo....', '......owwwo.....',
      '.....owwwwoooo..', 'oooo.owwwwwwwwo.', 'owlo.owwwwwwwlo.', 'owlo.owwwwwwwwo.', 'owlo.owwwwwwwlo.', 'owlo.owwwwwwwwo.',
      'owlo.owwwwwwwlo.', 'owlo.owwwwwwwo..', 'oooo..ooooooo...', '................'],
    share: [
      '................', '.........o......', '.........oo.....', '.........owo....', '.........owwo...', '...ooooooowwwo..',
      '..owwwwwwwwwwwo.', '.owwwwwwwwwwwwwo', '.owwwwwwwwwwwwo.', '.owwloooooowwo..', '.owlo.....owo...', '.owo......oo....',
      '.owo......o.....', '.oo.............', '................', '................'],
    bell: [
      '.......oo.......', '......owwo......', '.....owwwwo.....', '....owlwwwwo....', '....owlwwwwo....', '...owlwwwwwwo...',
      '...owlwwwwwwo...', '...owwwwwwwwo...', '..owwwwwwwwwwo..', '..owwwwwwwwwwo..', '.owwwwwwwwwwwwo.', '.oooooooooooooo.',
      '......owwo......', '.......oo.......', '................', '................'],
  };
  const CURSOR = ['o.........', 'oo........', 'owo.......', 'owwo......', 'owwwo.....', 'owwwwo....', 'owwwwwo...', 'owwwwwwo..', 'owwwwwwwo.', 'owwwwoooo.', 'owwowo....', 'owo.owo...', 'oo..owo...', '.....oo...'];
  const THEME = { like: ['#ff6b5a', '#e0533f', '#b52b35', '#7d1c2b'], share: ['#8fd3ff', '#3e8de0', '#2253a3', '#183057'], subscribe: ['#ff6b5a', '#e0533f', '#b52b35', '#7d1c2b'] };
  const BW = 24, BH = 22, R = 5;
  function inR(x, y, g) { const w = BW + 2 * g, h = BH + 2 * g, r = R + g; x += g; y += g; if (x < 0 || y < 0 || x >= w || y >= h) return false; const cx = Math.min(x, w - 1 - x), cy = Math.min(y, h - 1 - y); if (cx >= r || cy >= r) return true; const dx = r - cx - 0.5, dy = r - cy - 0.5; return dx * dx + dy * dy <= r * r; }
  function inBtn(x, y) { const cx = Math.min(x, BW - 1 - x), cy = Math.min(y, BH - 1 - y); if (cx >= R || cy >= R) return x >= 0 && y >= 0 && x < BW && y < BH; const dx = R - cx - 0.5, dy = R - cy - 0.5; return dx * dx + dy * dy <= R * R; }

  // o: ctx, type: like|share|subscribe, dt: seconds since the word, beat: seconds, cx/bottom: device px, u0: base cell size
  CTA.draw = function (o, type, dt, beat, cx, bottom, u0) {
    const th = THEME[type] || THEME.like; const icon = ICON[type === 'subscribe' ? 'bell' : type] || ICON.like;
    // spring pop in integer cell sizes
    const k = dt < 0.04 ? 0.55 : dt < 0.09 ? 1.4 : dt < 0.15 ? 1.18 : dt < 0.22 ? 0.92 : 1;
    const u = Math.max(1, Math.round(u0 * k));
    const press = dt >= beat && dt < beat + 0.16; const pressed = dt >= beat; // the cursor taps one beat after the word
    const bob = !press && dt > beat + 0.3 && LSE.frac(dt, beat) < 0.12 ? -1 : 0;
    const W = BW * u, H = BH * u; const x0 = Math.round(cx - W / 2); let y0 = Math.round(bottom - H) + (press ? 2 * u : 0) + bob * u;
    const cell = (x, y, c, a) => { o.globalAlpha = a ?? 1; o.fillStyle = c; o.fillRect(x0 + x * u, y0 + y * u, u, u); };
    // ring pulse every 2 beats once settled (dithered rounded outline growing outward)
    if (dt > beat + 0.3) { const ph = LSE.frac(dt - beat, beat * 2); if (ph < 0.5) { const g = 1 + Math.round(ph * 10); const a = 0.6 * (1 - ph * 2);
      for (let y = -g; y < BH + g; y++) for (let x = -g; x < BW + g; x++) if (inR(x, y, g) && !inR(x, y, g - 1) && (x + y) % 2 === 0) cell(x, y, '#ffe66b', a); } }
    // drop shadow
    if (!press) for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (inBtn(x, y) && !inBtn(x, y - 2)) cell(x, y + 2, '#0b0a12', 0.55);
    // body with bevel
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      if (!inBtn(x, y)) continue;
      const edge = !inBtn(x - 1, y) || !inBtn(x + 1, y) || !inBtn(x, y - 1) || !inBtn(x, y + 1);
      let c = edge ? '#0b0a12' : y < 4 ? th[0] : y > BH - (press ? 3 : 5) ? th[2] : th[1];
      if (!edge && y > BH - 3) c = th[3];
      if (pressed && !press && edge) c = '#ffc14a'; // gold rim once "pressed"
      cell(x, y, c);
    }
    // icon (bell swings while it rings)
    const swing = type === 'subscribe' && dt < beat * 3 ? [0, 1, 0, -1][LSE.tick(dt, beat / 4) % 4] : 0;
    const ix = 4, iy = 3 + (press ? 0 : 0);
    const ink = { o: '#0b0a12', w: pressed && type === 'like' && dt < beat + 0.4 ? '#ffe66b' : '#ffffff', l: '#b3b9d1' };
    for (let y = 0; y < 16; y++) { const row = icon[y]; const sh = y < 8 ? swing : 0; for (let x = 0; x < 16; x++) { const ch = row[x]; if (ch !== '.') cell(ix + x + sh, iy + y, ink[ch] || '#ffffff'); } }
    if (type === 'subscribe' && dt < beat * 3) { const on = LSE.tick(dt, beat / 4) % 2 === 0; if (on) for (const [x, y] of [[2, 4], [1, 6], [2, 8], [21, 4], [22, 6], [21, 8]]) cell(x, y, '#ffe66b'); }
    // shine sweep across the body
    if (dt > 0.16 && dt < 0.5) { const sx = Math.round(-6 + (dt - 0.16) / 0.34 * (BW + 10)); for (let y = 1; y < BH - 1; y++) for (let d = 0; d < 3; d++) { const x = sx + d - Math.round(y * 0.5); if (inBtn(x, y) && inBtn(x - 1, y) && inBtn(x + 1, y)) cell(x, y, '#ffffff', d === 1 ? 0.55 : 0.3); } }
    o.globalAlpha = 1;
    // sparkle burst
    if (dt < 0.5) {
      const p = dt / 0.5;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + 0.3; const dist = 10 + p * 18; const sx = Math.round(BW / 2 + Math.cos(a) * dist * 1.1), sy = Math.round(BH / 2 + Math.sin(a) * dist * 0.9);
        const big = p < 0.5 && i % 2 === 0; const col = i % 3 === 0 ? '#ffffff' : '#ffe66b';
        cell(sx, sy, col, 1 - p * 0.7); if (big || p < 0.25) { cell(sx - 1, sy, col, 0.8 - p * 0.6); cell(sx + 1, sy, col, 0.8 - p * 0.6); cell(sx, sy - 1, col, 0.8 - p * 0.6); cell(sx, sy + 1, col, 0.8 - p * 0.6); }
        if (big && p < 0.3) { cell(sx - 2, sy, col, 0.5); cell(sx + 2, sy, col, 0.5); cell(sx, sy - 2, col, 0.5); cell(sx, sy + 2, col, 0.5); }
      }
      o.globalAlpha = 1;
    }
    // pixel cursor slides in, taps on the beat, leaves
    if (dt > beat * 0.35 && dt < beat + 0.6) {
      const inP = Math.min(1, (dt - beat * 0.35) / (beat * 0.65)); const outP = Math.max(0, (dt - beat - 0.25) / 0.35);
      const cxC = Math.round(BW - 5 + (1 - inP) * 10 + outP * 8), cyC = Math.round(BH - 7 + (1 - inP) * 9 + outP * 8) + (press ? 1 : 0);
      const a = 1 - outP;
      for (let y = 0; y < CURSOR.length; y++) for (let x = 0; x < 10; x++) { const ch = CURSOR[y][x]; if (ch !== '.') cell(cxC + x, cyC + y, ch === 'o' ? '#0b0a12' : '#ffffff', a); }
      if (press) for (const [x, y] of [[-2, -1], [-1, -3], [1, -3], [2, -1]]) cell(cxC + x, cyC + y, '#ffe66b', 0.9);
      o.globalAlpha = 1;
    }
    return { w: W, h: H };
  };
})(typeof window !== 'undefined' ? window : globalThis);
