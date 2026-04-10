You are an expert Chrome extension engineer and product-minded front-end developer.

Build a working Chrome extension MVP called **Crunchyroll Seasonal Cleaner**.

Product concept:
Crunchyroll Seasonal Cleaner is a focused quality-of-life extension for the Crunchyroll website. Its job is to make browsing seasonal releases, season pages, watchlists, and catalog results much cleaner and easier to use, especially for users who want to reduce dubbed-duplicate clutter and navigate directly to the version of a show they actually watch.

This is **not** an ad blocker, not a piracy tool, not a scraper product, and not a general anime database. It is a site-specific UX enhancement layer for Crunchyroll’s web experience.

The core value:
- hide or reduce language-cluttered duplicate entries
- make release browsing faster
- make season/show navigation cleaner
- help users get to their preferred version of a show faster
- add a few high-value, site-native-feeling controls without rewriting the whole site

==================================================
PRODUCT STRATEGY
==================================================

Treat this as a **focused, polished niche extension**, not a giant feature dump.

There are two levels of scope:

PHASE 1 = strong MVP:
- hide dubbed duplicates / language clutter on key pages
- preferred language filtering
- release calendar cleanup
- cleaner season/show navigation
- quick “next episode I actually want” behavior where feasible

PHASE 2 = power-user expansion:
- inline language badges on cards/rows where feasible
- watchlist triage tools
- stronger filtering/sorting
- optional spoiler-safe or progress-aware controls
- additional browse/search quality-of-life features

Build Phase 1 first, but structure the code so Phase 2 can be added cleanly.

==================================================
PRIMARY USERS
==================================================

Build for users who:
- browse the Crunchyroll release calendar frequently
- follow multiple currently-airing shows
- prefer one audio language or one set of languages
- dislike duplicated dub/sub entries cluttering browsing pages
- want a cleaner watchlist / browsing workflow
- want to jump straight to the relevant version of a title

==================================================
OBJECTIVE
==================================================

Create a Chrome extension that runs on Crunchyroll’s website and improves the browsing/navigation experience on:
- release calendar pages
- browse/search/catalog result pages
- title/season pages
- watchlist/queue-like surfaces where feasible

The extension should:
1. identify and filter/declutter language-based duplicate entries where possible
2. let the user choose preferred language behavior
3. clean up key list/grid pages without breaking playback or site navigation
4. persist user preferences locally
5. degrade gracefully if some page structures differ

==================================================
PHASE 1: MVP FEATURES
==================================================

Implement these first.

----------------------------------
1. Language clutter reduction
----------------------------------

Add the ability to:
- hide dubbed duplicates
- hide subbed duplicates
- show only entries matching preferred audio language(s)
- optionally show only “sub preferred” or “dub preferred” content views where feasible

At minimum, make this work on:
- release calendar pages
- main browse/search result lists
- series/season episode listings if possible

Behavior:
- the extension should inspect visible Crunchyroll cards / rows / entries
- identify likely language variants using title text, badges, labels, metadata, and nearby language markers
- suppress or dim entries that do not match user preference
- do this conservatively to avoid hiding the wrong content

----------------------------------
2. Preferred language settings
----------------------------------

Add a settings model that lets the user choose:
- Hide dubbed duplicates
- Hide subbed duplicates
- Show all entries
- Preferred audio language(s)
- Preferred subtitle language(s) if useful later
- “Prefer Japanese audio”
- “Prefer English dub”
- “Show only selected languages”
- “Dim non-preferred items instead of hiding” (nice if easy, otherwise defer)

Persist locally.

----------------------------------
3. Release calendar cleanup
----------------------------------

On Crunchyroll’s release calendar pages, add a compact filter bar or injected control area that supports:
- hide dubbed duplicates
- hide subbed duplicates
- watchlist/followed-only view if feasible
- premieres only if detectable
- hide watched episodes if feasible
- hide recap/special/non-mainline entries if detectable

