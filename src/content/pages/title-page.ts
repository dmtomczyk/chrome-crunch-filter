import type { EntryRecord, PageCounts, UserSettings } from '../../shared/types';
import { applyEntryPresentation, isVisible, setEntryId } from '../utils/dom';
import { filterEntries } from '../filters/filtering-engine';
import { mountFilterBar } from '../ui/injected-filter-bar';
import { renderBadges } from '../ui/badges';
import { buildEntryRecord } from '../utils/parsing';
import { collectTitleEpisodeRoots, findTitleHeading } from '../utils/selectors';
import { labelForLanguage } from '../filters/language-normalizer';
import { UI_ROOT_ATTR } from '../../shared/constants';

interface TitlePageContext {
  settings: UserSettings;
  onPatch: (patch: Partial<UserSettings>) => void;
}

function decorateVariantControls(settings: UserSettings): void {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('main button, main a[href], main [role="button"]'));
  for (const element of candidates) {
    const text = element.innerText.replace(/\s+/g, ' ').trim();
    if (text.length === 0 || text.length > 80) {
      continue;
    }

    if (!/(dub|subtitled|subbed|audio|japanese|english|spanish|portuguese|french|german)/i.test(text)) {
      continue;
    }

    element.classList.add('ccsc-variant-option');

    if (settings.preferredAudioLanguages.some((code) => new RegExp(labelForLanguage(code), 'i').test(text))) {
      element.classList.add('ccsc-variant-option--preferred');
    } else {
      element.classList.remove('ccsc-variant-option--preferred');
    }
  }
}

function mountTitleSummary(settings: UserSettings, records: EntryRecord[]): void {
  const heading = findTitleHeading();
  if (!heading?.parentElement) {
    return;
  }

  let summary = document.getElementById('ccsc-title-summary') as HTMLElement | null;
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'ccsc-title-summary';
    summary.className = 'ccsc-title-summary';
    summary.setAttribute(UI_ROOT_ATTR, 'true');
    heading.parentElement.insertAdjacentElement('afterend', summary);
  }

  const nextEpisodeLink = records.find((record) => isVisible(record.element) && record.linkElement?.href.includes('/watch/'))?.linkElement;
  const preferredAudio = settings.preferredAudioLanguages.map(labelForLanguage).join(', ') || 'All';

  summary.innerHTML = `
    <div>
      <strong>Preferred audio:</strong> ${preferredAudio}
    </div>
    <div>
      <strong>Episode clutter:</strong> ${records.length} detectable entries
    </div>
    ${nextEpisodeLink ? `<button type="button" class="ccsc-next-button" data-next-url="${nextEpisodeLink.href}">Next episode I actually want</button>` : ''}
  `;

  summary.querySelector<HTMLButtonElement>('.ccsc-next-button')?.addEventListener('click', () => {
    const url = summary?.querySelector<HTMLButtonElement>('.ccsc-next-button')?.dataset.nextUrl;
    if (url) {
      window.location.href = url;
    }
  });
}

export function applyTitlePage({ settings, onPatch }: TitlePageContext): PageCounts {
  const records = collectTitleEpisodeRoots()
    .map((root) => buildEntryRecord(root, 'title-page', settings))
    .filter((record): record is EntryRecord => Boolean(record));

  const decisions = filterEntries(records.map((record) => record.entry), settings);
  const decisionMap = new Map(decisions.map((decision) => [decision.entryId, decision]));

  let hidden = 0;
  let dimmed = 0;
  let preferred = 0;

  for (const record of records) {
    setEntryId(record.element, record.entry.id);
    renderBadges(record, settings);

    const decision = decisionMap.get(record.entry.id);
    const isHidden = decision?.hidden ?? false;
    const isDimmed = decision?.dimmed ?? false;

    applyEntryPresentation(record.element, isHidden, isDimmed);

    if (isHidden) hidden += 1;
    if (isDimmed) dimmed += 1;
    if (record.entry.isPreferredMatch) preferred += 1;
  }

  decorateVariantControls(settings);
  mountTitleSummary(settings, records);

  const counts: PageCounts = {
    total: records.length,
    hidden,
    dimmed,
    preferred
  };

  mountFilterBar({ pageType: 'title-page', settings, counts, onPatch });
  return counts;
}
