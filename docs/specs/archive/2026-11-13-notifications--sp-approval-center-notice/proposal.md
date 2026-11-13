# Proposal — SP approval notice for everyone on the center

> **In one line:** when a Science Program approves a W3/Bilateral result, every user with **any active role** on the result's lead center gets an informational inbox row: *"**SP06**, as primary Science Program, has approved your center's result **9330** - Solar-powered cold storage adoption in Kenyan markets"*.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/sp-approval-center-notice` |
| Slug | `sp-approval-center-notice` — derived from free-text argument ("implementar esta notificación cuando un SP aprueba el W3/Bilateral result…") |
| Type | Change |
| Approval Mode | gated |
| Status | approved 2026-10-02 |
| Extends | `notifications/bilateral-review-decision` (NOTIF-R-2, NOTIF-R-3) · `bugfix/notification-decision-center-wording` (NDCW-R-2, NDCW-R-4) |
| Depends on | none (builds on code already on `qa-development-2026-ss`) |
| Parallel-safe | no — touches `ResultsService.emitBilateralReviewNotification` and `notification-type.constants.ts`, both shared with other notification specs |
| Ticket | none recorded |

## 2. Intent

Center staff should learn, inside PRMS, that a Science Program approved their center's result. It is a heads-up only: no action is asked.

## 3. Problem / Current Behavior

The approve notification **already exists** (P2-3157). Two things differ from what is wanted:

| Today | Gap |
|---|---|
| Recipients = submitter + users whose role on the lead center is **`CENTER_USER` (9)** only (`RoleByUserRepository.getUserIdsByCenter`, predicate `rbu.role = 9`) | Users with another role on the center never see it |
| Center copy (NDCW-R-2): *"The result 9330 - …, where your center was tagged, has been approved by the Science Program SP06."* | Wanted: *"**SP06**, as primary Science Program, has approved your center's result **9330** - …"* |
| Row chip = resolved type label ("Bilateral Result Approved") | Wanted: **"Decision update"** chip + **"W3/Bilateral"** chip + result level · type ("Outcome · Innovation Use") + check icon |

Code path: `ResultsService.reviewBilateralResult` → `emitBilateralReviewNotification` → `getBilateralReviewRecipientIds` (`onecgiar-pr-server/src/api/results/results.service.ts:2921-3075`). Client text: `getResultNotificationTextParts` → `buildCenterDecisionParts` (`onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts:198-280`).

## 4. Proposed Outcome

| # | Behavior |
|---|---|
| 1 | On **Approve**, every user with an active `role_by_user` row (any role) where `center_id = <lead center>` receives one notification. |
| 2 | Those center recipients see the new sentence: SP code (bold) · ", as primary Science Program, has approved your center's result" · result link `<code> - <title>`. |
| 3 | The row shows the "Decision update" chip, the "W3/Bilateral" chip, `<level> · <type>` and the relative time. No Accept/Decline. |
| 4 | Clicking marks it read and opens the result, as today (NDDL-R-1 deep link). |
| 5 | The emitter is excluded; a user with several center roles (or who is also the submitter) gets **one** row. |
| 6 | Approval never fails because of the notification (existing never-throws posture). |

## 5. Scope

| In | Out |
|---|---|
| Recipient set for **Approve**: any active role on the lead center | Reject — recipients and copy stay as today (see OQ-2) |
| New approve sentence for center recipients (stored row + socket toast + inbox row) | Email (still forbidden, P2-3157 BR1) |
| "Decision update" chip, check icon, level · type meta on the row | Backfill of rows written before the change |
| Legacy rows (old text) keep rendering | Tagged non-lead centers (contributors) — they keep their own flows |

## 6. Non-Goals

