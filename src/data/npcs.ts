export type NpcAction = 'dungeon' | 'shop' | 'blacksmith' | 'runes' | 'class_master' | 'bulletin' | 'none';

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  sprite: string; // asset key ('' = prop-only NPC like the bulletin board)
  /** Position in tiles (town map). */
  tx: number;
  ty: number;
  facing: 1 | -1;
  lines: string[];
  action: NpcAction;
  actionLabel?: string;
  /** Feature not built yet — shown as "coming soon" after the dialogue. */
  comingSoon?: string;
}

export const NPCS: NpcDef[] = [
  {
    id: 'elder_rowan', name: 'Elder Rowan', title: 'Village Elder', sprite: 'npc_elder', tx: 24, ty: 14, facing: 1,
    lines: [
      'Welcome to Vanheim, young adventurer! I am Rowan, elder of this town.',
      'Move with the joystick on the left. Hold the big sword button to attack, and tap your skill buttons to unleash techniques.',
      'Monsters have been stirring in the Whispering Greenwood. Speak with the Gatekeeper to the south when you are ready.',
      'Defeat the Moss King at the end of the forest and you will have earned your first true victory!',
    ],
    action: 'none',
  },
  {
    id: 'merchant_mila', name: 'Merchant Mila', title: 'General Store', sprite: 'npc_merchant', tx: 12, ty: 19, facing: -1,
    lines: ['Hiya! Potions, scrolls, refine stones... Mila\'s shop has it all!', 'Well... it will, once my next shipment arrives. Come back soon!'],
    action: 'shop', comingSoon: 'The General Store opens in the next update.',
  },
  {
    id: 'blacksmith_borin', name: 'Blacksmith Borin', title: 'Refine & Gems', sprite: 'npc_blacksmith', tx: 12, ty: 27, facing: -1,
    lines: ['Hrm. Bring me good steel and Refine Stones and I\'ll make your gear sing.', 'Come back when you\'ve found some real equipment.'],
    action: 'blacksmith', comingSoon: 'Refining, sockets and gems arrive in a later update.',
  },
  {
    id: 'runekeeper_selene', name: 'Runekeeper Selene', title: 'Runes', sprite: 'npc_runekeeper', tx: 43, ty: 17, facing: 1,
    lines: ['The runes whisper of great power... but they will not answer to a novice.', 'Grow stronger, and return to me.'],
    action: 'runes', comingSoon: 'Runes unlock at Lv 25 in a later update.',
  },
  {
    id: 'sword_master', name: 'Sword Master', title: 'Kaelen, Class Master', sprite: 'npc_swordmaster', tx: 36, ty: 25, facing: -1,
    lines: ['A Swordsman, eh? At level 30, come to me. I will test whether you walk the path of the Berserker or the Guardian.'],
    action: 'class_master', comingSoon: 'The Class Change Quest unlocks at Lv 30.',
  },
  {
    id: 'archmage', name: 'Archmage', title: 'Ilyra, Class Master', sprite: 'npc_archmage', tx: 41, ty: 25, facing: -1,
    lines: ['The arcane arts demand patience. Mages who reach level 30 may seek my trial.'],
    action: 'class_master', comingSoon: 'The Class Change Quest unlocks at Lv 30.',
  },
  {
    id: 'beast_sage', name: 'Beast Sage', title: 'Toma, Class Master', sprite: 'npc_beastsage', tx: 46, ty: 25, facing: -1,
    lines: ['The wild spirits are restless. Summoners of level 30 may prove their bond to me.'],
    action: 'class_master', comingSoon: 'The Class Change Quest unlocks at Lv 30.',
  },
  {
    id: 'gatekeeper', name: 'Gatekeeper Brann', title: 'Dungeon Teleport', sprite: 'npc_gatekeeper', tx: 23, ty: 30, facing: 1,
    lines: ['Halt! ...Oh, an adventurer. I can open the gate to the dungeons. Where to?'],
    action: 'dungeon', actionLabel: 'Choose dungeon',
  },
  {
    id: 'bulletin', name: 'Bulletin Board', title: 'Daily Quests', sprite: '', tx: 33, ty: 12, facing: 1,
    lines: ['"WANTED: brave souls to clear the Whispering Greenwood!"', '"Daily quests posted here soon. — The Town Guard"'],
    action: 'bulletin', comingSoon: 'Daily quests arrive in a later update.',
  },
];
