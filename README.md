# Crunchyroll Audio Filter

A Chrome extension for people who want Crunchyroll to stop yelling every language variant at them.

The current product direction is simple:

- choose the audio you actually want
- show that on Crunchyroll when the page exposes enough metadata
- keep the controls in the extension UI instead of injecting a settings bar into the site

## What it does now

### Core behavior
- Lets you pick a **chosen audio** such as Japanese, English, Spanish, Portuguese, French, or German
- Can **show only that chosen audio** on supported Crunchyroll pages
- Can optionally **dim** non-matching entries instead of hiding them
- Stores preferences in `chrome.storage.local`

### Supported surfaces
- **Release calendar**
  - `https://www.crunchyroll.com/releasecalendar`
  - `https://www.crunchyroll.com/simulcastcalendar`
- **Browse / listing pages**
  - alphabetical browse
  - discover / browse / search-like listing pages
- **Title pages**
  - `/series/...`
- **Watchlist-ish URLs**
  - scaffolded support for queue / watchlist / my-lists-like paths

### Extra controls
- Release calendar filters:
  - premieres only
  - hide recaps / specials
  - hide watched (heuristic)
- Optional inline debug/language badges
- Debug logging toggle

## Current UX

### Popup
The popup is the quick-control surface:
- Enabled / disabled
- Chosen audio
- Show only chosen audio
- Dim instead of hide
- Link to full settings

### Options page
The options page is the fuller settings view:
- current mode summary
- multi-select audio preferences
- optional subtitle preferences
- release calendar filters
- debug / scaffolding flags

There is **no longer an injected settings bar** at the top of Crunchyroll pages.

## Build and load

### Install dependencies

```bash
cd ~/code/chrome-croll
npm install
```

### Build

```bash
npm run build
```

This creates `dist/`.

### Validate changes

```bash
npm test
npm run typecheck
npm run build
```

The calendar regression tests include 74 release cards reduced from a saved page, with scripts, images, and account UI removed.

### Load unpacked in Chrome / Brave
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `~/code/chrome-croll/dist`

## How filtering works

The extension uses page metadata + visible text heuristics to infer audio language.

Useful signals include:
- visible language labels in titles and metadata
- subtitle/audio text when present
- Crunchyroll locale hints embedded in release-calendar metadata such as `JAJP`, `ENUS`, `PTBR`, `TEIN`, `TAIN`, `IDID`, etc.
- The updated calendar's explicit `Audio languages` accessibility labels, including tracks hidden behind a `+N` indicator. Grouped releases remain visible when any listed audio matches your preference.

The updated calendar lists base languages such as `ES` and `PT` without regions. These match either regional preference for that language.

On the release calendar, the extension now behaves primarily like an **audio-language filter**, not a duplicate-collapser.

That means the main goal is:
- keep entries matching your chosen audio
- hide or dim entries that clearly do not match

## Known limitations

This is still heuristic, not canonical.

- Crunchyroll markup changes often
- some cards do not expose enough metadata to classify confidently
- some browse/title/watchlist layouts still use softer matching logic than the release calendar
- `hide watched` is heuristic
- subtitle preferences are currently secondary to the main audio filter behavior
- unsupported card shapes should fail softly, but may miss entries

## Product tradeoffs
- favors a clear **chosen audio** workflow over older duplicate-hiding behavior
- prefers doing the right thing on the release calendar rather than forcing one global rule everywhere
- keeps permissions minimal
- uses no backend and no external anime database

## Roadmap ideas
- cleaner browse/title-page audio filtering parity with the release calendar
- better current-page status in the popup
- stronger per-card audio confidence reporting
- smarter handling of unknown/unclassified entries
- watchlist triage once the core filtering is fully stable

## Permissions
- `storage`
- host access for Crunchyroll pages only

No remote code. No backend. No account automation.
