import type { ContentEntry, EntryRecord, PageType, UserSettings } from '../../shared/types';
import { slugify, textOf, findFirstAnchor } from './dom';
import { buildDuplicateKey } from '../filters/duplicate-detector';
import {
  applyExplicitAudioLanguageHint,
  detectLanguages,
  matchesPreferredLanguages,
  normalizeCrunchyrollLocaleHint,
  detectCalendarAudioLanguages,
  normalizeTitle
} from '../filters/language-normalizer';
import { normalizeSeriesUrl } from '../../shared/followed-series';
import { findTitleHeading } from './selectors';

const EPISODE_PATTERN = /\b(E\d{1,4}|Episode\s+\d{1,4})\b/i;
const EPISODE_NUMBER_PATTERN = /\b(?:E|Episode\s+)(\d{1,4})\b/i;
const SEASON_PATTERN = /\b(Season\s+\d+[^\n|]*)\b/i;
const DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;
const TIME_PATTERN = /^\d{1,2}:\d{2}\s*(am|pm)$/i;

function isReleaseCalendarNoiseLine(line: string): boolean {
  return (
    TIME_PATTERN.test(line) ||
    /^premiere$/i.test(line) ||
    /^episode\s+\d+\s+available$/i.test(line) ||
    /^schedule coming soon$/i.test(line) ||
    /^available$/i.test(line) ||
    /^\d+\s+available$/i.test(line)
  );
}

function extractReleaseCalendarTitle(root: HTMLElement): string | null {
  // Modern cards expose a series title separately from their time and episode metadata.
  const title = root.querySelector<HTMLElement>(
    '[data-t="series-page-link"], [data-t="series-title"], [class*="series-title"], [class*="secondary-title"], a[href*="/series/"][class*="title-link"]'
  );
  if (textOf(title)) {
    return textOf(title);
  }

  const lines = root.innerText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !DATE_PATTERN.test(line))
    .filter((line) => !isReleaseCalendarNoiseLine(line));

  const titleLine = lines.find((line) => {
    if (!/[a-z]/i.test(line)) {
      return false;
    }

    if (/^season\s+\d+(?:\s*\([^)]*\))?$/i.test(line)) {
      return false;
    }

    if (/^episode\s+\d+/i.test(line)) {
      return false;
    }

    return true;
  });

  if (!titleLine) {
    return null;
  }

  const nextLine = lines[lines.indexOf(titleLine) + 1];
  if (nextLine && /^season\s+\d+/i.test(nextLine) && !/season\s+\d+/i.test(titleLine)) {
    return `${titleLine} ${nextLine}`;
  }

  return titleLine;
}

function guessTitle(root: HTMLElement, pageType: PageType): string {
  if (pageType === 'release-calendar') {
    const calendarTitle = extractReleaseCalendarTitle(root);
    if (calendarTitle) {
      return calendarTitle;
    }
  }

  if (pageType === 'title-page') {
    const titlePagePreferred = [
      root.querySelector<HTMLElement>('[data-t="series-title"]'),
      root.querySelector<HTMLElement>('[class*="secondary-title"]'),
      findTitleHeading()
    ].find((node) => textOf(node).length > 0);

    if (titlePagePreferred) {
      return textOf(titlePagePreferred);
    }
  }

  const preferred = [
    root.querySelector<HTMLElement>('a[href*="/series/"][class*="title-link"]'),
    root.querySelector<HTMLElement>('[class*="secondary-title"]'),
    root.querySelector<HTMLElement>('[class*="series-title"]'),
    root.querySelector<HTMLElement>('[class*="title-link"]'),
    root.querySelector<HTMLElement>('h1, h2, h3'),
    root.querySelector<HTMLElement>('[class*="title"]'),
    root.querySelector<HTMLElement>('a[href*="/series/"]'),
    root.querySelector<HTMLElement>('a[href*="/watch/"]')
  ].find((node) => textOf(node).length > 0);

  if (preferred) {
    return textOf(preferred);
  }

  const lines = root.innerText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !DATE_PATTERN.test(line));

  return lines[0] ?? 'Untitled';
}

