import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { CACHE_TTL_EXTENDED } from '~/server/utils/tarkov-cache-config';
import { TARKOV_PRESTIGE_QUERY } from '~/server/utils/tarkov-queries';
import { API_SUPPORTED_LANGUAGES } from '~/utils/constants';
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize language input
  let lang = (query.lang as string)?.toLowerCase() || 'en';
  // Ensure valid language (fallback to English if unsupported)
  if (!API_SUPPORTED_LANGUAGES.includes(lang as (typeof API_SUPPORTED_LANGUAGES)[number])) {
    lang = 'en';
  }
  // Create cache key from parameters (prestige is not game-mode specific)
  const cacheKey = `prestige-${lang}`;
  // Create fetcher function for tarkov.dev API
  const fetcher = createTarkovFetcher(TARKOV_PRESTIGE_QUERY, { lang });
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL_EXTENDED, {
    cacheKeyPrefix: 'tarkov',
  });
});
