import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
const TARKOV_HIDEOUT_QUERY = `
  query TarkovDataHideout($gameMode: GameMode) {
    hideoutStations(gameMode: $gameMode) {
      id
      name
      normalizedName
      levels {
        id
        level
        description
        constructionTime
        itemRequirements {
          id
          item {
            id
            shortName
            name
            link
            wikiLink
            image512pxLink
            gridImageLink
            baseImageLink
            iconLink
            image8xLink
            backgroundColor
          }
          count
          quantity
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
              shortName
              name
              link
              wikiLink
              image512pxLink
              gridImageLink
              baseImageLink
              iconLink
              image8xLink
              backgroundColor
            }
            count
            quantity
          }
          rewardItems {
            item {
              id
              shortName
              name
              link
              wikiLink
              image512pxLink
              gridImageLink
              baseImageLink
              iconLink
              image8xLink
              backgroundColor
            }
            count
            quantity
          }
        }
      }
    }
  }
`;
// Valid game modes
const VALID_GAME_MODES = ['regular', 'pve'] as const;
// Cache TTL: 12 hours in seconds
const CACHE_TTL = 43200;
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs
  let gameMode = (query.gameMode as string)?.toLowerCase() || 'regular';
  // Ensure valid game mode
  if (!VALID_GAME_MODES.includes(gameMode as (typeof VALID_GAME_MODES)[number])) {
    gameMode = 'regular';
  }
  // Create cache key from parameters
  const cacheKey = `hideout-${gameMode}`;
  // Create fetcher function for tarkov.dev API
  const fetcher = createTarkovFetcher(TARKOV_HIDEOUT_QUERY, { gameMode });
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL, { cacheKeyPrefix: 'tarkov' });
});
