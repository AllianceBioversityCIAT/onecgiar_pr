# Kaizen Entry — bilateral/shell-sp-alignment

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/shell-sp-alignment` |
| Date | 2026-09-14 |
| Branch | qa-development-2026 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 | tasks.md |
| Reviewer FAIL rework attempts | 2 (BSA-T-2 attempt 1, BSA-T-3 attempt 1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | execution.md |
| Judgment-day severe findings | 0 | execution.md |
| Validation FAIL / WARN | 0 / 0 | archive-summary.md |
| Leader-inline audits | 4 tasks | execution.md |

## Lessons

### L1 — Proactive migration of legacy PrimeIcons in touched files
- **Root Cause:** In `BSA-T-2` and `BSA-T-3`, legacy `pi pi-*` classes were initially preserved during layout refactoring, triggering reviewer rework rejections under `KZ-BOR-1`.
- **Evidence:** `execution.md` BSA-T-2 & BSA-T-3 rework rounds.
- **Classification:** Methodology.
- **Action:** Enforce proactive replacement of `pi pi-*` icons with `material-icons-round` in pre-flight implementer guidelines whenever modifying legacy templates.

### L2 — Host viewport-locking SCSS encapsulation
- **Root Cause:** In `BSA-T-2`, initial implementer draft did not fully encapsulate `:host` rules under `@media (min-width: 900px)` in `.scss`, requiring rework per `KZ-changes--sp-shell-app-viewport-2`.
- **Evidence:** `execution.md` BSA-T-2 rework round.
- **Classification:** Methodology.
- **Action:** Ensure viewport-locked parent containers always place `:host` styling inside component `.scss` files.

## Noted, not a lesson

- All 3 bilateral views (Reporting, Results, Drafts) were successfully aligned to the Science Programs (SP) viewport-locked scroller pattern with docked toolbars and shimmering skeleton loading states.
- 100% test pass rate maintained with zero regression across 30 suites (968 tests).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/AGENTS.md` |
| Edit | Note the `#workArea` viewport-locking convention and docked toolbar pattern across the 3 bilateral tabs. |
| Severity | Low |
| Status | pending |
