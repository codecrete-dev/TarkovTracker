import type { FilterConfig } from '@/composables/usePageFilters';
import { usePreferencesStore } from '@/stores/usePreferences';

/**
 * Returns the filter configuration for the Tasks page.
 * This is extracted so it can be used by both the page (for URL-based filtering)
 * and navigation links (for building URLs with stored preferences).
 */
export function useTasksFilterConfig(): FilterConfig {
  const preferencesStore = usePreferencesStore();
  
  return {
    // Primary view selector - always included in nav URLs
    view: {
      default: 'all',
      storedDefault: () => preferencesStore.$state.taskPrimaryView,
      onUpdate: (v) => preferencesStore.setTaskPrimaryView(v as string),
      validate: (v) => ['all', 'maps', 'traders'].includes(v),
    },
    // Status filter - always included in nav URLs
    status: {
      default: 'available',
      storedDefault: () => preferencesStore.$state.taskSecondaryView,
      onUpdate: (v) => preferencesStore.setTaskSecondaryView(v as string),
      validate: (v) => ['all', 'available', 'locked', 'completed', 'failed'].includes(v),
    },
    // Map filter - only include in nav URLs when view=maps
    map: {
      default: 'all',
      storedDefault: () => preferencesStore.$state.taskMapView,
      onUpdate: (v) => preferencesStore.setTaskMapView(v as string),
      scope: { dependsOn: 'view', values: ['maps'] },
    },
    // Trader filter - only include in nav URLs when view=traders
    trader: {
      default: 'all',
      storedDefault: () => preferencesStore.$state.taskTraderView,
      onUpdate: (v) => preferencesStore.setTaskTraderView(v as string),
      scope: { dependsOn: 'view', values: ['traders'] },
    },
    // Single-task mode - not persisted, not in nav URLs
    task: { default: '' },
    // Search - not persisted, not in nav URLs
    search: { default: '', debounceMs: 300 },
  };
}
