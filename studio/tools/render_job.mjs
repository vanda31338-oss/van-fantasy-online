// Legend Shorts Studio — server-side render job: same engine, headless Chromium (WebCodecs) -> MP4.
// usage: node render_job.mjs --dist <dir with engine.js lpc/ lib/> --project project.json [--voice voice.json] --out out.mp4 [--bitrate 3000000]
//   project.json = {"project": <projects/<pid> doc>, "cards": [<projects/<pid>/cards/* docs>]}
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import http from 'http';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const dist = path.resolve(arg('dist')); const out = path.resolve(arg('out', 'out.mp4')); const bitrate = +arg('bitrate', 3000000);
const files = { '/project.json': fs.readFileSync(arg('project')), '/voice.json': arg('voice') ? fs.readFileSync(arg('voice')) : Buffer.from('null') };
const page = `<!doctype html><meta charset=utf-8><body><script src="/lib/mp4-muxer.js"></script><script src="/lib/webm-muxer.js"></script><script src="/engine.js"></script><script>
window.RUN = async (bitrate) => {
  const P = await (await fetch('/project.json')).json(); const V = await (await fetch('/voice.json')).json();
  const p = P.project; const cards = P.cards.slice().sort((a, b) => (a.order || 0) - (b.order || 0)); const ch = p.ch || {};
  await LSE.loadFonts(); LSE.LPC.base = '/lpc/'; LSE.Audio.SFX_URL = '/sfx/library.json';
  let voice = null; if (V) { const bin = atob(V.pcm16); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const i16 = new Int16Array(u.buffer); const f = new Float32Array(i16.length); for (let i = 0; i < f.length; i++) f[i] = i16[i] / 32768; voice = { pcm: f, sr: V.sr, dur: V.dur, sentences: V.sentences }; }
  const palette = (p.palette && p.palette.length) ? p.palette : (p.castMeta && p.castMeta.palette && p.castMeta.palette.length >= 8 ? p.castMeta.palette : ch.palette);
  const rt = await LSE.buildRuntime({ cast: cards.filter((c) => c.kind !== 'scene'), scenes: cards.filter((c) => c.kind === 'scene'), beats: p.beats, palette, title: (p.pitch && p.pitch.title) || p.title, titleOn: ch.titleOn !== false, watermark: Object.assign({ text: ch.name }, ch.watermark || {}), captionColors: ch.captionColors, captionSize: ch.captionSize, voice });
  const seam = rt.renderer.seamTest();
  const { blob, ext } = await LSE.exportVideo(rt, (f, m) => console.log('PROGRESS ' + Math.round(f * 100) + ' ' + m), null, { bitrate });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'out.' + ext; document.body.append(a); a.click();
  return { L: rt.timeline.L, seam: seam.diff, ext, size: blob.size, issues: rt.timeline.issues };
};</script>`;
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' ) { res.setHeader('content-type', 'text/html'); return res.end(page); }
  if (files[u]) { res.setHeader('content-type', 'application/json'); return res.end(files[u]); }
  const f = path.join(dist, u); if (!f.startsWith(dist) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch(); const pg = await browser.newPage({ acceptDownloads: true });
pg.on('console', (m) => { const t = m.text(); if (t.startsWith('PROGRESS') && /0 /.test(t.split(' ')[1].slice(-1) + ' ')) process.stdout.write(t + '\n'); else if (m.type() === 'error') console.log('[page]', t); });
await pg.goto('http://127.0.0.1:' + port + '/');
const dl = pg.waitForEvent('download', { timeout: 900000 });
const info = await pg.evaluate((b) => window.RUN(b), bitrate);
await (await dl).saveAs(out);
console.log(JSON.stringify(Object.assign(info, { out })));
await browser.close(); srv.close();
