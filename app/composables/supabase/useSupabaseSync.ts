import { ref, watch, onUnmounted, getCurrentInstance } from "vue";
import type { Store } from "pinia";
import { debounce } from "@/utils/debounce";
import type { UserProgressData } from "~/shared_state";

export interface SupabaseSyncConfig {
  store: Store;
  table: string;
  transform?: (state: Record<string, unknown>) => Record<string, unknown>;
  debounceMs?: number;
}

// Type for the transformed data that gets sent to Supabase
interface SupabaseUserData {
  user_id?: string;
  current_game_mode?: string;
  game_edition?: number;
  pvp_data?: UserProgressData;
  pve_data?: UserProgressData;
  [key: string]: unknown;
}

export function useSupabaseSync({
  store,
  table,
  transform,
  debounceMs = 1000,
}: SupabaseSyncConfig) {
  console.log(`[Sync] useSupabaseSync initialized for table: ${table}, debounce: ${debounceMs}ms`);
  const { $supabase } = useNuxtApp();
  const isSyncing = ref(false);
  const isPaused = ref(false);
  const syncToSupabase = async (inputState: unknown) => {
    const state = inputState as Record<string, unknown>;
    console.log("[Sync] syncToSupabase called", {
      loggedIn: $supabase.user.loggedIn,
      userId: $supabase.user.id,
      isPaused: isPaused.value,
    });
    if (isPaused.value) {
      console.log("[Sync] Skipping - sync is paused");
      return;
    }
    if (!$supabase.user.loggedIn || !$supabase.user.id) {
      console.log("[Sync] Skipping - user not logged in");
      return;
    }
    isSyncing.value = true;
    try {
      const dataToSave = transform ? transform(state) : state;
      // Skip if transform returned null (e.g., during initial load)
      if (!dataToSave) {
        console.log("[Sync] Skipping - transform returned null");
        isSyncing.value = false;
        return;
      }
      // Ensure user_id is present if not already
      if (!dataToSave.user_id) {
        dataToSave.user_id = $supabase.user.id;
      }

      // Log detailed info about what we're syncing
      if (table === "user_progress") {
        const userData = dataToSave as SupabaseUserData;
        const pvpTasks = Object.keys(userData.pvp_data?.taskCompletions || {}).length;
        const pveTasks = Object.keys(userData.pve_data?.taskCompletions || {}).length;
        console.log(`[Sync] About to upsert to ${table}:`, {
          userId: userData.user_id,
          gameMode: userData.current_game_mode,
          pvpLevel: userData.pvp_data?.level,
          pvpTasksCompleted: pvpTasks,
          pveLevel: userData.pve_data?.level,
          pveTasksCompleted: pveTasks,
        });
      } else {
        console.log("[Sync] About to upsert to", table, dataToSave);
      }
      const { error } = await $supabase.client.from(table).upsert(dataToSave);
      if (error) {
        console.error(`[Sync] Error syncing to ${table}:`, error);
      } else {
        console.log(`[Sync] ✅ Successfully synced to ${table}`);
      }
    } catch (err) {
      console.error(`[Sync] Unexpected error:`, err);
    } finally {
      isSyncing.value = false;
    }
  };

  const debouncedSync = debounce(syncToSupabase, debounceMs);
  const unwatch = watch(
    () => store.$state,
    (newState) => {
      console.log(`[Sync] Store state changed for ${table}, triggering debounced sync`);
      debouncedSync(JSON.parse(JSON.stringify(newState)));
    },
    { deep: true }
  );
  const cleanup = () => {
    debouncedSync.cancel();
    unwatch();
  };
  if (getCurrentInstance()) {
    onUnmounted(cleanup);
  }

  const pause = () => {
    console.log(`[Sync] Pausing sync for ${table}`);
    isPaused.value = true;
    debouncedSync.cancel();
  };

  const resume = () => {
    console.log(`[Sync] Resuming sync for ${table}`);
    isPaused.value = false;
  };

  return {
    isSyncing,
    isPaused,
    cleanup,
    pause,
    resume,
  };
}
