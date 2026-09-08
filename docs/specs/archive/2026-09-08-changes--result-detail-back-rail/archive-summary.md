# Archive Summary — Back to results relocated to the Result Sections Sidebar rail

The origin-aware **Back to results** anchor now lives at the top of `app-result-sections-sidebar`, stays visible while the form canvas scrolls, and frees ~32px of header fold space by removing the link from `app-result-header`.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/result-detail-back-rail/` |
| Archive date | 2026-09-08 |
| Final status | **Shipped** — `RDBR-T-1`…`RDBR-T-3` PASS, attempt 1 each |
| Approval mode | gated · Standard · Change |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Primary commit | `a818597cd` |

## Original Spec Path

`docs/specs/changes/result-detail-back-rail/`

## Archive Date

2026-09-08

## Final Status

**Shipped on `qa-development-2026`.** All three tasks PASS on first attempt. `test-report.md` and `validation-report.md` absent — **accepted** (evidence in `execution.md` and scoped Jest re-run at archive).

## Requirements Delivered

| ID | Outcome |
|---|---|
| `RDBR-R-1` | `[data-testid="result-detail-back-link"]` is the first interactive element in `app-result-sections-sidebar` with ghost styling and divider |
| `RDBR-R-2` | `SmartNavigationService` preserves path, query params, and origin-aware `title` (My results / programme results / all results) |
| `RDBR-R-3` | Back link removed from `app-result-header`; `<h1>` title is topmost in the canvas header |
| `RDBR-R-4` | Back link remains in the fixed sidebar rail while `rd_scroll` scrolls |
| `RDBR-AC-1`…`RDBR-AC-6` | Covered by component specs and combined regression |

## Files Changed Summary

| Area | Files |
|---|---|
| Sidebar rail | `result-sections-sidebar.component.{html,ts,spec.ts}` — inject `SmartNavigationService`, back link anchor |
| Canvas header | `result-header.component.{html,ts,spec.ts}` — remove back link getters and anchor |
| Constitutional baseline | `docs/ux-ui/design.md` §6 — secondary rail hosts persistent way-back anchor |

No server, API, or `SmartNavigationService` algorithm changes.

## Test Evidence Summary

| Gate | Result |
|---|---|
| `result-sections-sidebar.component.spec.ts` | 19/19 (execute) |
| `result-header.component.spec.ts` | 61/61 (execute) |
| Combined scoped re-run at archive | **80/80** |
| `result-detail` module regression (execute) | 1580/1580 |
| `npx tsc --noEmit -p tsconfig.app.json` | 0 errors (execute) |

## Validation Summary

No `validation-report.md`. Reviewer PASS on all tasks, attempt 1. No FAIL findings recorded in `execution.md`.

## Accepted Warnings Or Follow-Ups

- Manual visual QA of header elevation and sidebar divider spacing — optional; unit tests cover DOM contract.
- `test-report.md` / `validation-report.md` never authored — accepted at archive.
- No TRD ADR required (UI relocation only; `SmartNavigationService` contract unchanged).

## Historical Notes

- Builds on `changes/result-submitter-back-link`, `bugfix/smart-back-button`, and My Results origin persistence (`3c28f307c`).
- Related in-flight specs (`reporting-hierarchical-search-filters`, bilateral review polish) explicitly marked this spec disjoint — no merge conflicts at archive time.
