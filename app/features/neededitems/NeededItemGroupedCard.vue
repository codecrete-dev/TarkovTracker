<template>
  <div class="flex h-full flex-col rounded-lg bg-gray-800">
    <!-- Top section: Image + Name side by side -->
    <div class="flex items-center gap-3 p-3">
      <!-- Item image -->
      <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-900">
        <img
          v-if="groupedItem.item.image512pxLink || groupedItem.item.iconLink"
          :src="groupedItem.item.image512pxLink || groupedItem.item.iconLink"
          :alt="groupedItem.item.name"
          class="h-full w-full object-contain"
        />
      </div>
      <!-- Item name + Total -->
      <div class="flex-1 min-w-0">
        <div class="line-clamp-2 text-sm font-semibold leading-tight">
          {{ groupedItem.item.name }}
        </div>
        <div class="mt-1 flex items-center gap-1">
          <span class="text-xs text-gray-400">Total:</span>
          <span class="text-lg font-bold text-primary-400">{{ formatNumber(groupedItem.total) }}</span>
        </div>
      </div>
    </div>
    <!-- Breakdown grid -->
    <div class="grid grid-cols-2 gap-px border-t border-white/10 bg-white/5 text-xs">
      <!-- Tasks section -->
      <div class="bg-gray-800 p-2">
        <div class="mb-1.5 flex items-center gap-1 text-gray-400">
          <UIcon name="i-mdi-clipboard-list" class="h-3.5 w-3.5" />
          <span class="font-medium">Tasks</span>
        </div>
        <div class="flex gap-3">
          <div v-if="groupedItem.taskFir > 0" class="flex items-center gap-1">
            <UIcon name="i-mdi-checkbox-marked-circle" class="h-3 w-3 text-success-400" />
            <span class="font-semibold text-success-400">{{ groupedItem.taskFir }}</span>
          </div>
          <div v-if="groupedItem.taskNonFir > 0" class="flex items-center gap-1">
            <UIcon name="i-mdi-checkbox-blank-circle-outline" class="h-3 w-3 text-gray-400" />
            <span class="font-semibold text-white">{{ groupedItem.taskNonFir }}</span>
          </div>
          <span v-if="groupedItem.taskFir === 0 && groupedItem.taskNonFir === 0" class="text-gray-500">-</span>
        </div>
      </div>
      <!-- Hideout section -->
      <div class="bg-gray-800 p-2">
        <div class="mb-1.5 flex items-center gap-1 text-gray-400">
          <UIcon name="i-mdi-home" class="h-3.5 w-3.5" />
          <span class="font-medium">Hideout</span>
        </div>
        <div class="flex gap-3">
          <div v-if="groupedItem.hideoutFir > 0" class="flex items-center gap-1">
            <UIcon name="i-mdi-checkbox-marked-circle" class="h-3 w-3 text-success-400" />
            <span class="font-semibold text-success-400">{{ groupedItem.hideoutFir }}</span>
          </div>
          <div v-if="groupedItem.hideoutNonFir > 0" class="flex items-center gap-1">
            <UIcon name="i-mdi-checkbox-blank-circle-outline" class="h-3 w-3 text-gray-400" />
            <span class="font-semibold text-white">{{ groupedItem.hideoutNonFir }}</span>
          </div>
          <span v-if="groupedItem.hideoutFir === 0 && groupedItem.hideoutNonFir === 0" class="text-gray-500">-</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  interface GroupedItem {
    itemId: string;
    item: { id: string; name: string; iconLink?: string; image512pxLink?: string };
    taskFir: number;
    taskNonFir: number;
    hideoutFir: number;
    hideoutNonFir: number;
    total: number;
  }
  defineProps<{
    groupedItem: GroupedItem;
  }>();
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}k`;
    return num.toString();
  };
</script>
