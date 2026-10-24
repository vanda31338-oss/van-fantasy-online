import type { StatBlock } from '../core/types';

export type BaseClassId = 'swordsman' | 'mage' | 'summoner';
export type AdvancedClassId = 'berserker' | 'guardian' | 'elemental_master' | 'battle_mage' | 'grand_summoner';
export type ClassId = BaseClassId | AdvancedClassId;

export interface ClassDef {
  id: ClassId;
  name: string;
  base: BaseClassId;
  role: string;
  description: string;
  recommended: string; // stat priority hint
  recommendedOrder: (keyof StatBlock)[];
  hpBase: number;
  hpPerLevel: number;
  mpBase: number;
  mpPerLevel: number;
  /** Basic attacks per second before DEX. */
  baseAps: number;
  /** Basic attack reach in pixels. */
  attackRange: number;
  /** Basic attack uses MATK instead of ATK. */
  magicBasicAttack: boolean;
  /** Basic attack fires a projectile (VFX id) instead of a melee swing. */
  projectileVfx?: string;
  /** Character sprite key in the asset manifest. */
  sprite: string;
  starterWeapon: string;
  /** Skills learned automatically on creation (Lv 1). */
  starterSkills: string[];
  /** False = visible in character creation but not yet selectable. */
  available: boolean;
  advanced?: AdvancedClassId[];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  swordsman: {
    id: 'swordsman', name: 'Swordsman', base: 'swordsman',
    role: 'Melee fighter',
    description: 'A sturdy blade-wielder who charges into the fray. Becomes a Berserker or a Guardian at Lv 30.',
    recommended: 'STR > VIT > DEX',
    recommendedOrder: ['str', 'vit', 'dex'],
    hpBase: 95, hpPerLevel: 15, mpBase: 22, mpPerLevel: 2.5,
    baseAps: 1.25, attackRange: 30, magicBasicAttack: false,
    sprite: 'char_swordsman', starterWeapon: 'training_sword', starterSkills: ['power_strike'],
    available: true, advanced: ['berserker', 'guardian'],
  },
  mage: {
    id: 'mage', name: 'Mage', base: 'mage',
    role: 'Ranged caster',
    description: 'Commands raw elemental power from afar. Becomes an Elemental Master or a Battle Mage at Lv 30.',
    recommended: 'INT > DEX > VIT',
    recommendedOrder: ['int', 'dex', 'vit'],
    hpBase: 65, hpPerLevel: 9.5, mpBase: 55, mpPerLevel: 6,
    baseAps: 0.95, attackRange: 140, magicBasicAttack: true, projectileVfx: 'magic_bolt',
    sprite: 'char_mage', starterWeapon: 'apprentice_staff', starterSkills: ['ember_shot'],
    available: false, advanced: ['elemental_master', 'battle_mage'],
  },
  summoner: {
    id: 'summoner', name: 'Summoner', base: 'summoner',
    role: 'Pet commander',
    description: 'Calls loyal beasts and spirits to fight at their side. Becomes a Grand Summoner at Lv 30.',
    recommended: 'INT > VIT > DEX',
    recommendedOrder: ['int', 'vit', 'dex'],
    hpBase: 75, hpPerLevel: 11, mpBase: 48, mpPerLevel: 5,
    baseAps: 0.95, attackRange: 120, magicBasicAttack: true, projectileVfx: 'spirit_bolt',
    sprite: 'char_summoner', starterWeapon: 'oak_grimoire', starterSkills: ['summon_wolf'],
    available: false, advanced: ['grand_summoner'],
  },
  berserker: {
    id: 'berserker', name: 'Berserker', base: 'swordsman', role: 'Burst damage',
    description: 'Two-handed fury. Highest burst damage, lower defense.',
    recommended: 'STR > DEX > LUK', recommendedOrder: ['str', 'dex', 'luk'],
    hpBase: 95, hpPerLevel: 16, mpBase: 22, mpPerLevel: 2.8,
    baseAps: 1.3, attackRange: 32, magicBasicAttack: false,
    sprite: 'char_swordsman', starterWeapon: 'training_sword', starterSkills: [], available: false,
  },
  guardian: {
    id: 'guardian', name: 'Guardian', base: 'swordsman', role: 'Tank',
    description: 'Sword and shield. High defense and sustain, moderate damage.',
    recommended: 'VIT > STR > DEX', recommendedOrder: ['vit', 'str', 'dex'],
    hpBase: 110, hpPerLevel: 19, mpBase: 24, mpPerLevel: 3,
    baseAps: 1.15, attackRange: 30, magicBasicAttack: false,
    sprite: 'char_swordsman', starterWeapon: 'training_sword', starterSkills: [], available: false,
  },
  elemental_master: {
    id: 'elemental_master', name: 'Elemental Master', base: 'mage', role: 'AoE caster',
    description: 'Ranged elemental AoE and crowd control. Fragile.',
    recommended: 'INT > DEX > VIT', recommendedOrder: ['int', 'dex', 'vit'],
    hpBase: 65, hpPerLevel: 10, mpBase: 60, mpPerLevel: 7,
    baseAps: 0.95, attackRange: 150, magicBasicAttack: true, projectileVfx: 'magic_bolt',
    sprite: 'char_mage', starterWeapon: 'apprentice_staff', starterSkills: [], available: false,
  },
  battle_mage: {
    id: 'battle_mage', name: 'Battle Mage', base: 'mage', role: 'Hybrid',
    description: 'Magic-infused melee with self-buffs. Tankier than an Elemental Master.',
    recommended: 'INT = STR > VIT', recommendedOrder: ['int', 'str', 'vit'],
    hpBase: 80, hpPerLevel: 13, mpBase: 50, mpPerLevel: 5.5,
    baseAps: 1.1, attackRange: 40, magicBasicAttack: true,
    sprite: 'char_mage', starterWeapon: 'apprentice_staff', starterSkills: [], available: false,
  },
  grand_summoner: {
    id: 'grand_summoner', name: 'Grand Summoner', base: 'summoner', role: 'Pet master',
    description: 'Commands up to 3 powerful beasts with buffs and debuffs.',
    recommended: 'INT > VIT > DEX', recommendedOrder: ['int', 'vit', 'dex'],
    hpBase: 80, hpPerLevel: 12, mpBase: 52, mpPerLevel: 6,
    baseAps: 0.95, attackRange: 120, magicBasicAttack: true, projectileVfx: 'spirit_bolt',
    sprite: 'char_summoner', starterWeapon: 'oak_grimoire', starterSkills: [], available: false,
  },
};

export const BASE_CLASSES: BaseClassId[] = ['swordsman', 'mage', 'summoner'];
