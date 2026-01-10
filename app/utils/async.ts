/**
 * Async Utilities
 *
 * Common async helper functions.
 */
/**
 * Simple delay utility for async operations.
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```ts
 * await delay(1000); // Wait 1 second
 * ```
 */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
export function delay(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms < 0 || ms > MAX_TIMEOUT_MS) {
    throw new RangeError(
      `delay must be a finite, non-negative number <= ${MAX_TIMEOUT_MS}`
    );
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}
