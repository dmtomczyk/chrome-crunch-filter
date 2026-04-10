import type { ContentEntry, FilterDecision, UserSettings } from '../../shared/types';
import { groupByDuplicateKey } from './duplicate-detector';
import { matchesPreferredAudioForFiltering, matchesPreferredLanguages } from './language-normalizer';

function rankEntry(entry: ContentEntry, settings: UserSettings): number {
  let score = 0;

  if (matchesPreferredLanguages(entry, settings)) {
    score += 100;
  }

  if (entry.isWatched === false) {
    score += 8;
  }

  if (entry.isPremiere) {
    score += 5;
  }

  return score + Math.round(entry.confidence * 20);
}

function shouldHideForPageFilters(entry: ContentEntry, settings: UserSettings): string | null {
  if (entry.pageType !== 'release-calendar') {
    return null;
  }

  if (settings.showOnlySelectedLanguages && !matchesPreferredAudioForFiltering(entry, settings)) {
    return 'non-preferred-audio';
  }

  if (settings.releaseCalendarFilters.hideRecapsAndSpecials && entry.isRecap) {
    return 'recap-or-special';
  }

  if (settings.releaseCalendarFilters.hideWatched && entry.isWatched === true) {
    return 'watched';
  }

  if (settings.releaseCalendarFilters.premieresOnly && entry.isPremiere === false) {
    return 'not-premiere';
  }

  return null;
}

export function filterEntries(entries: ContentEntry[], settings: UserSettings): FilterDecision[] {
  if (!settings.enabled) {
    return entries.map((entry) => ({
      entryId: entry.id,
      hidden: false,
      dimmed: false
    }));
  }

  const decisions = new Map<string, FilterDecision>();
  const groups = groupByDuplicateKey(entries);

  for (const groupEntries of groups.values()) {
    const sorted = [...groupEntries].sort((left, right) => rankEntry(right, settings) - rankEntry(left, settings));
    const survivor = sorted[0];
    const groupHasPreferredMatch = groupEntries.some((entry) => matchesPreferredLanguages(entry, settings));

    for (const entry of groupEntries) {
      let reason = shouldHideForPageFilters(entry, settings);
      let hidden = false;
      let dimmed = false;

      if (entry.pageType === 'release-calendar') {
        if (reason) {
          hidden = !settings.dimInsteadOfHide;
          dimmed = settings.dimInsteadOfHide;
        }

        decisions.set(entry.id, {
          entryId: entry.id,
          hidden,
          dimmed,
          reason: reason ?? undefined
        });
        continue;
      }

      if (
        !reason &&
        settings.showOnlySelectedLanguages &&
        groupHasPreferredMatch &&
        !matchesPreferredLanguages(entry, settings) &&
        entry.confidence >= 0.45
      ) {
        reason = 'non-preferred-language';
      }

      const hasMeaningfulDuplicateGroup =
        groupEntries.length > 1 &&
        groupEntries.some(
          (item) =>
            item.detectedVariantType !== survivor.detectedVariantType ||
            item.url !== survivor.url ||
            item.detectedAudioLanguages.join(',') !== survivor.detectedAudioLanguages.join(',')
        );

      if (!reason && hasMeaningfulDuplicateGroup && entry.id !== survivor.id) {
        if (settings.showOnlySelectedLanguages && groupHasPreferredMatch && !matchesPreferredLanguages(entry, settings)) {
          reason = 'non-preferred-language';
        }
      }

      if (reason) {
        hidden = !settings.dimInsteadOfHide;
        dimmed = settings.dimInsteadOfHide;
      }

      decisions.set(entry.id, {
        entryId: entry.id,
        hidden,
        dimmed,
        reason: reason ?? undefined
      });
    }
  }

  return entries.map((entry) => decisions.get(entry.id) ?? { entryId: entry.id, hidden: false, dimmed: false });
}
