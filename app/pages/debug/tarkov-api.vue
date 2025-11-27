<template>
  <div class="container mx-auto max-w-5xl px-4 py-6">
    <UCard class="bg-surface-900 border border-white/10" :ui="{ body: 'space-y-4' }">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-surface-50 text-xl font-semibold">Tarkov API Debug Page</h1>
          <p class="text-surface-300 text-sm">Testing Tarkov API Data Fetching</p>
        </div>
      </template>

      <UAlert
        v-if="loading"
        icon="i-heroicons-arrow-path"
        color="primary"
        variant="subtle"
        :title="
          $t ? $t('debug.apollo.loading', 'Loading data from API...') : 'Loading data from API...'
        "
      />
      <UAlert
        v-if="error"
        icon="i-mdi-alert"
        color="error"
        variant="subtle"
        class="mb-2"
        :title="`Error: ${error.message}`"
      />

      <div v-if="result" class="space-y-4">
        <h3 class="text-surface-100 text-sm font-semibold">Query Results</h3>

        <UAccordion multiple variant="ghost" color="neutral" :items="accordionItems">
          <template #traders>
            <ul class="text-surface-200 space-y-1 text-sm">
              <li v-for="trader in result.traders" :key="trader.id">
                {{ trader.name }}
              </li>
            </ul>
          </template>

          <template #tasks>
            <ul class="text-surface-200 space-y-1 text-sm">
              <li v-for="task in result.tasks?.slice(0, 10)" :key="task.id">
                {{ task.name }} - {{ task.trader?.name }}
              </li>
              <li v-if="result.tasks?.length > 10" class="text-surface-400">
                ... and {{ result.tasks.length - 10 }} more
              </li>
            </ul>
          </template>

          <template #maps>
            <ul class="text-surface-200 space-y-1 text-sm">
              <li v-for="map in result.maps" :key="map.id">
                {{ map.name }}
              </li>
            </ul>
          </template>

          <template #player-levels>
            <div class="text-surface-200 text-sm">
              First 5:
              {{
                result.playerLevels
                  ?.slice(0, 5)
                  .map((l: any) => l.level)
                  .join(", ")
              }}
            </div>
          </template>
        </UAccordion>

        <div class="h-px bg-white/10"></div>

        <div class="text-surface-200 space-y-1 text-sm">
          <div>
            <span class="font-semibold">Language:</span>
            {{ languageCode }}
          </div>
          <div>
            <span class="font-semibold">Game Mode:</span>
            {{ gameMode }}
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <UButton
          color="primary"
          :loading="loading"
          icon="i-heroicons-arrow-path"
          @click="refetch()"
        >
          Refetch Data
        </UButton>
      </div>
    </UCard>
  </div>
</template>
<script setup lang="ts">
  import { computed } from "vue";
  import { useSharedTarkovDataQuery } from "@/composables/api/useSharedTarkovQuery";
  import { useTarkovStore } from "@/stores/tarkov";
  import { API_GAME_MODES, GAME_MODES } from "@/utils/constants";

  const tarkovStore = useTarkovStore();
  const gameMode = computed(
    () => tarkovStore.getCurrentGameMode() || API_GAME_MODES[GAME_MODES.PVP]
  );
  const {
    result,
    error,
    loading,
    refetch,
    languageCode: apiLanguageCode,
  } = useSharedTarkovDataQuery();

  // Alias for template consistency
  const languageCode = computed(() => apiLanguageCode.value);

  const accordionItems = computed(() => {
    if (!result.value) return [];
    return [
      {
        label: `Traders (${result.value.traders?.length || 0})`,
        slot: "traders",
      },
      {
        label: `Tasks (${result.value.tasks?.length || 0})`,
        slot: "tasks",
      },
      {
        label: `Maps (${result.value.maps?.length || 0})`,
        slot: "maps",
      },
      {
        label: `Player Levels (${result.value.playerLevels?.length || 0})`,
        slot: "player-levels",
      },
    ];
  });
</script>
