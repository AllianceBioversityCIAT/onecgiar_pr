# Primary SP Decline Rejects the Result — Design

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-decline-rejects-result` |
| **Requirements** | `requirements.md` (`PDR-R-1` … `PDR-R-11`) |
| **Depth** | Standard |
| **Approval Mode** | gated |
| **Status** | approved (Santiago Sanchez, 2026-10-01) |
| **Date** | 2026-10-01 |
| **Baseline cited** | `docs/trd/trd.md` `results` + `Notification` modules · `docs/ux-ui/design.md` §8 (dialogs, inbox rows) |
| **Parent design** | `notifications/bilateral-primary-sp-request/design.md` §2.2 (decline flow), §5 (accept/decline rules). This design replaces its decline branch |

---

## 2. Executive Summary

- **Server:** `PrimaryProgramRequestService.decline()` gets a required justification. Its auto-move branch is **deleted**. On an ownerless result the same transaction now also sets the result to Rejected (7), writes a `result_review_history` REJECTED row, and deactivates the contribution rows. This is the review-reject data shape (`results.service.ts:4296-4369`), so the Center list and its justification modal work with **no** read-side change.
- **Client:** a new small `primary-decline-justification-dialog` component, a copy of the W3 reject dialog, opens from both primary Decline surfaces (inbox row and drawer). `acceptOrReject` sends the text. The Project Information banner gets a "rejected" wording for a read-only, declined result.
- **No migration, no new endpoint, no new notification type.**

---

## 3. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `PDR-P-1` | The Center list reads the reason from `result_review_history` (action `REJECTED`) for any status-7 result | `bilateral-results-list.component.ts:1527, 1566-1568` | `isRejected` = `status_id === 7`; `rejectionEntry` = first entry with action `REJECTED`/`REJECT` | `verified` | `PDR-R-8` needs a client change to read the reason elsewhere |
| `PDR-P-2` | The review reject writes `Result.status_id = 7` + `reviewed_by/at` + a `ResultReviewHistory` row with `comment` | `results.service.ts:4306-4325` | Read: `manager.update(Result, …{status_id, reviewed_by, reviewed_at})` then `manager.save(ResultReviewHistory, {action, comment, created_by})` | `verified` | Copy whatever the reject writes instead |
| `PDR-P-3` | A Rejected result is read-only for the Center, client and server | `bilateral-creation.service.ts:518-521`; `bilateral-center.service.ts:187-195` | Client: editable only for Editing/Draft. Server: `updatePrimaryAssignment` throws 400 outside Editing/Draft | `verified` | `PDR-R-9` needs new guards |
| `PDR-P-4` | The inbox only shows `share_result_request` rows with `is_active: true` | `share-result-request.service.ts:738` | `where: { is_active: true, … }` | `verified` | Deactivating the primary row would still be safe, but `PDR-R-11` doesn't depend on it |
| `PDR-P-5` | Both decision routes (V1, V2) reach the primary branch through `dispatchPrimaryDecision`, and only `request_status_id` is passed on from the DTO | `share-result-request.service.ts:1372, 1416-1466, 1935` | Two call sites, one private method; forward pointer 4 comment | `verified` | A second route would also need the justification |
| `PDR-P-6` | `ResultReviewHistory` and `Result` can be written through the transaction's `manager` without a module change | `results.service.ts:4260-4325` uses `manager.findOne(Result)` / `manager.save(ResultReviewHistory)` from another module; entities are loaded globally by the DataSource | The existing service does it from `ResultsModule` without `forFeature(ResultReviewHistory)` | `assumed` (true for `ResultsModule`, not run from `ShareResultRequestModule`) | Add the entity to `ShareResultRequestModule`'s `forFeature`; T-1 checks with the spec's real module test |
| `PDR-P-7` | Both primary Decline buttons (row, drawer) end in `notification-item.acceptOrReject(false)` | `notification-item.component.html:284`, `:611-660`; `acceptOrReject` L1045-1071; drawer `confirm-decline` mode (`contribution-request-drawer.component.ts:320-330`) | Row button opens `showConfirmRejectDialog`, whose Confirm calls the PATCH. The drawer emits back to the item | `verified` for the row, `assumed` for the exact drawer emit name | T-3 reads the drawer output before wiring |
| `PDR-P-8` | Phase replication skips results with no accepted primary (`PSR-R-16`), so a rejected ownerless result is skipped and logged, not crashed | `versioning.service.ts:274-288` | Read the skip branch | `verified` | Not in this spec's scope either way; listed in §12 |

---

## 4. Architecture Overview

### 4.1 Where this lives

- **Server:** `api/results/share-result-request/` (`services/primary-program-request.service.ts`, `share-result-request.service.ts`, `dto/create-share-result-request.dto.ts`).
- **Client:** `pages/results/.../results-notifications/components/` (`notification-item`, `contribution-request-drawer`, new `primary-decline-justification-dialog`), `pages/bilateral/components/section-zero-dashboard`, `internationalization/`.

### 4.2 Decline flow (new)

1. SP member presses **Decline** on a primary row or in the drawer → the justification dialog opens.
2. Confirm → `PATCH results/request/update` with `request_status_id: 3` and `justification`.
3. `updateResultRequestByUser(V2)` → `dispatchPrimaryDecision(row, 3, user, justification)`.
4. `dispatchPrimaryDecision` rejects a blank justification with 400 **before** calling the service (cheap, no lock). The service checks it again as its own contract.
5. `decline(requestId, user, justification)` runs one transaction:
   - lock the row; check authorization and that it is pending (unchanged);
   - set the row to Declined (3), **kept active** (unchanged);
   - owner exists (swap) → stop here, outcome `declined_swap`;
   - ownerless → update `Result` (status 7, `reviewed_by`, `reviewed_at`); insert `ResultReviewHistory` (REJECTED, comment, `created_by`); deactivate the result's active **contribution** rows with status pending (1) or draft (4). Outcome `rejected`.
6. After commit: one Center notice (`PRIMARY_PROGRAM_REQUEST_DECLINED`) with the `PDR-R-10` text. It never throws.
7. Client: `finalize` closes the dialog and the drawer and refetches (unchanged). The success toast says "Request successfully declined".

---

## 5. Data Model

No schema change.

| Table | Write | Why |
|---|---|---|
| `share_result_request` (primary row) | `request_status_id = 3`, `approved_by`, `aprovaed_date` (unchanged); stays `is_active = 1` | `PDR-R-11`: the inbox needs it active (`PDR-P-4`) |
| `share_result_request` (contribution rows of the result, status 1 or 4) | `is_active = 0` | `PDR-R-4` (4), `PDR-R-6` |
| `result` | `status_id = 7`, `reviewed_by`, `reviewed_at` | `PDR-R-4` (2), same as the review reject (`PDR-P-2`) |
| `result_review_history` | new row: `action = REJECTED`, `comment = "{SP code} declined to be the primary Science Program of this result: {trimmed justification}"`, `created_by` = decliner | `PDR-R-4` (3), `PDR-R-8` |

The justification is **not** stored on `share_result_request` (no column for it; Option B rejected in the proposal).

---

## 6. API Design

**`PATCH /api/results/request/update`** (V1 and V2, unchanged path, method and auth).

| Field | Change |
|---|---|
| `justification?: string` | **New, optional** on `CreateShareResultRequestDto`. Read **only** on the primary branch when `request_status_id = 3`. Ignored everywhere else (`PDR-R-3`) |

| Case | Response |
|---|---|
| Primary decline, blank or missing justification | **400** `"Justification is required when declining a primary request"`; nothing written |
| Primary decline OK, ownerless | 200, same envelope as today, outcome state `rejected` |
| Primary decline OK, swap | 200, outcome state `declined` |
| Not a Recipient / already decided / internal | 403 / 409 / 500, unchanged (`mapPrimaryDecisionOutcomeToResponse`) |

`PrimaryDecisionOutcome.state` loses `'moved'` and gains `'rejected'`. Swap keeps `'declined'`. Grep every consumer of `'moved'` (server and client) and update or delete it.

No bilateral or platform-report payload change.

---

## 7. Backend Module Design

### 7.1 `PrimaryProgramRequestService.decline(requestId, user, justification)`

- **Input check:** trim; blank → `{ ok: false, reason: 'invalid_input' }`, mapped to 400. The mapper gains this reason.
- **Delete** the auto-move block in full: `findLeadProjectId` / `getOtherAlignment` call, `otherAlreadyDeclined` lookup, the `request(..., { cancelRound: false })` call, the moved-to contributor deactivation, the `'moved'` notice and its post-commit branch. `getAlignments`, `getOtherAlignment` and `request()`'s `cancelRound` option stay if other callers use them; T-1 checks with a grep and deletes what is left unused.
- **Keep:** the pessimistic lock, `isAuthorized`, the pending re-check, the status-3 update with the row kept active, the `ownerExists` lookup.
- **New ownerless branch:** within the same `manager`:
  1. resolve the declined SP's official code (`resolveOfficialCode`, already used post-commit, now read inside the transaction for the comment);
  2. update `Result`;
  3. insert `ResultReviewHistory`;
  4. deactivate contribution rows (`request_type = CONTRIBUTION`, `request_status_id IN (1, 4)`, `is_active = true`).
- **Notice suffix (post-commit):** ownerless and swap texts from `PDR-R-10`. The swap text needs the current owner's code (role-1 lookup, already done for `ownerExists`; keep its `initiative_id`).
- **Logging:** keep ids only. The justification MUST NOT appear in any log line, including the `catch` warn.

### 7.2 `share-result-request.service.ts`

- `dispatchPrimaryDecision(row, requestStatusId, user, justification?)`: both callers (L1372, L1935) pass `dto.justification`. A blank-justification decline returns 400 before the service call.
- `mapPrimaryDecisionOutcomeToResponse`: `invalid_input` → 400 with the `PDR-R-3` message.

### 7.3 Center notice

Reuse `emitCenterNotice(resultId, PRIMARY_PROGRAM_REQUEST_DECLINED, user.id, suffix)`. `PRIMARY_PROGRAM_REQUEST_MOVED` stays in the enum and in `notification.service.ts:36, 1204` so old rows render. Nothing emits it any more.

---

## 8. Frontend / UX Component Architecture

### 8.1 New: `primary-decline-justification-dialog` (standalone, presentational)

- Location: `results-notifications/components/primary-decline-justification-dialog/`.
- Pattern: the same shape as `save-changes-justification-dialog` (inputs `visible` (model), `resultCode`, `programCode`, `isSaving`; outputs `cancelEvent`, `confirm(justification)`). It owns the textarea state and resets it to empty on every open.
- Markup and classes: copied from the W3 reject dialog (`result-review-drawer.component.html:849-877`): `app-pr-dialog` with `styleClass="confirmation-modal reject"`, close icon, `modal-icon reject`, `modal-title reject`, `modal-message`, `modal-label required`, textarea with 4 rows, Spartan `hlmBtn` Cancel (outline) and Confirm, spinner while saving. Spartan is used per the team rule.
- Confirm disabled when `!text.trim() || isSaving`. Cancel and close are disabled while saving. Escape and the mask close only when not saving.
- Copy lives in a new `internationalization/primary-decline-justification.copy.ts`: the title `DECLINE PRIMARY ROLE – {code}`, the message `Please explain why {SP} declines to be the primary Science Program of this result.`, the label `Justification`, the placeholder `Please explain why your Science Program declines this result...`, and the buttons.

### 8.2 `notification-item`

- **Row Decline:** when `isPrimaryRequest`, the click opens the new dialog (signal `showPrimaryDeclineDialog`), **not** `showConfirmRejectDialog`. The contributor branch is untouched (`PDR-R-2`).
- **Drawer Decline:** for a primary request, the drawer's decline output opens the same dialog instead of the `confirm-decline` footer. The drawer closes first, so there is never a dialog on top of an open drawer. The contributor drawer path is unchanged.
- `acceptOrReject(isAccept, withTocMapping, justification?)` adds `justification` to the body only when `!isAccept && isPrimaryRequest`.
- **Error handling:** a 400 keeps the dialog open with its text and shows the server message. The current `finalize` closes everything unconditionally, so the primary decline gets its own pipe whose `finalize` skips closing on 400. Other codes behave as today.
- Toast text for a decline: "Request successfully declined" (bilateral wording).

### 8.3 `section-zero-dashboard`

- The banner for `state === 'sent_back'` when `readOnly()` is true (the result is Rejected): *"Declined by {SP code} as primary Science Program. The result was rejected."*, with tone `danger`. The "Pick another primary Science Program" text shows only when not read-only, which covers old sent-back results (no backfill).
- No server `stateFor` change: a rejected ownerless result still reports `sent_back` with `declined_by_codes`, and the read-only flag gives the client the difference.

### 8.4 Bilateral results list

No change (`PDR-P-1`). The modal shows "Rejected by {decliner name} on {date}" plus the comment.

---

## 9. Shared Contracts

- `CreateShareResultRequestDto.justification?: string` (server); the client `PATCH_updateRequest` body is an untyped object today, so only the call site changes.
- `PrimaryDecisionOutcome`: `state: 'accepted' | 'declined' | 'rejected'`; `reason` adds `'invalid_input'`.

---

## 10. Design Decisions

| ID | Decision | Why | Rejected alternative |
|---|---|---|---|
| `PDR-DD-1` | Reuse the review-reject data shape (status 7 + `ResultReviewHistory` REJECTED) | Zero read-side work (`PDR-P-1`); one meaning of "Rejected" across the platform | A justification column on `share_result_request` (migration + a second read path) |
| `PDR-DD-2` | Keep the declined primary row **active**; deactivate only contribution rows | `PDR-R-11` (inbox filters `is_active`, `PDR-P-4`). The review reject deactivates **all** rows, which would hide the decided row | Mirror the review reject exactly (would make the declined row disappear from the SP inbox) |
| `PDR-DD-3` | **Delete** the auto-move branch instead of flagging it off | User rule: never move. Dead branches in a transactional method are a review hazard | A config flag (no one asked for a toggle) |
| `PDR-DD-4` | Validate the justification in the dispatcher **and** in the service | 400 before taking a row lock; the service stays safe if called from elsewhere | Service-only (lock taken for an invalid request) |
| `PDR-DD-5` | The comment carries the SP code prefix | The Center modal shows only `comment` + author; the prefix explains a reject that no review caused | A new `action` enum value (migration on an enum column) |
| `PDR-DD-6` | A new presentational dialog, not a reuse of the W3 dialog markup in place | The W3 dialog is inline in `result-review-drawer`, bound to its state; a copy as a component keeps both independent | Extracting the W3 dialog to a shared component (touches a working, unrelated screen) |
| `PDR-DD-7` | Swap decline writes no review history | The result is not rejected; the history would show a "REJECTED"-looking reason on an Editing result | An UPDATE entry (no reader shows it) |
| `PDR-DD-8` | The client tells "rejected" from "sent back" by `readOnly()`, not a new server state | Smallest change; `stateFor` stays as is | A `rejected` state in `stateFor` (server + client contract change for the same information) |

### 10.1 Reversion challenge (Step 2.3)

`PDR-DD-3` removes delivered behavior (auto-move, `PSR-R-5`/`PSR-R-6`). `PDR-DD-8` narrows the sent-back banner. Question asked: *what does removing this break?*

| Breakage found | Addressed by |
|---|---|
| The parent spec's table-driven tests over 1/2/>2 alignments and the "both decline" scenario assert the move | T-1 rewrites them to assert "rejected, no move" (intended red → green) |
| Old notification rows of type "moved" must still render | The enum and `notification.service.ts` case stay (§7.3) |
| Results already sent back under the old rule (Editing, ownerless, declined row active) must still let the Center re-pick | Not touched: they are not Rejected, so `readOnly()` is false and the old banner and picker remain (§8.3) |
| `request()`'s `cancelRound: false` and `getOtherAlignment` may become dead code, or still be used elsewhere | T-1 greps callers; delete only if unused |
| The client may branch on outcome `'moved'` (toast or refresh) | T-1/T-3 grep for `'moved'` in client and server |
| The review reject's "deactivate all requests" is not copied, so the primary row stays active on a Rejected result. Could a stale Accept on it succeed? | No: the row is status 3 and `accept()` re-checks pending under lock → 409 |

No unaddressed breakage.

---

## 11. Security & Observability

- Recipient authorization is unchanged and server-side (`isAuthorized`).
- The justification is user text: stored as is, rendered by interpolation only, never logged.
- Logs: one line on the reject outcome with `resultId` and `requestId`, no text.

---

## 12. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Status 7 reached from Editing/Draft, not Pending Review. Some report may assume "Rejected ⇒ was submitted" | Status 7 is already editable-listed in `assertResultCodeStatusIsEditable` (API upsert). HITL check of the Center list and the SP review queue on the testing DB |
| R-2 | A rejected ownerless result is skipped at phase rollover (`PDR-P-8`) | Logged by the existing skip; acceptable for a final result |
| R-3 | `PDR-P-6` is assumed | T-1's first step proves it with the module's own test bootstrap; the fallback is `forFeature` |
| R-4 | Shared files with uncommitted `w1w2-center-tagged` work | Execute after that work is committed |

---

## 13. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 5 (2 server, 3 client) + 1 HITL check |
| LOC | ~420 total (server ~+150 / −110 incl. tests; client ~+250 incl. tests) |
| Review rounds | 2 on T-1 (transaction), 1 elsewhere |

Depth check: Standard fits (5 tasks, about 400 LOC). No change of depth.
