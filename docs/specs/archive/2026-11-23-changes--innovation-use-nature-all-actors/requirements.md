# Requirements — Innovation Use: `use_nature` on every actor type (W1/W2 + W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Module | `results` (Innovation Use) + `bilateral` |
| Sub-feature | `innovation-use-nature-all-actors` |
| Owner | Santiago Sánchez |
| Status | approved (2026-11-18, Santiago — Phase 1 "Continue") |
| Depth | **Standard**, with rollout/rollback (public bilateral contract change, 4-caller shared writer, manual SQL function, two client forms; no migration) |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Proposal | `./proposal.md` — approved 2026-11-18 (Santiago, "si apruebo vamos con el specify"); Option A |
| Ticket | **INC-168062** ("Change for innov use", Nicoleta Trifa, 10 Nov 2026; due 20 Nov 2026) |
| Decisions | Santiago, 2026-11-18: OQ-1 `use_nature` **required** for every type in W1/W2 · OQ-2 **both blocks** (current use + 2030) · OQ-3 W3 screens **show + edit, not blocking** · OQ-4 non-Farmers rows: **question card only, no title** |
| Supersedes | BIF-R-7 / BIF-R-9 Farmers-only rule for `use_nature` (`bilateral/innovation-use-actor-follow-up`) · IFC-R-1 "away from Farmers both answers go" and IFC-R-4 "only Other and Farmers repeat" (`archive/2026-11-03-changes--innovation-use-farmer-count-nature`) |
| Pending external input | OQ-7: Nicoleta's inline red comments of 16 Nov (not in the ticket print). Does not block |

## 1. Context

P2-4048 (IFC) added two follow-up questions to **Farmers** actor rows of the Innovation Use form: `count_unit` (households / individuals) and `use_nature` (information received / innovation applied). P2-4106 (BIF) let bilateral producers send them, Farmers-only. The SO team now confirms **Option B**: `use_nature` applies to **every** actor type, in W3 and in the Centre form, so both workflows store the same data; `count_unit` stays Farmers-only.

How the system behaves today (each line cited as run on `qa-development-2026-ss` @ `a383b1323`):

- The single applicability switch is Farmers-only: `onecgiar-pr-server/src/api/results/result-actors/farmer-follow-up.constant.ts:53` (`asksCountUnit`), `:56` (`asksUseNature`).
- Bilateral rules drop `use_nature` on other types with warning `actor_use_nature_not_applicable` and only warn "missing" on Farmers: `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.ts:90-104`, `:113`. TEST results 10118–10120 stored `use_nature = NULL` for Extension agents, Other and Researchers — `UNVERIFIED — confirm at source before relying on it` (reported by Daniel Lozano, 18 Nov).
- The shared writer matches a row without `result_actors_id` by type (+ `other_actor_type` for type 5); `count_unit` / `use_nature` enter the key only for Farmers: `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts:474-500`. So two Researchers rows collapse into one (TEST result 10120, `UNVERIFIED — confirm at source before relying on it`).
- The Centre form renders the follow-up block only on Farmers rows, clears both answers when leaving Farmers, lets only Other and Farmers repeat, and hides the block on W3 results: `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.ts:515-518`, `:546-555`, `:580-592`; `.html:852-900`.
- The bilateral editor (`pages/bilateral/.../type-innovation-use`) has no follow-up questions and saves through a legacy writer that never writes them: `onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts:164-300` (`grep -rn count_unit onecgiar-pr-server/src/api/results/summary` → 0 hits).
- Completeness is the live SQL function `validation_innovation_use_P25`, Farmers-only for these answers: `docs/specs/archive/2026-11-12-bugfix--innovation-use-youth-required/sql/validation_innovation_use_P25.after.sql:221-231`, `:427-437`; live body `UNVERIFIED — confirm with SHOW CREATE FUNCTION on prtest before relying on it`.
- Producers reach PRMS through the fetcher (`onecgiar_result_functions`), whose AJV runs `removeAdditional: true` (`services/fetcher/src/validator/ajv.js:6`). The P2-4106 schema commit `7a27c43` is on `dev`/`dev-fetcher` but not `main`; prod deploys from `main` (`.github/workflows/jenkins-trigger-prod-ingestion.yml:5-6`).

