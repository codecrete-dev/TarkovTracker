<template>
  <!-- Mobile Drawer -->
  <USlideover v-if="mdAndDown" v-model="drawerOpen" side="left" :ui="{ width: 'max-w-xs' }">
    <div
      class="nav-shell border-surface-800/70 relative flex h-full grow flex-col gap-y-5 overflow-y-auto border-r px-6 pb-4 ring-1 ring-white/10 backdrop-blur-sm"
    >
      <div class="relative z-10 flex h-full flex-col">
        <TrackerLogo :is-collapsed="false" />
        <div class="bg-primary-800/40 my-1 h-px" />
        <DrawerAccount :is-collapsed="false" />
        <div class="bg-primary-800/40 my-1 h-px" />
        <DrawerLevel :is-collapsed="false" />
        <DrawerCharacter :is-collapsed="false" />
        <div class="bg-primary-800/40 my-1 h-px" />
        <DrawerLinks :is-collapsed="false" />
        <div class="bg-primary-800/40 my-1 h-px" />
        <DrawerExternalLinks :is-collapsed="false" />
      </div>
    </div>
  </USlideover>
  <!-- Desktop Sidebar -->
  <aside
    v-show="!mdAndDown"
    class="nav-shell border-primary-800/60 fixed inset-y-0 left-0 z-30 flex flex-col border-r backdrop-blur-sm transition-all duration-300"
    :class="[isRailActive ? 'w-14' : 'w-56']"
  >
    <div class="relative z-10 flex h-full flex-col overflow-x-hidden overflow-y-auto">
      <TrackerLogo :is-collapsed="isRailActive" />
      <div class="bg-primary-800/40 mx-3 my-1 h-px" />
      <DrawerAccount :is-collapsed="isRailActive" />
      <div class="bg-primary-800/40 mx-3 my-1 h-px" />
      <DrawerLevel :is-collapsed="isRailActive" />
      <DrawerCharacter :is-collapsed="isRailActive" />
      <div class="bg-primary-800/40 mx-3 my-1 h-px" />
      <DrawerLinks :is-collapsed="isRailActive" />
      <div class="bg-primary-800/40 mx-3 my-1 h-px" />
      <DrawerExternalLinks :is-collapsed="isRailActive" />
    </div>
  </aside>
</template>
<script setup>
  import { useBreakpoints } from '@vueuse/core';
  import { computed, defineAsyncComponent } from 'vue';
  import { useAppStore } from '@/stores/useApp';
  // Define breakpoints (matching Vuetify's md breakpoint at 960px)
  const breakpoints = useBreakpoints({
    mobile: 0,
    md: 960,
  });
  const mdAndDown = breakpoints.smaller('md');
  const appStore = useAppStore();
  const isRailActive = computed(() => !mdAndDown.value && appStore.drawerRail);
  const drawerOpen = computed({
    get: () => mdAndDown.value && appStore.drawerShow,
    set: (val) => {
      appStore.drawerShow = val;
    },
  });
  const TrackerLogo = defineAsyncComponent(() => import('@/features/drawer/TrackerLogo.vue'));
  const DrawerLinks = defineAsyncComponent(() => import('@/features/drawer/DrawerLinks.vue'));
  const DrawerAccount = defineAsyncComponent(() => import('@/features/drawer/DrawerAccount.vue'));
  const DrawerLevel = defineAsyncComponent(() => import('@/features/drawer/DrawerLevel.vue'));
  const DrawerExternalLinks = defineAsyncComponent(
    () => import('@/features/drawer/DrawerExternalLinks.vue')
  );
  const DrawerCharacter = defineAsyncComponent(
    () => import('@/features/drawer/DrawerCharacter.vue')
  );
</script>
<style scoped>
  .nav-shell {
    background: linear-gradient(
      180deg,
      rgba(18, 18, 20, 0.96) 0%,
      rgba(14, 14, 15, 0.96) 45%,
      rgba(12, 12, 13, 0.97) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      inset 0 -1px 0 rgba(0, 0, 0, 0.6),
      1px 0 0 rgba(0, 0, 0, 0.55);
  }
  .border-gradient {
    background: linear-gradient(
      to bottom,
      rgba(82, 82, 91, 0.45) 0%,
      rgba(39, 39, 42, 0.25) 50%,
      transparent 100%
    );
    border-right-width: 1px;
    border-right-style: solid;
    border-image: linear-gradient(
        to bottom,
        rgba(82, 82, 91, 0.55) 0%,
        rgba(39, 39, 42, 0.35) 50%,
        transparent 100%
      )
      1;
  }
</style>
