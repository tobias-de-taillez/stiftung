import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Scaffold currently has no test files (first real tests land in Task 2+).
    // Without this, `vitest run` exits 1 on an empty suite, breaking the
    // "npm run test works" contract for this task. Harmless once tests exist.
    passWithNoTests: true,
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
