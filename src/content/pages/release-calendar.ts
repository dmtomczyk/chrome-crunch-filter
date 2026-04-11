import type { EntryRecord, FollowedSeries, PageCounts, UserSettings } from '../../shared/types';
import { UI_ROOT_ATTR } from '../../shared/constants';
import { applyEntryPresentation, setEntryId } from '../utils/dom';
import { buildEntryRecord } from '../utils/parsing';
import { collectReleaseRoots } from '../utils/selectors';
import { filterEntries } from '../filters/filtering-engine';
import { matchesPreferredAudioForFiltering } from '../filters/language-normalizer';
import { mountFilterBar } from '../ui/injected-filter-bar';
import { renderBadges } from '../ui/badges';
import { isNewForFollowedSeries, isSeenForFollowedSeries, listFollowedSeries, matchesFollowedSeries } from '../../shared/followed-series';
import { getEpisodeStateMap } from '../../shared/episode-state';

interface ReleaseCalendarPageContext {
  settings: UserSettings;
  onPatch: (patch: Partial<UserSettings>) => void;
}

function findFollowedSeries(entry: EntryRecord['entry'], followedSeries: FollowedSeries[]): FollowedSeries | null {
  return followedSeries.find((followed) => followed.enabled && matchesFollowedSeries(entry, followed)) ?? null;
}

async function renderFollowState(
  record: EntryRecord,
  followed: FollowedSeries | null,
  episodeStatuses: Record<string, 'seen' | 'unseen'>
): Promise<void> {
  record.element.classList.remove('ccsc-followed', 'ccsc-followed-new', 'ccsc-followed-seen');
  record.element.querySelectorAll('.ccsc-follow-chip-group').forEach((node) => node.remove());

  if (!followed) {
    return;
  }

  const isSeen = isSeenForFollowedSeries(record.entry, followed, episodeStatuses);
  const isNew = isNewForFollowedSeries(record.entry, followed, episodeStatuses);
  record.element.classList.add('ccsc-followed');
  record.element.classList.toggle('ccsc-followed-new', isNew);
  record.element.classList.toggle('ccsc-followed-seen', isSeen);

  const mountTarget = record.titleElement ?? record.element.firstElementChild;
  if (!mountTarget) {
    return;
  }

  const chipGroup = document.createElement('div');
  chipGroup.className = 'ccsc-follow-chip-group';
  chipGroup.setAttribute(UI_ROOT_ATTR, 'true');

  const followingChip = document.createElement('span');
  followingChip.className = 'ccsc-follow-badge ccsc-follow-badge--following';
  followingChip.setAttribute(UI_ROOT_ATTR, 'true');
  followingChip.textContent = 'Following';
  chipGroup.appendChild(followingChip);

  if (isSeen || isNew) {
    const statusChip = document.createElement('span');
    statusChip.className = `ccsc-follow-badge ${isSeen ? 'ccsc-follow-badge--seen' : 'ccsc-follow-badge--new'}`;
    statusChip.setAttribute(UI_ROOT_ATTR, 'true');
    statusChip.textContent = isSeen ? 'Seen' : 'New for you';
    chipGroup.appendChild(statusChip);
  }

  mountTarget.insertAdjacentElement('afterend', chipGroup);
}

export async function applyReleaseCalendarPage({ settings, onPatch }: ReleaseCalendarPageContext): Promise<PageCounts> {
  const records = collectReleaseRoots()
    .map((root) => buildEntryRecord(root, 'release-calendar', settings))
    .filter((record): record is EntryRecord => Boolean(record));

  const followedSeries = await listFollowedSeries();
  const episodeStateMap = await getEpisodeStateMap();
  const decisions = filterEntries(records.map((record) => record.entry), settings);
  const decisionMap = new Map(decisions.map((decision) => [decision.entryId, decision]));

  let hidden = 0;
  let dimmed = 0;
  let preferred = 0;

  for (const record of records) {
    record.entry.isPreferredMatch = matchesPreferredAudioForFiltering(record.entry, settings);
    const followed = findFollowedSeries(record.entry, followedSeries);
    const episodeStatuses = episodeStateMap[followed?.seriesId ?? '']?.statuses ?? {};
    setEntryId(record.element, record.entry.id);
    renderBadges(record, settings);
    await renderFollowState(record, followed, episodeStatuses);

    const decision = decisionMap.get(record.entry.id);
    let isHidden = decision?.hidden ?? false;
    let isDimmed = decision?.dimmed ?? false;

    if (settings.releaseCalendarFilters.followedOnly && !followed) {
      isHidden = !settings.dimInsteadOfHide;
      isDimmed = settings.dimInsteadOfHide;
    }

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
