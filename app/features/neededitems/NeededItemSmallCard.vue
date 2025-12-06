<template>
  <KeepAlive>
    <div class="flex h-full flex-col rounded-lg" :class="itemCardClasses">
      <!-- Item image with count badge -->
      <div class="relative aspect-square w-full shrink-0 overflow-hidden rounded-t-lg">
        <div class="absolute left-0 top-0 z-10">
          <div
            class="flex items-center gap-1 rounded-br-lg px-2 py-1 text-sm font-bold shadow-lg"
            :class="itemCountTagClasses"
          >
            {{ currentCount }}/{{ neededCount }}
            <UIcon
              v-if="props.need.foundInRaid"
              name="i-mdi-checkbox-marked-circle-outline"
              class="h-4 w-4"
            />
          </div>
        </div>
        <GameItem
          v-if="imageItem"
          :image-item="imageItem"
          :src="imageItem.image512pxLink"
          :is-visible="true"
          size="large"
          simple-mode
          fill
          class="h-full w-full"
        />
      </div>
      <!-- Card content -->
      <div class="flex flex-1 flex-col p-2">
        <!-- Item name -->
        <div class="flex min-h-[40px] items-start justify-center">
          <span class="line-clamp-2 text-center text-sm leading-snug font-medium">
            {{ item.name }}
          </span>
        </div>
        <!-- Task/Station link -->
        <div class="flex min-h-[28px] items-center justify-center overflow-hidden">
          <template v-if="props.need.needType == 'taskObjective'">
            <TaskLink :task="relatedTask" class="text-xs" />
          </template>
          <template v-else-if="props.need.needType == 'hideoutModule'">
            <StationLink
              v-if="relatedStation"
              :station="relatedStation"
              class="text-xs"
            />
            <span class="ml-1 text-xs text-gray-400">{{ props.need.hideoutModule.level }}</span>
          </template>
        </div>
        <!-- Requirements (Level & Tasks Before) -->
        <div class="flex min-h-[20px] flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
          <span v-if="levelRequired > 0 && levelRequired > playerLevel" class="flex items-center gap-1">
            <UIcon name="i-mdi-account" class="h-3.5 w-3.5" />
            Lvl {{ levelRequired }}
          </span>
          <span v-if="lockedBefore > 0" class="flex items-center gap-1">
            <UIcon name="i-mdi-lock-outline" class="h-3.5 w-3.5" />
            {{ lockedBefore }} before
          </span>
        </div>
        <!-- Controls -->
        <div class="mt-auto flex items-center justify-center pt-2">
          <template v-if="!selfCompletedNeed">
            <ItemCountControls
              :current-count="currentCount"
              :needed-count="neededCount"
              @decrease="$emit('decreaseCount')"
              @increase="$emit('increaseCount')"
              @toggle="$emit('toggleCount')"
              @set-count="(count) => $emit('setCount', count)"
            />
          </template>
          <span v-else class="text-success-400 text-sm font-bold">
            {{ currentCount }}/{{ neededCount }} ✓
          </span>
        </div>
      </div>
    </div>
  </KeepAlive>
</template>
<script setup>
  import { computed, defineAsyncComponent, inject } from 'vue';
  import { useTarkovStore } from '@/stores/useTarkov';
  import ItemCountControls from './ItemCountControls.vue';
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink'));
  const StationLink = defineAsyncComponent(() => import('@/features/hideout/StationLink'));
  const props = defineProps({
    need: {
      type: Object,
      required: true,
    },
  });
  const tarkovStore = useTarkovStore();
  const playerLevel = computed(() => tarkovStore.playerLevel());
  const {
    selfCompletedNeed,
    relatedTask,
    relatedStation,
    neededCount,
    currentCount,
    levelRequired,
    lockedBefore,
    item,
    imageItem,
  } = inject('neededitem');
  const itemCardClasses = computed(() => {
    return {
      'bg-gradient-to-t from-complete to-surface':
        selfCompletedNeed.value || currentCount.value >= neededCount.value,
      'bg-gray-800': !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
    };
  });
  const itemCountTagClasses = computed(() => {
    return {
      'bg-clip-padding rounded-tl-[5px] rounded-br-[10px]': true,
      'bg-white text-black': !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
      'bg-complete': selfCompletedNeed.value || currentCount.value >= neededCount.value,
    };
  });
  defineEmits(['decreaseCount', 'increaseCount', 'toggleCount', 'setCount']);
</script>
