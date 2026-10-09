# Proposal — A centre corrects and resubmits a rejected bilateral result in the Reporting Tool

> **In one line:** treat **Rejected (7)** like Editing/Draft for the reporting centre (edit, change the primary SP within the project's allocations, run the QA check, submit) while the badge keeps saying Rejected; on Submit it goes to **Pending Review (5)**. The primary SP change on a Rejected result is a **direct set**, not the PSR acceptance round. The SP's justification travels in the rejection notification, shows on the result next to the status, and the list modal shows **every** rejection, not only the latest.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/rejected-result-correction` |
| Slug | `rejected-result-correction`, derived from the Jira title (the argument was a URL plus free text) |
| Spec ID prefix | `RRC` |
| Type | **Change** |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 (invoked `/akili-specify`) |
| Date | 2026-10-06 |
| Author (session) | Santiago Sanchez |
| Jira | [P2-3895](https://cgiarmel.atlassian.net/browse/P2-3895). User Story, Open, assignee Juan David Delgado. Epic P2-3094 *Reporting Tool: Q4 2026 Strategic Enhancements* |
| Companion story | [P2-3894](https://cgiarmel.atlassian.net/browse/P2-3894), the API path → spec `bilateral/resubmit-rejected-result` (`RSB`), T-1..T-5 Reviewer PASS, uncommitted on `qa-development-2026-ss`. This closes its `OQ-6` |
| Depends on | `bilateral/resubmit-rejected-result` **`RSB-T-1`** (`result_review_history.initiative_id` + `RESUBMIT` action + readout with `initiative_code`). Needed for AC26/AC27. Already applied on PRTest by the user |
| Parallel-safe | **no**. Shares `bilateral-center.service.ts`, `primary-program-request.service.ts`, `results.service.ts` (review decision / notification) and `result_review_history` with `RSB` |

## 2. Intent

A rejection stops being a dead end. The centre reads why, fixes the result (including moving it to another SP allocated to the project), and sends it back for review on the **same record**, keeping the full history.

## 3. Problem / Current Behavior

| Today | Where |
|---|---|
| A Rejected result opens fully locked. Every section binds `readOnly = !isEditableByCenterUser()`, which is true only for Editing/Draft (or not loaded) | client `pages/bilateral/services/bilateral-creation.service.ts:518` |
| Submit and the AI quality check both refuse anything but Editing/Draft (`assertSubmittable`, shared by `submitForReview`, `assess`, `recordFieldRevision`) | `bilateral-center.service.ts:~2565` |
| The project + primary SP save refuses anything but Editing/Draft | `bilateral-center.service.ts:186-195` (`updatePrimaryAssignment`) |
| A primary **swap** never sets the owner. It sends a pending PSR request; role 1 is written only when the incoming SP accepts, and Submit is blocked while it is pending | `updatePrimaryAssignment` → `PrimaryProgramRequestService.request()`; `assertSubmittable` "pending primary" guard; `accept()` `primary-program-request.service.ts:625` |
| Section writes on the server already allow Rejected: `assertCenterWrite` only blocks status 5 for non-admins, and **does not check centre ownership** | `api/results/bilateral-access/bilateral-access.service.ts` (`assertCenterWrite`) |
| The centre's rejection notification says *"…where your center was tagged, has been rejected by the Science Program X."*: no justification | `results.service.ts:~2970` (`emitBilateralReviewNotification`), rendered by `notification.service.ts:1362` |
| The list modal fetches the whole history but shows only the **first** REJECT row (`find`) | client `bilateral-results-list.component.ts:1567`; server `GET results/bilateral/:id/review-history` |
| The rejection deactivates every active share request (contributions included) | `results.service.ts:~4407` |

**Effect:** the only way forward is to report the result again: a second record, the review history lost.

## 4. Proposed Outcome

| Status | Edit | Change primary SP | QA check + Submit |
|---|---|---|---|
| Editing / Draft | unchanged | unchanged (PSR flow, first pick as DRAFT) | unchanged |
| **Rejected** | **yes**, centre users of the lead centre + admins. Status stays 7 on every save | **yes, direct set**, only among SPs allocated to the lead project | **yes** → Pending Review, `RESUBMIT` history row, SP notified like any submission |
| QA, Submitted, Discontinued, Pending Review, Approved | unchanged (locked; the Discontinued admin exemption untouched) | unchanged | unchanged |

On the result and in the notification, the current reason is the **latest REJECT row's comment** (one source of truth). With no comment, both say *"No justification was recorded."* Once in Pending Review, the banner is gone; the history stays reachable.

## 5. Scope

**Server**

- `assertSubmittable` → submittable `{1, 8, 7}`. Covers Submit, the QA check and field-revision provenance. All other guards (centre role, owner SP present, MDS, stale QA) unchanged.
- `submitForReview` from 7: same flip to 5 and same SP notification; additionally writes a `ReviewActionEnum.RESUBMIT` history row with `initiative_id` = the owner SP (aligned with `RSB`), and re-sends the contribution requests for the contributors saved at that moment (`OQ-3`). Nothing is sent or notified while the result stays at 7.
- `updatePrimaryAssignment` → allowed on 7. **On 7 only**, a change of primary is a **direct ownership transfer**: the same writes `accept()` does today (old role 1 off, new role 1 on, stray contributor/contribution-request cleanup, old owner's ToC retired, ToC stub seeded) but **without** a pending request, the "accepted" Center notice, or the submit block. Editing/Draft keep today's PSR/PNS flow verbatim (AC31).
- Allocation rule unchanged: the catalogue check already refuses a SP not allocated to the project with its existing message (AC20).
- Rejection notification: carry the justification (snapshot at emission time, see `OQ-2`), with the *no justification* fallback. Wording of every other type untouched (AC29).

**Client**

- `isEditableByCenterUser` → also true for 7. Every section, the SP/project selector and the Submit rail follow it.
- Status badge keeps showing Rejected while editing (no client status change on save).
- **Rejection reason banner** on the result, next to the status, read-only, shown only at 7. Long text wraps/collapses; full text in the history.
- **SP selector, single allocation**: an explicit "this project is allocated to one Science Program only" note instead of an empty dropdown (AC21).
- **List modal → full history**: every REJECT (and RESUBMIT) row in order, each with SP code, reviewer, date and comment (AC16, AC27). Accept both `REJECT` and legacy `REJECTED`.
- **Notification item**: show the justification without breaking the panel (clamp + full text on the result).
- UI built with **Spartan** components (user rule).

## 6. Non-Goals

- The API resubmission path (P2-3894, spec `RSB`).
- The reviewer side: how the SP writes the justification, approve flow, approved notifications.
- Moving a result to a SP not allocated to its lead project.
- W1/W2 results. Portfolio analysis of rejection reasons.
- Backfilling `initiative_id` on pre-`RSB-T-1` history rows (they show no SP).
- Coordinating concurrent API resend vs. in-app edit (last write wins, accepted by the ticket).

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Center users | Can act on a rejection; see the reason in the notification, on the result and in a full history |
| Science Programs | Corrected results come back to their queue with the ordinary "waiting for review" notice; a result moved to them arrives as a normal pending review, not an ownership request |
| Admins | Same access as today across bilateral results |
| `api/bilateral/services/bilateral-center.service.ts` | `assertSubmittable`, `submitForReview`, `updatePrimaryAssignment` |
| `api/results/share-result-request/services/primary-program-request.service.ts` | Extract `accept()`'s ownership-transfer writes into a reusable core for the direct set |
| `api/results/results.service.ts` + `api/notification/notification.service.ts` | Justification in the rejection notification |
| client `pages/bilateral/*` | `bilateral-creation.service.ts`, `bilateral-page-header`, `bilateral-sp-selector` / project selector, `bilateral-results-list` modal, `bilateral-result-creator` (Submit rail) |
| client `shared/components/header-panel/.../pop-up-notification-item` + `notification-type.constants.ts` | Render the justification |
| Specs | `bilateral/resubmit-rejected-result` (dependency + consistency, `OQ-1`), `notifications/primary-notify-on-submit` (PNS) and the PSR spec (swap semantics now differ on 7), `changes/qa-submit-stale-guard` (AC7 reuses it), `bilateral/review-toc-only-editing` (`assertCenterWrite`) |

## 8. Visual Reference

- Source: **None** yet. A mockup was offered (Stitch / Claude Design / self-contained HTML) and is pending the user's answer.
- Screens it would cover: rejection banner next to the status in the result header; the full-history modal; the single-allocation SP selector note; the notification row with a long justification.

## 9. Requirement Delta Preview

### ADDED

- Rejection reason banner on a Rejected result (latest REJECT comment, *no justification* fallback, hidden from status 5 on).
- Justification inside the rejection notification.
- `RESUBMIT` history row on an in-app resubmission.
- Direct primary SP transfer on a Rejected result (no acceptance round, no submit block).
- Explicit single-allocation state in the SP selector.

### MODIFIED

- Editable/submittable statuses for the centre: `{1, 8}` → `{1, 8, 7}` (client lock, `assertSubmittable`, `updatePrimaryAssignment`). Status stays 7 until Submit.
- The list's justification modal: latest rejection only → full ordered history with SP per row.

### REMOVED

- Nothing. Every other status, the Editing/Draft submit flow and the Editing/Draft PSR/PNS swap flow stay as they are.

## 10. Approach Options

### Option A — Widen the status sets + a direct-transfer branch on 7 *(recommended)*

- ✅ Smallest change that meets every AC: three server guards widen by one status, one client computed widens, the rest is additive UI.
- ✅ Reuses `accept()`'s tested ownership writes by extracting them into a core both paths call, so the transfer is identical to an accepted swap minus the round.
- ✅ Editing/Draft keep the PSR/PNS flow bit for bit (AC31), because the new branch is keyed on status 7.
- ❌ Two swap semantics coexist (PSR on 1/8, direct on 7). Needs clear code comments and tests on both sides.
- ❌ `accept()` refactor touches a heavily guarded method (locks, idempotency). Extract only the write block, keep the lock/notice outside.

### Option B — Send the result back to Editing on the first edit

- ✅ Almost no server change: Editing already does everything.
- ❌ Violates BR2 / AC2 (status must stay Rejected until Submit) and loses the "you are fixing a rejection" signal. **Discarded.**

### Option C — Keep the PSR round on 7 but auto-accept it server-side

- ✅ Reuses `request()` + `accept()` unchanged.
- ❌ `accept()` authorizes members of the requested SP and emits the Center "accepted" notice; faking a system actor and suppressing the notice is more fragile than extracting the write core, and leaves request rows that read like an ownership round (contradicts AC23).

## 11. Recommended Approach

**Option A.** Suggested order for `/akili-specify`:

1. **Server status gates** (`assertSubmittable`, `submitForReview` + `RESUBMIT` row, `updatePrimaryAssignment` admits 7). Tests by status (8 statuses × edit / change SP / submit).
2. **Direct transfer core**: extract from `accept()`, call it from `updatePrimaryAssignment` when status = 7. Regression tests for first pick (DRAFT), same-owner re-pick and swap on 1/8.
3. **Notification justification** (server emission + client render + legacy rows).
4. **Client unlock** (`isEditableByCenterUser`, Submit rail, SP selector single-allocation state).
5. **Rejection banner + full-history modal** (Spartan).
6. Manual run on PRTest by the user (main cycle, three rejections, SP move, single-SP project, permissions, status regression).

**Model checkpoint:** this phase is T1; the registry says `opus` and the session runs Opus 5.5, so it complies.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Owner |
|---|---|---|
| `OQ-1` | **Resolved 2026-10-06 (Juan David Delgado, assignee, relayed by the user):** a resubmitted Rejected result goes **directly to whichever SP is set as primary**, with no acceptance request. Applies to both paths. Consequence: `RSB-T-5` (API, routes a primary change through `request()` → `accept()`) must use the same direct transfer. **Decided (user, 2026-10-06): done as a task of this spec**, after the direct-transfer core exists; `RSB` must not reach staging before it, or the old acceptance behaviour ships meanwhile. **Repo: `onecgiar_pr` only.** Same endpoint and same payload; the Fetcher (`onecgiar_result_functions`) already forwards the primary SP and `result_code` untouched, so it needs no change. Editing/Draft keep today's PSR flow (AC31) unless told otherwise | Resolved |
| `OQ-2` | **Where the justification travels.** Recommended: snapshot the comment into the notification at emission time (a notification about rejection #1 keeps saying #1's reason after rejection #2). Legacy rejection notifications (sent before the change) show no justification line at all, rather than the "no justification was recorded" text, which would be false for them. Needs a storage decision in design: inside `text` with a detectable shape vs. a nullable column | Design |
| `OQ-3` | **Resolved 2026-10-06 (user):** the reject deactivates every share request (`results.service.ts:~4407`). Nothing is recreated automatically and nothing reaches the notifications module while the centre corrects. Contribution requests are sent **again on resubmission (Submit from 7)**, built from the contributors the centre has in the Contributors section **at that moment**. This matches `RSB` (the API recreates the payload's contributors on resubmission, its `OQ-2`) | Resolved |
| `R-1` | **Server does not enforce centre ownership on section writes** (`assertCenterWrite` only blocks status 5). AC4 (other centres cannot edit) is enforced client-side today, for Editing too. BR1 says "same people as in Editing", so parity holds; hardening the server is optional and widens scope | User |
| `R-2` | `accept()` refactor: keep the row lock, idempotency check and post-commit notice in `accept()`; only the ownership writes move. Regression on the existing PSR/PNS specs is mandatory | Design |
| `R-3` | The QA stale guard (AC7) relies on `changes/qa-submit-stale-guard`; confirm it invalidates on any section save at status 7 too | Design |
| `R-4` | Last write wins against an API resend of the same result (accepted by the ticket edge case) | — |
| `D-1` | `RSB-T-1` must ship first (or together): the readout's `initiative_code` is what names the SP per rejection. Rows before it show no SP | Release |
| `R-5` | Notification wording regression (AC29): approved/submitted/created/unsubmitted/QA notices must keep their exact text; snapshot tests on `buildResultNotificationDescription` | Design |

## 13. Success Criteria

- Main cycle on PRTest: reject with a recognisable text → the notification shows it → the banner shows it next to the Rejected badge → edit + save keeps 7 → QA → Submit → 5, in the SP queue, SP notified, history keeps the rejection.
- Three rejections, one result: the modal lists all three in order with SP, reviewer, date and text; the banner shows the latest; still readable after approval.
- SP move on a 2+ allocation project: only allocated SPs offered; the change is immediate; Submit is available at once; the result lands in the **new** SP's queue with the ordinary notice; no ToC mapping demanded.
- Single-allocation project: the selector explains there is no alternative.
- Regression: 1/8 submit and PSR/PNS swap unchanged; 5/6 locked; Discontinued admin exemption unchanged; other notification texts unchanged.

## 14. Next Step

```text
/akili-specify bilateral/rejected-result-correction
```

Standard depth. `OQ-1` (direct transfer on both paths) and `OQ-3` (contributors re-sent on resubmission) are resolved; `OQ-2` (where the justification is stored) is settled in design.
