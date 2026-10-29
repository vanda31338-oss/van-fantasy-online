// Prompts sent to Claude from the page. sample is memoryless: every call carries rules + data + JSON format.
(function () {
  const App = window.App;
  const C = (App.Claude = {});

  const SCENE_DSL = `SCENE SPEC (portrait 270x480 px art; x is the screen position 0..270 with 135 = centre (layers extend 24 px beyond each side for parallax); y grows down).
Ground line y 266-280 (characters stand on it). Captions cover y 298-355, title y 62-96: keep focal objects between y 100 and 290.
{"sky":{"top":"#hex","bottom":"#hex","bands":6},
 "light":{"x":n,"y":n,"radius":120-200,"color":"#hex","dark":0.4-0.75}  // MUST sit on a visible source (torch, moon, window, fire, magic)
 "far":[prim], "mid":[prim], "near":[prim],
 "ground":{"y":274,"color":"#hex","far":"#hex","texture":"sand|stone|tiles|grass|water|wood","prims":[prim]},
 "ambient":[{"type":"dust|fog|stars|bats|waves|sand|rain|embers|ash|snow|drips|eyes|fireflies|magic|train|traffic|steam|fan|birds|rainwin|flies|leaves|rays","count":n,"color":"#hex","y":n,"y0":n,"y1":n,"x":n,"xs":[x..],"period":seconds,"rows":[row indexes where it shows, optional]}],
 "sky":{"top":"#hex","bottom":"#hex"} or {"stops":[[0,"#hex"],[0.6,"#hex"],[1,"#hex"]]} (dusk/morning), "lights":[{x,y,radius,color,dark 0..0.7}] (one per visible lamp/window/sun; dark 0 for daylight), "reflect":{"y":waterline,"h":px} for water}
prim = {"p":name,...}; y of standing things = their base:
 rect{x,y,w,h,color} hills|dunes|mountains{y,amp,color,edge,shade} pyramid{x,y,w,h,color,shade,door,cap}
 obelisk{x,y,h,w,color} columns{xs:[x..],y,h,w,style:"greek|egypt|gothic",color,band,lintel,broken}
 wall{y,h,color,color2,pattern:"brick|block"} hieroglyphs{y,h,color,bg} arch|door{x,y,w,h,color,inner,glow}
 window{x,y,w,h,color,glass,lit} stalactites{y,len,color} rocks{w,color,edge} trees{xs,y,h,kind:"palm|pine|dead",color,trunk}
 castle{x,y,w,h,color,lit} temple{x,y,w,h,color} moon|sun{x,y,r,color,glow} clouds{y,count,color} sea{y,color,color2}
 statue{x,y,h,color,pose:"scream"} sarcophagus{x,y,w,h,color,color2} coffin{x,y,w,h,color,cross} mummycase{x,y,w,color,linen}(มัมมี่นอนในตู้กระจก) chest{x,y,color,gold,open}
 urn{x,y,color,head} torch{x,y} candles{x,y,count,color} skulls{x,y,count} cobweb{x,y,size,corner:"left|right"} chains{x,y,len,color}
 banner{x,y,w,h,color,emblem} stairs{x,y,w,steps,color} gold{x,y,w} tent{x,y,w,h,color} bed{x,y,w,color,sheet}
 lamp{x,y,h,color,lit} papers{x,y,count} desk{x,y,w,color} seal{x,y,w,h,color,frame} (plastered tomb door with seal stamps) prop{ref:"<prop card id>",x,y}
 modern / Thai life (lit parts glow in the dark automatically): skyline{y,h,color,color2,litp,landmark:{x,h}} bts{y,ground,step} road{y0,y1,y | near:true,y0,lanes} powerlines{xs,y,ground,count}
 shophouse{x,y,units,uw,gf,fh,floors,color,shops:["grocery|open|shut"],signs:[{unit,text:"ไทยสั้นๆ",bg,color,size}],vsigns:[{unit,text,bg,neon,blink}]} sign{x,y,w,h,text,bg,color,neon,blink}
 streetlamp{x,y,h} cart{x,y,text} busstop{x,y} bins{x,y} cat{x,y} moto{x,y,color} junkshop{x,y,w,h,text} stilthouse{x,y(waterline),w,h,color,roof,ladder} morningglory{x,y,w} boat{x,y,w}
 fence{x,y,w,h,kind:"chain|block",vine} window2{x,y,w,h,curtain,view} bulb{x,y,top} mattress{x,y,w} standfan{x,y,h} calendar{x,y} bucket{x,y} shelf{x,y,w} ricecooker{x,y} clothesrail{x,y,w,n} drawers{x,y} lowtable{x,y} poster{x,y} clock{x,y} gecko{x,y} conduit{path:[[x0,y0,x1,y1]],switch:[x,y]} stain{x,y,w,h,n,color} slippers{x,y} coil{x,y}
 wat{x,y,w} (Thai temple hall) chedi{x,y,h} bigtree{x,y,h,r,color,sash} almstable{x,y,w,text} flags{x0,x1,y,sag} lotuspot{x,y,s,color} bush{x,y,w,h,flowers}
 tiny-you / giant scale (1 px ≈ 0.4 mm, a 48 px person = 2 cm; put them in ground.prims so the ground fill does not cover them): fabric{y,color,color2,folds:[{x,w,h}],pattern,seam} (pillow / blanket hills) bededge{x,y,color,side} (mattress cliff with the floor far below) giantwood{y,color,seams:[x..]} (giant floor planks) giantwall{y,color,board,socket} (plaster wall, baseboard, power socket) slipper{x,y,w,color,arch,archw,archh} (flip-flop with a strap arch to hide under) fanbase{x,y,r} cord{pts,t} dustbunny{x,y,s} crumbs{x0,x1,y,n}
 ambient for these: windstreak{y0,y1,count,dir,period} (fan storm) bigdrops{x0,x1,y0,ground,count,s} (water drops a quarter of your height) flood{y,h,alpha,color} (water surface over the feet); beats.loopCut:true lets the last row end in another place than row 0
 city chaos / heaven (hand-made house prims): mall{x,y,w,h,sign,signcolor,glass,b1,b2} (glass shopping mall with a lit name board) planter{x,y,w,flower} bench{x,y} fountain{x,y,w} parasol{x,y,color,text} condo{x,y,w,fh,floors,cols,color,open:{floor,col},numbers,numbers0} (balcony tower; the open room is lit, its sill = the ground line when y = ground + fh*(floors-open.floor-1)+10) cloudhole{x,y,r,cloud} (sky torn open by heavenly light) brokenpole{x,y,h,lean} debris{x0,x1,y,n}
 ambient for these: smoke{x,y,h,count,s,drift} zap{x,y,period,bolts} (electric arcs) feathers{count,y0,y1,colors} (coloured feathers drifting down) heaven{x,y,r,y1} (breathing holy glow + beams)
 sea / island / space (hand-made house prims): ocean{y,y1,color,color2,sunx} (open sea from horizon to shore, sun glitter) islet{y,xs,ws,hs,color} (distant islands) signhill{x,y,w,h,text} (hill with white letters, e.g. PATTAYA CITY)
 shore{y,h,color} palm2{x,y,h,lean,color,dark,lite,trunk} (detailed coconut palm) wreck{x,y,w} (wrecked wooden boat) hut{x,y,w,h} (thatched hut) campfire{x,y} coconuts{x,y,n} shells{x,y,w,n} beachgrass{x,y,n} sanddetail{y0,weed,patches,steps:[x0,y0,x1,y1]} driftwood{x,y,w} bottle{x,y}
 jungle{y,h,color,color2,rim,rimx,count,side} (layered night foliage lit on the side facing rimx) undergrowth{y0,color,rim,rimx,count} portal{x,y,r,ground} (glowing warp ring) lightpool{x,y,rx,ry,color} tunnel{x,y} (warp tunnel backdrop)
 earth{x,y,r} (Earth seen from space) moonhills{y,amp,color,craters} regolith{y0,color,craters} crater{x,y,w,h,color} boulder{x,y,s,color} footprints{x0,x1,y0,y1,n,color}
 ambient for these: surf{y,amp} glitter{x0,x1,y0,y1} flame{x,y} crab{x0,x1,y} portal{x,y,r} warp{x,y,count} meteor{x,y} lowdust{y,x0,x1} wake{y0,y1,x,y} (speed streaks + boat wake) spray{x,y} parasail{y,boatY}
 put foreground pieces (pots, plants, slippers) in "near" at y 330-380 so the area under the captions is not empty
Rules: everything belongs to the place; light comes from a visible source; nothing floats without a reason: buildings in "far" stand on the horizon (outdoor scenes get a land plane from the highest far base down to the ground line, so put pyramids/temples/castles' y within 30 px above ground.y), standing props sit exactly on their y; 3 depth layers + ground + ambient life; frame the main subject around x 135.
HOUSE LOOK (default unless the channel style says otherwise — match the craft of the "100 บาท 7 วัน" project, not its places): a dense, lived-in set built from many prims (8-15), not a few big shapes;
2-4 "lights" placed on visible sources (lamp, shop, window, sun) and lit parts that glow (windows, signs, bulbs); a multi-stop sky; Thai text on signs where it fits the place;
foreground pieces in "near" at y 330-380; at least 5 ambient life types per scene so something always moves (walkers, traffic/train/motopass/longtail, ripples/sparkle on water,
sway/leaves/bunting in wind, steam/smoke, flies/fireflies/dragonfly/birds, crawler, ledsign, clouddrift, plane); interiors get small stories (stains, a gecko, slippers, a poster).`;

  // how the house props were drawn: shapes back to front, every part with its own light and shadow tones, auto outline
  const DRAW_RULES = () => `DRAW = {"w":W,"h":H,"outline":"#0b0a12","ops":[[op,…],…]} — a pixel drawing made of shapes painted in order (later ops cover earlier ones), integer coordinates, (0,0) = top-left:
 ["rect",x,y,w,h,"#hex"] ["ellipse",cx,cy,rx,ry,"#hex"] ["circle",cx,cy,r,"#hex"] ["poly",[[x,y],[x,y],[x,y],…],"#hex"] ["line",x0,y0,x1,y1,"#hex"] ["px",x,y,"#hex"] ["dots",[[x,y],…],"#hex"] ["clear",x,y,w,h]
 "outline" adds a 1-px rim around everything at the end (use the darkest palette colour; null = none).
HOW TO DRAW LIKE THE HOUSE REFERENCE CLIP:
 1. block in each part with its base colour (big shapes first), 2. add the LIGHT tone on the top/left edge of every part (light comes from the top-left) and the SHADOW tone on the bottom/right,
 3. 3-4 tones per material (e.g. cloth #b5b0a5 → #d8d2c4 → #f2efe6), never one flat colour per part, 4. small tell-tale details as px/dots/lines (labels, stitches, rivets, a glint #ffffff, a highlight streak),
 5. a readable silhouette at 1x — exaggerate the shape that tells what it is, 6. proportions against a 48-px-tall human, 7. use only colours from the project palette.
WORKED EXAMPLES from the reference clip (copy the technique, not the objects): ${JSON.stringify((App.DRAW_EXAMPLES || []).map((e) => ({ what: e.brief, draw: e.draw })))}`;
  C.DRAW_RULES = DRAW_RULES;
  const VISUAL = { tier: 'complex', effort: 'high' }; // drawing, card edits and the review pass run on the most capable tier

  function ctxBlock() {
    const ch = App.projChannel(); const p = App.st.project || {};
    const vs = App.voiceStyle(ch);
    return `CHANNEL: ${ch.name}\nGENRE: ${App.genre(p.genre).name} (${App.genre(p.genre).id})\nSTYLE NOTES (always follow): ${ch.style || ''}\nNARRATION STYLE (the voice line wording must fit it): ${vs.style || ''}\nLANGUAGE: all viewer-facing text in natural Thai.\nTOPIC: ${p.topic || ''}`;
  }
  C.ctxBlock = ctxBlock;

  // ---- core call with validation + one retry ----
  C.call = async function (prompt, validate, opts) {
    const sample = App.caps.sample;
    if (!sample) { const e = new Error('ใช้ Claude ในหน้านี้ไม่ได้ (ความสามารถ sample ไม่พร้อม) — เปิดอาร์ติแฟกต์ใน claude.ai แล้วอนุญาต Claude'); e.code = 'no_sample'; throw e; }
    opts = opts || {};
    const o = { modelTier: opts.tier || 'default' };
    if (opts.effort) o.effort = opts.effort;
    if (opts.onText) o.onText = opts.onText;
    if (opts.signal) o.signal = opts.signal;
    if (opts.tools) o.tools = opts.tools; else o.cache = false;
    if (opts.images) o.images = opts.images;
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const p = attempt === 0 ? prompt : prompt + `\n\nYOUR PREVIOUS ANSWER WAS REJECTED: ${lastErr}\nReply again with ONLY the corrected JSON.`;
      let val;
      try { val = await sample.json(p, o); }
      catch (e) { if (e && e.code === 'invalid_json' && attempt === 0) { lastErr = 'not valid JSON'; continue; } throw e; }
      const err = validate ? validate(val) : null;
      if (!err) return val;
      lastErr = err;
    }
    const e = new Error('คำตอบของ Claude ไม่ผ่านการตรวจ: ' + lastErr); e.code = 'bad_shape'; throw e;
  };

  // ---------- 1) pitch ----------
  const PITCH_FMT = `{"title":"2-4 Thai words, curiosity-driven","angle":"the single most surprising TRUE idea, as cause -> effect",
"beats":["5-7 short Thai beats in order"],"payoff":"what the viewer gains / learns",
"hook":"opening line (spoken at 0s, Thai)","bridge":"last line that flows into the hook","loop_read":"bridge + hook read as one Thai sentence",
"facts":[{"claim":"Thai","source":"tradition/author/date e.g. Ovid Metamorphoses IV; Bram Stoker 1897; Herodotus","confidence":"สูง|กลาง|ต่ำ","note":"which version is used / where versions disagree"}],
"culture":"greek|egypt|norse|gothic|asian|thai|other","cta":"like|share|subscribe","cta_reason":"why this action fits the emotion"}`;
  C.pitch = function (topic, opts, onText) {
    const ch = App.projChannel(); const len = opts.len || ch.duration[1];
    const G = App.genre((App.st.project || {}).genre);
    const prompt = `STORY PITCH TASK. You are ${G.writer}, making ${len}-second vertical cliffhanger Shorts.
${ctxBlock()}
${G.pitch}
TOPIC FROM USER: ${topic}
TARGET LENGTH: ${len} s. CTA PREFERENCE: ${opts.cta || ch.cta || 'auto'} (auto = you choose the one that fits best).
STORYTELLING (most important): tell ONE story in time order that an ordinary viewer can follow on first watch — one main character the viewer follows, plain everyday Thai, each beat causes the next (เพราะ… จึง… แต่… จนกระทั่ง…), no jumping between unrelated facts, every name explained in a few words the first time (e.g. "นักโบราณคดีชื่อคาร์เตอร์"), one clear twist and a satisfying payoff. If the topic is complex, simplify it into this single line rather than listing facts.
Rules: everything told as fact is TRUE and sourced; whatever is legend, estimate or dramatisation is said to be so.
Hook line must work at second 0 and the bridge must end so that bridge + hook
read as ONE natural Thai sentence (e.g. "…และนั่นคือเหตุผลที่" + "เดรากูล่าต้องดื่มเลือดทุกคืน..." or "…จนเหลือคำถามเดิมว่า" + "ถ้าคุณมีแค่ร้อยบาท…"). No commands to the viewer in the bridge
(no จำไว้, อย่าลืม, รอบหน้า). Give 3-6 fact-check items with real sources.
Reply with ONLY this JSON:\n${PITCH_FMT}`;
    return C.call(prompt, C.vPitch, { tier: 'complex', onText });
  };
  C.vPitch = (v) => { if (!v || typeof v !== 'object') return 'not an object'; for (const k of ['title', 'angle', 'hook', 'bridge']) if (!v[k] || typeof v[k] !== 'string') return 'missing ' + k; if (!Array.isArray(v.beats) || v.beats.length < 4) return 'beats must have 5-7 items'; if (!Array.isArray(v.facts) || !v.facts.length) return 'facts missing'; return null; };

  // generic edit: current JSON + user's note -> same schema
  C.edit = function (what, current, note, fmt, validate, tier, extra, images, effort) {
    const prompt = `You are editing the ${what} of a Thai ${App.genre((App.st.project || {}).genre).short} Short. Apply the user's request and change NOTHING else.
${ctxBlock()}
${extra || ''}
CURRENT (JSON):\n${JSON.stringify(current)}\n
USER'S REQUEST (Thai): ${note}
Return the COMPLETE revised object in exactly the same JSON shape${fmt ? ':\n' + fmt : ''}. Reply with ONLY the JSON.`;
    return C.call(prompt, validate, { tier: tier || 'default', images: images || undefined, effort });
  };
  C.PITCH_FMT = PITCH_FMT;

  // ---------- 2) cast & set ----------
  const CAST_FMT = `{"elements":[
 {"id":"c1","kind":"char","name":"Thai","role":"role in the story (Thai)","look":"1 line: how it looks and why (Thai)","type":"lpc",
  "recipe":{"body":"male|female|muscular","skin":"<body palette variant>","skinFx":"none|bandage|stone|gold|shadow|scales|ghost","layers":[{"id":"<catalog id>","v":"<variant if listed>","colors":{"color_1":"<material variant>"},"tint":null,"dy":0}]} (tint "#hex" re-dyes one layer in any colour, e.g. every person's wings a different hue; dy shifts a layer up/down, e.g. three wing layers at dy -21/-6/9 = a six-winged angel; "pad":24 gives big extra wings room; "aura":{"color":"#hex","r":30} on the card = a glowing hero; overlay templates "helmet" (rider half-helmet, colors a/b) and "halo")
  "action":"slash|thrust|spellcast|shoot|hurt|jump|emote|walk|run","scale":1,
  "overlays":[{"template":"nemes|snakes|laurel|pschent","colors":{"a":"#hex","b":"#hex"},"z":130} OR {"what":"custom head gear to draw (English)","z":130,"dy":-2}]},
 {"id":"c2","kind":"char","type":"creature","name":"..","role":"..","look":"..","action":"..","w":48,"h":40,"draw":"what the creature looks like (English, precise)"},
 {"id":"p1","kind":"prop","name":"..","role":"..","look":"..","motion":"float|glint|flicker|spin|pulse|none","w":24,"h":24,"draw":"precise drawing brief (English)","library":"<library id to reuse or null>"}],
"scenes":[{"id":"s1","kind":"scene","name":"Thai","role":"..","look":"..","spec":{SCENE SPEC}}],
"proportions":[{"name":"..","height_px":48,"why":".."}],
"palette":["24-40 #hex colours that will become the locked project palette"]}`;
  C.CAST_FMT = CAST_FMT;
  C.lpcTools = function () {
    return [
      { name: 'searchCatalog', description: 'Search the LPC layer catalog. Returns up to 25 matching layers with id, name, category, bodies, variants or recolour channels.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, execute: (i) => LSE.LPC.search(String(i.query || '')) },
      { name: 'listVariants', description: 'List the exact variants (or recolour options per channel) of one catalog layer id.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, execute: (i) => LSE.LPC.variantsOf(String(i.id || '')) },
    ];
  };
  function lpcBlock() {
    const mv = LSE.LPC.materialVariants();
    return `LPC CATALOG (id|name|category|bodies|variants or recolour channels=material|matchbody). Pick ONLY ids from here; a character needs "body" + one head + clothes:
${LSE.LPC.promptIndex()}
MATERIAL VARIANTS (for "colors" and "skin"): ${Object.entries(mv).map(([m, v]) => m + ': ' + v.join('/')).join(' ; ')}
LPC humans are ~48 px tall at 1x. Giants/monsters/props keep believable ratios (write the proportions table).`;
  }
  C.lpcBlock = lpcBlock;
  C.cast = function (pitch, onText) {
    const lib = Object.entries(App.st.library || {}).filter(([, l]) => l.kind !== 'scene').map(([id, l]) => `${id}: ${l.name} (${l.kind})`).join('\n') || '(empty)';
    const sceneLib = App.sceneLibrary().map(([id, l]) => `${id}: ${l.name} — ${l.look || ''}`).join('\n') || '(empty)';
    const ch = App.projChannel();
    const G = App.genre((App.st.project || {}).genre);
    const prompt = `You are the art director + master pixel artist of a pixel-art ${G.short} Short.
${ctxBlock()}
${G.cast}
APPROVED PITCH: ${JSON.stringify(pitch)}
Propose at most 7 main elements and 3-5 scenes (one per place the story actually visits). They must be the REAL people, beings and objects the pitch's story names (e.g. the explorer who opened the tomb, the lord who paid for it, the newspaper that spread the rumour), dressed for their era and culture, and the scenes are the real places the story visits, in story order — never generic stand-ins unrelated to the narration.
Humanoids are LPC characters built from the catalog below (recipes). Clothes must be real catalog layers that fit the body (never fake clothes with overlays). Body materials go in recipe.skinFx: a mummy = bandage (no torso bandage layer needed), a petrified victim = stone, a golden idol = gold, a shade/ghost = shadow or ghost, a naga/lizard skin = scales. Head gear LPC lacks uses a fitted template when one exists — nemes (pharaoh headcloth), snakes (Medusa hair), laurel (Greek wreath), pschent (double crown) — these are built from the head's own pixels every frame so they always sit right; only other head gear is a custom "what" overlay; whole non-human beings are "creature" elements; props are pixel-map props. Prefer reusing PIXEL LIBRARY items before drawing new ones.
PIXEL LIBRARY:\n${lib}
SCENE LIBRARY (finished sets from earlier clips; when the story visits a matching place, reuse one as {"id":"s1","kind":"scene","library":"<id>","name":"..","role":".."} without a spec — it is copied exactly; otherwise design a new set):\n${sceneLib}
CHANNEL MASTER PALETTE (keep the tone of the channel): ${ch.palette.join(' ')}
${lpcBlock()}
${SCENE_DSL}
${App.qualityBar('scene')}
Reply with ONLY this JSON:\n${CAST_FMT}`;
    return C.call(prompt, C.vCast, { tier: 'complex', onText, tools: C.lpcTools() });
  };
  C.vCast = (v) => {
    if (!v || !Array.isArray(v.elements) || !Array.isArray(v.scenes)) return 'need elements[] and scenes[]';
    if (v.elements.length > 7) return 'at most 7 elements';
    if (v.scenes.length < 2 || v.scenes.length > 5) return '3-5 scenes';
    return C.vElements(v.elements) || (v.scenes.some((s) => !s.id || !(s.spec || (s.library && App.st.library[s.library]))) ? 'scene without id/spec (or a valid SCENE LIBRARY id)' : null);
  };
  C.vElements = (elements) => {
    const cat = LSE.LPC.catalog;
    for (const e of elements) {
      if (!e.id || !e.name) return 'element without id/name';
      if (e.kind === 'char' && e.type !== 'creature') {
        if (!e.recipe || !Array.isArray(e.recipe.layers)) return `${e.id}: recipe.layers missing`;
        const bad = e.recipe.layers.filter((l) => !cat.items[l.id]).map((l) => l.id);
        if (bad.length) return `${e.id}: unknown catalog ids ${bad.join(',')} — use only ids from the catalog`;
        if (!e.recipe.layers.some((l) => l.id === 'body' || cat.items[l.id].c === 'body')) return `${e.id}: recipe needs a body layer`;
      }
    }
    return null;
  };

  // pixel drawing calls (default tier)
  const vDraw = (d) => LSE.Pixel.validateOps(d);
  C.drawProp = function (el, palette) {
    const prompt = `You are a master pixel artist. Draw ONE prop for a pixel-art Short with shapes.
${ctxBlock()}
PROP: ${el.name} — ${el.look || ''}. Brief: ${el.draw || el.look || el.name}. Size about ${el.w || 24}x${el.h || 24} px (max 96).
PROJECT PALETTE: ${palette.join(' ')}
${DRAW_RULES()}
Reply with ONLY: {"draw":DRAW}`;
    return C.call(prompt, (v) => (!v || !v.draw ? 'need draw' : vDraw(v.draw)), VISUAL);
  };
  C.drawOverlay = function (el, ov, palette) {
    const prompt = `You are a master pixel artist. Draw an OVERLAY that sits on an LPC character's head (LPC head ≈ 18 px wide, 21 px tall, top of head = overlay top) in 3 views, with shapes.
${ctxBlock()}
CHARACTER: ${el.name} — ${el.look || ''}. OVERLAY: ${ov.what}.
Views: "s" = facing the viewer (leave the face visible unless the brief covers it), "n" = back of head, "e" = facing right (profile). (West is mirrored automatically.)
Each view 14-30 px wide, 10-34 px tall; the overlay is centred on the head and its top row aligns with the top of the head.
PROJECT PALETTE: ${palette.join(' ')}
${DRAW_RULES()}
Reply with ONLY: {"dirs":{"s":DRAW,"n":DRAW,"e":DRAW}}`;
    return C.call(prompt, (v) => { if (!v || !v.dirs) return 'need dirs'; for (const k of ['s', 'n', 'e']) { const e = v.dirs[k] && v.dirs[k].ops ? vDraw(v.dirs[k]) : LSE.Pixel.validate(v.dirs[k]); if (e) return k + ': ' + e; } return null; }, VISUAL);
  };
  const FRAMES_FMT = `{"w":W,"h":H,"outline":"#0b0a12","base":[ops of the whole body],"idle":[{"dx":0,"dy":0,"ops":[changes drawn on top]},…2-4 frames],"action":[{"dx":0,"dy":0,"ops":[…]},…3-6 frames]}
(each frame = the base shifted by dx,dy + that frame's own ops on top: move a limb, open the mouth, a swipe trail; same ops format as DRAW)`;
  C.FRAMES_FMT = FRAMES_FMT;
  const vFrames = (f) => { if (!f || !Array.isArray(f.base) || !Array.isArray(f.idle) || !f.idle.length) return 'need base + idle frames'; return vDraw({ w: f.w, h: f.h, ops: f.base }); };
  C.drawCreature = function (el, palette) {
    const prompt = `You are a master pixel artist. Draw a whole creature as small animated frame sets for a pixel-art Short (LPC humans are 48 px tall; keep believable proportions), with shapes.
${ctxBlock()}
CREATURE: ${el.name} — ${el.look || ''}. Brief: ${el.draw || el.look}. Story action: ${el.action || 'attack'}. Size about ${el.w || 48}x${el.h || 48} px (max 96). Facing right (east).
PROJECT PALETTE: ${palette.join(' ')}
${DRAW_RULES()}
FRAMES = ${FRAMES_FMT}
Idle = breathing/bob (dy 0/-1) with a blink or a tail flick; action = anticipation -> strike -> recover.
Reply with ONLY: {"frames":FRAMES,"facing":"e"}`;
    return C.call(prompt, (v) => (!v ? 'need frames' : vFrames(v.frames)), VISUAL);
  };
  C.editCard = function (card, note, palette, images) {
    const kind = card.kind === 'scene' ? 'scene' : card.type === 'creature' ? 'creature' : card.kind === 'prop' ? 'prop' : 'character';
    const drawn = kind === 'prop' || kind === 'creature';
    const extra = (kind === 'character' ? lpcBlock() : '') + (kind === 'scene' ? SCENE_DSL + '\n' + App.qualityBar('scene') : '') + (drawn ? DRAW_RULES() + (kind === 'creature' ? '\nFRAMES = ' + FRAMES_FMT : '') : '') + `\nPROJECT PALETTE: ${palette.join(' ')}\n` +
      (kind === 'prop' ? 'If the request changes how the prop LOOKS, return the whole new drawing as "art" (DRAW).' : kind === 'creature' ? 'If the request changes how the creature LOOKS, return the whole new animation as "artFrames" (FRAMES).' : kind === 'character' ? 'If the request changes an overlay\'s look, set "redraw": true (we redraw the overlay).' : '');
    const slim = App.clone(card); delete slim.frames; if (card.art || card.artFrames || !(card.kind === 'prop' && card.map && card.map.rows.length <= 64)) delete slim.map; if (slim.recipe) slim.recipe.overlays = (slim.recipe.overlays || []).map((o) => ({ what: o.what, z: o.z, dy: o.dy }));
    return C.edit('card "' + card.name + '" (' + kind + ')', slim, note, null, (v) => (!v || !v.id ? 'need the same object with id' : v.art ? vDraw(v.art) : v.artFrames ? vFrames(v.artFrames) : null), VISUAL.tier, extra + (images ? '\nThe attached image shows how the card renders now.' : ''), images, VISUAL.effort);
  };

  // the review pass: Claude looks at how its own card renders and fixes what falls short (the way the reference clip was made)
  C.polish = function (card, images, palette, note) {
    const kind = card.kind === 'scene' ? 'scene' : card.type === 'creature' ? 'creature' : card.kind === 'prop' ? 'prop' : 'character';
    const G = App.genre((App.st.project || {}).genre);
    const cur = kind === 'prop' ? { art: card.art || null, map: card.art ? undefined : card.map } : kind === 'creature' ? { artFrames: card.artFrames || null } : kind === 'scene' ? { spec: card.spec } : { recipe: Object.assign({}, card.recipe, { overlays: ((card.recipe && card.recipe.overlays) || []).map((o) => ({ template: o.template, what: o.what })) }) };
    const key = { prop: '"art":DRAW', creature: '"artFrames":FRAMES', scene: '"spec":SCENE SPEC', character: '"recipe":RECIPE (same shape: body, skin, skinFx, layers[{id,v,colors}])' }[kind];
    const check = {
      prop: 'readable at 1x (image 2), the shape tells what it is at a glance, every part has light (top-left) and shadow tones, 3-4 tones per material, a 1-px outline, tell-tale details, right size next to the 48-px person, no stray pixels, no flat blobs, palette colours only',
      creature: 'the same as a prop, plus the frames read as motion (idle breathes, action has anticipation → strike → recover) and nothing jitters between frames',
      scene: 'a dense lived-in set (8-15 prims), clear depth (far/mid/near), lights on visible sources and lit windows/signs, a multi-stop sky, foreground pieces at y 330-380, the actors\' area (x 30-240, y 100-290 above the ground line) left readable, nothing floating, captions zone y 298-355 not cluttered with bright detail, it looks like the real place of the story',
      character: 'costume fits the era/role, colours separate from each other and from the scenes, a distinct silhouette, nothing clipping',
    }[kind];
    const prompt = `You are the art director + master pixel artist REVIEWING YOUR OWN WORK for a pixel-art ${G.short} Short. The attached image${images.length > 1 ? 's show' : ' shows'} exactly how this ${kind} renders now${kind === 'prop' || kind === 'creature' ? ' (image 1 zoomed in; image 2 at real on-screen size next to a 48-px person)' : ''}.
${ctxBlock()}
CARD: ${JSON.stringify({ id: card.id, name: card.name, role: card.role, look: card.look, brief: card.draw })}
CURRENT DATA: ${JSON.stringify(cur)}
${note ? 'THE USER\'S LATEST REQUEST (keep it satisfied): ' + note : ''}
Look hard at the image and check: ${check}. Compare with the house reference clip "100 บาท 7 วัน".
Then return an improved version that fixes every weakness you see (keep what already works; same size class).${kind === 'prop' || kind === 'creature' ? '\n' + DRAW_RULES() + (kind === 'creature' ? '\nFRAMES = ' + FRAMES_FMT : '') : kind === 'scene' ? '\n' + SCENE_DSL + '\n' + App.qualityBar('scene') : '\n' + lpcBlock()}
PROJECT PALETTE: ${palette.join(' ')}
Reply with ONLY JSON: {"ok":false,"notes":"what you improved (Thai, one short line)",${key}} — or {"ok":true,"notes":"…"} if it is already excellent.`;
    const v = (x) => { if (!x || typeof x !== 'object') return 'not an object'; if (x.ok) return null; if (kind === 'prop') return x.art ? vDraw(x.art) : 'need art'; if (kind === 'creature') return x.artFrames ? vFrames(x.artFrames) : 'need artFrames'; if (kind === 'scene') return x.spec && typeof x.spec === 'object' ? null : 'need spec'; return x.recipe && Array.isArray(x.recipe.layers) ? C.vElements([{ id: card.id, name: card.name, kind: 'char', recipe: x.recipe }]) : 'need recipe'; };
    return C.call(prompt, v, Object.assign({ images }, VISUAL, kind === 'character' ? { tools: C.lpcTools() } : {}));
  };

  // ---------- 3) beat sheet ----------
  const BEATS_FMT = `{"title":"…","bpm":100-128,"key":"C|D|E|F|G|A|B (+#/b)","scale":"hijaz|phrygian|aeolian|dorian|harmonic_minor|pent_minor|ionian|thai_pent|insen",
"rows":[{"scene":"s1","camera":{"zoom":1|2|3,"focus":"c1" or x,"pan":0,"punch_word":null,"lift":null (px above the ground to frame; focus on a flying actor follows them up automatically)},"grade":"warm|gold|cold|night|red|green",
  "moves":[{"actor":"c1","action":"idle|walk|run|slash|backslash|thrust|spellcast|shoot|hurt|jump|emote|sit|combat|fly","dir":"n|w|s|e","from":x,"to":x,"at":0..1,"at_word":null,"repeat":false,"enter":false,"y":0,"y_to":null} (y < 0 = up in the air; "fly" hovers with wings even standing still, y→y_to climbs or dives during the move)],
  "props":[{"prop":"p1","x":n,"y":0,"motion":"float|glint|flicker|spin|pulse","at_word":null}],
  "labels":[{"actor":"c1","text":"ชื่อคน (สั้น)","at_word":"…"}],"card":{"text":"ปี 1922","at_word":"1922"} or null,
  "inset":{"kind":"newspaper","headline":"พาดหัวสั้น","sub":"…","masthead":"…","at_word":"…"} or {"kind":"prop","prop":"p1","caption":"…","at_word":"…"} or null,
  "cues":[{"at_word":"…","delay":0,"actor":"c1","action":"…","dir":"…","fx":"…","sfx":"…","bam":null|"ป๊าบ!","dizzy":null|1.2,"spin":null|1,"vel":0.6,"loud":false (true = the punchline hit plays big, e.g. the slap)}],
  "pause_after":null|1.0 (seconds of silence inserted after this row's voice so a visual gag can land; use 0.8-1.3 at most once or twice),
  "caption":"line1|line2 with *keyword*","voice":"one Thai sentence","hook":{"type":"event|direction|question|fact|cut|enter","fx":"flash|shake|glitch|zoom|crack|light|rgb|scan|dark|shatter"},
  "hooks":[{"at":0.5,"type":"…","fx":"…"}],"music":"mysterious|tense|epic|sad|triumphant","sfx":["…"],
  "transition":null|"stonecrack|blooddrip|batswarm|lightning|sandstorm|glitchwipe|pixeldissolve|fireburst|waterripple|goldflash|pixelshatter" (pixelshatter = the frame breaks into flying pixel blocks: warps, glitches, teleports),
  "cta":null|"like|share|subscribe","cta_word":"ไลก์|แชร์|ซับสไครบ์",
  "hud":null or {"day":n,"money":n (= the counter VALUE in the beats.hud unit; the field is only named money),"at_word":"…"} or [ {…}, {…} ] (story counter shown under the title: day x/N and a value — the value is whatever the topic counts: seconds, O2 %, metres, a score; money ONLY when the topic is about money; each change pops with a sound — use it only when the story really counts something),
  "bed":null|"rain|fan|wind|fire|sand|traffic|surf|speedboat|breath|crowd" (quiet looping texture under the shot; recorded: traffic = city street, surf = beach, speedboat = racing boat, breath = space suit, crowd = busy plaza), "bedVel":0.2-0.6}],
"hud":null or {"days":N,"unit":"","label":"วันที่|ชั่วโมงที่|ด่าน","icon":"clock|o2|floor|coin","suffix":" วิ| %| ม."} (unit "฿" + icon coin only for a money topic) (days 0 = a plain counter such as a timer {"days":0,"unit":"","icon":"clock","suffix":" วิ"}; a row hud step {"off":true} hides it),
"yt_title":"YouTube title (Thai, ≤70 chars)","hashtags":["#…"],"description":"2-3 Thai lines about the true idea"}`;
  C.BEATS_FMT = BEATS_FMT;
  // per-row rules shared by the Short's beat sheet and every Long chapter
  C.rowRules = function () {
    return `- A new micro-hook every ~3 s: alternate types (visual event, direction/scale change of the hero, a question in the caption, a surprising fact word in *yellow*, a cut/pixel transition, a new character entering). Use row.hook + row.hooks[] (at = fraction of the row).
- Captions: ≤2 lines separated by "|", ≤22 Thai characters per line, phrases separated by spaces (each phrase pops on the beat), one *keyword* in yellow when useful.
- Voice punctuation carries the dynamics: "..." exactly once (in the hook line), "!" only on the hook and the climax line, otherwise plain sentences.
- COMEDY: one or two cartoon gags per clip where the story allows (a slapstick slap with bam:'ป๊าบ!' + spin + dizzy on the other actor + sfx 'slap', a double-take with 'boing', a sheepish emote after). Put the gag right after a punchline line and give that row pause_after ≈ 1.0 so the narrator waits for it. Keep it harmless cartoon fun, never cruelty.
- PICTURE = VOICE (most important): every row shows exactly what its voice line says at that moment. The people the line names are on screen doing what the line says; the place it names is the scene; objects it names appear when they are spoken (props[].at_word) or as a close-up (inset); dates, numbers and places appear as a card; a person's name appears as a label the first time. Pin actions to the spoken word with moves[].at_word or cues[] ({"at_word":"word in the voice line","actor":"c1","action":"spellcast","dir":"e","fx":"light","sfx":"fire"}).
- The narration is ONE continuous story told by one narrator: each line follows from the previous one with natural connectors (แล้ว, แต่, ทว่า, จนกระทั่ง, เพราะ, ส่วน, สุดท้าย), past-tense storytelling, simple words; never a list of facts.
- Camera: zoom 2 for most shots, 3 for faces/objects that matter, 1 only for a short establishing wide shot; use "pan" (art px, e.g. -40) for slow moves and "punch_word" to punch in on a key word; "grade": warm|gold|cold|night|red|green sets the colour mood of the shot.
- SFX only for things that happen in the picture (a door creaks when it opens, gold tings when it appears); at most one accent per second while the narrator speaks; no caption blips.
- Every motion gets its sound: list sfx per row (step, whoosh, hit, shimmer, flap, grind, squeak, blip, tap, glitch, sand, thunder, drip, creak, coin, heart, boom, hiss, crack, splash, slap, boing, swish, cashin, cashout, engine, bell, rain, fan; recorded library: slap, shriek (soft scream), bus (bus pulling in), merit (warm blessing shimmer), horn (soft car honk), pluck (snapping a vegetable stem), warp (portal swirl), crash (boat cracking on rock), bubble (boiling pops), alarm (low-oxygen beeps), choir (heavenly choir swell), zap (electric shock), ping (app notification), cry (comic sobbing), cough (smoke cough); beds: traffic, surf (beach waves), speedboat (engine at full throttle), breath (space-suit breathing), crowd (busy mall / market crowd); a variation is <key>_<n>, e.g. horn_2). Music follows the mood per row with one constant tempo 100-128 BPM.
- Use the channel's glitch identity (fx glitch/rgb/scan) on a few hooks and one transition, never so much that captions become hard to read.
- Actors walk between x 30 and 240, props stand on the ground (y 0 = on the ground line, negative = higher).`;
  };
  C.beats = function (pitch, cast, scenes, onText) {
    const ch = App.projChannel(); const p = App.st.project || {}; const len = (p.opts && p.opts.len) || ch.duration[1];
    const castList = cast.map((c) => `${c.id}: ${c.name} (${c.kind}${c.type === 'creature' ? '/creature' : ''}, action ${c.action || '-'})`).join('\n');
    const sceneList = scenes.map((s) => `${s.id}: ${s.name} — ${s.look || ''} (ground y ${(s.spec && s.spec.ground && s.spec.ground.y) || 274})`).join('\n');
    const G = App.genre(p.genre);
    const prompt = `You are the short-form director, editor and composer. Write the beat sheet (script + sound plan) for a ${len}-second seamlessly looping vertical ${G.short} Short.
${ctxBlock()}
${G.beats}
APPROVED PITCH: ${JSON.stringify(pitch)}
CAST:\n${castList}\nSCENES (x 0..270):\n${sceneList}
RULES
- Runtime ${ch.duration[0]}-${ch.duration[1]} s. The narrator reads ≈ ${App.voiceStyle(ch).cps} Thai characters per second (spaces not counted) → the whole script is about ${Math.round(len * App.voiceStyle(ch).cps * 0.9)} characters; ${Math.max(9, Math.round(len / 3.4))}-${Math.round(len / 2.6)} rows of 35-60 characters, ONE spoken phrase per row, each row ≈ 2.5-3.5 s so the picture changes that often.
- HOOK at 0 s: row 1 starts already in motion (a character mid-action, at=0), caption fully readable, bold visual event (hook.fx) by 0.5 s; voice line 1 = the pitch hook.
- 2-3 big themed transitions (row.transition) at story turns: never in the first 3 s, never the same twice, never within 4 s of the CTA.
- EXACTLY ONE CTA row, at 50-65% of the runtime, right after a mini "aha", tied to the story's emotion; one soft sentence using the loanword ${({ like: 'ไลก์', share: 'แชร์', subscribe: 'ซับสไครบ์' })[ (p.opts && p.opts.cta) || ch.cta] || 'ไลก์ / แชร์ / ซับสไครบ์ (pick the one that fits)'} in Thai script, never translated; no begging, guilt or urgency; not in the first 15 s, the climax, the end hook or the last 8 s. It must sound like a native Thai YouTuber talking casually: short (≤ 8 words), natural spoken word order, no translated-sounding phrases. Natural examples: "ใครเพิ่งรู้เรื่องนี้ กดไลก์ไว้เลย", "ส่งให้เพื่อนที่กลัวผีดูหน่อย กดแชร์เลย", "อยากฟังตำนานแบบนี้อีก กดซับสไครบ์ไว้นะ". Never write unnatural lines like "กดไลก์ให้ความจริงหน่อย" or "ให้ไลก์กับเรื่องนี้".
- LOOP: the last row returns to row 1's scene with the same actors, and its voice line is the bridge that row 1's voice answers (read as one Thai sentence). No commands to the viewer in the bridge.
${C.rowRules()}
${App.qualityBar('beats')}
Reply with ONLY this JSON:\n${BEATS_FMT}`;
    return C.call(prompt, (v) => C.vBeats(v, cast, scenes), { tier: 'complex', onText });
  };
  C.vBeats = (v, cast, scenes) => {
    if (!v || !Array.isArray(v.rows)) return 'need rows[]';
    if (v.rows.length < 9 || v.rows.length > 20) return 'need 12-18 rows';
    const sids = new Set((scenes || []).map((s) => s.id)); const cids = new Set((cast || []).map((c) => c.id));
    let ctas = 0;
    for (const [i, r] of v.rows.entries()) {
      if (!r.voice || !r.caption) return `row ${i + 1}: voice and caption required`;
      if (sids.size && !sids.has(r.scene)) return `row ${i + 1}: unknown scene ${r.scene}`;
      for (const m of r.moves || []) if (cids.size && !cids.has(m.actor)) return `row ${i + 1}: unknown actor ${m.actor}`;
      if (r.cta) ctas++;
    }
    if (ctas !== 1) return `exactly one CTA row required (found ${ctas})`;
    return null;
  };

  // timeline edit (step 6): same beats object, with the compiled check results for context
  C.editTimeline = function (beats, note, issues) {
    return C.edit('timeline (beat sheet: shots, motion, captions, music cues)', beats, note, BEATS_FMT, (v) => C.vBeats(v, null, null), 'complex', `CURRENT SELF-CHECK RESULTS: ${JSON.stringify(issues || [])}\nKeep the voice lines EXACTLY as they are (the voice-over is already recorded) unless the user explicitly asks to change the words.`);
  };
  // ---------- LONG video (9-10 min, built from the approved Short) ----------
  C.longPlan = function () {
    const p = App.st.project || {}; const L = p.long || {}; const st = App.longStyle(App.projChannel());
    const minutes = L.minutes || 10, n = L.chapters || 10, secs = Math.round(minutes * 60 / n);
    return { minutes, n, secs, cps: st.cps, chars: Math.round(secs * st.cps * 0.9), rows: [Math.round(secs / 4.2), Math.round(secs / 3.2)] };
  };
  const shortScript = () => ((App.st.project.beats && App.st.project.beats.rows) || []).map((r, i) => `${i + 1}. ${r.voice}`).join('\n');
  const elementList = (cards) => cards.map((c) => `${c.id}: ${c.name} (${c.kind === 'scene' ? 'scene' : c.kind + (c.type === 'creature' ? '/creature' : '')}) — ${c.look || c.role || ''}`).join('\n');
  const OUTLINE_FMT = `{"title":"Thai title of the long video","yt_title":"YouTube title (Thai, ≤90 chars)","logline":"one Thai sentence",
"chapters":[{"n":1,"title":"Thai, ≤18 characters","summary":"2-3 Thai sentences: what happens and what the viewer learns","beats":["4-6 short Thai beats in order"],
  "scenes":["s1","new:<Thai name of a new place>"],"cast":["c1","new:<Thai name>"],"cta":null|"like"|"share"|"subscribe"}],
"new_elements":[{"kind":"char|prop|scene","name":"Thai","look":"how it looks (Thai)","why":"which chapter needs it and why","chapters":[2,3]}],
"facts":[{"claim":"Thai","source":"…","confidence":"สูง|กลาง|ต่ำ","note":"…"}],"hashtags":["#…"],"description":"3-5 Thai lines for YouTube"}`;
  C.OUTLINE_FMT = OUTLINE_FMT;
  C.longOutline = function (onText) {
    const p = App.st.project; const G = App.genre(p.genre); const P = C.longPlan();
    const prompt = `LONG VIDEO OUTLINE TASK. You are ${G.writer}. Expand the approved Short below into a ${P.minutes}-minute vertical (9:16) long video for the same channel, in the same style and the same quality: ${P.n} chapters of about ${P.secs} seconds each.
${ctxBlock()}
${G.pitch}
LONG-FORM SHAPE FOR THIS GENRE: ${G.long}
APPROVED SHORT PITCH: ${JSON.stringify(p.pitch)}
THE SHORT'S SCRIPT (voice lines in order):\n${shortScript()}
EXISTING CAST AND SCENES (reuse them by id where they fit):\n${elementList(App.allCards())}
RULES
- Chapter 1 opens with the Short's own hook line (Short viewers must recognise it) and promises what this long video will reveal; then the video goes much deeper than the Short: more steps, more detail, real names, numbers and sources, side stories, higher stakes.
- Everything the Short tells appears again in more depth, plus the material the Short had no time for. One narrator, one continuous story in time order that an ordinary viewer follows easily.
- Every chapter has its own small arc (goal → problem → turn) and ends on a small cliffhanger into the next chapter. The last chapter answers the opening question and ends with a soft subscribe line.
- CTA plan: one like/share CTA in a middle chapter (chapter 3-5) and "subscribe" in the last chapter; every other chapter has cta null.
- Visual variety: most chapters need at least one place the viewer has not seen yet, or a new character/prop; list every new one in new_elements (at most 6 characters/props and 4-8 scenes) and reference it in the chapters as "new:<name>". Reuse existing ids where they fit.
- Total narration ≈ ${P.chars * P.n} Thai characters (${P.chars} per chapter).
Reply with ONLY this JSON:\n${OUTLINE_FMT}`;
    return C.call(prompt, C.vOutline, { tier: 'complex', onText });
  };
  C.vOutline = (v) => {
    const P = C.longPlan();
    if (!v || !Array.isArray(v.chapters)) return 'need chapters[]';
    if (v.chapters.length < Math.max(3, P.n - 2) || v.chapters.length > P.n + 2) return `need ${P.n} chapters`;
    for (const c of v.chapters) if (!c.title || !c.summary || !Array.isArray(c.beats)) return 'every chapter needs title, summary, beats';
    if (v.new_elements && (!Array.isArray(v.new_elements) || v.new_elements.length > 16)) return 'new_elements: at most 16';
    return null;
  };

  // the new characters, props and scenes the outline asks for (ids continue after the Short's)
  C.longCast = function (outline, onText) {
    const p = App.st.project; const G = App.genre(p.genre); const all = App.allCards();
    const next = (pre) => 1 + Math.max(0, ...all.filter((c) => new RegExp('^' + pre + '\\d+$').test(c.id)).map((c) => +c.id.slice(1)));
    const prompt = `You are the art director + master pixel artist of a pixel-art ${G.short} long video. Create the NEW elements its chapters need, in exactly the look of the existing cast and sets.
${ctxBlock()}
${G.cast}
LONG OUTLINE: ${JSON.stringify(outline.chapters.map((c) => ({ n: c.n, title: c.title, summary: c.summary, scenes: c.scenes, cast: c.cast })))}
NEW ELEMENTS REQUESTED: ${JSON.stringify(outline.new_elements || [])}
EXISTING ELEMENTS (already drawn — never recreate them; their ids are taken):\n${elementList(all)}
RULES
- Make every requested new element (you may merge duplicates or add one that is clearly missing): at most 6 characters/props and 4-8 scenes.
- New ids continue the series: characters c${next('c')}, c${next('c') + 1}…; props p${next('p')}, p${next('p') + 1}…; scenes s${next('s')}, s${next('s') + 1}….
- Same rules as the Short's cast: humanoids are LPC recipes from the catalog (real catalog clothes), creatures are pixel-drawn, props are pixel maps; scenes are dense, lived-in, lit by visible sources.
- PROJECT PALETTE (locked — use these colours): ${App.projPalette().join(' ')}
${lpcBlock()}
${SCENE_DSL}
${App.qualityBar('scene')}
Reply with ONLY this JSON (palette and proportions may be empty):\n${CAST_FMT}`;
    return C.call(prompt, (v) => C.vLongCast(v, all), { tier: 'complex', onText, tools: C.lpcTools() });
  };
  C.vLongCast = (v, all) => {
    if (!v || !Array.isArray(v.elements) || !Array.isArray(v.scenes)) return 'need elements[] and scenes[]';
    if (v.elements.length > 8) return 'at most 8 new characters/props';
    if (v.scenes.length > 10) return 'at most 10 new scenes';
    const taken = new Set(all.map((c) => c.id));
    for (const e of [...v.elements, ...v.scenes]) if (taken.has(e.id)) return `id ${e.id} is already used — continue the id series`;
    if (v.scenes.some((s) => !s.id || !s.spec)) return 'scene without id/spec';
    return C.vElements(v.elements);
  };

  // one chapter = one beat sheet in the Short's format that plays once
  C.longChapter = function (k, outline, onText) {
    const p = App.st.project; const G = App.genre(p.genre); const P = C.longPlan(); const chs = outline.chapters; const c = chs[k - 1];
    const cast = App.allCards().filter((x) => x.kind !== 'scene'), scenes = App.allCards().filter((x) => x.kind === 'scene');
    const castList = cast.map((x) => `${x.id}: ${x.name} (${x.kind}${x.type === 'creature' ? '/creature' : ''}, action ${x.action || '-'})`).join('\n');
    const sceneList = scenes.map((x) => `${x.id}: ${x.name} — ${x.look || ''} (ground y ${(x.spec && x.spec.ground && x.spec.ground.y) || 274})`).join('\n');
    const cta = c.cta ? `EXACTLY ONE CTA row in this chapter ("${c.cta}", loanword ${({ like: 'ไลก์', share: 'แชร์', subscribe: 'ซับสไครบ์' })[c.cta]} in Thai script) — a short, natural, casual Thai line after a mini "aha"${k === chs.length ? ', near the end' : ''}; never begging.` : 'NO CTA in this chapter (no "cta" field on any row).';
    const prompt = `You are the director, editor and composer. Write the beat sheet (script + sound plan) for CHAPTER ${k} of ${chs.length} ("${c.title}") of a ${P.minutes}-minute vertical ${G.short} long video. Same format, look and quality as the channel's Shorts, but this chapter plays ONCE (no loop) and flows straight into the next chapter.
${ctxBlock()}
${G.beats}
LONG VIDEO: ${outline.title || ''} — ${outline.logline || ''}
ALL CHAPTERS: ${JSON.stringify(chs.map((x) => ({ n: x.n, title: x.title, summary: x.summary })))}
THIS CHAPTER: ${JSON.stringify(c)}
THE SHORT THIS VIDEO GROWS FROM (its script, for voice and continuity):\n${shortScript()}
CAST:\n${castList}\nSCENES (x 0..270):\n${sceneList}
RULES
- About ${P.secs} s: ${P.rows[0]}-${P.rows[1]} rows of 35-60 Thai characters, ONE spoken phrase per row, about ${P.chars} characters in total (the narrator reads ≈ ${P.cps} characters per second).
- Row 1: a chapter card {"text":"ตอนที่ ${k} · <short title>" (≤24 characters),"at_word":"<first word of the line>"} and the shot already in motion.${k === 1 ? " Chapter 1's first voice line is the Short's hook line." : ' Row 1 picks up exactly where the previous chapter ended.'}
- ${k === chs.length ? 'The last row ends the whole video: answer the opening question and close warmly.' : 'The last row ends on a small cliffhanger that makes the viewer want the next chapter (no viewer commands).'}
- 1-3 big themed transitions (row.transition) inside the chapter at turns (not on row 1), never the same twice in a row.
- ${cta}
- Use the scenes and cast this chapter lists (new places first appear here with a short establishing shot).
${C.rowRules()}
${App.qualityBar('beats')}
Reply with ONLY this JSON:\n${BEATS_FMT}`;
    return C.call(prompt, (v) => C.vChapter(v, cast, scenes), { tier: 'complex', onText });
  };
  C.vChapter = (v, cast, scenes) => {
    if (!v || !Array.isArray(v.rows)) return 'need rows[]';
    if (v.rows.length < 8 || v.rows.length > 26) return 'need 12-20 rows';
    const sids = new Set((scenes || []).map((s) => s.id)); const cids = new Set((cast || []).map((c) => c.id));
    for (const [i, r] of v.rows.entries()) {
      if (!r.voice || !r.caption) return `row ${i + 1}: voice and caption required`;
      if (sids.size && !sids.has(r.scene)) return `row ${i + 1}: unknown scene ${r.scene}`;
      for (const m of r.moves || []) if (cids.size && !cids.has(m.actor)) return `row ${i + 1}: unknown actor ${m.actor}`;
    }
    if (v.rows.filter((r) => r.cta).length > 1) return 'at most one CTA row';
    return null;
  };
})();
