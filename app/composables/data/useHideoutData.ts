import { computed } from "vue";
import { useMetadataStore } from "@/stores/metadata";
import type { HideoutStation, HideoutModule, NeededItemHideoutModule } from "@/types/tarkov";

/**
 * Composable for managing hideout data, now using the metadata store
 */
export function useHideoutData() {
  const metadataStore = useMetadataStore();

  // Reactive data from store
  const hideoutStations = computed(() => metadataStore.hideoutStations);
  const hideoutModules = computed(() => metadataStore.hideoutModules);
  const hideoutGraph = computed(() => metadataStore.hideoutGraph);
  const neededItemHideoutModules = computed(() => metadataStore.neededItemHideoutModules);
  const loading = computed(() => metadataStore.hideoutLoading);
  const error = computed(() => metadataStore.hideoutError);

  // Computed properties from store
  const stationsByName = computed(() => metadataStore.stationsByName);
  const modulesByStation = computed(() => metadataStore.modulesByStation);
  const maxStationLevels = computed(() => metadataStore.maxStationLevels);

  // Utility functions that delegate to the store
  const getStationById = (stationId: string): HideoutStation | undefined => {
    return metadataStore.getStationById(stationId);
  };

  const getStationByName = (name: string): HideoutStation | undefined => {
    return metadataStore.getStationByName(name);
  };

  const getModuleById = (moduleId: string): HideoutModule | undefined => {
    return metadataStore.getModuleById(moduleId);
  };

  const getModulesByStation = (stationId: string): HideoutModule[] => {
    return metadataStore.getModulesByStation(stationId);
  };

  const getMaxStationLevel = (stationId: string): number => {
    return metadataStore.getMaxStationLevel(stationId);
  };

  const isPrerequisiteFor = (moduleId: string, targetModuleId: string): boolean => {
    return metadataStore.isPrerequisiteForModule(moduleId, targetModuleId);
  };

  const getItemsForModule = (moduleId: string): NeededItemHideoutModule[] => {
    return metadataStore.getItemsForModule(moduleId);
  };

  const getModulesRequiringItem = (itemId: string): NeededItemHideoutModule[] => {
    return metadataStore.getModulesRequiringItem(itemId);
  };

  const getTotalConstructionTime = (moduleId: string): number => {
    return metadataStore.getTotalConstructionTime(moduleId);
  };

  return {
    // Reactive data
    hideoutStations,
    hideoutModules,
    hideoutGraph,
    neededItemHideoutModules,
    // Computed properties
    stationsByName,
    modulesByStation,
    maxStationLevels,
    // Loading states
    loading,
    error,
    // Utility functions
    getStationById,
    getStationByName,
    getModuleById,
    getModulesByStation,
    getMaxStationLevel,
    isPrerequisiteFor,
    getItemsForModule,
    getModulesRequiringItem,
    getTotalConstructionTime,
  };
}
