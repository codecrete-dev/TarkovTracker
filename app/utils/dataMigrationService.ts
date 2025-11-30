import type { UserProgressData } from '@/stores/progressState';
import type { GameMode } from '@/utils/constants';
import { GAME_EDITION_STRING_VALUES, normalizePMCFaction } from '@/utils/constants';
// import { defaultState, migrateToGameModeStructure } from "@/stores/progressState";
// Define a basic interface for the progress data structure
export interface ProgressData {
  level: number;
  gameEdition?: string;
  pmcFaction?: string;
  displayName?: string;
  taskCompletions?: {
    [key: string]: { complete: boolean; timestamp?: number; failed?: boolean };
  };
  taskObjectives?: {
    [key: string]: {
      complete: boolean;
      count?: number;
      timestamp?: number | null;
    };
  };
  hideoutModules?: { [key: string]: { complete: boolean; timestamp?: number } };
  hideoutParts?: {
    [key: string]: {
      complete: boolean;
      count?: number;
      timestamp?: number | null;
    };
  };
  lastUpdated?: string;
  migratedFromLocalStorage?: boolean;
  migrationDate?: string;
  autoMigrated?: boolean;
  imported?: boolean;
  importedFromExternalSource?: boolean;
  importDate?: string;
  importedFromApi?: boolean;
  sourceUserId?: string;
  sourceDomain?: string;
  [key: string]: unknown;
}
const LOCAL_PROGRESS_KEY = 'progress';
/**
 * Service to handle migration of local data to a user's Supabase account
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class DataMigrationService {
  /**
   * Transform task objectives to ensure proper timestamp format
   * @param taskObjectives The task objectives to transform
   * @returns Transformed task objectives compatible with UserProgressData
   */
  private static transformTaskObjectives(
    taskObjectives: ProgressData['taskObjectives']
  ): UserProgressData['taskObjectives'] {
    const transformed: UserProgressData['taskObjectives'] = {};
    if (taskObjectives) {
      for (const [id, objective] of Object.entries(taskObjectives)) {
        const transformedObjective: Record<string, unknown> = {
          complete: objective.complete || false,
          count: objective.count || 0,
        };
        // Only include timestamp if it's not null/undefined
        if (objective.timestamp !== null && objective.timestamp !== undefined) {
          transformedObjective.timestamp = objective.timestamp;
        }
        transformed[id] = transformedObjective;
      }
    }
    return transformed;
  }
  /**
   * Transform hideout parts to ensure proper timestamp format
   * @param hideoutParts The hideout parts to transform
   * @returns Transformed hideout parts compatible with UserProgressData
   */
  private static transformHideoutParts(
    hideoutParts: ProgressData['hideoutParts']
  ): UserProgressData['hideoutParts'] {
    const transformed: UserProgressData['hideoutParts'] = {};
    if (hideoutParts) {
      for (const [id, part] of Object.entries(hideoutParts)) {
        const transformedPart: Record<string, unknown> = {
          complete: part.complete || false,
          count: part.count || 0,
        };
        // Only include timestamp if it's not null/undefined
        if (part.timestamp !== null && part.timestamp !== undefined) {
          transformedPart.timestamp = part.timestamp;
        }
        transformed[id] = transformedPart;
      }
    }
    return transformed;
  }
  /**
   * Check if there is local data that can be migrated to a user account
   * @returns {boolean} True if local data exists
   */
  static hasLocalData(): boolean {
    try {
      const progressData = localStorage.getItem(LOCAL_PROGRESS_KEY);
      if (!progressData || progressData === '{}') {
        return false;
      }
      const parsedData: ProgressData = JSON.parse(progressData);
      const hasKeys = Object.keys(parsedData).length > 0;
      const hasProgress =
        parsedData.level > 1 ||
        Object.keys(parsedData.taskCompletions || {}).length > 0 ||
        Object.keys(parsedData.taskObjectives || {}).length > 0 ||
        Object.keys(parsedData.hideoutModules || {}).length > 0;
      return hasKeys && hasProgress;
    } catch (error) {
      console.warn('[DataMigrationService] Error in hasLocalData:', error);
      return false;
    }
  }
  /**
   * Get the local progress data
   * @returns {ProgressData | null} The local progress data or null if none exists
   */
  static getLocalData(): ProgressData | null {
    try {
      const progressData = localStorage.getItem(LOCAL_PROGRESS_KEY);
      if (!progressData) {
        return null;
      }
      const parsedData: ProgressData = JSON.parse(progressData);
      if (Object.keys(parsedData).length > 0) {
        return JSON.parse(JSON.stringify(parsedData)) as ProgressData;
      }
      return null;
    } catch (error) {
      console.warn('[DataMigrationService] Error in getLocalData:', error);
      return null;
    }
  }
  /**
   * Check if a user already has data in their account
   * @param {string} uid The user's UID
   * @returns {Promise<boolean>} True if the user has existing data
   */
  /**
   * Check if a user already has data in their account
   * @param {string} uid The user's UID
   * @returns {Promise<boolean>} True if the user has existing data
   */
  static async hasUserData(uid: string): Promise<boolean> {
    try {
      const { $supabase } = useNuxtApp();
      const { data, error } = await $supabase.client
        .from('user_progress')
        .select('level, task_completions, task_objectives, hideout_modules')
        .eq('user_id', uid)
        .single();
      if (error || !data) return false;
      const hasProgress =
        (data.level && data.level > 1) ||
        (data.task_completions && Object.keys(data.task_completions).length > 0) ||
        (data.task_objectives && Object.keys(data.task_objectives).length > 0) ||
        (data.hideout_modules && Object.keys(data.hideout_modules).length > 0);
      return !!hasProgress;
    } catch (error) {
      console.warn('[DataMigrationService] Error in hasUserData:', error);
      return false;
    }
  }
  /**
   * Migrate local data to a user's account
   * @param {string} uid The user's UID
   * @returns {Promise<boolean>} True if migration was successful
   */
  static async migrateDataToUser(uid: string): Promise<boolean> {
    if (!uid) return false;
    try {
      const localData = this.getLocalData();
      if (!localData) return false;
      const { $supabase } = useNuxtApp();
      const hasExisting = await this.hasUserData(uid);
      if (hasExisting) {
        console.warn('[DataMigrationService] User already has data, aborting automatic migration.');
        return false;
      }
      // Prepare data for Supabase (map to snake_case columns)
      const supabaseData = {
        user_id: uid,
        level: localData.level,
        game_edition:
          typeof localData.gameEdition === 'string'
            ? parseInt(localData.gameEdition)
            : localData.gameEdition,
        pmc_faction: localData.pmcFaction,
        display_name: localData.displayName,
        task_completions: localData.taskCompletions,
        task_objectives: this.transformTaskObjectives(localData.taskObjectives),
        hideout_modules: localData.hideoutModules,
        hideout_parts: this.transformHideoutParts(localData.hideoutParts),
        last_updated: new Date().toISOString(),
        // Metadata stored in a separate jsonb column or flattened?
        // For now, we'll assume the schema handles the main fields.
        // If we need to store migration metadata, we might need a metadata column or just ignore it for now as it's less critical.
      };
      const { error } = await $supabase.client.from('user_progress').upsert(supabaseData);
      if (error) {
        console.error('[DataMigrationService] Error migrating data to Supabase:', error);
        return false;
      }
      // Backup local data
      const backupKey = `progress_backup_${new Date().toISOString()}`;
      try {
        localStorage.setItem(backupKey, JSON.stringify(localData));
      } catch (backupError) {
        console.warn('[DataMigrationService] Could not backup local data:', backupError);
      }
      return true;
    } catch (error) {
      console.error('[DataMigrationService] General error in migrateDataToUser:', error);
      return false;
    }
  }
  // ... exportDataForMigration and validateImportData remain largely the same ...
  /**
   * Import data from another domain/file to a user's account.
   * @param {string} uid The user's UID
   * @param {ProgressData} importedData The imported data to save
   * @returns {Promise<boolean>} True if import was successful
   */
  static async importDataToUser(
    uid: string,
    importedData: ProgressData,
    _targetGameMode?: GameMode
  ): Promise<boolean> {
    if (!uid || !importedData) return false;
    try {
      const { $supabase } = useNuxtApp();
      // Transform and map to Supabase schema
      const supabaseData = {
        user_id: uid,
        level: importedData.level || 1,
        game_edition:
          typeof importedData.gameEdition === 'string'
            ? parseInt(importedData.gameEdition) || 1
            : importedData.gameEdition || 1,
        pmc_faction: normalizePMCFaction(importedData.pmcFaction),
        display_name: importedData.displayName || null,
        task_completions: importedData.taskCompletions || {},
        task_objectives: this.transformTaskObjectives(importedData.taskObjectives || {}),
        hideout_modules: importedData.hideoutModules || {},
        hideout_parts: this.transformHideoutParts(importedData.hideoutParts || {}),
        last_updated: new Date().toISOString(),
      };
      const { error } = await $supabase.client.from('user_progress').upsert(supabaseData);
      if (error) {
        console.error(
          `[DataMigrationService] Supabase error importing data for user ${uid}:`,
          error
        );
        return false;
      }
      // Update local storage
      // We might need to reconstruct the local storage format if the app still relies on it for some things,
      // but primarily we rely on the store syncing from Supabase now.
      // For safety, we can update the local 'progress' key with the imported data structure.
      localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(importedData));
      return true;
    } catch (error) {
      console.error(
        `[DataMigrationService] General error in importDataToUser for user ${uid}:`,
        error
      );
      return false;
    }
  }
  /**
   * Fetch user data from old TarkovTracker domain using API token
   * @param {string} apiToken The user's API token from the old site
   * @param {string} oldDomain Optional domain of the old site
   * @returns {Promise<ProgressData | null>} The user's data or null if failed
   */
  static async fetchDataWithApiToken(
    apiToken: string,
    oldDomain: string = 'https://tarkovtracker.io/api/v2/progress'
  ): Promise<ProgressData | null> {
    if (!apiToken) {
      return null;
    }
    try {
      const apiUrl = oldDomain; // The default parameter already includes the path
      const headers = {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      };
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        console.error(`[DataMigrationService] API token fetch failed: ${response.status}`);
        return null;
      }
      // Definition for the raw data structure from the old API
      interface OldApiRawData {
        playerLevel?: number;
        level?: number;
        gameEdition?: string;
        pmcFaction?: string;
        displayName?: string;
        tasksProgress?: OldTaskProgress[];
        hideoutModulesProgress?: OldHideoutModuleProgress[];
        hideoutPartsProgress?: OldHideoutPartProgress[];
        taskObjectivesProgress?: OldTaskObjectiveProgress[];
        userId?: string;
        [key: string]: unknown; // For any other properties
      }
      const apiJsonResponse = (await response.json()) as unknown;
      let dataFromApi: OldApiRawData;
      if (typeof apiJsonResponse === 'object' && apiJsonResponse !== null) {
        if (
          'data' in apiJsonResponse &&
          typeof (apiJsonResponse as { data: unknown }).data === 'object' &&
          (apiJsonResponse as { data: unknown }).data !== null
        ) {
          dataFromApi = (apiJsonResponse as { data: OldApiRawData }).data;
        } else {
          dataFromApi = apiJsonResponse as OldApiRawData;
        }
      } else {
        console.error('[DataMigrationService] API response is not a valid object.');
        return null;
      }
      // Type definitions for the expected array elements from the old API
      interface OldTaskProgress {
        id: string;
        complete?: boolean;
        failed?: boolean;
      }
      interface OldHideoutModuleProgress {
        id: string;
        complete?: boolean;
      }
      interface OldHideoutPartProgress {
        id: string;
        complete?: boolean;
        count?: number;
      }
      interface OldTaskObjectiveProgress {
        id: string;
        complete?: boolean;
        count?: number;
      }
      const taskCompletions: ProgressData['taskCompletions'] = {};
      if (Array.isArray(dataFromApi.tasksProgress)) {
        dataFromApi.tasksProgress.forEach((task: OldTaskProgress) => {
          if (task.complete === true || task.failed === true) {
            // Also include failed tasks
            taskCompletions![task.id] = {
              // Non-null assertion because we initialize it
              complete: task.complete || false,
              timestamp: Date.now(),
              failed: task.failed || false,
            };
          }
        });
      }
      const hideoutModules: ProgressData['hideoutModules'] = {};
      if (Array.isArray(dataFromApi.hideoutModulesProgress)) {
        dataFromApi.hideoutModulesProgress.forEach((module: OldHideoutModuleProgress) => {
          if (module.complete === true) {
            hideoutModules![module.id] = {
              // Non-null assertion
              complete: true,
              timestamp: Date.now(),
            };
          }
        });
      }
      const hideoutParts: ProgressData['hideoutParts'] = {};
      if (Array.isArray(dataFromApi.hideoutPartsProgress)) {
        dataFromApi.hideoutPartsProgress.forEach((part: OldHideoutPartProgress) => {
          hideoutParts![part.id] = {
            // Non-null assertion
            complete: part.complete || false,
            count: part.count || 0,
            timestamp: part.complete ? Date.now() : null,
          };
        });
      }
      const taskObjectives: ProgressData['taskObjectives'] = {};
      if (Array.isArray(dataFromApi.taskObjectivesProgress)) {
        dataFromApi.taskObjectivesProgress.forEach((objective: OldTaskObjectiveProgress) => {
          taskObjectives![objective.id] = {
            // Non-null assertion
            complete: objective.complete || false,
            count: objective.count || 0,
            timestamp: objective.complete ? Date.now() : null,
          };
        });
      }
      const migrationData: ProgressData = {
        level: dataFromApi.playerLevel || dataFromApi.level || 1,
        gameEdition: dataFromApi.gameEdition || GAME_EDITION_STRING_VALUES[0],
        pmcFaction: normalizePMCFaction(dataFromApi.pmcFaction).toLowerCase(),
        displayName: dataFromApi.displayName || '',
        taskCompletions: taskCompletions,
        taskObjectives: taskObjectives,
        hideoutModules: hideoutModules,
        hideoutParts: hideoutParts,
        importedFromApi: true,
        importDate: new Date().toISOString(),
        sourceUserId: dataFromApi.userId,
        sourceDomain: oldDomain,
      };
      return migrationData;
    } catch (error) {
      console.error('[DataMigrationService] Error fetching data with API token:', error);
      return null;
    }
  }
}
