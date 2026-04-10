import type { ContentEntry } from '../../shared/types';
import { normalizeVariantLabel } from './language-normalizer';

function normalizeDetailLabel(value: string | undefined): string {
  return (normalizeVariantLabel(value) ?? value ?? '').toLowerCase().trim();
}

export function buildDuplicateKey(entry: Pick<ContentEntry, 'normalizedTitle' | 'episodeLabel' | 'seasonLabel' | 'pageType'>): string {
  const titlePart = entry.normalizedTitle.toLowerCase().trim();

  if (entry.pageType === 'release-calendar') {
    return `${titlePart}::release-calendar`;
  }

  const detailPart = normalizeDetailLabel(entry.episodeLabel) || normalizeDetailLabel(entry.seasonLabel) || entry.pageType;
  return `${titlePart}::${detailPart}`;
}

export function groupByDuplicateKey<T extends { duplicateKey: string }>(entries: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const entry of entries) {
    const current = map.get(entry.duplicateKey) ?? [];
    current.push(entry);
    map.set(entry.duplicateKey, current);
  }

  return map;
}
