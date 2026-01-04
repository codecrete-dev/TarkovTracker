import {
  clearStoredPreferences,
  getPreferredNavUrl,
  hasExplicitParams,
  hasFilterConfig,
} from '@/composables/usePageFilterRegistry';

/**
 * Global middleware for filter preference restoration and reset.
 * 
 * Navigation Intent Logic:
 * 1. If back/forward (popstate) → do nothing, use URL as-is
 * 2. If same-page re-click → clear stored prefs (reset behavior)
 * 3. If clean URL (no params) → redirect to URL with stored prefs
 * 4. If URL has explicit params → use them as-is
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // Only handle pages with filter configs
  if (!hasFilterConfig(to.path)) {
    return;
  }

  // Detect back/forward navigation (popstate)
  // In Nuxt 3, we can check if this is a popstate by looking at the navigation type
  // For now, we use a heuristic: if `from` has the same path as `to` and 
  // the URL has params, it's likely a history navigation to a saved state
  const isPopstate = typeof window !== 'undefined' && 
    window.performance?.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward';
  
  if (isPopstate) {
    // Don't interfere with back/forward navigation
    return;
  }

  // Check if this is a same-page navigation (re-click on current page's nav link)
  const isSamePageNavigation = from.path === to.path;
  
  if (isSamePageNavigation) {
    // If navigating to clean URL on same page, this is a reset action
    if (!hasExplicitParams(to.path, to.query as Record<string, unknown>)) {
      clearStoredPreferences(to.path);
      // Continue to the clean URL (will show defaults)
    }
    return;
  }

  // Fresh navigation to a different page
  // Check if URL has explicit params
  if (hasExplicitParams(to.path, to.query as Record<string, unknown>)) {
    // URL has explicit params - use them as-is
    // Page composable will persist these on mount
    return;
  }

  // Clean URL with no params - redirect to URL with stored preferences
  const preferredUrl = getPreferredNavUrl(to.path);
  
  // Only redirect if we actually have stored preferences to apply
  if (preferredUrl !== to.path) {
    return navigateTo(preferredUrl, { replace: true });
  }
});
