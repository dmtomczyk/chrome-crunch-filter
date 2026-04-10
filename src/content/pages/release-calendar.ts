import type { EntryRecord, PageCounts, UserSettings } from '../../shared/types';
import { applyEntryPresentation, setEntryId } from '../utils/dom';
import { buildEntryRecord } from '../utils/parsing';
import { collectReleaseRoots } from '../utils/selectors';
import { filterEntries } from '../filters/filtering-engine';
import { matchesPreferredAudioForFiltering } from '../filters/language-normalizer';
import { mountFilterBar } from '../ui/injected-filter-bar';
import { renderBadges } from '../ui/badges';

interface ReleaseCalendarPageContext {
  settings: UserSettings;
  onPatch: (patch: Partial<UserSettings>) => void;
}

export function applyReleaseCalendarPage({ settings, onPatch }: ReleaseCalendarPageContext): PageCounts {
  const records = collectReleaseRoots()
    .map((root) => buildEntryRecord(root, 'release-calendar', settings))
    .filter((record): record is EntryRecord => Boolean(record));

  const decisions = filterEntries(records.map((record) => record.entry), settings);
  const decisionMap = new Map(decisions.map((decision) => [decision.entryId, decision]));

  let hidden = 0;
  let dimmed = 0;
  let preferred = 0;

  for (const record of records) {
    record.entry.isPreferredMatch = matchesPreferredAudioForFiltering(record.entry, settings);
    setEntryId(record.element, record.entry.id);
    renderBadges(record, settings);

    const decision = decisionMap.get(record.entry.id);
    const isHidden = decision?.hidden ?? false;
    const isDimmed = decision?.dimmed ?? false;

    applyEntryPresentation(record.element, isHidden, isDimmed);

    if (isHidden) hidden += 1;
    if (isDimmed) dimmed += 1;
    if (matchesPreferredAudioForFiltering(record.entry, settings)) preferred += 1;
  }

  const counts: PageCounts = {
    total: records.length,
    hidden,
    dimmed,
    preferred
  };

  mountFilterBar({ pageType: 'release-calendar', settings, counts, onPatch });
  return counts;
}
