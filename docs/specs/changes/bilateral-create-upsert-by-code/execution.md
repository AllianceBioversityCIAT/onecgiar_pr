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

### `UBC-T-5` — Contract doc and the Notion versioning section (PR 1 pass)

- **Status:** `PASS` for the PR 1 pass (attempt 2) — task stays `[~]`: `tasks.md` requires a second pass after `UBC-T-4`
- **Attempts:** 2
- **Requirements covered:** `UBC-R-12` (PRMS side, PR 1 behaviour)
- **Date:** 2026-09-30
- **Skills / effort:** `cognitive-doc-design` (task default) · attempt 1 `medium`, attempt 2 `high`

#### Attempt 1

- **Files changed:** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (new `data.result_code` section + change-log row, +57 lines). Notion block delivered in the report (scratchpad `t5-notion.md`).
- **Implementer verification:** statement→test table; 9 test titles cited; three rows (400 non-bilateral, 409 not-Approved, 403 ownership variants) backed only by the rules spec, flagged.
- **Evidence re-run (Leader-inline):** `VERIFIED` — only that file changed; all 9 cited titles exist by grep.
- **Reviewer:** `FAIL` (`akili-reviewer`, opus). Verbatim issues:
  > 1. **Discovered Issue:** The 400 row says "the code's only match is not a W3/Bilateral result". In the code, `assertIsBilateral` runs only inside `resolveVersionableResult`, which is the versioned branch. The open-phase branch (lines 4483-4513) runs ownership, then the KP check, then the status check, and never checks bilateral. So a W1/W2 code that has an open-phase row (even if that row is its only match) gets 403 or 409, never 400. The same wording is in the Notion table. **Violated Rule:** `tasks.md` UBC-T-5 Disqualifier and Falsifier. **Remediation:** Say the 400 applies only when the code has no row in the open phase (the version path). Also tell the Leader the update branch has no bilateral check, so T-3 can decide on it.
  > 2. **Discovered Issue:** The not-Approved 409 row says "the code's **only** earlier-phase row". `resolveVersionableResult` orders rows by `version_id DESC` and checks the **most recent** earlier-phase row. If an older phase has an Approved row and a later non-open phase has a non-Approved one, the request is rejected 409. The rejections intro also says every unresolvable code gets "one of these" errors. The code can also return a 409 that is not in the table: `There is no open reporting phase, so no result can be carried forward right now.` (`getActiveReportingPhase`, which runs first). **Violated Rule:** UBC-T-5 Disqualifier. **Remediation:** Change "only" to "most recent earlier-phase row", and add the no-open-phase 409 or drop the claim that the list is complete. Fix the Notion row the same way.
  > 3. **Discovered Issue:** Both docs say "Every `create` response now carries `outcomes[]`, one row per result in the request." The loop rethrows on any rejection (line 636), so a rejected multi-result request returns only the error envelope. There is no `outcomes[]`, even for the results that were already written, so the producer cannot learn their codes from the response. `outcomes` is also attached only when `resultInfo` is non-null (line 645). **Violated Rule:** UBC-T-5 Falsifier; `requirements.md` R-8 (as amended) and R-10. **Remediation:** State that `outcomes[]` is only on a successful response. Next to the per-result guarantee, add that the request fails as a whole, so the earlier written results are not reported in it. In Notion, change the heading "nothing is written when these happen" to "the rejected result writes nothing".
  > 4. **Discovered Issue:** The "not carried" section ends "Send everything the new version should hold". But Innovation Use `linked_results` cannot be sent through `create`: the handler hard-codes `linked_results: []` (`handlers/innovation-use.handler.ts:87`). Only the centre form writes them. **Violated Rule:** UBC-T-5 Disqualifier. **Remediation:** Say that links to other results cannot be sent through `create` and have to be re-added in the reporting tool.
  > 5. **Discovered Issue:** The repo doc has the sentence "The last two ownership outcomes **below** … (see the verification table in the task report)". Nothing follows it, and the task report is not shipped to consumers. The two 403 messages it describes are also not given: `The calling platform could not be identified from the API key.` and the no-centre-scope message. **Violated Rule:** UBC-T-5 Scope (a 4xx table for producers); DD-8. **Remediation:** Add these two 403s as table rows with their messages. Move the note about test coverage to `execution.md`, not the contract.
  - ADVISORY: per-result guarantee has no cross-batch test (T-4 could add one); Known-limitations bullets accurate, reword after T-3/T-4; no secrets in either doc.
