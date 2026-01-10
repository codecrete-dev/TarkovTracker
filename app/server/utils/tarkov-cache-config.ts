/**
 * Centralized cache TTL configuration for Tarkov API endpoints
 * All values are in seconds
 */
import { logger } from './logger';
// 12 hours - for data that changes with game updates
export const CACHE_TTL_DEFAULT = 43200 as const;
// 24 hours - for relatively static data like items catalog
export const CACHE_TTL_EXTENDED = 86400 as const;
// Valid game modes for API requests
export const VALID_GAME_MODES = ['regular', 'pve'] as const;
export type ValidGameMode = (typeof VALID_GAME_MODES)[number];
const isValidGameMode = (value: string): value is ValidGameMode =>
  (VALID_GAME_MODES as ReadonlyArray<string>).includes(value);
/**
 * Validates and returns a valid game mode, defaulting to 'regular'
 */
export function validateGameMode(gameMode: string | undefined): ValidGameMode {
  const normalized = gameMode?.toLowerCase() || 'regular';
  if (isValidGameMode(normalized)) {
    return normalized;
  }
  logger.debug('[TarkovCache] Invalid game mode, falling back to regular', {
    input: gameMode,
    normalized,
  });
  return 'regular';
}
