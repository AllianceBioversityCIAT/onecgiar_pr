# Proposal — Platform onboarding tours (sidebar · Results Center · Where to report)

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `changes/platform-onboarding-tour` |
| **Slug** | `platform-onboarding-tour` — derived from free-text: *guía para usuario que recién entra y está perdido* |
| **Type** | Change |
| **Approval Mode** | gated |
| **Status** | specified (requirements + design + tasks drafted 2026-09-11) |
| **Date** | 2026-09-11 |
| **Depends on** | `changes/results-center-reporting-guide` (shipped), archived `sp-guided-tour-driverjs` |
| **Parallel-safe** | yes (client-only; coordinate `data-guide` anchors with RC guide work) |

---

## Intent

Give **new or lost users** the same **Tour** affordance that already exists on the Science Program shell (Image #1), extended to three platform surfaces they hit before they understand PRMS:

1. **Vertical navigation sidebar** — Science Programs vs Platform links (Portfolio overview, **Results Center**, QA, Admin).
2. **Results Center** — cross-program catalog: search, filters, export, **Where to report**, Update result.
3. **Where to report** guide — W1/W2 vs W3 vs emerging, persona-aware hub (Image #2 context).

Goal: reduce “where do I start?” cognitive load without blocking work.

---

## Problem / Current Behavior

| Surface | Today | Gap |
|---|---|---|
| **SP shell** (`dashboard-lab`) | **Tour** button on program band → `ReportingGuideService.startSpTour()` (Driver.js, 8 steps, tab orchestration) | Only covers Overview / Reporting / Results / My work **inside one program** |
| **Sidebar** | One-shot **collapse hint** on `result-detail` only (`startResultSidebarHint`) | No tour of **program list**, **Platform** section, or **Results Center** entry |
| **Results Center** | Hero + filters + table; **Where to report** CTA (recent) | **No Tour** button; no orientation copy |
| **Where to report modal** | Persona lanes + hub reuse | **No in-modal tour** explaining W1/W2 / W3 / emerging |

New users land on Results Center or a program shell and cannot map **navigation → catalog → reporting entry points**.

---

## Proposed Outcome

### Three contextual tours + optional “Getting started” chain

| Tour ID | Trigger | What it explains |
|---|---|---|
| **`sidebar`** | **Tour** in sidebar (EXTRAS or header) | PRMS layout: My SPs, Other SPs, Centers, **Platform** block (Results Center, IPSR, QA), collapse rail |
| **`results-center`** | **Tour** on RC hero (beside Where to report — Image #2) | Hero purpose, filters/chips, table, Export, **Where to report**, Update result |
| **`where-to-report`** | **Tour** in platform guide modal header | Three funding paths, program picker (if shown), when to use hub vs guide-only |

**Optional v1.1:** **`platform-welcome`** — first visit only: sidebar → navigate to RC → open WTR (3 linked tours, skippable). **Out of v1 scope** unless product wants one button “Getting started”.

### UX parity with SP Tour

- Same outline **Tour** button chrome as `reporting-program-band` (`data-guide="sp-tour-trigger"` pattern).
- Driver.js + `pr-guide` popover styling (reuse `ReportingGuideService` driver config).
- `localStorage` completion flags **per tour** (not one key for all):
  - `pr.tour.platform.sidebar.completed`
  - `pr.tour.platform.results-center.completed`
  - `pr.tour.platform.where-to-report.completed`
- Steps skip gracefully when anchor missing (existing SP tour pattern).

### Anchors (`data-guide`)

Add stable hooks — no brittle CSS selectors:

| Anchor | Host |
|---|---|
| `platform-tour-sidebar-programs` | SP list group |
| `platform-tour-sidebar-platform` | Platform links (Results Center row) |
| `platform-tour-rc-hero` | RC hero |
| `platform-tour-rc-filters` | Filter toolbar |
| `platform-tour-rc-where-to-report` | WTR CTA |
| `platform-tour-wtr-lanes` | Guide modal body / hub lanes |

---

## Scope

### In scope

- Extend **`ReportingGuideService`** (or thin `PlatformTourService` wrapper) with `startSidebarTour`, `startResultsCenterTour`, `startWhereToReportTour`.
- **Tour** buttons: sidebar, RC hero, WTR modal header.
- Copy in English; microcopy table in spec (i18n later).
- Responsive: ≥900px primary; collapsed sidebar — expand or skip program-list steps with copy note.
- Scoped Jest: step definitions, storage keys, launcher wiring (mirror `reporting-program-band` SP tour tests).

### Non-goals

- Replacing or merging **SP tour** (`startSpTour`).
- Replacing **result-detail sidebar hint** (keep separate storage key).
- Forced first-login modal blocking login.
- Backend / analytics pipeline (optional console-only dev flag OK).
- Tours for bilateral, IPSR, QA modules in v1.

---

## Affected Users, Systems, And Specs

| Persona | Benefit |
|---|---|
| **New submitter** | Understands RC vs SP reporting shell |
| **Center user** | Sees W3 path via Where to report tour |
| **PMU / read-only** | RC catalog + export orientation |

| System | Touch |
|---|---|
| `reporting-nav-sidebar.component.*` | Tour launcher + anchors |
| `results-list.component.*` | Tour launcher + anchors |
| `results-center-reporting-guide.component.*` | In-modal Tour + anchors |
| `reporting-guide.service.ts` (+ spec) | Tour orchestration |
| `docs/ux-ui/design.md` | Optional § note (archive sync later) |

| Related spec | Relationship |
|---|---|
| Archived `sp-guided-tour-driverjs` | Pattern reuse |
| Archived `results-center-reporting-guide` | WTR modal host |
| `sidebar-toggle-consolidation` | `data-guide="sidebar-toggle"` already exists |

---

## Visual Reference

- **Source:** User screenshots (2026-09-11) — SP Tour button cluster; Results Center hero; expanded sidebar with Platform section.
- **Location:** Cursor assets `image-1789175214059-0.jpg` (SP), `image-1789175214060-1.jpg` (RC), `image-1789175214060-2.jpg` (sidebar).
- **Notes:** Tour button on RC should match SP outline style; WTR tour lives inside modal header (compass row).

---

## Requirement Delta Preview

### ADDED

- **POT-R-1** — Sidebar **Tour** explains program navigation + Platform links including Results Center.
- **POT-R-2** — Results Center **Tour** explains catalog, filters, export, Where to report, Update result.
- **POT-R-3** — Where to report **Tour** explains W1/W2, W3, emerging (and picker when visible).
- **POT-R-4** — Each tour persistable independently; replay from Tour button anytime.
- **POT-NFR-1** — Driver.js a11y: Escape dismiss, focus management (match SP tour).

### MODIFIED

- None to SP tour behavior.

### REMOVED

- None.

---

## Approach Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **A — Extend `ReportingGuideService`** | Add platform tour methods + step builders alongside `startSpTour` | One driver instance policy; proven patterns | Service grows; keep file bounded via step modules |
| **B — New `PlatformTourService`** | Dedicated service; inject into sidebar/RC/WTR | Clear separation | Duplicates driver bootstrap config |
| **C — Single mega-tour cross-route** | One “Getting started” navigates RC + opens modal | One click for newcomers | Fragile routing; hard to test; poor replay |

**Recommended: A** — extend `ReportingGuideService` with a **`platform/` step module** (pure functions + constants), same driver skin as SP tour. Three entry methods, shared helper `createPlatformDriver(steps)`.

---

## Risks, Dependencies, And Open Questions

| Risk | Mitigation |
|---|---|
| Collapsed sidebar hides anchors | First step: “Expand sidebar” or auto-expand via `SidebarService` when tour starts |
| WTR tour while modal loading | Start tour after `visible()` + mode resolved; skeleton step if hub loading |
| Step overlap with SP tour | Distinct storage keys; no auto-chain in v1 |

| ID | Question | Default if silent |
|---|---|---|
| **OQ-1** | Auto-prompt first visit on Results Center? | No — manual Tour only v1 |
| **OQ-2** | Sidebar Tour button placement — EXTRAS vs header? | EXTRAS row “Take a tour” |
| **OQ-3** | Filter AVISA from WTR tour copy? | Follow hub rules (Avisa emerging hidden) |
| **OQ-4** | Include “Getting started” chained tour? | Defer to v1.1 |

**Kaizen note:** Reuse lesson **KZ-changes--results-center-reporting-guide-1** — one scroll owner per modal step when WTR tour highlights picker list.

---

## Success Criteria

- New user can start **Tour** on sidebar, RC, and WTR modal without reading external docs.
- Each tour completes with **Got it** and sets its own storage flag.
- SP tour regression: existing `startSpTour` tests still pass unchanged.
- Scoped Jest green on new tour specs.

---

## Next Step

```text
/akili-specify changes/platform-onboarding-tour
```

Depth: **Standard** (3 surfaces, reuse Driver.js, no API).
