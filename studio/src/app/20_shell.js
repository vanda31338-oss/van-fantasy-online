// Shell: boot, channels, projects, versions, step bar, start screen, settings, jobs.
(function () {
  const App = window.App; const h = App.h;
  const STEP_NAMES = ['', 'หัวข้อ', 'เรื่องย่อ', 'ตัวละคร ของ และฉาก', 'บทพากย์และจังหวะ', 'เสียงพากย์', 'คลิปจริง'];
  App.STEP_NAMES = STEP_NAMES;
  App.Steps = {};

  // ---------- channels ----------
  App.loadChannels = async function () {
    let list = [];
    try { list = await App.db.list('channels'); } catch (e) { App.toast(App.errText(e), 'err'); }
    App.st.channels = {}; for (const c of list) App.st.channels[c._id] = c;
    let cfg = null; try { cfg = await App.db.get('config/app'); } catch (e) { /* first run */ }
    if (!list.length) {
      const ch = App.DEFAULT_CHANNEL(); App.st.channels.ch_default = ch;
      try { await App.db.set('channels/ch_default', ch); await App.db.set('config/app', { activeChannel: 'ch_default' }); } catch (e) { /* read-only view */ }
      cfg = { activeChannel: 'ch_default' };
    }
    App.st.activeChannel = (cfg && App.st.channels[cfg.activeChannel]) ? cfg.activeChannel : Object.keys(App.st.channels)[0];
    App.renderChip();
  };
  App.saveChannel = async function (id, ch) { ch.updatedAt = Date.now(); App.st.channels[id] = ch; await App.db.set('channels/' + id, stripId(ch)); App.renderChip(); };
  App.setActiveChannel = async function (id) { App.st.activeChannel = id; await App.db.set('config/app', { activeChannel: id }); App.renderChip(); };
  function stripId(o) { const c = Object.assign({}, o); delete c._id; return c; }
  App.renderChip = function () { const c = App.channel(); const el = App.$('#chChip'); if (el) { el.innerHTML = ''; el.append(h('span', { class: 'dot' }), c.name); el.title = 'ช่องที่ใช้อยู่: ' + c.name; } };

  // ---------- projects ----------
  App.loadProjects = async function () {
    try { App.st.projects = (await App.db.list('projects')).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); } catch (e) { App.st.projects = []; App.toast(App.errText(e), 'err'); }
  };
  App.newProject = async function (topic, opts) {
    const ch = App.clone(App.channel()); delete ch._id;
    const pid = App.uid('p');
    const p = { topic, genre: opts.genre || 'history', title: '', channelId: App.st.activeChannel, ch, opts: { len: opts.len || ch.duration[1], cta: opts.cta || ch.cta || 'auto' }, step: 2, steps: { 1: 'ok', 2: 'todo', 3: 'todo', 4: 'todo', 5: 'todo', 6: 'todo' }, cur: {}, palette: null, voice: null, done: false, createdAt: Date.now(), updatedAt: Date.now() };
    await App.db.set('projects/' + pid, p);
    App.st.pid = pid; App.st.project = p; App.st.cards = {}; App.st.versions = null; App.st.track = 'short'; App.st.long = null;
    return pid;
  };
  App.openProject = async function (pid) {
    const p = await App.db.get('projects/' + pid); if (!p) { App.toast('ไม่พบโปรเจกต์นี้', 'err'); return; }
    App.st.pid = pid; App.st.project = p; App.st.versions = null; App.st.cards = {};
    try { for (const c of await App.db.list('projects/' + pid + '/cards')) App.st.cards[c._id] = c; } catch (e) { App.toast(App.errText(e), 'err'); }
    App.st.view = 'project'; App.st.step = p.step || 2;
    App.st.track = p.done && p.long && p.long.on ? 'long' : 'short'; App.st.lstep = (p.long && p.long.step) || 1;
    if (p.long && p.long.on && App.Long) await App.Long.loadChapters();
    App.watchJobs(); App.render();
  };
  App.saveProject = async function (patch) {
    const p = App.st.project; Object.assign(p, patch, { updatedAt: Date.now() });
    try { await App.db.update('projects/' + App.st.pid, Object.assign({}, patch, { updatedAt: p.updatedAt })); } catch (e) { App.toast('บันทึกไม่สำเร็จ: ' + App.errText(e), 'err'); }
  };
  App.saveCard = async function (cid, card) { App.st.cards[cid] = card; try { await App.db.set('projects/' + App.st.pid + '/cards/' + cid, stripId(card)); } catch (e) { App.toast('บันทึกการ์ดไม่สำเร็จ: ' + App.errText(e), 'err'); } };
  App.delCard = async function (cid) { delete App.st.cards[cid]; try { await App.db.del('projects/' + App.st.pid + '/cards/' + cid); } catch (e) { /* ignore */ } };

  // versions: projects/<pid>/versions/<vid> {kind, ref, n, data, note, at}
  App.versions = async function (kind, ref) {
    const key = kind + '|' + (ref || '');
    if (!App.st.versions || App.st.versionsPid !== App.st.pid) {
      App.st.versions = {}; App.st.versionsPid = App.st.pid;
      let all = []; try { all = await App.db.list('projects/' + App.st.pid + '/versions'); } catch (e) { /* none yet */ }
      for (const v of all) { const k = v.kind + '|' + (v.ref || ''); (App.st.versions[k] = App.st.versions[k] || []).push(v); }
      for (const k in App.st.versions) App.st.versions[k].sort((a, b) => a.n - b.n);
    }
    return (App.st.versions[key] = App.st.versions[key] || []);
  };
  App.addVersion = async function (kind, data, note, ref) {
    const list = await App.versions(kind, ref); const n = (list.length ? list[list.length - 1].n : 0) + 1;
    const vid = kind + (ref ? '-' + ref : '') + '-v' + n + '-' + Math.random().toString(36).slice(2, 5);
    const v = { kind, ref: ref || '', n, data, note: note || '', at: Date.now() };
    await App.db.set('projects/' + App.st.pid + '/versions/' + vid, v);
    v._id = vid; list.push(v); return v;
  };

  // step states
  App.stepState = (k) => (App.st.project && App.st.project.steps[k]) || 'todo';
  App.setStep = async function (k, state) { const s = Object.assign({}, App.st.project.steps); s[k] = state; await App.saveProject({ steps: s }); };
  App.approveStep = async function (k) {
    const s = Object.assign({}, App.st.project.steps); s[k] = 'ok';
    const next = Math.min(6, k + 1);
    await App.saveProject({ steps: s, step: Math.max(App.st.project.step || 1, next) });
    App.toast('ยืนยัน' + STEP_NAMES[k] + 'แล้ว', '', { label: '↶ ยกเลิก', run: () => App.unapproveStep(k) });
    App.goStep(k === 6 ? 6 : next);
  };
  // an earlier step changed: later approved steps need a re-check (nothing is deleted)
  App.markLater = async function (k) {
    const s = Object.assign({}, App.st.project.steps); let changed = false;
    for (let j = k + 1; j <= 6; j++) if (s[j] === 'ok') { s[j] = 'recheck'; changed = true; }
    s[k] = s[k] === 'ok' ? 'draft' : s[k];
    await App.saveProject({ steps: s, done: false }); if (changed) App.toast('ขั้นต่อจากนี้ถูกทำเครื่องหมายให้ตรวจใหม่', 'warn');
  };
  // undo a mistaken ยืนยัน: the step goes back to draft, later approved steps need a re-check, nothing is deleted
  App.unapproveStep = async function (k) {
    await App.markLater(k); if (k === 6) await App.setStep(6, 'draft');
    App.toast('ยกเลิกการยืนยัน' + STEP_NAMES[k] + 'แล้ว แก้ต่อได้เลย'); App.st.step = k; App.render();
  };
  // prev = the bar sits on the next step's page and undoes the step just approved (approving moves you forward)
  App.undoBar = (label, onUndo, prev) => h('div', { class: 'note ok undo-bar' + (prev ? ' prev' : '') }, h('span', {}, '✓ ' + label), h('span', { class: 'sp' }),
    h('button', { class: 'btn sm ghost', onclick: async (e) => { e.target.disabled = true; try { await onUndo(); } catch (er) { App.toast(App.errText(er), 'err'); e.target.disabled = false; } } }, prev ? '↶ ยกเลิก กลับไปแก้ขั้นนั้น' : '↶ ยกเลิกการยืนยัน'));
  App.canOpen = (k) => { const p = App.st.project; if (!p) return false; if (k <= 2) return true; for (let j = 2; j < k; j++) if (!['ok', 'recheck'].includes(p.steps[j])) return false; return true; };
  App.goStep = function (k) { if (!App.canOpen(k)) return; App.st.track = 'short'; App.st.step = k; App.render(); window.scrollTo({ top: 0 }); };

  // ---------- jobs (Claude Code fallback) ----------
  App.queueJob = async function (type, inputs, note) {
    const id = App.uid('job');
    const job = { type, pid: App.st.pid, status: 'queued', inputs, note: note || '', at: Date.now() };
    await App.db.set('jobs/' + id, job);
    App.st.jobs[id] = Object.assign({ _id: id }, job); App.renderJobChip();
    return id;
  };
  App._jobWaits = {};
  App.waitJob = function (id, onUpdate) { // one watcher per job, independent of re-renders
    if (App._jobWaits[id]) return App._jobWaits[id];
    App._jobWaits[id] = new Promise((res, rej) => {
      const un = App.db.watch('jobs/' + id, (j) => {
        if (!j) return; App.st.jobs[id] = Object.assign({ _id: id }, j); App.renderJobChip();
        if (j.status === 'done') { un(); res(j); } else if (j.status === 'error') { un(); delete App._jobWaits[id]; rej(Object.assign(new Error(j.error || 'งานล้มเหลว'), { job: j })); }
        else onUpdate && onUpdate(j);
      });
    });
    return App._jobWaits[id];
  };
  App.watchJobs = function () {
    if (App._jobsUn) App._jobsUn();
    App._jobsUn = App.db.watchColl('jobs', (docs) => { App.st.jobs = {}; for (const d of docs) App.st.jobs[d._id] = d; App.renderJobChip(); });
  };
  App.renderJobChip = function () {
    const n = Object.values(App.st.jobs).filter((j) => j.status === 'queued' || j.status === 'working').length;
    const el = App.$('#jobChip'); if (!el) return; el.hidden = !n; el.textContent = 'รอ Claude Code ' + n + ' งาน';
  };
  App.jobNote = function (job) {
    return h('div', { class: 'note warn col' },
      h('b', {}, 'รอ Claude Code ทำงานนี้ – พิมพ์ ', h('span', { class: 'kbd' }, 'ทำงานค้าง'), ' ในแชต Claude Code'),
      h('span', { class: 'small' }, 'หน้านี้จะทำต่อเองเมื่องานเสร็จ (สถานะ: ' + ({ queued: 'อยู่ในคิว', working: 'กำลังทำ', done: 'เสร็จแล้ว', error: 'ล้มเหลว' }[job && job.status] || 'อยู่ในคิว') + ')'),
      h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: (e) => App.copy('ทำงานค้าง', e.target) }, 'คัดลอกคำว่า "ทำงานค้าง"')));
  };

  // ---------- notices ----------
  App.renderNotice = function () {
    const box = App.$('#notice'); box.innerHTML = '';
    const miss = [];
    if (!App.caps.db) miss.push('บันทึกข้อมูล (db)'); if (!App.caps.sample) miss.push('Claude ในหน้า (sample)');
    if (!App.caps.mcp) miss.push('ElevenLabs (mcp)'); if (!App.caps.assets) miss.push('เก็บไฟล์ (assets)'); if (!App.caps.downloads) miss.push('บันทึกไฟล์ (downloads)');
    if (miss.length) box.append(h('div', { class: 'banner' }, h('div', {}, 'มุมมองนี้ใช้ไม่ได้: ' + miss.join(', ') + ' — ขั้นที่ต้องใช้จะแสดงทางเลือกให้ Claude Code ทำแทน' + (!App.caps.db ? ' (งานจะไม่ถูกบันทึกจนกว่าจะเปิดใน claude.ai)' : ''))));
  };

  // ---------- main render ----------
  App.render = function () {
    for (const u of App.subs.splice(0)) try { u(); } catch (e) { /* ignore */ }
    App.previews.clear();
    if (App.player) { App.player.stop(); App.player = null; }
    const main = App.$('#main'); main.innerHTML = '';
    const steps = App.$('#steps');
    if (App.st.view === 'project' && App.st.project) {
      steps.hidden = false; renderStepBar(steps);
      const curSt = steps.querySelector('.st.cur'); if (curSt) steps.scrollLeft = Math.max(0, curSt.offsetLeft - (steps.clientWidth - curSt.offsetWidth) / 2); // keep the current step visible on narrow screens
      App.$('#barMid').textContent = (App.st.project.title || App.st.project.topic || '');
      if (App.st.track === 'long' && App.Long) { App.Long.render(main); return; }
      const k = App.st.step || 2; const S = App.Steps[k];
      try { if (S) S.render(main); } catch (e) { console.error(e); main.append(h('div', { class: 'err-line' }, 'แสดงขั้นนี้ไม่ได้: ' + App.errText(e))); }
    } else {
      steps.hidden = true; App.$('#barMid').textContent = ''; renderHome(main);
    }
  };
  // two tracks in one bar: the Short (6 steps) and, once started, the Long video grown from it (5 steps)
  function renderStepBar(nav) {
    nav.innerHTML = ''; const inner = h('div', { class: 'steps-in' }); nav.append(inner);
    const p = App.st.project; const G = App.genre(p.genre); const onLong = App.st.track === 'long';
    inner.append(h('span', { class: 'trk', title: G.name }, G.icon + ' SHORT'));
    for (let k = 1; k <= 6; k++) {
      const s = App.stepState(k); const cur = !onLong && App.st.step === k;
      inner.append(h('button', { class: 'st ' + (cur ? 'cur ' : '') + s, disabled: k === 1 || !App.canOpen(k), onclick: () => App.goStep(k), title: STEP_NAMES[k] },
        h('span', { class: 'n' }, s === 'ok' ? '✓' : String(k)), STEP_NAMES[k], s === 'recheck' ? h('span', { class: 'tag' }, 'ตรวจใหม่') : null));
    }
    const LG = App.Long; if (!LG) return;
    inner.append(h('span', { class: 'trk long' }, 'LONG 9–10 นาที'));
    if (!(p.long && p.long.on)) { inner.append(h('button', { class: 'st add', disabled: !p.done, title: p.done ? 'ต่อยอด Short นี้เป็นคลิปยาว' : 'จบงาน Short ก่อน แล้วทำ Long ต่อได้', onclick: () => LG.start() }, h('span', { class: 'n' }, '+'), p.done ? 'ทำคลิป Long' : 'ทำ Long ได้หลังจบ Short')); return; }
    for (let k = 1; k <= 5; k++) {
      const s = LG.state(k); const cur = onLong && App.st.lstep === k;
      inner.append(h('button', { class: 'st lg ' + (cur ? 'cur ' : '') + s, disabled: !LG.canOpen(k), onclick: () => LG.go(k), title: LG.NAMES[k] },
        h('span', { class: 'n' }, s === 'ok' ? '✓' : 'L' + k), LG.NAMES[k], s === 'recheck' ? h('span', { class: 'tag' }, 'ตรวจใหม่') : null));
    }
  }
  App.stepHead = function (k, title, sub, extra) {
    const s = App.stepState(k);
    return h('div', { class: 'col', style: { marginBottom: '14px' } },
      h('div', { class: 'step-head' }, h('div', { class: 'col', style: { gap: '2px' } }, h('span', { class: 'eyebrow' }, 'STEP ' + k), h('h1', {}, title)), h('div', { class: 'sp' }), extra || null),
      sub ? h('p', { class: 'muted' }, sub) : null,
      s === 'recheck' ? h('div', { class: 'note warn' }, 'ขั้นก่อนหน้าถูกแก้ไข ตรวจขั้นนี้อีกครั้ง แล้วกด ยืนยัน (ของเดิมยังอยู่ครบ)') : null,
      s === 'ok' ? App.undoBar(k === 6 ? 'จบงาน Short แล้ว' : 'ยืนยันขั้นนี้แล้ว', () => App.unapproveStep(k))
        : k > 2 && App.stepState(k - 1) === 'ok' ? App.undoBar('ยืนยัน' + STEP_NAMES[k - 1] + 'แล้ว (ขั้น ' + (k - 1) + ')', () => App.unapproveStep(k - 1), 'prev') : null);
  };

  // ---------- start screen: pick the genre, then the topic ----------
  const pref = { get: (k) => { try { return localStorage.getItem('ls.' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('ls.' + k, v); } catch (e) { /* private mode */ } } };
  function renderHome(main) {
    const ch = App.channel();
    let gid = App.GENRES[App.st.genre] ? App.st.genre : (App.GENRES[pref.get('genre')] ? pref.get('genre') : null);
    const input = h('input', { type: 'text', id: 'topic', placeholder: 'เลือกแนวคลิปด้านบนก่อน', autocomplete: 'off', disabled: !gid });
    const len = h('input', { type: 'number', id: 'len', min: 30, max: 60, value: ch.duration[1] });
    const cta = h('select', { id: 'cta' }, ...[['auto', 'ให้ Claude เลือก'], ['like', 'ไลก์'], ['share', 'แชร์'], ['subscribe', 'ซับสไครบ์']].map(([v, t]) => h('option', { value: v }, t)));
    const exBox = h('div', { class: 'examples' });
    const go = async () => {
      if (!gid) { App.toast('เลือกแนวคลิปก่อน', 'warn'); return; }
      const topic = input.value.trim(); if (!topic) { input.focus(); App.toast('พิมพ์หัวข้อก่อน', 'warn'); return; }
      btn.disabled = true;
      try { await App.newProject(topic, { genre: gid, len: +len.value || ch.duration[1], cta: cta.value }); App.st.view = 'project'; App.st.step = 2; App.watchJobs(); App.render(); App.Steps[2].generate(); }
      catch (e) { App.toast(App.errText(e), 'err'); btn.disabled = false; }
    };
    const btn = h('button', { class: 'btn pri big', disabled: !gid, onclick: go }, 'เริ่มสร้าง Short →');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const demo = h('canvas', { class: 'demo-cv', width: 540, height: 960, 'aria-label': 'ตัวอย่างคลิป' });
    const demoCap = h('p', { class: 'small muted demo-cap' });
    const cards = App.GENRE_ORDER.map((id) => { const G = App.GENRES[id];
      return h('button', { class: 'genre g-' + G.hue + (id === gid ? ' on' : ''), role: 'radio', 'aria-checked': String(id === gid), onclick: () => pick(id) },
        h('span', { class: 'g-ico', 'aria-hidden': 'true' }, G.icon), h('span', { class: 'g-n' }, G.name), h('span', { class: 'g-t small' }, G.tagline),
        h('span', { class: 'g-ex small' }, G.examples.slice(0, 2).map((e) => '“' + e + '”').join(' · ')), h('span', { class: 'g-tick', 'aria-hidden': 'true' }, '✓')); });
    function pick(id) {
      gid = id; App.st.genre = id; pref.set('genre', id); const G = App.GENRES[id];
      cards.forEach((c, i) => { const on = App.GENRE_ORDER[i] === id; c.classList.toggle('on', on); c.setAttribute('aria-checked', String(on)); });
      input.disabled = false; btn.disabled = false; input.placeholder = G.placeholder; cta.value = G.cta || 'auto';
      exBox.innerHTML = ''; exBox.append(...G.examples.map((t) => h('button', { class: 'chip', onclick: () => { input.value = t; input.focus(); } }, t)));
      topicBox.classList.remove('dim'); App.demoPreview(demo, G.demo, demoCap);
    }
    const topicBox = h('div', { class: 'panel topic-box' + (gid ? '' : ' dim') },
      h('div', { class: 'topic-in' }, input), exBox,
      h('details', { class: 'more' }, h('summary', {}, 'ตัวเลือกเพิ่ม'), h('div', { class: 'form2', style: { marginTop: '10px' } }, h('label', { class: 'field' }, h('span', {}, 'ความยาว Short (วินาที)'), len), h('label', { class: 'field' }, h('span', {}, 'CTA'), cta))),
      h('div', { class: 'row' }, btn, h('span', { class: 'muted small' }, 'ช่อง ' + ch.name + ' · เสียง ' + (ch.voice && ch.voice.name || '-'))));
    main.append(
      h('section', { class: 'home-hero' },
        h('div', { class: 'col hh-copy' },
          h('span', { class: 'eyebrow' }, 'LEGEND SHORTS STUDIO'),
          h('h1', { class: 'hh-t' }, 'คลิปพิกเซลอาร์ต', h('br', {}), 'คุณภาพระดับ ', h('span', { class: 'hl' }, '100 บาท 7 วัน')),
          h('p', { class: 'muted' }, 'เลือกแนว พิมพ์หัวข้อเดียว แล้วสตูดิโอพาทำทีละขั้นจนได้ Short แนวตั้งที่วนต่อเนื่อง และต่อยอดเป็นคลิปยาว 9–10 นาทีได้ในโปรเจกต์เดียวกัน'),
          h('div', { class: 'qual' }, ...[['🎙', 'เสียงพากย์ ElevenLabs เล่าเร็วแบบ Short'], ['🎵', 'เพลงแต่งตามจังหวะพูด'], ['💥', 'เสียงประกอบจริงจากคลัง'], ['🌃', 'ฉากหลายชั้น มีชีวิตตลอด']].map(([i, t]) => h('span', { class: 'q' }, h('b', { 'aria-hidden': 'true' }, i), t)))),
        h('div', { class: 'hh-demo' }, demo, demoCap)),
      h('h2', { class: 'sec-t' }, h('span', { class: 'n' }, '1'), 'เลือกแนวคลิป'),
      h('div', { class: 'genres', role: 'radiogroup', 'aria-label': 'แนวคลิป' }, ...cards),
      h('h2', { class: 'sec-t' }, h('span', { class: 'n' }, '2'), 'หัวข้อ'),
      topicBox,
      h('div', { class: 'panel', style: { marginTop: '22px' } },
        h('div', { class: 'row', style: { marginBottom: '12px' } }, h('h2', {}, 'โปรเจกต์ล่าสุด'), h('span', { class: 'sp' }), h('span', { class: 'muted small' }, App.st.projects.length + ' โปรเจกต์')),
        App.st.projects.length ? h('div', { class: 'proj-list' }, ...App.st.projects.slice(0, 24).map(projCard))
          : h('p', { class: 'muted' }, 'ยังไม่มีโปรเจกต์ เริ่มจากเลือกแนวและพิมพ์หัวข้อด้านบน')));
    if (gid) pick(gid); else App.demoPreview(demo, 'B100', demoCap);
  }
  function projCard(p) {
    const steps = p.steps || {}; const G = App.genre(p.genre); const lg = p.long && p.long.on ? p.long : null;
    const lOk = lg ? Object.values(lg.steps || {}).filter((x) => x === 'ok').length : 0;
    return h('button', { class: 'proj', onclick: () => App.openProject(p._id) },
      h('span', { class: 'row', style: { gap: '6px' } }, h('span', { class: 'pill g-' + G.hue }, G.icon + ' ' + G.short), p.done ? h('span', { class: 'pill ok' }, 'Short ✓') : null, lg ? h('span', { class: 'pill ' + (lg.done ? 'ok' : 'acc') }, lg.done ? 'Long ✓' : 'Long ' + lOk + '/5') : (p.done ? h('span', { class: 'pill' }, 'ทำ Long ได้') : null)),
      h('span', { class: 't' }, p.title || p.topic || 'ไม่มีชื่อ'),
      h('span', { class: 'small muted' }, p.topic || ''),
      h('div', { class: 'prog' }, ...[1, 2, 3, 4, 5, 6].map((k) => h('i', { class: steps[k] === 'ok' ? 'ok' : steps[k] === 'recheck' ? 're' : (p.step === k ? 'cur' : '') }))),
      h('span', { class: 'small muted' }, (p.done ? 'เสร็จแล้ว · ' : 'ขั้น ' + (p.step || 2) + ' · ') + (p.ch ? p.ch.name + ' · ' : '') + App.ago(p.updatedAt || Date.now())));
  }
  // animated example on the start screen (also proves the engine works before any Claude call): the house reference clip
  App.demoRTs = {};
  App.demoPreview = async function (cv, which, cap) {
    which = which && LSE[which] ? which : 'SAMPLE'; const S = LSE[which];
    if (cap) cap.textContent = 'ตัวอย่าง: "' + (S.title || '') + '" (ภาพจริงจากเอนจิน ไม่มีเสียง)';
    App.demoWant = which;
    try {
      if (!App.demoRTs[which]) App.demoRTs[which] = LSE.buildRuntime({ cast: S.cast, scenes: S.scenes, beats: S.beats, palette: S.palette, title: S.title, captionFont: App.channel().captionFont || 'prompt', watermark: Object.assign({ text: App.channel().name }, App.channel().watermark) }, { scale: 1 });
      const rt = await App.demoRTs[which]; if (App.demoWant !== which || !cv.isConnected) return;
      for (const p of App.previews) if (p.el === cv) App.previews.delete(p);
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      App.previews.add({ el: cv, draw: (t) => { const f = rt.renderer.frame(t % rt.timeline.L); ctx.drawImage(f, 0, 0, 540, 960); } });
    } catch (e) { console.warn(e); }
  };

  // ---------- settings ----------
  App.openSettings = function () {
    const modal = App.$('#modal'); modal.hidden = false; modal.innerHTML = '';
    let selId = App.st.activeChannel; let draft = App.clone(App.st.channels[selId] || App.DEFAULT_CHANNEL()); delete draft._id;
    const close = () => { modal.hidden = true; modal.innerHTML = ''; App.render(); };
    modal.onclick = (e) => { if (e.target === modal) close(); };
    const dlg = h('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ตั้งค่าช่อง' }); modal.append(dlg);
    const draw = () => {
      dlg.innerHTML = '';
      const list = h('div', { class: 'ch-list' }, ...Object.entries(App.st.channels).map(([id, c]) => h('button', { class: id === selId ? 'on' : '', onclick: () => { selId = id; draft = App.clone(c); delete draft._id; draw(); } }, c.name, id === App.st.activeChannel ? h('span', { class: 'pill ok', style: { marginLeft: '6px' } }, 'ใช้อยู่') : null)),
        h('button', { class: 'btn sm', onclick: async () => { const id = App.uid('ch'); const c = App.DEFAULT_CHANNEL(); c.name = 'ช่องใหม่'; await App.saveChannel(id, c); selId = id; draft = App.clone(c); draw(); } }, '+ เพิ่มช่อง'));
      const f = (label, el) => h('label', { class: 'field' }, h('span', {}, label), el);
      const inp = (val, on, type) => { const e = h('input', { type: type || 'text', value: val ?? '' }); e.addEventListener('input', () => on(type === 'number' ? +e.value : e.value)); return e; };
      const sel = (val, opts, on) => { const e = h('select', {}, ...opts.map(([v, t]) => h('option', { value: v, selected: String(val) === String(v) }, t))); e.addEventListener('change', () => on(e.value)); return e; };
      const chk = (val, on, label) => { const e = h('input', { type: 'checkbox', checked: !!val }); e.addEventListener('change', () => on(e.checked)); return h('label', { class: 'row small' }, e, label); };
      const pal = h('div', { class: 'swatches' }, ...draft.palette.map((c, i) => h('button', { class: 'sw', style: { background: c }, title: c + ' (คลิกเพื่อลบ)', onclick: () => { draft.palette.splice(i, 1); draw(); } })));
      const palIn = h('textarea', { placeholder: 'วางรายการ hex เช่น #0b0a12 #ffc14a …', rows: 2 });
      const voiceSel = h('div', { class: 'col' });
      const applyHere = App.st.project ? h('input', { type: 'checkbox', id: 'applyHere' }) : null;
      dlg.append(
        h('div', { class: 'dlg-h' }, h('h2', {}, '⚙ ตั้งค่าช่อง'), h('span', { class: 'sp' }), h('button', { class: 'btn ghost', onclick: close }, 'ปิด')),
        h('div', { class: 'set-grid' },
          h('div', { class: 'col' }, h('span', { class: 'label' }, 'ช่องทั้งหมด'), list),
          h('div', { class: 'col' },
            h('div', { class: 'form2' },
              f('ชื่อช่อง', inp(draft.name, (v) => (draft.name = v))),
              f('ความยาวเริ่มต้น (วินาที)', h('div', { class: 'row' }, inp(draft.duration[0], (v) => (draft.duration[0] = v), 'number'), '–', inp(draft.duration[1], (v) => (draft.duration[1] = v), 'number'))),
              f('CTA', sel(draft.cta, [['auto', 'ให้ Claude เลือกตามเรื่อง'], ['like', 'ไลก์'], ['share', 'แชร์'], ['subscribe', 'ซับสไครบ์']], (v) => (draft.cta = v))),
              f('ขนาดตัวอักษรซับ (px ที่ 540×960)', inp(draft.captionSize, (v) => (draft.captionSize = v), 'number')),
              f('ฟอนต์ซับและชื่อเรื่อง', sel(draft.captionFont || 'prompt', [['prompt', 'Prompt หนา (อ่านง่าย แนะนำ)'], ['kanit', 'Kanit (สไตล์เกม)'], ['sarabun', 'Sarabun หนา (มีหัว อ่านง่ายมาก)']], (v) => (draft.captionFont = v))),
              f('ลายน้ำ', h('div', { class: 'col' }, chk(draft.watermark.on, (v) => (draft.watermark.on = v), 'แสดงชื่อช่องเป็นลายน้ำ'),
                h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'ความจาง'), (() => { const r = h('input', { type: 'range', min: 0.05, max: 0.6, step: 0.01, value: draft.watermark.opacity }); r.addEventListener('input', () => (draft.watermark.opacity = +r.value)); return r; })()),
                sel(draft.watermark.pos, [['top', 'ด้านบน'], ['middle', 'กลางจอ'], ['bottom', 'ด้านล่าง']], (v) => (draft.watermark.pos = v)))),
              f('ชื่อเรื่องบนจอ', chk(draft.titleOn, (v) => (draft.titleOn = v), 'แสดงชื่อเรื่องที่ 13–20% ของความสูง')),
            ),
            f('เสียงพากย์เริ่มต้น', h('div', { class: 'col' }, h('div', { class: 'row' }, inp(draft.voice.name, (v) => (draft.voice.name = v)), inp(draft.voice.id, (v) => (draft.voice.id = v))),
              h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => App.voicePicker(voiceSel, (v) => { draft.voice = Object.assign({}, draft.voice, v); draw(); }) }, 'เลือกจากรายการเสียง ElevenLabs'), sel(draft.model || 'eleven_v4', [['eleven_v4', 'eleven_v4 (แนะนำ ภาษาไทย)'], ['eleven_v3', 'eleven_v3']], (v) => (draft.model = v))), voiceSel)),
            f('ลีลาการพูดแบบ Short', (() => { const vs = (draft.voice = Object.assign({}, App.VOICE_STYLE, draft.voice));
              return h('div', { class: 'col' }, h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'แท็กอารมณ์'), inp(vs.tag, (v) => (vs.tag = v))),
                h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'เร่งความเร็ว ×'), inp(vs.tempo, (v) => (vs.tempo = v), 'number'), h('span', { class: 'small muted' }, 'ตัดช่วงเงียบเหลือ (วิ)'), inp(vs.maxgap, (v) => (vs.maxgap = v), 'number'), h('span', { class: 'small muted' }, 'ตัวอักษร/วิ'), inp(vs.cps, (v) => (vs.cps = v), 'number')),
                h('div', { class: 'small muted' }, 'ค่าแนะนำสำหรับ Short: ×1.3 (เสียง Mart), เงียบไม่เกิน 0.12 วิ, ~17 ตัวอักษร/วิ (บทจะยาวขึ้นให้พอดีเวลา)'),
                h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'คลิป Long: เร่ง ×'), inp(vs.longTempo, (v) => (vs.longTempo = v), 'number'), h('span', { class: 'small muted' }, 'เงียบไม่เกิน (วิ)'), inp(vs.longMaxgap, (v) => (vs.longMaxgap = v), 'number')),
                h('div', { class: 'small muted' }, 'Long ใช้เสียงและแท็กเดียวกับ Short แต่ช้าลงนิดและหายใจยาวขึ้น (แนะนำ ×1.25 / 0.16 วิ) ให้ฟัง 10 นาทีไม่เหนื่อย')); })()),
            f('โน้ตสไตล์ (ส่งให้ Claude ทุกขั้น)', (() => { const t = h('textarea', { rows: 3 }, draft.style || ''); t.addEventListener('input', () => (draft.style = t.value)); return t; })()),
            f('พาเลตหลักของช่อง (' + draft.palette.length + ' สี)', h('div', { class: 'col' }, pal, palIn, h('div', { class: 'row' },
              h('button', { class: 'btn sm', onclick: () => { const add = LSE.parseHexList(palIn.value); if (!add.length) return App.toast('ไม่พบรหัสสี hex', 'warn'); draft.palette = [...new Set(draft.palette.concat(add))]; draw(); } }, 'เพิ่มสีจากรายการ'),
              h('button', { class: 'btn sm', onclick: () => { const add = LSE.parseHexList(palIn.value); if (!add.length) return App.toast('ไม่พบรหัสสี hex', 'warn'); draft.palette = add; draw(); } }, 'แทนที่ทั้งหมด'),
              ...Object.entries(App.PALETTE_PRESETS).map(([n, p]) => h('button', { class: 'btn sm ghost', onclick: () => { draft.palette = p.slice(); draw(); } }, n))))),
            h('div', { class: 'form2' },
              f('สีซับ', inp(draft.captionColors.text, (v) => (draft.captionColors.text = v))), f('สีคำสำคัญ', inp(draft.captionColors.key, (v) => (draft.captionColors.key = v))),
              f('สีขอบตัวอักษร', inp(draft.captionColors.outline, (v) => (draft.captionColors.outline = v))), f('สีชื่อเรื่อง', inp(draft.captionColors.title, (v) => (draft.captionColors.title = v)))),
            f('แม่แบบคำอธิบายวิดีโอ ({title} {hashtags} {credits})', (() => { const t = h('textarea', { rows: 5 }, draft.descTemplate || ''); t.addEventListener('input', () => (draft.descTemplate = t.value)); return t; })()),
            applyHere ? h('label', { class: 'row small' }, applyHere, 'ใช้กับโปรเจกต์นี้ด้วย') : null,
            h('div', { class: 'actions' },
              h('button', { class: 'btn pri', onclick: async () => {
                try {
                  await App.saveChannel(selId, draft);
                  if (applyHere && applyHere.checked && App.st.project) { const ch = App.clone(draft); await App.saveProject({ ch, channelId: selId }); }
                  App.toast('บันทึกการตั้งค่าแล้ว'); draw();
                } catch (e) { App.toast(App.errText(e), 'err'); }
              } }, 'บันทึก'),
              h('button', { class: 'btn', disabled: selId === App.st.activeChannel, onclick: async () => { await App.saveChannel(selId, draft); await App.setActiveChannel(selId); App.toast('สลับไปใช้ช่อง ' + draft.name); draw(); } }, 'ใช้ช่องนี้'),
              h('span', { class: 'sp' }),
              h('button', { class: 'btn danger', disabled: Object.keys(App.st.channels).length < 2, onclick: (e) => confirmDel(e.target) }, 'ลบช่องนี้')))));
      function confirmDel(btn) {
        if (btn.dataset.sure) { App.db.del('channels/' + selId).then(async () => { delete App.st.channels[selId]; if (App.st.activeChannel === selId) await App.setActiveChannel(Object.keys(App.st.channels)[0]); selId = App.st.activeChannel; draft = App.clone(App.st.channels[selId]); delete draft._id; App.toast('ลบช่องแล้ว'); draw(); }); return; }
        btn.dataset.sure = '1'; btn.textContent = 'กดอีกครั้งเพื่อลบ'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.sure; btn.textContent = 'ลบช่องนี้'; } }, 3000);
      }
    };
    draw();
  };
  App.PALETTE_PRESETS = {
    'ติดบั๊ก (มืด-สด)': LSE.DEFAULT_PALETTE,
    'ทะเลทรายทอง': ['#0b0a12', '#1d1726', '#2f2440', '#4a3352', '#3b1f1a', '#5c3424', '#8a5232', '#b8773f', '#d9a35b', '#f2d38a', '#fff1c4', '#ffffff', '#183057', '#2253a3', '#3e8de0', '#8fd3ff', '#24605a', '#2f9c86', '#6fd6b0', '#7d1c2b', '#b52b35', '#e0533f', '#ff8a4c', '#ffc14a', '#ffe66b', '#545577', '#7a7fa3', '#b3b9d1'],
    'โกธิกเลือด': ['#07060b', '#120f18', '#1f1a29', '#2e2740', '#463c5c', '#6b6185', '#a39bbd', '#e7e1f2', '#2a0b12', '#4a1220', '#7d1c2b', '#b52b35', '#e0533f', '#ff8a7a', '#1a2a3a', '#2c4a63', '#4f7a99', '#9cc3d9', '#3b2a1a', '#6b4a2a', '#a8763f', '#e0b66b', '#ffe6a6', '#ffffff'],
    'ทะเลกรีก': ['#0a0c14', '#151a2a', '#22304a', '#30486b', '#3e6a96', '#5f97c2', '#9cc9e6', '#e8f4fb', '#ffffff', '#2a2433', '#4a4256', '#7a7287', '#b8b0c2', '#efe9f2', '#3b2414', '#6b4426', '#a87442', '#dcae6a', '#ffe0a0', '#1f4a3a', '#2f7a5a', '#5fbf8a', '#a8323c', '#e0603f', '#ffb44a', '#ffe66b'],
  };

  // voice list (ElevenLabs) — used by settings and step 5
  App.voicePicker = async function (box, onPick, query) {
    box.innerHTML = '';
    if (!App.caps.mcp) { box.append(h('div', { class: 'note' }, 'ElevenLabs ใช้ไม่ได้ในมุมมองนี้ — ใส่ voice id เองได้')); return; }
    const q = h('input', { type: 'text', placeholder: 'ค้นหาเสียง เช่น warm storyteller', value: query || 'storyteller' });
    const out = h('div', { class: 'col' });
    const run = async () => {
      out.innerHTML = ''; out.append(h('div', { class: 'thinking' }, h('span', { class: 'px' }), 'กำลังโหลดรายการเสียง…'));
      try {
        const r = await App.caps.mcp.callTool('ElevenLabs', 'creative_list_voices', { context: 'Pick a Thai narration voice for a myth YouTube Short channel', search: q.value || undefined, languages: ['th'] });
        const vs = (r.payload && r.payload.voices) || [];
        out.innerHTML = '';
        if (!vs.length) out.append(h('p', { class: 'muted small' }, 'ไม่พบเสียงภาษาไทยที่ตรงกับคำค้น'));
        for (const v of vs.slice(0, 12)) out.append(h('div', { class: 'row note' }, h('div', { class: 'grow col', style: { gap: '0' } }, h('b', {}, v.name), h('span', { class: 'small muted' }, (v.description || '').slice(0, 140))),
          v.preview_url ? h('a', { class: 'btn sm', href: v.preview_url, target: '_blank', rel: 'noopener' }, 'ฟังตัวอย่าง ↗') : null,
          h('button', { class: 'btn sm pri', onclick: () => onPick({ id: v.voice_id, name: v.name }) }, 'เลือก')));
      } catch (e) { out.innerHTML = ''; out.append(h('div', { class: 'err-line' }, App.errText(e))); }
    };
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    box.append(h('div', { class: 'row' }, q, h('button', { class: 'btn sm', onclick: run }, 'ค้นหา')), out); run();
  };
})();
