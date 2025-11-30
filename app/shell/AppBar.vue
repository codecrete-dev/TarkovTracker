<template>
  <header
    class="from-surface-800/95 to-surface-950/95 border-primary-800/60 fixed inset-x-0 top-0 z-50 h-16 border-b bg-linear-to-tr shadow-[0_1px_0_rgba(0,0,0,0.4)] backdrop-blur-sm"
  >
    <div class="flex h-full items-center gap-3 px-3">
      <!-- Left: Toggle Button -->
      <UButton
        :icon="navBarIcon"
        variant="ghost"
        color="neutral"
        size="xl"
        aria-label="Toggle Menu Drawer"
        title="Toggle Menu Drawer"
        @click.stop="changeNavigationDrawer"
      />
      <!-- Center: Page Title -->
      <span class="min-w-0 flex-1 truncate text-xl font-bold text-white">
        {{ pageTitle }}
      </span>
      <!-- Right: Status Icons & Settings -->
      <div class="ml-auto flex items-center gap-2">
        <span v-if="dataError" title="Error Loading Tarkov Data">
          <UIcon name="i-mdi-database-alert" class="text-error-500 h-6 w-6" />
        </span>
        <span v-if="dataLoading || hideoutLoading" title="Loading Tarkov Data">
          <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-6 w-6 animate-spin" />
        </span>
        <!-- Game mode quick toggle -->
        <div
          class="bg-surface-900/90 hidden items-center overflow-hidden rounded-md border border-white/15 ring-1 ring-white/10 sm:flex"
          role="group"
          aria-label="Toggle game mode"
        >
          <button
            type="button"
            class="focus:ring-pvp-400 inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors focus:z-10 focus:ring-2 focus:outline-none sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:py-1.75 md:text-sm lg:px-4 lg:py-2 lg:text-[15px]"
            :class="pvpClasses"
            @click="switchMode(GAME_MODES.PVP)"
          >
            <UIcon name="i-mdi-sword-cross" class="h-4 w-4 md:h-5 md:w-5" />
            PvP
          </button>
          <div class="h-9 w-[1.5px] bg-white/15" aria-hidden="true" />
          <button
            type="button"
            class="focus:ring-pve-400 inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors focus:z-10 focus:ring-2 focus:outline-none sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:py-1.75 md:text-sm lg:px-4 lg:py-2 lg:text-[15px]"
            :class="pveClasses"
            @click="switchMode(GAME_MODES.PVE)"
          >
            <UIcon name="i-mdi-account-group" class="h-4 w-4 md:h-5 md:w-5" />
            PvE
          </button>
        </div>
        <div class="hidden items-center gap-2 sm:flex">
          <USelectMenu
            v-model="selectedLocale"
            :items="localeItems"
            value-key="value"
            :popper="{ placement: 'bottom-end', strategy: 'fixed' }"
            :ui="selectUi"
            :ui-menu="selectMenuUi"
            class="h-10 w-auto min-w-0 px-2 whitespace-nowrap"
          >
            <template #leading>
              <UIcon name="i-mdi-translate" class="text-surface-300 h-4 w-4" />
            </template>
          </USelectMenu>
        </div>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
  import { useWindowSize } from '@vueuse/core';
  import { storeToRefs } from 'pinia';
  import { computed, onMounted, onUnmounted, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute } from 'vue-router';
  import { useAppStore } from '@/stores/useApp';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { GAME_MODES, type GameMode } from '@/utils/constants';
  const { t } = useI18n({ useScope: 'global' });
  const appStore = useAppStore();
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const route = useRoute();
  const { width } = useWindowSize();
  const mdAndDown = computed(() => width.value < 960); // Vuetify md breakpoint is 960px
  const navBarIcon = computed(() => {
    return appStore.drawerShow && appStore.drawerRail ? 'i-mdi-menu-open' : 'i-mdi-menu';
  });
  const currentGameMode = computed(() => {
    return tarkovStore.getCurrentGameMode();
  });
  const pveClasses = computed(() =>
    currentGameMode.value === GAME_MODES.PVE
      ? 'bg-pve-500 hover:bg-pve-600 text-white shadow-[0_0_0_4px_rgba(0,0,0,0.45)] ring-2 ring-white/60 ring-inset outline outline-2 outline-white/40'
      : 'bg-pve-950/80 text-pve-400 hover:bg-pve-900/90'
  );
  const pvpClasses = computed(() =>
    currentGameMode.value === GAME_MODES.PVP
      ? 'bg-pvp-800 hover:bg-pvp-700 text-pvp-100 shadow-[0_0_0_4px_rgba(0,0,0,0.45)] ring-2 ring-white/60 ring-inset outline outline-2 outline-white/40'
      : 'bg-pvp-950/80 text-pvp-400 hover:bg-pvp-900/90'
  );
  async function switchMode(mode: GameMode) {
    if (mode !== currentGameMode.value) {
      await tarkovStore.switchGameMode(mode);
      metadataStore.updateLanguageAndGameMode();
      await metadataStore.fetchAllData();
    }
  }
  const { loading: dataLoading, hideoutLoading } = storeToRefs(metadataStore);
  const dataError = ref(false); // Placeholder - TODO: implement error handling
  const pageTitle = computed(() =>
    t(`page.${String(route.name || 'index').replace('-', '_')}.title`)
  );
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && appStore.drawerShow && mdAndDown.value) {
      event.preventDefault();
      appStore.toggleDrawerShow();
    }
  }
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
  function changeNavigationDrawer() {
    if (mdAndDown.value) {
      appStore.toggleDrawerShow();
    } else {
      appStore.toggleDrawerRail();
    }
  }
  const { locale, availableLocales } = useI18n({ useScope: 'global' });
  const localeItems = computed(() => {
    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return availableLocales.map((localeCode) => ({
      label: languageNames.of(localeCode) || localeCode.toUpperCase(),
      value: localeCode,
    }));
  });
  const selectedLocale = computed({
    get() {
      return locale.value;
    },
    set(newValue) {
      if (!newValue) return;
      locale.value = newValue;
      // persist in preferences
      preferencesStore.localeOverride = newValue;
      console.log('[AppBar] Setting locale to:', newValue);
      metadataStore.updateLanguageAndGameMode(newValue);
      metadataStore.fetchAllData(true).catch(console.error);
    },
  });
  // UI configs (shared look with settings page)
  const selectUi = {};
  const selectMenuUi = {
    container: 'z-[9999]',
    width: 'w-auto min-w-0',
    background: 'bg-surface-900',
    shadow: 'shadow-xl',
    rounded: 'rounded-lg',
    ring: 'ring-1 ring-white/10',
    padding: 'p-1',
    option: {
      base: 'px-3 py-2 text-sm cursor-pointer transition-colors rounded',
      inactive: 'text-surface-200 hover:bg-surface-800 hover:text-white',
      active: 'bg-surface-800 text-white',
      selected: 'bg-primary-500/10 text-primary-100 ring-1 ring-primary-500',
    },
  };
</script>
