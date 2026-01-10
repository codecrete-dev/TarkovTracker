<template>
  <header
    class="from-surface-800/95 to-surface-950/95 border-primary-800/60 fixed top-0 right-0 z-40 h-16 border-b bg-linear-to-tr shadow-[0_1px_0_rgba(0,0,0,0.4)] backdrop-blur-sm"
  >
    <div class="flex h-full items-center gap-1 px-2 sm:gap-3 sm:px-3">
      <!-- Left: Toggle Button -->
      <AppTooltip text="Toggle Menu Drawer">
        <UButton
          :icon="navBarIcon"
          variant="ghost"
          color="neutral"
          size="xl"
          aria-label="Toggle Menu Drawer"
          @click.stop="changeNavigationDrawer"
        />
      </AppTooltip>
      <!-- Center: Page Title -->
      <span class="min-w-0 flex-1 truncate text-xl font-bold text-white">
        {{ pageTitle }}
      </span>
      <!-- Right: Status Icons & Settings -->
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <AppTooltip v-if="dataError" text="Error Loading Tarkov Data">
          <span class="inline-flex rounded">
            <UIcon name="i-mdi-database-alert" class="text-error-500 h-6 w-6" />
          </span>
        </AppTooltip>
        <AppTooltip v-if="dataLoading || hideoutLoading" text="Loading Tarkov Data">
          <span class="inline-flex rounded">
            <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-6 w-6 animate-spin" />
          </span>
        </AppTooltip>

        <!-- Language selector -->
        <USelectMenu
          v-model="selectedLocale"
          :items="localeItems"
          value-key="value"
          :popper="{ placement: 'bottom-end', strategy: 'fixed' }"
          :ui="{
            base: 'bg-surface-900/90 border border-white/15 ring-1 ring-white/10 rounded-md px-2 py-1.5 cursor-pointer',
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
        <!-- User/Login control -->
        <template v-if="isLoggedIn">
          <UDropdownMenu
            :items="accountItems"
            :content="{ side: 'bottom', align: 'end' }"
            :ui="{
              content:
                'z-[9999] min-w-32 p-1 bg-surface-900 ring-1 ring-white/10 rounded-lg shadow-xl',
              item: {
                base: 'px-2.5 py-1.5 text-sm rounded transition-colors text-surface-200 hover:bg-surface-800 hover:text-white cursor-pointer',
              },
            }"
          >
            <button
              type="button"
              class="bg-surface-900/90 flex items-center justify-center rounded-md border border-white/15 p-1 transition-colors"
            >
              <UAvatar :src="avatarSrc" size="xs" alt="User avatar" />
            </button>
          </UDropdownMenu>
        </template>
        <template v-else>
          <NuxtLink
            to="/login"
            class="bg-surface-900/90 flex items-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 transition-colors"
          >
            <UIcon name="i-mdi-fingerprint" class="text-surface-300 h-4 w-4" />
            <span class="text-sm font-medium text-white/80">
              {{ t('navigation_drawer.login') }}
            </span>
          </NuxtLink>
        </template>
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
  import { logger } from '@/utils/logger';
  const { t } = useI18n({ useScope: 'global' });
  const appStore = useAppStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const { $supabase } = useNuxtApp();
  const route = useRoute();
  const { width } = useWindowSize();
  const mdAndDown = computed(() => width.value < 960); // md breakpoint at 960px
  const navBarIcon = computed(() => {
    if (mdAndDown.value) {
      return appStore.mobileDrawerExpanded ? 'i-mdi-menu-open' : 'i-mdi-menu';
    }
    return appStore.drawerRail ? 'i-mdi-menu' : 'i-mdi-menu-open';
  });
  // User/Login state
  const isLoggedIn = computed(() => $supabase.user?.loggedIn ?? false);
  const avatarSrc = computed(() => {
    return preferencesStore.getStreamerMode || !$supabase.user?.photoURL
      ? '/img/default-avatar.svg'
      : $supabase.user.photoURL;
  });
  async function logout() {
    try {
      await $supabase.signOut();
    } catch (err) {
      logger.error('Error signing out:', err);
    }
  }
  const accountItems = computed(() => [
    {
      label: t('navigation_drawer.logout'),
      icon: 'i-mdi-lock',
      onSelect: logout,
    },
  ]);
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
