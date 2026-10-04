import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base + HashRouter means the build works from any static host path,
// including GitHub Pages project sites.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
