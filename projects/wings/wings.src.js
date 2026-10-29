// Project "ทั้งเมืองมีปีก": Ton, a delivery rider waiting at a mall plaza, sees a six-winged angel tear the sky open and give
// everyone wings. The city falls into chaos (mid-air crashes, wings caught in power lines, an abandoned car on fire) and Ton
// has to fly a box of chicken rice to floor 30 anyway. Every person is an LPC character; every pair of wings has its own colour.
(function (G) {
  const LSE = G.LSE; const MAPS = __MAPS__;
  // wing colours: Ton's gold stands out, everyone else gets a different hue
  const WING = { ton: '#ffc14a', n1: '#ff4fa3', n2: '#4ff0ff', n3: '#9b5de5', n4: '#7cbf3f', n5: '#ff8a4c', n6: '#3e8de0', n7: '#e8edf7' };
  const hex = (v) => '#' + v.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const ramp = (h) => { const T = rgb(h); const d = T.map((v) => v * 0.22), l = T.map((v) => v + (255 - v) * 0.6);
    return [hex(d.map((v) => v / 2)), hex(d), hex(d.map((v, k) => v + (T[k] - v) * 0.5)), h, hex(T.map((v, k) => v + (l[k] - v) * 0.5)), hex(l)]; };
  const PAL = ['#0b0a12', '#16141f', '#231f33', '#2f2a47', '#3d3a5c', '#545577', '#7a7fa3', '#b3b9d1', '#f2efe6', '#ffffff',
    '#3b1f1a', '#5c3424', '#8a5232', '#b8773f', '#d9a35b', '#f2d38a', '#7d1c2b', '#b52b35', '#e0533f', '#ff8a4c', '#ffc14a', '#ffe66b', '#fff6c2',
    '#14261c', '#24605a', '#2f9c86', '#6fd6b0', '#2e5a23', '#3f7a2e', '#7cbf3f',
    '#0e3b5c', '#183057', '#1f6f8b', '#2253a3', '#3e8de0', '#5fc9d6', '#8fd3ff', '#5b2a86', '#9b5de5', '#c77dff', '#4ff0ff', '#ff4fa3',
    '#3a3936', '#4b4a47', '#5f5d5a', '#6e6c68', '#8c8a86', '#9a958b', '#b5b0a5', '#d8d2c4', '#e8edf7',
    ...[...new Set(Object.values(WING))].flatMap(ramp)];
  const VOICE = [
    'ถ้าจู่ๆ ทุกคนมีปีกบินได้ แต่แอปยังเด้งออเดอร์ให้ไปส่ง... จะรอดไหม?',
    'ต้น ไรเดอร์ชุดเขียว รอออเดอร์อยู่หน้าห้าง คนแน่นเอี้ยด',
    'จู่ๆ ฟ้าก็สว่างวาบ เมฆแหวกออกเป็นรูวงกลม',
    'ทูตสวรรค์ปีกหกแฉก ตัวใหญ่เท่าตึก ลอยลงมา',
    'นางชี้นิ้วลงมาทีเดียว แสงทองก็ตกใส่ทุกคน',
    'ทุกคนงอกปีกออกมาพร้อมกัน สีไม่ซ้ำกันเลย',
    'แต่ปีกต้นใหญ่สุด สีทองเรืองแสง เหมือนตัวเอกในเกม',
    'แต่ไม่มีใครบินเป็น สองคนกระพือขึ้นไป ชนกันกลางอากาศ',
    'ลุงอีกคนปีกไปพันสายไฟ โดนไฟช็อตจนผมตั้ง',
    'คนขับรถทิ้งพวงมาลัยบินหนี รถพุ่งชนเสาไฟ ไฟลุกทั้งถนน',
    'ทั้งเมืองกรี๊ด ร้องไห้ วิ่งกันมั่วไปหมด',
    'แล้วมือถือต้นก็เด้ง! ข้าวมันไก่ ส่งคอนโดชั้นสามสิบ',
    'ใครมีเพื่อนเป็นไรเดอร์ แชร์ให้ดูเลย',
    'ถนนตันเพราะรถชนกันหมด ต้นเลยกางปีกบินไปส่ง',
    'หลบคนบินสวนเลน มุดใต้สายไฟ ฝ่าควันไฟไหม้',
    'ถึงชั้นสามสิบ ลูกค้าเปิดหน้าต่างมาเจอ กรี๊ดลั่น นึกว่าโจร',
    'ทั้งที่ตัวเองก็มีปีก บินลงไปเอาเองก็ได้',
    'ได้ค่าส่งห้าสิบบาท แล้วโดนปิดหน้าต่างใส่หน้า ปึง!',
    'ต้นบินกลับที่เดิม ยิ้มทั้งน้ำตา แล้วถามตัวเองว่า',
  ];
  // ---------- cast (all LPC) ----------
  const wings = (who, type) => ({ id: type || 'wings_feathered', v: 'white', tint: WING[who] });
  const person = (id, name, role, look, recipe, extra) => Object.assign({ id, kind: 'char', name, role, look, action: 'emote', recipe }, extra || {});
  const helmet = { what: 'หมวกกันน็อกไรเดอร์สีเขียว', z: 132, template: 'helmet', colors: { a: '#3f7a2e', b: '#f2efe6', c: '#16141f', d: '#7cbf3f' } };
  const TON = (w) => ({ body: 'male', skin: 'amber', layers: [...(w ? [wings('ton')] : []), { id: 'body' }, { id: 'heads_human_male' }, { id: 'hair_messy1', colors: { color_1: 'black' } },
    { id: 'torso_clothes_longsleeve', colors: { color_1: 'green' } }, { id: 'legs_pants', colors: { color_1: 'charcoal' } }, { id: 'feet_shoes_basic', colors: { color_1: 'black' } }], overlays: [helmet] });
  const NPC = {
    n1: (w) => ({ body: 'female', skin: 'light', layers: [...(w ? [wings('n1')] : []), { id: 'body' }, { id: 'heads_human_female' }, { id: 'hair_ponytail', colors: { color_1: 'black' } }, { id: 'torso_clothes_blouse', v: 'white' }, { id: 'legs_skirts_plain', colors: { color_1: 'navy' } }, { id: 'feet_shoes_basic', colors: { color_1: 'black' } }] }),
    n2: (w) => ({ body: 'male', skin: 'olive', layers: [...(w ? [wings('n2')] : []), { id: 'body' }, { id: 'heads_human_male' }, { id: 'hair_buzzcut', colors: { color_1: 'black' } }, { id: 'torso_clothes_shortsleeve', colors: { color_1: 'white' } }, { id: 'legs_pants', colors: { color_1: 'black' } }, { id: 'feet_shoes_basic', colors: { color_1: 'black' } }] }),
    n3: (w) => ({ body: 'male', skin: 'bronze', layers: [...(w ? [wings('n3', 'wings_bat')] : []), { id: 'body' }, { id: 'heads_human_male' }, { id: 'hair_balding', colors: { color_1: 'gray' } }, { id: 'torso_clothes_shortsleeve', colors: { color_1: 'sky' } }, { id: 'legs_shorts', colors: { color_1: 'brown' } }, { id: 'feet_sandals', colors: { color_1: 'brown' } }] }),
    n4: (w) => ({ body: 'female', skin: 'amber', layers: [...(w ? [wings('n4')] : []), { id: 'body' }, { id: 'heads_human_female' }, { id: 'hair_bob', colors: { color_1: 'dark_brown' } }, { id: 'torso_clothes_longsleeve', colors: { color_1: 'red' } }, { id: 'legs_skirts_plain', colors: { color_1: 'maroon' } }, { id: 'feet_sandals', colors: { color_1: 'black' } }] }),
    n5: (w) => ({ body: 'female', skin: 'olive', layers: [...(w ? [wings('n5', 'wings_lunar')] : []), { id: 'body' }, { id: 'heads_human_female' }, { id: 'hair_long', colors: { color_1: 'raven' } }, { id: 'torso_clothes_shortsleeve', colors: { color_1: 'yellow' } }, { id: 'legs_shorts', colors: { color_1: 'blue' } }, { id: 'feet_shoes_basic', colors: { color_1: 'white' } }] }),
    n6: (w) => ({ body: 'male', skin: 'light', layers: [...(w ? [wings('n6')] : []), { id: 'body' }, { id: 'heads_human_male' }, { id: 'hair_parted', colors: { color_1: 'black' } }, { id: 'torso_clothes_longsleeve', colors: { color_1: 'white' } }, { id: 'legs_pants', colors: { color_1: 'navy' } }, { id: 'feet_shoes_basic', colors: { color_1: 'black' } }] }),
  };
  const NPC_INFO = {
    n1: ['พนักงานออฟฟิศ', 'สาวออฟฟิศที่เดินผ่านลานห้าง', 'เสื้อเชิ้ตขาว กระโปรงกรมท่า ผมหางม้า', 'ชมพู'],
    n2: ['นักศึกษา', 'นักศึกษาที่ลองบินคนแรก แล้วชนกลางอากาศ', 'เสื้อขาว กางเกงดำ ผมเกรียน', 'ฟ้านีออน'],
    n3: ['ลุงเสื้อฟ้า', 'ลุงที่ปีกไปพันสายไฟ', 'ผมบาง เสื้อฟ้า กางเกงขาสั้น รองเท้าแตะ', 'ม่วง (ปีกค้างคาว)'],
    n4: ['ป้าเสื้อแดง', 'ป้าที่ตกใจร้องไห้', 'ผมบ็อบ เสื้อแขนยาวแดง ผ้าถุงแดงเข้ม', 'เขียวมะนาว'],
    n5: ['วัยรุ่นเสื้อเหลือง', 'สาววัยรุ่นที่บินชนนักศึกษา', 'ผมยาวดำ เสื้อเหลือง ขาสั้นยีนส์', 'ส้ม (ปีกจันทรา)'],
    n6: ['คนขับรถเก๋ง', 'คนที่ทิ้งรถบินหนี', 'เสื้อเชิ้ตขาว กางเกงกรมท่า', 'น้ำเงิน'],
  };
  const cast = [
    person('c1', 'ต้น', 'ไรเดอร์ส่งอาหาร ตัวหลัก (ก่อนมีปีก)', 'ชุดไรเดอร์เขียว หมวกกันน็อกเขียว กางเกงเทาเข้ม', TON(false)),
    person('c2', 'ต้น (มีปีก)', 'ต้นหลังได้ปีกสีทองเรืองแสง', 'ปีกขนนกสีทอง มีแสงออร่ากับประกายรอบตัว', TON(true), { aura: { color: '#ffc14a', r: 30, y: 34, alpha: 0.5, sparks: 8, spark: '#fff6c2' } }),
    person('a1', 'ทูตสวรรค์ปีกหกแฉก', 'ผู้เสกให้ทุกคนมีปีก', 'ผมยาวสีทอง ชุดยาวขาว รัศมีทองเหนือหัว ปีกขาวสามคู่ ตัวใหญ่เท่าตึก',
      { body: 'female', skin: 'light', pad: 24, layers: [{ id: 'wings_feathered', v: 'white', dy: -21 }, { id: 'wings_feathered', v: 'white', tint: '#fff6c2', dy: -6 }, { id: 'wings_feathered', v: 'gold', dy: 9 },
        { id: 'body' }, { id: 'heads_human_female' }, { id: 'hair_xlong_wavy', colors: { color_1: 'platinum' } }, { id: 'dress_sash', v: 'white' }, { id: 'feet_sandals', colors: { color_1: 'white' } }],
        overlays: [{ what: 'รัศมีทอง', z: 140, template: 'halo', colors: {} }] }, { scale: 3, aura: { color: '#fff6c2', r: 44, y: 40, alpha: 0.55, sparks: 10, spark: '#ffe66b' } }),
    ...Object.keys(NPC).flatMap((k) => { const [nm, role, look, wc] = NPC_INFO[k]; const m = 'm' + k.slice(1);
      return [person(k, nm, role, look, NPC[k](false)), person(m, nm + ' (มีปีก)', role, look + ' · ปีกสี' + wc, NPC[k](true))]; }),
    person('m7', 'ลูกค้าชั้น 30', 'ลูกค้าที่สั่งข้าวมันไก่ แต่ก็มีปีกเหมือนกัน', 'สาวชุดนอนชมพู ผมยาวลอน ปีกขาวมุก',
      { body: 'female', skin: 'light', layers: [wings('n7', 'wings_lunar'), { id: 'body' }, { id: 'heads_human_female' }, { id: 'hair_xlong_wavy', colors: { color_1: 'chestnut' } }, { id: 'torso_clothes_shortsleeve', colors: { color_1: 'pink' } }, { id: 'legs_pants', colors: { color_1: 'rose' } }, { id: 'feet_slippers', colors: { color_1: 'white' } }] }),
    { id: 'p1', kind: 'prop', name: 'มอไซค์ไรเดอร์', role: 'มอเตอร์ไซค์ของต้นพร้อมกล่องส่งอาหาร', look: 'สกู๊ตเตอร์เขียว กล่องเขียวแถบขาว', motion: 'still', map: MAPS.bike },
    { id: 'p2', kind: 'prop', name: 'รถชนเสาไฟ', role: 'รถที่คนขับทิ้งไว้แล้วพุ่งชน', look: 'รถเก๋งแดงหน้ายับ กระจกแตก ประตูเปิดค้าง ล้อหลุด', motion: 'still', map: MAPS.crashcar },
    { id: 'p3', kind: 'prop', name: 'มือถือออเดอร์', role: 'ออเดอร์ข้าวมันไก่ส่งชั้น 30', look: 'แอปสีเขียว รูปข้าวมันไก่ เลข 30 ปุ่มรับงาน', motion: 'float', map: MAPS.phone },
    { id: 'p4', kind: 'prop', name: 'ข้าวมันไก่', role: 'ของที่ต้องไปส่ง', look: 'กล่องใส ข้าวมัน ไก่สไลซ์ แตงกวา น้ำจิ้ม', motion: 'float', map: MAPS.rice },
    { id: 'p5', kind: 'prop', name: 'แบงก์ห้าสิบ', role: 'ค่าส่ง', look: 'ธนบัตร 50 บาทสีฟ้า', motion: 'float', map: MAPS.note50 },
  ];
  // ---------- scenes ----------
  const scenes = [
    { id: 's1', kind: 'scene', name: 'ลานหน้าห้าง ตอนเย็น', role: 'ที่ต้นจอดรอออเดอร์ คนแน่น', look: 'ห้างกระจกป้ายไฟ MEGA PLAZA ลานกระเบื้อง กระถางต้นไม้ น้ำพุ ร่มขายของ มอไซค์จอดเรียง ตึกสูงด้านหลัง ฟ้าเย็นส้มม่วง',
      spec: { name: 'plaza', sky: { stops: [[0, '#2253a3'], [0.45, '#9b5de5'], [0.8, '#ff8a4c'], [1, '#ffc14a']], bands: 5 },
        lights: [{ x: 135, y: 150, radius: 260, color: '#ffe66b', dark: 0.15, glow: 30 }, { x: 60, y: 250, radius: 90, color: '#fff6c2', dark: 0 }, { x: 214, y: 250, radius: 90, color: '#fff6c2', dark: 0 }],
        far: [{ p: 'skyline', y: 150, h: 110, color: '#2f2a47', litp: 0.3 }, { p: 'clouds', y: 70, count: 3, color: '#ffc14a' }],
        mid: [{ p: 'mall', x: 135, y: 272, w: 250, h: 176, sign: 'MEGA PLAZA', signcolor: '#ffe66b', b1: '#e0533f', b2: '#9b5de5', glass: '#1f6f8b' }, { p: 'streetlamp', x: 20, y: 272, h: 70 }, { p: 'streetlamp', x: 250, y: 272, h: 70 }],
        ground: { y: 300, color: '#b5b0a5', far: '#8c8a86', texture: 'tiles',
          prims: [{ p: 'fountain', x: 214, y: 286, w: 54 }, { p: 'planter', x: 40, y: 284, w: 40 }, { p: 'parasol', x: 74, y: 290, color: '#e0533f', text: 'ไก่ทอด' }, { p: 'moto', x: 232, y: 298, color: '#3f7a2e' }] },
        near: [{ p: 'planter', x: 26, y: 470, w: 64, flower: '#ffe66b' }, { p: 'planter', x: 246, y: 470, w: 64 }, { p: 'bench', x: 236, y: 380 }, { p: 'bins', x: 20, y: 384 }],
        ambient: [{ type: 'pigeons', y: 292, count: 4 }, { type: 'clouddrift', y: 54, count: 3, period: 40, color: '#ffc14a' }, { type: 'plane', y: 40, period: 20 }, { type: 'birds', y: 100, count: 3, period: 16, color: '#2f2a47' }, { type: 'steam', x: 74, y: 278, count: 4 }, { type: 'ledsign', x: 95, y: 112, w: 80, text: 'SALE 70%  ·  ลดทั้งห้าง  ·  ', color: '#ffe66b' }] } },
    { id: 's2', kind: 'scene', name: 'ฟ้าเหนือลานห้าง', role: 'ฟ้าแตกเป็นรู ทูตสวรรค์ลงมา', look: 'ฟ้าสีทองแตกเป็นรูวงกลม แสงลำใหญ่ส่องลงมา เมฆทองล้อมรอบ ขนนกหลากสีลอย ยอดห้างและตึกด้านล่าง ฝูงคนแหงนมอง',
      spec: { name: 'heaven', sky: { stops: [[0, '#5b2a86'], [0.35, '#c77dff'], [0.7, '#ff8a4c'], [1, '#ffc14a']], bands: 5 },
        lights: [{ x: 135, y: 96, radius: 300, color: '#fff6c2', dark: 0.1, glow: 50 }],
        far: [{ p: 'cloudhole', x: 135, y: 96, r: 48, cloud: '#f2d38a' }, { p: 'skyline', y: 470, h: 130, color: '#231f33', litp: 0.35 }],
        mid: [{ p: 'mall', x: 135, y: 520, w: 250, h: 120, sign: 'MEGA PLAZA', signcolor: '#ffe66b', glass: '#1f6f8b' }],
        ground: { y: 470, color: '#8c8a86', far: '#6e6c68', texture: 'tiles' },
        ambient: [{ type: 'heaven', x: 135, y: 96, r: 48, y1: 470 }, { type: 'feathers', count: 12, y0: 80, y1: 460, colors: ['#fff6c2', '#ffffff', '#ffe66b'], rows: [] }, { type: 'birds', y: 180, count: 4, period: 8, color: '#231f33' }] } },
    { id: 's3', kind: 'scene', name: 'ถนนหน้าห้าง กลายเป็นความวุ่นวาย', role: 'คนบินชนกัน ปีกพันสายไฟ รถชนไฟไหม้', look: 'ตึกแถวป้ายร้าน เสาไฟสายไฟพันกัน ไฟช็อตแลบ รถเก๋งชนเสาไฟลุก ควันดำ เศษกระจก ฟ้าเย็นแดงจากไฟ',
      spec: { name: 'chaos', sky: { stops: [[0, '#231f33'], [0.45, '#5b2a86'], [0.8, '#e0533f'], [1, '#ff8a4c']], bands: 5 },
        lights: [{ x: 74, y: 262, radius: 150, color: '#ff8a4c', dark: 0.35, glow: 40 }, { x: 206, y: 150, radius: 70, color: '#4ff0ff', dark: 0 }, { x: 240, y: 220, radius: 60, color: '#ffe66b', dark: 0 }],
        far: [{ p: 'skyline', y: 160, h: 110, color: '#16141f', litp: 0.25 }],
        mid: [{ p: 'shophouse', x: 135, y: 272, units: 4, uw: 64, floors: 3, color: '#b8773f', shops: ['grocery', 'open', 'shut', 'open'], signs: [{ unit: 0, text: 'ข้าวมันไก่', bg: '#f2efe6', color: '#b52b35' }, { unit: 1, text: 'มือถือ', bg: '#2253a3', color: '#ffffff' }, { unit: 3, text: 'ร้านยา', bg: '#2f9c86', color: '#ffffff' }] },
          { p: 'powerlines', xs: [40, 206], y: 272, ground: 272, count: 5 }],
        ground: { y: 300, color: '#3d3a5c', far: '#2f2a47', texture: 'stone', prims: [{ p: 'road', near: true, y0: 300, lanes: 2 }, { p: 'brokenpole', x: 150, y: 298, h: 66, lean: -0.6 }, { p: 'debris', x0: 40, x1: 230, y: 292, n: 18 }] },
        near: [{ p: 'debris', x0: 10, x1: 260, y: 372, n: 14 }, { p: 'debris', x0: 10, x1: 260, y: 430, n: 10 }],
        ambient: [{ type: 'flame', x: 136, y: 290, s: 3 }, { type: 'flame', x: 112, y: 286, s: 2 }, { type: 'flame', x: 156, y: 292, s: 1 }, { type: 'smoke', x: 130, y: 262, h: 240, count: 14, s: 16, drift: 30 }, { type: 'zap', x: 206, y: 150, period: 1, bolts: 4 }, { type: 'zap', x: 226, y: 158, period: 2, seed: 5 },
          { type: 'embers', count: 16, y: 290 }, { type: 'feathers', count: 10, y0: 60, y1: 300 }] } },
    { id: 's4', kind: 'scene', name: 'กลางฟ้าระหว่างตึก', role: 'ต้นบินฝ่าเมืองไปคอนโด', look: 'ตึกสูงเรียงสองข้าง ควันไฟลอยขึ้นจากถนนข้างล่าง สายไฟพาดผ่าน คนมีปีกบินสวนไปมา ฟ้าเย็นม่วงส้ม',
      spec: { name: 'skyway', sky: { stops: [[0, '#183057'], [0.5, '#9b5de5'], [1, '#ff8a4c']], bands: 5 },
        lights: [{ x: 210, y: 70, radius: 220, color: '#ffc14a', dark: 0.1 }],
        far: [{ p: 'skyline', y: 440, h: 260, color: '#3d3a5c', litp: 0.32 }, { p: 'clouds', y: 90, count: 3, color: '#ffc14a' }, { p: 'clouds', y: 200, count: 2, color: '#ff8a4c' }],
        mid: [{ p: 'skyline', y: 480, h: 230, color: '#231f33', litp: 0.42, minw: 22, varw: 26 }],
        ground: { y: 320, color: '#231f33', far: '#231f33', texture: 'stone' },
        ambient: [{ type: 'smoke', x: 60, y: 480, h: 420, count: 14, s: 16, drift: 20, alpha: 0.55 }, { type: 'smoke', x: 220, y: 480, h: 380, count: 10, s: 12, drift: -10, alpha: 0.45 }, { type: 'feathers', count: 16, y0: 20, y1: 470 }, { type: 'birds', y: 130, count: 3, period: 8, color: '#16141f' }, { type: 'plane', y: 36, period: 16 }] } },
    { id: 's5', kind: 'scene', name: 'หน้าต่างคอนโดชั้น 30', role: 'ส่งข้าวมันไก่ถึงมือลูกค้า', look: 'ตึกคอนโดสูงระเบียงกระจก แอร์ กระถางต้นไม้ หน้าต่างห้องชั้น 30 เปิดไฟสว่าง ม่านส้ม เมืองเย็นข้างหลัง',
      spec: { name: 'condo', sky: { stops: [[0, '#183057'], [0.55, '#9b5de5'], [1, '#ff8a4c']], bands: 5 },
        lights: [{ x: 62, y: 270, radius: 110, color: '#fff6c2', dark: 0.2, glow: 30 }],
        far: [{ p: 'skyline', y: 470, h: 200, color: '#2f2a47', litp: 0.3 }],
        mid: [{ p: 'condo', x: 100, y: 376, w: 160, fh: 66, floors: 5, cols: 2, color: '#b3b9d1', open: { floor: 3, col: 0 }, numbers: true, numbers0: 33, litp: 0.4 }],
        ground: { y: 300, color: '#9a9fb8', far: '#7a7fa3', texture: 'stone' },
        near: [{ p: 'condo', x: 100, y: 508, w: 160, fh: 66, floors: 2, cols: 2, color: '#b3b9d1', litp: 0.4 }],
        ambient: [{ type: 'feathers', count: 10, y0: 30, y1: 470 }, { type: 'birds', y: 90, count: 2, period: 10, color: '#16141f' }, { type: 'clouddrift', y: 50, count: 2, period: 40, color: '#ffc14a' }] } },
  ];
  // ---------- shot helpers ----------
  const mv = (actor, x, o) => Object.assign({ actor, action: 'idle', dir: 's', from: x, to: x }, o || {});
  const fly = (actor, x0, x1, y, o) => Object.assign({ actor, action: 'fly', dir: x1 > x0 ? 'e' : x1 < x0 ? 'w' : 's', from: x0, to: x1, y }, o || {});
  const bike = { prop: 'p1', x: 116, y: 0, motion: 'still' };
  const car = { prop: 'p2', x: 110, y: 0, scale: 2, motion: 'still' }; const carSide = { prop: 'p2', x: 34, y: 0, scale: 2, motion: 'still' }; // carSide: close shots keep the wreck at the edge
  // plaza crowd before the wings: LPC people walking in both directions at different depths
  const crowd = (o) => [mv('n1', 10, { to: 120, y: -14, action: 'walk', dir: 'e' }), mv('n2', 262, { to: 180, y: -20, action: 'walk', dir: 'w' }), mv('n4', 40, { y: -6, dir: 'e' }),
    mv('n5', 250, { to: 200, y: -2, action: 'walk', dir: 'w' }), mv('n3', 228, { y: -24, dir: 'w' }), mv('n6', 90, { to: 30, y: -28, action: 'walk', dir: 'w' })].map((m) => Object.assign(m, (o && o[m.actor]) || {}));
  const crowdUp = (ids, o) => ids.map((id, k) => mv(id, [40, 86, 184, 230, 135][k], Object.assign({ y: 0, dir: 'n' }, (o && o[id]) || {})));
  const beats = {
    title: 'ทั้งเมืองมีปีก', bpm: 120, key: 'E', scale: 'mixolydian', hud: { days: 0, unit: '', label: '', icon: 'floor', suffix: ' ชั้น' },
    yt_title: 'ถ้าทุกคนมีปีกบินได้ แต่ยังต้องไปส่งข้าวมันไก่ ชั้น 30 #shorts', hashtags: ['#ถ้าทุกคนมีปีก', '#ไรเดอร์', '#ข้าวมันไก่', '#เรื่องสมมติ', '#shorts'],
    description: 'ถ้าวันนึงทูตสวรรค์เสกให้ทุกคนมีปีก เมืองจะวุ่นแค่ไหน และไรเดอร์ยังต้องไปส่งของไหม (เรื่องแต่งเพื่อความบันเทิง)',
    rows: [
      { scene: 's1', grade: 'warm', camera: { zoom: 1, focus: 135, punch_word: 'แอป' }, moves: [mv('c1', 150, { dir: 's' }), ...crowd()], props: [bike, { prop: 'p3', x: 182, y: -50, motion: 'float', at_word: 'เด้งออเดอร์', sfx: 'ping' }],
        cues: [{ at_word: 'มีปีก', fx: 'light', sfx: 'shimmer', vel: 0.6 }, { at_word: 'เด้งออเดอร์', actor: 'c1', action: 'emote' }],
        caption: 'ถ้าทุกคน*มีปีก*บินได้|แต่แอปยัง*เด้งออเดอร์*', voice: VOICE[0], hook: { type: 'question', fx: 'zoom' }, music: 'triumphant', bed: 'crowd', bedVel: 0.35 },
      { scene: 's1', grade: 'warm', camera: { zoom: 2, focus: 140 }, moves: [mv('c1', 150, { dir: 'w' }), ...crowd()], props: [bike],
        cues: [{ at_word: 'คนแน่น', actor: 'c1', action: 'emote' }], labels: [{ actor: 'c1', text: 'ต้น', at_word: 'ต้น' }],
        caption: '*ต้น* ไรเดอร์ชุดเขียว|รอออเดอร์*หน้าห้าง*', voice: VOICE[1], hook: { type: 'enter' }, music: 'triumphant', bed: 'crowd', bedVel: 0.5 },
      { scene: 's2', grade: 'gold', transition: 'goldflash', camera: { zoom: 1, focus: 135, punch_word: 'สว่างวาบ' }, moves: crowdUp(['n1', 'n2', 'n4', 'n5', 'c1']),
        cues: [{ at_word: 'สว่างวาบ', fx: 'flash', sfx: 'choir', vel: 0.7, loud: true }, { at_word: 'รูวงกลม', fx: 'shake', sfx: 'boom', vel: 0.5 }],
        caption: 'ฟ้า*สว่างวาบ*|เมฆแหวกเป็น*รูวงกลม*', voice: VOICE[2], hook: { type: 'event', fx: 'light' }, music: 'epic', bed: 'crowd', bedVel: 0.3 },
      { scene: 's2', grade: 'gold', camera: { zoom: 1, focus: 135 }, moves: [fly('a1', 135, 135, -430, { y_to: -186, at_word: 'ทูตสวรรค์', until: 0.7, dir: 's', flap: false }), ...crowdUp(['n1', 'n2', 'n4', 'n5', 'c1'])],
        cues: [{ at_word: 'ทูตสวรรค์', sfx: 'choir', vel: 0.8 }, { at_word: 'ตัวใหญ่', fx: 'light', sfx: 'boom', vel: 0.6 }], labels: [{ actor: 'a1', text: 'ทูตสวรรค์ปีก 6 แฉก', at_word: 'หกแฉก' }],
        caption: 'ทูตสวรรค์*ปีกหกแฉก*|ตัวใหญ่*เท่าตึก*', voice: VOICE[3], hook: { type: 'enter' }, music: 'epic' },
      { scene: 's2', grade: 'gold', camera: { zoom: 1, focus: 135 }, moves: [fly('a1', 135, 135, -186, { dir: 's', flap: false }), ...crowdUp(['n1', 'n2', 'n4', 'n5', 'c1'])],
        cues: [{ at_word: 'ชี้นิ้ว', actor: 'a1', action: 'spellcast' }, { at_word: 'แสงทอง', fx: 'flash', sfx: 'shimmer', vel: 0.9, loud: true }],
        caption: 'นาง*ชี้นิ้ว*ทีเดียว|*แสงทอง*ตกใส่ทุกคน', voice: VOICE[4], hook: { type: 'event', fx: 'light' }, music: 'epic' },
      { scene: 's1', grade: 'gold', camera: { zoom: 1, focus: 135, punch_word: 'งอกปีก' }, moves: [mv('c2', 150, { dir: 's' }), mv('m1', 70, { y: -14, dir: 'e' }), mv('m2', 212, { y: -20, dir: 'w' }), mv('m4', 40, { y: -6, dir: 'e' }), mv('m5', 236, { y: -2, dir: 'w' }), mv('m3', 196, { y: -26, dir: 'w' }), mv('m6', 100, { y: -30, dir: 'e' })], props: [bike],
        cues: [{ at: 0.02, fx: 'flash', sfx: 'whoosh', vel: 0.9, loud: true }, { at_word: 'งอกปีก', actor: 'c2', action: 'emote', sfx: 'flap', vel: 0.8 }, { at_word: 'ไม่ซ้ำ', actor: 'm4', action: 'emote' }],
        caption: 'ทุกคน*งอกปีก*พร้อมกัน|*สีไม่ซ้ำกัน*เลย', voice: VOICE[5], hook: { type: 'event', fx: 'zoom' }, music: 'triumphant', bed: 'crowd', bedVel: 0.5 },
      { scene: 's1', grade: 'gold', camera: { zoom: 3, focus: 'c2', punch_word: 'สีทอง' }, moves: [mv('c2', 150, { dir: 's' }), mv('m5', 236, { y: -2, dir: 'w' }), mv('m6', 100, { y: -30, dir: 'e' })], props: [bike],
        cues: [{ at_word: 'สีทอง', sfx: 'shimmer', vel: 0.8, fx: 'light' }, { at_word: 'ตัวเอก', actor: 'c2', action: 'emote' }], labels: [{ actor: 'c2', text: 'ปีกทองของต้น', at_word: 'ปีกต้น' }],
        caption: 'ปีกต้น*ใหญ่สุด*|*สีทอง*เรืองแสง', voice: VOICE[6], hook: { type: 'direction' }, music: 'triumphant' },
      { scene: 's1', grade: 'warm', camera: { zoom: 1, focus: 135, punch_word: 'ชนกัน', lift: 120 }, moves: [mv('c2', 150, { dir: 'n' }), fly('m2', 20, 128, -40, { y_to: -150, at_word: 'กระพือ', until: 0.82 }), fly('m5', 250, 142, -40, { y_to: -150, at_word: 'กระพือ', until: 0.82 }), mv('m4', 40, { y: -6, dir: 'e' })], props: [bike],
        cues: [{ at_word: 'ไม่มีใคร', actor: 'c2', action: 'emote' }, { at_word: 'ชนกัน', delay: 0.05, actor: 'm2', action: 'hurt', spin: 1, bam: 'โป๊ก!', sfx: 'slap', vel: 1, loud: true, fx: 'shake' }, { at_word: 'ชนกัน', delay: 0.05, actor: 'm5', action: 'hurt', dizzy: 1.2 }],
        caption: 'ไม่มีใคร*บินเป็น*|เลย*ชนกันกลางอากาศ*', voice: VOICE[7], pause_after: 0.9, hook: { type: 'event', fx: 'shake' }, music: 'tense', bed: 'crowd', bedVel: 0.5 },
      { scene: 's3', grade: 'red', transition: 'lightning', camera: { zoom: 2, focus: 206, punch_word: 'ช็อต', lift: 110 }, moves: [fly('m3', 206, 206, -128, { dir: 's', flap: false })],
        cues: [{ at: 0, actor: 'm3', action: 'hurt', still: true }, { at_word: 'ไฟช็อต', fx: 'flash', sfx: 'zap', vel: 1, loud: true, bam: 'ซี๊ดดด!' }, { at_word: 'ผมตั้ง', actor: 'm3', dizzy: 1.2, fx: 'rgb' }],
        caption: 'ลุงปีก*พันสายไฟ*|โดน*ไฟช็อต*จนผมตั้ง', voice: VOICE[8], hook: { type: 'event', fx: 'glitch' }, music: 'tense', bed: 'fire', bedVel: 0.3 },
      { scene: 's3', grade: 'red', camera: { zoom: 1, focus: 135, punch_word: 'ชนเสาไฟ' }, moves: [fly('m6', 90, 170, -30, { y_to: -180, at_word: 'บินหนี' }), mv('m4', 226, { y: -4, dir: 'w' }), fly('m3', 206, 206, -128, { dir: 's', flap: false })], props: [{ prop: 'p2', x: 110, y: 0, scale: 2, motion: 'still', at_word: 'พุ่งชน', sfx: 'crash', vel: 1 }],
        cues: [{ at: 0, actor: 'm3', action: 'hurt', still: true }, { at_word: 'พุ่งชน', fx: 'shake', bam: 'โครม!', loud: true }, { at_word: 'ไฟลุก', sfx: 'boom', vel: 0.8, fx: 'flash' }, { at_word: 'ไฟลุก', actor: 'm4', action: 'hurt' }],
        caption: 'ทิ้ง*พวงมาลัย*บินหนี|รถชนเสาไฟ*ไฟลุก*', voice: VOICE[9], hook: { type: 'event', fx: 'shake' }, music: 'tense', bed: 'fire', bedVel: 0.5 },
      { scene: 's3', grade: 'red', camera: { zoom: 2, focus: 170 }, moves: [mv('m4', 120, { to: 250, action: 'run', dir: 'e' }), mv('m1', 260, { to: 170, action: 'run', dir: 'w', y: -10 }), mv('m2', 210, { dir: 's', y: -4 }), fly('m5', 60, 260, -120, { y_to: -90 })], props: [carSide],
        cues: [{ at_word: 'กรี๊ด', sfx: 'shriek', vel: 0.9, actor: 'm1', action: 'emote' }, { at_word: 'ร้องไห้', actor: 'm2', action: 'hurt', sfx: 'cry', vel: 0.7 }, { at_word: 'มั่ว', fx: 'shake' }],
        caption: 'ทั้งเมือง*กรี๊ด*|ร้องไห้ วิ่ง*มั่ว*ไปหมด', voice: VOICE[10], hook: { type: 'cut' }, music: 'tense', bed: 'fire', bedVel: 0.45 },
      { scene: 's3', grade: 'red', camera: { zoom: 3, focus: 'c2', punch_word: 'สามสิบ' }, moves: [mv('c2', 200, { dir: 's' })], props: [carSide, { prop: 'p3', x: 232, y: -50, motion: 'float', at_word: 'เด้ง', sfx: 'ping', vel: 0.9 }, { prop: 'p4', x: 172, y: -40, motion: 'float', at_word: 'ข้าวมันไก่', sfx: 'pop' }],
        cues: [{ at_word: 'เด้ง', actor: 'c2', action: 'emote', fx: 'zoom' }],
        caption: 'มือถือ*เด้ง!*|ข้าวมันไก่ ส่ง*ชั้น 30*', voice: VOICE[11], hook: { type: 'event' }, music: 'mysterious', bed: 'fire', bedVel: 0.3 },
      { scene: 's3', grade: 'red', camera: { zoom: 2, focus: 'c2' }, moves: [mv('c2', 200, { dir: 's' })], props: [carSide, { prop: 'p4', x: 172, y: -40, motion: 'float' }],
        cues: [{ at_word: 'แชร์', actor: 'c2', action: 'emote' }],
        caption: 'มีเพื่อนเป็น*ไรเดอร์*|*แชร์*ให้ดูเลย', voice: VOICE[12], cta: 'share', cta_word: 'แชร์', hook: { type: 'direction' }, music: 'triumphant', bed: 'fire', bedVel: 0.3 },
      { scene: 's3', grade: 'warm', camera: { zoom: 2, focus: 'c2' }, moves: [fly('c2', 200, 230, 0, { y_to: -230, at_word: 'กางปีก', until: 0.95 })], props: [car],
        cues: [{ at_word: 'ถนนตัน', fx: 'shake' }, { at_word: 'กางปีก', sfx: 'whoosh', vel: 0.9, loud: true, fx: 'light' }], hud: { money: 0, off: false, at_word: 'กางปีก' },
        caption: '*ถนนตัน*หมด|ต้นเลย*กางปีกบิน*', voice: VOICE[13], hook: { type: 'direction', fx: 'light' }, music: 'triumphant', bed: 'fire', bedVel: 0.3 },
      { scene: 's4', grade: 'warm', camera: { zoom: 2, focus: 'c2' }, moves: [fly('c2', 40, 230, -80, { y_to: -150 }), fly('m6', 280, -20, -190, { y_to: -160, at_word: 'สวนเลน', until: 0.55 }), fly('m1', 260, 60, -40, { y_to: -20, at_word: 'มุด' }), fly('m3', -10, 120, -250, { y_to: -230 }), fly('m4', 280, 180, -120, { y_to: -60, at_word: 'ฝ่าควัน' })],
        cues: [{ at: 0.02, sfx: 'whoosh', vel: 0.6 }, { at_word: 'หลบ', actor: 'c2', action: 'jump', sfx: 'whoosh', vel: 0.7 }, { at_word: 'มุดใต้', fx: 'zoom', sfx: 'zap', vel: 0.5 }, { at_word: 'ฝ่าควัน', fx: 'shake', sfx: 'cough', vel: 0.6, actor: 'c2', action: 'hurt' }], hud: [{ money: 8, at_word: 'หลบ' }, { money: 17, at_word: 'มุด' }, { money: 24, at_word: 'ฝ่าควัน' }],
        caption: 'หลบคน*บินสวนเลน*|มุดสายไฟ ฝ่า*ควันไฟ*', voice: VOICE[14], hook: { type: 'cut', fx: 'zoom' }, music: 'epic', bed: 'wind', bedVel: 0.4 },
      { scene: 's5', grade: 'warm', transition: 'pixeldissolve', camera: { zoom: 2, focus: 100, punch_word: 'กรี๊ด' }, moves: [fly('c2', 260, 132, -10, { until: 0.4, dir: 'w' }), mv('m7', 66, { dir: 'e' })], props: [{ prop: 'p4', x: 108, y: -34, motion: 'float' }],
        cues: [{ at_word: 'เปิดหน้าต่าง', actor: 'm7', action: 'emote' }, { at_word: 'กรี๊ด', actor: 'm7', action: 'hurt', bam: 'กรี๊ดดด!', sfx: 'shriek', vel: 1, loud: true, fx: 'shake' }, { at_word: 'โจร', actor: 'c2', action: 'emote' }], hud: { money: 30, at_word: 'ชั้นสามสิบ' },
        caption: 'ถึง*ชั้น 30*|ลูกค้า*กรี๊ด*นึกว่าโจร', voice: VOICE[15], pause_after: 0.8, hook: { type: 'event', fx: 'shake' }, music: 'tense' },
      { scene: 's5', grade: 'warm', camera: { zoom: 2, focus: 100, punch_word: 'เอาเอง' }, moves: [fly('c2', 132, 132, -10, { dir: 'w' }), mv('m7', 66, { dir: 'e' })], props: [{ prop: 'p4', x: 108, y: -34, motion: 'float' }],
        cues: [{ at_word: 'มีปีก', actor: 'm7', action: 'emote' }, { at_word: 'เอาเอง', actor: 'c2', action: 'hurt', sfx: 'boing', vel: 0.8, fx: 'zoom' }], hud: { money: 30, off: true },
        caption: 'ทั้งที่*ตัวเองก็มีปีก*|บินลงไป*เอาเอง*ก็ได้', voice: VOICE[16], pause_after: 0.6, hook: { type: 'fact' }, music: 'mysterious' },
      { scene: 's5', grade: 'warm', camera: { zoom: 2, focus: 100, punch_word: 'ปึง' }, moves: [fly('c2', 132, 132, -10, { dir: 'w' }), mv('m7', 66, { dir: 'e', until: 0.6 })], props: [{ prop: 'p5', x: 100, y: -60, motion: 'float', at_word: 'ห้าสิบบาท', sfx: 'coin', vel: 0.8 }],
        cues: [{ at_word: 'ปิดหน้าต่าง', actor: 'm7', action: 'slash' }, { at_word: 'ปึง', fx: 'shake', bam: 'ปึง!', sfx: 'slap', vel: 1, loud: true, actor: 'c2', spin: 1 }],
        caption: 'ได้ค่าส่ง*50 บาท*|แล้วโดน*ปิดหน้าต่าง*ใส่', voice: VOICE[17], pause_after: 0.6, hook: { type: 'event', fx: 'shake' }, music: 'tense' },
      { scene: 's1', grade: 'gold', camera: { zoom: 2, focus: 140 }, moves: [mv('c2', 150, { dir: 's' }), mv('m4', 40, { y: -6, dir: 'e' }), mv('m1', 70, { y: -14, dir: 'e' })], props: [bike],
        cues: [{ at: 0.03, actor: 'c2', action: 'jump', sfx: 'flap', vel: 0.6 }, { at_word: 'ยิ้มทั้งน้ำตา', actor: 'c2', action: 'emote', sfx: 'cry', vel: 0.4 }],
        caption: 'บินกลับ*ที่เดิม*|*ยิ้มทั้งน้ำตา*...', voice: VOICE[18], hook: { type: 'cut' }, music: 'triumphant', bed: 'crowd', bedVel: 0.4 },
    ],
  };
  LSE.WINGS = {
    title: 'ทั้งเมืองมีปีก', palette: PAL,
    topic: 'ถ้าจู่ๆ ทุกคนมีปีก แต่ต้นไรเดอร์ยังต้องไปส่งข้าวมันไก่ชั้น 30 ท่ามกลางเมืองที่วุ่นวาย (ขำๆ ตื่นเต้น)',
    castMeta: { proportions: [{ name: 'คน (LPC)', height_px: 48, why: 'ฐานของสไตล์' }, { name: 'ทูตสวรรค์', height_px: 150, why: 'ขยาย 3 เท่า ให้ใหญ่เท่าตึก' }, { name: 'มอไซค์', height_px: 40, why: 'สูงราวเอวถึงอกคน' }, { name: 'รถเก๋ง', height_px: 38, why: 'ยาวราวสามคน' }], palette: PAL },
    pitch: {
      title: 'ทั้งเมืองมีปีก', angle: 'ทุกคนได้ปีกพร้อมกันโดยไม่มีใครบินเป็น เมืองเลยพัง → ถนนตันเพราะรถชน ต้นจึงต้องใช้ปีกทองบินไปส่งข้าวมันไก่ชั้น 30 → ลูกค้ากรี๊ดทั้งที่ตัวเองก็มีปีก → ได้ค่าส่ง 50 บาท',
      beats: ['ฮุก: ทุกคนมีปีก แต่แอปยังเด้งออเดอร์', 'ต้นรอออเดอร์หน้าห้าง คนแน่น', 'ฟ้าแตก ทูตสวรรค์ปีก 6 แฉกลงมา เสกแสงทอง', 'ทุกคนงอกปีกคนละสี ปีกต้นทองเรืองแสงเด่นสุด', 'บินชนกัน ลุงพันสายไฟโดนช็อต รถไร้คนขับชนเสาไฟลุก คนกรี๊ดร้องไห้', 'ออเดอร์ข้าวมันไก่ชั้น 30 ถนนตัน ต้องบินไป', 'หลบคนบิน มุดสายไฟ ฝ่าควัน', 'ลูกค้ากรี๊ดนึกว่าโจร ทั้งที่ตัวเองก็มีปีก', 'ได้ 50 บาท ยิ้มทั้งน้ำตา วนกลับคำถามแรก'],
      payoff: 'เรื่องสมมติขำๆ ที่มีเหตุผล: ปีกไม่ได้ทำให้ชีวิตง่ายขึ้น ถ้าไม่มีใครบินเป็น และงานก็ยังต้องทำอยู่ดี',
      hook: VOICE[0], bridge: VOICE[18], loop_read: VOICE[18] + ' ' + VOICE[0],
      facts: [{ claim: 'ทั้งเรื่องเป็นเรื่องแต่งเพื่อความบันเทิง', source: 'เรื่องแต่ง', confidence: 'สูง', note: 'ไม่มีข้อมูลจริงอ้างอิง' }],
      culture: 'thai', cta: 'share', cta_reason: 'คนดูมีเพื่อนเป็นไรเดอร์ หรือเป็นไรเดอร์เอง มุกนี้อยากส่งต่อ',
    },
    cast, scenes, beats,
  };
})(typeof window !== 'undefined' ? window : globalThis);
