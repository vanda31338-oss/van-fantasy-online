// Mock of window.claude for local UI testing (db in memory, canned Claude answers, fake ElevenLabs).
(function () {
  const store = new Map(); const listeners = new Set();
  const deepFreeze = (o) => { if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; }; // like the real runtime
  const notify = () => setTimeout(() => listeners.forEach((l) => l()), 0);
  const snapDoc = (path) => { const v = store.get(path); return { id: path.split('/').pop(), exists: !!v, data: () => (v ? deepFreeze(JSON.parse(JSON.stringify(v))) : undefined), metadata: {} }; };
  const coll = (path, filt) => ({
    orderBy: () => coll(path, filt), limit: () => coll(path, filt), where: () => coll(path, filt),
    doc: (id) => db.doc(path + '/' + (id || Math.random().toString(36).slice(2))),
    async get() { const docs = [...store.keys()].filter((k) => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1).map(snapDoc); return { docs, size: docs.length, empty: !docs.length }; },
    onSnapshot(next) { const f = async () => next(await this.get()); listeners.add(f); f(); return () => listeners.delete(f); },
  });
  const db = {
    doc: (path) => ({ path, async get() { return snapDoc(path); }, async set(d) { store.set(path, JSON.parse(JSON.stringify(d))); notify(); }, async update(d) { if (!store.has(path)) throw { code: 'invalid_argument' }; store.set(path, Object.assign(store.get(path), JSON.parse(JSON.stringify(d)))); notify(); }, async delete() { store.delete(path); notify(); }, onSnapshot(next) { const f = () => next(snapDoc(path)); listeners.add(f); f(); return () => listeners.delete(f); } }),
    collection: (p) => coll(p),
  };
  window.__store = store;
  const S = () => window.LSE.SAMPLE;
  const PITCH = { title: 'คำสาปฟาโรห์', angle: 'หนังสือพิมพ์ต้องการขายข่าว → เลยปั้นข่าวคำสาป → คนจึงเชื่อว่าการเปิดสุสานทำให้ตาย', beats: ['ปี 1922 คาร์เตอร์เปิดสุสานตุตันคาเมน', 'ข่าวลือเรื่องจารึกคำสาป', 'ไม่มีจารึกจริง', 'ลอร์ดคาร์นาร์วอนเสียชีวิต', 'สาเหตุคือยุงกัดติดเชื้อ', 'คาร์เตอร์อยู่ต่ออีก 17 ปี'], payoff: 'รู้ว่าคำสาปฟาโรห์เป็นข่าวที่สื่อสร้าง', hook: 'คนที่เปิดสุสานฟาโรห์... ถูกเชื่อว่าตายเพราะคำสาป!', bridge: 'และนั่นคือเหตุผลที่', loop_read: 'และนั่นคือเหตุผลที่คนที่เปิดสุสานฟาโรห์ถูกเชื่อว่าตายเพราะคำสาป', facts: [{ claim: 'คาร์เตอร์เปิดสุสาน KV62 ปี 1922', source: 'Howard Carter, The Tomb of Tut.Ankh.Amen (1923)', confidence: 'สูง', note: '' }, { claim: 'ลอร์ดคาร์นาร์วอนเสียชีวิต เม.ย. 1923 จากแผลยุงกัดติดเชื้อ', source: 'The Times 1923; Egypt Exploration Society', confidence: 'สูง', note: '' }, { claim: 'ไม่มีจารึกคำสาปที่ประตูสุสาน', source: 'Zahi Hawass; Carter notes', confidence: 'กลาง', note: 'ข่าวลือมาจาก Daily Express' }], culture: 'egypt', cta: 'like', cta_reason: 'ผู้ชมรู้สึกดีที่ได้ความจริง' };
  function castJSON() { const s = S(); return { elements: s.cast.map((c) => { const o = JSON.parse(JSON.stringify(c)); if (o.kind === 'prop') { o.draw = o.look; delete o.map; } if (o.recipe) { o.overlays = (o.recipe.overlays || []).map((v) => (v.template ? { template: v.template, colors: v.colors, z: v.z } : { what: 'custom gear', z: 125, dy: -2 })); delete o.recipe.overlays; } return o; }), scenes: s.scenes.map((x) => JSON.parse(JSON.stringify(x))), proportions: [{ name: 'มนุษย์ LPC', height_px: 48, why: 'ฐาน' }, { name: 'โลงหิน', height_px: 64, why: 'สูงกว่าคนเล็กน้อย' }], palette: s.palette }; }
  async function json(prompt, opts) {
    await new Promise((r) => setTimeout(r, 120));
    if (opts && opts.onText) opts.onText({ text: '{"…"', delta: '{' });
    const s = S();
    if (prompt.includes('APPROVED PITCH') && prompt.includes('elements')) return castJSON();
    if (prompt.includes('STORY PITCH TASK')) return PITCH;
    if (prompt.includes('LONG VIDEO OUTLINE TASK')) { const n = +((prompt.match(/: (\d+) chapters of about/) || [])[1] || 10); return { title: 'คำสาปฟาโรห์ ฉบับเต็ม', yt_title: 'คำสาปฟาโรห์ เรื่องจริงทั้งหมด', logline: 'เจาะลึกทุกตอน', chapters: Array.from({ length: n }, (_, i) => ({ n: i + 1, title: 'ตอนที่ ' + (i + 1), summary: 'สรุปตอน ' + (i + 1), beats: ['ก', 'ข', 'ค', 'ง'], scenes: ['s1', i === 1 ? 'new:ห้องเก็บสมบัติ' : 's2'], cast: ['c1'], cta: i === 3 ? 'like' : i === n - 1 ? 'subscribe' : null })), new_elements: [{ kind: 'scene', name: 'ห้องเก็บสมบัติ', look: 'ทองเต็มห้อง', why: 'ตอน 2', chapters: [2] }], facts: [{ claim: 'x', source: 'y', confidence: 'สูง', note: '' }], hashtags: ['#ฟาโรห์'], description: 'คำอธิบาย' }; }
    if (prompt.includes('Create the NEW elements')) { const sn = +((prompt.match(/scenes s(\d+)/) || [])[1] || 9); const pn = +((prompt.match(/props p(\d+)/) || [])[1] || 9); const sc = JSON.parse(JSON.stringify(s.scenes[0])); const pr = JSON.parse(JSON.stringify(s.cast.find((x) => x.kind === 'prop'))); pr.draw = pr.look; delete pr.map; return { elements: [Object.assign(pr, { id: 'p' + pn, name: 'ของใหม่' })], scenes: [{ id: 's' + sn, kind: 'scene', name: 'ห้องเก็บสมบัติ', role: 'ฉากใหม่', look: 'ทอง', spec: sc.spec }], proportions: [], palette: [] }; }
    if (/Write the beat sheet \(script \+ sound plan\) for CHAPTER (\d+)/.test(prompt)) { const k = +prompt.match(/CHAPTER (\d+)/)[1]; const b = JSON.parse(JSON.stringify(s.beats)); b.rows.forEach((r) => { delete r.cta; delete r.cta_word; }); b.rows[0].card = { text: 'ตอนที่ ' + k, at_word: null }; return b; }
    if (prompt.includes('REVIEWING YOUR OWN WORK')) { window.__polish = (window.__polish || 0) + 1; const kind = (prompt.match(/how this (\w+) renders/) || [])[1]; const cur = JSON.parse((prompt.match(/CURRENT DATA: (.*)\n/) || [])[1] || '{}');
      if (kind === 'prop') return { ok: false, notes: 'เพิ่มเงาและไฮไลต์', art: window.App.DRAW_EXAMPLES[2].draw }; if (kind === 'scene') return { ok: false, notes: 'เพิ่มของหน้าฉาก', spec: cur.spec }; return { ok: true, notes: 'ดีแล้ว' }; }
    if (prompt.includes('Draw ONE prop')) return { draw: window.App.DRAW_EXAMPLES[0].draw };
    if (prompt.includes('Draw ONE prop')) { const id = (prompt.match(/PROP: ([^—]+)/) || [])[1]; const c = s.cast.find((x) => x.kind === 'prop' && id && x.name.trim() === id.trim()) || s.cast.find((x) => x.kind === 'prop' && x.map); return { map: c.map }; }
    if (prompt.includes('Draw an OVERLAY')) { const isM = prompt.includes('mummy'); const ov = (isM ? s.cast[1] : s.cast[2]).recipe.overlays[0].dirs; return { dirs: { s: ov.s, n: ov.n, e: ov.e } }; }
    if (prompt.includes('Write the beat sheet')) return Object.assign({ yt_title: 'คำสาปฟาโรห์ ความจริงที่หนังสือพิมพ์ปั้น #shorts', hashtags: ['#ตำนาน', '#อียิปต์', '#ฟาโรห์', '#shorts'], description: 'คำสาปตุตันคาเมนเป็นข่าวที่สื่อสร้างขึ้น' }, JSON.parse(JSON.stringify(s.beats)));
    if (prompt.startsWith('You are editing')) { const m = prompt.match(/CURRENT \(JSON\):\n([\s\S]*?)\n\nUSER'S REQUEST/); const cur = JSON.parse(m[1]); if (cur.title && cur.angle) cur.title = cur.title + '!'; return cur; }
    throw { code: 'refused', message: 'unknown prompt in mock' };
  }
  const sample = Object.assign(async (p, o) => ({ text: JSON.stringify(await json(p, o)), truncated: false }), { json, limits: async () => ({ maxPromptBytes: 262144, images: { maxCount: 4, maxInputBytes: 2e7, mediaTypes: ['image/png'] }, tools: { maxCount: 8 } }) });
  window.__mcpCalls = [];
  const mcp = { async callTool(server, tool, input) { window.__mcpCalls.push([tool, input]);
    if (tool === 'creative_generate_speech') return { payload: input.estimate_only ? { estimate: { credits: 528.9 } } : { flow_id: 'F1', node_id: 'N1', session_ids: ['S1'], poll_after_seconds: 0 } };
    if (tool === 'creative_get_flow_run_status') return { payload: input.session_ids[0] === 'S1' ? { all_completed: true, media: [{ kind: 'audio', url: 'https://storage.googleapis.com/x/content.mp3', generation_id: 'G1' }], generations: [{ id: 'G1', duration_secs: 41.76 }] } : { all_completed: true, transcripts: [{ words: [{ text: 'คนที่', start: 0.3, end: 1 }] }] } };
    if (tool === 'creative_transcribe_audio') return { payload: { flow_id: 'F1', session_ids: ['T1'] } };
    if (tool === 'creative_list_voices') return { payload: { voices: [{ voice_id: 'XLXcyPK1jTjw1pYLLcM9', name: 'Somchai - Warm Baritone, Serious', description: 'Thai narration', preview_url: 'https://x/y.mp3' }] } };
    throw { code: 'tool_error', message: 'mock' }; }, listTools: async () => ({ servers: [] }) };
  window.__saved = [];
  const downloads = { async save(r) { window.__saved.push({ filename: r.filename, size: r.data.size || r.data.length }); const b = r.data instanceof Blob ? r.data : new Blob([r.data]); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qa-' + (r.filename.endsWith('.mp4') ? 'export.mp4' : r.filename.endsWith('.webm') ? 'export.webm' : 'file.bin'); document.body.append(a); a.click(); return { status: 'saved' }; } };
  const assets = { async upload(b) { return { id: 'a'.repeat(32), url: '/_blob/x', sizeBytes: b.size, contentType: b.type }; }, async list() { return { assets: [], usage: {} }; }, async delete() { return { deleted: true }; } };
  const user = { isOwner: () => true, canEdit: () => true, can: () => true, async id() { return 'u1'; } };
  const caps = { db, sample, mcp, downloads, assets, user };
  window.claude = { use: async (n) => caps[n] || null };
})();
