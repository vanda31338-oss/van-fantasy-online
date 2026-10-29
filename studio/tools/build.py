"""Join source files into dist/index.html (+ dist/engine.js for the QA harness)."""
import base64, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda *p: os.path.join(ROOT, 'src', *p)
D = lambda *p: os.path.join(ROOT, 'dist', *p)
ENGINE = ['util', 'pixel', 'headgear', 'cta', 'lpc', 'scene', 'scene_city', 'scene_space', 'scene_wings', 'scene_tiny', 'audio', 'timeline', 'render', 'project']
TH = 'U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC'
LA = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
b64 = lambda f: base64.b64encode(open(os.path.join(ROOT, 'tools', f), 'rb').read()).decode()
faces = [('LSE Kanit', '600', 'k600th.woff2', 'k600la.woff2'), ('LSE Prompt', '700', 'prompt700th.woff2', 'prompt700la.woff2'), ('LSE Sarabun', '700', 'sarabun700th.woff2', 'sarabun700la.woff2')]
parts = []
for fam, wt, th, la in faces:
    parts.append(f"new FontFace('{fam}','url(data:font/woff2;base64,{b64(th)})',{{weight:'{wt}',unicodeRange:'{TH}'}})")
    parts.append(f"new FontFace('{fam}','url(data:font/woff2;base64,{b64(la)})',{{weight:'{wt}',unicodeRange:'{LA}'}})")
font_js = "(function(G){const LSE=G.LSE;LSE.loadFonts=async function(){if(LSE._fonts)return LSE._fonts;LSE._fonts=(async()=>{try{const fs=[" + ",".join(parts) + "];await Promise.all(fs.map((f)=>f.load()));fs.forEach((f)=>document.fonts.add(f));return true;}catch(e){console.warn('font',e);return false;}})();return LSE._fonts;};})(window);"
engine = '\n'.join(open(S('engine', f + '.js')).read() for f in ENGINE) + '\n' + font_js + '\n' + open(S('sample.js')).read() + '\n' + open(S('sample_b100.js')).read()
open(D('engine.js'), 'w').write(engine)
if os.path.exists(S('app', 'template.html')):
    tpl = open(S('app', 'template.html')).read()
    css = open(S('app', 'styles.css')).read()
    app_files = sorted(f for f in os.listdir(S('app')) if f.endswith('.js'))
    app = '\n'.join(open(S('app', f)).read() for f in app_files)
    html = tpl.replace('/*CSS*/', css).replace('/*ENGINE*/', engine.replace('</script', '<\\/script')).replace('/*APP*/', app.replace('</script', '<\\/script'))
    open(D('index.html'), 'w').write(html)
    print('index.html', len(html) // 1024, 'KB; app files', app_files)
print('engine.js', len(engine) // 1024, 'KB')

# recorded sound-effect library (ElevenLabs): engine-ready library.json + the original mp3 variants
import shutil as _sh
if os.path.isdir(os.path.join(ROOT, 'assets', 'sfx')): _sh.copytree(os.path.join(ROOT, 'assets', 'sfx'), D('sfx'), dirs_exist_ok=True)
