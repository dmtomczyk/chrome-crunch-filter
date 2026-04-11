import type { ContentEntry, EpisodeSeenStatus, FollowedSeries } from './types';

export const FOLLOWED_SERIES_KEY = 'crunchyrollAudioFilter.followedSeries';

function extractSeriesIdFromUrl(seriesUrl: string): string {
  try {
    const url = new URL(seriesUrl, location.origin);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'series' && parts[1]) {
      return parts[1];
    }
  } catch {
    // ignore
  }

  return seriesUrl;
}

export function normalizeSeriesUrl(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl, location.origin);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'series' && parts[1] && parts[2]) {
      return `${url.origin}/series/${parts[1]}/${parts[2]}`;
    }

    return `${url.origin}${url.pathname}`;
  } catch {
    return rawUrl;
  }
}

export async function getFollowedSeriesMap(): Promise<Record<string, FollowedSeries>> {
  const stored = await chrome.storage.local.get(FOLLOWED_SERIES_KEY);
  return (stored[FOLLOWED_SERIES_KEY] as Record<string, FollowedSeries> | undefined) ?? {};
}

export async function listFollowedSeries(): Promise<FollowedSeries[]> {
  const followed = await getFollowedSeriesMap();
  return Object.values(followed).sort((left, right) => right.followedAt - left.followedAt);
}

export async function getFollowedSeries(seriesId: string): Promise<FollowedSeries | null> {
  const followed = await getFollowedSeriesMap();
  return followed[seriesId] ?? null;
}

export async function saveFollowedSeries(series: FollowedSeries): Promise<FollowedSeries> {
  const followed = await getFollowedSeriesMap();
  followed[series.seriesId] = series;
  await chrome.storage.local.set({ [FOLLOWED_SERIES_KEY]: followed });
  return series;
}

export async function removeFollowedSeries(seriesId: string): Promise<void> {
  const followed = await getFollowedSeriesMap();
  delete followed[seriesId];
  await chrome.storage.local.set({ [FOLLOWED_SERIES_KEY]: followed });
}

export function buildFollowedSeries(input: {
  title: string;
  seriesUrl: string;
  preferredAudio: string;
  newestEpisodeSeen?: number | null;
  newestReleaseDateSeen?: string | null;
}): FollowedSeries {
  const normalizedUrl = normalizeSeriesUrl(input.seriesUrl) ?? input.seriesUrl;
  const url = new URL(normalizedUrl, location.origin);
  const parts = url.pathname.split('/').filter(Boolean);

  return {
    seriesId: extractSeriesIdFromUrl(normalizedUrl),
    title: input.title,
    slug: parts[2],
    seriesUrl: normalizedUrl,
    preferredAudio: input.preferredAudio,
    followedAt: Date.now(),
    enabled: true,
    newestEpisodeSeen: input.newestEpisodeSeen ?? null,
    newestReleaseDateSeen: input.newestReleaseDateSeen ?? null
  };
}

export function matchesFollowedSeries(entry: Pick<ContentEntry, 'seriesId' | 'seriesUrl' | 'normalizedTitle'>, followed: FollowedSeries): boolean {
  if (entry.seriesId && entry.seriesId === followed.seriesId) {
    return true;
  }

  const normalizedEntryUrl = normalizeSeriesUrl(entry.seriesUrl);
  if (normalizedEntryUrl && normalizedEntryUrl === normalizeSeriesUrl(followed.seriesUrl)) {
    return true;
  }

  return entry.normalizedTitle.toLowerCase() === followed.title.toLowerCase();
}

export function isSeenForFollowedSeries(
  entry: Pick<ContentEntry, 'episodeNumber' | 'episodeKey'>,
  followed: FollowedSeries,
  episodeStatuses: Record<string, EpisodeSeenStatus>
): boolean {
  const explicit = entry.episodeKey ? episodeStatuses[entry.episodeKey] : undefined;
  if (explicit === 'seen') {
    return true;
  }

  if (explicit === 'unseen') {
    return false;
  }

  if (entry.episodeNumber != null && followed.newestEpisodeSeen != null && entry.episodeNumber <= followed.newestEpisodeSeen) {
    return true;
  }

  return false;
}

export function isNewForFollowedSeries(
  entry: Pick<ContentEntry, 'episodeNumber' | 'episodeKey'>,
  followed: FollowedSeries,
  episodeStatuses: Record<string, EpisodeSeenStatus>
): boolean {
  return !isSeenForFollowedSeries(entry, followed, episodeStatuses);
}
