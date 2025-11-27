import { ref, computed, watch, shallowRef, triggerRef } from "vue";
import { useTarkovStore } from "@/stores/tarkov";
import { useSafeLocale, extractLanguageCode } from "@/composables/utils/i18nHelpers";
import {
  API_GAME_MODES,
  GAME_MODES,
  LOCALE_TO_API_MAPPING,
  API_SUPPORTED_LANGUAGES,
} from "@/utils/constants";
import {
  getCachedData,
  setCachedData,
  cleanupExpiredCache,
  CACHE_CONFIG,
  type CacheType,
} from "@/utils/tarkovCache";
import type { TarkovDataQueryResult, TarkovHideoutQueryResult } from "@/types/tarkov";

/**
 * Singleton state for shared Tarkov data query
 * This ensures only ONE fetch happens for the main data, regardless of how many
 * composables need to consume it.
 *
 * Caching Strategy:
 * 1. Check IndexedDB cache first (client-side persistence)
 * 2. If cache miss or expired, fetch from server API
 * 3. Server API uses Cloudflare Cache API (edge caching)
 * 4. Store fresh data in IndexedDB for future visits
 */

// Shared singleton state
let sharedDataQuery: ReturnType<typeof createSharedDataQuery> | null = null;
let sharedHideoutQuery: ReturnType<typeof createSharedHideoutQuery> | null = null;

// Track if cleanup has been run this session
let cleanupRun = false;

function createSharedDataQuery() {
  const store = useTarkovStore();
  const locale = useSafeLocale();

  const availableLanguages = ref<string[]>([...API_SUPPORTED_LANGUAGES]);

  const apiLanguageCode = computed(() => {
    const mappedCode = LOCALE_TO_API_MAPPING[locale.value];
    if (mappedCode) {
      return mappedCode;
    }
    return extractLanguageCode(locale.value, availableLanguages.value);
  });

  const currentGameMode = computed(() => store.getCurrentGameMode());

  const apiGameMode = computed(() => {
    const mode = currentGameMode.value as keyof typeof API_GAME_MODES;
    return API_GAME_MODES[mode] || API_GAME_MODES[GAME_MODES.PVP];
  });

  // Use shallowRef for better performance with large data objects
  const result = shallowRef<TarkovDataQueryResult | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);
  const cacheStatus = ref<"hit" | "miss" | "error" | "loading">("loading");

  // Track the current fetch key to prevent race conditions
  let currentFetchKey = "";

  async function fetchData(forceRefresh = false) {
    const lang = apiLanguageCode.value;
    const gameMode = apiGameMode.value;
    const fetchKey = `${lang}-${gameMode}`;

    // Prevent duplicate fetches for the same key
    if (currentFetchKey === fetchKey && loading.value && !forceRefresh) {
      return;
    }

    currentFetchKey = fetchKey;
    loading.value = true;
    error.value = null;

    try {
      // Run cleanup once per session
      if (!cleanupRun && typeof window !== "undefined") {
        cleanupRun = true;
        cleanupExpiredCache().catch(console.error);
      }

      // Step 1: Check IndexedDB cache (unless forcing refresh)
      if (!forceRefresh && typeof window !== "undefined") {
        const cached = await getCachedData<TarkovDataQueryResult>(
          "data" as CacheType,
          gameMode,
          lang
        );

        if (cached) {
          result.value = cached;
          triggerRef(result);
          loading.value = false;
          cacheStatus.value = "hit";
          console.log(`[TarkovData] Loaded from cache: ${fetchKey}`);
          return;
        }
      }

      // Step 2: Fetch from server API (which has edge caching)
      console.log(`[TarkovData] Fetching from server: ${fetchKey}`);
      cacheStatus.value = "miss";

      const response = await $fetch<{ data: TarkovDataQueryResult }>("/api/tarkov/data", {
        query: {
          lang,
          gameMode,
        },
      });

      if (response?.data) {
        result.value = response.data;
        triggerRef(result);

        // Step 3: Store in IndexedDB for future visits
        if (typeof window !== "undefined") {
          setCachedData(
            "data" as CacheType,
            gameMode,
            lang,
            response.data,
            CACHE_CONFIG.DEFAULT_TTL
          ).catch(console.error);
        }
      }

      loading.value = false;
    } catch (err) {
      console.error(`[TarkovData] Error fetching data:`, err);
      error.value = err as Error;
      loading.value = false;
      cacheStatus.value = "error";
    }
  }

  // Watch for language/gameMode changes and fetch
  watch(
    [apiLanguageCode, apiGameMode],
    () => {
      fetchData();
    },
    { immediate: true }
  );

  return {
    result: computed(() => result.value),
    error: computed(() => error.value),
    loading: computed(() => loading.value),
    cacheStatus: computed(() => cacheStatus.value),
    refetch: (forceRefresh = true) => fetchData(forceRefresh),
    languageCode: apiLanguageCode,
    gameMode: currentGameMode,
  };
}

