# V2 Plan — Followed Shows, Notifications, and Anime Hours

This document lays out the recommended path for version 2 of **Crunchyroll Audio Filter**.

The current extension is good at filtering Crunchyroll toward a chosen audio. V2 should build on that without muddying the core product.

## Product direction

V2 should extend the current idea from:

- **show me the audio I actually want**

into:

- **show me the shows I care about**
- **tell me when something new I care about appears**
- **help me understand how much anime I’ve actually watched**

## Recommended order

Do **not** build notifications and watch-time tracking at the same time.

Recommended sequence:

1. **Followed / favorited shows**
2. **Release-calendar highlights for followed shows**
3. **New-episode detection**
4. **Browser notifications**
5. **Watch-session logging**
6. **Anime-hours dashboard**

## Why start with followed shows

This is the highest-value and lowest-risk V2 slice.

It gives the extension a durable idea of:
- what the user cares about
- which series should be highlighted later
- what future notifications should be based on

It also avoids jumping straight into background polling or analytics before the product has a stable personal-state model.

---

# Phase 0 — Foundation

Before new features, create a small storage/domain layer so V2 features do not become a pile of ad hoc `chrome.storage.local` writes.

## Goals
- centralize extension-owned local data
- define stable IDs for series / episodes / releases
- make later features easier to test and evolve

## Suggested modules

```text
src/shared/storage/
  settings.ts
  followed-series.ts
  release-state.ts
  watch-sessions.ts
```

If keeping the current single-file storage module for settings is simpler, still create separate modules for V2 feature data.

## Strong ID preference

Prefer Crunchyroll metadata over visible text when available.

Useful sources:
- series URL slug / series id
- watch URL slug / episode id
- `data-group-id`
- `data-popover-url`
- `data-episode-num`

Visible text should be fallback, not primary identity.

---

# Phase 1 — Followed / Favorited Shows

## Outcome
The user can follow a show from its title page and see/manage that list in the extension.

## Scope

### Title page
Add a small follow control on supported title pages:
- **Follow show**
- **Unfollow show**

Optional later:
- follow using currently selected audio
- choose notification preference per followed show

### Options page
Add a section like:
- **Followed shows**
  - title
  - chosen audio
  - followed date
  - remove button

### Popup
No need to add too much here initially.
A small count like:
- `12 followed shows`
would be enough later, but not required in the first slice.

## Suggested data model

```ts
type FollowedSeries = {
  seriesId: string;
  title: string;
  slug?: string;
  seriesUrl: string;
  preferredAudio: string;
  followedAt: number;
  enabled: boolean;
  notes?: string;
  lastSeenReleaseKey?: string;
  lastSeenEpisodeId?: string;
};
```

## Storage shape

```ts
type FollowedSeriesMap = Record<string, FollowedSeries>;
```

Use `seriesId` as the main key where possible.
If there is no stable id yet, use a normalized series URL as temporary identity.

## UX notes
- keep the button small and calm
- do not turn title pages into dashboards
- follow/unfollow should feel instant
- avoid prompting for too many options on the first version

## Acceptance criteria
- can follow a supported title page
- followed state persists across refresh/restart
- can unfollow
- options page shows the followed list accurately

---

# Phase 2 — Followed Show Highlights on Release Calendar

## Outcome
The release calendar becomes more personal.

## Behavior
For entries matching a followed show:
- add a **Following** badge or highlight
- optionally visually prioritize them
- later, mark whether the entry is new since last seen

## Matching strategy
Use the strongest available signal:
1. stable series id / slug match
2. series URL match
3. normalized title fallback

Avoid relying only on visible title text if series metadata is present.

## Acceptance criteria
- followed shows are visibly marked on the release calendar
- marking respects current chosen-audio filtering
- non-followed items are unchanged

---

# Phase 3 — New Episode Detection

## Outcome
The extension can tell whether a followed show has something newly available for the user.

## Behavior
For each followed show, track:
- last seen release key
- last seen episode id
- last seen timestamp

When a release-calendar entry appears that is newer than known state:
- mark it as **New**
- optionally elevate it in future summary UIs

## Suggested data model

```ts
type ReleaseSighting = {
  releaseKey: string;
  seriesId?: string;
  episodeId?: string;
  title: string;
  audio: string | null;
  seenAt: number;
};
```

