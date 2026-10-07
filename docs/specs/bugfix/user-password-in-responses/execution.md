# Execution Log — User password hash leaks in API responses

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/user-password-in-responses` · **Lite** · Bug Mode |
| Approval Mode | `gated` |
| Branch | `qa-development-2026-ss` |
| Leader | Claude Code session (Opus 5.5, T1) |
| Implementer | `akili-implementer` wrapper (T2) |
| Reviewer | `akili-reviewer` wrapper (T3). Run as 2 parallel lens reviewers because the task is security-tagged with effort `xhigh` |
| Budget (`design.md` §14) | 1 task · ~60 LOC · 1 review round |
| Started | 2026-10-06 |

## Task Execution History

### PWD-T-1: Default-deny `User.password` with a behavioral regression test

| Field | Value |
|---|---|
| Final status | **PASS, pending HITL D6.** The Reviewer gate passed. The task stays `[~]` until the manual local GET (D6) is run or waived by the user |
| Date | 2026-10-06 |
| Attempts | 1 |
| Skills | `nestjs-expert`, `tdd` (as listed in the task, no deviation) |
| Effort | `xhigh` (security) |
| Requirements covered | PWD-R-1 (S1, S2), PWD-R-2 (S1), PWD-R-3 (S1, except the BUT clause, see D5), PWD-R-4 |

#### Attempt 1

**Files changed (only the 3 expected):**
- `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.ts`: `select: false` added to the `password` column (+1 line)
- `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.spec.ts`: new. Offline `mysql` DataSource with a dummy database and the 4 entity globs from `orm-connection.module.ts`, `buildMetadatas()` only through a cast, never `initialize()`. Assertions (a), (b) and (c), plus a `JOIN \`users\`` vacuity guard in (a)
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: change-log row `2026-10` at the top of `## Change log (maintainers)`

The unrelated worktree changes (`bilateral-center.service*`, `primary-program-request.service*`, docs/specs moves) were not touched.

**Verification (Implementer):**

| Check | Command | Result |
|---|---|---|
| Red, before the fix | `npx jest src/auth/modules/user/entities/user.entity.spec.ts --maxWorkers=2 --no-coverage` | `2 failed, 1 passed`. (a) failed with the JOIN guard passing, so it failed on `password`. (b) failed with `` `u`.`password` AS `u_password` `` in the SQL. (c) passed |
| Green, after the fix | same | `3 passed, 3 total` (~16 s) |
| Falsifier for (c) | `.addSelect('u.password')` removed temporarily | (c) failed, (a) and (b) passed. The line was restored |
| Falsifier for (a)/(b) | the red run, before the column option existed | (a) and (b) failed |
| Auth regression (PWD-R-3) | `npx jest --testPathPattern="src/auth/(auth\.service\|auth\.controller\|modules/user/user\.service)\.spec\.ts\|auth-microservice\.service\.spec\.ts" --maxWorkers=2 --no-coverage --silent` | 4 suites, 169 passed, 0 failed |
| Raw-SQL audit (D3) | grep `src` (no specs, no migrations) for `password` in raw SQL, and for `u.*` / `users.*` / `usr.*` | Only `auth/modules/user/repositories/user.repository.ts:23` `AllUsersByEmail` (`cdu.password`) and `:52` `getUserByEmail` (`u.password`). Both have **0 callers** (only their definitions at :17 and :44). 0 hits for `u.*` / `users.*` / `usr.*`. The Reviewer re-ran it and found the same. Nothing new, so nothing was escalated. The dead readers were left untouched (PWD-DD-2) |
| Migration | `npm run migration:check` | `Total migrations: 488  Executed: 498  Pending: 0 — No pending migrations found` |
| Lint | `npx eslint user.entity.ts user.entity.spec.ts --quiet` | clean |

**Coverage map R-1.S1, "same for `GET /results`":** both endpoints use `buildResultRelations()` (`onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:1228`, which contains `obj_created: true` and `obj_external_submitter: true`):
- `GET /api/bilateral/:id`: `findOne()`, call at `bilateral.service.ts:887`
- `GET /api/bilateral/results`: `getResultsForSync()`, call at `bilateral.service.ts:1200`
- Other users of the same set are covered by the entity default: :400, :679, :918 (`findAll`), :1104 (`listAllResults`)

