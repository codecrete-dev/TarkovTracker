<template>
  <GenericCard icon="mdi-account-supervisor" icon-color="white" highlight-color="secondary">
    <template #title>
      {{ $t('page.team.card.myteam.title') }}
    </template>
    <template #content>
      <!-- Loading state while initial data is being fetched -->
      <div v-if="isLoadingTeamState" class="flex items-center justify-center py-8">
        <UIcon name="i-mdi-loading" class="h-6 w-6 animate-spin text-gray-400" />
      </div>
      <div v-else-if="!localUserTeam" class="py-4 text-center">
        {{ $t('page.team.card.myteam.no_team') }}
      </div>
      <div v-else class="space-y-4 p-4">
        <!-- Display Name Input -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            {{ $t('page.team.card.myteam.display_name_label') }}
          </label>
          <div class="flex items-center gap-2">
            <UInput
              v-model="displayName"
              :maxlength="displayNameMaxLength"
              :placeholder="$t('page.team.card.myteam.display_name_placeholder')"
              class="flex-1"
              @blur="saveDisplayName"
              @keyup.enter="saveDisplayName"
            />
            <UButton
              icon="i-mdi-check"
              color="primary"
              variant="ghost"
              size="xs"
              :disabled="!displayNameChanged"
              @click="saveDisplayName"
            >
              {{ $t('page.team.card.myteam.save') }}
            </UButton>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ $t('page.team.card.myteam.display_name_hint') }}
          </p>
        </div>
        <!-- Team Invite URL -->
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">
            {{ $t('page.team.card.myteam.team_invite_url_label') }}
          </label>
          <div class="flex items-center gap-2">
            <UButton
              :icon="linkVisible ? 'i-mdi-eye-off' : 'i-mdi-eye'"
              variant="ghost"
              size="xs"
              @click="linkVisible = !linkVisible"
            >
              {{
                linkVisible
                  ? $t('page.team.card.myteam.hide_link')
                  : $t('page.team.card.myteam.show_link')
              }}
            </UButton>
            <UButton
              v-if="linkVisible"
              icon="i-mdi-content-copy"
              variant="ghost"
              size="xs"
              @click="copyUrl"
            >
              {{ $t('page.team.card.myteam.copy_link') }}
            </UButton>
          </div>
        </div>
        <div v-if="linkVisible" class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
          <div class="font-mono text-sm break-all">
            {{ teamUrl }}
          </div>
        </div>
        <div v-else class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
          <div class="text-sm text-gray-500 italic dark:text-gray-400">
            {{ $t('page.team.card.myteam.link_hidden_message') }}
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div
        class="flex items-center justify-start gap-2 border-t border-gray-200 p-4 dark:border-gray-700"
      >
        <!-- Show nothing while loading initial state -->
        <template v-if="isLoadingTeamState" />
        <UButton
          v-else-if="!localUserTeam"
          :disabled="loading.createTeam || !isLoggedIn"
          :loading="loading.createTeam"
          color="primary"
          icon="i-mdi-account-group"
          @click="handleCreateTeam"
        >
          {{ $t('page.team.card.myteam.create_new_team') }}
        </UButton>
        <UButton
          v-else
          :disabled="loading.leaveTeam || !isLoggedIn"
          :loading="loading.leaveTeam"
          color="error"
          variant="outline"
          icon="i-mdi-account-off"
          @click="handleLeaveTeam"
        >
          {{
            isTeamOwner
              ? $t('page.team.card.myteam.disband_team')
              : $t('page.team.card.myteam.leave_team')
          }}
        </UButton>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { computed, nextTick, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { useEdgeFunctions } from '@/composables/api/useEdgeFunctions';
  import { getTeamIdFromState, useSystemStoreWithSupabase } from '@/stores/useSystemStore';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useTeamStoreWithSupabase } from '@/stores/useTeamStore';
  import type { SystemState, TeamState } from '@/types/tarkov';
  import type { CreateTeamResponse, LeaveTeamResponse } from '@/types/team';
  import { GAME_MODES, LIMITS } from '@/utils/constants';
  import { delay } from '@/utils/helpers';
  import { logger } from '@/utils/logger';
  const { t } = useI18n({ useScope: 'global' });
  const { teamStore } = useTeamStoreWithSupabase();
  const { systemStore, hasInitiallyLoaded } = useSystemStoreWithSupabase();
  /**
   * Get current game mode from tarkov store
   */
  function getCurrentGameMode(): 'pvp' | 'pve' {
    return (tarkovStore.getCurrentGameMode?.() as 'pvp' | 'pve') || GAME_MODES.PVP;
  }
  /**
   * Helper to extract team ID from system store state for the current game mode
   * Reads directly from state to avoid getter reactivity issues
   */
  function getTeamId(): string | null {
    return getTeamIdFromState(systemStore.$state, getCurrentGameMode());
  }
  const tarkovStore = useTarkovStore();
  const { $supabase } = useNuxtApp();
  const toast = useToast();
  const { createTeam, leaveTeam } = useEdgeFunctions();
  const isLoggedIn = computed(() => $supabase.user.loggedIn);
  const linkVisible = ref(false);
  const displayNameMaxLength = LIMITS.DISPLAY_NAME_MAX_LENGTH;
  // Display name management
  const displayName = ref(tarkovStore.getDisplayName() || '');
  const initialDisplayName = ref(tarkovStore.getDisplayName() || '');
  const displayNameChanged = computed(() => {
    return displayName.value !== initialDisplayName.value && displayName.value.trim() !== '';
  });
  const saveDisplayName = () => {
    if (displayName.value.trim() === '') return;
    const trimmedName = displayName.value.trim().substring(0, LIMITS.DISPLAY_NAME_MAX_LENGTH);
    tarkovStore.setDisplayName(trimmedName);
    initialDisplayName.value = trimmedName;
    displayName.value = trimmedName;
    showNotification(t('page.team.card.myteam.display_name_saved'));
  };
  // Watch for changes to the store's display name (e.g., from sync)
  watch(
    () => tarkovStore.getDisplayName(),
    (newName) => {
      if (newName && newName !== displayName.value) {
        displayName.value = newName;
        initialDisplayName.value = newName;
      }
    }
  );
  const generateRandomName = (length: number = LIMITS.RANDOM_NAME_LENGTH) =>
    Array.from({ length }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
        Math.floor(Math.random() * 62)
      )
    ).join('');
  // Access team ID directly from store state for the current game mode
  const localUserTeam = computed(() => {
    return getTeamIdFromState(systemStore.$state, getCurrentGameMode());
  });
  // Track if initial data is still loading (prevents showing "Create team" before we know)
  // This returns true when we're waiting for the initial fetch to complete.
  // An empty store object (length 0) indicates "no data loaded yet" (still loading),
  // while hasInitiallyLoaded being true means the fetch completed (even if no data was found).
  const isLoadingTeamState = computed(() => {
    const storeHasData = Object.keys(systemStore.$state).length > 0;
    return !(hasInitiallyLoaded.value || storeHasData);
  });
  const isTeamOwner = computed(() => {
    const teamState = teamStore.$state as { owner_id?: string; owner?: string };
    const owner = teamState.owner_id ?? teamState.owner;
    const hasTeam = !!getTeamId();
    return owner === $supabase.user.id && hasTeam;
  });
  const loading = ref({ createTeam: false, leaveTeam: false });
  const validateAuth = () => {
    if (!$supabase.user.loggedIn || !$supabase.user.id) {
      throw new Error(t('page.team.card.myteam.user_not_authenticated'));
    }
  };
  const buildTeamName = () => {
    const displayName = tarkovStore.getDisplayName();
    const fallbackName =
      $supabase.user.displayName ||
      $supabase.user.username ||
      $supabase.user.email?.split('@')[0] ||
      'Team';
    return `${displayName || fallbackName}-${generateRandomName(4)}`;
  };
  const buildJoinCode = () => generateRandomName(12);
  interface TeamFunctionPayload {
    name?: string;
    joinCode?: string;
    maxMembers?: number;
    teamId?: string;
    gameMode?: 'pvp' | 'pve';
  }
  // Response shape from team creation API
  // Note: Backend may return either joinCode or join_code - normalize to joinCode
  // TODO: Standardize backend to return only 'joinCode' and remove fallback
  interface TeamCreationTeam {
    id: string;
    ownerId: string;
    joinCode?: string;
    join_code?: string;
  }
  const callTeamFunction = async (
    functionName: string,
    payload: TeamFunctionPayload = {}
  ): Promise<CreateTeamResponse | LeaveTeamResponse> => {
    validateAuth();
    switch (functionName) {
      case 'createTeam': {
        const teamName = payload.name || buildTeamName();
        const joinCode = payload.joinCode || buildJoinCode();
        const maxMembers = payload.maxMembers || 5;
        const gameMode = payload.gameMode || getCurrentGameMode();
        return await createTeam(teamName, joinCode, maxMembers, gameMode);
      }
      case 'leaveTeam': {
        const teamId = payload.teamId || getTeamId();
        if (!teamId) {
          throw new Error(t('page.team.card.myteam.no_team'));
        }
        return await leaveTeam(teamId);
      }
      default:
        throw new Error(`Unsupported team function: ${functionName}`);
    }
  };
  const showNotification = (message: string, color: 'primary' | 'error' = 'primary') => {
    toast.add({ title: message, color: color === 'error' ? 'error' : 'primary' });
  };
  const handleCreateTeam = async () => {
    loading.value.createTeam = true;
    // Generate the join code upfront so we can use it even if the response doesn't include it
    const generatedJoinCode = buildJoinCode();
    const generatedTeamName = buildTeamName();
    const currentGameMode = getCurrentGameMode();
    try {
      validateAuth();
      // Check database for existing team membership for this game mode before creating
      const { data: membership, error: membershipError } = await $supabase.client
        .from('team_memberships')
        .select('team_id, game_mode')
        .eq('user_id', $supabase.user.id)
        .eq('game_mode', currentGameMode)
        .maybeSingle();
      if (membershipError) {
        logger.error('[MyTeam] Error checking membership:', membershipError);
        throw membershipError;
      }
      if (membership?.team_id) {
        // Sync local state with database truth for the correct game mode
        const teamIdColumn = currentGameMode === 'pve' ? 'pve_team_id' : 'pvp_team_id';
        systemStore.$patch({
          [teamIdColumn]: membership.team_id,
        } as Partial<SystemState>);
        showNotification(`You are already in a ${currentGameMode.toUpperCase()} team. Leave your current team first.`, 'error');
        loading.value.createTeam = false;
        return;
      }
      const result = (await callTeamFunction('createTeam', {
        name: generatedTeamName,
        joinCode: generatedJoinCode,
        gameMode: currentGameMode,
      })) as CreateTeamResponse;
      if (!result?.team) {
        logger.error('[MyTeam] Invalid response structure - missing team object');
        throw new Error(t('page.team.card.myteam.create_team_error_ui_update'));
      }
      // Update systemStore with the new team ID for the correct game mode
      const teamIdColumn = currentGameMode === 'pve' ? 'pve_team_id' : 'pvp_team_id';
      systemStore.$patch({ [teamIdColumn]: result.team.id } as Partial<SystemState>);
      // Update teamStore with team data (fall back to generated join code if response doesn't include it)
      // Cast to typed interface for safer access (see TeamCreationTeam interface)
      const teamResponse = result.team as unknown as TeamCreationTeam;
      const joinCode = teamResponse.joinCode ?? teamResponse.join_code ?? generatedJoinCode;
      teamStore.$patch({
        joinCode: joinCode,
        join_code: joinCode,
        owner: result.team.ownerId,
        owner_id: result.team.ownerId,
        members: [result.team.ownerId],
      } as Partial<TeamState>);
      // Wait for database to settle, then verify
      await delay(500);
      const { data: verification, error: verificationError } = await $supabase.client
        .from('team_memberships')
        .select('team_id, game_mode')
        .eq('user_id', $supabase.user.id)
        .eq('team_id', result.team.id)
        .eq('game_mode', currentGameMode)
        .maybeSingle();
      if (verificationError) {
        logger.error('[MyTeam] Verification query error:', verificationError);
      }
      if (!verification) {
        logger.error('[MyTeam] Team membership not found in database after creation');
        throw new Error(t('page.team.card.myteam.create_team_error_ui_update'));
      }
      await nextTick();
      // Generate random display name for team owner
      if (result.team.ownerId === $supabase.user.id) {
        tarkovStore.setDisplayName(generateRandomName());
      }
      showNotification(t('page.team.card.myteam.create_team_success'));
    } catch (error: unknown) {
      logger.error('[MyTeam] Error creating team:', error);
      const message =
        error &&
        typeof error === 'object' &&
        'details' in error &&
        error.details &&
        typeof error.details === 'object' &&
        'error' in error.details
          ? String(error.details.error)
          : error instanceof Error
            ? error.message
            : t('page.team.card.myteam.create_team_error');
      showNotification(message, 'error');
    }
    loading.value.createTeam = false;
  };
  const handleLeaveTeam = async () => {
    loading.value.leaveTeam = true;
    const currentGameMode = getCurrentGameMode();
    const teamIdColumn = currentGameMode === 'pve' ? 'pve_team_id' : 'pvp_team_id';
    try {
      validateAuth();
      const currentTeamId = getTeamId();
      const { data: membershipData, error: membershipError } = await $supabase.client
        .from('team_memberships')
        .select('*')
        .eq('user_id', $supabase.user.id)
        .eq('team_id', currentTeamId)
        .eq('game_mode', currentGameMode)
        .maybeSingle();
      // Handle broken state: user has team_id but no membership record
      if (!membershipData && !membershipError) {
        systemStore.$patch({ [teamIdColumn]: null } as Partial<SystemState>);
        // Delete the team if it has no members
        const { data: allMembers } = await $supabase.client
          .from('team_memberships')
          .select('user_id')
          .eq('team_id', currentTeamId);
        if (!allMembers || allMembers.length === 0) {
          const { error: deleteTeamError } = await $supabase.client
            .from('teams')
            .delete()
            .eq('id', currentTeamId);
          if (deleteTeamError) {
            logger.error('[MyTeam] Failed to delete empty team:', deleteTeamError);
          }
        }
        showNotification(
          'Your team data was in a broken state and has been cleaned up. Please create a new team.'
        );
        loading.value.leaveTeam = false;
        return;
      }
      // Check if there are other members (ghost members that shouldn't exist)
      const { data: otherMembers } = await $supabase.client
        .from('team_memberships')
        .select('*')
        .eq('team_id', currentTeamId)
        .neq('user_id', $supabase.user.id);
      // If there are ghost members, try to clean them up
      if (otherMembers && otherMembers.length > 0) {
        for (const ghostMember of otherMembers) {
          const { error: deleteError } = await $supabase.client
            .from('team_memberships')
            .delete()
            .eq('team_id', currentTeamId)
            .eq('user_id', ghostMember.user_id);
          if (deleteError) {
            logger.error('[MyTeam] Failed to delete ghost member:', deleteError);
          }
        }
        await delay(500);
      }
      const result = (await callTeamFunction('leaveTeam')) as LeaveTeamResponse;
      if (!result.success) {
        throw new Error(t('page.team.card.myteam.leave_team_error'));
      }
      // Manually update systemStore to clear team ID for the current game mode
      systemStore.$patch({ [teamIdColumn]: null } as Partial<SystemState>);
      // Also reset team store
      teamStore.$reset();
      // Wait a brief moment for database to settle
      await delay(500);
      await nextTick();
      const displayName = tarkovStore.getDisplayName();
      if (displayName && displayName.startsWith('User ')) {
        // Reset to a generic display name when leaving team
        tarkovStore.setDisplayName('User');
      }
      showNotification(t('page.team.card.myteam.leave_team_success'));
    } catch (error: unknown) {
      logger.error('[MyTeam] Error leaving team:', error);
      const message =
        error instanceof Error
          ? error.message
          : t('page.team.card.myteam.leave_team_error_unexpected');
      showNotification(message, 'error');
    }
    loading.value.leaveTeam = false;
  };
  const copyUrl = async () => {
    // Guard against SSR - clipboard API is only available on client
    if (typeof window === 'undefined' || !navigator || !navigator.clipboard) {
      logger.warn('[MyTeam] Clipboard API is not available');
      return;
    }
    if (teamUrl.value) {
      try {
        await navigator.clipboard.writeText(teamUrl.value);
        showNotification('URL copied to clipboard');
      } catch (error) {
        logger.error('[MyTeam] Failed to copy URL to clipboard:', error);
        showNotification('Failed to copy URL to clipboard', 'error');
      }
    }
  };
  const teamUrl = computed(() => {
    const teamId = getTeamId();
    // Use getter to get invite code (supports both join_code from DB and joinCode from client)
    const code = teamStore.inviteCode;
    // Debug logging
    logger.debug('[MyTeam] teamUrl computed:', {
      teamId,
      code,
      teamStoreState: teamStore.$state,
      inviteCode: teamStore.inviteCode,
    });
    if (!teamId || !code) return '';
    // Use Nuxt-safe route composables instead of window.location
    // This works during SSR and client-side
    if (import.meta.client) {
      const baseUrl = window.location.href.split('?')[0];
      const params = new URLSearchParams({ team: teamId, code });
      return `${baseUrl}?${params}`;
    } else {
      // During SSR, construct URL from route path
      const route = useRoute();
      const config = useRuntimeConfig();
      const baseUrl = config.public.siteUrl || '';
      const currentPath = route.path;
      const params = new URLSearchParams({ team: teamId, code });
      return `${baseUrl}${currentPath}?${params}`;
    }
  });
</script>