A release key can be derived from a combination of:
- series id / normalized title
- episode id or episode number
- audio locale
- release date/time if available

## Acceptance criteria
- a newly appearing followed entry can be distinguished from previously seen ones
- state survives extension reloads

---

# Phase 4 — Browser Notifications

## Outcome
The extension can notify the user when a new followed episode appears.

## Required Chrome capabilities
Likely add:
- `notifications`
- `alarms`

## Behavior
Two reasonable modes:

### 1. Passive / on-visit
Only notify while the user is actively visiting Crunchyroll or after opening the extension.

### 2. Background polling
Use `chrome.alarms` to periodically check relevant pages/state and generate notifications.

## Recommendation
Start with **passive / on-visit** notifications first.
It is much easier to validate and less likely to become annoying.

## Notification rules
Only notify when all are true:
- show is followed
- audio matches the followed or chosen audio rule
- release is new compared with stored state
- notification has not already been sent for that release key

## Acceptance criteria
- duplicate notifications do not spam
- notifications are tied to truly new followed entries

---

# Phase 5 — Watch-Session Logging

## Outcome
The extension records anime watching time locally.

## Scope
Track actual watch sessions from playback pages.

## What to record

```ts
type WatchSession = {
  sessionId: string;
  seriesId?: string;
  seriesTitle: string;
  episodeId?: string;
  episodeTitle: string;
  watchedSeconds: number;
  startedAt: number;
  endedAt: number;
  completed: boolean;
};
```

## Recommendation
Track **both**:
- raw watched seconds
- completed/not completed

That gives better analytics later than completion-only or time-only tracking.

## Implementation notes
- observe playback page state
- listen for play / pause / ended / visibility changes where practical
- batch writes instead of writing every second
- use thresholds to determine completion, e.g. 80–90%

## Acceptance criteria
- watching an episode produces a session record
- rewatching creates additional watch-time rather than corrupting prior records
- partial watches still count toward time

---

# Phase 6 — Anime Hours Dashboard

## Outcome
The extension can summarize how much anime has been watched.

## Suggested dashboard sections
- today
- this week
- this month
- all time
- episodes completed
- top series by watch time

## Nice later additions
- streaks
- average per day/week
- completion rate
- time by audio language

## UX recommendation
Keep this in the options page first.
It does not need a full separate app surface.

---

# Suggested file/module changes

## Likely new files

```text
src/shared/followed-series.ts
src/shared/release-state.ts
src/shared/watch-sessions.ts
src/content/ui/follow-button.ts
src/content/pages/watch-page.ts        # later, when watch logging begins
src/options/components/followed-list.ts # optional, if options UI grows
```

## Likely updated files
- `src/content/pages/title-page.ts`
- `src/content/pages/release-calendar.ts`
- `src/content/page-router.ts`
- `src/shared/types.ts`
- `src/shared/storage.ts` or split storage modules
- `manifest.json` (later, when notifications/alarms are added)

---

# Suggested milestone plan

## V2.1 — Followed Shows
- storage model for followed series
- follow/unfollow button on title pages
- followed-list section in options

## V2.2 — Followed Highlights
- followed badges on release calendar
- reliable series matching

## V2.3 — New Episode State
- last seen release tracking
- “New” markers for followed shows

## V2.4 — Notifications
- passive notifications first
- alarms/background later if still needed

## V2.5 — Watch Tracking
- playback session logging
- session storage model

## V2.6 — Anime Hours Dashboard
- summary cards
- top shows
- completed episodes

---

# Risks to watch

## 1. Identity drift
Crunchyroll visible labels are inconsistent. Always prefer stable metadata where possible.

## 2. Overbuilding V2.1
Do not add tags, folders, priorities, and notifications to the first follow feature. Just make following solid.

## 3. Notification spam
Do not send notifications without a real dedupe key and seen-state model.

## 4. Noisy watch logging
Do not write every second. Aggregate and batch.

---

# Recommendation for the very next implementation step

Start with **V2.1 — Followed Shows**.

That means:
- add a follow/unfollow button on title pages
- create persistent local storage for followed series
- show the followed list in options

This is the best first step because it creates the user-owned state that every other V2 feature will depend on.
