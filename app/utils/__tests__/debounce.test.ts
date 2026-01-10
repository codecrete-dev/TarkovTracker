import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '@/utils/debounce';
describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('delays function execution', async () => {
    const fn = vi.fn().mockReturnValue('result');
    const debounced = debounce(fn, 100);
    const promise = debounced('arg');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    const result = await promise;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('arg');
    expect(result).toBe('result');
  });
  it('only executes the last call when called multiple times', async () => {
    const fn = vi.fn().mockImplementation((x: number) => x * 2);
    const debounced = debounce(fn, 100);
    // Call multiple times in quick succession
    const promise1 = debounced(1).catch(() => 'rejected');
    const promise2 = debounced(2).catch(() => 'rejected');
    const promise3 = debounced(3);
    // First two calls should be rejected as superseded
    expect(await promise1).toBe('rejected');
    expect(await promise2).toBe('rejected');
    // Advance time and check that only the last call executes
    vi.advanceTimersByTime(100);
    const result = await promise3;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
    expect(result).toBe(6);
  });
  it('resets the timer on subsequent calls', async () => {
    const fn = vi.fn().mockReturnValue('done');
    const debounced = debounce(fn, 100);
    // First call will be superseded - catch its rejection
    debounced('first').catch(() => {});
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    const promise = debounced('second');
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    await promise;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });
  it('handles async functions', async () => {
    const fn = vi.fn().mockResolvedValue('async result');
    const debounced = debounce(fn, 100);
    const promise = debounced('arg');
    vi.advanceTimersByTime(100);
    const result = await promise;
    expect(fn).toHaveBeenCalledWith('arg');
    expect(result).toBe('async result');
  });
  it('propagates errors from the debounced function', async () => {
    const error = new Error('Test error');
    const fn = vi.fn().mockRejectedValue(error);
    const debounced = debounce(fn, 100);
    const promise = debounced('arg');
    vi.advanceTimersByTime(100);
    await expect(promise).rejects.toThrow('Test error');
  });
  describe('cancel', () => {
    it('cancels pending execution', async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      const promise = debounced('arg');
      debounced.cancel();
      await expect(promise).rejects.toThrow('cancelled');
      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });
    it('can be called safely when no pending execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      // Should not throw
      expect(() => debounced.cancel()).not.toThrow();
    });
    it('allows new calls after cancel', async () => {
      const fn = vi.fn().mockReturnValue('result');
      const debounced = debounce(fn, 100);
      // Start a call and cancel it, catching the rejection
      const cancelledPromise = debounced('first').catch(() => 'cancelled');
      debounced.cancel();
      expect(await cancelledPromise).toBe('cancelled');
      const promise = debounced('second');
      vi.advanceTimersByTime(100);
      const result = await promise;
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
      expect(result).toBe('result');
    });
  });
});
