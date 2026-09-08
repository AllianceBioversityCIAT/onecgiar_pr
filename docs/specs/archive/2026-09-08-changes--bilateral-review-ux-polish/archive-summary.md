# Archive Summary — changes/bilateral-review-ux-polish

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/bilateral-review-ux-polish/` (module code `BRP`) |
| Archive date | 2026-09-08 |
| Final status | **Complete** — 4/4 tasks `[x]` with Reviewer PASS; owner reviewed the "after" screenshot and requested the follow-up spec (sign-off outcome); `test-report.md` / `validation-report.md` absent and accepted |
| Branch | `qa-development-2026` (spec branch) |
| Commits | `b3e7783a9` (T-1) · `5e7107edb` (T-2) · `ac96f916d` (T-3) · `4db13d572` (T-4) · `28fd3a05c` (owed live look) · `af3e4b566` (spec) |

## Requirements delivered

BRP-R-1..R-6, R-8..R-15, R-20, R-21 (R-7 sticky header dropped at premise check, `BRP-DD-3`); AC-1..AC-14 (incl. 3b, 4b, 7b; AC-7/AC-11 recalibrated from measurement to 231 / 282 px).

## Files changed

`pages/bilateral-review/`: page `{ts,html,spec.ts,copy.ts,query-params.ts}` (`group`, `isNarrow`, `centersExpanded`, `clearEverything`), `components/bilateral-review-center-strip/*` (collapsed mode, badges), `components/bilateral-review-kpis/*` (stat bar), `components/bilateral-review-table/*` (`BilateralReviewGroup`, owned `expandedKeys`, density, placeholders, cards branch), `bilateral-review.cy.ts` (31 cases), `CLAUDE.md`; `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` #15. LOC: source +1036 / −316 · tests +1361 / −120.

## Test evidence

Jest `435 passed` · CT `31 passing` with two RED probes (band `min-height: 300px` → `342 <= 140`; cards `overflow-y: auto` → offenders 2). Live: band 87 px collapsed, stat bar 42, first row 494 → 422 px; cards at 840/375; group by center IITA 99 · IWMI 20 · CIP 9; Actions divider; contrast ≥ 5.09.

## Validation

No `validation-report.md`. Reviewer: every task FAIL → scoped PASS (focus-ring token, slate control, missing divider, group toggles without rings, false deviation record).

## Accepted warnings / follow-ups

Skeleton `animate-pulse` without `motion-reduce:animate-none` · table-branch single-scroller RED probe · `expandedKeys` prune · popover "Not specified" option · match-count badge + drawer raw palette · guide cap · `?phase=` collision (from BRC).

## Historical notes

Three Leader-written false premises (Clear filters location, Actions divider, icon regions) survived two judges and were each caught by a Reviewer. The `#workArea` template-ref trap first appeared here (CT comment, CT probe).
