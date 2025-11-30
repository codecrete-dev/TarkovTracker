import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useSupabaseListener } from '@/composables/supabase/useSupabaseListener';
import type { SystemGetters, SystemState } from '@/types/tarkov';
/**
 * System store definition with getters for user tokens and team info
 */
export const useSystemStore = defineStore<string, SystemState, SystemGetters>('system', {
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
  const handleSystemSnapshot = (data: Record<string, unknown> | null) => {
    if (data && 'team_id' in data) {
      systemStore.$patch({
        team: (data as { team_id: string | null }).team_id,
      } as Partial<SystemState>);
    } else if (data === null) {
      systemStore.$patch({ team: null } as Partial<SystemState>);
    }
  };
  // Computed reference to the system document - passed as ref for reactivity
  const systemFilter = computed(() => {
    if ($supabase.user.loggedIn && $supabase.user.id) {
      return `user_id=eq.${$supabase.user.id}`;
    }
    return undefined;
  });
  // Setup Supabase listener with reactive filter ref
  const { cleanup, isSubscribed } = useSupabaseListener({
    store: systemStore,
    table: 'user_system',
    filter: systemFilter, // Pass the ref, not the value
    storeId: 'system',
    onData: handleSystemSnapshot,
  });
  return {
    systemStore,
    isSubscribed,
    cleanup,
  };
}
