import Phaser from 'phaser';
import { AudioManager } from '../core/AudioManager';
import { FONT, txt } from '../ui/theme';
import { restartOnResize } from '../ui/resize';

/** Draw the (large) title illustration into a canvas sized for the current game size, with smooth downscaling. */
export function coverBackground(scene: Phaser.Scene, darken = 0): Phaser.GameObjects.Image {
  const W = scene.scale.width, H = scene.scale.height;
  const key = `title_scaled_${W}x${H}`;
  if (!scene.textures.exists(key)) {
    const src = scene.textures.get('title_bg').getSourceImage() as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const s = Math.max(W / src.width, H / src.height);
    const dw = src.width * s, dh = src.height * s;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    scene.textures.addCanvas(key, canvas);
  }
  const img = scene.add.image(0, 0, key).setOrigin(0);
  if (darken) scene.add.rectangle(0, 0, W, H, 0x120e22, darken).setOrigin(0);
  return img;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    coverBackground(this);
    // soft vignette at the top for logo readability
    const g = this.add.graphics();
    for (let i = 0; i < 24; i++) g.fillStyle(0x1a1040, 0.22 * (1 - i / 24)).fillRect(0, i * 4, W, 4);

    const logo = this.add.text(W / 2, 30, 'Van Fantasy Online', {
      fontFamily: FONT, fontSize: '24px', color: '#ffe9a8', stroke: '#2a1440', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5, 0).setResolution(1);
    const grd = logo.context.createLinearGradient(0, 0, 0, logo.height);
    grd.addColorStop(0, '#fff8d0');
    grd.addColorStop(0.5, '#ffd040');
    grd.addColorStop(1, '#ff9a2a');
    logo.setFill(grd);
    logo.setShadow(0, 0, '#ffe9a8', 10, true, false);
    const sub = txt(this, W / 2, 64, '~ A Pixel Adventure ~', 8, { color: '#ffffff', stroke: '#2a1440', strokeThickness: 3 }).setOrigin(0.5, 0);
    this.tweens.add({ targets: logo, y: 33, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: sub, alpha: { from: 0.7, to: 1 }, yoyo: true, repeat: -1, duration: 1800 });

    const tap = txt(this, W / 2, H - 42, 'Tap to Start', 16, { color: '#ffffff', stroke: '#2a1440', strokeThickness: 5 }).setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: { from: 1, to: 0.15 }, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
    txt(this, W - 6, H - 12, 'v0.1 M1', 8, { font: 'body', color: '#ffffff', stroke: '#2a1440', strokeThickness: 2 }).setOrigin(1, 0);

    // sparkles drifting over the scene
    this.time.addEvent({
      delay: 260, loop: true, callback: () => {
        const s = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(80, H - 60), 2, 2, 0xfff4b0).setAlpha(0);
        this.tweens.add({ targets: s, alpha: { from: 0, to: 1 }, y: s.y - 20, yoyo: true, duration: 900, onComplete: () => s.destroy() });
      },
    });

    let started = false;
    this.input.once('pointerup', () => {
      if (started) return;
      started = true;
      AudioManager.unlock();
      AudioManager.sfx('ui_click');
      if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
        try {
          this.scale.startFullscreen();
          (screen.orientation as any)?.lock?.('landscape').catch(() => {});
        } catch {
          /* ignore */
        }
      }
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('CharSelect'));
    });
    this.input.keyboard?.once('keydown-ENTER', () => this.input.emit('pointerup'));
    AudioManager.playMusic('bgm_title');
    restartOnResize(this);
  }
}
