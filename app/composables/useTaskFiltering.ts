import { ref, shallowRef } from "vue";
import { useProgressStore } from "@/stores/progress";
import { useMetadataStore } from "@/stores/metadata";
import { EXCLUDED_SCAV_KARMA_TASKS } from "@/utils/constants";
import type { Task } from "@/types/tarkov";

interface MergedMap {
  id: string;
  mergedIds?: string[];
}

export function useTaskFiltering() {
  const progressStore = useProgressStore();
  const metadataStore = useMetadataStore();
  const reloadingTasks = ref(false);
  const visibleTasks = shallowRef<Task[]>([]);

  const mapObjectiveTypes = [
    "mark",
    "zone",
    "extract",
    "visit",
    "findItem",
    "findQuestItem",
    "plantItem",
    "plantQuestItem",
    "shoot",
  ];

  /**
   * Filter tasks by primary view (all, maps, traders)
   */
  const filterTasksByView = (
    taskList: Task[],
    primaryView: string,
    mapView: string,
    traderView: string,
    mergedMaps: MergedMap[]
  ) => {
    if (primaryView === "maps") {
      return filterTasksByMap(taskList, mapView, mergedMaps);
    } else if (primaryView === "traders") {
      return taskList.filter((task) => task.trader?.id === traderView);
    }
    return taskList;
  };

  /**
   * Filter tasks by map, handling merged maps (Ground Zero, Factory)
   */
  const filterTasksByMap = (taskList: Task[], mapView: string, mergedMaps: MergedMap[]) => {
    const mergedMap = mergedMaps.find((m) => m.mergedIds && m.mergedIds.includes(mapView));

    if (mergedMap && mergedMap.mergedIds) {
      const ids = mergedMap.mergedIds;
      return taskList.filter((task) => {
        // Check locations field
        const taskLocations = Array.isArray(task.locations) ? task.locations : [];
        let hasMap = ids.some((id: string) => taskLocations.includes(id));

        // Check objectives[].maps
        if (!hasMap && Array.isArray(task.objectives)) {
          hasMap = task.objectives.some(
            (obj) =>
              Array.isArray(obj.maps) &&
              obj.maps.some((map) => ids.includes(map.id)) &&
              mapObjectiveTypes.includes(obj.type || "")
          );
        }
        return hasMap;
      });
    } else {
      // Default: single map logic
      return taskList.filter((task) =>
        task.objectives?.some(
          (obj) =>
            obj.maps?.some((map) => map.id === mapView) &&
            mapObjectiveTypes.includes(obj.type || "")
        )
      );
    }
  };

  /**
   * Filter tasks by status (available, locked, completed) and user view
   */
  const filterTasksByStatus = (taskList: Task[], secondaryView: string, userView: string) => {
    if (userView === "all") {
      return filterTasksForAllUsers(taskList, secondaryView);
    } else {
      return filterTasksForUser(taskList, secondaryView, userView);
    }
  };

  /**
   * Filter tasks for all team members view
   */
  const filterTasksForAllUsers = (taskList: Task[], secondaryView: string) => {
    const tempVisibleTasks = [];
    const teamIds = Object.keys(progressStore.visibleTeamStores || {});

    for (const task of taskList) {
      // Filter relevant team members for this task (faction check)
      const relevantTeamIds = teamIds.filter((teamId) => {
        const userFaction = progressStore.playerFaction[teamId];
        const taskFaction = task.factionName;
        return taskFaction === "Any" || taskFaction === userFaction;
      });

      if (relevantTeamIds.length === 0) continue;

      if (secondaryView === "available") {
        // Tasks available for at least one team member
        const usersWhoNeedTask = [];
        let taskIsNeededBySomeone = false;

        for (const teamId of relevantTeamIds) {
          const isUnlockedForUser = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
          const isCompletedByUser = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;

          if (isUnlockedForUser && !isCompletedByUser) {
            taskIsNeededBySomeone = true;
            usersWhoNeedTask.push(progressStore.getDisplayName(teamId));
          }
        }

        if (taskIsNeededBySomeone) {
          tempVisibleTasks.push({ ...task, neededBy: usersWhoNeedTask });
        }
      } else if (secondaryView === "locked") {
        // Tasks locked for ALL team members (not available to anyone)
        let isAvailableForAny = false;
        let isCompletedByAll = true;

        for (const teamId of relevantTeamIds) {
          const isUnlockedForUser = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
          const isCompletedByUser = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;

          if (isUnlockedForUser && !isCompletedByUser) {
            isAvailableForAny = true;
          }

          if (!isCompletedByUser) {
            isCompletedByAll = false;
          }
        }

        if (!isAvailableForAny && !isCompletedByAll) {
          tempVisibleTasks.push({ ...task, neededBy: [] });
        }
      } else if (secondaryView === "completed") {
        // Tasks completed by ALL team members
        const isCompletedByAll = relevantTeamIds.every((teamId) => {
          return progressStore.tasksCompletions?.[task.id]?.[teamId] === true;
        });

        if (isCompletedByAll) {
          tempVisibleTasks.push({ ...task, neededBy: [] });
        }
      }
    }

    return tempVisibleTasks;
  };

  /**
   * Filter tasks for specific user
   */
  const filterTasksForUser = (taskList: Task[], secondaryView: string, userView: string) => {
    let filtered = taskList;

    if (secondaryView === "available") {
      filtered = filtered.filter(
        (task) => progressStore.unlockedTasks?.[task.id]?.[userView] === true
      );
    } else if (secondaryView === "locked") {
      filtered = filtered.filter((task) => {
        const taskCompletions = progressStore.tasksCompletions?.[task.id];
        const unlockedTasks = progressStore.unlockedTasks?.[task.id];
        return taskCompletions?.[userView] !== true && unlockedTasks?.[userView] !== true;
      });
    } else if (secondaryView === "completed") {
      filtered = filtered.filter(
        (task) => progressStore.tasksCompletions?.[task.id]?.[userView] === true
      );
    }

    // Filter by faction
    return filtered.filter(
      (task) =>
        task.factionName === "Any" || task.factionName === progressStore.playerFaction[userView]
    );
  };

  /**
   * Calculate task totals per map for badge display
   */
  const calculateMapTaskTotals = (
    mergedMaps: MergedMap[],
    tasks: Task[],
    disabledTasks: string[],
    hideGlobalTasks: boolean,
    hideNonKappaTasks: boolean,
    activeUserView: string
  ) => {
    const mapTaskCounts: Record<string, number> = {};

    for (const map of mergedMaps) {
      // If merged, count for both IDs
      const ids = map.mergedIds || [map.id];
      const mapId = ids[0];
      if (!mapId) continue;

      mapTaskCounts[mapId] = 0;

      for (const task of tasks) {
        if (disabledTasks.includes(task.id)) continue;
        if (hideGlobalTasks && !task.map) continue;
        if (hideNonKappaTasks && task.kappaRequired !== true) continue;

        const taskLocations = Array.isArray(task.locations) ? task.locations : [];

        if (taskLocations.length === 0 && Array.isArray(task.objectives)) {
          for (const obj of task.objectives) {
            if (Array.isArray(obj.maps)) {
              for (const objMap of obj.maps) {
                if (objMap && objMap.id && !taskLocations.includes(objMap.id)) {
                  taskLocations.push(objMap.id);
                }
              }
            }
          }
        }

        // If any of the merged IDs are present
        if (ids.some((id: string) => taskLocations.includes(id))) {
          // Check if task is available for the user
          const unlocked =
            activeUserView === "all"
              ? Object.values(progressStore.unlockedTasks[task.id] || {}).some(Boolean)
              : progressStore.unlockedTasks[task.id]?.[activeUserView];

          if (unlocked) {
            let anyObjectiveLeft = false;
            for (const objective of task.objectives || []) {
              if (Array.isArray(objective.maps) && objective.maps.some((m) => ids.includes(m.id))) {
                const completions = progressStore.objectiveCompletions[objective.id] || {};
                const isComplete =
                  activeUserView === "all"
                    ? Object.values(completions).every(Boolean)
                    : completions[activeUserView] === true;

                if (!isComplete) {
                  anyObjectiveLeft = true;
                  break;
                }
              }
            }

            if (anyObjectiveLeft) {
              const mapId = ids[0];
              if (mapId && mapTaskCounts[mapId] !== undefined) {
                mapTaskCounts[mapId]!++;
              }
            }
          }
        }
      }
    }
    return mapTaskCounts;
  };

  /**
   * Main function to update visible tasks based on all filters
   */
  const updateVisibleTasks = async (
    activePrimaryView: string,
    activeSecondaryView: string,
    activeUserView: string,
    activeMapView: string,
    activeTraderView: string,
    mergedMaps: MergedMap[],
    tasksLoading: boolean
  ) => {
    // Simple guard clauses - data should be available due to global initialization
    if (tasksLoading || !metadataStore.tasks.length) {
      return;
    }

    reloadingTasks.value = true;
    try {
      let visibleTaskList = JSON.parse(JSON.stringify(metadataStore.tasks));

      // Apply primary view filter
      visibleTaskList = filterTasksByView(
        visibleTaskList,
        activePrimaryView,
        activeMapView,
        activeTraderView,
        mergedMaps
      );

      // Apply status and user filters
      visibleTaskList = filterTasksByStatus(visibleTaskList, activeSecondaryView, activeUserView);

      visibleTasks.value = visibleTaskList;
    } finally {
      reloadingTasks.value = false;
    }
  };

  /**
   * Calculate task counts by status (available, locked, completed)
   */
  const calculateStatusCounts = (userView: string) => {
    const counts = { available: 0, locked: 0, completed: 0 };
    const taskList = metadataStore.tasks;

    for (const task of taskList) {
      // Skip excluded tasks
      if (EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)) continue;

      if (userView === "all") {
        // For "all" view
        const teamIds = Object.keys(progressStore.visibleTeamStores || {});

        const relevantTeamIds = teamIds.filter((teamId) => {
          const teamFaction = progressStore.playerFaction[teamId];
          const taskFaction = task.factionName;
          return taskFaction === "Any" || taskFaction === teamFaction;
        });

        if (relevantTeamIds.length === 0) continue;

        const isAvailableForAny = relevantTeamIds.some((teamId) => {
          const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
          const isCompleted = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;
          return isUnlocked && !isCompleted;
        });

        const isCompletedByAll = relevantTeamIds.every((teamId) => {
          return progressStore.tasksCompletions?.[task.id]?.[teamId] === true;
        });

        if (isCompletedByAll) {
          counts.completed++;
        } else if (isAvailableForAny) {
          counts.available++;
        } else {
          counts.locked++;
        }
      } else {
        // For single user view
        const taskFaction = task.factionName;
        const userFaction = progressStore.playerFaction[userView];
        if (taskFaction !== "Any" && taskFaction !== userFaction) continue;

        const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[userView] === true;
        const isCompleted = progressStore.tasksCompletions?.[task.id]?.[userView] === true;

        if (isCompleted) {
          counts.completed++;
        } else if (isUnlocked) {
          counts.available++;
        } else {
          counts.locked++;
        }
      }
    }

    return counts;
  };

  /**
   * Calculate task counts per trader (available tasks only)
   */
  const calculateTraderCounts = (userView: string) => {
    const counts: Record<string, number> = {};
    const taskList = metadataStore.tasks;

    for (const task of taskList) {
      // Skip excluded tasks
      if (EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)) continue;

      const traderId = task.trader?.id;
      if (!traderId) continue;

      // Initialize count for this trader
      if (!counts[traderId]) counts[traderId] = 0;

      // Filter by faction
      const taskFaction = task.factionName;

      if (userView === "all") {
        // For "all" view, check if available for any team member
        const isAvailableForAny = Object.keys(progressStore.visibleTeamStores || {}).some(
          (teamId) => {
            const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
            const isCompleted = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;
            const teamFaction = progressStore.playerFaction[teamId];
            const factionMatch = taskFaction === "Any" || taskFaction === teamFaction;
            return isUnlocked && !isCompleted && factionMatch;
          }
        );
        if (isAvailableForAny) counts[traderId]++;
      } else {
        // For single user view, only count available (unlocked but not completed)
        const userFaction = progressStore.playerFaction[userView];
        const factionMatch = taskFaction === "Any" || taskFaction === userFaction;

        if (!factionMatch) continue;

        const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[userView] === true;
        const isCompleted = progressStore.tasksCompletions?.[task.id]?.[userView] === true;

        if (isUnlocked && !isCompleted) {
          counts[traderId]++;
        }
      }
    }

    return counts;
  };

  return {
    visibleTasks,
    reloadingTasks,
    filterTasksByView,
    filterTasksByStatus,
    filterTasksByMap,
    filterTasksForAllUsers,
    filterTasksForUser,
    calculateMapTaskTotals,
    calculateStatusCounts,
    calculateTraderCounts,
    updateVisibleTasks,
    mapObjectiveTypes,
    disabledTasks: EXCLUDED_SCAV_KARMA_TASKS,
  };
}
