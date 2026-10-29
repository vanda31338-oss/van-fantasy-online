// Build the seeded test project (pyramid topic) as db documents from the built-in sample + the real voice take.
import fs from 'fs'; import vm from 'vm';
const ctx = { window: { LSE: {} } }; ctx.globalThis = ctx; vm.createContext(ctx);
// SAMPLE=path NAME=global PID=project id GEN=voice generation id pick another built project (default: the pyramid sample)
vm.runInContext(fs.readFileSync(process.env.SAMPLE || new URL('../src/sample.js', import.meta.url), 'utf8'), ctx);
const S = ctx.window.LSE[process.env.NAME || 'SAMPLE']; const voice = JSON.parse(fs.readFileSync(process.argv[2])); const assetId = process.argv[3] || 'ASSET';
const pid = process.env.PID || 'p_test_pyramid'; const now = Date.now();
const ch = { name: 'ตำนานติดบั๊ก', watermark: { on: true, opacity: 0.22, pos: 'top' }, voice: { id: '2rg92Q2u0RWu8LiUcLQA', name: 'Mart – หนุ่ม เล่าเร็ว มีพลัง', tag: '[fast-paced, energetic, excited explainer]', tempo: 1.3, maxgap: 0.12, cps: 17 }, model: 'eleven_v4', duration: [40, 50], cta: 'auto', captionSize: 38, captionFont: 'prompt', titleOn: true,
  style: 'pixel art สไตล์ LPC มืดลึกลับแต่สีสด ไม่ใช่ chibi; เอกลักษณ์ช่อง "ติดบั๊ก": glitch เล็กๆ แบบเกมเก่า (พิกเซลกระตุก สีเหลื่อม RGB split เส้นสแกน) ใช้เป็นจังหวะ hook และ transition บางจุด ลายน้ำชื่อช่องกระพริบ glitch เบาๆ ไม่ใช้จนรกหรืออ่านซับไม่ออก',
  palette: S.palette, captionColors: { text: '#ffffff', key: '#ffe66b', outline: '#0b0a12', title: '#ffe66b' }, descTemplate: '{title}\n\nเรื่องเล่าจากตำนานแบบพิกเซลอาร์ต 45 วินาที เล่าตามแหล่งที่มา ไม่ใช่ประวัติศาสตร์\n\n{hashtags}\n\nเครดิตภาพตัวละคร (LPC):\n{credits}', updatedAt: now };
const pitch = S.pitch;
const beats = S.beats;
const cards = []; let order = 0;
for (const c of S.cast) cards.push(Object.assign({}, c, { order: order++, approved: true, status: 'ok', source: 'claude' }));
for (const s of S.scenes) cards.push(Object.assign({}, s, { order: order++, approved: true, status: 'ok', source: 'claude' }));
const v = Object.assign({}, voice); delete v.pcm16;
const project = { topic: S.topic || 'ล่าขุมทรัพย์ในพีระมิดโบราณ ? สุสานฟาโรห์ ความลับของมัมมี่', genre: process.env.GENRE || 'history', title: pitch.title, channelId: 'ch_default', ch, opts: { len: 45, cta: 'auto' }, step: 6, steps: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok', 6: 'draft' },
  cur: { pitch: 'pitch-v1-seed', beats: 'beats-v1-seed' }, pitch, beats, palette: S.palette, castMeta: S.castMeta || { proportions: [{ name: 'มนุษย์ LPC (คาร์เตอร์ คาร์นาร์วอน นักข่าว ฟาโรห์)', height_px: 48, why: 'ฐานของสไตล์' }, { name: 'หน้ากากทองตุตันคาเมน', height_px: 16, why: 'ขนาดศีรษะคน ขยายเล็กน้อยให้เห็นลาย' }, { name: 'เทียน', height_px: 10, why: 'ถือในมือ' }, { name: 'ยุง', height_px: 6, why: 'ตัวจิ๋ว แต่ใหญ่พอให้เห็นบนจอมือถือ' }], palette: S.palette },
  voice: Object.assign({ status: 'ok', assetId, lines: S.beats.rows.map((r) => r.voice), voiceId: ch.voice.id, voiceName: ch.voice.name, model: 'eleven_v4', flow_id: 'tLu6WYEVC28pTBOCWlUZ', generation_id: process.env.GEN || 'QAsxykrOncYRmBgylqP7' }, v),
  done: false, seeded: true, createdAt: now, updatedAt: now };
const docs = [{ path: 'channels/ch_default', data: ch }, { path: 'config/app', data: { activeChannel: 'ch_default' } }, { path: 'projects/' + pid, data: project },
  { path: `projects/${pid}/versions/pitch-v1-seed`, data: { kind: 'pitch', ref: '', n: 1, data: pitch, note: 'ทดสอบตอนสร้างแอป', at: now } },
  { path: `projects/${pid}/versions/beats-v1-seed`, data: { kind: 'beats', ref: '', n: 1, data: beats, note: 'ทดสอบตอนสร้างแอป', at: now } },
  ...cards.map((c) => ({ path: `projects/${pid}/cards/${c.id}`, data: c })),
  ...cards.map((c) => ({ path: `projects/${pid}/versions/card-${c.id}-v1-seed`, data: { kind: 'card', ref: c.id, n: 1, data: c, note: 'ทดสอบตอนสร้างแอป', at: now } }))];
fs.writeFileSync(process.argv[4] || 'seed.json', JSON.stringify(docs));
fs.writeFileSync(process.argv[5] || 'project.json', JSON.stringify({ project, cards }));
console.log(docs.length, 'docs', Math.max(...docs.map((d) => JSON.stringify(d.data).length)), 'max bytes');
