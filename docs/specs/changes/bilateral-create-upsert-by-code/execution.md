# Execution — `changes/bilateral-create-upsert-by-code`

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-create-upsert-by-code` |
| Approval Mode | `gated` |
| Branch | `feat/bilateral-create-upsert-by-code` (base `performance-refactor` @ `35e58fd87`) |
| Leader | Claude Code, `opus` (T1) |
| Implementer / Reviewer wrappers | `akili-implementer` (`sonnet`, T2) / `akili-reviewer` (`opus`, T3) |
| Started | 2026-09-30 |

## Task Execution History

### `UBC-T-1` — Accept `result_code`, resolve it before any write, reject what is ineligible, and return per-result outcomes

- **Final status:** `PASS`
- **Date:** 2026-09-30
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert`, `api-design-principles`, `tdd` (task defaults, no deviation) · effort `high` (public contract + ownership check + shared-service extraction)
- **Requirements covered:** `UBC-R-1`, `R-4`, `R-5`, `R-6`, `R-8` (per result — see Issues), `R-10` (`created` rows); resolution half of `R-2` / `R-3`

#### Attempt 1

- **Files changed** (all under `onecgiar-pr-server/src/api/bilateral/`):
  - `dto/create-bilateral.dto.ts` — optional `result_code`, digits-only (`@Matches`)
  - `bilateral.service.ts` — `resolveResultCodeTarget` / `logResultCodeResolution` / `assertResultCodeStatusIsEditable`; call site right after the per-result shape check (`:329`), before `runResultTypePreflight` and the transaction; `outcomes` pushed per result and stamped on `response`; new constructor dep `_bilateralVersioningRulesService`
  - `versioning-rules/bilateral-versioning-rules.service.ts` — `assertCallerMayVersion` moved here (public), new `ResultsCenterRepository` dep
  - `versioning-rules/bilateral-versioning-rules.module.ts` — provides `ResultsCenterRepository`
  - `services/bilateral-versioning.service.ts` — delegates ownership to `_rules.assertCallerMayVersion`; unused `ResultsCenterRepository` dep dropped
  - Specs: `bilateral.service.spec.ts`, `versioning-rules/bilateral-versioning-rules.service.spec.ts`, `services/bilateral-versioning.service.spec.ts`
- **Behaviour:** `findInPhase(open)` hit → `update` candidate (ownership → KP → R-5 status guard → 409 placeholder "Updating an existing result through create is not available yet."); miss → `resolveVersionableResult` (bilateral / KP / Approved checks) → ownership → 409 placeholder for `versioned` (T-2 wires it). Every exit throws; nothing falls through to create.
- **Red run:** resolve call removed → `npx jest --forceExit --testPathPattern="bilateral.service.spec" -t "rejects a code that does not exist anywhere"` → red: resolved `{"status":201,...}` instead of rejecting (`save` runs, no 404).
- **Mutations (each applied, observed red, reverted):**
  - (a) resolve call removed → 201 instead of reject
  - (b) `assertCallerMayVersion` removed on the versioned branch → `Expected ForbiddenException, Received ConflictException`
  - (c) resolve moved after `findOrCreateUser` → `findOrCreateUser` called once, expected 0
  - (d) outcomes stamping removed → `result.response.outcomes` is `undefined`
- **Implementer verification:** jest `--testPathPattern="api/bilateral"` → 41/41 suites, 1076/1076 tests · eslint (8 files) exit 0 · `tsc --noEmit | grep -c api/bilateral` → 0
- **Evidence re-run (Leader-inline):** `VERIFIED` — same jest (41 suites / 1076 tests), eslint exit 0, tsc count 0. Extra consumers outside `api/bilateral` that build the changed classes: `results/webhook/webhook-dispatch.service.spec.ts`, `versioning/versioning.service.spec.ts` → 2 suites / 72 tests green.
- **Reviewer:** `PASS` (`akili-reviewer`, opus; checklist mode). Summary: every guard precedes the first write; `/version` unchanged after the extraction (six ownership cases moved verbatim to the rules spec); 4xx codes match the Falsifier (404/403/409/409); `outcomes[]` additive and not named `results`; tests go through `create()` with no-write assertions.
- **runtime events:** none

