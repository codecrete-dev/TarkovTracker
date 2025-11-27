import { computed } from "vue";
import { useMetadataStore } from "@/stores/metadata";
import type { Task } from "@/types/tarkov";
import { EXCLUDED_SCAV_KARMA_TASKS } from "@/utils/constants";

/**
 * Composable for managing task data, now using the metadata store
 */
export function useTaskData() {
  const metadataStore = useMetadataStore();

  // Reactive data from store
  const tasks = computed(() => metadataStore.tasks);
  const taskGraph = computed(() => metadataStore.taskGraph);
  const objectives = computed(() => metadataStore.objectives);
  const objectiveMaps = computed(() => metadataStore.objectiveMaps);
  const alternativeTasks = computed(() => metadataStore.alternativeTasks);
  const objectiveGPS = computed(() => metadataStore.objectiveGPS);
  const mapTasks = computed(() => metadataStore.mapTasks);
  const neededItemTaskObjectives = computed(() => metadataStore.neededItemTaskObjectives);
  const loading = computed(() => metadataStore.loading);
  const error = computed(() => metadataStore.error);

  // Computed properties
  const enabledTasks = computed(() =>
    tasks.value.filter((task) => !EXCLUDED_SCAV_KARMA_TASKS.includes(task.id))
  );

  // Utility functions that delegate to the store
  const getTaskById = (taskId: string): Task | undefined => {
    return metadataStore.getTaskById(taskId);
  };

  const getTasksByTrader = (traderId: string): Task[] => {
    return metadataStore.getTasksByTrader(traderId);
  };

  const getTasksByMap = (mapId: string): Task[] => {
    return metadataStore.getTasksByMap(mapId);
  };

  const isPrerequisiteFor = (taskId: string, targetTaskId: string): boolean => {
    return metadataStore.isPrerequisiteFor(taskId, targetTaskId);
  };

  return {
    // Reactive data
    tasks,
    enabledTasks,
    taskGraph,
    objectives,
    objectiveMaps,
    alternativeTasks,
    objectiveGPS,
    mapTasks,
    neededItemTaskObjectives,
    // Loading states
    loading,
    error,
    // Utility functions
    getTaskById,
    getTasksByTrader,
    getTasksByMap,
    isPrerequisiteFor,
    // Constants
    disabledTasks: EXCLUDED_SCAV_KARMA_TASKS,
  };
}
