import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { markDataMigrated } from '@/plugins/store-initializer';
import { usePreferencesStore } from '@/stores/usePreferences';
import { initializeTarkovSync, useTarkovStore } from '@/stores/useTarkov';
/**
 * Handles app-level initialization:
 * - Locale setup from user preferences
 * - Supabase sync initialization for authenticated users
 * - Legacy data migration
 */
export function useAppInitialization() {
  const { $supabase } = useNuxtApp();
  const preferencesStore = usePreferencesStore();
  const { locale } = useI18n({ useScope: 'global' });
  onMounted(async () => {
    // Apply user's locale preference
    const localeOverride = preferencesStore.localeOverride;
    if (localeOverride) {
      locale.value = localeOverride;
    }
    // Initialize Supabase sync for authenticated users
    if ($supabase.user.loggedIn) {
      await initializeTarkovSync();
    }
    // Handle legacy data migration if needed
    const wasMigrated = sessionStorage.getItem('tarkovDataMigrated') === 'true';
    if (wasMigrated && $supabase.user.loggedIn) {
      markDataMigrated();
      try {
        const store = useTarkovStore();
        if (typeof store.migrateDataIfNeeded === 'function') {
          store.migrateDataIfNeeded();
        }
      } catch (error) {
        console.error('Error running data migration:', error);
      }
    }
  });
}
