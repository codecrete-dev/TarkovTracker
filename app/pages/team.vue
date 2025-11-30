<template>
  <div class="container mx-auto space-y-6 px-4 py-6">
    <div v-if="route?.query?.team && route?.query?.code" class="mx-auto max-w-6xl">
      <TeamInvite />
    </div>
    <div class="relative mx-auto max-w-6xl">
      <div class="space-y-6">
        <!-- Team Management Section -->
        <div class="grid gap-4 lg:grid-cols-2">
          <MyTeam />
          <TeamOptions />
        </div>
        <!-- Team Members Section -->
        <TeamMembers v-if="systemStore.$state.team" />
      </div>
    </div>
  </div>
</template>
<script setup>
  import { defineAsyncComponent } from 'vue';
  import { useRoute } from 'vue-router';
  import { useSystemStoreWithSupabase } from '@/stores/useSystemStore';
  const TeamMembers = defineAsyncComponent(() => import('@/features/team/TeamMembers'));
  const TeamOptions = defineAsyncComponent(() => import('@/features/team/TeamOptions'));
  const MyTeam = defineAsyncComponent(() => import('@/features/team/MyTeam'));
  const TeamInvite = defineAsyncComponent(() => import('@/features/team/TeamInvite'));
  const { systemStore } = useSystemStoreWithSupabase();
  const route = useRoute();
</script>
