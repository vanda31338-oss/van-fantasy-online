// Legend Shorts Studio — app core: capabilities, db wrapper, state, DOM helpers.
(function () {
  const App = (window.App = {
    caps: {}, st: { view: 'home', channels: {}, activeChannel: null, projects: [], pid: null, project: null, cards: {}, jobs: {}, library: {} },
    previews: new Set(), subs: [],
  });

  // ---------- DOM ----------
  App.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v; else if (v === true) el.setAttribute(k, ''); else el.setAttribute(k, v);
    }
    for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return el;
  };
  const h = App.h;
  App.$ = (s, r) => (r || document).querySelector(s);
  App.esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  App.uid = (p) => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  App.clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  App.fmtT = (t) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ':' : '') + (m ? s.toFixed(1).padStart(4, '0') : s.toFixed(1)); };
  App.ago = (ms) => { const d = (Date.now() - ms) / 1000; if (d < 60) return 'เมื่อสักครู่'; if (d < 3600) return Math.floor(d / 60) + ' นาทีที่แล้ว'; if (d < 86400) return Math.floor(d / 3600) + ' ชั่วโมงที่แล้ว'; return Math.floor(d / 86400) + ' วันที่แล้ว'; };

  // toast + error line
  // act = {label, run}: a button inside the toast (e.g. undo), kept on screen longer
  App.toast = function (msg, kind, act) {
    const box = App.$('#toasts'); if (!box) return;
    const same = [...box.children].find((x) => x.dataset.msg === String(msg)); // the same message again bumps a counter instead of stacking
    if (same && act) same.remove(); // a fresh undo button replaces the old one
    else if (same) { const n = (+same.dataset.n || 1) + 1; same.dataset.n = n; same.textContent = msg + ' ×' + n; return; }
    while (box.children.length >= 3) box.firstChild.remove();
    const t = h('div', { class: 'toast ' + (kind || ''), role: 'status' }, msg); t.dataset.msg = String(msg); box.append(t);
    if (act) t.append(h('button', { class: 'toast-act', onclick: () => { t.remove(); act.run(); } }, act.label));
    const life = kind === 'err' || act ? 8000 : 3200;
    setTimeout(() => t.classList.add('out'), life); setTimeout(() => t.remove(), life + 600);
  };
  App.errText = function (e) {
    if (!e) return 'เกิดข้อผิดพลาด';
    const code = e.code || '';
    const map = {
      not_granted: 'ยังไม่ได้อนุญาตให้หน้านี้ใช้ความสามารถนี้ เปิดเมนูสิทธิ์ของอาร์ติแฟกต์แล้วอนุญาต', rate_limited: 'เรียกถี่เกินไปหรือโควตาเต็ม รอสักครู่แล้วลองใหม่',
      invalid_json: 'Claude ตอบกลับมาไม่เป็น JSON ที่ถูกต้อง', refused: 'Claude ปฏิเสธคำขอนี้ ลองเปลี่ยนคำสั่ง', empty_completion: 'Claude ไม่ได้ตอบอะไรกลับมา',
      upstream_error: 'การเชื่อมต่อขัดข้องชั่วคราว ลองใหม่อีกครั้ง', session_expired: 'ต้องเข้าสู่ระบบใหม่', sampling_disabled: 'บัญชีนี้ใช้ Claude ในหน้าไม่ได้',
      needs_reauth: 'ต้องเชื่อมต่อ ElevenLabs ใหม่ที่ claude.ai → Settings → Connectors', server_not_connected: 'ยังไม่ได้เพิ่ม ElevenLabs ที่ claude.ai → Settings → Connectors',
      not_in_manifest: 'ยังไม่ได้อนุญาต ElevenLabs ให้หน้านี้', approval_required: 'ต้องกดอนุญาตในกล่องที่ขึ้นมาก่อน', tool_error: 'ElevenLabs แจ้งว่าทำงานไม่สำเร็จ',
      server_unavailable: 'ElevenLabs ไม่ตอบชั่วคราว', quota_exceeded: 'พื้นที่จัดเก็บเต็ม ลบโปรเจกต์เก่าบางอัน', invalid_argument: 'บันทึกไม่ได้ (ไม่มีสิทธิ์เขียนหรือข้อมูลใหญ่เกิน)',
      declined: 'ยกเลิกการบันทึกไฟล์', too_large: 'ไฟล์ใหญ่เกิน', unsupported_type: 'ชนิดไฟล์ไม่รองรับ',
    };
    return (map[code] || e.message || String(e)) + (code ? ` (${code})` : '');
  };

  // ---------- capabilities ----------
  App.initCaps = async function () {
    const C = window.claude;
    const names = ['db', 'user', 'sample', 'assets', 'mcp', 'downloads'];
    if (!C || !C.use) { names.forEach((n) => (App.caps[n] = null)); return App.caps; }
    const res = await Promise.all(names.map((n) => C.use(n).catch(() => null)));
    names.forEach((n, i) => (App.caps[n] = res[i]));
    return App.caps;
  };

  // ---------- db wrapper (falls back to memory when db is absent) ----------
  // the runtime hands out frozen snapshots: every read is cloned so the app can edit its copies
  const mem = new Map(); const own = (d) => (d == null ? null : JSON.parse(JSON.stringify(d)));
  App.db = {
    ok: () => !!App.caps.db,
    async get(path) { if (!App.caps.db) return own(mem.get(path)); const s = await App.caps.db.doc(path).get(); return s.exists ? own(s.data()) : null; },
    async set(path, data) { data = JSON.parse(JSON.stringify(data)); if (!App.caps.db) { mem.set(path, data); return; } await App.caps.db.doc(path).set(data); },
    async update(path, data) { data = JSON.parse(JSON.stringify(data)); if (!App.caps.db) { mem.set(path, Object.assign(mem.get(path) || {}, data)); return; } try { await App.caps.db.doc(path).update(data); } catch (e) { if (e && e.code === 'invalid_argument') { const cur = (await App.db.get(path)) || {}; await App.caps.db.doc(path).set(Object.assign(cur, data)); } else throw e; } },
    async del(path) { if (!App.caps.db) { mem.delete(path); return; } await App.caps.db.doc(path).delete(); },
    async list(coll, order) {
      if (!App.caps.db) { const out = []; for (const [k, v] of mem) if (k.startsWith(coll + '/') && k.split('/').length === coll.split('/').length + 1) out.push(Object.assign({ _id: k.split('/').pop() }, own(v))); return out; }
      let q = App.caps.db.collection(coll); if (order) q = q.orderBy(order[0], order[1]);
      const s = await q.limit(500).get(); return s.docs.map((d) => Object.assign({ _id: d.id }, own(d.data())));
    },
    watch(path, fn) { if (!App.caps.db) return () => {}; return App.caps.db.doc(path).onSnapshot((s) => fn(s.exists ? own(s.data()) : null), (e) => console.warn('watch', path, e)); },
    watchColl(coll, fn) { if (!App.caps.db) return () => {}; return App.caps.db.collection(coll).onSnapshot((s) => fn(s.docs.map((d) => Object.assign({ _id: d.id }, own(d.data())))), (e) => console.warn('watchColl', coll, e)); },
  };

  // ---------- channel defaults (INPUTS are only starting values) ----------
  // Shorts narration: fast, bright, one breath per sentence (tempo/maxgap are applied by the voice job, cps sizes the script)
  App.VOICE_STYLE = { tag: '[fast-paced, energetic, excited explainer]', tempo: 1.3, maxgap: 0.12, cps: 17, longTempo: 1.25, longMaxgap: 0.16,
    style: 'เล่าเร็ว กระชับ ต่อเนื่องแทบไม่หยุดหายใจ แบบคลิปสั้นสายความรู้: พูดกับคนดูตรงๆ ใช้ "คุณ" ประโยคยาวที่เชื่อมเหตุผลด้วย เพราะ / หาก / ทั้งๆ ที่ / และ / จน ตัวเลขชัดๆ หักมุมด้วยคำว่า "แต่"' };
  App.voiceStyle = (ch) => Object.assign({}, App.VOICE_STYLE, (ch && ch.voice) || {});
  // the Long video keeps the voice and tag, a touch slower with slightly longer breaths so 10 minutes stay easy to follow
  App.longStyle = (ch) => { const vs = App.voiceStyle(ch); const tempo = +vs.longTempo || 1.25; return { tag: vs.tag, tempo, maxgap: vs.longMaxgap ?? 0.16, cps: Math.round(vs.cps * tempo / vs.tempo * 10) / 10 }; };
  App.DEFAULT_CHANNEL = () => ({
    name: 'ตำนานติดบั๊ก', watermark: { on: true, opacity: 0.22, pos: 'top' },
    voice: Object.assign({ id: '2rg92Q2u0RWu8LiUcLQA', name: 'Mart – หนุ่ม เล่าเร็ว มีพลัง' }, App.VOICE_STYLE), model: 'eleven_v4',
    duration: [40, 50], cta: 'auto', captionSize: 38, captionFont: 'prompt', titleOn: true,
    style: 'pixel art สไตล์ LPC แบบ "100 บาท 7 วัน": ฉากละเอียดหลายชั้น มีชีวิตเหมือนเมืองจริง ไฟหน้าต่าง/ป้ายนีออน/หลอดไฟเรืองแสงในที่มืด ท้องฟ้าไล่สีหลายช่วง (พลบค่ำม่วงชมพู เช้าฟ้าทอง) ของประกอบฉากเยอะแต่เป็นระเบียบ มีของหน้าฉากด้านล่าง สิ่งเคลื่อนไหวรอบตัวตลอด (คนเดิน รถ รถไฟฟ้า น้ำกระเพื่อม ใบไม้ไหว ควัน แมลง) ป้ายเป็นภาษาไทย ตัวละครไม่ใช่ chibi; เอกลักษณ์ช่อง "ติดบั๊ก": glitch เล็กๆ แบบเกมเก่าเป็นจังหวะ hook บางจุด ไม่รกจนอ่านซับไม่ออก',
    palette: LSE.DEFAULT_PALETTE.slice(),
    captionColors: { text: '#ffffff', key: '#ffe66b', outline: '#0b0a12', title: '#ffe66b' },
    descTemplate: '{title}\n\nเรื่องเล่าจากตำนานแบบพิกเซลอาร์ต 45 วินาที เล่าตามแหล่งที่มา ไม่ใช่ประวัติศาสตร์\n\n{hashtags}\n\nเครดิตภาพตัวละคร (LPC):\n{credits}',
    updatedAt: Date.now(),
  });
  App.channel = () => App.st.channels[App.st.activeChannel] || App.DEFAULT_CHANNEL();
  App.projChannel = () => (App.st.project && App.st.project.ch) || App.channel();

  // ---------- diff (char-level LCS for Thai, word-level for long text) ----------
  App.diffHTML = function (oldS, newS) {
    oldS = String(oldS ?? ''); newS = String(newS ?? '');
    if (oldS === newS) return App.esc(newS);
    const a = [...oldS], b = [...newS];
    if (a.length * b.length > 250000) return '<mark>' + App.esc(newS) + '</mark>';
    const n = a.length, m = b.length; const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0, out = '', run = '';
    const flush = () => { if (run) { out += '<mark>' + App.esc(run) + '</mark>'; run = ''; } };
    while (j < m) {
      if (i < n && a[i] === b[j]) { flush(); out += App.esc(b[j]); i++; j++; }
      else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) i++;
      else { run += b[j]; j++; }
    }
    flush(); return out;
  };
  // field-level: returns html for value with diff vs old (strings/arrays)
  App.dv = function (cur, old) {
    if (old === undefined || old === null) return App.esc(typeof cur === 'string' ? cur : JSON.stringify(cur));
    if (typeof cur === 'string') return App.diffHTML(typeof old === 'string' ? old : '', cur);
    return App.diffHTML(JSON.stringify(old), JSON.stringify(cur));
  };

  // copy text helper
  App.copy = async function (text, btn) {
    try { await navigator.clipboard.writeText(text); App.toast('คัดลอกแล้ว'); if (btn) { const o = btn.textContent; btn.textContent = 'คัดลอกแล้ว'; setTimeout(() => (btn.textContent = o), 1400); } }
    catch (e) { App.toast('คัดลอกอัตโนมัติไม่ได้ เลือกข้อความแล้วกด Ctrl+C', 'warn'); }
  };

  // save a file through the downloads capability
  App.save = async function (filename, data) {
    const d = App.caps.downloads;
    if (!d) { App.toast('มุมมองนี้บันทึกไฟล์ไม่ได้ เปิดอาร์ติแฟกต์ใน claude.ai', 'err'); return false; }
    try { await d.save({ filename, data }); App.toast('บันทึก ' + filename + ' แล้ว'); return true; }
    catch (e) { if (e && e.code === 'declined') App.toast('ยกเลิกการบันทึก'); else App.toast(App.errText(e), 'err'); return false; }
  };

  // global animation loop for card previews
  App.anim = { t0: performance.now() };
  function tick(now) {
    const t = (now - App.anim.t0) / 1000;
    for (const p of App.previews) { if (!p.el.isConnected) { App.previews.delete(p); continue; } if (p.playing !== false) try { p.draw(t); } catch (e) { /* keep looping */ } }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  App.base64ToF32 = function (b64) {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const i16 = new Int16Array(u.buffer); const f = new Float32Array(i16.length); for (let i = 0; i < f.length; i++) f[i] = i16[i] / 32768; return f;
  };
})();
