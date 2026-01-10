import type { TarkovDataQueryResult } from '~/types/tarkov';
import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { GraphQLResponseError, validateGraphQLResponse } from '~/server/utils/graphql-validation';
import { createLogger } from '~/server/utils/logger';
import { applyOverlay } from '~/server/utils/overlay';
import { CACHE_TTL_DEFAULT, validateGameMode } from '~/server/utils/tarkov-cache-config';
import { TARKOV_DATA_QUERY } from '~/server/utils/tarkov-queries';
import { sanitizeTaskData } from '~/server/utils/tarkov-sanitization';
import { API_SUPPORTED_LANGUAGES } from '~/utils/constants';
const logger = createLogger('TarkovData');
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs
  let lang = (query.lang as string)?.toLowerCase() || 'en';
  const gameMode = validateGameMode(query.gameMode as string);
  // Ensure valid language (fallback to English if unsupported)
  if (!API_SUPPORTED_LANGUAGES.includes(lang as (typeof API_SUPPORTED_LANGUAGES)[number])) {
    lang = 'en';
  }
  // Create cache key from parameters
  const cacheKey = `data-${lang}-${gameMode}`;
  // Create fetcher function for tarkov.dev API with overlay applied
  const baseFetcher = createTarkovFetcher(TARKOV_DATA_QUERY, { lang, gameMode });
  const fetcherWithOverlay = async () => {
    const rawResponse = await baseFetcher();
    // Validate GraphQL response has basic structure and data field
    // Allow partial data with errors - we'll sanitize them out
    try {
      validateGraphQLResponse<TarkovDataQueryResult>(rawResponse, logger, true);
    } catch (error) {
      if (error instanceof GraphQLResponseError) {
        logger.error('GraphQL validation failed:', error.message);
        if (error.errors) {
          logger.error('GraphQL errors detail:', JSON.stringify(error.errors, null, 2));
        }
      }
      throw error;
    }
    // At this point, TypeScript knows rawResponse has { data: TarkovDataQueryResult }
    // Sanitize data to remove invalid entries (e.g., null skill fields in skillLevelReward)
    // This allows us to handle partial data with errors from the API
    const sanitizedResponse = sanitizeTaskData(rawResponse);
    // Apply community overlay corrections (fixes incorrect minPlayerLevel values, etc.)
    try {
      return await applyOverlay(sanitizedResponse);
    } catch (overlayError) {
      logger.error('Failed to apply overlay:', overlayError);
      // Re-throw to prevent caching of potentially corrupted data
      throw overlayError;
    }
  };
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcherWithOverlay, CACHE_TTL_DEFAULT, {
    cacheKeyPrefix: 'tarkov',
  });
});
