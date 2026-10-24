import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import Phaser from 'phaser';
import { AudioManager } from './core/AudioManager';
import { GameState } from './core/GameState';
import { SaveManager } from './core/SaveManager';
import { BootScene } from './scenes/BootScene';
import { CharCreateScene } from './scenes/CharCreateScene';
import { CharSelectScene } from './scenes/CharSelectScene';
import { DungeonScene } from './scenes/DungeonScene';
import { HudScene } from './scenes/HudScene';
import { TitleScene } from './scenes/TitleScene';
import { TownScene } from './scenes/TownScene';

export const BASE_WIDTH = 640;
export const BASE_HEIGHT = 360;

async function loadFonts() {
  const fonts = [document.fonts.load('8px "Press Start 2P"'), document.fonts.load('16px "Pixelify Sans"')];
  await Promise.race([Promise.all(fonts), new Promise((r) => setTimeout(r, 3000))]);
}

async function boot() {
  await loadFonts();
  SaveManager.load();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#120e22',
    pixelArt: true,
    roundPixels: true,
    scale: {
      // Keep the 640x360 base and expand the long edge to fill wide phone screens.
      mode: Phaser.Scale.EXPAND,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      // Fullscreen the whole container so DOM text inputs stay above the canvas.
      fullscreenTarget: 'game',
    },
    physics: { default: 'arcade', arcade: { debug: false } },
    dom: { createContainer: true },
    input: { activePointers: 4 },
    fps: { target: 60 },
    scene: [BootScene, TitleScene, CharSelectScene, CharCreateScene, TownScene, DungeonScene, HudScene],
  });
  AudioManager.init(game);

  // Auto-save when the app is backgrounded or closed.
  const saveNow = () => {
    if (GameState.loaded) GameState.save();
  };
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });

  // Pause the game while the phone is held in portrait (the CSS overlay asks to rotate).
  const portrait = window.matchMedia('(orientation: portrait)');
  const applyOrientation = () => {
    if (portrait.matches) game.loop.sleep();
    else game.loop.wake();
  };
  portrait.addEventListener?.('change', applyOrientation);
  game.events.once(Phaser.Core.Events.READY, applyOrientation);

  (window as any).__game = game;
}

boot();
