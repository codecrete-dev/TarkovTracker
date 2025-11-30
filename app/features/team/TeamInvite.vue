<template>
  <UAlert
    v-if="hasInviteInUrl && !inInviteTeam && !declined"
    color="success"
    variant="solid"
    icon="i-mdi-handshake"
    class="mb-4"
  >
    <template #title>
      <div class="flex w-full flex-row items-center justify-between">
        <div>
          {{ $t('page.team.card.teaminvite.description') }}
        </div>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="accepting"
            :loading="accepting"
            @click="acceptInvite"
          >
            {{ $t('page.team.card.teaminvite.accept') }}
          </UButton>
          <UButton color="neutral" variant="outline" :disabled="accepting" @click="declined = true">
            {{ $t('page.team.card.teaminvite.decline') }}
          </UButton>
        </div>
      </div>
    </template>
  </UAlert>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useRoute } from 'vue-router';
  import { useSystemStore } from '@/stores/useSystemStore';
  import { useToast } from '#imports';
  const systemStore = useSystemStore();
  const route = useRoute();
  const toast = useToast();
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
    console.warn('Team joining not yet implemented for Supabase');
    toast.add({
      title: 'Team joining is currently disabled during migration.',
      color: 'warning',
    });
  };
</script>
