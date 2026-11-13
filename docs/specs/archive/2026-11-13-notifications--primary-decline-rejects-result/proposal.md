# Proposal — Primary SP decline rejects the result (no cascade, mandatory justification)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `notifications/primary-decline-rejects-result` |
| **Slug** | `primary-decline-rejects-result`, derived from the free-text argument and placed under the `notifications/` taxonomy next to its parent spec |
| **Type** | Change. It replaces a business rule shipped by `notifications/bilateral-primary-sp-request` (PSR-R-5 / R-6 / R-7). The code works as that spec was written; the rule itself is what changes |
| **Approval Mode** | gated (default) |
| **Status** | approved (Santiago Sanchez, 2026-10-01). OQ-2..OQ-6 approved with their proposed defaults. **OQ-1 overridden at specify:** a rejected result is final for the Center (see `requirements.md` Document Control) |
| **Owner** | Santiago Sanchez |
| **Date** | 2026-10-01 |
| **Ticket** | none. Source: direct product rules from the user, 2026-10-01 (two messages: no cascade + rejected status; mandatory justification pop-up like the W3/Bilateral reject) |
| **Depends on** | `notifications/bilateral-primary-sp-request` (implemented and pushed, `5c6b99fdf` and later) |
| **Parallel-safe** | no. It edits `primary-program-request.service.ts`, `share-result-request.service.ts` and `notification-item.*`, the same files as the parent spec and `notifications/w1w2-*` |
| **Baseline cited** | `docs/prd.md` US-Q3 (reject recorded in review history) · `docs/trd/trd.md` `results` + `Notification` modules · `onecgiar-pr-client/CLAUDE.md` |

---

## 2. Intent

When the primary Science Program **declines** to be the primary of a bilateral result, the result is **rejected** and the flow stops there:

- the result's `status_id` becomes **Rejected (7)**;
- the request does **not** move to another SP, whether the project has 2, 3 or more SP alignments;
- the contributing SPs that were tagged get **no** notification;
- the SP must type a **mandatory justification** in a pop-up like the W3/Bilateral "Reject result" pop-up;
- the Center sees the result as **Rejected** in its bilateral results list, and the reason says that the primary SP declined to be the primary, followed by the justification.

---

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| P-1 | On decline with **exactly 2** alignments, a new primary request goes **automatically** to the other SP (auto-move). That SP may be one the Center tagged as a contributor, so it gets an unexpected request | `primary-program-request.service.ts:806-861` (`getOtherAlignment` → `request(..., { cancelRound: false })`); requirement `PSR-R-5` |
| P-2 | On decline with 1 or >2 alignments, the result is **"sent back"**: it stays in its current status with no owner, and the Center is asked to pick another primary | `primary-program-request.service.ts:874-882, 900-906`; `stateFor` → `SENT_BACK` (L337-350); `PSR-R-6`, `PSR-R-7` |
| P-3 | The result's `status_id` never changes on decline, so the Center's list never shows it as Rejected | `decline()` writes only `share_result_request`; no `Result` update |
| P-4 | Decline has **no reason**. The inbox Decline button opens a yes/no confirmation; the API takes no text | `notification-item.component.html:611-630` ("Are you sure that you want to decline this contribution?"); parent spec OQ-8 "no decline reason"; `share-result-request.service.ts:1454-1463` |
| P-5 | The contributor drafts (status 4) stay active after a decline, ready to be released if a later primary accepts | `releaseContributors` (L950+) is only skipped, never cleaned up on decline |

---

## 4. Proposed Outcome

| Situation | What happens |
|---|---|
| SP09 presses **Decline** on a pending primary request | A pop-up opens: **"DECLINE PRIMARY ROLE – {result_code}"**, with a required **Justification** textarea. **Confirm** stays disabled until the text is not blank. **Cancel** closes it and changes nothing |
| SP09 confirms with a justification | In one transaction: the request becomes Declined (3); the result's `status_id` becomes **Rejected (7)**; a `result_review_history` row is saved with `action = REJECTED` and the justification as `comment`; every active request on the result (contributor drafts included) is deactivated, as the SP review reject already does (`results.service.ts:4365-4369`) |
| Project has 1, 2, 3 or more SP alignments | **Always the same as above.** No auto-move, ever |
| Contributing SPs tagged by the Center (e.g. SP12) | Get **nothing**: no request, no notice |
| The Center | Gets one "declined" in-app notice (existing `PRIMARY_PROGRAM_REQUEST_DECLINED` type, new text). In the bilateral results list the result shows **Rejected**, and the existing "View rejection justification" modal shows the reason: *"SP09 declined to be the primary Science Program of this result: {justification}"* |
| The API is called with a blank or missing justification | **400**, nothing changes (server-enforced, like `ReviewDecisionEnum.REJECT`, `results.service.ts:4283-4290`) |
| **Swap** case: the result already has an owner (SP09) and the Center asks SP12 to take over; SP12 declines | **Unchanged:** SP09 stays the owner, the result is not rejected (see OQ-2) |

