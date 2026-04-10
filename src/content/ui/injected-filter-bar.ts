import type { PageCounts, PageType, UserSettings } from '../../shared/types';

interface FilterBarOptions {
  pageType: PageType;
  settings: UserSettings;
  counts: PageCounts;
  onPatch: (patch: Partial<UserSettings>) => void;
}

export function mountFilterBar(_options: FilterBarOptions): void {
  // Intentionally disabled.
  // Settings now live in the extension popup/options UI instead of on-page chrome.
}
