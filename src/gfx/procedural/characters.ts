import { PixelCanvas, shade } from './PixelCanvas';

/**
 * Procedural chibi humanoids (player classes + NPCs).
 * Sheet: 16 frames of 32x32 in one row — see HUMANOID_ANIMS in assetManifest.ts.
 */

type Hair = 'spiky' | 'short' | 'long' | 'bald' | 'ponytail';
type Headwear = 'none' | 'wizard' | 'tall_wizard' | 'hood' | 'helmet' | 'bandana';
type Weapon = 'sword' | 'staff' | 'book' | 'hammer' | 'spear' | 'none' | 'greatsword';

export interface CharStyle {
  hair: Hair;
  hairColor: string;
  skin: string;
  cloth: string;
  accent: string;
  pants: string;
  boots: string;
  headwear: Headwear;
  hatColor?: string;
  cape?: string;
  robe?: boolean;
  apron?: string;
  beard?: string;
  weapon: Weapon;
  gem?: string;
  eyes?: string;
}

const STYLES: Record<string, CharStyle> = {
  swordsman: {
    hair: 'spiky', hairColor: '#8a4a24', skin: '#ffd9b8', cloth: '#3f6fd8', accent: '#e8c050',
    pants: '#6b4a32', boots: '#4a3020', headwear: 'none', cape: '#d43c3c', weapon: 'sword',
  },
  mage: {
    hair: 'long', hairColor: '#f2c46e', skin: '#ffe0c4', cloth: '#6a4cc4', accent: '#f0c850',
    pants: '#4a3a8a', boots: '#4a3020', headwear: 'wizard', hatColor: '#5a3fb0', robe: true, weapon: 'staff', gem: '#6fe0ff',
  },
  summoner: {
    hair: 'long', hairColor: '#dcd2ee', skin: '#ffe0c4', cloth: '#efe4c8', accent: '#3d8a4a',
    pants: '#3d6a3a', boots: '#5a3a22', headwear: 'hood', hatColor: '#3f8a4c', robe: true, weapon: 'book', eyes: '#3a6ad0',
  },
  elder: {
    hair: 'short', hairColor: '#f0f0f0', skin: '#f6d2b0', cloth: '#7a5a3a', accent: '#d0b060',
    pants: '#5a4030', boots: '#4a3020', headwear: 'none', robe: true, beard: '#f4f4f4', weapon: 'staff', gem: '#9cff8a',
  },
  merchant: {
    hair: 'ponytail', hairColor: '#e2763a', skin: '#ffdcc0', cloth: '#4aa860', accent: '#f0d070',
    pants: '#6a4a30', boots: '#4a3020', headwear: 'bandana', hatColor: '#e85a7a', apron: '#f6ecd0', weapon: 'none',
  },
  blacksmith: {
    hair: 'bald', hairColor: '#e8b890', skin: '#e8b890', cloth: '#5a5a66', accent: '#c08040',
    pants: '#4a3a30', boots: '#3a2a20', headwear: 'none', apron: '#8a5a32', beard: '#8a4a24', weapon: 'hammer',
  },
  runekeeper: {
    hair: 'long', hairColor: '#5a3a8a', skin: '#ffe0c8', cloth: '#2fa0a0', accent: '#f0e080',
    pants: '#2a6a6a', boots: '#3a2a3a', headwear: 'none', robe: true, weapon: 'book', eyes: '#a050e0',
  },
  gatekeeper: {
    hair: 'short', hairColor: '#6a4a2a', skin: '#f0c8a0', cloth: '#9aa8c0', accent: '#3a5ab0',
    pants: '#4a5068', boots: '#3a3040', headwear: 'helmet', hatColor: '#b8c4d8', cape: '#3a5ab0', weapon: 'spear',
  },
  swordmaster: {
    hair: 'short', hairColor: '#b8b8c8', skin: '#f0c8a0', cloth: '#b03a3a', accent: '#e8c050',
    pants: '#4a3030', boots: '#3a2020', headwear: 'none', cape: '#2a2a3a', beard: '#b8b8c8', weapon: 'greatsword',
  },
  archmage: {
    hair: 'short', hairColor: '#f4f4f4', skin: '#f6d2b0', cloth: '#2f5ab8', accent: '#f0d060',
    pants: '#24407a', boots: '#3a2a20', headwear: 'tall_wizard', hatColor: '#2a4aa0', robe: true, beard: '#f4f4f4', weapon: 'staff', gem: '#ff7ae0',
  },
  beastsage: {
    hair: 'long', hairColor: '#7a5a3a', skin: '#e8c098', cloth: '#8a6a3a', accent: '#5ab060',
    pants: '#5a4a2a', boots: '#3a2a1a', headwear: 'hood', hatColor: '#6a5030', robe: true, weapon: 'book',
  },
};

