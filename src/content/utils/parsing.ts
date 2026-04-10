import type { ContentEntry, EntryRecord, PageType, UserSettings } from '../../shared/types';
import { slugify, textOf, findFirstAnchor } from './dom';
import { buildDuplicateKey } from '../filters/duplicate-detector';
import {
  applyExplicitAudioLanguageHint,
  detectLanguages,
  matchesPreferredLanguages,
  normalizeCrunchyrollLocaleHint,
  normalizeTitle
} from '../filters/language-normalizer';
import { findTitleHeading } from './selectors';

const EPISODE_PATTERN = /\b(E\d{1,4}|Episode\s+\d{1,4})\b/i;
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

function buildStableEntryId(root: HTMLElement, pageType: PageType, normalizedTitle: string, linkHref: string, seasonLabel?: string, episodeLabel?: string): string {
  const popoverUrl = root.getAttribute('data-popover-url') ?? '';
  const groupId = root.getAttribute('data-group-id') ?? '';
  const episodeNum = root.getAttribute('data-episode-num') ?? '';
  const citeName = textOf(root.querySelector('cite[itemprop="name"], [itemprop="name"]'));
  const uniqueVariantHint = popoverUrl || citeName || root.getAttribute('data-slug') || root.innerText.slice(0, 120);

  return `${pageType}-${slugify(normalizedTitle)}-${slugify(linkHref)}-${slugify(episodeLabel ?? seasonLabel ?? '')}-${slugify(groupId)}-${slugify(episodeNum)}-${slugify(uniqueVariantHint)}`;
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
  const normalizedTitle = normalizeTitle(rawTitle);
  const citeName = textOf(root.querySelector('cite[itemprop="name"], [itemprop="name"]'));
  const localeHint = normalizeCrunchyrollLocaleHint(root.getAttribute('data-popover-url'));
  let detection = detectLanguages(`${rawTitle} ${citeName} ${textBlob}`);

  if (localeHint) {
    detection = applyExplicitAudioLanguageHint(detection, localeHint);
  }

  const entry: ContentEntry = {
    id: buildStableEntryId(root, pageType, normalizedTitle, link.href, seasonLabel, episodeLabel),
    rawTitle,
    normalizedTitle,
    seasonLabel,
    episodeLabel,
    pageType,
    url: link.href,
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
