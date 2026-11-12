# Design — Bilateral Innovation Use: `count_unit` / `use_nature` on actors

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Requirements | `./requirements.md` (BIF-R-1..11) |
| Depth | Standard |
| Ticket | P2-4106 |
| Status | approved (2026-11-10, Juan David — Phase gate "Continue") |
| Verified at | `c2053151b`; line refs re-checked on `performance-refactor` `72b8a2f8a` (2026-11-11) |
| Budget (Step 2.4) | **6 tasks · ~380 LOC (≈130 prod + ≈250 test/doc) · ~8 review rounds** — tripwire for `/akili-execute` |

## 1. Summary

The rules live in one place: a **pure function** next to the handler. It takes the payload's actors, with their resolved type ids, and returns either a 400 or the normalised actors plus the actor warnings. Two callers run it:

1. **New preflight hook `collectOutcomeWarnings`.** The service calls it next to the P2-4067 partner warnings, before the resubmission branch and before the create transaction. Every BIF 400 is therefore raised before any write, and the warnings reach `outcomes[].warnings` on both the `created`/`versioned` and the `updated` paths.
2. **`prepareActors` inside `afterCreate`.** It applies the same normalisation, so the rows written match what the preflight validated.

`InnovationUseService` (the shared writer) is **not changed**. The read mapper adds two keys. The QA AI payload is a separate, gated decision (BIF-DD-6).

## 1A. Premise Ledger

