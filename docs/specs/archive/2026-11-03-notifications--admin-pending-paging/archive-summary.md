# Archive Summary — Requirements — Notifications: Bounded Pending Load (admin-scale)

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/admin-pending-paging` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 6 `[x]`, 5 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `cb834721a 2026-10-08 ✨ feat(notification) [SPEC:notifications/admin-pending-paging]: bounded pending counts, paged pending feeds and composite index` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/notifications/admin-pending-paging/`

## 3. Requirements Delivered

`PPG-R-1`, `PPG-R-2`, `PPG-R-3`, `PPG-R-4`, `PPG-R-5`, `PPG-R-6`, `PPG-R-7`, `PPG-R-8`, `PPG-R-9`, `BELL-R-1`, `BELL-R-3`, `PAGE-R-1`, `PAGE-R-2`, `PAGE-R-5`, `PPG-NFR-1`, `PPG-NFR-2`, `PPG-NFR-3`, `PPG-NFR-4`, `PPG-NFR-5`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `Summary`:

All six tasks PASS (2026-10-07). Nothing committed — awaiting the user's go-ahead.

| Task | Result | Attempts | Verification (scoped) |
|---|---|---|---|
| PPG-T-1 Index migration | PASS | 1 | `migration:check` = 1 pending (expected pre-apply); `migration:generate --dr` shows the identical index → no entity drift; lint clean |
| PPG-T-2 Received paging + counts | PASS | 1 | server Jest 294/294; lint clean |
| PPG-T-3 Notifications paging + `attention-counts` | PASS | 1 | server Jest 197/197; lint clean |
| PPG-T-4 Bell bounded | PASS | 2 (docs FAIL) | client Jest 1197/1197; `ng lint` clean |
| PPG-T-5 Inbox paged pending | PASS | 2 (§9 later-page FAIL) | client Jest 1246/1246; `ng lint`; `tsc` clean |
| PPG-T-6 Tab totals + notice | PASS | 1 | client Jest 923/923; `ng lint`; `ng build --configuration development` clean |

**Budget check (design §12):** 6 tasks as planned; review rounds 1–2 per task as forecast. LOC above the ~550 production estimate is mostly tests; no tripwire raised.

**Open HITL (user, at rollout — tasks.md §6):**
1. After Jenkins applies PR 1: `npm run migration:check` → 0 pending; `EXPLAIN` on prdb for an admin → `key = IDX_notifications_target_read_created`, no filesort.
2. Optional parity check: `attention-counts.unreadUpdates` == legacy `scope=pending` `notificationsPending.length` for the same user.
3. After PR 2: admin Network timings (≤50 pending rows per response, ≤10 per bell group); ordinary user unchanged. Read-only browser check — no write clicks (shared prdb).

**Recorded follow-ups (advisories / spec gaps — no tasks minted):**
- T-2: page can stall (`hasMore:true, nextCursor:null`) if all ids vanish between queries; heavy fetch lacks `request_status_id: 1` filter.
- T-3: JSDoc on `getAllNotifications` still says "pending is never limited"; shared untyped `cursor` for pending/history.
- T-4: server-only rollback leaves the bell badge at 0 (design §11 gap; user did not decide → follow-up); `bellUnseenRequests` dead code; L69 doc wording on `limit`.
- T-5: date-grouped placement vs "end of pending block" (spec gap, user did not decide → follow-up b); `markAllBellRead` should bump `pendingGen.updates`; `loadingMorePending` not reset on reload.
- T-6: duplicated filter hints; pin test fixtures with absolute values.
- Kaizen candidate: "`migration:check` sees no drift" wording in tasks.md/design.md/server `CLAUDE.md` — the check has no drift detection.
- CodeGraph re-index pending (`codegraph sync`) after commit.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 3 Reviewer FAIL mentions, 0 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- | PPG-T-1 Index migration | PASS | 1 | `migration:check` = 1 pending (expected pre-apply); `migration:generate --dr` shows the identical index → no entity drift; lint clean |
- | PPG-T-5 Inbox paged pending | PASS | 2 (§9 later-page FAIL) | client Jest 1246/1246; `ng lint`; `tsc` clean |
- Open HITL (user, at rollout — tasks.md §6):**
- 1. After Jenkins applies PR 1: `npm run migration:check` → 0 pending; `EXPLAIN` on prdb for an admin → `key = IDX_notifications_target_read_created`, no filesort.
- 2. Optional parity check: `attention-counts.unreadUpdates` == legacy `scope=pending` `notificationsPending.length` for the same user.
- 3. After PR 2: admin Network timings (≤50 pending rows per response, ≤10 per bell group); ordinary user unchanged. Read-only browser check — no write clicks (shared prdb).
- Recorded follow-ups (advisories / spec gaps — no tasks minted):**
- T-3: JSDoc on `getAllNotifications` still says "pending is never limited"; shared untyped `cursor` for pending/history.
- T-4: server-only rollback leaves the bell badge at 0 (design §11 gap; user did not decide → follow-up); `bellUnseenRequests` dead code; L69 doc wording on `limit`.
- T-5: date-grouped placement vs "end of pending block" (spec gap, user did not decide → follow-up b); `markAllBellRead` should bump `pendingGen.updates`; `loadingMorePending` not reset on reload.
- CodeGraph re-index pending (`codegraph sync`) after commit.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/notifications--admin-pending-paging.md` (no lessons distilled in batch mode).
