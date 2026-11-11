# Kaizen Entry — notifications/w1w2-center-tagged

## Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/w1w2-center-tagged` |
| Date | 2026-11-11 |
| Branch | qa-development-2026-ss (spec branch, not apply-capable; apply on `staging`) |
| Archive Run | 1 |
| Mode | full (Measure → Learn → Standardize → Record) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks `[x]` / total | 6 / 6 | tasks.md |
| Reviewer FAIL rounds | 2 (T3, T5), each fixed in attempt 2 | execution.md |
| HALT / FATAL_FAIL | 0 / 0 | execution.md |
| Pivot Records | 1 (WCT-T-2: D-1 + A-1 reverted, DD-3 superseded) | execution.md › Pivot Record |
| Budget tripwire | fired: ~920 LOC vs 400; rounds and task count within budget | execution.md › Budget Tripwire |
| PRODUCT_BUG / escaped defects | 0 | execution.md |
| Validation FAIL / WARN | n/a (no report; the 5 T6 PRTest gates passed) | execution.md › WCT-T-6 |
| `REVIEW_WAIVED` / `REVIEW_SKIPPED` | 0 / 0 | execution.md |

## Lessons

- **KZ-notifications--w1w2-center-tagged-1 — The Pivot Record sweep greps only the spec documents and the tree at pivot time. Files an in-flight Implementer is still writing escape it.** (Methodology, Low)
  - Root cause: the Pivot WCT-T-2 sweep checked `requirements.md`, `design.md` and `tasks.md`. The T3 Implementer was corrected by message mid-task, but the comments and spec header it had already written still cited the reverted A-1 / DD-3 ("non-primary"). The Reviewer caught this as a FAIL. The sweep procedure has no step for diffs that are still being written.
  - Evidence: execution.md › Pivot Record: WCT-T-2 › Sweep; WCT-T-3 Attempt 1 Reviewer FAIL finding 1.
  - Standardization: → P3 (upstream)

## Noted, not a lesson

- T5 Reviewer FAIL: the Implementer did not update the touched folder's `CLAUDE.md` or re-stamp it. The rule already exists (`onecgiar-pr-client/CLAUDE.md` §10, `src/CLAUDE.md` §22), and the Reviewer gate worked. This is recurrence feed for "folder-doc rule missed by Implementer", not a new lesson.
- The `result_id` vs `result_code` mix-up in a manual DB check briefly produced a false "no notification" report (execution.md › T6 diagnostic note). First occurrence recorded here; if it repeats, it earns a guide line.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--my-work-board-1` (premises must be verified in code before specify closes) |
| Edit | Add source spec `notifications/w1w2-center-tagged`. The design §10 reversion-challenge claimed "No test asserts lead notification" without grepping the existing specs. The P2-3214 test `notifies only the centres that were newly linked` asserted it, so T2 stopped at its disqualifier and the spec pivoted (D-1, A-1 reverted). Extension: a premise of the form "no test asserts X" counts as a code premise. Grep the existing `*.spec.ts` for the asserted call before you rely on it. Raise the recurrence count. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count tests) |
| Edit | Add source spec `notifications/w1w2-center-tagged`: ~920 LOC vs a 400 tripwire. Production delta was small. Tests and pins (T1 8 cases, T2 5 pins, T3 new 200-line spec, T5 3 spec files) drove the overrun, and the Pivot turned T2 tests-only. Same shape as before: size test LOC from scenario count × harness. Keep severity, recurrence noted. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | upstream |
| Target | AKILI methodology — `/akili-execute` Pivot Record › Sweep procedure |
| Edit | When a Pivot corrects an Implementer in flight, the sweep must also grep that Implementer's uncommitted diff (`git diff` on its touched files) for the superseded IDs and terms before the Reviewer round. |
| Severity | Low |
| Status | pending |
