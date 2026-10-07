# Tasks — User password hash leaks in API responses

## 1. Scope

| Field | Value |
|---|---|
| Spec | `bugfix/user-password-in-responses` · **Lite** · Bug Mode |
| Linked | `requirements.md` · `design.md` (same folder) · `docs/prd.md` `AC-4`/`AC-9` · `docs/trd/trd.md` §8 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Status | complete: PWD-T-1 `[x]` (Reviewer PASS + HITL D6 confirmed 2026-10-06). See `execution.md` |
| Budget | 1 task · ~60 LOC · 1 review round (`design.md` §14) |

## 2. Pre-flight

- [x] `requirements.md` approved (2026-10-06)
- [x] `design.md` approved (2026-10-06)
- [x] No blocking open questions. PWD-OQ-1 is operational and doesn't block
- [x] No conflicting in-flight spec on `User`. The uncommitted `primary-program-request.service*` and `bilateral-center.service*` changes in the worktree belong to other work; don't touch or stage them
- [x] `npm run migration:check` stays clean (run inside T-1, PWD-P-5). Pending: 0. It counts pending files only, not entity drift; see `execution.md`

## 3. Task List

### [x] PWD-T-1: Default-deny `User.password` with a behavioral regression test

- **Type:** server + tests + docs
- **Description:** Use red-then-green order.
  1. Add a regression spec that builds TypeORM metadata offline and asserts on the generated SQL (`design.md` §10). Run it and **watch it fail**.
  2. Make the `password` column non-selectable by default in the `User` entity (PWD-DD-1). Run the spec and watch it pass.
  3. Run the raw-SQL grep audit (D3), the auth specs, and `migration:check`.
  4. Add the bilateral change-log row.
- **Implements:** PWD-R-1 (S1, S2), PWD-R-2 (S1), PWD-R-3 (S1), PWD-R-4
- **Design refs:** PWD-DD-1, PWD-DD-2 (do **not** touch the dead raw readers), §1A PWD-P-1/2/4/5, §10
- **Files (expected):**
  - `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.ts` (one column option)
  - `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.spec.ts` (new)
  - `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (one row appended to `## Change log (maintainers)`, dated `2026-10`)
- **Depends on:** — · **Blocks:** —
- **Estimate:** S · **Review:** `full` (auth entity + bilateral payload contract) · **Effort:** `xhigh` (security)
- **Skills:** `nestjs-expert`, `tdd`
- **Spec construction (binding):**
  - Use a `mysql` `DataSource` with a dummy `database` name and the same four entity globs as `src/shared/test/orm-connection.module.ts` (`api`, `auth`, `clarisa`, `toc`, using `__dirname`-relative paths from the spec).
  - Call `buildMetadatas()` only. It's protected, so cast. **Never** call `initialize()` or open a DB connection.
  - Assertion (a): `Result` query builder + `setFindOptions` with the relations `obj_created` and `obj_external_submitter`. The `getQuery()` output must not match `/password/i`.
  - Assertion (b): plain `User` query builder `getQuery()`, no `password`.
  - Assertion (c): `User` query builder with `addSelect('<alias>.password')`. The SQL **must** contain `password`.
  - Give the test a generous timeout (about 120 s). The first metadata build took about 19 s.
- **Coverage map (scenario/clause → assertion):**

| Clause | Owned by |
|---|---|
| R-1.S1: bilateral `obj_created` / `obj_external_submitter` loaded, other fields unchanged, BUT no `password` | assertion (a) + manual GET (HITL) |
| R-1.S1 AND IT MUST: same for `GET /results` (same relation set) | assertion (a). Both endpoints use `buildResultRelations()`; the Implementer quotes both call sites in the report |
| R-1.S2: any User load, BUT must not depend on each reader omitting it | assertion (b) (the default, with no reader-side code) |
| R-2.S1 AND IT MUST: explicit opt-in is the only way in | assertion (c) + grep audit (no other `select`/raw path) |
| R-3.S1: auth specs pass unchanged | scoped auth run |
| R-3.S1 BUT: a save must not null the hash | **Gap, accepted risk D5** (PWD-P-6). Not tested. Reported as such, not claimed |
| R-4: change-log row | doc diff |

- **Verification:**
  - **Falsifier:** remove the column option and assertions (a) and (b) must fail. Break the opt-in (assert without `addSelect`) and (c) must fail. If a spec still passes with the option removed, it isn't evidence.
  - **Red run:** `npx jest src/auth/modules/user/entities/user.entity.spec.ts --maxWorkers=2 --no-coverage` must **fail on (a)/(b)** before the entity edit and pass after. Paste both outputs.
  - **Auth regression:** `npx jest --testPathPattern="src/auth/(auth\.service|auth\.controller|modules/user/user\.service)\.spec\.ts|auth-microservice\.service\.spec\.ts" --maxWorkers=2 --no-coverage --silent` must be green and unchanged.
  - **Raw-SQL audit (D3):** grep `src` (excluding specs and migrations) for `password` inside raw SQL strings, and for `u.*` / `users.*`. The only expected hits are `user.repository.ts` `AllUsersByEmail` and `getUserByEmail`, both with 0 callers. Any new hit stops the task and gets escalated.
  - **Migration:** `npm run migration:check` reports no pending schema change. If it generates a diff for `users`, that disqualifies the task: stop, don't commit the migration, escalate (PWD-P-5 refuted).
  - **Lint:** `npx eslint <touched .ts files> --quiet`
  - **Disqualifier:** if the red run passes before the fix, the spec isn't reproducing the bug. Rewrite it; don't proceed. If assertion (c) can't be made to pass, the opt-in premise PWD-P-2 is refuted and the design returns to option B.
  - **Consumers:** every TypeORM reader of `User` (bilateral, results-toc-results, share-result-request, primary-program-request, user-notification-settings, admin panel, auth). The reversion challenge found none that read `password`.
  - **Manual (HITL, D6):** with the local stack running the change, call `GET /api/bilateral/11475` with an API key (read-only) and search the body for `"password"`. It should find 0 occurrences. The user runs this or approves it; the agent doesn't hit production.
- **Definition of done:**
  - [x] Red output captured before the fix, green after
  - [x] Auth specs green, raw-SQL audit recorded, `migration:check` clean, lint clean
  - [x] Change-log row added
  - [x] No secret or hash printed in test output or report (`.cursorrules`). The spec asserts on SQL text only
  - [x] Only the three expected files changed. Unrelated worktree changes left unstaged
  - [x] Commit only with explicit user go-ahead (given 2026-10-06): `🔧 fix(user.entity) [SPEC:bugfix/user-password-in-responses]: stop selecting user password hash by default` (no apostrophes)

## 4. Dependency Graph

```
PWD-T-1 (single task)
```

## 5. Test Plan

| Test | Covers | Location |
|---|---|---|
| PWD-TEST-1 offline SQL regression (a/b/c) | R-1.S1, R-1.S2, R-2.S1 | `src/auth/modules/user/entities/user.entity.spec.ts` |
| PWD-TEST-2 existing auth specs | R-3.S1 | `src/auth/**`, `auth-microservice.service.spec.ts` |
| PWD-TEST-3 manual local GET | R-1.S1, D6 | HITL |

## 6. Rollout

- Deploy through the normal staging cadence. After deploy, an authorized person confirms production (PWD-OQ-1) and the security owner decides on rotation (proposal R2).
- Notify bilateral consumers through the change-log row.

## 7. Follow-ups

- F1: delete or sanitize the dead raw readers in `user.repository.ts` (PWD-DD-2).

## 8. Rollback

Revert the single commit. No migration or data to undo.
