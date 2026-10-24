# Assets

Everything in this folder is copied as-is to the published game. Paths in the manifests are relative to this folder.

| Folder | What goes here | Declared in |
|---|---|---|
| `ui/` | Title art, UI frames | `src/data/assetManifest.ts` → `IMAGES` |
| `characters/` | Player + NPC sprite sheets | `assetManifest.ts` → `SPRITES` |
| `monsters/` | Monster sprite sheets | `assetManifest.ts` → `SPRITES` |
| `tiles/` | Tile sets and map props | `assetManifest.ts` → `IMAGES` |
| `icons/` | Item / skill icons | `assetManifest.ts` → `IMAGES` |
| `vfx/` | Effect sprite sheets | `src/data/vfx.ts` |
| `audio/` | Music and sound effects | `assetManifest.ts` → `AUDIO` |

Anything without a file uses a **procedural placeholder** generated at startup.

## Replacing a placeholder (no code changes)

1. Drop the PNG/MP3 into the matching folder, e.g. `assets/characters/swordsman.png`.
2. In the manifest entry, set `url: 'characters/swordsman.png'`, plus `frameWidth`/`frameHeight` for sheets.
3. Adjust the `anims` frame lists (idle, walk, attack, cast, hurt, death) to match your sheet.

VFX work the same way: set `spritesheet`, `frameWidth`, `frameHeight`, `frames`, `fps` in `src/data/vfx.ts`.
