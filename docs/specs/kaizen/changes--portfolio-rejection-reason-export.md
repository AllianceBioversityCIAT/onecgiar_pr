# Kaizen Entry — changes/portfolio-rejection-reason-export

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-rejection-reason-export` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated, routine gates delegated by the owner; exceptions still stopped |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 (4 planned + PRE-T-5, PRE-T-6 owner-added) | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 2 (PRE-T-2 x1, PRE-T-3 x1) + 1 reopen of PRE-T-3 (attempt 3) | execution.md — PRE-T-2, PRE-T-3 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (one spec tension resolved at execute time: PRE-R-5 vs mount rule) | execution.md — Spec tension |
| PRODUCT_BUGs | n/a (no test-report.md); 1 defect found by PRE-T-4 in a closed task (Space key) | execution.md — Defect found by PRE-T-4 |
| Validation FAIL / WARN | n/a (PRTest HITL by owner) | execution.md — PRE-T-4 closed |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 (no REVIEW_SKIPPED task) | execution.md |
| Budget tripwire | 1 (after PRE-T-3; about 530 to 990 LOC, owner approved) | execution.md — Budget tripwire |

## Lessons

0 new lessons. The one real signal (a Brain-mocked Jest suite cannot see real overlay keyboard behavior, so Space was untoggleable until PRE-T-4 ran in a real browser) repeats an existing root cause: a Brain/Spartan mock hides what the real directive does. Recorded as a recurrence (P1), not a duplicate lesson.

## Noted, not a lesson

- Spec tension PRE-R-5 vs the FDE R-9 mount rule: the design premise cited only half of the page's mount condition (`hasFigures()` but not `filteredTotal() > 0`). First occurrence.
- Latency check (PRE-TEST-6 item 6) left unmeasured at owner acceptance.
- A shared checkout carried unattributed uncommitted changes from a peer session; handled with pathspec-only commits.
- Local environment cost: Node v26 vs the repo's Node 20, `npm ci` 19 min, Cypress unzip failure.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--portfolio-overview-revamp--global-filters-1` |
| Edit | Add `changes/portfolio-rejection-reason-export` as a source: Brain-mocked Jest passed PRE-T-3 while real Space handling failed (hidden `brnCommandInput` treats Space as a typed character); caught only by the real-browser PRE-T-4 pass. Same family as `KZ-changes--admin-reminders-page-1` (popover stub). Suggested wording: a task that changes a Brain/Spartan overlay or keyboard interaction carries a real-browser (Cypress CT) check in its own verification, not only Jest with the Brain mock. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — |
| Edit | None needed: the portfolio-overview folder `CLAUDE.md` was re-stamped inside PRE-T-3/T-6 as spec deliverables; no new module for the root guides. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-client/src/CLAUDE.md` |
| Edit | Optional 1-line note: `ExternalToolsComponent` skips its scroll-to-top on `NavigationStart` when `router.currentNavigation()?.extras?.info` carries `KEEP_SCROLL_NAVIGATION_INFO` (`shared/constants/router-navigation.constants.ts`); pages that mirror state with `router.navigate([], ...)` should pass it. No existing root-guide claim was falsified. |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | — |
| Edit | None: no TRD decision overturned. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |
