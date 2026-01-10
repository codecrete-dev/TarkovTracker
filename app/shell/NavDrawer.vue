<template>
  <!-- Backdrop overlay for mobile expanded state -->
  <Transition
    enter-active-class="transition-opacity duration-300 ease-out"
    leave-active-class="transition-opacity duration-300 ease-in"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="belowMd && mobileExpanded"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      @click="closeMobileDrawer"
    />
  </Transition>
  <!-- Unified Sidebar - works as rail on mobile, rail/expanded on desktop -->
  <aside
    class="border-primary-800/60 fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-[linear-gradient(180deg,rgba(18,18,20,0.96)_0%,rgba(14,14,15,0.96)_45%,rgba(12,12,13,0.97)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-1px_0_rgba(0,0,0,0.6),1px_0_0_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all duration-300"
    :class="[sidebarWidth]"
  >
    <div
      class="nav-drawer-scroll relative z-10 flex h-full flex-col overflow-x-hidden overflow-y-auto"
    >
      <NuxtLink
        to="/"
        class="group mt-1 flex flex-col items-center px-3 py-1.5 transition-opacity hover:opacity-90"
      >
        <div
          :class="isCollapsed ? 'w-8' : 'w-32.5'"
          class="relative mx-auto transition-all duration-200"
        >
          <NuxtImg
            :src="
              isCollapsed
                ? '/img/logos/tarkovtrackerlogo-mini.webp'
                : '/img/logos/tarkovtrackerlogo-light.webp'
            "
            class="h-auto w-full"
            preload
          />
        </div>
        <div v-if="!isCollapsed" class="mt-1 text-center">
          <div class="text-base leading-tight font-medium text-white">TarkovTracker.org</div>
        </div>
      </NuxtLink>
      <div class="bg-primary-800/40 mx-3 my-0.5 h-px" />
      <DrawerLevel :is-collapsed="isCollapsed" />
      <div v-if="!isCollapsed" class="my-2 flex flex-col items-center gap-1.5 px-4">
        <!-- Game Mode and Faction Cycling Buttons Row -->
        <div class="flex w-full gap-1.5">
          <!-- Game Mode Cycling Button -->
          <AppTooltip :text="`Switch to ${nextGameModeLabel}`" class="flex-1">
            <button
              class="border-primary-800/50 hover:border-primary-600 flex h-full w-full items-center justify-center rounded border px-2 py-2.5 transition-colors"
              @click="cycleGameMode"
            >
              <div
                class="text-md flex items-center justify-center gap-1.5 font-semibold tracking-wide uppercase"
              >
                <UIcon :name="currentGameModeIcon" class="text-primary-400 h-8 w-8" />
                <span class="text-white/80">{{ currentGameModeLabel }}</span>
              </div>
            </button>
          </AppTooltip>
          <!-- Faction Cycling Button -->
          <AppTooltip :text="`Switch to ${nextFaction}`">
            <button
              class="border-primary-800/50 hover:border-primary-600 flex aspect-square items-center justify-center rounded border p-2 text-center transition-colors"
              @click="cycleFaction"
            >
              <NuxtImg
                :src="`/img/factions/${currentFaction}.webp`"
                :alt="currentFaction"
                class="opacity-60 invert"
                width="33"
                height="40"
              />
            </button>
          </AppTooltip>
        </div>
        <button
          class="border-primary-800/50 hover:border-primary-600 w-full rounded border px-2 py-1 text-center text-xs font-medium text-white/80 transition-colors hover:text-white"
          @click="navigateToSettings"
        >
          {{ currentEditionName }}
        </button>
      </div>
      <div class="bg-primary-800/40 mx-3 my-0.5 h-px" />
      <DrawerLinks :is-collapsed="isCollapsed" />
      <div class="bg-primary-800/40 mx-3 my-0.5 h-px" />
      <div class="flex flex-col gap-1">
        <div v-if="!isCollapsed" class="px-4 py-0.5">
          <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">External</h3>
        </div>
        <ul class="flex flex-col gap-1 px-1">
          <DrawerItem
            avatar="/img/logos/tarkovdevlogo.webp"
            locale-key="tarkovdev"
            href="https://tarkov.dev/"
            ext-link
            :is-collapsed="isCollapsed"
          />
          <DrawerItem
            avatar="/img/logos/tarkovmonitorlogo.avif"
            locale-key="tarkovmonitor"
            href="https://github.com/the-hideout/TarkovMonitor"
            ext-link
            :is-collapsed="isCollapsed"
          />
          <DrawerItem
            avatar="/img/logos/ratscannerlogo.webp"
            locale-key="ratscanner"
            href="https://github.com/RatScanner/RatScanner"
            ext-link
            :is-collapsed="isCollapsed"
          />
          <DrawerItem
            avatar="/img/logos/tarkovchangeslogo.svg"
            locale-key="tarkovchanges"
            href="https://tarkov-changes.com/"
            ext-link
            :is-collapsed="isCollapsed"
          />
        </ul>
      </div>
    </div>
  </aside>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { useSharedBreakpoints } from '@/composables/useSharedBreakpoints';
  import { useAppStore } from '@/stores/useApp';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { PMC_FACTIONS, type PMCFaction, GAME_MODES, type GameMode } from '@/utils/constants';
  // Use shared breakpoints to avoid duplicate listeners
  const { belowMd } = useSharedBreakpoints();
  const appStore = useAppStore();
  const metadataStore = useMetadataStore();
  // Mobile expanded state from store
  const mobileExpanded = computed(() => appStore.mobileDrawerExpanded);
  // Close mobile expanded when switching to desktop
  watch(belowMd, (isMobile) => {
    if (!isMobile) {
      appStore.setMobileDrawerExpanded(false);
    }
  });
  const closeMobileDrawer = () => {
    appStore.setMobileDrawerExpanded(false);
  };
  // Determine if sidebar should be collapsed (rail mode)
  const isCollapsed = computed(() => {
    if (belowMd.value) {
      // On mobile: collapsed unless expanded
      return !mobileExpanded.value;
    }
    // On desktop: based on rail setting
    return appStore.drawerRail;
  });
  // Determine sidebar width class
  const sidebarWidth = computed(() => {
    if (belowMd.value) {
      // Mobile: rail by default, expanded when open
      return mobileExpanded.value ? 'w-56' : 'w-14';
    }
    // Desktop: based on rail setting
    return appStore.drawerRail ? 'w-14' : 'w-56';
  });
  const DrawerLinks = defineAsyncComponent(() => import('@/features/drawer/DrawerLinks.vue'));
  const DrawerLevel = defineAsyncComponent(() => import('@/features/drawer/DrawerLevel.vue'));
  const DrawerItem = defineAsyncComponent(() => import('@/features/drawer/DrawerItem.vue'));
  const preferencesStore = usePreferencesStore();
  const tarkovStore = useTarkovStore();
  const router = useRouter();
  const { t } = useI18n({ useScope: 'global' });

  // Faction cycling logic
  const factionArray = PMC_FACTIONS as unknown as PMCFaction[];
  const currentFaction = computed<PMCFaction>(() => tarkovStore.getPMCFaction() ?? 'USEC');
  const nextFaction = computed<PMCFaction>(() => {
    const currentIndex = factionArray.indexOf(currentFaction.value);
    const nextIndex = (currentIndex + 1) % factionArray.length;
    return factionArray[nextIndex]!;
  });
  function cycleFaction() {
    tarkovStore.setPMCFaction(nextFaction.value);
  }

  // Game mode cycling logic
  const gameModeArray = [GAME_MODES.PVP, GAME_MODES.PVE] as GameMode[];
  const gameModeConfig = {
    [GAME_MODES.PVP]: { label: 'PvP', icon: 'i-mdi-sword-cross' },
    [GAME_MODES.PVE]: { label: 'PvE', icon: 'i-mdi-account-group' },
  };
  const currentGameMode = computed<GameMode>(() => tarkovStore.getCurrentGameMode() ?? 'pvp');
  const currentGameModeLabel = computed(() => gameModeConfig[currentGameMode.value].label);
  const currentGameModeIcon = computed(() => gameModeConfig[currentGameMode.value].icon);
  const nextGameMode = computed<GameMode>(() => {
    const currentIndex = gameModeArray.indexOf(currentGameMode.value);
    const nextIndex = (currentIndex + 1) % gameModeArray.length;
    return gameModeArray[nextIndex]!;
  });
  const nextGameModeLabel = computed(() => gameModeConfig[nextGameMode.value].label);
  function cycleGameMode() {
    tarkovStore.switchGameMode(nextGameMode.value);
  }

  const currentEditionName = computed(() => metadataStore.getEditionName(tarkovStore.gameEdition));
  function navigateToSettings() {
    router.push('/settings');
  }
</script>
<style scoped>
  /* Hide scrollbar but keep scroll functionality */
  .nav-drawer-scroll {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
  .nav-drawer-scroll::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
</style>
