import Phaser from 'phaser';
import { AUDIO, IMAGES, SPRITES } from '../data/assetManifest';
import { VFX } from '../data/vfx';
import { generateCharacterSheet } from './procedural/characters';
import { generateMonsterSheet } from './procedural/monsters';
import { generateProp, generateTileset } from './procedural/environment';
import { generateIcon } from './procedural/icons';
import { generateVfxSheet } from './procedural/vfx';

export const vfxTextureKey = (id: string) => `vfx_${id}`;
export const animKey = (spriteKey: string, anim: string) => `${spriteKey}:${anim}`;

/** Queue every file-backed asset from the manifests. */
export function queueManifestFiles(scene: Phaser.Scene) {
  for (const s of SPRITES) {
    if (s.url) scene.load.spritesheet(s.key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  }
  for (const img of IMAGES) if (img.url) scene.load.image(img.key, img.url);
  for (const v of Object.values(VFX)) {
    if (v.spritesheet) scene.load.spritesheet(vfxTextureKey(v.id), v.spritesheet, { frameWidth: v.frameWidth, frameHeight: v.frameHeight });
  }
  for (const a of AUDIO) if (a.url) scene.load.audio(a.key, a.url);
}

function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, fw: number, fh: number) {
  const tex = scene.textures.addCanvas(key, canvas)!;
  const cols = Math.floor(canvas.width / fw);
  const rows = Math.floor(canvas.height / fh);
  let i = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) tex.add(i++, 0, x * fw, y * fh, fw, fh);
}

/** Generate procedural placeholders for anything that has no file, then register animations. */
export function buildGeneratedAssets(scene: Phaser.Scene) {
  for (const s of SPRITES) {
    if (!scene.textures.exists(s.key)) {
      const [kind, id] = s.generator.split(':');
      const canvas = kind === 'char' ? generateCharacterSheet(id) : generateMonsterSheet(id, s.frameWidth, s.frameHeight);
      addSheet(scene, s.key, canvas, s.frameWidth, s.frameHeight);
    }
    for (const [name, a] of Object.entries(s.anims)) {
      const key = animKey(s.key, name);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: a.frames.map((f) => ({ key: s.key, frame: f })),
        frameRate: a.fps,
        repeat: a.loop ? -1 : 0,
      });
    }
  }
  for (const img of IMAGES) {
    if (scene.textures.exists(img.key) || !img.generator) continue;
    const g = img.generator;
    let canvas: HTMLCanvasElement;
    if (g === 'tiles') canvas = generateTileset();
    else if (g.startsWith('icon:')) canvas = generateIcon(g);
    else canvas = generateProp(g);
    scene.textures.addCanvas(img.key, canvas);
  }
  for (const v of Object.values(VFX)) {
    const key = vfxTextureKey(v.id);
    if (!scene.textures.exists(key)) addSheet(scene, key, generateVfxSheet(v.procedural, v.frameWidth, v.frameHeight, v.frames), v.frameWidth, v.frameHeight);
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: v.frames - 1 }),
        frameRate: v.fps,
        repeat: v.loop ? -1 : 0,
      });
    }
  }
}
