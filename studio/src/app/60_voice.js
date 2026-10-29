// STEP 5 — voice: one continuous ElevenLabs take (page calls the connector), processing through the Claude Code job.
(function () {
  const App = window.App; const h = App.h;
  const S5 = (App.Steps[5] = {});
  const TAG = () => App.voiceStyle(App.projChannel()).tag || '[fast-paced, energetic, excited explainer]';
  const IPA = { 'ไลก์': '/laɪk/', 'แชร์': '/ʃɛː/', 'ซับสไครบ์': '/səbˈskraɪb/' };
  App.voiceCache = App.voiceCache || {};

  const lines = () => (App.st.project.beats ? App.st.project.beats.rows.map((r) => String(r.voice || '').trim()) : []);
  // one flowing paragraph (sentences joined by spaces) so the narrator tells it as one continuous story
  S5.text = (ls, ipa) => TAG() + ' ' + ls.map((l) => { if (!ipa) return l; let s = l; for (const k in IPA) s = s.split(k).join(IPA[k]); return s; }).join(' ');
  const vcfg = () => { const p = App.st.project; const ch = App.projChannel(); return { id: (p.voiceSel && p.voiceSel.id) || ch.voice.id, name: (p.voiceSel && p.voiceSel.name) || ch.voice.name, model: ch.model || 'eleven_v4' }; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // silent beats after rows that carry a visual gag (row.pause_after seconds) -> voice job --gap k:sec
  S5.gaps = () => ((App.st.project.beats && App.st.project.beats.rows) || []).map((r, i) => (r.pause_after > 0 ? i + ':' + Math.min(2, +r.pause_after) : null)).filter(Boolean);

  async function setVoice(patch) { const p = App.st.project; await App.saveProject({ voice: Object.assign({}, p.voice || {}, patch) }); }
  async function poll(flow, sessions, onTick) {
    const mcp = App.caps.mcp; let wait = 3000;
    for (let i = 0; i < 120; i++) {
      await sleep(wait);
      let r; try { r = await mcp.callTool('ElevenLabs', 'creative_get_flow_run_status', { flow_id: flow, session_ids: sessions, context: 'Poll a Thai narration take for a myth YouTube Short' }); }
      catch (e) { if (e && e.retryable) { await sleep(3000); continue; } throw e; }
      const pl = r.payload || {}; onTick && onTick(pl);
      if (pl.all_completed || pl.has_failures) return pl;
      wait = Math.max(2000, (pl.poll_after_seconds || 3) * 1000);
    }
    throw new Error('รอผลนานเกินไป');
  }

  S5.estimate = async function (ipa, ls) {
    const v = vcfg();
    const r = await App.caps.mcp.callTool('ElevenLabs', 'creative_generate_speech', { prompt: S5.text(ls || lines(), ipa), model_id: v.model, voice_id: v.id, generations_count: 1, estimate_only: true, context: 'Price one continuous Thai narration take for a myth YouTube Short before recording' });
    return r.payload && r.payload.estimate;
  };

  // ONE continuous ElevenLabs take (generations_count 1) -> transcript -> a voice_process job for Claude Code.
  // o: {lines, gaps, tempo, maxgap, ipa, target, save(patch) (stores the take state), refresh()}; resolves with the job id
  S5.take = async function (o) {
    const v = vcfg(); const ls = o.lines; const save = o.save; const refresh = o.refresh || (() => {});
    if (!ls.length) throw new Error('ยังไม่มีบท');
    const style = { tempo: o.tempo, maxgap: o.maxgap, gaps: o.gaps || [], target: o.target || null };
    if (!App.caps.mcp) { // no connector here: the whole job goes to Claude Code
      const id = await App.queueJob('voice_full', Object.assign({ lines: ls, text: S5.text(ls, o.ipa), voice_id: v.id, model_id: v.model, tag: TAG() }, style), 'สร้างเสียงพากย์ทั้งเรื่องด้วย ElevenLabs แล้วประมวลผล');
      await save({ status: 'queued', jobId: id, lines: ls, voiceId: v.id, voiceName: v.name, model: v.model, at: Date.now() }); refresh(); return id;
    }
    await save({ status: 'generating', stage: 'สร้างเสียง', lines: ls, voiceId: v.id, voiceName: v.name, model: v.model, at: Date.now(), err: null }); refresh();
    try {
      const gen = await App.caps.mcp.callTool('ElevenLabs', 'creative_generate_speech', { prompt: S5.text(ls, o.ipa), model_id: v.model, voice_id: v.id, generations_count: 1, context: 'Record one continuous Thai narration take for a YouTube video' });
      const g = gen.payload || {};
      if (!g.flow_id || !g.session_ids) throw new Error('ElevenLabs ไม่ได้ส่งรหัสงานกลับมา');
      await save({ flow_id: g.flow_id, node_id: g.node_id, session_ids: g.session_ids, stage: 'รอเสียงเสร็จ' }); refresh();
      const st = await poll(g.flow_id, g.session_ids, () => {});
      if (st.has_failures) throw new Error('ElevenLabs สร้างเสียงไม่สำเร็จ');
      const media = (st.media || []).find((m) => m.kind === 'audio') || {}; const gen0 = (st.generations || [])[0] || {};
      const audioUrl = media.url || gen0.content_url; const genId = media.generation_id || gen0.id;
      await save({ audio_url: audioUrl, generation_id: genId, take_dur: gen0.duration_secs || media.duration_secs, stage: 'ถอดเสียงหาเวลาประโยค' }); refresh();
      // transcribe once for sentence timings
      let words = null;
      try {
        const tr = await App.caps.mcp.callTool('ElevenLabs', 'creative_transcribe_audio', { model_id: 'eleven_scribe_v1', flow_id: g.flow_id, connect_from: [g.node_id], context: 'Word timings of the narration take so captions and motion follow the real sentence onsets' });
        const t = tr.payload || {}; const ts = await poll(t.flow_id || g.flow_id, t.session_ids, () => {});
        const T = (ts.transcripts || [])[0]; if (T && Array.isArray(T.words)) words = T.words.map((w) => ({ text: w.text, start: w.start, end: w.end }));
      } catch (e) { console.warn('transcribe', e); }
      // the page cannot fetch the audio bytes (CSP), so Claude Code fetches + processes it
      const id = await App.queueJob('voice_process', Object.assign({ audio_url: audioUrl, flow_id: g.flow_id, node_id: g.node_id, session_ids: g.session_ids, generation_id: genId, lines: ls, words }, style), 'ดาวน์โหลดเสียงพากย์ ประมวลผล (EQ, คอมเพรส, −15 LUFS, จัดช่วงหยุด) แล้วอัปโหลดเป็นไฟล์ของอาร์ติแฟกต์');
      await save({ status: 'queued', jobId: id, words, stage: 'รอ Claude Code ประมวลผล' }); refresh();
      return id;
    } catch (e) { await save({ status: 'error', err: App.errText(e) }); refresh(); throw e; }
  };
  // the processed take as stored on a project / chapter
  S5.okVoice = (r) => ({ status: 'ok', assetId: r.assetId, sr: r.sr, dur: r.dur, lufs: r.lufs, sentences: r.sentences, pauses: r.pauses, report: r.report, stage: '' });

  // the Short's whole narration in one take
  S5.record = async function (opts) {
    opts = opts || {}; const p = App.st.project; const vs = App.voiceStyle(App.projChannel());
    const id = await S5.take({ lines: lines(), gaps: S5.gaps(), tempo: vs.tempo, maxgap: vs.maxgap, ipa: opts.ipa, save: (patch) => setVoice(Object.assign(patch.status === 'generating' ? { ctaRetry: !!opts.ipa || !!(p.voice && p.voice.ctaRetry) } : {}, patch)), refresh: () => S5.refresh() });
    return S5.waitJob(id);
  };
  S5.waitJob = async function (id) {
    const pid = App.st.pid; const j = await App.waitJob(id);
    if (App.st.pid !== pid) { // finished while another project is open: save into its own project
      const doc = await App.db.get('projects/' + pid); const r = j.result || {};
      if (doc) await App.db.update('projects/' + pid, { voice: Object.assign({}, doc.voice || {}, S5.okVoice(r)) });
      return;
    }
    if (App.st.project.voice && App.st.project.voice.assetId === (j.result || {}).assetId && App.st.project.voice.status === 'ok') return;
    const r = j.result || {};
    await setVoice(S5.okVoice(r));
    await App.setStep(5, App.stepState(5) === 'ok' ? 'ok' : 'draft');
    if (App.stepState(6) === 'ok') await App.markLater(5);
    App.render();
  };
  S5.refresh = () => { if (App.st.step === 5) App.render(); };

  // load the processed voice (asset JSON with PCM16) -> {pcm, sr, ...}
  App.loadVoice = async function (rec) {
    const v = rec || App.st.project.voice; if (!v || v.status !== 'ok' || !v.assetId) return null;
    if (App.voiceCache[v.assetId]) return App.voiceCache[v.assetId];
    const r = await fetch('/_blob/' + v.assetId); if (!r.ok) throw new Error('โหลดไฟล์เสียงไม่ได้ (' + r.status + ')');
    const j = await r.json(); const pcm = App.base64ToF32(j.pcm16);
    const out = { pcm, sr: j.sr, dur: j.dur, sentences: j.sentences || v.sentences, lufs: j.lufs };
    App.voiceCache[v.assetId] = out; return out;
  };

  S5.render = function (main) {
    const p = App.st.project; const v = p.voice || {}; const vc = vcfg(); const ls = lines();
    main.append(App.stepHead(5, 'เสียงพากย์', 'อัดทั้งเรื่องในครั้งเดียวด้วย ElevenLabs (หนึ่งเทค หนึ่งแท็กเปิด) แล้วใช้เวลาประโยคจริงเป็นนาฬิกาของคลิป'));
    const ver = h('div', { class: 'panel col' },
      h('div', { class: 'row' }, h('span', { class: 'label' }, 'เสียง'), h('b', {}, vc.name), h('span', { class: 'mono small muted' }, vc.id + ' · ' + vc.model),
        h('span', { class: 'sp' }), h('button', { class: 'btn sm', onclick: () => App.voicePicker(pick, async (nv) => { await App.saveProject({ voiceSel: nv }); App.toast('เลือกเสียง ' + nv.name + ' แล้ว — อัดใหม่เพื่อใช้เสียงนี้'); App.render(); }) }, 'เปลี่ยนเสียง')));
    const pick = h('div', { class: 'col' }); ver.append(pick);
    main.append(ver);
    const body = h('div', { class: 'panel col', style: { marginTop: '14px' } }); main.append(body);
    if (!App.caps.mcp) body.append(h('div', { class: 'note warn' }, 'หน้านี้เรียก ElevenLabs ไม่ได้ (ไม่มี mcp หรือยังไม่ได้อนุญาต) — กดอัดเสียงแล้วงานทั้งหมดจะไปที่ Claude Code แทน'));
    if (v.status === 'generating') body.append(App.thinking('ElevenLabs: ' + (v.stage || 'กำลังสร้าง') + '…'));
    if (v.status === 'queued') body.append(App.jobNote(App.st.jobs[v.jobId]), h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => S5.waitJob(v.jobId).catch((e) => App.toast(App.errText(e), 'err')) }, 'เฝ้ารองานนี้อีกครั้ง')));
    if (v.status === 'error') body.append(h('div', { class: 'err-line' }, 'อัดเสียงไม่สำเร็จ: ' + (v.err || '')));
    if (v.status === 'queued' && v.jobId) S5.waitJob(v.jobId).catch((e) => App.toast(App.errText(e), 'err'));
    // script preview (what will be sent)
    body.append(h('details', { class: 'more', open: v.status !== 'ok' }, h('summary', {}, 'ข้อความที่จะส่งให้ ElevenLabs (' + ls.length + ' บรรทัด)'), h('pre', { class: 'stream', style: { maxHeight: '220px' } }, S5.text(ls))));
    const confirmBox = h('div', { class: 'col' });
    const askRecord = (label, opts) => async () => {
      confirmBox.innerHTML = '';
      let est = null; if (App.caps.mcp) { confirmBox.append(App.thinking('ประเมินเครดิต…')); try { est = await S5.estimate(opts && opts.ipa); } catch (e) { /* estimate optional */ } confirmBox.innerHTML = ''; }
      confirmBox.append(h('div', { class: 'note warn col' }, h('b', {}, label + ' จะใช้เครดิต ElevenLabs' + (est ? ' ประมาณ ' + Math.round(est.credits) + ' เครดิต' : '')), h('span', { class: 'small' }, 'อัดทั้งเรื่องครั้งเดียว 1 เทค · เสียง ' + vc.name),
        h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: () => { confirmBox.innerHTML = ''; S5.record(opts).catch((e) => App.toast(App.errText(e), 'err')); } }, 'ยืนยัน ใช้เครดิต'), h('button', { class: 'btn ghost', onclick: () => (confirmBox.innerHTML = '') }, 'ยกเลิก'))));
    };
    if (v.status !== 'ok') {
      body.append(h('div', { class: 'row' }, h('button', { class: 'btn pri', disabled: ['generating', 'queued'].includes(v.status), onclick: askRecord('การอัดเสียง') }, 'อัดเสียงพากย์')), confirmBox);
      return;
    }
    // ---- recorded: transcript, timings, meter, listen ----
    const sents = v.sentences || []; const lus = sents.map((s) => s.lu).filter((x) => typeof x === 'number'); const med = lus.length ? lus.slice().sort((a, b) => a - b)[Math.floor(lus.length / 2)] : -15;
    const wave = h('canvas', { class: 'wave', width: 1100, height: 90 });
    const playBtn = h('button', { class: 'btn' }, '▶ ฟังเสียงพากย์');
    body.append(
      h('div', { class: 'row' }, h('span', { class: 'pill ok' }, 'อัดแล้ว'), h('span', { class: 'pill' }, (v.dur || 0).toFixed(1) + ' วินาที'), h('span', { class: 'pill' }, (v.lufs ?? '-') + ' LUFS'),
        h('span', { class: 'pill ' + (v.report && v.report.sentence_lu_spread <= 1.05 ? 'ok' : 'warn') }, 'ความดังแต่ละประโยคต่างกัน ' + (v.report ? v.report.sentence_lu_spread : '-') + ' LU'), h('span', { class: 'small muted' }, 'ช่วงหยุด ' + (v.pauses || []).map((x) => x.toFixed(2)).join(' / ') + ' วินาที'), h('span', { class: 'sp' }), playBtn),
      wave,
      h('div', { class: 'col', style: { gap: '4px' } }, h('span', { class: 'label' }, 'ระดับเสียงต่อประโยค (เขียว = อยู่ใน ±0.5 LU)'), h('div', { class: 'meter' }, ...sents.map((s) => h('i', { class: Math.abs((s.lu ?? med) - med) <= 0.5 ? '' : 'off', title: (s.lu ?? '') + ' LU', style: { height: Math.max(6, 70 - Math.abs((s.lu ?? -15) + 8) * 6) + 'px' } })))),
      h('div', { class: 'tbl' }, h('table', { class: 'facts' }, h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'เวลา'), h('th', {}, 'ประโยค (ถอดเสียง)'), h('th', {}, 'LU'))),
        h('tbody', {}, ...sents.map((s, i) => h('tr', {}, h('td', { class: 'mono' }, String(i + 1)), h('td', { class: 'mono' }, App.fmtT(s.t0 + 0.05) + '–' + App.fmtT(s.t1 + 0.05)), h('td', {}, s.text, s.words && s.words.length ? h('div', { class: 'small muted' }, s.words.map((w) => w.text).join(' · ')) : null), h('td', { class: 'mono' }, s.lu != null ? s.lu.toFixed(1) : '-')))))));
    App.loadVoice().then((vo) => {
      if (!vo) return; const ctx = wave.getContext('2d'); const W = wave.width, H = wave.height; ctx.clearRect(0, 0, W, H);
      const col = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#f0b443'; ctx.fillStyle = col;
      const step = Math.floor(vo.pcm.length / W); for (let x = 0; x < W; x++) { let m = 0; for (let i = x * step; i < (x + 1) * step; i += 8) m = Math.max(m, Math.abs(vo.pcm[i])); ctx.fillRect(x, H / 2 - m * H / 2, 1, Math.max(1, m * H)); }
      ctx.fillStyle = 'rgba(59,224,232,0.5)'; for (const s of sents) ctx.fillRect(s.t0 / vo.dur * W, 0, 1, H);
      let ac = null, src = null;
      playBtn.onclick = () => { if (src) { src.stop(); src = null; playBtn.textContent = '▶ ฟังเสียงพากย์'; return; } ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const b = ac.createBuffer(1, vo.pcm.length, vo.sr); b.copyToChannel(vo.pcm, 0); src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(); src.onended = () => { src = null; playBtn.textContent = '▶ ฟังเสียงพากย์'; }; playBtn.textContent = '■ หยุด'; };
    }).catch((e) => body.append(h('div', { class: 'err-line' }, App.errText(e))));
    // edit lines then re-record (asks first)
    const editArea = h('div', { class: 'edit-box', hidden: true });
    const tas = ls.map((l) => h('input', { type: 'text', value: l }));
    editArea.append(h('span', { class: 'small muted' }, 'แก้ประโยคพากย์ (หนึ่งช่องต่อหนึ่งประโยค) แล้วอัดใหม่ทั้งเรื่อง'), ...tas, h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: async () => {
      const nb = App.clone(p.beats); tas.forEach((t, i) => (nb.rows[i].voice = t.value.trim()));
      const verB = await App.addVersion('beats', nb, 'แก้บทในขั้นเสียง'); await App.saveProject({ beats: nb, cur: Object.assign({}, p.cur, { beats: verB._id }) });
      editArea.hidden = true; askRecord('การอัดใหม่')();
    } }, 'บันทึกบทและอัดใหม่')));
    body.append(App.approvalBar({
      approveLabel: 'ยืนยัน', editLabel: 'แก้ไขบทแล้วอัดใหม่',
      onApprove: async () => { await App.approveStep(5); },
      onEdit: async () => {},
      extra: [h('button', { class: 'btn ghost', disabled: !!v.ctaRetry, title: 'อัดใหม่ได้ 1 ครั้งเพื่อแก้การออกเสียงคำทับศัพท์ของ CTA', onclick: askRecord('การอัดใหม่เพื่อแก้คำ CTA', { ipa: true }) }, v.ctaRetry ? 'แก้คำ CTA แล้ว' : 'CTA ออกเสียงผิด – อัดใหม่ 1 ครั้ง')],
    }));
    // replace the generic edit box with the lines editor
    const bar = body.lastChild; const editBtn = bar.querySelector('.actions .btn:nth-child(2)'); bar.querySelector('.edit-box').remove();
    editBtn.onclick = () => { editArea.hidden = !editArea.hidden; };
    body.append(editArea, confirmBox);
  };
})();
