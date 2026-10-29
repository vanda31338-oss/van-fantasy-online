// Tiny raster api for hand-drawn props: shapes -> {pal, rows} pixel maps, recording the same drawing as shape ops (LSE.Pixel.fromOps).
const CH = 'abcdefghijklmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ0123456789#$%&*+-=@^~';
export function grid(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const ops = []; // the same drawing as shape ops (LSE.Pixel.fromOps) — shipped as examples for the in-app artist
  const api = {
    w, h, g, ops,
    px(x, y, c) { if (!api.inner) ops.push(['px', x, y, c]); x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; },
    rect(x, y, ww, hh, c) { ops.push(['rect', x, y, ww, hh, c]); api.inner = 1; for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) api.px(x + i, y + j, c); api.inner = 0; },
    line(x0, y0, x1, y1, c) { ops.push(['line', x0, y0, x1, y1, c]); api.inner = 1; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let k = 0; k <= n; k++) api.px(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c); api.inner = 0; },
    circle(cx, cy, r, c) { ops.push(['circle', cx, cy, r, c]); api.inner = 1; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) api.px(cx + x, cy + y, c); api.inner = 0; },
    ellipse(cx, cy, rx, ry, c) { ops.push(['ellipse', cx, cy, rx, ry, c]); api.inner = 1; for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) api.px(cx + x, cy + y, c); api.inner = 0; },
    poly(pts, c) { ops.push(['poly', pts, c]); api.inner = 1; // same even-odd fill + edges as LSE.Pixel.fromOps
      const ys = pts.map((q) => q[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + (y + 0.5 - ay) / (by - ay) * (bx - ax)); } xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) api.px(x, y, c); }
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1; for (let k = 0; k <= n; k++) api.px(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, c); }
      api.inner = 0; },
    outline(c) { api.outlineColor = c; const o = g.map((r) => r.slice()); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== c)) o[y][x] = c; for (let y = 0; y < h; y++) g[y] = o[y]; },
    spec() { return { w, h, outline: api.outlineColor || null, ops }; },
    out() { const pal = {}; const rev = {}; let k = 0; const rows = g.map((r) => r.map((c) => { if (!c) return '.'; if (!rev[c]) { rev[c] = CH[k++]; pal[rev[c]] = c; } return rev[c]; }).join('')); return { pal, rows }; },
  };
  return api;
}
