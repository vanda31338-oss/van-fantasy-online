/** Shared input state written by the HUD (joystick/buttons) and keyboard, read by the world scene. */
class ControlsImpl {
  moveX = 0;
  moveY = 0;
  /** Joystick or movement keys currently in use. */
  manual = false;
  /** Game time (ms) of the last manual movement input. */
  lastManualAt = 0;
  attackHeld = false;
  /** Queued one-shot actions. */
  private queue: { type: 'skill' | 'potion'; index: number }[] = [];

  setMove(x: number, y: number, now: number) {
    this.moveX = x;
    this.moveY = y;
    this.manual = x !== 0 || y !== 0;
    if (this.manual) this.lastManualAt = now;
  }

  push(type: 'skill' | 'potion', index: number) {
    this.queue.push({ type, index });
  }

  drain() {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  reset() {
    this.moveX = this.moveY = 0;
    this.manual = false;
    this.attackHeld = false;
    this.queue = [];
  }
}

export const Controls = new ControlsImpl();
