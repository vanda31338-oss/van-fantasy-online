import Phaser from 'phaser';

/** Device safe-area insets (notches, rounded corners) converted to game pixels. */
export function safeInsets(scene: Phaser.Scene) {
  const probe = document.getElementById('safe-probe');
  const canvas = scene.game.canvas;
  if (!probe || !canvas) return { top: 0, right: 0, bottom: 0, left: 0 };
  const cs = getComputedStyle(probe);
  const rect = canvas.getBoundingClientRect();
  const k = rect.width > 0 ? scene.scale.width / rect.width : 1;
  const px = (v: string) => Math.ceil((parseFloat(v) || 0) * k);
  return { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
}