interface Pose {
  bob: number; // vertical offset of upper body
  dx: number; // whole-figure x offset
  legFront: number; // x offset of front leg
  legBack: number;
  liftFront?: number;
  liftBack?: number;
  hand: [number, number];
  angle: number; // weapon angle (deg, screen space, 0 = right, -90 = up)
  eyes: 'open' | 'closed';
  glow?: number; // magic glow size
  kneel?: boolean;
  capeFlutter?: number;
}

const POSES: Pose[] = [
  // 0-1 idle
  { bob: 0, dx: 0, legFront: 0, legBack: 0, hand: [19, 22], angle: -55, eyes: 'open' },
  { bob: 1, dx: 0, legFront: 0, legBack: 0, hand: [19, 23], angle: -52, eyes: 'open' },
  // 2-5 walk
  { bob: 0, dx: 0, legFront: 2, legBack: -2, hand: [19, 22], angle: -50, eyes: 'open', capeFlutter: 1 },
  { bob: -1, dx: 0, legFront: 0, legBack: 0, liftFront: 1, hand: [19, 21], angle: -55, eyes: 'open', capeFlutter: 2 },
  { bob: 0, dx: 0, legFront: -2, legBack: 2, hand: [19, 22], angle: -60, eyes: 'open', capeFlutter: 1 },
  { bob: -1, dx: 0, legFront: 0, legBack: 0, liftBack: 1, hand: [19, 21], angle: -55, eyes: 'open', capeFlutter: 2 },
  // 6-8 attack
  { bob: 0, dx: -1, legFront: 1, legBack: -1, hand: [14, 15], angle: -125, eyes: 'open' },
  { bob: 0, dx: 1, legFront: 2, legBack: -2, hand: [21, 17], angle: -15, eyes: 'open', capeFlutter: 2 },
  { bob: 1, dx: 1, legFront: 2, legBack: -2, hand: [21, 22], angle: 40, eyes: 'open', capeFlutter: 1 },
  // 9-11 cast
  { bob: 0, dx: 0, legFront: 0, legBack: 0, hand: [19, 19], angle: -80, eyes: 'open', glow: 1 },
  { bob: -1, dx: 0, legFront: 0, legBack: 0, hand: [21, 16], angle: -70, eyes: 'open', glow: 2 },
  { bob: -1, dx: 0, legFront: 0, legBack: 0, hand: [21, 16], angle: -70, eyes: 'open', glow: 3 },
  // 12 hurt
  { bob: 1, dx: -2, legFront: -1, legBack: 1, hand: [17, 22], angle: 70, eyes: 'closed' },
  // 13 death (kneel)
  { bob: 4, dx: -1, legFront: 1, legBack: -1, hand: [18, 25], angle: 20, eyes: 'closed', kneel: true },
];

const OUTLINE = '#2b1d33';

