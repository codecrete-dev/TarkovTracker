import { computed } from "vue";
import { defineStore } from "pinia";
import { useSupabaseListener } from "@/composables/supabase/useSupabaseListener";
import type { SystemState, SystemGetters } from "@/types/tarkov";
/**
 * System store definition with getters for user tokens and team info
 */
export const useSystemStore = defineStore<string, SystemState, SystemGetters>("system", {
  state: (): SystemState => ({}),
  getters: {
    userTokens(state) {
      return state?.tokens || [];
    },
    userTokenCount(state) {
      return state?.tokens?.length || 0;
    },
    userTeam(state) {
      return state.team || null;
    },
    userTeamIsOwn(state) {
      const { $supabase } = useNuxtApp();
      return state?.team === $supabase.user?.id || false;
    },
  },
});
export function useSystemStoreWithSupabase() {
  const systemStore = useSystemStore();
  const { $supabase } = useNuxtApp();
  // Computed reference to the system document
  const systemFilter = computed(() => {
    if ($supabase.user.loggedIn && $supabase.user.id) {
      return `user_id=eq.${$supabase.user.id}`;
    }
    return undefined;
  });
  // Setup Supabase listener
  const { cleanup, isSubscribed } = useSupabaseListener({
    store: systemStore,
    table: "user_system",
    filter: systemFilter.value,
    storeId: "system",
  });
  // Watch for filter changes to update listener
  watch(systemFilter, (newFilter) => {
    if (newFilter) {
      // Re-initialize listener if needed, handled by useSupabaseListener internal watch
    }
  });
  return {
    systemStore,
    isSubscribed,
    cleanup,
  };
}
