import type { EntryRecord, PageCounts, UserSettings } from '../../shared/types';
import { applyEntryPresentation, setEntryId } from '../utils/dom';
import { filterEntries } from '../filters/filtering-engine';
import { mountFilterBar } from '../ui/injected-filter-bar';
import { renderBadges } from '../ui/badges';
import { buildEntryRecord } from '../utils/parsing';
import { collectBrowseRoots } from '../utils/selectors';

interface BrowsePageContext {
  settings: UserSettings;
  onPatch: (patch: Partial<UserSettings>) => void;
}

export function applyBrowsePage({ settings, onPatch }: BrowsePageContext): PageCounts {
  const records = collectBrowseRoots()
    .map((root) => buildEntryRecord(root, 'browse', settings))
    .filter((record): record is EntryRecord => Boolean(record));

  const decisions = filterEntries(records.map((record) => record.entry), settings);
  const decisionMap = new Map(decisions.map((decision) => [decision.entryId, decision]));

  let hidden = 0;
  let dimmed = 0;
  let preferred = 0;

  for (const record of records) {
    setEntryId(record.element, record.entry.id);
    renderBadges(record, settings);

    const decision = decisionMap.get(record.entry.id);
    const isHidden = decision?.hidden ?? false;
    const isDimmed = decision?.dimmed ?? false;

    applyEntryPresentation(record.element, isHidden, isDimmed);

    if (isHidden) hidden += 1;
    if (isDimmed) dimmed += 1;
    if (record.entry.isPreferredMatch) preferred += 1;
  }

  const counts: PageCounts = {
    total: records.length,
    hidden,
    dimmed,
    preferred
  };

  mountFilterBar({ pageType: 'browse', settings, counts, onPatch });
  return counts;
}
