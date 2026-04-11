import type { EntryRecord, FollowedSeries, PageCounts, UserSettings } from '../../shared/types';
import { applyEntryPresentation, isVisible, setEntryId } from '../utils/dom';
import { filterEntries } from '../filters/filtering-engine';
import { mountFilterBar } from '../ui/injected-filter-bar';
import { renderBadges } from '../ui/badges';
import { buildEntryRecord } from '../utils/parsing';
import { collectTitleEpisodeRoots, findTitleHeading } from '../utils/selectors';
import { labelForLanguage } from '../filters/language-normalizer';
import { UI_ROOT_ATTR } from '../../shared/constants';
import { buildFollowedSeries, getFollowedSeries, removeFollowedSeries, saveFollowedSeries } from '../../shared/followed-series';
import { clearEpisodeSeenState, getEpisodeStatuses, setEpisodeSeenStatus } from '../../shared/episode-state';

interface TitlePageContext {
  settings: UserSettings;
  onPatch: (patch: Partial<UserSettings>) => void;
}

function decorateVariantControls(settings: UserSettings): void {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('main button, main a[href], main [role="button"]'));
  for (const element of candidates) {
    const text = element.innerText.replace(/\s+/g, ' ').trim();
    if (text.length === 0 || text.length > 80) {
      continue;
    }

    if (!/(dub|subtitled|subbed|audio|japanese|english|spanish|portuguese|french|german)/i.test(text)) {
      continue;
    }

    element.classList.add('ccsc-variant-option');

    if (settings.preferredAudioLanguages.some((code) => new RegExp(labelForLanguage(code), 'i').test(text))) {
      element.classList.add('ccsc-variant-option--preferred');
    } else {
      element.classList.remove('ccsc-variant-option--preferred');
    }
  }
}

function inferSeriesInfo(records: EntryRecord[]): { title: string; seriesUrl: string; newestEpisodeSeen: number | null } | null {
  const title = findTitleHeading()?.innerText.replace(/\s+/g, ' ').trim() || records[0]?.entry.normalizedTitle || records[0]?.entry.rawTitle;
  const seriesUrl = records.find((record) => record.entry.seriesUrl)?.entry.seriesUrl ?? `${location.origin}${location.pathname}`;
  const withEpisodeNumbers = records.filter((record) => record.entry.episodeNumber != null);
  const latestEpisode = withEpisodeNumbers.sort((left, right) => (right.entry.episodeNumber ?? 0) - (left.entry.episodeNumber ?? 0))[0];

  if (!title || !seriesUrl) {
    return null;
  }

  return {
    title,
    seriesUrl,
    newestEpisodeSeen: latestEpisode?.entry.episodeNumber ?? null
  };
}

function findTitleSummaryMountTarget(heading: HTMLElement): Element | null {
  return (
    heading.closest('[class*="hero"], [class*="banner"], [class*="header"]') ??
    heading.closest('section') ??
    heading.parentElement
  );
}

function renderEpisodeSeenControls(
  records: EntryRecord[],
  followedSeries: FollowedSeries | null,
  episodeStatuses: Record<string, 'seen' | 'unseen'>
): void {
  for (const record of records) {
    record.element.querySelectorAll('.ccsc-episode-toggle-row, .ccsc-episode-seen-toggle').forEach((node) => node.remove());

    if (!followedSeries || !record.entry.episodeKey) {
      continue;
    }

    const explicit = episodeStatuses[record.entry.episodeKey];
    const effectiveSeen =
      explicit === 'seen' ||
      (explicit !== 'unseen' &&
        record.entry.episodeNumber != null &&
        followedSeries.newestEpisodeSeen != null &&
        record.entry.episodeNumber <= followedSeries.newestEpisodeSeen);

    const row = document.createElement('div');
    row.className = 'ccsc-episode-toggle-row';
    row.setAttribute(UI_ROOT_ATTR, 'true');

    const label = document.createElement('span');
    label.className = 'ccsc-episode-toggle-label';
    label.setAttribute(UI_ROOT_ATTR, 'true');
    label.textContent = 'Tracking';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `ccsc-episode-seen-toggle ${effectiveSeen ? 'ccsc-episode-seen-toggle--seen' : 'ccsc-episode-seen-toggle--unseen'}`;
    toggle.setAttribute(UI_ROOT_ATTR, 'true');
    toggle.textContent = effectiveSeen ? 'Seen' : 'Unseen';
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void setEpisodeSeenStatus(followedSeries.seriesId, record.entry.episodeKey, effectiveSeen ? 'unseen' : 'seen');
    });

    row.append(label, toggle);
    record.element.appendChild(row);
  }
}

