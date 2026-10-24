import { BALANCE } from '../data/balance';
import { ITEMS, type ItemCategory } from '../data/items';
import { Bus, Ev } from './EventBus';
import { makeUid, SaveManager, type CharacterSave } from './SaveManager';
import { computeDerived, type ActiveBuff } from './Stats';
import type { DerivedStats, StatBlock } from './types';

/**
 * The active play session: which slot is loaded, the character data,
 * derived stats and runtime-only state (buffs, cooldowns).
 */
class GameStateImpl {
  slot = -1;
  char!: CharacterSave;
  derived!: DerivedStats;
  buffs: ActiveBuff[] = [];
  private playTimer = 0;

  get loaded() {
    return this.slot >= 0 && !!this.char;
  }

  start(slot: number) {
    const c = SaveManager.file.slots[slot];
    if (!c) throw new Error('Empty slot');
    this.slot = slot;
    this.char = c;
    this.buffs = [];
    this.recompute();
    if (c.hp < 0 || c.hp > this.derived.maxHp) c.hp = this.derived.maxHp;
    if (c.mp < 0 || c.mp > this.derived.maxMp) c.mp = this.derived.maxMp;
    if (c.hp <= 0) c.hp = this.derived.maxHp;
  }

  recompute() {
    this.derived = computeDerived(this.char, this.buffs);
    this.char.hp = Math.min(this.char.hp, this.derived.maxHp);
    this.char.mp = Math.min(this.char.mp, this.derived.maxMp);
    Bus.emit(Ev.PLAYER_CHANGED);
  }

  save() {
    if (!this.loaded) return;
    SaveManager.saveCharacter(this.slot, this.char);
  }

  tickPlayTime(dtSec: number) {
    if (!this.loaded) return;
    this.playTimer += dtSec;
    if (this.playTimer >= 1) {
      this.char.playTimeSec += Math.floor(this.playTimer);
      this.playTimer %= 1;
    }
  }

  // ------------------------------------------------------------ progression
  expToNext() {
    return BALANCE.expToNext(this.char.level);
  }

  /** Returns number of levels gained. */
  addExp(amount: number): number {
    const c = this.char;
    if (c.level >= BALANCE.levelCap) return 0;
    c.exp += Math.round(amount);
    let gained = 0;
    while (c.level < BALANCE.levelCap && c.exp >= BALANCE.expToNext(c.level)) {
      c.exp -= BALANCE.expToNext(c.level);
      c.level++;
      c.statPoints += BALANCE.statPointsPerLevel;
      c.skillPoints += BALANCE.skillPointsPerLevel;
      gained++;
    }
    if (c.level >= BALANCE.levelCap) c.exp = 0;
    if (gained) {
      this.recompute();
      c.hp = this.derived.maxHp;
      c.mp = this.derived.maxMp;
      Bus.emit(Ev.LEVEL_UP, c.level, gained);
      this.save();
    }
    Bus.emit(Ev.PLAYER_CHANGED);
    return gained;
  }

  applyDeathPenalty(): number {
    const loss = Math.floor(this.expToNext() * BALANCE.deathExpPenalty);
    const actual = Math.min(this.char.exp, loss);
    this.char.exp -= actual;
    this.char.stats_record.deaths++;
    Bus.emit(Ev.PLAYER_CHANGED);
    return actual;
  }

  addGold(n: number) {
    this.char.gold = Math.max(0, this.char.gold + Math.round(n));
    Bus.emit(Ev.PLAYER_CHANGED);
  }

  allocateStat(k: keyof StatBlock, n = 1) {
    const c = this.char;
    const amount = Math.min(n, c.statPoints);
    if (amount <= 0) return;
    c.stats[k] += amount;
    c.statPoints -= amount;
    this.recompute();
  }

  // ------------------------------------------------------------ inventory
  countItem(itemId: string) {
    return this.char.inventory.filter((s) => s.itemId === itemId).reduce((a, s) => a + s.qty, 0);
  }

  usedSlots() {
    return this.char.inventory.length;
  }

  isInventoryFull() {
    return this.usedSlots() >= this.char.inventoryCapacity;
  }

  /** Adds items; returns how many could not be added (inventory full). */
  addItem(itemId: string, qty = 1): number {
    const def = ITEMS[itemId];
    if (!def) return qty;
    let left = qty;
    if (def.stackable) {
      for (const s of this.char.inventory) {
        if (s.itemId !== itemId || left <= 0) continue;
        const room = def.maxStack - s.qty;
        const add = Math.min(room, left);
        s.qty += add;
        left -= add;
      }
    }
    while (left > 0 && !this.isInventoryFull()) {
      const add = def.stackable ? Math.min(def.maxStack, left) : 1;
      this.char.inventory.push({ uid: makeUid(), itemId, qty: add, refine: def.category === 'equipment' ? 0 : undefined });
      left -= add;
    }
    Bus.emit(Ev.INVENTORY_CHANGED);
    return left;
  }

  removeItem(itemId: string, qty = 1): boolean {
    if (this.countItem(itemId) < qty) return false;
    let left = qty;
    for (let i = this.char.inventory.length - 1; i >= 0 && left > 0; i--) {
      const s = this.char.inventory[i];
      if (s.itemId !== itemId) continue;
      const take = Math.min(s.qty, left);
      s.qty -= take;
      left -= take;
      if (s.qty <= 0) this.char.inventory.splice(i, 1);
    }
    Bus.emit(Ev.INVENTORY_CHANGED);
    return true;
  }

  itemsByCategory(cat: ItemCategory) {
    return this.char.inventory.filter((s) => ITEMS[s.itemId]?.category === cat);
  }
}

export const GameState = new GameStateImpl();
