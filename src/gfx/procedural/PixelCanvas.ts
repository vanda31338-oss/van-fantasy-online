/** Small helper for drawing crisp pixel art onto an offscreen canvas. */
export type RGBA = [number, number, number, number];

export function hex(c: string, a = 255): RGBA {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function shade(c: string, f: number): string {
  const [r, g, b] = hex(c);
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return '#' + [k(r), k(g), k(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Deterministic PRNG so procedural art is identical every boot. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export class PixelCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly data: ImageData;
  /** Clip region (used when drawing into one frame of a sheet). */
  clip = { x: 0, y: 0, w: 0, h: 0 };
  ox = 0;
  oy = 0;

  constructor(readonly w: number, readonly h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.data = this.ctx.createImageData(w, h);
    this.clip = { x: 0, y: 0, w, h };
  }

  /** Restrict drawing to a frame and translate coordinates to it. */
  frame(fx: number, fy: number, fw: number, fh: number) {
    this.clip = { x: fx, y: fy, w: fw, h: fh };
    this.ox = fx;
    this.oy = fy;
  }

  private idx(x: number, y: number) {
    return (y * this.w + x) * 4;
  }

  inClip(ax: number, ay: number) {
    const c = this.clip;
    return ax >= c.x && ay >= c.y && ax < c.x + c.w && ay < c.y + c.h;
  }

  px(x: number, y: number, color: string | RGBA, alpha?: number) {
    const ax = Math.round(x) + this.ox;
    const ay = Math.round(y) + this.oy;
    if (!this.inClip(ax, ay)) return;
    const c = typeof color === 'string' ? hex(color, alpha ?? 255) : color;
    const i = this.idx(ax, ay);
    const d = this.data.data;
    if (c[3] >= 255 || d[i + 3] === 0) {
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = Math.max(c[3], d[i + 3]);
    } else {
      const a = c[3] / 255;
      d[i] = Math.round(d[i] * (1 - a) + c[0] * a);
      d[i + 1] = Math.round(d[i + 1] * (1 - a) + c[1] * a);
      d[i + 2] = Math.round(d[i + 2] * (1 - a) + c[2] * a);
      d[i + 3] = Math.min(255, d[i + 3] + c[3]);
    }
  }

  get(x: number, y: number): RGBA {
    const ax = x + this.ox;
    const ay = y + this.oy;
    if (!this.inClip(ax, ay)) return [0, 0, 0, 0];
    const i = this.idx(ax, ay);
    const d = this.data.data;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  }

  clear(x: number, y: number) {
    const ax = x + this.ox;
    const ay = y + this.oy;
    if (!this.inClip(ax, ay)) return;
    const i = this.idx(ax, ay);
    this.data.data[i + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha?: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color, alpha);
  }

  hline(x0: number, x1: number, y: number, color: string, alpha?: number) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, color, alpha);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1, alpha?: number) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (thick <= 1) this.px(x0, y0, color, alpha);
      else this.rect(x0 - Math.floor((thick - 1) / 2), y0 - Math.floor((thick - 1) / 2), thick, thick, color, alpha);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled ellipse with optional top-left lighting. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, opts: { light?: string; dark?: string; alpha?: number } = {}) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        let c = color;
        if (opts.dark && nx * 0.6 + ny * 0.8 > 0.45) c = opts.dark;
        if (opts.light && nx * 0.6 + ny * 0.8 < -0.55) c = opts.light;
        this.px(x, y, c, opts.alpha);
      }
    }
  }

  circleOutline(cx: number, cy: number, r: number, color: string, alpha?: number, thick = 1) {
    for (let y = Math.floor(cy - r - thick); y <= Math.ceil(cy + r + thick); y++) {
      for (let x = Math.floor(cx - r - thick); x <= Math.ceil(cx + r + thick); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d > r - thick) this.px(x, y, color, alpha);
      }
    }
  }

  ellipseOutline(cx: number, cy: number, rx: number, ry: number, color: string, alpha?: number, thick = 1) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = Math.sqrt(nx * nx + ny * ny);
        const inner = 1 - thick / Math.min(rx, ry);
        if (d <= 1 && d > inner) this.px(x, y, color, alpha);
      }
    }
  }

  /** Draw an ASCII template. '.' and ' ' are transparent. */
  template(rows: string[], palette: Record<string, string>, x: number, y: number, flip = false) {
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const col = palette[ch];
        if (!col) continue;
        this.px(flip ? x + (w - 1 - i) : x + i, y + j, col);
      }
    });
  }

  /** Add a 1px outline around all opaque pixels inside the current clip frame. */
  outline(color = '#2b1d33', alphaThreshold = 100) {
    const { w, h } = this.clip;
    const solid: boolean[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) solid.push(this.get(x, y)[3] >= alphaThreshold);
    const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (solid[y * w + x]) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) this.px(x, y, color);
      }
    }
  }

  /** Copy a rectangular block of pixels from one frame to another (absolute coords). */
  blit(sx: number, sy: number, w: number, h: number, dx: number, dy: number, opts: { rotate90?: boolean; alpha?: number; flipX?: boolean } = {}) {
    const src = new Uint8ClampedArray(w * h * 4);
    const d = this.data.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = ((sy + y) * this.w + (sx + x)) * 4;
      src.set(d.subarray(si, si + 4), (y * w + x) * 4);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] === 0) continue;
      let tx = opts.flipX ? w - 1 - x : x;
      let ty = y;
      if (opts.rotate90) {
        // rotate clockwise around frame: (x,y) -> (h-1-y, x)
        tx = h - 1 - y;
        ty = x;
      }
      const ax = dx + tx, ay = dy + ty;
      if (ax < 0 || ay < 0 || ax >= this.w || ay >= this.h) continue;
      const di = (ay * this.w + ax) * 4;
      d[di] = src[i]; d[di + 1] = src[i + 1]; d[di + 2] = src[i + 2];
      d[di + 3] = Math.round(src[i + 3] * (opts.alpha ?? 1));
    }
  }

  commit(): HTMLCanvasElement {
    this.ctx.putImageData(this.data, 0, 0);
    return this.canvas;
  }
}