function drawWeapon(pc: PixelCanvas, s: CharStyle, hx: number, hy: number, angleDeg: number, glow = 0) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const at = (d: number): [number, number] => [hx + dx * d, hy + dy * d];
  switch (s.weapon) {
    case 'sword':
    case 'greatsword': {
      const len = s.weapon === 'greatsword' ? 13 : 10;
      const [gx0, gy0] = at(-2);
      pc.line(gx0, gy0, hx, hy, '#7a4a2a', 1); // grip
      // cross-guard perpendicular
      const px = -dy, py = dx;
      pc.line(hx + px * 2, hy + py * 2, hx - px * 2, hy - py * 2, '#e8c050', 1);
      const [bx0, by0] = at(1);
      const [bx1, by1] = at(len);
      pc.line(bx0, by0, bx1, by1, '#eef4fb', s.weapon === 'greatsword' ? 3 : 2);
      pc.line(bx0 + px * 0.8, by0 + py * 0.8, bx1 + px * 0.8, by1 + py * 0.8, '#a8b8d0', 1);
      break;
    }
    case 'staff': {
      const [x0, y0] = at(-6);
      const [x1, y1] = at(10);
      pc.line(x0, y0, x1, y1, '#8a5a2e', 1);
      pc.line(x0 + 1, y0, x1 + 1, y1, '#6a4020', 1);
      const [cx, cy] = at(12);
      pc.ellipse(cx, cy, 2, 2, s.gem ?? '#6fe0ff', { light: '#ffffff' });
      if (glow) pc.ellipse(cx, cy, 2 + glow, 2 + glow, s.gem ?? '#6fe0ff', { alpha: 70 });
      break;
    }
    case 'book': {
      if (glow) {
        pc.rect(hx - 2, hy - 3, 8, 4, '#f8f2e0');
        pc.rect(hx + 1, hy - 3, 1, 4, '#6a4a2a');
        pc.hline(hx - 1, hx, hy - 2, '#a09080');
        pc.hline(hx + 3, hx + 4, hy - 2, '#a09080');
        for (let i = 0; i < glow; i++) pc.px(hx + 1 + (i % 2 ? 2 : -2), hy - 5 - i * 2, '#8affb0');
      } else {
        pc.rect(hx - 1, hy - 3, 4, 5, '#8a3a2a');
        pc.rect(hx, hy - 2, 2, 1, '#e8c050');
      }
      break;
    }
    case 'hammer': {
      const [x1, y1] = at(7);
      pc.line(hx, hy, x1, y1, '#7a4a2a', 1);
      pc.rect(Math.round(x1) - 2, Math.round(y1) - 1, 5, 3, '#8a8a96');
      pc.hline(Math.round(x1) - 2, Math.round(x1) + 2, Math.round(y1) - 1, '#c0c0cc');
      break;
    }
    case 'spear': {
      const [x0, y0] = at(-6);
      const [x1, y1] = at(13);
      pc.line(x0, y0, x1, y1, '#8a5a2e', 1);
      const [tx, ty] = at(16);
      pc.line(x1, y1, tx, ty, '#dce6f2', 2);
      break;
    }
    case 'none':
      break;
  }
}

