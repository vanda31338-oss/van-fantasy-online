import { PixelCanvas, rng, shade } from './PixelCanvas';

const OUTLINE = '#2b1d33';
export const TILE = 16;

/** Tile indices inside the generated tileset (keep in sync with maps). */
export const T = {
  GRASS: 0, GRASS2: 1, GRASS_FLOWER: 2, PATH: 3, COBBLE: 4, WATER: 5,
  FOREST: 6, FOREST2: 7, WALL: 8, COBBLE2: 9, FOREST_FLOWER: 10, DARK: 11,
} as const;
const TILE_COUNT = 12;

export function generateTileset(): HTMLCanvasElement {
  const pc = new PixelCanvas(TILE * TILE_COUNT, TILE);
  const grass = (seed: number, base: string, flowers = false) => {
    const r = rng(seed);
    pc.rect(0, 0, 16, 16, base);
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
      pc.px(x, y, shade(base, -0.14));
      if (r() < 0.5) pc.px(x, y - 1, shade(base, -0.08));
    }
    for (let i = 0; i < 6; i++) pc.px(Math.floor(r() * 16), Math.floor(r() * 16), shade(base, 0.18));
    if (flowers) {
      const cols = ['#ffffff', '#ffe060', '#ff9ac8'];
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12);
        const c = cols[i % 3];
        pc.px(x, y, c); pc.px(x - 1, y, c); pc.px(x + 1, y, c); pc.px(x, y - 1, c); pc.px(x, y + 1, '#4a9a3a');
        pc.px(x, y, '#ffe060');
      }
    }
  };
  const draw = (i: number, fn: () => void) => { pc.frame(i * TILE, 0, TILE, TILE); fn(); };

  draw(T.GRASS, () => grass(11, '#7ccf4e'));
  draw(T.GRASS2, () => grass(23, '#74c64a'));
  draw(T.GRASS_FLOWER, () => grass(37, '#7ccf4e', true));
  draw(T.PATH, () => {
    const r = rng(5);
    pc.rect(0, 0, 16, 16, '#dcbc84');
    for (let i = 0; i < 14; i++) pc.px(Math.floor(r() * 16), Math.floor(r() * 16), '#c8a46a');
    for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 15), y = Math.floor(r() * 15); pc.rect(x, y, 2, 1, '#b8946a'); pc.px(x, y - 1, '#f0d8a8'); }
  });
  const cobble = (seed: number, base: string) => {
    const r = rng(seed);
    pc.rect(0, 0, 16, 16, shade(base, -0.28));
    const stones = [[0, 0, 7, 5], [8, 0, 8, 5], [0, 6, 4, 4], [5, 6, 7, 4], [13, 6, 3, 4], [0, 11, 9, 5], [10, 11, 6, 5]];
    for (const [x, y, w, h] of stones) {
      const c = shade(base, (r() - 0.5) * 0.12);
      pc.rect(x, y, w - 1, h - 1, c);
      pc.hline(x, x + w - 2, y, shade(c, 0.15));
    }
  };
  draw(T.COBBLE, () => cobble(3, '#d6ccd8'));
  draw(T.COBBLE2, () => cobble(9, '#cfc4cf'));
  draw(T.WATER, () => {
    pc.rect(0, 0, 16, 16, '#4aa8e8');
    pc.hline(2, 6, 4, '#8ad0ff'); pc.hline(9, 13, 10, '#8ad0ff'); pc.hline(4, 6, 13, '#6abcf8');
    pc.px(12, 3, '#ffffff');
  });
  draw(T.FOREST, () => grass(51, '#5fb04a'));
  draw(T.FOREST2, () => grass(67, '#58a645'));
  draw(T.FOREST_FLOWER, () => grass(79, '#5fb04a', true));
  draw(T.WALL, () => {
    pc.rect(0, 0, 16, 16, '#8a8094');
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let col = -1; col < 3; col++) {
        const x = col * 8 + off;
        pc.rect(x, row * 4, 7, 3, '#b0a8bc');
        pc.hline(x, x + 6, row * 4, '#c8c0d4');
      }
    }
  });
  draw(T.DARK, () => pc.rect(0, 0, 16, 16, '#1e2a1a'));
  return pc.commit();
}

