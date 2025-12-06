<template>
  <KeepAlive>
    <div class="relative h-full rounded" :class="itemCardClasses">
      <div class="flex h-full flex-col items-end">
        <!-- Item image -->
        <div
          class="relative flex aspect-square max-h-[300px] min-h-[150px] min-w-[150px] self-stretch"
        >
          <div style="position: absolute; left: 0px; top: 0px; z-index: 2">
            <div
              class="item-count-sheet flex items-center px-2 py-1 shadow-md"
              :class="itemCountTagClasses"
            >
              {{ currentCount.toLocaleString() }}/{{ neededCount.toLocaleString() }}
              <UIcon
                v-if="props.need.foundInRaid"
                name="i-mdi-checkbox-marked-circle-outline"
                class="ml-1 h-4 w-4"
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
            class="h-full w-full"
          />
        </div>
        <div class="mx-2 mt-2 flex items-center self-center">
          <div class="px-2 text-center">
            {{ item.name }}
          </div>
          <UIcon
            v-if="props.need.foundInRaid"
            name="i-mdi-checkbox-marked-circle-outline"
            class="ml-1 h-4 w-4"
          />
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
  </KeepAlive>
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
