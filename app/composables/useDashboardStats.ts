import { computed } from "vue";
import { useProgressStore } from "@/stores/progress";
import { useMetadataStore } from "@/stores/metadata";
import { useTarkovStore } from "@/stores/tarkov";
import { CURRENCY_ITEM_IDS } from "@/utils/constants";
import type { TaskObjective } from "@/types/tarkov";
export function useDashboardStats() {
  const progressStore = useProgressStore();
  const metadataStore = useMetadataStore();
  const tarkovStore = useTarkovStore();

  // Memoize tasks filtered by faction to avoid repeated filtering
  const relevantTasks = computed(() => {
    if (!metadataStore.tasks) return [];
    const currentFaction = tarkovStore.getPMCFaction();
    return metadataStore.tasks.filter(
      (task) => task && (task.factionName === "Any" || task.factionName === currentFaction)
    );
  });

  // Available tasks count
  const availableTasksCount = computed(() => {
    if (!progressStore.unlockedTasks) return 0;
    let count = 0;
    for (const taskId in progressStore.unlockedTasks) {
      if (progressStore.unlockedTasks[taskId]?.self) count++;
    }
    return count;
  });

  // Failed tasks count
  const failedTasksCount = computed(() => {
    if (!metadataStore.tasks) return 0;
    return metadataStore.tasks.filter((t) => tarkovStore.isTaskFailed(t.id)).length;
  });

  // Needed item task objectives (memoized)
  const neededItemTaskObjectives = computed(() => {
    if (!metadataStore.objectives) return [];
    const itemObjectiveTypes = [
      "giveItem",
      "findItem",
      "findQuestItem",
      "giveQuestItem",
      "plantQuestItem",
      "plantItem",
      "buildWeapon",
    ];
    return metadataStore.objectives.filter(
      (obj) => obj && obj.type && itemObjectiveTypes.includes(obj.type)
    );
  });

  // Total tasks count
  const totalTasks = computed(() => relevantTasks.value.length);
  // Total objectives count
  const totalObjectives = computed(() => {
    return relevantTasks.value.reduce((total, task) => {
      return total + (task?.objectives?.length || 0);
    }, 0);
  });
  // Completed objectives count
  const completedObjectives = computed(() => {
    if (!metadataStore.objectives || !tarkovStore) {
      return 0;
    }
    return metadataStore.objectives.filter(
      (objective) => objective && objective.id && tarkovStore.isTaskObjectiveComplete(objective.id)
    ).length;
  });
  // Completed tasks count
  const completedTasks = computed(() => {
    if (!progressStore.tasksCompletions) {
      return 0;
    }
    return Object.values(progressStore.tasksCompletions).filter(
      (task) => task && task.self === true
    ).length;
  });
  // Helper to check if objective is relevant for current faction
  const isObjectiveRelevant = (objective: TaskObjective | null | undefined) => {
    if (!objective) return false;
    if (
      objective.item &&
      CURRENCY_ITEM_IDS.includes(objective.item.id as (typeof CURRENCY_ITEM_IDS)[number])
    ) {
      return false;
    }
    const relatedTask = metadataStore.tasks?.find(
      (task) => task && objective.taskId && task.id === objective.taskId
    );
    const currentPMCFaction = tarkovStore.getPMCFaction();
    return !!(
      relatedTask &&
      relatedTask.factionName &&
      currentPMCFaction !== undefined &&
      (relatedTask.factionName === "Any" || relatedTask.factionName === currentPMCFaction)
    );
  };

  // Completed task items count
  const completedTaskItems = computed(() => {
    if (
      !neededItemTaskObjectives.value ||
      !metadataStore.tasks ||
      !progressStore.tasksCompletions ||
      !progressStore.objectiveCompletions ||
      !tarkovStore
    ) {
      return 0;
    }
    let total = 0;
    neededItemTaskObjectives.value.forEach((objective) => {
      if (!isObjectiveRelevant(objective)) return;
      if (!objective.id || !objective.taskId) return;

      const taskCompletion = progressStore.tasksCompletions[objective.taskId];
      const objectiveCompletion = progressStore.objectiveCompletions[objective.id];

      if (
        (taskCompletion && taskCompletion["self"]) ||
        (objectiveCompletion && objectiveCompletion["self"]) ||
        (objective.count &&
          objective.id &&
          objective.count <= tarkovStore.getObjectiveCount(objective.id))
      ) {
        total += objective.count || 1;
      } else {
        if (objective.id) {
          total += tarkovStore.getObjectiveCount(objective.id);
        }
      }
    });
    return total;
  });

  // Total task items count
  const totalTaskItems = computed(() => {
    if (!metadataStore.objectives || !metadataStore.tasks || !tarkovStore) {
      return 0;
    }
    return neededItemTaskObjectives.value.reduce((total, objective) => {
      if (!isObjectiveRelevant(objective)) return total;
      return total + (objective.count || 1);
    }, 0);
  });
  // Total Kappa tasks count
  const totalKappaTasks = computed(() => {
    return relevantTasks.value.filter((task) => task.kappaRequired === true).length;
  });

  // Completed Kappa tasks count
  const completedKappaTasks = computed(() => {
    if (!progressStore.tasksCompletions) return 0;
    return relevantTasks.value.filter(
      (task) =>
        task.kappaRequired === true && progressStore.tasksCompletions[task.id]?.self === true
    ).length;
  });
  // Total Lightkeeper tasks count
  const totalLightkeeperTasks = computed(() => {
    return relevantTasks.value.filter((task) => task.lightkeeperRequired === true).length;
  });

  // Completed Lightkeeper tasks count
  const completedLightkeeperTasks = computed(() => {
    if (!progressStore.tasksCompletions) return 0;
    return relevantTasks.value.filter(
      (task) =>
        task.lightkeeperRequired === true && progressStore.tasksCompletions[task.id]?.self === true
    ).length;
  });

  // Trader-specific stats
  const traderStats = computed(() => {
    if (!metadataStore.traders || !progressStore.tasksCompletions) return [];

    return metadataStore.sortedTraders
      .map((trader) => {
        const traderTasks = relevantTasks.value.filter((task) => task.trader?.id === trader.id);
        const totalTasks = traderTasks.length;
        const completedTasks = traderTasks.filter(
          (task) => progressStore.tasksCompletions[task.id]?.self === true
        ).length;

        return {
          id: trader.id,
          name: trader.name,
          imageLink: trader.imageLink,
          totalTasks,
          completedTasks,
          percentage: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0.0",
        };
      })
      .filter((stats) => stats.totalTasks > 0); // Only show traders with at least 1 task
  });

  return {
    availableTasksCount,
    failedTasksCount,
    totalTasks,
    totalObjectives,
    completedObjectives,
    completedTasks,
    completedTaskItems,
    totalTaskItems,
    totalKappaTasks,
    completedKappaTasks,
    totalLightkeeperTasks,
    completedLightkeeperTasks,
    traderStats,
  };
}
