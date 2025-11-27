<template>
  <router-link to="/" class="text-blue-400 no-underline hover:text-blue-300">
    <div class="flex items-center">
      <img :src="stationIcon" class="max-h-8 max-w-8 align-middle" />
      <span class="ml-2 text-sm font-bold">
        {{ props.station?.name }}
      </span>
    </div>
  </router-link>
</template>
<script setup>
  import { computed } from "vue";
  const props = defineProps({
    station: {
      type: Object,
      required: true,
    },
  });
  const stationIcon = computed(() => {
    return `/img/hideout/${props.station.id}.avif`;
  });
</script>
<style scoped>
  /* Scoped styles removed - using Tailwind classes */
</style>
