import { LANGUAGE_OPTIONS } from '../shared/constants';
import { getSettings, updateSettings } from '../shared/storage';
import { labelForLanguage } from '../content/filters/language-normalizer';
import { listFollowedSeries } from '../shared/followed-series';

const enabled = document.getElementById('enabled') as HTMLInputElement;
const primaryAudio = document.getElementById('primaryAudio') as HTMLSelectElement;
const showOnlySelectedLanguages = document.getElementById('showOnlySelectedLanguages') as HTMLInputElement;
const dimInsteadOfHide = document.getElementById('dimInsteadOfHide') as HTMLInputElement;
const followedOnly = document.getElementById('followedOnly') as HTMLInputElement;
const openOptions = document.getElementById('openOptions') as HTMLButtonElement;
const modeSummary = document.getElementById('modeSummary') as HTMLDivElement;
const modeSubtext = document.getElementById('modeSubtext') as HTMLParagraphElement;
const followedCount = document.getElementById('followedCount') as HTMLDivElement;
const followedList = document.getElementById('followedList') as HTMLDivElement;

function populateAudioOptions(): void {
  primaryAudio.innerHTML = LANGUAGE_OPTIONS.map(
    (language) => `<option value="${language.code}">${language.label}</option>`
  ).join('');
}

function renderModeSummary(): void {
  const audioLabel = labelForLanguage(primaryAudio.value || 'ja-JP');

  if (!enabled.checked) {
    modeSummary.textContent = 'Filtering disabled';
    modeSubtext.textContent = 'Crunchyroll pages are left untouched until you turn it back on.';
    return;
  }

  const calendarSuffix = followedOnly.checked ? ' Followed shows are prioritized in the calendar.' : '';

  if (showOnlySelectedLanguages.checked) {
    modeSummary.textContent = `Filtering ${audioLabel} only`;
    modeSubtext.textContent = dimInsteadOfHide.checked
      ? `Entries with other audio stay visible but dimmed.${calendarSuffix}`
      : `Entries with other audio are hidden when the extension can classify them.${calendarSuffix}`;
    return;
  }

  modeSummary.textContent = `Preferred audio: ${audioLabel}`;
  modeSubtext.textContent = `The extension highlights and classifies entries, but does not force a strict audio-only view.${calendarSuffix}`;
}

async function renderFollowedShows(): Promise<void> {
  const followedShows = await listFollowedSeries();
  followedCount.textContent =
    followedShows.length === 0
      ? 'No followed shows yet'
      : `${followedShows.length} followed show${followedShows.length === 1 ? '' : 's'}`;

  if (followedShows.length === 0) {
    followedList.innerHTML = '<div class="followed-popup-empty">Open any series page on Crunchyroll and click Follow show to add it here.</div>';
    return;
  }

  followedList.innerHTML = followedShows
    .map(
      (show) => `
        <article class="followed-popup-card">
          <div class="followed-popup-card__title">${show.title}</div>
          <div class="followed-popup-card__meta">${labelForLanguage(show.preferredAudio)} • Seen through episode ${show.newestEpisodeSeen ?? 'unknown'}</div>
        </article>
      `
    )
    .join('');
}

async function syncForm(): Promise<void> {
  const settings = await getSettings();

  enabled.checked = settings.enabled;
  primaryAudio.value = settings.preferredAudioLanguages[0] ?? 'ja-JP';
  showOnlySelectedLanguages.checked = settings.showOnlySelectedLanguages;
  dimInsteadOfHide.checked = settings.dimInsteadOfHide;
  followedOnly.checked = settings.releaseCalendarFilters.followedOnly;
  renderModeSummary();
  await renderFollowedShows();
}

function bindCheckbox(input: HTMLInputElement, key: string): void {
  input.addEventListener('change', () => {
    void updateSettings({ [key]: input.checked } as never);
    renderModeSummary();
  });
}

populateAudioOptions();
bindCheckbox(enabled, 'enabled');
bindCheckbox(showOnlySelectedLanguages, 'showOnlySelectedLanguages');
bindCheckbox(dimInsteadOfHide, 'dimInsteadOfHide');

followedOnly.addEventListener('change', () => {
  void (async () => {
    const settings = await getSettings();
    await updateSettings({
      releaseCalendarFilters: {
        ...settings.releaseCalendarFilters,
        followedOnly: followedOnly.checked
      }
    });
    renderModeSummary();
  })();
});

primaryAudio.addEventListener('change', () => {
  void updateSettings({ preferredAudioLanguages: [primaryAudio.value] });
  renderModeSummary();
});

openOptions.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

void syncForm();
