# Tasks — Scope the indicator-attach lookup to the tab's own ToC row

## 1. Scope of this task list

Three tasks in `onecgiar-pr-server` only (plus one manual rollout check on prtest). Covers `RTR-R-1 … R-4`, `RTR-AC-1 … AC-4` and defect classes D1–D5 from `requirements.md` §9.

- **Spec:** `bugfix/contributor-accept-owner-indicators` · **Depth:** Lite · **Mode:** Bug · **Approval Mode:** gated
- **Budget (`design.md` §12.1):** 3 tasks · ~80 LOC · 1 review round
- **Branch:** cut from `performance-refactor`
- **Skills (from `.agents/model-routing.md` Skill Map):** `nestjs-expert` (T1, T2), `tdd` (T1, T2), `systematic-debugging` (already applied in `proposal.md`; no re-diagnosis)

## 2. Pre-flight checklist

- [ ] Working tree clean; branch cut from an up-to-date `performance-refactor`.
- [ ] `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results.repository"` green **before** starting, so T1's red is attributable to T1.
- [ ] Re-confirm the branch before every commit (several terminals in use; a checkout carries changes across).
- [ ] No in-flight spec touching `results-toc-results.repository.ts` (`grep -rl "results-toc-results.repository" docs/specs/ --include=tasks.md`).
- [ ] No migration expected — `npm run migration:check` must stay green untouched.

## 3. Task list

### `RTR-T-1` — Regression tests that fail on current code

| Field | Value |
|---|---|
| Status | [x] done — PASS 2026-09-11 (execution.md) |
| Type | `tests` |
| Size | S |
| Depends on | none — **must land red before `RTR-T-2` exists** |
| Blocks | `RTR-T-2` |
| Requirements | `RTR-R-1` (clauses "must NOT issue any write against 42189", "MUST resolve with the plain column and `IS NULL`"), `RTR-R-2` (clause "MUST pick SP05's row even though both share the node"), `RTR-R-3`, `RTR-R-4`, `RTR-AC-1`, `RTR-AC-2`, `RTR-AC-3`, NFR *Data integrity* |
| Design | `design.md` §5, §10, `RTR-DD-2`, `RTR-DD-3` |
| Skills | `nestjs-expert`, `tdd` |

**Scope.** In `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.spec.ts`, add a new `describe('saveIndicatorsPrimarySubmitter — resolves the tab\'s own row')` block that reuses the existing `buildRepository()` helper (P2-3608 block) and stubs on the repository instance itself: `findOne`, `update`, `saveImpact`, `saveSdg`, `saveActionAreaToc`, `saveInditicatorsContributing`, and the module `Logger.warn`. Four tests:

1. **`RTR-TEST-1` — Planned = No, the exact failing case.** Tab `{ initiative_id: 54, toc_result_id: null, indicators: [{ toc_results_indicator_id: null, targets: [{ contributing_indicator: null }] }] }`, `result_id 32278`. Assert the `where` passed to `findOne`: has `initiative_ids === 54`, has **no** `initiative_id` key, and `toc_result_id` equals `IsNull()` (compare with `toEqual(IsNull())`, or `toBeInstanceOf(FindOperator)` + `.type === 'isNull'`), `is_active: true`, `result_id: 32278`.
2. **`RTR-TEST-2` — never hands another initiative's row downstream.** `findOne` resolves `{ result_toc_result_id: 42189, initiative_ids: 50 }` for the same tab → `saveInditicatorsContributing`, `saveImpact`, `saveSdg`, `saveActionAreaToc` and `update` are **not** called; `Logger.warn` called once with numeric ids only.
3. **`RTR-TEST-3` — same node as the owner (`RTR-AC-2`).** Tab `{ initiative_id: 54, toc_result_id: 5926, indicators: [X] }`; `findOne` resolves `{ result_toc_result_id: 42196, initiative_ids: 54 }` → `saveInditicatorsContributing` called with row id `42196`; `where.toc_result_id === 5926` (a number, not a FindOperator).
4. **`RTR-TEST-4` — not found (`RTR-AC-3`).** `findOne` resolves `null` → no writes, one `warn`, the method returns (does not throw).

**Tests / verification.** `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results.repository"`

