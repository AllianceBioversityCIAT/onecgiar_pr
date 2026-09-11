# Tasks — Bilateral "Update result": enforce lead-Centre authorization

## 1. Scope of this task list

Three tasks in `onecgiar-pr-server` only. Covers `VER-R-1` … `VER-R-4` and defect classes D1–D5 from `requirements.md` §9.

- **Spec:** `bugfix/p2-3652-bilateral-versioning-guard-dead-branch` · **Depth:** Lite · **Mode:** Bug
- **Budget (`design.md` §13):** 3 tasks · ~120 LOC · 1 review round
- **Branch:** cut from `performance-refactor`
- **Skills (from `.agents/model-routing.md` Skill Map):** `nestjs-expert` (all tasks), `tdd` (T1, T2), `systematic-debugging` (already applied in the proposal; no re-diagnosis needed)

## 2. Pre-flight checklist

- [x] Working tree clean; branch cut from an up-to-date `performance-refactor` (HEAD was 5 commits behind at spec time)
- [x] `npx jest --silent --reporters=summary --forceExit --testPathPattern="versioning"` green **before** starting, so T1's red is attributable to T1
- [x] Re-confirm the branch before committing — a checkout in another terminal can carry changes across

## 3. Task list

### `VER-T-1` — Regression tests that fail on current code

| Field | Value |
|---|---|
| Status | [x] complete — Reviewer PASS attempt 2 of 3, 2026-09-11 (see `execution.md`) |
| Size | M |
| Depends on | none — **this task must land red before `VER-T-2` exists** |
| Requirements | `VER-R-1`, `VER-R-2`, `VER-AC-1`, `VER-AC-2`, `VER-AC-4` |
| Design | `design.md` §10, §2.2 |
| Skills | `nestjs-expert`, `tdd` |

**Scope.** In `src/api/versioning/versioning.service.spec.ts`, add tests that drive `versionProcess` for a W3/Bilateral result while mocking `getOwnerInitiativeByResult` with the repository's **real** row shape — `{ id, official_code, initiative_name, short_name, initiative_role_id, from_toc, is_active }` and **no `inititiative_id`**:

1. Non-lead-Centre, non-admin user → rejects with 403 whose message names the lead Centre, and `$_versionManagement` is never called.
2. Lead-Centre user → the guard runs and the carry-forward proceeds.
3. Platform admin (`role_id = 1`) → proceeds.

Do **not** touch the existing mock at `:109` in a way that hides the defect; these tests supply their own `mockResolvedValueOnce` with the real shape.

**Tests / verification.** `npx jest --silent --reporters=summary --forceExit --testPathPattern="versioning"`

**Disqualifier.** All three tests **must fail on current code** — test 1 because a row is written instead of a 403. A green run at this point is not a pass, it means the test is not reaching `versionProcess`'s bilateral path (most likely the fixture lacks `source: 'API'` or the repository mock returns early). Report the failure mode rather than adjusting the assertion to match current behavior.

**Falsifying input.** Setting the fixture's `source` to `'Result'` makes test 1 pass while proving nothing — which is exactly why the fixture's `source` must be asserted in the test body, not only in the mock.

**Done.** Three tests exist, all red, each failing for the stated reason and not for a setup error.

---

### `VER-T-2` — Route genuine bilaterals to `versionProcessV2`

| Field | Value |
|---|---|
| Status | [x] complete — Reviewer PASS attempt 1, 2026-09-11 (see `execution.md`) |
| Size | S |
| Depends on | `VER-T-1` |
| Requirements | `VER-R-1`, `VER-R-2`, `VER-R-3`, `VER-R-4` |
| Design | `design.md` §5, `VER-DD-1`, `VER-DD-2`, `VER-DD-3` |
| Skills | `nestjs-expert` |

**Scope.** In `src/api/versioning/versioning.service.ts`:

1. Add a private predicate that answers *is this a genuine W3/Bilateral carry-forward?* — `result.source === SourceEnum.Bilateral` **AND** the primary submitter's `official_code !== 'SGP-02'`, reading `official_code` from `getOwnerInitiativeByResult`. The lookup runs **only** when `source` is already `'API'`.
2. In `versionProcess`, immediately after the `legacy_result` null check and **before** the `result_type_id == 6` check, delegate when the predicate holds: resolve the entity via `BilateralVersioningRulesService.resolveTargetEntityId` and `return await this.versionProcessV2(legacy_result.id, entityId, user)`.
3. Leave the existing `if (ownerInitiative?.inititiative_id)` block untouched — it is `VER-OQ-1`, a separate ticket.

Add a test for `VER-R-4` / `VER-AC-6`: a result with `source: 'API'` whose owner initiative's `official_code` is `'SGP-02'` takes the legacy path and never calls the guard.

