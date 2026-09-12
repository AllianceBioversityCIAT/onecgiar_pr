# Execution — Platform onboarding tours

| Field | Value |
|---|---|
| Status | shipped (2026-09-11) |
| Branch | `qa-development-2026` |

## Summary

Implemented three Driver.js platform tours (sidebar, Results Center, Where to report) by extending `ReportingGuideService` with a `platform/` step module. Each tour has plain-English copy, location badges, progress text, stronger spotlight config (`stagePadding: 10`, `overlayOpacity: 0.72`), and independent `localStorage` keys.

## Tasks completed

| Task | Outcome |
|---|---|
| POT-T-1 | `platform/platform-tour-copy.ts`, `platform-tour.types.ts`, `platform-tour.steps.ts` + spec |
| POT-T-2 | `startSidebarTour`, `startResultsCenterTour`, `startWhereToReportTour`, `createPlatformDriver` |
| POT-T-3 | EXTRAS Tour button + sidebar `data-guide` anchors |
| POT-T-4 | RC hero Tour + anchors |
| POT-T-5 | WTR modal header Tour + anchors (guide-only + hub via entry-hub) |
| POT-T-6 | Responsive popover max-width; scoped tests green |

## Verification

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="platform-tour.steps|reporting-guide.service.spec|reporting-nav-sidebar.component.spec|results-list.component.spec|results-center-reporting-guide.component.spec" --no-coverage
```

**Result:** 271 tests passed (7 suites).

## HITL checklist (spotlight visibility — POT-R-6)

Manual check recommended at **375px** and **1440px**:

- [ ] Sidebar tour: each step frames exactly one element; location badge matches surface
- [ ] RC tour: popover does not cover highlighted hero/filters/export on desktop
- [ ] WTR tour: picker step highlights scroll list only; lanes visible in guide-only and hub modes