function drawHead(pc: PixelCanvas, s: CharStyle, ox: number, oy: number, eyes: 'open' | 'closed') {
  const hairDark = shade(s.hairColor, -0.25);
  const skinShade = shade(s.skin, -0.12);
  const cx = 16 + ox, cy = 11 + oy;
  // Long hair falls behind the body.
  if (s.hair === 'long') {
    pc.rect(cx - 6, cy, 5, 10, hairDark);
    pc.rect(cx - 5, cy, 4, 9, s.hairColor);
  }
  if (s.hair === 'ponytail') {
    pc.rect(cx - 8, cy - 1, 3, 6, s.hairColor);
    pc.px(cx - 8, cy + 5, hairDark);
  }
  // Skull / hair mass
  const baseHair = s.hair === 'bald' ? s.skin : s.hairColor;
  pc.ellipse(cx - 0.5, cy, 6.5, 6, baseHair, { dark: s.hair === 'bald' ? skinShade : hairDark, light: shade(baseHair, 0.25) });
  // Face
  pc.rect(cx - 3, cy - 2, 9, 7, s.skin);
  pc.rect(cx - 2, cy + 5, 7, 1, s.skin);
  pc.px(cx - 3, cy + 4, skinShade);
  pc.px(cx - 2, cy + 1, skinShade); // ear
  // Bangs
  if (s.hair !== 'bald') {
    pc.hline(cx - 3, cx + 5, cy - 3, s.hairColor);
    pc.hline(cx - 3, cx + 4, cy - 2, s.hairColor);
    pc.px(cx - 3, cy - 1, s.hairColor);
    pc.px(cx - 3, cy, hairDark);
    pc.px(cx + 1, cy - 1, s.hairColor);
    pc.px(cx + 5, cy - 1, s.hairColor);
  }
  if (s.hair === 'spiky') {
    pc.px(cx - 5, cy - 6, s.hairColor); pc.px(cx - 4, cy - 6, s.hairColor);
    pc.px(cx - 2, cy - 7, s.hairColor); pc.px(cx - 1, cy - 7, s.hairColor);
    pc.px(cx + 2, cy - 7, s.hairColor);
    pc.px(cx + 4, cy - 6, s.hairColor); pc.px(cx + 6, cy - 4, s.hairColor);
    pc.px(cx + 6, cy - 3, s.hairColor);
    pc.px(cx - 7, cy - 2, s.hairColor); pc.px(cx - 8, cy - 1, s.hairColor);
  }
  // Eyes
  const eyeCol = s.eyes ?? '#2a2a4a';
  if (eyes === 'open') {
    pc.rect(cx + 1, cy, 1, 2, eyeCol);
    pc.rect(cx + 4, cy, 1, 2, eyeCol);
    pc.px(cx + 1, cy, '#ffffff');
    pc.px(cx + 4, cy, '#ffffff');
  } else {
    pc.hline(cx, cx + 1, cy + 1, eyeCol);
    pc.hline(cx + 4, cx + 5, cy + 1, eyeCol);
  }
  pc.px(cx - 1, cy + 3, '#ff9aa8'); // blush
  pc.px(cx + 3, cy + 3, shade(s.skin, -0.3)); // mouth
  if (s.beard) {
    pc.rect(cx - 2, cy + 3, 8, 3, s.beard);
    pc.rect(cx - 1, cy + 6, 6, 2, s.beard);
    pc.rect(cx, cy + 8, 4, 1, s.beard);
    pc.px(cx + 3, cy + 3, shade(s.beard, -0.3));
  }
  // Headwear
  const hat = s.hatColor ?? '#555';
  const hatDark = shade(hat, -0.3);
  switch (s.headwear) {
    case 'wizard':
    case 'tall_wizard': {
      const tall = s.headwear === 'tall_wizard';
      pc.hline(cx - 9, cx + 8, cy - 3, hatDark);
      pc.hline(cx - 8, cx + 7, cy - 4, hat);
      pc.hline(cx - 6, cx + 5, cy - 5, s.accent);
      const h = tall ? 9 : 6;
      for (let i = 0; i < h; i++) {
        const half = Math.max(0, Math.round(5 - (i * 5) / h));
        pc.hline(cx - half - Math.floor(i / 3), cx + half - Math.floor(i / 3), cy - 6 - i, i % 4 === 3 ? hatDark : hat);
      }
      pc.px(cx - 3 - Math.floor(h / 3), cy - 6 - h, hat);
      pc.px(cx - 4 - Math.floor(h / 3), cy - 5 - h, hat);
      break;
    }
    case 'hood': {
      pc.ellipse(cx - 0.5, cy - 1, 7.5, 6.5, hat, { dark: hatDark, light: shade(hat, 0.2) });
      pc.rect(cx - 2, cy - 2, 8, 7, s.skin);
      pc.rect(cx - 1, cy + 5, 6, 1, s.skin);
      pc.hline(cx - 2, cx + 5, cy - 3, s.hairColor);
      pc.hline(cx - 2, cx + 1, cy - 2, s.hairColor);
      pc.px(cx + 1, cy, eyes === 'open' ? '#ffffff' : s.eyes ?? '#2a2a4a');
      pc.rect(cx + 1, cy, 1, 2, s.eyes ?? '#2a2a4a');
      pc.rect(cx + 4, cy, 1, 2, s.eyes ?? '#2a2a4a');
      if (eyes === 'open') { pc.px(cx + 1, cy, '#ffffff'); pc.px(cx + 4, cy, '#ffffff'); }
      pc.px(cx - 1, cy + 3, '#ff9aa8');
      pc.hline(cx - 6, cx - 4, cy - 7, s.accent);
      pc.px(cx - 8, cy + 1, hat); pc.px(cx - 9, cy + 2, hat);
      break;
    }
    case 'helmet': {
      pc.ellipse(cx - 0.5, cy - 2, 7, 5, hat, { dark: hatDark, light: '#ffffff' });
      pc.hline(cx - 7, cx + 6, cy - 1, hatDark);
      pc.rect(cx + 2, cy - 1, 1, 3, hat);
      pc.px(cx - 1, cy - 8, '#d43c3c'); pc.px(cx, cy - 9, '#d43c3c'); pc.px(cx - 2, cy - 8, '#d43c3c');
      break;
    }
    case 'bandana': {
      pc.hline(cx - 6, cx + 5, cy - 4, hat);
      pc.hline(cx - 5, cx + 4, cy - 5, hat);
      pc.hline(cx - 4, cx + 3, cy - 6, shade(hat, 0.2));
      pc.px(cx - 7, cy - 3, hat); pc.px(cx - 8, cy - 2, hat);
      break;
    }
  }
}