For MVP:
- it is acceptable to implement only the filters that are reliable
- unreliable heuristics should be disabled or marked experimental

The release calendar is one of the most important Phase 1 surfaces. Prioritize it.

----------------------------------
4. Cleaner season/show navigation
----------------------------------

Improve how season/show pages present multiple language/version variants.

Goals:
- make it easier to distinguish canonical season order from language clutter
- reduce confusion when many language versions of the same season exist
- highlight the user’s preferred version if detectable
- optionally collapse likely duplicate language variants into a cleaner display while preserving access to all versions

For MVP:
- a lighter-touch UI enhancement is okay
- do not fully rewrite Crunchyroll’s page structure unless necessary
- prefer progressive enhancement: relabel, collapse, group, or visually reorganize instead of heavy DOM replacement

----------------------------------
5. “Next episode I actually want”
----------------------------------

Add a quick action where feasible:
- jump to next unwatched or next likely relevant episode in the user’s preferred language/version
- avoid duplicate language clutter when deciding what to open
- optionally add this on title/season pages as a small button

For MVP:
- this can be heuristic and conservative
- do not promise full account-state synchronization
- if reliable unwatched detection is not possible everywhere, scope it to pages where state is clearly visible

----------------------------------
6. Local preferences and state
----------------------------------

Persist:
- user settings
- selected language preferences
- enabled/disabled feature modules
- optional lightweight hidden-item counters per page session
- optional dismissed warnings

Use local extension storage only for MVP.

----------------------------------
7. Toggleable injected UI
----------------------------------

Add:
- extension action icon
- small settings popup or options page
- page-level injected controls where needed
- ability to quickly enable/disable the extension on Crunchyroll

The UI should feel native-adjacent:
- compact
- clean
- restrained
- not flashy
- easy to ignore when not needed

==================================================
PHASE 2 FEATURES
==================================================

Structure the code so these can be added after the MVP without major rewrites.

----------------------------------
A. Inline language badges
----------------------------------

Add badges directly onto content cards / list rows where feasible:
- audio language(s)
- subtitle language(s) when detectable
- preferred-language match state
- “preferred” badge or highlight

Goals:
- reduce extra clicks
- make language availability obvious earlier
- visually separate canonical/preferred entries from non-preferred ones

Requirements:
- badge styling should be subtle and readable
- avoid obscuring existing UI
- handle multiple badges compactly
- fail gracefully if metadata is incomplete

----------------------------------
B. Watchlist triage tools
----------------------------------

Enhance watchlist/queue-like surfaces with optional triage tools:
- unwatched-only filter
- hide completed / archived shows
- pin “watching this season”
- show which watchlist titles have new episodes this week
- “continue watching preferred version”
- local tags such as:
  - watching
  - paused
  - backlog
  - dropped
  - seasonal priority

These tags can be purely local to the extension in Phase 2.

----------------------------------
C. Additional browse/search QoL
----------------------------------

Possible Phase 2 enhancements:
- stronger search result filtering by preferred language
- sort preferred versions first
- dim likely duplicates instead of hard-hiding
- sticky quick filter bar
- compact result density mode
- “only show titles with my preferred audio available” where feasible

----------------------------------
D. Spoiler-safe tools
----------------------------------

Optional:
- blur episode thumbnails
- blur episode titles past latest watched marker if detectable
- hide synopsis previews on browse surfaces
- reveal-on-hover controls

Keep this optional and conservative.

----------------------------------
E. Availability hints
----------------------------------

If language availability is inconsistent across seasons or pages, surface subtle hints like:
- preferred language available
- preferred language only available on some seasons
- subtitles only / dub unavailable
- metadata uncertain

Only show hints when signal is reasonably reliable.

==================================================
NON-GOALS
==================================================

