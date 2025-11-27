import { ref, computed, onMounted } from "vue";
import {
  getCacheStats,
  clearAllCache,
  clearCacheByGameMode,
  clearCacheEntry,
  cleanupExpiredCache,
  CACHE_CONFIG,
  type CacheStats,
  type CacheType,
} from "@/utils/tarkovCache";
import {
  useSharedTarkovDataQuery,
  useSharedTarkovHideoutQuery,
  resetSharedQueries,
} from "./useSharedTarkovQuery";
import { API_GAME_MODES, GAME_MODES } from "@/utils/constants";

/**
 * Composable for managing Tarkov data cache
 * Provides utilities for viewing cache status, clearing cache, and forcing refreshes
 */
export function useTarkovCache() {
  const stats = ref<CacheStats | null>(null);
  const isLoading = ref(false);
  const lastRefresh = ref<Date | null>(null);

  // Formatted cache info
  const cacheInfo = computed(() => {
    if (!stats.value) {
      return {
        totalEntries: 0,
        totalSizeMB: "0",
        entries: [],
        hasCache: false,
      };
    }

    return {
      totalEntries: stats.value.totalEntries,
      totalSizeMB: (stats.value.totalSize / 1024 / 1024).toFixed(2),
      entries: stats.value.entries.map((entry) => ({
        ...entry,
        ageFormatted: formatAge(entry.age),
        ttlFormatted: formatAge(entry.ttl),
        expiresIn: formatAge(entry.ttl - entry.age),
      })),
      hasCache: stats.value.totalEntries > 0,
    };
  });

  // Helper to format minutes to human readable
  function formatAge(minutes: number): string {
    if (minutes < 0) return "Expired";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  // Refresh cache statistics
  async function refreshStats() {
    if (typeof window === "undefined") return;

    isLoading.value = true;
    try {
      stats.value = await getCacheStats();
      lastRefresh.value = new Date();
    } catch (error) {
      console.error("[TarkovCache] Error refreshing stats:", error);
    } finally {
      isLoading.value = false;
    }
  }

  // Clear all cached Tarkov data
  async function clearAll() {
    if (typeof window === "undefined") return;

    isLoading.value = true;
    try {
      await clearAllCache();
      // Reset singleton queries so they refetch
      resetSharedQueries();
      await refreshStats();
    } catch (error) {
      console.error("[TarkovCache] Error clearing all cache:", error);
    } finally {
      isLoading.value = false;
    }
  }

  // Clear cache for a specific game mode
  async function clearByGameMode(gameMode: keyof typeof GAME_MODES) {
    if (typeof window === "undefined") return;

    const apiGameMode = API_GAME_MODES[GAME_MODES[gameMode]];
    isLoading.value = true;
    try {
      await clearCacheByGameMode(apiGameMode);
      await refreshStats();
    } catch (error) {
      console.error(`[TarkovCache] Error clearing cache for ${gameMode}:`, error);
    } finally {
      isLoading.value = false;
    }
  }

  // Clear a specific cache entry
  async function clearEntry(type: CacheType, gameMode: string, lang: string = "en") {
    if (typeof window === "undefined") return;

    isLoading.value = true;
    try {
      await clearCacheEntry(type, gameMode, lang);
      await refreshStats();
    } catch (error) {
      console.error(`[TarkovCache] Error clearing cache entry:`, error);
    } finally {
      isLoading.value = false;
    }
  }

  // Force refresh all Tarkov data (clear cache and refetch)
  async function forceRefreshAll() {
    if (typeof window === "undefined") return;

    isLoading.value = true;
    try {
      // Clear all cache
      await clearAllCache();

      // Get singleton queries and force refetch
      const dataQuery = useSharedTarkovDataQuery();
      const hideoutQuery = useSharedTarkovHideoutQuery();

      await Promise.all([dataQuery.refetch(true), hideoutQuery.refetch(true)]);

      await refreshStats();
    } catch (error) {
      console.error("[TarkovCache] Error forcing refresh:", error);
    } finally {
      isLoading.value = false;
    }
  }

  // Cleanup expired entries
  async function cleanup() {
    if (typeof window === "undefined") return;

    isLoading.value = true;
    try {
      const deletedCount = await cleanupExpiredCache();
      console.log(`[TarkovCache] Cleaned up ${deletedCount} expired entries`);
      await refreshStats();
      return deletedCount;
    } catch (error) {
      console.error("[TarkovCache] Error cleaning up:", error);
      return 0;
    } finally {
      isLoading.value = false;
    }
  }

  // Get cache configuration
  const config = computed(() => ({
    dbName: CACHE_CONFIG.DB_NAME,
    storeName: CACHE_CONFIG.STORE_NAME,
    defaultTtlHours: CACHE_CONFIG.DEFAULT_TTL / 1000 / 60 / 60,
    maxTtlHours: CACHE_CONFIG.MAX_TTL / 1000 / 60 / 60,
  }));

  // Load stats on mount
  onMounted(() => {
    refreshStats();
  });

  return {
    // State
    stats,
    cacheInfo,
    isLoading,
    lastRefresh,
    config,

    // Actions
    refreshStats,
    clearAll,
    clearByGameMode,
    clearEntry,
    forceRefreshAll,
    cleanup,
  };
}
