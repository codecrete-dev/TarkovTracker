import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { isSupportedLanguage } from '~/server/utils/language-helpers';
import { CACHE_TTL_EXTENDED } from '~/server/utils/tarkov-cache-config';
import { TARKOV_ITEMS_QUERY } from '~/server/utils/tarkov-queries';
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs - handle array case and coerce to string safely
  const rawLang = query.lang;
  const normalizedLang = String(
    Array.isArray(rawLang) ? (rawLang[0] ?? 'en') : (rawLang ?? 'en')
  ).toLowerCase();
  // Ensure valid language (fallback to English if unsupported)
  const lang = isSupportedLanguage(normalizedLang) ? normalizedLang : 'en';
  // Create cache key from parameters
  const cacheKey = `items-${lang}`;
  // Create fetcher function for tarkov.dev API
  const fetcher = createTarkovFetcher(TARKOV_ITEMS_QUERY, { lang });
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL_EXTENDED, {
    cacheKeyPrefix: 'tarkov',
  });
});