// ------------------------------------------------------------------ props
function tree(): HTMLCanvasElement {
  const pc = new PixelCanvas(32, 44);
  pc.rect(13, 30, 6, 12, '#8a5a32');
  pc.rect(13, 30, 2, 12, '#6a4024');
  pc.px(12, 41, '#8a5a32'); pc.px(19, 41, '#8a5a32');
  const g = '#4fae48', gl = '#7ad464', gd = '#2f8040';
  pc.ellipse(16, 22, 13, 9, g, { light: gl, dark: gd });
  pc.ellipse(10, 16, 8, 7, g, { light: gl, dark: gd });
  pc.ellipse(21, 14, 9, 8, g, { light: gl, dark: gd });
  pc.ellipse(15, 9, 8, 7, g, { light: gl, dark: gd });
  const r = rng(4);
  for (let i = 0; i < 14; i++) pc.px(5 + Math.floor(r() * 22), 4 + Math.floor(r() * 24), gl);
  pc.px(9, 20, '#ff6a6a'); pc.px(22, 12, '#ff6a6a'); pc.px(18, 24, '#ff6a6a');
  pc.outline(OUTLINE);
  return pc.commit();
}

function pine(): HTMLCanvasElement {
  const pc = new PixelCanvas(24, 44);
  pc.rect(10, 34, 4, 9, '#7a4a2a');
  const g = '#2f8a50', gl = '#4fb06a', gd = '#1f6a3a';
  for (let tier = 0; tier < 4; tier++) {
    const top = 2 + tier * 8, h = 12;
    for (let y = 0; y < h; y++) {
      const half = Math.round(((y + 2) / h) * (5 + tier * 1.6));
      pc.hline(12 - half, 11 + half, top + y, y === h - 1 ? gd : g);
      pc.px(12 - half, top + y, gl);
    }
  }
  pc.px(12, 1, '#ffe060');
  pc.outline(OUTLINE);
  return pc.commit();
}

function bush(): HTMLCanvasElement {
  const pc = new PixelCanvas(22, 16);
  pc.ellipse(7, 9, 6, 5, '#4fae48', { light: '#7ad464', dark: '#2f8040' });
  pc.ellipse(14, 8, 7, 6, '#4fae48', { light: '#7ad464', dark: '#2f8040' });
  pc.px(6, 7, '#ff8ac8'); pc.px(15, 6, '#ffffff'); pc.px(12, 10, '#ff8ac8');
  pc.outline(OUTLINE);
  return pc.commit();
}

function rock(): HTMLCanvasElement {
  const pc = new PixelCanvas(18, 14);
  pc.ellipse(9, 8, 7.5, 5, '#a8a0b0', { light: '#d0c8d8', dark: '#7a7088' });
  pc.px(12, 5, '#6fb040'); pc.px(13, 5, '#6fb040'); pc.px(5, 10, '#6fb040');
  pc.outline(OUTLINE);
  return pc.commit();
}

function flowers(): HTMLCanvasElement {
  const pc = new PixelCanvas(16, 12);
  const cols = ['#ff7ab0', '#ffe060', '#ffffff', '#a07aff'];
  [[3, 4], [8, 2], [12, 5], [6, 8], [11, 9]].forEach(([x, y], i) => {
    pc.px(x, y + 1, '#3a8a3a'); pc.px(x, y + 2, '#3a8a3a');
    const c = cols[i % cols.length];
    pc.px(x - 1, y, c); pc.px(x + 1, y, c); pc.px(x, y - 1, c); pc.px(x, y + 1, c); pc.px(x, y, '#ffe060');
  });
  return pc.commit();
}

function fountain(): HTMLCanvasElement {
  const pc = new PixelCanvas(56, 48);
  pc.ellipse(28, 37, 26, 10, '#c8c0d4', { light: '#e8e0f0', dark: '#9890a8' });
  pc.ellipse(28, 36, 22, 7, '#4aa8e8', { light: '#8ad0ff' });
  pc.hline(16, 22, 35, '#bfe6ff'); pc.hline(32, 40, 38, '#bfe6ff');
  pc.rect(25, 16, 6, 20, '#c8c0d4');
  pc.rect(25, 16, 2, 20, '#9890a8');
  pc.ellipse(28, 16, 9, 3.5, '#c8c0d4', { light: '#e8e0f0', dark: '#9890a8' });
  pc.ellipse(28, 15, 7, 2, '#4aa8e8');
  pc.rect(27, 6, 2, 9, '#bfe6ff');
  pc.px(27, 5, '#ffffff'); pc.px(28, 4, '#ffffff');
  for (const [x, y] of [[23, 8], [33, 8], [20, 12], [36, 12], [18, 18], [38, 18], [16, 25], [40, 25]]) pc.px(x, y, '#8ad0ff');
  pc.outline(OUTLINE);
  return pc.commit();
}