function mountTitleSummary(
  settings: UserSettings,
  records: EntryRecord[],
  followedSeries: FollowedSeries | null
): void {
  const heading = findTitleHeading();
  if (!heading) {
    return;
  }

  const mountTarget = findTitleSummaryMountTarget(heading);
  if (!mountTarget?.parentElement) {
    return;
  }

  let summary = document.getElementById('ccsc-title-summary') as HTMLElement | null;
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'ccsc-title-summary';
    summary.className = 'ccsc-title-summary';
    summary.setAttribute(UI_ROOT_ATTR, 'true');
    mountTarget.insertAdjacentElement('afterend', summary);
  }

  const nextEpisodeLink = records.find((record) => isVisible(record.element) && record.linkElement?.href.includes('/watch/'))?.linkElement;
  const preferredAudio = settings.preferredAudioLanguages.map(labelForLanguage).join(', ') || 'All';
  const followActionLabel = followedSeries ? 'Unfollow show' : 'Follow show';
  const latestKnownEpisode = followedSeries?.newestEpisodeSeen != null ? `Episode ${followedSeries.newestEpisodeSeen}` : 'Not set yet';

  summary.innerHTML = `
    <div class="ccsc-title-summary__header">
      <div>
        <div class="ccsc-title-summary__eyebrow">Series tools</div>
        <div class="ccsc-title-summary__title">Audio filter + follow status</div>
      </div>
      <div class="ccsc-title-summary__chips">
        <span class="ccsc-follow-badge ${followedSeries ? 'ccsc-follow-badge--following' : 'ccsc-follow-badge--neutral'}">${followedSeries ? 'Following' : 'Not followed'}</span>
        <span class="ccsc-follow-badge ccsc-follow-badge--audio">${preferredAudio}</span>
      </div>
    </div>
    <div class="ccsc-title-summary__grid">
      <div class="ccsc-title-summary__stat">
        <div class="ccsc-title-summary__label">Chosen audio</div>
        <div class="ccsc-title-summary__value">${preferredAudio}</div>
      </div>
      <div class="ccsc-title-summary__stat">
        <div class="ccsc-title-summary__label">Detected episode entries</div>
        <div class="ccsc-title-summary__value">${records.length}</div>
      </div>
      <div class="ccsc-title-summary__stat">
        <div class="ccsc-title-summary__label">Newest episode seen</div>
        <div class="ccsc-title-summary__value">${latestKnownEpisode}</div>
      </div>
      <div class="ccsc-title-summary__stat">
        <div class="ccsc-title-summary__label">Follow mode</div>
        <div class="ccsc-title-summary__value">${followedSeries ? 'Watching for new releases' : 'Ready to follow'}</div>
      </div>
    </div>
    <div class="ccsc-title-summary__actions">
      ${nextEpisodeLink ? `<button type="button" class="ccsc-next-button" data-next-url="${nextEpisodeLink.href}">Next episode I actually want</button>` : ''}
      ${followedSeries ? '<button type="button" class="ccsc-link-button" data-follow-action="reset-baseline">Mark series as watched</button>' : ''}
      <button type="button" class="ccsc-follow-button ${followedSeries ? 'ccsc-follow-button--active' : ''}" data-follow-action="toggle">
        ${followActionLabel}
      </button>
    </div>
  `;

  summary.querySelector<HTMLButtonElement>('.ccsc-next-button')?.addEventListener('click', () => {
    const url = summary?.querySelector<HTMLButtonElement>('.ccsc-next-button')?.dataset.nextUrl;
    if (url) {
      window.location.href = url;
    }
  });

  summary.querySelector<HTMLButtonElement>('[data-follow-action="toggle"]')?.addEventListener('click', async () => {
    const info = inferSeriesInfo(records);
    if (!info) {
      return;
    }

    if (followedSeries) {
      await removeFollowedSeries(followedSeries.seriesId);
      await clearEpisodeSeenState(followedSeries.seriesId);
    } else {
      await saveFollowedSeries(
        buildFollowedSeries({
          title: info.title,
          seriesUrl: info.seriesUrl,
          preferredAudio: settings.preferredAudioLanguages[0] ?? 'ja-JP',
          newestEpisodeSeen: info.newestEpisodeSeen
        })
      );
    }
  });

  summary.querySelector<HTMLButtonElement>('[data-follow-action="reset-baseline"]')?.addEventListener('click', async () => {
    const info = inferSeriesInfo(records);
    if (!info || !followedSeries) {
      return;
    }

    await saveFollowedSeries({
      ...followedSeries,
      preferredAudio: settings.preferredAudioLanguages[0] ?? followedSeries.preferredAudio,
      newestEpisodeSeen: info.newestEpisodeSeen,
      newestReleaseDateSeen: null
    });
    await clearEpisodeSeenState(followedSeries.seriesId);
  });
}

export async function applyTitlePage({ settings, onPatch }: TitlePageContext): Promise<PageCounts> {
  const records = collectTitleEpisodeRoots()
    .map((root) => buildEntryRecord(root, 'title-page', settings))
    .filter((record): record is EntryRecord => Boolean(record));

  const decisions = filterEntries(records.map((record) => record.entry), settings);
  const decisionMap = new Map(decisions.map((decision) => [decision.entryId, decision]));
  const seriesInfo = inferSeriesInfo(records);
  const followedSeries = seriesInfo ? await getFollowedSeries(new URL(seriesInfo.seriesUrl).pathname.split('/').filter(Boolean)[1] ?? '') : null;
  const episodeStatuses = followedSeries ? await getEpisodeStatuses(followedSeries.seriesId) : {};

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

  decorateVariantControls(settings);
  renderEpisodeSeenControls(records, followedSeries, episodeStatuses);
  mountTitleSummary(settings, records, followedSeries);

  const counts: PageCounts = {
    total: records.length,
    hidden,
    dimmed,
    preferred
  };

  mountFilterBar({ pageType: 'title-page', settings, counts, onPatch });
  return counts;
}
