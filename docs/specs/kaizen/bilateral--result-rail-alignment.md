# Kaizen Entry — bilateral/result-rail-alignment

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/result-rail-alignment` |
| Date | 2026-09-15 |
| Branch | qa-development-2026 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | execution.md |
| Judgment-day severe findings | 0 | execution.md |
| Validation FAIL / WARN | 0 / 0 | archive-summary.md |
| Leader-inline audits | 3 review rounds | execution.md |

## Lessons

### L1 — Cross-module back navigation origin persistence
- **Root Cause:** Deeply nested editors (such as the bilateral result editor) can be arrived at from multiple distinct surfaces: W1/W2 Results Center (`/result/results-outlet/results-list`), Center Results (`/bilateral/:center/results`), or Drafts (`/bilateral/:center/drafts`). Hardcoding a generic fallback (like `/home`) or failing to skip internal editor sub-route hops causes disorienting navigation loops.
- **Evidence:** `smart-navigation.service.ts` and `bilateral-result-creator.component.ts`.
- **Classification:** Product.
- **Action:** Ensure `SmartNavigationService` tracks and persists valid origins across both W1/W2 and Bilateral domains in `sessionStorage`, filtering out internal editor hops so returning from a result always drops the user precisely where they originated with filters and phase query parameters intact.

## Noted, not a lesson

- User interactive testing refined the rail back button text from the lengthy "Back to Center overview" to a concise and intuitive "Back" with chevron icon, perfectly matching the design language of the platform.
- Full unit test coverage preserved: 106 tests in touched suites, 1,449 tests passing across all 46 bilateral test suites.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/AGENTS.md` |
| Edit | Document the bilateral editor rail navigation patterns and `SmartNavigationService` origin persistence contracts. |
| Severity | Low |
| Status | pending |
