import { BALANCE, elementMultiplier, type ElementId } from '../data/balance';

export interface AttackParams {
  power: number; // ATK or MATK
  multiplier: number;
  defense: number; // DEF or MDEF of the defender
  critChance: number; // percent
  attackElement: ElementId;
  defendElement: ElementId;
  hit: number;
  flee: number;
  canCrit?: boolean;
  alwaysHit?: boolean;
}

export interface HitResult {
  damage: number;
  crit: boolean;
  miss: boolean;
  elementMult: number;
}

/** dmg = ATK * skillMultiplier * (100 / (100 + DEF)) * crit * element, ±variance */
export function resolveAttack(p: AttackParams): HitResult {
  const C = BALANCE.combat;
  if (!p.alwaysHit) {
    const chance = Math.max(C.minHitChance, Math.min(C.maxHitChance, C.baseHitChance + (p.hit - p.flee) * C.hitChancePerPoint));
    if (Math.random() > chance) return { damage: 0, crit: false, miss: true, elementMult: 1 };
  }
  const crit = p.canCrit !== false && Math.random() * 100 < p.critChance;
  const elementMult = elementMultiplier(p.attackElement, p.defendElement);
  const variance = 1 + (Math.random() * 2 - 1) * C.damageVariance;
  const raw = p.power * p.multiplier * (100 / (100 + Math.max(0, p.defense))) * (crit ? BALANCE.derived.critMultiplier : 1) * elementMult * variance;
  return { damage: Math.max(1, Math.round(raw)), crit, miss: false, elementMult };
}
