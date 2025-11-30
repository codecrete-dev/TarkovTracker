import { defineStore } from 'pinia';
import { computed, nextTick, ref, watch } from 'vue';
import { useSupabaseListener } from '@/composables/supabase/useSupabaseListener';
import type { UserState } from '@/stores/progressState';
import { useSystemStoreWithSupabase } from '@/stores/useSystemStore';
import type { TeamGetters, TeamState } from '@/types/tarkov';
import { logger } from '@/utils/logger';
import type { Store } from 'pinia';
import { useToast } from '#imports';
/**
 * Team store definition with getters for team info and members
 */
export const useTeamStore = defineStore<string, TeamState, TeamGetters>('team', {
  state: (): TeamState => ({}),
  getters: {
    teamOwner(state) {
      return state?.owner || null;
    },
    isOwner(state) {
      const { $supabase } = useNuxtApp();
      const owner = state.owner;
      return owner === $supabase.user?.id;
    },
    teamPassword(state) {
      return state?.password || null;
    },
    teamMembers(state) {
      return state?.members || [];
    },
    teammates(state) {
      const currentMembers = state?.members;
      const { $supabase } = useNuxtApp();
      const currentUID = $supabase.user?.id;
      if (currentMembers && currentUID) {
        return currentMembers.filter((member) => member !== currentUID);
      }
      return [];
    },
  },
});
export function useTeamStoreWithSupabase() {
  const { systemStore } = useSystemStoreWithSupabase();
  const teamStore = useTeamStore();
  const { $supabase } = useNuxtApp();
  // Computed reference to the team document based on system store
  const teamFilter = computed(() => {
    const currentSystemStateTeam = systemStore.$state.team;
    if (
      $supabase.user.loggedIn &&
      currentSystemStateTeam &&
      typeof currentSystemStateTeam === 'string'
    ) {
      return `id=eq.${currentSystemStateTeam}`;
    }
    return undefined;
  });
  const handleTeamSnapshot = (data: Record<string, unknown> | null) => {
    if (data) {
      const patch: Record<string, unknown> = { ...data };
      if ('owner_id' in data) {
        patch.owner = (data as { owner_id: string }).owner_id;
      }
      if ('join_code' in data) {
        patch.password = (data as { join_code: string }).join_code;
      }
      teamStore.$patch(patch as Partial<TeamState>);
    } else {
      teamStore.$reset();
    }
  };
  // Setup Supabase listener
  const { cleanup, isSubscribed } = useSupabaseListener({
    store: teamStore,
    table: 'teams',
    filter: teamFilter.value,
    storeId: 'team',
    onData: handleTeamSnapshot,
  });
  // Watch for filter changes handled by useSupabaseListener
  return {
    teamStore,
    isSubscribed,
    cleanup,
  };
}
/**
 * Composable for managing teammate stores dynamically
 */
export function useTeammateStores() {
  const { teamStore } = useTeamStoreWithSupabase();
  const teammateStores = ref<Record<string, Store<string, UserState>>>({});
  const teammateUnsubscribes = ref<Record<string, () => void>>({});
  // Watch team state changes to manage teammate stores
  watch(
    () => teamStore.$state,
    async (newState, _oldState) => {
      await nextTick();
      const { $supabase } = useNuxtApp();
      const currentUID = $supabase.user?.id;
      const newTeammatesArray =
        newState.members?.filter((member: string) => member !== currentUID) || [];
      // Remove stores for teammates no longer in the team
      for (const teammate of Object.keys(teammateStores.value)) {
        if (!newTeammatesArray.includes(teammate)) {
          if (teammateUnsubscribes.value[teammate]) {
            teammateUnsubscribes.value[teammate]();
            const { [teammate]: _removed, ...rest } = teammateUnsubscribes.value;
            teammateUnsubscribes.value = rest;
          }
          const { [teammate]: _storeRemoved, ...restStores } = teammateStores.value;
          teammateStores.value = restStores as typeof teammateStores.value;
        }
      }
      // Add stores for new teammates
      try {
        for (const teammate of newTeammatesArray) {
          if (!teammateStores.value[teammate]) {
            await createTeammateStore(teammate);
          }
        }
      } catch (error) {
        logger.error('Error managing teammate stores:', error);
        const toast = useToast();
        toast.add({ title: 'Failed to load teammate data. Retrying…', color: 'warning' });
        // Basic retry once after a short delay for transient issues
        setTimeout(async () => {
          try {
            for (const teammate of newTeammatesArray) {
              if (!teammateStores.value[teammate]) {
                await createTeammateStore(teammate);
              }
            }
            toast.add({ title: 'Teammate data loaded on retry', color: 'primary' });
          } catch (e) {
            logger.error('Retry failed for teammate stores:', e);
            toast.add({ title: 'Could not load teammate data', color: 'error' });
          }
        }, 1500);
      }
    },
    {
      immediate: true,
      deep: true,
    }
  );
  // Create a store for a specific teammate
  const createTeammateStore = async (teammateId: string) => {
    try {
      // Import required dependencies
      const { defineStore } = await import('pinia');
      const { getters, actions, defaultState } = await import('@/stores/progressState');
      // Define the teammate store
      const storeDefinition = defineStore(`teammate-${teammateId}`, {
        state: () => JSON.parse(JSON.stringify(defaultState)),
        getters: getters,
        actions: actions,
      });
      const storeInstance = storeDefinition();
      teammateStores.value[teammateId] = storeInstance;
      // Setup Supabase listener for this teammate
      // Note: We need to store the cleanup function, not the unsubscribe function directly
      const { cleanup } = useSupabaseListener({
        store: storeInstance,
        table: 'user_progress',
        filter: `user_id=eq.${teammateId}`,
        storeId: `teammate-${teammateId}`,
      });
      teammateUnsubscribes.value[teammateId] = cleanup;
    } catch (error) {
      logger.error(`Error creating store for teammate ${teammateId}:`, error);
    }
  };
  // Cleanup all teammate stores
  const cleanup = () => {
    Object.values(teammateUnsubscribes.value).forEach((unsubscribe) => {
      if (unsubscribe) unsubscribe();
    });
    teammateUnsubscribes.value = {};
    teammateStores.value = {};
  };
  return {
    teammateStores,
    teammateUnsubscribes,
    cleanup,
  };
}
