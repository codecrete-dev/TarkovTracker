<template>
  <UAlert
    v-if="hasInviteInUrl && !inInviteTeam && !declined"
    color="green"
    variant="solid"
    icon="i-mdi-handshake"
    class="mb-4"
  >
    <template #title>
      <div class="flex w-full flex-row items-center justify-between">
        <div>
          {{ $t("page.team.card.teaminvite.description") }}
        </div>
        <div class="flex gap-2">
          <UButton
            color="white"
            variant="outline"
            :disabled="accepting"
            :loading="accepting"
            @click="acceptInvite"
          >
            {{ $t("page.team.card.teaminvite.accept") }}
          </UButton>
          <UButton color="white" variant="outline" :disabled="accepting" @click="declined = true">
            {{ $t("page.team.card.teaminvite.decline") }}
          </UButton>
        </div>
      </div>
    </template>
  </UAlert>
</template>
<script setup>
  import { computed, ref } from "vue";
  import { useRoute } from "vue-router";
  // import { useLiveData } from '@/composables/livedata';
  // Cloudflare functions - TODO: Implement replacement
  import { useSystemStore } from "@/stores/useSystemStore";
  // const router = useRouter();
  // const { useSystemStore } = useLiveData();
  const systemStore = useSystemStore();
  // const { t } = useI18n({ useScope: "global" });
  const route = useRoute();
  const toast = useToast();
  // const functions = getFunctions();
  // const joinTeamCallable = httpsCallable(functions, 'joinTeam');
  // const leaveTeamCallable = httpsCallable(functions, 'leaveTeam');
  const hasInviteInUrl = computed(() => {
    return !!(route.query.team && route.query.code);
  });
  const inInviteTeam = computed(() => {
    return systemStore?.userTeam != null && systemStore.userTeam == route?.query?.team;
  });
  const declined = ref(false);
  const accepting = ref(false);
  const acceptInvite = async () => {
    // TODO: Implement Supabase team joining logic
    console.warn("Team joining not yet implemented for Supabase");
    toast.add({
      title: "Team joining is currently disabled during migration.",
      color: "orange",
    });
  };
</script>
