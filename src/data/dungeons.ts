export type DungeonKind = 'leveling' | 'equipment' | 'boss_arena';
export type DungeonTheme = 'forest' | 'hollow' | 'cave' | 'ruins' | 'wastes' | 'snow' | 'abyss' | 'sky';

export interface WaveDef {
  monsters: { id: string; count: number }[];
  /** Level offset relative to the dungeon's scaled level. */
  levelOffset?: number;
}

export interface DungeonDef {
  id: string;
  name: string;
  kind: DungeonKind;
  levelMin: number;
  levelMax: number;
  theme: DungeonTheme;
  /** Map size in tiles. */
  width: number;
  height: number;
  waves: WaveDef[];
  boss: string;
  bgm: string;
  bossBgm: string;
  /** Set to true once content exists; others show as "Coming soon". */
  implemented: boolean;
  description: string;
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'whispering_greenwood', name: 'Whispering Greenwood', kind: 'leveling', levelMin: 1, levelMax: 10,
    theme: 'forest', width: 54, height: 36, boss: 'gobbleglob', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: true,
    description: 'A sunny forest full of bouncy jellies. Perfect for new adventurers.',
    waves: [
      { monsters: [{ id: 'puffjelly', count: 6 }], levelOffset: -1 },
      { monsters: [{ id: 'puffjelly', count: 4 }, { id: 'sproutcap', count: 3 }], levelOffset: 0 },
      { monsters: [{ id: 'sproutcap', count: 3 }, { id: 'bramble_sprite', count: 3 }], levelOffset: 0 },
      { monsters: [{ id: 'greenfang_pup', count: 4 }, { id: 'bramble_sprite', count: 2 }, { id: 'puffjelly', count: 2 }], levelOffset: 1 },
    ],
  },
  { id: 'mossfang_hollow', name: 'Mossfang Hollow', kind: 'leveling', levelMin: 10, levelMax: 17, theme: 'hollow', width: 54, height: 36, waves: [], boss: '', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: false, description: '' },
  { id: 'amberglow_caverns', name: 'Amberglow Caverns', kind: 'leveling', levelMin: 15, levelMax: 24, theme: 'cave', width: 54, height: 36, waves: [], boss: '', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: false, description: '' },
  { id: 'sunken_tide_ruins', name: 'Sunken Tide Ruins', kind: 'leveling', levelMin: 22, levelMax: 32, theme: 'ruins', width: 54, height: 36, waves: [], boss: '', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: false, description: '' },
  { id: 'ashen_wastes', name: 'Ashen Wastes', kind: 'leveling', levelMin: 30, levelMax: 42, theme: 'wastes', width: 54, height: 36, waves: [], boss: '', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: false, description: '' },
  { id: 'frostveil_peaks', name: 'Frostveil Peaks', kind: 'leveling', levelMin: 40, levelMax: 52, theme: 'snow', width: 54, height: 36, waves: [], boss: '', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: false, description: '' },
  { id: 'abyssal_spire', name: 'Abyssal Spire', kind: 'leveling', levelMin: 50, levelMax: 64, theme: 'abyss', width: 54, height: 36, waves: [], boss: '', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: false, description: '' },
  { id: 'celestial_sanctum', name: 'Celestial Sanctum', kind: 'leveling', levelMin: 62, levelMax: 80, theme: 'sky', width: 54, height: 36, waves: [], boss: '', bgm: 'bgm_dungeon', bossBgm: 'bgm_boss', implemented: false, description: '' },
];

export function getDungeon(id: string): DungeonDef {
  const d = DUNGEONS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown dungeon ${id}`);
  return d;
}
