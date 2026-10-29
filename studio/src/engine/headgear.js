// Head-fitted gear built from the LPC head's own pixels in every frame (so it never floats or drifts),
// plus skin materials (bandage, stone, gold…) that replace the body ramp while keeping LPC shading.
(function (G) {
  const LSE = G.LSE;
  const HG = (LSE.Headgear = {});

  // mask: Uint8Array(64*64) of the head layer for this frame; returns bbox + rows
  HG.bbox = function (mask) {
    let x0 = 64, y0 = 64, x1 = -1, y1 = -1;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (mask[y * 64 + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1) / 2 };
  };
  const rgb = (h) => LSE.hexToRgb(h);
  function paint(out, x, y, c) { if (x < 0 || y < 0 || x >= 64 || y >= 64) return; out[y * 64 + x] = c; }
  // out: Array(64*64) of colour hex or 0; draws an outline around it then blits to ctx at (ox, oy)
  function blit(ctx, out, ox, oy, outline) {
    const id = ctx.getImageData(ox, oy, 64, 64); const d = id.data; const ol = rgb(outline || '#0b0a12');
    const has = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 64 && out[y * 64 + x];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4; const c = out[y * 64 + x];
      if (c) { const v = rgb(c); d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; }
      else if (has(x + 1, y) || has(x - 1, y) || has(x, y + 1) || has(x, y - 1)) { if (!d[i + 3] || out.__hard) { d[i] = ol[0]; d[i + 1] = ol[1]; d[i + 2] = ol[2]; d[i + 3] = 255; } }
    }
    ctx.putImageData(id, ox, oy);
  }
  const dirOf = (r) => ['n', 'w', 's', 'e'][r];

  // ---------- nemes (Egyptian royal headcloth): striped cap, flaring side lappets, brow band, uraeus ----------
  HG.nemes = function (ctx, mask, r, ox, oy, o) {
    const b = HG.bbox(mask); if (!b) return; const dir = dirOf(r);
    const A = o.a || '#ffc14a', A2 = o.a2 || LSE.shade(A, -0.12), B = o.b || '#2253a3', B2 = o.b2 || LSE.shade(B, -0.12), BAND = o.band || '#ffe66b';
    const out = new Array(64 * 64).fill(0);
    const brow = b.y0 + Math.round(b.h * 0.36); const chin = b.y1;
    const stripe = (x, y) => { const dark = (dir === 's' && x > b.cx + 1) || (dir === 'e' && x < b.cx - 2) || (dir === 'w' && x > b.cx + 2) || dir === 'n'; return ((y - b.y0) >> 1) % 2 === 0 ? (dark ? A2 : A) : (dark ? B2 : B); };
    const inHead = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 64 && mask[y * 64 + x];
    for (let y = b.y0 - 2; y <= chin + 10; y++) for (let x = b.x0 - 4; x <= b.x1 + 4; x++) {
      let on = false;
      // cap: the head above the brow, puffed 1-2 px outward (a cloth sits on the hair)
      if (y <= brow && (inHead(x, y) || inHead(x - 1, y) || inHead(x + 1, y) || inHead(x, y + 1) || inHead(x, y + 2))) on = true;
      const t = (y - brow) / Math.max(1, chin + 9 - brow); // 0 at brow -> 1 at chest
      if (dir === 's') { // two lappets framing the face, flaring at the temples, hanging in front of the shoulders
        const flare = Math.round(2 - Math.abs(t - 0.25) * 4);
        if (y > brow && y <= chin + 9 && ((x >= b.x0 - Math.max(0, flare) && x <= b.x0 + 3) || (x <= b.x1 + Math.max(0, flare) && x >= b.x1 - 3))) on = true;
      } else if (dir === 'n') { // back: whole head covered, the cloth gathers into a tail at the nape
        if (y > brow && y <= chin + 1 && (inHead(x, y) || inHead(x - 1, y) || inHead(x + 1, y))) on = true;
        if (y > chin && y <= chin + 7 && Math.abs(x - b.cx) <= 3 - (y - chin) * 0.25) on = true;
        if (y > brow && y <= chin + 8 && ((x >= b.x0 - 1 && x <= b.x0 + 2) || (x <= b.x1 + 1 && x >= b.x1 - 2))) on = true;
      } else { // profile: back half of the head covered, flap behind the ear, lappet falls in front of the shoulder
        const f = dir === 'e' ? 1 : -1; const back = (x - b.cx) * f < 1; // behind the face
        if (y > brow && y <= chin && back && (inHead(x, y) || inHead(x - f, y))) on = true;
        // lappet: a narrow band that drops from behind the ear, past the jaw, onto the chest (never over the cheek)
        const lapA = Math.round(b.cx - f * 2), lapB = Math.round(b.cx - f * 0);
        if (y > chin - 4 && y <= chin + 9 && x >= Math.min(lapA, lapB) && x <= Math.max(lapA, lapB)) on = true;
        const tailX = f > 0 ? b.x0 : b.x1;
        if (y > brow && y <= chin + 5 && Math.abs(x - (tailX - f)) <= 2 - (y > chin ? 1 : 0)) on = true;
      }
      if (on) paint(out, x, y, stripe(x, y));
    }
    // brow band + uraeus
    if (dir !== 'n') {
      for (let x = b.x0 - 2; x <= b.x1 + 2; x++) if (out[brow * 64 + x]) out[brow * 64 + x] = BAND;
      const ux = dir === 's' ? Math.round(b.cx) : dir === 'e' ? Math.min(63, b.x1 - 1) : Math.max(0, b.x0 + 1);
      for (let y = brow - 3; y <= brow; y++) { paint(out, ux, y, BAND); if (dir === 's') paint(out, ux + 1, y, BAND); }
      paint(out, ux + (dir === 's' ? 0 : 0), brow - 4, '#b52b35');
    }
    blit(ctx, out, ox, oy, o.outline || '#0b0a12');
  };

  // ---------- Medusa snake hair: the hair zone becomes coiled snakes, heads peek out around the crown ----------
  HG.snakes = function (ctx, mask, r, ox, oy, o, frame) {
    const b = HG.bbox(mask); if (!b) return; const dir = dirOf(r);
    const G1 = o.a || '#2f9c86', G2 = o.a2 || '#24605a', G3 = o.b || '#6fd6b0', EYE = o.eye || '#ffe66b', TONGUE = '#b52b35';
    const out = new Array(64 * 64).fill(0);
    const brow = b.y0 + Math.round(b.h * (dir === 'n' ? 0.8 : 0.34));
    const inHead = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 64 && mask[y * 64 + x];
    for (let y = b.y0 - 3; y <= b.y1 + 4; y++) for (let x = b.x0 - 4; x <= b.x1 + 4; x++) {
      const near = inHead(x, y) || inHead(x, y + 1) || inHead(x, y + 2) || inHead(x - 1, y) || inHead(x + 1, y) || inHead(x, y + 3);
      let on = y <= brow && near;
      if (dir !== 'n' && y > brow && y <= b.y1 + 3 && near && ((x - b.x0) < 2 || (b.x1 - x) < 2)) on = true; // side locks
      if (dir === 'n' && y <= b.y1 + 4 && near) on = true;
      if (dir === 'e' && y > brow && y <= b.y1 + 2 && near && x < b.cx - 1) on = true;
      if (dir === 'w' && y > brow && y <= b.y1 + 2 && near && x > b.cx + 1) on = true;
      if (!on) continue;
      const coil = ((x * 3 + y * 5 + (x >> 2) * 7) % 6); // scaled coils
      paint(out, x, y, coil < 2 ? G2 : coil < 5 ? G1 : G3);
    }
    // snake heads around the top contour; tongues flick on alternate frames
    const heads = dir === 's' ? [-0.95, -0.5, 0, 0.5, 0.95] : dir === 'n' ? [-0.8, -0.25, 0.3, 0.85] : [-0.9, -0.3, 0.4];
    for (const [k, u] of heads.entries()) {
      const hx = Math.round(b.cx + u * (b.w / 2 + 1)); const hy = b.y0 - 2 + Math.round(Math.abs(u) * 5);
      const s = (dir === 'w') ? -1 : 1;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, -1], [1, -1], [0, 1]]) paint(out, hx + dx * s, hy + dy, G1);
      paint(out, hx + s, hy - 1, EYE);
      if ((frame + k) % 2 === 0) { paint(out, hx + 2 * s, hy, TONGUE); paint(out, hx + 3 * s, hy - (k % 2), TONGUE); }
    }
    blit(ctx, out, ox, oy, o.outline || '#0b0a12');
  };

  // ---------- laurel wreath (Greek): leaves along the brow, tied at the back ----------
  HG.laurel = function (ctx, mask, r, ox, oy, o) {
    const b = HG.bbox(mask); if (!b) return; const dir = dirOf(r);
    const L1 = o.a || '#6fd6b0', L2 = o.a2 || '#2f9c86', gold = o.b;
    const out = new Array(64 * 64).fill(0); const y0 = b.y0 + Math.round(b.h * 0.3);
    for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
      const y = y0 + Math.round(Math.pow((x - b.cx) / (b.w / 2 + 1), 2) * 2);
      if (dir === 'n' && Math.abs(x - b.cx) < 2) continue;
      paint(out, x, y, (x % 2) ? L1 : L2); if (x % 3 === 0) paint(out, x, y - 1, gold || L1); if (x % 3 === 1) paint(out, x, y + 1, L2);
    }
    out.__hard = false; blit(ctx, out, ox, oy, o.outline || '#1b3a3a');
  };

  // ---------- pschent (double crown of Upper & Lower Egypt) ----------
  HG.pschent = function (ctx, mask, r, ox, oy, o) {
    const b = HG.bbox(mask); if (!b) return; const out = new Array(64 * 64).fill(0);
    const red = o.a || '#b52b35', white = o.b || '#f2efe6', top = b.y0 + Math.round(b.h * 0.38);
    for (let y = b.y0 - 12; y <= top; y++) for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
      const inner = y < b.y0 + 2 && Math.abs(x - b.cx) <= Math.max(1, 4 - (b.y0 - y) * 0.15);
      if (inner) paint(out, x, y, white); else if (y >= b.y0 - 4 && (mask[Math.min(63, y + 3) * 64 + x] || mask[Math.min(63, y + 2) * 64 + x])) paint(out, x, y, red);
    }
    blit(ctx, out, ox, oy, o.outline);
  };

  // ---------- rider half-helmet: shell over the top of the head following its outline, a centre stripe, a dark brim ----------
  HG.helmet = function (ctx, mask, r, ox, oy, o) {
    const b = HG.bbox(mask); if (!b) return; const dir = dirOf(r);
    const c = o.a || '#3f7a2e', lit = LSE.shade(c, 0.2), dk = LSE.shade(c, -0.25), stripe = o.b || '#f2efe6', brim = o.c || '#16141f';
    const out = new Array(64 * 64).fill(0);
    const top = (x) => { for (let y = 0; y < 64; y++) if (mask[y * 64 + x]) return y; return -1; };
    for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
      const xx = LSE.clamp(x, b.x0, b.x1); let t0 = top(xx); if (t0 < 0) continue; t0 -= (x < b.x0 || x > b.x1) ? 0 : 2;
      const u = (x - b.x0) / Math.max(1, b.w - 1); // 0 left .. 1 right
      const front = dir === 'e' ? u : dir === 'w' ? 1 - u : 0.5;
      const depth = dir === 'n' ? 0.62 : dir === 's' ? 0.42 : 0.72 - front * 0.36; const yb = b.y0 + Math.round(b.h * depth);
      for (let y = t0; y <= yb; y++) paint(out, x, y, u < 0.3 ? lit : u > 0.78 ? dk : c);
      if (dir !== 'n' && (dir === 's' || front > 0.45)) paint(out, x, yb + 1, brim);
      if ((dir === 's' || dir === 'n') && Math.abs(x - b.cx) < 1) for (let y = t0; y <= yb; y++) paint(out, x, y, stripe);
    }
    if (dir === 'e' || dir === 'w') { const y = b.y0 + Math.round(b.h * 0.25); for (let x = b.x0; x <= b.x1; x++) if (out[y * 64 + x]) paint(out, x, y, stripe); }
    if (o.d) { const x = dir === 'w' ? b.x1 - 1 : dir === 'e' ? b.x0 + 1 : b.x0 + 1; paint(out, x, b.y0 + 1, o.d); } // logo dot
    out.__hard = true; blit(ctx, out, ox, oy, o.outline || '#0b0a12');
  };
  // ---------- halo: a golden ring floating above the head ----------
  HG.halo = function (ctx, mask, r, ox, oy, o) {
    const b = HG.bbox(mask); if (!b) return;
    const g = o.a || '#ffe66b', g2 = o.b || '#fff6c2', g3 = o.c || '#ffc14a'; const out = new Array(64 * 64).fill(0);
    const cx = b.cx, cy = b.y0 - 5, rx = b.w / 2 + 1, ry = 2;
    for (let a = 0; a < Math.PI * 2; a += 0.04) { const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry); paint(out, x, y, Math.sin(a) < 0 ? g2 : (Math.cos(a) > 0.3 ? g3 : g)); }
    out.__hard = false; blit(ctx, out, ox, oy, o.outline || '#8a5232');
  };

  HG.TEMPLATES = ['nemes', 'snakes', 'laurel', 'pschent', 'helmet', 'halo'];

  // ---------- skin materials: replace the body ramp (dark->light index) with a material, keep the shading ----------
  const FX = {
    bandage: { ramp: ['#3d3a5c', '#7a7fa3', '#b3a98f', '#d8d2c0', '#f2efe6', '#ffffff'], pattern: (x, y, i) => (((y + Math.floor(x / 5)) % 3) === 0 ? Math.max(0, i - 2) : (((x * 7 + y * 3) % 11) === 0 ? Math.max(0, i - 1) : i)) },
    stone: { ramp: ['#16141f', '#3d3a5c', '#545577', '#7a7fa3', '#b3b9d1', '#d8dcea'], pattern: (x, y, i) => (((x * 13 + y * 7) % 17) === 0 ? Math.max(0, i - 1) : i) },
    gold: { ramp: ['#3b1f1a', '#8a5232', '#b8773f', '#ffc14a', '#ffe66b', '#fff4c2'], pattern: (x, y, i) => i },
    shadow: { ramp: ['#07060b', '#0b0a12', '#16141f', '#231f33', '#2f2a47', '#3d3a5c'], pattern: (x, y, i) => i },
    scales: { ramp: ['#0f2a24', '#1b3a3a', '#24605a', '#2f9c86', '#6fd6b0', '#a8f0d0'], pattern: (x, y, i) => ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 ? Math.max(0, i - 1) : i) },
    ghost: { ramp: ['#2f2a47', '#545577', '#8fd3ff', '#b3e4ff', '#e0f5ff', '#ffffff'], pattern: (x, y, i) => i },
  };
  HG.SKIN_FX = Object.keys(FX);
  HG.skinFx = function (name) { return FX[name] || null; };
})(typeof window !== 'undefined' ? window : globalThis);