function createSharedHideoutQuery() {
  const store = useTarkovStore();

  const currentGameMode = computed(() => store.getCurrentGameMode());

  const apiGameMode = computed(() => {
    const mode = currentGameMode.value as keyof typeof API_GAME_MODES;
    return API_GAME_MODES[mode] || API_GAME_MODES[GAME_MODES.PVP];
  });

  // Use shallowRef for better performance with large data objects
  const result = shallowRef<TarkovHideoutQueryResult | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);
  const cacheStatus = ref<"hit" | "miss" | "error" | "loading">("loading");

  // Track the current fetch key to prevent race conditions
  let currentFetchKey = "";

  async function fetchData(forceRefresh = false) {
    const gameMode = apiGameMode.value;
    const fetchKey = `hideout-${gameMode}`;

    // Prevent duplicate fetches for the same key
    if (currentFetchKey === fetchKey && loading.value && !forceRefresh) {
      return;
    }

    currentFetchKey = fetchKey;
    loading.value = true;
    error.value = null;

    try {
      // Step 1: Check IndexedDB cache (unless forcing refresh)
      // Hideout data is not language-specific, so we use "en" as the lang key
      if (!forceRefresh && typeof window !== "undefined") {
        const cached = await getCachedData<TarkovHideoutQueryResult>(
          "hideout" as CacheType,
          gameMode,
          "en"
        );

        if (cached) {
          result.value = cached;
          triggerRef(result);
          loading.value = false;
          cacheStatus.value = "hit";
          console.log(`[TarkovHideout] Loaded from cache: ${fetchKey}`);
          return;
        }
      }

      // Step 2: Fetch from server API (which has edge caching)
      console.log(`[TarkovHideout] Fetching from server: ${fetchKey}`);
      cacheStatus.value = "miss";

      const response = await $fetch<{ data: TarkovHideoutQueryResult }>("/api/tarkov/hideout", {
        query: {
          gameMode,
        },
      });

      if (response?.data) {
        result.value = response.data;
        triggerRef(result);

        // Step 3: Store in IndexedDB for future visits
        if (typeof window !== "undefined") {
          setCachedData(
            "hideout" as CacheType,
            gameMode,
            "en",
            response.data,
            CACHE_CONFIG.DEFAULT_TTL
          ).catch(console.error);
        }
      }

      loading.value = false;
    } catch (err) {
      console.error(`[TarkovHideout] Error fetching data:`, err);
      error.value = err as Error;
      loading.value = false;
      cacheStatus.value = "error";
    }
  }

  // Watch for gameMode changes and fetch
  watch(
    apiGameMode,
    () => {
      fetchData();
    },
    { immediate: true }
  );

  return {
    result: computed(() => result.value),
    error: computed(() => error.value),
    loading: computed(() => loading.value),
    cacheStatus: computed(() => cacheStatus.value),
    refetch: (forceRefresh = true) => fetchData(forceRefresh),
    gameMode: currentGameMode,
  };
}

/**
 * Get the shared data query instance (singleton)
 * This ensures all composables consume from the same fetch instance
 */
export function useSharedTarkovDataQuery() {
  if (!sharedDataQuery) {
    sharedDataQuery = createSharedDataQuery();
  }
  return sharedDataQuery;
}

/**
 * Get the shared hideout query instance (singleton)
 * This ensures all composables consume from the same fetch instance
 */
export function useSharedTarkovHideoutQuery() {
  if (!sharedHideoutQuery) {
    sharedHideoutQuery = createSharedHideoutQuery();
  }
  return sharedHideoutQuery;
}

/**
 * Reset all shared query singletons
 * Useful for testing or when the user logs out
 */
export function resetSharedQueries() {
  sharedDataQuery = null;
  sharedHideoutQuery = null;
  cleanupRun = false;
}
