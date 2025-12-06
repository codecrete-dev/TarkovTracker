<template>
  <router-link
    :to="stationHref"
    class="text-blue-400 no-underline hover:text-blue-300"
    :aria-label="`Go to ${props.station.name} card`"
  >
    <div class="flex items-center">
      <img
        :src="stationIcon"
        :alt="`${props.station.name} icon`"
        class="max-h-8 max-w-8 align-middle"
        loading="lazy"
      />
      <span class="ml-2 text-sm font-bold">
        {{ props.station.name }}
      </span>
    </div>
  </router-link>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import type { HideoutStation } from '@/types/tarkov';
  const props = defineProps<{
    station: Pick<HideoutStation, 'id' | 'name'>;
  }>();
  const stationIcon = computed(() => `/img/hideout/${props.station.id}.avif`);
  const stationHref = computed(() => `/hideout?station=${props.station.id}`);
</script>
