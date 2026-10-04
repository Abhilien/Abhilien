import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps asset paths relative so the build works on GitHub Pages
// sub-paths and any static host without configuration.
export default defineConfig({
  base: './',
  plugins: [react()],
});
