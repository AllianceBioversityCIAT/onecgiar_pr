# Kaizen Entry — bugfix/ipsr-lead-contact-save-guard

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ipsr-lead-contact-save-guard` |
| Date | 2026-09-28 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md — T-1, T-2 (attempt 1 each) |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | test-report.md |
| Test gaps closed by /akili-test | 1 (Scenario 2.1 "carrying that free-text name": only the call was asserted, not the payload) | test-report.md §4 |
| Validation FAIL / WARN | 0 / 3 (V-1, V-2 fixed; V-3 accepted as follow-up) | validation-report.md §11 |
| Budget tripwire | **fired**: +196 / −10 against ~120 (estimate ~60). Production ≈ 8 lines; the rest is tests and comments | execution.md — *Budget tripwire* |
| `/akili-quick` escalation | 0 | — |
| Drift | no audit report present | docs/specs/audits/ (README only) |

## Lessons

None new. The one recurring signal is `KZ-REH-1` again (LOC budgets under-count), recorded as P1.

## Noted, not a lesson

- **The root cause of the bug was a consumer-side guard that drifted between siblings.** Results had replaced its portfolio carve-out with the `queryCameFromHydration` exemption, and IPSR never got the same change (proposal.md — *Root Cause*, "History"). This spec already put the standardization in place as a deliverable: the field's `CLAUDE.md` Traps entry now says one rule is shared by both consumers and any change goes on both. No further edit is needed. If a third consumer shows up, proposal Option C (a shared helper) is the structural fix.
- **A stale parity claim in a doc comment:** `isLeadContactPersonRequired` claimed IPSR shares `validation_general_information_P25`, and it does not (proposal OQ-1). It was found and corrected here, not caused here. This is the same family as `KZ-changes--sp-bilateral-review-tab-2` ("a comment is not a contract"). It is below the bar for a new recurrence item, because this spec detected the problem rather than being hurt by it.
- **V-2, a self-contradictory budget line:** execution.md said "within budget" while also recording an overrun escalated to the user. The Leader summarised the task and round budgets and skipped the LOC tripwire. It is minor, but it is the same blind spot that keeps `KZ-REH-1` recurring: the LOC signal gets explained away rather than reported.
- **Test gap at T-1:** the 2.1 cases stubbed the flag the field sets, so the field ↔ guard handshake went untested until `/akili-test`. The author's own ADVISORY had flagged it. Below the bar.
- **The auditor was not independent:** the same model family implemented and validated the spec (validation-report.md §1).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add `bugfix/ipsr-lead-contact-save-guard` as a source: ~60 estimated, +196/−10 delivered (≈ 8 production lines, ≈ 160 test lines for 7 clause rows × portfolio variants, plus rationale comments). This confirms the `ipsr/gi-impact-area-scores-parity` note: size test LOC from the clause-ownership table × portfolio variants, not from production LOC. Also add: the execution summary must report the LOC tripwire explicitly as fired or not fired, never folded into "within budget" (validation V-2). Keep Medium. |
| Severity | Medium |
| Status | pending |
