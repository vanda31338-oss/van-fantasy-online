import Phaser from 'phaser';

/**
 * Rebuild a scene's layout when the game size really changes (rotation, browser bars).
 * Spurious resize events with an unchanged size are ignored.
 */
export function restartOnResize(scene: Phaser.Scene, data?: () => object) {
  const w0 = scene.scale.width, h0 = scene.scale.height;
  let timer: Phaser.Time.TimerEvent | null = null;
  const onResize = () => {
    // Ignore resizes caused by the on-screen keyboard while typing a name.
    if (document.activeElement instanceof HTMLInputElement) return;
    timer?.remove();
    timer = scene.time.delayedCall(200, () => {
      if (scene.scale.width === w0 && scene.scale.height === h0) return;
      scene.scene.restart(data?.());
    });
  };
  scene.scale.on('resize', onResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off('resize', onResize));
}
