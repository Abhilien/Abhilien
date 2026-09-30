import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * The app's own tests. The engine is aliased to source, exactly as the build
 * does it, so a test exercises the same code the bundle ships.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@jyotish/engine': fileURLToPath(
        new URL('../../packages/astro-engine/src/index.ts', import.meta.url),
      ),
    },
  },
  test: { include: ['test/**/*.test.ts'] },
});
