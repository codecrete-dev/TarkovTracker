<template>
  <GenericCard highlight-color="secondary" class="h-full">
    <template #header>
      <button
        v-tooltip="t('page.dashboard.traders.viewTasks', { name: trader.name })"
        type="button"
        class="focus-visible:ring-brand-500 flex w-full cursor-pointer items-center gap-3 pb-2 text-xl transition-opacity hover:opacity-80 focus:opacity-80 focus:outline-none focus-visible:ring-2"
        @click="navigateToTraderTasks"
      >
        <span class="badge-premium-secondary group-hover:scale-105">
          <img
            :src="trader.imageLink"
            :alt="trader.name"
            class="block h-14 w-auto object-contain drop-shadow-md"
          />
        </span>
        <span class="inline-block px-2 text-left leading-6">
          {{ trader.name }}
        </span>
      </button>
    </template>
    <template #content>
      <div class="space-y-6 p-4">
        <!-- Loyalty Level Selector -->
        <div class="space-y-2">
          <div class="text-surface-300 text-sm font-medium">Loyalty Level</div>
          <div class="flex justify-between gap-1">
            <UButton
              v-for="lvl in 4"
              :key="lvl"
              :color="level === lvl ? 'primary' : 'neutral'"
              :variant="level === lvl ? 'solid' : 'soft'"
              class="flex-1 justify-center"
              size="sm"
              @click="$emit('update:level', lvl)"
            >
              {{ lvl }}
            </UButton>
          </div>
        </div>
        <!-- Reputation Input -->
        <div class="space-y-2">
          <div class="text-surface-300 text-sm font-medium">Reputation</div>
          <UInput
            type="number"
            :model-value="reputation"
            step="0.01"
            placeholder="0.00"
            @update:model-value="(val) => $emit('update:reputation', Number(val))"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">REP</span>
            </template>
          </UInput>
        </div>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import type { Trader } from '@/types/tarkov';
  const props = defineProps<{
    trader: Trader;
    level: number;
    reputation: number;
  }>();
  defineEmits<{
    (e: 'update:level' | 'update:reputation', value: number): void;
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const router = useRouter();
  const preferencesStore = usePreferencesStore();
  const navigateToTraderTasks = () => {
    preferencesStore.setTaskPrimaryView('traders');
    preferencesStore.setTaskTraderView(props.trader.id);
    router.push('/tasks');
  };
</script>
