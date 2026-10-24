import { PixelCanvas, shade } from './PixelCanvas';

const OUTLINE = '#2b1d33';

function potion(color: string) {
  const pc = new PixelCanvas(16, 16);
  pc.rect(6, 1, 4, 2, '#a8723a');
  pc.rect(7, 3, 2, 2, '#e0f0ff');
  pc.ellipse(8, 10, 5, 5, color, { light: shade(color, 0.4), dark: shade(color, -0.25) });
  pc.rect(5, 7, 2, 1, '#ffffff');
  pc.outline(OUTLINE);
  return pc.commit();
}
function goo(color: string) {
  const pc = new PixelCanvas(16, 16);
  pc.ellipse(8, 10, 6, 4.5, color, { light: shade(color, 0.4), dark: shade(color, -0.25) });
  pc.ellipse(9, 6, 2.5, 2.5, color, { light: shade(color, 0.4) });
  pc.px(5, 8, '#ffffff');
  pc.outline(OUTLINE);
  return pc.commit();
}
function fang() {
  const pc = new PixelCanvas(16, 16);
  for (let y = 0; y < 11; y++) pc.hline(5 + Math.floor(y / 3), 10 - Math.floor(y / 2.2), 3 + y, y < 2 ? '#e8d8c0' : '#fff8ec');
  pc.outline(OUTLINE);
  return pc.commit();
}
function twig() {
  const pc = new PixelCanvas(16, 16);
  pc.line(3, 13, 12, 3, '#7a5a3a', 2);
  pc.px(6, 8, '#c8d880'); pc.px(9, 7, '#c8d880'); pc.px(10, 4, '#7ad06a'); pc.px(11, 5, '#7ad06a');
  pc.outline(OUTLINE);
  return pc.commit();
}
function crown() {
  const pc = new PixelCanvas(16, 16);
  pc.rect(2, 7, 12, 6, '#f2c440');
  pc.hline(2, 13, 12, '#c08a20');
  for (const x of [2, 7, 13]) { pc.px(x, 5, '#f2c440'); pc.px(x, 6, '#f2c440'); }
  pc.px(8, 9, '#e83a5a'); pc.px(4, 9, '#3ac0e8'); pc.px(11, 9, '#3ac0e8');
  pc.line(12, 8, 9, 13, '#2b1d33');
  pc.outline(OUTLINE);
  return pc.commit();
}
function sword() {
  const pc = new PixelCanvas(16, 16);
  pc.line(4, 11, 12, 3, '#eef4fb', 2);
  pc.line(3, 9, 6, 12, '#e8c050', 1);
  pc.line(2, 13, 4, 11, '#7a4a2a', 2);
  pc.outline(OUTLINE);
  return pc.commit();
}
function staff() {
  const pc = new PixelCanvas(16, 16);
  pc.line(3, 14, 11, 5, '#8a5a2e', 2);
  pc.ellipse(12, 4, 2.5, 2.5, '#6fe0ff', { light: '#ffffff' });
  pc.outline(OUTLINE);
  return pc.commit();
}
function book() {
  const pc = new PixelCanvas(16, 16);
  pc.rect(3, 2, 10, 12, '#8a3a2a');
  pc.rect(4, 3, 8, 10, '#a8483a');
  pc.rect(6, 6, 4, 3, '#e8c050');
  pc.rect(12, 3, 1, 10, '#f8f2e0');
  pc.outline(OUTLINE);
  return pc.commit();
}
function armor() {
  const pc = new PixelCanvas(16, 16);
  pc.rect(4, 3, 8, 11, '#8aa0c8');
  pc.rect(2, 3, 3, 4, '#8aa0c8'); pc.rect(11, 3, 3, 4, '#8aa0c8');
  pc.rect(6, 3, 4, 2, '#2b1d33');
  pc.hline(4, 11, 10, '#e8c050');
  pc.rect(4, 3, 2, 11, '#6a80a8');
  pc.outline(OUTLINE);
  return pc.commit();
}
function gold() {
  const pc = new PixelCanvas(16, 16);
  pc.ellipse(8, 8, 6, 6, '#f2c440', { light: '#fff0a0', dark: '#c08a20' });
  pc.rect(7, 5, 2, 6, '#c08a20');
  pc.outline(OUTLINE);
  return pc.commit();
}
function attack() {
  const pc = new PixelCanvas(24, 24);
  pc.line(5, 18, 18, 5, '#eef4fb', 3);
  pc.line(18, 18, 5, 5, '#d8e4f0', 3);
  pc.line(3, 15, 8, 20, '#e8c050', 1);
  pc.line(20, 15, 15, 20, '#e8c050', 1);
  pc.outline(OUTLINE);
  return pc.commit();
}
function menu() {
  const pc = new PixelCanvas(16, 16);
  for (const y of [3, 7, 11]) pc.rect(2, y, 12, 2, '#fff4d8');
  pc.outline(OUTLINE);
  return pc.commit();
}

