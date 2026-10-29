"""Build the curated LPC pack: one packed PNG per (item, body, variant) plus catalog.json.

usage: python3 -I build_lpc.py <lpc_repo> <out_dir>
"""
import json, os, sys, glob, hashlib
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from curate import ITEMS, BODIES, CATS

REPO, OUT = sys.argv[1], sys.argv[2]
SP = os.path.join(REPO, "spritesheets")
os.makedirs(os.path.join(OUT, "lpc"), exist_ok=True)

# standard animations we ship: name -> (folder, frames, rows)
STD = {
    "spellcast": ("spellcast", 7, 4), "thrust": ("thrust", 8, 4), "walk": ("walk", 9, 4),
    "slash": ("slash", 6, 4), "shoot": ("shoot", 13, 4), "hurt": ("hurt", 6, 1),
    "idle": ("idle", 2, 4), "jump": ("jump", 5, 4), "sit": ("sit", 3, 4),
    "emote": ("emote", 3, 4), "run": ("run", 8, 4), "combat": ("combat_idle", 2, 4),
    "backslash": ("backslash", 13, 4),
}
DEFAULT_ANIMS = ["spellcast", "thrust", "walk", "slash", "shoot", "hurt"]
CUSTOM = json.load(open(os.path.join(os.path.dirname(__file__), "custom_anims.json")))
CUSTOM_OK = {"slash_128", "backslash_128", "thrust_oversize", "slash_oversize", "walk_128", "thrust_128"}

defs = {}
for f in glob.glob(os.path.join(REPO, "sheet_definitions/**/*.json"), recursive=True):
    stem = os.path.splitext(os.path.basename(f))[0]
    if not stem.startswith("meta_"):
        defs[stem] = (f, json.load(open(f)))

# palettes (ulpc only) + material bases
palettes, bases = {}, {}
for m in ["body", "cloth", "hair", "metal", "wood", "eye"]:
    meta = json.load(open(os.path.join(REPO, f"palette_definitions/{m}/meta_{m}.json")))
    bases[m] = meta["base"]
    palettes[m] = json.load(open(os.path.join(REPO, f"palette_definitions/{m}/{m}_ulpc.json")))

credits, credit_idx = [], {}
def add_credit(c):
    k = json.dumps(c, sort_keys=True)
    if k not in credit_idx:
        credit_idx[k] = len(credits)
        credits.append({"f": c.get("file", ""), "a": c.get("authors", []), "l": c.get("licenses", []),
                        "u": c.get("urls", []), "n": c.get("notes", "")})
    return credit_idx[k]

customs = {}  # custom anim name -> {anim, fs, seq:[[std idx..] per dir n,w,s,e]}
def custom_info(name):
    if name not in customs:
        c = CUSTOM[name]
        rows = c["frames"]
        anim = rows[0][0].split(",")[0].split("-")[0]
        seq = [[int(e.split(",")[1]) for e in r] for r in rows]
        customs[name] = {"anim": anim, "fs": c["frameSize"], "seq": seq}
    return customs[name]

def recolor_channels(d):
    r = d.get("recolors")
    if not r:
        return None
    if "material" in r:
        r = {"color_1": r}
    out = []
    for k in sorted(r):
        v = r[k]
        m = v.get("material")
        if m not in palettes:
            continue
        out.append({"k": k, "m": m, "base": v.get("base", bases[m]), "label": v.get("label", ""),
                    "t": v.get("type_name", "")})
    return out or None

def load(path):
    try:
        return Image.open(path).convert("RGBA")
    except Exception:
        return None

def first_existing(*paths):
    for p in paths:
        if os.path.exists(p):
            return p
    return None

