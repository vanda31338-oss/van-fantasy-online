/**
 * BALANCE CONFIG — every tunable number in the game lives here.
 * Tweak values in this file to rebalance; game logic only reads from it.
 */
export const BALANCE = {
  levelCap: 80,
  advancedClassLevel: 30,
  statPointsPerLevel: 5,
  skillPointsPerLevel: 1,
  baseStatValue: 5,

  /** EXP needed to go from level L to L+1. */
  expToNext: (level: number) => Math.round(60 * Math.pow(level, 1.9)),
  /** Fraction of the current level's EXP requirement lost on death (never de-levels). */
  deathExpPenalty: 0.03,

  // ---- Derived stat formulas (class base values come from classes.ts) ----
  derived: {
    hpPerVit: 6,
    hpVitPercent: 0.012, // +1.2% max HP per VIT
    mpPerInt: 3,
    mpIntPercent: 0.012,
    atkPerStr: 2,
    atkPerDex: 0.4,
    atkPerLevel: 1,
    matkPerInt: 2,
    matkPerLevel: 1,
    defPerVit: 0.8,
    defPerLevel: 0.5,
    mdefPerInt: 0.4,
    mdefPerVit: 0.3,
    mdefPerLevel: 0.5,
    hitPerDex: 1,
    hitPerLevel: 1,
    fleePerLuk: 1,
    fleePerDex: 0.3,
    fleePerLevel: 0.5,
    critBase: 1, // %
    critPerLuk: 0.3, // %
    critCap: 75,
    critMultiplier: 1.5,
    aspdPerDex: 0.008, // +0.8% attack speed per DEX
    aspdCap: 3.0, // attacks / second
    castSpeedPerDex: 0.006,
    castSpeedPerInt: 0.002,
    hpRegenPctPerSec: 0.004,
    hpRegenPerVit: 0.05,
    mpRegenPctPerSec: 0.008,
    mpRegenPerInt: 0.08,
    townRegenMultiplier: 5,
    dropRatePerLuk: 0.005, // +0.5% drop chance multiplier per LUK
  },

  combat: {
    damageVariance: 0.05,
    baseHitChance: 0.9,
    hitChancePerPoint: 0.01,
    minHitChance: 0.6,
    maxHitChance: 0.99,
    knockbackSpeed: 140,
    knockbackMs: 110,
    hitFlashMs: 70,
    attackFacingRange: 1.0,
    /** How far the attack button auto-targets an enemy. */
    autoTargetRange: 90,
  },

  /** Elemental damage chart: attacker element → defender element → multiplier. */
  elements: {
    neutral: { neutral: 1, fire: 1, ice: 1, lightning: 1, earth: 1 },
    fire: { neutral: 1, fire: 0.75, ice: 0.75, lightning: 1, earth: 1.5 },
    ice: { neutral: 1, fire: 1.5, ice: 0.75, lightning: 0.75, earth: 1 },
    lightning: { neutral: 1, fire: 1, ice: 1.5, lightning: 0.75, earth: 0.75 },
    earth: { neutral: 1, fire: 0.75, ice: 1, lightning: 1.5, earth: 0.75 },
  },

  // ---- Monster scaling by level (multiplied by each monster's own multipliers) ----
  monster: {
    hp: (l: number) => 40 + 12 * l + 1.1 * l * l,
    atk: (l: number) => 2.5 + 0.75 * l + 0.003 * l * l,
    def: (l: number) => 2 + 1.5 * l,
    mdef: (l: number) => 2 + 1.2 * l,
    hit: (l: number) => 5 + 1.2 * l,
    flee: (l: number) => 0.8 * l,
    exp: (l: number) => 6 * Math.pow(l, 1.05),
    gold: (l: number) => 2 + 1.2 * l,
    bossHpMult: 30,
    bossExpMult: 15,
    bossGoldMult: 20,
    leashDistance: 260,
    /** Name colours by (monster level - player level). */
    levelColors: [
      { maxDiff: -6, color: '#9a9a9a' },
      { maxDiff: -3, color: '#7ee07e' },
      { maxDiff: 2, color: '#ffffff' },
      { maxDiff: 5, color: '#ffd84a' },
      { maxDiff: 999, color: '#ff5a5a' },
    ],
  },

  potions: {
    cooldownMs: 1500,
  },

  player: {
    moveSpeed: 82,
    respawnHpPct: 1,
    invulnAfterRespawnMs: 2000,
  },

  save: {
    autoSaveIntervalSec: 60,
  },

  inventory: {
    startCapacity: 40,
  },
} as const;

export type ElementId = keyof typeof BALANCE.elements;

export function elementMultiplier(attack: ElementId, defend: ElementId): number {
  return BALANCE.elements[attack][defend];
}

export function levelColor(monsterLevel: number, playerLevel: number): string {
  const diff = monsterLevel - playerLevel;
  for (const c of BALANCE.monster.levelColors) if (diff <= c.maxDiff) return c.color;
  return '#ffffff';
}
