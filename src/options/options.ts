import { LANGUAGE_OPTIONS } from '../shared/constants';
import { getSettings, updateSettings } from '../shared/storage';
import type { FollowedSeries, UserSettings } from '../shared/types';
import { labelForLanguage } from '../content/filters/language-normalizer';
import { listFollowedSeries, removeFollowedSeries } from '../shared/followed-series';

const status = document.getElementById('status') as HTMLParagraphElement;
const audioLanguageList = document.getElementById('audioLanguageList') as HTMLDivElement;
const subtitleLanguageList = document.getElementById('subtitleLanguageList') as HTMLDivElement;
const followedShowsList = document.getElementById('followedShowsList') as HTMLDivElement;
const optionsSummary = document.getElementById('optionsSummary') as HTMLDivElement;
const optionsSummaryText = document.getElementById('optionsSummaryText') as HTMLParagraphElement;

const coreInputs = {
  enabled: document.getElementById('enabled') as HTMLInputElement,
  showOnlySelectedLanguages: document.getElementById('showOnlySelectedLanguages') as HTMLInputElement,
  dimInsteadOfHide: document.getElementById('dimInsteadOfHide') as HTMLInputElement,
  followedOnly: document.getElementById('followedOnly') as HTMLInputElement,
  premieresOnly: document.getElementById('premieresOnly') as HTMLInputElement,
  hideWatched: document.getElementById('hideWatched') as HTMLInputElement,
  hideRecapsAndSpecials: document.getElementById('hideRecapsAndSpecials') as HTMLInputElement,
  inlineBadges: document.getElementById('inlineBadges') as HTMLInputElement,
  watchlistTriage: document.getElementById('watchlistTriage') as HTMLInputElement,
  debug: document.getElementById('debug') as HTMLInputElement
};

function flashSaved(message = 'Saved.'): void {
  status.textContent = message;
  window.clearTimeout((flashSaved as typeof flashSaved & { timeout?: number }).timeout);
  (flashSaved as typeof flashSaved & { timeout?: number }).timeout = window.setTimeout(() => {
    status.textContent = '';
  }, 1400);
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

function renderOptionsSummary(settings: UserSettings, followedShows: FollowedSeries[]): void {
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
      ? `Non-matching entries stay visible but dimmed. ${followedShows.length} followed show${followedShows.length === 1 ? '' : 's'} saved.`
      : `Non-matching entries are hidden when the extension can classify them. ${followedShows.length} followed show${followedShows.length === 1 ? '' : 's'} saved.`;
    return;
  }

  optionsSummary.textContent = `Preferred audio: ${audioLabel}`;
  optionsSummaryText.textContent = `${followedShows.length} followed show${followedShows.length === 1 ? '' : 's'} saved. The extension is in a lighter-touch mode and will not force a strict audio-only view.`;
}

function renderFollowedShows(followedShows: FollowedSeries[]): void {
  if (followedShows.length === 0) {
    followedShowsList.innerHTML = '<div class="followed-empty">No followed shows yet. Open a series page on Crunchyroll and click Follow show.</div>';
    return;
  }

  followedShowsList.innerHTML = followedShows
    .map(
      (show) => `
        <article class="followed-card" data-series-id="${show.seriesId}">
          <div class="followed-card__topline">
            <div class="followed-card__title">${show.title}</div>
            <div class="ccsc-badge">${labelForLanguage(show.preferredAudio)}</div>
          </div>
          <div class="followed-card__meta">
            Followed ${new Date(show.followedAt).toLocaleDateString()} • Seen through episode ${show.newestEpisodeSeen ?? 'unknown'}
          </div>
          <div class="followed-card__actions">
            <a href="${show.seriesUrl}" target="_blank" rel="noreferrer">Open series</a>
            <button type="button" data-action="remove-follow">Remove</button>
          </div>
        </article>
      `
    )
    .join('');

  followedShowsList.querySelectorAll<HTMLButtonElement>('[data-action="remove-follow"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const seriesId = button.closest<HTMLElement>('[data-series-id]')?.dataset.seriesId;
      if (!seriesId) {
        return;
      }

      await removeFollowedSeries(seriesId);
      await syncForm();
      flashSaved('Removed followed show.');
    });
  });
}

async function savePatch(patch: Partial<UserSettings>): Promise<void> {
  const settings = await updateSettings(patch);
  const followedShows = await listFollowedSeries();
  renderOptionsSummary(settings, followedShows);
  flashSaved();
}

async function syncForm(): Promise<void> {
  const [settings, followedShows] = await Promise.all([getSettings(), listFollowedSeries()]);

  coreInputs.enabled.checked = settings.enabled;
  coreInputs.showOnlySelectedLanguages.checked = settings.showOnlySelectedLanguages;
  coreInputs.dimInsteadOfHide.checked = settings.dimInsteadOfHide;
  coreInputs.followedOnly.checked = settings.releaseCalendarFilters.followedOnly;
  coreInputs.premieresOnly.checked = settings.releaseCalendarFilters.premieresOnly;
  coreInputs.hideWatched.checked = settings.releaseCalendarFilters.hideWatched;
  coreInputs.hideRecapsAndSpecials.checked = settings.releaseCalendarFilters.hideRecapsAndSpecials;
  coreInputs.inlineBadges.checked = settings.featureFlags.inlineBadges;
  coreInputs.watchlistTriage.checked = settings.featureFlags.watchlistTriage;
  coreInputs.debug.checked = settings.featureFlags.debug;

  renderOptionsSummary(settings, followedShows);
  renderLanguageCheckboxes(audioLanguageList, 'audio', settings.preferredAudioLanguages);
  renderLanguageCheckboxes(subtitleLanguageList, 'subtitle', settings.preferredSubtitleLanguages);
  renderFollowedShows(followedShows);

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
coreInputs.followedOnly.addEventListener('change', () =>
  void savePatch({
    releaseCalendarFilters: {
      followedOnly: coreInputs.followedOnly.checked,
      premieresOnly: coreInputs.premieresOnly.checked,
      hideWatched: coreInputs.hideWatched.checked,
      hideRecapsAndSpecials: coreInputs.hideRecapsAndSpecials.checked
    }
  })
);
coreInputs.premieresOnly.addEventListener('change', () =>
  void savePatch({
    releaseCalendarFilters: {
      followedOnly: coreInputs.followedOnly.checked,
      premieresOnly: coreInputs.premieresOnly.checked,
      hideWatched: coreInputs.hideWatched.checked,
      hideRecapsAndSpecials: coreInputs.hideRecapsAndSpecials.checked
    }
  })
);
coreInputs.hideWatched.addEventListener('change', () =>
  void savePatch({
    releaseCalendarFilters: {
      followedOnly: coreInputs.followedOnly.checked,
      premieresOnly: coreInputs.premieresOnly.checked,
      hideWatched: coreInputs.hideWatched.checked,
      hideRecapsAndSpecials: coreInputs.hideRecapsAndSpecials.checked
    }
  })
);
coreInputs.hideRecapsAndSpecials.addEventListener('change', () =>
  void savePatch({
    releaseCalendarFilters: {
      followedOnly: coreInputs.followedOnly.checked,
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
