import { uniqElements } from './dom';

function keepInnermostElements<T extends HTMLElement>(elements: T[]): T[] {
  return elements.filter((element) => !elements.some((other) => other !== element && element.contains(other)));
}

function firstClosest(element: Element | null, selectors: string[]): HTMLElement | null {
  if (!element) {
    return null;
  }

  for (const selector of selectors) {
    const match = element.closest(selector) as HTMLElement | null;
    if (match) {
      return match;
    }
  }

  return element as HTMLElement;
}

function resolveSeriesCardRoot(element: Element | null): HTMLElement | null {
  return firstClosest(element, [
    '[data-t="series-card"]',
    '[class*="horizontal-card--"]',
    '[class*="portrait-card--"]',
    '[class*="browse-card"]',
    '[class*="card--"]',
    'article',
    'li'
  ]);
}

function resolveEpisodeCardRoot(element: Element | null): HTMLElement | null {
  return firstClosest(element, [
    '[data-t*="episode-card"]',
    '[class*="playable-card--"]',
    '.erc-playable-collection',
    '[class*="episode-card"]',
    '[class*="card--"]',
    'article',
    'li'
  ]);
}

export function collectBrowseRoots(root: ParentNode = document): HTMLElement[] {
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/series/"]')).concat(
    Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/browse/"]'))
  );

  return uniqElements(
    anchors
      .map((anchor) => resolveSeriesCardRoot(anchor))
      .filter(
        (element): element is HTMLElement =>
          Boolean(element && (element.matches('[data-t="series-card"]') || element.querySelector('a[href*="/series/"]')))
      )
  );
}

export function collectTitleEpisodeRoots(root: ParentNode = document): HTMLElement[] {
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/watch/"]')).filter(
    (anchor) =>
      /playable-card|episode-title|play e\d+/i.test(`${anchor.className} ${(anchor.textContent ?? '').replace(/\s+/g, ' ')}`)
  );

  return uniqElements(
    anchors
      .map((anchor) => resolveEpisodeCardRoot(anchor))
      .filter(
        (element): element is HTMLElement =>
          Boolean(
            element &&
              element.innerText.trim().length > 0 &&
              (/playable-card/i.test(element.className) ||
                element.getAttribute('data-t')?.includes('episode-card') ||
                element.querySelector('a[class*="playable-card__title-link"], [data-t="episode-title"]'))
          )
      )
  );
}

export function collectWatchlistRoots(root: ParentNode = document): HTMLElement[] {
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/series/"]')).concat(
    Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/watch/"]'))
  );

  return uniqElements(
    anchors
      .map((anchor) => (anchor.href.includes('/watch/') ? resolveEpisodeCardRoot(anchor) : resolveSeriesCardRoot(anchor)))
      .filter((element): element is HTMLElement => Boolean(element && element.innerText.trim().length > 0))
  );
}

export function collectReleaseRoots(root: ParentNode = document): HTMLElement[] {
  const explicit = Array.from(
    root.querySelectorAll<HTMLElement>('ul.releases > li, li.release, article.release, [data-popover-url][data-group-id]')
  );
  if (explicit.length > 0) {
    return keepInnermostElements(uniqElements(explicit.filter((element) => element.innerText.trim().length > 0)));
  }

  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('main a[href*="/watch/"]')).concat(
    Array.from(root.querySelectorAll<HTMLAnchorElement>('main a[href*="/series/"]'))
  );

  return keepInnermostElements(
    uniqElements(
      anchors
        .map(
          (anchor) =>
            anchor.closest(
              '[data-popover-url][data-group-id], li.release, article.release, li, article, [class*="release"], [class*="episode-card"], [class*="playable-card--"]'
            ) as HTMLElement | null
        )
        .filter((element): element is HTMLElement => Boolean(element && element.innerText.trim().length > 0))
    )
  );
}

export function findTitleHeading(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('main h1') ??
    document.querySelector<HTMLElement>('h1') ??
    document.querySelector<HTMLElement>('[class*="hero"] h2')
  );
}
