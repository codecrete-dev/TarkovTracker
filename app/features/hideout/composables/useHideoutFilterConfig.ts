import type { FilterConfig } from '@/composables/usePageFilters';
import { usePreferencesStore } from '@/stores/usePreferences';

/**
 * Returns the filter configuration for the Hideout page.
 * This is extracted so it can be used by both the page (for URL-based filtering)
 * and navigation links (for building URLs with stored preferences).
 */
export function useHideoutFilterConfig(): FilterConfig {
  const preferencesStore = usePreferencesStore();
  
  return {
    view: {
      default: 'available',
      storedDefault: () => preferencesStore.$state.hideoutPrimaryView,
      onUpdate: (v) => preferencesStore.setHideoutPrimaryView(v as string),
      validate: (v) => ['all', 'available', 'maxed', 'locked'].includes(v),
    },
    station: { default: '' },
  };
}
