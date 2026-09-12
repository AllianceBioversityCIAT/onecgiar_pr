# Design — Platform onboarding tours

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/platform-onboarding-tour/` |
| Module code | `POT` |
| Status | approved |
| Requirements | `requirements.md` |
| Proposal | `proposal.md` (Option A — extend `ReportingGuideService`) |
| Date | 2026-09-11 |

## Executive Summary

Add three platform tour entry points by **extending `ReportingGuideService`** with a pure **`platform/` step module** (copy + step builders + storage keys). Reuse the existing Driver.js bootstrap and global `.driver-popover.pr-guide` skin. Enforce **spotlight visibility** and **responsive placement** through driver config, a location-badge HTML helper, sidebar auto-expand, and a narrow SCSS tweak for mobile max-width.

## Architecture Overview

### Where this lives

| Layer | Touch |
|---|---|
| **Service** | `reporting-guide.service.ts` — new methods: `startSidebarTour`, `startResultsCenterTour`, `startWhereToReportTour`, `isPlatformTourCompleted(id)` |
| **Step module** | `platform/platform-tour.steps.ts`, `platform/platform-tour-copy.ts`, `platform/platform-tour.types.ts` (new, colocated under `dashboard-lab/services/platform/`) |
| **Sidebar** | `reporting-nav-sidebar.component.{html,ts,scss}` — EXTRAS Tour button + `data-guide` anchors |
| **Results Center** | `results-list.component.{html,ts}` — hero Tour button + anchors on hero, filters, export, table, WTR CTA |
| **WTR modal** | `results-center-reporting-guide.component.{html,ts}` — header Tour + anchors on intro, picker, lanes |
| **Styles** | `src/styles.scss` — optional `.driver-popover.pr-guide` responsive max-width rule |
| **Server** | None |

### Interaction flow

```
User clicks Tour (sidebar | RC hero | WTR header)
  └── ReportingGuideService.start*Tour(options)
        ├── [sidebar only] SidebarService.expand if collapsed
        ├── buildPlatformSteps(context) from platform/ module
        ├── createPlatformDriver(steps, storageKey)
        └── driver.drive(0)
              ├── onHighlight: scrollIntoView (driver default + ensure animate)
              ├── popover shows location badge + plain copy
              └── onDestroyed: localStorage.setItem(storageKey, 'true')
```

Only **one** Driver instance is active at a time (existing service policy): starting a tour destroys any in-flight instance.

## Extended Directory Structure

```
onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/
  reporting-guide.service.ts          # + platform tour methods
  reporting-guide.service.spec.ts     # + platform tour tests
  platform/
    platform-tour-copy.ts             # §6.1 strings + location badge helper
    platform-tour.types.ts            # PlatformTourId, context interfaces
    platform-tour.steps.ts            # pure step builders

onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/
  reporting-nav-sidebar.component.html  # anchors + EXTRAS Tour

onecgiar-pr-client/src/app/pages/results/.../results-list/
  results-list.component.html           # anchors + hero Tour

onecgiar-pr-client/src/app/pages/results/.../results-center-reporting-guide/
  results-center-reporting-guide.component.html  # header Tour + anchors