Do NOT build:
- ad blocking
- video downloading
- bypassing subscriptions or paywalls
- account automation
- scraping external anime databases as a dependency
- playback speed controls
- keyboard shortcut systems
- custom video player replacement
- giant redesign of the entire Crunchyroll site
- cloud backend for MVP
- mobile support
- support for browsers other than Chrome in the initial version

==================================================
TECHNICAL REQUIREMENTS
==================================================

Use:
- Chrome Extension Manifest V3
- TypeScript
- modular architecture
- minimal permissions where practical
- maintainable code over clever hacks
- no remote hosted code

Prefer:
- content scripts for site augmentation
- local storage for preferences/state
- runtime messaging only where necessary
- lightweight DOM observation

Reasonable permissions:
- activeTab
- scripting
- storage

Use host permissions only as needed for Crunchyroll domains.

Do not over-request permissions.

==================================================
ARCHITECTURE
==================================================

Use a clean separation between:

1. Background/service worker
- extension lifecycle
- settings initialization
- toolbar action behavior
- command handling if needed
- options/popup coordination

2. Content script(s)
- page detection
- DOM inspection
- injected controls
- filter logic
- card/list parsing
- season-page cleanup logic
- watchlist enhancement logic
- mutation observation for dynamic page updates

3. Shared modules
- selectors/config
- settings schema
- entry parsing models
- language normalization
- filtering engine
- state persistence
- UI injection helpers

==================================================
SITE-SPECIFIC DESIGN REQUIREMENTS
==================================================

Crunchyroll pages may change over time.
Build defensively.

Key requirements:
- isolate page-specific selectors in a dedicated config/module
- use layered detection strategies, not one brittle selector per feature
- prefer semantic text/label matching plus structural heuristics
- add feature guards when page shape is unknown
- fail soft, not hard
- avoid throwing errors into the page
- do not break site playback or navigation

Implement page-type detection such as:
- release calendar page
- browse/search listing page
- title detail / season page
- watchlist page
- unsupported page

==================================================
DATA / DOMAIN MODEL
==================================================

Create a normalized local model for detected items.

At minimum, define something like:

ContentEntry:
- id (derived locally when possible)
- rawTitle
- normalizedTitle
- seasonLabel
- episodeLabel
- pageType
- url
- detectedAudioLanguages[]
- detectedSubtitleLanguages[]
- detectedVariantType (sub / dub / mixed / unknown)
- isPreferredMatch
- isLikelyDuplicateOf
- isWatchlistItem
- isWatched if detectable
- isPremiere if detectable
- confidence scores where helpful

UserSettings:
- enabled
- hideDubbedDuplicates
- hideSubbedDuplicates
- preferredAudioLanguages[]
- preferredSubtitleLanguages[]
- dimInsteadOfHide
- releaseCalendarFilters
- watchlistTriageSettings
- spoilerModeEnabled
- featureFlags

LocalUserTags (Phase 2):
- titleUrl or titleKey
- localTag
- pinned
- archived
- priority
- notes optional

==================================================
LANGUAGE DETECTION / NORMALIZATION
==================================================

Implement a language normalization utility.

It should:
- detect language tags from visible text and metadata where feasible
- normalize variants into canonical values
- handle unknown/ambiguous cases safely
- allow multiple language aliases to map to one canonical language
- support configurable preferred language matching

Do not hardcode only one language forever.
Design for multiple languages, even if the initial UI defaults are simple.

==================================================
UI / UX DIRECTION
==================================================

The extension should feel like a polished utility:
- compact
- tidy
- restrained
- native-adjacent
- anime-fan-friendly without being childish or loud

Suggested UI elements:
- toolbar popup for global settings
- small injected filter strip on release calendar/list pages
- subtle inline buttons/toggles
- tiny pill badges for languages
- muted counters like:
  - “12 hidden”
  - “3 preferred”
- local tags/chips for watchlist triage in Phase 2

Avoid:
- giant sidebars
- intrusive modals
- full-page takeovers
- visual clutter
- unstable animation-heavy UI

