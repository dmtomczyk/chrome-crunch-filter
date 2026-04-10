import type { PageType } from '../../shared/types';

export function detectPageType(url: URL = new URL(location.href)): PageType {
  const path = url.pathname.toLowerCase();

  if (path.includes('/simulcastcalendar')) {
    return 'release-calendar';
  }

  if (path.startsWith('/series/')) {
    return 'title-page';
  }

  if (path.includes('/watchlist') || path.includes('/queue') || path.includes('/my-lists')) {
    return 'watchlist';
  }

  if (
    path.includes('/search') ||
    path.includes('/videos/') ||
    path.includes('/discover') ||
    path.includes('/browse') ||
    path.includes('/catalog')
  ) {
    return 'browse';
  }

  return 'unsupported';
}
