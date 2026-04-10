# Design Notes

## 1. Product direction

This extension started as a decluttering / duplicate-hiding experiment.

The current product direction is simpler and better:
- let the user choose an audio language
- filter Crunchyroll toward that audio
- keep controls in the extension UI, not injected into the page

That shift matters because "hide dub duplicates" was too fuzzy on the release calendar. "Show only my chosen audio" is clearer and easier to reason about.

## 2. Page-type detection strategy

The extension routes by URL first because Crunchyroll is SPA-ish and that is more stable than trying to infer everything from DOM alone.

Current routing:
- `*/simulcastcalendar*` → `release-calendar`
- `/series/...` → `title-page`
- `watchlist|queue|my-lists` → `watchlist`
- `search|videos|discover|browse|catalog` → `browse`
- everything else → unsupported

## 3. Selector strategy

Crunchyroll class names are semi-obfuscated and can drift, so selectors are layered:

- prefer semantic hrefs like `/series/` and `/watch/`
- prefer stable-ish data attributes like `data-popover-url` / `data-group-id` when available
- then climb to a nearby card/list root
- keep page-specific root collection isolated in `src/content/utils/selectors.ts`

For the release calendar specifically, a key stability lesson was to prefer **innermost card roots** so a hidden ancestor does not swallow visible child cards.

## 4. Language normalization strategy

The extension uses visible-text heuristics plus Crunchyroll metadata.

Signals used:
- `Audio: ...`
- `Subtitles: ...`
- explicit labels like `English`, `Deutsch`, `Bahasa Indonesia`, `தமிழ்`, `తెలుగు`
- generic `Dubbed`, `Subtitled`, `Subbed`
- title suffixes like `(English)` or `(Português (Brasil))`
- Crunchyroll locale hints from release metadata such as:
  - `JAJP`
  - `ENUS`
  - `ES419`
  - `PTBR`
  - `TEIN`
  - `TAIN`
  - `IDID`
  - etc.

Normalization maps aliases to canonical codes like:
- `ja-JP`
- `en-US`
- `es-LA`
- `pt-BR`
- `fr-FR`
- `de-DE`
- `hi-IN`
- `ta-IN`
- `te-IN`
- `id-ID`

Important design choice:
- when Crunchyroll exposes an explicit locale hint for a release card, that hint is treated as the card's audio truth instead of being loosely merged with weaker text guesses.

## 5. Filtering strategy

### Release calendar
The release calendar is now primarily an **audio-language filter**.

Meaning:
- if `showOnlySelectedLanguages` is enabled, entries that do not match the chosen audio are hidden or dimmed
- release-calendar logic should not depend on duplicate-collapse to produce the main UX

This is the surface where the user expectation is strongest: "show me only the audio I want."

### Browse / title / watchlist-ish pages
These surfaces still reuse more of the older ranking/duplicate-style logic because their layouts are less uniform and the visible metadata can be weaker.

That may change later if a cleaner audio-first model proves reliable enough across all supported pages.

## 6. Fallback behavior

When uncertain:
- preserve the item rather than hiding it aggressively
- avoid console spam unless debug mode is enabled
- prefer stable metadata over text heuristics when both exist

This remains the core product judgment: better to miss some filtering than hide the wrong thing.

## 7. Mutation and SPA handling

Crunchyroll can rerender content after route changes.

Current approach:
- observe DOM mutations with debouncing
- wrap `history.pushState` and `history.replaceState`
- refresh on `popstate` and `hashchange`

## 8. UI philosophy

Settings now belong in the extension popup/options pages.

The page itself should be enhanced, not turned into a control panel.

That keeps the Crunchyroll experience cleaner and reduces the chance that injected chrome becomes visually annoying or structurally fragile.

## 9. Phase 2 hooks still present

Scaffolding still exists for:
- inline badges
- watchlist triage settings
- feature flags
- local user tags domain model

But those are secondary to getting the audio-filtering core extremely solid.
