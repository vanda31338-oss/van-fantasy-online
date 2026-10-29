import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const out = '/home/user/legend-studio/qa/ui_';
const W = +process.env.W || 1280, H = +process.env.H || 900;
const browser = await chromium.launch();
const page = await browser.newPage({ acceptDownloads: true, viewport: { width: W, height: H }, colorScheme: process.env.LIGHT ? 'light' : 'dark' });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') { errs.push(m.text()); console.log('[err]', m.text()); } });
page.on('pageerror', (e) => { errs.push(e.message); console.log('[pageerror]', e.message); });
const shot = (n) => page.screenshot({ path: out + n + '.png', fullPage: !!process.env.FULL });
const click = async (text) => { const b = page.getByRole('button', { name: text }).first(); await b.click(); };
await page.goto('http://localhost:8765/dist/test.html');
await page.waitForSelector('#topic', { timeout: 30000 }); await page.waitForTimeout(2500); await shot('1home');
if (process.env.ONLY === 'home') { await browser.close(); process.exit(0); }
await page.locator('.genre.g-accent').click(); await page.waitForTimeout(600); await shot('1home_genre');
await page.fill('#topic', 'ล่าขุมทรัพย์ในพีระมิดโบราณ ? สุสานฟาโรห์ ความลับของมัมมี่');
await click('เริ่มสร้าง Short');
await page.waitForSelector('.pitch-title', { timeout: 20000 }); await page.waitForTimeout(500); await shot('2pitch');
await click('แก้ไข'); await page.fill('.edit-box textarea', 'ขอชื่อเรื่องที่แรงขึ้น'); await click('ส่งให้ Claude แก้');
await page.waitForSelector('.ver button.on', { timeout: 20000 }); await page.waitForTimeout(400); await shot('2pitch_v2');
await click('ยืนยัน');
await page.waitForSelector('.card', { timeout: 30000 });
await page.waitForFunction(() => !document.querySelector('.card .thinking'), null, { timeout: 60000 }); await page.waitForTimeout(1200); await shot('3cast');
// scene library: keep a set, open the library, reuse it as a new scene card
{ const n0 = await page.locator('.card').count();
  await page.evaluate(async () => { const sc = Object.values(App.st.cards).find((c) => c.kind === 'scene'); await App.db.set('library/libtest', { kind: 'scene', name: 'ฉากทดสอบคลัง', look: 'test', spec: sc.spec, at: Date.now() }); await App.loadLibrary(); App.render(); });
  await page.getByRole('button', { name: /ฉากจากคลัง/ }).last().click(); await page.waitForSelector('.lib-item', { timeout: 5000 }); await page.waitForTimeout(300); await shot('3scenelib');
  await click('ใช้ฉากนี้'); await page.waitForTimeout(800);
  const n1 = await page.locator('.card').count(); if (n1 !== n0 + 1) throw new Error('scene from library not added: ' + n0 + ' -> ' + n1);
  await page.evaluate(async () => { const c = Object.values(App.st.cards).find((x) => x.fromLibrary === 'libtest'); await App.delCard(c.id); await App.db.del('library/libtest'); await App.loadLibrary(); App.render(); }); await page.waitForTimeout(300); }
