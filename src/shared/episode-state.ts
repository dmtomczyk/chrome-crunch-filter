import type { EpisodeSeenState, EpisodeSeenStatus } from './types';

export const EPISODE_STATE_KEY = 'crunchyrollAudioFilter.episodeSeenState';

export async function getEpisodeStateMap(): Promise<Record<string, EpisodeSeenState>> {
  const stored = await chrome.storage.local.get(EPISODE_STATE_KEY);
  return (stored[EPISODE_STATE_KEY] as Record<string, EpisodeSeenState> | undefined) ?? {};
}

export async function getEpisodeStatuses(seriesId: string): Promise<Record<string, EpisodeSeenStatus>> {
  const state = await getEpisodeStateMap();
  return state[seriesId]?.statuses ?? {};
}

export async function setEpisodeSeenStatus(
  seriesId: string,
  episodeKey: string | undefined,
  status: EpisodeSeenStatus
): Promise<void> {
  if (!episodeKey) {
    return;
  }

  const state = await getEpisodeStateMap();
  const current = state[seriesId] ?? {
    seriesId,
    statuses: {},
    updatedAt: Date.now()
  };

  current.statuses[episodeKey] = status;
  current.updatedAt = Date.now();
  state[seriesId] = current;
  await chrome.storage.local.set({ [EPISODE_STATE_KEY]: state });
}

export async function clearEpisodeSeenState(seriesId: string): Promise<void> {
  const state = await getEpisodeStateMap();
  delete state[seriesId];
  await chrome.storage.local.set({ [EPISODE_STATE_KEY]: state });
}
