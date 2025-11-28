<template>
  <GenericCard icon="mdi-account-supervisor" icon-color="white" highlight-color="secondary">
    <template #title>
      {{ $t("page.team.card.myteam.title") }}
    </template>
    <template #content>
      <div v-if="!localUserTeam" class="py-4 text-center">
        {{ $t("page.team.card.myteam.no_team") }}
      </div>
      <div v-else class="p-4">
        <team-input-row
          v-model="visibleUrl"
          :label="$t('page.team.card.myteam.team_invite_url_label')"
          icon="mdi-content-copy"
          readonly
          @action="copyUrl"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex items-end justify-start p-4">
        <UButton
          v-if="!localUserTeam"
          :disabled="loading.createTeam || !isLoggedIn"
          :loading="loading.createTeam"
          variant="outline"
          class="mx-1"
          icon="i-mdi-account-group"
          @click="handleCreateTeam"
        >
          {{ $t("page.team.card.myteam.create_new_team") }}
        </UButton>
        <UButton
          v-else
          :disabled="loading.leaveTeam || !isLoggedIn"
          :loading="loading.leaveTeam"
          variant="outline"
          class="mx-1"
          icon="i-mdi-account-off"
          @click="handleLeaveTeam"
        >
          {{
            isTeamOwner
              ? $t("page.team.card.myteam.disband_team")
              : $t("page.team.card.myteam.leave_team")
          }}
        </UButton>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { ref, computed, watch, nextTick, type WatchStopHandle } from "vue";
  import { useI18n } from "vue-i18n";
  import type { CreateTeamResponse, LeaveTeamResponse } from "@/types/team";
  // Team functions moved to Cloudflare Workers - TODO: Implement replacement
  import { useTeamStoreWithSupabase } from "@/stores/useTeamStore";
  import { useSystemStoreWithSupabase } from "@/stores/useSystemStore";
  import { usePreferencesStore } from "@/stores/preferences";
  import { useTarkovStore } from "@/stores/tarkov";
  import GenericCard from "@/components/ui/GenericCard.vue";
  import TeamInputRow from "./TeamInputRow.vue";
  import { useEdgeFunctions } from "@/composables/api/useEdgeFunctions";
  const { t } = useI18n({ useScope: "global" });
  const { teamStore } = useTeamStoreWithSupabase();
  const { systemStore } = useSystemStoreWithSupabase();
  const preferencesStore = usePreferencesStore();
  const tarkovStore = useTarkovStore();
  const { $supabase } = useNuxtApp();
  const toast = useToast();
  const { createTeam, leaveTeam } = useEdgeFunctions();
  const isLoggedIn = computed(() => $supabase.user.loggedIn);
  const generateRandomName = (length = 6) =>
    Array.from({ length }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
        Math.floor(Math.random() * 62)
      )
    ).join("");
  const localUserTeam = computed(() => systemStore.$state?.team || null);
  const isTeamOwner = computed(() => {
    const owner = (teamStore.$state as any).owner_id ?? (teamStore.$state as any).owner;
    return owner === $supabase.user.id && systemStore.$state?.team != null;
  });
  const loading = ref({ createTeam: false, leaveTeam: false });
  const validateAuth = () => {
    if (!$supabase.user.loggedIn || !$supabase.user.id) {
      throw new Error(t("page.team.card.myteam.user_not_authenticated"));
    }
  };
  const buildTeamName = () => {
    const displayName = tarkovStore.getDisplayName();
    const fallbackName =
      $supabase.user.displayName ||
      $supabase.user.username ||
      $supabase.user.email?.split("@")[0] ||
      "Team";
    return `${displayName || fallbackName}-${generateRandomName(4)}`;
  };

  const buildTeamPassword = () => generateRandomName(12);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callTeamFunction = async (
    functionName: string,
    payload: Record<string, any> = {}
  ): Promise<CreateTeamResponse | LeaveTeamResponse> => {
    validateAuth();
    switch (functionName) {
      case "createTeam": {
        const teamName = payload.name || buildTeamName();
        const password = payload.password || buildTeamPassword();
        const maxMembers = payload.maxMembers || 5;
        return await createTeam(teamName, password, maxMembers);
      }
      case "leaveTeam": {
        const teamId = payload.teamId || systemStore.$state.team;
        if (!teamId) {
          throw new Error(t("page.team.card.myteam.no_team"));
        }
        return await leaveTeam(teamId);
      }
      default:
        throw new Error(`Unsupported team function: ${functionName}`);
    }
  };
  const waitForStoreUpdate = (
    storeFn: () => unknown,
    condition: (value: unknown) => boolean,
    timeout = 15000
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      let unwatch: WatchStopHandle | null = null;
      const timeoutId = setTimeout(() => {
        if (unwatch) {
          unwatch();
        }
        clearTimeout(timeoutId);
        reject(new Error("Store update timeout"));
      }, timeout);
      unwatch = watch(
        storeFn,
        (newValue) => {
          if (condition(newValue)) {
            clearTimeout(timeoutId);
            unwatch?.();
            resolve(newValue);
          }
        },
        { immediate: true, deep: true }
      );
    });
  };
  const showNotification = (message: string, color: "primary" | "error" = "primary") => {
    toast.add({ title: message, color: color === "error" ? "error" : "primary" });
  };
  const handleCreateTeam = async () => {
    loading.value.createTeam = true;
    try {
      validateAuth();
      // If backend thinks we're already in a team, sync local state and abort
      if (!systemStore.$state.team) {
        const { data: membership } = await $supabase.client
          .from("team_memberships")
          .select("team_id")
          .eq("user_id", $supabase.user.id)
          .maybeSingle();
        if (membership?.team_id) {
          systemStore.$patch({ team: membership.team_id });
          showNotification(t("page.team.card.myteam.create_team_error_ui_update"), "error");
          loading.value.createTeam = false;
          return;
        }
      }
      const result = (await callTeamFunction("createTeam")) as CreateTeamResponse;
      if (!result?.team) {
        throw new Error(t("page.team.card.myteam.create_team_error_ui_update"));
      }
      await waitForStoreUpdate(
        () => systemStore.$state.team,
        (teamId) => teamId != null
      );
      await waitForStoreUpdate(
        () => teamStore.$state,
        (state) =>
          Boolean(
            state &&
              typeof state === "object" &&
              ((("owner" in state) && (state as any).owner === $supabase.user.id) ||
                (("owner_id" in state) && (state as any).owner_id === $supabase.user.id)) &&
              (("password" in state && (state as any).password) ||
                ("join_code" in state && (state as any).join_code))
          )
      );
      await nextTick();
      if (localUserTeam.value) {
        if (isTeamOwner.value) {
          tarkovStore.setDisplayName(generateRandomName());
        }
        showNotification(t("page.team.card.myteam.create_team_success"));
      } else {
        throw new Error(t("page.team.card.myteam.create_team_error_ui_update"));
      }
    } catch (error: unknown) {
      console.error("[MyTeam] Error creating team:", error);
      const message =
        error &&
        typeof error === "object" &&
        "details" in error &&
        error.details &&
        typeof error.details === "object" &&
        "error" in error.details
          ? String(error.details.error)
          : error instanceof Error
            ? error.message
            : t("page.team.card.myteam.create_team_error");
      showNotification(message, "error");
    }
    loading.value.createTeam = false;
  };
  const handleLeaveTeam = async () => {
    loading.value.leaveTeam = true;
    try {
      validateAuth();
      const result = (await callTeamFunction("leaveTeam")) as LeaveTeamResponse;
      // Wait for store to update before checking team state
      await waitForStoreUpdate(
        () => systemStore.$state.team,
        (teamId) => teamId == null
      );
      await nextTick();
      // If the function succeeded, check that the store actually updated
      if (!result.success && systemStore.$state.team) {
        throw new Error(t("page.team.card.myteam.leave_team_error"));
      }
      const displayName = tarkovStore.getDisplayName();
      if (displayName && displayName.startsWith("User ")) {
        // Reset to a generic display name when leaving team
        tarkovStore.setDisplayName("User");
      }
      showNotification(t("page.team.card.myteam.leave_team_success"));
    } catch (error: unknown) {
      console.error("[MyTeam] Error leaving team:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("page.team.card.myteam.leave_team_error_unexpected");
      showNotification(message, "error");
    }
    loading.value.leaveTeam = false;
  };
  const copyUrl = async () => {
    // Guard against SSR - clipboard API is only available on client
    if (typeof window === "undefined" || !navigator || !navigator.clipboard) {
      console.warn("[MyTeam] Clipboard API is not available");
      return;
    }

    if (teamUrl.value) {
      try {
        await navigator.clipboard.writeText(teamUrl.value);
        showNotification("URL copied to clipboard");
      } catch (error) {
        console.error("[MyTeam] Failed to copy URL to clipboard:", error);
        showNotification("Failed to copy URL to clipboard", "error");
      }
    }
  };
  const teamUrl = computed(() => {
    const { team: teamId } = systemStore.$state;
    // Support legacy password and new join_code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (teamStore.$state as any).password || (teamStore.$state as any).join_code;
    if (!teamId || !code) return "";

    // Use Nuxt-safe route composables instead of window.location
    // This works during SSR and client-side
    if (import.meta.client) {
      const baseUrl = window.location.href.split("?")[0];
      const params = new URLSearchParams({ team: teamId, code });
      return `${baseUrl}?${params}`;
    } else {
      // During SSR, construct URL from route path
      const route = useRoute();
      const config = useRuntimeConfig();
      const baseUrl = config.public.siteUrl || "";
      const currentPath = route.path;
      const params = new URLSearchParams({ team: teamId, code });
      return `${baseUrl}${currentPath}?${params}`;
    }
  });
  const visibleUrl = computed(() =>
    preferencesStore.getStreamerMode ? t("page.team.card.myteam.url_hidden") : teamUrl.value
  );
  watch(
    () => tarkovStore.getDisplayName,
    (newDisplayName) => {
      if (isTeamOwner.value && newDisplayName !== teamStore.getOwnerDisplayName) {
        teamStore.setOwnerDisplayName(newDisplayName);
      }
    }
  );
</script>