```

## Data Model

No persistence beyond browser `localStorage`:

| Key | Set when |
|---|---|
| `pr.tour.platform.sidebar.completed` | Sidebar tour destroyed after completion |
| `pr.tour.platform.results-center.completed` | RC tour completes |
| `pr.tour.platform.where-to-report.completed` | WTR tour completes |

Storage failures are swallowed (same pattern as `SP_TOUR_STORAGE_KEY`).

## API Design

None.

## Backend Module Design

None.

## Frontend / UX Component Architecture

### Tour launcher (shared pattern)

Mirror `reporting-program-band` Tour button:

- Outline button, `explore` icon, label **Tour** visible from `sm` breakpoint.
- `data-guide` on launcher: `platform-tour-sidebar-trigger`, `platform-tour-rc-trigger`, `platform-tour-wtr-trigger`.
- `aria-label`: “Start sidebar tour” / “Start Results Center tour” / “Start Where to report tour”.

### Anchors (`data-guide`)

| Anchor | Host element |
|---|---|
| `platform-tour-sidebar-header` | PRMS header block in sidebar |
| `platform-tour-sidebar-programs` | My Science Programs group |
| `platform-tour-sidebar-other-programs` | Other SP group |
| `platform-tour-sidebar-platform` | Platform section label + menu wrapper |
| `platform-tour-sidebar-results-center` | Results Center `routerLink` row |
| `platform-tour-sidebar-centers` | Centers block |
| `platform-tour-rc-hero` | RC hero text column |
| `platform-tour-rc-where-to-report` | Where to report button |
| `platform-tour-rc-filters` | `app-results-list-filters` host |
| `platform-tour-rc-export` | Export control in toolbar |
| `platform-tour-rc-table` | Results table wrapper |
| `platform-tour-rc-update` | Update result button |
| `platform-tour-wtr-intro` | Modal title row |
| `platform-tour-wtr-picker` | Picker list scroll region |
| `platform-tour-wtr-w12` | W1/W2 lane card |
| `platform-tour-wtr-w3` | W3 lane card |
| `platform-tour-wtr-emerging` | Emerging card |

Existing `sidebar-toggle` reused for collapse step (SBAR / STC specs).

### Copy module

`platform-tour-copy.ts` exports:

- Step title/description records keyed by step id.
- `platformLocationBadgeHtml(surface: string, hint?: string)` — same visual language as `tabBadgeHtml()` (`.pr-guide-tab-badge`, dot), text like **Sidebar · Results Center**.

All user-facing strings live here (POT-R-5); components only call step builders.

### Step builders

Pure functions:

- `buildSidebarTourSteps(ctx: SidebarTourContext): DriveStep[]`
- `buildResultsCenterTourSteps(ctx: ResultsCenterTourContext): DriveStep[]`
- `buildWhereToReportTourSteps(ctx: WtrTourContext): DriveStep[]`

Context flags drive omission (no programs, no centers, update disabled, picker vs guide-only vs hub, emerging hidden).

Each step popover:

- `title` from copy module
- `description`: location badge HTML + `<span class="pr-guide-step-copy">…</span>`
- `side` / `align`: chosen per step in builder — bottom for RC toolbar steps on narrow screens; `right` for sidebar anchors on desktop.

### Driver configuration (`createPlatformDriver`)

Shared helper inside `ReportingGuideService` (or extracted if file size warrants):

| Option | Value | Rationale (POT-R-6, POT-R-7) |
|---|---|---|
| `showProgress` | `true` | User sees position in tour |
| `progressText` | `Step {{current}} of {{total}}` | Match SP tour |
| `overlayOpacity` | `0.72` | Stronger contrast for spotlight |
| `stagePadding` | `10` | Visible frame around target |
| `stageRadius` | `10` | Match rounded UI |
| `popoverClass` | `pr-guide` | Global skin |
| `animate` | `true` (respect reduced motion — see DD-3) | Smooth scroll to target |
| `allowClose` | `true` | Escape / X |
| `disableActiveInteraction` | `false` | WTR picker step may need radio click |

On destroy: write the tour-specific storage key.

**Single active tour:** calling any `start*Tour` destroys existing instance first.

### Sidebar auto-expand (POT-R-1)

`startSidebarTour` injects `SidebarService` (or existing sidebar toggle API used by `reporting-nav-sidebar`). If `isCollapsed()`, call expand/toggle once before `drive()`. **Reversion challenge (Step 2.3):** Removing auto-expand would leave program-list anchors hidden in collapsed rail — steps would silently skip and break POT-R-6. **Keep auto-expand.**

### WTR tour timing (POT-R-21)

`startWhereToReportTour` accepts `{ mode, loading, showEmerging }`. If `loading`, defer `drive()` until `modalMode` stable (component calls tour after catalog load) OR build zero-step guard that no-ops with console warn in dev.

Component wiring: header Tour button calls service with current `PlatformReportingGuideService` signals.

### Responsive SCSS

In `styles.scss` under `.driver-popover.pr-guide`:

- Add `@media (max-width: 639px) { max-width: min(340px, calc(100vw - 32px)); }` if not already satisfied by fixed 340px rule.

Kaizen **KZ-changes--results-center-reporting-guide-1**: WTR picker step highlights the **list scroll owner** (`platform-tour-wtr-picker` on the same element as `.rc-guide-picker__list`), not the modal root — avoids double-scroll confusion during tour.

## Shared Contracts

```typescript
type PlatformTourId = 'sidebar' | 'results-center' | 'where-to-report';

