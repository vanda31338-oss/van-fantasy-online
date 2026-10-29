"""Legend Shorts Studio — voice job: one continuous ElevenLabs take -> processed voice JSON for the page.

usage: python3 -I voice_job.py --audio take.mp3 --lines lines.json [--words words.json] [--tempo 1.15] [--maxgap 0.12] --out voice.json
  lines.json : ["sentence 1", ...]   (one per line, as sent to ElevenLabs, without the opening tag)
  words.json : ElevenLabs Scribe words [{text,start,end}] (optional; silence detection is the fallback)
Output JSON: {v, sr, n, pcm16 (base64 LE mono), dur, lufs, sentences:[{t0,t1,text,words,lu}], pauses, report}
The take stays one continuous performance (no cuts, natural pauses kept); only leading/trailing silence is
trimmed; light EQ + gentle compression evens sentence levels; loudnorm to -15 LUFS (two-pass, linear).
"""
import argparse, base64, json, re, subprocess, sys, tempfile, os
import numpy as np

SR = 32000
ap = argparse.ArgumentParser()
ap.add_argument('--audio', required=True); ap.add_argument('--lines', required=True)
ap.add_argument('--words'); ap.add_argument('--out', required=True)
ap.add_argument('--tempo', type=float, default=1.0)
ap.add_argument('--gap', action='append', default=[])  # 'k:sec' insert a silent beat after sentence k (a visual gag lands there)
ap.add_argument('--maxgap', type=float, default=0.0)  # >0: pauses between words longer than this are shortened to it (snappier read)  # >1 speeds the read up (pitch kept), e.g. 1.15 for snappy Shorts pacing
a = ap.parse_args()
lines = json.load(open(a.lines))
words = json.load(open(a.words)) if a.words else None
if words and a.tempo != 1.0:
    words = [dict(w, start=w['start'] / a.tempo, end=w['end'] / a.tempo) for w in words]

def decode(path, sr=SR):
    af = ['-af', f'atempo={a.tempo:.4f}'] if a.tempo != 1.0 else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *af, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def kweight(x, sr):
    from math import pi, sin, cos, sqrt
    def bq(x, b, a_):
        y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
        b0, b1, b2 = b; a1, a2 = a_
        for i in range(len(x)):
            v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1, y2, y1 = x1, x[i], y1, v; y[i] = v
        return y
    # use scipy-free fast path via lfilter-like vectorisation when available
    try:
        from scipy.signal import lfilter
        def bq(x, b, a_): return lfilter(b, [1, a_[0], a_[1]], x)
    except Exception:
        pass
    w = 2 * pi * 1500 / sr; A = 10 ** (4 / 40); al = sin(w) / 2 * sqrt(2); cs = cos(w)
    a0 = (A + 1) - (A - 1) * cs + 2 * sqrt(A) * al
    b = [A * ((A + 1) + (A - 1) * cs + 2 * sqrt(A) * al) / a0, -2 * A * ((A - 1) + (A + 1) * cs) / a0, A * ((A + 1) + (A - 1) * cs - 2 * sqrt(A) * al) / a0]
    y = bq(x, b, [2 * ((A - 1) - (A + 1) * cs) / a0, ((A + 1) - (A - 1) * cs - 2 * sqrt(A) * al) / a0])
    w = 2 * pi * 38 / sr; cs = cos(w); al = sin(w) / 2 / 0.5; a0 = 1 + al
    return bq(y, [(1 + cs) / 2 / a0, -(1 + cs) / a0, (1 + cs) / 2 / a0], [-2 * cs / a0, (1 - al) / a0])

def lufs(x, sr=SR):
    if len(x) < int(0.4 * sr): x = np.pad(x, (0, int(0.4 * sr) - len(x)))
    k = kweight(x.astype(np.float64), sr); blk = int(0.4 * sr); hop = int(0.1 * sr)
    p = np.array([np.mean(k[s:s + blk] ** 2) for s in range(0, len(k) - blk + 1, hop)])
    L = -0.691 + 10 * np.log10(p + 1e-12); p = p[L > -70]
    if not len(p): return -70.0
    rel = -0.691 + 10 * np.log10(p.mean()) - 10; p = p[(-0.691 + 10 * np.log10(p + 1e-12)) > rel]
    return float(-0.691 + 10 * np.log10(p.mean() + 1e-12))

