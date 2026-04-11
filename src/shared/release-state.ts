import type { ReleaseSeenState } from './types';

export const RELEASE_STATE_KEY = 'crunchyrollAudioFilter.releaseSeenState';

export async function getReleaseSeenStateMap(): Promise<Record<string, ReleaseSeenState>> {
  const stored = await chrome.storage.local.get(RELEASE_STATE_KEY);
  return (stored[RELEASE_STATE_KEY] as Record<string, ReleaseSeenState> | undefined) ?? {};
}

export async function getSeenReleaseKeys(seriesId: string): Promise<Set<string>> {
  const state = await getReleaseSeenStateMap();
  return new Set(state[seriesId]?.seenReleaseKeys ?? []);
}

export async function markReleaseSeen(seriesId: string, releaseKey: string | undefined): Promise<void> {
  if (!releaseKey) {
    return;
  }

  const state = await getReleaseSeenStateMap();
  const current = state[seriesId] ?? {
    seriesId,
    seenReleaseKeys: [],
    updatedAt: Date.now()
  };

  if (!current.seenReleaseKeys.includes(releaseKey)) {
    current.seenReleaseKeys.push(releaseKey);
  }

  current.updatedAt = Date.now();
  state[seriesId] = current;
  await chrome.storage.local.set({ [RELEASE_STATE_KEY]: state });
}

export async function markReleaseKeysSeen(seriesId: string, releaseKeys: string[]): Promise<void> {
  const normalized = [...new Set(releaseKeys.filter(Boolean))];
  if (normalized.length === 0) {
    return;
  }

  const state = await getReleaseSeenStateMap();
  const current = state[seriesId] ?? {
    seriesId,
    seenReleaseKeys: [],
    updatedAt: Date.now()
  };

  current.seenReleaseKeys = [...new Set([...current.seenReleaseKeys, ...normalized])];
  current.updatedAt = Date.now();
  state[seriesId] = current;
  await chrome.storage.local.set({ [RELEASE_STATE_KEY]: state });
}

export async function clearSeenReleaseState(seriesId: string): Promise<void> {
  const state = await getReleaseSeenStateMap();
  delete state[seriesId];
  await chrome.storage.local.set({ [RELEASE_STATE_KEY]: state });
}
