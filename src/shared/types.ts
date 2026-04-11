export type PageType =
  | 'release-calendar'
  | 'browse'
  | 'title-page'
  | 'watch-page'
  | 'watchlist'
  | 'unsupported';

export type VariantType = 'sub' | 'dub' | 'mixed' | 'unknown';

export interface ReleaseCalendarFilters {
  followedOnly: boolean;
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
  episodeNumber?: number | null;
  episodeKey?: string;
  releaseKey?: string;
  pageType: PageType;
  url: string;
  seriesUrl?: string;
  seriesId?: string;
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

export interface FollowedSeries {
  seriesId: string;
  title: string;
  slug?: string;
  seriesUrl: string;
  preferredAudio: string;
  followedAt: number;
  enabled: boolean;
  newestEpisodeSeen?: number | null;
  newestReleaseDateSeen?: string | null;
  notes?: string;
}

export type EpisodeSeenStatus = 'seen' | 'unseen';

export interface EpisodeSeenState {
  seriesId: string;
  statuses: Record<string, EpisodeSeenStatus>;
  updatedAt: number;
}

export interface ReleaseSeenState {
  seriesId: string;
  seenReleaseKeys: string[];
  updatedAt: number;
}

export interface LocalUserTag {
  titleKey: string;
  localTag: 'watching' | 'paused' | 'backlog' | 'dropped' | 'seasonal-priority';
  pinned?: boolean;
  archived?: boolean;
  priority?: number;
  notes?: string;
}
