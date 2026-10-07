# Kaizen Entry — bilateral/rejected-result-correction

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/rejected-result-correction` (`RRC`) |
| Date | 2026-10-07 |
| Branch | qa-development-2026-ss (spec branch — every edit below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 10 + 1 finding fix (T-10-F1) | tasks.md |
| Reviewer FAIL rework attempts | 3 (T-6 ×1 — both lenses; T-8 ×2) | execution.md — T-6, T-8 |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 3 (T-3 `P-13`; T-6 NFR §7; T-9 scope) + 2 design location corrections (T-7, T-8) | execution.md — `## Pivot Record: RRC-T-3`, `## Pivot Record: RRC-T-6 (and T-9 scope)` |
| PRODUCT_BUGs (real run) | 2 — F1 fixed, F2 deferred | execution.md — `## Finding RRC-T-10-F1`, F2 note |
| Validation FAIL / WARN | n/a — no `/akili-validate` (accepted) | archive-summary.md §5 |
| Budget | review rounds T-8 3 vs 1; LOC ~4,430 vs ~1,300 (≈3.4×) | design.md §13; archive-summary.md §4 |

## Lessons

- **KZ-bilateral--rejected-result-correction-1 — Making a frozen attribute mutable falsifies every reader that renders a past event from that attribute's current value.** (Product + Methodology, High)
  - Root cause: before RRC a Rejected result could never change its primary SP, so the client rejection sentence safely read the **current** primary (`getProgramCode`, `notification-type.constants.ts:134`). `RRC-R-10` made the primary mutable at status 7, and no premise inventoried readers that derive a historical fact ("rejected by SP02") from current state. The defect passed every unit gate and surfaced only on PRTest.
  - Evidence: execution.md — `## Finding RRC-T-10-F1` (rejections by SP02 read "SP10" after the transfer); design.md §3 (no premise on historical readers).
  - Standardization: → P1

- **KZ-bilateral--rejected-result-correction-2 — Widening a status set was checked on the write gates only; status lists on the read and entry paths were missed twice.** (Product + Methodology, Medium)
  - Root cause: design §8.1 enumerated the server/client **gates** that admit `{1, 8}` and added 7, but not the **readers and entry points** that hard-code status lists. `getDraftInit(resultId, [Editing, Draft, PendingReview])` hid drafts at 7 (pivot `P-13`), and the history modal trigger stayed `@if (status === 7)` so history was unreachable after resubmission/approval (T-8 attempt 1 FAIL).
  - Evidence: execution.md — `## Pivot Record: RRC-T-3`; T-8 attempt 1 Reviewer FAIL issue 1 (`bilateral-results-list.component.html:451`).
  - Standardization: → P2

- **KZ-bilateral--rejected-result-correction-3 — An all-or-nothing NFR was written over an inherited pipeline whose transaction boundaries nobody checked.** (Product, Medium)
  - Root cause: requirements §7 promised "a failure leaves the previous primary and status intact", but the inherited RSB resubmission reset retired the old owner in an earlier, separately committed transaction. The design reused that pipeline without tracing its transaction boundaries, so both T-6 lens Reviewers failed it and a pivot moved the retirement into the final transaction.
  - Evidence: execution.md — T-6 attempt 1 (Reviewer A issue, Reviewer B issue 2), `## Pivot Record: RRC-T-6`.
  - Standardization: → P3

## Noted, not a lesson

- Design named the wrong host component twice (`bilateral-sp-selector` is never mounted at 7; the header status badge is unbound in the editor) — recurrence of an existing root cause → P4.
- LOC overran the budget ≈3.4× and no tripwire fired on LOC — recurrence → P5.
- `npm run test:local -- --testPathPattern="a|b"` prints nothing and exits 1 (wrapper mishandles `|`); task verification commands used it.
- A concurrent session's commit (`bc42f5554`) left 6 `tsc` errors in a spec file that Jest never reported; caught only because a brief asked for `tsc --noEmit`.
- GitHub returned 500 on push twice; a manual retry minutes later succeeded.
- Reviewer diff was handed over as a scratchpad file rather than inline (diffs up to ~1,900 lines) — worked well; worth keeping as a practice.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Premise Ledger guidance) |
| Edit | When the spec makes a previously immutable attribute mutable (owner, primary, status-locked field), add a premise listing every reader that renders a **past event** from that attribute's current value, and state how it will read the value at event time. |
| Severity | High |
| Status | pending |
| Upstream | Recommend to the AKILI methodology repo (generic: no stack or domain) |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Backend/Frontend module design guidance) |
| Edit | When a spec widens a status set, grep the status literals (`status_id === N`, `[Editing, Draft, …]`, `isRejected`) across **read paths and UI entry points**, not only the write gates, and list each hit as keep/widen in the design. |
| Severity | Medium |
| Status | pending |
| Upstream | Recommend to the AKILI methodology repo |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (NFR table guidance) |
| Edit | An atomicity NFR ("all-or-nothing", "a failure leaves X intact") must name the transaction(s) it relies on; when the flow reuses an existing pipeline, the design traces that pipeline's commit boundaries before approval. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--intermediate-outcome-aow-visibility--target-tooltip-1` |
| Edit | Add source spec `bilateral/rejected-result-correction` (design named host components without checking where they mount: `bilateral-sp-selector` only in the creation wizard; header status badge unbound in the editor — execution.md T-7, T-8 corrections). Recurrence noted; keep severity High. |
| Severity | High |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-notifications--bell-read-state-1` |
| Edit | Add source spec `bilateral/rejected-result-correction` (LOC ≈3.4× budget, ~1,170 prod + ~3,260 test vs ~550 + ~750; no LOC tripwire fired during execution). Recurrence noted; raise severity to High. |
| Severity | High |
| Status | pending |
