# Kaizen Entry — bugfix/p2-3960-bilateral-save-alert-consistency

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3960-bilateral-save-alert-consistency` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (spec-branch context; integration pin `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-1: folder `CLAUDE.md` over the 120-line cap; docs only) | execution.md — T-1 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 formal. A spec-mandated stop at T-1 step 1 (P-9 false) led to a user decision and an in-place amendment of design §10/§11 | execution.md — T-1 |
| PRODUCT_BUGs | 0 | test-report.md |
| Judgment-day severe findings | n/a (not recorded) | — |
| Validation FAIL / WARN | 0 / 5 (3 resolved at validation, 2 accepted) + 1 BLOCKED (R-1, accepted open) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | test-report.md / validation-report.md |
| Budget | review rounds 3 against 2; LOC about 170 against about 130 (user-accepted) | execution.md — budget totals |

## Lessons

No new lessons. Both root causes worth recording already exist in other entries, so each is recorded as a `digest-update` (P1, P2) instead of a duplicate.

## Noted, not a lesson

- P-6 under-counted the `selectSection` consumer tests by one ("the flush fails: savedTick NOT bumped"). The task's whole-file verification caught it as designed, at zero rework. This is related to KZ-bilateral--replicated-innovations-2026-pa--project-and-pa-assignment-1, but here the gate worked.
- The review-round budget (1 per task) assumed zero rework on a task that edits a folder `CLAUDE.md` already at about 122 lines. A doc-touching task in a near-cap folder could budget one extra round.
- W-1, found only at validation: `pendingStatusKeysFor` returns staged keys only, so DD-2's "scope the wait" analysis did not consider a request already in flight at click time. This meets BSA-R-1 as worded. It goes to a follow-up ticket.
- `akili doctor --agents` reported `leader.md` → `primary-instructions` OUTDATED (matched 2.36.0) at the start of execution. Run `akili doctor --agents --fix` on `staging`.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bugfix--p2-4129-innovation-use-level-threshold-1 |
| Edit | Add source `bugfix/p2-3960-bilateral-save-alert-consistency` and raise severity Low → Medium. Recurrence note: "Third spec running. design §11 P-9 (a code premise one grep settles: whether the field cards bind `titleStatus`) was left `UNVERIFIED`, graded Low and deferred to T-1, yet design §10's reversion-challenge answer depended on it. Settled false at T-1 step 1, it stopped the task, needed a user decision and amended §10. Broaden the upstream P2 wording from `data-env` to **any** premise a single read or query can settle when a reversion or impact answer depends on it: settle it at specify time, and let its 'If false' grade inherit the reversion's severity." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bugfix--emerging-contribution-not-required-1 |
| Edit | Add source `bugfix/p2-3960-bilateral-save-alert-consistency`. Recurrence note: "Second occurrence: `bilateral-result-creator/CLAUDE.md` went from about 122 to 127 lines → Reviewer FAIL (COMPONENT-DOCS §4), fixed by condensing to 119. The task brief named the folder `CLAUDE.md` but not its current line count. Briefs that edit a near-cap folder doc should state the current count and the cap." |
| Severity | Low |
| Status | pending |
