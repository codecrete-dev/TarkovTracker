import { defineStore } from 'pinia';
import { markRaw, ref } from 'vue';
import { extractLanguageCode, useSafeLocale } from '@/composables/i18nHelpers';
import { useGraphBuilder } from '@/composables/useGraphBuilder';
import mapsData from '@/data/maps.json';
import { useProgressStore } from '@/stores/useProgress';
import { useTarkovStore } from '@/stores/useTarkov';
import type {
  FinishRewards,
  GameEdition,
  HideoutModule,
  HideoutStation,
  NeededItemHideoutModule,
  NeededItemTaskObjective,
  ObjectiveGPSInfo,
  ObjectiveMapInfo,
  PlayerLevel,
  PrestigeLevel,
  StaticMapData,
  TarkovBootstrapQueryResult,
  TarkovDataQueryResult,
  TarkovHideoutQueryResult,
  TarkovItem,
  TarkovItemsQueryResult,
  TarkovMap,
  TarkovPrestigeQueryResult,
  TarkovTaskObjectivesQueryResult,
  TarkovTaskRewardsQueryResult,
  TarkovTasksCoreQueryResult,
  Task,
  TaskObjective,
  Trader,
} from '@/types/tarkov';
import {
  API_GAME_MODES,
  API_SUPPORTED_LANGUAGES,
  EXCLUDED_SCAV_KARMA_TASKS,
  GAME_MODES,
  LOCALE_TO_API_MAPPING,
  MAP_NAME_MAPPING,
  sortMapsByGameOrder,
  sortTradersByGameOrder,
} from '@/utils/constants';
import {
  getExcludedTaskIdsForEdition as getExcludedTaskIds,
  getExclusiveEditionsForTask as getTaskExclusiveEditions,
  isTaskAvailableForEdition as checkTaskEdition,
} from '@/utils/editionHelpers';
import { createGraph } from '@/utils/graphHelpers';
import { logger } from '@/utils/logger';
import {
  CACHE_CONFIG,
  type CacheType,
  cleanupExpiredCache,
  getCachedData,
  setCachedData,
} from '@/utils/tarkovCache';
import { normalizeTaskObjectives } from '@/utils/taskNormalization';
import type { AbstractGraph } from 'graphology-types';
// Exported type for craft sources used by components
export type CraftSource = { stationId: string; stationName: string; stationLevel: number };
// Initialization guard to prevent race conditions
let initPromise: Promise<void> | null = null;
const isInitializing = ref(false);
// Helper type to safely access item properties that might be missing in older type definitions
type ObjectiveWithItems = TaskObjective & {
  item?: TarkovItem;
  items?: TarkovItem[];
  markerItem?: TarkovItem;
  questItem?: TarkovItem;
  containsAll?: TarkovItem[];
  useAny?: TarkovItem[];
  usingWeapon?: TarkovItem;
  usingWeaponMods?: TarkovItem[];
  wearing?: TarkovItem[];
  notWearing?: TarkovItem[];
};
type FetchSuccess<T> = { data: T };
type FetchError = { error: string | Record<string, unknown> };
type FetchResponse<T> = FetchSuccess<T> | FetchError;
const isFetchError = (value: unknown): value is FetchError => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!Object.prototype.hasOwnProperty.call(value, 'error')) return false;
  const error = (value as { error?: unknown }).error;
  // error must be a string or a plain object (not null, not array)
  return (
    typeof error === 'string' ||
    (error !== null && typeof error === 'object' && !Array.isArray(error))
  );
};
const isFetchSuccess = <T>(value: unknown): value is FetchSuccess<T> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.prototype.hasOwnProperty.call(value, 'error')) return false;
  return Object.prototype.hasOwnProperty.call(value, 'data');
};
interface MetadataState {
  // Initialization and loading states
  initialized: boolean;
  initializationFailed: boolean;
  loading: boolean;
  hideoutLoading: boolean;
  itemsLoading: boolean;
  prestigeLoading: boolean;
  editionsLoading: boolean;
  // Granular task loading states
  objectivesLoading: boolean;
  rewardsLoading: boolean;
  error: Error | null;
  hideoutError: Error | null;
  itemsError: Error | null;
  prestigeError: Error | null;
  editionsError: Error | null;
  // Raw data from API
  tasks: Task[];
  editions: GameEdition[];
  hideoutStations: HideoutStation[];
  maps: TarkovMap[];
  traders: Trader[];
  playerLevels: PlayerLevel[];
  items: TarkovItem[];
  itemsById: Map<string, TarkovItem>;
  prestigeLevels: PrestigeLevel[];
  staticMapData: StaticMapData | null;
  // Processed data
  taskGraph: AbstractGraph;
  taskById: Map<string, Task>;
  hideoutGraph: AbstractGraph;
  hideoutModules: HideoutModule[];
  craftSourcesByItemId: Map<string, CraftSource[]>;
  // Derived data structures
  objectiveMaps: { [taskId: string]: ObjectiveMapInfo[] };
  alternativeTasks: { [taskId: string]: string[] };
  alternativeTaskSources: { [taskId: string]: string[] };
  objectiveGPS: { [taskId: string]: ObjectiveGPSInfo[] };
  mapTasks: { [mapId: string]: string[] };
  neededItemTaskObjectives: NeededItemTaskObjective[];
  neededItemHideoutModules: NeededItemHideoutModule[];
  // Language and game mode
  languageCode: string;
  currentGameMode: string;
}
export const useMetadataStore = defineStore('metadata', {
  state: (): MetadataState => ({
    initialized: false,
    initializationFailed: false,
    loading: false,
    hideoutLoading: false,
    itemsLoading: false,
    prestigeLoading: false,
    editionsLoading: false,
    objectivesLoading: false,
    rewardsLoading: false,
    error: null,
    hideoutError: null,
    itemsError: null,
    prestigeError: null,
    editionsError: null,
    tasks: markRaw([]),
    editions: markRaw([]),
    hideoutStations: markRaw([]),
    maps: markRaw([]),
    traders: markRaw([]),
    playerLevels: markRaw([]),
    items: markRaw([]),
    itemsById: markRaw(new Map<string, TarkovItem>()),
    prestigeLevels: markRaw([]),
    staticMapData: null,
    taskGraph: markRaw(createGraph()),
    taskById: markRaw(new Map<string, Task>()),
    hideoutGraph: markRaw(createGraph()),
    hideoutModules: markRaw([]),
    craftSourcesByItemId: markRaw(new Map<string, CraftSource[]>()),
    objectiveMaps: markRaw({}),
    alternativeTasks: markRaw({}),
    alternativeTaskSources: markRaw({}),
    objectiveGPS: markRaw({}),
    mapTasks: markRaw({}),
    neededItemTaskObjectives: markRaw([]),
    neededItemHideoutModules: markRaw([]),
    languageCode: 'en',
    currentGameMode: GAME_MODES.PVP,
  }),
  getters: {
    // Computed properties for tasks
    objectives: (state): TaskObjective[] => {
      if (!state.tasks.length) return [];
      const allObjectives: TaskObjective[] = [];
      state.tasks.forEach((task) => {
        normalizeTaskObjectives<TaskObjective>(task.objectives).forEach((obj) => {
          if (obj) {
            allObjectives.push({ ...obj, taskId: task.id });
          }
        });
      });
      return allObjectives;
    },
    enabledTasks: (state): Task[] => {
      return state.tasks.filter((task) => !EXCLUDED_SCAV_KARMA_TASKS.includes(task.id));
    },
    // Get edition name by value
    getEditionName:
      (state) =>
      (edition: number | undefined): string => {
        if (edition == null) return 'N/A';
        const found = state.editions.find((e) => e.value === edition);
        return found ? found.title : `Edition ${edition}`;
      },
    // Get edition data by value
    getEditionByValue:
      (state) =>
      (editionValue: number | undefined): GameEdition | undefined => {
        if (editionValue == null) return undefined;
        return state.editions.find((e) => e.value === editionValue);
      },
    /**
     * Get all task IDs that should be excluded for a given edition.
     * Uses shared helper from editionHelpers.ts
     */
    getExcludedTaskIdsForEdition:
      (state) =>
      (editionValue: number | undefined): Set<string> =>
        getExcludedTaskIds(editionValue, state.editions),
    /**
     * Check if a task is available for a given edition.
     * Uses shared helper from editionHelpers.ts
     */
    isTaskAvailableForEdition:
      (state) =>
      (taskId: string, editionValue: number | undefined): boolean =>
        checkTaskEdition(taskId, editionValue, state.editions),
    /**
     * Get editions that a task is exclusive to.
     * Returns array of editions that have this task in their exclusiveTaskIds.
     */
    getExclusiveEditionsForTask:
      (state) =>
      (taskId: string): GameEdition[] =>
        getTaskExclusiveEditions(taskId, state.editions),
    // Computed properties for maps with merged static data
    mapsWithSvg: (state): TarkovMap[] => {
      if (!state.maps.length || !state.staticMapData) {
        return [];
      }
      const mapGroups: Record<string, TarkovMap[]> = {};
      state.maps.forEach((map) => {
        const lowerCaseName = map.name.toLowerCase();
        const mapKey = MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
        if (!mapGroups[mapKey]) {
          mapGroups[mapKey] = [];
        }
        mapGroups[mapKey]!.push(map);
      });
      const mergedMaps = Object.entries(mapGroups)
        .map(([mapKey, maps]) => {
          const primaryMap =
            maps.find((map) => map.name.toLowerCase() === 'ground zero') ?? maps[0];
          if (!primaryMap) return null;
          const staticData = state.staticMapData?.[mapKey];
          const mergedIds = maps.map((map) => map.id);
          // Check for unavailable before svg check (unavailable maps may not have svg)
          const unavailable = staticData?.unavailable;
          if (staticData?.svg) {
            return {
              ...primaryMap,
              svg: staticData.svg,
              unavailable,
              mergedIds,
            };
          }
          if (!staticData) {
            logger.warn(
              `[MetadataStore] Static SVG data not found for map: ${primaryMap.name} (lookup key: ${mapKey})`
            );
          }
          return {
            ...primaryMap,
            mergedIds,
          };
        })
        .filter((map): map is NonNullable<typeof map> => map !== null);
      // Sort maps by task progression order using the mapKey for lookup
      return sortMapsByGameOrder(mergedMaps, (map) => {
        const lowerCaseName = map.name.toLowerCase();
        return MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
      });
    },
    // Computed properties for traders (sorted by in-game order)
    sortedTraders: (state): Trader[] => sortTradersByGameOrder(state.traders),
    // Computed properties for hideout
    stationsByName: (state): { [name: string]: HideoutStation } => {
      const stationMap: { [name: string]: HideoutStation } = {};
      state.hideoutStations.forEach((station) => {
        stationMap[station.name] = station;
        if (station.normalizedName) {
          stationMap[station.normalizedName] = station;
        }
      });
      return stationMap;
    },
    modulesByStation: (state): { [stationId: string]: HideoutModule[] } => {
      const moduleMap: { [stationId: string]: HideoutModule[] } = {};
      state.hideoutModules.forEach((module) => {
        if (!moduleMap[module.stationId]) {
          moduleMap[module.stationId] = [];
        }
        moduleMap[module.stationId]!.push(module);
      });
      return moduleMap;
    },
    maxStationLevels: (state): { [stationId: string]: number } => {
      const maxLevels: { [stationId: string]: number } = {};
      state.hideoutStations.forEach((station) => {
        maxLevels[station.id] = Math.max(...station.levels.map((level) => level.level));
      });
      return maxLevels;
    },
    // Player level properties
    minPlayerLevel: (state): number => {
      if (!state.playerLevels.length) return 1;
      return Math.min(...state.playerLevels.map((level) => level.level));
    },
    maxPlayerLevel: (state): number => {
      if (!state.playerLevels.length) return 79;
      return Math.max(...state.playerLevels.map((level) => level.level));
    },
    // Utility getters
    isDataLoaded: (state): boolean => {
      return (
        !state.loading &&
        !state.hideoutLoading &&
        !state.itemsLoading &&
        !state.objectivesLoading &&
        !state.rewardsLoading &&
        state.tasks.length > 0 &&
        state.hideoutStations.length > 0
      );
    },
    hasInitialized: (state): boolean => state.initialized,
    // Items getters
    isItemsLoaded: (state): boolean => {
      return !state.itemsLoading && state.items.length > 0;
    },
    // Prestige getters
    isPrestigeLoaded: (state): boolean => {
      return !state.prestigeLoading && state.prestigeLevels.length > 0;
    },
    getPrestigeByLevel:
      (state) =>
      (level: number): PrestigeLevel | undefined => {
        return state.prestigeLevels.find(
          (prestige: PrestigeLevel) => prestige.prestigeLevel === level
        );
      },
    /**
     * Build a mapping of task IDs to the user prestige level that should see them.
     * This is derived from prestige conditions - if prestige N requires completing task X,
     * then users at prestige (N-1) should see task X.
     *
     * Returns: Map<taskId, userPrestigeLevel>
     * Example: { "6761f28a022f60bb320f3e95": 0 } means users at prestige 0 see this task
     */
    prestigeTaskMap: (state): Map<string, number> => {
      const map = new Map<string, number>();
      for (const prestige of state.prestigeLevels) {
        const prestigeLevel = prestige.prestigeLevel ?? 0;
        // Find TaskObjectiveTaskStatus conditions that reference tasks
        for (const condition of prestige.conditions || []) {
          // Check if this is a task status condition with a task reference
          if (condition.task?.id && condition.task?.name === 'New Beginning') {
            // User at prestige (N-1) needs to complete this task to reach prestige N
            map.set(condition.task.id, prestigeLevel - 1);
          }
        }
      }
      return map;
    },
    /**
     * Get all "New Beginning" task IDs that are prestige-gated
     */
    prestigeTaskIds: (state): string[] => {
      const ids: string[] = [];
      for (const prestige of state.prestigeLevels) {
        for (const condition of prestige.conditions || []) {
          if (condition.task?.id && condition.task?.name === 'New Beginning') {
            ids.push(condition.task.id);
          }
        }
      }
      return ids;
    },
  },
  actions: {
    async initialize() {
      // Guard against concurrent initialization calls
      if (initPromise) {
        return initPromise;
      }
      if (isInitializing.value) {
        return;
      }
      isInitializing.value = true;
      initPromise = (async () => {
        try {
          this.updateLanguageAndGameMode();
          await this.loadStaticMapData();
          // Quick cache check: if critical data is cached, set initialized=true immediately
          // This prevents the loading screen from showing when we have valid cached data
          if (typeof window !== 'undefined') {
            const hasCachedData = await this.checkCriticalCacheExists();
            if (hasCachedData) {
              this.initialized = true;
              logger.debug('[MetadataStore] Critical cache exists, skipping loading screen');
            }
          }
          await this.fetchAllData();
          this.initialized = true;
          this.initializationFailed = false;
        } catch (err) {
          logger.error('[MetadataStore] Failed to initialize metadata:', err);
          this.initializationFailed = true;
          // Rethrow to allow caller (e.g. metadata plugin) to handle retries or critical failure
          throw err;
        } finally {
          isInitializing.value = false;
          initPromise = null;
        }
      })();
      return initPromise;
    },
    /**
     * Update language code and game mode based on current state
     * @param localeOverride - Optional locale override to use instead of useSafeLocale()
     */
    updateLanguageAndGameMode(localeOverride?: string) {
      const store = useTarkovStore();
      const effectiveLocale = localeOverride || useSafeLocale().value;
      logger.debug('[MetadataStore] updateLanguageAndGameMode - raw locale:', effectiveLocale);
      // Clear existing items to prevent stale data from being used during hydration
      // This forces the UI to wait for the new language items to load
      // Clear existing items to prevent stale data from being used during hydration
      // This forces the UI to wait for the new language items to load
      // if (this.items.length > 0) {
      //   this.items = [];
      // }
      // Update language code
      const mappedCode = LOCALE_TO_API_MAPPING[effectiveLocale];
      if (mappedCode) {
        this.languageCode = mappedCode;
      } else {
        this.languageCode = extractLanguageCode(effectiveLocale, [...API_SUPPORTED_LANGUAGES]);
      }
      // Update game mode
      this.currentGameMode = store.getCurrentGameMode();
    },
    /**
     * Load static map data from local source
     */
    async loadStaticMapData() {
      if (!this.staticMapData) {
        this.staticMapData = markRaw(mapsData as unknown as StaticMapData);
      }
    },
    /**
     * Quick check if critical cached data exists (without loading it)
     * Used to determine if we can skip the loading screen
     */
    async checkCriticalCacheExists(): Promise<boolean> {
      try {
        const apiGameMode =
          API_GAME_MODES[this.currentGameMode as keyof typeof API_GAME_MODES] ||
          API_GAME_MODES[GAME_MODES.PVP];
        // Check all critical cache entries in parallel
        const [tasksCore, hideout, prestige, editions] = await Promise.all([
          getCachedData<TarkovTasksCoreQueryResult>(
            'tasks-core' as CacheType,
            apiGameMode,
            this.languageCode
          ),
          getCachedData<TarkovHideoutQueryResult>(
            'hideout' as CacheType,
            apiGameMode,
            this.languageCode
          ),
          getCachedData<TarkovPrestigeQueryResult>(
            'prestige' as CacheType,
            'all',
            this.languageCode
          ),
          getCachedData<{ editions: GameEdition[] }>('editions' as CacheType, 'all', 'en'),
        ]);
        const hasCriticalCache = !!(tasksCore && hideout && prestige && editions);
        logger.debug(
          `[MetadataStore] Critical cache check: ${hasCriticalCache ? 'ALL PRESENT' : 'MISSING'}`
        );
        return hasCriticalCache;
      } catch (err) {
        logger.warn('[MetadataStore] Error checking critical cache:', err);
        return false;
      }
    },
    /**
     * Generic fetch helper with caching to eliminate repetitive fetch patterns.
     * Handles: cache check → fetch → process → cache result → error handling
     */
    async fetchWithCache<T>(config: {
      cacheType: CacheType;
      cacheKey: string;
      cacheLanguage?: string;
      endpoint: string;
      queryParams?: Record<string, string>;
      cacheTTL: number;
      loadingKey?:
        | 'loading'
        | 'hideoutLoading'
        | 'itemsLoading'
        | 'prestigeLoading'
        | 'editionsLoading';
      errorKey?: 'error' | 'hideoutError' | 'itemsError' | 'prestigeError' | 'editionsError';
      processData: (data: T) => void;
      onEmpty?: () => void;
      logName: string;
      forceRefresh?: boolean;
    }): Promise<void> {
      const {
        cacheType,
        cacheKey,
        cacheLanguage = this.languageCode,
        endpoint,
        queryParams = {},
        cacheTTL,
        loadingKey,
        errorKey,
        processData,
        onEmpty,
        logName,
        forceRefresh = false,
      } = config;
      // Reset error state if tracking errors
      if (errorKey) {
        this.$patch({ [errorKey]: null });
      }
      // Step 1: Check IndexedDB cache (unless forcing refresh)
      if (!forceRefresh && typeof window !== 'undefined') {
        try {
          const cached = await getCachedData<T>(cacheType, cacheKey, cacheLanguage);
          if (cached) {
            logger.debug(
              `[MetadataStore] ${logName} loaded from cache: ${cacheLanguage}-${cacheKey}`
            );
            processData(cached);
            // Reset loading state on cache hit - important because fetchAllData pre-sets
            // objectivesLoading/rewardsLoading to true before calling fetch functions
            if (loadingKey) {
              this.$patch({ [loadingKey]: false });
            }
            return;
          }
        } catch (cacheErr) {
          logger.warn(
            `[MetadataStore] ${logName} cache read failed, falling back to server:`,
            cacheErr
          );
        }
      }
      // Step 2: Set loading state if tracking loading
      if (loadingKey) {
        this.$patch({ [loadingKey]: true });
      }
      try {
        // Step 3: Fetch from server API
        logger.debug(
          `[MetadataStore] Fetching ${logName} from server: ${cacheLanguage}-${cacheKey}`
        );
        const response = await $fetch<FetchResponse<T>>(endpoint, {
          query: queryParams,
        });
        if (isFetchError(response)) {
          // Log full response for debugging
          logger.debug(`[MetadataStore] ${logName} error response:`, response);
          // Construct user-friendly error message
          let errorMessage: string;
          if (typeof response.error === 'string') {
            errorMessage = response.error;
          } else {
            const errorObj = response.error as { message?: unknown };
            if (typeof errorObj.message === 'string') {
              errorMessage = errorObj.message;
            } else {
              try {
                errorMessage = JSON.stringify(response.error).slice(0, 200);
              } catch {
                errorMessage = '[Unserializable error]';
              }
            }
          }
          throw new Error(`API error: ${errorMessage}`);
        }
        if (!isFetchSuccess<T>(response)) {
          // Log full response for debugging
          logger.debug(`[MetadataStore] ${logName} unexpected response shape:`, response);
          const keys = response && typeof response === 'object' ? Object.keys(response) : [];
          throw new Error(`Invalid response: expected { data: T }, got keys: [${keys.join(', ')}]`);
        }
        processData(response.data);
        // Step 4: Store in IndexedDB for future visits
        if (typeof window !== 'undefined') {
          setCachedData(cacheType, cacheKey, cacheLanguage, response.data, cacheTTL).catch((err) =>
            logger.error(`[MetadataStore] Error caching ${logName} data:`, err)
          );
        }
      } catch (err) {
        logger.error(`[MetadataStore] Error fetching ${logName} data:`, err);
        if (errorKey) {
          this.$patch({ [errorKey]: err as Error });
        }
        if (onEmpty) {
          onEmpty();
        }
      } finally {
        if (loadingKey) {
          this.$patch({ [loadingKey]: false });
        }
      }
    },
    /**
     * Get the current API game mode string
     */
    getApiGameMode(): string {
      return (
        API_GAME_MODES[this.currentGameMode as keyof typeof API_GAME_MODES] ||
        API_GAME_MODES[GAME_MODES.PVP]
      );
    },
    /**
     * Fetch all metadata from the API
     * @param forceRefresh - If true, bypass cache and fetch fresh data
     */
    async fetchAllData(forceRefresh = false) {
      // Run cleanup once per session
      if (typeof window !== 'undefined') {
        cleanupExpiredCache().catch((err) =>
          logger.error('[MetadataStore] Error during cache cleanup:', err)
        );
      }
      await this.fetchBootstrapData(forceRefresh);
      const hideoutPromise = this.fetchHideoutData(forceRefresh);
      const prestigePromise = this.fetchPrestigeData(forceRefresh);
      const editionsPromise = this.fetchEditionsData(forceRefresh);
      // Explicitly set granular loading states to true before starting the core fetch
      // This ensures isDataLoaded returns false until these specific fetches complete
      this.objectivesLoading = true;
      this.rewardsLoading = true;
      await this.fetchTasksCoreData(forceRefresh);
      // If core data fetch failed or returned no tasks, reset granular flags
      // to prevent infinite loading state
      if (!this.tasks.length) {
        this.objectivesLoading = false;
        this.rewardsLoading = false;
      }
      if (this.tasks.length) {
        // These will handle their own loading = false in finally blocks
        this.fetchTaskObjectivesData(forceRefresh);
        this.fetchTaskRewardsData(forceRefresh);
      }
      // Items are heavy; load in background for hydration without blocking app init.
      this.fetchItemsData(forceRefresh).catch((err) =>
        logger.error('[MetadataStore] Error fetching items data:', err)
      );
      await Promise.all([hideoutPromise, prestigePromise, editionsPromise]);
    },
    /**
     * Fetch minimal bootstrap data (player levels) to enable early UI rendering
     */
    async fetchBootstrapData(forceRefresh = false) {
      await this.fetchWithCache<TarkovBootstrapQueryResult>({
        cacheType: 'bootstrap' as CacheType,
        cacheKey: 'all',
        endpoint: '/api/tarkov/bootstrap',
        queryParams: { lang: this.languageCode },
        cacheTTL: CACHE_CONFIG.DEFAULT_TTL,
        processData: (data) => this.processBootstrapData(data),
        logName: 'Bootstrap',
        forceRefresh,
      });
    },
    /**
     * Fetch core tasks, maps, and traders data (no objectives/rewards)
     */
    async fetchTasksCoreData(forceRefresh = false) {
      const apiGameMode = this.getApiGameMode();
      await this.fetchWithCache<TarkovTasksCoreQueryResult>({
        cacheType: 'tasks-core' as CacheType,
        cacheKey: apiGameMode,
        endpoint: '/api/tarkov/tasks-core',
        queryParams: { lang: this.languageCode, gameMode: apiGameMode },
        cacheTTL: CACHE_CONFIG.DEFAULT_TTL,
        loadingKey: 'loading',
        errorKey: 'error',
        processData: (data) => this.processTasksCoreData(data),
        onEmpty: () => this.resetTasksData(),
        logName: 'Task core',
        forceRefresh,
      });
    },
    /**
     * Fetch task objectives and fail conditions data
     */
    async fetchTaskObjectivesData(forceRefresh = false) {
      const apiGameMode = this.getApiGameMode();
      await this.fetchWithCache<TarkovTaskObjectivesQueryResult>({
        cacheType: 'tasks-objectives' as CacheType,
        cacheKey: apiGameMode,
        endpoint: '/api/tarkov/tasks-objectives',
        queryParams: { lang: this.languageCode, gameMode: apiGameMode },
        cacheTTL: CACHE_CONFIG.DEFAULT_TTL,
        loadingKey: 'objectivesLoading',
        errorKey: 'error',
        processData: (data) => {
          this.mergeTaskObjectives(data.tasks);
          this.hydrateTaskItems();
        },
        logName: 'Task objectives',
        forceRefresh,
      });
    },
    /**
     * Fetch task rewards data
     */
    async fetchTaskRewardsData(forceRefresh = false) {
      const apiGameMode = this.getApiGameMode();
      await this.fetchWithCache<TarkovTaskRewardsQueryResult>({
        cacheType: 'tasks-rewards' as CacheType,
        cacheKey: apiGameMode,
        endpoint: '/api/tarkov/tasks-rewards',
        queryParams: { lang: this.languageCode, gameMode: apiGameMode },
        cacheTTL: CACHE_CONFIG.DEFAULT_TTL,
        loadingKey: 'rewardsLoading',
        errorKey: 'error',
        processData: (data) => this.mergeTaskRewards(data.tasks),
        logName: 'Task rewards',
        forceRefresh,
      });
    },
    /**
     * Backwards-compatible wrapper for legacy callers
     */
    async fetchTasksData(forceRefresh = false) {
      await this.fetchTasksCoreData(forceRefresh);
      if (!this.tasks.length) return;
      await Promise.all([
        this.fetchTaskObjectivesData(forceRefresh),
        this.fetchTaskRewardsData(forceRefresh),
      ]);
      this.fetchItemsData(forceRefresh).catch((err) =>
        logger.error('[MetadataStore] Error fetching items data:', err)
      );
    },
    /**
     * Fetch hideout data
     */
    async fetchHideoutData(forceRefresh = false) {
      const apiGameMode = this.getApiGameMode();
      await this.fetchWithCache<TarkovHideoutQueryResult>({
        cacheType: 'hideout' as CacheType,
        cacheKey: apiGameMode,
        endpoint: '/api/tarkov/hideout',
        queryParams: { lang: this.languageCode, gameMode: apiGameMode },
        cacheTTL: CACHE_CONFIG.DEFAULT_TTL,
        loadingKey: 'hideoutLoading',
        errorKey: 'hideoutError',
        processData: (data) => {
          this.processHideoutData(data);
          this.hydrateHideoutItems();
        },
        onEmpty: () => this.resetHideoutData(),
        logName: 'Hideout',
        forceRefresh,
      });
    },
    /**
     * Fetch all items data (language-specific, not game-mode specific)
     */
    async fetchItemsData(forceRefresh = false) {
      await this.fetchWithCache<TarkovItemsQueryResult>({
        cacheType: 'items' as CacheType,
        cacheKey: 'all',
        endpoint: '/api/tarkov/items',
        queryParams: { lang: this.languageCode },
        cacheTTL: CACHE_CONFIG.MAX_TTL,
        loadingKey: 'itemsLoading',
        errorKey: 'itemsError',
        processData: (data) => {
          this.items = markRaw(data.items || []);
          this.rebuildItemsIndex();
          this.hydrateTaskItems();
          this.hydrateHideoutItems();
        },
        onEmpty: () => {
          this.items = markRaw([]);
          this.itemsById = markRaw(new Map<string, TarkovItem>());
        },
        logName: 'Items',
        forceRefresh,
      });
    },
    /**
     * Fetch prestige data (language-specific, not game-mode specific)
     */
    async fetchPrestigeData(forceRefresh = false) {
      await this.fetchWithCache<TarkovPrestigeQueryResult>({
        cacheType: 'prestige' as CacheType,
        cacheKey: 'all',
        endpoint: '/api/tarkov/prestige',
        queryParams: { lang: this.languageCode },
        cacheTTL: CACHE_CONFIG.MAX_TTL,
        loadingKey: 'prestigeLoading',
        errorKey: 'prestigeError',
        processData: (data) => {
          this.prestigeLevels = markRaw(data.prestige || []);
        },
        onEmpty: () => {
          this.prestigeLevels = markRaw([]);
        },
        logName: 'Prestige',
        forceRefresh,
      });
    },
    /**
     * Fetch game editions data directly from GitHub overlay.
     * Editions are universal (not language or game-mode specific).
     * Note: Uses external URL, so cannot use generic fetchWithCache helper.
     */
    async fetchEditionsData(forceRefresh = false) {
      this.editionsError = null;
      // Check cache first
      if (!forceRefresh && typeof window !== 'undefined') {
        try {
          const cached = await getCachedData<{ editions: GameEdition[] }>(
            'editions' as CacheType,
            'all',
            'en'
          );
          if (cached?.editions) {
            logger.debug('[MetadataStore] Editions loaded from cache');
            this.editions = markRaw(cached.editions);
            return;
          }
        } catch (cacheErr) {
          logger.warn('[MetadataStore] Editions cache read failed:', cacheErr);
        }
      }
      this.editionsLoading = true;
      try {
        const OVERLAY_URL =
          'https://raw.githubusercontent.com/tarkovtracker-org/tarkov-data-overlay/main/dist/overlay.json';
        const overlay = await $fetch<{ editions?: Record<string, GameEdition> }>(OVERLAY_URL, {
          parseResponse: JSON.parse,
        });
        if (overlay?.editions) {
          const editionsArray = Object.values(overlay.editions);
          this.editions = markRaw(editionsArray);
          if (typeof window !== 'undefined') {
            setCachedData(
              'editions' as CacheType,
              'all',
              'en',
              { editions: editionsArray },
              CACHE_CONFIG.MAX_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching editions:', err));
          }
        } else {
          logger.warn('[MetadataStore] No editions found in overlay response');
          this.editions = markRaw([]);
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching editions data:', err);
        this.editionsError = err as Error;
        this.editions = markRaw([]);
      } finally {
        this.editionsLoading = false;
      }
    },
    /**
     * Process bootstrap data (player levels) for early UI rendering
     */
    processBootstrapData(data: TarkovBootstrapQueryResult) {
      const levels = data.playerLevels || [];
      this.playerLevels = markRaw(this.convertToCumulativeXP(levels));
    },
    /**
     * Process core task data without objectives/rewards
     */
    processTasksCoreData(data: TarkovTasksCoreQueryResult) {
      this.processTasksData({
        tasks: data.tasks || [],
        maps: data.maps || [],
        traders: data.traders || [],
      });
    },
    dedupeObjectiveIds(tasks: Task[]) {
      const objectiveCounts = new Map<string, number>();
      tasks.forEach((task) => {
        task.objectives?.forEach((objective) => {
          if (!objective?.id) return;
          objectiveCounts.set(objective.id, (objectiveCounts.get(objective.id) ?? 0) + 1);
        });
      });
      const duplicateObjectiveIds = new Map<string, string[]>();
      const updatedTasks = tasks.map((task) => {
        if (!task.objectives?.length) return task;
        let changed = false;
        const objectives = task.objectives.map((objective) => {
          if (!objective?.id) return objective;
          const count = objectiveCounts.get(objective.id) ?? 0;
          if (count <= 1) return objective;
          const newId = `${objective.id}:${task.id}`;
          const existing = duplicateObjectiveIds.get(objective.id);
          if (existing) {
            existing.push(newId);
          } else {
            duplicateObjectiveIds.set(objective.id, [newId]);
          }
          changed = true;
          return { ...objective, id: newId };
        });
        return changed ? { ...task, objectives } : task;
      });
      return { tasks: updatedTasks, duplicateObjectiveIds };
    },
    /**
     * Merge objective payloads into existing tasks
     */
    mergeTaskObjectives(tasks: TarkovTaskObjectivesQueryResult['tasks']) {
      if (!tasks?.length || !this.tasks.length) return;
      const updateMap = new Map(tasks.map((task) => [task.id, task]));
      let changed = false;
      const merged = this.tasks.map((task) => {
        const update = updateMap.get(task.id);
        if (!update) return task;
        changed = true;
        return {
          ...task,
          objectives:
            update.objectives !== undefined
              ? this.normalizeObjectiveItems(
                  normalizeTaskObjectives<TaskObjective>(update.objectives)
                )
              : task.objectives,
          failConditions:
            update.failConditions !== undefined
              ? this.normalizeObjectiveItems(
                  normalizeTaskObjectives<TaskObjective>(update.failConditions)
                )
              : task.failConditions,
        };
      });
      if (changed) {
        const deduped = this.dedupeObjectiveIds(merged);
        this.tasks = markRaw(deduped.tasks);
        if (deduped.duplicateObjectiveIds.size > 0) {
          const progressStore = useProgressStore();
          progressStore.migrateDuplicateObjectiveProgress(deduped.duplicateObjectiveIds);
        }
        const tarkovStore = useTarkovStore();
        tarkovStore.repairCompletedTaskObjectives();
        this.rebuildTaskDerivedData();
        tarkovStore.repairFailedTaskStates();
      }
    },
    /**
     * Merge reward payloads into existing tasks
     */
    mergeTaskRewards(tasks: TarkovTaskRewardsQueryResult['tasks']) {
      if (!tasks?.length || !this.tasks.length) return;
      const updateMap = new Map(tasks.map((task) => [task.id, task]));
      let changed = false;
      const merged = this.tasks.map((task) => {
        const update = updateMap.get(task.id);
        if (!update) return task;
        changed = true;
        return {
          ...task,
          startRewards: update.startRewards !== undefined ? update.startRewards : task.startRewards,
          finishRewards:
            update.finishRewards !== undefined ? update.finishRewards : task.finishRewards,
          failureOutcome:
            update.failureOutcome !== undefined ? update.failureOutcome : task.failureOutcome,
        };
      });
      if (changed) {
        this.tasks = markRaw(merged);
        this.rebuildTaskDerivedData();
      }
    },
    /**
     * Rebuild derived task structures after incremental merges
     */
    rebuildTaskDerivedData() {
      if (!this.tasks.length) {
        this.resetTasksData();
        return;
      }
      const graphBuilder = useGraphBuilder();
      const processedData = graphBuilder.processTaskData(this.tasks);
      this.tasks = markRaw(processedData.tasks);
      this.taskGraph = processedData.taskGraph;
      this.mapTasks = markRaw(processedData.mapTasks);
      this.objectiveMaps = markRaw(processedData.objectiveMaps);
      this.objectiveGPS = markRaw(processedData.objectiveGPS);
      this.alternativeTasks = markRaw(processedData.alternativeTasks);
      this.alternativeTaskSources = markRaw(
        this.buildAlternativeTaskSources(processedData.alternativeTasks)
      );
      this.neededItemTaskObjectives = markRaw(processedData.neededItemTaskObjectives);
      this.rebuildTaskIndex();
    },
    /**
     * Rebuild O(1) task lookup maps.
     */
    rebuildTaskIndex() {
      this.taskById = markRaw(new Map(this.tasks.map((task) => [task.id, task])));
    },
    /**
     * Rebuild O(1) item lookup maps.
     */
    rebuildItemsIndex() {
      this.itemsById = markRaw(new Map(this.items.map((item) => [item.id, item])));
    },
    /**
     * Build reverse alternative task lookup for failure sources.
     */
    buildAlternativeTaskSources(alternatives: { [taskId: string]: string[] }) {
      const sources: { [taskId: string]: string[] } = {};
      Object.entries(alternatives).forEach(([sourceId, altIds]) => {
        altIds.forEach((altId) => {
          if (!sources[altId]) {
            sources[altId] = [];
          }
          if (!sources[altId]!.includes(sourceId)) {
            sources[altId]!.push(sourceId);
          }
        });
      });
      return sources;
    },
    /**
     * Hydrate task item references with lightweight item data
     */
    hydrateTaskItems() {
      if (!this.items.length || !this.tasks.length) return;
      const itemsById = this.itemsById.size
        ? this.itemsById
        : new Map(this.items.map((item) => [item.id, item]));
      // Merge item data to preserve task-specific fields like properties.defaultPreset
      // without allowing lightweight task items to overwrite full base fields.
      const pickItemLite = (item?: TarkovItem | null): TarkovItem | undefined => {
        if (!item?.id) return item ?? undefined;
        const fullItem = itemsById.get(item.id);
        if (!fullItem) return item;
        const mergedProperties = item.properties
          ? { ...(fullItem.properties ?? {}), ...item.properties }
          : fullItem.properties;
        return mergedProperties ? { ...fullItem, properties: mergedProperties } : fullItem;
      };
      const pickItemArray = (items?: TarkovItem[] | null): TarkovItem[] | undefined => {
        if (!Array.isArray(items)) return items ?? undefined;
        return items.map((item) => pickItemLite(item) ?? item);
      };
      const hydrateObjective = (objective: TaskObjective): TaskObjective => {
        const obj = objective as ObjectiveWithItems;
        return {
          ...obj,
          item: pickItemLite(obj.item),
          items: pickItemArray(obj.items),
          markerItem: pickItemLite(obj.markerItem),
          questItem: pickItemLite(obj.questItem),
          containsAll: pickItemArray(obj.containsAll),
          useAny: pickItemArray(obj.useAny),
          usingWeapon: pickItemLite(obj.usingWeapon),
          usingWeaponMods: pickItemArray(obj.usingWeaponMods),
          wearing: pickItemArray(obj.wearing),
          notWearing: pickItemArray(obj.notWearing),
        } as TaskObjective;
      };
      const hydrateRewards = (rewards?: FinishRewards): FinishRewards | undefined => {
        if (!rewards) return rewards;
        return {
          ...rewards,
          items: rewards.items?.map((reward) => ({
            ...reward,
            item: pickItemLite(reward.item) ?? reward.item,
          })),
          offerUnlock: rewards.offerUnlock?.map((unlock) => ({
            ...unlock,
            item: pickItemLite(unlock.item) ?? unlock.item,
          })),
        };
      };
      this.tasks = this.tasks.map((task) => ({
        ...task,
        objectives: task.objectives?.map(hydrateObjective),
        failConditions: task.failConditions?.map(hydrateObjective),
        neededKeys: task.neededKeys?.map((needed) => ({
          ...needed,
          keys: needed.keys?.map((key) => pickItemLite(key) ?? key) ?? needed.keys,
        })),
        startRewards: hydrateRewards(task.startRewards),
        finishRewards: hydrateRewards(task.finishRewards),
        failureOutcome: hydrateRewards(task.failureOutcome),
      }));
      this.tasks = markRaw(this.tasks);
      this.rebuildTaskDerivedData();
    },
    /**
     * Hydrate hideout item references with full item data
     */
    hydrateHideoutItems() {
      if (!this.items.length || !this.hideoutStations.length) return;
      const itemsById = this.itemsById.size
        ? this.itemsById
        : new Map(this.items.map((item) => [item.id, item]));
      // Merge item data to preserve any existing fields from hideout query
      const pickItemLite = (item?: TarkovItem | null): TarkovItem | undefined => {
        if (!item?.id) return item ?? undefined;
        const fullItem = itemsById.get(item.id);
        return fullItem ? { ...fullItem, ...item } : item;
      };
      this.hideoutStations = this.hideoutStations.map((station) => ({
        ...station,
        levels: station.levels.map((level) => ({
          ...level,
          itemRequirements: level.itemRequirements?.map((req) => ({
            ...req,
            item: pickItemLite(req.item) ?? req.item,
          })),
          crafts: level.crafts?.map((craft) => ({
            ...craft,
            requiredItems: craft.requiredItems?.map((ri) => ({
              ...ri,
              item: pickItemLite(ri.item) ?? ri.item,
            })),
            rewardItems: craft.rewardItems?.map((ri) => ({
              ...ri,
              item: pickItemLite(ri.item) ?? ri.item,
            })),
          })),
        })),
      }));
      this.hideoutStations = markRaw(this.hideoutStations);
      // Rebuild hideout-derived data now that items are hydrated
      this.processHideoutData({ hideoutStations: this.hideoutStations });
    },
    /**
     * Process tasks data and build derived structures using the graph builder composable
     */
    processTasksData(data: TarkovDataQueryResult) {
      // Filter out scav karma tasks at the source
      // These tasks require Scav Karma validation which isn't yet implemented
      const allTasks = data.tasks || [];
      const tradersById = new Map((data.traders || []).map((trader) => [trader.id, trader]));
      const normalizedTasks = allTasks
        .filter((task): task is Task => Boolean(task))
        .map((task) => ({
          ...task,
          trader:
            task.trader?.id && tradersById.has(task.trader.id)
              ? { ...tradersById.get(task.trader.id), ...task.trader }
              : task.trader,
          objectives: this.normalizeObjectiveItems(
            normalizeTaskObjectives<TaskObjective>(task.objectives)
          ),
          failConditions: this.normalizeObjectiveItems(
            normalizeTaskObjectives<TaskObjective>(task.failConditions)
          ),
        }));
      const filteredTasks = normalizedTasks.filter(
        (task) => !EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)
      );
      const deduped = this.dedupeObjectiveIds(filteredTasks);
      this.tasks = markRaw(deduped.tasks);
      if (deduped.duplicateObjectiveIds.size > 0) {
        const progressStore = useProgressStore();
        progressStore.migrateDuplicateObjectiveProgress(deduped.duplicateObjectiveIds);
      }
      const tarkovStore = useTarkovStore();
      tarkovStore.repairCompletedTaskObjectives();
      this.maps = markRaw(data.maps || []);
      this.traders = markRaw(data.traders || []);
      if (Array.isArray(data.playerLevels)) {
        this.playerLevels = markRaw(this.convertToCumulativeXP(data.playerLevels));
      }
      if (this.tasks.length > 0) {
        const graphBuilder = useGraphBuilder();
        const processedData = graphBuilder.processTaskData(this.tasks);
        this.tasks = markRaw(processedData.tasks);
        this.taskGraph = processedData.taskGraph;
        this.mapTasks = markRaw(processedData.mapTasks);
        this.objectiveMaps = markRaw(processedData.objectiveMaps);
        this.objectiveGPS = markRaw(processedData.objectiveGPS);
        this.alternativeTasks = markRaw(processedData.alternativeTasks);
        this.alternativeTaskSources = markRaw(
          this.buildAlternativeTaskSources(processedData.alternativeTasks)
        );
        this.neededItemTaskObjectives = markRaw(processedData.neededItemTaskObjectives);
        tarkovStore.repairFailedTaskStates();
        this.rebuildTaskIndex();
      } else {
        this.resetTasksData();
      }
    },
    /**
     * Ensure objective.item is populated from objective.items when using the new schema.
     */
    normalizeObjectiveItems(objectives: TaskObjective[]): TaskObjective[] {
      if (!objectives?.length) return objectives;
      return objectives.map((objective) => {
        if (!objective) return objective;
        const obj = objective as ObjectiveWithItems;
        if (!obj.item && Array.isArray(obj.items) && obj.items.length > 0) {
          return { ...objective, item: obj.items[0] };
        }
        return objective;
      });
    },
    /**
     * Process hideout data and build derived structures using the graph builder composable
     */
    processHideoutData(data: TarkovHideoutQueryResult) {
      this.hideoutStations = markRaw(data.hideoutStations || []);
      if (this.hideoutStations.length > 0) {
        this.craftSourcesByItemId = markRaw(this.buildCraftSourcesMap(this.hideoutStations));
        const graphBuilder = useGraphBuilder();
        const processedData = graphBuilder.processHideoutData(this.hideoutStations);
        this.hideoutModules = markRaw(processedData.hideoutModules);
        this.hideoutGraph = processedData.hideoutGraph;
        this.neededItemHideoutModules = markRaw(processedData.neededItemHideoutModules);
      } else {
        this.resetHideoutData();
      }
    },
    /**
     * Builds a map of craft sources indexed by item ID from hideout stations.
     */
    buildCraftSourcesMap(stations: HideoutStation[]): Map<string, CraftSource[]> {
      const map = new Map<string, CraftSource[]>();
      for (const station of stations) {
        for (const level of station.levels || []) {
          for (const craft of level.crafts || []) {
            for (const reward of craft.rewardItems || []) {
              const itemId = reward?.item?.id;
              if (!itemId) continue;
              const sources = map.get(itemId) ?? [];
              const isDuplicate = sources.some(
                (source) => source.stationId === station.id && source.stationLevel === level.level
              );
              if (!isDuplicate) {
                sources.push({
                  stationId: station.id,
                  stationName: station.name,
                  stationLevel: level.level,
                });
                map.set(itemId, sources);
              }
            }
          }
        }
      }
      return map;
    },
    /**
     * Converts player level XP from per-level increments to cumulative totals
     * The API returns exp as XP needed from previous level (incremental)
     * We need cumulative XP from level 1 for proper level calculations
     */
    convertToCumulativeXP(levels: PlayerLevel[]): PlayerLevel[] {
      if (!levels || levels.length === 0) return [];
      let cumulativeXP = 0;
      return levels.map((level) => {
        cumulativeXP += level.exp;
        return {
          ...level,
          exp: cumulativeXP,
        };
      });
    },
    /**
     * Reset tasks data to empty state
     */
    resetTasksData() {
      this.tasks = markRaw([]);
      this.maps = markRaw([]);
      this.traders = markRaw([]);
      this.taskGraph = markRaw(createGraph());
      this.taskById = markRaw(new Map<string, Task>());
      this.objectiveMaps = markRaw({});
      this.alternativeTasks = markRaw({});
      this.alternativeTaskSources = markRaw({});
      this.objectiveGPS = markRaw({});
      this.mapTasks = markRaw({});
      this.neededItemTaskObjectives = markRaw([]);
    },
    /**
     * Reset hideout data to empty state
     */
    resetHideoutData() {
      this.hideoutStations = markRaw([]);
      this.hideoutModules = markRaw([]);
      this.hideoutGraph = markRaw(createGraph());
      this.neededItemHideoutModules = markRaw([]);
      this.craftSourcesByItemId = markRaw(new Map<string, CraftSource[]>());
    },
    // Task utility functions
    getTaskById(taskId: string): Task | undefined {
      return this.taskById.get(taskId) ?? this.tasks.find((task) => task.id === taskId);
    },
    getItemById(itemId: string): TarkovItem | undefined {
      return this.itemsById.get(itemId) ?? this.items.find((item) => item.id === itemId);
    },
    getTasksByTrader(traderId: string): Task[] {
      return this.tasks.filter((task) => task.trader?.id === traderId);
    },
    getTasksByMap(mapId: string): Task[] {
      const taskIds = this.mapTasks[mapId] || [];
      return this.tasks.filter((task) => taskIds.includes(task.id));
    },
    isPrerequisiteFor(taskId: string, targetTaskId: string): boolean {
      const targetTask = this.getTaskById(targetTaskId);
      return targetTask?.predecessors?.includes(taskId) ?? false;
    },
    // Trader utility functions
    getTraderById(traderId: string): Trader | undefined {
      return this.traders.find((trader) => trader.id === traderId);
    },
    getTraderByName(traderName: string): Trader | undefined {
      const lowerCaseName = traderName.toLowerCase();
      return this.traders.find(
        (trader) =>
          trader.name.toLowerCase() === lowerCaseName ||
          trader.normalizedName?.toLowerCase() === lowerCaseName
      );
    },
    // Map utility functions
    getMapById(mapId: string): TarkovMap | undefined {
      return this.maps.find((map) => map.id === mapId);
    },
    getMapByName(mapName: string): TarkovMap | undefined {
      const lowerCaseName = mapName.toLowerCase();
      return this.maps.find(
        (map) =>
          map.name.toLowerCase() === lowerCaseName ||
          map.normalizedName?.toLowerCase() === lowerCaseName
      );
    },
    getStaticMapKey(mapName: string): string {
      const lowerCaseName = mapName.toLowerCase();
      return MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
    },
    hasMapSvg(mapId: string): boolean {
      const map = this.getMapById(mapId);
      return !!map?.svg;
    },
    // Hideout utility functions
    getStationById(stationId: string): HideoutStation | undefined {
      return this.hideoutStations.find((station) => station.id === stationId);
    },
    getStationByName(name: string): HideoutStation | undefined {
      return this.stationsByName[name];
    },
    getModuleById(moduleId: string): HideoutModule | undefined {
      return this.hideoutModules.find((module) => module.id === moduleId);
    },
    getModulesByStation(stationId: string): HideoutModule[] {
      return this.modulesByStation[stationId] || [];
    },
    getMaxStationLevel(stationId: string): number {
      return this.maxStationLevels[stationId] || 0;
    },
    isPrerequisiteForModule(moduleId: string, targetModuleId: string): boolean {
      const targetModule = this.getModuleById(targetModuleId);
      return targetModule?.predecessors?.includes(moduleId) ?? false;
    },
    getItemsForModule(moduleId: string): NeededItemHideoutModule[] {
      return this.neededItemHideoutModules.filter((item) => item.hideoutModule.id === moduleId);
    },
    getModulesRequiringItem(itemId: string): NeededItemHideoutModule[] {
      return this.neededItemHideoutModules.filter((item) => item.item.id === itemId);
    },
    getTotalConstructionTime(moduleId: string): number {
      const module = this.getModuleById(moduleId);
      if (!module) return 0;
      let totalTime = module.constructionTime;
      // Add time for all prerequisite modules
      module.predecessors.forEach((prerequisiteId) => {
        const prerequisite = this.getModuleById(prerequisiteId);
        if (prerequisite) {
          totalTime += prerequisite.constructionTime;
        }
      });
      return totalTime;
    },
    /**
     * Refresh all data
     */
    async refresh() {
      this.updateLanguageAndGameMode();
      await this.fetchAllData();
    },
  },
});
// Export type for use in components
export type MetadataStore = ReturnType<typeof useMetadataStore>;
