// Clip genres (chosen before the topic): each steers every Claude prompt, while one house quality bar — the
// "100 บาท 7 วัน" reference project shipped in the page as LSE.B100 — stays the same for all of them.
(function () {
  const App = window.App;

  App.GENRES = {
    science: {
      id: 'science', name: 'วิทยาศาสตร์ให้ความรู้', short: 'วิทยาศาสตร์', icon: '🔬', hue: 'cy',
      tagline: 'คำถามเดียวที่ทุกคนเคยสงสัย เล่าเป็นเรื่องให้เห็นภาพ ตัวเลขจริง แหล่งอ้างอิงจริง',
      examples: ['ถ้าโลกหยุดหมุน 1 วินาที จะเกิดอะไรขึ้น', 'ทำไมฟ้าผ่าแล้วได้ยินเสียงทีหลัง', 'ถ้ากระโดดลงหลุมที่ทะลุโลก', 'ร่างกายเราอยู่ได้กี่วันถ้าไม่นอน', 'ทำไมทะเลถึงเค็ม'],
      placeholder: 'เช่น ถ้าดวงอาทิตย์ดับไป 1 วัน โลกจะเป็นยังไง', cta: 'subscribe', demo: 'B100',
      writer: 'a science explainer who turns ONE surprising science question into a vivid, true, easy-to-follow story',
      pitch: `GENRE = SCIENCE EXPLAINER. Pick the ONE question inside the topic an ordinary Thai viewer has wondered about (ถ้า… จะเกิดอะไรขึ้น / ทำไม…).
Tell it as a story with a guide character (a curious Thai student, a kid or a scientist with a name) who lives through or tests the idea step by step: what happens first, then next, then the surprise.
Make scale felt with real numbers compared to everyday Thai things (ตึกใบหยก, รถเมล์, แก้วกาแฟ, สนามฟุตบอล). Every claim is real science with a real source (NASA, ESA, university textbooks, peer-reviewed papers, กรมอุตุนิยมวิทยา);
say "นักวิทยาศาสตร์คาดว่า" for models and estimates; no myths, no invented facts. Payoff = the viewer can now explain it to a friend.`,
      beats: `SCIENCE PICTURE: show the mechanism, not a talking head — the city/sea/sky changing as the effect happens, a lab or classroom for the test, space with sun/earth/moon prims, inset close-ups (kind "prop") of the key object,
cards for numbers with units ("1,670 กม./ชม."), the HUD as a live counter when the story counts time/temperature/distance (e.g. beats.hud {"days":10,"unit":"°C","label":"นาทีที่"} and rows' hud.money = the measured value). At most one light gag (a boing double-take), never mocking science.`,
      cast: 'SCIENCE SETS: a Thai classroom or lab (desk, shelf, lamp, papers, poster), a rooftop or field at night with stars, space with sun/moon/earth, the everyday place feeling the effect (street, sea, home). Props are the experiment objects drawn clearly (beaker, magnet, thermometer, planet).',
      long: 'Each chapter answers the next natural question (แล้วถ้า…ต่อ? ทำไม? ใครค้นพบ? เราใช้มันในชีวิตจริงยังไง?); include one "เรารู้ได้ยังไง" chapter (the real discovery: scientist, year, experiment) and one "ความเชื่อ vs ความจริง" chapter.',
    },
    sim: {
      id: 'sim', name: 'จำลองสถานการณ์ แบบกวนๆ', short: 'จำลองสถานการณ์', icon: '🎭', hue: 'mg',
      tagline: 'ถ้า…จะเป็นยังไง? โยนเราเข้าสถานการณ์สุดเพี้ยน เล่าเร็ว มุกกวน เสียงประกอบแน่น ภาพแบบคลิป 100 บาท 7 วัน',
      examples: ['ถ้าลิฟต์ค้างอยู่ชั้น 40 คนเดียวตอนตีสาม', 'ถ้าตื่นมาเป็นแมวในคอนโด 1 วัน', 'ถ้าขับสปีดโบ๊ทแล้ววาร์ปไปโผล่บนดวงจันทร์', 'ถ้าหลับแล้วตื่นมาอยู่ในยุคไดโนเสาร์', 'ถ้าตกลงไปในท่อระบายน้ำกรุงเทพ'],
      placeholder: 'เช่น ถ้าโดนดูดเข้าไปในเกมที่เล่นอยู่ เราจะรอดได้กี่นาที', cta: 'share', demo: 'B100',
      writer: 'a comedic what-if storyteller who drops the viewer ("เรา") or one ordinary Thai character into an absurd or tough situation and plays it out fast, funny and teasing',
      pitch: `GENRE = WHAT-IF SIMULATION, COMEDY. Play out exactly the situation the topic describes: what happens first, then next, the escalation, the punchline. The TOPIC decides everything — place, stakes, what (if anything) is counted.
Do NOT bring in money, budgets, prices, salaries, shopping or "survive N days with N baht" unless the topic itself is about money. The "100 บาท 7 วัน" clip is a STYLE reference only (picture, gags, sfx, voice), never a story template.
If a counter helps, pick the one the topic implies (seconds until something happens, oxygen %, distance, floors, hit points, hours awake, score) — or no counter at all.
Teasing narrator who talks to the viewer, real facts where the situation touches real science/rules (with sources in facts), escalating trouble, one twist, two slapstick/visual gags, a cheeky ending that loops back. Never mock real people or groups: the joke is on the situation.`,
      beats: `SIMULATION PICTURE: actors react on every line (double-takes, panic runs, falls), two cartoon gags (e.g. a hit with bam "ป๊าบ!" + spin + dizzy + a loud sfx, a boing double-take) each followed by pause_after ≈ 1.0;
recorded library sfx wherever the picture shows them, and a quiet bed for the place. Use the HUD only when the story really counts something the topic implies (a timer, O2, distance, floors) — never money unless the topic is about money; otherwise beats.hud = null.`,
      cast: 'SIMULATION SETS: the places the topic names, in rich lived-in detail; props are the objects the story actually uses or that cause the gags. One support character per gag (a bystander, an animal, a creature that watches).',
      long: 'One chapter per stage of the situation (arrival, first problem, failed fix, escalation, twist, the wild attempt, the ending), each with its own gag and sfx moments; the final chapter delivers the answer to the what-if and loops back.',
    },
    history: {
      id: 'history', name: 'ประวัติศาสตร์ และตำนาน', short: 'ประวัติศาสตร์', icon: '🏺', hue: 'accent',
      tagline: 'เหตุการณ์จริงหรือตำนานดัง เล่าแบบลุ้นทุกวินาที มีปี มีหลักฐาน แยกตำนานออกจากข้อเท็จจริง',
      examples: ['คำสาปฟาโรห์ตุตันคาเมน', 'ทำไมกรุงศรีอยุธยาถึงแตก', 'ใครสร้างพีระมิดกันแน่', 'แม่นาคพระโขนง เรื่องจริงหรือตำนาน', 'ค้อนของธอร์'],
      placeholder: 'เช่น ความลับของมัมมี่ที่ไม่มีใครบอก', cta: 'auto', demo: 'SAMPLE',
      writer: 'a history-and-legend storyteller who turns one real event or legend into a cliffhanger story (like the channel\'s Pharaoh\'s-curse clip)',
      pitch: `GENRE = HISTORY & LEGEND. Teach something TRUE about the event or legend: real names, places and dates with real sources (Herodotus, Carter's diary 1922, พงศาวดาร, museum and university sources).
Myths are told as myths ("ตามตำนาน…"), never as history; when versions disagree say which one is used; when the popular story is wrong, show the evidence.`,
      beats: 'HISTORY PICTURE: years and places as cards, every person labelled the first time, newspaper/manuscript insets for documents, dramatic themed transitions (sandstorm, goldflash, lightning, stonecrack) at story turns, at most one light gag.',
      cast: 'HISTORY SETS: period-correct costumes from the LPC catalog and the real places of the era (tombs, palaces, temples, battlefields, old cities), lit by visible sources (torches, sun, lamps).',
      long: 'Background and stakes → the event step by step → the turning point → aftermath → what historians/archaeologists found later → the legacy today; include one "ตำนาน vs หลักฐาน" chapter.',
    },
  };
  App.GENRE_ORDER = ['science', 'sim', 'history'];
  // projects made before genres existed were myth/history Shorts
  App.genre = (id) => App.GENRES[id || (App.st.project && App.st.project.genre)] || App.GENRES.history;

  // the house quality bar every genre is held to, with real excerpts of the reference clip as format examples
  App.qualityBar = function (what) {
    const R = window.LSE && LSE.B100;
    const bar = `HOUSE QUALITY BAR — every clip must match the CRAFT of the channel's reference clip "100 บาท 7 วัน" (picture, gags, sound, voice pacing). It is a STYLE reference only:
never borrow its topic or devices — no money/baht/prices/budget, no day-and-money counter, no Bangkok-poverty setting — unless the user's topic itself is about that.
- script: one continuous story told fast and clear by one narrator (~17 Thai characters per second), every row a new picture that shows exactly what is said, natural spoken Thai with connectors, numbers said plainly;
- picture: dense lived-in sets (8-15 prims, 2-4 lights on visible sources, a multi-stop sky, at least 5 kinds of ambient life, foreground pieces), actors act on every line (moves/cues pinned to spoken words), props appear on the word that names them, names get labels;
- sound: an sfx for everything that happens on screen (recorded library first), a quiet bed for places (traffic/rain/fan), counter pops, one big punchline hit (loud) when there is a gag.`;
    if (!R) return bar;
    // rows without the money counter: the examples teach picture/gag/sfx density, not the reference's subject
    const rows = [5, 10, 12].map((i) => { const r = Object.assign({}, R.beats.rows[i]); delete r.hud; return r; });
    if (what === 'beats') return bar + `\nEXAMPLE ROWS FROM THE REFERENCE CLIP — copy only the FORM (how cues, gags, pause_after, sfx and captions follow the spoken words); its subject (money, rice, Bangkok) is irrelevant to the new clip:\n${JSON.stringify(rows)}`;
    if (what === 'scene') { const s = R.scenes.find((x) => x.id === 's4') || R.scenes[0]; return bar + `\nEXAMPLE SCENE SPEC FROM THE REFERENCE CLIP (match this density and life — design your own places):\n${JSON.stringify({ name: s.name, spec: s.spec })}`; }
    return bar;
  };
})();
