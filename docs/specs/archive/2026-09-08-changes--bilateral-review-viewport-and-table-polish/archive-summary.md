# Archive Summary — changes/bilateral-review-viewport-and-table-polish

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/bilateral-review-viewport-and-table-polish/` (module code `BRV`) |
| Archive date | 2026-09-08 |
| Final status | **Complete** — 3/3 tasks `[x]` with Reviewer PASS; owner visual sign-off pending at archive time (owner invoked the archive); `test-report.md` / `validation-report.md` absent and accepted |
| Branch | `qa-development-2026` (spec branch) |
| Commits | `609fc73f8` (T-1) · `f441e748a` (T-2) · `9c1b868f8` (T-3) · `43ed79530` (spec) |

## Requirements delivered

BRV-R-1..R-11, R-20; AC-1..AC-13 (incl. 3b, 4b, 7b; pinned cap recalibrated 130 → 150 from a 142 px measurement).

## Files changed

`pages/bilateral-review/`: `bilateral-review.component.{ts,html,spec.ts}` (host class, pinned wrapper, `--brv-pinned-h`), new `bilateral-review.component.scss` (viewport-lock mixin, `scroll-margin-top`), `bilateral-review.copy.ts`, `components/bilateral-review-table/*` (7/6 columns, Alignment, fixed status pairs, accent, single-line headers, action tone), `bilateral-review.cy.ts` (51 cases), `CLAUDE.md` (148 lines); `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` #16. LOC: source +272 / −68 · tests +893 / −58.

## Test evidence

Jest `459 passed` · CT `51 passing` · `ng build` ok · RED probes: host-static injection → `scrollHeight(4217) <= clientHeight(900)`; drop-sticky → `pinned.top(-544) === workArea.top(56)`; `showCenterColumn()` forced true → `expected 7 to equal 6`. Live: host `absolute`, document not scrollable, pin geometry exact after 600 px, `scrollMarginTop 172px`, headers 40 px, pills as tints (4.51 / 6.87), 11 rows visible vs 8 before.

## Validation

No `validation-report.md`. Reviewer: every task FAIL → scoped PASS (dead `#workArea` selector, host gate, cards accent evidence, false "strip not pinned" sentence).

## Accepted warnings / follow-ups

`.ts:892` stale `130px` comment and `.html:21` `#bilateral-review-pinned` wording · `columnCount()` hard-coded 7/6 · match-count badge + drawer raw palette · align sibling tabs to pinned chrome or accept (`DESIGN-DEVIATIONS.md` #16) · stat bar pinning (OQ-1) · 120 vs 150 folder-doc cap.

## Historical notes

The viewport lock had been missing since `sp-bilateral-review-tab` while a template comment claimed parity; found by the owner's screenshot. Judges caught the `-100` token-shade trap and the vacuous 7-row fixture before execution.
