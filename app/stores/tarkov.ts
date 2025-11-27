import { defineStore, type _GettersTree, type StateTree } from "pinia";
import {
  getters,
  actions,
  defaultState,
  migrateToGameModeStructure,
  type UserState,
  type UserActions,
} from "@/shared_state";
import { GAME_MODES, type GameMode } from "@/utils/constants";
import { useSupabaseSync } from "@/composables/supabase/useSupabaseSync";

// Create a type that extends UserState with Pinia store methods
type TarkovStoreInstance = UserState & {
  $state: UserState;
  $patch(partial: Partial<UserState>): void;
};

// Create typed getters object with the additional store-specific getters
const tarkovGetters = {
  ...getters,
  // Removed side-effect causing getters. Migration should be handled in actions or initialization.
} satisfies _GettersTree<UserState>;

// Create typed actions object with the additional store-specific actions
const tarkovActions = {
  ...(actions as UserActions),
  async switchGameMode(this: TarkovStoreInstance, mode: GameMode) {
    actions.switchGameMode.call(this, mode);
    const { $supabase } = useNuxtApp();
    if ($supabase.user.loggedIn && $supabase.user.id) {
      try {
        const completeState = {
          user_id: $supabase.user.id,
          current_game_mode: mode,
          game_edition: this.gameEdition,
          pvp_data: this.pvp,
          pve_data: this.pve,
        };
        await $supabase.client.from("user_progress").upsert(completeState);
      } catch (error) {
        console.error("Error syncing gamemode to backend:", error);
      }
    }
  },
  migrateDataIfNeeded(this: TarkovStoreInstance) {
    const needsMigration =
      !this.currentGameMode ||
      !this.pvp ||
      !this.pve ||
      ((this as unknown as Record<string, unknown>).level !== undefined && !this.pvp?.level);
    if (needsMigration) {
      console.log("Migrating legacy data structure to gamemode-aware structure");
      const currentState = JSON.parse(JSON.stringify(this.$state));
      const migratedData = migrateToGameModeStructure(currentState);
      this.$patch(migratedData);
      const { $supabase } = useNuxtApp();
      if ($supabase.user.loggedIn && $supabase.user.id) {
        try {
          $supabase.client.from("user_progress").upsert({
            user_id: $supabase.user.id,
            current_game_mode: migratedData.currentGameMode,
            game_edition: migratedData.gameEdition,
            pvp_data: migratedData.pvp,
            pve_data: migratedData.pve,
          });
        } catch (error) {
          console.error("Error saving migrated data to Supabase:", error);
        }
      }
    }
  },
  async resetOnlineProfile(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    if (!$supabase.user.loggedIn || !$supabase.user.id) {
      console.error("User not logged in. Cannot reset online profile.");
      return;
    }
    try {
      const freshDefaultState = JSON.parse(JSON.stringify(defaultState));
      await $supabase.client.from("user_progress").upsert({
        user_id: $supabase.user.id,
        current_game_mode: freshDefaultState.currentGameMode,
        game_edition: freshDefaultState.gameEdition,
        pvp_data: freshDefaultState.pvp,
        pve_data: freshDefaultState.pve,
      });
      localStorage.clear();
      this.$patch(JSON.parse(JSON.stringify(defaultState)));
    } catch (error) {
      console.error("Error resetting online profile:", error);
    }
  },
  async resetCurrentGameModeData(this: TarkovStoreInstance) {
    const tarkovStore = useTarkovStore();
    const currentMode = tarkovStore.getCurrentGameMode();
    if (currentMode === GAME_MODES.PVP) {
      // Use the actions object directly to avoid type issues
      await tarkovActions.resetPvPData.call(this);
    } else {
      // Use the actions object directly to avoid type issues
      await tarkovActions.resetPvEData.call(this);
    }
  },
  async resetPvPData(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    console.log("[TarkovStore] Resetting PvP data...");

    try {
      // Pause sync to prevent re-sync loops
      const controller = getSyncController();
      if (controller) {
        controller.pause();
      }

      const freshPvPData = JSON.parse(JSON.stringify(defaultState.pvp));

      if ($supabase.user.loggedIn && $supabase.user.id) {
        // User is logged in - reset both Supabase and localStorage
        console.log("[TarkovStore] Resetting PvP data in Supabase");
        await $supabase.client.from("user_progress").upsert({
          user_id: $supabase.user.id,
          pvp_data: freshPvPData,
        });
      }

      // Clear localStorage and update store
      console.log("[TarkovStore] Clearing localStorage and updating store");
      localStorage.removeItem("progress");
      this.$patch({ pvp: freshPvPData });

      // Small delay to ensure all operations complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Resume sync
      if (controller) {
        controller.resume();
      }

      console.log("[TarkovStore] PvP data reset complete");
    } catch (error) {
      console.error("[TarkovStore] Error resetting PvP data:", error);
      // Resume sync even on error
      const controller = getSyncController();
      if (controller) {
        controller.resume();
      }
      throw error;
    }
  },
  async resetPvEData(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    console.log("[TarkovStore] Resetting PvE data...");

    try {
      // Pause sync to prevent re-sync loops
      const controller = getSyncController();
      if (controller) {
        controller.pause();
      }

      const freshPvEData = JSON.parse(JSON.stringify(defaultState.pve));

      if ($supabase.user.loggedIn && $supabase.user.id) {
        // User is logged in - reset both Supabase and localStorage
        console.log("[TarkovStore] Resetting PvE data in Supabase");
        await $supabase.client.from("user_progress").upsert({
          user_id: $supabase.user.id,
          pve_data: freshPvEData,
        });
      }

      // Clear localStorage and update store
      console.log("[TarkovStore] Clearing localStorage and updating store");
      localStorage.removeItem("progress");
      this.$patch({ pve: freshPvEData });

      // Small delay to ensure all operations complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Resume sync
      if (controller) {
        controller.resume();
      }

      console.log("[TarkovStore] PvE data reset complete");
    } catch (error) {
      console.error("[TarkovStore] Error resetting PvE data:", error);
      // Resume sync even on error
      const controller = getSyncController();
      if (controller) {
        controller.resume();
      }
      throw error;
    }
  },
  async resetAllData(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    console.log("[TarkovStore] Resetting all data (both PvP and PvE)...");

    try {
      // Pause sync to prevent re-sync loops
      const controller = getSyncController();
      if (controller) {
        controller.pause();
      }

      const freshDefaultState = JSON.parse(JSON.stringify(defaultState));

      if ($supabase.user.loggedIn && $supabase.user.id) {
        // User is logged in - reset both Supabase and localStorage
        console.log("[TarkovStore] Resetting all data in Supabase");
        await $supabase.client.from("user_progress").upsert({
          user_id: $supabase.user.id,
          current_game_mode: freshDefaultState.currentGameMode,
          game_edition: freshDefaultState.gameEdition,
          pvp_data: freshDefaultState.pvp,
          pve_data: freshDefaultState.pve,
          // Ensure we don't lose the ID
        });
      }

      // Clear localStorage and reset entire store
      console.log("[TarkovStore] Clearing localStorage and resetting store");
      localStorage.clear();
      this.$patch(freshDefaultState);

      // Small delay to ensure all operations complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Resume sync
      if (controller) {
        controller.resume();
      }

      console.log("[TarkovStore] All data reset complete");
    } catch (error) {
      console.error("[TarkovStore] Error resetting all data:", error);
      // Resume sync even on error
      const controller = getSyncController();
      if (controller) {
        controller.resume();
      }
      throw error;
    }
  },
} satisfies UserActions & {
  switchGameMode(mode: GameMode): Promise<void>;
  migrateDataIfNeeded(): void;
  resetOnlineProfile(): Promise<void>;
  resetCurrentGameModeData(): Promise<void>;
  resetPvPData(): Promise<void>;
  resetPvEData(): Promise<void>;
  resetAllData(): Promise<void>;
};

