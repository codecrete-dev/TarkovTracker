<template>
  <div class="bg-background text-surface-200 flex min-h-screen flex-col">
    <!-- Navigation Drawer (fixed) -->
    <NavDrawer />
    <!-- Application Bar (fixed header) -->
    <AppBar
      class="bg-background/75 fixed top-0 right-0 z-20 border-b border-white/10 backdrop-blur-md transition-all duration-300 ease-in-out"
      :style="{
        left: mainMarginLeft,
        width: 'auto',
      }"
    />
    <!-- Main content area -->
    <main
      class="flex flex-1 flex-col pt-16 transition-all duration-300 ease-in-out"
      :style="{
        marginLeft: mainMarginLeft,
      }"
    >
      <div class="min-h-0 flex-1 overflow-y-auto p-2 pt-0">
        <slot />
      </div>
    </main>
    <!-- Footer pinned to bottom when content is short -->
    <AppFooter
      class="shrink-0"
      :style="{
        marginLeft: mainMarginLeft,
        width: `calc(100% - ${mainMarginLeft})`,
      }"
    />
  </div>
</template>
<script setup lang="ts">
  import { useBreakpoints } from '@vueuse/core';
  import { computed, defineAsyncComponent } from 'vue';
  import { useAppStore } from '@/stores/useApp';
  const appStore = useAppStore();
  // Define breakpoints (matching Vuetify's md breakpoint at 960px)
  const breakpoints = useBreakpoints({
    mobile: 0,
    md: 960,
  });
  const mdAndDown = breakpoints.smaller('md');
  // Calculate margin-left based on sidebar state
  const mainMarginLeft = computed(() => {
    if (mdAndDown.value) return '0px';
    return appStore.drawerRail ? '56px' : '224px';
  });
  // Lazy-load shell components
  const NavDrawer = defineAsyncComponent(() => import('@/shell/NavDrawer.vue'));
  const AppFooter = defineAsyncComponent(() => import('@/shell/AppFooter.vue'));
  const AppBar = defineAsyncComponent(() => import('@/shell/AppBar.vue'));
</script>
