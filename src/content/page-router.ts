import type { PageCounts, UserSettings } from '../shared/types';
import { detectPageType } from './utils/urls';
import { applyBrowsePage } from './pages/browse';
import { applyReleaseCalendarPage } from './pages/release-calendar';
import { applyTitlePage } from './pages/title-page';
import { applyWatchPage } from './pages/watch-page';
import { applyWatchlistPage } from './pages/watchlist';

export async function applyCurrentPage(
  settings: UserSettings,
  onPatch: (patch: Partial<UserSettings>) => void
): Promise<{ pageType: ReturnType<typeof detectPageType>; counts: PageCounts }> {
  const pageType = detectPageType();

  switch (pageType) {
    case 'release-calendar':
      return { pageType, counts: await applyReleaseCalendarPage({ settings, onPatch }) };
    case 'browse':
      return { pageType, counts: applyBrowsePage({ settings, onPatch }) };
    case 'title-page':
      return { pageType, counts: await applyTitlePage({ settings, onPatch }) };
    case 'watch-page':
      return { pageType, counts: await applyWatchPage({ settings, onPatch }) };
    case 'watchlist':
      return { pageType, counts: applyWatchlistPage({ settings, onPatch }) };
    default:
      return {
        pageType,
        counts: {
          total: 0,
          hidden: 0,
          dimmed: 0,
          preferred: 0
        }
      };
  }
}
