import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import fs from 'fs';
const out = '/home/user/legend-studio/qa/' + (process.env.P ? process.env.P + '/' : '');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8765/qa/harness.html' + (process.env.P ? '?p=' + process.env.P : ''));
const save = (name, durl) => fs.writeFileSync(out + name, Buffer.from(durl.split(',')[1], 'base64'));
const info = await page.evaluate(() => QA.init());
console.log(JSON.stringify(info, null, 1));
const what = process.argv[2] || 'all';
if (what === 'all' || what === 'contact') save('contact.png', await page.evaluate(() => QA.contact(3, 6)));
if (what === 'all' || what === 'strip') { for (const id of (process.env.IDS || 'c1,c2,c3').split(',')) save(`strip_${id}.png`, await page.evaluate((id) => QA.strip(id), id)); }
if (what === 'all' || what === 'frame') { for (const t of (process.argv[3] || '0,1,10').split(',')) save(`frame_${t}.png`, await page.evaluate((t) => QA.frame(+t), +t)); }
if (what === 'scene') { for (const id of (process.argv[3] || 's1').split(',')) save(`scene_${id}.png`, await page.evaluate((id) => QA.scene(id), id)); }
if (what === 'all' || what === 'seam') console.log('seam', JSON.stringify(await page.evaluate(() => QA.seam())));
console.log('export', JSON.stringify(await page.evaluate(() => QA.exportTest())));
await browser.close();
