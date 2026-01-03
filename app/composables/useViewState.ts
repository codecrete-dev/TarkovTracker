import { nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { logger } from '@/utils/logger';

/**
 * Configuration for a single URL query parameter to sync with view state.
 */
export interface ViewStateParam {
  /** Getter function to read current value from store */
  get: () => string;
  /** Setter function to update store with new value */
  set: (value: string) => void;
  /** Default value - params with default values are omitted from URL */
  default: string;
  /** Optional validator to check if URL value is valid */
  validate?: (value: string) => boolean;
}

/**
 * Configuration for useViewState composable.
 */
export interface ViewStateConfig {
  /** Map of query param names to their configuration */
  params: Record<string, ViewStateParam>;
  /** Debounce delay in ms for URL updates (default: 200) */
  debounceMs?: number;
}

/**
 * Composable for bidirectional sync between URL query params and store state.
 * Enables browser back/forward navigation for view/filter state.
 *
 * Features:
 * - Debounced URL updates to coalesce rapid filter changes
 * - Clean URLs: only non-default params appear in URL
 * - URL params take priority on initial load
 * - Handles popstate for back/forward navigation
 *
 * @example
 * ```ts
 * useViewState({
 *   params: {
 *     view: {
 *       get: () => preferencesStore.getTaskPrimaryView,
 *       set: (v) => preferencesStore.setTaskPrimaryView(v),
 *       default: 'all',
 *       validate: (v) => ['all', 'maps', 'traders'].includes(v),
 *     },
 *   },
 * });
 * ```
 */
export function useViewState(config: ViewStateConfig) {
  const route = useRoute();
  const router = useRouter();
  const debounceMs = config.debounceMs ?? 200;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isInternalChange = false;
  let isInitialized = false;

  /**
   * Apply URL query params to store state.
   * Called on mount and popstate (back/forward navigation).
   */
  const applyUrlToStore = () => {
    isInternalChange = true;

    for (const [paramName, paramConfig] of Object.entries(config.params)) {
      const urlValue = route.query[paramName] as string | undefined;

      if (urlValue !== undefined) {
        // Validate if validator provided
        const isValid = paramConfig.validate ? paramConfig.validate(urlValue) : true;

        if (isValid && urlValue !== paramConfig.get()) {
          logger.debug(`[useViewState] URL → Store: ${paramName}=${urlValue}`);
          paramConfig.set(urlValue);
        } else if (!isValid) {
          logger.debug(`[useViewState] Invalid URL value for ${paramName}: ${urlValue}`);
        }
      }
    }

    nextTick(() => {
      isInternalChange = false;
    });
  };

  /**
   * Sync current store state to URL with debouncing.
   * Uses router.push to create history entries.
   */
  const syncToUrl = () => {
    if (isInternalChange || !isInitialized) return;

    // Cancel pending debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const newQuery: Record<string, string> = {};

      // Build query with only non-default values
      for (const [paramName, paramConfig] of Object.entries(config.params)) {
        const currentValue = paramConfig.get();
        if (currentValue !== paramConfig.default) {
          newQuery[paramName] = currentValue;
        }
      }

      // Preserve query params not managed by this composable (e.g., ?task=)
      for (const [key, value] of Object.entries(route.query)) {
        if (!(key in config.params) && typeof value === 'string') {
          newQuery[key] = value;
        }
      }

      // Check if query actually changed to avoid unnecessary history entries
      const currentQueryStr = JSON.stringify(route.query);
      const newQueryStr = JSON.stringify(newQuery);

      if (currentQueryStr !== newQueryStr) {
        logger.debug('[useViewState] Store → URL:', newQuery);
        router.push({ query: newQuery });
      }

      debounceTimer = null;
    }, debounceMs);
  };

  /**
   * Handle browser back/forward navigation.
   */
  const handlePopstate = () => {
    logger.debug('[useViewState] Popstate detected, applying URL to store');
    // Small delay to let Vue Router update route.query
    nextTick(() => {
      applyUrlToStore();
    });
  };

  // Watch all param getters and sync to URL on change
  const watchStopHandles: Array<() => void> = [];

  onMounted(() => {
    // Apply URL params to store on initial load (URL wins)
    applyUrlToStore();

    // Mark as initialized after initial URL application
    nextTick(() => {
      isInitialized = true;

      // Set up watchers for each param
      for (const [paramName, paramConfig] of Object.entries(config.params)) {
        const stopHandle = watch(
          () => paramConfig.get(),
          (newValue, oldValue) => {
            if (newValue !== oldValue) {
              logger.debug(`[useViewState] ${paramName} changed: ${oldValue} → ${newValue}`);
              syncToUrl();
            }
          }
        );
        watchStopHandles.push(stopHandle);
      }
    });

    // Listen for popstate (back/forward)
    window.addEventListener('popstate', handlePopstate);
  });

  onUnmounted(() => {
    // Cleanup watchers
    for (const stopHandle of watchStopHandles) {
      stopHandle();
    }

    // Cleanup event listener
    window.removeEventListener('popstate', handlePopstate);

    // Cancel any pending debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  return {
    /** Manually trigger URL sync (useful for programmatic changes) */
    syncToUrl,
    /** Manually apply URL params to store */
    applyUrlToStore,
  };
}
