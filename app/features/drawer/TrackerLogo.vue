<template>
  <NuxtLink
    to="/"
    class="group mt-2 flex flex-col items-center px-3 py-2 transition-opacity hover:opacity-90"
  >
    <div :class="isCollapsed ? 'w-8' : 'w-[130px]'" class="mx-auto transition-all duration-200">
      <NuxtImg :src="logo" class="h-auto w-full" preload />
    </div>
    <div v-if="!isCollapsed" class="mt-2 text-center">
      <div class="text-base leading-tight font-medium text-white">TarkovTracker.org</div>
    </div>
  </NuxtLink>
</template>
<script setup>
  import { computed } from 'vue';
  const props = defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
  const logo = computed(() => {
    return props.isCollapsed
      ? '/img/logos/tarkovtrackerlogo-mini.webp'
      : '/img/logos/tarkovtrackerlogo-light.webp';
  });
</script>
