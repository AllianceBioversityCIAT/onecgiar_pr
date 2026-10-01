# Primary SP Request Sent on Submit for Review — Design

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-notify-on-submit` (`PNS`) |
| **Depth** | Lite requested → **Standard recommended** (§Budget) |
| **Status** | approved (Santiago Sanchez, 2026-10-01) |
| **Date** | 2026-10-01 |
| **Requirements** | `requirements.md` `PNS-R-1..5` |
| **Extends** | `notifications/bilateral-primary-sp-request` design (DD-2, DD-4, DD-8) |

## 2. Summary

The saved primary choice is a `primary` row in `share_result_request` with status **DRAFT (4)**, the status PSR already uses for unreleased contributor drafts. Submit flips it to **PENDING (1)** in the submit transaction. Accept and decline learn one new fact: the result may already be in Pending Review.

No migration. No new endpoint. No change to any request or response shape except one new `state` value (`draft`) on the existing primary-state read.

## 1A. Premise Ledger

| # | Premise | Evidence | Verified in |
|---|---|---|---|
| P-1 | Create paths call `PrimaryProgramRequestService.request()` | `bilateral-center.service.ts:526` (manual create), `bilateral.service.ts:5010` (AI promote), `bilateral-center.service.ts:342` (Project Information save) | read |
| P-2 | `request()` itself sends no notification. The SP "notification" is the pending row showing in the inbox | `primary-program-request.service.ts:183-290` | read |
| P-3 | Submit refuses an ownerless result | `assertSubmittable`, `bilateral-center.service.ts:2517-2524` | read |
| P-4 | Submit emits submitted + contributor tagging after commit, and both need an owner | `submitForReview` L2391, `announcePendingReview` `bilateral.service.ts:685` | read |
| P-5 | The inbox does not show status-4 rows (contributor drafts stay invisible, `PSR-R-12`) | PSR shipped behavior. **Not re-read for `primary` rows:** `getRequestByUser` has no status filter in SQL (`share-result-request.repository.ts:259`) | **T-1 must verify** with a primary DRAFT row |
| P-6 | `shareResultRequestExists` counts status-4 rows of **any** type | `share-result-request.repository.ts:118-125` | read |
| P-7 | `ResultsModule` code can't import `BilateralService` directly (BilateralService already injects PrimaryProgramRequestService) | constructor at L5010 call site | read; `ModuleRef` pattern exists in `admin-panel.service.ts:50` |

## 3. Data Model

No schema change. One new use of an existing value:

| Row | Before | After |
|---|---|---|
| `primary` request on create / first pick (no owner, not submitted) | status 1 PENDING | status 4 DRAFT, same columns (`approving_inititiative_id` = chosen SP) |
| On submit | — | DRAFT → PENDING (`update()` with explicit columns, PSR advisory) |

## 4. API Surface

| Endpoint | Change |
|---|---|
| Primary state read (`stateFor`, consumed by `section-zero-dashboard`) | New `state: 'draft'` with `program_code`. Priority: accepted > pending > **draft** > sent_back > none |
| Submit for review | Accepts an ownerless result that has a DRAFT primary (`PNS-R-2`). Same error text otherwise |
| Create / Project Information save / AI promote | Unchanged shapes |

## 5. Server Workflow

| # | Where | Rule | Req |
|---|---|---|---|
| 1 | `request()` | New option `asDraft`. Inserts status DRAFT instead of PENDING. Idempotency check also matches an active DRAFT row for the same SP. `cancelRound` also deactivates active DRAFT `primary` rows (query already filters `request_type = primary`, so contributor drafts are untouched) | R-1 |
| 2 | Create paths (`createResultHeader`, `populateInitiativeAndTocFromProgramCode`) | Pass `asDraft: true` | R-1 |
| 3 | `updatePrimaryAssignment` | Pass `asDraft: true` only when there is **no owner** and the result is Editing/Draft. Swap (owner exists) unchanged | R-1, scope |
| 4 | New `findDraftPrimaryInitiativeId(resultId, manager?)` | Mirror of `findPendingPrimaryInitiativeId` for status 4 | R-1, R-2 |
| 5 | Contributor exclusion (`bilateral-center.service.ts:1809`) | Exclude the draft SP too (it cannot be primary and contributor) | R-1 |
| 6 | `shareResultRequestExists` draft count | Scope to `request_type = contribution` (P-6) | R-1 |
| 7 | `assertSubmittable` | No owner → allowed only if a DRAFT primary exists; else today's error. Swap guard (pending) unchanged | R-2 |
| 8 | `submitForReview` transaction | If ownerless: new `sendDraft(resultId, manager)` flips DRAFT→PENDING **inside** the transaction; failure throws and rolls back the submit. After commit: call `announcePendingReview` **only if an owner exists** | R-2 |
| 9 | `accept()` post-commit | If the result's status is Pending Review, call `BilateralService.announcePendingReview(resultId, acceptingUserId)` after the Center notice. Resolved lazily through `ModuleRef` (`strict: false`), never throws | R-3 |
| 10 | `decline()` transaction | Ownerless + not moved + result in Pending Review → set `status_id` to Editing. Moved case: the new row is PENDING (today's `request()` default), status kept | R-4 |

## 6. Frontend Plan

| File | Change | Req |
|---|---|---|
| `section-zero-dashboard.component.ts` | `PrimaryRequestState.state` adds `'draft'`. Banner `info` tone with new copy. `submitBlockedReason` returns null for `draft`. Picker stays enabled (only `pending` disables it) | R-5 |
| Primary-assignment copy constants (`BILATERAL_PRIMARY_ASSIGNMENT_COPY`) | Add `banner.draft(code)`: "{code} will be asked to be the primary Science Program when you submit for review" | R-5 |

Existing Spartan banner markup is reused; no new tokens.

## 7. Security & Observability

Authorization unchanged (Center permission / admin bypass in `assertSubmittable`, SP authorization in accept/decline). New logs carry ids only.

## 8. Design Decisions

### `PNS-DD-1` — Reuse status DRAFT (4) for the saved choice
- **Chosen:** a `primary` row at status 4.
- **Rejected:** a new column on `result` (needs a migration and duplicates what the request row already holds). Also rejected: keeping PENDING but hiding the row until submit (every inbox and guard query would need an extra "submitted" join).
- **Risk:** status 4 already means "contributor draft" in queries that ignore `request_type` (P-5, P-6). Mitigation: workflow items 5-6 + T-1 verification.

### `PNS-DD-2` — Send inside the submit transaction
A submit that fails to send leaves nobody asked about a Pending Review result. Atomic is safer than `PSR`'s "never fail" rule, which keeps applying to **create**.

### `PNS-DD-3` — Defer submitted / tagging notices to accept
Read paths need an owner row (P-4). The owner exists only at accept, so the notices are sent then. Lazy `ModuleRef` lookup avoids the module cycle (P-7).

### `PNS-DD-4` — Reversion challenge (Step 2.3)
Reverted behavior: "create sends the request immediately" and "Submit requires an owner". **What breaks?**
- Results created before deploy with a PENDING row: they keep the old path, and Submit stays blocked until accepted (owner check + swap guard). OK.
- The reviewer endpoint on an ownerless Pending Review result: SP lists hide it (no owner), but a platform admin could open it and approve, and approve dereferences the owner (`submitForReview` doc comment). **Addressed:** T-2 adds an owner guard to the bilateral review decision, which returns 400 "This result is awaiting the primary Science Program's acceptance." (`PNS-R-2`).

## 9. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 3 |
| LOC (code + tests) | ~300 (server ~200, client ~60, copy ~10) |
| Review rounds | 2 |

**This is over Lite.** Three tasks across server and client is Standard depth. The documents stay compact, but the depth is recorded as **Standard**. `/akili-execute` escalates if it goes past 4 tasks or ~450 LOC.

## 10. Open Gaps

- Inbox SQL for status-4 `primary` rows (P-5) is verified in T-1, not assumed.
- No E2E: manual run at the HITL pause (create → SP09 inbox empty → submit → request visible → accept → review queue + submitted notice).
