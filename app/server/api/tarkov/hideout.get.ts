import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { CACHE_TTL_DEFAULT, validateGameMode } from '~/server/utils/tarkov-cache-config';
import { API_SUPPORTED_LANGUAGES } from '~/utils/constants';
const TARKOV_HIDEOUT_QUERY = `
  query TarkovDataHideout($lang: LanguageCode, $gameMode: GameMode) {
    hideoutStations(lang: $lang, gameMode: $gameMode) {
      id
      name
      normalizedName
      imageLink
      levels {
        id
        level
        description
        constructionTime
          itemRequirements {
            id
            item {
              id
            }
            count
            quantity
            attributes {
              type
              name
              value
            }
          }
        stationLevelRequirements {
          id
          station {
            id
            name
          }
          level
        }
        skillRequirements {
          id
          name
          level
        }
        traderRequirements {
          id
          trader {
            id
            name
          }
          value
        }
        crafts {
          id
          duration
          requiredItems {
            item {
              id
            }
            count
            quantity
          }
          rewardItems {
            item {
              id
            }
            count
            quantity
          }
        }
      }
    }
  }
`;
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs
  let lang = (query.lang as string)?.toLowerCase() || 'en';
  const gameMode = validateGameMode(query.gameMode as string);
  // Ensure valid language (fallback to English if unsupported)
  if (!API_SUPPORTED_LANGUAGES.includes(lang as (typeof API_SUPPORTED_LANGUAGES)[number])) {
    lang = 'en';
  }
  // Create cache key from parameters (include language for localized data)
  const cacheKey = `hideout-${lang}-${gameMode}`;
  // Create fetcher function for tarkov.dev API
  const fetcher = createTarkovFetcher(TARKOV_HIDEOUT_QUERY, { lang, gameMode });
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL_DEFAULT, { cacheKeyPrefix: 'tarkov' });
});
