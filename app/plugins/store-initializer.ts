/**
 * Simplified store initialization and data migration utilities
 */
// Extend Window interface for custom properties
declare global {
  interface Window {
    __TARKOV_DATA_MIGRATED?: boolean;
  }
}
let isStoreInitialized = false;
export function markInitialized(): void {
  isStoreInitialized = true;
}
export function isInitialized(): boolean {
  return isStoreInitialized;
}
export function forceInitialize(): void {
  markInitialized();
}
// Data migration utilities
export function wasDataMigrated(): boolean {
  if (typeof window !== 'undefined') {
    return (
      window.__TARKOV_DATA_MIGRATED === true ||
      sessionStorage.getItem('tarkovDataMigrated') === 'true'
    );
  }
  return false;
}
export function markDataMigrated(): void {
  if (typeof window !== 'undefined') {
    window.__TARKOV_DATA_MIGRATED = true;
    try {
      sessionStorage.setItem('tarkovDataMigrated', 'true');
    } catch (e) {
      console.warn('Could not save migration flag to sessionStorage', e);
    }
  }
}
// No-op Nuxt plugin so the file isn't ignored during auto-registration
export default defineNuxtPlugin(() => ({}));
