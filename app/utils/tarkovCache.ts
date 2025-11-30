/**
 * Tarkov Data Cache Utility
 *
 * Provides multi-layer caching for Tarkov API data:
 * - IndexedDB for persistent client-side storage (survives page refresh/reload)
 * - Supports multiple game modes (PVP/PVE) and languages
 * - Configurable TTL (default 12 hours)
 *
 * Cache Key Structure: tarkov-{type}-{gameMode}-{lang}
 * Example: tarkov-data-regular-en, tarkov-hideout-pve-fr
 */
import { logger } from './logger';
// Cache configuration
export const CACHE_CONFIG = {
  DB_NAME: 'tarkov-tracker-cache',
  DB_VERSION: 1,
  STORE_NAME: 'tarkov-data',
  // 12 hours in milliseconds
  DEFAULT_TTL: 12 * 60 * 60 * 1000,
  // 24 hours max TTL
  MAX_TTL: 24 * 60 * 60 * 1000,
} as const;
export type CacheType = 'data' | 'hideout' | 'items';
export interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
  cacheKey: string;
  gameMode: string;
  lang: string;
  version: number;
}
/**
 * Opens or creates the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(CACHE_CONFIG.DB_NAME, CACHE_CONFIG.DB_VERSION);
    request.onerror = () => {
      console.error('[TarkovCache] Failed to open database:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(CACHE_CONFIG.STORE_NAME)) {
        const store = db.createObjectStore(CACHE_CONFIG.STORE_NAME, {
          keyPath: 'cacheKey',
        });
        // Create indexes for querying
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('gameMode', 'gameMode', { unique: false });
        store.createIndex('lang', 'lang', { unique: false });
      }
    };
  });
}
/**
 * Generates a cache key for Tarkov data
 */
export function generateCacheKey(type: CacheType, gameMode: string, lang: string = 'en'): string {
  return `tarkov-${type}-${gameMode}-${lang}`;
}
/**
 * Retrieves cached data from IndexedDB
 * Returns null if not found or expired
 */
