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
    // Backend tests share one real SQLite file (test.db) and isolate via
    // beforeEach deleteMany(). Running test files in parallel (Vitest's
    // default) lets two files race on the same rows and flakes randomly.
    // Since there's no per-file DB isolation, files must run sequentially.
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:./test.db',
      ADMIN_PASSWORT: 'test-passwort',
      ADMIN_SESSION_SECRET: 'test-secret-mindestens-32-zeichen-lang!!',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
