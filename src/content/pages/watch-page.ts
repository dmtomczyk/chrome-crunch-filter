import type { PageCounts, UserSettings } from '../../shared/types';
import { UI_ROOT_ATTR } from '../../shared/constants';
import { getFollowedSeries } from '../../shared/followed-series';
import { getEpisodeStatuses, setEpisodeSeenStatus } from '../../shared/episode-state';
import { labelForLanguage } from '../filters/language-normalizer';

interface WatchPageContext {
  settings: UserSettings;
  onPatch: (patch: Partial<UserSettings>) => void;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function extractWatchSchema(): { seriesTitle: string; episodeNumber: number | null } {
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'));
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      const seriesName = typeof data?.partOfSeries?.name === 'string' ? normalizeText(data.partOfSeries.name) : '';
      const episodeNumber = Number(data?.episodeNumber ?? '') || null;
      if (seriesName || episodeNumber != null) {
        return { seriesTitle: seriesName, episodeNumber };
      }
    } catch {
      // ignore malformed blocks
    }
  }

  return { seriesTitle: '', episodeNumber: null };
}

function extractSeriesInfo(): { seriesId: string; seriesTitle: string; episodeKey: string } | null {
  const metaSeriesUrl = document.querySelector<HTMLMetaElement>('meta[property="video:series"]')?.content;
  const seriesAnchor =
    document.querySelector<HTMLAnchorElement>('a[href*="/series/"]') ??
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find((anchor) => /\/series\//.test(anchor.href));

  const rawSeriesUrl = metaSeriesUrl || seriesAnchor?.href;
  if (!rawSeriesUrl) {
    return null;
  }

  const url = new URL(rawSeriesUrl, location.origin);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'series' || !parts[1]) {
    return null;
  }

  const metaSeriesTitle = document.querySelector<HTMLMetaElement>('meta[property="og:video:series"], meta[property="video:series:title"]')?.content;
  const schema = extractWatchSchema();
  const candidateTitle =
    normalizeText(metaSeriesTitle) ||
    schema.seriesTitle ||
    normalizeText(seriesAnchor?.textContent) ||
    normalizeText(document.querySelector('main h1')?.textContent) ||
    normalizeText(document.querySelector('h1')?.textContent) ||
    document.title;

  return {
    seriesId: parts[1],
    seriesTitle: candidateTitle,
    episodeKey: schema.episodeNumber != null ? `${parts[1]}::episode-${schema.episodeNumber}` : `${location.origin}${location.pathname}`
  };
}

function findWatchPageMountTarget(): Element | null {
  return (
    document.querySelector('.episode-actions') ??
    document.querySelector('[class*="episode-actions"]') ??
    document.querySelector('main h1')?.parentElement ??
    document.querySelector('main') ??
    document.body
  );
}

export async function applyWatchPage({ settings }: WatchPageContext): Promise<PageCounts> {
  document.getElementById('ccsc-watch-widget')?.remove();

  const info = extractSeriesInfo();
  const mountTarget = findWatchPageMountTarget();
  if (!info || !mountTarget) {
    return { total: 0, hidden: 0, dimmed: 0, preferred: 0 };
  }

  const followedSeries = await getFollowedSeries(info.seriesId);
  if (!followedSeries) {
    return { total: 0, hidden: 0, dimmed: 0, preferred: 0 };
  }

  const episodeStatuses = await getEpisodeStatuses(info.seriesId);
  const explicit = episodeStatuses[info.episodeKey];
  const effectiveSeen = explicit === 'seen';

  const widget = document.createElement('section');
  widget.id = 'ccsc-watch-widget';
  widget.className = 'ccsc-watch-widget';
  widget.setAttribute(UI_ROOT_ATTR, 'true');
  widget.innerHTML = `
    <div class="ccsc-watch-widget__label">Episode tracking</div>
    <div class="ccsc-watch-widget__title">${info.seriesTitle}</div>
    <div class="ccsc-watch-widget__meta">Chosen audio: ${labelForLanguage(settings.preferredAudioLanguages[0] ?? followedSeries.preferredAudio)}</div>
    <div class="ccsc-watch-widget__actions">
      <button type="button" class="ccsc-episode-seen-toggle ${effectiveSeen ? 'ccsc-episode-seen-toggle--seen' : 'ccsc-episode-seen-toggle--unseen'}" data-watch-toggle="seen">
        ${effectiveSeen ? 'Seen' : 'Unseen'}
      </button>
    </div>
  `;

  widget.querySelector<HTMLButtonElement>('[data-watch-toggle="seen"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void setEpisodeSeenStatus(info.seriesId, info.episodeKey, effectiveSeen ? 'unseen' : 'seen');
  });

  if (mountTarget.matches('.episode-actions, [class*="episode-actions"]')) {
    mountTarget.insertAdjacentElement('afterend', widget);
  } else {
    mountTarget.prepend(widget);
  }

  return { total: 1, hidden: 0, dimmed: 0, preferred: 1 };
}
