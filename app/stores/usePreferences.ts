import { defineStore, type StoreDefinition } from 'pinia';
import { watch } from 'vue';
import { useSupabaseSync } from '@/composables/supabase/useSupabaseSync';
import { pinia as pluginPinia } from '@/plugins/01.pinia.client';
import { logger } from '@/utils/logger';
import { useNuxtApp } from '#imports';
// Define the state structure
interface PreferencesState {
  streamerMode: boolean;
  teamHide: Record<string, boolean>;
  taskTeamHideAll: boolean;
  itemsTeamHideAll: boolean;
  itemsTeamHideNonFIR: boolean;
  itemsTeamHideHideout: boolean;
  mapTeamHideAll: boolean;
  taskPrimaryView: string | null;
  taskMapView: string | null;
  taskTraderView: string | null;
  taskSecondaryView: string | null;
  taskUserView: string | null;
  neededTypeView: string | null;
  itemsHideNonFIR: boolean;
  hideGlobalTasks: boolean;
  hideNonKappaTasks: boolean;
  neededitemsStyle: string | null;
  hideoutPrimaryView?: string | null;
  localeOverride: string | null;
  saving?: {
    streamerMode: boolean;
    hideGlobalTasks: boolean;
    hideNonKappaTasks: boolean;
    itemsNeededHideNonFIR: boolean;
  };
}
// Export the default state with type annotation
export const preferencesDefaultState: PreferencesState = {
  streamerMode: false,
  teamHide: {},
  taskTeamHideAll: false,
  itemsTeamHideAll: false,
  itemsTeamHideNonFIR: false,
  itemsTeamHideHideout: false,
  mapTeamHideAll: false,
  taskPrimaryView: null,
  taskMapView: null,
  taskTraderView: null,
  taskSecondaryView: null,
  taskUserView: null,
  neededTypeView: null,
  itemsHideNonFIR: false,
  hideGlobalTasks: false,
  hideNonKappaTasks: false,
  neededitemsStyle: null,
  hideoutPrimaryView: null,
  localeOverride: null,
  saving: {
    streamerMode: false,
    hideGlobalTasks: false,
    hideNonKappaTasks: false,
    itemsNeededHideNonFIR: false,
  },
};
// Per-toggle saving state (not persisted)
const initialSavingState = {
  streamerMode: false,
  hideGlobalTasks: false,
  hideNonKappaTasks: false,
  itemsNeededHideNonFIR: false,
};
// Define getter types
type PreferencesGetters = {
  getStreamerMode: (state: PreferencesState) => boolean;
  teamIsHidden: (state: PreferencesState) => (teamId: string) => boolean;
  taskTeamAllHidden: (state: PreferencesState) => boolean;
  itemsTeamAllHidden: (state: PreferencesState) => boolean;
  itemsTeamNonFIRHidden: (state: PreferencesState) => boolean;
  itemsTeamHideoutHidden: (state: PreferencesState) => boolean;
  mapTeamAllHidden: (state: PreferencesState) => boolean;
  getTaskPrimaryView: (state: PreferencesState) => string;
  getTaskMapView: (state: PreferencesState) => string;
  getTaskTraderView: (state: PreferencesState) => string;
  getTaskSecondaryView: (state: PreferencesState) => string;
  getTaskUserView: (state: PreferencesState) => string;
  getNeededTypeView: (state: PreferencesState) => string;
  itemsNeededHideNonFIR: (state: PreferencesState) => boolean;
  getHideGlobalTasks: (state: PreferencesState) => boolean;
  getHideNonKappaTasks: (state: PreferencesState) => boolean;
  getNeededItemsStyle: (state: PreferencesState) => string;
  getHideoutPrimaryView: (state: PreferencesState) => string;
  getLocaleOverride: (state: PreferencesState) => string | null;
};
// Define action types
type PreferencesActions = {
  setStreamerMode(mode: boolean): void;
  toggleHidden(teamId: string): void;
  setQuestTeamHideAll(hide: boolean): void;
  setItemsTeamHideAll(hide: boolean): void;
  setItemsTeamHideNonFIR(hide: boolean): void;
  setItemsTeamHideHideout(hide: boolean): void;
  setMapTeamHideAll(hide: boolean): void;
  setTaskPrimaryView(view: string): void;
  setTaskMapView(view: string): void;
  setTaskTraderView(view: string): void;
  setTaskSecondaryView(view: string): void;
  setTaskUserView(view: string): void;
  setNeededTypeView(view: string): void;
  setItemsNeededHideNonFIR(hide: boolean): void;
  setHideGlobalTasks(hide: boolean): void;
  setHideNonKappaTasks(hide: boolean): void;
  setNeededItemsStyle(style: string): void;
  setHideoutPrimaryView(view: string): void;
  setLocaleOverride(locale: string | null): void;
};
// Define the store type
type PreferencesStoreDefinition = StoreDefinition<
  'preferences',
  PreferencesState,
  PreferencesGetters,
  PreferencesActions