export const useTarkovStore = defineStore("swapTarkov", {
  state: () => {
    return JSON.parse(JSON.stringify(defaultState)) as UserState;
  },
  getters: tarkovGetters,
  actions: tarkovActions,
  // Enable automatic localStorage persistence with user scoping
  persist: {
    key: "progress", // LocalStorage key for user progress data
    storage: typeof window !== "undefined" ? localStorage : undefined,
    // Add userId to serialized data to prevent cross-user contamination
    serializer: {
      serialize: (state: StateTree) => {
        // Get current user ID (may be null if not logged in)
        let currentUserId: string | null = null;
        try {
          const nuxtApp = useNuxtApp();
          currentUserId = nuxtApp.$supabase?.user?.id || null;
        } catch {
          // console.warn("[TarkovStore] Nuxt app not available during serialize");
        }

        // const userState = state as UserState;
        // console.log("[TarkovStore] Serializing state", {
        //   userId: currentUserId,
        //   level: userState.pvp?.level,
        //   tasksCompleted: Object.keys(userState.pvp?.taskCompletions || {})
        //     .length,
        // });

        // Wrap state with userId for validation on restore
        const wrappedState = {
          _userId: currentUserId,
          _timestamp: Date.now(),
          data: state,
        };
        return JSON.stringify(wrappedState);
      },
      deserialize: (value: string) => {
        // console.log("[TarkovStore] Deserializing from localStorage");
        try {
          const parsed = JSON.parse(value);

          // Old format without wrapper (migrate)
          if (!parsed._userId && !parsed.data) {
            console.log("[TarkovStore] Migrating old localStorage format");
            return parsed as UserState;
          }

          // New format with wrapper - validate userId
          const storedUserId = parsed._userId;
          let currentUserId: string | null = null;

          try {
            const nuxtApp = useNuxtApp();
            currentUserId = nuxtApp.$supabase?.user?.id || null;
          } catch {
            // Nuxt app not available, allow restore for unauthenticated users
            if (!storedUserId) {
              return parsed.data as UserState;
            }
          }

          // If user is logged in and stored userId doesn't match, return default state
          if (currentUserId && storedUserId && storedUserId !== currentUserId) {
            console.warn(
              `[TarkovStore] localStorage userId mismatch! ` +
                `Stored: ${storedUserId}, Current: ${currentUserId}. ` +
                `Backing up and clearing localStorage to prevent data corruption.`
            );

            // Backup the corrupted/mismatching localStorage
            if (typeof window !== "undefined") {
              try {
                const backupKey = `progress_backup_${storedUserId}_${Date.now()}`;
                localStorage.setItem(backupKey, value);
                console.log(`[TarkovStore] Data backed up to ${backupKey}`);
                localStorage.removeItem("progress");
              } catch (e) {
                console.error("[TarkovStore] Error backing up/clearing localStorage:", e);
              }
            }
            return JSON.parse(JSON.stringify(defaultState)) as UserState;
          }

          // UserId matches or user not logged in - safe to restore
          return parsed.data as UserState;
        } catch (e) {
          console.error("[TarkovStore] Error deserializing localStorage:", e);
          return JSON.parse(JSON.stringify(defaultState)) as UserState;
        }
      },
    },
  },
});

