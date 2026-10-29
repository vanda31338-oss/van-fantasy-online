"""Head-anchor table from the LPC human head sheets: per body, anim, dir, frame -> [cx, top, bottom] (px in 64 frame)."""
import json, sys, os
from PIL import Image
REPO, OUT = sys.argv[1], sys.argv[2]
cat = json.load(open(os.path.join(OUT, "lpc/catalog.json")))
STD = cat["std"]
folders = {"combat": "combat_idle"}
res = {}
for body, headdir in [("male", "male"), ("female", "female"), ("muscular", "male")]:
    res[body] = {}
    for anim, (n, rows) in STD.items():
        p = f"{REPO}/spritesheets/head/heads/human/{headdir}/{folders.get(anim, anim)}.png"
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGBA")
        a = []
        for r in range(rows):
            row = []
            for c in range(im.width // 64):
                bb = im.crop((c*64, r*64, c*64+64, r*64+64)).getbbox()
                row.append([round((bb[0]+bb[2])/2, 1), bb[1], bb[3]] if bb else [32, 10, 30])
            a.append(row)
        res[body][anim] = a
cat["anchors"] = res
json.dump(cat, open(os.path.join(OUT, "lpc/catalog.json"), "w"), separators=(",", ":"), ensure_ascii=False)
print({b: len(v) for b, v in res.items()}, res["male"]["walk"][2][:4])
