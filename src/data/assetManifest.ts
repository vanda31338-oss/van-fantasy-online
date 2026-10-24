/**
 * CENTRAL ASSET MANIFEST
 *
 * Every sprite, tile set, icon and sound is declared here.
 * - `url` empty/undefined  → a procedural placeholder is generated at boot (see src/gfx/procedural).
 * - `url` set              → the file is loaded from /assets/<url> instead. No code changes needed.
 *
 * To drop in a real sprite sheet (e.g. made with PixelLab):
 *   1. Put the PNG in assets/characters/ (or monsters/, tiles/, icons/ …)
 *   2. Set `url`, `frameWidth`, `frameHeight` below
 *   3. Update the `anims` frame ranges to match your sheet layout
 */

export interface AnimDef {
  frames: number[];
  fps: number;
  loop: boolean;
}

export interface SpriteAsset {
  key: string;
  url?: string;
  frameWidth: number;
  frameHeight: number;
  /** Procedural generator id used when no url is given. */
  generator: string;
  /** Origin (0..1) — feet position for characters. */
  originX?: number;
  originY?: number;
  anims: Record<string, AnimDef>;
}

export interface ImageAsset {
  key: string;
  url?: string;
  generator?: string;
}

export interface AudioAsset {
  key: string;
  /** Path under /assets (e.g. 'audio/town.mp3'). Empty → procedural chiptune / synth placeholder. */
  url?: string;
  /** Synth preset used when no url is given. */
  synth: string;
  volume?: number;
  loop?: boolean;
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Standard layout for procedurally generated humanoid sheets (16 frames, 32x32). */
const HUMANOID_ANIMS: Record<string, AnimDef> = {
  idle: { frames: [0, 1], fps: 2.5, loop: true },
  walk: { frames: range(2, 5), fps: 8, loop: true },
  attack: { frames: range(6, 8), fps: 14, loop: false },
  cast: { frames: range(9, 11), fps: 8, loop: false },
  hurt: { frames: [12], fps: 8, loop: false },
  death: { frames: range(13, 15), fps: 6, loop: false },
};

/** Standard layout for procedural monster sheets (8 frames). */
const MONSTER_ANIMS: Record<string, AnimDef> = {
  idle: { frames: [0, 1], fps: 3, loop: true },
  walk: { frames: [0, 2, 1, 3], fps: 7, loop: true },
  attack: { frames: [4, 5], fps: 6, loop: false },
  hurt: { frames: [6], fps: 8, loop: false },
  death: { frames: [6, 7], fps: 6, loop: false },
};

const humanoid = (key: string, generator: string): SpriteAsset => ({
  key, generator, frameWidth: 32, frameHeight: 32, originX: 0.5, originY: 0.94, anims: HUMANOID_ANIMS,
});
const monster = (key: string, generator: string, size: number, h = size): SpriteAsset => ({
  key, generator, frameWidth: size, frameHeight: h, originX: 0.5, originY: 0.92, anims: MONSTER_ANIMS,
});

export const SPRITES: SpriteAsset[] = [
  // ---- Player characters (assets/characters) ----
  humanoid('char_swordsman', 'char:swordsman'),
  humanoid('char_mage', 'char:mage'),
  humanoid('char_summoner', 'char:summoner'),
  // ---- NPCs (assets/characters) ----
  humanoid('npc_elder', 'char:elder'),
  humanoid('npc_merchant', 'char:merchant'),
  humanoid('npc_blacksmith', 'char:blacksmith'),
  humanoid('npc_runekeeper', 'char:runekeeper'),
  humanoid('npc_gatekeeper', 'char:gatekeeper'),
  humanoid('npc_swordmaster', 'char:swordmaster'),
  humanoid('npc_archmage', 'char:archmage'),
  humanoid('npc_beastsage', 'char:beastsage'),
  // ---- Monsters (assets/monsters) ----
  monster('mon_puffjelly', 'mon:puffjelly', 24),
  monster('mon_sproutcap', 'mon:sproutcap', 24),
  monster('mon_greenfang', 'mon:greenfang', 32, 24),
  monster('mon_bramble', 'mon:bramble', 24),
  monster('mon_gobbleglob', 'mon:gobbleglob', 64, 56),
];

export const IMAGES: ImageAsset[] = [
  // ---- UI (assets/ui) ----
  { key: 'title_bg', url: 'ui/title.png' },
  // ---- Tiles & props (assets/tiles) — procedural until replaced ----
  { key: 'tileset', generator: 'tiles' },
  { key: 'prop_tree', generator: 'prop:tree' },
  { key: 'prop_pine', generator: 'prop:pine' },
  { key: 'prop_bush', generator: 'prop:bush' },
  { key: 'prop_rock', generator: 'prop:rock' },
  { key: 'prop_flowers', generator: 'prop:flowers' },
  { key: 'prop_fountain', generator: 'prop:fountain' },
  { key: 'prop_lamp', generator: 'prop:lamp' },
  { key: 'prop_board', generator: 'prop:board' },
  { key: 'prop_stall', generator: 'prop:stall' },
  { key: 'prop_forge', generator: 'prop:forge' },
  { key: 'prop_portal', generator: 'prop:portal' },
  { key: 'prop_crate', generator: 'prop:crate' },
  { key: 'bld_house_red', generator: 'bld:house:red' },
  { key: 'bld_house_blue', generator: 'bld:house:blue' },
  { key: 'bld_house_green', generator: 'bld:house:green' },
  { key: 'bld_tower', generator: 'bld:tower' },
  { key: 'bld_castle', generator: 'bld:castle' },
  { key: 'shadow', generator: 'shadow' },
  // ---- Icons (assets/icons) ----
  { key: 'icon_hp_potion_s', generator: 'icon:potion:#e8455a' },
  { key: 'icon_mp_potion_s', generator: 'icon:potion:#4a7cf0' },
  { key: 'icon_jelly_goo', generator: 'icon:goo:#ff8fc8' },
  { key: 'icon_sprout_spore', generator: 'icon:goo:#b8f070' },
  { key: 'icon_wolf_fang', generator: 'icon:fang' },
  { key: 'icon_bramble_twig', generator: 'icon:twig' },
  { key: 'icon_crown_shard', generator: 'icon:crown' },
  { key: 'icon_sword', generator: 'icon:sword' },
  { key: 'icon_staff', generator: 'icon:staff' },
  { key: 'icon_book', generator: 'icon:book' },
  { key: 'icon_armor', generator: 'icon:armor' },
  { key: 'icon_gold', generator: 'icon:gold' },
  { key: 'icon_power_strike', generator: 'icon:skill:power_strike' },
  { key: 'icon_war_cry', generator: 'icon:skill:war_cry' },
  { key: 'icon_cleave', generator: 'icon:skill:cleave' },
  { key: 'icon_armor_break', generator: 'icon:skill:armor_break' },
  { key: 'icon_second_wind', generator: 'icon:skill:second_wind' },
  { key: 'icon_ember_shot', generator: 'icon:skill:ember_shot' },
  { key: 'icon_summon_wolf', generator: 'icon:skill:summon_wolf' },
  { key: 'icon_attack', generator: 'icon:attack' },
  { key: 'icon_menu', generator: 'icon:menu' },
];

export const AUDIO: AudioAsset[] = [
  // ---- Music (assets/audio) ----
  { key: 'bgm_title', synth: 'bgm_title', volume: 0.5, loop: true },
  { key: 'bgm_town', synth: 'bgm_town', volume: 0.5, loop: true },
  { key: 'bgm_dungeon', synth: 'bgm_dungeon', volume: 0.5, loop: true },
  { key: 'bgm_boss', synth: 'bgm_boss', volume: 0.5, loop: true },
  // ---- SFX ----
  { key: 'ui_click', synth: 'click' },
  { key: 'swing', synth: 'swing' },
  { key: 'hit', synth: 'hit' },
  { key: 'crit', synth: 'crit' },
  { key: 'player_hurt', synth: 'hurt' },
  { key: 'monster_die', synth: 'monster_die' },
  { key: 'skill_heavy', synth: 'skill_heavy' },
  { key: 'buff', synth: 'buff' },
  { key: 'heal', synth: 'heal' },
  { key: 'fire', synth: 'fire' },
  { key: 'level_up', synth: 'level_up' },
  { key: 'potion', synth: 'potion' },
  { key: 'coin', synth: 'coin' },
  { key: 'boss_roar', synth: 'boss_roar' },
  { key: 'slam', synth: 'slam' },
  { key: 'refine_success', synth: 'refine_success' },
  { key: 'refine_fail', synth: 'refine_fail' },
  { key: 'victory', synth: 'victory' },
  { key: 'defeat', synth: 'defeat' },
];

export function spriteAsset(key: string): SpriteAsset {
  const s = SPRITES.find((x) => x.key === key);
  if (!s) throw new Error(`Unknown sprite ${key}`);
  return s;
}
