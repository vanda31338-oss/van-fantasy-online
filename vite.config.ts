import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo-name>/, so production builds use that base path.
// Static, replaceable art/audio lives in /assets and is copied verbatim to the build root.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/van-fantasy-online/' : '/',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    assetsDir: 'build',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
}));
