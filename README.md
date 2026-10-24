# Van Fantasy Online

An offline, single-player 2D action RPG for phones (landscape, touch controls), inspired by classic pixel MMORPGs.
Built with **Phaser 3 + TypeScript + Vite**. All content (classes, skills, monsters, items, dungeons, VFX, balance) is data-driven.

**Play:** https://vanda31338-oss.github.io/van-fantasy-online/ (after GitHub Pages is enabled, see below)

## Status — Milestone 1

- Title screen, 3 character slots (create / delete with type-to-confirm), name validation
- Main town **Vanheim** with NPCs (Elder Rowan, Merchant Mila, Blacksmith Borin, Runekeeper Selene, 3 Class Masters, Gatekeeper, Bulletin Board)
- Floating joystick, attack button, 5-slot skill arc, potion quick slots, minimap, menu
- Swordsman class with **Power Strike**
- **Whispering Greenwood** (Lv 1–10): 4 waves + boss *Gobbleglob, the Moss King* (telegraphed slam zones, summons, enrage at 30%)
- HP/MP, regen (faster in town), damage numbers, crits, knockback, hit flash, elements, simple aggro (threat table)
- Level-up, stat points (Character panel), inventory, settings, death penalty + respawn in town, dungeon result screen
- Auto-save (level up, leaving a dungeon, every 60 s, app pause/close) with save versioning + "Saving..." indicator
- Procedural pixel-art placeholders for every sprite/tile/icon/VFX and chiptune placeholder audio
- Debug panel: add `?debug=1` to the URL (Menu → Debug Panel, or the DBG button)

## Project layout

```
assets/                 Static, replaceable art & audio (see assets/README.md)
  ui/ characters/ monsters/ vfx/ tiles/ icons/ audio/
src/
  main.ts               Game boot (Phaser config, fonts, auto-save hooks, portrait pause)
  data/                 ALL tunable content — edit these to rebalance
    balance.ts          Every formula & number (stats, EXP curve, monster scaling, elements)
    classes.ts skills.ts monsters.ts items.ts dungeons.ts npcs.ts
    assetManifest.ts    Central asset manifest (sprites, images, audio)
    vfx.ts              VFX definitions
  core/                 Game logic with no rendering (save, stats, combat math, state, audio, input state)
  gfx/                  Asset loader, VFX player, procedural placeholder generators
  entities/             Actor, Player, Monster, Npc
  scenes/               Boot, Title, CharSelect, CharCreate, Town, Dungeon (both extend WorldScene), Hud
  ui/                   Theme, widgets, panels, joystick, safe-area helpers
.github/workflows/deploy.yml   Builds and deploys to GitHub Pages on every push to main
```

## Develop

```
npm install
npm run dev       # local dev server
npm run build     # type-check + production build into dist/
```

Desktop keys for testing: WASD/arrows move, J/Space attack, 1–5 skills, Q/E potions, F talk.

## Deploy (GitHub Pages)

1. Merge the pull request into `main`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions** (one-time).
3. The *Deploy to GitHub Pages* workflow runs automatically; the game is then at the URL above.

## Roadmap

- **M2** Mage & Summoner, full skill trees + drag-and-drop skill slots, Auto Battle, Auto Potion, General Store
- **M3** Leveling dungeons 2–8, quests, tutorial & feature-unlock guides, Lv 30 class change, all advanced classes
- **M4** Equipment, refine, gems, runes, equipment dungeons, Boss Arena
- **M5** Balance pass, VFX/UI polish, performance