x = decode(a.audio)
if words and a.maxgap > 0:  # shorten long pauses between words; word times are shifted to match
    ww = sorted([w for w in words if re.search(r'[0-9\u0E00-\u0E7FA-Za-z]', w['text']) and not w['text'].startswith('[')], key=lambda w: w['start'])
    cuts = []
    for p_, q_ in zip(ww, ww[1:]):
        g = q_['start'] - p_['end']
        if g > a.maxgap + 0.02: c0 = p_['end'] + a.maxgap / 2; cuts.append((c0, c0 + g - a.maxgap))
    if cuts:
        xf = int(0.006 * SR); parts = []; last = 0
        for c0, c1 in cuts: parts.append(x[last:int(c0 * SR)]); last = int(c1 * SR)
        parts.append(x[last:]); y_ = parts[0]
        for pt in parts[1:]:
            if len(y_) > xf and len(pt) > xf: ramp = np.linspace(0, 1, xf, dtype=np.float32); y_ = np.concatenate([y_[:-xf], y_[-xf:] * (1 - ramp) + pt[:xf] * ramp, pt[xf:]])
            else: y_ = np.concatenate([y_, pt])
        x = y_
        def shift(t):
            d = 0.0
            for c0, c1 in cuts:
                if t >= c1: d += c1 - c0
                elif t > c0: d += t - c0
            return t - d
        words = [dict(w, start=shift(w['start']), end=shift(w['end'])) for w in words]
dur0 = len(x) / SR
env = np.sqrt(np.convolve(x ** 2, np.ones(int(0.02 * SR)) / int(0.02 * SR), mode='same'))

norm = lambda s: re.sub(r"[\s.,!?…\"'“”\-]", '', s)
spans = []
if words:
    ws = [w for w in words if not re.match(r'^\[|\]$', w['text'].strip()) and not re.match(r'^[a-zA-Z,\]\[]+$', w['text'].strip()) or re.search(r'[0-9฀-๿]', w['text'])]
    ws = [w for w in ws if re.search(r'[0-9฀-๿A-Za-z]', w['text']) and not w['text'].startswith('[') and not w['text'].endswith(']')]
    acc = ''; marks = []
    for w in ws:
        nw = norm(w['text']); marks.append((len(acc), len(acc) + len(nw), w)); acc += nw
    pos = 0
    for ln in lines:
        nl = norm(ln); i = acc.find(nl[:max(1, min(6, len(nl)))], pos)
        if i < 0: spans = []; break
        j = i + len(nl)
        inw = [m[2] for m in marks if m[1] > i and m[0] < j]
        if not inw: spans = []; break
        spans.append({'t0': inw[0]['start'], 't1': inw[-1]['end'], 'words': [{'text': w['text'], 'start': w['start'], 'end': w['end']} for w in inw]})
        pos = j
if len(spans) != len(lines):  # fallback: the N-1 longest silences are the sentence gaps
    th = max(1e-4, np.percentile(env, 20) * 2.5)
    quiet = env < th; gaps = []; s = None
    for i, q in enumerate(quiet):
        if q and s is None: s = i
        if not q and s is not None:
            if i - s > 0.12 * SR: gaps.append((s, i))
            s = None
    speech = np.where(~quiet)[0]; st, en = speech[0] / SR, speech[-1] / SR
    gaps = [g for g in gaps if g[0] / SR > st + 0.2 and g[1] / SR < en - 0.2]
    gaps = sorted(sorted(gaps, key=lambda g: g[0] - g[1])[:len(lines) - 1])
    b = [st] + [v for g in gaps for v in (g[0] / SR, g[1] / SR)] + [en]
    spans = [{'t0': b[2 * k], 't1': b[2 * k + 1], 'words': []} for k in range(len(lines))]

