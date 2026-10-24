import Phaser from 'phaser';
import { SaveManager } from '../core/SaveManager';
import { VFX } from '../data/vfx';
import { vfxTextureKey } from './AssetLoader';

const BLEND: Record<string, Phaser.BlendModes> = {
  NORMAL: Phaser.BlendModes.NORMAL,
  ADD: Phaser.BlendModes.ADD,
  SCREEN: Phaser.BlendModes.SCREEN,
};

export interface VfxOpts {
  flipX?: boolean;
  depth?: number;
  scale?: number;
  rotation?: number;
  tint?: number;
  follow?: Phaser.GameObjects.Components.Transform;
}

/** Plays data-driven VFX (see src/data/vfx.ts). */
export class VfxManager {
  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists('px')) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
      g.generateTexture('px', 2, 2);
      g.destroy();
    }
  }

  play(id: string, x: number, y: number, o: VfxOpts = {}): Phaser.GameObjects.Sprite | null {
    const def = VFX[id];
    if (!def) return null;
    const key = vfxTextureKey(id);
    const flip = o.flipX ? -1 : 1;
    const ox = def.offset.x * flip, oy = def.offset.y;
    const s = this.scene.add.sprite(x + ox, y + oy, key, 0);
    s.setScale((o.scale ?? 1) * def.scale);
    s.setFlipX(!!o.flipX);
    s.setBlendMode(BLEND[def.blendMode] ?? Phaser.BlendModes.NORMAL);
    if (o.tint ?? def.tint) s.setTint(o.tint ?? def.tint!);
    if (o.rotation) s.setRotation(o.rotation);
    s.setDepth(o.depth ?? y + 50);
    s.play(key);
    if (!def.loop) s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    if (o.follow) {
      const target = o.follow;
      const upd = () => {
        if (!s.active) return;
        s.setPosition(target.x + ox, target.y + oy);
        s.setDepth(target.y + 50);
      };
      this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, upd);
      s.once(Phaser.GameObjects.Events.DESTROY, () => this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, upd));
    }
    if (def.particles) this.burst(x, y + oy, def.particles.color, def.particles.count, def.particles.speed);
    return s;
  }

  /** Quality-scaled particle burst. */
  burst(x: number, y: number, color: number, count: number, speed: number) {
    const q = SaveManager.settings.vfxQuality;
    const mult = q === 'low' ? 0 : q === 'medium' ? 1 : 2;
    const n = Math.round(count * mult);
    if (!n) return;
    const em = this.scene.add.particles(x, y, 'px', {
      speed: { min: speed * 0.4, max: speed },
      angle: { min: 0, max: 360 },
      lifespan: { min: 250, max: 550 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 60,
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    em.setDepth(y + 60);
    em.explode(n);
    this.scene.time.delayedCall(700, () => em.destroy());
  }
}