---

## 5. Scope

**Server**
- `PrimaryProgramRequestService.decline(requestId, user, justification)`:
  - require a non-blank justification;
  - remove the auto-move branch (`getOtherAlignment` / `request()` call / contributor deactivation of the moved-to SP);
  - when the result has no owner: set `Result.status_id = 7` (with `reviewed_by` / `reviewed_at`, as the review reject does), save the `ResultReviewHistory` REJECT row, deactivate all active `share_result_request` rows on the result;
  - keep the lock, the authorization and the status re-check as they are.
- `share-result-request.service.ts` primary decision branch (L1454-1463) and its DTO: accept and pass `justification` when `request_status_id = 3`.
- Center notice text: the `PRIMARY_PROGRAM_REQUEST_DECLINED` message changes from "Pick another primary Science Program" to "…declined… The result was rejected."
- `stateFor`: a rejected result reports a `rejected` state (or the client reads `status_id`), instead of `sent_back`.

**Client**
- `notification-item` + `contribution-request-drawer` (`confirm-decline` mode): for a **primary** request, Decline opens the justification pop-up. It copies the markup and behavior of the W3/Bilateral reject dialog (`result-review-drawer.component.html:849-877`): same `app-pr-dialog` `confirmation-modal reject` style, required label, textarea, Confirm disabled while blank, spinner while saving. Built with Spartan (`hlmBtn`), per the team rule.
- The decline request sends the justification.
- Bilateral results list (`bilateral-results-list`): no new UI. A status-7 result already gets the Rejected badge and the justification modal (L450-457, L620-642). Only check that the "Rejected by {name}" line reads well for this case.
- `section-zero-dashboard`: the "Declined by {SP}. Pick another primary Science Program" sent-back hint no longer applies to a rejected result.

---

## 6. Non-Goals

- Contributor request decline (Accept/Decline on a contributor row): it stays as it is today, with no justification.
- The SP review reject of a submitted result (Pending Review → Rejected): unchanged.
- W1/W2 results and the API ingest path.
- Email.
- Backfilling results that were sent back or auto-moved under the old rule (see OQ-4).
- Deleting `PRIMARY_PROGRAM_REQUEST_MOVED`: the type stays so old notification rows still render; it is just no longer emitted.

---

## 7. Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| SP members, SP admins, platform admins | Decline now needs a justification and rejects the result |
| Center users | A declined result shows as Rejected with the reason; no "pick another primary" step |
| Contributing SPs | No longer get a primary request from the auto-move |
| `primary-program-request.service.ts` | `decline()` rewritten (smaller: the auto-move branch goes away); `stateFor` |
| `share-result-request.service.ts` + update DTO | Pass the justification |
| `notification-item.*`, `contribution-request-drawer.*` | Justification pop-up for primary Decline |
| `bilateral-results-list`, `section-zero-dashboard`, `bilateral-primary-assignment.copy.ts` | Rejected display; sent-back copy retired for this case |
| `notifications/bilateral-primary-sp-request` | PSR-R-5 and PSR-R-6 **removed**, PSR-R-7 and PSR-R-15 **modified**, OQ-8 reversed. Its requirements stay as history; this spec records the delta |

---

## 8. Visual Reference

- Source: existing UI in the codebase (no Figma).
- Location: the W3/Bilateral reject pop-up, `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.html:849-877` ("REJECT RESULT – {code}", required **Justification** textarea, Cancel / Confirm).
- Notes: the new pop-up mirrors it with the title **"DECLINE PRIMARY ROLE – {result_code}"**, the message *"Please explain why {SP code} declines to be the primary Science Program of this result."*, and the same Cancel / Confirm buttons. The final copy is settled in specify. No mockup is needed because the pattern already exists; one can be made at specify time if you want it.

---

## 9. Requirement Delta Preview

### ADDED
- Decline of a primary request requires a non-blank justification, in the UI and on the server.
- Declining a primary request on an ownerless result sets the result to **Rejected (7)** and saves the justification in `result_review_history`.
- On that decline, every active request on the result is deactivated.

### MODIFIED
- `PSR-R-7` (sent back): replaced by "rejected". The Center no longer picks another primary after a decline.
- `PSR-R-15` / the Center notice: the "declined" text says the result was rejected, not "pick another primary".
- `PrimaryRequestState`: `sent_back` gives way to `rejected` for these results.

