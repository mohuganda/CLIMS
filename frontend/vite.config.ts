import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      // Same-origin `/api` in dev, so the browser never makes a cross-origin
      // call and the API needs no CORS allowance for a developer's machine.
      proxy: env.VITE_DEV_API_PROXY_TARGET
        ? {
            '/api': {
              target: env.VITE_DEV_API_PROXY_TARGET,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
    preview: {
      port: 3000,
    },
    build: {
      target: 'es2022',
      sourcemap: true,
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
  };
});
