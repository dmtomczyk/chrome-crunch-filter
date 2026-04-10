import type { UserSettings } from '../shared/types';
import { STORAGE_KEY } from '../shared/constants';
import { getSettings, updateSettings } from '../shared/storage';
import { applyCurrentPage } from './page-router';
import { installObservers } from './observers';
import { setDebugEnabled, logDebug } from './utils/logging';
import { clearEntryPresentation, clearInjectedUi } from './utils/dom';

let currentSettings: UserSettings | null = null;
let isRefreshing = false;

async function refreshPage(): Promise<void> {
  if (isRefreshing) {
    return;
  }

  isRefreshing = true;

  try {
    currentSettings ??= await getSettings();
    setDebugEnabled(currentSettings.featureFlags.debug);

    clearInjectedUi();
    clearEntryPresentation();

    const result = applyCurrentPage(currentSettings, (patch) => {
      void handleSettingsPatch(patch);
    });

    logDebug('applied page', result.pageType, result.counts);
  } catch (error) {
    console.error('[CCSC] Failed to apply page enhancements', error);
  } finally {
    isRefreshing = false;
  }
}

async function handleSettingsPatch(patch: Partial<UserSettings>): Promise<void> {
  currentSettings = await updateSettings(patch);
  await refreshPage();
}

void (async () => {
  currentSettings = await getSettings();
  await refreshPage();
  installObservers(() => {
    void refreshPage();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEY]) {
      return;
    }

    void (async () => {
      currentSettings = await getSettings();
      await refreshPage();
    })();
  });
})();
