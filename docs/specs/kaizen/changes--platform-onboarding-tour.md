# Kaizen Entry — changes/platform-onboarding-tour

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/platform-onboarding-tour` · Prefix `POT` |
| Date | 2026-09-11 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); shared-file edits recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | gated · Depth Standard |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 / 6 (`POT-T-1`..`POT-T-6`) | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 0 | `execution.md` |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | 0 | `archive-summary.md` |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | 0 / 0 (no validation report) | `archive-summary.md` |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | 0 | — |
| Budget | ~490 LOC est. vs ~1,693 LOC in commit (spec docs + product) | `tasks.md`, git `b5baaf3c5` |

## Lessons

Clean run. No systemic product or methodology defects identified.

## Noted, not a lesson

- HITL spotlight visibility (POT-R-6) remains an accepted manual gate — same pattern as `sp-guided-tour-driverjs` and requirements §8 defect-class table.
- WTR picker step reused single scroll-owner rule from **KZ-changes--results-center-reporting-guide-1** at design time (no recurrence — lesson was already institutionalized as pending P1 in that entry).
- Platform tours add `prefers-reduced-motion` handling while SP tour still uses fixed `animate: true` — intentional scope split per POT-DD-3; not a defect.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` |
| Edit | Add a `## Platform tours (POT)` note under services: `ReportingGuideService.startSidebarTour` / `startResultsCenterTour` / `startWhereToReportTour`; step builders live in `services/platform/`; storage keys `pr.tour.platform.*.completed`; SP tour (`startSpTour`) unchanged. |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/CLAUDE.md` (create if absent) or `onecgiar-pr-client/src/AGENTS.md` Results Center section |
| Edit | Document RC hero **Tour** button → `startResultsCenterTour({ canUpdateResult })` and WTR modal header tour wiring. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md`, `AGENTS.md` |
| Edit | Sweep ran: no falsified claims found (guides do not assert absence of platform tours). |
| Severity | Low |
| Status | done (no-op) |

### P4

| Field | Value |
|---|---|
| Kind | codegraph |
| Target | `.codegraph/` |
| Edit | Recommend `codegraph sync` after merge to index `services/platform/` and new `data-guide` anchors. |
| Severity | Low |
| Status | pending |
