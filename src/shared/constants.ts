import type { UserSettings } from './types';

export const STORAGE_KEY = 'crunchyrollSeasonalCleaner.settings';
export const UI_ROOT_ATTR = 'data-ccsc-root';
export const ENTRY_ID_ATTR = 'data-ccsc-entry-id';

export const LANGUAGE_OPTIONS = [
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'en-US', label: 'English' },
  { code: 'es-LA', label: 'Spanish (LatAm)' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'ar-ME', label: 'Arabic' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'ru-RU', label: 'Russian' },
  { code: 'th-TH', label: 'Thai' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'zh-TW', label: 'Chinese (Taiwan)' }
] as const;

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  showOnlySelectedLanguages: true,
  preferredAudioLanguages: ['ja-JP'],
  preferredSubtitleLanguages: ['en-US'],
  dimInsteadOfHide: false,
  releaseCalendarFilters: {
    followedOnly: false,
    premieresOnly: false,
    hideWatched: false,
    hideRecapsAndSpecials: true
  },
  watchlistTriageSettings: {
    enabled: false,
    unwatchedOnly: false
  },
  spoilerModeEnabled: false,
  featureFlags: {
    inlineBadges: false,
    watchlistTriage: false,
    debug: false
  }
};
