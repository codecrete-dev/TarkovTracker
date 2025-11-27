import type { ProgressData } from "./DataMigrationService";
import {
  DEFAULT_GAME_EDITION,
  DEFAULT_PMC_FACTION,
  GAME_EDITION_STRING_VALUES,
  normalizePMCFaction,
} from "./constants";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DataValidationUtils {
  /**
   * Check if user has significant progress data worth preserving
   */
  static hasSignificantProgress(data: ProgressData): boolean {
    return (
      data.level > 1 ||
      Object.keys(data.taskCompletions || {}).length > 0 ||
      Object.keys(data.taskObjectives || {}).length > 0 ||
      Object.keys(data.hideoutModules || {}).length > 0 ||
      Object.keys(data.hideoutParts || {}).length > 0
    );
  }
  /**
   * Validate that an object has the structure of progress data
   */
  static isValidProgressData(data: unknown): data is ProgressData {
    if (typeof data !== "object" || data === null) return false;
    const typed = data as ProgressData;
    return typeof typed.level === "number" && typed.level >= 1;
  }
  /**
   * Validate import file format structure
   */
  static validateImportFormat(
    parsedJson: unknown
  ): parsedJson is { type: string; data: ProgressData } {
    return (
      typeof parsedJson === "object" &&
      parsedJson !== null &&
      "type" in parsedJson &&
      (parsedJson as { type: unknown }).type === "tarkovtracker-migration" &&
      "data" in parsedJson &&
      this.isValidProgressData((parsedJson as { data: unknown }).data)
    );
  }
  /**
   * Validate API token format
   */
  static isValidApiToken(token: string): boolean {
    return typeof token === "string" && token.length > 10 && token.trim() === token;
  }
  /**
   * Check if data is worth migrating (has meaningful content)
   */
  static hasDataWorthMigrating(data: ProgressData): boolean {
    return (
      this.hasSignificantProgress(data) ||
      (data.displayName && data.displayName.trim().length > 0) ||
      data.gameEdition !== GAME_EDITION_STRING_VALUES[0] ||
      normalizePMCFaction(data.pmcFaction) !== DEFAULT_PMC_FACTION
    );
  }
  /**
   * Validate that an object looks like old API data
   */
  static isValidOldApiData(data: unknown): boolean {
    if (typeof data !== "object" || data === null) return false;
    const typed = data as Record<string, unknown>;
    // Must have at least level or playerLevel
    return (
      typeof typed.level === "number" ||
      typeof typed.playerLevel === "number" ||
      Array.isArray(typed.tasksProgress) ||
      Array.isArray(typed.hideoutModulesProgress)
    );
  }
  /**
   * Sanitize user input data
   */
  static sanitizeProgressData(data: ProgressData): ProgressData {
    return {
      ...data,
      level: Math.max(1, Math.min(79, Math.floor(data.level))),
      displayName: data.displayName?.trim().slice(0, 50) || "",
      gameEdition: GAME_EDITION_STRING_VALUES.includes(
        data.gameEdition as (typeof GAME_EDITION_STRING_VALUES)[number]
      )
        ? data.gameEdition
        : GAME_EDITION_STRING_VALUES[DEFAULT_GAME_EDITION - 1],
      pmcFaction: normalizePMCFaction(data.pmcFaction).toLowerCase(),
    };
  }
}