- **runtime events:** none

#### Forward pointer → `UBC-T-3`

- The open-phase (update) branch of `resolveResultCodeTarget` never calls `assertIsBilateral`; a W1/W2 open-phase result gets 403/409, never 400, and could pass ownership via the lead-centre fallback (T-1 ADVISORY 2, re-confirmed by the T-5 Reviewer issue 1). T-3 must decide it explicitly. Copy into the T-3 brief.

#### Attempt 2 (rework, resumed the attempt-1 worker)

- **Files changed:** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (78-line diff vs HEAD); Notion block rewritten (delivered to the user at the gate).
- **Fixes:** (1) 400 limited to the version path; (2) not-Approved 409 = most recent row outside the open phase, + no-open-phase 409 (`rules:59-61`), completeness claim dropped; (3) `outcomes[]` only on a successful response, request fails as a whole, earlier-written results not reported; (4) not-carried list split — resendable (share requests via `contributing_programs`, budgets) vs not sendable through create (`linked_results`, `innovation-use.handler.ts:87`); (5) both 403 rows with messages (`rules:200`, `:217`), dangling sentence removed.
- **Evidence re-run (Leader-inline):** `VERIFIED` — only the doc changed in the repo; the three new test titles ("refuses when no phase is open", "refuses when the API key resolved no platform", "refuses a platform with no configured centre scope") and the cited strings / `linked_results: []` exist at the cited lines.
- **Reviewer:** `PASS` (`akili-reviewer`, opus, same context) — issues 1–5 resolved, nothing new contradicts the code. **Conditional:** the three code-citation-only statements below must be recorded as test obligations for the T-4 revisit.
- **runtime events:** none

#### Test obligations owed at the T-5 revisit (after `UBC-T-4`) — Reviewer condition for this PASS

Statements in the contract backed only by a code citation (Falsifier gap, recorded per `reviewer.md`):
1. **No 400 on the update path** — a create-suite case: a W1/W2 code with an open-phase row gets 403/409, never 400. Likely to change when T-3 decides the bilateral check (see the forward pointer to T-3 above); the doc row must follow T-3's decision.
2. **Most-recent-row ordering** — a rules-spec case: older Approved row + newer non-Approved row outside the open phase → 409.
3. **`linked_results` always empty on ingest** — an `innovation-use.handler.spec.ts` assertion that `linked_results` is `[]` even when the payload sends something.
(`outcomes[]` absent on rejection is already covered by the rejection tests — no gap.)
Adding these tests is outside the docs task's own scope; who writes them (T-3/T-4 Implementer, or the T-5 revisit) is a user decision, raised at the T-5 gate.

#### ADVISORY (recorded, not tasks)

- Two more ownership 403s are not listed (`rules:232` no platform nor lead centre; `rules:238` centre outside scope) — add at the revisit.
- "Never writes its own row" holds for the resolve rejections only; a later 400 inside the fake transaction (e.g. `geo_focus`) can still leave an orphan row — cross-reference the Known-limitations bullet.

#### Decisions made

- Task kept `[~]` after the PR 1 pass, since `tasks.md` T-5 is "updated again after `UBC-T-4`"; the DoD items are met for PR 1 behaviour.

### `UBC-T-3` — Update in place: header, immutable type, title rule, and a preflight of the post-header checks

- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` (task defaults) · effort `xhigh` (data-integrity surface, shared validator, preflight ordering)

#### Decisions made (at the T-3 gate, before the spawn)

- **`P-16` / `OQ-1` settled** (task precondition): Manuel (STAR) confirmed on 2026-09-30 that STAR sends the full result, all MDS, on update and version. Replace semantics stand.
- **Bilateral check on the update branch — user decision 2026-09-30** (forward pointer from T-1 ADVISORY 2 / T-5 Reviewer issue 1): the open-phase branch calls `assertIsBilateral` before ownership, so a W1/W2 code is a 400 on both paths.
  - Execute-time spec edits made now: `tasks.md` UBC-T-3 Scope (new bullet) + DoD (new item); `requirements.md` §6 `UBC-R-8` (new bullet, both paths are 400 for non-bilateral). They narrow what is accepted, and the user approved them, so this is not a Pivot. Carried to this task's Reviewer as named checks.
- **T-5 test obligations — user decision 2026-09-30:** #1 (update-path 400 for non-bilateral) is written in T-3; #2 (most-recent-row ordering, rules spec) and #3 (`linked_results` always `[]`, innovation-use spec) stay with the T-5 revisit after T-4.

#### Attempt 1

- **Files changed** (under `onecgiar-pr-server/src/api/bilateral/`): `bilateral.service.ts` + spec; `handlers/policy-change.handler.ts` + spec; `handlers/capacity-change.handler.ts` + spec; `handlers/innovation-development.handler.ts` + spec.
- **Behaviour:** update path order: `findInPhase` hit → `assertIsBilateral` → `assertCallerMayVersion` → KP → R-5 status → new DD-4 type guard. Then the pre-transaction preflight, on **every** create: handler `validateBeforeCreate` (the three handlers' resultId-independent checks extracted into `resolveAndValidate`) and the new `assertGeoFocusPreflight`. Then `ensureUniqueTitle(title, versionId, excludeId)`. The header is updated in place by the new `updateResultCodeTargetHeader`, keeping `id`/`result_code`. Writers are unchanged (sections = T-4).
- **Red run:** same-title falsifier on pre-T-3 code → `ConflictException: Updating an existing result through create is not available yet.`
- **Mutations (each red):** (a) exclude-id dropped → same-title red; (b) every title excluded → "Y" red; (c) DD-4 guard removed → no 409; (d) geo_focus preflight un-hoisted → `_resultRepository.update` called before the throw; (e) `assertIsBilateral` removed on update → 201.
- **Implementer verification:** jest `api/bilateral` 41/41 suites, 1092 tests · eslint (8 files) 0 · tsc 0 · consumer specs `versioning.service.spec.ts` and the rules spec: 2 suites / 55 tests green.
- **Evidence re-run (Leader-inline):** `VERIFIED`. Same jest (41 / 1092), eslint 0, tsc 0.
- **Reviewer mode:** parallel lens reviewers (effort `xhigh`, data-integrity surface). R-A = conformance + reliability + risk; R-B = conformance + resilience + readability. Both `akili-reviewer`, opus.
- **Reviewer R-B:** `FAIL`. Verbatim issues:
  > 1. **Discovered Issue:** Innovation Use's `afterCreate` checks are neither hoisted nor listed as accepted risk. `innovation-use.handler.ts:42-78` runs the shape checks for `innovation_use`, `current_innovation_use_numbers`, `innov_use_to_be_determined` and `actors`; `resolveInnovationUseLevel` throws on an unknown level (`:271-302`); `prepareActors` throws on an unknown actor type (`:155-184`). None of these needs the saved row, and they run after the header update and every other section writer. Its existing `validateBeforeCreate` only calls `assertExternalCreateMds`, and the module guide says the use level is no longer part of that gate. So an update with an invalid `innovation_use_level` or actor type returns 400 only after the header, geo, ToC, partners and evidence are rewritten. That is the half-applied update DD-3 forbids. The Implementer's claim names only KP as unhoisted. **Violated Rule:** `tasks.md` UBC-T-3 Scope ("Hoist `geo_focus` and each handler `afterCreate` check into a preflight on the code path. List any check that cannot be hoisted, as an accepted risk."); `design.md` UBC-DD-1 bullets 4–5. **Remediation Suggestion:** Do to `InnovationUseBilateralHandler` what was done to the other three: extract lines 42-78 into a `resolveAndValidate`, call it from `validateBeforeCreate` after `assertExternalCreateMds`, and have `afterCreate` consume its result. Add handler specs for an invalid use level and an unknown actor type through `validateBeforeCreate`. Record anything that truly cannot be hoisted (KP) in `execution.md` as accepted risk.
  > 2. **Discovered Issue:** The hoist runs for every create, no-code creates included, and nothing records it. `assertGeoFocusPreflight` and the three new `validateBeforeCreate`s now run before `validateTocMappingInitiatives`, the active-year lookup, `resolveContributingProjects`, user resolution and `ensureUniqueTitle`. For a no-code create: (a) a rejected payload no longer leaves an orphan header (better, but different, since the transaction does not roll back); (b) with several defects, a different one is reported first. A duplicate title plus an invalid `policy_type` used to get the duplicate-title 400 and now gets the policy-type 400; bad ToC plus missing `geo_focus` now reports `geo_focus` first. With a single defect, status and message are identical, because the handler bodies are verbatim moves. **Violated Rule:** `requirements.md` §6 `UBC-R-1` ("MUST behave exactly as today"); `design.md` UBC-DD-1 scopes the hoist to "the code path"; `requirements.md` §9 D6 ("one case asserting the unchanged path"). **Remediation Suggestion:** Do not gate the hoist to the code path, since that would bring the orphans back. Record the deviation and (a)/(b) as a decision in `execution.md` for user approval; Innovation Use's preflight already runs on every create, which is precedent. Add one D6 case: a no-code create with an invalid `policy_type` rejects before `initializeResultHeader`.
  - ADVISORY (R-B): the three `resolveAndValidate` are verbatim moves; CLARISA lookups run twice per typed create (negligible). Tests are behavioural, but "writes nothing" only checks the handler's own repositories, the policy test titled "missing or empty" only covers empty, and there is no service-level case of a *handler* rejection on update leaving `_resultRepository.update` uncalled. Stale comments: `svc:341-342` ("T-3 still wires the `updated` branch as a 409 placeholder"), `:622-626` ("always a fresh insert"), and `:644` logs "Successfully created" on an update. `@akili-spec` markers present.
- **Reviewer R-A:** `FAIL`. Verbatim issues:
  > 1. **Discovered Issue:** Not every aborting check on the update path precedes the first write. These payload checks can still throw after the header update (`updateResultCodeTargetHeader`, svc:468), and they are neither hoisted nor listed as accepted risk: `handleRegions` (400 svc:5782, 404 svc:5792); `handleCountries` (400 svc:5870, 404 svc:5880), which runs after `handleRegions` has already called `updateRegions(result.id, regionIds)` and deactivated the target's existing regions; `handleSubnationals` (400 svc:5951, 404 svc:5962); `handleEvidence` duplicate links (400 svc:5543, after the geo, ToC and institutions writes). An update with an unknown country code commits the new title, description, status and regions, then returns 404: a half-applied update. The new `assertGeoFocusPreflight` covers presence, `findScope` and `validateGeoFocus` only, not the region/country/subnational lookups. None of these needs the saved row (payload plus catalogue lookups), so all are hoistable. P-5's list missed them; the DoD's wording covers them. **Violated Rule:** `tasks.md` UBC-T-3 DoD ("Preflight: a rejected update writes nothing; any unhoistable checks are listed as accepted risk"); `design.md` §8 `UBC-DD-1` ("hoisted into a preflight, so an update never half-applies"); `requirements.md` §8 Integrity ("Every aborting check runs before the first write"); §9 D2 (the code read is the Reviewer's obligation). **Remediation Suggestion:** Extend the preflight to resolve regions, countries and subnationals as the handlers do (same where-building, same messages) and to check evidence for duplicate links, before the transaction. Otherwise record each one explicitly as accepted risk with the user. Add one create-suite case: an unknown country on an update leaves `_resultRepository.update` uncalled. The `handleTocMapping` rethrows of save errors (svc:1621/1735/1850) are DB faults, not validations; listing them as accepted risk is enough.
  > 2. **Discovered Issue:** The hoisted checks (`assertGeoFocusPreflight` and the three new handler `validateBeforeCreate`s) run on every create, not only when a `result_code` is sent, and no decision covers it. For a no-code create, status codes, messages and the response shape are unchanged, and so is the existing `ensureUniqueTitle` caller (`excludeId` undefined, `existing.id` always defined). What changes: a rejected payload no longer leaves orphan result, user or section rows behind; and with several faults, the error returned is different (geo and type errors now come before ToC, project and title errors). Clearly better and aligned with the §8 Integrity row, but beyond the spec's text, and not recorded in `execution.md` T-3. **Violated Rule:** `requirements.md` `UBC-R-1` ("MUST behave exactly as today"); `design.md` `UBC-DD-1` ("For the code path, the post-header checks … are hoisted"); `tasks.md` T-3 Scope ("into a preflight on the code path"). **Remediation Suggestion:** No code change. Raise it at the gate as an execute-time spec edit: amend DD-1 to "every create" and add a note to R-1 on orphan rows and error precedence; log it under Decisions. If the user declines, gate both calls on `resultCodeTarget`. Issue 1's new checks inherit the same decision.
  - Confirmed by R-A: named checks 1–2 hold; the resolve order (bilateral → ownership → KP → R-5 → DD-4 → preflight) precedes `findOrCreateUser`; `ensureUniqueTitle` runs before the header update; handler refactor keeps messages and order; the tests go through `create()` and assert `update(target.id, …)` with `initializeResultHeader` never called (Disqualifier met); the header field set matches the Scope.
  - ADVISORY (R-A): `announcePendingReview` (svc:656) now also fires after an update, so every STAR update of a Pending Review result re-sends the submitted notification and contributor tagging; the spec is silent. The R-9 title rejection runs after `findOrCreateUser`, so a rejected update can still create a user or contact row (not a row of that result). `ensureUniqueTitle` uses `findOne`: a legacy duplicate of the target's title can hide the other row (same as `results.service.ts:5558`).
- **runtime events:** none

#### Leader adjudication (attempt 1)

- R-B #1 and R-A #1 are in scope (the T-3 DoD and DD-1) → rework.
- R-B #2 = R-A #2: the code is right, but the spec text says "code path". This is a user decision at the gate (execute-time spec edit, or gate the hoist on `resultCodeTarget`).
- `announcePendingReview` on update: advisory, and the spec is silent. Raised to the user, not minted as a task.

## Pivot Record: UBC-T-3

- **Date:** 2026-09-30 · **Trigger:** at the attempt-1 gate the user questioned why the update path was needed at all, and answered the open questions:
  1. *"Does STAR resend results that are already in the open phase?"* → **No.** What STAR needs is versioning with data (T-2, shipped).
  2. *"May the result's `id` change on a resend?"* → yes. `id` is the autoincrement, and what persists is `result_code`. Recorded for any future update proposal; moot now.
  3. *"Must a resend notify again?"* → follow the current flow, unchanged. Moot now.
  4. (Before the pivot) the hoist of the preflight to every create was accepted. Moot now, because the hoist is discarded with the attempt.
- **Blocker:** `UBC-R-2` (update in place) rests on a need the producer does not have. Building it costs the T-3 rework plus all of T-4 (section reset, `persistLeadCenter`), on the riskiest surface of the spec, for no consumer.
- **Alternatives considered:** (1) cut the update, and a code in the open phase stays 409, **chosen**; (2) a simple update: deactivate the open-phase row and create fresh with the same code, reusing T-2 (no section reset, new `id`); (3) continue the in-place update (keeps `id`, needs T-3 rework + T-4).
- **Revised direction:** `UBC-R-2` and `R-9` are descoped. T-1's open-phase 409 stays as shipped. T-3 and T-4 are cancelled. T-5 gets a final pass now (the doc says the 409 is permanent, no "not yet"). T-6 drops the update run and replaces it with an open-phase-409 run.
- **Code:** attempt 1's uncommitted diff (`bilateral.service.ts` + spec, three handlers + specs, 991 lines) was discarded with `git restore -- onecgiar-pr-server/src/api/bilateral` (tree held only that attempt's code plus this spec's docs). A backup is at `$CLAUDE_JOB_DIR/tmp/t3-attempt1-discarded.patch`; it is not durable. The tree is back at `95d946fe4` for code.
- **Gate decisions reverted:** the bilateral check on the update branch and its spec edits (`tasks.md` T-3 bullet/DoD, `requirements.md` R-8 bullet) were removed, since there is no update branch. T-5 obligation #1 goes back to the T-5 final pass: a W1/W2 code with an open-phase row gets 403/409 before the open-phase 409, never 400, and the doc has to say so.
- **Spec edits (two-direction sweep):** `requirements.md` §6 R-2 and R-9 descoped, §7 Update scenario marked; `design.md` §8 DD-3, DD-4 and DD-7 marked, §9 PR 2 marked; `tasks.md` status line, PR strategy, T-3/T-4 cancelled, T-5 dependency and Falsifier, T-6 scope/DoD, coverage closure rows R-2, R-7, R-9, R-10, R-20, A-1 and the Update scenario. History lines (design §8 reversion challenge, §9 budget) are left as written.
- **ADR impact:** none (no TRD ADR touched).
- **Advisories from attempt 1 that survive the pivot** (recorded, not tasks): `ensureUniqueTitle` uses `findOne` (a legacy duplicate can mask another row, the same as `results.service.ts:5558`); the no-code create still leaves orphan rows when a post-header check fails (P-4, pre-existing).
- **Approval:** the user's answers above are the pivot decision. The remaining work (T-5 final pass, T-6) resumes on the user's go.

### Pivot status amended — on hold, not cancelled (2026-09-30, user)

- The user will confirm with STAR on **2026-10-01** whether results already in the open phase are ever resent. Until then, T-3 and T-4 are **on hold**, not cancelled, and R-2 / R-9 are on hold, not descoped. The shipped behaviour does not change: a code in the open phase gets 409.
- Attempt 1's code is saved durably as a local git stash on this branch: `UBC-T-3 attempt 1 (update in place) — on hold pending STAR, 2026-09-30` (`git stash list`). If STAR says yes, resume T-3 from that stash plus the two attempt-1 FAILs above (Innovation Use hoist; region/country/subnational/evidence-duplicate checks), with the user's answers: the `id` may change (so option 2, the simple update by deactivate + fresh create, is now viable and much smaller), and notifications follow the current flow. The way forward has to be decided again at that point.
- If STAR says no: drop the stash, mark T-3/T-4 cancelled, and run T-5's final pass.

### Amendment (user request, 2026-10-01): `data.result_code` accepts string or integer — `UBC-R-11`

- **Why:** while checking the Fetcher (the T-6 read), the Leader found that the Fetcher forwards `data` untouched (`validator/schemas/common_fields.json:6` open root; processors spread `data`; `clients/external-api.mjs:65-78`), but PRMS required a string (`@IsString`). A producer sending `28565` as a number would get a 400. The user asked for it to be failure-resistant: accept string or integer.
- **Change:** `dto/create-bilateral.dto.ts` gets an `@Transform` on `result_code`: a safe, non-negative integer becomes `String(value)`, and a string is trimmed. The existing `@IsString` + `@Matches(/^\d+$/)` still reject everything else. The Swagger `oneOf` is string|integer, and the description now reflects shipped behaviour (open phase → 409, update on hold). New spec `dto/create-bilateral-result-code.dto.spec.ts`: 14 cases (accepts `"28565"`, `28565`, `" 28565 "`, `0`; rejects decimal, negative, boolean, `{}`, `[]`, `"28a65"`, `""`, `"-28565"`, `Number.MAX_VALUE`; absent stays optional). The controller's `ValidationPipe` has `transform: true` (`bilateral.controller.ts:54-58`), so the service receives the normalised string.
- **Contract doc:** `bilateral-result-summaries.en.md` §`data.result_code` intro + change-log row 2026-10-01.
- **Red:** `return String(value)` mutated to `return value` → 2 failed (the two integer cases); reverted.
- **Verification (Leader-inline):** jest `api/bilateral` 42/42 suites, 1092 tests (before prettier) and the new spec 14/14 after prettier; eslint on both files exit 0; tsc `api/bilateral` count 0.
- **Review:** written inline by the Leader at the user's direct request (2 files, DTO coercion). No Implementer/Reviewer pair, so this is recorded as such and is **not** a triad PASS. A Reviewer can audit it with the PR.