**Tests / verification.**
`npx jest --silent --reporters=summary --forceExit --testPathPattern="versioning|bilateral"`
`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
`npx tsc --noEmit`

**Disqualifier.** `VER-T-1`'s three tests must now be green **and** every previously-passing test in the versioning suite must still pass with **no assertion edited** — in particular `versioning.service.spec.ts:288-299` (the KP message), whose fixture has no `source` and therefore must keep taking the untouched path. A green suite obtained by editing an existing expectation is a failed task, not a passing one: it means the change reached W1/W2 (defect class D2).

**Falsifying input.** Dropping the `SGP-02` condition makes the AVISA test fail; placing the delegation before the `source` test makes the KP test at `:288` fail. Both are wired.

**Done.** All of `VER-T-1` green, AVISA test green, full versioning + bilateral suites green with zero assertions modified, lint and typecheck clean.

---

### `VER-T-3` — Contract test on the owner-initiative row shape

| Field | Value |
|---|---|
| Status | [x] complete — Reviewer PASS attempt 1, 2026-09-11 (see `execution.md`) |
| Size | S |
| Depends on | none (parallel-safe with `VER-T-1`) |
| Requirements | `VER-R-1` (defect class **D4**) |
| Design | `design.md` §10 |
| Skills | `nestjs-expert` |

**Scope.** Add a test asserting that `getOwnerInitiativeByResult`'s SQL selects the columns its callers read — `id`, `official_code`, `initiative_name`, `short_name`, `initiative_role_id`, `from_toc`, `is_active` — and that it does **not** advertise `inititiative_id`. Assert against the query string the repository issues (capture the `query` call argument), not against a hand-built row.

**Tests / verification.** `npx jest --silent --reporters=summary --forceExit --testPathPattern="resultByInitiatives|results_by_inititiatives"`

**Disqualifier.** This is a **presence assertion over SQL text** — it proves the columns are named in the statement, not that MySQL returns them, and not that the schema still has them. It cannot catch a renamed database column; that class is covered operationally by the prtest deploy and is recorded as the accepted risk in `requirements.md` §9. Do not describe this test as proving the query works.

**Falsifying input.** Removing `official_code` from the `SELECT`, or reintroducing `inititiative_id` into the assertion list without adding it to the SQL, must fail it.

**Done.** Test exists and fails when a selected column is removed from the query.

## 4. Dependency graph

```
VER-T-1 (red)  ──►  VER-T-2 (green)
VER-T-3        ──┘   (independent; may run in parallel with VER-T-1)
```

No cycles. `VER-T-2` is the only task that touches production code.

## 5. Coverage map

Every scenario and strict clause owns a task:

| Requirement / clause | Owned by |
|---|---|
| `VER-R-1` — guard runs before any write | `VER-T-1` (tests 1-3), `VER-T-2` |
| `VER-R-2` — 403 naming the lead Centre | `VER-T-1` test 1 |
| `VER-R-2` · *BUT must NOT depend on the client hiding the action* | `VER-T-1` test 1 — calls the service directly, no client involved |
| `VER-R-2` · *AND IT MUST behave identically from both entry points* | `VER-T-2` — both entry points post to the same route with no body; one server path serves both |
| `VER-R-3` — W1/W2 untouched | `VER-T-2` disqualifier (unmodified suite, `:288` fixture) |
| `VER-R-3` · *BUT must NOT acquire the bilateral refusals* | `VER-T-2` — existing W1/W2 tests assert the legacy outcomes |
| `VER-R-4` — AVISA excluded | `VER-T-2` AVISA test |
| `VER-R-4` · *BUT must NOT be asked for a lead Centre* | `VER-T-2` AVISA test asserts the guard is never called |
| `VER-AC-3` — non-approved refused server-side | `VER-T-2` — reached through the rules service, already covered by `bilateral-versioning-rules.service.spec.ts` |
| `VER-AC-4` — real row shape | `VER-T-1` fixtures, `VER-T-3` |
| Defect class D4 | `VER-T-3` |

## 6. Rollout & verification

| Step | Command |
|---|---|
| Scoped suites | `npx jest --silent --reporters=summary --forceExit --testPathPattern="versioning\|bilateral"` |
| Lint | `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` |
| Types | `npx tsc --noEmit` |
| Migrations | `npm run migration:check` — must report none pending (this spec adds none) |

Never run the full server suite unscoped — it has taken the session down with OOM.

**PR strategy:** a single PR. ~120 LOC in one module, one reviewer pass. Open against `performance-refactor`, not `staging`.

## 7. Cleanup & follow-ups

| ID | Item | Route |
|---|---|---|
| `VER-OQ-1` | Dead `?.inititiative_id` still disables the "P25 must use V2" conflict for W1/W2 | New ticket |
| `VER-OQ-2` | Count rows already created without authorization **before** this ships | Operational, ask Ángel/Cris |
| `VER-OQ-3` | Modal's `isBilateral` lacks the AVISA carve-out | New ticket |
| — | P2-3229 returns to UAT only once `bugfix/p2-3653-*` also lands | Sequencing |

## 8. Roll-back plan

Revert the single commit. No migration, no data change, no payload change — reverting restores the previous (defective) behavior exactly.

## Required cross-references

- `./requirements.md`, `./design.md`, `./proposal.md`
- `docs/prd.md` — `AC-3`, `AC-5` · `docs/trd/trd.md` — §5 W2, §8
