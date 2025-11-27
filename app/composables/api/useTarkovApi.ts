import { ref, computed, onMounted } from "vue";
import { useSafeLocale, extractLanguageCode } from "@/composables/utils/i18nHelpers";
import type { StaticMapData } from "@/types/tarkov";
import mapsData from "./maps.json";
import { API_SUPPORTED_LANGUAGES, LOCALE_TO_API_MAPPING } from "@/utils/constants";

// Singleton state
const availableLanguages = ref<string[]>([...API_SUPPORTED_LANGUAGES]);
const staticMapData = ref<StaticMapData | null>(null);

// Map data - now served locally
let mapPromise: Promise<StaticMapData> | null = null;
/**
 * Loads static map data from local source
 */
async function loadStaticMaps(): Promise<StaticMapData> {
  if (!mapPromise) {
    mapPromise = Promise.resolve(mapsData as StaticMapData);
  }
  return mapPromise;
}

/**
 * Composable for managing Tarkov API queries and language detection
 */
export function useTarkovApi() {
  // Use safe locale helper to avoid i18n context issues
  const locale = useSafeLocale();
  const languageCode = computed(() => {
    // First check explicit mapping (e.g. uk -> en)
    const mappedCode = LOCALE_TO_API_MAPPING[locale.value];
    if (mappedCode) {
      return mappedCode;
    }
    // Otherwise verify against supported languages
    return extractLanguageCode(locale.value, availableLanguages.value);
  });

  // Load static map data on mount
  onMounted(async () => {
    if (!staticMapData.value) {
      staticMapData.value = await loadStaticMaps();
    }
  });

  return {
    availableLanguages: availableLanguages,
    languageCode,
    staticMapData,
    loadStaticMaps,
  };
}
