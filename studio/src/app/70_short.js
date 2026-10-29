// STEP 6 — the Short: looping player, self-tests, timeline edits, delivery (MP4, title, description, credits).
(function () {
  const App = window.App; const h = App.h; const C = App.Claude;
  const S6 = (App.Steps[6] = {});

  // o (Long chapters): {beats, voice (a voice record), scope, title, cps}
  App.runtimeInput = async function (o) {
    o = o || {}; const p = App.st.project; const ch = App.projChannel();
    let voice = null; try { voice = await App.loadVoice(o.voice); } catch (e) { App.toast(App.errText(e), 'err'); }
    return { cast: App.castCards(o.scope), scenes: App.sceneCards(o.scope), beats: Object.assign({ cps: o.cps || App.voiceStyle(ch).cps }, o.beats || p.beats), palette: App.projPalette(), title: o.title || (p.pitch && p.pitch.title) || p.title, titleOn: ch.titleOn !== false,
      watermark: Object.assign({ text: ch.name }, ch.watermark || {}), captionColors: ch.captionColors, captionSize: ch.captionSize, captionFont: ch.captionFont || 'prompt', voice };
  };
  S6.build = async function (onProg) { await LSE.loadFonts(); const inp = await App.runtimeInput(); return LSE.buildRuntime(inp, { onProgress: onProg }); };

  App.creditsText = function (scope) {
    const seen = new Map();
    for (const c of App.castCards(scope)) if (c.kind === 'char' && c.type !== 'creature' && c.recipe) for (const cr of LSE.LPC.creditsFor(c.recipe)) seen.set(JSON.stringify(cr), cr);
    const lic = new Set(); const lines = [];
    for (const cr of seen.values()) { cr.l.forEach((l) => lic.add(l)); lines.push(`• ${cr.f} — ${cr.a.join(', ')} — ${cr.l.join(' / ')}${cr.u && cr.u.length ? ' — ' + cr.u.slice(0, 3).join(' ') : ''}`); }
    const head = 'ภาพตัวละครจาก Universal LPC Spritesheet Character Generator (https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) ใช้ภายใต้สัญญาอนุญาต ' + [...lic].join(', ') + ' — ดัดแปลง (ผสมชั้นภาพ เปลี่ยนสี จับพาเลต)';
    return { text: head + '\n' + lines.join('\n') + '\nเสียงพากย์: ElevenLabs · เพลงและเสียงประกอบ: สังเคราะห์ใน Legend Shorts Studio', licenses: [...lic], count: seen.size };
  };

  S6.render = async function (main) {
    const p = App.st.project;
    main.append(App.stepHead(6, 'คลิปจริง', 'คลิปแนวตั้ง 9:16 พร้อมเสียงพากย์ เพลง เสียงประกอบ ซับ และ CTA เล่นวนไม่สิ้นสุด'));
    if (!p.voice || p.voice.status !== 'ok') main.append(h('div', { class: 'note warn', style: { marginBottom: '12px' } }, 'ยังไม่มีเสียงพากย์ที่ประมวลผลแล้ว คลิปจะใช้เวลาโดยประมาณและไม่มีเสียงพูด'));
    const status = h('div', { class: 'panel' }, App.thinking('กำลังประกอบคลิป…')); main.append(status);
    let rt;
    try { rt = await S6.build((msg) => { status.querySelector('.thinking').lastChild.textContent = msg + '…'; }); }
    catch (e) { status.innerHTML = ''; status.append(h('div', { class: 'err-line' }, 'ประกอบคลิปไม่สำเร็จ: ' + App.errText(e))); return; }
    if (App.st.step !== 6) return; status.remove(); S6.rt = rt;
    const tl = rt.timeline;
    // player (integer scale of the 270x480 art)
    const cv = h('canvas', { width: rt.renderer.OW, height: rt.renderer.OH, 'aria-label': 'ตัวเล่นคลิป' });
    cv.style.width = Math.min(window.innerWidth < 700 ? 270 : 405, window.innerWidth - 60) + 'px';
    const player = new LSE.Player(cv, rt); App.player = player;
    const scrub = h('input', { type: 'range', class: 'scrub', min: 0, max: tl.L, step: 1 / 30, value: 0, 'aria-label': 'ตำแหน่งเวลา' });
    const time = h('span', { class: 'mono small' }, '0.0 / ' + tl.L.toFixed(1));
    const playBtn = h('button', { class: 'btn pri', onclick: () => { player.toggle(); playBtn.textContent = player.playing ? '❚❚ หยุด' : '▶ เล่น'; } }, '▶ เล่น');
    player.onTime = (t) => { scrub.value = t; time.textContent = t.toFixed(1) + ' / ' + tl.L.toFixed(1); };
    scrub.addEventListener('input', () => player.seek(+scrub.value));
    const mute = (key, label) => { const b = h('button', { class: 'btn sm' }, '🔊 ' + label); b.onclick = () => { const on = !player.mutes[key]; player.mute(key, on); b.textContent = (on ? '🔇 ' : '🔊 ') + label; }; return b; };
    // self-tests
    const seam = rt.renderer.seamTest(); const ctaPct = tl.cta ? tl.cta.t / tl.L * 100 : null;
    const firstHook = tl.hooks.length ? tl.hooks[0].t : null;
    const m = rt.stems.meter;
    const checks = h('div', { class: 'checks' },
      chk('รอยต่อวน (เฟรม 0 เทียบเฟรมสุดท้าย)', seam.diff + ' px', seam.diff === 0),
      chk('ฮุกแรก', firstHook != null ? firstHook.toFixed(2) + ' วิ' : '-', firstHook != null && firstHook <= 1),
      chk('ฮุกห่างสุด', tl.maxHookGap.toFixed(2) + ' วิ', tl.maxHookGap <= 3.5),
      chk('CTA', tl.cta ? ctaPct.toFixed(0) + '% · ' + ({ like: 'ไลก์', share: 'แชร์', subscribe: 'ซับสไครบ์' }[tl.cta.type] || '') : 'ไม่มี', tl.cta && ctaPct >= 50 && ctaPct <= 65),
      chk('ความยาว', tl.L.toFixed(1) + ' วิ · ' + tl.bars + ' ห้อง · ' + tl.bpm.toFixed(1) + ' BPM', tl.L >= 38 && tl.L <= 62),
      chk('เสียงประกอบ', tl.sfx.length + ' จุด บนจังหวะ', tl.sfx.length > 20),
      chk('พากย์ / เพลงที่ลดเสียง', (m.voice ?? -70).toFixed(1) + ' / ' + (m.musicDucked ?? -70).toFixed(1) + ' LUFS', !rt.stems.voice || (m.voice - m.musicDucked) >= 6),
      chk('ทรานซิชันใหญ่', tl.trans.map((x) => x.type).join(', ') || 'ไม่มี', tl.trans.length >= 2 && tl.trans.length <= 3));
    function chk(label, val, ok) { return h('div', { class: 'check' }, h('span', { class: 'small muted' }, label), h('b', {}, val), h('span', { class: 'pill ' + (ok ? 'ok' : 'warn') }, ok ? 'ผ่าน' : 'ควรดู')); }
    const vers = await App.versions('beats'); const curV = vers.find((v) => v._id === (p.cur && p.cur.beats)) || vers[vers.length - 1];
    const deliver = h('div', {});
    main.append(h('div', { class: 'studio' },
      h('div', { class: 'col' }, h('div', { class: 'screen' }, cv), h('div', { class: 'row' }, playBtn, time), scrub, h('div', { class: 'row' }, mute('voice', 'พากย์'), mute('music', 'เพลง'), mute('sfx', 'เสียงประกอบ'))),
      h('div', { class: 'col' },
        h('div', { class: 'panel col' }, h('h3', {}, 'ผลตรวจอัตโนมัติ'), checks, App.issuesEl(tl.issues)),
        h('div', { class: 'panel' }, App.approvalBar({
          versions: vers, cur: curV && curV._id, approveLabel: p.done ? '✓ จบงานแล้ว' : 'ยืนยันจบงาน', editHint: 'เช่น "ช็อตที่ 3 ให้ซูมเข้าเมดูซ่า และเปลี่ยนเพลงช่วงท้ายเป็นแบบชัยชนะ"',
          onSwitch: async (ver) => { await App.saveProject({ beats: ver.data, cur: Object.assign({}, p.cur, { beats: ver._id }) }); App.render(); },
          onApprove: async () => { const cr = App.creditsText(); await App.saveProject({ done: true, credits: cr.text }); await App.setStep(6, 'ok'); App.render(); if (!(p.long && p.long.on)) App.askLong(); else App.toast('จบงานแล้ว ดาวน์โหลดได้ด้านล่าง'); },
          onEdit: async (note) => {
            const voiceLocked = p.voice && p.voice.status === 'ok';
            const nv = await C.editTimeline(p.beats, note, tl.issues);
            if (voiceLocked) nv.rows.forEach((r, i) => { if (p.beats.rows[i]) r.voice = p.beats.rows[i].voice; });
            const ver = await App.addVersion('beats', nv, 'แก้ในคลิป: ' + note);
            await App.saveProject({ beats: nv, cur: Object.assign({}, p.cur, { beats: ver._id }), done: false });
            await App.setStep(6, 'draft'); App.render();
          },
        }), deliver)))
    );
    if (p.done) renderDelivery(deliver, rt);
    player.draw(0);
  };

  // asked once the Short is approved; "later" leaves the "ทำคลิป Long" button in the step bar and the delivery panel
  App.askLong = function () {
    const modal = App.$('#modal'); modal.hidden = false; modal.innerHTML = '';
    const close = () => { modal.hidden = true; modal.innerHTML = ''; };
    modal.onclick = (e) => { if (e.target === modal) close(); };
    modal.append(h('div', { class: 'dlg done-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Short เสร็จแล้ว' },
      h('div', { class: 'done-burst', 'aria-hidden': 'true' }, '★'), h('h2', {}, 'Short เสร็จแล้ว!'), h('p', { class: 'muted' }, 'บันทึก MP4 ชื่อคลิป คำอธิบาย และเครดิตได้ในหน้าส่งงาน'),
      h('div', { class: 'long-offer col' }, h('b', {}, 'ต่อยอดเป็นคลิปยาว 9–10 นาทีเลยไหม?'),
        h('ul', { class: 'small' }, h('li', {}, 'สไตล์ ภาพ เสียงพากย์ และคุณภาพเดียวกับ Short ใช้ตัวละครและฉากเดิมได้ทั้งหมด'), h('li', {}, 'Claude ขยายเรื่องเป็นราว 10 ตอน เล่าลึกขึ้น พร้อมฉาก/ตัวละครใหม่'), h('li', {}, 'อัดเสียงเพิ่มทีละตอน ใช้เครดิต ElevenLabs ราว 10–12 เท่าของ Short'))),
      h('div', { class: 'actions' }, h('button', { class: 'btn pri', onclick: () => { close(); App.Long.start(); } }, 'ทำ Long ต่อเลย'), h('button', { class: 'btn', onclick: close }, 'ไว้ทีหลัง'),
        h('span', { class: 'small muted' }, 'กดทำทีหลังได้ทุกเมื่อ: ปุ่ม "ทำคลิป Long" บนแถบขั้นตอน'))));
    const first = modal.querySelector('.btn.pri'); if (first) first.focus();
  };

  function renderDelivery(box, rt) {
    const p = App.st.project; const ch = App.projChannel(); const b = p.beats || {};
    const cr = App.creditsText();
    const tags = (b.hashtags || []).join(' ');
    const title = b.yt_title || (p.pitch && p.pitch.title) || p.title || '';
    const desc = (ch.descTemplate || '{title}\n\n{hashtags}\n\n{credits}').replace(/\{title\}/g, title).replace(/\{hashtags\}/g, tags).replace(/\{credits\}/g, cr.text) + (b.description ? '\n\n' + b.description : '');
    const prog = h('div', { class: 'progress', hidden: true }, h('i', {})); const progT = h('span', { class: 'small muted' });
    let ctl = null;
    const exportBtn = h('button', { class: 'btn pri', onclick: async () => {
      const sup = await LSE.exportSupport();
      if (!sup.video) { const id = await App.queueJob('render', { pid: App.st.pid, fps: 30, w: 1080, h: 1920 }, 'เรนเดอร์ MP4 ฝั่ง Claude Code (เบราว์เซอร์ headless + ffmpeg) แล้วอัปโหลด'); box.prepend(App.jobNote(App.st.jobs[id])); App.waitJob(id).then(async (j) => { const r = await fetch('/_blob/' + j.result.assetId); App.save(fileBase() + '.mp4', await r.blob()); }).catch((e) => App.toast(App.errText(e), 'err')); return; }
      exportBtn.disabled = true; prog.hidden = false; ctl = new AbortController();
      try {
        const { blob, ext } = await LSE.exportVideo(rt, (f, msg) => { prog.firstChild.style.width = Math.round(f * 100) + '%'; progT.textContent = msg + ' · ' + Math.round(f * 100) + '%'; }, ctl.signal);
        progT.textContent = 'เข้ารหัสเสร็จ ' + (blob.size / 1e6).toFixed(1) + ' MB (' + ext.toUpperCase() + ')';
        await App.save(fileBase() + '.' + ext, blob);
      } catch (e) { progT.textContent = ''; App.toast('บันทึกวิดีโอไม่สำเร็จ: ' + App.errText(e), 'err'); }
      exportBtn.disabled = false;
    } }, 'บันทึกวิดีโอ (.mp4)');
    const fileBase = () => (title || 'legend-short').replace(/[\\/:*?"<>|]+/g, '').slice(0, 60).trim() || 'legend-short';
    const ta = (v) => h('textarea', { readonly: true, rows: 6 }, v);
    const titleTa = ta(title); titleTa.rows = 2; const descTa = ta(desc); descTa.rows = 10; const crTa = ta(cr.text);
    const lg = p.long && p.long.on ? p.long : null;
    box.append(h('div', { class: 'panel long-cta row' }, h('div', { class: 'grow col', style: { gap: '2px' } }, h('b', {}, lg ? 'คลิป Long ของเรื่องนี้' : 'ต่อยอดเป็นคลิปยาว 9–10 นาที'),
      h('span', { class: 'small muted' }, lg ? (lg.done ? 'จบงานแล้ว' : 'อยู่ที่ขั้น ' + (lg.step || 1) + ' จาก 5') : 'สไตล์และคุณภาพเดียวกับ Short ใช้ตัวละครและฉากเดิม แล้ว Claude เพิ่มฉากใหม่และบทยาวขึ้น')),
      h('button', { class: 'btn pri', onclick: () => App.Long.start() }, lg ? 'ไปที่คลิป Long →' : 'ทำคลิป Long')));
    box.append(h('div', { class: 'panel col deliver' },
      h('h3', {}, 'ส่งงาน'),
      h('div', { class: 'row' }, exportBtn, h('span', { class: 'small muted' }, '1080×1920 · 30 fps · H.264 + AAC (สำรอง VP9/Opus)')), prog, progT,
      h('div', { class: 'field' }, h('span', {}, 'ชื่อคลิปบน YouTube'), titleTa, h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: (e) => App.copy(title, e.target) }, 'คัดลอกชื่อ'))),
      h('div', { class: 'field' }, h('span', {}, 'คำอธิบายพร้อมแฮชแท็ก'), descTa, h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: (e) => App.copy(desc, e.target) }, 'คัดลอกคำอธิบาย'))),
      h('div', { class: 'field' }, h('span', {}, 'เครดิตภาพ LPC (' + cr.count + ' ไฟล์) · สัญญาอนุญาต: ' + (cr.licenses.join(', ') || '-')), crTa,
        h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: (e) => App.copy(cr.text, e.target) }, 'คัดลอกเครดิต'), h('button', { class: 'btn sm', onclick: () => App.save(fileBase() + '-credits.txt', cr.text) }, 'บันทึก credits .txt'),
          h('button', { class: 'btn sm', onclick: () => S6.saveSheets(rt) }, 'บันทึกสไปรต์ชีต PNG'))),
      h('p', { class: 'small muted' }, 'CC-BY-SA และ GPL กำหนดให้ใส่เครดิตผู้สร้างทุกคน และงานดัดแปลงจากภาพต้องใช้สัญญาอนุญาตเดียวกัน ให้วางข้อความเครดิตนี้ในคำอธิบายวิดีโอเสมอ')));
  }
  S6.saveSheets = async function (rt) {
    for (const [id, c] of Object.entries(rt.cast)) {
      if (c.kind !== 'char' || !c.comp) continue;
      const anims = Object.values(c.comp.anims); const W = Math.max(...anims.map((a) => a.canvas.width)); const H = anims.reduce((s, a) => s + a.canvas.height, 0);
      const { c: cv, ctx } = LSE.canvas(W, H); let y = 0; for (const a of anims) { ctx.drawImage(a.canvas, 0, y); y += a.canvas.height; }
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      const name = (App.st.cards[id] && App.st.cards[id].name) || id;
      if (!(await App.save('sprite-' + name + '.png', blob))) break;
    }
  };
})();