export async function getCachedData<T>(
  type: CacheType,
  gameMode: string,
  lang: string = 'en'
): Promise<T | null> {
  try {
    const db = await openDatabase();
    const cacheKey = generateCacheKey(type, gameMode, lang);
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction(CACHE_CONFIG.STORE_NAME, 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.get(cacheKey);
      request.onerror = () => {
        console.error('[TarkovCache] Failed to get cached data:', request.error);
        resolve(null);
      };
      request.onsuccess = () => {
        const cachedResult = request.result as CachedData<T> | undefined;
        if (!cachedResult) {
          logger.debug(`[TarkovCache] Cache MISS: ${cacheKey}`);
          resolve(null);
          return;
        }
        // Check if cache is expired
        const now = Date.now();
        const age = now - cachedResult.timestamp;
        if (age > cachedResult.ttl) {
          logger.debug(
            `[TarkovCache] Cache EXPIRED: ${cacheKey} (age: ${Math.round(age / 1000 / 60)}min)`
          );
          // Don't delete here, let the write operation overwrite it
          resolve(null);
          return;
        }
        logger.debug(
          `[TarkovCache] Cache HIT: ${cacheKey} (age: ${Math.round(age / 1000 / 60)}min)`
        );
        resolve(cachedResult.data);
      };
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[TarkovCache] Error getting cached data:', error);
    return null;
  }
}
/**
 * Stores data in IndexedDB cache
 */
export async function setCachedData<T>(
  type: CacheType,
  gameMode: string,
  lang: string,
  data: T,
  ttl: number = CACHE_CONFIG.DEFAULT_TTL
): Promise<void> {
  try {
    const db = await openDatabase();
    const cacheKey = generateCacheKey(type, gameMode, lang);
    const cacheEntry: CachedData<T> = {
      data,
      timestamp: Date.now(),
      ttl: Math.min(ttl, CACHE_CONFIG.MAX_TTL),
      cacheKey,
      gameMode,
      lang,
      version: CACHE_CONFIG.DB_VERSION,
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_CONFIG.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.put(cacheEntry);
      request.onerror = () => {
        console.error('[TarkovCache] Failed to store data:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        logger.debug(`[TarkovCache] Cache STORED: ${cacheKey}`);
        resolve();
      };
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[TarkovCache] Error storing cached data:', error);
  }
}
/**
 * Clears a specific cache entry
 */
export async function clearCacheEntry(
  type: CacheType,
  gameMode: string,
  lang: string = 'en'
): Promise<void> {
  try {
    const db = await openDatabase();
    const cacheKey = generateCacheKey(type, gameMode, lang);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_CONFIG.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.delete(cacheKey);
      request.onerror = () => {
        console.error('[TarkovCache] Failed to delete cache entry:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        logger.debug(`[TarkovCache] Cache DELETED: ${cacheKey}`);
        resolve();
      };
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[TarkovCache] Error deleting cache entry:', error);
  }
}
/**
 * Clears all cached data for a specific game mode
 */
export async function clearCacheByGameMode(gameMode: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_CONFIG.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const index = store.index('gameMode');
      const request = index.openCursor(IDBKeyRange.only(gameMode));
      request.onerror = () => {
        console.error('[TarkovCache] Failed to clear cache by game mode:', request.error);
        reject(request.error);
      };
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      transaction.oncomplete = () => {
        logger.debug(`[TarkovCache] Cleared all cache for gameMode: ${gameMode}`);
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('[TarkovCache] Error clearing cache by game mode:', error);
  }
}
/**
 * Clears ALL cached Tarkov data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_CONFIG.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.clear();
      request.onerror = () => {
        console.error('[TarkovCache] Failed to clear all cache:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        logger.debug('[TarkovCache] All cache CLEARED');
        resolve();
      };
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[TarkovCache] Error clearing all cache:', error);
  }
}
/**
 * Gets cache statistics (for debugging/display)
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  entries: Array<{
    cacheKey: string;
    gameMode: string;
    lang: string;
    age: number;
    ttl: number;
    isExpired: boolean;
  }>;
}
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction(CACHE_CONFIG.STORE_NAME, 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.getAll();
      request.onerror = () => {
        console.error('[TarkovCache] Failed to get cache stats:', request.error);
        resolve({ totalEntries: 0, totalSize: 0, entries: [] });
      };
      request.onsuccess = () => {
        const entries = request.result as CachedData<unknown>[];
        const now = Date.now();
        const stats: CacheStats = {
          totalEntries: entries.length,
          totalSize: 0,
          entries: entries.map((entry) => {
            const age = now - entry.timestamp;
            // Rough size estimate
            const entrySize = JSON.stringify(entry.data).length;
            stats.totalSize += entrySize;
            return {
              cacheKey: entry.cacheKey,
              gameMode: entry.gameMode,
              lang: entry.lang,
              age: Math.round(age / 1000 / 60), // minutes
              ttl: Math.round(entry.ttl / 1000 / 60), // minutes
              isExpired: age > entry.ttl,
            };
          }),
        };
        resolve(stats);
      };
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[TarkovCache] Error getting cache stats:', error);
    return { totalEntries: 0, totalSize: 0, entries: [] };
  }
}
/**
 * Cleans up expired cache entries (call periodically)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction(CACHE_CONFIG.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.openCursor();
      let deletedCount = 0;
      const now = Date.now();
      request.onerror = () => {
        console.error('[TarkovCache] Failed to cleanup expired cache:', request.error);
        resolve(0);
      };
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          const entry = cursor.value as CachedData<unknown>;
          const age = now - entry.timestamp;
          if (age > entry.ttl) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        }
      };
      transaction.oncomplete = () => {
        if (deletedCount > 0) {
          logger.debug(`[TarkovCache] Cleaned up ${deletedCount} expired entries`);
        }
        db.close();
        resolve(deletedCount);
      };
    });
  } catch (error) {
    console.error('[TarkovCache] Error cleaning up expired cache:', error);
    return 0;
  }
}
