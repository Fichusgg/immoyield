import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Stub the Next.js `server-only` import so server-side modules can be
      // unit-tested. The real package throws on load to enforce RSC isolation;
      // tests don't need that guarantee.
      'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['tests/e2e/**', '.claude/**', '.next/**', 'node_modules/**'],
  },
});
