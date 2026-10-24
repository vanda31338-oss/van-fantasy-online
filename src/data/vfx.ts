/**
 * VFX DEFINITIONS
 *
 * Each effect is a sprite-sheet animation. While `spritesheet` is empty a procedural
 * placeholder is generated (generator id = `procedural`). To use real art, put the sheet in
 * assets/vfx/ and set `spritesheet: 'vfx/my_sheet.png'` plus frame size/count — no code changes.
 */
export interface VfxDef {
  id: string;
  /** Path under /assets, e.g. 'vfx/slash.png'. Empty = procedural placeholder. */
  spritesheet?: string;
  procedural: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  scale: number;
  offset: { x: number; y: number };
  blendMode: 'NORMAL' | 'ADD' | 'SCREEN';
  tint?: number;
  loop: boolean;
  /** Extra particle sparkle on Medium/High quality. */
  particles?: { color: number; count: number; speed: number };
}

export const VFX: Record<string, VfxDef> = {
  slash: {
    id: 'slash', procedural: 'slash', frameWidth: 48, frameHeight: 48, frames: 5, fps: 24,
    scale: 1, offset: { x: 14, y: -12 }, blendMode: 'NORMAL', loop: false,
  },
  power_strike: {
    id: 'power_strike', procedural: 'slash_heavy', frameWidth: 64, frameHeight: 64, frames: 6, fps: 20,
    scale: 1, offset: { x: 16, y: -14 }, blendMode: 'ADD', tint: 0xffd36b, loop: false,
    particles: { color: 0xffd36b, count: 8, speed: 90 },
  },
  cleave: {
    id: 'cleave', procedural: 'slash_wide', frameWidth: 80, frameHeight: 64, frames: 6, fps: 22,
    scale: 1, offset: { x: 18, y: -12 }, blendMode: 'NORMAL', loop: false,
  },
  hit: {
    id: 'hit', procedural: 'spark', frameWidth: 24, frameHeight: 24, frames: 4, fps: 24,
    scale: 1, offset: { x: 0, y: -10 }, blendMode: 'ADD', loop: false,
  },
  hit_heavy: {
    id: 'hit_heavy', procedural: 'spark_big', frameWidth: 40, frameHeight: 40, frames: 5, fps: 20,
    scale: 1, offset: { x: 0, y: -10 }, blendMode: 'ADD', tint: 0xfff0a0, loop: false,
    particles: { color: 0xffe08a, count: 6, speed: 70 },
  },
  hit_fire: {
    id: 'hit_fire', procedural: 'burst_fire', frameWidth: 32, frameHeight: 32, frames: 5, fps: 18,
    scale: 1, offset: { x: 0, y: -10 }, blendMode: 'ADD', loop: false,
    particles: { color: 0xff7a2a, count: 6, speed: 60 },
  },
  magic_bolt: {
    id: 'magic_bolt', procedural: 'orb:#9fd8ff', frameWidth: 16, frameHeight: 16, frames: 4, fps: 16,
    scale: 1, offset: { x: 0, y: -12 }, blendMode: 'ADD', loop: true,
  },
  spirit_bolt: {
    id: 'spirit_bolt', procedural: 'orb:#9cffc4', frameWidth: 16, frameHeight: 16, frames: 4, fps: 16,
    scale: 1, offset: { x: 0, y: -12 }, blendMode: 'ADD', loop: true,
  },
  monster_hit: {
    id: 'monster_hit', procedural: 'claw', frameWidth: 24, frameHeight: 24, frames: 4, fps: 20,
    scale: 1, offset: { x: 0, y: -12 }, blendMode: 'NORMAL', loop: false,
  },
  level_up: {
    id: 'level_up', procedural: 'pillar', frameWidth: 48, frameHeight: 96, frames: 10, fps: 14,
    scale: 1, offset: { x: 0, y: -40 }, blendMode: 'ADD', loop: false,
    particles: { color: 0xffe066, count: 24, speed: 110 },
  },
  buff_aura: {
    id: 'buff_aura', procedural: 'ring:#ff9a3d', frameWidth: 48, frameHeight: 32, frames: 6, fps: 14,
    scale: 1, offset: { x: 0, y: -2 }, blendMode: 'ADD', loop: false,
    particles: { color: 0xffb060, count: 10, speed: 50 },
  },
  heal: {
    id: 'heal', procedural: 'sparkle:#7dff9a', frameWidth: 32, frameHeight: 40, frames: 6, fps: 12,
    scale: 1, offset: { x: 0, y: -14 }, blendMode: 'ADD', loop: false,
    particles: { color: 0x9dffb0, count: 8, speed: 35 },
  },
  mana: {
    id: 'mana', procedural: 'sparkle:#7db8ff', frameWidth: 32, frameHeight: 40, frames: 6, fps: 12,
    scale: 1, offset: { x: 0, y: -14 }, blendMode: 'ADD', loop: false,
  },
  death_poof: {
    id: 'death_poof', procedural: 'poof', frameWidth: 32, frameHeight: 32, frames: 6, fps: 14,
    scale: 1, offset: { x: 0, y: -8 }, blendMode: 'NORMAL', loop: false,
  },
  slam: {
    id: 'slam', procedural: 'shockwave', frameWidth: 64, frameHeight: 40, frames: 6, fps: 18,
    scale: 1, offset: { x: 0, y: 0 }, blendMode: 'NORMAL', loop: false,
    particles: { color: 0x8a6a3a, count: 10, speed: 80 },
  },
  spawn: {
    id: 'spawn', procedural: 'ring:#c48bff', frameWidth: 48, frameHeight: 32, frames: 6, fps: 14,
    scale: 1, offset: { x: 0, y: -2 }, blendMode: 'ADD', loop: false,
  },
  portal_swirl: {
    id: 'portal_swirl', procedural: 'swirl', frameWidth: 32, frameHeight: 32, frames: 6, fps: 10,
    scale: 1, offset: { x: 0, y: -16 }, blendMode: 'ADD', loop: true,
  },
};
