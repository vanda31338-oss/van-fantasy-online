// STEP 4 — script & sound plan (beat sheet table, self-checks, rough browser TTS read).
(function () {
  const App = window.App; const h = App.h; const C = App.Claude;
  const S4 = (App.Steps[4] = {});
  const HOOK = { event: 'เหตุการณ์ภาพ', direction: 'เปลี่ยนทิศ/ขนาด', question: 'คำถาม', fact: 'คำเด็ดสีเหลือง', cut: 'ตัดฉาก', enter: 'ตัวละครเข้า' };
  const MOOD = { mysterious: 'ลึกลับ', tense: 'ตึงเครียด', epic: 'หนัก-อลังการ', sad: 'เศร้า', triumphant: 'ชัยชนะ' };
  S4.HOOK = HOOK; S4.MOOD = MOOD;

  S4.generate = async function () {
    const p = App.st.project; if (S4.busy) return; S4.busy = true; S4.err = null; S4.stream = ''; App.render();
    try {
      const v = await C.beats(p.pitch, App.castCards(), App.sceneCards(), ({ text }) => { S4.stream = text; const el = App.$('#beatStream'); if (el) el.textContent = text.slice(-500); });
      const ver = await App.addVersion('beats', v, 'สร้างใหม่');
      await App.saveProject({ beats: v, cur: Object.assign({}, p.cur, { beats: ver._id }) });
      if (App.stepState(4) === 'ok') await App.markLater(4); else await App.setStep(4, 'draft');
    } catch (e) { S4.err = e; }
    S4.busy = false; if (App.st.step === 4) App.render();
  };
  App.compileBeats = function (beats, rec, cast) { // rec: a chapter's voice record (Long); default the Short's
    const p = App.st.project; rec = rec === undefined ? p.voice : rec; const v = rec && rec.status === 'ok' && rec.sentences && rec.sentences.length === beats.rows.length ? rec : null;
    let voiceInfo = null;
    if (v) { const off = 0.05; voiceInfo = { off, clock: LSE.Audio.fitClock(v.dur + off, 100, 128, beats.bpm), sentences: v.sentences.map((s) => ({ t0: s.t0 + off, t1: s.t1 + off, words: (s.words || []).map((w) => ({ text: w.text, start: w.start + off, end: w.end + off })) })) }; }
    return LSE.Timeline.compile(Object.assign({ title: p.title }, beats), voiceInfo, (cast || App.castCards()).map((c) => ({ id: c.id })));
  };
  App.issuesEl = function (issues, extra) {
    const lvl = { error: 'err', warn: 'warn', fix: 'acc', info: '' };
    const box = h('div', { class: 'issues' });
    if (!issues.length) box.append(h('div', { class: 'row' }, h('span', { class: 'pill ok' }, 'ผ่าน'), h('span', { class: 'small' }, 'ผ่านการตรวจกฎทั้งหมด')));
    for (const i of issues) box.append(h('div', { class: 'row' }, h('span', { class: 'pill ' + (lvl[i.level] || '') }, { error: 'ต้องแก้', warn: 'ควรดู', fix: 'ปรับให้แล้ว', info: 'ข้อมูล' }[i.level] || i.level), h('span', { class: 'small' }, i.msg)));
    if (extra) box.append(extra);
    return box;
  };

  S4.render = async function (main) {
    const p = App.st.project;
    main.append(App.stepHead(4, 'บทพากย์และจังหวะ', 'ตารางจังหวะทั้งคลิป: ฮุกที่ 0 วินาที ฮุกใหม่ทุก ~3 วินาที CTA หนึ่งครั้ง และประโยคสุดท้ายที่วนกลับเข้าประโยคแรก'));
    if (S4.busy) { main.append(h('div', { class: 'panel' }, App.thinking('Claude กำลังเขียนบทและวางจังหวะเพลง/เสียง (คิดลึก อาจใช้ 1–2 นาที)…', h('div', { class: 'stream', id: 'beatStream' }, (S4.stream || '').slice(-500))))); return; }
    if (S4.err) main.append(h('div', { class: 'err-line', style: { marginBottom: '12px' } }, 'เขียนบทไม่สำเร็จ: ' + App.errText(S4.err)));
    if (!p.beats) { main.append(h('div', { class: 'panel row' }, h('button', { class: 'btn pri', onclick: () => S4.generate() }, 'ให้ Claude เขียนบทและจังหวะ'))); return; }
    const b = p.beats; let tl = null, cerr = null;
    try { tl = App.compileBeats(b); } catch (e) { cerr = e; }
    const vers = await App.versions('beats'); const curV = vers.find((v) => v._id === (p.cur && p.cur.beats)) || vers[vers.length - 1];
    const prev = curV ? vers[vers.indexOf(curV) - 1] : null; const ob = prev ? prev.data : null;
    const scName = (id) => (App.st.cards[id] && App.st.cards[id].name) || id; const acName = (id) => (App.st.cards[id] && App.st.cards[id].name) || id;
    const DIR = { n: '↑', w: '←', s: '↓', e: '→' };
    const rows = b.rows.map((r, i) => {
      const o = ob && ob.rows ? ob.rows[i] : null;
      const sp = tl ? tl.span[i] : null;
      const moves = [...(r.moves || []).map((m) => `${acName(m.actor)} ${m.action || ''} ${DIR[m.dir] || ''}${m.from != null && m.to != null && m.from !== m.to ? ' ' + m.from + '→' + m.to : ''}${m.at_word ? ' @"' + m.at_word + '"' : ''}`), ...(r.props || []).map((x) => `${acName(x.prop)} (${x.motion || ''})${x.at_word ? ' @"' + x.at_word + '"' : ''}`), ...(r.cues || []).map((c) => `${c.actor ? acName(c.actor) + ' ' : ''}${c.action || c.fx || c.sfx || ''} @"${c.at_word || ''}"`), ...(r.labels || []).map((l) => `ป้าย "${l.text}"`), r.card ? `การ์ด "${r.card.text}"` : null, r.inset ? (r.inset.kind === 'newspaper' ? `หน้าข่าว "${r.inset.headline}"` : `ภาพขยาย ${acName(r.inset.prop)}`) : null].filter(Boolean).join(' · ');
      const sfxAuto = tl ? tl.sfx.filter((e) => sp && e.t >= sp.t0 && e.t < sp.t1).map((e) => e.type) : [];
      const sfxCount = {}; for (const s of sfxAuto) sfxCount[s] = (sfxCount[s] || 0) + 1;
      const hooks = [r.hook && r.hook.type, ...(r.hooks || []).map((x) => x.type)].filter(Boolean).map((t) => HOOK[t] || t).join(', ') + (r.hook && r.hook.fx ? ' · fx ' + r.hook.fx : '') + (r.transition ? ' · ทรานซิชัน ' + r.transition : '');
      return h('tr', { class: r.cta ? 'cta' : '', id: 'brow' + i },
        h('td', { class: 'mono' }, sp ? App.fmtT(sp.t0) + '–' + App.fmtT(sp.t1) : '-'),
        h('td', {}, scName(r.scene), r.camera && r.camera.zoom > 1 ? h('div', { class: 'small muted' }, 'ซูม ' + r.camera.zoom + '×') : null),
        h('td', { class: 'small', html: App.dv(moves, o ? [...(o.moves || []).map((m) => `${acName(m.actor)} ${m.action || ''} ${DIR[m.dir] || ''}${m.from != null && m.to != null && m.from !== m.to ? ' ' + m.from + '→' + m.to : ''}`), ...(o.props || []).map((x) => `${acName(x.prop)} (${x.motion || ''})`)].join(' · ') : undefined) }),
        h('td', { html: App.dv(String(r.caption || '').replace(/\|/g, ' / '), o ? String(o.caption || '').replace(/\|/g, ' / ') : undefined).replace(/\*([^*]+)\*/g, '<span class="kw">$1</span>') }),
        h('td', {}, h('span', { html: App.dv(r.voice, o ? o.voice : undefined) }), r.cta ? h('div', {}, h('span', { class: 'pill acc' }, 'CTA ' + (r.cta_word || r.cta))) : null),
        h('td', { class: 'small' }, hooks),
        h('td', { class: 'small' }, MOOD[r.music] || r.music || ''),
        h('td', { class: 'small' }, [...new Set([...(r.sfx || []), ...Object.keys(sfxCount)])].map((s) => s + (sfxCount[s] > 1 ? '×' + sfxCount[s] : '')).join(', ')));
    });
    const lens = b.rows.map((r) => [...String(r.voice || '')].length);
    main.append(
      h('div', { class: 'panel col' },
        h('div', { class: 'row' }, h('span', { class: 'pill' }, b.bpm + ' BPM'), h('span', { class: 'pill' }, (b.key || 'D') + ' ' + (b.scale || '')), tl ? h('span', { class: 'pill acc' }, 'ยาว ' + tl.L.toFixed(1) + ' วิ (' + tl.bars + ' ห้อง)') : null,
          h('span', { class: 'pill' }, b.rows.length + ' ประโยค'), h('span', { class: 'small muted' }, (p.voice && p.voice.status === 'ok') ? 'เวลาจริงจากเสียงพากย์' : 'เวลาโดยประมาณ (ยังไม่อัดเสียง)')),
        h('div', { class: 'tbl' }, h('table', { class: 'beats' }, h('thead', {}, h('tr', {}, ...['เวลา', 'ฉาก', 'อะไรขยับ (ตัวละคร + ท่า + ทิศ)', 'ซับ (≤2 บรรทัด)', 'เสียงพากย์', 'ชนิดฮุก', 'ช่วงเพลง', 'SFX'].map((t) => h('th', {}, t)))), h('tbody', {}, ...rows))),
        prev ? h('p', { class: 'small muted' }, 'ส่วนที่ไฮไลต์เปลี่ยนจาก v' + prev.n) : null),
      h('div', { class: 'panel col' }, h('h3', {}, 'ตรวจกฎอัตโนมัติ'), cerr ? h('div', { class: 'err-line' }, App.errText(cerr)) : App.issuesEl(tl.issues, tl ? h('p', { class: 'small muted' }, `ฮุกห่างสุด ${tl.maxHookGap.toFixed(1)} วินาที · CTA ${tl.cta ? Math.round(tl.cta.t / tl.L * 100) + '%' : '-'} · ทรานซิชันใหญ่ ${tl.trans.length} จุด · ความยาวบทเฉลี่ย ${Math.round(lens.reduce((a, x) => a + x, 0) / lens.length)} ตัวอักษร/ประโยค`) : null)),
      h('div', { class: 'panel' }, App.approvalBar({
        versions: vers, cur: curV && curV._id,
        onSwitch: async (ver) => { await App.saveProject({ beats: ver.data, cur: Object.assign({}, p.cur, { beats: ver._id }) }); if (App.stepState(4) === 'ok') await App.markLater(4); App.render(); },
        onApprove: async () => { await App.approveStep(4); },
        onEdit: async (note) => {
          const nv = await C.edit('beat sheet', b, note, C.BEATS_FMT, (v) => C.vBeats(v, App.castCards(), App.sceneCards()), 'default', 'CAST ids: ' + App.castCards().map((c) => c.id + '=' + c.name).join(', ') + '; SCENE ids: ' + App.sceneCards().map((s) => s.id + '=' + s.name).join(', '));
          const ver = await App.addVersion('beats', nv, note);
          await App.saveProject({ beats: nv, cur: Object.assign({}, p.cur, { beats: ver._id }) });
          if (App.stepState(4) === 'ok') await App.markLater(4); else await App.setStep(4, 'draft');
          App.render();
        },
        extra: [h('button', { class: 'btn', onclick: (e) => S4.readAloud(b, e.target) }, 'อ่านทดลอง'), h('button', { class: 'btn ghost', onclick: () => S4.generate() }, 'สร้างใหม่ทั้งหมด')],
      })));
  };

  // rough browser TTS read so the timing can be felt before spending ElevenLabs credits
  S4.readAloud = function (b, btn) {
    const ss = window.speechSynthesis;
    if (!ss || typeof SpeechSynthesisUtterance === 'undefined') { App.toast('เบราว์เซอร์นี้อ่านออกเสียงไม่ได้', 'warn'); return; }
    if (ss.speaking) { ss.cancel(); btn.textContent = 'อ่านทดลอง'; return; }
    const voices = ss.getVoices(); const th = voices.find((v) => /^th/i.test(v.lang));
    if (!th) App.toast('ไม่พบเสียงภาษาไทยในเครื่อง จะอ่านด้วยเสียงเริ่มต้น', 'warn');
    btn.textContent = 'หยุดอ่าน'; const t0 = performance.now();
    b.rows.forEach((r, i) => {
      const u = new SpeechSynthesisUtterance(r.voice); u.lang = 'th-TH'; if (th) u.voice = th; u.rate = 1.0;
      u.onstart = () => { document.querySelectorAll('table.beats tr').forEach((tr) => (tr.style.outline = '')); const tr = App.$('#brow' + i); if (tr) { tr.style.outline = '2px solid var(--accent)'; tr.scrollIntoView({ block: 'nearest' }); } };
      if (i === b.rows.length - 1) u.onend = () => { btn.textContent = 'อ่านทดลอง'; App.toast('อ่านจบใน ' + ((performance.now() - t0) / 1000).toFixed(1) + ' วินาที (เสียงจริงจะต่างไปเล็กน้อย)'); document.querySelectorAll('table.beats tr').forEach((tr) => (tr.style.outline = '')); };
      ss.speak(u);
    });
  };
})();
