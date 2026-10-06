# Requirements — QA field catalog (`quality-assurance/qa-field-catalog`)

## Document Control

| Field | Value |
|---|---|
| Module / feature | `quality-assurance` / `qa-field-catalog` |
| Depth | **Full** — new module, new tables + migration, new external API with service auth, CI gate |
| Type | Change (from `proposal.md`, approved 2026-10-06) |
| Approval Mode | pre-approved (Juan David, 2026-10-06 — "Continue everything") for routine gates; HITL pauses (T-7 inventory review), escalations and destructive actions still stop |
| Owner | Juan David Delgado |
| Status | approved 2026-10-06 (Juan David) |
| Ticket(s) | none yet |
| Requirement prefix | `QAC-R-n` (catalog) — `QA-` is left to the existing QA review module |
| Baseline | `docs/prd.md` US-Q1 (QA reviewer sees all submitted fields — this catalog is what "all fields" means to the rebuilt QA), AC-5 (phase/versioning correctness), AC-9 (secrets) · `docs/trd/trd.md` ADR-001, ADR-002, ADR-004, QAS-9, QAS-10 · `docs/ux-ui/design.md` — n/a (no UI) |

## 1. Executive Summary

Reporting gets a **field catalog**: a declaration, kept in code, of every result type, section and field that exists in each phase year, with each field's data type, control list, subfields, whether it is required, and where its data lives. The rebuilt QA platform reads it through `GET /api/qa/catalog?phase_year=` with a service credential and never learns a table or column name. A CI test keeps the catalog complete: a new column on a result table that is neither catalogued nor marked "not for QA" fails the build. Initial content: **2026** (required), **2025** (optional). 2022–2024 are not catalogued.

## 2. Glossary

| Term | Meaning |
|---|---|
| Phase year | `version.phase_year` of the phase a result row belongs to (`result.version_id`). The catalog's only time axis. |
| Field key | Dotted, stable identifier of a field (`innovation.readiness_level`). Immutable, never reused. |
| Section | Ordered group of fields, as the form presents them. |
| Control list | Named list of allowed values (`countries`, `readiness_levels`…). Its key is declared; its contents are out of scope. |
| Storage binding | Where a field's data lives (table/column, or relation path). Internal; never exposed to QA. |
| `NOT_FOR_QA` list | Columns of in-scope tables deliberately not catalogued, each with a reason. |
| In-scope tables | The result table, per-type detail tables and relation tables that hold result data (final list fixed in design / inventory review). |
| Catalog version | `<year>.<revision>`; revision increases whenever that year's catalog content changes. |

## 3. System Context & Scope

Today (claims carried from `proposal.md`, cited there):

- QA reads Reporting through 9 hand-written SQL queries against `prdb`, hard-coded to `phase_year = 2025` and returning HTML (`QA/server/sql/2025/QA_RESULTS_2025/*.sql`).
- No artifact in Reporting lists the fields per result type — `UNVERIFIED — confirm at source before relying on it` (owner: design exploration).
- A result's phase is `result.version_id` → `version.phase_year` / `version.portfolio_id` (`onecgiar-pr-server/src/api/results/entities/result.entity.ts:266-271`, `src/api/versioning/entities/version.entity.ts:56-61,92-97`).
- Required-ness is enforced by DB functions `validation_*` whose repo migrations are stale; the live definitions come from the environment — `UNVERIFIED` (owner: user supplies `SHOW CREATE FUNCTION`, task-level dependency).

### In scope

- Catalog model (result types, sections, fields, subfields, storage binding, required/required-when) in code.
- Boot-time sync of the catalog to DB tables.
- CI completeness guard over in-scope tables.
- `catalog_version` integrity check.
- `GET /api/qa/catalog?phase_year=` with service-to-service auth.
- Initial content for 2026 (required) and 2025 (optional), with a human inventory review before keys freeze.

### Out of scope

