<template>
  <icon-card icon="mdi-account-group" icon-background="secondary" icon-color="white">
    <template #stat>
      {{ $t("page.team.card.manageteam.title") }}
    </template>
    <template #content>
      <template v-if="teamMembers.length > 0">
        <div class="p-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div v-for="teammate in teamMembers" :key="teammate">
              <teammember-card
                :teammember="teammate"
                :is-team-owner-view="isCurrentUserTeamOwner"
              ></teammember-card>
            </div>
          </div>
        </div>
      </template>
      <template v-else-if="teamMembers.length === 0">
        <div class="p-4 text-center">
          {{ $t("page.team.card.manageteam.no_members") }}
        </div>
      </template>
      <template v-else></template>
    </template>
  </icon-card>
</template>
<script setup>
  import {
    computed,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defineProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    watch,
    ref,
  } from "vue";
  import { useTeamStoreWithSupabase } from "@/stores/useTeamStore";
  import IconCard from "@/components/ui/IconCard.vue";
  import TeammemberCard from "@/features/team/TeammemberCard.vue";
  const { $supabase } = useNuxtApp();
  const { teamStore } = useTeamStoreWithSupabase();
  const teamMembers = ref([]);
  teamStore.$subscribe((mutation, state) => {
    if (state.members) {
      teamMembers.value = state.members;
    } else {
      teamMembers.value = [];
    }
  });
  const isCurrentUserTeamOwner = computed(() => {
    const currentTeamOwner = teamStore.owner;
    const currentSupabaseUID = $supabase.user.id;
    return currentTeamOwner === currentSupabaseUID;
  });
</script>
