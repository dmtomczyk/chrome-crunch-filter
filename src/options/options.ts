import { LANGUAGE_OPTIONS } from '../shared/constants';
import { getSettings, updateSettings } from '../shared/storage';
import type { UserSettings } from '../shared/types';
import { labelForLanguage } from '../content/filters/language-normalizer';

const status = document.getElementById('status') as HTMLParagraphElement;
const audioLanguageList = document.getElementById('audioLanguageList') as HTMLDivElement;
const subtitleLanguageList = document.getElementById('subtitleLanguageList') as HTMLDivElement;
const optionsSummary = document.getElementById('optionsSummary') as HTMLDivElement;
const optionsSummaryText = document.getElementById('optionsSummaryText') as HTMLParagraphElement;

const coreInputs = {
  enabled: document.getElementById('enabled') as HTMLInputElement,
  showOnlySelectedLanguages: document.getElementById('showOnlySelectedLanguages') as HTMLInputElement,
  dimInsteadOfHide: document.getElementById('dimInsteadOfHide') as HTMLInputElement,
  premieresOnly: document.getElementById('premieresOnly') as HTMLInputElement,
  hideWatched: document.getElementById('hideWatched') as HTMLInputElement,
  hideRecapsAndSpecials: document.getElementById('hideRecapsAndSpecials') as HTMLInputElement,
  inlineBadges: document.getElementById('inlineBadges') as HTMLInputElement,
  watchlistTriage: document.getElementById('watchlistTriage') as HTMLInputElement,
  debug: document.getElementById('debug') as HTMLInputElement
};

function flashSaved(): void {
  status.textContent = 'Saved.';
  window.clearTimeout((flashSaved as typeof flashSaved & { timeout?: number }).timeout);
  (flashSaved as typeof flashSaved & { timeout?: number }).timeout = window.setTimeout(() => {
    status.textContent = '';
  }, 1200);
}

function renderLanguageCheckboxes(container: HTMLElement, name: string, selected: string[]): void {
  container.innerHTML = LANGUAGE_OPTIONS.map(
    (language) => `
      <label class="row">
        <input type="checkbox" data-group="${name}" value="${language.code}" ${selected.includes(language.code) ? 'checked' : ''}/>
        <span>${language.label}</span>
      </label>
    `
  ).join('');
}

function renderOptionsSummary(settings: UserSettings): void {
  const firstAudio = settings.preferredAudioLanguages[0] ?? 'ja-JP';
  const audioLabel = labelForLanguage(firstAudio);

  if (!settings.enabled) {
    optionsSummary.textContent = 'Filtering disabled';
    optionsSummaryText.textContent = 'Crunchyroll pages are left untouched until you turn the extension back on.';
    return;
  }

  if (settings.showOnlySelectedLanguages) {
    optionsSummary.textContent = `Filtering ${audioLabel} only`;
    optionsSummaryText.textContent = settings.dimInsteadOfHide
      ? 'Non-matching entries stay visible but dimmed.'
      : 'Non-matching entries are hidden when the extension can classify them.';
    return;
  }

  optionsSummary.textContent = `Preferred audio: ${audioLabel}`;
  optionsSummaryText.textContent = 'The extension is in a lighter-touch mode and will not force a strict audio-only view.';
}

async function savePatch(patch: Partial<UserSettings>): Promise<void> {
  const settings = await updateSettings(patch);
  renderOptionsSummary(settings);
  flashSaved();
}

async function syncForm(): Promise<void> {
  const settings = await getSettings();

  coreInputs.enabled.checked = settings.enabled;
  coreInputs.showOnlySelectedLanguages.checked = settings.showOnlySelectedLanguages;
  coreInputs.dimInsteadOfHide.checked = settings.dimInsteadOfHide;
  coreInputs.premieresOnly.checked = settings.releaseCalendarFilters.premieresOnly;
  coreInputs.hideWatched.checked = settings.releaseCalendarFilters.hideWatched;
  coreInputs.hideRecapsAndSpecials.checked = settings.releaseCalendarFilters.hideRecapsAndSpecials;
  coreInputs.inlineBadges.checked = settings.featureFlags.inlineBadges;
  coreInputs.watchlistTriage.checked = settings.featureFlags.watchlistTriage;
  coreInputs.debug.checked = settings.featureFlags.debug;

  renderOptionsSummary(settings);
  renderLanguageCheckboxes(audioLanguageList, 'audio', settings.preferredAudioLanguages);
  renderLanguageCheckboxes(subtitleLanguageList, 'subtitle', settings.preferredSubtitleLanguages);

  audioLanguageList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const selected = Array.from(audioLanguageList.querySelectorAll<HTMLInputElement>('input:checked')).map((node) => node.value);
      await savePatch({ preferredAudioLanguages: selected });
    });
  });

  subtitleLanguageList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const selected = Array.from(subtitleLanguageList.querySelectorAll<HTMLInputElement>('input:checked')).map((node) => node.value);
      await savePatch({ preferredSubtitleLanguages: selected });
    });
  });
}

coreInputs.enabled.addEventListener('change', () => void savePatch({ enabled: coreInputs.enabled.checked }));
coreInputs.showOnlySelectedLanguages.addEventListener('change', () =>
  void savePatch({ showOnlySelectedLanguages: coreInputs.showOnlySelectedLanguages.checked })
);
coreInputs.dimInsteadOfHide.addEventListener('change', () =>
  void savePatch({ dimInsteadOfHide: coreInputs.dimInsteadOfHide.checked })
);
coreInputs.premieresOnly.addEventListener('change', () =>
  void savePatch({
    releaseCalendarFilters: {
      premieresOnly: coreInputs.premieresOnly.checked,
      hideWatched: coreInputs.hideWatched.checked,
      hideRecapsAndSpecials: coreInputs.hideRecapsAndSpecials.checked
    }
  })
);
coreInputs.hideWatched.addEventListener('change', () =>
  void savePatch({
    releaseCalendarFilters: {
      premieresOnly: coreInputs.premieresOnly.checked,
      hideWatched: coreInputs.hideWatched.checked,
      hideRecapsAndSpecials: coreInputs.hideRecapsAndSpecials.checked
    }
  })
);
coreInputs.hideRecapsAndSpecials.addEventListener('change', () =>
  void savePatch({
    releaseCalendarFilters: {
      premieresOnly: coreInputs.premieresOnly.checked,
      hideWatched: coreInputs.hideWatched.checked,
      hideRecapsAndSpecials: coreInputs.hideRecapsAndSpecials.checked
    }
  })
);
coreInputs.inlineBadges.addEventListener('change', () =>
  void savePatch({ featureFlags: { inlineBadges: coreInputs.inlineBadges.checked, watchlistTriage: coreInputs.watchlistTriage.checked, debug: coreInputs.debug.checked } })
);
coreInputs.watchlistTriage.addEventListener('change', () =>
  void savePatch({ featureFlags: { inlineBadges: coreInputs.inlineBadges.checked, watchlistTriage: coreInputs.watchlistTriage.checked, debug: coreInputs.debug.checked } })
);
coreInputs.debug.addEventListener('change', () =>
  void savePatch({ featureFlags: { inlineBadges: coreInputs.inlineBadges.checked, watchlistTriage: coreInputs.watchlistTriage.checked, debug: coreInputs.debug.checked } })
);

void syncForm();