Count: **14 rows — 12 verified, 2 UNVERIFIED (1 High, 1 Low).**
Blast-radius triggers fired: **live-path** (the user action is `POST /create`, with a branch on `result_code` / operation), **shared-state** (the handler's `prepareActors` and the writer's actor match are read by several paths), **consumer** (`outcomes[].warnings` shape, the read actor shape, the QA payload).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `InnovationUseActorDto` declares neither field, and `/create` validates with `whitelist: true`, so both are stripped today | existence | `create-bilateral.dto.ts:427` class body; `grep -rn "count_unit" src/api/bilateral` → only `handlers/innovation-use.handler.ts:164`; `actors` uses `@ValidateNested({each:true}) @Type(() => InnovationUseActorDto)` at `create-bilateral.dto.ts:600-605` | c2053151b | T-2 (DTO) unnecessary; BIF-DD-2 test changes (High) | — |
| P-2 | The handler forces both fields to `null` | existence | `handlers/innovation-use.handler.ts:162-166` | c2053151b | Scope shrinks (Low) | — |
| P-3 | **Live path, no-code create:** `create` loop → partner warnings `bilateral.service.ts:388-396` → `updated` branch `:404` (resubmission) **or** `runResultTypePreflight` `:460` (MDS only, `validateBeforeCreate`) → `dataSource.transaction` `:492` → … → `runResultTypeHandlers` `:4582-4598` → `handler.afterCreate` → `resolveAndValidate` → `prepareActors`. So today **actor 400s fire inside the fake transaction, after the header is written** | live-path | lines as cited; `afterCreate` calls `resolveAndValidate` at `innovation-use.handler.ts:117` | c2053151b | BIF-DD-1 (preflight hook) unnecessary; orphan risk differs (High) | — |
| P-4 | **Live path, `updated` (resubmission):** `resubmit` → `preflight.validateTypeSpecificPayload` → `preflightTypeSpecificPayload` `bilateral.service.ts:5118-5124` → `runResultTypePreflight` + `handler.resolveAndValidate`, before its first write | live-path | `services/bilateral-resubmission.service.ts:113`; `bilateral.service.ts:4789-4791` | c2053151b | Resubmission would need its own call (Low) | — |
| P-5 | `dataSource.transaction` enrols no repository, so a throw inside it leaves an orphan result | other | comment + incident `bilateral.service.ts:468-474` ("result 11984 survived a 400") | c2053151b | BIF-DD-1 motive weakens (Low) | — |
| P-6 | Shared writer: a Farmers row without `result_actors_id` is matched by (result, section, type, `toCountUnit(...) ?? IsNull()`, `toUseNature(...) ?? IsNull()`); other types by (result, section, type[, other_actor_type for type 5]); a match is **updated** (last wins) | shared-state | `results-framework-reporting/innovation-use/innovation-use.service.ts:466-511` | c2053151b | BIF-R-5/R-11 need a writer change (High) | — |
| P-7 | `buildActorData` stores `toCountUnit`/`toUseNature` for **any** actor type (no type gate) and writes the breakdown fields as received | shared-state | `innovation-use.service.ts:651-686` | c2053151b | Non-applicable/households clearing could rely on the writer (Low) | — |
| P-8 | Callers of the writer's actor path: v2 controller, bilateral `afterCreate`, `innovation_dev.service.ts`, review-update in `results.service.ts` — the writer is shared, so changing it reaches the centre form | shared-state | `results-framework-reporting/innovation-use/CLAUDE.md` §"Seguimiento Farmers" (secondary) + `grep -rln "saveInnovationUse" src/api` → `ipsr/…step-one`, `ipsr/…step-three`, `results/summary/summary.{controller,service}`, `results-framework-reporting/innovation-use/innovation-use.{service,controller}`, `bilateral/handlers/innovation-use.handler.ts` | c2053151b | BIF-DD-3 (writer untouched) loses its motive (Low) | — |
| P-9 | Bilateral sends no 2030 block: the handler hard-codes `innov_use_2030_to_be_determined: true`, and the DTO has no 2030 field | existence | `innovation-use.handler.ts:102`; `grep -n "2030" create-bilateral.dto.ts` → no hit | c2053151b | Scope grows to the FUTURE section (High) | — |
| P-10 | Read consumers of `mapInnovationUseBilateralActor`: GET `/:id` summary `bilateral.service.ts:3001`, per-section S1/S2 `:3673`, `:3685`. Output keys today: `actor_type_name`, `other_actor_type` (type 5), `sex_and_age_disaggregation`, `addressing_demands`, then `how_many` or the four breakdown figures | consumer | `bilateral.service.ts:2923-2955`; `grep -n "mapInnovationUseBilateralActor" src/api/bilateral/*.ts src/api/bilateral/services/*.ts` → 3 call sites | c2053151b | T-4 adds the keys elsewhere (Low) | — |
| P-11 | `outcomes[].warnings` consumers inside the repo: only `bilateral.service.ts:761-769` writes it, and the tests pin partner warnings by code (`bilateral.service.spec.ts:2549`, `:6677-6678`). `createdResults` is an untyped `[]` (`:357`). `BilateralPartnerWarning` is referenced only in `bilateral.service.ts` | consumer | `grep -rn "BilateralPartnerWarning" src --include="*.ts" -l` → 1 file; `grep -rln "partner_unresolved" src --include="*.spec.ts"` → `bilateral.service.spec.ts` (+2 unrelated suites) | c2053151b | Type widening touches more files (Low) | — |
| P-12 | The QA AI payload has **no per-actor list**: Innovation Use `type_specific.fields` is a frozen label set (`User types` string[], `Number of people using` totals, …) validated **strictly** on the AI side, and the payload feeds `content_hash` | consumer | `services/quality-assessment/mappers/type-specific.mapper.ts:288-334`; `field-labels.ts:33-38`; `docs/bilateral-module/integration-contracts.md:724` ("frozen and validated strictly … notify Daniela"); hash `bilateral-quality-assessment.service.ts:104-107` | c2053151b | BIF-DD-6 could ship without coordination (High) | — |
| P-13 | The AI side accepts an **added** optional label without a `contract_version` bump (precedent: "additive and optional both ways — `contract_version` stays 0.2") | data-env | `UNVERIFIED — confirm at source before relying on it` (precedent at `integration-contracts.md:785` is for a different key; the strict-validation sentence at `:724` covers missing/renamed labels only) | — | T-6 needs a version bump + AI-side release (High) | **Not settleable (2026-11-11):** the former AI QA owner (Daniela) left and the AI QA project has no owner. T-6 deferred out of this spec |
| P-14 | The live green check `validation_innovation_use_P25` excludes `source = 'API'`, so storing answers on bilateral rows changes no green/red | data-env | `UNVERIFIED — confirm at source before relying on it` (repo copy is stale per `results-framework-reporting/innovation-use/CLAUDE.md` "Trampas"; live body in `docs/specs/archive/2026-11-03-changes--innovation-use-farmer-count-nature/sql/`) | — | A bilateral row could flip green state (Low — bilateral MDS uses `InnovationUseMdsValidator`, not the function) | T-6/T-7 HITL — `SHOW CREATE FUNCTION` on prtest (Juan David) |

