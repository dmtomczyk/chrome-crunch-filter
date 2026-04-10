export type PageType =
  | 'release-calendar'
  | 'browse'
  | 'title-page'
  | 'watchlist'
  | 'unsupported';

export type VariantType = 'sub' | 'dub' | 'mixed' | 'unknown';

export interface ReleaseCalendarFilters {
  premieresOnly: boolean;
  hideWatched: boolean;
  hideRecapsAndSpecials: boolean;
}

export interface WatchlistTriageSettings {
  enabled: boolean;
  unwatchedOnly: boolean;
}

export interface FeatureFlags {
  inlineBadges: boolean;
  watchlistTriage: boolean;
  debug: boolean;
}

export interface UserSettings {
  enabled: boolean;
  showOnlySelectedLanguages: boolean;
  preferredAudioLanguages: string[];
  preferredSubtitleLanguages: string[];
  dimInsteadOfHide: boolean;
  releaseCalendarFilters: ReleaseCalendarFilters;
  watchlistTriageSettings: WatchlistTriageSettings;
  spoilerModeEnabled: boolean;
  featureFlags: FeatureFlags;
}

export interface ContentEntry {
  id: string;
  rawTitle: string;
  normalizedTitle: string;
  seasonLabel?: string;
  episodeLabel?: string;
  pageType: PageType;
  url: string;
  detectedAudioLanguages: string[];
  detectedSubtitleLanguages: string[];
  detectedVariantType: VariantType;
  isPreferredMatch: boolean;
  isLikelyDuplicateOf?: string;
  isWatchlistItem: boolean;
  isWatched: boolean | null;
  isPremiere: boolean | null;
  isRecap: boolean | null;
  confidence: number;
  textBlob: string;
  duplicateKey: string;
}

export interface EntryRecord {
  entry: ContentEntry;
  element: HTMLElement;
  titleElement?: HTMLElement | null;
  linkElement?: HTMLAnchorElement | null;
}

export interface FilterDecision {
  entryId: string;
  hidden: boolean;
  dimmed: boolean;
  reason?: string;
}

export interface PageCounts {
  total: number;
  hidden: number;
  dimmed: number;
  preferred: number;
}

export interface LocalUserTag {
  titleKey: string;
  localTag: 'watching' | 'paused' | 'backlog' | 'dropped' | 'seasonal-priority';
  pinned?: boolean;
  archived?: boolean;
  priority?: number;
  notes?: string;
}
