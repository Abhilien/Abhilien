import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * The engine is aliased to source rather than to a build artifact so the app and
 * the engine stay in lockstep during development, and so Vite can tree-shake
 * across the boundary — bundle size is a product requirement here, not a nicety.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@jyotish/engine': fileURLToPath(
        new URL('../../packages/astro-engine/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    target: 'es2019',          // Android 6 era WebView
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
});
