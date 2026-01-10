import { API_SUPPORTED_LANGUAGES } from '~/utils/constants';
/**
 * Type predicate to check if a language string is supported by the API
 */
export function isSupportedLanguage(
  lang: string
): lang is (typeof API_SUPPORTED_LANGUAGES)[number] {
  return (API_SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}
