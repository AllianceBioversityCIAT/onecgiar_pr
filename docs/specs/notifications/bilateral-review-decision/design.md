# Module Spec — Bilateral Review Decision Notifications — Design

> Cites `requirements.md` in this folder. Baseline: `docs/prd.md` AC-8,
> `docs/trd/trd.md` W4.

## 1. Summary

Hook an in-app notification onto the existing bilateral approve/reject decision, expose the review
trail so the reporting centre can read the rejection justification, and make the decision reachable
from the centre UI in the first place. Type resolution moves from database ids to names on both
sides of the wire.

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Files |
|---|---|
| Notification catalog | `api/notification/enum/notification.enum.ts`, `migrations/1787254200000-SeedBilateralReviewNotificationTypes.ts` |
| Notification copy | `api/notification/notification.service.ts` |
| Trigger | `api/results/results.service.ts` → `reviewBilateralResult` |
| Recipients | `auth/modules/role-by-user/RoleByUser.repository.ts`, `api/results/results-centers/` |
| Review trail read | `api/results/result-review-history/result-review-history.repository.ts`, `results.controller.ts` |
| Submit transition | `api/bilateral/bilateral-center.controller.ts`, `services/bilateral-center.service.ts` |
| Client type resolution | `shared/constants/notification-type.constants.ts` |
| Client surfaces | `header-panel/components/pop-up-notification-item/`, `results-notifications/components/update-notification/`, `results-notifications/pipes/filter-notification-by-search.pipe.ts`, `pages/bilateral/pages/bilateral-results-list/` |

### 2.2 Sequence

```
Centre user                SP reviewer            PRMS server                     Centre user
    │                          │                       │                              │
    ├─ PATCH center/submit-for-review/:id ────────────▶ │
    │                          │            status → Pending Review (5)
    │                          │            + result_review_history row
    │                          │                       │
    │                          ├─ PATCH bilateral/:id/review-decision ──▶
    │                          │            ┌── TRANSACTION ──────────┐
    │                          │            │ status → 6 or 7         │
    │                          │            │ reviewed_by/_at         │
    │                          │            │ result_review_history   │
    │                          │            └── COMMIT ───────────────┘
    │                          │            share-request / ToC side effects
    │                          │            emitBilateralReviewNotification()   ◀── non-blocking
    │                          │                       │      persists 1 row per recipient
    │                          │                       │      + socket push to online users
    │                          │                       │                              │
    │◀──────────────────────── bell badge increments ─────────────────────────────────┤
    ├─ click ─▶ GET results/get/centers/:id  ──▶ lead centre acronym
    ├─ navigate /bilateral/:acronym/home?result=<code>  + PATCH notification/read/:id
    └─ click ⚠ ─▶ GET results/bilateral/:id/review-history ──▶ justification modal
```

## 3. Data Model Changes

### 3.1 Entities

None. No new tables, no new columns. The feature reads `result_review_history`,
`results_by_inititiatives`, `results_center` and `role_by_user` as they already exist.

### 3.2 Migrations

`1787254200000-SeedBilateralReviewNotificationTypes.ts` — seeds two `notifications_type` rows,
`'Bilateral Result Approved'` and `'Bilateral Result Rejected'`, using the
`INSERT … SELECT … WHERE NOT EXISTS` idiom (mirrors `1784919268056-AddBilateralDraftResultStatus.ts`
and `1783357000401-SeedCenterUserRole.ts`). `down` deletes both by `type`.

This is the **first** migration to seed this table — the existing rows were inserted by hand per
environment, which is exactly why the code resolves types by name.

### 3.3 CLARISA implications

None. The lead centre is read from `results_center.center_id` (a CLARISA centre code) via the
existing `getAllResultsCenterByResultId`.

## 4. API Surface

### 4.1 New / changed endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/results/bilateral/:resultId/review-history` | New. Review trail newest-first, with reviewer name/email joined. Lives on `ResultsController`, which carries `ResponseInterceptor` at class level. |
| `PATCH` | `/api/bilateral/center/submit-for-review/:resultId` | New. Editing/Draft → Pending Review. Guards: caller holds Center User on the lead centre; lead centre present; owner Science Program present. |
| `PATCH` | `/api/results/bilateral/:resultId/review-decision` | Unchanged shape; `justification` is now genuinely optional on APPROVE. |

### 4.2 Bilateral / platform-report impact

