import { computed } from "vue";
import { useMetadataStore } from "@/stores/metadata";
import type { PlayerLevel } from "@/types/tarkov";

/**
 * Composable for player level data, now using the metadata store
 */
export function usePlayerLevelData() {
  const metadataStore = useMetadataStore();

  // Reactive data from store
  const playerLevels = computed(() => metadataStore.playerLevels);
  const loading = computed(() => metadataStore.loading);
  const error = computed(() => metadataStore.error);

  // Computed properties from store
  const minPlayerLevel = computed(() => metadataStore.minPlayerLevel);
  const maxPlayerLevel = computed(() => metadataStore.maxPlayerLevel);

  // Utility functions
  const getLevelByNumber = (levelNumber: number): PlayerLevel | undefined => {
    return playerLevels.value.find((level) => level.level === levelNumber);
  };

  const getLevelExperience = (levelNumber: number): number => {
    const level = getLevelByNumber(levelNumber);
    return level?.exp || 0;
  };

  const getLevelBadgeImage = (levelNumber: number): string => {
    const level = getLevelByNumber(levelNumber);
    return level?.levelBadgeImageLink || "";
  };

  return {
    // Reactive data
    playerLevels,
    // Computed properties
    minPlayerLevel,
    maxPlayerLevel,
    // Loading states
    loading,
    error,
    // Utility functions
    getLevelByNumber,
    getLevelExperience,
    getLevelBadgeImage,
  };
}
