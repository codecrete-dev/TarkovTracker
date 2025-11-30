import { computed, ref } from 'vue';
import { markDataMigrated } from '@/plugins/store-initializer';
import type { GameMode } from '@/utils/constants';
import DataMigrationService from '@/utils/dataMigrationService';
// Composable to handle data migration from localStorage or old API to Supabase
export function useDataMigration() {
  // Reactive state for migration process
  const migrationStatus = ref('idle'); // 'idle', 'migrating', 'success', 'error'
  const migrationMessage = ref('');
  const migrationError = ref<Error | null>(null);
  const isMigrating = computed(() => migrationStatus.value === 'migrating');
  const hasMigrated = computed(() => migrationStatus.value === 'success');
  const hasError = computed(() => migrationStatus.value === 'error');
  /**
   * Attempts to migrate local data to the user's Supabase account
   * @param {string} userId - The authenticated user's ID
   * @returns {Promise<boolean>} - Returns true if migration was successful or not needed
   */
  const migrateLocalData = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.warn('[useDataMigration] No user ID provided for migration');
      return false;
    }
    try {
      migrationStatus.value = 'migrating';
      migrationMessage.value = 'Checking for local data to migrate...';
      migrationError.value = null;
      // Check if there's local data to migrate
      if (!DataMigrationService.hasLocalData()) {
        migrationStatus.value = 'success';
        migrationMessage.value = 'No local data to migrate.';
        return true;
      }
      // Check if user already has data in Supabase
      const hasRemoteData = await DataMigrationService.hasUserData(userId);
      if (hasRemoteData) {
        migrationStatus.value = 'success';
        migrationMessage.value = 'User already has data in the cloud. Skipping migration.';
        // Mark as migrated locally to prevent repeated checks
        markDataMigrated();
        return true;
      }
      // Proceed with migration
      migrationMessage.value = 'Migrating your progress data...';
      const migrationSuccess = await DataMigrationService.migrateDataToUser(userId);
      if (migrationSuccess) {
        migrationStatus.value = 'success';
        migrationMessage.value = 'Your local progress has been successfully saved to the cloud!';
        // Mark as migrated to prevent repeated migrations
        markDataMigrated();
        return true;
      } else {
        throw new Error('Migration process reported failure');
      }
    } catch (error) {
      console.error('[useDataMigration] Migration failed:', error);
      migrationStatus.value = 'error';
      migrationError.value = error as Error;
      migrationMessage.value =
        error instanceof Error ? error.message : 'An unknown error occurred during migration.';
      return false;
    }
  };
  /**
   * Imports data from an external API token to the user's account
   * @param {string} apiToken - The API token from the old system
   * @param {string} userId - The authenticated user's ID
   * @param {GameMode} targetGameMode - The game mode for the imported data
   * @returns {Promise<boolean>} - Returns true if import was successful
   */
  const importFromApiToken = async (
    apiToken: string,
    userId: string,
    targetGameMode?: GameMode
  ): Promise<boolean> => {
    if (!apiToken || !userId) {
      console.warn('[useDataMigration] Missing API token or user ID for import');
      return false;
    }
    try {
      migrationStatus.value = 'migrating';
      migrationMessage.value = 'Fetching data from API token...';
      migrationError.value = null;
      // Fetch data using the API token
      const importedData = await DataMigrationService.fetchDataWithApiToken(apiToken);
      if (!importedData) {
        throw new Error('Failed to fetch data using the provided API token');
      }
      // Import the data to the user's Supabase account
      migrationMessage.value = 'Saving imported data to your account...';
      const importSuccess = await DataMigrationService.importDataToUser(
        userId,
        importedData,
        targetGameMode
      );
      if (importSuccess) {
        migrationStatus.value = 'success';
        migrationMessage.value = 'Data successfully imported from API token!';
        return true;
      } else {
        throw new Error('Import process reported failure');
      }
    } catch (error) {
      console.error('[useDataMigration] Import failed:', error);
      migrationStatus.value = 'error';
      migrationError.value = error as Error;
      migrationMessage.value =
        error instanceof Error ? error.message : 'An unknown error occurred during import.';
      return false;
    }
  };
  /**
   * Resets the migration state to idle
   */
  const resetMigrationState = () => {
    migrationStatus.value = 'idle';
    migrationMessage.value = '';
    migrationError.value = null;
  };
  return {
    // State
    migrationStatus: computed(() => migrationStatus.value),
    migrationMessage: computed(() => migrationMessage.value),
    migrationError: computed(() => migrationError.value),
    isMigrating,
    hasMigrated,
    hasError,
    // Actions
    migrateLocalData,
    importFromApiToken,
    resetMigrationState,
  };
}
