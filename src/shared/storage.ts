import { DEFAULT_SETTINGS, STORAGE_KEY } from './constants';
import type { UserSettings } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch?: Partial<T>): T {
  if (!patch) {
    return structuredClone(base);
  }

  if (Array.isArray(base)) {
    return ([...(patch as unknown as unknown[])] as unknown) as T;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      result[key] = [...value];
      continue;
    }

    if (isPlainObject(value)) {
      const existing = isPlainObject(result[key]) ? result[key] : {};
      result[key] = deepMerge(existing, value);
      continue;
    }

    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}

export async function getSettings(): Promise<UserSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return deepMerge(DEFAULT_SETTINGS, stored[STORAGE_KEY] as Partial<UserSettings> | undefined);
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const nextSettings = deepMerge(await getSettings(), patch);
  await chrome.storage.local.set({ [STORAGE_KEY]: nextSettings });
  return nextSettings;
}

export async function initializeSettings(): Promise<UserSettings> {
  const settings = await getSettings();
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  return settings;
}
