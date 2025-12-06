<template>
  <div class="h-full rounded" :class="itemCardClasses">
    <!-- Flexbox display -->
    <div class="h-full">
      <div class="flex h-full flex-col items-end">
        <!-- Item image -->
        <div class="flex aspect-video min-h-[138px] self-stretch">
          <GameItem
            v-if="imageItem"
            :image-item="imageItem"
            :src="imageItem.image512pxLink"
            :is-visible="true"
            size="large"
            simple-mode
            class="h-full w-full"
          />
        </div>
        <!-- Item name, directly below item image -->
        <div v-if="item" class="mx-2 mt-2 flex self-center">
          <div class="px-2 text-center whitespace-pre-line">
            {{ item.name }}
            <UIcon
              v-if="props.need.foundInRaid"
              name="i-mdi-checkbox-marked-circle-outline"
              class="inline-block h-4 w-4"
            />
          </div>
        </div>
        <!-- Item need details -->
        <div class="mx-2 mt-2 flex w-full flex-col self-center">
          <template v-if="props.need.needType == 'taskObjective'">
            <div class="flex justify-center">
              <task-link :task="relatedTask" />
            </div>
            <RequirementInfo
              :need-type="props.need.needType"
              :level-required="levelRequired"
              :locked-before="lockedBefore"
              :player-level="tarkovStore.playerLevel()"
            />
          </template>
          <template v-else-if="props.need.needType == 'hideoutModule'">
            <div class="mt-1 mb-1 flex justify-center">
              <div class="text-center">
                <station-link
                  v-if="relatedStation"
                  :station="relatedStation"
                  class="justify-center"
                />
                <span v-else class="text-sm text-gray-300">Unknown station</span>
              </div>
              <div class="ml-1">{{ props.need.hideoutModule.level }}</div>
            </div>
            <RequirementInfo
              :need-type="props.need.needType"
              :level-required="levelRequired"
              :locked-before="lockedBefore"
              :player-level="tarkovStore.playerLevel()"
              :related-station="relatedStation"
              :hideout-level="props.need.hideoutModule.level"
            />
          </template>
        </div>
        <!-- Item count actions -->
        <div
          v-if="!selfCompletedNeed"
          class="mx-2 mt-2 mb-2 flex h-full flex-col items-center justify-center self-stretch"
        >
          <ItemCountControls
            :current-count="currentCount"
            :needed-count="neededCount"
            @decrease="$emit('decreaseCount')"
            @increase="$emit('increaseCount')"
            @toggle="$emit('toggleCount')"
            @set-count="(count) => $emit('setCount', count)"
          />
          <!-- Show team needs alongside controls -->
          <TeamNeedsDisplay
            v-if="teamNeeds.length > 0"
            :team-needs="teamNeeds"
            :needed-count="neededCount"
            class="mt-2"
          />
        </div>
        <!-- Show static count for completed parent items -->
        <div
          v-else
          class="mx-2 mt-2 mb-2 flex h-full items-center justify-center self-stretch"
        >
          <span class="text-success-400 text-sm font-semibold">
            {{ currentCount.toLocaleString() }}/{{ neededCount.toLocaleString() }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
  import { computed, defineAsyncComponent, inject } from 'vue';
  import { useTarkovStore } from '@/stores/useTarkov';
  import ItemCountControls from './ItemCountControls.vue';
  import RequirementInfo from './RequirementInfo.vue';
  import TeamNeedsDisplay from './TeamNeedsDisplay.vue';
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink'));
  const StationLink = defineAsyncComponent(() => import('@/features/hideout/StationLink'));
  const props = defineProps({
    need: {
      type: Object,
      required: true,
    },
  });
  defineEmits(['increaseCount', 'decreaseCount', 'toggleCount', 'setCount']);
  const tarkovStore = useTarkovStore();
  const {
    selfCompletedNeed,
    relatedTask,
    relatedStation,
    lockedBefore,
    neededCount,
    currentCount,
    levelRequired,
    item,
    teamNeeds,
    imageItem,
  } = inject('neededitem');
  const itemCardClasses = computed(() => {
    return {
      'bg-gradient-to-t from-complete to-surface':
        selfCompletedNeed.value || currentCount.value >= neededCount.value,
      'bg-gray-800': !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
      'shadow-md': true,
    };
  });
</script>