==================================================
PERFORMANCE REQUIREMENTS
==================================================

- avoid expensive full-page rescans on every mutation
- debounce/throttle page reprocessing
- process only relevant containers where possible
- keep filtering responsive on large release lists
- keep UI injection lightweight
- minimize layout thrash

==================================================
ROBUSTNESS REQUIREMENTS
==================================================

- handle SPA-like route changes if Crunchyroll navigates dynamically
- re-run page init on route changes or meaningful DOM updates
- support refresh/re-render of filtered UI
- recover cleanly if page markup changes partially
- add debug logging behind a dev flag only
- do not spam the console in production mode

==================================================
FILE / PROJECT STRUCTURE
==================================================

Create a clean project structure, for example:

/src
  /background
    service-worker.ts
  /content
    index.ts
    page-router.ts
    observers.ts
    /pages
      release-calendar.ts
      browse.ts
      title-page.ts
      watchlist.ts
    /filters
      filtering-engine.ts
      language-normalizer.ts
      duplicate-detector.ts
    /ui
      injected-filter-bar.ts
      badges.ts
      chips.ts
      toasts.ts
    /utils
      dom.ts
      selectors.ts
      urls.ts
      logging.ts
  /shared
    types.ts
    storage.ts
    constants.ts
  /popup
    popup.ts
    popup.html
    popup.css
  /options
    options.ts
    options.html
    options.css
manifest.json
README.md
DESIGN_NOTES.md

You may adjust the exact structure if you have a better one, but keep it organized and scalable.

==================================================
README / DOCUMENTATION
==================================================

Produce:
1. complete extension source code
2. manifest.json
3. popup UI
4. options page if useful
5. background/service worker
6. content scripts
7. shared modules
8. README with:
   - product overview
   - supported page types
   - install instructions
   - how to load unpacked extension
   - settings overview
   - current feature list
   - known limitations
   - likely breakpoints if Crunchyroll changes markup
   - roadmap for Phase 2
9. DESIGN_NOTES.md covering:
   - page-type detection strategy
   - language normalization strategy
   - duplicate detection heuristics
   - tradeoffs and fallback behavior

==================================================
ACCEPTANCE CRITERIA
==================================================

The build is successful if:

1. After loading the unpacked extension, the user can open Crunchyroll and see the extension work on at least:
- release calendar
- browse/search-like listing pages
- one title/season page type

2. The user can:
- choose preferred language settings
- hide or reduce non-preferred language clutter
- see page results update without a page break
- persist preferences across reloads

3. On release calendar pages, at least a useful subset of filters works reliably.

4. On title/season pages, the extension adds a meaningful cleanup or grouping improvement.

5. The code is modular enough that Phase 2 can be added without major refactoring.

6. The extension fails gracefully on unsupported or partially changed pages.

==================================================
IMPLEMENTATION ORDER
==================================================

Build in this order:

1. Extension scaffold
2. Settings schema + popup/options
3. Content script injection on Crunchyroll
4. Page-type detection
5. Release calendar filtering MVP
6. Browse/search result filtering MVP
7. Title/season page cleanup MVP
8. Local persistence
9. “Next episode I actually want” heuristic button
10. Phase 2 scaffolding hooks:
   - inline badge system
   - local watchlist triage data model
11. README + DESIGN_NOTES

==================================================
PRODUCT JUDGMENT
==================================================

When making tradeoffs:
- prefer a smaller number of features that clearly work
- prioritize the release calendar and browse surfaces first
- do not over-promise duplicate detection when metadata is ambiguous
- keep the UI subtle
- build extension-local enhancements, not a site rewrite
- architect for Phase 2, but do not let Phase 2 bloat Phase 1

If you need to simplify, keep:
- release calendar cleanup
- preferred language filtering
- basic browse decluttering
- clean settings persistence

Those are the core value.

Now build the MVP and scaffold the Phase 2 path cleanly.
