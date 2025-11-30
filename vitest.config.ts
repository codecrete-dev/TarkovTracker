import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    environment: 'nuxt', // The Nuxt environment handles the DOM setup automatically
    globals: true,
    setupFiles: ['./test-setup.ts'],
    // Don't auto-clean up DOM elements as Nuxt environment handles this
    clearMocks: true,
    // Suppress some console warnings during tests
    logHeapUsage: false,
    isolate: false,
  },
});
