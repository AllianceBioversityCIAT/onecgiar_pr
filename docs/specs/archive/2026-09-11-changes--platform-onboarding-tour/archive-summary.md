# Archive Summary — Platform onboarding tours

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/platform-onboarding-tour` |
| Module code | `POT` |
| Archive date | 2026-09-11 |
| Branch | `qa-development-2026` |
| Depth | Standard |
| Commit | `b5baaf3c5` |

## Final Status

**Shipped** — POT-T-1..T-6 complete. Scoped Jest green (271 tests, 7 suites). HITL spotlight checklist in `execution.md` remains owner QA (accepted gap per requirements §8).

## Requirements Delivered

| ID | Outcome |
|---|---|
| POT-R-1 | Sidebar **Tour** in EXTRAS with auto-expand + conditional steps |
| POT-R-2 | Results Center hero **Tour** with update step omission when disabled |
| POT-R-3 | Where to report modal **Tour** (guide-only, picker, hub modes) |
| POT-R-4 | Independent `localStorage` keys + replay anytime |
| POT-R-5 | Plain-English copy from §6.1 via `platform-tour-copy.ts` |
| POT-R-6 | Stronger spotlight config + location badges (automated; HITL visual gate open) |
| POT-R-7 | Responsive popover max-width in `styles.scss` |
| POT-R-20 | SP-matching outline Tour chrome on all launchers |
| POT-R-21 | WTR tour deferred while catalog loading |
| POT-R-30 / R-31 | SP tour + sidebar hint storage unchanged |

## Files Changed Summary

| Area | Files |
|---|---|
| Step module | `dashboard-lab/services/platform/platform-tour-{copy,types,steps}.ts`, `platform-tour.steps.spec.ts` |
| Service | `reporting-guide.service.ts`, `reporting-guide.service.spec.ts` |
| Sidebar | `reporting-nav-sidebar.component.{html,ts,spec.ts}` |
| Results Center | `results-list.component.{html,ts,spec.ts}` |
| WTR modal | `results-center-reporting-guide.component.{html,ts,spec.ts}` |
| Hub embed | `reporting-entry-hub.component.html` (anchors) |
| Styles | `src/styles.scss` (mobile popover max-width) |

## Test Evidence Summary

```bash
cd onecgiar-pr-client && npm run test -- \
  --testPathPattern="platform-tour.steps|reporting-guide.service.spec|reporting-nav-sidebar.component.spec|results-list.component.spec|results-center-reporting-guide.component.spec" \
  --no-coverage
```

**Result:** 271 passed (7 suites). No `test-report.md`; evidence captured in `execution.md`.

## Validation Summary

No `validation-report.md`. No automated FAIL findings. Reviewer rework attempts: 0. SP tour regression block in `reporting-guide.service.spec.ts` remained green.

## Accepted Warnings Or Follow-Ups

| Item | Owner | Notes |
|---|---|---|
| HITL spotlight at 375px + 1440px | Product / QA | Checklist in `execution.md` — jsdom cannot prove pixel placement (requirements §8) |
| OQ-4 chained “Getting started” tour | Product | Deferred v1.1 per proposal |
| Auto-prompt first RC visit (OQ-1) | Product | Default: manual Tour only |

## Historical Notes

- Extends archived `sp-guided-tour-driverjs` pattern (Option A — single `ReportingGuideService`).
- Builds on shipped `results-center-reporting-guide` for WTR modal host.
- Applied kaizen **KZ-changes--results-center-reporting-guide-1**: WTR picker step targets list scroll owner, not modal root.
