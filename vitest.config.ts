import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [],
  test: {
    environment: 'jsdom',
    globals: true,
    // *.spec.ts under tests/ are Playwright E2E specs, not Vitest unit tests.
    exclude: ['**/node_modules/**', '**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