**None.** No `/api/bilateral/*` read payload changed, so
`onecgiar-pr-server/docs/bilateral-result-summaries.en.md` needs no change-log row. The new
`submit-for-review` endpoint is a write on the JWT-protected `center/*` sub-surface, not part of the
outbound contract.

## 5. Server Workflow / Business Rules

- The notification is emitted **after** `await this._dataSource.transaction(...)` and after the
  approve/reject side effects, wrapped in its own `try/catch` that only logs (NOTIF-R-7). Modelled on
  `emitResultCreatedNotification` — which is dead code in the tree, so it served as a template only.
- Recipients: `Result.external_submitter ?? Result.created_by`, plus
  `RoleByUserRepository.getUserIdsByCenter(<lead centre code>)`. De-duplicated via a `Set`; the
  emitter is removed both here and again inside `emitResultNotification`.
- `user_notification_settings` is deliberately **not** consulted — see NFR-1.
- Copy is built once, server-side, in `buildResultNotificationDescription` (for the socket payload)
  and independently on the client for the rendered list. Both derive from the type NAME.
- `submitForReview` refuses a result without an active `initiative_role_id = 1` row. That row is
  load-bearing twice over: the bell read paths filter on it, and `_updateTocMapping` dereferences it
  without a null check on approval (`results.service.ts:3888`), which would 500 after the status had
  already committed.

## 6. Frontend Plan

### 6.1 Routes / modules

No new routes. AC3 navigates to the existing `/bilateral/:centerAcronym/home`. The reserved
`center/:centerCode/report` stub is left untouched.

### 6.2 Components & services

- **New:** `shared/constants/notification-type.constants.ts` — `NotificationType` enum mirroring the
  server, a legacy numeric-id fallback map, and `resolveNotificationType` /
  `getNotificationActionVerb` / `getResultNotificationTextParts` / `buildResultNotificationText` /
  `isBilateralReviewNotification`.
- **Refactored:** the four duplicated `1/2/3/5 → verb` switches in `pop-up-notification-item`,
  `filter-notification-by-search.pipe` and `update-notification` now call the shared helper. The
  previous `default` branch claimed every unknown type had been "successfully Quality Assessed"; the
  new default is a neutral lead-in.
- **`pop-up-notification-item`** gains `onNotificationClick`: for the two bilateral types it
  preventDefaults, marks read, resolves the lead centre via `GET results/get/centers/:id` and
  navigates; every other type keeps its plain anchor behaviour.
- **`bilateral-results-list`** gains a ⚠ trigger on `status_id = 7` rows, a justification dialog
  (`app-pr-dialog`) and `?result=<code>` row highlighting.
- **`result-review-drawer`** gains an optional approval comment, replacing the hardcoded literal.

### 6.3 Design system usage

- New styles use `--pr-color-*` tokens only. The pre-existing `.status_*` chips in
  `bilateral-results-list.component.scss` still carry raw hex — untouched, flagged as debt.
- Dialog uses the shared `app-pr-dialog`. **Deviation:** `design.md:181-185` reserves modals for
  confirm/destroy/error and names "review comments" as a right-rail case; a modal was chosen for
  literal AC4 compliance (OQ-3).
- No PrimeNG (0 imports remain on this branch); the bell area is Angular CDK Overlay + Tailwind.

### 6.4 Notification UX

Copy is hardcoded English, consistent with the rest of the notification area, which uses no
`TermKey` today. Recorded as debt against `onecgiar-pr-client/CLAUDE.md` §5.

## 7. Security & Authorization

- `submit-for-review` enforces `validationCenterPermissions(user.id, leadCentreCode)` →
  `ForbiddenException` otherwise.
- The review-decision endpoint remains unguarded (OQ-1). This design does not change that posture;
  it only makes the consequence more visible, since a decision now notifies people.
- No secret, token, email body or webhook URL is logged. Warnings carry result ids and centre codes
  only.

## 8. Performance & Capacity

- Notification list queries are untouched — no new joins on `getAllNotifications` /
  `getPopUpNotifications` (NFR-2). The centre lookup is one small request per click.
- `getUserIdsByCenter` is a single indexed lookup on `role_by_user`, returning at most a few dozen
  ids per centre.
- Recipient count per decision ≈ 1 submitter + centre users, so the `save()` writes a small batch.

## 9. Observability

Nest `Logger` warnings on: notification service unavailable, zero recipients resolved, centre-user
resolution failure, lead-centre resolution failure, and emission failure. All carry the result id.