>;
export const usePreferencesStore: PreferencesStoreDefinition = defineStore('preferences', {
  state: (): PreferencesState => {
    const state = JSON.parse(JSON.stringify(preferencesDefaultState));
    // Always reset saving state on store creation
    state.saving = { ...initialSavingState };
    return state;
  },
  getters: {
    getStreamerMode(state) {
      return state.streamerMode ?? false;
    },
    teamIsHidden: (state) => {
      return (teamId: string): boolean => {
        // Always show self unless explicitly hidden (though self shouldn't be hidden usually)
        // But definitely don't let "Hide All" hide self
        if (teamId === 'self') {
          return state.teamHide?.[teamId] || false;
        }
        return state.taskTeamHideAll || state.teamHide?.[teamId] || false;
      };
    },
    taskTeamAllHidden: (state) => {
      return state.taskTeamHideAll ?? false;
    },
    itemsTeamAllHidden: (state) => {
      return state.itemsTeamHideAll ?? false;
    },
    itemsTeamNonFIRHidden: (state) => {
      return state.itemsTeamHideAll || state.itemsTeamHideNonFIR || false;
    },
    itemsTeamHideoutHidden: (state) => {
      return state.itemsTeamHideAll || state.itemsTeamHideHideout || false;
    },
    mapTeamAllHidden: (state) => {
      return state.mapTeamHideAll ?? false;
    },
    // Add default values for views using nullish coalescing
    getTaskPrimaryView: (state) => {
      return state.taskPrimaryView ?? 'all';
    },
    getTaskMapView: (state) => {
      return state.taskMapView ?? 'all';
    },
    getTaskTraderView: (state) => {
      return state.taskTraderView ?? 'all';
    },
    getTaskSecondaryView: (state) => {
      return state.taskSecondaryView ?? 'available';
    },
    getTaskUserView: (state) => {
      return state.taskUserView ?? 'self';
    },
    getNeededTypeView: (state) => {
      return state.neededTypeView ?? 'all';
    },
    itemsNeededHideNonFIR: (state) => {
      return state.itemsHideNonFIR ?? false;
    },
    getHideGlobalTasks: (state) => {
      return state.hideGlobalTasks ?? false;
    },
    getHideNonKappaTasks: (state) => {
      return state.hideNonKappaTasks ?? false;
    },
    getNeededItemsStyle: (state) => {
      return state.neededitemsStyle ?? 'mediumCard';
    },
    getHideoutPrimaryView: (state) => {
      return state.hideoutPrimaryView ?? 'available';
    },
    getLocaleOverride: (state) => {
      return state.localeOverride ?? null;
    },
  },
  actions: {
    setStreamerMode(mode: boolean) {
      this.streamerMode = mode;
      // Persistence handled automatically by plugin
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.streamerMode = true;
    },
    toggleHidden(teamId: string) {
      if (!this.teamHide) {
        this.teamHide = {};
      }
      this.teamHide[teamId] = !this.teamHide[teamId];
    },
    setQuestTeamHideAll(hide: boolean) {
      this.taskTeamHideAll = hide;
    },
    setItemsTeamHideAll(hide: boolean) {
      this.itemsTeamHideAll = hide;
    },
    setItemsTeamHideNonFIR(hide: boolean) {
      this.itemsTeamHideNonFIR = hide;
    },
    setItemsTeamHideHideout(hide: boolean) {
      this.itemsTeamHideHideout = hide;
    },
    setMapTeamHideAll(hide: boolean) {
      this.mapTeamHideAll = hide;
    },
    setTaskPrimaryView(view: string) {
      this.taskPrimaryView = view;
    },
    setTaskMapView(view: string) {
      this.taskMapView = view;
    },
    setTaskTraderView(view: string) {
      this.taskTraderView = view;
    },
    setTaskSecondaryView(view: string) {
      this.taskSecondaryView = view;
    },
    setTaskUserView(view: string) {
      this.taskUserView = view;
    },
    setNeededTypeView(view: string) {
      this.neededTypeView = view;
    },
    setItemsNeededHideNonFIR(hide: boolean) {
      this.itemsHideNonFIR = hide;
      // Persistence handled automatically by plugin
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.itemsNeededHideNonFIR = true;
    },
    setHideGlobalTasks(hide: boolean) {
      this.hideGlobalTasks = hide;
      // Persistence handled automatically by plugin
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideGlobalTasks = true;
    },
    setHideNonKappaTasks(hide: boolean) {
      this.hideNonKappaTasks = hide;
      // Persistence handled automatically by plugin
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideNonKappaTasks = true;
    },
    setNeededItemsStyle(style: string) {
      this.neededitemsStyle = style;
    },
    setHideoutPrimaryView(view: string) {
      this.hideoutPrimaryView = view;
    },
    setLocaleOverride(locale: string | null) {
      this.localeOverride = locale;
    },
  },
  // Enable automatic localStorage persistence
  persist: {
    key: 'preferences', // LocalStorage key for user preference data
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    // Use serializer instead of paths for selective persistence
    serializer: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
    // Pick specific properties to persist (excluding transient state)
    pick: [
      'streamerMode',
      'teamHide',
      'taskTeamHideAll',
      'itemsTeamHideAll',
      'itemsTeamHideNonFIR',
      'itemsTeamHideHideout',
      'mapTeamHideAll',
      'taskPrimaryView',
      'taskMapView',
      'taskTraderView',
      'taskSecondaryView',
      'taskUserView',
      'neededTypeView',
      'itemsHideNonFIR',
      'hideGlobalTasks',
      'hideNonKappaTasks',
      'neededitemsStyle',
      'hideoutPrimaryView',
      'localeOverride',
    ],
  },
}) as PreferencesStoreDefinition;
// Watch for Supabase user state changing
let stopUserWatch: (() => void) | null = null;
if (import.meta.client) {
  setTimeout(() => {
    try {
      const nuxtApp = useNuxtApp();
      // Ensure Supabase plugin is initialized before accessing
      if (nuxtApp.$supabase) {
        const { $supabase } = nuxtApp;
        // Stop any existing watcher to avoid duplicates (HMR/login churn)
        if (stopUserWatch) {
          stopUserWatch();
          stopUserWatch = null;
        }
        stopUserWatch = watch(
          () => $supabase.user.loggedIn,
          async (newValue: boolean) => {
            // User store data now managed through Supabase listeners
            try {
              const resolvedPinia = pluginPinia ?? nuxtApp.$pinia;
              if (!resolvedPinia) return;
              const preferencesStore = usePreferencesStore(resolvedPinia);
              if (newValue && $supabase.user.id) {
                // Load user preferences from Supabase
                const { data, error } = await $supabase.client
                  .from('user_preferences')
                  .select('*')
                  .eq('user_id', $supabase.user.id)
                  .single();
                if (data && !error) {
                  logger.debug('[PreferencesStore] Loading preferences from Supabase:', data);
                  // Update store with server data
                  Object.keys(data).forEach((key) => {
                    if (key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
                      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
                        letter.toUpperCase()
                      );
                      if (camelKey in preferencesStore.$state) {
                        // Fix type issue by casting through unknown first
                        (preferencesStore.$state as unknown as Record<string, unknown>)[camelKey] =
                          data[key];
                      }
                    }
                  });
                }
                // Set up sync to Supabase
                useSupabaseSync({
                  store: preferencesStore,
                  table: 'user_preferences',
                  debounceMs: 500,
                  transform: (state: unknown) => {
                    const preferencesState = state as PreferencesState;
                    logger.debug(
                      '[PreferencesStore] Transform called - preparing preferences for sync'
                    );
                    // Convert camelCase to snake_case for Supabase
                    return {
                      user_id: $supabase.user.id,
                      streamer_mode: preferencesState.streamerMode,
                      team_hide: preferencesState.teamHide,
                      task_team_hide_all: preferencesState.taskTeamHideAll,
                      items_team_hide_all: preferencesState.itemsTeamHideAll,
                      items_team_hide_non_fir: preferencesState.itemsTeamHideNonFIR,
                      items_team_hide_hideout: preferencesState.itemsTeamHideHideout,
                      map_team_hide_all: preferencesState.mapTeamHideAll,
                      task_primary_view: preferencesState.taskPrimaryView,
                      task_map_view: preferencesState.taskMapView,
                      task_trader_view: preferencesState.taskTraderView,
                      task_secondary_view: preferencesState.taskSecondaryView,
                      task_user_view: preferencesState.taskUserView,
                      needed_type_view: preferencesState.neededTypeView,
                      items_hide_non_fir: preferencesState.itemsHideNonFIR,
                      hide_global_tasks: preferencesState.hideGlobalTasks,
                      hide_non_kappa_tasks: preferencesState.hideNonKappaTasks,
                      neededitems_style: preferencesState.neededitemsStyle,
                      hideout_primary_view: preferencesState.hideoutPrimaryView,
                      locale_override: preferencesState.localeOverride,
                    };
                  },
                });
              }
            } catch (_error) {
              console.error('Error in preferencesStore watch for user.loggedIn:', _error);
            }
          },
          { immediate: true }
        );
        // HMR/route cleanup
        if (import.meta.hot) {
          import.meta.hot.dispose(() => {
            if (stopUserWatch) {
              stopUserWatch();
              stopUserWatch = null;
            }
          });
        }
      }
    } catch (error) {
      console.error('Error setting up preferences store watchers:', error);
    }
  }, 100);
}