// console.log("[TarkovStore] Store defined with persist config:", {
//   storeId: "swapTarkov",
//   persistKey: "progress",
//   hasCustomSerializer: true,
// });

// Export type for future typing
export type TarkovStore = ReturnType<typeof useTarkovStore>;

// Store reference to sync controller for pause/resume during resets
let syncController: ReturnType<typeof useSupabaseSync> | null = null;

export function getSyncController() {
  return syncController;
}

export async function initializeTarkovSync() {
  const tarkovStore = useTarkovStore();
  const { $supabase } = useNuxtApp();
  if (import.meta.client && $supabase.user.loggedIn) {
    console.log("[TarkovStore] Setting up Supabase sync and listener");

    // Helper to check if data has meaningful progress
    const hasProgress = (data: unknown) => {
      const state = data as UserState;
      if (!state) return false;
      const pvpHasData =
        state.pvp &&
        (state.pvp.level > 1 ||
          Object.keys(state.pvp.taskCompletions || {}).length > 0 ||
          Object.keys(state.pvp.hideoutModules || {}).length > 0);
      const pveHasData =
        state.pve &&
        (state.pve.level > 1 ||
          Object.keys(state.pve.taskCompletions || {}).length > 0 ||
          Object.keys(state.pve.hideoutModules || {}).length > 0);
      return pvpHasData || pveHasData;
    };

    const loadData = async () => {
      // Get current localStorage state (loaded by persist plugin)
      const localState = tarkovStore.$state;
      const hasLocalProgress = hasProgress(localState);

      console.log("[TarkovStore] Initial load starting...", {
        userId: $supabase.user.id,
        hasLocalProgress,
      });

      // Try to load from Supabase
      const { data, error } = await $supabase.client
        .from("user_progress")
        .select("*")
        .eq("user_id", $supabase.user.id)
        .single();

      console.log("[TarkovStore] Supabase query result:", {
        hasData: !!data,
        error: error?.code,
        errorMessage: error?.message,
      });

      // Handle query errors (but not "no rows" which is expected for new users)
      if (error && error.code !== "PGRST116") {
        console.error("[TarkovStore] Error loading data from Supabase:", error);
        return;
      }

      // If Supabase has ANY data (even if "empty"), use it as source of truth
      // This prevents overwriting existing Supabase data
      if (data) {
        console.log("[TarkovStore] Loading data from Supabase (user exists in DB)");
        tarkovStore.$patch({
          currentGameMode: data.current_game_mode || GAME_MODES.PVP,
          gameEdition: data.game_edition || 1,
          pvp: data.pvp_data || {},
          pve: data.pve_data || {},
        });
      } else if (hasLocalProgress) {
        // No Supabase record at all, but localStorage has progress - migrate it
        console.log("[TarkovStore] Migrating localStorage data to Supabase");
        const migrateData = {
          user_id: $supabase.user.id,
          current_game_mode: localState.currentGameMode || GAME_MODES.PVP,
          game_edition: localState.gameEdition || 1,
          pvp_data: localState.pvp || {},
          pve_data: localState.pve || {},
        };
        await $supabase.client.from("user_progress").upsert(migrateData);
        console.log("[TarkovStore] Migration complete");
      } else {
        // Truly new user - no data anywhere
        console.log("[TarkovStore] New user - no existing progress found");
      }

      console.log("[TarkovStore] Initial load complete, sync enabled");
    };

    // Wait for data load to complete BEFORE enabling sync
    // This prevents race conditions and overwriting server data with empty local state
    await loadData();

    syncController = useSupabaseSync({
      store: tarkovStore,
      table: "user_progress",
      debounceMs: 250,
      transform: (state: unknown) => {
        const userState = state as UserState;
        // console.log("[TarkovStore] Transform called - preparing data for sync");

        return {
          user_id: $supabase.user.id,
          current_game_mode: userState.currentGameMode || GAME_MODES.PVP,
          game_edition:
            typeof userState.gameEdition === "string"
              ? parseInt(userState.gameEdition)
              : userState.gameEdition,
          pvp_data: userState.pvp || {},
          pve_data: userState.pve || {},
        };
      },
    });
  }
}
