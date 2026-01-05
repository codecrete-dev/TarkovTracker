type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};
const memoryCache = new Map<string, CacheEntry<unknown>>();
export function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}
export function setMemoryCache<T>(key: string, value: T, ttlSeconds: number): void {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    memoryCache.delete(key);
    return;
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
