# Merge validation state — `bilateral-primary-sp-request` → `performance-refactor`

> Progress checkpoint, so the run survives a closed terminal. Update each row as it completes,
> and skip any row already marked ✅ when resuming.
> Plan (user, 2026-09-30): commit → merge `origin/performance-refactor` into `qa-development-2026-ss`
> → run ONLY the specs of files this spec touched → if all green, push
> `qa-development-2026-ss` → `performance-refactor`.

## Steps

| # | Step | Status | Evidence |
|---|---|---|---|
| 1 | Commit: old migrations `down` fix | ✅ | b4cf28910 |
| 2 | Commit: server (T-1..T-7 + follow-ups) | ✅ | b0cee19ce |
| 3 | Commit: client (T-8..T-10) | ✅ | 4ac6497d9 |
| 4 | Commit: spec docs | ✅ | 5c6b99fdf |
| 5 | `git fetch` + merge `origin/performance-refactor` (20 commits behind at start) | ✅ | ec79a7d14 — 2 conflicts resolved keeping both sides (notification-type.constants, notification-item spec); Juan David 7eaa64b64 AI-job fix verified intact |
| 6 | Server specs (touched files) | ✅ | S1 159/159 · S2 850/850 · S3 288/288 · S4 72/72 |
| 7 | Server `tsc --noEmit` | ✅ | 0 errors |
| 8 | Client specs (touched files) | ✅ | C1 314/314 · C2 172/172 |
| 9 | Client `ng build --configuration development` (template type-check) | ✅ | bundle complete, 0 errors |
| 10 | Push `qa-development-2026-ss` → `origin/performance-refactor` | ✅ | pushed after all groups green (this commit is the pushed HEAD) |

## Test groups (step 6 / 8): run each separately, record the result

| Group | Command (from the package dir) | Status | Result |
|---|---|---|---|
| S1 | `npx jest --testPathPattern="primary-program-request\|RoleByUser\|share-result-request" --silent --reporters=summary --forceExit` | ✅ | 6 suites, 159/159 |
| S2 | `npx jest --testPathPattern="bilateral-center\|bilateral-ai.service\|bilateral.service" --silent --reporters=summary --forceExit` | ✅ | 21 suites, 850/850 |
| S3 | `npx jest --testPathPattern="api/results/result.spec\|results.service\|versioning.service" --silent --reporters=summary --forceExit` | ✅ | 9 suites, 288/288 |
| S4 | `npx jest --testPathPattern="notification.service" --silent --reporters=summary --forceExit` | ✅ | 2 suites, 72/72 |
| C1 | `npx jest --testPathPattern="notification-item\|notification-type\|build-unified-list\|contribution-request-drawer" --silent --reporters=summary --no-coverage` | ✅ | 7 suites, 314/314 (post-merge ec79a7d14) |
| C2 | `npx jest --testPathPattern="section-zero-dashboard\|bilateral-api\|section-toc" --silent --reporters=summary --no-coverage` | ✅ | 4 suites, 172/172 |

## Notes
- The DB migration `1790400000000-AddPrimaryProgramRequest` is already applied on the testing DB `prdb` (T-1).
- The rest of T-11 (manual HITL / staging) is pending with the other tester after the push.
