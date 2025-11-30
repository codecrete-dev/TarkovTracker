import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { TARKOV_DATA_QUERY } from '~/server/utils/tarkov-queries';
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
// Valid game modes
const VALID_GAME_MODES = ['regular', 'pve'] as const;
// Cache TTL: 12 hours in seconds
const CACHE_TTL = 43200;
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs
  let lang = (query.lang as string)?.toLowerCase() || 'en';
  let gameMode = (query.gameMode as string)?.toLowerCase() || 'regular';
  // Ensure valid language (fallback to English if unsupported)
  if (!SUPPORTED_LANGUAGES.includes(lang as (typeof SUPPORTED_LANGUAGES)[number])) {
    lang = 'en';
  }
  // Ensure valid game mode
  if (!VALID_GAME_MODES.includes(gameMode as (typeof VALID_GAME_MODES)[number])) {
    gameMode = 'regular';
  }
  // Create cache key from parameters
  const cacheKey = `data-${lang}-${gameMode}`;
  // Create fetcher function for tarkov.dev API
  const fetcher = createTarkovFetcher(TARKOV_DATA_QUERY, { lang, gameMode });
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL, { cacheKeyPrefix: 'tarkov' });
});
