import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const bundle = await build({
  stdin: {
    contents: `export { detectPageType } from './src/content/utils/urls';
      export { collectReleaseRoots } from './src/content/utils/selectors';
      export { buildEntryRecord } from './src/content/utils/parsing';
      export { filterEntries } from './src/content/filters/filtering-engine';
      export { applyEntryPresentation } from './src/content/utils/dom';
      export { DEFAULT_SETTINGS } from './src/shared/constants';`,
    resolveDir: process.cwd()
  },
  bundle: true, write: false, platform: 'node', format: 'esm'
});
const { detectPageType, collectReleaseRoots, buildEntryRecord, filterEntries, applyEntryPresentation, DEFAULT_SETTINGS } =
  await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function page(html) {
  const dom = new JSDOM(html, { url: 'https://www.crunchyroll.com/releasecalendar' });
  // jsdom has no layout engine; supply visible text for these structural fixtures.
  Object.defineProperty(dom.window.HTMLElement.prototype, 'innerText', {
    get() { return this.textContent; }
  });
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  return document;
}

test('routes current, legacy, and localized calendar URLs', () => {
  for (const path of ['/releasecalendar', '/releasecalendar/?date=2026-11-01', '/simulcastcalendar', '/en/releasecalendar']) {
    assert.equal(detectPageType(new URL(path, 'https://www.crunchyroll.com')), 'release-calendar');
  }
  assert.equal(detectPageType(new URL('https://www.crunchyroll.com/news/releasecalendar-update')), 'unsupported');
});

test('collects legacy release rows once, including nested metadata', () => {
  const doc = page(`<ul class="releases"><li><article class="release" data-group-id="1" data-popover-url="episode-JAJP"><a href="/watch/one">Legacy Show</a></article></li></ul>`);
  const roots = collectReleaseRoots(doc);
  assert.equal(roots.length, 1);
  assert.equal(roots[0].tagName, 'ARTICLE');
  assert.deepEqual(buildEntryRecord(roots[0], 'release-calendar', DEFAULT_SETTINGS).entry.detectedAudioLanguages, ['ja-JP']);
});

test('keeps modern cards separate from day sections and filters audio variants', () => {
  const doc = page(`<div role="main"><section class="release-calendar-day">
    <div data-t="episode-card"><time>10:00 AM</time><a href="/watch/one"><span class="series-title">Example (English Dub)</span></a><span> Episode 2</span></div>
    <a class="playable-card--abc" href="/watch/two"><time>11:00 AM</time><span class="series-title">Example (Japanese Sub)</span><span> Episode 2</span></a>
    </section></div><footer><a href="/series/other">Outside calendar</a></footer>`);
  const roots = collectReleaseRoots(doc);
  assert.equal(roots.length, 2);
  const entries = roots.map(root => buildEntryRecord(root, 'release-calendar', DEFAULT_SETTINGS).entry);
  assert.deepEqual(entries.map(entry => entry.rawTitle), ['Example (English Dub)', 'Example (Japanese Sub)']);
  assert.deepEqual(entries.map(entry => entry.episodeNumber), [2, 2]);
  assert.deepEqual(filterEntries(entries, DEFAULT_SETTINGS).map(d => d.hidden), [true, false]);
  const dimmed = filterEntries(entries, { ...DEFAULT_SETTINGS, dimInsteadOfHide: true });
  assert.deepEqual(dimmed.map(d => [d.hidden, d.dimmed]), [[false, true], [false, false]]);
  assert.ok(filterEntries(entries, { ...DEFAULT_SETTINGS, enabled: false }).every(d => !d.hidden && !d.dimmed));
});

test('filters all 74 cards from the saved Crunchyroll layout using explicit audio lists', () => {
  const doc = page(readFileSync(new URL('./fixtures/release-calendar.html', import.meta.url), 'utf8'));
  assert.equal(doc.querySelector('main'), null);
  const roots = collectReleaseRoots(doc);
  assert.equal(roots.length, 74);
  const entries = roots.map(root => buildEntryRecord(root, 'release-calendar', DEFAULT_SETTINGS)?.entry);
  assert.ok(entries.every(Boolean), 'every release must parse');
  const settings = { ...DEFAULT_SETTINGS, releaseCalendarFilters: {
    ...DEFAULT_SETTINGS.releaseCalendarFilters, hideRecapsAndSpecials: false
  }};
  for (const [code, language] of [['JA', 'ja-JP'], ['EN', 'en-US'], ['ES', 'es-ES'], ['PT', 'pt-BR']]) {
    const decisions = filterEntries(entries, { ...settings, preferredAudioLanguages: [language] });
    decisions.forEach((decision, index) => {
      const label = roots[index].querySelector('[aria-label^="Audio languages:"]').getAttribute('aria-label');
      const expectedMatch = label.slice('Audio languages:'.length).split(',').map(s => s.trim()).includes(code);
      assert.equal(decision.hidden, !expectedMatch, `${code}: ${entries[index].rawTitle} (${label})`);
      applyEntryPresentation(roots[index], decision.hidden, decision.dimmed);
      assert.equal(roots[index].classList.contains('ccsc-hidden'), !expectedMatch);
    });
  }
  entries.forEach((entry, index) => {
    assert.equal(entry.rawTitle, roots[index].querySelector('[data-t="series-page-link"]').textContent.trim());
    assert.ok(entry.detectedAudioLanguages.length > 0);
  });
  assert.deepEqual(entries[0].detectedAudioLanguages, ['ja-JP', 'th-TH']);
  assert.deepEqual(entries[1].detectedAudioLanguages, ['ar-ME']);
});
