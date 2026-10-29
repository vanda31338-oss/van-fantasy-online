// Shared approval bar + STEP 2 (story pitch).
(function () {
  const App = window.App; const h = App.h; const C = App.Claude;

  // versions row + ยืนยัน / แก้ไข with an edit box; onEdit(note) returns a promise
  App.approvalBar = function (o) {
    const wrap = h('div', { class: 'col' });
    const vers = o.versions || [];
    const verRow = vers.length > 1 ? h('div', { class: 'ver' }, h('span', { class: 'small muted' }, 'เวอร์ชัน:'), ...vers.map((v) => h('button', { class: v._id === o.cur ? 'on' : '', title: (v.note ? 'แก้: ' + v.note + ' · ' : '') + new Date(v.at).toLocaleString('th-TH'), onclick: () => v._id !== o.cur && o.onSwitch && o.onSwitch(v) }, 'v' + v.n))) : null;
    const box = h('div', { class: 'edit-box', hidden: true });
    const ta = h('textarea', { placeholder: o.editHint || 'บอก Claude ว่าอยากแก้อะไร เช่น "ให้ฮุกแรงขึ้น และใช้เวอร์ชันของโอวิด"', rows: 3 });
    const status = h('div', {});
    const send = h('button', { class: 'btn pri', onclick: async () => {
      const note = ta.value.trim(); if (!note) { ta.focus(); return; }
      send.disabled = true; status.innerHTML = ''; status.append(App.thinking('Claude กำลังแก้ตามที่บอก…'));
      try { await o.onEdit(note); } catch (e) { status.innerHTML = ''; status.append(h('div', { class: 'err-line' }, 'แก้ไม่สำเร็จ: ' + App.errText(e))); send.disabled = false; }
    } }, 'ส่งให้ Claude แก้');
    box.append(ta, h('div', { class: 'row' }, send, h('button', { class: 'btn ghost', onclick: () => { box.hidden = true; } }, 'ยกเลิก')), status);
    const approve = h('button', { class: 'btn ok', disabled: o.approveDisabled, onclick: async () => { approve.disabled = true; try { await o.onApprove(); } catch (e) { App.toast(App.errText(e), 'err'); approve.disabled = false; } } }, o.approveLabel || 'ยืนยัน');
    const edit = h('button', { class: 'btn', disabled: o.editDisabled, onclick: () => { box.hidden = !box.hidden; if (!box.hidden) ta.focus(); } }, o.editLabel || 'แก้ไข');
    wrap.append(h('div', { class: 'actions' }, approve, edit, ...(o.extra || []), h('span', { class: 'sp' }), verRow), box);
    return wrap;
  };
  App.thinking = function (msg, streamEl) { return h('div', { class: 'col' }, h('div', { class: 'thinking' }, h('span', { class: 'px' }), msg), streamEl || null); };

  // ---------------- STEP 2 ----------------
  const S2 = (App.Steps[2] = {});
  S2.busy = false;
  S2.generate = async function (note) {
    const p = App.st.project; if (S2.busy) return; S2.busy = true; S2.err = null; S2.stream = '';
    App.render();
    try {
      const v = await C.pitch(p.topic, p.opts || {}, ({ text }) => { S2.stream = text; const el = App.$('#pitchStream'); if (el) el.textContent = text.slice(-600); });
      const ver = await App.addVersion('pitch', v, note || 'สร้างใหม่');
      await App.saveProject({ cur: Object.assign({}, p.cur, { pitch: ver._id }), pitch: v, title: v.title });
      if (App.stepState(2) === 'ok') await App.markLater(2); else await App.setStep(2, 'draft');
    } catch (e) { S2.err = e; }
    S2.busy = false; if (App.st.step === 2) App.render();
  };
  S2.render = async function (main) {
    const p = App.st.project;
    main.append(App.stepHead(2, 'เรื่องย่อ', 'มุมเล่าที่น่าทึ่งที่สุด จังหวะเรื่อง ฮุกเปิด-ปิดที่วนกลับ และการตรวจข้อเท็จจริง'));
    const box = h('div', { class: 'sec' }); main.append(box);
    if (S2.busy) { box.append(h('div', { class: 'panel' }, App.thinking('Claude กำลังคิดเรื่องย่อ (ใช้รุ่นที่คิดลึกที่สุด อาจใช้เวลา 30–90 วินาที)…', h('div', { class: 'stream', id: 'pitchStream' }, (S2.stream || '').slice(-600))))); return; }
    if (S2.err) box.append(h('div', { class: 'err-line' }, 'สร้างเรื่องย่อไม่สำเร็จ: ' + App.errText(S2.err)), h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: () => S2.generate() }, 'ลองอีกครั้ง')));
    if (!p.pitch) { if (!S2.err) box.append(h('div', { class: 'panel col' }, h('p', {}, 'ยังไม่มีเรื่องย่อสำหรับหัวข้อ "' + p.topic + '"'), h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: () => S2.generate() }, 'ให้ Claude เขียนเรื่องย่อ')))); return; }
    const vers = await App.versions('pitch');
    const curV = vers.find((v) => v._id === p.cur.pitch) || vers[vers.length - 1];
    const prev = curV ? vers[vers.indexOf(curV) - 1] : null; const o = prev ? prev.data : null;
    const v = p.pitch;
    const d = (k) => ({ html: App.dv(v[k], o ? o[k] : undefined) });
    box.append(
      h('div', { class: 'panel col' },
        h('div', { class: 'row' }, h('span', { class: 'label' }, 'ชื่อเรื่อง'), v.culture ? h('span', { class: 'pill acc' }, v.culture) : null, v.cta ? h('span', { class: 'pill' }, 'CTA: ' + ({ like: 'ไลก์', share: 'แชร์', subscribe: 'ซับสไครบ์' }[v.cta] || v.cta)) : null),
        h('div', Object.assign({ class: 'pitch-title' }, d('title'))),
        h('div', { class: 'col', style: { gap: '4px' } }, h('span', { class: 'label' }, 'มุมเล่า (เหตุ → ผล)'), h('p', d('angle')))),
      h('div', { class: 'pitch-grid' },
        h('div', { class: 'panel col' }, h('span', { class: 'label' }, 'คลิปจะเล่าอะไร (' + (v.beats || []).length + ' จังหวะ)'),
          h('ol', { class: 'beats-list' }, ...(v.beats || []).map((b, i) => h('li', { html: App.dv(b, o && o.beats ? o.beats[i] : undefined) }))),
          h('span', { class: 'label' }, 'ทำไมต้องดู'), h('p', d('payoff'))),
        h('div', { class: 'panel col' }, h('span', { class: 'label' }, 'ฮุกเปิด (วินาทีที่ 0)'), h('p', Object.assign({ class: 'loopline' }, d('hook'))),
          h('span', { class: 'label' }, 'ฮุกปิดที่ส่งกลับเข้าฮุกเปิด'), h('p', Object.assign({ class: 'loopline' }, d('bridge'))),
          h('span', { class: 'label' }, 'อ่านต่อกันเป็นประโยคเดียว'), h('p', { class: 'loopline', html: '<b>' + App.esc(v.bridge) + '</b> → ' + App.esc(v.hook) }),
          v.cta_reason ? h('p', { class: 'small muted' }, 'เหตุผลที่เลือก CTA นี้: ' + v.cta_reason) : null)),
      h('div', { class: 'panel col' }, h('span', { class: 'label' }, 'ตรวจข้อเท็จจริง'),
        h('div', { class: 'tbl' }, h('table', { class: 'facts' }, h('thead', {}, h('tr', {}, h('th', {}, 'ข้อความ'), h('th', {}, 'แหล่งที่มา'), h('th', {}, 'ความมั่นใจ'), h('th', {}, 'หมายเหตุ / เวอร์ชันที่ใช้'))),
          h('tbody', {}, ...(v.facts || []).map((f, i) => { const of = o && o.facts ? o.facts[i] || {} : null; return h('tr', {}, h('td', { html: App.dv(f.claim, of ? of.claim : undefined) }), h('td', { html: App.dv(f.source, of ? of.source : undefined) }), h('td', {}, h('span', { class: 'pill ' + (f.confidence === 'สูง' ? 'ok' : f.confidence === 'ต่ำ' ? 'err' : 'warn') }, f.confidence || '-')), h('td', { html: App.dv(f.note || '', of ? of.note || '' : undefined) })); }))))),
      h('div', { class: 'panel' }, prev ? h('p', { class: 'small muted' }, 'ส่วนที่ไฮไลต์คือส่วนที่เปลี่ยนจาก v' + prev.n + (curV.note ? ' ("' + curV.note + '")' : '')) : null,
        App.approvalBar({
          versions: vers, cur: curV && curV._id,
          onSwitch: async (ver) => { await App.saveProject({ cur: Object.assign({}, p.cur, { pitch: ver._id }), pitch: ver.data, title: ver.data.title }); if (App.stepState(2) === 'ok') await App.markLater(2); App.render(); },
          onApprove: async () => { await App.approveStep(2); if (!Object.keys(App.st.cards).length) App.Steps[3].generate(); },
          onEdit: async (note) => {
            const nv = await C.edit('story pitch', v, note, C.PITCH_FMT, C.vPitch, 'default');
            const ver = await App.addVersion('pitch', nv, note);
            await App.saveProject({ cur: Object.assign({}, p.cur, { pitch: ver._id }), pitch: nv, title: nv.title });
            if (App.stepState(2) === 'ok') await App.markLater(2); else await App.setStep(2, 'draft');
            App.render();
          },
          extra: [h('button', { class: 'btn ghost', onclick: () => S2.generate('สร้างใหม่ทั้งหมด') }, 'สร้างใหม่ทั้งหมด')],
        })));
  };
})();