## 2. Architecture Overview

### 2.1 Where this lives

| Piece | File | Change |
|---|---|---|
| Rules (pure) | `src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.ts` (new) + `.spec.ts` | New |
| Applicability switch | `src/api/results/result-actors/farmer-follow-up.constant.ts` | Two exported predicates (BIF-DD-4) |
| DTO | `src/api/bilateral/dto/create-bilateral.dto.ts` (`InnovationUseActorDto`) | Two optional fields + Swagger |
| Handler | `src/api/bilateral/handlers/innovation-use.handler.ts` | `prepareActors` uses the rules; new `collectOutcomeWarnings` |
| Handler interface | `src/api/bilateral/handlers/bilateral-result-type-handler.interface.ts` | Optional `collectOutcomeWarnings?` |
| Service | `src/api/bilateral/bilateral.service.ts` | Call the hook beside partner warnings; warning union type; read mapper keys |
| Contract doc | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | §3 actors + "Ingestion — actor follow-up" + change log |
| QA AI payload (gated) | `services/quality-assessment/{field-labels.ts, mappers/type-specific.mapper.ts}` + `docs/bilateral-module/integration-contracts.md` | Only if T-6's HITL says go |

### 2.2 Sequence (no-code create)

1. Validation pipe → DTO with the two fields kept (P-1 fixed).
2. Partner warnings (`:388`) → **actor hook** → actor warnings or a 400. Nothing has been written yet.
3. Branch: an `updated` target → resubmission (its preflight re-runs `resolveAndValidate`, P-4). Otherwise → MDS preflight → transaction → header → `afterCreate` → `prepareActors` (the same rules, now normalising only) → writer.
4. The outcome row gets `warnings = [...partner, ...actor]`.

## 3. Data Model Changes

None. The columns exist (`result_actors.count_unit` / `use_nature`, migration `1793300000000`). No migration.

## 4. API Surface

### 4.1 `POST /api/bilateral/create` — input (additive)

`innovation_use.current_innovation_use_numbers.actors[]` gains `count_unit?: string | null` and `use_nature?: string | null`. They are declared as optional strings, so the whitelist keeps them. The value is checked by the rules, not by `@IsIn`, so that the 400 message has the handler's `actors[i].field` form (BIF-DD-2).

### 4.2 `POST /create` — response (additive)

`response.outcomes[].warnings[]` may now also hold **actor warnings**: `{ field: "innovation_use.actors", index, code, message }`. The possible codes are `actor_count_unit_missing`, `actor_use_nature_missing`, `actor_count_unit_not_applicable`, `actor_use_nature_not_applicable` and `actor_duplicate_merged`. `index` is the position in `current_innovation_use_numbers.actors[]`. Partner warnings come first, unchanged.

### 4.3 `GET /api/bilateral/:id` — read (additive)

Every Innovation Use actor object gains `count_unit` and `use_nature` (string or `null`), in every section the endpoint returns (P-10).

### 4.4 400 messages (exact form, for the contract doc)

| Case | Message |
|---|---|
| Invalid count_unit | `actors[<i>].count_unit must be one of: households, individuals; received "<v>".` |
| Invalid use_nature | `actors[<i>].use_nature must be one of: information_received, innovation_applied; received "<v>".` |
| Households without total | `actors[<i>].how_many is required when count_unit is households.` |

## 5. Server Workflow / Business Rules

The rules function, applied per actor `i`, with its resolved type id, in this order:

| Step | Condition | Effect |
|---|---|---|
| 1 | The field is absent, `null` or `''` | The field counts as empty |
| 2 | The field is non-empty and not an allowed code (exact case), on **any** type | 400 (BIF-R-2) |
| 3 | `count_unit` is non-empty and the type is not Farmers | Drop it; warning `actor_count_unit_not_applicable` |
| 4 | `use_nature` is non-empty and `asksUseNature(type)` is false | Drop it; warning `actor_use_nature_not_applicable` |
| 5 | Farmers and `count_unit` is empty | Warning `actor_count_unit_missing` |
| 6 | `asksUseNature(type)` and `use_nature` is empty | Warning `actor_use_nature_missing` |
| 7 | Farmers and `count_unit = households` and `how_many` is empty | 400 (BIF-R-4) |
| 8 | Farmers and `count_unit = households` | Clear women/men/youth and the `has_*` flags; set `sex_and_age_disaggregation = true` |
| 9 | After the loop: two Farmers rows without `result_actors_id` share the same (`count_unit`, `use_nature`), with empty = empty | Warning `actor_duplicate_merged` on the later index (BIF-R-11, P-6) |