function lamp(): HTMLCanvasElement {
  const pc = new PixelCanvas(10, 30);
  pc.rect(4, 8, 2, 20, '#4a4458');
  pc.rect(2, 27, 6, 2, '#4a4458');
  pc.rect(2, 2, 6, 6, '#ffe8a0');
  pc.rect(3, 3, 4, 4, '#fff8d8');
  pc.hline(1, 8, 1, '#4a4458'); pc.hline(2, 7, 0, '#4a4458');
  pc.outline(OUTLINE);
  return pc.commit();
}

function board(): HTMLCanvasElement {
  const pc = new PixelCanvas(28, 28);
  pc.rect(3, 6, 2, 21, '#7a4a2a'); pc.rect(23, 6, 2, 21, '#7a4a2a');
  pc.rect(1, 4, 26, 15, '#a8723a');
  pc.rect(2, 5, 24, 13, '#c88a4a');
  pc.rect(4, 7, 6, 7, '#fff4d8'); pc.rect(12, 6, 5, 6, '#ffe8a8'); pc.rect(18, 8, 6, 8, '#fff4d8');
  pc.hline(5, 8, 9, '#a09080'); pc.hline(5, 8, 11, '#a09080'); pc.hline(19, 22, 10, '#a09080'); pc.hline(19, 22, 12, '#a09080');
  pc.px(7, 7, '#e83a3a'); pc.px(14, 6, '#3a8ae8'); pc.px(21, 8, '#e83a3a');
  pc.hline(0, 27, 3, '#7a4a2a');
  pc.outline(OUTLINE);
  return pc.commit();
}

function stall(): HTMLCanvasElement {
  const pc = new PixelCanvas(56, 44);
  pc.rect(4, 14, 2, 26, '#7a4a2a'); pc.rect(50, 14, 2, 26, '#7a4a2a');
  pc.rect(2, 28, 52, 13, '#b07a42');
  pc.hline(2, 53, 28, '#d09a5a');
  pc.rect(2, 36, 52, 1, '#8a5a32');
  for (let i = 0; i < 7; i++) {
    const c = i % 2 ? '#ffffff' : '#e8455a';
    pc.rect(1 + i * 8, 6, 8, 10, c);
    pc.rect(1 + i * 8, 16, 8, 2, i % 2 ? '#e8e0e0' : '#c03048');
  }
  pc.hline(1, 56, 5, '#c03048');
  // goods
  pc.ellipse(10, 25, 3, 3, '#e8455a', { light: '#ff8a9a' }); pc.ellipse(17, 25, 3, 3, '#4a7cf0', { light: '#8aacff' });
  pc.rect(26, 21, 8, 7, '#c8a46a'); pc.rect(38, 22, 4, 6, '#7ad464'); pc.rect(44, 23, 5, 5, '#ffe060');
  pc.outline(OUTLINE);
  return pc.commit();
}

function forge(): HTMLCanvasElement {
  const pc = new PixelCanvas(48, 40);
  pc.rect(26, 6, 18, 30, '#7a6a72');
  pc.rect(26, 6, 18, 2, '#9a8a92');
  for (let y = 9; y < 34; y += 4) pc.hline(27, 43, y, '#6a5a62');
  pc.rect(30, 20, 10, 10, '#2a1a1a');
  pc.ellipse(35, 27, 4, 3, '#ff8a2a', { light: '#ffe060' });
  pc.px(34, 23, '#ffb040'); pc.px(36, 22, '#ff6a2a');
  pc.rect(32, 0, 6, 7, '#5a4a52');
  // anvil
  pc.rect(4, 22, 16, 4, '#5a5a66'); pc.rect(8, 26, 8, 5, '#4a4a56'); pc.rect(5, 31, 14, 4, '#3a3a46');
  pc.hline(4, 19, 22, '#9a9aa8'); pc.rect(1, 23, 4, 2, '#5a5a66');
  pc.outline(OUTLINE);
  return pc.commit();
}