const SKILL_BG: Record<string, string> = {
  power_strike: '#d8742a', war_cry: '#c83a3a', cleave: '#b0603a', armor_break: '#7a6aa8',
  second_wind: '#3aa860', ember_shot: '#e8542a', summon_wolf: '#4a8a6a',
};

function skill(id: string) {
  const pc = new PixelCanvas(20, 20);
  const bg = SKILL_BG[id] ?? '#5a5a7a';
  pc.rect(0, 0, 20, 20, shade(bg, -0.3));
  pc.rect(1, 1, 18, 18, bg);
  pc.hline(1, 18, 1, shade(bg, 0.3));
  const w = '#fff8e8';
  switch (id) {
    case 'power_strike':
      pc.line(4, 16, 14, 6, w, 2); pc.line(3, 12, 8, 17, '#ffe060');
      for (const [x, y] of [[15, 3], [17, 5], [16, 8]]) pc.px(x, y, '#ffe060');
      break;
    case 'war_cry':
      pc.ellipse(8, 10, 4, 4, '#ffd9b8'); pc.rect(9, 10, 3, 2, '#5a1a2a');
      for (const y of [6, 10, 14]) pc.line(13, 10, 17, y, '#ffe060');
      break;
    case 'cleave':
      for (let a = -60; a <= 60; a += 10) { const r = (a * Math.PI) / 180; pc.px(9 + Math.cos(r) * 7, 10 + Math.sin(r) * 7, w); pc.px(9 + Math.cos(r) * 6, 10 + Math.sin(r) * 6, '#d8e4f0'); }
      pc.line(3, 10, 8, 10, w);
      break;
    case 'armor_break':
      pc.rect(5, 4, 10, 10, '#b8c4d8'); pc.ellipse(10, 14, 5, 3, '#b8c4d8');
      pc.line(10, 4, 8, 9, '#2b1d33'); pc.line(8, 9, 11, 12, '#2b1d33'); pc.line(11, 12, 9, 16, '#2b1d33');
      break;
    case 'second_wind':
      pc.ellipse(7, 8, 3, 3, '#ff6a8a'); pc.ellipse(12, 8, 3, 3, '#ff6a8a');
      for (let y = 0; y < 6; y++) pc.hline(5 + y, 14 - y, 10 + y, '#ff6a8a');
      pc.px(6, 7, '#ffffff');
      break;
    case 'ember_shot':
      pc.ellipse(11, 10, 4, 4, '#ffb040', { light: '#fff0a0' });
      pc.line(3, 14, 8, 11, '#ff6a2a', 2); pc.line(4, 7, 8, 9, '#ff6a2a');
      break;
    case 'summon_wolf':
      pc.ellipse(10, 11, 5, 4, '#d8e4f0'); pc.rect(13, 11, 4, 2, '#d8e4f0');
      pc.px(7, 6, '#d8e4f0'); pc.px(10, 6, '#d8e4f0'); pc.px(12, 9, '#2b1d33');
      break;
  }
  return pc.commit();
}

export function generateIcon(id: string): HTMLCanvasElement {
  const [, kind, arg] = id.split(':');
  switch (kind) {
    case 'potion': return potion(arg);
    case 'goo': return goo(arg);
    case 'fang': return fang();
    case 'twig': return twig();
    case 'crown': return crown();
    case 'sword': return sword();
    case 'staff': return staff();
    case 'book': return book();
    case 'armor': return armor();
    case 'gold': return gold();
    case 'attack': return attack();
    case 'menu': return menu();
    case 'skill': return skill(arg);
  }
  return potion('#ff00ff');
}
