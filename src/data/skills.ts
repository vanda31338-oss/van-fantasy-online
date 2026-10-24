import type { ElementId } from './balance';
import type { ClassId } from './classes';

/** value = base + perLevel * (skillLevel - 1) */
export interface Scaling {
  base: number;
  perLevel: number;
}
export const scale = (s: Scaling, lv: number) => s.base + s.perLevel * (Math.max(1, lv) - 1);

export type SkillTag = 'DPS' | 'BUFF' | 'DEBUFF' | 'HEAL' | 'SUMMON' | 'ULTIMATE';

export type BuffStat = 'atkPct' | 'defPct' | 'mdefPct' | 'matkPct' | 'aspdPct' | 'moveSpeedPct' | 'hpRegenPctMaxHp';

export type SkillEffect =
  | {
      kind: 'damage';
      /** single = current target, cone = frontal arc, circle = around caster, target_circle = around target */
      area: 'single' | 'cone' | 'circle' | 'target_circle';
      radius?: number;
      multiplier: Scaling;
      damageType: 'physical' | 'magic';
      element?: ElementId;
      hits?: number;
      knockback?: number;
      maxTargets?: number;
    }
  | {
      kind: 'buff';
      buffId: string;
      duration: Scaling;
      stats: Partial<Record<BuffStat, Scaling>>;
    }
  | {
      kind: 'debuff';
      buffId: string;
      area: 'single' | 'cone' | 'circle';
      radius?: number;
      duration: Scaling;
      stats: Partial<Record<BuffStat, Scaling>>;
    };

export interface SkillDef {
  id: string;
  name: string;
  classId: ClassId;
  unlockLevel: number;
  maxLevel: number;
  tags: SkillTag[];
  icon: string;
  description: string;
  mpCost: Scaling;
  cooldown: Scaling; // seconds
  castTime: number; // seconds (before cast speed)
  range: number; // px
  effects: SkillEffect[];
  vfx?: { cast?: string; hit?: string; area?: string };
  sfx?: string;
  /** Character animation used while casting. */
  anim?: 'attack' | 'cast';
}

export const SKILLS: Record<string, SkillDef> = {
  // ===================== SWORDSMAN =====================
  power_strike: {
    id: 'power_strike', name: 'Power Strike', classId: 'swordsman', unlockLevel: 1, maxLevel: 10,
    tags: ['DPS'], icon: 'icon_power_strike',
    description: 'A heavy single blow that knocks the enemy back.',
    mpCost: { base: 6, perLevel: 1 }, cooldown: { base: 4, perLevel: -0.15 }, castTime: 0, range: 34,
    effects: [{ kind: 'damage', area: 'single', multiplier: { base: 2.0, perLevel: 0.2 }, damageType: 'physical', knockback: 220 }],
    vfx: { cast: 'power_strike', hit: 'hit_heavy' }, sfx: 'skill_heavy', anim: 'attack',
  },
  war_cry: {
    id: 'war_cry', name: 'War Cry', classId: 'swordsman', unlockLevel: 5, maxLevel: 10,
    tags: ['BUFF'], icon: 'icon_war_cry',
    description: 'A rallying shout that raises ATK for 30s.',
    mpCost: { base: 12, perLevel: 1.5 }, cooldown: { base: 40, perLevel: 0 }, castTime: 0.3, range: 0,
    effects: [{ kind: 'buff', buffId: 'war_cry', duration: { base: 30, perLevel: 0 }, stats: { atkPct: { base: 0.1, perLevel: 0.02 } } }],
    vfx: { cast: 'buff_aura' }, sfx: 'buff', anim: 'cast',
  },
  cleave: {
    id: 'cleave', name: 'Cleave', classId: 'swordsman', unlockLevel: 10, maxLevel: 10,
    tags: ['DPS'], icon: 'icon_cleave',
    description: 'A wide swing that hits every enemy in front of you.',
    mpCost: { base: 10, perLevel: 1.2 }, cooldown: { base: 6, perLevel: -0.2 }, castTime: 0, range: 44,
    effects: [{ kind: 'damage', area: 'cone', radius: 48, multiplier: { base: 1.4, perLevel: 0.12 }, damageType: 'physical', maxTargets: 8 }],
    vfx: { cast: 'cleave' }, sfx: 'skill_heavy', anim: 'attack',
  },
  armor_break: {
    id: 'armor_break', name: 'Armor Break', classId: 'swordsman', unlockLevel: 15, maxLevel: 10,
    tags: ['DEBUFF', 'DPS'], icon: 'icon_armor_break',
    description: 'Cracks the target\'s armor, lowering its DEF.',
    mpCost: { base: 14, perLevel: 1 }, cooldown: { base: 12, perLevel: -0.3 }, castTime: 0, range: 34,
    effects: [
      { kind: 'damage', area: 'single', multiplier: { base: 1.2, perLevel: 0.08 }, damageType: 'physical' },
      { kind: 'debuff', buffId: 'armor_break', area: 'single', duration: { base: 8, perLevel: 0.4 }, stats: { defPct: { base: -0.15, perLevel: -0.02 } } },
    ],
    vfx: { hit: 'hit_heavy' }, sfx: 'skill_heavy', anim: 'attack',
  },
  second_wind: {
    id: 'second_wind', name: 'Second Wind', classId: 'swordsman', unlockLevel: 22, maxLevel: 10,
    tags: ['HEAL', 'BUFF'], icon: 'icon_second_wind',
    description: 'Catch your breath: regenerate a % of max HP every second for 10s.',
    mpCost: { base: 20, perLevel: 2 }, cooldown: { base: 45, perLevel: -1 }, castTime: 0.4, range: 0,
    effects: [{ kind: 'buff', buffId: 'second_wind', duration: { base: 10, perLevel: 0 }, stats: { hpRegenPctMaxHp: { base: 0.02, perLevel: 0.003 } } }],
    vfx: { cast: 'heal' }, sfx: 'heal', anim: 'cast',
  },

  // ===================== MAGE (M2) =====================
  ember_shot: {
    id: 'ember_shot', name: 'Ember Shot', classId: 'mage', unlockLevel: 1, maxLevel: 10,
    tags: ['DPS'], icon: 'icon_ember_shot',
    description: 'Hurls a bolt of fire at the target.',
    mpCost: { base: 7, perLevel: 1 }, cooldown: { base: 2.5, perLevel: -0.08 }, castTime: 0.6, range: 150,
    effects: [{ kind: 'damage', area: 'single', multiplier: { base: 1.8, perLevel: 0.18 }, damageType: 'magic', element: 'fire' }],
    vfx: { hit: 'hit_fire' }, sfx: 'fire', anim: 'cast',
  },

  // ===================== SUMMONER (M2) =====================
  summon_wolf: {
    id: 'summon_wolf', name: 'Summon Wolf', classId: 'summoner', unlockLevel: 1, maxLevel: 10,
    tags: ['SUMMON'], icon: 'icon_summon_wolf',
    description: 'Calls a swift wolf companion to fight for you.',
    mpCost: { base: 15, perLevel: 1.5 }, cooldown: { base: 10, perLevel: 0 }, castTime: 1, range: 0,
    effects: [], anim: 'cast',
  },
};

export function skillsForClass(classId: ClassId): SkillDef[] {
  return Object.values(SKILLS).filter((s) => s.classId === classId).sort((a, b) => a.unlockLevel - b.unlockLevel);
}
