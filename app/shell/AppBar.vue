<template>
  <header
    class="from-surface-800/95 to-surface-950/95 border-primary-800/60 fixed top-0 right-0 z-40 h-16 border-b bg-linear-to-tr shadow-[0_1px_0_rgba(0,0,0,0.4)] backdrop-blur-sm"
  >
    <div class="flex h-full items-center gap-1 px-2 sm:gap-3 sm:px-3">
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
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <span v-if="dataError" title="Error Loading Tarkov Data">
          <UIcon name="i-mdi-database-alert" class="text-error-500 h-6 w-6" />
        </span>
        <span v-if="dataLoading || hideoutLoading" title="Loading Tarkov Data">
          <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-6 w-6 animate-spin" />
        </span>
        <!-- Game mode quick toggle -->
        <div
          class="bg-surface-900/90 flex items-center overflow-hidden rounded-md border border-white/15 ring-1 ring-white/10"
          role="group"
          aria-label="Toggle game mode"
        >
          <button
            type="button"
            class="focus:ring-pvp-400 inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors focus:z-10 focus:ring-2 focus:outline-none sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:text-sm lg:px-4 lg:text-[15px]"
            :class="pvpClasses"
            :disabled="dataLoading"
            @click="switchMode(GAME_MODES.PVP)"
          >
            <UIcon name="i-mdi-sword-cross" class="hidden h-4 w-4 sm:block md:h-5 md:w-5" />
            PvP
          </button>
          <div class="h-6 w-px bg-white/15 sm:h-8" aria-hidden="true" />
          <button
            type="button"
            class="focus:ring-pve-400 inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors focus:z-10 focus:ring-2 focus:outline-none sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:text-sm lg:px-4 lg:text-[15px]"
            :class="pveClasses"
            :disabled="dataLoading"
            @click="switchMode(GAME_MODES.PVE)"
          >
            <UIcon name="i-mdi-account-group" class="hidden h-4 w-4 sm:block md:h-5 md:w-5" />
            PvE
          </button>
        </div>
        <!-- Language selector -->
        <USelectMenu
          v-model="selectedLocale"
          :items="localeItems"
          value-key="value"
          :popper="{ placement: 'bottom-end', strategy: 'fixed' }"
          :ui="{
            base: 'bg-surface-900/90 border border-white/15 ring-1 ring-white/10 rounded-md px-2 py-1.5',
          }"
          :ui-menu="{
            container: 'z-[9999]',
            width: 'w-auto min-w-32',
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
          }"
          class="h-auto min-w-0"
        >
          <template #leading>
            <UIcon name="i-mdi-translate" class="text-surface-300 h-4 w-4" />
          </template>
          <template #default>
            <span class="text-xs font-medium text-white/80 uppercase">{{ locale }}</span>
          </template>
          <template #trailing>
            <UIcon name="i-mdi-chevron-down" class="text-surface-400 h-3 w-3" />
          </template>
        </USelectMenu>
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
  import { logger } from '@/utils/logger';
  const { t } = useI18n({ useScope: 'global' });
  const appStore = useAppStore();
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const route = useRoute();
  const { width } = useWindowSize();
  const mdAndDown = computed(() => width.value < 960); // md breakpoint at 960px
  const navBarIcon = computed(() => {
    if (mdAndDown.value) {
      return appStore.mobileDrawerExpanded ? 'i-mdi-menu-open' : 'i-mdi-menu';
    }
    return appStore.drawerRail ? 'i-mdi-menu' : 'i-mdi-menu-open';
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
    if (mode !== currentGameMode.value && !dataLoading.value) {
      dataLoading.value = true;
      try {
        await tarkovStore.switchGameMode(mode);
        metadataStore.updateLanguageAndGameMode();
        await metadataStore.fetchAllData();
        dataError.value = false;
      } catch (err) {
        logger.error('[AppBar] Error switching mode:', err);
        dataError.value = true;
      } finally {
        dataLoading.value = false;
      }
    }
  }
  const { loading: dataLoading, hideoutLoading } = storeToRefs(metadataStore);
  const dataError = ref(false);
  const pageTitle = computed(() =>
    t(`page.${String(route.name || 'index').replace('-', '_')}.title`)
  );
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && appStore.mobileDrawerExpanded && mdAndDown.value) {
      event.preventDefault();
      appStore.setMobileDrawerExpanded(false);
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
      appStore.toggleMobileDrawerExpanded();
    } else {
      appStore.toggleDrawerRail();
    }
  }
  const { locale, availableLocales } = useI18n({ useScope: 'global' });
  const localeItems = computed(() => {
    const languageNames = new Intl.DisplayNames([locale.value], { type: 'language' });
    return availableLocales.map((localeCode) => ({
      label: languageNames.of(localeCode) || localeCode.toUpperCase(),
      value: localeCode,
    }));
  });
  const selectedLocale = computed({
    get() {
      // Return the current locale string directly
      return locale.value;
    },
    set(newValue: string | { value: string }) {
      if (!newValue) return;
      // Handle both string and object values
      const newLocale = typeof newValue === 'string' ? newValue : newValue.value;
      if (newLocale === locale.value) return;
      // Set the i18n locale (this updates the UI translations)
      locale.value = newLocale;
      // Persist in preferences
      preferencesStore.localeOverride = newLocale;
      logger.debug('[AppBar] Setting locale to:', newLocale);
      // Update metadata store and refetch data with new language
      metadataStore.updateLanguageAndGameMode(newLocale);
      // Use cached data if available (forceRefresh = false)
      metadataStore
        .fetchAllData(false)
        .then(() => {
          dataError.value = false;
        })
        .catch((err) => {
          logger.error('[AppBar] Error fetching data:', err);
          dataError.value = true;
        });
    },
  });
</script>
