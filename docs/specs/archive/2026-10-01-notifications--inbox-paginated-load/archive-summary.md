# Archive Summary — Notifications Inbox: Paginated Load & Pending-First

> **Outcome:** 6 of 7 tasks delivered and reviewed (PASS); merged and pushed to `performance-refactor` (`69742812e`). The inbox now loads only the selected phase, shows pending rows first, and pages history 200 rows per source with "Load more". PAGE-T-7 (manual measurement and visual check) is carried as an accepted follow-up.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/inbox-paginated-load` · Standard · gated |
| Owner | Santiago Sanchez |
| Branch | `spec/inbox-paginated-load` (worktree `D:\PRMS\onecgiar_pr-paging`), pushed to `performance-refactor` |
| Archived by | `/akili-archive`, on user request ("archivemos este spec ya que funciona mejor") |

## 2. Original Spec Path

`docs/specs/notifications/inbox-paginated-load/`

## 3. Archive Date

2026-10-01

## 4. Final Status

| Item | Status |
|---|---|
| PAGE-T-1..T-6 | `[x]` — Reviewer PASS |
| PAGE-T-7 (HITL measurement + visual) | **Not done — accepted as follow-up** (user confirmed it "works better" in local use) |
| `test-report.md` | Absent — accepted (`/akili-test` not run; per-task Jest evidence in `execution.md`) |
| `validation-report.md` | Absent — accepted (`/akili-validate` not run) |

## 5. Requirements Delivered

| Requirement | Delivered by | Note |
|---|---|---|
| PAGE-R-1 phase scoping (incl. phase-less updates) | T-2, T-3, T-5 | |
| PAGE-R-2 pending complete and first | T-2, T-3, T-4, T-6 | Narrow edge accepted (see §9) |
| PAGE-R-3 keyset pages of 200, tie-safe | T-1, T-2, T-3 | PAGE-P-8 verified |
| PAGE-R-4 Load more (append, busy, retry) | T-4, T-6 | |
| PAGE-R-5 phase change resets paging | T-4 | |
| PAGE-R-6 backwards-compatible responses | T-2, T-3 | `doneMeta` / `viewedMeta` additive |
| PAGE-R-7 concurrent updates queries | T-3 | |
| PAGE-R-10 filter hint · PAGE-R-11 memoized list | T-6 | |
| NFR performance (measured speed-up) | — | **Not measured** (T-7) |

## 6. Files Changed Summary

| Area | Files | Commit |
|---|---|---|
| Server util | `src/shared/utils/keyset-cursor.util.ts` (+spec) — new | `5f97542a4` |
| Server requests | `share-result-request.controller.ts`, `.service.ts` (+specs, controller spec new) | `5f97542a4` |
| Server updates | `notification.controller.ts`, `.service.ts` (+specs) | `5f97542a4` |
| Client API + state | `results-api.service.ts`, `results-notifications.service.ts` (+specs) | `4a3ba70ca` |
| Client callers | `app.component.ts`, `header-panel.component.ts`, `websocket.service.ts` (spec new), `share-request-modal.component.ts` | `48a0bf87e` |
| Client view | `results-notifications.component.{ts,html,spec.ts}`, `.module.ts`, `contribution-request-drawer.copy.ts` | `48a0bf87e` |
| Merge | `origin/performance-refactor` (w1w2-center-tagged), no conflicts | `69742812e` |

Size: about 3 800 inserted lines (mostly tests), against a ~900 budget and a ~1 200 tripwire.

## 7. Test Evidence Summary

| Gate | Result |
|---|---|
| Server scoped Jest, post-merge | 12 suites · 288 passed |
| Client scoped Jest, post-merge | 26 suites · 926 passed |
| Server `tsc --noEmit` · eslint | clean · clean |
| Client `ng lint` | clean |
| Client `ng build` | **not run** locally (memory); left to Jenkins |
| Red checks | T-3 concurrency falsifier proven failing with an `await` on element 2 |

## 8. Validation Summary

No `/akili-validate` run. Every task passed an independent Reviewer audit against `requirements.md` / `design.md`. Rework: T-3 ×1 (weak concurrency falsifier), T-4 ×1 (stale API spec, per-source races, deleted spec cases). No HALT, pivot or FATAL_FAIL.

## 9. Accepted Warnings Or Follow-Ups

- [ ] **PAGE-T-7** — before/after timing (baseline on `e82c53722`), admin Load-more walk, visual and a11y check (button placement, focus, dark mode, possible double announcement of "Loading history…").
- [ ] **Interceptor logs cursor** — `src/shared/Interceptors/Return-data.interceptor.ts:33-43` logs `request.url`, so cursor values reach logs (date + id, not a secret). Contradicts design §7. Out of scope; candidate proposal.
- [ ] **PAGE-R-2 edge** — a socket-driven `refreshSource(X)` during the first `loadInbox` can let pending rows of X land after rows are shown (execution.md, T-4 advisory). Accepted next to PAGE-DD-6.
- [ ] Minor: `version_id` has no safe-integer cap; superseded `refreshSource` callbacks never fire (no current caller passes one).
- [ ] Housekeeping: stale untracked copies of this spec folder and of `keyset-cursor.util*.ts` remain in `D:\PRMS\onecgiar_pr`; delete before pulling.

## 10. Historical Notes

- The spec ran in its own git worktree because the `w1w2-center-tagged` session was editing `notification.service.ts` in the shared checkout at the same time. Merge order resolved by the Leader as "paging on committed code"; the later merge was conflict-free.
- Post-merge validation was first killed by Claude Code for low memory, and re-run on the user's request with `--maxWorkers=2` before the push.
- The default merge-commit subject (with single quotes) was reworded before the push, to keep the Jenkins job from breaking.
