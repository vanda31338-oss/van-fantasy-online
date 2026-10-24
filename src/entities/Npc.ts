import Phaser from 'phaser';
import type { NpcDef } from '../data/npcs';
import { animKey } from '../gfx/AssetLoader';
import { txt } from '../ui/theme';

/** A talkable town NPC (sprite + name plate + quest marker). */
export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly marker: Phaser.GameObjects.Text;
  readonly x: number;
  readonly y: number;

  constructor(scene: Phaser.Scene, readonly def: NpcDef, propKey?: string) {
    this.x = def.tx * 16 + 8;
    this.y = def.ty * 16 + 14;
    if (def.sprite) {
      const s = scene.add.sprite(this.x, this.y, def.sprite, 0).setOrigin(0.5, 0.94);
      s.play(animKey(def.sprite, 'idle'));
      s.anims.setProgress(Math.random());
      s.setFlipX(def.facing < 0);
      scene.add.image(this.x, this.y, 'shadow').setDepth(this.y - 1).setScale(0.9, 1);
      this.sprite = s;
    } else {
      this.sprite = scene.add.image(this.x, this.y, propKey ?? 'prop_board').setOrigin(0.5, 1);
    }
    this.sprite.setDepth(this.y);
    const top = this.y - this.sprite.displayHeight * (def.sprite ? 0.94 : 1);
    this.label = txt(scene, this.x, top - 1, def.name, 8, { font: 'body', color: '#ffe9a8', stroke: '#1a1030', strokeThickness: 2 })
      .setOrigin(0.5, 1)
      .setDepth(this.y + 1000);
    this.marker = txt(scene, this.x, top - 11, '!', 8, { color: '#ffe040', stroke: '#1a1030', strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(this.y + 1000)
      .setVisible(false);
    scene.tweens.add({ targets: this.marker, y: this.marker.y - 3, yoyo: true, repeat: -1, duration: 450, ease: 'Sine.easeInOut' });
    const hit = scene.add.zone(this.x, this.y - 14, 28, 34).setInteractive({ useHandCursor: true });
    hit.setDepth(this.y);
    hit.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.getDistance() < 12 && p.getDuration() < 500) scene.events.emit('npc-tap', this);
    });
  }

  setMarker(kind: '!' | '?' | null) {
    this.marker.setVisible(!!kind);
    if (kind) this.marker.setText(kind);
  }
}