### REMOVED
- `PSR-R-5`: auto-move to the other SP when the project has 2 alignments.
- `PSR-R-6`: send back with no primary when the project has more than 2 alignments.
- Parent spec OQ-8 default ("no decline reason").

---

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Reuse the review-reject model** | Status 7 on `result` + a `ResultReviewHistory` REJECT row + deactivate all requests, inside the existing `decline()` transaction | The Center list already shows Rejected and the justification modal with **zero new UI**. Same data shape as the SP review reject, so reports and filters already understand it. No migration | The history row says "REJECTED" with no flag that it came from a primary decline; the reason text carries that ("SP09 declined to be the primary…") |
| B. Store the justification on `share_result_request` (new column) and derive "rejected" | Keep the reason on the request row | The reason lives next to the decision | Needs a migration, and the Center list and modal would have to learn a second place to read the reason from. More code for the same outcome |
| C. New result status "Declined by primary" | Status 9 | Distinct from a review reject | Status drives QA, versioning and many filters; the user explicitly asked for **rejected** |

## 11. Recommended Approach

**Option A.** It is the smallest safe path:

- The rejected state and its justification read-back already exist end to end (`results.service.ts:4296-4325` writes them; `bilateral-results-list` reads them).
- The server change mostly **deletes** code (the auto-move branch) and adds one `Result` update and one history insert to a transaction that already exists.
- The client change is one pop-up copied from an existing one, plus passing one field.

Prefix the saved comment with the SP code (*"SP09 declined to be the primary Science Program of this result: {justification}"*) so the Center sees why without a schema change.

**Size:** M (server S, client S–M). One spec.

---

## 12. Risks, Dependencies, And Open Questions

### Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | **Rejected from a non-Pending-Review status.** Today status 7 is only reached from Pending Review (4). Here it comes from Editing/Draft. Some code may assume a rejected result went through review | Specify checks who reads status 7 (list filters, editability `assertResultCodeStatusIsEditable` already allows 7, versioning). Regression tests |
| R-2 | **What the Center can do next** with a rejected, ownerless result is undefined (see OQ-1) | Settle in specify before writing tasks |
| R-3 | **Tests written for the cascade** (table-driven over 1/2/>2 alignments, `PSR-R-5` scenarios) will fail on purpose | Rewrite them to assert "rejected, no move" for every alignment count. Run only the touched specs (`primary-program-request`, `share-result-request`, `notification-item`, `contribution-request-drawer`) |
| R-4 | **Shared files** with the parent spec and the W1/W2 tagged specs (uncommitted work exists on `w1w2-center-tagged`) | Sequence after that work lands; not parallel-safe |
| R-5 | The contributor Decline and the primary Decline share one dialog today (`notification-item.component.html:611`) | Branch on `isPrimaryRequest` so contributor Decline keeps its yes/no confirmation (Non-Goal) |
| R-6 | Results already **sent back** or **auto-moved** under the old rule on the testing DB | OQ-4; no backfill by default |

### Open Questions (proposed defaults in brackets)

| ID | Question |
|---|---|
| OQ-1 | After the result is rejected, can the Center **pick another primary** on it (which would send a new request and move it out of Rejected), or is a rejected result final and the Center must create a new one? [The Center can edit the rejected result and pick a primary again; that creates a new pending request and the status goes back to Editing] |
| OQ-2 | **Swap** case (the result already has an owner and the newly requested SP declines): reject the result too? [No: the old owner stays and the result is not rejected; only the request is declined, still with a mandatory justification] |
| OQ-3 | Does the Center notice include the justification text? [Yes, so the Center does not have to open the result to see why] |
| OQ-4 | Results already sent back or auto-moved under the old rule: convert them? [No, leave them as they are] |
| OQ-5 | Minimum length for the justification? [Not blank after trim, same as the W3 reject; no minimum] |
| OQ-6 | Can a **platform admin** declining on the SP's behalf also reject the result? [Yes, same rule; the history row records the admin as the author] |

---

## 13. Success Criteria

- On a 2-SP project (SP09 70% / SP12 30%), SP09 declines with a justification → the result is **Rejected (7)**, **no** request reaches SP12, and the Center sees Rejected plus *"SP09 declined to be the primary Science Program of this result: …"* in the justification modal.
- Same on a 1-SP and a 3-SP project.
- Confirm is disabled while the justification is blank; a direct API call without one gets **400** and nothing changes.
- A Center-tagged contributor gets no request and no notice after the decline.
- Contributor-request Decline is unchanged.
- Touched server and client specs green; regression tests for "no auto-move" and "justification required" are red before the fix and green after.

---

## 14. Next Step

```text
/akili-specify notifications/primary-decline-rejects-result
```
