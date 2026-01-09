import { type FilterConfig, buildPreferredUrl } from '@/composables/usePageFilters';
import { useHideoutFilterConfig } from '@/features/hideout/composables/useHideoutFilterConfig';
import { useNeededItemsFilterConfig } from '@/features/neededitems/composables/useNeededItemsFilterConfig';
import { useTasksFilterConfig } from '@/features/tasks/composables/useTasksFilterConfig';
/**
 * Registry mapping page paths to their filter config getters.
 * Used by middleware and navigation to manage filter preferences.
 */
const PAGE_FILTER_CONFIGS: Record<string, () => FilterConfig> = {
  '/tasks': useTasksFilterConfig,
  '/hideout': useHideoutFilterConfig,
  '/neededitems': useNeededItemsFilterConfig,
};
/**
 * Get the preferred navigation URL for a page path.
 * Builds URL with stored preferences from config's storedDefault getters.
 *
 * @param path - The base path (e.g., '/tasks')
 * @returns The path with stored preferences as query params
 */
export function getPreferredNavUrl(path: string): string {
  const configGetter = PAGE_FILTER_CONFIGS[path];
  if (!configGetter) {
    return path;
  }
  const config = configGetter();
  return buildPreferredUrl(path, config);
}
/**
 * Check if a path has a registered filter config.
 */
export function hasFilterConfig(path: string): boolean {
  return path in PAGE_FILTER_CONFIGS;
}
/**
 * Get the filter config for a path.
 */
export function getFilterConfig(path: string): FilterConfig | null {
  const configGetter = PAGE_FILTER_CONFIGS[path];
  return configGetter ? configGetter() : null;
}
/**
 * Clear stored preferences for a page path.
 * Calls onUpdate(default) for each param to reset stored values.
 */
export function clearStoredPreferences(path: string): void {
  const config = getFilterConfig(path);
  if (!config) return;
  for (const [_key, paramConfig] of Object.entries(config)) {
    if (paramConfig.onUpdate) {
      // Reset to default value
      paramConfig.onUpdate(paramConfig.default);
    }
  }
}
/**
 * Check if URL has any of the managed filter params for a path.
 */
export function hasExplicitParams(path: string, query: Record<string, unknown>): boolean {
  const config = getFilterConfig(path);
  if (!config) return false;
  for (const key of Object.keys(config)) {
    const value = query[key];
    if (value !== undefined && value !== null && value !== '') {
      return true;
    }
  }
  return false;
}
