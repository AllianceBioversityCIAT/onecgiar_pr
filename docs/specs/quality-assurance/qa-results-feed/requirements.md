# Requirements — QA results feed (`quality-assurance/qa-results-feed`)

## Document Control

| Field | Value |
|---|---|
| Module / feature | `quality-assurance` / `qa-results-feed` |
| Depth | **Full** — new external API contract, service-to-service auth, read path over every result table |
| Type | Change (from `proposal.md`, approved 2026-10-28) |
| Deliverable | software |
| Approval Mode | gated |
| Owner | Juan David Delgado |
| Status | approved 2026-10-28 (Juan David) — amended at Phase 2: two eligibility conditions and two `not_eligible` reasons; spec complete, ready for `/akili-execute` |
| Ticket(s) | [P2-4037](https://cgiarmel.atlassian.net/browse/P2-4037) (sub-task of [P2-3905](https://cgiarmel.atlassian.net/browse/P2-3905), epic P2-3902) |
| Requirement prefix | `QRF-R-n` — `QAC-R-n` belongs to `qa-field-catalog`, `QA-` to the existing QA review module |
| Depends on | `quality-assurance/qa-field-catalog` (2026 catalog, revision 30) |
| Baseline | `docs/prd.md` US-Q1, AC-5 (phase correctness), AC-9 (secrets) · `docs/trd/trd.md` ADR-001, ADR-004, QAS-10 · `docs/ux-ui/design.md` — n/a (no UI) · `onecgiar-pr-server/docs/qa-catalog.en.md` (value semantics of selects, conditions) |
| Kaizen | `docs/specs/kaizen-log.md` does not exist — no Active Lessons |

## 1. Executive Summary

The QA platform gets two read-only routes next to `GET /api/qa/catalog`. `GET /api/qa/results` lists the results QA may load for one phase year — Submitted, W1/W2, optionally narrowed by program and result type. `POST /api/qa/results/details` returns those results' values keyed only by catalog `field_key`s, so QA stops reading `prdb`. Ineligible ids in a batch are reported, not fatal. Same auth and shape conventions as the catalog route.

## 2. Glossary

| Term | Meaning |
|---|---|
| Phase year | `version.phase_year` of the result's phase (`result.version_id`). Always sent by QA; never inferred. |
| Eligible result | Active result, `status_id = 3` (Submitted), `source = 'Result'` (W1/W2), whose phase has the requested `phase_year`. |
| Lead program | The result's initiative with the submitter role — the catalog field `general.primary_program` (`results_by_inititiative`, role 1, active). |
| Program CLARISA id | `clarisa_initiatives.id`; program code = `clarisa_initiatives.official_code`. |
| Result type key | The `result_types[].key` of the catalog (`policy_change`, …), never the DB `result_type_id`. |
| Value | What a catalog field holds for one result, shaped by the field `type` (§5, QRF-R-7). |
| `not_eligible` | Per-id rejection inside a `details` batch, with a reason code. |

## 3. System Context & Scope

Today:

- The only QA route is `GET /api/qa/catalog`; it reads no result data (`onecgiar-pr-server/src/api/qa-catalog/qa-catalog.service.ts:31-45`).
- The catalog contract says values are "a separate, later contract" — this spec (`onecgiar-pr-server/docs/qa-catalog.en.md:5`).
- Each 2026 catalog field declares a storage binding: 86 `column`, 52 `relation`, 31 `path`, 12 `lookup` (`grep -rho "kind: '[a-z]*'" onecgiar-pr-server/src/api/qa-catalog/definitions/sections | sort | uniq -c`).
- W1/W2 is `result.source = 'Result'`; `'API'` covers W3, Bilateral and SGP-02 (`onecgiar-pr-server/src/api/results/entities/result.entity.ts:51-54, 551-574`).
- `result_code` repeats across phases; `result.id` is per phase row (`result.entity.ts:66-69, 266-271`).
- Submission history lives in `submission` (`status`, `status_id`, `created_date`) (`onecgiar-pr-server/src/api/results/submissions/entities/submission.entity.ts`).
- Whether a `phase_year` maps to several Reporting/IPSR versions in prod — `UNVERIFIED — confirm at source before relying on it` (owner: OQ-4, Juan David).

### In scope

- `GET /api/qa/results` and `POST /api/qa/results/details`, CLARISA API key, no envelope, no throttle.
- Value extraction for every catalog field valid in the requested year.
- Contract doc update with change log.

### Out of scope

- Approval notification back to Reporting · Editing results · post-load sync · unsubmit blocking (Q2) · new catalog keys · years without a catalog.
- Anything P2-3905 places on the QA side: "already in QA / one timeline only", load progress, load summary, KP auto-validation status (Q3).

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| QA platform (system consumer, P2-3905) | Lists and loads results itself; no SQL against `prdb` |
| QA Admin (indirect) | Can load on demand instead of asking the tech team (P2-3905 AC 1–10) |
| Reporting developer | A catalog field's binding now also drives what QA receives |
| Juan David (owner) | Answers OQ-4..OQ-7, runs the golden comparison |

## 5. Functional Requirements

### QRF-R-1 — Service access

- Both routes MUST require the CLARISA API key (`x-api-key`) through the same guard and per-endpoint declaration as `/api/qa/catalog`, and MUST NOT accept the user JWT as a substitute.
- Both routes MUST be excluded from the JWT middleware, return the contract body without the `ResponseInterceptor` envelope, and skip throttling.
- The key MUST NOT be logged (`.cursorrules`, QAS-10).

#### Scenario: No key
- GIVEN a request with no `x-api-key` but a valid user `auth` JWT
- WHEN it calls either route
- THEN the response is 401
- BUT it must NOT return any result data

### QRF-R-2 — `phase_year` is mandatory

- Both routes MUST reject a missing, non-integer or out-of-range `phase_year` with 400.
- A `phase_year` with no catalog MUST return 404, as `/api/qa/catalog` does.
- The system MUST NOT derive the year from the clock or from the open phase.

#### Scenario: Year omitted
- WHEN QA calls `GET /api/qa/results` without `phase_year`
- THEN the response is 400
- BUT it must NOT fall back to the current year or to the active phase

### QRF-R-3 — Eligibility

A result is eligible for a `phase_year` only when ALL hold: active, `status_id = 3`, `source = 'Result'`, its phase's `phase_year` equals the request (which phases count: OQ-4), its result type has a catalog key (types 3 *Capacity change* and 11 *Complementary innovation* have none), and it has an active lead program. The same rule MUST be applied by both routes.

#### Scenario: Mixed population
- GIVEN in 2026 one Submitted W1/W2 result, one Editing W1/W2, one Submitted bilateral (`source='API'`), one Submitted SGP-02, and one Submitted W1/W2 of 2025
- WHEN QA lists `phase_year=2026`
- THEN only the first result is returned
- AND `total` is 1

### QRF-R-4 — List filters

- `program_ids` (CLARISA ids) and `result_type_keys` (catalog keys) are optional, comma-separated; absent or empty = no filter; both present = AND.
- A `program_ids` value matches the result's **lead program** only.
- An unknown `result_type_keys` value (not in that year's catalog) MUST return 400 naming it; an unknown program id simply matches nothing.

#### Scenario: Filter by program and type
- GIVEN eligible results of programs 5 and 7, types `policy_change` and `knowledge_product`
- WHEN QA lists with `program_ids=5&result_type_keys=policy_change`
- THEN only program 5 policy changes are returned
- AND IT MUST count `total` over the filtered set only

### QRF-R-5 — List item and pagination

- Each item MUST carry `result_id`, `result_code`, `program { clarisa_id, code }`, `result_type_key`, `submitted_at` (ISO-8601 UTC).
- `page` (≥ 1, default 1) and `page_size` (1..max, default and max in OQ-5) MUST be validated (400 outside range).
- Order MUST be total and fixed: `submitted_at` ascending, then `result_id` ascending.
- The body MUST carry `phase`, `page`, `page_size`, `total`, `items`. A page past the end returns 200 with empty `items` and the real `total`.

#### Scenario: Stable paging
- GIVEN 250 eligible results, two with the same `submitted_at`, and no change in between
- WHEN QA reads pages 1..3 with `page_size=100`
- THEN each result appears exactly once across the three pages
- BUT the two results sharing `submitted_at` must NOT swap pages between two identical calls

### QRF-R-6 — List breakdown (SHOULD — from P2-3905 AC 5)

The list response SHOULD carry `breakdown`: counts of the filtered set by program (CLARISA id) and by result type key, so QA can show "how many results will be brought in" before loading without paging everything.

### QRF-R-7 — Details batch

- Body `{ phase_year, result_ids, field_keys? }`; `result_ids` MUST be a non-empty array of positive integers, no more than N (OQ-5); otherwise 400. Duplicates are answered once.
- `field_keys` (optional) is the set of **top-level** catalog keys QA asks for — the fields the QA Admin configured (OQ-8, 2026-10-28). Absent = every applicable field. A key that is not a top-level key of that year's catalog (a subfield key included) MUST return 400 naming it. A requested key that does not apply to a result's type is simply absent from that result's `values`.
- For each eligible id the response MUST return `result_id`, `result_code`, `result_type_key`, and `values` holding every catalog field valid in that `phase_year` whose `result_types` include the result's type (or `*`) — narrowed to `field_keys` when given — keyed by `field_key`.
- The body MUST carry `phase` and `catalog_version`, equal to what `/api/qa/catalog?phase_year=` returns for the same year.
- Value shape by field type, consistent with the catalog's condition semantics: `text`/`date` → string; `number` → number; `boolean` → boolean; `single_select` → option id; `multi_select` → array of ids; `list` → array of objects keyed by subfield key; `object` → object keyed by subfield key. A field with no stored value MUST be present with `null` (`[]` for `multi_select`/`list`), never omitted.
- A scalar field (`text`, `date`, `number`, `boolean`, `single_select`) that declares subfields MUST be returned as an object `{ value, <subfield key>: … }`: `value` holds the scalar shaped by the field type, and each subfield is keyed by its subfield key and shaped by its own type (`null` / `[]` when absent). `value` is a key defined by this requirement (QRF-R-9). *(Amended 2026-10-28 at execute, Juan David — QRF-T-3 Reviewer spec tension; the catalog says subfields always travel with their parent.)*

#### Scenario: Whole object of a selected field
- GIVEN a policy change with two ToC mappings, each with indicators
- WHEN QA requests its details
- THEN `values["toc.entries"]` (or the catalog's equivalent key) is a list of two objects, each holding its nested subfields
- AND IT MUST use only catalog keys at every level

#### Scenario: Scalar field with subfields
- GIVEN a capacity sharing result whose stored `capdev_term_id` is 2 (Master)
- WHEN QA requests its details
- THEN `values["capacity_sharing.length_of_training"]` is `{ "value": 4, "degree": 2 }`
- BUT it must NOT return the bare scalar and drop `degree`

### QRF-R-8 — Per-id rejection

- An id that does not exist, is not active Submitted, belongs to another phase year, is not W1/W2, has a result type without a catalog key, or has no active lead program MUST go to `not_eligible: [{ result_id, reason }]` with `reason` ∈ `not_found`, `not_submitted`, `other_phase`, `not_w1w2`, `type_not_catalogued`, `no_lead_program` (first failing check in that order).
- The rest of the batch MUST still be answered with 200.

#### Scenario: Unsubmitted after listing
- GIVEN result 41231 was listed, then unsubmitted
- WHEN QA requests details for `[41231, 41232]`
- THEN 41232 is in `results`
- AND 41231 is in `not_eligible` with `not_submitted`
- BUT the request must NOT fail as a whole

### QRF-R-9 — Only catalogued data

- No response MAY contain a key, at any nesting level, that is not a catalog key of that year (or one of the item/envelope keys defined here).
- Table or column names MUST NOT appear in any response or error body.
- Personal data is exposed only where a catalog field holds it and only when QA requests that field; the person-bearing keys MUST be listed in the contract doc so the QA Admin chooses knowingly (OQ-8).
- A field not in `field_keys` MUST NOT be read nor returned.

#### Scenario: Only the configured fields
- GIVEN QA requests `field_keys: ["general.title"]` for a result whose catalog also has `general.lead_contact_person`
- WHEN `details` answers
- THEN `values` holds only `general.title`
- BUT it must NOT contain `general.lead_contact_person`, even as `null`

### QRF-R-10 — Contract documentation

`onecgiar-pr-server/docs/qa-catalog.en.md` MUST document both routes, eligibility, filters, ordering, value shapes, `not_eligible` reasons and limits, with a change-log entry; later changes are additive (ADR-004).

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | `GET /api/qa/results` p95 ≤ 1 s for `page_size` max; `details` p95 ≤ 5 s for a batch of N, measured on prtest with real 2026 data |
| Query shape | Number of SQL statements per `details` call independent of the batch size (no per-result queries) |
| Security | API key only; generic 401 body; no secret or SQL in logs or errors (QAS-10, AC-9) |
| Compatibility | Additive to `/api/qa/*`; `/api/qa/catalog` unchanged (ADR-004) |
| Cost | No new compute, no new table, no migration (ADR-001) |
| Observability | Log per call: route, phase year, counts (items / eligible / not eligible), duration — never ids lists or values |

## 7. Defect Classes and Gates

| Defect class | Gate |
|---|---|
| Ineligible result returned (W3/bilateral/SGP-02, Editing, wrong year) | Repository unit test asserts the predicates in the built query **+ gap:** SQL semantics need a DB; substitute = local run against the dev DB at the execution HITL, reconciling `total` with a direct SQL count |
| Wrong value from a binding (`column`/`relation`/`path`/`lookup`, pick order, year qualifier, null-value rows) | Per-kind resolver unit tests on fixtures where the correct and the mutated readings differ **+ gap:** real data shape; substitute = golden comparison of ≥ 2 results per result type against the 2026 form (HITL) |
| Non-catalog key or table name leaks | Response whitelist test walking every nesting level against the catalog |
| Unstable or duplicated paging | Order-clause test (tie-breaker present) + local paging run over the full 2026 set |
| Batch rejects instead of partitioning | Service test with mixed ids per reason |
| Auth bypass / envelope / throttle drift | Controller metadata test (guard, endpoint declaration, `SkipThrottle`) + JWT-exclude list test |
| Year defaulted from the clock | Controller test: missing `phase_year` → 400 |
| N+1 queries | Statement-count test with a mocked data source for batch 1 vs batch N |
| Type errors in DTOs / value typing | `npx tsc --noEmit` |
| Latency over target | **No automated gate.** Substitute: timing on prtest after deploy; accepted risk until measured |

## 8. Requirement ID Index

| ID | Title | Source |
|---|---|---|
| QRF-R-1 | Service access | proposal Scope; brief "same pattern as qa-catalog" |
| QRF-R-2 | `phase_year` mandatory | brief Rules |
| QRF-R-3 | Eligibility | brief Endpoint 1; P2-3905 AC 6 |
| QRF-R-4 | List filters | brief Endpoint 1 |
| QRF-R-5 | List item and pagination | brief Endpoint 1 |
| QRF-R-6 | List breakdown (SHOULD) | P2-3905 AC 5 — added at specify |
| QRF-R-7 | Details batch | brief Endpoint 2; QAC-R-14 ("returns the whole object") |
| QRF-R-8 | Per-id rejection | brief Endpoint 2 |
| QRF-R-9 | Only catalogued data | brief Rules; QAC-R-12 |
| QRF-R-10 | Contract documentation | ADR-004; catalog doc convention |

## 9. Open Questions

| ID | Question | Blocks | Owner |
|---|---|---|---|
| Q1 | ~~Identity~~ — **resolved 2026-10-28 (Juan David):** both. `result_id` is the unique key of the result row (one per phase) and is what `details` accepts; `result_code` is returned alongside to identify the result across phases | — | — |
| Q2 | ~~Block unsubmit~~ — **decided 2026-10-28 (Juan David):** yes, depending on the QA round (at one point QA reopens results so programs can adjust). Needs Reporting to know the QA round of a result → **separate spec**; out of scope here | — | — |
| Q3 | KP auto-validation field | nothing here unless it needs a new catalog key | Ángel |
| OQ-4 | `phase_year` → Reporting phases only, or Reporting + IPSR? | QRF-R-3 | Juan David |
| OQ-5 | ~~Limits~~ — **resolved 2026-10-28 (Juan David):** batch 50, `page_size` max 200 (default 100); timing still measured at T-8 | — | — |
| OQ-6 | ~~`submitted_at` source~~ — **resolved in design** (QRF-DD-5): latest active `submission` row with `status = true` | — | design |
| OQ-7 | ~~No active lead program~~ — **resolved in design** (QRF-DD-4): not eligible, reason `no_lead_program` | — | design |
| OQ-8 | ~~Person-bearing fields~~ — **resolved 2026-10-28 (Juan David):** they stay available; QA receives only the fields the QA Admin decides to request (`field_keys`, QRF-R-7). Person-bearing keys (2026): `general.lead_contact_person` (+ `directory_user` id), `innovation_dev.developers`, `innovation_dev.collaborators` (free text, names/emails), `ipsr_step_1.workshop_facilitators` (first/last name, email), `knowledge_product.authors` (public CGSpace names) | — | — |
