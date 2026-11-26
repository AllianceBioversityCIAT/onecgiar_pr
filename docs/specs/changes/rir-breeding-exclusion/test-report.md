# Test Report — rir-breeding-exclusion (SR-167303)

**Overall: PASS.** 328 of 328 tests pass in the module and migrations run. No product bug was found. One suite fails, and it already failed before this spec (`replicated-innovation-reminders.module.spec.ts`: the `@nestjs/jwt` import breaks at load and 0 tests run). Every MUST requirement has a unit test or a recorded manual check on prdb or PRTest.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/rir-breeding-exclusion` |
| Ticket | SR-167303 |
| Branch | `qa-development-2026-ss` |
| Date | 2026-11-26 |
| Leader | opus (T1) |
| Tester | `akili-tester` spawned on **opus**. The wrapper's model is sonnet, which is the Implementer's model, so it was overridden to keep author ≠ tester. |
| Reviewer of evidence | Leader re-ran the suite; its numbers matched the Tester's. |

## 2. Summary

| Item | Value |
|---|---|
| Suites planned | 1 (backend unit). The spec has no client, integration or E2E scope. |
| Testers spawned | 1, delegated, not run in parallel |
| New test file | `onecgiar-pr-server/src/api/replicated-innovation-reminders/rir-breeding-exclusion.tester.spec.ts` (44 tests) |
| Author TDD specs cited, not rewritten | `digest-builder.spec.ts`, `reminder-dispatcher.service.spec.ts`, `repositories/pending-innovation.repository.spec.ts`, `templates/rir-template-copy.spec.ts`, `templates/rir-breeding-exclusion-codes.spec.ts` |
| Skills | `nestjs-expert`, `tdd` |
| Mutation check | Removing `cc.delete(email)` from `digest-builder.ts` turns the test "lead not in its own CC" red. The file was restored and git shows it clean. |
| Lint | eslint `--quiet` is clean and prettier `--check` is clean on the new file. |

## 3. Backend Unit Tests

| Command (in `onecgiar-pr-server`) | Result |
|---|---|
| `npx jest src/api/replicated-innovation-reminders/rir-breeding-exclusion.tester.spec.ts --silent --forceExit` | Tests: 44 passed, 44 total |
| `npx jest src/api/replicated-innovation-reminders src/migrations --silent --reporters=summary --forceExit` (re-run by the Leader) | Test Suites: 1 failed, 13 passed, 14 total · Tests: 328 passed, 328 total |
| `npx jest …/replicated-innovation-reminders.module.spec.ts` | 1 suite failed, 0 tests. It fails at load on the `@nestjs/jwt` import and already failed before this spec. |

## 4. Frontend Unit Tests

Not applicable. The spec changes no client code.

## 5. Integration Tests (manual, on the real database and environment)

These checks were run on the HITL task. The evidence is in `execution.md` → RBX-T-8:

| Check | Evidence |
|---|---|
| Migration state on prdb | Step 0: `migration:check` showed only v4 pending |
| `1793700000000` up → down → up | Step 1: `has_breeding` = 0 → 1 → 0 in the 4 bodies |
| Routing preview `plan(36)` | Step 2: 131 pending · 5 packages · DEVELOPER 2 / MELIA 7 / CENTER 9 / unreachable 4 |
| Real dispatch (campaign 14) | Step 3: 18 sent, 0 failed, 4 unreachable. The counts are the same as in the preview. |
| Real email for package 8057 | Step 3 check: To is the lead contact and the MELIA is in CC. The link opens `ipsr/detail/8057/…?phase=37`. The copy has no breeding text. |

## 6. E2E Tests

Not applicable. The change has no UI. The PRTest email and link check above stands in for an E2E run.

## 7. Coverage & Traceability

| Requirement | Scenario | Test type | Test (file::name) | Result | Covered by | Gap |
|---|---|---|---|---|---|---|
| R-1 | Listed results disappear | unit (SQL shape) + DB | repository.spec "exclusion list" (4) · tester "exclusion sub-select has exactly two predicates" | PASS | author, tester, prdb | Real rows are checked only on prdb |
| R-1 | BUT must NOT drop unlisted | unit | tester "mapper keeps every unlisted row" · "every pending result lands in exactly one message or unreachable" | PASS | tester | — |
| R-1 | Not in unreachable list or pending total | unit (structural) | tester exclusion sub-select inside the single selection | PASS | tester, prdb | — |
| R-1 | Follows `result_code` across phases | unit (SQL shape) | repository.spec "keys the exclusion on result_code" | PASS | author, tester | Real data only on prdb |
| R-1 | Inactive entry does not exclude | unit (SQL shape) | repository.spec "only active entries exclude" | PASS | author | — |
| R-1 | Seed: 114 codes, reason SR-167303 | unit | codes.spec (6) · tester "seeds 24791 and 28580 active" | PASS | author, tester, prdb | — |
| R-1 | Seed idempotent (114, not 228) | unit (fake QueryRunner) | tester "up, up, down, up" · "re-running up never re-activates an entry an admin switched off" | PASS | tester, prdb | — |
| R-2 | P1 in; P2, P3 and P4 out | unit (SQL shape) | repository.spec "branch B: innovation packages" (6) | PASS | author, prdb | Row-level selection only on prdb |
| R-2 | MUST NOT take type 10 from Reporting or types 2/7 from IPSR | unit | tester "branch A never admits type 10; branch B only type 10 from IPSR" | PASS | tester | — |
| R-2 | No IPSR phase for the year | — | — | GAP | — | See §9 |
| R-3 | Package link and "Innovation package" label | unit | dispatcher.spec buildResultUrl and mixed row · tester Center email links | PASS | author, tester, PRTest | — |
| R-3 | BUT Innovation Use / development keeps result-detail | unit | dispatcher.spec mixed row · tester "an Innovation development row never gets the ipsr path" | PASS | author, tester | — |
| R-3 | Unknown base URL → result-detail form | unit | dispatcher.spec · tester (2 cases plus a render) | PASS | author, tester | — |
| R-4 | Rendered years | unit | template-copy.spec "(b) v3 render" · dispatcher.spec year vars · tester v4 tails | PASS | author, tester | — |
| R-4 | Linked Result ID, redirect notice and disclaimer survive | unit | tester "redirect notice, kind label, disclaimer and linked Result ID survive in v4" (×4) | PASS | author (v3), tester (v4) | — |
| R-5 | Up, down, up (114 rows and v3 after up; v2 byte for byte after down) | unit (fake QueryRunner) + DB | tester "up, up, down, up" · "down rewrites before dropping" · "binds every code as parameters" | PASS | author, tester, prdb | — |
| R-6 | Counts agree (one selection path) | unit (structural) + manual | tester "dry run and real dispatch read through plan()" · service.spec admin GET → `plan()` | PASS | author, tester, PRTest | The totals themselves are compared only manually |
| R-7 | Lead contact as To, MELIA in CC, greeting | unit | digest-builder.spec "innovation packages (type 10)" · tester "greeted colleague when no name" | PASS | author, tester, PRTest | — |
| R-7 | BUT lead also develops a type-7 → one email | unit | tester "ONE email with both rows, CC = MELIA of both SPs, lead not in own CC" (mutation-checked) | PASS | author, tester | — |
| R-7 | Never two emails; never listed twice | unit | tester "same lead, case differs → one email" · "not also in the MELIA summary" | PASS | tester | — |
| R-7 | No lead contact → MELIA summary, or NO_MELIA | unit | digest-builder.spec fallbacks · tester NO_MELIA | PASS | author, tester | — |
| R-7 | Opted-in Center wins | unit | digest-builder.spec · tester "lead gets no email at all" | PASS | author, tester | — |
| R-7 / R-2 | W3 package goes to its Center | unit | tester "a W3 package goes to its Center" | PASS | tester | — |
| R-8 | No breeding, varieties or B4T text | unit | template-copy.spec · tester neutral-SP render (×4) | PASS | author, tester, PRTest | — |
| R-8 | v4 = v3 minus exactly one paragraph | unit | template-copy.spec · tester "ONE contiguous cut" · "v3 stays frozen" | PASS | author, tester | — |
| R-8 | Closing dates intact | unit | template-copy.spec · tester tails | PASS | author, tester, PRTest | — |
| R-8 | Migration v4: up = v4, down = v3, idempotent | unit (fake QueryRunner) + DB | template-copy.spec · tester v2→v3→v4→down→down chain · "only four by-name UPDATEs" | PASS | author, tester, prdb | — |

## 8. Remediation

No failure was introduced by this spec, so nothing needs fixing. Two observations, neither of which blocks:

1. **Escaped `=` in the href.** Handlebars HTML-escapes `{{resultUrl}}`, so `?phase=9` renders as `?phase&#x3D;9`. Browsers decode it, and the PRTest link opened correctly. This behavior predates this spec.
2. **`RESULTS_URL` with a query string.** `buildResultUrl` would build a malformed link from a base such as `…result-detail?x=1`. No environment uses that shape, and the spec does not cover it. Worth revisiting only if the variable ever changes shape.

The pre-existing `@nestjs/jwt` load failure in `replicated-innovation-reminders.module.spec.ts` sits outside this spec and is left as it was.

## 9. Accepted Gaps

| Gap | Reason | Mitigation |
|---|---|---|
| R-2 "No IPSR phase for the year" | It depends on how SQL treats an empty IPSR-version subquery, and a unit harness cannot run SQL | The SQL shape is asserted. It needs a manual prdb query if it is ever doubted. |
| Row-level selection for R-1 and R-2 | There is no local MySQL, so unit tests assert only the query shape and its parameters | prdb evidence in RBX-T-8 steps 0–3 |
| R-6 totals compared | Unit tests prove a single `plan()` path, not equal numbers | The preview and the real dispatch counts match (RBX-T-8 steps 2 and 3) |