**Not Done / Assumptions (carried verbatim from the Implementer, then adjudicated by the Leader):**
- *"`migration:check` is `scripts/check-pending-migrations.ts`, which compares migration files against the migrations table on whatever DB the env points to (it connected). It does not diff entities against the schema, so it does not prove 'no `users` diff' for PWD-P-5. I did not run `migration:generate` or any other drift check. This is not a refutation of PWD-P-5: `select: false` changes only the read mapping, not the DDL."*
  → **Leader:** the verification command the task names ran clean, as written. PWD-P-5 stays `assumed`, now with a reasoned basis: TypeORM's `select` is a column read option and is not part of the DDL comparison. This is not scope still owed. It is a premise-strength note, and it was surfaced to the user.
- *"The manual HITL GET (`/api/bilateral/11475`, search the body for `"password"`) was not run, per instructions."*
  → **Leader:** owed. D6 is the user's HITL step (`tasks.md` Verification, Manual). The task stays `[~]` until the user runs it or waives it.
- *"Full-suite coverage thresholds were not run (scoped runs only, per the machine rules)."* → **Leader:** out of scope by machine rule. Not owed.
- *"The change-log row is long-form in the style of existing rows. … It carries no commit hash or ticket."* → **Leader:** matches the format of existing rows. Not owed.

**Accepted risk, explicit:** R-3.S1 BUT ("a save must not null the hash") is **not tested**. It is accepted risk D5 (PWD-P-6) and is not claimed as covered.

**Reviewer verdicts (parallel lens mode):**

| Lens | Verdict | Summary |
|---|---|---|
| Spec conformance + Risk / Resilience | **PASS** | The diff does what PWD-T-1 asks. `select: false` blocks the hash on every TypeORM `User` load, and name, type and nullable are unchanged. The spec follows the binding construction. Red/green and the falsifier meet D1/D2. The change-log row meets PWD-R-4 / AC-4. The Reviewer independently re-checked that nothing reads the hash (PWD-P-3) and the raw-SQL audit (PWD-P-4). Secrets: none in the test or the doc |
| Spec conformance + Reliability / Readability | **PASS** | The diff matches the binding construction and design §10. The test does not depend on the environment (no dotenv, no connection), and the globs can't pick up the spec itself. The red run proves it is not vacuous. The Reviewer asked that the call sites and the D3 audit be recorded here; both are recorded above |

**ADVISORY (4R, non-gating, recorded only, not converted to tasks):**
- RISK: R-1.S1 is proven only at the SQL level until the D6 manual GET runs. Do not close the spec before it is run or approved. Hashes that were already exposed still need rotation by an authorized person (PWD-OQ-1 / R2). The code fix does not undo past exposure.
- RELIABILITY: the vacuity guard in (a) (`/JOIN \`users\`/i`) passes with just one User join, while the comment says "both". Suggestion: `expect(sql.match(/JOIN \`users\`/gi)).toHaveLength(2)`, or reword the comment. Both Reviewers raised this.
- READABILITY: the title of (c), "the only way to read password", claims more than the test proves; the "only way" part belongs to the grep audit. Suggestion: rename it to "explicit addSelect still selects password (opt-in works)" and tighten the regex to `` /`u`\.`password`/ ``.
- READABILITY: the `120_000` timeouts on the three synchronous `it` blocks are unnecessary. Only `beforeAll` needs one.
- RELIABILITY (latent, fails loudly): the spec mirrors the 4 test globs. `orm.config.ts` also loads `result-dashboard-bi/**`. If `Result` or `User` ever gains a relation into that folder, `buildMetadatas()` throws. The failure is loud, not silent.
- RESILIENCE: future raw SQL that selects `u.*` from `users` bypasses `select: false` (D3). Keep F1 on the backlog.

**Decisions:** parallel lens review (2 reviewers) because the task is security-tagged with effort `xhigh`. The Implementer's `migration:check` note is a premise-strength disclosure, not a refutation. The advisories stay as advisories.

**Issues encountered:** none blocking.

**Budget check:** 1 task, about 75 LOC (1 entity line, a ~70-line spec, 1 doc row), 1 review round. Within budget (`design.md` §14 estimated ~60 LOC; the difference is spec comments and guards). No tripwire.

**Final verification:** automated gates green. Pending: D6 HITL GET.
