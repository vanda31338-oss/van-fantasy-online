// Legend Shorts Engine — shared helpers (colour, palette, rng). Plain script, global LSE.
(function (G) {
  const LSE = (G.LSE = G.LSE || {});

  // deterministic RNG (mulberry32)
  LSE.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  LSE.hash = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  LSE.rgba = (h, a) => { const [r, g, b] = LSE.hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
  LSE.hexToRgb = function (h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  LSE.rgbToHex = function (r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  };
  LSE.isHex = (s) => /^#?[0-9a-fA-F]{6}$/.test(String(s || '').trim());
  LSE.parseHexList = function (text) {
    const out = [];
    String(text || '').replace(/#?([0-9a-fA-F]{6})\b/g, (_, h) => { out.push('#' + h.toLowerCase()); return ''; });
    return [...new Set(out)];
  };

  // OKLab
  function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function linToSrgb(c) { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(v * 255))); }
  LSE.rgbToOklab = function (r, g, b) {
    const R = srgbToLin(r), Gx = srgbToLin(g), B = srgbToLin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * Gx + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * Gx + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * Gx + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  LSE.oklabToRgb = function (L, a, b) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    return [linToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
  };

  // Palette snapper with cache: nearest entry in OKLab (lightness weighted a little more)
  LSE.makeSnapper = function (hexList) {
    const pal = (hexList || []).map((h) => { const c = LSE.hexToRgb(h); return { c, lab: LSE.rgbToOklab(c[0], c[1], c[2]) }; });
    const cache = new Map();
    function snap(r, g, b) {
      if (!pal.length) return [r, g, b];
      const key = (r << 16) | (g << 8) | b;
      let v = cache.get(key);
      if (v) return v;
      const lab = LSE.rgbToOklab(r, g, b);
      let best = pal[0], bd = 1e9;
      for (const p of pal) {
        const dL = (lab[0] - p.lab[0]) * 1.3, da = lab[1] - p.lab[1], db = lab[2] - p.lab[2];
        const d = dL * dL + da * da + db * db;
        if (d < bd) { bd = d; best = p; }
      }
      v = best.c; cache.set(key, v); return v;
    }
    snap.size = pal.length;
    return snap;
  };
  // detail-preserving palette matching for LPC layers: keep each pixel's lightness (so ramps and shading
  // survive), pull its hue/chroma toward the nearest palette colour so it sits in the scene's tone
  LSE.makeHarmonizer = function (hexList, strength) {
    strength = strength ?? 0.7;
    const pal = (hexList || []).map((h) => { const c = LSE.hexToRgb(h); return LSE.rgbToOklab(c[0], c[1], c[2]); });
    const cache = new Map();
    function harm(r, g, b) {
      if (!pal.length) return [r, g, b];
      const key = (r << 16) | (g << 8) | b; let v = cache.get(key); if (v) return v;
      const lab = LSE.rgbToOklab(r, g, b); let best = pal[0], bd = 1e9;
      for (const p of pal) { const dL = (lab[0] - p[0]) * 0.6, da = lab[1] - p[1], db = lab[2] - p[2]; const d = dL * dL + da * da + db * db; if (d < bd) { bd = d; best = p; } }
      v = LSE.oklabToRgb(lab[0] * (1 - strength * 0.25) + best[0] * strength * 0.25, lab[1] + (best[1] - lab[1]) * strength, lab[2] + (best[2] - lab[2]) * strength);
      cache.set(key, v); return v;
    }
    harm.size = pal.length; return harm;
  };
  LSE.snapImageData = function (img, snap) {
    if (!snap || !snap.size) return img;
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) { d[i + 3] = 0; continue; }
      const c = snap(d[i], d[i + 1], d[i + 2]);
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    return img;
  };
  LSE.shade = function (hex, k) { // k<0 darker, k>0 lighter, in OKLab L
    const c = LSE.hexToRgb(hex); const lab = LSE.rgbToOklab(c[0], c[1], c[2]);
    const o = LSE.oklabToRgb(Math.max(0, Math.min(1, lab[0] + k)), lab[1] * (k < 0 ? 1 + k : 1), lab[2] * (k < 0 ? 1 + k : 1));
    return LSE.rgbToHex(o[0], o[1], o[2]);
  };
  LSE.mix = function (h1, h2, t) {
    const a = LSE.hexToRgb(h1), b = LSE.hexToRgb(h2);
    return LSE.rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  };

  LSE.canvas = function (w, h) {
    let c;
    if (typeof OffscreenCanvas !== 'undefined' && LSE.useOffscreen) c = new OffscreenCanvas(w, h);
    else { c = document.createElement('canvas'); c.width = w; c.height = h; }
    const ctx = c.getContext('2d', { willReadFrequently: false });
    ctx.imageSmoothingEnabled = false;
    return { c, ctx };
  };
  LSE.loadImage = function (src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('โหลดรูปไม่ได้: ' + src)); im.src = src; });
  };
  // loop-safe time quantisers: L is a whole number of steps, so nudge to avoid k-1e-12 flooring to k-1
  LSE.tick = (t, step) => Math.floor(t / step + 1e-6);
  LSE.frac = (t, P) => ((t / P + 1e-6) % 1 + 1) % 1;
  LSE.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  LSE.lerp = (a, b, t) => a + (b - a) * t;
  LSE.ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Default master palette for the channel (dark, mysterious but vivid; 32 colours)
  LSE.DEFAULT_PALETTE = [
    '#0b0a12', '#16141f', '#231f33', '#2f2a47', '#3d3a5c', '#545577', '#7a7fa3', '#b3b9d1',
    '#f2efe6', '#ffffff', '#3b1f1a', '#5c3424', '#8a5232', '#b8773f', '#d9a35b', '#f2d38a',
    '#4a1220', '#7d1c2b', '#b52b35', '#e0533f', '#ff8a4c', '#ffc14a', '#ffe66b', '#1b3a3a',
    '#24605a', '#2f9c86', '#6fd6b0', '#183057', '#2253a3', '#3e8de0', '#8fd3ff', '#9b5de5',
  ];
})(typeof window !== 'undefined' ? window : globalThis);
