<template>
  <GenericCard
    :title="trader.name"
    :avatar="trader.imageLink"
    :avatar-height="64"
    highlight-color="secondary"
    class="h-full"
  >
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
  import type { Trader } from "@/types/tarkov";
  import GenericCard from "@/components/ui/GenericCard.vue";

  defineProps<{
    trader: Trader;
    level: number;
    reputation: number;
  }>();

  defineEmits<{
    (e: "update:level" | "update:reputation", value: number): void;
  }>();
</script>
