<template>
  <div class="px-4 py-6">
    <UCard class="bg-contentbackground border border-white/5">
      <!-- Filter Tabs & Controls -->
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <!-- Filter Tabs -->
        <div class="flex gap-2">
          <UButton
            v-for="tab in filterTabs"
            :key="tab.value"
            :label="tab.label"
            :variant="activeFilter === tab.value ? 'solid' : 'soft'"
            :color="activeFilter === tab.value ? 'primary' : 'neutral'"
            size="lg"
            @click="activeFilter = tab.value"
          />
        </div>
        <!-- Search Bar -->
        <div class="mx-4 max-w-md flex-1">
          <UInput
            v-model="search"
            :placeholder="$t('page.neededitems.searchplaceholder')"
            icon="i-mdi-magnify"
            clearable
            :ui="inputUi"
          />
        </div>
        <!-- Item Count & View Mode -->
        <div class="flex items-center gap-3">
          <UBadge color="neutral" variant="soft" size="md" class="px-3 py-1 text-sm">
            {{ filteredItems.length }} items
          </UBadge>
          <!-- View Mode Selector -->
          <div class="flex gap-1">
            <UButton
              :icon="'i-mdi-view-list'"
              :color="viewMode === 'list' ? 'primary' : 'neutral'"
              :variant="viewMode === 'list' ? 'soft' : 'ghost'"
              size="md"
              @click="viewMode = 'list'"
            />
            <UButton
              :icon="'i-mdi-view-module'"
              :color="viewMode === 'bigGrid' ? 'primary' : 'neutral'"
              :variant="viewMode === 'bigGrid' ? 'soft' : 'ghost'"
              size="md"
              @click="viewMode = 'bigGrid'"
            />
            <UButton
              :icon="'i-mdi-view-grid'"
              :color="viewMode === 'smallGrid' ? 'primary' : 'neutral'"
              :variant="viewMode === 'smallGrid' ? 'soft' : 'ghost'"
              size="md"
              @click="viewMode = 'smallGrid'"
            />
          </div>
        </div>
      </div>
      <!-- Items Container -->
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
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
import NeededItem from '@/features/neededitems/NeededItem.vue';
import { useMetadataStore } from '@/stores/useMetadata';
import { useProgressStore } from '@/stores/useProgress';
import type { NeededItemHideoutModule, NeededItemTaskObjective } from '@/types/tarkov';
  const inputUi = {
    base: 'w-full',
    input:
      'h-11 bg-surface-900 border border-white/15 text-surface-50 placeholder:text-surface-500 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-white/20',
    leadingIcon: 'text-surface-300',
  };
  const metadataStore = useMetadataStore();
  const progressStore = useProgressStore();
  const { neededItemTaskObjectives, neededItemHideoutModules } = storeToRefs(metadataStore);
  // View mode state: 'list', 'bigGrid', or 'smallGrid'
  const viewMode = ref<'list' | 'bigGrid' | 'smallGrid'>('list');
  // Filter state
  type FilterType = 'all' | 'tasks' | 'hideout' | 'completed';
  const activeFilter = ref<FilterType>('all');
  const filterTabs: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Tasks', value: 'tasks' },
    { label: 'Hideout', value: 'hideout' },
    { label: 'Completed', value: 'completed' },
  ];
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
          console.warn('[NeededItems] Skipping objective without item/markerItem:', need);
          continue;
        }
        // Aggregate by taskId + itemId
        // This combines multiple objectives for the same item in the same task
        key = `task:${need.taskId}:${itemId}`;
      } else {
        // For hideout: get itemId from item
        itemId = need.item?.id;
        if (!itemId) {
          console.warn('[NeededItems] Skipping hideout requirement without item:', need);
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
  const search = ref('');

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
