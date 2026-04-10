import { LANGUAGE_OPTIONS } from '../shared/constants';
import { getSettings, updateSettings } from '../shared/storage';
import { labelForLanguage } from '../content/filters/language-normalizer';

const enabled = document.getElementById('enabled') as HTMLInputElement;
const primaryAudio = document.getElementById('primaryAudio') as HTMLSelectElement;
const showOnlySelectedLanguages = document.getElementById('showOnlySelectedLanguages') as HTMLInputElement;
const dimInsteadOfHide = document.getElementById('dimInsteadOfHide') as HTMLInputElement;
const openOptions = document.getElementById('openOptions') as HTMLButtonElement;
const modeSummary = document.getElementById('modeSummary') as HTMLDivElement;
const modeSubtext = document.getElementById('modeSubtext') as HTMLParagraphElement;

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

  if (showOnlySelectedLanguages.checked) {
    modeSummary.textContent = `Filtering ${audioLabel} only`;
    modeSubtext.textContent = dimInsteadOfHide.checked
      ? 'Entries with other audio stay visible but dimmed.'
      : 'Entries with other audio are hidden when the extension can classify them.';
    return;
  }

  modeSummary.textContent = `Preferred audio: ${audioLabel}`;
  modeSubtext.textContent = 'The extension highlights and classifies entries, but does not force a strict audio-only view.';
}

async function syncForm(): Promise<void> {
  const settings = await getSettings();

  enabled.checked = settings.enabled;
  primaryAudio.value = settings.preferredAudioLanguages[0] ?? 'ja-JP';
  showOnlySelectedLanguages.checked = settings.showOnlySelectedLanguages;
  dimInsteadOfHide.checked = settings.dimInsteadOfHide;
  renderModeSummary();
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

primaryAudio.addEventListener('change', () => {
  void updateSettings({ preferredAudioLanguages: [primaryAudio.value] });
  renderModeSummary();
});

openOptions.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

void syncForm();
