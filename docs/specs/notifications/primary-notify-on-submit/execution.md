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

## Pivot Record: PNS-T-2

- **Date:** 2026-10-01. **Approved by:** Santiago Sanchez (also approved running T-2 and T-3 in parallel).
- **Blocker:** `primary-decline-rejects-result` shipped in `ea4411693`. Under `PDR-R-4`/`PDR-R-5`, any ownerless primary decline sets the result to **Rejected**, with a justification and a REJECTED history entry, and never auto-moves. The old `PNS-R-4` said the opposite: return to Editing and keep the auto-move.
- **Revised direction:** `PNS-R-4` now defers to `PDR-R-4`. PNS-T-2 makes no `decline()` code change and adds only a regression test (decline from Pending Review → Rejected, no new primary request). OQ-1 is superseded.
- **Amended:**
  - `requirements.md`: Related specs, Amended row, Out of scope, R-2 no-choice text, R-4, §8, §9, OQ-1.
  - `design.md`: §2, §5 items 1 and 10.
  - `tasks.md`: T-1 scope wording, T-2 title/scope/tests/Fails if, §5 manual check, §6.
- **Sweep:**
  - Forward: grep for `Editing with`, `returns it to`, `auto-move kept`, `cancelRound`, `sent back` leaves only the amendment notes.
  - Backward: references to `R-4`, `sent-back` and `PSR-R-7` were checked. The remaining "Editing" mentions are submit preconditions and are still valid.
- **ADR:** none affected (spec-level rule only).
- PDR also removed `opts.cancelRound` from `request()`. `asDraft` and the idempotency branch are intact (Work 2 report).

### `PNS-T-3` — Client: `draft` state banner and Submit not blocked

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 1) |
| **Date** | 2026-10-01 |
| **Attempts** | 1 |
| **Effort** | medium |
| **Skills** | `angular-developer`, `spartan` (as listed) |
| **Run with** | `PNS-T-2`, in parallel (disjoint packages, user-approved) |
| **Requirements** | `PNS-R-5` |

**Files:**
- `section-zero-dashboard.component.ts`: `'draft'` added to the state union; draft returns an `info` banner with `banner.draft(code)`; `submitBlockedReason()` returns null for draft. `primaryPickerDisabled` is unchanged (only `pending` disables the picker).
- `bilateral-primary-assignment.copy.ts`: `banner.draft`.
- `section-zero-dashboard.component.spec.ts`: 3 tests.

**Evidence:**
- Red before the change: the draft banner tone was `undefined`; the draft blocked reason was "Submit for review is unavailable until a primary Science Program accepts."; the pending regression passed.
- Green: `1 passed · 34 passed`.
- `ng lint --quiet`: all files pass. Per-file eslint has no flat config in the client.

**Reviewer: PASS.** "The diff (about 74 LOC, client only, inside the T-3 boundary) does what PNS-T-3 scopes." The exact copy, picker behavior and PDR's `sent_back`/`readOnly()` branch are intact, and no new tokens were added.
- Scope note: the client tests prove only the "no Submit-blocked reason" half of `PNS-R-5`. Whether Submit is enabled is decided on the server (T-2) and is checked at the manual HITL step.

ADVISORY:
- Reliability: a `draft` with a null `program_code` would render " will be asked…" with no SP code. The `pending` branch has the same pattern.
- Readability: the new spec helpers duplicate setup from earlier describe blocks.

## Budget Tripwire (2026-10-01)

| Measure | Budget (`design.md` §9) | Actual at PNS-T-2 implementation |
|---|---|---|
| Tasks | 3 (escalate at > 4) | 3 |
| LOC (code + tests) | ~300 (escalate at > ~450) | **~1,070**: production ~360 (T-1 ~180, T-2 ~165, T-3 ~20), tests ~700 (T-1 ~305, T-2 ~345, T-3 ~55) |
| Review rounds | 2 | 3 before the T-2 review (T-1 ×2, T-3 ×1) |

- **Cause:** the overrun is mostly tests. Red-first tests, plus regression and compatibility tests (the legacy-PENDING fix in T-1 attempt 2), and long `@akili-spec` comments in the spec files. Production code was about 1.7× the estimate. The functional scope did not grow.
- **Decision:** the user said to continue ("continua", 2026-10-01).
- **For `/akili-archive`:** recalibrate the LOC estimates for server tasks with red-first transactional tests.

### `PNS-T-2` — Submit sends; accept announces; decline regression; review guard

| Field | Value |
|---|---|
| **Status** | in rework |
| **Date** | 2026-10-01 |
| **Effort** | high → xhigh (bumped on rework) |
| **Skills** | `nestjs-expert`, `tdd`, `error-handling-patterns` (as listed) |
| **Run with** | `PNS-T-3`, in parallel |
| **Requirements** | `PNS-R-2`, `PNS-R-3`, `PNS-R-4` (amended) |

**Attempt 1 — Implementer:**
- `assertSubmittable` allows an ownerless result when it has a DRAFT.
- `submitForReview`: `sendDraft(resultId, manager)` runs inside the transaction; `announcePendingReview` runs only when there is an owner.
- New `sendDraft` throws on 0 rows.
- `accept()` → `announceIfPendingReview`, which looks up `BilateralService` lazily through `ModuleRef` and never throws.
- `reviewBilateralResult` gets an owner guard (400).
- `decline()`: no change; a regression test only.
- Tests in `bilateral-center.service.spec.ts`, `primary-program-request.service.spec.ts` and `results.service.spec.ts`.
- Red seen for: R-2 main and failure, R-3, and the review guard.
- Green: `7 passed · 298 passed`; eslint 0 errors; `tsc` clean; `migration:check` Pending: 0.
- Assumptions:
  1. Guard tests placed in `results.service.spec.ts`.
  2. The owner is read twice, the second time before the transaction.
  3. `BilateralService` import is used only at call time.

