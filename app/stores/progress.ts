import { computed } from "vue";
import { defineStore } from "pinia";
import { useTarkovStore } from "~/stores/tarkov";
import { usePreferencesStore } from "~/stores/preferences";
import { useMetadataStore } from "~/stores/metadata";
import { useTeammateStores } from "./useTeamStore";
import type { Task } from "~/types/tarkov";
import type { Store } from "pinia";
import type { UserState, UserProgressData } from "~/shared_state";
import { GAME_MODES, GAME_EDITIONS, SPECIAL_STATIONS } from "@/utils/constants";
function getGameModeData(store: Store<string, UserState> | undefined): UserProgressData {
  if (!store) return {} as UserProgressData;
  const currentGameMode = store.$state.currentGameMode || GAME_MODES.PVP;
  const gameModeState = store.$state[currentGameMode as keyof UserState];
  return (gameModeState || store.$state) as UserProgressData;
}
type TeamStoresMap = Record<string, Store<string, UserState>>;
type CompletionsMap = Record<string, Record<string, boolean>>;
type TraderLevelsMap = Record<string, Record<string, number>>;
type FactionMap = Record<string, string>;
type TaskAvailabilityMap = Record<string, Record<string, boolean>>;
type ObjectiveCompletionsMap = Record<string, Record<string, boolean>>;
type HideoutLevelMap = Record<string, Record<string, number>>;
/*
type ProgressGetters = {
  teamStores: TeamStoresMap;
  visibleTeamStores: TeamStoresMap;
  tasksCompletions: CompletionsMap;
  gameEditionData: GameEdition[];
  traderLevelsAchieved: TraderLevelsMap;
  playerFaction: FactionMap;
  unlockedTasks: TaskAvailabilityMap;
  objectiveCompletions: ObjectiveCompletionsMap;
  hideoutLevels: HideoutLevelMap;
  getTeamIndex: (teamId: string) => number;
  getDisplayName: (teamId: string) => string;
  getLevel: (teamId: string) => number;
  getFaction: (teamId: string) => string;
};
*/
export const useProgressStore = defineStore("progress", () => {
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const { teammateStores } = useTeammateStores();

  // Get the tarkov store to source "self" data directly from it
  const tarkovStore = useTarkovStore();

  const teamStores = computed(() => {
    const stores: TeamStoresMap = {};
    // Source the "self" key directly from useTarkovStore() instead of maintaining local state
    stores["self"] = tarkovStore as Store<string, UserState>;

    for (const teammate of Object.keys(teammateStores.value)) {
      if (teammateStores.value[teammate]) {
        stores[teammate] = teammateStores.value[teammate];
      }
    }

    return stores;
  });
  const visibleTeamStores = computed(() => {
    const visibleStores: TeamStoresMap = {};
    Object.entries(teamStores.value).forEach(([teamId, store]) => {
      if (!preferencesStore.teamIsHidden(teamId)) {
        visibleStores[teamId] = store;
      }
    });
    return visibleStores;
  });
  const tasksCompletions = computed(() => {
    const completions: CompletionsMap = {};
    if (!metadataStore.tasks.length || !visibleTeamStores.value) return {};
    for (const task of metadataStore.tasks as Task[]) {
      completions[task.id] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        completions[task.id]![teamId] = currentData?.taskCompletions?.[task.id]?.complete ?? false;
      }
    }
    return completions;
  });
  const gameEditionData = computed(() => GAME_EDITIONS);
  const traderLevelsAchieved = computed(() => {
    const levels: TraderLevelsMap = {};
    if (!metadataStore.traders.length || !visibleTeamStores.value) return {};
    for (const teamId of Object.keys(visibleTeamStores.value)) {
      levels[teamId] = {};
      const store = visibleTeamStores.value[teamId];
      for (const trader of metadataStore.traders) {
        const currentData = getGameModeData(store);
        levels[teamId]![trader.id] = currentData?.level ?? 0;
      }
    }
    return levels;
  });
  const playerFaction = computed(() => {
    const faction: FactionMap = {};
    if (!visibleTeamStores.value) return {};
    for (const teamId of Object.keys(visibleTeamStores.value)) {
      const store = visibleTeamStores.value[teamId];
      const currentData = getGameModeData(store);
      faction[teamId] = currentData?.pmcFaction ?? "Unknown";
    }
    return faction;
  });
  const unlockedTasks = computed(() => {
    const available: TaskAvailabilityMap = {};
    if (!metadataStore.tasks.length || !visibleTeamStores.value) return {};
    for (const task of metadataStore.tasks as Task[]) {
      available[task.id] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        const playerLevel = currentData?.level ?? 0;
        const currentPlayerFaction = playerFaction.value[teamId];
        const isTaskComplete = tasksCompletions.value[task.id]?.[teamId] ?? false;
        if (isTaskComplete) {
          available[task.id]![teamId] = false;
          continue;
        }
        let failedReqsMet = true;
        if (task.failedRequirements) {
          for (const req of task.failedRequirements) {
            const failed = currentData?.taskCompletions?.[req.task.id]?.failed ?? false;
            if (failed) {
              failedReqsMet = false;
              break;
            }
          }
        }
        if (!failedReqsMet) {
          available[task.id]![teamId] = false;
          continue;
        }
        if (task.minPlayerLevel && playerLevel < task.minPlayerLevel) {
          available[task.id]![teamId] = false;
          continue;
        }
        let traderLevelsMet = true;
        if (task.traderLevelRequirements) {
          for (const req of task.traderLevelRequirements) {
            const currentTraderLevel = traderLevelsAchieved.value[teamId]?.[req.trader.id] ?? 0;
            if (currentTraderLevel < req.level) {
              traderLevelsMet = false;
              break;
            }
          }
        }
        if (!traderLevelsMet) {
          available[task.id]![teamId] = false;
          continue;
        }
        let prereqsMet = true;
        if (task.taskRequirements) {
          for (const req of task.taskRequirements) {
            const isPrereqComplete = tasksCompletions.value[req.task.id]?.[teamId] ?? false;
            if (!isPrereqComplete) {
              prereqsMet = false;
              break;
            }
          }
        }
        if (!prereqsMet) {
          available[task.id]![teamId] = false;
          continue;
        }
        if (
          task.factionName &&
          task.factionName !== "Any" &&
          task.factionName !== currentPlayerFaction
        ) {
          available[task.id]![teamId] = false;
          continue;
        }
        available[task.id]![teamId] = true;
      }
    }
    return available;
  });
  const objectiveCompletions = computed(() => {
    const completions: ObjectiveCompletionsMap = {};
    if (!metadataStore.objectives.length || !visibleTeamStores.value) return {};
    for (const objective of metadataStore.objectives) {
      completions[objective.id] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        completions[objective.id]![teamId] =
          currentData?.taskObjectives?.[objective.id]?.complete ?? false;
      }
    }
    return completions;
  });
  const hideoutLevels = computed(() => {
    const levels: HideoutLevelMap = {};
    if (!metadataStore.hideoutStations.length || !visibleTeamStores.value) return {};
    for (const station of metadataStore.hideoutStations) {
      if (!station || !station.id) continue;
      levels[station.id] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        const modulesState = currentData?.hideoutModules ?? {};
        let maxManuallyCompletedLevel = 0;
        if (station.levels && Array.isArray(station.levels)) {
          for (const lvl of station.levels) {
            if (lvl && lvl.id && modulesState[lvl.id]?.complete && typeof lvl.level === "number") {
              maxManuallyCompletedLevel = Math.max(maxManuallyCompletedLevel, lvl.level);
            }
          }
        }
        let currentStationDisplayLevel;
        if (station.normalizedName === SPECIAL_STATIONS.STASH) {
          const gameEditionVersion = store?.$state.gameEdition ?? 0;
          const edition = gameEditionData.value.find((e) => e.value === gameEditionVersion);
          const defaultStashFromEdition = edition?.defaultStashLevel ?? 0;
          const maxLevel = station.levels?.length || 0;
          const effectiveStashLevel = Math.min(defaultStashFromEdition, maxLevel);
          if (effectiveStashLevel === maxLevel) {
            currentStationDisplayLevel = maxLevel;
          } else {
            currentStationDisplayLevel = Math.max(effectiveStashLevel, maxManuallyCompletedLevel);
          }
        } else if (station.normalizedName === SPECIAL_STATIONS.CULTIST_CIRCLE) {
          const gameEditionVersion = store?.$state.gameEdition ?? 0;
          const edition = gameEditionData.value.find((e) => e.value === gameEditionVersion);
          const defaultCultistCircleFromEdition = edition?.defaultCultistCircleLevel ?? 0;
          const maxLevel = station.levels?.length || 0;
          const effectiveCultistCircleLevel = Math.min(defaultCultistCircleFromEdition, maxLevel);
          if (effectiveCultistCircleLevel === maxLevel) {
            currentStationDisplayLevel = maxLevel;
          } else {
            currentStationDisplayLevel = Math.max(
              effectiveCultistCircleLevel,
              maxManuallyCompletedLevel
            );
          }
        } else {
          currentStationDisplayLevel = maxManuallyCompletedLevel;
        }
        levels[station.id]![teamId] = currentStationDisplayLevel;
      }
    }
    return levels;
  });

  const moduleCompletions = computed(() => {
    const completions: CompletionsMap = {};
    if (!metadataStore.hideoutStations.length || !visibleTeamStores.value) return {};

    // Collect all module IDs from all stations
    const allModuleIds = metadataStore.hideoutStations.flatMap(
      (station) => station.levels?.map((level) => level.id) || []
    );

    for (const moduleId of allModuleIds) {
      completions[moduleId] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        completions[moduleId]![teamId] = currentData?.hideoutModules?.[moduleId]?.complete ?? false;
      }
    }
    return completions;
  });

  const modulePartCompletions = computed(() => {
    const completions: CompletionsMap = {};
    if (!metadataStore.hideoutStations.length || !visibleTeamStores.value) return {};

    // Collect all part/requirement IDs from all station levels
    const allPartIds = metadataStore.hideoutStations.flatMap(
      (station) =>
        station.levels?.flatMap((level) => level.itemRequirements?.map((req) => req.id) || []) || []
    );

    for (const partId of allPartIds) {
      completions[partId] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        completions[partId]![teamId] = currentData?.hideoutParts?.[partId]?.complete ?? false;
      }
    }
    return completions;
  });

  const getTeamIndex = (teamId: string): string => {
    const { $supabase } = useNuxtApp();
    return teamId === $supabase.user?.id ? "self" : teamId;
  };
  const getDisplayName = (teamId: string): string => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    const displayNameFromStore = currentData?.displayName;

    if (!displayNameFromStore) {
      return teamId.substring(0, 6);
    }
    return displayNameFromStore;
  };
  const getLevel = (teamId: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    return currentData?.level ?? 1;
  };
  const getFaction = (teamId: string): string => {
    const store = visibleTeamStores.value[teamId];
    const currentData = getGameModeData(store);
    return currentData?.pmcFaction ?? "Unknown";
  };
  const getTeammateStore = (teamId: string): Store<string, UserState> | null => {
    return teammateStores.value[teamId] || null;
  };

  const hasCompletedTask = (teamId: string, taskId: string): boolean => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    const taskCompletion = currentData?.taskCompletions?.[taskId];
    return taskCompletion?.complete === true;
  };

  const getTaskStatus = (teamId: string, taskId: string): "completed" | "failed" | "incomplete" => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    const taskCompletion = currentData?.taskCompletions?.[taskId];
    if (taskCompletion?.complete) return "completed";
    if (taskCompletion?.failed) return "failed";
    return "incomplete";
  };
  const getProgressPercentage = (teamId: string, category: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    if (!store?.$state) return 0;
    // Get current gamemode data, with fallback to legacy structure
    const currentGameMode = store.$state.currentGameMode || GAME_MODES.PVP;
    const currentData = store.$state[currentGameMode] || store.$state;
    switch (category) {
      case "tasks": {
        const totalTasks = Object.keys(currentData.taskCompletions || {}).length;
        const completedTasks = Object.values(currentData.taskCompletions || {}).filter(
          (completion) => completion?.complete === true
        ).length;
        return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      }
      case "hideout": {
        const totalModules = Object.keys(currentData.hideoutModules || {}).length;
        const completedModules = Object.values(currentData.hideoutModules || {}).filter(
          (module) => module?.complete === true
        ).length;
        return totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
      }
      default:
        return 0;
    }
  };

  return {
    teamStores,
    visibleTeamStores,
    tasksCompletions,
    gameEditionData,
    traderLevelsAchieved,
    playerFaction,
    unlockedTasks,
    objectiveCompletions,
    hideoutLevels,
    moduleCompletions,
    modulePartCompletions,
    getTeamIndex,
    getDisplayName,
    getLevel,
    getFaction,
    getTeammateStore,
    hasCompletedTask,
    getTaskStatus,
    getProgressPercentage,
  };
});
