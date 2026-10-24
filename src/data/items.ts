export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'gem_rune';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#ffffff',
  uncommon: '#6ee26e',
  rare: '#5aa8ff',
  epic: '#c27bff',
  legendary: '#ffa13d',
};

export type EquipSlot = 'weapon' | 'offhand' | 'head' | 'armor' | 'boots' | 'necklace' | 'ring1' | 'ring2' | 'rune1' | 'rune2' | 'rune3';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string;
  description: string;
  rarity: Rarity;
  stackable: boolean;
  maxStack: number;
  sellPrice: number;
  buyPrice?: number;
  /** Consumable effect. */
  use?: { healHp?: number; healHpPct?: number; healMp?: number; healMpPct?: number; potion?: boolean };
  /** Equipment base stats. */
  equip?: { slot: EquipSlot; atk?: number; matk?: number; def?: number; mdef?: number; levelReq: number; classes?: string[] };
}

export const ITEMS: Record<string, ItemDef> = {
  // ---------------- Consumables ----------------
  hp_potion_s: {
    id: 'hp_potion_s', name: 'HP Potion S', category: 'consumable', icon: 'icon_hp_potion_s',
    description: 'Restores 60 HP + 8% max HP.', rarity: 'common', stackable: true, maxStack: 999,
    sellPrice: 5, buyPrice: 20, use: { healHp: 60, healHpPct: 0.08, potion: true },
  },
  mp_potion_s: {
    id: 'mp_potion_s', name: 'MP Potion S', category: 'consumable', icon: 'icon_mp_potion_s',
    description: 'Restores 25 MP + 8% max MP.', rarity: 'common', stackable: true, maxStack: 999,
    sellPrice: 6, buyPrice: 25, use: { healMp: 25, healMpPct: 0.08, potion: true },
  },

  // ---------------- Materials ----------------
  jelly_goo: {
    id: 'jelly_goo', name: 'Jelly Goo', category: 'material', icon: 'icon_jelly_goo',
    description: 'Wobbly pink goo. Smells faintly of strawberries.', rarity: 'common', stackable: true, maxStack: 999, sellPrice: 3,
  },
  sprout_spore: {
    id: 'sprout_spore', name: 'Sprout Spore', category: 'material', icon: 'icon_sprout_spore',
    description: 'A glowing spore shaken loose from a Sproutcap.', rarity: 'common', stackable: true, maxStack: 999, sellPrice: 4,
  },
  wolf_fang: {
    id: 'wolf_fang', name: 'Greenfang Tooth', category: 'material', icon: 'icon_wolf_fang',
    description: 'A small but sharp tooth.', rarity: 'common', stackable: true, maxStack: 999, sellPrice: 5,
  },
  bramble_twig: {
    id: 'bramble_twig', name: 'Bramble Twig', category: 'material', icon: 'icon_bramble_twig',
    description: 'A thorny twig that still twitches.', rarity: 'common', stackable: true, maxStack: 999, sellPrice: 5,
  },
  mossking_crown_shard: {
    id: 'mossking_crown_shard', name: 'Moss Crown Shard', category: 'material', icon: 'icon_crown_shard',
    description: 'A fragment of the Moss King\'s crown. Valuable!', rarity: 'uncommon', stackable: true, maxStack: 999, sellPrice: 40,
  },

  // ---------------- Starter equipment ----------------
  training_sword: {
    id: 'training_sword', name: 'Training Sword', category: 'equipment', icon: 'icon_sword',
    description: 'A trusty blade for new adventurers.', rarity: 'common', stackable: false, maxStack: 1, sellPrice: 10,
    equip: { slot: 'weapon', atk: 10, levelReq: 1, classes: ['swordsman'] },
  },
  apprentice_staff: {
    id: 'apprentice_staff', name: 'Apprentice Staff', category: 'equipment', icon: 'icon_staff',
    description: 'A staff with a tiny crystal.', rarity: 'common', stackable: false, maxStack: 1, sellPrice: 10,
    equip: { slot: 'weapon', atk: 3, matk: 12, levelReq: 1, classes: ['mage'] },
  },
  oak_grimoire: {
    id: 'oak_grimoire', name: 'Oak Grimoire', category: 'equipment', icon: 'icon_book',
    description: 'A book of simple summoning pacts.', rarity: 'common', stackable: false, maxStack: 1, sellPrice: 10,
    equip: { slot: 'weapon', atk: 3, matk: 11, levelReq: 1, classes: ['summoner'] },
  },
  linen_tunic: {
    id: 'linen_tunic', name: 'Linen Tunic', category: 'equipment', icon: 'icon_armor',
    description: 'Simple, comfy, barely armor.', rarity: 'common', stackable: false, maxStack: 1, sellPrice: 8,
    equip: { slot: 'armor', def: 4, mdef: 2, levelReq: 1 },
  },
};
