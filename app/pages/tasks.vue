<template>
  <div>
    <div class="px-4 py-6">
      <TaskLoadingState v-if="isLoading" />
      <div v-else>
        <!-- Task Filter Bar -->
        <TaskFilterBar />
        <div v-if="visibleTasks.length === 0" class="py-6">
          <TaskEmptyState />
        </div>
        <div v-else class="space-y-4" data-testid="task-list">
          <TaskCard
            v-for="task in visibleTasks"
            :key="task.id"
            :task="task"
            :active-user-view="activeUserView"
            :needed-by="task.neededBy ?? []"
            @on-task-action="onTaskAction"
          />
        </div>
      </div>
    </div>
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-3"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-3"
      >
        <div
          v-if="taskStatusUpdated"
          class="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <UCard class="bg-surface-900/95 w-full max-w-xl border border-white/10 shadow-2xl">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span class="text-sm sm:text-base">{{ taskStatus }}</span>
              <div class="flex flex-1 justify-end gap-2">
                <UButton
                  v-if="showUndoButton"
                  size="xs"
                  variant="soft"
                  color="primary"
                  @click="undoLastAction"
                >
                  {{ t("page.tasks.questcard.undo") }}
                </UButton>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="secondary"
                  @click="taskStatusUpdated = false"
                >
                  {{ t("page.tasks.filters.close") }}
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
<script setup lang="ts">
  import { computed, watch, ref } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { usePreferencesStore } from "@/stores/preferences";
  import { useMetadataStore } from "@/stores/metadata";
  import { useProgressStore } from "@/stores/progress";
  import { useTarkovStore } from "@/stores/tarkov";
  import { useTaskFiltering } from "@/composables/useTaskFiltering";
  import type { Task, TaskObjective } from "@/types/tarkov";
  import TaskCard from "@/features/tasks/TaskCard.vue";
  import TaskLoadingState from "@/features/tasks/TaskLoadingState.vue";
  import TaskEmptyState from "@/features/tasks/TaskEmptyState.vue";
  const { t } = useI18n({ useScope: "global" });
  const preferencesStore = usePreferencesStore();
  const {
    getTaskPrimaryView,
    getTaskSecondaryView,
    getTaskUserView,
    getTaskMapView,
    getTaskTraderView,
  } = storeToRefs(preferencesStore);
  const metadataStore = useMetadataStore();
  const { tasks, maps, loading: tasksLoading } = storeToRefs(metadataStore);
  const progressStore = useProgressStore();
  const { tasksCompletions, unlockedTasks } = storeToRefs(progressStore);
  const { visibleTasks, reloadingTasks, updateVisibleTasks } = useTaskFiltering();
  const tarkovStore = useTarkovStore();
  // Toast / Undo State
  const taskStatusUpdated = ref(false);
  const taskStatus = ref("");
  const undoData = ref<{
    taskId: string;
    taskName: string;
    action: string;
  } | null>(null);
  const showUndoButton = ref(false);
  const mergedMaps = computed(() => {
    return (maps.value || []).map((map) => ({
      id: map.id,
      name: map.name,
      mergedIds: (map as unknown as { mergedIds?: string[] }).mergedIds || [map.id],
    }));
  });
  const refreshVisibleTasks = () => {
    updateVisibleTasks(
      getTaskPrimaryView.value,
      getTaskSecondaryView.value,
      getTaskUserView.value,
      getTaskMapView.value,
      getTaskTraderView.value,
      mergedMaps.value,
      tasksLoading.value
    ).catch((error) => {
      console.error("Failed to refresh tasks", error);
    });
  };
  watch(
    [
      getTaskPrimaryView,
      getTaskSecondaryView,
      getTaskUserView,
      getTaskMapView,
      getTaskTraderView,
      tasksLoading,
      tasks,
      maps,
      tasksCompletions,
      unlockedTasks,
    ],
    () => {
      refreshVisibleTasks();
    },
    { immediate: true }
  );
  const isLoading = computed(() => tasksLoading.value || reloadingTasks.value);
  const activeUserView = computed(() => getTaskUserView.value);
  // Helper Methods for Undo
  const handleTaskObjectives = (
    objectives: TaskObjective[],
    action: "setTaskObjectiveComplete" | "setTaskObjectiveUncomplete"
  ) => {
    objectives.forEach((o) => {
      if (action === "setTaskObjectiveComplete") {
        tarkovStore.setTaskObjectiveComplete(o.id);
      } else {
        tarkovStore.setTaskObjectiveUncomplete(o.id);
      }
    });
  };
  const handleAlternatives = (
    alternatives: string[] | undefined,
    taskAction: "setTaskComplete" | "setTaskUncompleted" | "setTaskFailed",
    objectiveAction: "setTaskObjectiveComplete" | "setTaskObjectiveUncomplete"
  ) => {
    if (!Array.isArray(alternatives)) return;
    alternatives.forEach((a: string) => {
      if (taskAction === "setTaskComplete") {
        tarkovStore.setTaskComplete(a);
      } else if (taskAction === "setTaskUncompleted") {
        tarkovStore.setTaskUncompleted(a);
      } else if (taskAction === "setTaskFailed") {
        tarkovStore.setTaskFailed(a);
      }
      const alternativeTask = tasks.value.find((task) => task.id === a);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };
  const updateTaskStatus = (statusKey: string, taskName: string, showUndo = false) => {
    taskStatus.value = t(statusKey, { name: taskName });
    taskStatusUpdated.value = true;
    showUndoButton.value = showUndo;
  };
  const onTaskAction = (event: {
    taskId: string;
    taskName: string;
    action: string;
    undoKey?: string;
    statusKey?: string;
  }) => {
    undoData.value = {
      taskId: event.taskId,
      taskName: event.taskName,
      action: event.action,
    };

    if (event.undoKey) {
      updateTaskStatus(event.undoKey, event.taskName, false);
    } else if (event.statusKey) {
      updateTaskStatus(event.statusKey, event.taskName, true);
    }
  };
  const undoLastAction = () => {
    if (!undoData.value) return;
    const { taskId, taskName, action } = undoData.value;
    if (action === "complete") {
      // Undo completion by setting task as uncompleted
      tarkovStore.setTaskUncompleted(taskId);
      // Find the task to handle objectives and alternatives
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo?.objectives) {
        handleTaskObjectives(taskToUndo.objectives, "setTaskObjectiveUncomplete");
        // Using taskToUndo with optional alternatives property
        handleAlternatives(
          (taskToUndo as Task & { alternatives?: string[] }).alternatives,
          "setTaskUncompleted",
          "setTaskObjectiveUncomplete"
        );
      }
      updateTaskStatus("page.tasks.questcard.undocomplete", taskName);
    } else if (action === "uncomplete") {
      // Undo uncompleting by setting task as completed
      tarkovStore.setTaskComplete(taskId);
      // Find the task to handle objectives and alternatives
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo?.objectives) {
        handleTaskObjectives(taskToUndo.objectives, "setTaskObjectiveComplete");
        // Using taskToUndo with optional alternatives property
        handleAlternatives(
          (taskToUndo as Task & { alternatives?: string[] }).alternatives,
          "setTaskFailed",
          "setTaskObjectiveComplete"
        );
        // Ensure min level for completion
        const minLevel = taskToUndo.minPlayerLevel;
        if (minLevel !== undefined && tarkovStore.playerLevel() < minLevel) {
          tarkovStore.setLevel(minLevel);
        }
      }
      updateTaskStatus("page.tasks.questcard.undouncomplete", taskName);
    }
    showUndoButton.value = false;
    undoData.value = null;
  };
</script>