function portal(): HTMLCanvasElement {
  const pc = new PixelCanvas(40, 48);
  pc.ellipse(20, 22, 15, 19, '#8a8094', { light: '#b0a8bc', dark: '#6a6074' });
  pc.ellipse(20, 23, 11, 15, '#7a4ad8', { light: '#c08aff', dark: '#4a2aa0' });
  pc.ellipse(20, 23, 6, 9, '#c8a0ff', { light: '#ffffff' });
  pc.rect(4, 40, 32, 6, '#8a8094'); pc.hline(4, 35, 40, '#b0a8bc');
  pc.px(20, 4, '#7af0ff'); pc.px(19, 5, '#7af0ff'); pc.px(21, 5, '#7af0ff');
  pc.outline(OUTLINE);
  return pc.commit();
}

function crate(): HTMLCanvasElement {
  const pc = new PixelCanvas(14, 14);
  pc.rect(1, 1, 12, 12, '#b07a42');
  pc.rect(1, 1, 12, 2, '#d09a5a');
  pc.line(2, 3, 11, 12, '#8a5a32'); pc.line(11, 3, 2, 12, '#8a5a32');
  pc.outline(OUTLINE);
  return pc.commit();
}

function house(roof: string): HTMLCanvasElement {
  const pc = new PixelCanvas(72, 72);
  const wall = '#f4e6c8', beam = '#8a5a32';
  pc.rect(8, 34, 56, 36, wall);
  pc.rect(8, 34, 3, 36, shade(wall, -0.12));
  for (const x of [8, 35, 61]) pc.rect(x, 34, 3, 36, beam);
  pc.hline(8, 63, 50, beam); pc.hline(8, 63, 51, beam);
  // roof
  for (let y = 0; y < 30; y++) {
    const half = 12 + Math.round(y * 0.82);
    pc.hline(36 - half, 35 + half, 6 + y, y % 5 === 4 ? shade(roof, -0.25) : roof);
    pc.px(36 - half, 6 + y, shade(roof, 0.25));
  }
  pc.hline(2, 69, 36, shade(roof, -0.4));
  // chimney
  pc.rect(50, 4, 6, 10, '#9a8a92'); pc.hline(49, 56, 4, '#7a6a72');
  // door
  pc.rect(42, 52, 12, 18, '#7a4a2a'); pc.rect(43, 53, 10, 17, '#9a6034');
  pc.px(51, 61, '#ffe060');
  pc.ellipse(48, 53, 6, 3, '#7a4a2a');
  // windows
  for (const x of [16, 22]) {
    pc.rect(x - 2, 39, 8, 8, beam); pc.rect(x - 1, 40, 6, 6, '#8ad0ff');
    pc.px(x, 41, '#ffffff'); pc.hline(x - 1, x + 4, 43, beam);
  }
  pc.rect(14, 56, 12, 6, beam); pc.rect(15, 57, 10, 4, '#8ad0ff');
  // flower box
  pc.rect(14, 47, 14, 2, '#8a5a32');
  pc.px(16, 46, '#ff6a9a'); pc.px(20, 46, '#ffe060'); pc.px(24, 46, '#ff6a9a');
  pc.outline(OUTLINE);
  return pc.commit();
}

function tower(): HTMLCanvasElement {
  const pc = new PixelCanvas(48, 96);
  const stone = '#8a7aa8';
  pc.rect(8, 36, 32, 58, stone);
  pc.rect(8, 36, 6, 58, shade(stone, -0.2));
  pc.rect(34, 36, 6, 58, shade(stone, 0.12));
  for (let y = 40; y < 94; y += 6) pc.hline(8, 39, y, shade(stone, -0.12));
  // roof cone
  for (let y = 0; y < 34; y++) {
    const half = Math.round(2 + y * 0.6);
    pc.hline(24 - half, 23 + half, 4 + y, y % 6 === 5 ? '#3a2a7a' : '#5a3ab0');
    pc.px(23 + half, 4 + y, '#7a5ad0');
  }
  pc.hline(4, 43, 37, '#3a2a7a');
  pc.px(24, 2, '#7af0ff'); pc.px(24, 3, '#7af0ff');
  // glowing runes
  for (const [x, y] of [[18, 50], [28, 62], [20, 74]]) {
    pc.rect(x, y, 3, 3, '#7af0ff'); pc.px(x + 1, y + 1, '#ffffff');
  }
  pc.rect(19, 80, 10, 14, '#4a3a6a'); pc.ellipse(24, 80, 5, 3, '#4a3a6a');
  pc.rect(20, 42, 8, 8, '#2a1a4a'); pc.rect(21, 43, 6, 6, '#c8a0ff');
  pc.outline(OUTLINE);
  return pc.commit();
}

