# Module Spec — Bilateral Review Decision Notifications — Tasks

> **Status:** server tasks done and verified; client tasks done but **unverified in this workspace**
> (see Pre-flight). Tickets: P2-3157 / epic P2-3156.

## 1. Scope of this task list

Everything needed for P2-3157 plus the submit-for-review enabler. Branch
`JuanGuzman-io/feat-p2-3157-inapp-approve-reject`, cut from `origin/performance-refactor`.

## 2. Pre-flight checklist

- [x] Branch created from `performance-refactor` (NOT `staging` — no centre module there).
- [x] `onecgiar-pr-server` dependencies installed.
- [x] `onecgiar-pr-client` dependencies installed.
- [ ] **`onecgiar-pr-client/src/environments/environment.ts` present.** Gitignored and absent here,
      so every client suite importing `ResultsApiService` / `AuthService` / `BilateralApiService`
      fails to even load. This is the single reason the client tasks are unverified.
- [ ] **DB access** for `migration:check` and `migration:run` (needs `.env`; `ECONNREFUSED` locally).
- [ ] `SELECT * FROM notifications_type; SELECT * FROM notifications_level;` per environment — to see
      whether the two new rows already exist by hand and whether the catalog is consistent.
- [ ] `SHOW CREATE TABLE result_review_history;` — resolves OQ-2 (`'UPDATE'` in the column enum).

## 3. Task list

### `NOTIF-T-1` — Notification types + idempotent seed ✅

`api/notification/enum/notification.enum.ts` — `BILATERAL_RESULT_APPROVED`,
`BILATERAL_RESULT_REJECTED`. `migrations/1787254200000-SeedBilateralReviewNotificationTypes.ts` —
`INSERT … WHERE NOT EXISTS`, `down` deletes by `type`.

### `NOTIF-T-2` — AC2 copy ✅

`notification.service.ts` — two new `case`s, `buildBilateralReviewDescription`, `truncateTitle`
(60 chars), `resolveOwnerProgramCode`.

### `NOTIF-T-3` — Emission on approve/reject ✅

`results.service.ts` — `emitBilateralReviewNotification` invoked post-commit inside
`reviewBilateralResult`; non-blocking `try/catch`.

### `NOTIF-T-4` — Recipient resolution ✅

`RoleByUser.repository.ts` → `getUserIdsByCenter(centerCode)`. `results.service.ts` →
`getBilateralReviewRecipientIds` (submitter + centre users, emitter removed) and
`getLeadCenterCode`.

### `NOTIF-T-5` — Review-history read ✅

`result-review-history.repository.ts` → `getReviewHistoryByResultId`.
`results.service.ts` → `getBilateralReviewHistory`. `results.controller.ts` →
`GET bilateral/:resultId/review-history`.

### `NOTIF-T-6` — Client type resolution by name ✅ (unverified for the component parts)

New `shared/constants/notification-type.constants.ts`; the four duplicated switches removed from
`pop-up-notification-item`, `filter-notification-by-search.pipe`, `update-notification`.

### `NOTIF-T-7` — AC3 navigation + AC5 read ✅ (unverified)

`pop-up-notification-item.component.ts` → `onNotificationClick`.
`bilateral-api.service.ts` → `GET_centersByResultId`, `GET_bilateralReviewHistory`.

### `NOTIF-T-8` — AC4 justification UI ✅ (unverified)

`bilateral-results-list` — ⚠ trigger on rejected rows, `app-pr-dialog`, `?result=` row focus, new
`--pr-color-*` styles.

### `NOTIF-T-9` — Optional approval comment ✅ (unverified)

`result-review-drawer.component.{ts,html}` — replaces the hardcoded `justification: 'Approved'`
(UX Finding 5.3.5). `justification` relaxed to optional on both API service wrappers.

### `NOTIF-T-10` — Submit-for-review enabler ✅

`bilateral-center.controller.ts` → `PATCH submit-for-review/:resultId`.
`bilateral-center.service.ts` → `submitForReview` + `assertCenterPermission`.

