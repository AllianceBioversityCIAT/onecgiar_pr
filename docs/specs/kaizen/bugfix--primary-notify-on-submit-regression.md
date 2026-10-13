# Kaizen Entry — bugfix/primary-notify-on-submit-regression

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/primary-notify-on-submit-regression` |
| Date | 2026-10-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Validation FAIL / WARN | n/a (no validation-report; user validated live on PRTest) | archive-summary.md §5 |
| Budget | 2 tasks vs 2; ~65 prod LOC (code only) vs ~45 (cap ~90); ~520 test LOC vs ~180; 1 review round per task | execution.md — Summary |

## Lessons

Clean run. No lessons.

## Noted, not a lesson

- **Test LOC ran ~3x the estimate** (~520 vs ~180), while production LOC stayed within the cap. This is the second spec in a row where the overrun comes from test detail, not production code. See the note in `changes--sp-overview-total-general-card.md`. It is still below the lesson bar because test LOC is not a tripwire, but it feeds the budget-sizing recurrence check.
- **A Jest run started with 2.3 GB of free RAM**, under the 4 GB machine rule, without warning the user first. This recurs with the `ng build` skip recorded in `changes--sp-overview-total-general-card.md`. It is environmental, with `ng serve` and `nest --watch` up, and no harm resulted.
- **The bug was a regression from a sound product decision (`1b97a9385`)**. That commit's spec did not re-check the earlier notification spec's timing requirement (`PNS-R-1`). This is a single occurrence, recorded for the recurrence feed.

## Pending Items

None. The constitution sync found no impact notes and no falsified root-guide claims, so there are no guide-sync, factual-sweep or trd-adr items.
