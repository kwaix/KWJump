import { defineConfig } from 'vite';

export default defineConfig({
  // Set base to './' so assets are loaded relatively.
  // This ensures the app works whether it's at the root or in a subdirectory (like on GitHub Pages).
  base: './',
});
