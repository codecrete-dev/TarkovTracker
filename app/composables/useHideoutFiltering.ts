import { computed } from "vue";
import { useHideoutData } from "@/composables/data/useHideoutData";
import { useProgressStore } from "@/stores/progress";
import { usePreferencesStore } from "@/stores/preferences";
import type { HideoutStation } from "@/types/tarkov";

export function useHideoutFiltering() {
  const { hideoutStations, loading: hideoutLoading } = useHideoutData();
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();

  // Active primary view (available, maxed, locked, all)
  const activePrimaryView = computed({
    get: () => preferencesStore.getTaskPrimaryView,
    set: (value) => preferencesStore.setTaskPrimaryView(value),
  });

  // Comprehensive loading check
  const isStoreLoading = computed(() => {
    try {
      // Check if hideout data is still loading
      if (hideoutLoading.value) return true;
      // Check if we have hideout stations data
      if (!hideoutStations.value || hideoutStations.value.length === 0) {
        return true;
      }
      // Check if progress store team data is ready
      // We don't block on visibleTeamStores being empty anymore, as it might be intentional
      // if the user has hidden all teams (including self, though that should be prevented)
      if (!progressStore.visibleTeamStores) {
        return true;
      }
      // Remove the hideoutLevels check as it creates a circular dependency
      // The hideoutLevels computed property needs both hideout stations AND team stores
      // Since we've already verified both are available above, we can proceed
      return false;
    } catch (error) {
      console.error("Error in hideout loading check:", error);
      // Return false to prevent stuck loading state on error
      return false;
    }
  });

  // Filter stations based on current view
  const visibleStations = computed(() => {
    try {
      // Use the comprehensive loading check - don't render until everything is ready
      if (isStoreLoading.value) {
        return [];
      }
      const hideoutStationList = JSON.parse(JSON.stringify(hideoutStations.value));

      // Display all upgradeable stations
      if (activePrimaryView.value === "available") {
        return hideoutStationList.filter((station: HideoutStation) => {
          const lvl = progressStore.hideoutLevels?.[station.id]?.self || 0;
          const nextLevelData = station.levels.find((l) => l.level === lvl + 1);
          if (!nextLevelData) return false;
          return nextLevelData.stationLevelRequirements.every(
            (req) => (progressStore.hideoutLevels?.[req.station.id]?.self || 0) >= req.level
          );
        });
      }

      // Display all maxed stations
      if (activePrimaryView.value === "maxed") {
        return hideoutStationList.filter(
          (station: HideoutStation) =>
            (progressStore.hideoutLevels?.[station.id]?.self || 0) === station.levels.length
        );
      }

      // Display all locked stations
      if (activePrimaryView.value === "locked") {
        return hideoutStationList.filter((station: HideoutStation) => {
          const lvl = progressStore.hideoutLevels?.[station.id]?.self || 0;
          const nextLevelData = station.levels.find((l) => l.level === lvl + 1);
          if (!nextLevelData) return false;
          return !nextLevelData.stationLevelRequirements.every(
            (req) => (progressStore.hideoutLevels?.[req.station.id]?.self || 0) >= req.level
          );
        });
      }

      // Display all stations
      if (activePrimaryView.value === "all") return hideoutStationList;
      return hideoutStationList;
    } catch (error) {
      console.error("Error computing visible stations:", error);
      // Return empty array on error to prevent stuck states
      return [];
    }
  });

  return {
    activePrimaryView,
    isStoreLoading,
    visibleStations,
  };
}
