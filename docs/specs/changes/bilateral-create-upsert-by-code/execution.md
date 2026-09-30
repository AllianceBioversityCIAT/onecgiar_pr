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

1. **Risk / spec gap:** `R-8` says a rejected request leaves the DB unchanged, but `DD-1` resolves per result, so in a batch where #1 has no code and #2 has a bad code, #1 is already written. Needs a user decision (per result vs per request). Escalated at the T-1 gate.
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
