import type { EntryRecord, UserSettings } from '../../shared/types';
import { labelForLanguage } from '../filters/language-normalizer';

function ensureBadgeRow(record: EntryRecord): HTMLElement | null {
  const anchor = record.titleElement ?? record.element.firstElementChild;
  if (!anchor) {
    return null;
  }

  let row = record.element.querySelector<HTMLElement>('.ccsc-badge-row');
  if (!row) {
    row = document.createElement('div');
    row.className = 'ccsc-badge-row';
    anchor.insertAdjacentElement('afterend', row);
  }

  return row;
}

export function renderBadges(record: EntryRecord, settings: UserSettings): void {
  record.element.querySelectorAll('.ccsc-badge-row, .ccsc-preferred-tag').forEach((node) => node.remove());

  if (!settings.featureFlags.inlineBadges) {
    return;
  }

  const row = ensureBadgeRow(record);
  if (!row) {
    return;
  }

  const badges: string[] = [];

  if (record.entry.detectedAudioLanguages.length > 0) {
    badges.push(`Audio: ${record.entry.detectedAudioLanguages.map(labelForLanguage).join(', ')}`);
  }

  if (record.entry.detectedSubtitleLanguages.length > 0) {
    badges.push(`Subs: ${record.entry.detectedSubtitleLanguages.map(labelForLanguage).join(', ')}`);
  }

  if (badges.length === 0 && record.entry.detectedVariantType !== 'unknown') {
    badges.push(record.entry.detectedVariantType === 'dub' ? 'Dub' : 'Sub');
  }

  row.innerHTML = badges.map((badge) => `<span class="ccsc-badge">${badge}</span>`).join('');

  if (record.entry.isPreferredMatch) {
    const preferredTag = document.createElement('span');
    preferredTag.className = 'ccsc-preferred-tag';
    preferredTag.textContent = 'Preferred';
    row.appendChild(preferredTag);
  }
}
