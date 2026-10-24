import { BALANCE } from '../data/balance';
import { CLASSES, type BaseClassId, type ClassId } from '../data/classes';
import type { EquipSlot } from '../data/items';
import type { StatBlock } from './types';

/**
 * Local save system (localStorage). One save file holds 3 character slots + settings.
 * Every change to the shape of the data must bump SAVE_VERSION and add a migration.
 */
export const SAVE_VERSION = 1;
const STORAGE_KEY = 'vfo.save';
const BACKUP_KEY = 'vfo.save.backup';

export interface ItemStack {
  uid: string;
  itemId: string;
  qty: number;
  /** Per-instance data for equipment (refine, sockets, bonuses) — M4. */
  refine?: number;
  bonuses?: Record<string, number>;
}

export interface CharacterSave {
  id: string;
  name: string;
  baseClass: BaseClassId;
  classId: ClassId;
  level: number;
  exp: number;
  gold: number;
  stats: StatBlock;
  statPoints: number;
  skillPoints: number;
  skills: Record<string, number>;
  skillSlots: (string | null)[];
  hp: number;
  mp: number;
  inventory: ItemStack[];
  inventoryCapacity: number;
  equipment: Partial<Record<EquipSlot, ItemStack>>;
  potionSlots: (string | null)[];
  autoBattle: boolean;
  autoPotion: { enabled: boolean; hpPct: number; mpPct: number; hpItem: string; mpItem: string };
  quests: Record<string, unknown>;
  flags: Record<string, boolean | number | string>;
  stats_record: { kills: number; deaths: number; dungeonClears: Record<string, number> };
  createdAt: number;
  lastPlayed: number;
  playTimeSec: number;
}

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  damageNumbers: boolean;
  vfxQuality: 'low' | 'medium' | 'high';
}

export interface SaveFile {
  version: number;
  slots: (CharacterSave | null)[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { musicVolume: 0.6, sfxVolume: 0.8, damageNumbers: true, vfxQuality: 'medium' };

function emptySave(): SaveFile {
  return { version: SAVE_VERSION, slots: [null, null, null], settings: { ...DEFAULT_SETTINGS } };
}

/** migrations[n] upgrades a save from version n to n+1. */
const MIGRATIONS: Record<number, (s: any) => any> = {
  // 1: (s) => { ...; s.version = 2; return s; },
};

function migrate(raw: any): SaveFile {
  let s = raw;
  if (typeof s.version !== 'number') s.version = 1;
  while (s.version < SAVE_VERSION) {
    const m = MIGRATIONS[s.version];
    if (!m) throw new Error(`No migration from save v${s.version}`);
    s = m(s);
  }
  // Fill any missing fields with defaults so older/partial saves still load.
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) };
  s.slots = Array.from({ length: 3 }, (_, i) => (s.slots?.[i] ? normalizeCharacter(s.slots[i]) : null));
  return s as SaveFile;
}

function normalizeCharacter(c: any): CharacterSave {
  const base = newCharacter(c.name ?? 'Hero', c.baseClass ?? 'swordsman');
  return {
    ...base,
    ...c,
    stats: { ...base.stats, ...(c.stats ?? {}) },
    autoPotion: { ...base.autoPotion, ...(c.autoPotion ?? {}) },
    stats_record: { ...base.stats_record, ...(c.stats_record ?? {}) },
    skillSlots: Array.from({ length: 5 }, (_, i) => c.skillSlots?.[i] ?? null),
    potionSlots: Array.from({ length: 2 }, (_, i) => c.potionSlots?.[i] ?? base.potionSlots[i]),
  };
}

let uidCounter = 0;
export function makeUid(): string {
  uidCounter = (uidCounter + 1) % 1e6;
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}${uidCounter.toString(36)}`;
}

export function newCharacter(name: string, baseClass: BaseClassId): CharacterSave {
  const cls = CLASSES[baseClass];
  const b = BALANCE.baseStatValue;
  const skills: Record<string, number> = {};
  cls.starterSkills.forEach((s) => (skills[s] = 1));
  const slots: (string | null)[] = [null, null, null, null, null];
  cls.starterSkills.forEach((s, i) => (slots[i] = s));
  return {
    id: makeUid(),
    name,
    baseClass,
    classId: baseClass,
    level: 1,
    exp: 0,
    gold: 100,
    stats: { str: b, vit: b, int: b, dex: b, luk: b },
    statPoints: 0,
    skillPoints: 0,
    skills,
    skillSlots: slots,
    hp: -1, // -1 = full on load
    mp: -1,
    inventory: [
      { uid: makeUid(), itemId: 'hp_potion_s', qty: 10 },
      { uid: makeUid(), itemId: 'mp_potion_s', qty: 5 },
    ],
    inventoryCapacity: BALANCE.inventory.startCapacity,
    equipment: {
      weapon: { uid: makeUid(), itemId: cls.starterWeapon, qty: 1, refine: 0 },
      armor: { uid: makeUid(), itemId: 'linen_tunic', qty: 1, refine: 0 },
    },
    potionSlots: ['hp_potion_s', 'mp_potion_s'],
    autoBattle: false,
    autoPotion: { enabled: false, hpPct: 0.5, mpPct: 0.3, hpItem: 'hp_potion_s', mpItem: 'mp_potion_s' },
    quests: {},
    flags: {},
    stats_record: { kills: 0, deaths: 0, dungeonClears: {} },
    createdAt: Date.now(),
    lastPlayed: Date.now(),
    playTimeSec: 0,
  };
}

class SaveManagerImpl {
  private data: SaveFile = emptySave();
  private listeners: ((saving: boolean) => void)[] = [];

  load(): SaveFile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.data = migrate(JSON.parse(raw));
    } catch (e) {
      console.error('Save load failed, trying backup', e);
      try {
        const bak = localStorage.getItem(BACKUP_KEY);
        this.data = bak ? migrate(JSON.parse(bak)) : emptySave();
      } catch {
        this.data = emptySave();
      }
    }
    return this.data;
  }

  get file(): SaveFile {
    return this.data;
  }

  get settings(): Settings {
    return this.data.settings;
  }

  onSaving(fn: (saving: boolean) => void) {
    this.listeners.push(fn);
    return () => (this.listeners = this.listeners.filter((l) => l !== fn));
  }

  /** Persist the whole save file. */
  persist() {
    this.listeners.forEach((l) => l(true));
    try {
      const prev = localStorage.getItem(STORAGE_KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      this.data.version = SAVE_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Save failed', e);
    }
    setTimeout(() => this.listeners.forEach((l) => l(false)), 700);
  }

  saveCharacter(slot: number, c: CharacterSave) {
    c.lastPlayed = Date.now();
    this.data.slots[slot] = c;
    this.persist();
  }

  deleteCharacter(slot: number) {
    this.data.slots[slot] = null;
    this.persist();
  }

  nameTaken(name: string): boolean {
    const n = name.toLowerCase();
    return this.data.slots.some((s) => s && s.name.toLowerCase() === n);
  }
}

export const SaveManager = new SaveManagerImpl();

export function validateName(name: string): string | null {
  if (name.length < 3 || name.length > 12) return 'Name must be 3-12 characters.';
  if (!/^[A-Za-z0-9]+$/.test(name)) return 'Letters and numbers only.';
  if (SaveManager.nameTaken(name)) return 'That name is already taken.';
  return null;
}