#### ADVISORY (4R, from the Reviewer — recorded, not tasks)

1. **Risk / spec gap:** `R-8` says a rejected request leaves the DB unchanged, but `DD-1` resolves per result, so in a batch where #1 has no code and #2 has a bad code, #1 is already written. Escalated at the T-1 gate; **user decided 2026-09-30: per result.** Execute-time spec edit: `requirements.md` §6 `UBC-R-8` last bullet reworded to state the per-result guarantee (clarifies scope; carried to the T-2 Reviewer as a named check).
2. **Reliability (for T-3):** the update branch does not call `assertIsBilateral`; a non-bilateral open-phase result with no `external_platform_id` could pass ownership through the lead-centre fallback. Harmless behind the 409 placeholder.
3. **Reliability:** the "in order" comment in the Approved-status test is not backed by an `invocationCallOrder` assertion; no test makes the KP guard reject on the update branch.
4. **Resilience:** the service no-ops when `result_code` is present but not a string (DTO `@IsString` blocks it today).
5. **Readability:** `outcomes` disappears if the final `findOne` returns null (existing behaviour already returns null there).
6. **Spec hygiene:** `bilateral.controller.spec.ts` (listed in T-1 Consumers and `requirements.md` §9 D6) does not exist.

#### Decisions made

- T-1 returns a 409 placeholder for the eligible `versioned` target too (not only `update`), so PR 1 never writes on a code path until T-2 lands. Within the task's "wired in T-2" wording.
- Observability log line covers the resolve step only (code, candidate operation, platform acronym, outcome — no bodies, no keys); the no-code `created` path is not logged by this change.

#### Issues encountered

- Consumer `bilateral.controller.spec.ts` does not exist in the repo; nothing to run. No controller change was needed.

#### Final verification

Scoped jest green (41/1076), eslint clean, tsc 0 in `api/bilateral`.

### `UBC-T-2` — Version with data: a fresh create in the open phase that keeps the prior `result_code`