**Disqualifier.** `RTR-TEST-1` and `RTR-TEST-2` **must fail on current code** — TEST-1 because today's `where` carries `initiative_id: 54, toc_result_id: null`; TEST-2 because today the row with `initiative_ids: 50` is written to. A green TEST-1/TEST-2 at this point is not a pass: it means the stub is not intercepting the repository's own `findOne` (most likely stubbed on the wrong object) or the assertion is on the wrong argument. Report the failure mode; do not weaken the assertion to match current behavior. TEST-3 and TEST-4 may already pass (TEST-4's `warn` assertion will not) — that is expected and must be stated in the task report.

**Falsifying input.** Replacing `IsNull()` with `null` in the assertion makes TEST-1 pass on broken code — which is exactly why TEST-1 must assert the FindOperator, never `toEqual({ …toc_result_id: null })`.

**Presence vs behavior.** TEST-1 asserts the *shape* of the `where` (a presence assertion). It cannot prove the SQL MySQL runs — that is defect class D3, owned by `RTR-T-3`. TEST-2 is the behavioral one: it proves the method refuses to write to a foreign row regardless of what the query returned.

**Done.** Four tests exist; TEST-1 and TEST-2 red for the stated reasons; nothing else in the file changed.

---

### `RTR-T-2` — Correct the lookup, add the same-initiative guard and the warning

| Field | Value |
|---|---|
| Status | [ ] pending |
| Type | `server` |
| Size | S |
| Depends on | `RTR-T-1` |
| Blocks | `RTR-T-3` |
| Requirements | `RTR-R-1`, `RTR-R-2`, `RTR-R-3`, `RTR-R-4`, `RTR-AC-1 … AC-4`, NFR *Backwards compatibility*, *Security*, *Observability*, *Data integrity* |
| Design | `design.md` §5, `RTR-DD-1 … DD-4` |
| Skills | `nestjs-expert`, `tdd` |

**Scope.** In `results-toc-results.repository.ts` → `saveIndicatorsPrimarySubmitter` only:

1. Build the `findOne` `where` with `result_id: toc?.results_id || result_id`, **`initiative_ids: Number(toc?.initiative_id)`**, **`toc_result_id: toc?.toc_result_id ?? IsNull()`**, `is_active: true`. Import `IsNull` from `typeorm` (precedent: `results.service.ts:3008`). Remove the `initiative_id` key.
2. After the lookup, if `rtrExist` exists but `Number(rtrExist.initiative_ids) !== Number(toc?.initiative_id)`, treat it as not found (`RTR-DD-3`).
3. In the not-found branch keep the existing early `return` (`RTR-DD-4`) and add one `Logger.warn` with fixed text and the three numeric ids — result, initiative, node (`null` printed as such). No names, no emails, no tokens.
4. Touch nothing else in the method or the file. No rename (§13 follow-up).

**Tests / verification.**
`npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results.repository"`
`npx jest --silent --reporters=summary --forceExit --testPathPattern="share-result-request|results-toc-results|results-package-toc-result"`
`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
`npx tsc --noEmit`
`npm run migration:check`

**Disqualifier.** The four `RTR-T-1` tests must be green **and** every previously passing test in the three suites must still pass with **no assertion edited** (`RTR-AC-4`). A green run obtained by editing an existing expectation, or by adding a `mockResolvedValue` to an existing test, is a failed task: it means the change reached a path it should not have (D2). If `tsc` complains that `initiative_ids` is not assignable in `FindOptionsWhere`, the entity mapping is not what the design assumed — stop and report, do not cast to `any`.

**Falsifying input.** Reverting step 1 (back to `initiative_id: …, toc_result_id: null`) must turn TEST-1 red again; deleting step 2 must turn TEST-2 red again. Both are wired by `RTR-T-1`.

**Presence vs behavior.** `eslint`/`tsc` prove compilation, not behavior; the suites prove behavior under mocks; MySQL behavior is `RTR-T-3`.

**Done.** All four regression tests green, three suites green with zero assertions modified, lint/typecheck/migration-check clean, diff confined to `saveIndicatorsPrimarySubmitter` and its import line. Commit: `🔧 fix(results-toc-results): scope the indicator-attach lookup to the tab's own initiative and node` (no ticket — owner decision, `requirements.md` §1).

---

### `RTR-T-3` — Repair the prtest row and prove the SQL against MySQL (D3)

| Field | Value |
|---|---|
| Status | [ ] pending — **HITL: run by the owner, not by an agent** |
| Type | `rollout` |
| Size | S |
| Depends on | `RTR-T-2` deployed to prtest (Cristian runs deploys) |
| Blocks | spec closure |
| Requirements | `RTR-R-1` (clause "a row for SP05 exists with `planned_result = 0` and `toc_result_id IS NULL`" — existing behavior, verified live), `RTR-AC-1`, defect classes D3 and D5 |
| Design | `design.md` §10 last bullet, §11 |
| Skills | none (manual) |

**Scope.**
1. On prtest DB: `UPDATE results_toc_result_indicators SET is_active = 1 WHERE result_toc_result_indicator_id = 35494;` then `GET /v2/api/contributors-partners/32278` shows SP01's indicator `70f1200f…` and `target_value 1` again. If it does not, `24709` was also deactivated — reactivate it and record that in this task.
2. Pick a **different** pending contributor on the same result (SP09 or SP12, still pending as of the proposal) and accept it from *Notifications → Received* with **Planned = No** through the UI.
3. `GET /v2/api/contributors-partners/32278` again.

**Manual check.** Owner SP01: `result_toc_results[0].indicators[0].toc_results_indicator_id` still `70f1200f…`, `target_value` still `1`. Contributor: new entry with `planned_result: false`, one row with `toc_result_id: null`. Optionally: `SELECT is_active, last_updated_date FROM results_toc_result_indicators WHERE result_toc_result_indicator_id = 35494;` → `1`, untouched since step 1.

**Disqualifier.** A green outcome is only evidence if the deployed prtest build contains `RTR-T-2` — confirm the commit is in the branch the prtest pipeline builds (it has pointed at the wrong branch before) **before** step 2. If the owner's indicator survives on a build that lacks the fix, the check proved nothing (the contributor may have had a pre-existing row, or the request was V1 with a different tab). Record build sha + timestamp with the result.

**Falsifying input.** Running step 2 against a build without `RTR-T-2` reproduces the wipe — the same steps that produced `proposal.md` §3. That is the input that makes this check fail, and it is why the build sha is part of the evidence.

**Done.** Owner indicator intact after a live Planned = No accept on prtest, build sha recorded; prtest row `35494` repaired. `RTR-OQ-2` (PROD sizing) remains open and is **not** part of this task.

## 4. Dependency graph

```
RTR-T-1 (tests, red)
   └── RTR-T-2 (fix + guard + warn; tests green, suites untouched)
         └── RTR-T-3 (prtest repair + live re-run — HITL, after deploy)
```

No parallel branches. `RTR-T-3` waits for a deploy; `RTR-T-1`/`T-2` can be committed and pushed before it.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RTR-TEST-1` | unit (server) | `RTR-R-1` (plain column + `IS NULL` clause), `RTR-AC-1` | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.spec.ts` |
| `RTR-TEST-2` | unit (server) | `RTR-R-1` ("no write against 42189"), `RTR-R-3`, `RTR-R-4`, NFR data integrity | same file |
| `RTR-TEST-3` | unit (server) | `RTR-R-2`, `RTR-AC-2` | same file |
| `RTR-TEST-4` | unit (server) | `RTR-R-3`, `RTR-R-4`, `RTR-AC-3` | same file |
| `RTR-TEST-5` | existing suites (server) | `RTR-AC-4`, D2 | `share-result-request.service.spec.ts`, `results-toc-results.service.spec.ts`, `results-package-toc-result*.spec.ts` |
| `RTR-CHECK-1` | manual (prtest) | `RTR-R-1` contributor-row clause, D3, D5 | `RTR-T-3` |

Coverage closure at clause level: every `BUT` / `AND IT MUST` in `requirements.md` §8 is owned above — TEST-1 (plain column + `IS NULL`), TEST-2 (no write against the owner's row), TEST-3 (picks SP05's row on a shared node), CHECK-1 (contributor row exists live). No clause is cleared by citing a different requirement.

Server coverage thresholds (5/20/35/40) are unaffected; this adds tests only.

## 6. Rollout & verification

- [ ] PR against `performance-refactor` per branch policy; CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] Deploy to prtest → `RTR-T-3`.
- [ ] `RTR-OQ-2`: run `proposal.md` §9 detection query on PROD; decide SQL repair vs owner re-selection; the fix ships regardless.
- [ ] No bilateral / platform-report payload change → no change-log entry.

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped` after `RTR-T-3`.
- [ ] File follow-ups from `design.md` §13: method rename, entity property collapse, repo-wide TypeORM `where` audit.
- [ ] Update `.agents/model-routing.md` T1 registry entry on the default branch (carried from the proposal).

## 8. Roll-back plan

1. Revert the single `RTR-T-2` commit. No migration, no flag.
2. Re-run the three suites to confirm the previous state.
3. Note that reverting re-exposes owners to the wipe — prefer a forward fix.
