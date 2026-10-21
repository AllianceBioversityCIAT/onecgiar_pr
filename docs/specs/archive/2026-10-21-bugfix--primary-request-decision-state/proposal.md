# Primary request rows show a fake "Accepted" — Proposal

> **In one line:** since PRA, the "Accepted by <center user>" + **Accepted** chip on a primary Science Program request row is a system write made at Center submit, not an SP decision. Hide it; show **Accepted / Rejected** only once the primary SP actually approves or rejects the bilateral result.

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `bugfix/primary-request-decision-state` |
| **Slug** | `primary-request-decision-state` — derived from free-text argument |
| **Type** | Bug |
| **Approval Mode** | gated |
| **Source** | QA finding (Angel Jarrin) under Jira P2-3157, 2026-10-21; PRTest result 9864 (IFPRI → SP03) |
| **Related spec** | `notifications/primary-review-not-accept` (PRA) — this is the fix for a PRA-T-3 HITL finding |
| **Depends on** | none |
| **Parallel-safe** | yes (client-only, one component + copy) |
| **Date** | 2026-10-21 |

## 2. Intent

The SP inbox must not tell a Science Program that something was "Accepted" when nobody in the SP decided anything. The only decision an SP makes on a bilateral result today is **approve / reject** the result; that is the only state the primary row may show.

## 3. Problem / Current Behavior

Notifications page → Received → row *"IFPRI has tagged SP03 as the primary Science Program of result 9864 … Click here to validate the bilateral result"*:

| Shown on the row | What it really is |
|---|---|
| Chip **Needs your review** | Correct — result is Pending Review |
| Caption **Accepted by Maria Camila Giraldo · Oct 16, 2026** | Maria Camila is the **IFPRI submitter**, not an SP03 member |
| Chip **Accepted** | No SP decision exists; the review drawer says **PENDING REVIEW** |

QA reads it as "SP03 accepted the result", then opens the drawer and sees Pending Review → reported as an inconsistency.

## 4. Proposed Outcome

For **primary** request rows (`request_type = 'primary'`) in the Notifications inbox:

| Result status (`obj_result.status_id`) | Decision caption + chip | "Needs your review" + "Click here to validate" |
|---|---|---|
| 5 Pending Review | **none** | shown (today's behaviour) |
| 6 Approved | **Accepted** (SP approved) | hidden |
| 7 Rejected | **Rejected** (SP rejected) | hidden |
| any other (Editing, Draft, Discontinued …) | **none** | hidden |

Contribution / contributor request rows keep today's "Accepted by X" / "Declined by X" — there it *is* a real person's decision.

## 5. Scope

- `notification-item.component.{ts,html}` — the decided-state footer (`@case (2)` and `@case (3)` of the `request_status_id` switch) for primary rows only.
- The row's "Needs your review" type chip and validate CTA gating — confirm they already follow `status_id == 5` (`primaryReviewTarget`); align if not.
- Copy for the new chip/caption in `contribution-request-drawer.copy.ts`.
- The request detail panel (drawer `view` mode) if it repeats the same "Accepted by" metadata for a primary row — check in `/akili-specify`.
- Regression specs in `notification-item.component.spec.ts`.

## 6. Non-Goals

- No server change: `transferPrimary` keeps inserting the ACCEPTED `share_result_request` row (it is what lists the result in the SP inbox — PRA §5).
- No data fix / migration on existing rows.
- No change to contribution request rows, update rows ("Decision update", "submitted for your review"), or the bell (the bell card does not render this footer).
- No change to the review drawer.

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| SP leads / members (primary SP) | Row stops claiming a decision that didn't happen |
| QA (P2-3157 validation) | Unblocks the notifications UAT on this point |
| `notifications/primary-review-not-accept` (PRA) | Follow-up note added to its tasks §7 |
| `notifications/inbox-revamp` (NOTIF-T-10/T-15/T-16) | Owns the footer markup being amended |

## 8. Visual Reference

- Source: None (existing component; PRTest screenshot from QA in Jira P2-3157 thread).
- Notes: reuses the existing `notification_decision_chip_accepted` / `_declined` chip styles and tokens — no new visual element. Spartan `hlmBadge` already in use.

## 9. Bug Diagnosis

### Observed Symptom
A primary SP request row shows "Accepted by <person> · <date>" and an **Accepted** chip while the result is still Pending Review.

### Reproduction Steps
1. PRTest, user with a role in SP03 → Notifications → Received → Reporting 2026.
2. Row for result **9864** (IFPRI tagged SP03 as primary): caption *Accepted by Maria Camila Giraldo · Oct 16, 2026*, chip **Accepted**.
3. Click *Click here to validate the bilateral result* → drawer header shows **PENDING REVIEW**, *Submitted by: Maria Camila Giraldo*.
Expected: no decision state until SP03 approves or rejects.

### Root Cause (confirmed)
1. **PRA changed the model**: the SP no longer accepts "being primary". At Center submit, `BilateralCenterService.submitForReview` calls `PrimaryProgramRequestService.transferPrimary(...)`.
2. `transferPrimary` (`primary-program-request.service.ts` ~L832) inserts the primary `share_result_request` row with `request_status_id = ACCEPTED`, `approved_by = user.id` (**the submitting Center user**), `aprovaed_date = now`.
3. The inbox row switches on `request_status_id` (`notification-item.component.html` L143, `@case (2)` L351-505) and renders *"Accepted by {obj_approved_by} · {aprovaed_date}"* + chip **Accepted** — markup from the pre-PRA era, when status 2 on a primary row meant "the SP accepted to be primary".
4. PRA-T-2 changed the pending row's button to "Review result" but did not touch the decided-state footer → the stale meaning leaks.

### Impact & Scope
- Every primary row of a bilateral result submitted after PRA (2026-10-07 onward) — all SPs, all centres.
- Legacy pre-PRA rows where an SP user really accepted: will also lose "Accepted by X". Acceptable — "accept as primary" no longer exists as a user action, and the row will show the real review outcome instead.
- No data integrity or security impact; display only.

### Fix Strategy
Client-only, behaviour change with logic (status-driven rendering) → **not** `/akili-quick`. `/akili-specify` (Lite) in Bug Mode with a regression test: a primary row with `request_status_id = 2` and `status_id = 5` must render **no** decision caption/chip (red today, green after).

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Client: status-driven footer for primary rows** (recommended) | Primary rows ignore `request_status_id` for the footer; derive caption/chip from `obj_result.status_id` (6 → Accepted, 7 → Rejected, else none) | Smallest; no contract change; `status_id` already in the payload |
| B. Server: insert the transfer row with a new "system" status | Distinguishes system vs human rows at the source | Touches the PRA write path, every reader of `request_status_id`, inbox counts/filters; migration for existing rows |
| C. Client: just hide the footer on primary rows | One `@if` | Doesn't meet the requirement to show Accepted/Rejected after the SP decides |

## 11. Recommended Approach

**Option A.** One getter (e.g. `primaryDecision: 'accepted' | 'rejected' | null` from `obj_result.status_id`) drives the footer for primary rows; non-primary rows untouched. Caption wording without a person (the payload has no reviewer for the SP decision) — e.g. *"Accepted by SP03"* / *"Rejected by SP03"* — final copy fixed in `/akili-specify`.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Proposed answer |
|---|---|---|
| OQ-1 | Caption after the decision: show the SP code only (*"Accepted by SP03"*), or chip alone? Reviewer name/date is not in the inbox payload. | SP code + chip; no date. Confirm in specify. |
| OQ-2 | Chip wording: **Accepted / Rejected** (user's words) vs **Approved / Rejected** (result status names, decision notifications). | **Accepted / Rejected** per user, 2026-10-21 — confirm. |
| R-1 | `status_id` is the *current* status: a Rejected result later resubmitted goes back to 5 → row shows no decision again. | Intended — the row reflects what the SP has to do now. |
| R-2 | Specs asserting "Accepted by" on primary rows (inbox-revamp NOTIF-T-10/15) will break. | Update them in the same task; `--findRelatedTests` before push (memory). |

## 13. Success Criteria

- On PRTest, result 9864's primary row shows **no** Accepted caption/chip while Pending Review.
- After SP03 approves (or rejects) a test result, its primary row shows **Accepted** (or **Rejected**).
- Contribution request rows unchanged ("Accepted by X" / "Declined by X").
- Regression spec red before / green after; affected specs pass with `--maxWorkers=2`.

## 14. Next Step

```text
/akili-specify bugfix/primary-request-decision-state   (Lite, Bug Mode)
```