Each payload's 400s fire on the **first** failing actor, in index order. The youth-within-gender check (`validateYouthWithinGender`) runs **after** step 8, so a households row never trips it (BIF-R-3 `BUT`). Rows with `is_active === false` and rows without a resolvable type follow the existing behaviour, which they already have.

## 6. Frontend Plan

None.

## 7. Security & Authorization

Unchanged posture (JWT-off bilateral surface). Messages carry the index and the rejected code only. Logs carry counts by code, never payload bodies or emails (AC-9).

## 8. Performance & Capacity

The hook resolves actor types once more in the preflight. That is one indexed `actor_type` lookup per actor that is sent by name, and catalogue-sized. It is acceptable: actors per result are ≤ ~10 in practice — `UNVERIFIED` sizing, Low; there is no NFR that it could break.

## 9. Observability

One `logger.log` per result when it has actor warnings: `result <code>: <n> actor warning(s) (<codes>)`. This mirrors the partner log at `bilateral.service.ts:6337-6341`.

## 10. Testing Plan

| Layer | What | File |
|---|---|---|
| Pure rules | Every row of §5 and its falsifier; switch flip (BIF-R-9) | `handlers/innovation-use-actor-follow-up.rules.spec.ts` (new) |
| DTO | The real `ValidationPipe({ whitelist: true, transform: true })` over a `RootResultsDto` keeps both fields | `dto/create-bilateral.dto.spec.ts` (new, or extend an existing DTO spec if one exists — T-2 greps) |
| Handler | `collectOutcomeWarnings` returns warnings / throws; `prepareActors` output to the writer mock (households cleared, codes kept, dropped off non-Farmers, nulls not forced) | `handlers/innovation-use.handler.spec.ts` |
| Service | The hook runs before `dataSource.transaction`, and a 400 means no `transaction` call; `outcomes[].warnings` = partner ⧺ actor, with the partner entries deep-equal to today's | `bilateral.service.spec.ts` |
| Read | The mapper emits both keys for Farmers, non-Farmers, and households rows | `bilateral.service.spec.ts` |
| Writer interaction | Two Farmers rows with different pairs → two `save` calls; the same pair → one `save` + one `update` (documents P-6) | `results-framework-reporting/innovation-use/innovation-use.service.spec.ts` (read-only proof; no writer code change) |
| Type | `npx tsc --noEmit -p tsconfig.json` | — |
| E2E | Manual on PRMS TEST (BIF-AC-11) | HITL |

## 11. Backwards Compatibility & Migration Plan

- Old payloads produce the same rows as today. Farmers rows still end up with NULL codes, just as the forced null did, plus warnings.
- New behaviour on the no-code path: **actor-type 400s now also fire in the preflight.** The hook resolves types, so an invalid `actor_type_name` that used to leave an orphan header behind (P-3, P-5) now leaves nothing behind. The message and status are unchanged. This is a fix, not a reversion — recorded under BIF-DD-1.
- Rollback = revert the commit. No data to undo: rows written while the change was live hold valid codes in existing columns.

## 12. Design Decisions

### BIF-DD-1 — Validate and warn in a new preflight hook, not only in `afterCreate`

- **Decision:** add the optional handler hook `collectOutcomeWarnings({ bilateralDto })`. It returns the actor warnings or throws the BIF 400s. The service calls it right after the partner warnings (`:388`), before the `updated` branch, so both paths get the result.
- **Why:** P-3 shows that `afterCreate` runs after the header write inside a transaction that does not roll back (P-5). The warnings also have to exist before the outcome row is built.
- **Rejected:** (a) `validateBeforeCreate` returns `void`, and widening its contract changes the MDS hook every handler uses; (b) catching the 400 in `afterCreate` leaves the orphan in place.
- **Reversion challenge (Step 2.3):** n/a — nothing is removed. Side effect named in §11 (earlier actor-type 400s).

### BIF-DD-2 — Optional strings in the DTO, codes checked by the rules