**Attempt 1 — Reviewer: FAIL** (verbatim issue):
1. **Discovered Issue:** In `primary-program-request.service.ts`, the new top-level `import { BilateralService } from '../../../bilateral/bilateral.service';` (line 46) creates a file-level import cycle. Based on how the app loads its files, it is expected to make Nest fail at startup.
   - Load order: `api/modules.routes.ts` loads `ResultsModule` first (line 3), then `results.service.ts`, which imports `primary-program-request.service.ts` (lines 152-153).
   - At line 46, `bilateral.service.ts` loads for the first time and imports `primary-program-request.service.ts` back (`bilateral.service.ts:125-128`). That file has not defined its class yet, so the import is `undefined`.
   - `BilateralService` injects it with a plain constructor type (`bilateral.service.ts:285`, no `forwardRef`), so Nest records `undefined` for that constructor argument and cannot start.
   - The green tests cannot catch this: the spec files import in the safe order, `results.service.spec.ts` builds the service with `Object.create`, and nothing in the evidence booted `AppModule`.
   - Precedent: the "Defect A" comment in the same file (lines 172-178).
   **Violated Rule:** `design.md` P-7 and `PNS-DD-3` ("Lazy `ModuleRef` lookup avoids the module cycle"); `.agents/reviewer.md` §2 ("bad imports introduced").
   **Remediation:** remove the top-level import and load the class inside `announceIfPendingReview` with a dynamic `await import(...)`, or use a string token. Do not rely on `forwardRef` alone. Prove it by booting Nest (`npm run start:dev`) or with a spec that imports `./app.module` first and asserts that neither class's `design:paramtypes` contains `undefined`.

Confirmed conforming by the Reviewer: R-2 (all scenarios), legacy PENDING still blocked, R-3 never throws, R-4 regression present, exact guard text. Assumption 1 (test location) is allowed. Assumption 2 (read before the transaction) has no harmful race: a DRAFT can never be accepted, and a second concurrent submit's `sendDraft` updates 0 rows and rolls back.

ADVISORY (attempt 1):
- Reliability: the owner is read twice; return it from `assertSubmittable` instead.
- Risk: `announceIfPendingReview` does not check that the result had no owner before this accept. **Leader note:** unreachable today, because a swap is only possible in Editing/Draft (`updatePrimaryAssignment` guard) and Submit is blocked while a swap is pending.
- Reliability: the status update in the submit transaction has no `WHERE status_id IN (...)` guard on the owner path. This was already true before this change.

**Leader adjudication:** in-scope FAIL; attempt 2 at xhigh.

**Attempt 2 — Implementer (effort xhigh, skills `nestjs-expert` + `systematic-debugging`):** `tdd` was swapped for `systematic-debugging` because this was a load-order defect proven by a boot/metadata probe, not by a unit red→green.
- **Red probe** (attempt-1 code, `require('app.module')` first, mirroring Nest `Injector` param resolution): `bilateralUndefinedAt: [46]` (`_primaryProgramRequestService`). The defect is confirmed real.
- **Fix:** the static import was removed. `announceIfPendingReview` now does `await import('../../../bilateral/bilateral.service')` and then `moduleRef.get(..., { strict: false })`. Under the commonjs target this compiles to a deferred `require`. The R-3 tests are unchanged.
- **New guard spec:** `primary-program-request.load-order.spec.ts`.
- **Green:**
  - The probe passes.
  - `npm run start:dev` reached "Nest application successfully started", then hit `EADDRINUSE :3400` because another dev server is already on that port (after DI had resolved).
  - Jest `8 passed · 299 passed`; eslint clean; `tsc` clean.

**Attempt 2 — Reviewer: PASS.** "The attempt-1 FAIL is fixed, and I found no regressions." There are no static bilateral imports left, the lookup is lazy as P-7 and `PNS-DD-3` require, and the dynamic import sits inside the existing try/catch so `accept()` never throws. The load-order spec is a valid guard: it uses the production load order, opens no DB connection, and fails if the static import returns.

ADVISORY (attempt 2):
- Readability/risk: the load-order spec hand-copies Nest's metadata keys and injector logic. Import the keys from `@nestjs/common/constants` instead.
- Readability: the comment block over the removed import and the JSDoc on `announceIfPendingReview` duplicate each other and could be cut to 3–4 lines.

**Final status: PASS (attempt 2).**
- Requirements: `PNS-R-2`, `PNS-R-3`, `PNS-R-4` (amended → `PDR-R-4`).
- Decisions:
  - `decline()` unchanged (Pivot Record).
  - Review-guard tests in `results.service.spec.ts`.
  - Owner read twice (advisory).
  - Dynamic import plus `ModuleRef` for the lazy lookup.
- Owed to the manual HITL check: real MySQL rollback when `sendDraft` fails; Submit button enabled on the client; the end-to-end flow (tasks §5).

## Summary

All 3 tasks PASS.
- **T-1:** 2 attempts; committed `e97d9e8da`.
- **T-2:** 2 attempts.
- **T-3:** 1 attempt.
- One Pivot (`PNS-R-4` → `PDR-R-4`) and one budget tripwire (the user said continue).
- **Pending:** the manual HITL check (tasks §5), then the commit of T-2 + T-3 with the user's OK.
