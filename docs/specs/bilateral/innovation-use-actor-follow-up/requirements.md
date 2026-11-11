# Requirements — Bilateral Innovation Use: `count_unit` / `use_nature` on actors

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `innovation-use-actor-follow-up` |
| Owner | Juan David Delgado |
| Status | approved (2026-11-10, Juan David — Phase gate "Continue") |
| Depth | **Standard** (additive public-API contract change, single module, no migration) |
| Type | Change |
| Deliverable | software |
| Proposal | `./proposal.md` (Option A; OQ-1..3 resolved 2026-11-10) |
| Ticket | P2-4106 (Enhancement, epic P2-3094) · extends P2-4048 · reuses the P2-4067 warning channel |
| Approval Mode | gated |
| Decisions | Santiago Sánchez, Slack 2026-11-10: Farmers only for both fields (Marc Schut's original request); non-applicable code → ignore + warning; Households without total → 400 |
| Pending external input | SO (Nicoleta Trifa) clarification on `use_nature` for every actor type — email 2026-11-10. Does not block this spec; see BIF-R-9 |

## 1. Context

P2-4048 added two answers to Innovation Use **Farmers** actor rows in the centre form: `count_unit` (`households` \| `individuals`) and `use_nature` (`information_received` \| `innovation_applied`). Bilateral ingestion drops both today, at two points:

- The ingestion DTO `InnovationUseActorDto` does not declare them (`onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts:427` — no `count_unit`/`use_nature` in the class; `grep -rn "count_unit" src/api/bilateral` hits only the handler), and `/create` validates with `whitelist: true` (`src/api/bilateral/CLAUDE.md` §4), so they are stripped on input.
- The handler then overwrites both with `null` (`src/api/bilateral/handlers/innovation-use.handler.ts:162-166`).

The shared writer already stores the whitelisted codes and tells Farmers rows apart by `(actor_type_id, count_unit, use_nature)` (`src/api/results-framework-reporting/innovation-use/innovation-use.service.ts:490-496`, `:683-685`). The W3 bulk upload tool needs the API to accept them (email "Change for innov use", 10 Nov 2026).

Cross-references: `docs/prd.md` AC-1 (typed result integrity), AC-4 (bilateral stability — additive only), AC-9 (no secrets/PII in logs). `docs/trd/trd.md` bilateral ingestion (W-bilateral create). Contract: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`. UI: none (`docs/ux-ui/design.md` not affected).

## 2. Glossary

| Term | Meaning |
|---|---|
| Farmers row | An actor whose resolved `actor_type_id` is 1 (*Farmers/(agro)pastoralists/herders/fishers*), sent by id or by `actor_type_name` |
| Answer pair | The (`count_unit`, `use_nature`) values of one actor row |
| Single total | Only `how_many` is stored; women/men/youth figures and their `has_*` flags are empty and `sex_and_age_disaggregation = true` — the centre form's Households path |
| Actor warning | One entry on `response.outcomes[].warnings` describing a single actor, beside the P2-4067 partner warnings |
| Allowed codes | Exactly `households`, `individuals` (count_unit) and `information_received`, `innovation_applied` (use_nature), exact case |

## 3. In Scope / Out of Scope

### In scope

- `innovation_use.current_innovation_use_numbers.actors[]` on `POST /api/bilateral/create`, including the `updated` (resubmission) path, which re-runs the same handler preflight (`services/bilateral-resubmission.service.ts:113`).
- Storage rules, rejection rules, actor warnings.
- Both fields on every actor in `GET /api/bilateral/:id` (the AI QA payload is deferred — see BIF-R-8).
- Payload contract doc + change log, Swagger.
- A field-alignment table for the Fetcher schema and the PRMS Normalizer Technical Field Documentation (§10).

### Out of scope

Centre form, green check (`validation_innovation_use_P25` excludes `source = 'API'` — see design Premise Ledger), QA catalog, IPSR, Innovation Development anticipated users, phase ≤ 2025 results, households-to-people conversion, a bilateral 2030 projection block (not ingested today: `innovation-use.handler.ts:102` hard-codes `innov_use_2030_to_be_determined: true`), the Fetcher, the bulk upload tool, the Excel template, migrations.

## 4. Personas Affected

| Persona | Effect |
|---|---|
| Bilateral consumer — producer (SO bulk uploader, MEL, IITA, …) | Can send both fields; producers that do not send them keep working and receive warnings |
| Bilateral consumer — reader (GET `/:id`, downstream) | Two new nullable fields on each actor |
| QA reviewer / AI QA | Not affected in this spec (QA payload deferred — BIF-R-8) |
| Centre reporter | Indirect: can complete empty answers in PRMS after ingestion (centre form unchanged) |

## 5. User Stories

- **BIF-US-1** — As a W3 producer, I want to send the Farmers unit and nature on each actor, so that W3 results carry the same data as W1/W2. *Refines AC-1.*
- **BIF-US-2** — As an existing producer, I want results without these answers to still be accepted, so that my integration does not break. *Refines AC-4.*
- **BIF-US-3** — As a producer, I want to be told which actor rows are incomplete or carried an answer that does not apply, so that the centre can fix them.

## 6. Functional Requirements

### Required (MUST)

#### BIF-R-1 — Accept the two fields

The system MUST accept optional `count_unit` and `use_nature` strings on each `current_innovation_use_numbers.actors[]` entry and store them on Farmers rows exactly as sent when they are allowed codes.

##### Scenario: Farmers individuals, information received

- GIVEN an Innovation Use payload with one Farmers actor `{ count_unit: "individuals", use_nature: "information_received", women: 40, men: 60, how_many: 100 }`
- WHEN it is posted to `/api/bilateral/create`
- THEN the stored actor row has `count_unit = individuals`, `use_nature = information_received`, and its women/men/how_many as sent
- AND IT MUST behave the same when the actor is identified by `actor_type_name` instead of `actor_type_id`
- BUT the request validation MUST NOT strip either field before the handler reads it

#### BIF-R-2 — Invalid code is a 400

A value present (non-null, non-empty) that is not an allowed code MUST reject the request with HTTP 400 naming the actor position, the field, the received value and the allowed values, before anything is written.

##### Scenario: Unknown nature

- GIVEN a Farmers actor at index 1 with `use_nature: "applied"`
- WHEN it is posted
- THEN the response is 400 with a message naming `actors[1].use_nature`, `"applied"`, and `information_received, innovation_applied`
- AND no result, actor, or other row is created
- BUT a different-case spelling (`"Households"`) MUST also be a 400 — codes are exact-case
- AND IT MUST apply the same check to any actor type, because an invalid code is invalid wherever it appears

#### BIF-R-3 — Households means a single total

On a Farmers row with `count_unit = households`, the system MUST store only `how_many`; women, men, women_youth, men_youth and their `has_*` flags MUST be stored empty, and `sex_and_age_disaggregation` MUST be `true`.

##### Scenario: Households with a breakdown sent

- GIVEN a Farmers actor `{ count_unit: "households", use_nature: "innovation_applied", how_many: 500, women: 200, men: 300, women_youth: 250 }`
- WHEN it is posted
- THEN the stored row has `how_many = 500`, every breakdown figure and flag empty, `sex_and_age_disaggregation = true`
- BUT the youth-within-gender check MUST NOT reject this row (here `women_youth 250 > women 200` would otherwise be a 400)
- AND IT MUST NOT add any warning about the discarded breakdown — discarding it is the documented rule

#### BIF-R-4 — Households without a total is a 400

A Farmers row with `count_unit = households` and no `how_many` (absent, null, or empty) MUST be rejected with HTTP 400 naming `actors[i].how_many`.

##### Scenario: Households, breakdown only

- GIVEN a Farmers actor `{ count_unit: "households", women: 200, men: 300 }` with no `how_many`
- WHEN it is posted
- THEN the response is 400 `actors[i].how_many is required when count_unit is households`
- BUT the system MUST NOT compute a total from the breakdown

#### BIF-R-5 — Farmers more than once

Farmers rows of one result whose answer pairs differ MUST be stored as separate rows.

##### Scenario: Mixed groups

- GIVEN two Farmers actors, `individuals`/`information_received` with `how_many: 3800` and `individuals`/`innovation_applied` with `how_many: 1200`
- WHEN it is posted
- THEN the result has two active Farmers rows with those values
- BUT the two numbers MUST NOT be summed or merged

#### BIF-R-6 — Missing answer is a warning, not a rejection

When a Farmers row lacks `count_unit` or `use_nature` (absent, null, or empty string), the system MUST accept the result, store that field empty, and add one actor warning per missing field.

##### Scenario: Existing producer payload

- GIVEN a payload shaped like today's MEL/IITA payloads: one Farmers actor at index 0 with neither field
- WHEN it is posted
- THEN the response is 201, the actor row has both fields empty
- AND `outcomes[0].warnings` contains `{ field: "innovation_use.actors", index: 0, code: "actor_count_unit_missing", message }` and `{ field: "innovation_use.actors", index: 0, code: "actor_use_nature_missing", message }`
- AND IT MUST still return the P2-4067 partner warnings of the same result, unchanged in shape, in the same array
- BUT a result with `innov_use_to_be_determined = true` (no actors) MUST NOT produce actor warnings

#### BIF-R-7 — Non-applicable answer is ignored with a warning

An allowed code sent on a non-Farmers actor MUST NOT be stored, MUST NOT reject the request, and MUST add one actor warning per such field: `actor_count_unit_not_applicable` / `actor_use_nature_not_applicable`.

##### Scenario: Researchers with both fields

- GIVEN an actor of type 2 at index 0 with `count_unit: "households"` and `use_nature: "innovation_applied"`, and women/men figures
- WHEN it is posted
- THEN the response is 201, the row has both fields empty and its women/men figures as sent
- AND `outcomes[0].warnings` contains both `*_not_applicable` entries for index 0
- BUT `households` on a non-Farmers row MUST NOT trigger the single-total rule of BIF-R-3
- AND IT MUST NOT produce `*_missing` warnings for non-Farmers rows that send nothing

#### BIF-R-8 — Read surfaces return both fields

`GET /api/bilateral/:id` (every Innovation Use actor section it returns) MUST include `count_unit` and `use_nature` on every actor, `null` when empty.

> **Scope change (2026-11-11, Juan David):** the AI QA payload half is deferred. Its labels are frozen and strictly validated, and the AI QA service has no owner since Daniela left, so nobody can confirm an added label (design BIF-DD-6, tasks BIF-T-6).

##### Scenario: Read back mixed groups

- GIVEN the result created by the BIF-R-5 scenario
- WHEN `GET /api/bilateral/:id` is called
- THEN each Farmers actor carries its own `count_unit` and `use_nature`
- AND a non-Farmers actor carries both keys with `null`
- BUT no existing actor key MUST be renamed or removed (AC-4)

#### BIF-R-9 — The Farmers-only rule is one switch

Which actor types the `use_nature` question applies to MUST be decided in exactly one place, so that a later SO decision ("every actor type") changes that place and its tests only on the bilateral side.

##### Scenario: Rule switched (verification of the seam, not shipped behavior)

- GIVEN the applicability rule is changed to "every actor type"
- WHEN the handler tests run
- THEN only the BIF-R-7 `use_nature` expectations change
- BUT `count_unit` MUST remain Farmers-only regardless of that switch

#### BIF-R-10 — Contract documented

The payload contract doc MUST describe both input fields, all rules above, the four warning codes, the two read fields, and carry a change-log row; Swagger on `InnovationUseActorDto` MUST describe both fields with their allowed values.

### Should (SHOULD)

#### BIF-R-11 — Same answer pair twice is reported

When two Farmers rows of one payload carry the same answer pair (both missing included), the shared writer stores them as one row — last one wins (`innovation-use.service.ts:490-496`). The system SHOULD add an actor warning `actor_duplicate_merged` on the later row's index so the producer learns a number was overwritten. It MUST NOT reject (that would break payloads accepted today).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Additive only (AC-4): new optional input fields, new nullable read fields, new warning codes in an existing array. A payload without the fields produces the same stored rows as today, plus warnings |
| Performance | No added DB round-trip per actor; checks are in-memory on the payload already loaded |
| Atomicity | Every 400 of this spec is raised in the preflight, before the create transaction (team rule: abort-validations go before `dataSource.transaction`) |
| Security / privacy | Warning messages and logs carry codes and indexes only — no payload values beyond the rejected code, no emails (AC-9) |
| Observability | One log line per result with the count of actor warnings by code, no payload body |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| BIF-AC-1 | BIF-R-1 scenario | POST | codes stored on the Farmers row |
| BIF-AC-2 | BIF-R-2 scenario (and `"Households"`) | POST | 400, nothing written |
| BIF-AC-3 | BIF-R-3 scenario | POST | single total stored, no youth 400 |
| BIF-AC-4 | BIF-R-4 scenario | POST | 400 on `how_many` |
| BIF-AC-5 | BIF-R-5 scenario | POST | two Farmers rows |
| BIF-AC-6 | BIF-R-6 scenario | POST | 201 + two `*_missing` warnings; partner warnings intact |
| BIF-AC-7 | BIF-R-7 scenario | POST | 201 + two `*_not_applicable` warnings, nothing stored |
| BIF-AC-8 | BIF-R-5 result | GET `/:id` | both fields on every actor (QA payload deferred) |
| BIF-AC-9 | Rule switched in tests | handler suite | only `use_nature` applicability cases change |
| BIF-AC-10 | Same answer pair twice | POST | one row (last wins) + `actor_duplicate_merged` warning |
| BIF-AC-11 | PRMS TEST deployed | direct POST of BIF-AC-1/3/5/6 payloads, then GET | stored and returned as above (manual E2E before release) |

## 9. Defect classes and their gates

| Defect class | Gate | Automated? |
|---|---|---|
| DTO whitelist strips the fields (handler tests pass on hand-built objects) | A test that runs the real `ValidationPipe` transform (`whitelist: true`) on a `RootResultsDto` payload and asserts both fields survive | Yes |
| Wrong rule mapping (store/clear/warn/400) | Handler unit tests over BIF-AC-1..7, 9, 10 | Yes |
| Rows merged / dedup key wrong | Test against the shared writer's match behavior with two Farmers rows (BIF-AC-5, 10) | Yes |
| Warning shape breaks P2-4067 consumers | Service-level test: partner + actor warnings in one `outcomes[]` row, partner entry deep-equal to today's | Yes |
| Read payload omits a field | Fixture tests on `mapInnovationUseBilateralActor` | Yes |
| Type error invisible to `ts-jest` (widened warning union, DTO types) | `npx tsc --noEmit -p onecgiar-pr-server` | Yes |
| Write after a 400 (validation inside the transaction) | Test that the 400 cases never reach `afterCreate` / the writer mock | Yes |
| Live-environment difference (prtest DB, Fetcher stripping, green check body) | **No automated gate.** Substitute: BIF-AC-11 manual E2E on PRMS TEST at a HITL pause, direct POST first (bypassing the Fetcher) | Manual |

## 9b. Dependencies & Assumptions

- Upstream: `farmer-follow-up.constant.ts` (codes, `FARMERS_ACTOR_TYPE_ID`), `ActorTypeRepository` (name → id), `InnovationUseService.saveInnovationUse` (writer, unchanged).
- Downstream: `/create` callers (Fetcher, bulk uploader), `GET /:id` readers, QA AI payload, Normalizer documentation.
- Assumption: the deploy pipeline is automatic on merge; bilateral work lands on `performance-refactor` (team memory) — confirm at execute.

## 10. Field-alignment note (Fetcher schema / Normalizer docs)

| Path | Type | Allowed (exact case) | Applies to | Missing | Not applicable | Invalid |
|---|---|---|---|---|---|---|
| `innovation_use.current_innovation_use_numbers.actors[].count_unit` | string \| null | `households`, `individuals` | Farmers (`actor_type_id` 1) | warning `actor_count_unit_missing` | ignored + warning `actor_count_unit_not_applicable` | 400 |
| `innovation_use.current_innovation_use_numbers.actors[].use_nature` | string \| null | `information_received`, `innovation_applied` | Farmers (`actor_type_id` 1) — pending SO confirmation | warning `actor_use_nature_missing` | ignored + warning `actor_use_nature_not_applicable` | 400 |
| Rule | — | `households` ⇒ send `how_many`; breakdown is discarded; no `how_many` ⇒ 400 | Farmers | — | — | — |
| Rule | — | Mixed groups: one Farmers actor per `use_nature`, numbers not summed | Farmers | — | — | — |
| Warning entry | `{ field: "innovation_use.actors", index, code, message }` on `response.outcomes[].warnings` | — | — | — | — | — |

## 11. Open Questions

- **BIF-OQ-1 (external, non-blocking)** — SO may confirm `use_nature` for every actor type (email 2026-11-10). If so: flip the BIF-R-9 switch on bilateral, and the shared writer's match key must also distinguish non-Farmers rows by `use_nature`; extending the centre form is a separate ticket. Owner: Juan David, on SO reply.

## Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| BIF-R-1 | Accept the two fields | MUST |
| BIF-R-2 | Invalid code is a 400 | MUST |
| BIF-R-3 | Households means a single total | MUST |
| BIF-R-4 | Households without a total is a 400 | MUST |
| BIF-R-5 | Farmers more than once | MUST |
| BIF-R-6 | Missing answer is a warning | MUST |
| BIF-R-7 | Non-applicable answer ignored with a warning | MUST |
| BIF-R-8 | Read surfaces return both fields | MUST |
| BIF-R-9 | Farmers-only rule is one switch | MUST |
| BIF-R-10 | Contract documented | MUST |
| BIF-R-11 | Same answer pair twice is reported | SHOULD |
