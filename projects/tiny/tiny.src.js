// Project "ตัวหดเหลือ 2 เซน": Ton wakes up 2 cm tall and must last 24 hours in his own room. Everything is drawn at giant
// scale (Ton = 48 px = 2 cm): the pillow is a field, a rice grain a pillow, ants are golden retrievers, the cat a monster.
// A survival-game HUD counts the hour (x/24) and Ton's HP.
(function (G) {
  const LSE = G.LSE; const MAPS = __MAPS__;
  const PAL = ['#0b0a12', '#16141f', '#231f33', '#2f2a47', '#3d3a5c', '#545577', '#7a7fa3', '#b3b9d1', '#f2efe6', '#ffffff',
    '#3b1f1a', '#5c3424', '#8a5232', '#b8773f', '#d9a35b', '#f2d38a', '#7d1c2b', '#b52b35', '#e0533f', '#ff8a4c', '#ffc14a', '#ffe66b', '#fff6c2',
    '#14261c', '#24605a', '#2f9c86', '#6fd6b0', '#2e5a23', '#3f7a2e', '#7cbf3f', '#b8e05a',
    '#0e3b5c', '#183057', '#1f6f8b', '#2253a3', '#3e8de0', '#5fc9d6', '#8fd3ff', '#5b2a86', '#9b5de5', '#c77dff', '#4ff0ff', '#ff4fa3',
    '#3a3936', '#4b4a47', '#5f5d5a', '#6e6c68', '#8c8a86', '#9a958b', '#b5b0a5', '#d8d2c4', '#e8edf7', '#9a9fb8'];
  const VOICE = [
    'ถ้าตื่นมาแล้วตัวหดเหลือสองเซน ต้องอยู่ในห้องตัวเองให้รอดยี่สิบสี่ชั่วโมง... จะรอดไหม?',
    'ต้นลืมตาบนหมอน ที่ตอนนี้กว้างเท่าครึ่งสนามฟุตบอล',
    'ชั่วโมงแรก แค่ลงจากเตียงก็เหมือนโดดตึกสิบสองชั้น',
    'แต่ตัวเล็กขนาดนี้ อากาศต้านจนตกช้า ต้นเลยรอดแบบงงๆ',
    'ชั่วโมงที่สาม หิวมาก เจอข้าวสวยเม็ดเดียว ใหญ่เท่าหมอนหนุน',
    'กำลังกินอร่อย พัดลมก็ส่ายมา ลมแรงเหมือนพายุเข้า',
    'ปลิวไปตกกลางแถวมดแดง ที่ตัวใหญ่เท่าหมาโกลเด้น',
    'มดนึกว่าเป็นเศษขนม เลยช่วยกันแบกต้นกลับรังซะงั้น',
    'ชั่วโมงที่สิบสอง ต้นดิ้นหลุดมาได้ แต่แล้ว... แมวก็ตื่น',
    'ใครเลี้ยงแมว แชร์ให้ดูหน่อย ว่าน้องจะทำแบบนี้ไหม',
    'ต้นวิ่งสุดชีวิต มุดเข้าใต้สายรองเท้าแตะ แมวตะปบพลาดไปนิดเดียว',
    'ชั่วโมงที่สิบแปด ฝนตก หลังคารั่ว น้ำหยดใหญ่เท่าลูกบอลชายหาด',
    'ห้องกลายเป็นทะเล ต้นเลยกระโดดขึ้นฝาขวด ล่องเรือกลางห้อง',
    'ชั่วโมงที่ยี่สิบสาม แม่เปิดประตูเข้ามา... พร้อมไม้กวาด',
    'ต้นโดนกวาดลงที่ตักขยะ ไปพร้อมฝุ่นทั้งห้อง',
    'ครบยี่สิบสี่ชั่วโมงพอดี ตัวกลับมาเท่าเดิม แต่อยู่ในถังขยะหน้าบ้าน',
    'แม่ยืนงง ต้นยิ้มแห้งๆ แล้วสงสัยว่า',
  ];
  const TON = { body: 'male', skin: 'amber', layers: [{ id: 'body' }, { id: 'heads_human_male' }, { id: 'hair_messy1', colors: { color_1: 'black' } }, { id: 'torso_clothes_shortsleeve', colors: { color_1: 'sky' } }, { id: 'legs_shorts', colors: { color_1: 'charcoal' } }, { id: 'feet_slippers', colors: { color_1: 'blue' } }] };
  const prop = (id, name, role, map, motion, look) => ({ id, kind: 'prop', name, role, look: look || '', motion, map: MAPS[map] });
  const ant = (id) => ({ id, kind: 'char', type: 'creature', name: 'มดแดง', role: 'มดที่แบกต้นกลับรัง', look: 'มดแดงยาว 1 ซม. ครึ่งตัวต้น', action: 'slash', facing: 'e', frames: MAPS.ant });
  const cast = [
    { id: 'c1', kind: 'char', name: 'ต้น', role: 'ตัวหดเหลือ 2 เซน ต้องรอดให้ครบ 24 ชั่วโมง', look: 'เสื้อยืดฟ้า กางเกงขาสั้นเทา รองเท้าแตะฟ้า (ต้นคนเดิมจาก 100 บาท 7 วัน)', action: 'emote', recipe: TON },
    { id: 'c2', kind: 'char', name: 'แม่', role: 'แม่ที่เข้ามากวาดห้อง', look: 'ผมบ็อบดำ เสื้อม่วง ผ้าถุง รองเท้าแตะ', action: 'emote',
      recipe: { body: 'female', skin: 'amber', layers: [{ id: 'body' }, { id: 'heads_human_female' }, { id: 'hair_bob', colors: { color_1: 'black' } }, { id: 'torso_clothes_shortsleeve', colors: { color_1: 'lavender' } }, { id: 'legs_skirt_straight', colors: { color_1: 'purple' } }, { id: 'feet_slippers', colors: { color_1: 'brown' } }] } },
    { id: 'c3', kind: 'char', type: 'creature', name: 'แมวส้ม', role: 'แมวที่เห็นต้นเป็นของเล่น', look: 'แมวส้มลายสลิด ตาเขียว หน้าใหญ่เต็มจอ', action: 'slash', facing: 'w', frames: MAPS.cat },
    ant('c4'), ant('c5'), ant('c6'),
    { id: 'c7', kind: 'char', name: 'ต้น (ขนาดเดิม)', role: 'ต้นตอนตัวกลับมาเท่าเดิมในถังขยะ', look: 'ต้นคนเดิม มีเปลือกกล้วยบนหัว', action: 'emote', recipe: Object.assign({}, TON, { overlays: [{ what: 'เปลือกกล้วยบนหัว', z: 140, dy: -3, anchorY: 0, dirs: MAPS.peel }] }) },
    prop('p1', 'ข้าวสวยเม็ดเดียว', 'มื้อแรกของต้น', 'rice', 'still', 'เม็ดข้าวยาว 7 มม. ใหญ่เท่าหมอนหนุน'),
    prop('p2', 'ฝาขวดน้ำ', 'เรือกลางห้อง', 'cap', 'still', 'ฝาขวดพลาสติกสีน้ำเงิน กว้าง 3 ซม.'),
    prop('p3', 'ไม้กวาด', 'ไม้กวาดของแม่', 'broom', 'still', 'ขนไม้กวาดสีฟาง ด้ามแดง'),
    prop('p4', 'ที่ตักขยะ', 'ที่ต้นโดนกวาดลง', 'dustpan', 'still', 'ที่ตักขยะพลาสติกสีเขียว'),
    prop('p5', 'อุ้งเท้าแมว', 'ตะปบลงมา', 'paw', 'still', 'อุ้งเท้าแมวส้ม เล็บกาง ถุงเท้าชมพู'),
    prop('p6', 'ถังขยะหน้าบ้าน', 'ที่ต้นตัวโตกลับมา', 'bin', 'still', 'ถังขยะพลาสติกเขียว ฝาเปิด'),
  ];
  // ---------- giant-scale sets ----------
  const room = { sky: { stops: [[0, '#d9a35b'], [1, '#b8773f']], bands: 3 }, lights: [{ x: 30, y: 40, radius: 380, color: '#fff6c2', dark: 0.12, glow: 30 }] };
  const floorSet = (o) => Object.assign({}, room, { far: [{ p: 'giantwall', y: 300, color: '#d8d2c4', board: 46, socket: o.socket ?? null }], mid: o.mid || [],
    ground: { y: 300, color: '#b8773f', far: '#8a5232', texture: 'none', prims: [{ p: 'giantwood', y: 300, color: '#b8773f', seams: o.seams || [40, 230] }, ...(o.prims || [])] }, near: o.near || [],
    ambient: [{ type: 'dust', count: 22, y0: 40, y1: 290, color: '#fff6c2' }, { type: 'rays', x: -40, y: 0, y1: 300, count: 3, gap: 60, slope: 0.5, alpha: 0.1 }, ...(o.ambient || [])] });
  const scenes = [
    { id: 's1', kind: 'scene', name: 'บนหมอน (ตัว 2 ซม.)', role: 'ที่ต้นตื่นมา', look: 'หมอนลายจุดกว้างเหมือนทุ่ง ผ้าห่มเป็นเนิน หัวเตียงไม้ใหญ่ แดดเช้าลอดผ้าม่าน ฝุ่นลอยในลำแสง',
      spec: { name: 'pillow', sky: { stops: [[0, '#8a5232'], [0.6, '#b8773f'], [1, '#d9a35b']], bands: 4 }, lights: [{ x: 40, y: 30, radius: 400, color: '#fff6c2', dark: 0.1, glow: 40 }],
        far: [{ p: 'rect', x: -24, y: 120, w: 318, h: 200, color: '#5c3424' }, { p: 'rect', x: -24, y: 120, w: 318, h: 6, color: '#8a5232' }, { p: 'rect', x: -24, y: 180, w: 318, h: 3, color: '#3b1f1a' }],
        mid: [{ p: 'fabric', y: 300, color: '#e8edf7', color2: '#d8d2c4', folds: [{ x: 40, w: 160, h: 34 }, { x: 230, w: 150, h: 24 }], pattern: '#8fd3ff', seam: 336 }],
        ground: { y: 300, color: '#e8edf7', far: '#d8d2c4', texture: 'none' },
        near: [{ p: 'fabric', y: 430, color: '#9b5de5', color2: '#5b2a86', folds: [{ x: 60, w: 200, h: 40 }, { x: 250, w: 140, h: 30 }] }],
        ambient: [{ type: 'dust', count: 26, y0: 20, y1: 290, color: '#fff6c2' }, { type: 'rays', x: -30, y: 0, y1: 320, count: 4, gap: 50, slope: 0.45, alpha: 0.14 }] } },
    { id: 's2', kind: 'scene', name: 'ขอบเตียง', role: 'หน้าผาสูง 45 ซม. = ตึก 12 ชั้นสำหรับต้น', look: 'ขอบที่นอนผ้าปูพับ ด้านข้างบุนวม ข้างล่างลึกมืด พื้นไม้ไกลลิบ รองเท้าแตะจิ๋วไกลๆ',
      spec: Object.assign({ name: 'bededge' }, room, { far: [{ p: 'giantwall', y: 440, color: '#d8d2c4', board: 20 }],
        mid: [], ground: { y: 300, color: '#e8edf7', texture: 'none', prims: [{ p: 'bededge', x: 160, y: 300, color: '#e8edf7', side: '#9a9fb8' }] }, ambient: [{ type: 'dust', count: 20, y0: 40, y1: 460, color: '#fff6c2' }] }) },
    { id: 's3', kind: 'scene', name: 'พื้นห้อง (มุมมองตัว 2 ซม.)', role: 'พื้นไม้กว้างเหมือนลานจอดรถ', look: 'แผ่นไม้ยักษ์มีร่องใหญ่ ผนังปูนเป็นหลุม บัวพื้นสูงเท่าตึก ปลั๊กไฟยักษ์ สายไฟเหมือนท่อ เศษขนม ก้อนฝุ่น ฐานพัดลมตั้งอยู่ไกลๆ',
      spec: Object.assign({ name: 'floor' }, floorSet({ socket: 160, mid: [{ p: 'fanbase', x: 250, y: 300, r: 140 }], prims: [{ p: 'cord', pts: [[-30, 304], [60, 300], [140, 310], [200, 302]], t: 12 }, { p: 'crumbs', x0: 10, x1: 200, y: 316, n: 8 }, { p: 'dustbunny', x: 40, y: 322, s: 1 }],
        near: [{ p: 'dustbunny', x: 230, y: 420, s: 2 }, { p: 'crumbs', x0: 0, x1: 270, y: 380, n: 6, h: 60 }], ambient: [{ type: 'windstreak', y0: 80, y1: 300, count: 22, dir: -1, period: 0.6, rows: [5] }] })) },
    { id: 's4', kind: 'scene', name: 'ข้างรองเท้าแตะ', role: 'ที่หลบแมว', look: 'รองเท้าแตะยักษ์สีน้ำเงิน พื้นยางหนาเท่าตัวต้น สายรองเท้าโค้งเหมือนสะพาน ผนังและบัวพื้นข้างหลัง',
      spec: Object.assign({ name: 'slipper' }, floorSet({ seams: [120], prims: [{ p: 'slipper', x: -20, y: 306, w: 210, color: '#2253a3', arch: 30, archw: 110, archh: 80 }], near: [{ p: 'crumbs', x0: 0, x1: 270, y: 390, n: 5, h: 40 }] })) },
    { id: 's5', kind: 'scene', name: 'ห้องน้ำท่วม', role: 'หลังคารั่ว พื้นห้องเป็นทะเล', look: 'หยดน้ำใหญ่เท่าลูกบอลตกลงมาแตกกระจาย น้ำท่วมพื้นไม้ แสงหม่นฝนตก',
      spec: Object.assign({ name: 'flood' }, floorSet({ seams: [60, 220] }), { sky: { stops: [[0, '#3d3a5c'], [1, '#545577']], bands: 3 }, lights: [{ x: 135, y: 0, radius: 300, color: '#8fd3ff', dark: 0.3 }],
        ambient: [{ type: 'bigdrops', x0: 10, x1: 260, y0: -20, ground: 300, count: 6, s: 6, period: 1.6 }, { type: 'flood', y: 296, h: 184, alpha: 0.6, color: '#1f6f8b', period: 2 }, { type: 'rain', count: 30, color: '#8fd3ff' }] }) },
    { id: 's6', kind: 'scene', name: 'ไม้กวาดมาแล้ว', role: 'แม่กวาดห้อง', look: 'แสงจากประตูที่เปิด ขนไม้กวาดยักษ์กวาดมา ที่ตักขยะสีเขียวรออยู่ ฝุ่นฟุ้ง',
      spec: Object.assign({ name: 'broom' }, floorSet({ seams: [90], prims: [{ p: 'dustbunny', x: 120, y: 316, s: 1.5 }, { p: 'crumbs', x0: 60, x1: 240, y: 314, n: 10 }] }), { lights: [{ x: 270, y: 120, radius: 360, color: '#fff6c2', dark: 0.25, glow: 40 }] }) },
  ];
  // the last shot is back at normal scale: the soi in front of the house from "100 บาท 7 วัน" (shared set)
  const SOI = { name: 'soi', sky: { stops: [[0, '#183057'], [0.6, '#5b2a86'], [1, '#e0533f']], bands: 5 }, lights: [{ x: 40, y: 236, radius: 86, color: '#f2d38a', dark: 0.5 }, { x: 134, y: 186, radius: 84, color: '#fff6c2', dark: 0.5 }],
    far: [{ p: 'skyline', y: 200, h: 90, color: '#231f33', litp: 0.22 }],
    ground: { y: 274, color: '#5f5d5a', far: '#3d3a5c', texture: 'stone', prims: [{ p: 'shophouse', x: -6, y: 274, units: 2, uw: 46, gf: 60, fh: 40, floors: 3, color: '#d8d2c4', shops: ['grocery', 'open'], signs: [{ unit: 0, text: 'ร้านชำ', bg: '#2253a3', color: '#ffe66b', size: 9 }, { unit: 1, text: 'ข้าวแกง', bg: '#b52b35', color: '#fff6c2', size: 9 }] }, { p: 'streetlamp', x: 112, y: 274, h: 96 }, { p: 'cat', x: 210, y: 274 }, { p: 'moto', x: 236, y: 274, color: '#b52b35' }] },
    ambient: [{ type: 'flies', x: 160, y: 236, count: 6 }, { type: 'dust', count: 10, y0: 160, y1: 270 }, { type: 'stars', count: 18, y1: 90 }, { type: 'motopass', y: 270, period: 11, dur: 2.4, dir: -1, color: '#2253a3', shirt: '#ffc14a' }] };
  scenes.push({ id: 's7', kind: 'scene', name: 'หน้าบ้าน ถังขยะ', role: 'ตัวกลับมาเท่าเดิม', look: 'ซอยหน้าบ้านตอนเย็น ร้านชำ เสาไฟ แมวบนกำแพง ถังขยะเขียว', spec: SOI });

  // ---------- shot helpers ----------
  const mv = (actor, x, o) => Object.assign({ actor, action: 'idle', dir: 's', from: x, to: x }, o || {});
  const hp = (money, at_word, extra) => Object.assign({ money, at_word }, extra || {});
  const beats = {
    title: 'ตัวหดเหลือ 2 เซน', loopCut: true, bpm: 116, key: 'F', scale: 'mixolydian', hud: { days: 24, unit: '', label: 'ชั่วโมงที่', icon: 'heart', suffix: '' },
    yt_title: 'ถ้าตื่นมาตัวหดเหลือ 2 เซน ต้องรอดในห้องตัวเอง 24 ชั่วโมง #shorts', hashtags: ['#ตัวหด', '#จำลองสถานการณ์', '#เอาชีวิตรอด', '#แมว', '#shorts'],
    description: 'ถ้าตัวหดเหลือ 2 เซน ห้องนอนตัวเองจะกลายเป็นด่านเอาชีวิตรอด (เรื่องสมมติ) — ข้อเท็จจริง: สัตว์ตัวเล็กตกจากที่สูงแล้วรอดเพราะแรงต้านอากาศ (J.B.S. Haldane, On Being the Right Size)',
    rows: [
      { scene: 's1', grade: 'warm', camera: { zoom: 2, focus: 150, punch_word: 'สองเซน' }, moves: [mv('c1', 150, { y: -8 })], cues: [{ at_word: 'ตัวหด', fx: 'zoom', sfx: 'boing', vel: 0.7 }, { at_word: 'จะรอดไหม', actor: 'c1', action: 'emote' }],
        hud: hp(100, null, { day: 1 }), caption: 'ตื่นมา*ตัวหดเหลือ 2 เซน*|ต้องรอดให้ครบ *24 ชม.*', voice: VOICE[0], hook: { type: 'question', fx: 'shake' }, music: 'mysterious', bed: 'fan', bedVel: 0.15 },
      { scene: 's1', grade: 'warm', camera: { zoom: 1, focus: 135 }, moves: [mv('c1', 150, { y: -8, dir: 'e' })], cues: [{ at_word: 'ลืมตา', actor: 'c1', action: 'emote' }, { at_word: 'ครึ่งสนาม', fx: 'zoom' }],
        labels: [{ actor: 'c1', text: 'ต้น (2 ซม.)', at_word: 'ต้น' }], caption: 'หมอนกว้างเท่า|*ครึ่งสนามฟุตบอล*', voice: VOICE[1], hook: { type: 'direction' }, music: 'mysterious', bed: 'fan', bedVel: 0.15 },
      { scene: 's2', grade: 'warm', camera: { zoom: 2, focus: 'c1', punch_word: 'สิบสองชั้น' }, moves: [mv('c1', 140, { to: 190, y: 0, y_to: 180, action: 'fly', dir: 'e', flap: false, at_word: 'โดด', until: 0.98 })],
        cues: [{ at_word: 'ลงจากเตียง', actor: 'c1', action: 'emote' }, { at_word: 'โดด', actor: 'c1', action: 'hurt', hold: true, sfx: 'whoosh', vel: 0.8, bam: 'อ๊ากก!' }], hud: hp(100, 'ชั่วโมงแรก', { day: 1 }),
        caption: 'ลงจากเตียง = โดด|*ตึก 12 ชั้น*', voice: VOICE[2], hook: { type: 'event', fx: 'shake' }, music: 'tense' },
      { scene: 's3', grade: 'warm', camera: { zoom: 2, focus: 'c1', punch_word: 'รอด' }, moves: [mv('c1', 120, { y: -260, y_to: 0, action: 'fly', flap: false, until: 0.55 })],
        cues: [{ at: 0, actor: 'c1', action: 'hurt', still: true }, { at_word: 'รอดแบบงงๆ', actor: 'c1', dizzy: 1.3, sfx: 'boing', vel: 0.8, bam: 'ตุ้บ!' }], hud: hp(95, 'รอด'),
        card: { text: 'ตัวเล็ก = ตกช้า', at_word: 'อากาศต้าน' }, caption: '*อากาศต้าน*จนตกช้า|เลย*รอดแบบงงๆ*', voice: VOICE[3], pause_after: 0.5, hook: { type: 'fact' }, music: 'mysterious' },
      { scene: 's3', grade: 'warm', camera: { zoom: 2, focus: 140 }, moves: [mv('c1', 110, { to: 150, action: 'walk', dir: 'e', until: 0.5 })], props: [{ prop: 'p1', x: 172, y: 0, motion: 'still', at_word: 'ข้าวสวย', sfx: 'ting' }],
        cues: [{ at_word: 'หิวมาก', actor: 'c1', action: 'hurt' }, { at_word: 'หมอนหนุน', actor: 'c1', action: 'thrust', repeat: true, sfx: 'munch', vel: 0.7 }], hud: hp(95, 'ชั่วโมงที่สาม', { day: 3 }),
        caption: 'ข้าวเม็ดเดียว|ใหญ่เท่า*หมอนหนุน*', voice: VOICE[4], hook: { type: 'event' }, music: 'triumphant', bed: 'fan', bedVel: 0.15 },
      { scene: 's3', grade: 'warm', camera: { zoom: 1, focus: 135, punch_word: 'พายุ' }, moves: [mv('c1', 150, { to: -30, y: 0, y_to: -90, action: 'fly', flap: false, dir: 'w', at_word: 'ลมแรง' })], props: [{ prop: 'p1', x: 172, y: 0, motion: 'still' }],
        cues: [{ at_word: 'กินอร่อย', actor: 'c1', action: 'thrust', sfx: 'munch', vel: 0.6 }, { at_word: 'ส่ายมา', sfx: 'wind', vel: 0.8 }, { at_word: 'ลมแรง', actor: 'c1', action: 'hurt', hold: true, spin: 1, fx: 'shake', sfx: 'whoosh', vel: 1, loud: true }], hud: hp(80, 'พายุ'),
        caption: 'พัดลมส่ายมา|ลมแรงเหมือน*พายุ*', voice: VOICE[5], hook: { type: 'event', fx: 'shake' }, music: 'tense', bed: 'wind', bedVel: 0.35 },
      { scene: 's3', grade: 'warm', camera: { zoom: 2, focus: 130, punch_word: 'โกลเด้น' }, moves: [mv('c1', 200, { to: 130, y: -120, y_to: 0, action: 'fly', flap: false, until: 0.3 }), mv('c4', 30, { to: 80, action: 'walk', dir: 'e' }), mv('c5', 210, { to: 175, action: 'walk', dir: 'w' }), mv('c6', 250, { to: 230, action: 'walk', dir: 'w' })],
        cues: [{ at: 0, actor: 'c1', action: 'hurt', still: true }, { at_word: 'มดแดง', fx: 'zoom', sfx: 'hit', vel: 0.6 }], labels: [{ actor: 'c4', text: 'มดแดง 1 ซม.', at_word: 'มดแดง' }], hud: hp(75, 'ปลิวไปตก'),
        caption: 'ตกกลาง*แถวมดแดง*|ตัวเท่า*หมาโกลเด้น*', voice: VOICE[6], hook: { type: 'enter' }, music: 'tense' },
      { scene: 's3', grade: 'warm', camera: { zoom: 2, focus: 150 }, moves: [mv('c1', 120, { to: 250, y: -14, action: 'fly', flap: false, dir: 'e', at_word: 'แบก' }), mv('c4', 104, { to: 234, action: 'slash', dir: 'e', at_word: 'แบก' }), mv('c5', 140, { to: 270, action: 'slash', dir: 'e', at_word: 'แบก' })],
        cues: [{ at: 0, actor: 'c1', action: 'hurt', still: true }, { at_word: 'เศษขนม', actor: 'c4', action: 'slash' }, { at_word: 'ซะงั้น', fx: 'zoom', sfx: 'boing', vel: 0.7 }], hud: hp(70, 'แบก'),
        caption: 'มดนึกว่า*เศษขนม*|เลย*แบกกลับรัง*', voice: VOICE[7], pause_after: 0.6, hook: { type: 'event' }, music: 'triumphant' },
      { scene: 's4', grade: 'cold', transition: 'glitchwipe', camera: { zoom: 1, focus: 150, punch_word: 'แมว' }, moves: [mv('c1', 230, { to: 200, action: 'run', dir: 'w', until: 0.4 }), mv('c3', 196, { y: 6, dir: 'w', at_word: 'แมวก็ตื่น' })],
        cues: [{ at_word: 'ดิ้นหลุด', actor: 'c1', action: 'jump' }, { at_word: 'แต่แล้ว', fx: 'dark' }, { at_word: 'แมวก็ตื่น', fx: 'shake', sfx: 'meow', vel: 1, loud: true, bam: 'เมี๊ยว!' }], hud: hp(70, 'ชั่วโมงที่สิบสอง', { day: 12 }),
        caption: 'หนีมดได้ แต่แล้ว...|*แมวก็ตื่น*', voice: VOICE[8], hook: { type: 'event', fx: 'dark' }, music: 'tense' },
      { scene: 's4', grade: 'cold', camera: { zoom: 1, focus: 150 }, moves: [mv('c1', 120, { dir: 'e' }), mv('c3', 196, { y: 6, dir: 'w' })], cues: [{ at_word: 'แชร์', actor: 'c1', action: 'emote' }],
        caption: 'ใครเลี้ยงแมว|*แชร์*ให้ดูหน่อย', voice: VOICE[9], cta: 'share', cta_word: 'แชร์', hook: { type: 'direction' }, music: 'mysterious' },
      { scene: 's4', grade: 'cold', camera: { zoom: 1, focus: 135, punch_word: 'ตะปบ' }, moves: [mv('c1', 160, { to: 86, action: 'run', dir: 'w', until: 0.45 }), mv('c3', 196, { y: 6, dir: 'w' })], props: [{ prop: 'p5', x: 120, y: -40, motion: 'still', at_word: 'ตะปบ', sfx: 'slap', vel: 1 }],
        cues: [{ at_word: 'มุดเข้าใต้', actor: 'c1', action: 'sit' }, { at_word: 'ตะปบ', actor: 'c3', action: 'slash', fx: 'shake', bam: 'ฟึ่บ!', loud: true }, { at_word: 'นิดเดียว', actor: 'c1', action: 'hurt', sfx: 'heart', vel: 0.7 }], hud: hp(45, 'ตะปบ'),
        caption: 'มุดใต้*สายรองเท้าแตะ*|แมว*ตะปบ*พลาดนิดเดียว', voice: VOICE[10], pause_after: 0.6, hook: { type: 'event', fx: 'shake' }, music: 'epic' },
      { scene: 's5', grade: 'cold', transition: 'waterripple', camera: { zoom: 2, focus: 'c1' }, moves: [mv('c1', 140, { dir: 's' })], cues: [{ at_word: 'ฝนตก', sfx: 'thunder', vel: 0.6, fx: 'flash' }, { at_word: 'ลูกบอลชายหาด', actor: 'c1', action: 'hurt', sfx: 'splash', vel: 0.9 }],
        hud: hp(40, 'ชั่วโมงที่สิบแปด', { day: 18 }), caption: 'หลังคารั่ว น้ำหยด|เท่า*ลูกบอลชายหาด*', voice: VOICE[11], hook: { type: 'event' }, music: 'sad', bed: 'rain', bedVel: 0.3 },
      { scene: 's5', grade: 'cold', camera: { zoom: 2, focus: 'c1' }, moves: [mv('c1', 90, { to: 190, y: -22, dir: 'e', action: 'idle', at_word: 'ล่องเรือ' })], props: [{ prop: 'p2', x: 90, y: -12, motion: 'float', at_word: 'ฝาขวด', sfx: 'pop' }],
        cues: [{ at_word: 'กระโดดขึ้น', actor: 'c1', action: 'jump', sfx: 'splash', vel: 0.6 }, { at_word: 'ล่องเรือ', actor: 'c1', action: 'emote' }], hud: hp(35, 'ทะเล'),
        caption: 'ห้องเป็นทะเล|ล่องเรือ*ฝาขวด*', voice: VOICE[12], hook: { type: 'direction' }, music: 'triumphant', bed: 'rain', bedVel: 0.25 },
      { scene: 's6', grade: 'warm', camera: { zoom: 1, focus: 135, punch_word: 'ไม้กวาด' }, moves: [mv('c1', 120, { dir: 'e' })], props: [{ prop: 'p3', x: 340, y: 0, motion: 'still', at_word: 'ไม้กวาด', sfx: 'swish' }],
        cues: [{ at_word: 'เปิดประตู', sfx: 'creak', vel: 0.7, fx: 'light' }, { at_word: 'ไม้กวาด', actor: 'c1', action: 'hurt', fx: 'shake' }], hud: hp(35, 'ชั่วโมงที่ยี่สิบสาม', { day: 23 }),
        caption: 'แม่เปิดประตูมา|พร้อม*ไม้กวาด*', voice: VOICE[13], hook: { type: 'enter', fx: 'light' }, music: 'tense' },
      { scene: 's6', grade: 'warm', camera: { zoom: 1, focus: 135 }, moves: [mv('c1', 120, { to: -40, y: 0, y_to: -60, action: 'fly', flap: false, dir: 'w', at_word: 'กวาด' }), mv('p3', 290, { to: 60, at_word: 'กวาด' })], props: [{ prop: 'p4', x: 20, y: 8, motion: 'still' }],
        cues: [{ at_word: 'กวาด', actor: 'c1', action: 'hurt', hold: true, spin: 1, sfx: 'swish', vel: 1, loud: true, bam: 'ฟ้าว!' }, { at_word: 'ฝุ่น', sfx: 'sand', vel: 0.6 }], hud: hp(15, 'ตักขยะ'),
        caption: 'โดนกวาดลง*ที่ตักขยะ*|พร้อมฝุ่นทั้งห้อง', voice: VOICE[14], pause_after: 0.5, hook: { type: 'event', fx: 'shake' }, music: 'epic' },
      { scene: 's7', grade: 'warm', transition: 'pixeldissolve', camera: { zoom: 2, focus: 130, punch_word: 'ถังขยะ' }, moves: [mv('c7', 150, { y: -10, dir: 's' }), mv('c2', 92, { dir: 'e' })], props: [{ prop: 'p6', x: 150, y: 1, motion: 'still' }],
        cues: [{ at_word: 'ตัวกลับมา', actor: 'c7', action: 'emote', sfx: 'boing', vel: 0.8, fx: 'flash' }, { at_word: 'ถังขยะ', fx: 'zoom', sfx: 'stamp', vel: 0.7 }], hud: hp(15, 'ครบยี่สิบสี่', { day: 24 }),
        caption: 'ครบ 24 ชม. ตัวเท่าเดิม|แต่อยู่*ในถังขยะ*', voice: VOICE[15], hook: { type: 'cut' }, music: 'triumphant', bed: 'traffic', bedVel: 0.3 },
      { scene: 's7', grade: 'warm', camera: { zoom: 2, focus: 125 }, moves: [mv('c7', 150, { y: -10, dir: 'w' }), mv('c2', 92, { dir: 'e' })], props: [{ prop: 'p6', x: 150, y: 1, motion: 'still' }],
        cues: [{ at_word: 'แม่ยืนงง', actor: 'c2', action: 'emote' }, { at_word: 'ยิ้มแห้ง', actor: 'c7', action: 'emote' }], hud: hp(15, null, { off: true }),
        caption: 'แม่ยืนงง|ต้นยิ้มแห้งๆ...', voice: VOICE[16], hook: { type: 'event' }, music: 'mysterious', bed: 'traffic', bedVel: 0.3 },
    ],
  };
  LSE.TINY = {
    title: 'ตัวหดเหลือ 2 เซน', palette: PAL,
    topic: 'ถ้าตื่นมาแล้วตัวหดเหลือ 2 เซน ต้องอยู่ในห้องตัวเองให้รอดครบ 24 ชั่วโมง จะรอดไหม (ขำๆ กวนๆ แบบเกมเอาชีวิตรอด)',
    castMeta: { proportions: [{ name: 'ต้น (LPC)', height_px: 48, why: '2 ซม. — 1 px ≈ 0.4 มม.' }, { name: 'ข้าวเม็ดเดียว', height_px: 18, why: 'ยาว 7 มม. ≈ หมอนหนุน 60 ซม. ของคนปกติ' }, { name: 'มดแดง', height_px: 22, why: 'ยาว 1 ซม. ครึ่งตัวต้น ≈ หมาโกลเด้น' }, { name: 'หน้าแมว', height_px: 200, why: 'หน้าแมวกว้าง ~8 ซม. = 4 เท่าตัวต้น' }, { name: 'หยดน้ำ', height_px: 14, why: '5 มม. ≈ ลูกบอลชายหาด 40 ซม.' }], palette: PAL },
    pitch: {
      title: 'ตัวหดเหลือ 2 เซน', angle: 'ห้องนอนธรรมดากลายเป็นด่านเกมเอาชีวิตรอด 24 ชั่วโมง ทุกของในห้องเทียบขนาดจริง (ข้าว 7 มม. มด 1 ซม. หยดน้ำ 5 มม. เตียง 45 ซม.) แล้วจบแบบหักมุมในถังขยะ',
      beats: ['ฮุก: ตัวหด 2 เซน รอดในห้องตัวเอง 24 ชม.', 'ตื่นบนหมอนกว้างเท่าครึ่งสนาม', 'ลงจากเตียง = โดดตึก 12 ชั้น แต่รอดเพราะตกช้า', 'ข้าวเม็ดเดียวเท่าหมอน → พัดลมพัดปลิว', 'มดแดงแบกกลับรัง', 'แมวตื่น ตะปบ หลบใต้รองเท้าแตะ', 'ฝนรั่ว ห้องเป็นทะเล ล่องฝาขวด', 'แม่กวาดลงที่ตักขยะ', 'ครบ 24 ชม. ตัวโตในถังขยะ วนกลับ'],
      payoff: 'สนุกกับการเทียบขนาดจริงของของในห้อง และได้ข้อเท็จจริงว่าทำไมสัตว์ตัวเล็กตกจากที่สูงแล้วรอด',
      hook: VOICE[0], bridge: VOICE[16], loop_read: VOICE[16] + ' ' + VOICE[0],
      facts: [
        { claim: 'สัตว์ตัวเล็กตกจากที่สูงแล้วรอดได้ เพราะแรงต้านอากาศเทียบกับน้ำหนักมาก ความเร็วปลายทางต่ำ', source: 'J.B.S. Haldane, "On Being the Right Size" (1926)', confidence: 'สูง', note: 'หนูตกบ่อลึกยังเดินต่อได้' },
        { claim: 'เตียงสูง ~45 ซม. สำหรับคนสูง 2 ซม. เทียบได้กับตึกราว 12 ชั้นของคนสูง 170 ซม.', source: 'คำนวณสัดส่วน 85 เท่า', confidence: 'สูง', note: '' },
        { claim: 'ข้าวสวยหนึ่งเม็ดยาวราว 6-7 มม. มดแดงยาวราว 1 ซม. หยดน้ำฝนราว 2-5 มม.', source: 'ขนาดทั่วไป', confidence: 'กลาง', note: 'ตัวเลขโดยประมาณ' },
        { claim: 'การตัวหดเป็นเรื่องแต่ง', source: 'เรื่องแต่งเพื่อความบันเทิง', confidence: 'สูง', note: '' }],
      culture: 'thai', cta: 'share', cta_reason: 'คนเลี้ยงแมวเยอะ และเรื่องแมวไล่ของเล่นเป็นมุกที่อยากส่งต่อ',
    },
    cast, scenes, beats,
  };
})(typeof window !== 'undefined' ? window : globalThis);
