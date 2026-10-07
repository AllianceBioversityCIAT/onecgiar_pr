# Validation Report — User password hash leaks in API responses

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/user-password-in-responses` · **Lite** · Bug Mode |
| Date | 2026-10-06 |
| Validator | Claude Code session (Opus 5.5, T3). The Implementer was the `akili-implementer` wrapper (T2), so author ≠ auditor holds for the code. The validator was the Leader of the execute run; that is disclosed here, and every key claim below was re-checked against the source |
| Commit validated | `bd032a9e4` (on `qa-development-2026-ss` and `performance-refactor`) |
| Inputs | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`. There is no `test-report.md` (`/akili-test` was not run; test evidence lives in `execution.md`) |

## 2. Summary

**Verdict: PASS, with 2 accepted WARNs. Ready to archive.**

| Result | Count |
|---|---|
| PASS | 14 |
| WARN | 2 (both are risks the spec already accepts, nothing to fix) |
| FAIL | 0 |
| BLOCKED | 0 |

The hash is now non-selectable by default at the entity mapping. A behavioral test proves it on the generated SQL, the user confirmed it on the live local payload (D6), and auth is unaffected. One premise that was still `assumed` (PWD-P-5, no migration diff) was **verified** during this validation.

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| PWD-T-1 | `[x]` | `execution.md`: attempt 1, 2 lens Reviewers PASS, D6 HITL confirmed, every DoD box checked | PASS |

## 4. File Existence

| File (from `tasks.md`) | Expected | Present in `bd032a9e4` | Result |
|---|---|---|---|
| `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.ts` | modified (1 option) | `select: false` at line 48 | PASS |
| `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.spec.ts` | new | 66 lines | PASS |
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | 1 change-log row | row `2026-10` at the top of `## Change log (maintainers)` | PASS |

No other code file is in the commit; the remaining files are spec docs.

## 5. Build Integrity

| Check | Command | Result |
|---|---|---|
| Type-check | `npx tsc --noEmit -p tsconfig.json` (server) | exit 0, no errors — PASS |
| Lint (touched files) | `npx eslint user.entity.ts user.entity.spec.ts --quiet` | clean — PASS |
| Tests (scoped) | `npx jest --runInBand --testPathPattern="user.entity.spec + auth.service + auth.controller + user.service + auth-microservice.service"` | 5 suites, 172 tests passing — PASS |
| Migrations | `npm run migration:check` | Pending 0 — PASS (see §8, PWD-P-5) |
| Environment boot | local stack used for D6 by the user | 200 response — PASS |

## 6. Requirement Coverage

| Clause | Owned by | Evidence | Result |
|---|---|---|---|
| PWD-R-1.S1 THEN: `obj_created` / `obj_external_submitter` present, other fields unchanged | T-1, D6 | User screenshot of `GET /api/bilateral/11475`: both objects carry `id`, `first_name`, `last_name`, `email`, `is_cgiar`, `last_login`, `active`, the dates and `last_pop_up_viewed` | PASS |
| PWD-R-1.S1 BUT: no `password` key | T-1 assertion (a), D6 | (a) red before the fix and green after; D6 shows no key | PASS |
| PWD-R-1.S1 AND IT MUST: same for `GET /results` | T-1 assertion (a) | Same `buildResultRelations()` call (`bilateral.service.ts:887` and `:1200`, definition `:1228`). Not exercised live, but covered by the same relation set | PASS |
| PWD-R-1.S2 THEN: column not selected on any User load | assertion (b) | Plain `User` query builder emits no `password` | PASS |
| PWD-R-1.S2 BUT: must not depend on each reader | assertion (b) | The default comes from the mapping, with no code on the reader side | PASS |
| PWD-R-2.S1 THEN: explicit opt-in selects it | assertion (c) | `addSelect('u.password')` emits the column, and the falsifier confirms it | PASS |
| PWD-R-2.S1 AND IT MUST: the only way in | grep audit | Re-run during validation: no `addSelect`/`select` of `password` anywhere. Raw SQL selects the hash only in the two dead readers (`user.repository.ts:23`, `:52`, 0 callers). The other raw user queries (`AllUsers`, `getUserById`) list columns explicitly without `password` | PASS |
| PWD-R-3.S1 THEN: auth specs green and unchanged | scoped run | 4 auth suites green; no auth spec modified in the commit | PASS |
| PWD-R-3.S1 BUT: a save must not null the hash | — | **Not tested.** Accepted risk D5 (PWD-P-6) in `requirements.md` §9 and `design.md` §13 | WARN (accepted) |
| PWD-R-4: contract change-log row | T-1 | Row present; it says the field was removed and was a leak | PASS |
| NFR Security: 0 hashes in responses | R-1 evidence | as above | PASS |
| NFR Data: no migration | PWD-P-5 | see §8 | PASS |

