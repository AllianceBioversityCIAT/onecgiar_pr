# Merge validation state — `bilateral-primary-sp-request` → `performance-refactor`

> Progress checkpoint, so the run survives a closed terminal. Update each row as it completes,
> and skip any row already marked ✅ when resuming.
> Plan (user, 2026-09-30): commit → merge `origin/performance-refactor` into `qa-development-2026-ss`
> → run ONLY the specs of files this spec touched → if all green, push
> `qa-development-2026-ss` → `performance-refactor`.

## Steps

| # | Step | Status | Evidence |
|---|---|---|---|
| 1 | Commit: old migrations `down` fix | ⏳ | |
| 2 | Commit: server (T-1..T-7 + follow-ups) | ⏳ | |
| 3 | Commit: client (T-8..T-10) | ⏳ | |
| 4 | Commit: spec docs | ⏳ | |
| 5 | `git fetch` + merge `origin/performance-refactor` (20 commits behind at start) | ⏳ | |
| 6 | Server specs (touched files) | ⏳ | |
| 7 | Server `tsc --noEmit` | ⏳ | |
| 8 | Client specs (touched files) | ⏳ | |
| 9 | Client `ng build --configuration development` (template type-check) | ⏳ | |
| 10 | Push `qa-development-2026-ss` → `origin/performance-refactor` | ⏳ | |

## Test groups (step 6 / 8): run each separately, record the result

| Group | Command (from the package dir) | Status | Result |
|---|---|---|---|
| S1 | `npx jest --testPathPattern="primary-program-request\|RoleByUser\|share-result-request" --silent --reporters=summary --forceExit` | ⏳ | |
| S2 | `npx jest --testPathPattern="bilateral-center\|bilateral-ai.service\|bilateral.service" --silent --reporters=summary --forceExit` | ⏳ | |
| S3 | `npx jest --testPathPattern="api/results/result.spec\|results.service\|versioning.service" --silent --reporters=summary --forceExit` | ⏳ | |
| S4 | `npx jest --testPathPattern="notification.service" --silent --reporters=summary --forceExit` | ⏳ | |
| C1 | `npx jest --testPathPattern="notification-item\|notification-type\|build-unified-list\|contribution-request-drawer" --silent --reporters=summary --no-coverage` | ⏳ | |
| C2 | `npx jest --testPathPattern="section-zero-dashboard\|bilateral-api\|section-toc" --silent --reporters=summary --no-coverage` | ⏳ | |

## Notes
- The DB migration `1790400000000-AddPrimaryProgramRequest` is already applied on the testing DB `prdb` (T-1).
- The rest of T-11 (manual HITL / staging) is pending with the other tester after the push.
