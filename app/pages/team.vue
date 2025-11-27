<template>
  <div class="container mx-auto space-y-4 px-4 py-6">
    <div v-if="route?.query?.team && route?.query?.code" class="mx-auto max-w-5xl">
      <TeamInvite />
    </div>
    <div class="relative mx-auto max-w-6xl">
      <div class="grid gap-4">
        <TeamMembers v-if="systemStore.$state.team" class="col-span-full" />
        <div class="grid gap-4 md:grid-cols-2">
          <MyTeam />
          <TeamOptions />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
  import { defineAsyncComponent } from "vue";
  import { useSystemStoreWithSupabase } from "@/stores/useSystemStore";
  import { useRoute } from "vue-router";
  const TeamMembers = defineAsyncComponent(() => import("@/features/team/TeamMembers"));
  const TeamOptions = defineAsyncComponent(() => import("@/features/team/TeamOptions"));
  const MyTeam = defineAsyncComponent(() => import("@/features/team/MyTeam"));
  const TeamInvite = defineAsyncComponent(() => import("@/features/team/TeamInvite"));
  const { systemStore } = useSystemStoreWithSupabase();
  const route = useRoute();
</script>