Cross-references: `docs/prd.md` AC-1 (typed result integrity), AC-4 (bilateral payload stability — additive), AC-9 (no secrets/PII in logs). Contract: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`. UI: `docs/ux-ui/design.md` (existing form patterns only, no new tokens).

## 2. Glossary

| Term | Meaning |
|---|---|
| Nature question | "What best characterises the nature of this innovation use number?" — field `use_nature`, codes `information_received`, `innovation_applied` |
| Unit question | "Do the reported numbers refer to households or individual actors?" — field `count_unit`, codes `households`, `individuals`; Farmers only |
| Farmers row | Active actor row whose resolved `actor_type_id` is 1 |
| Row identity | What tells two actor rows of the same result and section apart when the incoming row has no `result_actors_id` |
| Follow-up scope | A result that is not IPSR and whose phase year is ≥ 2026 (W1/W2 or W3) |
| W3 result | A result whose `source_name` is `W3/Bilaterals` (`source = 'API'`) |
| Single total | Only `how_many` is kept; the women/men/youth breakdown is empty and `sex_and_age_disaggregation = true` |

## 3. In Scope / Out of Scope

### In scope

1. Bilateral `POST /api/bilateral/create` (and the resubmission `updated` path): rules for `use_nature` on every type, generalized duplicate detection.
2. Shared writer row identity (all 4 callers of `saveAnticipatedInnoUser`).
3. Centre form (shared `innovation-use-form`), W1/W2 and W3 results in the follow-up scope, current-use and 2030 blocks.
4. Live green check `validation_innovation_use_P25` (manual SQL, prtest then prod).
5. QA catalog definition of `use_nature`.
6. Bilateral editor (`type-innovation-use`) + the legacy writer it saves through.
7. Contract documentation: PRMS bilateral doc + Swagger; fetcher guides in `onecgiar_result_functions`.
8. Release: TEST first, prod together with the fetcher `main` promotion; dates reported on INC-168062.

### Out of scope

`count_unit` on non-Farmers types · IPSR · phase year ≤ 2025 · a bilateral 2030 projection block · back-filling stored rows · the AI QA payload · new codes, renames, a MySQL ENUM, any migration · the SO template, its macro and the uploader · W3 completeness / MDS tracker rules · the fetcher schema logic (already accepts the field on any type, commit `7a27c43`).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Centre, W1/W2, 2026) | Must answer the nature question on every actor row; may add the same actor type more than once |
| Result submitter (Centre, W3 result) | Sees and can fill both answers; nothing blocks if left empty |
| QA reviewer | Sees the nature answer on every actor row |
| Bilateral producer (SO uploader, MEL, IITA) | `use_nature` kept on every type; more `actor_use_nature_missing` warnings when absent |
| Bilateral reader / downstream | No shape change; `use_nature` now non-null on more rows |
| Platform admin (Santiago) | Applies the green-check SQL on prtest and prod |

## 5. User Stories

- **INA-US-1** — As the SO bulk uploader, I want PRMS to keep the nature of use on every actor and keep same-type rows apart when their nature differs, so that a mixed group (e.g. Researchers who received vs applied) is stored as reported.
- **INA-US-2** — As a Centre submitter, I want the nature question on every actor type, so that W1/W2 and W3 collect the same data.
- **INA-US-3** — As a Centre user on a W3 result, I want to see and complete both answers in PRMS, so that I can fix what the upload left empty.

Refines `docs/prd.md` US on Innovation Use reporting and bilateral ingestion (AC-1, AC-4).

## 6. Functional Requirements

### Required (MUST)

#### INA-R-1 — Bilateral keeps `use_nature` on every actor type

`POST /api/bilateral/create` SHALL store a valid `use_nature` on every active Innovation Use current-use actor whose type resolves, whatever its `actor_type_id`.

##### Scenario: Researchers received + applied (Daniel's result 10120)

- GIVEN a bilateral Innovation Use payload with actors `[{actor_type_id: 2, how_many: 25, women: 10, men: 15, use_nature: "information_received"}, {actor_type_id: 2, how_many: 12, women: 5, men: 7, use_nature: "innovation_applied"}]`
- WHEN it is posted to `/api/bilateral/create`
- THEN the result is created with two active Researchers rows, `use_nature` `information_received` and `innovation_applied`
- AND `outcomes[].warnings` holds no `actor_use_nature_not_applicable` and no `actor_duplicate_merged`
- BUT it must NOT update the first row with the second row's figures

##### Scenario: Daniel's six-actor payload (16 Nov)

- GIVEN Farmers received / applied / households, Researchers received / applied, and Other (with `other_actor_type`) with `use_nature`
- WHEN posted
- THEN six active rows are stored, each with its `use_nature`
- AND the Farmers households row keeps only `how_many` (single total, BIF-R-3 unchanged)

#### INA-R-2 — Missing nature is a warning on every type

When an active actor of any resolved type has an empty `use_nature` (absent, `null`, `''`), the system SHALL create the result, store `use_nature` empty and add warning `actor_use_nature_missing` with that row's `index`.

##### Scenario: Extension agents without nature

- GIVEN an actor `{actor_type_id: 3, how_many: 40, sex_and_age_disaggregation: true}` with no `use_nature`
- WHEN posted
- THEN 201, the row is stored with `use_nature` NULL
- AND a warning `{field: "innovation_use.actors", index: 0, code: "actor_use_nature_missing"}` is returned
- BUT it must NOT return `400`

#### INA-R-3 — `actor_use_nature_not_applicable` is retired, not removed

The system SHALL no longer emit `actor_use_nature_not_applicable`; the code SHALL stay in the warning-code type and in the contract doc marked "retired — no longer emitted (INC-168062)".

##### Scenario: Valid nature on a non-Farmers type

- GIVEN an actor of type 4 with `use_nature: "innovation_applied"`
- WHEN posted
- THEN the value is stored and no `actor_use_nature_not_applicable` warning appears
- AND IT MUST still return `400` for `use_nature: "applied"` on any type (BIF-R-2 unchanged)

#### INA-R-4 — `count_unit` stays Farmers-only

`count_unit` rules SHALL be byte-identical to BIF: stored on Farmers rows; on any other type ignored with `actor_count_unit_not_applicable`; `households` without `how_many` → `400`.

##### Scenario: Unit sent on Policy actors

- GIVEN an actor of type 4 with `count_unit: "households"` and `use_nature: "information_received"`
- WHEN posted
- THEN `count_unit` is stored NULL with warning `actor_count_unit_not_applicable`
- AND `use_nature` is stored
- BUT it must NOT apply the single-total (households) normalisation to that row

#### INA-R-5 — Same-type duplicates: one rule for every type

Within one payload, active rows without `result_actors_id` that share type, `other_actor_type` (type 5 only), `count_unit` and `use_nature` (empty = empty) SHALL be stored as one row (the later wins) with warning `actor_duplicate_merged` on the later index; rows that differ in any of those SHALL be stored separately. The warning message SHALL no longer say "Farmers": `Another actor of the same type with the same count_unit and use_nature was sent; the rows are stored as one and the later one wins.`

##### Scenario: Researchers twice with the same nature

- GIVEN two type-2 rows, both `use_nature: "information_received"`
- WHEN posted
- THEN one active row holds the second row's figures
- AND warning `actor_duplicate_merged` has `index: 1`

##### Scenario: Other twice, different description

- GIVEN two type-5 rows with `other_actor_type` "Traders" and "Millers", same `use_nature`
- WHEN posted
- THEN two rows are stored and no `actor_duplicate_merged` appears

#### INA-R-6 — Shared writer row identity follows the nature, without changing callers that do not send it

When the shared writer saves an actor row without `result_actors_id`, it SHALL match stored rows on `use_nature` for every type **if the incoming row carries the `use_nature` property**; Farmers rows SHALL keep today's key (`count_unit` + `use_nature`, always); rows that do not carry the property SHALL keep today's type-only match.

##### Scenario: Two Researchers rows from the Centre form

- GIVEN a 2026 W1/W2 result and a save with two new Researchers rows, `use_nature` `information_received` and `innovation_applied`
- WHEN the v2 save runs
- THEN two active Researchers rows exist after reload

##### Scenario: Review update without the field (caller `results.service.ts:5434`)

- GIVEN a result with one stored Researchers row whose `use_nature` is `innovation_applied`
- WHEN the review-update path saves a Researchers row with no id and no `use_nature` property
- THEN the stored row is updated
- BUT it must NOT insert a second active Researchers row

#### INA-R-7 — Centre form shows the nature question on every actor row

In the follow-up scope, every active actor row of the current-use block **and** the 2030 block SHALL show the nature question with the IFC copy verbatim (question, two option labels, two descriptions). Farmers rows SHALL keep the title "Follow-up questions for actor type Farmers/(agro)pastoralists/herders/fishers" and the unit question; other types SHALL show only the nature question card, with no title.

##### Scenario: Researchers row on a 2026 W1/W2 result

- GIVEN a 2026 W1/W2 Innovation Use result
- WHEN the submitter adds a Researchers row
- THEN the nature question appears under the actor-type select, marked REQUIRED
- BUT it must NOT show the unit question or the Farmers title

##### Scenario: Out of scope

- GIVEN an IPSR step-1 form or a 2025 result
- WHEN an actor row is shown
- THEN no follow-up question is rendered (unchanged)

#### INA-R-8 — Changing the actor type keeps the nature answer

When the submitter changes a row's type, the form SHALL keep `use_nature`, clear `count_unit` when the new type is not Farmers, and give the grid back when the previous unit was Households (IFC behaviour kept for the unit).

##### Scenario: Farmers households → Policy actors

- GIVEN a Farmers row with `count_unit: households`, `use_nature: innovation_applied`, single total 300
- WHEN its type is changed to Policy actors
- THEN `count_unit` is empty, the women/men grid is shown again, and `use_nature` is still `innovation_applied`

#### INA-R-9 — Every actor type may be added more than once

In the follow-up scope the actor-type select SHALL let any type be chosen on more than one row (today only Other and Farmers). Outside the scope the one-row rule SHALL stay.

##### Scenario: Second Researchers row

- GIVEN a 2026 W1/W2 result with one Researchers row
- WHEN a second row is added
- THEN Researchers is selectable in its type select
- BUT a 2025 result must NOT allow a second Researchers row

#### INA-R-10 — Green check requires the nature answer on every type (W1/W2)

`validation_innovation_use_P25` SHALL mark the section incomplete when, for a result with phase year ≥ 2026 and `source <> 'API'`, any active actor row of **any** type in a non-TBD current-use (section 1) or 2030 (section 2) block has `use_nature` NULL or outside the two codes. `count_unit` SHALL stay required only on Farmers rows. All other checks of the function SHALL be unchanged.

##### Scenario: Researchers without nature

- GIVEN a 2026 W1/W2 result whose only Researchers row has `use_nature` NULL
- WHEN the green check runs
- THEN Innovation Use is incomplete
- AND after answering it, Innovation Use is complete

##### Scenario: W3 result unaffected

- GIVEN a W3 result (`source = 'API'`) with a Researchers row without nature
- WHEN the green check runs
- THEN the result is not marked incomplete because of it

#### INA-R-11 — QA catalog follows the rule

The QA catalog SHALL describe `use_nature` as visible and required for every actor type; `count_unit` SHALL stay Farmers-only.

#### INA-R-12 — Contracts documented in both repos

- `bilateral-result-summaries.en.md` SHALL state `use_nature` applies to every actor type (field table, ingestion steps, warning table, alignment table) and add a change-log row; Swagger text on `InnovationUseActorDto.use_nature` SHALL match.
- In `onecgiar_result_functions`, the fetcher guides (`08-innovation-use.md`, `02-changelog.md`, `openapi.json`, the `use_nature` description in `validator/schemas/innovation_use.json`) SHALL say the same, with no change to schema validation logic.

#### INA-R-13 — Release order

The server change SHALL reach PRMS TEST before prod. The prod release SHALL ship together with the fetcher promotion of `dev-fetcher` → `main`, so that prod `/ingest` does not strip `count_unit` / `use_nature`. The TEST and prod dates SHALL be posted on INC-168062.

##### Scenario: Prod ingest after release

- GIVEN PRMS prod and fetcher `main` both released
- WHEN Daniel's 10120 payload is posted to prod `/ingest`
- THEN GET of the created result shows both Researchers rows with their `use_nature`

### Should (SHOULD)

#### INA-R-20 — W3 results in the shared form show both answers, not blocking

On a W3 result in the follow-up scope, the shared form SHOULD show the same questions as INA-R-7/R-8/R-9 (current-use block only; the 2030 block stays hidden by IWH), editable, **without** the REQUIRED marker, so that an empty answer does not count as a missing mandatory field.

##### Scenario: W3 Researchers row

- GIVEN a 2026 W3 result opened in the result detail
- WHEN the Innovation Use section loads
- THEN each actor row shows the nature question (Farmers also the unit question), not marked required
- AND saving with the answer empty succeeds

#### INA-R-21 — Bilateral editor shows and saves both answers, not blocking

The bilateral editor (`type-innovation-use`) SHOULD show the nature question on every current-use actor card and the unit question on Farmers cards, with the same copy, codes and Households single-total behaviour as the Centre form, and its save SHOULD persist both answers (only the four codes; anything else stored empty). Empty answers SHOULD NOT block the save or the bilateral completeness indicator.

##### Scenario: Complete an uploaded result

- GIVEN a W3 result in the bilateral editor whose Researchers row has `use_nature` empty
- WHEN the user picks "Actors who applied the innovation" and the section saves
- THEN reloading shows `innovation_applied`
- BUT callers of the legacy writer that do not send the fields must NOT have stored answers cleared

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Bilateral contract stays additive: no field removed or renamed; the retired warning code stays in the type and docs (INA-R-3). Payloads without the fields keep returning 201 |
| Data safety | No caller of either writer may clear stored answers it did not send (INA-R-6, INA-R-21) |
| Performance | No extra query per actor beyond today's match `findOne` |
| Accessibility | Nature radios keep the existing `radiogroup` + `aria-label`; each row's radio group has a unique `name` (multiple same-type rows) |
| Internationalization / copy | Reuse the IFC copy constants verbatim; no new strings except the duplicate-warning message (INA-R-5) and docs |
| Observability / security | Server logs keep counts by warning code only; no payload values, tokens or PII (`.cursorrules`) |

## 8. Acceptance Criteria

| AC | Requirement | Check |
|---|---|---|
| INA-AC-1 | R-1 | Rules + service tests on the 10120 and six-actor payloads |
| INA-AC-2 | R-2, R-3 | Rules tests: missing on types 2–5 → warning; valid on type 4 → stored, no `not_applicable` |
| INA-AC-3 | R-4 | Existing BIF `count_unit` tests unchanged and green |
| INA-AC-4 | R-5 | Rules tests: same key → merge warning; different `other_actor_type` → none |
| INA-AC-5 | R-6 | Writer tests on the real `where` built by `saveAnticipatedInnoUser`: with property (two rows), without property (update) |
| INA-AC-6 | R-7, R-8, R-9 | Component tests (jsdom) on the shared form |
| INA-AC-7 | R-10 | SQL `checks.sql` run before/after on prtest: counts per scenario |
| INA-AC-8 | R-11 | QA catalog spec + updated snapshot |
| INA-AC-9 | R-12 | Grep of the docs for the new wording; Swagger build |
| INA-AC-10 | R-13 | Manual E2E on PRMS TEST (direct POST, then via `/ingest`), recorded at a HITL pause |
| INA-AC-11 | R-20, R-21 | Component tests + manual check on TEST |

## 9. Defect classes and their gates

| Defect class | Gate | Automated? |
|---|---|---|
| Rule mapping wrong (store / warn / 400 / merge) | Rules unit tests (`innovation-use-actor-follow-up.rules.spec.ts`) | Yes |
| Rows merged or duplicated by the writer key | Writer tests asserting the real `where` object per caller class (with / without the property) | Yes |
| A caller of a writer clears or duplicates rows it did not mean to touch (KZ-changes--innovation-use-farmer-count-nature-1) | Caller sweep (`codegraph_callers` / grep) listed in the task's Consumers + one test per caller class | Yes |
| Type error invisible to `ts-jest` (warning union, DTO) | `npx tsc --noEmit -p onecgiar-pr-server` | Yes |
| Form renders the wrong question / title per type, wrong gate (IPSR, 2025, W3) | Component tests (jsdom) | Yes |
| Radio groups of two same-type rows share a `name` (one click unchecks the other row) | Component test on two same-type rows | Yes |
| Green check SQL wrong (too strict or too loose; breaks other checks) | **No automated gate** (live function, outside migrations). Substitute: `checks.sql` before/after on prtest at a HITL pause, with counts per scenario | Manual |
| QA catalog drift | Catalog spec + snapshot | Yes |
| Live environment differs (prtest data, fetcher stripping on prod) | **No automated gate.** Substitute: INA-AC-10 manual E2E on TEST; prod check after release | Manual |
| Layout of the new card on non-Farmers rows | **No automated gate** in jsdom. Substitute: visual check on TEST at the HITL pause | Manual |

## 9b. Dependencies & Assumptions

- Depends on P2-4048 (columns, constants) and P2-4106 (DTO, rules, warning channel), both on `master`.
- The fetcher schema already accepts `use_nature` on any type (`7a27c43`); only its docs change.
- Deploy to TEST: `qa-development-2026-ss` → `performance-refactor` (route used by P2-4106) — confirm at execute time (OQ-6).

## 10. Field-alignment note (for SO's "PRMS Normalizer Technical Field Documentation")

| Path | Allowed | Applies to | Missing | Not applicable | Invalid |
|---|---|---|---|---|---|
| `…actors[].count_unit` | `households`, `individuals` | Farmers (`actor_type_id` 1) | warning `actor_count_unit_missing` | ignored + `actor_count_unit_not_applicable` | 400 |
| `…actors[].use_nature` | `information_received`, `innovation_applied` | **every actor type** | warning `actor_use_nature_missing` | n/a | 400 |
| Row identity | `actor_type_id` + `use_nature` (+ `count_unit` Farmers, + `other_actor_type` Other); same identity twice → merged + `actor_duplicate_merged` | all | — | — | — |

## 11. Open Questions

| ID | Question | Owner |
|---|---|---|
| OQ-5 | Due date 20 Nov: TEST for the server cut is realistic; UI cut after | Santiago → Daniel / Nicoleta |
| OQ-6 | TEST deploy route via `performance-refactor` | Santiago, at execute |
| OQ-7 | Nicoleta's red comments of 16 Nov | Santiago → Nicoleta |

## Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| INA-R-1 | Bilateral keeps `use_nature` on every type | MUST |
| INA-R-2 | Missing nature → warning on every type | MUST |
| INA-R-3 | `actor_use_nature_not_applicable` retired | MUST |
| INA-R-4 | `count_unit` stays Farmers-only | MUST |
| INA-R-5 | Same-type duplicates: one rule | MUST |
| INA-R-6 | Writer identity follows the nature, callers protected | MUST |
| INA-R-7 | Centre form shows the question on every row | MUST |
| INA-R-8 | Type change keeps the nature answer | MUST |
| INA-R-9 | Every type repeatable | MUST |
| INA-R-10 | Green check on every type (W1/W2) | MUST |
| INA-R-11 | QA catalog | MUST |
| INA-R-12 | Contracts documented in both repos | MUST |
| INA-R-13 | Release order | MUST |
| INA-R-20 | W3 in the shared form, not blocking | SHOULD |
| INA-R-21 | Bilateral editor shows and saves, not blocking | SHOULD |