# keep the take as ONE continuous performance: no cuts, no re-spaced pauses, no per-sentence gain jumps.
# Only the silence before the first word and after the last word is trimmed.
t_start = max(0.0, spans[0]['t0'] - 0.03)
t_end = min(dur0, spans[-1]['t1'] + 0.18)
y = x[int(t_start * SR):int(t_end * SR)].copy()
fade = int(0.008 * SR); y[:fade] *= np.linspace(0, 1, fade); y[-fade * 4:] *= np.linspace(1, 0, fade * 4)
sentences = []
for k, sp in enumerate(spans):
    sentences.append({'t0': round(sp['t0'] - t_start, 4), 't1': round(sp['t1'] - t_start, 4), 'text': lines[k],
                      'words': [{'text': w['text'], 'start': round(w['start'] - t_start, 4), 'end': round(w['end'] - t_start, 4)} for w in sp['words']]})
for g in a.gap:  # silent beats for gags: everything after the cut moves later
    k, sec = g.split(':'); k = int(k); sec = float(sec)
    if 0 <= k < len(sentences) - 1:
        c = (sentences[k]['t1'] + sentences[k + 1]['t0']) / 2; ci = int(c * SR)
        y = np.concatenate([y[:ci], np.zeros(int(sec * SR), dtype=y.dtype), y[ci:]])
        for sn in sentences[k + 1:]:
            sn['t0'] = round(sn['t0'] + sec, 4); sn['t1'] = round(sn['t1'] + sec, 4)
            for w in sn['words']: w['start'] = round(w['start'] + sec, 4); w['end'] = round(w['end'] + sec, 4)
        for sp in spans[k + 1:]: sp['t0'] += sec; sp['t1'] += sec
pauses = [round(spans[k + 1]['t0'] - spans[k]['t1'], 3) for k in range(len(spans) - 1)]
lus = [lufs(x[int(sp['t0'] * SR):int(sp['t1'] * SR)]) for sp in spans]
med = float(np.median(lus))

# EQ + gentle compression + loudnorm (two pass, linear) with ffmpeg
with tempfile.TemporaryDirectory() as td:
    src = os.path.join(td, 'in.f32'); y.tofile(src)
    chain = 'highpass=f=75,equalizer=f=300:t=q:w=1:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=1.5,acompressor=threshold=-22dB:ratio=2.2:attack=15:release=250:makeup=1'
    m = subprocess.run(['ffmpeg', '-v', 'info', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', src, '-af', chain + ',loudnorm=I=-15:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    ln = f"loudnorm=I=-15:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', src, '-af', chain + ',' + ln + f',aresample={SR}', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    z = np.frombuffer(raw, dtype=np.float32)[:len(y)]
z = np.clip(z, -1, 1)
final = lufs(z)
slu = [round(lufs(z[int(s['t0'] * SR):int(s['t1'] * SR)]), 2) for s in sentences]
for s, v in zip(sentences, slu): s['lu'] = v
for s in sentences: s['t1'] = min(s['t1'], round(len(z) / SR - 0.01, 4))
pcm = (z * 32767).astype('<i2').tobytes()
res = {'v': 1, 'sr': SR, 'n': len(z), 'dur': round(len(z) / SR, 4), 'lufs': round(final, 2), 'sentences': sentences, 'pauses': pauses,
       'report': {'mode': 'continuous', 'tempo': a.tempo, 'maxgap': a.maxgap, 'gaps': a.gap, 'take_dur': round(dur0, 3), 'align': 'words' if words and spans and spans[0]['words'] else 'silence', 'sentence_lu_spread': round(max(slu) - min(slu), 2), 'median_lu': round(med, 2)},
       'pcm16': base64.b64encode(pcm).decode()}
json.dump(res, open(a.out, 'w'), ensure_ascii=False)
print(json.dumps({k: v for k, v in res.items() if k != 'pcm16' and k != 'sentences'}, ensure_ascii=False))
print([ (s['t0'], s['t1'], s['lu']) for s in sentences])
