# Append ElevenLabs SFX takes to assets/sfx/{index,library}.json (32 kHz mono PCM16 base64).
# python3 tools/sfxlib.py <key> <default_variant> "<desc_th>" "<prompt>" gen1,gen2,gen3,gen4 [--bed v1,v2,..]
#   one-shots are trimmed to activity, peak-normalized and tail-faded;
#   --bed builds the default from the listed takes crossfaded into one loop (edges fade 0.3 s so
#   the timeline's overlapping repeats crossfade too) and keeps every take untrimmed.
import base64, json, subprocess, sys
import numpy as np
SR = 32000
D = 'assets/sfx'

def load(f):
  b = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
  return np.frombuffer(b, dtype=np.float32).astype(np.float64)

def trim(x):
  w = 160; e = np.array([np.sqrt(np.mean(x[i:i + w] ** 2)) for i in range(0, len(x) - w, w)]); pk = np.abs(x).max() or 1
  act = np.where(20 * np.log10(e / pk + 1e-9) > -40)[0]
  if not len(act): return x
  return x[max(0, act[0] * w - 160):min(len(x), act[-1] * w + w + 1600)]

def fade(x, a, b):
  x = x.copy(); na, nb = int(a * SR), int(b * SR)
  if na: x[:na] *= np.linspace(0, 1, na)
  if nb: x[-nb:] *= np.linspace(1, 0, nb)
  return x

def norm(x, p=0.89): return x * (p / (np.abs(x).max() or 1))

def pcm(x): return base64.b64encode((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()).decode()

def main():
  key, dv, desc, prompt, gens = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5].split(',')
  bed = [int(v) for v in sys.argv[sys.argv.index('--bed') + 1].split(',')] if '--bed' in sys.argv else None
  idx = [e for e in json.load(open(f'{D}/index.json')) if e['key'] != key]
  lib = json.load(open(f'{D}/library.json')); S = lib['sounds']
  for k in [k for k in S if k == key or k.startswith(key + '_')]: del S[k]
  takes = {}
  for n, g in enumerate(gens, 1):
    x = load(f'{D}/{key}_{n}.mp3')
    x = norm(fade(x, 0.01, 0.12)) if bed else norm(fade(trim(x), 0, 0.08))
    takes[n] = x
    isdef = not bed and n == dv
    name = key if isdef else f'{key}_{n}'
    S[name] = {'key': key, 'variant': n, 'dur': round(len(x) / SR, 3), 'pcm16': pcm(x)}
    idx.append({'file': f'{key}_{n}.mp3', 'key': key, 'variant': n, 'desc_th': desc, 'prompt': prompt, 'generation_id': g,
                'model': 'eleven_text_to_sound_v2', 'dur': float(round(len(x) / SR, 3)), 'default': bool(isdef)})
  if bed:
    xf = int(0.25 * SR); y = takes[bed[0]]
    for v in bed[1:]:
      z = takes[v]; r = np.linspace(0, 1, xf)
      y = np.concatenate([y[:-xf], y[-xf:] * (1 - r) + z[:xf] * r, z[xf:]])
    y = norm(fade(y, 0.3, 0.3))
    S[key] = {'key': key, 'variant': 0, 'dur': round(len(y) / SR, 3), 'pcm16': pcm(y), 'bed': bed}
    idx.append({'file': None, 'key': key, 'variant': 0, 'desc_th': desc + ' (ลูปรวม ' + '+'.join(map(str, bed)) + ')', 'prompt': prompt,
                'generation_id': None, 'model': 'eleven_text_to_sound_v2', 'dur': float(round(len(y) / SR, 3)), 'default': True})
  json.dump(idx, open(f'{D}/index.json', 'w'), ensure_ascii=False, indent=1)
  json.dump(lib, open(f'{D}/library.json', 'w'), separators=(',', ':'))
  print(key, {k: S[k]['dur'] for k in S if k == key or k.startswith(key + '_')})

main()