## 7. Linting & Code Quality

Lint is clean, and so is the security check: the test asserts on SQL text only, and no hash or secret appears in the test, the docs or the reports (`.cursorrules`).

**Advisory (4R, non-gating):** carried from `execution.md` and re-checked.

| Lens | Finding |
|---|---|
| Reliability | The vacuity guard in (a), `/JOIN \`users\`/i`, passes with a single User join, while its comment says "both". Suggestion: `expect(sql.match(/JOIN \`users\`/gi)).toHaveLength(2)` |
| Readability | The title of (c), "the only way to read password", claims more than the test proves. Suggestion: rename it to "explicit addSelect still selects password (opt-in works)" |
| Readability | The `120_000` timeouts on the three synchronous `it` blocks are unnecessary. Only `beforeAll` needs one |
| Reliability (latent) | The spec mirrors the 4 test globs, not `result-dashboard-bi/**`. A future relation into that folder would make `buildMetadatas()` throw. The failure is loud, not silent |
| Resilience | Future raw SQL bypasses `select: false` (D3). Follow-up F1 |
| Risk | Hashes already exposed stay exposed until rotated (proposal R2, PWD-OQ-1) |

## 8. Design Conformance

| Item | Check | Result |
|---|---|---|
| PWD-DD-1 (default-deny in the mapping) | One column option; name, type and nullable unchanged | PASS |
| PWD-DD-2 (leave the dead raw readers alone) | `user.repository.ts` is not in the commit | PASS |
| PWD-P-5 (no migration diff), `assumed` in the design | **Verified during validation:** TypeORM `MysqlDriver.findChangedColumns` (`node_modules/typeorm/driver/mysql/MysqlDriver.js:787`) compares type, length, width, precision, scale, zerofill, unsigned, generation, comment, default, onUpdate, primary, enum and so on, and **never `select`**. Generation cannot produce a diff from this change | PASS |
| Proposal alignment | Intent, non-goals (no rotation, no redesign) and both success criteria are met. The proposal's premise that "login reads the hash through raw SQL at `auth.service.ts:247`" was corrected in `requirements.md` §3; re-checked: line 247 passes the login DTO's `password` input to Cognito, not the column | PASS (drift documented) |
| Proposal: "also check Swagger response schemas and webhook payloads" | Not carried explicitly into requirements or execution. Checked during validation: no Swagger response schema documents a user `password` (only the login and challenge DTO inputs). No webhook code outside the auth/config files reads it, and any TypeORM-loaded `User` in a payload is covered by the default | PASS |
| Cross-document figures | Budget ~60 LOC; actual ~68 lines of code and docs (66-line spec, +1 entity line, +1 doc row). Within the Lite estimate. Test counts are consistent: 169 across the 4 auth suites, 172 with the new spec's 3 | PASS |
| Accepted risks | D3 (future raw SQL) and D5 (save) are recorded in requirements, design, tasks and execution | WARN (accepted) — counted once, under R-3 BUT |

## 9. Test Evidence Summary

| Test | Covers | Result |
|---|---|---|
| PWD-TEST-1: `user.entity.spec.ts` (a), (b), (c) | R-1.S1, R-1.S2, R-2.S1 | red before (a, b), green after; falsifier proven for (c) |
| PWD-TEST-2: auth specs (4 suites) | R-3.S1 | 169 passing |
| PWD-TEST-3: manual D6 GET | R-1.S1, D6 | confirmed by the user, 2026-10-06 |

`test-report.md` is absent. For a Lite bugfix, the evidence above in `execution.md` is the record.

## 10. Agent Guide / Constitution Impact

No `## Constitution Impact` block exists, and none is needed: no module was created or reshaped and no public API surface changed (one leaked field was removed from serialized output). No guide drift.

## 11. Remediation

| # | Item | Severity | Action |
|---|---|---|---|
| — | No FAIL to remediate | — | — |
| W1 | D5: saving a loaded `User` could overwrite the hash | Low (login does not use local hashes) | Accepted risk. No action |
| W2 | D3: future raw SQL can select the hash | Low | Accepted risk. Follow-up **F1** (delete or sanitize the dead raw readers) |
| Ops | Exposed hashes; production confirmation | Out of code | PWD-OQ-1 / R2 for an authorized person or security owner |

## 12. Archive Readiness Recommendation

**Ready to archive.** The task is `[x]`, there are 0 FAILs, both WARNs are risks the spec accepted, the key scenarios have automated and manual evidence, and the one assumed premise is now verified.

```text
/akili-archive bugfix/user-password-in-responses
```
