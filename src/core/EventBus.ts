import Phaser from 'phaser';

/** Global event bus shared by world scenes and the HUD. */
export const Bus = new Phaser.Events.EventEmitter();

export const Ev = {
  PLAYER_CHANGED: 'player:changed', // hp/mp/exp/level/gold/stats
  LEVEL_UP: 'player:levelup',
  INVENTORY_CHANGED: 'inventory:changed',
  TOAST: 'ui:toast',
  BOSS_HP: 'boss:hp', // (name, hp, max) or null
  WAVE: 'dungeon:wave', // text
  SETTINGS_CHANGED: 'settings:changed',
  SKILL_USED: 'skill:used',
} as const;
