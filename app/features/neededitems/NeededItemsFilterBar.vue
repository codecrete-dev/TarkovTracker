<template>
  <div class="mb-6 space-y-3">
    <!-- Primary Filter: ALL / TASKS / HIDEOUT (Centered) -->
    <div class="flex items-center justify-center gap-2 rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
      <UButton
        v-for="tab in filterTabs"
        :key="tab.value"
        :variant="'ghost'"
        :color="'neutral'"
        size="md"
        :class="{
          'border-primary-500 rounded-none border-b-2': modelValue === tab.value,
        }"
        @click="$emit('update:modelValue', tab.value)"
      >
        <UIcon :name="tab.icon" class="mr-2 h-5 w-5" />
        {{ tab.label.toUpperCase() }}
        <span
          :class="[
            'ml-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-bold text-white',
            modelValue === tab.value ? 'bg-primary-500' : 'bg-gray-600',
          ]"
        >
          {{ tab.count }}
        </span>
      </UButton>
    </div>
    <!-- Secondary filters container -->
    <div class="flex w-full flex-wrap gap-3">
      <!-- Section 1: Search bar -->
      <div class="flex min-w-[250px] flex-1 items-center rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
        <UInput
          :model-value="search"
          :placeholder="$t('page.neededitems.searchplaceholder', 'Search items...')"
          icon="i-mdi-magnify"
          clearable
          class="w-full"
          @update:model-value="$emit('update:search', $event)"
        />
      </div>
      <!-- Section 2: Team Filters -->
      <div class="flex items-center gap-3 rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
        <span class="text-surface-400 mr-1 text-xs font-medium">TEAM:</span>
        <UButton
          :variant="hideTeamItems ? 'soft' : 'ghost'"
          :color="hideTeamItems ? 'error' : 'neutral'"
          size="sm"
          @click="$emit('update:hideTeamItems', !hideTeamItems)"
        >
          <UIcon name="i-mdi-account-group-outline" class="mr-1 h-4 w-4" />
          {{ hideTeamItems ? 'HIDDEN' : 'SHOW' }}
        </UButton>
        <UButton
          :variant="hideNonFir ? 'soft' : 'ghost'"
          :color="hideNonFir ? 'warning' : 'neutral'"
          size="sm"
          :disabled="hideTeamItems"
          :class="{ 'opacity-50': hideTeamItems }"
          @click="$emit('update:hideNonFir', !hideNonFir)"
        >
          <UIcon name="i-mdi-checkbox-marked-circle-outline" class="mr-1 h-4 w-4" />
          FIR ONLY
        </UButton>
        <UButton
          :variant="hideHideout ? 'soft' : 'ghost'"
          :color="hideHideout ? 'warning' : 'neutral'"
          size="sm"
          :disabled="hideTeamItems"
          :class="{ 'opacity-50': hideTeamItems }"
          @click="$emit('update:hideHideout', !hideHideout)"
        >
          <UIcon name="i-mdi-home-outline" class="mr-1 h-4 w-4" />
          NO HIDEOUT
        </UButton>
      </div>
      <!-- Section 3: View Mode & Item Count -->
      <div class="flex items-center gap-3 rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
        <UBadge color="neutral" variant="soft" size="md" class="px-3 py-1 text-sm">
          {{ totalCount }} {{ $t('page.neededitems.items', 'items') }}
        </UBadge>
        <div class="flex gap-1 border-l border-white/10 pl-3">
          <UButton
            icon="i-mdi-view-list"
            :color="viewMode === 'list' ? 'primary' : 'neutral'"
            :variant="viewMode === 'list' ? 'soft' : 'ghost'"
            size="sm"
            @click="$emit('update:viewMode', 'list')"
          />
          <UButton
            icon="i-mdi-view-module"
            :color="viewMode === 'bigGrid' ? 'primary' : 'neutral'"
            :variant="viewMode === 'bigGrid' ? 'soft' : 'ghost'"
            size="sm"
            @click="$emit('update:viewMode', 'bigGrid')"
          />
          <UButton
            icon="i-mdi-view-grid"
            :color="viewMode === 'smallGrid' ? 'primary' : 'neutral'"
            :variant="viewMode === 'smallGrid' ? 'soft' : 'ghost'"
            size="sm"
            @click="$emit('update:viewMode', 'smallGrid')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  type FilterType = 'all' | 'tasks' | 'hideout' | 'completed';
  type ViewMode = 'list' | 'bigGrid' | 'smallGrid';
  interface FilterTab {
    label: string;
    value: FilterType;
    icon: string;
    count: number;
  }
  defineProps<{
    modelValue: FilterType;
    search: string;
    viewMode: ViewMode;
    filterTabs: FilterTab[];
    totalCount: number;
    hideTeamItems: boolean;
    hideNonFir: boolean;
    hideHideout: boolean;
  }>();
  defineEmits<{
    'update:modelValue': [value: FilterType];
    'update:search': [value: string];
    'update:viewMode': [value: ViewMode];
    'update:hideTeamItems': [value: boolean];
    'update:hideNonFir': [value: boolean];
    'update:hideHideout': [value: boolean];
  }>();
</script>