items_out, sheets_out = {}, {}
total_bytes = 0
missing = []
for stem, chosen in ITEMS.items():
    if stem not in defs:
        missing.append(stem); continue
    fpath, d = defs[stem]
    rec = recolor_channels(d)
    if rec:
        variants = [""]
    else:
        allv = d.get("variants") or []
        variants = [v for v in (chosen or allv[:4]) if v in allv] or allv[:1]
    anims = [a for a in (d.get("animations") or DEFAULT_ANIMS) if a in STD]
    layers = [(int(k.split("_")[1]), d[k]) for k in d if k.startswith("layer_")]
    layers.sort()
    item = {"n": d["name"], "t": d["type_name"], "c": CATS.get(d["type_name"], "other"),
            "p": os.path.relpath(fpath, os.path.join(REPO, "sheet_definitions")).replace(".json", ""),
            "z": [L.get("zPos", 100) for _, L in layers], "an": anims, "b": [], "v": variants,
            "r": rec, "mb": bool(d.get("match_body_color")), "cr": [add_credit(c) for c in d.get("credits", [])],
            "tags": d.get("tags", [])}
    for body in BODIES:
        if not any(L.get(body) for _, L in layers):
            continue
        for var in variants:
            vfile = var.replace(" ", "_")
            blocks = []  # (layer_index, anim, img, fs, n, rows, custom)
            for li, (num, L) in enumerate(layers):
                base = L.get(body)
                if not base:
                    continue
                cust = L.get("custom_animation")
                if cust:
                    if cust not in CUSTOM_OK:
                        continue
                    ci = custom_info(cust)
                    p = first_existing(os.path.join(SP, base + vfile + ".png") if vfile else None or "",
                                       os.path.join(SP, base.rstrip("/") + ".png"),
                                       *glob.glob(os.path.join(SP, base, "*.png"))[:1] if not vfile else [])
                    im = load(p) if p else None
                    if im is None:
                        continue
                    n = len(ci["seq"][0])
                    blocks.append((li, ci["anim"], im, ci["fs"], n, 4, cust))
                else:
                    for a in anims:
                        folder, n, rows = STD[a]
                        p = os.path.join(SP, base + folder + ("/" + vfile if vfile else "") + ".png")
                        im = load(p) if os.path.exists(p) else None
                        if im is None:
                            continue
                        bb = im.getbbox()
                        if bb is None:
                            continue
                        blocks.append((li, a, im, 64, im.width // 64, im.height // 64, None))
            if not blocks:
                continue
            # dedupe identical sheets across bodies
            h = hashlib.sha1()
            for b in blocks:
                h.update(f"{b[0]}{b[1]}{b[6]}".encode()); h.update(b[2].tobytes())
            key = h.hexdigest()[:12]
            if key not in sheets_out:
                W = max(1024, max(b[2].width for b in blocks))
                order = sorted(range(len(blocks)), key=lambda i: (-blocks[i][2].height, -blocks[i][2].width))
                x = y = sh = 0
                pos = {}
                for i in order:
                    im = blocks[i][2]
                    if x + im.width > W:
                        x, y, sh = 0, y + sh, 0
                    pos[i] = (x, y)
                    x += im.width
                    sh = max(sh, im.height)
                H = y + sh
                sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                lay = {}
                for i, b in enumerate(blocks):
                    li, a, im, fs, n, rows, cust = b
                    sheet.paste(im, pos[i])
                    lay.setdefault(str(li), {})[a] = [pos[i][0], pos[i][1], fs, n, rows] + ([cust] if cust else [])
                fn = f"lpc/{stem}-{key}.png"
                # lossless palette PNG when possible (keeps exact source colours for recolouring)
                cols = sheet.getcolors(256)
                out_path = os.path.join(OUT, fn)
                if cols is not None:
                    pal_img = sheet.quantize(colors=len(cols), method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
                    if pal_img.convert("RGBA").tobytes() == sheet.tobytes():
                        pal_img.save(out_path, optimize=True)
                    else:
                        sheet.save(out_path, optimize=True)
                else:
                    sheet.save(out_path, optimize=True)
                total_bytes += os.path.getsize(out_path)
                sheets_out[key] = {"f": fn, "w": W, "h": H, "L": lay}
            item["b"].append(body) if body not in item["b"] else None
            item.setdefault("s", {})[f"{body}|{var}"] = key
    if item.get("s"):
        items_out[stem] = item

catalog = {"v": 1, "bodies": BODIES, "std": {k: [v[1], v[2]] for k, v in STD.items()}, "customs": customs,
           "palettes": palettes, "bases": bases, "items": items_out, "sheets": sheets_out, "credits": credits}
json.dump(catalog, open(os.path.join(OUT, "lpc/catalog.json"), "w"), separators=(",", ":"), ensure_ascii=False)
print("items", len(items_out), "sheets", len(sheets_out), "png MB", round(total_bytes / 1e6, 2),
      "catalog KB", os.path.getsize(os.path.join(OUT, "lpc/catalog.json")) // 1024, "missing", missing)
