# Archive Summary — changes/bilateral-review-center-strip-and-phase

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/bilateral-review-center-strip-and-phase/` (module code `BRC`) |
| Archive date | 2026-09-08 |
| Final status | **Complete** — 3/3 tasks `[x]` with Reviewer PASS; `test-report.md` / `validation-report.md` absent and accepted (gates were the spec's own Jest + CT suites, two Reviewer rounds per task and three Leader live looks) |
| Branch | `qa-development-2026` (spec branch; shared-file syncs recorded as pending items in the kaizen entry) |
| Commits | `fe892c94c` (T-1) · `736f5339c` (T-2) · `bf48eeff9` (T-3) · `15b3282ad` (spec) |

## Requirements delivered

BRC-R-1..R-10, R-20, R-21; AC-1..AC-15 (incl. 3b/8b); three key scenarios. `BRT-DD-7` superseded by `BRC-DD-1` (flipped in the parent design at archive).

## Files changed (from `execution.md`)

`pages/bilateral-review/`: `bilateral-review.component.{ts,html,spec.ts}`, `bilateral-review.query-params.ts` (+ `phase`, `normalizeBilateralReviewPhaseId`), `bilateral-review.copy.ts`, `bilateral-review.cy.ts`, `CLAUDE.md`, `services/bilateral-review-count.service.{ts,spec.ts}` (key `CODE::<number>`), new `components/bilateral-review-center-strip/*`; `dashboard-lab/components/reporting-program-band/reporting-program-band.component.{ts,spec.ts}` + `.favorites.spec.ts` (injects `DataControlService`). LOC: source +694 / −74 · tests +955 / −55 · guide +111.

## Test evidence

Jest `469 passed` (tab + band suites) after T-1 · `375` (tab) after T-2 · CT `17 passing` with a recorded RED probe (strip nowrap → `scrollWidth(3000) <= clientWidth(825)` failed). Live: badge = KPI Pending = 131 on P = 34; Cycle → 36 gives `?phase=36` + indicator; stale label param rewritten; no `versionId=0` request; strip counts = KPI; 2-line wrap at 840; contrast matrix ≥ 5.17 on new text.

## Validation

No `validation-report.md`. Reviewer verdicts: T-1 FAIL → scoped PASS; T-2 FAIL → scoped PASS; T-3 PASS (after one runtime retry). All ADVISORY items recorded.

## Accepted warnings / follow-ups

Chip count numerals ≈ 3:1 (inherited; fixed later by `BRP` badges) · two identical list requests per cold load (band `ensure` + page) · page catalog fallback fires alongside the shell's · `?phase=` cross-tab value-space collision with the Results tab · popover "Not specified" option · `aria-expanded` inert on "+N more" · guide cap 120 vs 150.

## Historical notes

Budget +117 % on source (KZ-REH-1 recurrence). `Number(null) === 0` shipped `versionId=0` past 466 green tests — caught only by the Leader's network capture. CT spec was latently broken from T-1 to T-3 because T-1/T-2 verified with targeted Jest only.
