import Phaser from 'phaser';
import { Controls } from '../core/Controls';

/** Floating virtual joystick: appears wherever the thumb touches inside its zone. */
export class Joystick {
  private base: Phaser.GameObjects.Arc;
  private ring: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private hint: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private ox = 0;
  private oy = 0;
  private readonly radius = 32;

  constructor(private scene: Phaser.Scene, private zone: () => Phaser.Geom.Rectangle, private isBlocked: () => boolean) {
    this.base = scene.add.circle(0, 0, this.radius, 0x0f0b1e, 0.35).setDepth(500).setVisible(false);
    this.ring = scene.add.circle(0, 0, this.radius, 0, 0).setStrokeStyle(2, 0xfff4d8, 0.6).setDepth(501).setVisible(false);
    this.knob = scene.add.circle(0, 0, 13, 0xfff4d8, 0.75).setStrokeStyle(2, 0x1a1030, 0.8).setDepth(502).setVisible(false);
    const z = zone();
    this.hint = scene.add.circle(z.x + 62, z.bottom - 62, this.radius, 0xffffff, 0.06).setStrokeStyle(1, 0xffffff, 0.18).setDepth(499);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.pointerId !== null || over.length > 0 || this.isBlocked()) return;
      if (!this.zone().contains(p.x, p.y)) return;
      this.pointerId = p.id;
      this.ox = p.x;
      this.oy = p.y;
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.ring.setPosition(p.x, p.y).setVisible(true);
      this.knob.setPosition(p.x, p.y).setVisible(true);
      this.hint.setVisible(false);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      const dx = p.x - this.ox, dy = p.y - this.oy;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, this.radius);
      const nx = len > 0 ? dx / len : 0, ny = len > 0 ? dy / len : 0;
      this.knob.setPosition(this.ox + nx * clamped, this.oy + ny * clamped);
      const dead = 5;
      if (len < dead) Controls.setMove(0, 0, scene.game.getTime());
      else {
        const mag = Math.min(1, (len - dead) / (this.radius - dead));
        Controls.setMove(nx * Math.max(0.35, mag), ny * Math.max(0.35, mag), scene.game.getTime());
      }
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.release();
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    this.onBlur = () => this.release();
    scene.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(Phaser.Core.Events.BLUR, this.onBlur));
  }

  private onBlur: () => void;

  release() {
    this.pointerId = null;
    this.base.setVisible(false);
    this.ring.setVisible(false);
    this.knob.setVisible(false);
    this.hint.setVisible(true);
    Controls.setMove(0, 0, this.scene.game.getTime());
  }

  get active() {
    return this.pointerId !== null;
  }
}
