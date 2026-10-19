# Archive Summary — KPI progress counts only KPIs with a target (P2-3974)

**Outcome:** shipped. The KPI progress % counts only KPIs with a target on every Science Program shell surface. KPIs without a target stay visible: they are counted in a split line and can be filtered in the card and in the toolbar. Pushed to `qa-development-2026-ss` in `383c372a9` (code) and `2f2d886bb` (spec docs).

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/kpi-progress-target-only/` |
| Archive Date | 2026-10-16 |
| Final Status | Complete — 8 / 8 tasks `[x]` (T-1…T-8, incl. Amendments A-1, A-2) |
| Ticket | Jira P2-3974 (Angel Jarrin) |
| Branch | `qa-development-2026-ss` |

## Requirements Delivered

| Requirement | Delivered by |
|---|---|
| KTO-R-1 `hasTarget` predicate (target finite > 0, achieved ignored) | T-1 |
| KTO-R-2 ratio over targeted KPIs, parity across surfaces (S-2.3) | T-1, T-2, T-3 |
| KTO-R-3 dash when no KPI has a target | T-2, T-3 |
| KTO-R-4 split line `N with target · M with no target set` | T-3 (+ 375 px row, T-6) |
| KTO-R-5 ⓘ and `%` rule copy | T-3 |
| KTO-R-6 disclosure titles | T-2, T-3 |
| KTO-R-7 in-card Target axis (placed first in the bar, user decision) | T-4 (+ T-6 layout rework) |
| KTO-R-8 pending helpers skip no-target rows | T-1 |
| KTO-R-9 spec #5 amendment | T-5 (additive note, 2026-10-16) |
| KTO-R-10 global Target filter, persisted as `?tgt=` (A-1) | T-7 |
| KTO-R-11 Overview Areas of Work card dash (A-2) | T-8 |

## Files Changed Summary

| Area | Files |
|---|---|
| Shared rule | `dashboard-lab/reporting-burndown.ts` (+ spec) |
| Shell | `dashboard-lab.component.{ts,html}` and the specs `component`, `kcr-reconciliation`, `hub`, `oah-rows`, `scope`, `toc-map` |
| Components | `reporting-aow-table`, `reporting-program-band`, `reporting-summary-stats`, `program-overview`, `reporting-entry-hub` |
| Shared spec | `shared/constants/achieved-display-basis.spec.ts` |
| Folder guides | `dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md`, `program-overview/CLAUDE.md` (re-stamped) |
| Other spec | `portfolio-overview-revamp/toc-kpi-progress/{requirements,design}.md` (additive amendment) |

## Test Evidence Summary

- Scoped Jest, `--maxWorkers=2`, one run at a time. Each task ran red → green, and the results are in `execution.md`. The last runs were:
  - T-7 pattern, 6 suites: 487 / 487
  - `program-overview`, 4 suites: 284 / 284
  - `reporting-aow-table.component.spec`: 208 / 208
- ESLint was clean on every touched `.ts` file (22 at T-6, plus later files). `ng build --configuration development` passed at T-7.
- Browser checks with Claude in Chrome, read-only, after confirming the served bundle matched disk: 8 / 8 PASS. They cover SP01 and SP05, the edge case where no KPI has a target. The user accepted them (decision c, 2026-10-16).
- There is no `test-report.md`, because `/akili-test` was not run. The test evidence lives in `execution.md`. The user accepted the absence by authorizing the commit and archive.

## Validation Summary

There is no `validation-report.md`, because `/akili-validate` was not run. Each task passed an independent Reviewer (`akili-reviewer`, a different model from the Implementer). The only FAIL was the breakpoint off-by-one in the T-6 rework (attempt 2), fixed in attempt 3. No FAIL is unresolved.

## Accepted Warnings Or Follow-Ups

| # | Follow-up | Owner |
|---|---|---|
| F-1 | **The shipped spec #5 query does not apply the target-only rule.** `getPortfolioTocCoverage` (`aow-bilateral.repository.ts:1322-1390`) only checks `is_active = 1`. A server change is owed | user to open ticket / spec |
| F-2 | The server `ProgressRollup` has no `done` field, so the AoW rows in `where-to-report-modal` and `results-center-reporting-guide` always show 0 reported (pre-existing) | follow-up |
| F-3 | At 375 px the AoW code chip overlaps the progress bar (pre-existing; left-zone starvation) | follow-up |
| F-4 | The Filter badge counts an inline Target selection at ≥ 640 px when the card has overflow Centers or Types (accepted advisory) | accepted |
| F-5 | SP05: Reporting shows "No Areas of Work…" while Overview counts 6 AoWs (pre-existing) | follow-up |
| F-6 | Ask Angel to amend the P2-3974 *How to test* step: *Overachieved* rows also count as no target (KTO-OQ-2) | user |
| F-7 | `codegraph sync` after merge | user / environment |

## Historical Notes

- The rule flipped three times. On 09-03 KCR excluded zero-target KPIs. On 09-09 Nicoleta asked to include them, done in `56fe6e3c5`. On 10-15 P2-3974 excluded them again. The user waived the KTO-OQ-1 sign-off gate: the ticket requester sets the rule. The full timeline is in `execution.md` §2.
- User decisions during the run:
  - all `buildRatio` surfaces follow the rule;
  - Target goes first in the in-card bar;
  - the global Target filter was added (A-1), filtering like Type and persisted in the URL like Category;
  - the Overview card shows a dash instead of asking Angel (A-2);
  - spec #5 was amended after its own execution.
- Budget: design §1 allowed ≤ 2 review rounds per task. The layout work during T-6 took 3 extra rounds, because jsdom cannot see layout. This is recorded in `execution.md`.
