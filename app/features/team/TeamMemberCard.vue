<template>
  <UCard :ui="{ body: 'p-4 sm:p-6' }">
    <div class="space-y-4">
      <!-- Header with name, badge, and level -->
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="truncate text-xl font-bold sm:text-2xl">
              {{ progressStore.getDisplayName(props.teammember) }}
            </h3>
            <UBadge v-if="isOwner" color="primary" variant="solid" size="sm">
              {{ $t('page.team.card.manageteam.membercard.owner') }}
            </UBadge>
          </div>
          <div v-if="props.teammember == $supabase.user.id" class="mt-1">
            <span class="text-primary text-sm font-medium">
              {{ $t('page.team.card.manageteam.membercard.this_is_you') }}
            </span>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <img
            :src="groupIcon"
            class="h-12 w-12 object-contain sm:h-16 sm:w-16"
            alt="Level badge"
          />
          <div class="text-center">
            <div class="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {{ $t('navigation_drawer.level') }}
            </div>
            <div class="mt-1 text-3xl leading-none font-bold sm:text-4xl">
              {{ progressStore.getLevel(props.teammember) }}
            </div>
          </div>
        </div>
      </div>
      <!-- Task progress and actions -->
      <div
        class="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700"
      >
        <div class="text-sm">
          <i18n-t
            v-if="!preferencesStore.teamIsHidden(props.teammember)"
            keypath="page.team.card.manageteam.membercard.taskscomplete"
            scope="global"
          >
            <template #completed>
              <span class="text-primary font-bold">
                {{ completedTaskCount }}
              </span>
            </template>
            <template #total>
              <span class="font-bold">
                {{ tasks.length }}
              </span>
            </template>
          </i18n-t>
        </div>
        <div class="flex gap-2">
          <UButton
            :disabled="props.teammember == $supabase.user.id || preferencesStore.taskTeamAllHidden"
            variant="outline"
            :icon="
              props.teammember != $supabase.user.id &&
              preferencesStore.teamIsHidden(props.teammember)
                ? 'i-mdi-eye-off'
                : 'i-mdi-eye'
            "
            :color="
              props.teammember != $supabase.user.id &&
              preferencesStore.teamIsHidden(props.teammember)
                ? 'error'
                : 'success'
            "
            size="sm"
            @click="preferencesStore.toggleHidden(props.teammember)"
          />
          <UButton
            v-if="props.teammember != $supabase.user.id && isTeamOwnerView"
            variant="outline"
            icon="i-mdi-account-minus"
            color="error"
            size="sm"
            :loading="kickingTeammate"
            :disabled="kickingTeammate"
            @click="kickTeammate()"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
<script setup lang="ts">
  // Team member management moved to Cloudflare Workers - TODO: Implement replacement
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTeamStoreWithSupabase } from '@/stores/useTeamStore';
  import { useToast } from '#imports';
  const { $supabase } = useNuxtApp();
  const toast = useToast();
  const { teamStore } = useTeamStoreWithSupabase();
  // Define the props for the component
  const props = defineProps<{
    teammember: string;
    isTeamOwnerView: boolean;
  }>();
  // Check if this member is the team owner
  const isOwner = computed(() => {
    const currentTeamOwner = teamStore.owner;
    return currentTeamOwner === props.teammember;
  });
  const teamStoreId = computed(() => {
    if (props.teammember == $supabase.user.id) {
      return 'self';
    } else {
      return props.teammember;
    }
  });
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const tasks = computed(() => metadataStore.tasks);
  const playerLevels = computed(() => metadataStore.playerLevels);
  const { t } = useI18n({ useScope: 'global' });
  const completedTaskCount = computed(() => {
    return tasks.value.filter(
      (task) => progressStore.tasksCompletions?.[task.id]?.[teamStoreId.value] == true
    ).length;
  });
  const groupIcon = computed(() => {
    const level = progressStore.getLevel(props.teammember);
    const entry = playerLevels.value.find((pl) => pl.level === level);
    return entry?.levelBadgeImageLink ?? '';
  });
  const kickingTeammate = ref(false);
  const kickTeammate = async () => {
    if (!props.teammember) return;
    kickingTeammate.value = true;
    try {
      // TODO: Implement Cloudflare Workers integration for kicking team members
      console.log('TODO: Implement Cloudflare Workers for kickTeammate function');
      throw new Error('Team member kicking not yet implemented with Cloudflare Workers');
      // Placeholder for future implementation:
      // const session = await $supabase.client.auth.getSession();
      // if (!session.data.session) {
      //   throw new Error('User not authenticated');
      // }
      // const response = await fetch('/api/team/kick', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${session.data.session.access_token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ kicked: props.teammember }),
      // });
      // const result = await response.json();
      // ... handle response
    } catch (err) {
      const error = err as Error & { data?: { message?: string } };
      const backendMsg = error?.message || error?.data?.message || String(err);
      const message = backendMsg || t('page.team.card.manageteam.membercard.kick_error');
      console.error('[TeamMemberCard.vue] Error kicking teammate:', error);
      toast.add({ title: message, color: 'error' });
    }
    kickingTeammate.value = false;
  };
</script>
