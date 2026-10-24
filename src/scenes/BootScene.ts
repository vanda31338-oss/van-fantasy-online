import Phaser from 'phaser';
import { buildGeneratedAssets, queueManifestFiles } from '../gfx/AssetLoader';
import { COLORS, txt } from '../ui/theme';

/** Loads file-backed assets, then generates procedural placeholders for everything else. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const W = this.scale.width, H = this.scale.height;
    txt(this, W / 2, H / 2 - 20, 'Van Fantasy Online', 8, { color: COLORS.textGold }).setOrigin(0.5);
    const bar = this.add.graphics();
    const label = txt(this, W / 2, H / 2 + 22, 'Loading 0%', 8, { color: COLORS.textDim }).setOrigin(0.5);
    this.load.on('progress', (p: number) => {
      bar.clear();
      bar.fillStyle(0x0f0b1e, 1).fillRect(W / 2 - 102, H / 2 - 2, 204, 12);
      bar.fillStyle(COLORS.gold, 1).fillRect(W / 2 - 100, H / 2, Math.round(200 * p), 8);
      label.setText(`Loading ${Math.round(p * 100)}%`);
    });
    this.load.setPath(import.meta.env.BASE_URL);
    queueManifestFiles(this);
  }

  create() {
    buildGeneratedAssets(this);
    document.getElementById('boot-msg')?.remove();
    this.scene.start('Title');
  }
}