// the user lands on step 3 after approving the pitch: the undo must be visible right here
if (!(await page.locator('.undo-bar.prev').count())) throw new Error('no undo bar for the previous step on step 3');
await click('↶ ยกเลิก กลับไปแก้ขั้นนั้น'); await page.waitForSelector('.pitch-title', { timeout: 20000 }); await page.waitForTimeout(400); await shot('2undo');
await click('ยืนยัน'); await page.waitForSelector('.toast-act', { timeout: 5000 }); await page.waitForSelector('.card', { timeout: 30000 });
await page.waitForFunction(() => !document.querySelector('.card .thinking'), null, { timeout: 60000 }); await page.waitForTimeout(600);
await click('ยืนยันทุกการ์ดที่เหลือ'); await page.waitForTimeout(800);
await click('ยืนยันขั้นนี้และล็อกพาเลต');
await page.waitForSelector('table.beats', { timeout: 30000 }); await page.waitForTimeout(600); await shot('4beats');
await click('ยืนยัน'); await page.waitForSelector('text=อัดเสียงพากย์', { timeout: 20000 }); await shot('5voice_pre');
await click('อัดเสียงพากย์'); await page.waitForSelector('text=ยืนยัน ใช้เครดิต', { timeout: 20000 }); await click('ยืนยัน ใช้เครดิต');
await page.waitForSelector('text=ทำงานค้าง', { timeout: 30000 }); await shot('5voice_job');
// simulate Claude Code doing the queued job
await page.evaluate(async () => {
  const r = await (await fetch('/_blob/voicetest')).json(); delete r.pcm16;
  const k = [...window.__store.keys()].find((x) => x.startsWith('jobs/') && window.__store.get(x).status === 'queued');
  const j = window.__store.get(k); j.status = 'done'; j.result = Object.assign({ assetId: 'voicetest' }, r);
  await window.claude.use('db').then((db) => db.doc(k).set(j));
});
await page.waitForSelector('canvas.wave', { timeout: 30000 }); await page.waitForTimeout(1500); await shot('5voice_done');
await click('ยืนยัน');
await page.waitForSelector('.screen canvas', { timeout: 60000 }); await page.waitForTimeout(1200); await shot('6short');
const checks = await page.$$eval('.check', (els) => els.map((e) => e.innerText.replace(/\n/g, ' | ')));
console.log(checks.join('\n'));
await click('ยืนยันจบงาน'); await page.waitForSelector('.done-dlg', { timeout: 60000 }); await page.waitForTimeout(500); await shot('6done_ask');
await click('ไว้ทีหลัง'); await page.waitForSelector('text=บันทึกวิดีโอ (.mp4)', { timeout: 60000 }); await page.waitForTimeout(800); await shot('6deliver');
// undo a mistaken ยืนยันจบงาน, then approve again
await click('↶ ยกเลิกการยืนยัน'); await page.waitForSelector('button:has-text("ยืนยันจบงาน")', { timeout: 30000 }); await page.waitForTimeout(500); await shot('6undo');
if (await page.locator('text=บันทึกวิดีโอ (.mp4)').count()) throw new Error('delivery still shown after undo');
await click('ยืนยันจบงาน'); await page.waitForSelector('.done-dlg', { timeout: 60000 }); await click('ไว้ทีหลัง'); await page.waitForSelector('text=บันทึกวิดีโอ (.mp4)', { timeout: 60000 });
if (!process.env.NOEXPORT) { const dl = page.waitForEvent('download', { timeout: 600000 }); await click('บันทึกวิดีโอ (.mp4)'); const d = await dl; await d.saveAs('/home/user/legend-studio/qa/export.mp4'); console.log('saved', JSON.stringify(await page.evaluate(() => window.__saved))); }
if (process.env.LONG) {
  const finishJobs = () => page.evaluate(async () => {
    const r = await (await fetch('/_blob/voicetest')).json(); delete r.pcm16; const db = await window.claude.use('db'); let n = 0;
    for (const k of [...window.__store.keys()]) { const j = window.__store.get(k); if (k.startsWith('jobs/') && j.status === 'queued') { await db.doc(k).set(Object.assign({}, j, { status: 'done', result: Object.assign({ assetId: 'voicetest' }, r) })); n++; } }
    return n;
  });
  await click('ทำคลิป Long'); await page.waitForSelector('.chap', { timeout: 30000 }); await page.waitForTimeout(500); await shot('L1outline');
  await click('ยืนยัน'); await page.waitForSelector('.card', { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.card .thinking'), null, { timeout: 60000 }); await page.waitForTimeout(800); await shot('L2cast');
  await click('ยืนยันทุกการ์ดที่เหลือ'); await page.waitForTimeout(500); await click('ยืนยันภาพทั้งหมด');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'ยืนยันบททุกตอน' && !b.disabled), null, { timeout: 120000 }); await page.waitForTimeout(500);
  await page.locator('details.chap-d').first().evaluate((d) => (d.open = true)); await shot('L3chapters');
  await click('ยืนยันบททุกตอน'); await page.waitForSelector('.vlist', { timeout: 20000 });
  await page.getByRole('button', { name: /^อัดเสียง \d+ ตอน$/ }).click(); await page.waitForSelector('text=ยืนยัน ใช้เครดิต', { timeout: 30000 }); await shot('L4voice_ask'); await click('ยืนยัน ใช้เครดิต');
  for (let i = 0; i < 120; i++) { await finishJobs(); const ok = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'ยืนยันเสียงทุกตอน' && !b.disabled)); if (ok) break; await page.waitForTimeout(1000); }
  await page.waitForTimeout(500); await shot('L4voice_done');
  await click('ยืนยันเสียงทุกตอน'); await page.waitForSelector('.screen canvas', { timeout: 120000 }); await page.waitForTimeout(1500); await shot('L5clip');
  console.log('long checks', JSON.stringify(await page.$$eval('.check', (els) => els.map((e) => e.innerText.replace(/\n/g, ' | ')))));
  await page.locator('.chap-strip button').nth(1).click(); await page.waitForFunction(() => document.querySelector('.chap-strip button.on .mono').textContent === '02', null, { timeout: 60000 }); await page.waitForTimeout(1500);
  await click('ยืนยันจบงาน Long'); await page.waitForSelector('text=บันทึกคลิปเต็ม (.mp4)', { timeout: 60000 }); await page.waitForTimeout(600); await shot('L5deliver');
  if (!process.env.NOEXPORT) { const dl = page.waitForEvent('download', { timeout: 600000 }); await click('บันทึกเฉพาะตอนที่เลือก'); const d = await dl; await d.saveAs('/home/user/legend-studio/qa/export_long_ch.mp4'); console.log('saved long chapter'); }
  console.log('long desc', (await page.locator('.deliver textarea').nth(1).inputValue()).slice(0, 400));
}
console.log('mcp calls', JSON.stringify(await page.evaluate(() => window.__mcpCalls.map((c) => c[0]))));
console.log('errors', errs.length);
await browser.close();
