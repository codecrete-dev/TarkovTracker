import { computed } from "vue";
import { useMetadataStore } from "@/stores/metadata";
import type { TarkovMap } from "@/types/tarkov";

// Mapping from GraphQL map names to static data keys (kept for backward compatibility)
const MAP_NAME_MAPPING: { [key: string]: string } = {
  "night factory": "factory",
  "the lab": "lab",
  "ground zero 21+": "groundzero",
  "the labyrinth": "labyrinth",
};

/**
 * Composable for managing map data, now using the metadata store
 */
export function useMapData() {
  const metadataStore = useMetadataStore();

  // Reactive data from store
  const maps = computed(() => metadataStore.mapsWithSvg);
  const rawMaps = computed(() => metadataStore.maps);
  const loading = computed(() => metadataStore.loading);
  const error = computed(() => metadataStore.error);

  // Computed properties
  const mapsWithSvg = computed(() => metadataStore.mapsWithSvg);
  const mapsByAvailability = computed(() => {
    const withSvg: TarkovMap[] = [];
    const withoutSvg: TarkovMap[] = [];
    maps.value.forEach((map) => {
      if (map.svg) {
        withSvg.push(map);
      } else {
        withoutSvg.push(map);
      }
    });
    return { withSvg, withoutSvg };
  });

  // Utility functions that delegate to the store
  const getMapById = (mapId: string): TarkovMap | undefined => {
    return metadataStore.getMapById(mapId);
  };

  const getMapByName = (mapName: string): TarkovMap | undefined => {
    return metadataStore.getMapByName(mapName);
  };

  const getStaticMapKey = (mapName: string): string => {
    return metadataStore.getStaticMapKey(mapName);
  };

  const hasMapSvg = (mapId: string): boolean => {
    return metadataStore.hasMapSvg(mapId);
  };

  return {
    // Reactive data
    maps,
    rawMaps,
    mapsWithSvg,
    mapsByAvailability,
    // Loading states
    loading,
    error,
    // Utility functions
    getMapById,
    getMapByName,
    getStaticMapKey,
    hasMapSvg,
    // Constants
    mapNameMapping: MAP_NAME_MAPPING,
  };
}