function drawFigure(pc: PixelCanvas, s: CharStyle, p: Pose) {
  const ox = p.dx;
  const b = p.bob;
  const clothDark = shade(s.cloth, -0.25);
  // Cape (behind everything)
  if (s.cape) {
    const f = p.capeFlutter ?? 0;
    pc.rect(11 + ox - f, 18 + b, 4, 8 - Math.max(0, b - 1), s.cape);
    pc.rect(10 + ox - f, 22 + b, 2, 4, shade(s.cape, -0.2));
  }
  // Legs
  if (!p.kneel) {
    const legY = 25;
    const back = 14 + ox + p.legBack, front = 17 + ox + p.legFront;
    const lb = p.liftBack ?? 0, lf = p.liftFront ?? 0;
    pc.rect(back, legY - lb, 2, 4, shade(s.pants, -0.2));
    pc.rect(back - 0, 29 - lb, 3, 1, shade(s.boots, -0.2));
    pc.rect(back, 28 - lb, 2, 1, shade(s.boots, -0.2));
    pc.rect(front, legY - lf, 2, 4, s.pants);
    pc.rect(front, 28 - lf, 2, 1, s.boots);
    pc.rect(front, 29 - lf, 3, 1, s.boots);
  } else {
    pc.rect(13 + ox, 27, 4, 2, s.pants);
    pc.rect(17 + ox, 26, 3, 3, s.pants);
    pc.rect(12 + ox, 29, 4, 1, s.boots);
    pc.rect(19 + ox, 29, 3, 1, s.boots);
  }
  // Back arm
  pc.rect(12 + ox, 19 + b, 2, 4, clothDark);
  pc.rect(12 + ox, 23 + b, 2, 1, shade(s.skin, -0.12));
  // Torso
  pc.rect(12 + ox, 18 + b, 8, 7, s.cloth);
  pc.rect(12 + ox, 18 + b, 2, 7, clothDark);
  pc.hline(13 + ox, 18 + ox, 18 + b, shade(s.cloth, 0.2));
  if (s.robe) {
    const bottom = p.kneel ? 28 : 28;
    for (let y = 24 + b; y <= bottom; y++) {
      const w = 8 + Math.floor((y - 24 - b) / 2) * 2;
      pc.hline(16 + ox - w / 2, 15 + ox + w / 2, y, y === bottom ? shade(s.cloth, -0.15) : s.cloth);
    }
    pc.hline(12 + ox, 19 + ox, 23 + b, s.accent);
    pc.px(16 + ox, 19 + b, s.accent);
    pc.px(16 + ox, 21 + b, s.accent);
  } else {
    pc.hline(12 + ox, 19 + ox, 23 + b, s.accent);
    pc.px(17 + ox, 23 + b, '#fff4b0');
  }
  if (s.apron) {
    pc.rect(15 + ox, 19 + b, 5, 7, s.apron);
    pc.hline(15 + ox, 19 + ox, 19 + b, shade(s.apron, -0.15));
  }
  if (s.headwear === 'helmet') {
    // shoulder plates
    pc.rect(12 + ox, 18 + b, 3, 2, s.hatColor ?? '#ccc');
    pc.rect(18 + ox, 18 + b, 2, 2, s.hatColor ?? '#ccc');
  }
  // Head
  drawHead(pc, s, ox, b, p.eyes);
  // Front arm + weapon
  const sx = 17 + ox, sy = 19 + b;
  const [hx, hy] = [p.hand[0] + ox, p.hand[1] + b];
  const weaponBehind = p.angle < -100;
  if (weaponBehind) drawWeapon(pc, s, hx, hy, p.angle, p.glow);
  pc.line(sx, sy, hx, hy, s.cloth, 2);
  pc.rect(hx, hy, 2, 2, s.skin);
  if (!weaponBehind) drawWeapon(pc, s, hx, hy, p.angle, p.glow);
}

export function generateCharacterSheet(styleId: string): HTMLCanvasElement {
  const s = STYLES[styleId] ?? STYLES.swordsman;
  const FW = 32, FH = 32, N = 16;
  const pc = new PixelCanvas(FW * N, FH);
  POSES.forEach((pose, i) => {
    pc.frame(i * FW, 0, FW, FH);
    drawFigure(pc, s, pose);
    pc.outline(OUTLINE);
  });
  // Death frames 14-15: lying down (rotate the kneel frame).
  pc.frame(0, 0, pc.w, pc.h);
  pc.ox = 0; pc.oy = 0;
  pc.blit(12 * FW, 0, FW, FH, 14 * FW, 4, { rotate90: true });
  pc.blit(12 * FW, 0, FW, FH, 15 * FW, 4, { rotate90: true, alpha: 0.55 });
  return pc.commit();
}

/** A single still portrait (head & shoulders) for HUD / character cards. */
export function characterStyleIds() {
  return Object.keys(STYLES);
}
