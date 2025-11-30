<template>
  <div v-if="!isCollapsed && !mdAndDown" class="my-4 flex flex-col items-center gap-2 px-4">
    <!-- Edition Button -->
    <button
      class="border-primary-800/50 hover:border-primary-600 w-full rounded border px-2 py-1 text-center text-xs font-medium text-white/80 transition-colors hover:text-white"
      @click="navigateToSettings"
    >
      {{ getEditionName(tarkovStore.gameEdition) }}
    </button>
    <!-- Faction Toggle -->
    <div class="border-primary-800/50 flex w-full overflow-hidden rounded-md border">
      <button
        v-for="faction in factions"
        :key="faction"
        class="flex-1 px-2 py-1 text-xs font-semibold uppercase transition-colors"
        :class="
          faction === currentFaction
            ? 'bg-primary-700 text-white'
            : 'bg-transparent text-white/65 hover:bg-white/5 hover:text-white'
        "
        @click="setFaction(faction)"
      >
        {{ faction }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useBreakpoints } from '@vueuse/core';
  import { computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { getEditionName, PMC_FACTIONS } from '@/utils/constants';
  defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
  const tarkovStore = useTarkovStore();
  const factions = PMC_FACTIONS;
  const router = useRouter();
  const breakpoints = useBreakpoints({
    mobile: 0,
    md: 960,
  });
  const mdAndDown = breakpoints.smaller('md');
  function navigateToSettings() {
    router.push('/settings');
  }
  const currentFaction = computed(() => tarkovStore.getPMCFaction());
  function setFaction(faction: 'USEC' | 'BEAR') {
    if (faction !== currentFaction.value) {
      tarkovStore.setPMCFaction(faction);
    }
  }
</script>