- **Final status:** `PASS` (attempt 2)
- **Attempts:** 2
- **Requirements covered:** `UBC-R-3`, `R-7`, `R-20`; version half of `R-10`
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` (task defaults) · attempt 1 `high`, attempt 2 `xhigh` (bump per retry)

#### Attempt 1

- **Files changed:** `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts`, `bilateral.service.spec.ts`
- **Behaviour:** `resolveResultCodeTarget` returns `{ operation: 'versioned', resultCode: source.result_code }` for an eligible version target (T-1 placeholder removed); `create()` restores `result_code` on the new row right after the header insert (`_resultRepository.update(resultId, { result_code })` + in-memory header); outcome `operation` = `resultCodeTarget?.operation ?? 'created'`.
- **Red run:** new UBC-T-2 tests against T-1 code → 3 failed on `ConflictException: Versioning an existing result through create is not available yet.`
- **Mutations:** (a) restore skipped → `update(777,{result_code:28565})` 0 calls; (b) `versionProcessV2` instead → `TypeError: ...versionProcessV2 is not a function`; (c) hardcoded PendingReview **at the outcome** → expected 1, got 5.
- **Implementer verification:** jest `api/bilateral` 41/41 suites, 1078 tests · eslint 0 · tsc 0
- **Evidence re-run (Leader-inline):** `VERIFIED` — identical outputs.
- **Reviewer:** `FAIL` (`akili-reviewer`, opus). Verbatim issue:
  > **Discovered Issue:** The R-7 test (`status follows keep_editing=%s`) stubs `initializeResultHeader` with `status_id: expectedStatus.value` and then checks that the outcome returns the same value. The `keep_editing` flag in the request has no effect on the result: flip it and the test still passes. The place where `keep_editing` is actually read is `status_id: resolveInitialStatusId(bilateralDto)` at `bilateral.service.ts:4370`. Hardcoding `PendingReview` there survives every spec in `api/bilateral` (`initial-status.constants.spec.ts` tests the function on its own, not the call site; `knowledge-product.handler.spec.ts` covers only the KP branch, and KP is excluded from versioning (R-6)). The implementer applied mutation (c) at the outcome instead, which is not where the flag is read. This is a plumbing check standing in for proof of the behaviour.
  > **Violated Rule:** `tasks.md` UBC-T-2 → Verification "(c) ignore `keep_editing`: red on the status case" and DoD "`R-7`: status follows `keep_editing`"; `requirements.md` §6 `UBC-R-7`; §7 "Version a prior-phase result with new data" ("IT MUST land in Pending Review, or in Editing when `keep_editing: true`"). Also reviewer contract §3: a presence assertion is not a behavioural proof.
  > **Remediation Suggestion:** Make `keep_editing` the only thing that decides the outcome. In the UBC-T-2 describe block, let the real `initializeResultHeader` run: restore the spy, stub `_resultRepository.save` to resolve `{ id: 777 }`, stub `findOne` to return the saved status, and stub `resolveLeadContactColumns`. Then assert that `save` was called with `status_id` 1 for `true` and 5 for `false`. Re-run mutation (c) at `:4370` and record that it goes red.
  - Conforming per Reviewer: R-3/D3 (restore targets only the new row; trigger is BEFORE INSERT; the full-row `save` at `:510` carries the restored in-memory code), R-10, R-20, amended R-8 (named check).
  - ADVISORY: (b)'s red is incidental (unstubbed method) — add `versionProcessV2: jest.fn()` + `not.toHaveBeenCalled()`; concurrent versioning of one code can create two open-phase rows (same race as `/version`) — note in T-5 doc; a write failure after the restore leaves an open-phase row with the source code, so a retry resolves to `updated` (fake transaction) — note for T-3/T-5.
- **runtime events:** none

#### Attempt 2 (rework — override (e), resumed the attempt-1 worker)

- **Files changed:** `bilateral.service.spec.ts` only. Production `bilateral.service.ts` byte-identical to attempt 1 (Leader diffed the two attempt diffs).
- **Changes:** R-7 `it.each` now runs the real `initializeResultHeader` (`mockRestore()`), with `save`/`findOne` echoing the header; asserts `save` called with `status_id` 1 (`keep_editing: true`) / 5 (`false`). Harness `_versioningService` gains `versionProcessV2: jest.fn()`; falsifier asserts it is never called [advisory-grade, adopted].
- **Mutation (c) at the real read site** (`bilateral.service.ts:4370`, `resolveInitialStatusId` → hardcoded `PendingReview.value`): `npx jest ... -t "status follows keep_editing"` → `true` case red (expected `save` with `status_id: 1`, received 5); `false` case green (5 = 5, expected).
- **Mutation (b) redone:** restore replaced by `versionProcessV2(...)` → falsifier red (first on `update(777, …)` 0 calls; with a temporary reorder, `versionProcessV2` `Received number of calls: 1`). Reverted, byte-identical restore confirmed.
- **Implementer verification:** jest `api/bilateral` 41/41 suites, 1078 tests · eslint 0 · tsc 0
- **Evidence re-run (Leader-inline):** `VERIFIED` — identical outputs.
- **Reviewer:** `PASS` (`akili-reviewer`, opus, same reviewer context). Attempt-1 issue resolved: `keep_editing` is now the only input deciding the status and mutation (c) at `:4370` goes red; R-3/R-10/R-20/amended R-8 findings still hold; no regressions.
- **runtime events:** none

#### ADVISORY (carried, recorded — not tasks)

- Concurrent versioning of one code can create two open-phase rows (same race as `/version`) — mention in the T-5 contract doc.
- A write failure after the restore leaves an open-phase row with the source code, so a retry resolves to `updated` (fake transaction) — mention in T-3/T-5.

#### Decisions made

- `requirements.md` §6 `UBC-R-8` amended 2026-09-30 (per-result guarantee, user decision at the T-1 gate); carried to this task's Reviewer as a named check — conforms.
- Rework delivered by resuming the same Implementer and Reviewer contexts (cheaper than fresh spawns; author ≠ auditor preserved).

#### Issues encountered

- Attempt 1's R-7 test stubbed the header, so it could not fail if `keep_editing` were ignored; fixed in attempt 2.

#### Final verification

Scoped jest green (41/1078), eslint clean, tsc 0 in `api/bilateral`. Review rounds 2 — within the budget (1–2 per task).
