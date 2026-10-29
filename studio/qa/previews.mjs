// Render a 270x480 preview PNG of every scene in library/scenes (serve the repo root over http first):
// node studio/qa/previews.mjs http://localhost:8766  -> library/previews/<id>.png
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright'); import fs from 'fs';
const base = process.argv[2] || 'http://localhost:8766'; const root = new URL('../../', import.meta.url).pathname;
const b = await chromium.launch(); const page = await b.newPage();
await page.goto(base + '/studio/qa/harness.html'); await page.evaluate(async () => { LSE.LPC.base = '../dist/lpc/'; await LSE.loadFonts(); });
for (const f of fs.readdirSync(root + 'library/scenes')) { const item = JSON.parse(fs.readFileSync(root + 'library/scenes/' + f));
  const png = await page.evaluate((spec) => { const S = LSE.Scene; const b = S.build(Object.assign({ id: 'x' }, spec), { palette: LSE.DEFAULT_PALETTE }); const t = LSE.canvas(270, 480); const L = 8, bpm = 120;
    for (const l of ['sky']) S.drawLayer(t.ctx, b, l, 0); S.drawAmbient(t.ctx, b, 1, L, bpm, 'sky', 0); for (const l of ['far', 'mid']) S.drawLayer(t.ctx, b, l, 0); S.drawAmbient(t.ctx, b, 1, L, bpm, 'back', 0); S.drawLayer(t.ctx, b, 'ground', 0); S.drawLayer(t.ctx, b, 'near', 0); S.drawAmbient(t.ctx, b, 1, L, bpm, 'front', 0); S.drawLight(t.ctx, b, 1, bpm, 0); S.drawGlow(t.ctx, b, 1, bpm, 0); S.drawAmbient(t.ctx, b, 1, L, bpm, 'glow', 0);
    return t.c.toDataURL('image/png'); }, item.spec);
  fs.writeFileSync(root + 'library/previews/' + f.replace('.json', '.png'), Buffer.from(png.split(',')[1], 'base64')); console.log(f); }
await b.close();
