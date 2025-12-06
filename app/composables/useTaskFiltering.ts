import { ref, shallowRef } from 'vue';
import { useMetadataStore } from '@/stores/useMetadata';
import { useProgressStore } from '@/stores/useProgress';
import type { Task } from '@/types/tarkov';
import { EXCLUDED_SCAV_KARMA_TASKS } from '@/utils/constants';
import { logger } from '@/utils/logger';
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
    if (primaryView === 'maps') {
      return filterTasksByMap(taskList, mapView, mergedMaps);
    } else if (primaryView === 'traders') {
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
              mapObjectiveTypes.includes(obj.type || '')
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
            mapObjectiveTypes.includes(obj.type || '')
        )
      );
    }
  };
  /**
   * Filter tasks by status (available, locked, completed) and user view
   */
  const filterTasksByStatus = (taskList: Task[], secondaryView: string, userView: string) => {
    if (userView === 'all') {
      return filterTasksForAllUsers(taskList, secondaryView);
    } else {
      return filterTasksForUser(taskList, secondaryView, userView);
    }
  };
  /**
   * Helper to get relevant team members for a task based on faction
   */
  const getRelevantTeamIds = (task: Task, teamIds: string[]): string[] => {
    return teamIds.filter((teamId) => {
      const userFaction = progressStore.playerFaction[teamId];
      const taskFaction = task.factionName;
      return taskFaction === 'Any' || taskFaction === userFaction;
    });
  };
  /**
   * Helper to get task status for a team member
   */
  const getTaskStatus = (taskId: string, teamId: string) => {
    const isUnlocked = progressStore.unlockedTasks?.[taskId]?.[teamId] === true;
    const isCompleted = progressStore.tasksCompletions?.[taskId]?.[teamId] === true;
    return { isUnlocked, isCompleted };
  };
  /**
   * Filter tasks for all team members view
   */
  const filterTasksForAllUsers = (taskList: Task[], secondaryView: string) => {
    const tempVisibleTasks = [];
    const teamIds = Object.keys(progressStore.visibleTeamStores || {});
    logger.debug('[TaskFiltering] Filtering for all users. Visible team IDs:', teamIds);
    for (const task of taskList) {
      const relevantTeamIds = getRelevantTeamIds(task, teamIds);
      if (relevantTeamIds.length === 0) continue;
      const taskStatuses = relevantTeamIds.map((teamId) => ({
        teamId,
        ...getTaskStatus(task.id, teamId),
      }));
      if (secondaryView === 'all') {
        // Show all tasks regardless of status
        const usersWhoNeedTask = taskStatuses
          .filter(({ isUnlocked, isCompleted }) => isUnlocked && !isCompleted)
          .map(({ teamId }) => progressStore.getDisplayName(teamId));
        tempVisibleTasks.push({ ...task, neededBy: usersWhoNeedTask });
      } else if (secondaryView === 'available') {
        const usersWhoNeedTask = taskStatuses
          .filter(({ isUnlocked, isCompleted }) => isUnlocked && !isCompleted)
          .map(({ teamId }) => progressStore.getDisplayName(teamId));
        if (usersWhoNeedTask.length > 0) {
          if (usersWhoNeedTask.length > 1) {
            logger.debug(
              `[TaskFiltering] Task "${task.name}" needed by multiple users:`,
              usersWhoNeedTask
            );
          }
          tempVisibleTasks.push({ ...task, neededBy: usersWhoNeedTask });
        }
      } else if (secondaryView === 'locked') {
        const isAvailableForAny = taskStatuses.some(
          ({ isUnlocked, isCompleted }) => isUnlocked && !isCompleted
        );
        const isCompletedByAll = taskStatuses.every(({ isCompleted }) => isCompleted);
        if (!isAvailableForAny && !isCompletedByAll) {
          tempVisibleTasks.push({ ...task, neededBy: [] });
        }
      } else if (secondaryView === 'completed') {
        const isCompletedByAll = taskStatuses.every(({ isCompleted }) => isCompleted);
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
    logger.debug('[TaskFiltering] Filtering for specific user:', {
      userView,
      secondaryView,
      totalTasks: taskList.length,
    });
    let filtered = taskList;
    // 'all' shows all tasks regardless of status
    if (secondaryView === 'available') {
      filtered = filtered.filter((task) => {
        const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[userView] === true;
        const isCompleted = progressStore.tasksCompletions?.[task.id]?.[userView] === true;
        return isUnlocked && !isCompleted;
      });
    } else if (secondaryView === 'locked') {
      filtered = filtered.filter((task) => {
        const taskCompletions = progressStore.tasksCompletions?.[task.id];
        const unlockedTasks = progressStore.unlockedTasks?.[task.id];
        return taskCompletions?.[userView] !== true && unlockedTasks?.[userView] !== true;
      });
    } else if (secondaryView === 'completed') {
      filtered = filtered.filter(
        (task) => progressStore.tasksCompletions?.[task.id]?.[userView] === true
      );
    }
    // 'all' case: no status filtering, just filter by faction below
    // Filter by faction
    const withFaction = filtered.filter(
      (task) =>
        task.factionName === 'Any' || task.factionName === progressStore.playerFaction[userView]
    );
    logger.debug('[TaskFiltering] Filtered results:', {
      userView,
      beforeFaction: filtered.length,
      afterFaction: withFaction.length,
      faction: progressStore.playerFaction[userView],
    });
    return withFaction;
  };
  /**
   * Helper to extract all map locations from a task
   */
  const extractTaskLocations = (task: Task): string[] => {
    const locations = Array.isArray(task.locations) ? [...task.locations] : [];
    if (Array.isArray(task.objectives)) {
      for (const obj of task.objectives) {
        if (Array.isArray(obj.maps)) {
          for (const objMap of obj.maps) {
            if (objMap?.id && !locations.includes(objMap.id)) {
              locations.push(objMap.id);
            }
          }
        }
      }
    }
    return locations;
  };
  /**
   * Helper to check if task passes all filters
   */
  const taskPassesFilters = (
    task: Task,
    disabledTasks: string[],
    hideGlobalTasks: boolean,
    hideNonKappaTasks: boolean
  ): boolean => {
    if (disabledTasks.includes(task.id)) return false;
    if (hideGlobalTasks && !task.map) return false;
    if (hideNonKappaTasks && task.kappaRequired !== true) return false;
    return true;
  };
  /**
   * Helper to check if user has unlocked task
   */
  const isTaskUnlockedForUser = (taskId: string, activeUserView: string): boolean => {
    if (activeUserView === 'all') {
      return Object.values(progressStore.unlockedTasks[taskId] || {}).some(Boolean);
    }
    return progressStore.unlockedTasks[taskId]?.[activeUserView] === true;
  };
  /**
   * Helper to check if any objectives remain incomplete
   */
  const hasIncompleteObjectives = (
    task: Task,
    mapIds: string[],
    activeUserView: string
  ): boolean => {
    return (
      task.objectives?.some((objective) => {
        if (!Array.isArray(objective.maps)) return false;
        if (!objective.maps.some((m) => mapIds.includes(m.id))) return false;
        const completions = progressStore.objectiveCompletions[objective.id] || {};
        return activeUserView === 'all'
          ? !Object.values(completions).every(Boolean)
          : completions[activeUserView] !== true;
      }) ?? false
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
      const ids = map.mergedIds || [map.id];
      const mapId = ids[0];
      if (!mapId) continue;
      mapTaskCounts[mapId] = 0;
      for (const task of tasks) {
        if (!taskPassesFilters(task, disabledTasks, hideGlobalTasks, hideNonKappaTasks)) continue;
        const taskLocations = extractTaskLocations(task);
        if (!ids.some((id: string) => taskLocations.includes(id))) continue;
        if (!isTaskUnlockedForUser(task.id, activeUserView)) continue;
        if (hasIncompleteObjectives(task, ids, activeUserView)) {
          mapTaskCounts[mapId]!++;
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
   * Calculate task counts by status (all, available, locked, completed)
   */
  const calculateStatusCounts = (
    userView: string
  ): { all: number; available: number; locked: number; completed: number } => {
    const counts = { all: 0, available: 0, locked: 0, completed: 0 };
    const taskList = metadataStore.tasks;
    for (const task of taskList) {
      // Skip excluded tasks
      if (EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)) continue;
      if (userView === 'all') {
        // For "all" view
        const teamIds = Object.keys(progressStore.visibleTeamStores || {});
        const relevantTeamIds = teamIds.filter((teamId) => {
          const teamFaction = progressStore.playerFaction[teamId];
          const taskFaction = task.factionName;
          return taskFaction === 'Any' || taskFaction === teamFaction;
        });
        if (relevantTeamIds.length === 0) continue;
        counts.all++;
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
        if (taskFaction !== 'Any' && taskFaction !== userFaction) continue;
        counts.all++;
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
      if (userView === 'all') {
        // For "all" view, check if available for any team member
        const isAvailableForAny = Object.keys(progressStore.visibleTeamStores || {}).some(
          (teamId) => {
            const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
            const isCompleted = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;
            const teamFaction = progressStore.playerFaction[teamId];
            const factionMatch = taskFaction === 'Any' || taskFaction === teamFaction;
            return isUnlocked && !isCompleted && factionMatch;
          }
        );
        if (isAvailableForAny) counts[traderId]++;
      } else {
        // For single user view, only count available (unlocked but not completed)
        const userFaction = progressStore.playerFaction[userView];
        const factionMatch = taskFaction === 'Any' || taskFaction === userFaction;
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
