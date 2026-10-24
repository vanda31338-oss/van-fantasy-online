import type { ElementId } from './balance';

export interface DropEntry {
  itemId: string;
  chance: number; // 0..1 before LUK bonus
  min?: number;
  max?: number;
}

export type BossMechanic =
  | { kind: 'aoe_slam'; everySec: number; zones: number; radius: number; telegraphSec: number; multiplier: number }
  | { kind: 'summon_minions'; everySec: number; monsterId: string; count: number; maxAlive: number };

export interface MonsterDef {
  id: string;
  name: string;
  sprite: string; // asset manifest key
  element: ElementId;
  /** Multipliers on BALANCE.monster curves. */
  hpMult: number;
  atkMult: number;
  defMult: number;
  expMult: number;
  goldMult: number;
  moveSpeed: number;
  attackRange: number;
  attackIntervalSec: number;
  /** Wind-up before a hit lands (gives the player a moment to react). */
  windupSec: number;
  aggroRadius: number;
  bodyRadius: number;
  scale?: number;
  drops: DropEntry[];
  boss?: {
    title: string;
    enrageAtPct: number;
    enrageSpeedMult: number;
    enrageAtkSpeedMult: number;
    mechanics: BossMechanic[];
  };
}

export const MONSTERS: Record<string, MonsterDef> = {
  // ---------------- Whispering Greenwood ----------------
  puffjelly: {
    id: 'puffjelly', name: 'Puffjelly', sprite: 'mon_puffjelly', element: 'neutral',
    hpMult: 0.9, atkMult: 0.85, defMult: 0.8, expMult: 0.9, goldMult: 0.9,
    moveSpeed: 38, attackRange: 18, attackIntervalSec: 1.8, windupSec: 0.35, aggroRadius: 110, bodyRadius: 7,
    drops: [
      { itemId: 'jelly_goo', chance: 0.45 },
      { itemId: 'hp_potion_s', chance: 0.06 },
    ],
  },
  sproutcap: {
    id: 'sproutcap', name: 'Sproutcap', sprite: 'mon_sproutcap', element: 'earth',
    hpMult: 1.05, atkMult: 1.0, defMult: 1.1, expMult: 1.05, goldMult: 1.0,
    moveSpeed: 34, attackRange: 18, attackIntervalSec: 1.7, windupSec: 0.4, aggroRadius: 110, bodyRadius: 7,
    drops: [
      { itemId: 'sprout_spore', chance: 0.4 },
      { itemId: 'mp_potion_s', chance: 0.06 },
    ],
  },
  greenfang_pup: {
    id: 'greenfang_pup', name: 'Greenfang Pup', sprite: 'mon_greenfang', element: 'neutral',
    hpMult: 0.95, atkMult: 1.2, defMult: 0.9, expMult: 1.15, goldMult: 1.1,
    moveSpeed: 62, attackRange: 20, attackIntervalSec: 1.3, windupSec: 0.3, aggroRadius: 140, bodyRadius: 8,
    drops: [
      { itemId: 'wolf_fang', chance: 0.35 },
      { itemId: 'hp_potion_s', chance: 0.08 },
    ],
  },
  bramble_sprite: {
    id: 'bramble_sprite', name: 'Bramble Sprite', sprite: 'mon_bramble', element: 'earth',
    hpMult: 0.8, atkMult: 1.15, defMult: 0.7, expMult: 1.1, goldMult: 1.1,
    moveSpeed: 48, attackRange: 18, attackIntervalSec: 1.5, windupSec: 0.3, aggroRadius: 130, bodyRadius: 7,
    drops: [
      { itemId: 'bramble_twig', chance: 0.4 },
      { itemId: 'mp_potion_s', chance: 0.05 },
    ],
  },
  gobbleglob: {
    id: 'gobbleglob', name: 'Gobbleglob', sprite: 'mon_gobbleglob', element: 'earth',
    hpMult: 1, atkMult: 1.8, defMult: 1.2, expMult: 1, goldMult: 1,
    moveSpeed: 42, attackRange: 30, attackIntervalSec: 2.4, windupSec: 0.6, aggroRadius: 400, bodyRadius: 18,
    drops: [
      { itemId: 'mossking_crown_shard', chance: 1 },
      { itemId: 'hp_potion_s', chance: 1, min: 2, max: 3 },
      { itemId: 'mp_potion_s', chance: 0.6, min: 1, max: 2 },
    ],
    boss: {
      title: 'the Moss King',
      enrageAtPct: 0.3,
      enrageSpeedMult: 1.35,
      enrageAtkSpeedMult: 1.5,
      mechanics: [
        { kind: 'aoe_slam', everySec: 9, zones: 4, radius: 30, telegraphSec: 1.3, multiplier: 1.6 },
        { kind: 'summon_minions', everySec: 16, monsterId: 'puffjelly', count: 2, maxAlive: 4 },
      ],
    },
  },
};
