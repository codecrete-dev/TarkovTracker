import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { TARKOV_ITEMS_QUERY } from '~/server/utils/tarkov-queries';
// Supported languages by tarkov.dev API
const SUPPORTED_LANGUAGES = [
  'cs',
  'de',
  'en',
  'es',
  'fr',
  'hu',
  'it',
  'ja',
  'ko',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'tr',
  'zh',
] as const;
// Cache TTL: 24 hours in seconds (items change less frequently)
const CACHE_TTL = 86400;
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs
  let lang = (query.lang as string)?.toLowerCase() || 'en';
  // Ensure valid language (fallback to English if unsupported)
  if (!SUPPORTED_LANGUAGES.includes(lang as (typeof SUPPORTED_LANGUAGES)[number])) {
    lang = 'en';
  }
  // Create cache key from parameters
  const cacheKey = `items-${lang}`;
  // Create fetcher function for tarkov.dev API
  const fetcher = createTarkovFetcher(TARKOV_ITEMS_QUERY, { lang });
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL, { cacheKeyPrefix: 'tarkov' });
});
