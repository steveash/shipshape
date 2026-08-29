import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Failure-only style output keeps agent context small (see spec 070
    // context-economy); use `vitest --reporter=verbose` locally if needed.
    reporters: 'dot',
    testTimeout: 20000,
  },
});