- **Decision:** `@IsOptional() @IsString()` plus `@ApiPropertyOptional({ enum })`; no `@IsIn`.
- **Why:** `@IsIn` would return class-validator's generic array message instead of the handler's `actors[i].field` form (requirements BIF-R-2). A type-only check keeps one owner for the code rule.
- **Rejected:** `@IsIn`, because there would be two owners of the code rule with different messages.

### BIF-DD-3 — Shared writer untouched

- **Decision:** all normalisation happens in the handler before `saveInnovationUse`. `InnovationUseService` stays as it is.
- **Why:** the writer has 4+ callers, including the centre form (P-8). Its Farmers match key already gives BIF-R-5 (P-6). Dropping codes off non-Farmers rows and clearing households both happen before the writer, so its lack of a type gate (P-7) is harmless.
- **Rejected:** type-gating in `buildActorData`, which would change P2-4048-verified centre-form behaviour for a W3 need.

### BIF-DD-4 — The applicability switch is two predicates in the constants file

- **Decision:** `asksCountUnit(typeId)` (always `=== FARMERS_ACTOR_TYPE_ID`) and `asksUseNature(typeId)` (today `=== FARMERS_ACTOR_TYPE_ID`), exported from `farmer-follow-up.constant.ts`. The rules function reads only these.
- **Why:** BIF-R-9. If SO picks "every type", only `asksUseNature` and its tests change on the bilateral side. **Caveat (recorded for BIF-OQ-1):** under that choice, two non-Farmers rows of the same type with different `use_nature` would still be merged by the writer (P-6). That follow-up has to extend the writer's match key, and that touches the centre form.
- **Rejected:** a config flag or a global parameter — runtime switchability is not required, and it would add a test matrix.

### BIF-DD-5 — Actor warnings share the P2-4067 channel with a widened type

- **Decision:** add `BilateralActorWarning { field: 'innovation_use.actors'; index; code; message }` and `BilateralOutcomeWarning = BilateralPartnerWarning | BilateralActorWarning`. Partner warnings come first in the array.
- **Why:** the Fetcher already reads `outcomes[].warnings` (P2-4067), and a single array is additive. The `field` discriminator tells the two kinds apart.
- **Rejected:** a separate `actor_warnings` key, because consumers would need a second read path.

### BIF-DD-6 — QA AI payload: gated, separate task

- **Decision:** the requirement to show the answers "in the QA payload" (BIF-R-8, second half) is **deferred out of this spec** (2026-11-11). It needs an AI QA owner to confirm an additive optional label, and the former owner (Daniela) left with nobody assigned to the project. The proposed label, kept for whoever picks it up, is `"User type follow-up": [{ user_type, count_unit, use_nature, how_many }]` for Farmers rows. GET `/:id` carries the data meanwhile.
- **Why:** P-12 — the labels are frozen and strictly validated, and the payload feeds `content_hash`, so adding a key changes the hash of every Innovation Use result and invalidates stored verdicts on the next run. P-13 is unverified.
- **Rejected:** (a) shipping the label without coordination, which risks rejection by the AI and a forced re-assessment of every IU result; (b) folding the answers into the `User types` strings, which is a rename of frozen values.

### BIF-DD-7 — `use_nature`/`count_unit` invalid codes rejected on any type

- **Decision:** step 2 of §5 runs before the applicability steps.
- **Why:** BIF-R-2 `AND IT MUST`. A code that is not in the vocabulary is a producer bug whatever the actor type, and it matches how `actor_type_name` is resolved.

## 13. Open Gaps & Follow-ups

- **BIF-OQ-1 (SO)** — `use_nature` for every type → flip `asksUseNature` and extend the writer's match key; a centre-form ticket if they want it there too.
- **P-13 / T-6** — AI QA label deferred: no owner for the AI QA service since Daniela left (2026-11-11). Re-open as its own ticket once someone owns the contract.
- **P-14** — confirm the live green-check exclusion on prtest at the T-7 HITL.
- Pre-existing, **out of scope**: other validations raised inside `afterCreate` for other types can still orphan a header (P-3/P-5 pattern). Note it on the ticket, not here.

## Required cross-references

`docs/prd.md` AC-1, AC-4, AC-9 · `docs/trd/trd.md` bilateral ingestion · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` §3 + change log · `docs/bilateral-module/integration-contracts.md` (T-6 only) · archived spec `2026-11-03-changes--innovation-use-farmer-count-nature`.
