# Primary SP Request Sent on Submit for Review — Execution Log

## Document Control

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-notify-on-submit` (`PNS`) |
| **Approval Mode** | gated |
| **Branch** | `qa-development-2026-ss` |
| **Leader** | Claude Opus 5.5 (T1) |
| **Started** | 2026-10-01 |
| **Pre-flight** | At start: tree clean apart from the two untracked spec folders, `primary-decline-rejects-result` had no `execution.md`. No kaizen log, so no Active Lessons. **Later found violated** (see `PNS-T-1`). |

---

## Task Execution History

### `PNS-T-1` — Save the primary choice as a DRAFT on create

| Field | Value |
|---|---|
| **Final status** | `[~]` parked: Implementer done, Reviewer **not run** |
| **Date** | 2026-10-01 |
| **Attempts** | 1 (Implementer only) |
| **Effort** | high (shared status-4 semantics) |
| **Skills** | `nestjs-expert`, `tdd` (as listed) |
| **Requirements** | `PNS-R-1` |

**Attempt 1 — Implementer report (summary):**
- Files: `primary-program-request.service.ts` (`request()` `opts.asDraft`, DRAFT idempotency, DD-8 cancel also deactivates DRAFT, `findDraftPrimaryInitiativeId`, `stateFor` `draft`, enum `PrimaryRequestStateEnum.DRAFT`), `bilateral-center.service.ts` (`createResultHeader` asDraft, `updatePrimaryAssignment` `asDraft: currentPrimaryId === 0`, contributor exclusion of the draft SP), `bilateral.service.ts` (`populateInitiativeAndTocFromProgramCode` asDraft), `share-result-request.repository.ts` (draft count scoped to `contribution`; DRAFT `primary` excluded in `getRequestByUser` and `getPendingByUser`), plus the 3 spec files.
- Red: production files reverted to HEAD → new tests compile-red (missing `asDraft`, `DRAFT`, `findDraftPrimaryInitiativeId`) and repository tests assertion-red.
- Green: scoped Jest `Test Suites: 3 passed, 3 total · Tests: 213 passed, 213 total`. ESLint clean on 7 touched files.
- **P-5 verified as a real leak:** `getRequestByUser` in `share-result-request.repository.ts` had no `request_status_id` filter, so a DRAFT `primary` row would show as an actionable inbox request. Fixed with `and not (srr.request_type = 'primary' and srr.request_status_id = 4)` (also added in `getPendingByUser`). Only server inbox source: `share-result-request.service.ts` `getResultRequestByUser`.
- Not Done / Assumptions (verbatim points): (1) `updatePrimaryAssignment` uses only "no owner" because the method's entry guard already limits it to Editing/Draft. (2) `getPendingByUser` filter added beyond the named query, same gap. (3) **Concurrent writes by another session** to `primary-program-request.service.ts`, `share-result-request.service.ts` and new client `primary-decline-justification-dialog.*` files during the task.

**Blocker (Leader, verified with `git status` / `git diff --stat`):** another AKILI session is executing `notifications/primary-decline-rejects-result` in the **same checkout** (its `execution.md` shows `PDR-T-3` PASS, `PDR-T-1` `[~]` on `decline()`). This breaks the pre-flight item "`primary-decline-rejects-result` not being executed at the same time (same service; `Parallel-safe: no`)" and the one-session-per-checkout rule. Consequences:
- The PNS-T-1 diff cannot be isolated from PDR's uncommitted edits in the same files, so the Reviewer cannot be given a clean diff.
- PNS-T-2 (`decline()` → Editing, auto-move kept) overlaps PDR-T-1 (`decline()` → Rejected, no auto-move): the two specs disagree on the decline outcome and need an order decision.

Reviewer not spawned. Waiting for the user's decision.

**Decision (user, 2026-10-01): option A.** PDR finishes and is committed in its own session first. Then:
1. Re-run the scoped PNS-T-1 verification on top of the PDR commit, and give the Reviewer the PNS-T-1 diff against that commit.
2. Before PNS-T-2, amend `PNS-R-4` / design §5 item 10 so they follow PDR's decline rule (Rejected, no auto-move), using the Pivot Protocol with a sweep in both directions. This needs the user's approval before T-2 runs.

**Order changed (user, 2026-10-01):** the PDR session (Work 2) asked PNS to go first. The user confirmed: review PNS-T-1 now, then commit only the PNS hunks. Work 2 will not edit the shared server files until that commit lands.

**PNS-only patch:** the PNS hunks were split out of the mixed working-tree diff into `pns.diff` in the scratchpad. PDR's hunks in `primary-program-request.service(.spec).ts` were left out (imports, `PrimaryDecisionOutcome`, `getOtherAlignment` removal, `decline()`). The patch was applied to HEAD `3a339ff3f` in a temporary worktree. Results: scoped Jest `3 passed · 214 passed`, eslint exit 0, `tsc --noEmit` exit 0.

**Attempt 1 — Reviewer: FAIL** (verbatim issue):
1. **Discovered Issue:** a Project Information save on an existing ownerless result that already has a sent PENDING primary request now turns that request back into a DRAFT. The client's `saveAssignment()` always sends `primary_science_program_id` (`section-zero-dashboard.component.ts:281-286`). The path is: `updatePrimaryAssignment` gets `currentPrimaryId = 0`, so it calls `request(..., { asDraft: true })`. The idempotency check only matches DRAFT, so the DD-8 cancel deactivates the live PENDING row and inserts a DRAFT for the same SP. SP09's inbox request disappears. Before this change the same save was an idempotent no-op.
   **Violated Rule:** `requirements.md` §7 Compatibility ("Results already holding a pending request… stay pending, and Submit stays blocked for them until accepted"). Also `PNS-R-1` change-choice `BUT` and `PNS-DD-4` ("they keep the old path").
   **Remediation:** (a) in `request()`, when `asDraft` is true and there is an active PENDING row for the same SP, return it unchanged; or (b) in `updatePrimaryAssignment`, use `asDraft` only when there is no pending primary. Add a red-first test.

Confirmed by the Reviewer: the status guard holds (`bilateral-center.service.ts:187-195`), there is no contributor-draft leak, and `stateFor` priority, the swap path and the logs are OK.

ADVISORY (attempt 1):
- Readability: the inbox SQL hard-codes `'primary'` and `4`. `shareResultRequestExists` binds the enum instead.
- Readability: the `getRequestByUser` hunk strips trailing whitespace from about 8 unrelated SQL lines.
- Risk: the inbox exclusion is only proven by a regex over the SQL string. The manual HITL check is still needed.
- Reliability: `findDraftPrimaryInitiativeId` uses `findOne` without an order, so a race that leaves two DRAFT rows gives an arbitrary result.

**Leader adjudication:** in-scope FAIL. Remediation asks for **both** (a) and (b). (a) alone would still let an SP change on a legacy PENDING result turn it into a DRAFT, which goes against "stay pending".

**Attempt 2 — Implementer (effort xhigh):**
- (a) `request()`: when `asDraft` is set and there is an active PENDING row for the same SP, the row is returned unchanged (no update, no insert).
- (b) `updatePrimaryAssignment`: `hasPendingRound` comes from `findPendingPrimaryInitiativeId(parsedResultId, manager)`, and `asDraft` is `currentPrimaryId === 0 && !hasPendingRound`.
- Red on attempt-1 code: (a) expected `{ ok: true, shareResultRequestId: 10 }` but got `internal_error` (the update+insert path ran); (b) expected `{ asDraft: false }` but got `{ asDraft: true }`.
- Green in the working tree: `3 passed · 215 passed`, eslint clean.
- Skipped advisory: binding enum parameters in the inbox SQL. The existing regex test asserts the literal.
- No PDR code touched.

**Leader re-verification:** the PNS-only patch was regenerated (PDR hunks unchanged) and applied to HEAD in a clean worktree. Scoped Jest `3 passed · 216 passed`, eslint exit 0, `tsc --noEmit` exit 0.

**Attempt 2 — Reviewer: PASS.** "Both remediations are in place and have real tests. (a) returns a same-SP active PENDING row with no update or insert, and the test checks that. (b) reads for a pending round through the transaction `manager` and sends ownerless results with a live PENDING round down the old send-immediately path. That closes the attempt-1 DRAFT demotion and matches requirements.md §7 Compatibility, PNS-R-1 and PNS-DD-4."

ADVISORY (attempt 2):
- Reliability: the (b) spec does not assert that `findPendingPrimaryInitiativeId` is called with `fakeManager`.
- Readability: `request()` with `asDraft: true`, a different SP and an active PENDING row would still demote that row, but no current caller can reach it. The doc comment should state the precondition.

**Final status: PASS (attempt 2).**
- Requirements: `PNS-R-1` (all scenarios), §7 Compatibility.
- Decisions:
  - `updatePrimaryAssignment` relies on its own Editing/Draft guard instead of repeating the status check.
  - The inbox DRAFT exclusion was also added to `getPendingByUser`.
  - Both remediations (a) and (b) were applied.
- P-5 evidence: `share-result-request.repository.ts` `getRequestByUser` had no status filter, so the DRAFT `primary` exclusion was added (also in `getPendingByUser`). The main received inbox (`buildWhereReceivedConditions`) already filters status 1 / [2,3]. Manual HITL check is still owed.
- Commit: PNS hunks only, staged from the split patch. PDR's uncommitted hunks stay in the working tree.