## 4. Dependency graph

```
NOTIF-T-1 ─┬─▶ NOTIF-T-2 ─▶ NOTIF-T-3 ─▶ NOTIF-T-6 ─┬─▶ NOTIF-T-7
           └─▶ NOTIF-T-4 ──────┘                     └─▶ NOTIF-T-8 ◀── NOTIF-T-5
NOTIF-T-9  (independent)
NOTIF-T-10 (independent enabler)
```

## 5. Test plan

**Server — run and green.** 13 suites, 130 tests:

```bash
cd onecgiar-pr-server
npm run test -- --testPathPattern="notification|result-review-history|role-by-user|bilateral-center|results.controller"
```

New coverage: 4 tests for the AC2 copy (incl. truncation and the missing-program fallback), 4 for
`getUserIdsByCenter`, 4 for `getReviewHistoryByResultId`, 1 controller delegation, 8 for
`submitForReview` (happy path, Draft, wrong status, unknown result, invalid id, no permission, no
lead centre, no Science Program).

**Client — written, only partly run.**

```bash
cd onecgiar-pr-client
npx jest --testPathPattern="notification-type.constants"   # 20 tests — RUN, GREEN
npx jest --testPathPattern="filter-notification-by-search" # RUN, GREEN (legacy copy unchanged)
# blocked on environment.ts:
npx jest --testPathPattern="pop-up-notification-item|update-notification|bilateral-results-list|result-review-drawer"
```

`notification-type.constants.spec.ts` carries the regression net that matters most: it asserts the
legacy strings byte-for-byte, so the four removed switches provably still produce the same copy.

**Also unrun locally:** `npm run migration:check` (needs DB).

## 6. Rollout & verification

1. `npm run migration:run` on test; confirm the two `notifications_type` rows.
2. Take a bilateral result in Pending Review; `PATCH /api/results/bilateral/:id/review-decision`
   with `{decision:'REJECT', justification:'…'}`.
3. Check `notifications`: one row per recipient (submitter + centre users), emitter absent.
4. Log in as a centre user → bell shows the ❌ copy → click marks read, decrements the badge, and
   lands on `/bilateral/:acronym/home?result=<code>` with the row highlighted.
5. Open the ⚠ on the rejected row; compare against `result_review_history.comment`.
6. Repeat with APPROVE and a typed comment; confirm the history stores the comment, not `'Approved'`.
7. Confirm no email left the system (BR1).
8. Exercise `PATCH /api/bilateral/center/submit-for-review/:id` from a centre account: happy path,
   plus a draft with no Science Program (expect 400) and a centre the user does not belong to
   (expect 403).

## 7. Cleanup & follow-ups

- **OQ-1 — no guard on `review-decision`.** Any authenticated user can approve/reject. Needs its own
  high-priority ticket; relates to `docs/specs/auth/center-user` AUTH-T-11.
- **OQ-2 —** confirm `result_review_history.action` accepts `'UPDATE'`; `submitForReview` writes it.
- Migrate notification copy to `internationalization/`.
- Replace the raw hex in `bilateral-results-list.component.scss` `.status_*` chips with tokens.
- Extend `status-meta.ts` with statuses 6/7 and promote it to a shared location.
- Reconcile D28 in `bilateral-spec.md` once P2-3166 lands, so the three channels are described in one
  place.

## 8. Roll-back plan

- Revert the branch; the migration's `down` removes both catalog rows.
- No data migration and no schema change, so rollback is safe at any point. Notifications already
  persisted would simply render through the neutral default branch.

## Required cross-references

- `requirements.md` and `design.md` in this folder
- `docs/prd.md` AC-8; `docs/detailed-design/detailed-design.md` W4
- `docs/specs/auth/center-user/task.md` AUTH-T-8 / T-11
- `docs/specs/bilateral-ai-workflow/bilateral-spec.md` D28, UX Findings 5.3.1 / 5.3.5
