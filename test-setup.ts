import { beforeAll, afterEach } from "vitest";
import { cleanup } from "@vue/test-utils";

// Cleanup after each test
afterEach(() => {
  try {
    cleanup();
  } catch {
    // Ignore cleanup errors - newer versions of @vue/test-utils might not need explicit cleanup
    // when using Nuxt test environment
  }
});

// Global setup for Nuxt testing
beforeAll(() => {
  // Mock console methods that might be noisy in tests
  const originalConsole = { ...console };
  global.console = {
    ...originalConsole,
    // Uncomment to suppress specific warnings during tests
    // warn: vi.fn(),
    // error: vi.fn(),
  };
});