function detectWatched(root: HTMLElement, text: string): boolean | null {
  const classBlob = `${root.className} ${root.innerHTML.slice(0, 1000)}`.toLowerCase();
  if (/watched|completed|resume/i.test(text) || /watched|completed|progress|resume/.test(classBlob)) {
    return true;
  }

  return null;
}

function detectPremiere(text: string, episodeLabel?: string): boolean | null {
  if (/premiere/i.test(text)) {
    return true;
  }

  if (episodeLabel && /e1\b|episode\s+1\b/i.test(episodeLabel)) {
    return true;
  }

  if (/\bE\d+/i.test(text)) {
    return false;
  }

  return null;
}

function detectRecap(text: string): boolean | null {
  if (/\b(recap|special|ova|bonus|behind the scenes|digest)\b/i.test(text)) {
    return true;
  }

  return null;
}

function extractSeriesUrl(root: HTMLElement, pageType: PageType): string | undefined {
  if (pageType === 'title-page') {
    return normalizeSeriesUrl(location.href);
  }

  const anchor = root.querySelector<HTMLAnchorElement>('a[href*="/series/"]');
  return normalizeSeriesUrl(anchor?.href);
}

function extractSeriesId(seriesUrl: string | undefined): string | undefined {
  if (!seriesUrl) {
    return undefined;
  }

  try {
    const url = new URL(seriesUrl, location.origin);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'series') {
      return parts[1];
    }
  } catch {
    // ignore
  }

  return undefined;
}

function buildStableEntryId(root: HTMLElement, pageType: PageType, normalizedTitle: string, linkHref: string, seasonLabel?: string, episodeLabel?: string): string {
  const popoverUrl = root.getAttribute('data-popover-url') ?? '';
  const groupId = root.getAttribute('data-group-id') ?? '';
  const episodeNum = root.getAttribute('data-episode-num') ?? '';
  const citeName = textOf(root.querySelector('cite[itemprop="name"], [itemprop="name"]'));
  const uniqueVariantHint = popoverUrl || citeName || root.getAttribute('data-slug') || root.innerText.slice(0, 120);

  return `${pageType}-${slugify(normalizedTitle)}-${slugify(linkHref)}-${slugify(episodeLabel ?? seasonLabel ?? '')}-${slugify(groupId)}-${slugify(episodeNum)}-${slugify(uniqueVariantHint)}`;
}

function buildEpisodeKey(input: {
  seriesId?: string;
  normalizedTitle?: string;
  url: string;
  episodeNumber?: number | null;
}): string | undefined {
  if (input.seriesId && input.episodeNumber != null) {
    return `${input.seriesId}::episode-${input.episodeNumber}`;
  }

  if (input.normalizedTitle && input.episodeNumber != null) {
    return `${slugify(input.normalizedTitle)}::episode-${input.episodeNumber}`;
  }

  if (/\/watch\//.test(input.url)) {
    try {
      const url = new URL(input.url, location.origin);
      return `${url.origin}${url.pathname}`;
    } catch {
      return input.url;
    }
  }

  return undefined;
}

function buildReleaseKey(input: {
  pageType: PageType;
  seriesId?: string;
  normalizedTitle: string;
  episodeNumber?: number | null;
  episodeLabel?: string;
  audioKey?: string | null;
  url: string;
  groupId?: string;
  episodeNumAttr?: string;
}): string | undefined {
  if (input.pageType !== 'release-calendar') {
    return undefined;
  }

  const titleKey = slugify(input.seriesId ?? input.normalizedTitle);
  const episodeKey = input.groupId || input.episodeNumAttr || String(input.episodeNumber ?? '') || slugify(input.episodeLabel ?? input.url);
  const audioKey = slugify(input.audioKey ?? 'unknown');

  return `${titleKey}::${slugify(episodeKey)}::${audioKey}`;
}

