# Legend Shorts Studio — Claude Code job queue

The page writes jobs to its artifact database at `jobs/<id>` with `{type, pid, status:"queued", inputs, note, at}`
and shows "รอ Claude Code ทำงานนี้ – พิมพ์ 'ทำงานค้าง' ในแชต Claude Code". When the user types **ทำงานค้าง**:

1. `ArtifactData` list `jobs` on the studio artifact; take every doc with `status == "queued"`. Set each to `"working"` first.
2. Do the job (below), upload results with the Artifact tool (`url` = studio artifact, `asset: true`, `file_path`),
   then `update` the job: `{status:"done", result:{...}}` (or `{status:"error", error:"Thai message"}`).
   The page watches the job doc and continues by itself.
3. Scripts: fetch them from the artifact with Artifact `read` + `path` (`jobs/voice_job.py.txt`, `jobs/render_job.mjs.txt`)
   and save them without the `.txt` suffix. Run Python with `-I`. Needs ffmpeg, numpy, Node + Playwright (Chromium).

## voice_process  (page already generated the take + transcript)
inputs: `{audio_url, flow_id, node_id, session_ids, generation_id, lines[], words[]|null, tempo?, maxgap?, gaps?[]}`
- Download `audio_url` with curl. If it expired (403), call ElevenLabs `creative_get_flow_run_status` with
  `flow_id` + `session_ids` for a fresh URL. Never call `creative_generate_speech` again for this job.
- If `words` is null: `creative_transcribe_audio` with `connect_from:[node_id]` on `flow_id`, poll, take `transcripts[0].words`.
- `python3 -I voice_job.py --audio take.mp3 --lines lines.json --words words.json --tempo <tempo|1> --maxgap <maxgap|0> [--gap k:sec for each entry of gaps] --out voice.json`
  (tempo speeds the read up with the pitch kept, maxgap shortens pauses between words; both come from the channel's Shorts voice style)
- Upload `voice.json` as an asset (application/json). result = voice.json minus `pcm16`, plus `assetId` (32-hex id).
- `target` = `{pid, chapter}` means the take is one chapter of a Long video (tempo/maxgap are the Long pacing); processing is identical —
  the page saves the result into `projects/<pid>/long/ch<chapter>` itself. Several chapter jobs are usually queued at once: do them all.

## voice_full  (the page had no ElevenLabs connector)
inputs: `{lines[], text, voice_id, model_id, tag, tempo?, maxgap?}` — ONE `creative_generate_speech` call (`prompt`=text,
`generations_count`:1, the given voice/model), poll, then continue exactly like voice_process.

## render  (the browser could not encode MP4)
inputs: `{pid, fps, w, h}`
- Read `projects/<pid>` and list `projects/<pid>/cards`; write `{"project":…, "cards":[…]}` to project.json.
- If the project has `voice.assetId`, fetch that asset (Artifact read with `path` = the asset id) as voice.json.
- Get the engine: read published files `engine-bundle.js.txt` (save as engine.js), `lib/*.js`, `lpc/catalog.json` and
  the `lpc/*.png` sheets the cast uses (or all of them) into one folder.
- `node render_job.mjs --dist <folder> --project project.json --voice voice.json --out short.mp4 --bitrate 3000000`
  (3 Mbit/s keeps a 45 s Short under the 20 MiB asset limit).
- Upload short.mp4 as an asset; result = `{assetId}`.

## render_long  (Long video, the browser could not encode MP4)
inputs: `{pid, chapters:[n…], fps, w, h}`
- Read `projects/<pid>` (the `long` field has the outline) and list `projects/<pid>/cards` (all cards, including `scope:"long"`).
- For each chapter n: read `projects/<pid>/long/ch<n>`; project.json = `{"project": <project with beats = ch.beats plus "chapter": true and
  title = the outline's chapter title>, "cards": [...]}`; voice.json = the asset `ch.voice.assetId`; render with render_job.mjs at
  `--bitrate 2500000` (≈ 60 s per chapter stays under the 20 MiB asset limit) and upload each MP4.
- result = `{assets:[{n, assetId}]}` (in chapter order). Tell the user they can join them with
  `ffmpeg -f concat -safe 0 -i list.txt -c copy long.mp4` if they want one file.

## lpc_add  (a layer outside the curated pack)
inputs: `{query}` — find the item in the Universal LPC Spritesheet Character Generator repo, add it to
`tools/curate.py`, rebuild the pack (`tools/build_lpc.py`, `tools/anchors.py`) and republish `lpc/`.

## sfx_add  (grow the recorded sound-effect library)
inputs: `{key, prompt, desc_th}` — e.g. `{key:"door", prompt:"Old wooden door creaking open, close-mic", desc_th:"ประตูไม้เปิดเอี๊ยด"}`
- ElevenLabs `creative_generate_in_flow` with `node_type:"sfx"`, `model_id:"eleven_text_to_sound_v2"` (default 4 variations ≈ 17 credits each), poll.
- Download every variation to `sfx/<key>_<n>.mp3`; pick the default (short, clean transient, least harsh) and add it to
  `sfx/library.json` (`sounds[<key>]` = 32 kHz mono PCM16 base64, trimmed, peak −1 dB; other variations as `<key>_<n>`),
  append to `sfx/index.json`, then publish `sfx/*` with the page. The engine plays `sounds[key]` for any sfx/cue named `key`.
Current library: slap (ตบป๊าบ), shriek (กรี๊ดเบาๆ), bus (รถเมล์เข้าป้าย), merit (ได้บุญ วิ้งๆ), horn (บีบแตรเบาๆ), pluck (เด็ดผัก),
traffic (รถวิ่งในเมือง — a bed: the default is takes 3+4+1+2 crossfaded into a 3.25 s loop, use as `bed: 'traffic'`),
surf (คลื่นซัดหาด, bed), warp (ประตูวาร์ป), breath (หายใจในชุดอวกาศ, bed), alarm (เตือนออกซิเจน), speedboat (สปีดโบ๊ท, bed), crash (เรือกระแทกหัก), bubble (ฟองเดือด) — 4 variations each.
Append a new key locally with `python3 tools/sfxlib.py <key> <default_n> "<desc_th>" "<prompt>" g1,g2,g3,g4 [--bed 3,4,1,2]`
(expects assets/sfx/<key>_<n>.mp3; other keys stay untouched).
