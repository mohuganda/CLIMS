import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/*
 * Tests run in Vitest, not through Next.js: they render client components and
 * call plain functions, so they need only the JSX transform and the `@` alias.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    testTimeout: 15_000,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      // Domain logic only: screens are covered by behaviour tests, and a
      // line target over JSX markup would reward the wrong thing.
      include: ['src/lib/**', 'src/config/**', 'src/hooks/**', 'src/features/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/index.ts', '**/types.ts', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
});