function castle(): HTMLCanvasElement {
  const W = 360, H = 170;
  const pc = new PixelCanvas(W, H);
  const wall = '#e6e0f0', wallD = '#b8b0cc', roof = '#3f6fd8', roofD = '#2a4ea0';
  const coneTower = (x: number, w: number, top: number, bottom: number) => {
    pc.rect(x, top, w, bottom - top, wall);
    pc.rect(x, top, Math.max(2, Math.round(w / 5)), bottom - top, wallD);
    for (let y = top + 6; y < bottom; y += 7) pc.hline(x, x + w - 1, y, '#d4cce4');
    const h = Math.round(w * 1.4);
    for (let y = 0; y < h; y++) {
      const half = Math.round((y / h) * (w / 2 + 2));
      pc.hline(x + w / 2 - half, x + w / 2 + half - 1, top - h + y, y % 5 === 4 ? roofD : roof);
    }
    pc.px(x + w / 2, top - h - 1, '#e8455a'); pc.px(x + w / 2, top - h - 2, '#e8455a');
    pc.rect(x + w / 2, top - h - 6, 1, 5, '#4a4458');
    pc.rect(x + w / 2 + 1, top - h - 6, 4, 3, '#e8455a');
    // window
    pc.rect(x + Math.round(w / 2) - 2, top + 8, 4, 6, '#3a3a6a');
    pc.px(x + Math.round(w / 2) - 1, top + 9, '#8ad0ff');
  };
  // back wall with battlements
  pc.rect(20, 100, W - 40, 70, wall);
  for (let x = 20; x < W - 20; x += 8) pc.rect(x, 96, 5, 4, wall);
  for (let y = 106; y < 170; y += 8) pc.hline(20, W - 21, y, '#d4cce4');
  // gate
  pc.rect(W / 2 - 18, 120, 36, 50, '#4a3a5a');
  pc.ellipse(W / 2, 120, 18, 10, '#4a3a5a');
  for (let x = W / 2 - 16; x < W / 2 + 16; x += 5) pc.rect(x, 112, 1, 58, '#2a1e33');
  // towers
  coneTower(20, 26, 70, 170);
  coneTower(W - 46, 26, 70, 170);
  coneTower(80, 22, 84, 140);
  coneTower(W - 102, 22, 84, 140);
  coneTower(W / 2 - 32, 64, 56, 112);
  coneTower(W / 2 - 14, 28, 34, 60);
  // banners
  for (const x of [70, W - 76]) {
    pc.rect(x, 108, 8, 18, '#3f6fd8'); pc.px(x + 3, 114, '#f0c850'); pc.px(x + 4, 114, '#f0c850');
    pc.px(x + 1, 126, '#3f6fd8'); pc.px(x + 6, 126, '#3f6fd8');
  }
  pc.outline(OUTLINE);
  return pc.commit();
}

function shadow(): HTMLCanvasElement {
  const pc = new PixelCanvas(16, 6);
  pc.ellipse(8, 3, 7.5, 2.6, '#000000', { alpha: 70 });
  return pc.commit();
}

export function generateProp(id: string): HTMLCanvasElement {
  const [kind, a] = id.split(':');
  if (kind === 'bld') {
    if (a === 'house') {
      const color = id.split(':')[2];
      return house(color === 'blue' ? '#3f7ad8' : color === 'green' ? '#4aa860' : '#d8504a');
    }
    if (a === 'tower') return tower();
    return castle();
  }
  if (kind === 'shadow') return shadow();
  switch (a) {
    case 'tree': return tree();
    case 'pine': return pine();
    case 'bush': return bush();
    case 'rock': return rock();
    case 'flowers': return flowers();
    case 'fountain': return fountain();
    case 'lamp': return lamp();
    case 'board': return board();
    case 'stall': return stall();
    case 'forge': return forge();
    case 'portal': return portal();
    case 'crate': return crate();
  }
  const pc = new PixelCanvas(8, 8);
  pc.rect(0, 0, 8, 8, '#ff00ff');
  return pc.commit();
}
