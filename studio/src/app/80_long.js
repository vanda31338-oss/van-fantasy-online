// LONG video (9-10 min, 9:16) grown from the approved Short: outline → new visuals → chapter scripts → chapter voices → the clip.
// project.long = {on, step, steps{1..5}, minutes, chapters, outline, cur{outline}, lens{n:{L,key}}, done}
// projects/<pid>/long/ch<n> = {n, title, status, err, beats, voice} — one doc per chapter keeps the project doc small.
(function () {
  const App = window.App; const h = App.h; const C = App.Claude;
  const L = (App.Long = {});
  const NAMES = ['', 'โครงเรื่องยาว', 'ภาพเพิ่มเติม', 'บททุกตอน', 'เสียงพากย์', 'คลิป Long'];
  L.NAMES = NAMES;
  const lp = () => (App.st.project && App.st.project.long) || null;
  const S5 = () => App.Steps[5];
  const chPath = (pid, n) => 'projects/' + pid + '/long/ch' + n;

  // ---------- state ----------
  L.save = async (patch) => { await App.saveProject({ long: Object.assign({}, lp() || {}, patch) }); };
  L.state = (k) => ((lp() || {}).steps || {})[k] || 'todo';
  L.setStep = async (k, st) => { const s = Object.assign({}, lp().steps); s[k] = st; await L.save({ steps: s }); };
  L.canOpen = (k) => { if (!lp()) return false; for (let j = 1; j < k; j++) if (!['ok', 'recheck'].includes(L.state(j))) return false; return true; };
  L.go = (k) => { if (!L.canOpen(k)) return; App.st.track = 'long'; App.st.lstep = k; App.render(); window.scrollTo({ top: 0 }); };
  L.approve = async (k) => {
    const s = Object.assign({}, lp().steps); s[k] = 'ok';
    await L.save({ steps: s, step: Math.max(lp().step || 1, Math.min(5, k + 1)) });
    App.toast('ยืนยัน' + NAMES[k] + 'แล้ว', '', { label: '↶ ยกเลิก', run: () => L.unapprove(k) }); L.go(Math.min(5, k + 1));
  };
  L.markLater = async (k) => {
    const s = Object.assign({}, lp().steps); let changed = false;
    for (let j = k + 1; j <= 5; j++) if (s[j] === 'ok') { s[j] = 'recheck'; changed = true; }
    if (s[k] === 'ok') s[k] = 'draft';
    await L.save({ steps: s, done: false }); if (changed) App.toast('ขั้นต่อจากนี้ของ Long ถูกทำเครื่องหมายให้ตรวจใหม่', 'warn');
  };
  L.unapprove = async (k) => {
    await L.markLater(k); if (k === 5) await L.setStep(5, 'draft');
    App.toast('ยกเลิกการยืนยัน' + NAMES[k] + 'แล้ว แก้ต่อได้เลย'); L.go(k);
  };
  L.touched = async () => { if (lp()) await L.markLater(2); }; // a Long card changed
  L.start = async function () {
    if (!lp() || !lp().on) await L.save({ on: true, step: 1, steps: { 1: 'todo', 2: 'todo', 3: 'todo', 4: 'todo', 5: 'todo' }, minutes: 10, chapters: 10, startedAt: Date.now(), done: false });
    await L.loadChapters();
    App.st.track = 'long'; App.st.lstep = lp().step || 1; App.render(); window.scrollTo({ top: 0 });
    if (!lp().outline) L.genOutline();
  };

  // chapters (cached per project)
  L.chs = () => (App.st.long && App.st.long.pid === App.st.pid ? App.st.long.chs : {});
  L.loadChapters = async function () {
    const pid = App.st.pid; const chs = {};
    try { for (const d of await App.db.list('projects/' + pid + '/long')) if (/^ch\d+$/.test(d._id)) { delete d._id; chs[d.n] = d; } } catch (e) { /* none yet */ }
    App.st.long = { pid, chs };
  };
  L.saveChapter = async function (n, patch, pid) {
    pid = pid || App.st.pid;
    if (App.st.long && App.st.long.pid === pid) { const cur = App.st.long.chs[n] || { n }; const d = Object.assign(cur, patch, { n }); App.st.long.chs[n] = d; await App.db.set(chPath(pid, n), d); return d; }
    const cur = (await App.db.get(chPath(pid, n))) || { n }; const d = Object.assign(cur, patch, { n }); await App.db.set(chPath(pid, n), d); return d; // finished after the user switched project
  };
  L.refresh = (k) => { if (App.st.view === 'project' && App.st.track === 'long' && App.st.lstep === k) App.render(); };
  const outline = () => (lp() && lp().outline) || null;
  const chapterList = () => ((outline() && outline().chapters) || []).map((c, i) => Object.assign({ n: i + 1 }, c, { n: i + 1 }));

  // ---------- shared bits ----------
  L.head = function (k, title, sub, extra) {
    const s = L.state(k);
    return h('div', { class: 'col', style: { marginBottom: '14px' } },
      h('div', { class: 'step-head' }, h('div', { class: 'col', style: { gap: '2px' } }, h('span', { class: 'eyebrow long' }, 'LONG · STEP ' + k), h('h1', {}, title)), h('div', { class: 'sp' }), extra || null),
      sub ? h('p', { class: 'muted' }, sub) : null,
      s === 'recheck' ? h('div', { class: 'note warn' }, 'ขั้นก่อนหน้าถูกแก้ไข ตรวจขั้นนี้อีกครั้ง แล้วกด ยืนยัน (ของเดิมยังอยู่ครบ)') : null,
      s === 'ok' ? App.undoBar(k === 5 ? 'จบงาน Long แล้ว' : 'ยืนยันขั้นนี้แล้ว', () => L.unapprove(k))
        : k > 1 && L.state(k - 1) === 'ok' ? App.undoBar('ยืนยัน' + NAMES[k - 1] + 'แล้ว (Long ขั้น ' + (k - 1) + ')', () => L.unapprove(k - 1), 'prev') : null);
  };
  const fmtMin = (t) => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const sceneName = (id) => { if (String(id).startsWith('new:')) return 'ใหม่: ' + id.slice(4); const c = App.st.cards[id]; return (c && c.name) || id; };

  L.render = function (main) {
    if (!lp()) { App.st.track = 'short'; App.render(); return; }
    const k = App.st.lstep || lp().step || 1;
    try { ({ 1: rOutline, 2: rCast, 3: rChapters, 4: rVoice, 5: rClip })[k](main); }
    catch (e) { console.error(e); main.append(h('div', { class: 'err-line' }, 'แสดงขั้นนี้ไม่ได้: ' + App.errText(e))); }
  };

  // ================= L1 outline =================
  L.genOutline = async function (note) {
    if (L.busyOutline) return; L.busyOutline = true; L.errOutline = null; L.stream = ''; L.refresh(1);
    try {
      const v = await C.longOutline(({ text }) => { L.stream = text; const el = App.$('#longStream'); if (el) el.textContent = text.slice(-600); });
      const ver = await App.addVersion('long-outline', v, note || 'สร้างใหม่');
      await L.save({ outline: v, cur: Object.assign({}, lp().cur, { outline: ver._id }) });
      if (L.state(1) === 'ok') await L.markLater(1); else await L.setStep(1, 'draft');
    } catch (e) { L.errOutline = e; }
    L.busyOutline = false; L.refresh(1);
  };
  async function rOutline(main) {
    const P = C.longPlan(); const o = outline();
    const minSel = h('select', { 'aria-label': 'ความยาว' }, ...[8, 9, 10, 12].map((m) => h('option', { value: m, selected: m === P.minutes }, m + ' นาที')));
    const chSel = h('select', { 'aria-label': 'จำนวนตอน' }, ...[6, 8, 10, 12].map((m) => h('option', { value: m, selected: m === P.n }, m + ' ตอน')));
    const regen = h('button', { class: 'btn ghost', onclick: async () => { await L.save({ minutes: +minSel.value, chapters: +chSel.value }); L.genOutline('สร้างใหม่ ' + minSel.value + ' นาที ' + chSel.value + ' ตอน'); } }, o ? 'สร้างโครงใหม่' : 'ให้ Claude วางโครง');
    main.append(L.head(1, 'โครงเรื่องยาว', 'ต่อยอดจาก Short ที่จบแล้ว: แบ่งเป็นตอนๆ ละราว 1 นาที เล่าลึกกว่า มีฉากและตัวละครเพิ่ม เปิดด้วยฮุกเดียวกับ Short',
      h('div', { class: 'row' }, minSel, chSel, regen)));
    if (L.busyOutline) { main.append(h('div', { class: 'panel' }, App.thinking('Claude กำลังวางโครงคลิปยาว (คิดลึก อาจใช้ 1–2 นาที)…', h('div', { class: 'stream', id: 'longStream' }, (L.stream || '').slice(-600))))); return; }
    if (L.errOutline) main.append(h('div', { class: 'err-line', style: { marginBottom: '12px' } }, 'วางโครงไม่สำเร็จ: ' + App.errText(L.errOutline)));
    if (!o) { main.append(h('div', { class: 'panel row' }, h('button', { class: 'btn pri', onclick: () => L.genOutline() }, 'ให้ Claude วางโครงคลิปยาว'))); return; }
    const vers = await App.versions('long-outline'); const curV = vers.find((v) => v._id === (lp().cur || {}).outline) || vers[vers.length - 1];
    const prev = curV ? vers[vers.indexOf(curV) - 1] : null; const old = prev ? prev.data : null;
    const chs = chapterList();
    main.append(
      h('div', { class: 'panel col long-hero' },
        h('div', { class: 'row' }, h('span', { class: 'pill acc' }, '≈ ' + P.minutes + ' นาที'), h('span', { class: 'pill' }, chs.length + ' ตอน'), h('span', { class: 'pill' }, 'ตอนละ ~' + P.secs + ' วิ'), h('span', { class: 'pill' }, 'บทรวม ~' + (P.chars * chs.length).toLocaleString() + ' ตัวอักษร')),
        h('div', { class: 'pitch-title', html: App.dv(o.title || '', old ? old.title : undefined) }),
        h('p', { class: 'muted', html: App.dv(o.logline || '', old ? old.logline : undefined) })),
      h('div', { class: 'chapters' }, ...chs.map((c, i) => { const oc = old && old.chapters ? old.chapters[i] : null;
        return h('article', { class: 'chap' },
          h('div', { class: 'chap-n' }, String(c.n).padStart(2, '0')),
          h('div', { class: 'col', style: { gap: '6px' } },
            h('div', { class: 'row' }, h('b', { class: 'chap-t', html: App.dv(c.title, oc ? oc.title : undefined) }), c.cta ? h('span', { class: 'pill acc' }, 'CTA ' + ({ like: 'ไลก์', share: 'แชร์', subscribe: 'ซับสไครบ์' }[c.cta] || c.cta)) : null),
            h('p', { class: 'small', html: App.dv(c.summary, oc ? oc.summary : undefined) }),
            h('ol', { class: 'beats-list small muted' }, ...(c.beats || []).map((b) => h('li', {}, b))),
            h('div', { class: 'row', style: { gap: '6px' } }, ...[...(c.scenes || []), ...(c.cast || [])].map((id) => h('span', { class: 'pill' + (String(id).startsWith('new:') ? ' new' : '') }, sceneName(id)))))); })),
      (o.new_elements || []).length ? h('div', { class: 'panel col' }, h('h3', {}, 'ภาพที่ต้องสร้างเพิ่ม (' + o.new_elements.length + ')'),
        h('div', { class: 'row', style: { gap: '6px' } }, ...o.new_elements.map((e) => h('span', { class: 'pill new', title: (e.look || '') + ' — ' + (e.why || '') }, ({ char: 'ตัวละคร', prop: 'ของ', scene: 'ฉาก' }[e.kind] || e.kind) + ' · ' + e.name)))) : null,
      (o.facts || []).length ? h('div', { class: 'panel col' }, h('span', { class: 'label' }, 'ตรวจข้อเท็จจริงเพิ่มเติม'),
        h('div', { class: 'tbl' }, h('table', { class: 'facts' }, h('thead', {}, h('tr', {}, h('th', {}, 'ข้อความ'), h('th', {}, 'แหล่งที่มา'), h('th', {}, 'ความมั่นใจ'), h('th', {}, 'หมายเหตุ'))),
          h('tbody', {}, ...o.facts.map((f) => h('tr', {}, h('td', {}, f.claim || ''), h('td', {}, f.source || ''), h('td', {}, h('span', { class: 'pill ' + (f.confidence === 'สูง' ? 'ok' : f.confidence === 'ต่ำ' ? 'err' : 'warn') }, f.confidence || '-')), h('td', {}, f.note || ''))))))) : null,
      h('div', { class: 'panel' }, prev ? h('p', { class: 'small muted' }, 'ส่วนที่ไฮไลต์เปลี่ยนจาก v' + prev.n) : null, App.approvalBar({
        versions: vers, cur: curV && curV._id, editHint: 'เช่น "เพิ่มตอนที่เล่าว่าใครค้นพบ และให้ตอนที่ 4 มีมุกตลก"',
        onSwitch: async (ver) => { await L.save({ outline: ver.data, cur: Object.assign({}, lp().cur, { outline: ver._id }) }); if (L.state(1) === 'ok') await L.markLater(1); App.render(); },
        onApprove: async () => { await L.approve(1); if (!App.allCards().some((c) => c.scope === 'long') && (o.new_elements || []).length) L.genCast(); },
        onEdit: async (note) => {
          const nv = await C.edit('long video outline (chapters)', o, note, C.OUTLINE_FMT, C.vOutline, 'complex');
          const ver = await App.addVersion('long-outline', nv, note);
          await L.save({ outline: nv, cur: Object.assign({}, lp().cur, { outline: ver._id }) });
          if (L.state(1) === 'ok') await L.markLater(1); else await L.setStep(1, 'draft');
          App.render();
        },
      })));
  }

  // ================= L2 new visuals =================
  L.genCast = async function () {
    if (L.busyCast) return; L.busyCast = true; L.errCast = null; L.stream = ''; L.refresh(2);
    try {
      await LSE.LPC.load(); await App.loadLibrary();
      const v = await C.longCast(outline(), ({ text }) => { L.stream = text; const el = App.$('#longStream'); if (el) el.textContent = text.slice(-500); });
      for (const c of App.allCards()) if (c.scope === 'long' && c.source !== 'image') await App.delCard(c.id);
      await App.Steps[3].addElements(v, 'long', 1 + Math.max(0, ...App.allCards().map((c) => c.order || 0)));
      if (L.state(2) === 'ok') await L.markLater(2); else await L.setStep(2, 'draft');
    } catch (e) { L.errCast = e; }
    L.busyCast = false; L.refresh(2); App.Steps[3].drawPending();
  };
  function rCast(main) {
    const mine = App.allCards().filter((c) => c.scope === 'long'); const reused = App.allCards().filter((c) => c.scope !== 'long');
    const nOk = mine.filter((c) => c.approved).length;
    main.append(L.head(2, 'ภาพเพิ่มเติม', 'ตัวละคร ของ และฉากใหม่สำหรับคลิปยาว ในลุคและพาเลตเดียวกับ Short ภาพเดิมของ Short ใช้ต่อได้ทั้งหมด (' + reused.length + ' การ์ด)',
      h('span', { class: 'pill ' + (mine.length && nOk === mine.length ? 'ok' : 'acc') }, 'ยืนยันแล้ว ' + nOk + '/' + mine.length)));
    if (L.busyCast) { main.append(h('div', { class: 'panel' }, App.thinking('Claude กำลังออกแบบฉากและตัวละครใหม่…', h('div', { class: 'stream', id: 'longStream' }, (L.stream || '').slice(-500))))); return; }
    if (L.errCast) main.append(h('div', { class: 'err-line', style: { marginBottom: '12px' } }, 'สร้างการ์ดไม่สำเร็จ: ' + App.errText(L.errCast)));
    const tools = h('div', { class: 'row', style: { marginBottom: '12px' } }, h('span', { class: 'sp' }), h('button', { class: 'btn', onclick: () => App.openConverter('long') }, '+ เพิ่มฉาก/ของจากรูป'),
      h('button', { class: 'btn ghost', onclick: (e) => { if (!mine.length || e.target.dataset.sure) L.genCast(); else { e.target.dataset.sure = 1; e.target.textContent = 'กดอีกครั้งเพื่อสร้างใหม่ทั้งหมด'; } } }, mine.length ? 'สร้างใหม่ทั้งหมด' : 'ให้ Claude สร้างภาพเพิ่ม'));
    main.append(tools);
    const chars = mine.filter((c) => c.kind !== 'scene'), scenes = mine.filter((c) => c.kind === 'scene');
    if (!mine.length) main.append(h('div', { class: 'panel col' }, h('p', {}, 'ยังไม่มีภาพเพิ่ม — คลิปยาวจะใช้ฉากและตัวละครของ Short อย่างเดียว (แนะนำให้เพิ่มฉากใหม่ เพื่อให้ 10 นาทีไม่ซ้ำตา)')));
    if (chars.length) main.append(h('h2', { style: { margin: '6px 0 12px' } }, 'ตัวละครและของใหม่ (' + chars.length + ')'), h('div', { class: 'cards' }, ...chars.map(App.cardEl)));
    if (scenes.length) main.append(h('h2', { style: { margin: '22px 0 12px' } }, 'ฉากใหม่ (' + scenes.length + ')'), h('div', { class: 'cards' }, ...scenes.map(App.cardEl)));
    const ready = nOk === mine.length && !mine.some((c) => c.status === 'drawing' || c.status === 'polish');
    main.append(h('div', { class: 'panel', style: { marginTop: '14px' } }, h('div', { class: 'actions', style: { border: 0, margin: 0, padding: 0 } },
      h('button', { class: 'btn ok', disabled: !ready, onclick: async (e) => { e.target.disabled = true; await L.approve(2); if (!Object.keys(L.chs()).length) L.writeAll(); } }, ready ? (mine.length ? 'ยืนยันภาพทั้งหมด' : 'ใช้ภาพเดิมของ Short') : 'ยืนยันให้ครบทุกการ์ดก่อน (' + nOk + '/' + mine.length + ')'),
      mine.length ? h('button', { class: 'btn', onclick: async () => { for (const c of mine) if (c.status === 'ok' && !c.approved) { c.approved = true; await App.saveCard(c.id, c); } App.render(); } }, 'ยืนยันทุกการ์ดที่เหลือ') : null)));
    if (mine.some((c) => c.status === 'drawing' || c.status === 'polish')) App.Steps[3].drawPending();
  }

  // ================= L3 chapter scripts =================
  L.writing = new Set();
  L.writeChapter = async function (n) {
    const pid = App.st.pid; if (L.writing.has(pid + ':' + n)) return; L.writing.add(pid + ':' + n);
    await L.saveChapter(n, { status: 'writing', err: null, title: (chapterList()[n - 1] || {}).title || '' }); L.refresh(3);
    try {
      const v = await C.longChapter(n, outline());
      const old = L.chs()[n] || {};
      const stale = old.voice && old.voice.status === 'ok' && JSON.stringify((old.beats || { rows: [] }).rows.map((r) => r.voice)) !== JSON.stringify(v.rows.map((r) => r.voice));
      await L.saveChapter(n, Object.assign({ status: 'ok', beats: v, at: Date.now() }, stale ? { voice: Object.assign({}, old.voice, { status: 'stale' }) } : {}), pid);
      await App.addVersion('long-ch', v, 'สร้างใหม่', 'ch' + n);
    } catch (e) { await L.saveChapter(n, { status: 'error', err: App.errText(e) }, pid); }
    L.writing.delete(pid + ':' + n); L.refresh(3);
  };
  L.writeAll = async function (force) {
    const todo = chapterList().map((c) => c.n).filter((n) => force || !(L.chs()[n] && L.chs()[n].beats));
    if (L.state(3) === 'ok' && todo.length) await L.markLater(3); else if (L.state(3) === 'todo') await L.setStep(3, 'draft');
    const q = todo.slice(); await Promise.all([0, 1].map(async () => { while (q.length) await L.writeChapter(q.shift()); })); // two at a time
  };
  const compileCh = (ch) => { try { return App.compileBeats(Object.assign({ chapter: true, cps: App.longStyle(App.projChannel()).cps }, ch.beats), ch.voice || null, App.castCards('long')); } catch (e) { return null; } };
  function rowsTable(beats, tl) {
    return h('div', { class: 'tbl' }, h('table', { class: 'facts' }, h('thead', {}, h('tr', {}, ...['เวลา', 'ฉาก', 'ซับ', 'เสียงพากย์'].map((t) => h('th', {}, t)))),
      h('tbody', {}, ...beats.rows.map((r, i) => h('tr', { class: r.cta ? 'cta' : '' }, h('td', { class: 'mono' }, tl ? App.fmtT(tl.span[i].t0) : '-'), h('td', { class: 'small' }, sceneName(r.scene)),
        h('td', { class: 'small', html: App.esc(String(r.caption || '').replace(/\|/g, ' / ')).replace(/\*([^*]+)\*/g, '<span class="kw">$1</span>') }), h('td', {}, r.voice, r.cta ? h('span', { class: 'pill acc', style: { marginLeft: '6px' } }, 'CTA') : null))))));
  }
  function rChapters(main) {
    const chs = chapterList(); const docs = L.chs(); const nOk = chs.filter((c) => docs[c.n] && docs[c.n].status === 'ok').length;
    let total = 0;
    const items = chs.map((c) => {
      const d = docs[c.n] || {}; const tl = d.beats ? compileCh(d) : null; if (tl) total += tl.L;
      const busy = d.status === 'writing' || L.writing.has(App.st.pid + ':' + c.n);
      const st = busy ? h('span', { class: 'pill acc' }, 'กำลังเขียน…') : d.status === 'ok' ? h('span', { class: 'pill ok' }, d.beats.rows.length + ' ประโยค · ~' + (tl ? Math.round(tl.L) : '?') + ' วิ') : d.status === 'error' ? h('span', { class: 'pill err' }, 'ไม่สำเร็จ') : h('span', { class: 'pill' }, 'ยังไม่เขียน');
      const ta = h('textarea', { rows: 2, placeholder: 'แก้เฉพาะตอนนี้ เช่น "เพิ่มมุกตบป๊าบตอนท้าย และให้ฉากแรกเป็นตลาดเช้า"' }); const stEl = h('div', {});
      const box = h('div', { class: 'edit-box', hidden: true }, ta, h('div', { class: 'row' }, h('button', { class: 'btn sm pri', onclick: async (e) => {
        const note = ta.value.trim(); if (!note) return; e.target.disabled = true; stEl.innerHTML = ''; stEl.append(App.thinking('Claude กำลังแก้ตอนนี้…'));
        try {
          const nv = await C.edit('beat sheet of long-video chapter ' + c.n + ' ("' + c.title + '")', d.beats, note, C.BEATS_FMT, (v) => C.vChapter(v, App.castCards('long'), App.sceneCards('long')), 'default', 'This chapter plays once (no loop). CAST ids: ' + App.castCards('long').map((x) => x.id + '=' + x.name).join(', ') + '; SCENE ids: ' + App.sceneCards('long').map((x) => x.id + '=' + x.name).join(', '));
          const stale = d.voice && d.voice.status === 'ok' && JSON.stringify(d.beats.rows.map((r) => r.voice)) !== JSON.stringify(nv.rows.map((r) => r.voice));
          await L.saveChapter(c.n, Object.assign({ beats: nv, status: 'ok' }, stale ? { voice: Object.assign({}, d.voice, { status: 'stale' }) } : {}));
          await App.addVersion('long-ch', nv, note, 'ch' + c.n); if (L.state(3) === 'ok') await L.markLater(3); App.render();
        } catch (err) { stEl.innerHTML = ''; stEl.append(h('div', { class: 'err-line' }, App.errText(err))); e.target.disabled = false; }
      } }, 'ส่งให้ Claude แก้')), stEl);
      return h('details', { class: 'chap-d panel', open: d.status === 'error' },
        h('summary', {}, h('span', { class: 'chap-n sm' }, String(c.n).padStart(2, '0')), h('b', {}, c.title), h('span', { class: 'sp' }), st),
        h('p', { class: 'small muted' }, c.summary),
        d.status === 'error' ? h('div', { class: 'err-line' }, d.err || '') : null,
        d.beats ? rowsTable(d.beats, tl) : null, tl ? App.issuesEl(tl.issues) : null,
        h('div', { class: 'row' }, d.beats ? h('button', { class: 'btn sm', disabled: busy, onclick: () => { box.hidden = !box.hidden; } }, 'แก้ไข') : null,
          h('button', { class: 'btn sm ghost', disabled: busy, onclick: () => L.writeChapter(c.n) }, d.beats ? 'เขียนตอนนี้ใหม่' : 'เขียนตอนนี้')), box);
    });
    main.append(L.head(3, 'บททุกตอน', 'บทพากย์ ซับ ภาพ เสียงประกอบ และเพลงของแต่ละตอน ในรูปแบบเดียวกับ Short (แต่ไม่วนลูป) เขียนพร้อมกันทีละ 2 ตอน',
      h('div', { class: 'row' }, h('span', { class: 'pill ' + (nOk === chs.length ? 'ok' : 'acc') }, 'เขียนแล้ว ' + nOk + '/' + chs.length), total ? h('span', { class: 'pill' }, 'รวม ~' + fmtMin(total) + ' นาที') : null)));
    main.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn pri', disabled: nOk === chs.length, onclick: () => L.writeAll() }, 'เขียนทุกตอนที่ยังไม่มี'), h('span', { class: 'sp' }),
      h('button', { class: 'btn ghost', onclick: (e) => { if (e.target.dataset.sure) L.writeAll(true); else { e.target.dataset.sure = 1; e.target.textContent = 'กดอีกครั้งเพื่อเขียนใหม่ทุกตอน'; } } }, 'เขียนใหม่ทุกตอน')));
    main.append(h('div', { class: 'col' }, ...items));
    main.append(h('div', { class: 'panel', style: { marginTop: '14px' } }, h('div', { class: 'actions', style: { border: 0, margin: 0, padding: 0 } },
      h('button', { class: 'btn ok', disabled: nOk !== chs.length, onclick: async (e) => { e.target.disabled = true; await L.approve(3); } }, nOk === chs.length ? 'ยืนยันบททุกตอน' : 'รอให้เขียนครบทุกตอน (' + nOk + '/' + chs.length + ')'))));
  }

  // ================= L4 voice =================
  const chLines = (d) => d.beats.rows.map((r) => String(r.voice || '').trim());
  const chGaps = (d) => d.beats.rows.map((r, i) => (r.pause_after > 0 ? i + ':' + Math.min(2, +r.pause_after) : null)).filter(Boolean);
  L.saveVoice = async (pid, n, patch) => { const cur = (L.chs()[n] && App.st.pid === pid ? L.chs()[n] : await App.db.get(chPath(pid, n))) || {}; return L.saveChapter(n, { voice: Object.assign({}, cur.voice || {}, patch) }, pid); };
  L.recordChapter = async function (n) {
    const pid = App.st.pid; const d = L.chs()[n]; const st = App.longStyle(App.projChannel());
    const id = await S5().take({ lines: chLines(d), gaps: chGaps(d), tempo: st.tempo, maxgap: st.maxgap, target: { pid, chapter: n }, save: (patch) => L.saveVoice(pid, n, patch), refresh: () => L.refresh(4) });
    L.watchVoice(pid, n, id);
  };
  L.watched = new Set();
  L.watchVoice = function (pid, n, id) {
    if (L.watched.has(id)) return; L.watched.add(id);
    App.waitJob(id).then(async (j) => { await L.saveVoice(pid, n, S5().okVoice(j.result || {})); L.refresh(4); })
      .catch(async (e) => { await L.saveVoice(pid, n, { status: 'error', err: App.errText(e) }); L.refresh(4); });
  };
  L.recordAll = async function (list) {
    if (L.recording) return; L.recording = true; L.refresh(4);
    for (const n of list) { try { await L.recordChapter(n); } catch (e) { App.toast('ตอน ' + n + ': ' + App.errText(e), 'err'); } }
    L.recording = false; L.refresh(4);
  };
  function rVoice(main) {
    const chs = chapterList(); const docs = L.chs(); const st = App.longStyle(App.projChannel()); const ch = App.projChannel();
    const vname = (App.st.project.voiceSel && App.st.project.voiceSel.name) || ch.voice.name;
    const need = chs.filter((c) => { const v = (docs[c.n] || {}).voice; return docs[c.n] && docs[c.n].beats && (!v || ['error', 'stale'].includes(v.status) || !v.status); }).map((c) => c.n);
    const nOk = chs.filter((c) => ((docs[c.n] || {}).voice || {}).status === 'ok').length;
    const queued = chs.filter((c) => ((docs[c.n] || {}).voice || {}).status === 'queued');
    for (const c of queued) { const v = docs[c.n].voice; if (v.jobId) L.watchVoice(App.st.pid, c.n, v.jobId); }
    main.append(L.head(4, 'เสียงพากย์', 'อัดทีละตอน ตอนละหนึ่งเทค เสียงเดียวกับ Short (' + vname + ') · เร็ว ×' + st.tempo + ' · เงียบไม่เกิน ' + st.maxgap + ' วิ',
      h('span', { class: 'pill ' + (nOk === chs.length ? 'ok' : 'acc') }, 'อัดแล้ว ' + nOk + '/' + chs.length)));
    if (!App.caps.mcp) main.append(h('div', { class: 'note warn', style: { marginBottom: '12px' } }, 'หน้านี้เรียก ElevenLabs ไม่ได้ — กดอัดแล้วงานจะไปที่ Claude Code แทน'));
    if (queued.length) main.append(h('div', { style: { marginBottom: '12px' } }, App.jobNote(App.st.jobs[docs[queued[0].n].voice.jobId]), h('p', { class: 'small muted', style: { marginTop: '6px' } }, 'รอประมวลผล ' + queued.length + ' ตอน — พิมพ์ครั้งเดียว Claude Code ทำทุกตอนที่รออยู่')));
    const confirmBox = h('div', { class: 'col' });
    const ask = async () => {
      confirmBox.innerHTML = ''; confirmBox.append(App.thinking('ประเมินเครดิต…'));
      let credits = 0; if (App.caps.mcp) for (const n of need) { try { const e = await S5().estimate(false, chLines(docs[n])); credits += (e && e.credits) || 0; } catch (e) { /* estimate optional */ } }
      confirmBox.innerHTML = '';
      confirmBox.append(h('div', { class: 'note warn col' }, h('b', {}, 'อัด ' + need.length + ' ตอน จะใช้เครดิต ElevenLabs' + (credits ? ' ประมาณ ' + Math.round(credits).toLocaleString() + ' เครดิต' : '')), h('span', { class: 'small' }, 'อัดต่อกันทีละตอน ใช้เวลาตอนละ ~1–2 นาที ปิดหน้านี้ไว้ได้หลังขึ้นสถานะ "รอ Claude Code"'),
        h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: () => { confirmBox.innerHTML = ''; L.recordAll(need); } }, 'ยืนยัน ใช้เครดิต'), h('button', { class: 'btn ghost', onclick: () => (confirmBox.innerHTML = '') }, 'ยกเลิก'))));
    };
    main.append(h('div', { class: 'panel col' }, h('div', { class: 'row' }, h('button', { class: 'btn pri', disabled: !need.length || L.recording, onclick: ask }, L.recording ? 'กำลังอัด…' : need.length ? 'อัดเสียง ' + need.length + ' ตอน' : 'อัดครบแล้ว'), h('span', { class: 'small muted' }, 'แต่ละตอนถอดเสียงหาเวลาคำ แล้ว Claude Code ปรับความเร็ว ตัดช่วงเงียบ และปรับความดังให้เท่ากันทุกตอน')), confirmBox));
    const list = h('div', { class: 'vlist' });
    for (const c of chs) {
      const d = docs[c.n] || {}; const v = d.voice || {};
      const pill = { ok: h('span', { class: 'pill ok' }, (v.dur || 0).toFixed(1) + ' วิ'), generating: h('span', { class: 'pill acc' }, v.stage || 'กำลังสร้าง'), queued: h('span', { class: 'pill warn' }, 'รอ Claude Code'), error: h('span', { class: 'pill err' }, 'ไม่สำเร็จ'), stale: h('span', { class: 'pill warn' }, 'บทเปลี่ยน ต้องอัดใหม่') }[v.status] || h('span', { class: 'pill' }, 'ยังไม่อัด');
      const play = h('button', { class: 'btn sm', disabled: v.status !== 'ok' }, '▶');
      play.onclick = async () => {
        if (L.audio) { try { L.audio.src.stop(); } catch (e) { /* stopped */ } const was = L.audio.n; L.audio = null; document.querySelectorAll('.vlist .btn.sm').forEach((b) => b.textContent === '■' && (b.textContent = '▶')); if (was === c.n) return; }
        const vo = await App.loadVoice(v); if (!vo) return; const ac = L.ac || (L.ac = new (window.AudioContext || window.webkitAudioContext)());
        const b = ac.createBuffer(1, vo.pcm.length, vo.sr); b.copyToChannel(vo.pcm, 0); const src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(); play.textContent = '■';
        L.audio = { src, n: c.n }; src.onended = () => { if (L.audio && L.audio.src === src) L.audio = null; play.textContent = '▶'; };
      };
      list.append(h('div', { class: 'vrow' }, h('span', { class: 'chap-n sm' }, String(c.n).padStart(2, '0')), h('div', { class: 'grow col', style: { gap: '0' } }, h('b', {}, c.title), v.status === 'error' ? h('span', { class: 'small err-t' }, v.err || '') : h('span', { class: 'small muted' }, d.beats ? d.beats.rows.length + ' ประโยค' : 'ยังไม่มีบท')),
        pill, play, h('button', { class: 'btn sm ghost', disabled: !d.beats || ['generating', 'queued'].includes(v.status) || L.recording, onclick: () => L.recordAll([c.n]) }, v.status === 'ok' ? 'อัดใหม่' : 'อัดตอนนี้')));
    }
    main.append(h('div', { class: 'panel', style: { marginTop: '14px' } }, list));
    main.append(h('div', { class: 'panel', style: { marginTop: '14px' } }, h('div', { class: 'actions', style: { border: 0, margin: 0, padding: 0 } },
      h('button', { class: 'btn ok', disabled: nOk !== chs.length, onclick: async (e) => { e.target.disabled = true; await L.approve(4); } }, nOk === chs.length ? 'ยืนยันเสียงทุกตอน' : 'รออัดครบทุกตอน (' + nOk + '/' + chs.length + ')'))));
  }

  // ================= L5 the long clip =================
  L.rtCache = new Map(); // key -> runtime (keeps the two most recent: the one playing + the next)
  const chKey = (n) => { const d = L.chs()[n] || {}; return App.st.pid + ':' + n + ':' + ((d.voice || {}).assetId || '-') + ':' + LSE.hash(JSON.stringify(d.beats || {})) + ':' + LSE.hash(JSON.stringify(App.projPalette())); };
  L.runtime = async function (n, onProg) {
    const key = chKey(n); if (L.rtCache.has(key)) return L.rtCache.get(key);
    const d = L.chs()[n]; const c = chapterList()[n - 1] || {};
    const job = (async () => { await LSE.loadFonts(); const inp = await App.runtimeInput({ beats: Object.assign({ chapter: true }, d.beats), voice: d.voice || null, scope: 'long', title: c.title, cps: App.longStyle(App.projChannel()).cps }); return LSE.buildRuntime(inp, { onProgress: onProg }); })();
    L.rtCache.set(key, job);
    while (L.rtCache.size > 2) L.rtCache.delete(L.rtCache.keys().next().value);
    try { const rt = await job; L.noteLen(n, rt.timeline.L, key); return rt; } catch (e) { L.rtCache.delete(key); throw e; }
  };
  L.noteLen = function (n, len, key) { const lens = Object.assign({}, (lp() || {}).lens || {}); if (lens[n] && lens[n].key === key) return; lens[n] = { L: len, key }; L.save({ lens }); };
  const lenOf = (n) => { const e = ((lp() || {}).lens || {})[n]; return e && e.key === chKey(n) ? e.L : (((L.chs()[n] || {}).voice || {}).dur || 60) + 0.6; };
  L.chapterMarks = () => { let t = 0; return chapterList().map((c) => { const m = { n: c.n, title: c.title, t }; t += lenOf(c.n); return m; }); };

  async function rClip(main) {
    const chs = chapterList(); const o = outline();
    if (!L.cur || L.cur > chs.length) L.cur = 1;
    const total = chs.reduce((a, c) => a + lenOf(c.n), 0);
    main.append(L.head(5, 'คลิป Long', 'เล่นต่อกันทุกตอนแบบไม่วน ภาพ เสียง และซับคุณภาพเดียวกับ Short · รวม ~' + fmtMin(total) + ' นาที',
      lp().done ? h('span', { class: 'pill ok' }, '✓ จบงาน Long แล้ว') : null));
    const status = h('div', { class: 'panel' }, App.thinking('กำลังประกอบตอนที่ ' + L.cur + '…')); main.append(status);
    let rt; try { rt = await L.runtime(L.cur, (msg) => { const el = status.querySelector('.thinking'); if (el) el.lastChild.textContent = msg + '…'; }); }
    catch (e) { status.innerHTML = ''; status.append(h('div', { class: 'err-line' }, 'ประกอบตอนนี้ไม่สำเร็จ: ' + App.errText(e))); return; }
    if (App.st.track !== 'long' || App.st.lstep !== 5) return; status.remove();
    const cv = h('canvas', { width: rt.renderer.OW, height: rt.renderer.OH, 'aria-label': 'ตัวเล่นคลิปยาว' });
    cv.style.width = Math.min(window.innerWidth < 700 ? 270 : 405, window.innerWidth - 60) + 'px';
    const player = new LSE.Player(cv, rt, { once: true }); App.player = player;
    const marks = L.chapterMarks(); const off = () => marks[L.cur - 1].t;
    const time = h('span', { class: 'mono small' }); const scrub = h('input', { type: 'range', class: 'scrub', min: 0, max: player.rt.timeline.L, step: 1 / 30, value: 0, 'aria-label': 'ตำแหน่งในตอนนี้' });
    const setTime = (t) => { scrub.value = t; time.textContent = 'ตอน ' + L.cur + ' · ' + App.fmtT(t) + ' · รวม ' + fmtMin(off() + t) + ' / ' + fmtMin(total); };
    player.onTime = setTime; setTime(0);
    scrub.addEventListener('input', () => player.seek(+scrub.value));
    let auto = false;
    const playBtn = h('button', { class: 'btn pri', onclick: () => { auto = true; player.toggle(); playBtn.textContent = player.playing ? '❚❚ หยุด' : '▶ เล่นต่อเนื่อง'; if (player.playing) prefetch(); } }, '▶ เล่นต่อเนื่อง');
    const prefetch = () => { if (L.cur < chs.length) L.runtime(L.cur + 1).catch(() => {}); };
    const pick = async (n, play) => {
      L.cur = n; strip.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i + 1 === n));
      playBtn.disabled = true; playBtn.textContent = 'กำลังเตรียมตอนที่ ' + n + '…';
      try { const r2 = await L.runtime(n); if (!cv.isConnected) return; player.setRuntime(r2); scrub.max = r2.timeline.L; renderChecks(r2); if (play) { player.play(); prefetch(); } }
      catch (e) { App.toast(App.errText(e), 'err'); }
      playBtn.disabled = false; playBtn.textContent = player.playing ? '❚❚ หยุด' : '▶ เล่นต่อเนื่อง';
    };
    player.onEnd = () => { if (auto && L.cur < chs.length) pick(L.cur + 1, true); else { playBtn.textContent = '▶ เล่นต่อเนื่อง'; } };
    const strip = h('div', { class: 'chap-strip' }, ...chs.map((c) => h('button', { class: c.n === L.cur ? 'on' : '', onclick: () => { const was = player.playing; player.stop(); pick(c.n, was); }, title: c.title },
      h('span', { class: 'mono' }, String(c.n).padStart(2, '0')), h('span', { class: 'small' }, c.title), h('span', { class: 'mono small muted' }, fmtMin(marks[c.n - 1].t)))));
    const mute = (key, label) => { const b = h('button', { class: 'btn sm' }, '🔊 ' + label); b.onclick = () => { const on = !player.mutes[key]; player.mute(key, on); b.textContent = (on ? '🔇 ' : '🔊 ') + label; }; return b; };
    const checks = h('div', { class: 'col' });
    function renderChecks(r) {
      const tl = r.timeline; const m = r.stems.meter; checks.innerHTML = '';
      const chk = (label, val, ok) => h('div', { class: 'check' }, h('span', { class: 'small muted' }, label), h('b', {}, val), h('span', { class: 'pill ' + (ok ? 'ok' : 'warn') }, ok ? 'ผ่าน' : 'ควรดู'));
      checks.append(h('h3', {}, 'ผลตรวจตอนที่ ' + L.cur), h('div', { class: 'checks' },
        chk('ความยาวตอน', tl.L.toFixed(1) + ' วิ · ' + tl.bpm.toFixed(1) + ' BPM', tl.L >= 35 && tl.L <= 95),
        chk('ฮุกห่างสุด', tl.maxHookGap.toFixed(2) + ' วิ', tl.maxHookGap <= 4.5),
        chk('เสียงประกอบ', tl.sfx.length + ' จุด', tl.sfx.length > 20),
        chk('พากย์ / เพลงที่ลดเสียง', (m.voice ?? -70).toFixed(1) + ' / ' + (m.musicDucked ?? -70).toFixed(1) + ' LUFS', !r.stems.voice || (m.voice - m.musicDucked) >= 6),
        chk('ทรานซิชัน', tl.trans.map((x) => x.type).join(', ') || 'ไม่มี', tl.trans.length >= 1)), App.issuesEl(tl.issues));
    }
    renderChecks(rt);
    const deliver = h('div', {});
    main.append(h('div', { class: 'studio' },
      h('div', { class: 'col' }, h('div', { class: 'screen' }, cv), h('div', { class: 'row' }, playBtn, time), scrub, h('div', { class: 'row' }, mute('voice', 'พากย์'), mute('music', 'เพลง'), mute('sfx', 'เสียงประกอบ'))),
      h('div', { class: 'col' }, h('div', { class: 'panel col' }, h('h3', {}, 'ตอนทั้งหมด'), strip), h('div', { class: 'panel col' }, checks),
        h('div', { class: 'panel' }, App.approvalBar({
          approveLabel: lp().done ? '✓ จบงาน Long แล้ว' : 'ยืนยันจบงาน Long', editLabel: 'แก้ตอนนี้',
          editHint: 'เช่น "ช็อตที่ 3 ของตอนนี้ให้ซูมเข้า และเปลี่ยนเพลงช่วงท้ายเป็นแบบชัยชนะ"',
          onApprove: async () => { await L.save({ done: true }); await L.setStep(5, 'ok'); App.toast('จบงาน Long แล้ว ดาวน์โหลดได้ด้านล่าง'); App.render(); },
          onEdit: async (note) => {
            const d = L.chs()[L.cur]; const nv = await C.editTimeline(d.beats, note, player.rt.timeline.issues || []);
            if (d.voice && d.voice.status === 'ok') nv.rows.forEach((r, i) => { if (d.beats.rows[i]) r.voice = d.beats.rows[i].voice; });
            await L.saveChapter(L.cur, { beats: nv }); await App.addVersion('long-ch', nv, 'แก้ในคลิป: ' + note, 'ch' + L.cur);
            await L.save({ done: false }); await L.setStep(5, 'draft'); App.render();
          },
        }), deliver))));
    if (lp().done) renderDelivery(deliver);
    player.draw(0);
  }

  function renderDelivery(box) {
    const o = outline() || {}; const ch = App.projChannel(); const chs = chapterList();
    const cr = App.creditsText('long'); const marks = L.chapterMarks();
    const title = o.yt_title || o.title || App.st.project.title || '';
    const chapLines = marks.map((m) => fmtMin(m.t) + ' ' + m.title).join('\n'); // YouTube chapter list (first entry must be 0:00)
    const tags = (o.hashtags || (App.st.project.beats || {}).hashtags || []).join(' ');
    const desc = [o.description || '', 'ตอนในคลิปนี้\n' + chapLines, tags, cr.text].filter(Boolean).join('\n\n');
    const fileBase = () => (title || 'legend-long').replace(/[\\/:*?"<>|]+/g, '').slice(0, 60).trim() || 'legend-long';
    const prog = h('div', { class: 'progress', hidden: true }, h('i', {})); const progT = h('span', { class: 'small muted' });
    let ctl = null;
    const run = async (btn, list, name, bitrate) => { // list = chapter numbers, encoded back to back into one file
      const sup = await LSE.exportSupport();
      if (!sup.video) { const id = await App.queueJob('render_long', { pid: App.st.pid, chapters: list, fps: 30, w: 1080, h: 1920 }, 'เรนเดอร์คลิปยาวทีละตอนฝั่ง Claude Code แล้วอัปโหลด'); box.prepend(App.jobNote(App.st.jobs[id])); return; }
      btn.disabled = true; prog.hidden = false; ctl = new AbortController(); App.player && App.player.stop();
      try {
        const { blob, ext } = await LSE.exportSequence(list.length, (k) => L.runtime(list[k]), (f, msg) => { prog.firstChild.style.width = Math.round(f * 100) + '%'; progT.textContent = msg + ' · ' + Math.round(f * 100) + '%'; }, ctl.signal, { bitrate });
        progT.textContent = 'เข้ารหัสเสร็จ ' + (blob.size / 1e6).toFixed(1) + ' MB (' + ext.toUpperCase() + ')';
        await App.save(name + '.' + ext, blob);
      } catch (e) { progT.textContent = ''; App.toast('บันทึกวิดีโอไม่สำเร็จ: ' + App.errText(e), 'err'); }
      btn.disabled = false;
    };
    const allBtn = h('button', { class: 'btn pri', onclick: () => run(allBtn, chs.map((c) => c.n), fileBase(), 3.5e6) }, 'บันทึกคลิปเต็ม (.mp4)');
    const oneBtn = h('button', { class: 'btn', onclick: () => run(oneBtn, [L.cur], fileBase() + ' ตอน ' + L.cur, 6e6) }, 'บันทึกเฉพาะตอนที่เลือก');
    const stopBtn = h('button', { class: 'btn ghost sm', onclick: () => ctl && ctl.abort() }, 'ยกเลิก');
    const ta = (v, rows) => h('textarea', { readonly: true, rows }, v);
    box.append(h('div', { class: 'panel col deliver' }, h('h3', {}, 'ส่งงาน Long'),
      h('div', { class: 'row' }, allBtn, oneBtn, stopBtn), h('span', { class: 'small muted' }, '1080×1920 · 30 fps · H.264 + AAC · คลิปเต็ม ~' + fmtMin(marks.length ? marks[marks.length - 1].t + lenOf(chs.length) : 0) + ' นาที ใช้เวลาเรนเดอร์หลายนาที (บนมือถือแนะนำให้บันทึกทีละตอน)'), prog, progT,
      h('div', { class: 'field' }, h('span', {}, 'ชื่อคลิปบน YouTube'), ta(title, 2), h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: (e) => App.copy(title, e.target) }, 'คัดลอกชื่อ'))),
      h('div', { class: 'field' }, h('span', {}, 'คำอธิบาย + สารบัญตอน (YouTube Chapters)'), ta(desc, 12), h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: (e) => App.copy(desc, e.target) }, 'คัดลอกคำอธิบาย'))),
      h('p', { class: 'small muted' }, 'เวลาของแต่ละตอนแม่นเมื่อประกอบตอนนั้นแล้วอย่างน้อยหนึ่งครั้ง (เล่นหรือบันทึก) · เครดิต LPC ใส่ไว้ท้ายคำอธิบายแล้ว')));
  }
})();