export function buildEntryRecord(root: HTMLElement, pageType: PageType, settings: UserSettings): EntryRecord | null {
  const link = findFirstAnchor(root, [/\/watch\//, /\/series\//, /\/browse\//]);
  const rawTitle = guessTitle(root, pageType);
  const textBlob = root.innerText.replace(/\s+/g, ' ').trim();

  if (!link || !rawTitle || !textBlob) {
    return null;
  }

  const seasonLabel = textBlob.match(SEASON_PATTERN)?.[1];
  const episodeLabel = textBlob.match(EPISODE_PATTERN)?.[1];
  const episodeNumber = Number(textBlob.match(EPISODE_NUMBER_PATTERN)?.[1] ?? '') || null;
  const normalizedTitle = normalizeTitle(rawTitle);
  const seriesUrl = extractSeriesUrl(root, pageType);
  const seriesId = extractSeriesId(seriesUrl);
  const citeName = textOf(root.querySelector('cite[itemprop="name"], [itemprop="name"]'));
  const groupId = root.getAttribute('data-group-id') ?? '';
  const episodeNumAttr = root.getAttribute('data-episode-num') ?? '';
  const localeHint = normalizeCrunchyrollLocaleHint(root.getAttribute('data-popover-url'));
  let detection = detectLanguages(`${rawTitle} ${citeName} ${textBlob}`);

  if (localeHint) {
    detection = applyExplicitAudioLanguageHint(detection, localeHint);
  }

  // A modern release can group multiple audio tracks. Its explicit list takes
  // precedence over both title heuristics and the single locale in the watch URL.
  const audioLabel = pageType === 'release-calendar'
    ? root.querySelector('[aria-label^="Audio languages:"]')?.getAttribute('aria-label')
    : null;
  const calendarAudio = detectCalendarAudioLanguages(audioLabel);
  if (calendarAudio.length > 0) {
    detection = {
      ...detection,
      audioLanguages: calendarAudio,
      variantType: calendarAudio.includes('ja-JP') ? (calendarAudio.length > 1 ? 'mixed' : 'sub') : 'dub',
      confidence: 0.99
    };
  }

  const entry: ContentEntry = {
    id: buildStableEntryId(root, pageType, normalizedTitle, link.href, seasonLabel, episodeLabel),
    rawTitle,
    normalizedTitle,
    seasonLabel,
    episodeLabel,
    episodeNumber,
    episodeKey: buildEpisodeKey({
      seriesId,
      normalizedTitle,
      url: link.href,
      episodeNumber
    }),
    releaseKey: buildReleaseKey({
      pageType,
      seriesId,
      normalizedTitle,
      episodeNumber,
      episodeLabel,
      audioKey: localeHint ?? detection.audioLanguages[0] ?? null,
      url: link.href,
      groupId,
      episodeNumAttr
    }),
    pageType,
    url: link.href,
    seriesUrl,
    seriesId,
    detectedAudioLanguages: detection.audioLanguages,
    detectedSubtitleLanguages: detection.subtitleLanguages,
    detectedVariantType: detection.variantType,
    isPreferredMatch: false,
    isLikelyDuplicateOf: undefined,
    isWatchlistItem: pageType === 'watchlist',
    isWatched: detectWatched(root, textBlob),
    isPremiere: detectPremiere(textBlob, episodeLabel),
    isRecap: detectRecap(textBlob),
    confidence: detection.confidence,
    textBlob,
    duplicateKey: ''
  };

  entry.isPreferredMatch = matchesPreferredLanguages(entry, settings);
  entry.duplicateKey = buildDuplicateKey(entry);

  return {
    entry,
    element: root,
    titleElement:
      root.querySelector<HTMLElement>('[data-t="episode-title"], a[class*="playable-card__title-link"], a[class*="title-link"], [class*="title"], h1, h2, h3') ??
      (root.firstElementChild as HTMLElement | null),
    linkElement: link
  };
}
