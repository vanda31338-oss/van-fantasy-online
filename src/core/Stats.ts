import { BALANCE } from '../data/balance';
import { CLASSES } from '../data/classes';
import { ITEMS } from '../data/items';
import type { BuffStat } from '../data/skills';
import type { CharacterSave } from './SaveManager';
import type { DerivedStats } from './types';

export interface ActiveBuff {
  id: string;
  name: string;
  stats: Partial<Record<BuffStat, number>>;
  expiresAt: number; // scene time ms
  duration: number; // ms
  icon?: string;
}

export function equipmentTotals(c: CharacterSave) {
  const t = { atk: 0, matk: 0, def: 0, mdef: 0 };
  for (const stack of Object.values(c.equipment)) {
    if (!stack) continue;
    const def = ITEMS[stack.itemId]?.equip;
    if (!def) continue;
    const refineMult = 1 + (stack.refine ?? 0) * 0.06;
    t.atk += (def.atk ?? 0) * refineMult;
    t.matk += (def.matk ?? 0) * refineMult;
    t.def += (def.def ?? 0) * refineMult;
    t.mdef += (def.mdef ?? 0) * refineMult;
  }
  return t;
}

export function computeDerived(c: CharacterSave, buffs: ActiveBuff[] = []): DerivedStats {
  const D = BALANCE.derived;
  const cls = CLASSES[c.classId];
  const s = c.stats;
  const L = c.level;
  const eq = equipmentTotals(c);
  const sum = (k: BuffStat) => buffs.reduce((a, b) => a + (b.stats[k] ?? 0), 0);

  const maxHp = Math.round((cls.hpBase + cls.hpPerLevel * (L - 1)) * (1 + s.vit * D.hpVitPercent) + s.vit * D.hpPerVit);
  const maxMp = Math.round((cls.mpBase + cls.mpPerLevel * (L - 1)) * (1 + s.int * D.mpIntPercent) + s.int * D.mpPerInt);
  const atk = (s.str * D.atkPerStr + s.dex * D.atkPerDex + L * D.atkPerLevel + eq.atk) * (1 + sum('atkPct'));
  const matk = (s.int * D.matkPerInt + L * D.matkPerLevel + eq.matk) * (1 + sum('matkPct'));
  const def = (s.vit * D.defPerVit + L * D.defPerLevel + eq.def) * (1 + sum('defPct'));
  const mdef = (s.int * D.mdefPerInt + s.vit * D.mdefPerVit + L * D.mdefPerLevel + eq.mdef) * (1 + sum('mdefPct'));
  const aspd = Math.min(D.aspdCap, cls.baseAps * (1 + s.dex * D.aspdPerDex) * (1 + sum('aspdPct')));
  return {
    maxHp,
    maxMp,
    atk: Math.round(atk),
    matk: Math.round(matk),
    def: Math.round(Math.max(0, def)),
    mdef: Math.round(Math.max(0, mdef)),
    hit: Math.round(s.dex * D.hitPerDex + L * D.hitPerLevel),
    flee: Math.round(s.luk * D.fleePerLuk + s.dex * D.fleePerDex + L * D.fleePerLevel),
    crit: Math.min(D.critCap, D.critBase + s.luk * D.critPerLuk),
    aspd: Math.round(aspd * 100) / 100,
    castSpeed: 1 + s.dex * D.castSpeedPerDex + s.int * D.castSpeedPerInt,
    hpRegen: maxHp * D.hpRegenPctPerSec + s.vit * D.hpRegenPerVit + maxHp * sum('hpRegenPctMaxHp'),
    mpRegen: maxMp * D.mpRegenPctPerSec + s.int * D.mpRegenPerInt,
    moveSpeed: BALANCE.player.moveSpeed * (1 + sum('moveSpeedPct')),
    dropRate: 1 + s.luk * D.dropRatePerLuk,
    element: 'neutral',
  };
}
