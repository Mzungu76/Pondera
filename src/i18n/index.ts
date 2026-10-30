import { it, type Messages } from './it';

/**
 * Minimal i18n seam: UI code imports `t` and never hardcodes copy.
 * To add a language, implement `Messages` in a new file and select it here
 * (e.g. from navigator.language or a user setting).
 */
const locales: Record<string, Messages> = { it };

export const DEFAULT_LOCALE = 'it';
export const t: Messages = locales[DEFAULT_LOCALE];
