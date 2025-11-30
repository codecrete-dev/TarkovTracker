<template>
  <UCard
    :id="`task-${task.id}`"
    class="border-primary-700/45 relative overflow-hidden border bg-[hsl(240,5%,5%)]! shadow-none"
    :class="taskClasses"
    :ui="{ body: 'p-4' }"
    @contextmenu="handleTaskContextMenu"
  >
    <div
      v-if="showBackgroundIcon"
      class="text-brand-200 pointer-events-none absolute inset-0 z-0 flex rotate-12 transform items-center justify-start p-8 opacity-15"
    >
      <UIcon
        :name="backgroundIcon.startsWith('mdi-') ? `i-${backgroundIcon}` : backgroundIcon"
        class="h-24 w-24"
      />
    </div>
    <div class="relative z-10 grid gap-4 lg:grid-cols-12">
      <!-- Quest Info Section -->
      <div class="lg:col-span-3" :class="xs ? 'text-center' : 'text-left'">
        <TaskInfo
          :task="task"
          :xs="xs"
          :locked-before="lockedBefore"
          :locked-behind="lockedBehind"
          :faction-image="factionImage"
          :non-kappa="nonKappa"
          :needed-by="neededBy"
          :active-user-view="activeUserView"
        />
      </div>
      <!-- Quest Content Section -->
      <div class="flex items-start lg:col-span-7">
        <div class="w-full space-y-3">
          <QuestKeys v-if="task?.neededKeys?.length" :needed-keys="task.neededKeys" />
          <QuestObjectives
            :objectives="relevantViewObjectives"
            :irrelevant-count="irrelevantObjectives.length"
            :uncompleted-irrelevant="uncompletedIrrelevantObjectives.length"
          />
        </div>
      </div>
      <!-- Actions Section -->
      <div class="flex items-start justify-end lg:col-span-2">
        <TaskActions
          :task="task"
          :tasks="tasks"
          :xs="xs"
          :is-complete="isComplete"
          :is-locked="isLocked"
          :is-our-faction="isOurFaction"
          @complete="markTaskComplete"
          @uncomplete="markTaskUncomplete"
          @unlock="markTaskAvailable"
        />
      </div>
    </div>
    <!-- Task Context Menu -->
    <ContextMenu ref="taskContextMenu">
      <template #default="{ close }">
        <ContextMenuItem
          v-if="task.wikiLink"
          icon="i-mdi-wikipedia"
          label="View Task on Wiki"
          @click="
            openTaskWiki();
            close();
          "
        />
      </template>
    </ContextMenu>
  </UCard>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, ref } from 'vue';
  import ContextMenu from '@/components/ui/ContextMenu.vue';
  import ContextMenuItem from '@/components/ui/ContextMenuItem.vue';
  import { useSharedBreakpoints } from '@/composables/useSharedBreakpoints';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { Task, TaskObjective } from '@/types/tarkov';
  import TaskActions from './TaskActions.vue';
  import TaskInfo from './TaskInfo.vue';
  // Conditionally rendered components - lazy load
  const QuestKeys = defineAsyncComponent(() => import('./QuestKeys.vue'));
  const QuestObjectives = defineAsyncComponent(() => import('./QuestObjectives.vue'));
  const props = defineProps<{
    task: Task;
    activeUserView: string;
    neededBy: string[];
  }>();
  const emit = defineEmits(['on-task-action']);
  // Shared breakpoints (matching Vuetify's xs/sm breakpoint at 600px)
  const { xs } = useSharedBreakpoints();
  const tarkovStore = useTarkovStore();
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const tasks = computed(() => metadataStore.tasks);
  // Context menu ref
  const taskContextMenu = ref();
  // Computed properties
  const isComplete = computed(() => tarkovStore.isTaskComplete(props.task.id));
  const isFailed = computed(() => tarkovStore.isTaskFailed(props.task.id));
  const isLocked = computed(
    () => progressStore.unlockedTasks[props.task.id]?.self !== true && !isComplete.value
  );
  const isOurFaction = computed(() => {
    const taskFaction = props.task.factionName;
    return taskFaction === 'Any' || taskFaction === tarkovStore.getPMCFaction();
  });
  const taskClasses = computed(() => {
    if (isComplete.value && !isFailed.value) {
      return 'bg-gradient-to-b from-green-900/90 to-transparent';
    }
    if (isLocked.value || isFailed.value) {
      return 'bg-gradient-to-b from-red-900/90 to-transparent';
    }
    return '';
  });
  const showBackgroundIcon = computed(() => isLocked.value || isFailed.value || isComplete.value);
  const backgroundIcon = computed(() => {
    if (isComplete.value) return 'mdi-check';
    if (isLocked.value || isFailed.value) return 'mdi-lock';
    return '';
  });
  const lockedBehind = computed(
    () => props.task.successors?.filter((s) => !tarkovStore.isTaskComplete(s)).length || 0
  );
  const lockedBefore = computed(
    () => props.task.predecessors?.filter((s) => !tarkovStore.isTaskComplete(s)).length || 0
  );
  const nonKappa = computed(() => !props.task.kappaRequired);
  const factionImage = computed(() => `/img/factions/${props.task.factionName}.webp`);
  const mapObjectiveTypes = [
    'mark',
    'zone',
    'extract',
    'visit',
    'findItem',
    'findQuestItem',
    'plantItem',
    'plantQuestItem',
    'shoot',
  ];
  const onMapView = computed(() => preferencesStore.getTaskPrimaryView === 'maps');
  const relevantViewObjectives = computed(() => {
    if (!onMapView.value) return props.task.objectives ?? [];
    return (props.task.objectives ?? []).filter((o) => {
      if (!Array.isArray(o.maps) || !o.maps.length) return true;
      return (
        o.maps.some((m) => m.id === preferencesStore.getTaskMapView) &&
        mapObjectiveTypes.includes(o.type ?? '')
      );
    });
  });
  const irrelevantObjectives = computed(() => {
    if (!onMapView.value) return [];
    return (props.task.objectives ?? []).filter((o) => {
      if (!Array.isArray(o.maps) || !o.maps.length) return false;
      const onSelectedMap = o.maps.some((m) => m.id === preferencesStore.getTaskMapView);
      const isMapType = mapObjectiveTypes.includes(o.type ?? '');
      return !(onSelectedMap && isMapType);
    });
  });
  const uncompletedIrrelevantObjectives = computed(() =>
    (props.task.objectives ?? [])
      .filter((o) => {
        const onCorrectMap = o?.maps?.some((m) => m.id === preferencesStore.getTaskMapView);
        const isMapObjectiveType = mapObjectiveTypes.includes(o.type ?? '');
        return !onCorrectMap || !isMapObjectiveType;
      })
      .filter((o) => !tarkovStore.isTaskObjectiveComplete(o.id))
  );
  // Methods
  const handleTaskObjectives = (
    objectives: TaskObjective[],
    action: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    objectives.forEach((o) => tarkovStore[action](o.id));
  };
  const handleAlternatives = (
    alternatives: string[] | undefined,
    taskAction: 'setTaskFailed' | 'setTaskUncompleted',
    objectiveAction: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    if (!Array.isArray(alternatives)) return;
    alternatives.forEach((a) => {
      tarkovStore[taskAction](a);
      const alternativeTask = tasks.value.find((task) => task.id === a);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };
  const ensureMinLevel = () => {
    const minLevel = props.task.minPlayerLevel ?? 0;
    if (tarkovStore.playerLevel() < minLevel) {
      tarkovStore.setLevel(minLevel);
    }
  };
  const markTaskComplete = (isUndo = false) => {
    if (!isUndo) {
      emit('on-task-action', {
        taskId: props.task.id,
        taskName: props.task.name,
        action: 'complete',
        statusKey: 'page.tasks.questcard.statuscomplete',
      });
    }
    tarkovStore.setTaskComplete(props.task.id);
    if (props.task.objectives) {
      handleTaskObjectives(props.task.objectives, 'setTaskObjectiveComplete');
    }
    handleAlternatives(props.task.alternatives, 'setTaskFailed', 'setTaskObjectiveComplete');
    ensureMinLevel();
    if (isUndo) {
      emit('on-task-action', {
        taskId: props.task.id,
        taskName: props.task.name,
        action: 'complete',
        undoKey: 'page.tasks.questcard.undocomplete',
      });
    }
  };
  const markTaskUncomplete = (isUndo = false) => {
    if (!isUndo) {
      emit('on-task-action', {
        taskId: props.task.id,
        taskName: props.task.name,
        action: 'uncomplete',
        statusKey: 'page.tasks.questcard.statusuncomplete',
      });
    }
    tarkovStore.setTaskUncompleted(props.task.id);
    if (props.task.objectives) {
      handleTaskObjectives(props.task.objectives, 'setTaskObjectiveUncomplete');
    }
    handleAlternatives(props.task.alternatives, 'setTaskUncompleted', 'setTaskObjectiveUncomplete');
    if (isUndo) {
      emit('on-task-action', {
        taskId: props.task.id,
        taskName: props.task.name,
        action: 'uncomplete',
        undoKey: 'page.tasks.questcard.undouncomplete',
      });
    }
  };
  const markTaskAvailable = () => {
    props.task.predecessors?.forEach((p) => {
      tarkovStore.setTaskComplete(p);
      const predecessorTask = tasks.value.find((task) => task.id === p);
      if (predecessorTask?.objectives) {
        handleTaskObjectives(predecessorTask.objectives, 'setTaskObjectiveComplete');
      }
    });
    ensureMinLevel();
    emit('on-task-action', {
      taskId: props.task.id,
      taskName: props.task.name,
      action: 'available',
      undoKey: 'page.tasks.questcard.statusavailable',
    });
  };
  // Context menu handlers
  const handleTaskContextMenu = (event: MouseEvent) => {
    if (props.task.wikiLink) {
      taskContextMenu.value?.open(event);
    }
  };
  const openTaskWiki = () => {
    if (props.task.wikiLink) {
      window.open(props.task.wikiLink, '_blank');
    }
  };
</script>
