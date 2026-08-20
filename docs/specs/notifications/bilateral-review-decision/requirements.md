# Module Spec — Bilateral Review Decision Notifications — Requirements

> **Status:** implemented, pending QA
> **Tickets:** [P2-3157](https://cgiarmel.atlassian.net/browse/P2-3157) (epic [P2-3156](https://cgiarmel.atlassian.net/browse/P2-3156))
> **Branch:** `JuanGuzman-io/feat-p2-3157-inapp-approve-reject` (based on `performance-refactor`)

## 1. Module / Feature

In-app (bell) notifications for the bilateral review decision, plus the centre-facing read-back of
the rejection justification. Spans three modules: `api/notification`, `api/results` and
`api/bilateral` on the server; the header bell, the notifications module and the centre bilateral
list on the client.

## 2. Context

A CGIAR Centre submits a bilateral result; a Science Program approves or rejects it. Before this
change, `ResultsService.reviewBilateralResult` flipped `status_id` to Approved (6) or Rejected (7),
wrote `reviewed_by` / `reviewed_at` and a `result_review_history` row — and stopped there. The centre
was never told, and the justification captured in `result_review_history.comment` had **no reader at
all**: no endpoint, and not even a read method on `ResultReviewHistoryRepository`. Centres had to ask
outside the system why a result came back.

Baseline citations:
- `docs/prd.md:190` — **AC-8 Observability and notifications**.
- `docs/detailed-design/detailed-design.md:254` — **W4 Notifications**.
- `docs/detailed-design/detailed-design.md:240` — "Every transition writes `result-review-history`
  and may emit notifications via `NotificationModule`."
- `docs/specs/bilateral-ai-workflow/bilateral-spec.md:1169` — **UX Finding 5.3.1**, "No review
  history visible to submitters".
- `docs/specs/bilateral-ai-workflow/bilateral-spec.md:1170` — **UX Finding 5.3.5**, "Hardcoded
  'Approved' justification".

## 3. In Scope / Out of Scope

### In scope

- Two new notification types and their in-app delivery on approve / reject.
- Recipients: the submitter **and** every active Center User of the result's lead centre.
- A read endpoint for the review trail, and a justification modal on the centre's bilateral list.
- Deep-link from the notification to the centre's bilateral dashboard with the row in focus.
- Replacing the hardcoded `justification: 'Approved'` with an optional reviewer comment.
- A submit-for-review transition for centre-authored results (enabler — see NFR-3).

### Out of scope

- The **webhook per Centre** (decision D28, `bilateral-spec.md:610`) — that is P2-3166.
- Email for these transitions — explicitly forbidden by BR1 of P2-3157, which also supersedes the
  "Email notification sent on reject (NEW)" line in `bilateral-spec.md` Appendix B (`:1285`, `:1313`).
- Role enforcement on the review-decision endpoint (see Open Questions).
- Migrating notification copy to `internationalization/`.

## 4. Personas Affected

| Persona | Impact |
|---|---|
| Centre user (reporter) | Learns of the decision in-app, and can read the rejection justification. |
| Science Program reviewer | Can attach an optional comment when approving. |
| PRMS technical team | One more notification type in the catalog; no email volume added. |

## 5. User Stories

- **NOTIF-US-1** — As a Centre User, I want an in-app notification when my submitted result is
  approved or rejected, so I can react without relying on external email.
- **NOTIF-US-2** — As a Centre User, I want to read the exact rejection justification, so I know
  what to fix.
- **NOTIF-US-3** — As a Science Program reviewer, I want to attach an optional comment when I
  approve, so the centre gets context rather than the literal word "Approved".

## 6. Functional Requirements

### Required (MUST)

- **NOTIF-R-1** — On APPROVE or REJECT of a bilateral result, the system MUST persist one in-app
  notification per recipient and increment the unread badge.
- **NOTIF-R-2** — Copy MUST follow AC2 of the ticket:
  `✅ Your Result <code> - <title…> has been Approved by the Science Program <SPCode>.` and the ❌ /
  Rejected counterpart.
- **NOTIF-R-3** — Recipients MUST be the submitter (`Result.external_submitter`, falling back to
  `created_by`) plus every active `role_by_user` row with `center_id = <lead centre>` and
  `role = RoleEnum.CENTER_USER`.
- **NOTIF-R-4** — Clicking the notification MUST navigate to `/bilateral/:centerAcronym/home` with
  the decided result in focus, and MUST mark the notification read.
- **NOTIF-R-5** — The review trail (including `comment`) MUST be readable over HTTP for a result.
- **NOTIF-R-6** — Notification types MUST be resolved by NAME, never by database id, on both server
  and client.
- **NOTIF-R-7** — Emitting a notification MUST NOT be able to fail the review decision.

### Should (SHOULD)

- **NOTIF-R-8** — The rejection justification SHOULD be reachable from the rejected row without
  leaving the list.
- **NOTIF-R-9** — Approval SHOULD accept an optional reviewer comment.

## 7. Non-Functional Requirements

- **NFR-1 (no email)** — BR1: no email is dispatched for these transitions. In particular the
  recipient resolution MUST NOT filter on `user_notification_settings`, whose flags are
  email-only — filtering on them would silently suppress the in-app notification as well.
- **NFR-2 (performance)** — This work lands on `performance-refactor`. The centre of the result is
  resolved **on notification click**, not by widening `getAllNotifications` /
  `getPopUpNotifications` with extra joins.
- **NFR-3 (reachability)** — The centre-authored flow creates results in Editing/Draft and nothing
  in the branch moved them to Pending Review, so `reviewBilateralResult` was unreachable from the
  centre UI. A submit-for-review transition is therefore required for the story to be observable
  end-to-end.
- **NFR-4 (catalog portability)** — `notifications_type` rows were historically inserted by hand per
  environment, so ids differ. Seeding MUST be idempotent and lookups MUST be by name.

## 8. Acceptance Criteria

| ID | Criterion | Verified by |
|---|---|---|
| **AC-1** | Approve/reject persists one notification row per recipient, emitter excluded. | Manual + `notification.service.spec.ts` |
| **AC-2** | Copy matches NOTIF-R-2 exactly, with title truncation at 60 chars. | `notification.service.spec.ts`, `notification-type.constants.spec.ts` |
| **AC-3** | Click navigates to the centre dashboard with `?result=<code>` and the row highlighted. | `pop-up-notification-item.component.spec.ts` (unrun — see task.md) |
| **AC-4** | A rejected row exposes the justification; the value matches `result_review_history.comment`. | Manual |
| **AC-5** | Click marks the notification read and decrements the badge. | `pop-up-notification-item.component.spec.ts` (unrun) |
| **AC-6** | Existing notification copy (submitted / unsubmitted / created / QAed) is unchanged. | `filter-notification-by-search.pipe.spec.ts`, `notification-type.constants.spec.ts` |
| **AC-7** | A centre user can move an Editing or Draft result to Pending Review; a result without a lead centre or Science Program is refused. | `bilateral-center.service.spec.ts` |
| **AC-8** | No email is sent for these transitions. | Manual |

## 9. Dependencies & Assumptions

### Upstream dependencies

- `docs/specs/auth/center-user/` Phase 1 (`role_by_user.center_id`, `RoleEnum.CENTER_USER = 9`) —
  status TBR. Without it NOTIF-R-3 is not implementable.
- `notifications_type` / `notifications_level` catalog rows in each environment.

### Downstream consumers

- P2-3166 (webhooks) will reuse the same trigger point in `reviewBilateralResult`.
- P2-3188 will reuse the notification-type + recipient scaffolding.

### Assumptions

- Every bilateral result that reaches Pending Review has an active
  `results_by_inititiatives` row with `initiative_role_id = 1`. Verified for the
  `/api/bilateral/create` path: `toc_mapping.science_program_id` is mandatory and validated against
  CLARISA before the transaction opens. The new submit-for-review path enforces the same invariant.
- `/bilateral/:centerAcronym/home` is the centre's bilateral dashboard. The reserved
  `center/:centerCode/report` stub (AUTH-T-8) is **not** used — nothing links to it and it redirects
  away on init.

## 10. Open Questions

- **OQ-1** — `PATCH /api/results/bilateral/:resultId/review-decision` has **no guard and no
  `@Roles`**: any authenticated user can approve or reject. Out of scope here; belongs to
  `docs/specs/auth/center-user` Phase 2 (AUTH-T-11). **Recommend a dedicated high-priority ticket.**
- **OQ-2** — `ReviewActionEnum` declares `APPROVE='APPROVED'` / `REJECT='REJECTED'` / `UPDATE='UPDATE'`,
  but migration `1768572302006` created the column as `enum('APPROVE','REJECT')`. Needs a
  `SHOW CREATE TABLE result_review_history` per environment to confirm `'UPDATE'` is accepted.
- **OQ-3** — AC4 asks for a "modal"; `docs/system-design/design.md:181-185` reserves modals for
  confirm/destroy/error and names "review comments" as a right-rail case (`:167`). Modal was chosen
  for literal AC compliance — flagged as a deliberate deviation.
- **OQ-4** — In-app is a **third** channel next to D28's webhook and Appendix B's email. Recorded
  here as extending D28, not replacing it.

## Required cross-references

- `docs/prd.md` — AC-8
- `docs/detailed-design/detailed-design.md` — W4, §240
- `docs/system-design/design.md` — §6 drawers/modals, DD-10
- `docs/specs/auth/center-user/` — role model this depends on
- `docs/specs/bilateral-ai-workflow/bilateral-spec.md` — D28, UX Findings 5.3.1 / 5.3.5
