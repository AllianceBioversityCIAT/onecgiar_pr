# Archive Summary — Admin User Login Report

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/admin-user-login-report/` |
| Archive date | 2026-09-23 |
| Final status | done (6/6 tasks `[x]`) |
| Prefix / depth / mode | `ULR` / Standard / gated |
| Delivery commit | `844ecb20b` on `qa-development-2026-ss`, pushed to `performance-refactor` in merge `921e36b93` |

## Outcome

Admins can download every active user's `last_login` and `days_since_last_login` as an `.xlsx` from User Management. The data comes from a new JWT-verified, Application-`ADMIN`-only endpoint under `/api/*`, not from the unauthenticated `/auth/*` routes.

## Requirements delivered

| Area | Delivered |
|---|---|
| Endpoint `GET /api/results/admin-panel/report/users/last-login` | `ULR-R-1..6`, `ULR-R-12`, `ULR-R-14` (`ULR-T-1`, `ULR-T-2`) |
| Client API method + row interface | `ULR-R-7`, `ULR-R-8` (`ULR-T-3`) |
| Download button, mapper, single-flight, error alert | `ULR-R-7..11`, `ULR-R-13` (`ULR-T-4`) |
| Manual DB and live/browser checks | `ULR-AC-1..11` end to end (`ULR-T-5`, `ULR-T-6`) |

## Files changed

Server (`onecgiar-pr-server/src/api/results/admin-panel/`): `admin-panel.repository.ts`, `admin-panel.service.ts`, `admin-panel.controller.ts`, `admin-panel.module.ts`, new `admin-panel.user-last-login.spec.ts`.

Client: `pages/admin-section/pages/user-management/user-management.component.{ts,html,spec.ts}`, `shared/services/api/results-api.service.{ts,spec.ts}`, `shared/interfaces/user.interface.ts`.

No migration, no `/auth/*` change, no shared export service change.

## Test evidence summary

| Task | Evidence |
|---|---|
| `ULR-T-1` | red then green; 10 tests; lint clean; Reviewer PASS (full) |
| `ULR-T-2` | red then green; 64 + 34 tests in scoped runs; lint clean; Reviewer PASS (full) |
| `ULR-T-3` | red then green; 306 tests in the api spec file; lint clean; Reviewer PASS |
| `ULR-T-4` | red then green; 75 tests in the whole component spec; lint clean; Reviewer PASS |
| After merging `origin/performance-refactor` | scoped rerun: 19 server, 381 client, all passing |

Every task passed review on attempt 1. No `test-report.md` was written; per-task evidence lives in `execution.md`.

## Validation summary

No `validation-report.md` exists. `ULR-T-5` (SQL against real data) and `ULR-T-6` (401/403/forged token, downloaded file, layout) were confirmed as done by the user at archive time. The user gave no per-item observations, and none are recorded.

## Accepted warnings and follow-ups

- No `test-report.md` or `validation-report.md` (absence not separately accepted by the user; the per-task audit trail is in `execution.md`).
- The written `.xlsx` cell emptiness was only unit-tested up to the mapper (exceljs does not load under this Jest config).
- Follow-ups for the team, outside this spec: (1) `/auth/*` user endpoints without a guard or JWT middleware (needs a live confirmation); (2) `GET /api/results/admin-panel/report/users` has no role check; (3) `ValidRoleGuard` does not verify signatures and `$_isValidRole` ignores `active` in its `OR` branch.
- Advisories recorded in `execution.md` (never tasks): the button re-enables before `exportExcel` finishes, `(keydown.enter)` bypasses the button's `blocked` gate, no fixture row with `days_since_last_login: 0`, the redundant second `RoleByUserRepository` provider.

## Historical notes

- The spec deviated from its proposal: the proposal recommended extending `/auth/search`; reading the auth wiring showed that would expose login activity without a verified token, so the endpoint was moved under `/api/*` (`ULR-DD-1`).
- Inactive users are excluded (user decision `ULR-OQ-4`), the one deliberate difference from the reference CSV.
