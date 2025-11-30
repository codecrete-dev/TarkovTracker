<template>
  <div v-if="show" class="my-1 w-full">
    <UAccordion :items="[{ label: 'Objective Locations', slot: 'content' }]" class="w-full">
      <template #default="{ item, open }">
        <UButton
          color="neutral"
          variant="ghost"
          class="flex w-full items-center justify-between rounded-none py-2 sm:p-3"
        >
          <span class="text-base font-medium text-gray-200">
            {{ item.label }}
            <span
              v-show="activeMapView !== '55f2d3fd4bdc2d5f408b4567'"
              class="font-normal text-gray-400"
            >
              &nbsp;-&nbsp;{{ tarkovTime }}
            </span>
          </span>
          <UIcon
            name="i-mdi-chevron-down"
            class="h-5 w-5 transition-transform duration-200"
            :class="[open && 'rotate-180 transform']"
          />
        </UButton>
      </template>
      <template #content>
        <div class="bg-gray-900/50 p-4">
          <tarkov-map v-if="selectedMap" :map="selectedMap" :marks="visibleMarks" />
          <UAlert
            v-else
            icon="i-mdi-alert-circle"
            color="error"
            variant="soft"
            title="No map data available for this selection."
          />
        </div>
      </template>
    </UAccordion>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue';
  import type { TarkovMap } from '~/types/tarkov';
  import { useTarkovTime } from '~/composables/useTarkovTime';
  const TarkovMap = defineAsyncComponent(() => import('~/features/maps/TarkovMap.vue'));
  // Use structural types compatible with TarkovMap's expectations
  interface Props {
    show: boolean;
    selectedMap?: TarkovMap;
    visibleMarkers: Array<{
      zones: Array<{ map: { id: string }; outline: { x: number; z: number }[] }>;
      possibleLocations?: Array<{ map: { id: string }; [key: string]: unknown }>;
    }>;
    activeMapView: string;
  }
  const props = defineProps<Props>();
  const { tarkovTime } = useTarkovTime();
  // Alias for better readability in template
  const visibleMarks = computed(() => props.visibleMarkers);
</script>