- Phases 2022–2024 (no backfill).
- Anything that sends result values to QA.
- Control-list contents endpoint.
- Using the catalog to validate, report or drive the form (future vision; the model must not preclude it).
- QA-side field configuration.

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| QA platform (system consumer) | Discovers fields per phase year from one endpoint |
| Reporting developer | Adding a result column requires a catalog entry or a `NOT_FOR_QA` entry |
| Juan David (owner / reviewer) | Supplies the P25 `validation_*` definitions; reviews the inventory |
| Cami / form expert | Optional reviewer of the inventory |

## 5. Functional Requirements

### QAC-R-1 — Catalog content model

The catalog MUST describe, per entry:

- **Result type:** `key` (stable string, not the DB id), `label`, `level` (`output` · `outcome` · `impact`).
- **Section:** `key`, `label`, `order`, applicable result types (or all), `valid_from`, `valid_to`.
- **Field:** `key`, `label`, optional `description`, `type` ∈ {`text`, `number`, `date`, `boolean`, `single_select`, `multi_select`, `list`, `object`}, `control_list` (required for the two select types), `section`, `order`, applicable result types (or all), `required`, optional `required_when`, `valid_from`, `valid_to`, optional `subfields`, storage binding.
- **Subfield:** `key`, `label`, `type`, optional `control_list`, optional `required`, storage binding.

#### Scenario: A list field carries its subfields
- GIVEN the field `innovation.developers` of type `list`
- WHEN the catalog is read
- THEN it lists its subfields (e.g. `name`, `email`, `institution`) with their own types
- AND IT MUST reject (at test time) a `list` or `object` field with no subfields
- AND IT MUST reject a `single_select`/`multi_select` field or subfield with no `control_list`

#### Scenario: A select carries extra data
- GIVEN `innovation.readiness_level` (`single_select`) with a `justification` subfield
- WHEN the catalog is read
- THEN the subfield is present on the select field

### QAC-R-2 — Field key immutability

- A field key MUST NOT change once frozen, MUST NOT be reused for another field, and MUST NOT disappear from the catalog.
- A field whose meaning changes between phase years MUST get a new key; the old one is retired.
- A renamed column MUST change only the storage binding, not the key.

#### Scenario: A key disappears from code
- GIVEN a frozen catalog snapshot containing `geo.countries`
- WHEN a change removes `geo.countries` from the code catalog
- THEN the CI test suite fails naming `geo.countries`
- BUT it must NOT fail when `geo.countries` only gains a `valid_to`

### QAC-R-3 — Retirement by phase year

- A field or section is retired only by setting `valid_to`; its definition remains in code and in the catalog tables.
- An entry is valid for year *Y* when `valid_from ≤ Y` and (`valid_to` is null or `Y ≤ valid_to`).

#### Scenario: Retired field
- GIVEN field F with `valid_from = 2025`, `valid_to = 2025`
- WHEN the catalog for 2026 is requested
- THEN F is absent
- AND the catalog for 2025 includes F
- AND F's row still exists in the catalog table

### QAC-R-4 — Storage binding is internal

- Every field and subfield MUST declare where its data lives.
- The storage binding MUST NOT appear in any API response.

#### Scenario: No table names leak
- GIVEN any catalog response
- WHEN its JSON is inspected
- THEN no table name, column name or storage-binding property appears

### QAC-R-5 — Required rules from the live validation

- `required` MUST reflect the live P25 `validation_*` function definitions supplied by the user.
- A conditional requirement MUST be recorded as `required_when` data, not dropped and not reimplemented as code.
- A field whose rule was not confirmed against a supplied definition MUST be recorded as unconfirmed in the inventory, never silently `false`.

### QAC-R-6 — Sync to the database

- On application start the catalog in code MUST be written to the catalog tables, inserting new entries and updating changed ones by key.
- The sync MUST NOT delete any row.
- Running the sync twice with the same code MUST leave the tables unchanged.
- A sync failure MUST be logged (counts and keys only) and MUST NOT stop the application from serving other routes.