- No new notification type and no migration — `BILATERAL_RESULT_APPROVED` is reused.
- No change to `/api/bilateral/*` payloads.
- No change to the other 6 callers of `getUserIdsByCenter` (tagging, primary request, share request).
- No role guard on the review endpoint (still P2-3414 / AUTH-T-11).

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Center staff (any role on the lead center) | Start receiving the approval notice |
| `api/results` — `results.service.ts` | Recipient resolution + stored text for the center branch |
| `auth/role-by-user` — `RoleByUser.repository.ts` | New any-role query by center (mirror of `getUserIdsByInitiative`) |
| `api/notification` | None expected (`emitResultNotification` already takes text) |
| Client `notification-type.constants.ts`, `notification-item` + copy file in `internationalization/` | New sentence parts, "Decision update" chip, meta line |
| Specs | Amends NOTIF-R-2/R-3 and NDCW-R-2/R-4 for the Approve case |

## 8. Visual Reference

- Source: screenshot supplied by the user (reference row)
- Location: `docs/specs/notifications/sp-approval-center-notice/mockup/reference-row.png`
- Notes: one inbox row, unread dot, check-circle icon, bold SP code and result code, link-coloured title, chips "Decision update" (grey filled) and "W3/Bilateral" (outlined), meta "Outcome · Innovation Use · 4 days ago". UI work uses Spartan components and `docs/ux-ui/design.md` §7 tokens.

## 9. Requirement Delta Preview

### ADDED

- Any-role center recipients for the Approve notice.
- "Decision update" chip and `<level> · <type>` meta on the approve row.

### MODIFIED

- **NOTIF-R-3 / NDCW-R-4 (Approve only):** center recipients = any active role on the lead center, not `CENTER_USER` only.
- **NDCW-R-2 (Approve only):** center sentence becomes *"`<SPXX>`, as primary Science Program, has approved your center's result `<code>` - `<title>`"*.

### REMOVED

- None. The old center sentence still renders for rows already stored (legacy).

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. New any-role query + new stored-text marker (recommended)** | Add `getUserIdsByCenterAnyRole(centerCode)`; in the Approve branch use it; store a short structured text (e.g. the SP code) the client recognises and turns into the new sentence; legacy texts fall back to today's render | Other callers untouched; old rows keep working; one place builds the sentence | Client must tell new vs. legacy text apart |
| B. Widen `getUserIdsByCenter` to any role | Drop `role = 9` from the shared query | Smallest diff | Silently widens 6 other notification flows (tagging, primary request, share request) — out of scope and risky |
| C. Server stores the whole sentence; client prints it | Put the full sentence on `text` | No client parsing | Can't bold SP code / result code or link the title without parsing again; breaks the current prefix/link/suffix model |

## 11. Recommended Approach

**Option A.** It is the smallest safe path: a new query scoped to this one caller, the same notification type, and a client branch that only activates for the new text shape. It follows the existing pattern of `getUserIdsByInitiative` ("any role on purpose") and the WPT/NDCW precedent of detecting text shape and falling back for legacy rows.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Default if not answered |
|---|---|---|
| OQ-1 | Does the **submitter** keep *"✅ Your Result … has been Approved by the Science Program SPXX."* or also get the new sentence? | Submitter keeps today's text (NDCW-R-1) |
| OQ-2 | Should **Reject** get the same treatment (any role, matching sentence)? | No — Approve only, as asked |
| OQ-3 | "Role on the center" = **lead** center (`is_leading_result = 1`) only? | Yes, lead center only |
| OQ-4 | Does the "Decision update" chip replace the type label only for this type, or for all decision types (Approved/Rejected)? | Both decision types, so they look the same |
| OQ-5 | Is the `<level> · <type>` meta already on update rows today, or new? | Verify in `/akili-specify`; add if missing |
| R-1 | Volume: a center with many roles → many rows per approval | Acceptable; it is in-app only, no email |
| R-2 | `notification-type.constants.ts` is heavily shared; renaming keys/copy breaks specs (memory: run affected client specs before commit) | Run the touched specs only |

## 13. Success Criteria

- A user with a non-`CENTER_USER` role on the lead center sees the approve row after a Science Program approves.
- The row reads exactly as the reference, with the two chips and the meta line.
- No duplicate rows; the approving user does not notify themselves.
- Rows stored before the change still render.
- Tagging / primary-request / share-request recipients are unchanged.

## 14. Next Step

```text
/akili-specify notifications/sp-approval-center-notice
```