interface SidebarTourContext {
  hasMyPrograms: boolean;
  hasOtherPrograms: boolean;
  hasCenters: boolean;
}

interface ResultsCenterTourContext {
  canUpdateResult: boolean;
}

interface WtrTourContext {
  mode: 'guide-only' | 'pick-program' | 'hub';
  showEmerging: boolean;
  loading: boolean;
}
```

Export storage key constants from `platform-tour.types.ts` for tests.

## Design Decisions

### POT-DD-1 — Extend `ReportingGuideService` (not new service)

**Decision:** Option A from proposal — one Driver instance policy, shared config with SP tour.

**Alternatives rejected:** `PlatformTourService` duplicates bootstrap; mega-tour cross-route is fragile (proposal Option C).

**Requirements:** POT-R-1..R-4.

### POT-DD-2 — Pure `platform/` step module

**Decision:** Keep `reporting-guide.service.ts` bounded; step lists are pure functions + copy file.

**Requirements:** POT-R-5, maintainability.

### POT-DD-3 — Reduced motion

**Decision:** If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, pass `animate: false` to driver config.

**Requirements:** POT-NFR-4.

**Reversion challenge:** SP tour does not yet check reduced motion. Adding it only for platform tours does not remove SP behavior — no reversion.

### POT-DD-4 — Location badge helper

**Decision:** New `platformLocationBadgeHtml()` parallel to `tabBadgeHtml()` rather than reusing tab labels (platform surfaces are not SP tabs).

**Requirements:** POT-R-6.

### POT-DD-5 — Popover placement strategy

**Decision:** Step builders set explicit `side`/`align` per anchor; rely on Driver.js flip when insufficient space. Sidebar steps: `right` on ≥640px, `bottom` below. RC filter/export/table: `bottom` on mobile, `top` or `left` on desktop as needed.

**Requirements:** POT-R-7.

**Gap:** jsdom cannot assert placement — HITL at 375px and 1440px (see requirements §8).

### POT-DD-6 — Do not merge with SP tour storage

**Decision:** Three new keys; do not reuse `SP_TOUR_STORAGE_KEY` or `RESULT_SIDEBAR_HINT_STORAGE_KEY`.

**Requirements:** POT-R-4, POT-R-31.

## Budget (execute tripwire)

| Metric | Estimate |
|---|---|
| Tasks | **6** |
| LOC (product + tests) | **~420–480** |
| Review rounds | **1–2** |

Depth **Standard** matches estimate. Single PR recommended if under 500 LOC; split only if WTR modal wiring balloons.

## Risks

| Risk | Mitigation |
|---|---|
| Service file growth | `platform/` module; no inline copy in components |
| Tour over modal mask z-index | `pr-guide` z-index already 1e9 in `styles.scss` |
| Hub mode lane DOM differs | Context flag builds hub-specific selectors; test both guide-only and hub |
| AVISA emerging hidden | `showEmerging: false` omits W5 step |