#### Scenario: Idempotent sync
- GIVEN the catalog tables already match the code
- WHEN the application starts again
- THEN no row is inserted, updated or deleted

#### Scenario: Removed from code is not deleted
- GIVEN a row in the table whose key is no longer in code (should never pass CI, but e.g. a hotfix)
- WHEN the sync runs
- THEN the row remains
- AND a warning names the key

### QAC-R-7 — CI completeness guard

- A test MUST list every column of every in-scope table and fail when a column is neither covered by a storage binding nor in `NOT_FOR_QA`.
- Every `NOT_FOR_QA` entry MUST carry a non-empty reason.
- The guard MUST run without a database.
- The failure message MUST name each offending `table.column`.

#### Scenario: New uncatalogued column
- GIVEN an in-scope entity gains a column `foo_bar`
- WHEN the test suite runs
- THEN the guard fails with `<table>.foo_bar`
- BUT it must NOT fail once `foo_bar` is bound to a field or listed in `NOT_FOR_QA` with a reason

#### Scenario: Stale entry
- GIVEN a storage binding or `NOT_FOR_QA` entry naming a column that no longer exists on its entity
- WHEN the guard runs
- THEN it fails naming the stale entry (a column rename must update the binding)

### QAC-R-8 — Catalog version integrity

- Each phase year MUST have a `catalog_version` `<year>.<revision>`.
- A change to that year's effective catalog content without a revision bump MUST fail the test suite.
- A revision bump with no content change SHOULD fail too (keeps the number meaningful).

### QAC-R-9 — `GET /api/qa/catalog?phase_year=`

The endpoint MUST return, for a valid year with catalog content:

- `portfolio` (derived from the year's phase, output only), `phase`, `catalog_version`, `generated_at` (ISO-8601 UTC),
- `result_types`, `sections`, `fields` valid that year, ordered by section order then field order,
- `result_types: ["*"]` where an entry applies to all types.

| Input | Response |
|---|---|
| valid credential, `phase_year` with content | 200 + body |
| missing / non-integer `phase_year` | 400 |
| `phase_year` with no catalog content (e.g. 2023) | 404 |
| missing / invalid credential | 401 |

#### Scenario: 2025 vs 2026
- GIVEN 2025 and 2026 are loaded and a field exists only from 2026
- WHEN QA requests 2025 and 2026
- THEN only the 2026 response contains that field
- AND fields valid in both years appear in both with the same key

#### Scenario: Not-catalogued years
- WHEN QA requests `phase_year=2023`
- THEN the response is 404
- BUT it must NOT return an empty 200

### QAC-R-10 — Service authentication

- The endpoint MUST require a service credential (CLARISA API key, QAC-OQ-1) and MUST NOT accept the user JWT `auth` header as a substitute.
- The credential MUST NOT be logged anywhere (`.cursorrules`).

### QAC-R-11 — Initial content

- 2026 MUST cover every result type in the current P25 form: policy change, innovation use, other outcome, capacity sharing, knowledge product, innovation development, other output, impact contribution, innovation package (IPSR).
- 2025 MAY be loaded after 2026, from the 9 `QA_RESULTS_2025` queries; their HTML formatting is ignored — only which fields exist.
- Before catalog files are written, a draft inventory per result type MUST be reviewed by the owner (HITL pause); keys freeze at that review.
- `description` MUST only come from existing help text in the form; it is omitted otherwise.

### QAC-R-12 — Only catalogued data reaches QA

- No QA-facing response MAY include a field not present in the catalog for that year.

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | `GET /api/qa/catalog` p95 ≤ 300 ms (catalog is small; served from catalog tables or memory) |
| Security | Service credential only; 401 body generic; no secret logged (QAS-10, AC-9) |
| Compatibility | Response is additive-only (ADR-004); contract and change log in `onecgiar-pr-server/docs/qa-catalog.en.md` |
| Cost | No new always-on compute (ADR-001 / QAS-12) |
| Schema | Catalog tables created by a generated migration (ADR-002); `migration:check:ci` stays green |
| Observability | Sync logs inserted/updated counts and any orphan keys |
| CI | Guard and integrity tests run inside the server Jest suite without a DB |

## 7. Defect Classes and Gates

| Defect class | Gate |
|---|---|
| Uncatalogued column / stale binding | QAC-R-7 guard (Jest) |
| Key removed or renamed | Snapshot test (QAC-R-2) + guarded `qa-catalog:snapshot` (refuses to write on violations). **Gap:** the frozen snapshot is a committed file; deleting or hand-editing it is caught only by PR review (CI does not diff against the base branch). Key reuse with a new meaning has no automated gate. (Recorded 2026-10-06, QAC-T-5 review) |
| Content changed without version bump | Integrity test (QAC-R-8) |
| Malformed entry (select w/o control list, list w/o subfields, bad years) | Catalog validation test (QAC-R-1) |
| Wrong year filtering / ordering / status codes | Service + controller Jest tests |
| Table names leaking in the response | Response test (QAC-R-4) |
| Type errors in catalog literals | `npx tsc --noEmit` (the runner is looser than the compiler) |
| Sync deletes or duplicates rows | Sync unit test with a mocked repository (no DB in CI) — **gap:** real MySQL upsert behavior is verified only by one local run against the dev DB at the execution HITL |
| **Wrong content** — a field missing, mislabelled, wrong type, wrong required rule | **No automated gate.** Substitute: the HITL inventory review (QAC-R-11). Residual risk accepted: what the reviewer misses ships. |
| Column added by hand-written migration without entity change | **Not caught** (guard reads entities). Accepted risk; ADR-002 forbids the path. |

## 8. Requirement ID Index

| ID | Title | Source |
|---|---|---|
| QAC-R-1 | Catalog content model | proposal Scope + agreed response shape |
| QAC-R-2 | Field key immutability | proposal Rules |
| QAC-R-3 | Retirement by phase year | proposal Rules |
| QAC-R-4 | Storage binding is internal | proposal Vision + principle "QA never knows tables" |
| QAC-R-5 | Required rules from live validation | user, 2026-10-06 |
| QAC-R-6 | Sync to DB | proposal Scope |
| QAC-R-7 | CI completeness guard | proposal Scope item 4 |
| QAC-R-8 | Catalog version integrity | proposal Recommended §4 |
| QAC-R-9 | Catalog endpoint | proposal Scope item 5 |
| QAC-R-10 | Service authentication | proposal Scope item 5 |
| QAC-R-11 | Initial content | proposal Scope item 6 + user, 2026-10-06 |
| QAC-R-12 | Only catalogued data reaches QA | proposal Rules |

## 9. Dependencies & Assumptions

- **Upstream:** `versioning` (phase year → portfolio), CLARISA (if QAC-OQ-1 keeps the CLARISA key), the user-supplied `validation_*` definitions.
- **Downstream:** the rebuilt QA platform; later the results-to-QA proposal will use the storage bindings.
- **Assumption:** one portfolio per phase year for the catalogued years (2025, 2026 → P25). `UNVERIFIED` — settled in design against `version` rows.

## 10. Open Questions

| ID | Question | Status |
|---|---|---|
| QAC-OQ-1 | Service auth: reuse `ClarisaApiKeyGuard` + CLARISA client for QA, or a dedicated key in env? | Resolved 2026-10-06: reuse `ClarisaApiKeyGuard` + a CLARISA client for QA (owner accepted the default) |
| QAC-OQ-2 | `catalog_version` per year (`2026.3`) or global? | Default per year (agreed example); confirm with QA |
| QAC-OQ-3 | Fields by result's phase year or by submission date? | Resolved: phase year |
| QAC-OQ-4 | Exact in-scope table list and `NOT_FOR_QA` reasons | Settled at the inventory review |
