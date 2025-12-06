<template>
  <div class="px-4 py-6">
    <!-- Filter Bar -->
    <NeededItemsFilterBar
      v-model="activeFilter"
      v-model:search="search"
      v-model:view-mode="viewMode"
      v-model:hide-team-items="hideTeamItems"
      v-model:hide-non-fir="hideNonFir"
      v-model:hide-hideout="hideHideout"
      :filter-tabs="filterTabsWithCounts"
      :total-count="filteredItems.length"
    />
    <!-- Items Container -->
    <UCard class="bg-contentbackground border border-white/5">
      <div v-if="filteredItems.length === 0" class="text-surface-400 p-8 text-center">
        {{ $t('page.neededitems.empty', 'No items match your search.') }}
      </div>
      <!-- List View -->
      <div v-else-if="viewMode === 'list'" class="divide-y divide-white/5">
        <NeededItem
          v-for="(item, index) in visibleItems"
          :key="`${String(item.needType)}-${String(item.id)}`"
          :need="item"
          item-style="row"
          :data-index="index"
        />
        <!-- Sentinel for infinite scroll -->
        <div v-if="visibleCount < filteredItems.length" ref="listSentinel" class="h-1"></div>
      </div>
      <!-- Grid Views -->
      <div v-else class="p-2">
        <div class="-m-1 flex flex-wrap">
          <NeededItem
            v-for="(item, index) in visibleItems"
            :key="`${String(item.needType)}-${String(item.id)}`"
            :need="item"
            :item-style="viewMode === 'bigGrid' ? 'mediumCard' : 'smallCard'"
            :data-index="index"
          />
        </div>
        <!-- Sentinel for infinite scroll -->
        <div v-if="visibleCount < filteredItems.length" ref="gridSentinel" class="h-1 w-full"></div>
      </div>
    </UCard>
  </div>
