import type { ElementId } from '../data/balance';

export interface StatBlock {
  str: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
}

export const STAT_KEYS: (keyof StatBlock)[] = ['str', 'vit', 'int', 'dex', 'luk'];

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  hit: number;
  flee: number;
  crit: number; // percent
  aspd: number; // attacks per second
  castSpeed: number; // multiplier (1 = normal, higher = faster)
  hpRegen: number; // per second
  mpRegen: number; // per second
  moveSpeed: number;
  dropRate: number; // multiplier
  element: ElementId;
}

export type Faction = 'player' | 'monster' | 'pet';