</template>
<script setup lang="ts">
  import { storeToRefs } from 'pinia';
  import { computed, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
  import NeededItem from '@/features/neededitems/NeededItem.vue';
  import NeededItemsFilterBar from '@/features/neededitems/NeededItemsFilterBar.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import type { NeededItemHideoutModule, NeededItemTaskObjective } from '@/types/tarkov';
  import { logger } from '@/utils/logger';
  const { t } = useI18n({ useScope: 'global' });
  const metadataStore = useMetadataStore();
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const { neededItemTaskObjectives, neededItemHideoutModules } = storeToRefs(metadataStore);
  // View mode state: 'list', 'bigGrid', or 'smallGrid'
  const viewMode = ref<'list' | 'bigGrid' | 'smallGrid'>('list');
  // Filter state
  type FilterType = 'all' | 'tasks' | 'hideout' | 'completed';
  const activeFilter = ref<FilterType>('all');
  const search = ref('');
  // Team filter preferences (two-way binding with preferences store)
  const hideTeamItems = computed({
    get: () => preferencesStore.itemsTeamAllHidden,
    set: (value) => preferencesStore.setItemsTeamHideAll(value),
  });
  const hideNonFir = computed({
    get: () => preferencesStore.itemsTeamNonFIRHidden,
    set: (value) => preferencesStore.setItemsTeamHideNonFIR(value),
  });
  const hideHideout = computed({
    get: () => preferencesStore.itemsTeamHideoutHidden,
    set: (value) => preferencesStore.setItemsTeamHideHideout(value),
  });
  const allItems = computed(() => {
    const combined = [
      ...(neededItemTaskObjectives.value || []),
      ...(neededItemHideoutModules.value || []),
    ];
    // Aggregate items by (taskId/hideoutModule, itemId) to combine duplicate items
    // from different objectives in the same task
    const aggregated = new Map<string, NeededItemTaskObjective | NeededItemHideoutModule>();
    for (const need of combined) {
      let key: string;
      let itemId: string | undefined;
      if (need.needType === 'taskObjective') {
        // For tasks: get itemId from either item or markerItem (for mark objectives)
        itemId = need.item?.id || need.markerItem?.id;
        if (!itemId) {
          logger.warn('[NeededItems] Skipping objective without item/markerItem:', need);
          continue;
        }
        // Aggregate by taskId + itemId
        // This combines multiple objectives for the same item in the same task
        key = `task:${need.taskId}:${itemId}`;
      } else {
        // For hideout: get itemId from item
        itemId = need.item?.id;
        if (!itemId) {
          logger.warn('[NeededItems] Skipping hideout requirement without item:', need);
          continue;
        }
        // This combines multiple requirements for the same item in the same module
        key = `hideout:${need.hideoutModule.id}:${itemId}`;
      }
      const existing = aggregated.get(key);
      if (existing) {
        // Item already exists for this task/module, sum the counts
        existing.count += need.count;
      } else {
        // First occurrence, clone the object to avoid mutating original
        aggregated.set(key, { ...need });
      }
    }
    // Return all items - filtering by completion status is done in filteredItems
    return Array.from(aggregated.values());
  });
  // Helper to check if the parent task/module is completed for self
  const isParentCompleted = (need: NeededItemTaskObjective | NeededItemHideoutModule): boolean => {
    if (need.needType === 'taskObjective') {
      // Check if the parent task is completed (turned in)
      return progressStore.tasksCompletions?.[need.taskId]?.['self'] ?? false;
    } else if (need.needType === 'hideoutModule') {
      // Check if the parent module is completed (built)
      return progressStore.moduleCompletions?.[need.hideoutModule.id]?.['self'] ?? false;
    }
    return false;
  };
  // Calculate item counts for each filter tab
  const filterTabsWithCounts = computed(() => {
    const items = allItems.value;
    const taskItems = items.filter(
      (item) => item.needType === 'taskObjective' && !isParentCompleted(item)
    );
    const hideoutItems = items.filter(
      (item) => item.needType === 'hideoutModule' && !isParentCompleted(item)
    );
    const completedItems = items.filter((item) => isParentCompleted(item));
    const allIncomplete = items.filter((item) => !isParentCompleted(item));
    return [
      {
        label: t('page.neededitems.filters.all', 'All'),
        value: 'all' as FilterType,
        icon: 'i-mdi-clipboard-list',
        count: allIncomplete.length,
      },
      {
        label: t('page.neededitems.filters.tasks', 'Tasks'),
        value: 'tasks' as FilterType,
        icon: 'i-mdi-checkbox-marked-circle-outline',
        count: taskItems.length,
      },
      {
        label: t('page.neededitems.filters.hideout', 'Hideout'),
        value: 'hideout' as FilterType,
        icon: 'i-mdi-home',
        count: hideoutItems.length,
      },
      {
        label: t('page.neededitems.filters.completed', 'Completed'),
        value: 'completed' as FilterType,
        icon: 'i-mdi-check-all',
        count: completedItems.length,
      },
    ];
  });
  const filteredItems = computed(() => {
    let items = allItems.value;
    // Filter by completion status first
    if (activeFilter.value === 'completed') {
      // Show only items where the parent task/module is completed
      items = items.filter((item) => isParentCompleted(item));
    } else {
      // For All, Tasks, Hideout tabs - hide items where parent is completed
      items = items.filter((item) => !isParentCompleted(item));
      // Then filter by type (All, Tasks, Hideout)
      if (activeFilter.value === 'tasks') {
        items = items.filter((item) => item.needType === 'taskObjective');
      } else if (activeFilter.value === 'hideout') {
        items = items.filter((item) => item.needType === 'hideoutModule');
      }
    }
    // Filter by search
    if (search.value) {
      items = items.filter((item) => {
        // Some task objectives use markerItem instead of item; guard against missing objects
        const itemName = item.item?.name || (item as NeededItemTaskObjective).markerItem?.name;
        return itemName?.toLowerCase().includes(search.value.toLowerCase());
      });
    }
    return items;
  });
  const visibleCount = ref(20);
  const visibleItems = computed(() => {
    return filteredItems.value.slice(0, visibleCount.value);
  });
  const loadMore = () => {
    if (visibleCount.value < filteredItems.value.length) {
      visibleCount.value += 20;
    }
  };
  // Sentinel refs for infinite scroll
  const listSentinel = ref<HTMLElement | null>(null);
  const gridSentinel = ref<HTMLElement | null>(null);
  // Determine which sentinel to use based on view mode
  const currentSentinel = computed(() => {
    return viewMode.value === 'list' ? listSentinel.value : gridSentinel.value;
  });
  // Enable infinite scroll
  const infiniteScrollEnabled = computed(() => {
    return visibleCount.value < filteredItems.value.length;
  });
  // Set up infinite scroll
  const { stop, start } = useInfiniteScroll(currentSentinel, loadMore, {
    rootMargin: '100px',
    threshold: 0.1,
    enabled: infiniteScrollEnabled.value,
  });
  // Reset visible count when search or filter changes
  watch([search, activeFilter], () => {
    visibleCount.value = 20;
  });
  // Watch for enabled state changes to restart observer
  watch(infiniteScrollEnabled, (newEnabled) => {
    if (newEnabled) {
      start();
    } else {
      stop();
    }
  });
</script>
