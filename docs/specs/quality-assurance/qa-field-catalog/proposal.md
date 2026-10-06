# Proposal — Phase-versioned result field catalog for the QA integration

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/quality-assurance/qa-field-catalog/` |
| Slug | `qa-field-catalog` — derived from the free-text argument ("Catálogo de campos de resultados para la integración con QA…"); placed under `quality-assurance/` per the module taxonomy in root `CLAUDE.md`. |
| Type | **Change** — the catalog does not exist today. |
| Approval Mode | gated through proposal/specify; **pre-approved** from 2026-10-06 ("Continue everything") for routine gates — HITL and escalations still stop |
| Status | **approved 2026-10-06** by Juan David (gated) — proceed to `/akili-specify` |
| Owner | Juan David Delgado |
| Date | 2026-10-06 |
| Ticket(s) | none yet — requirement pasted directly by the user |
| Baseline | `docs/trd/trd.md` — **ADR-001** (LITE tier, no new always-on compute), **ADR-002** (MySQL + TypeORM migrations as the only schema path — the CI guard leans on this), ADR-004 (additive-only external payloads, applied here to `/qa/catalog`), QAS-9 (compatibility), QAS-10 (no secrets in logs) · `.cursorrules` (service credential never logged) |
| Related specs | bilateral API-key work (service-to-service auth precedent: `ClarisaApiKeyGuard`) · `bilateral/qa-ai-*` (QA-adjacent, no overlap) |
| Depends on | none in-repo |
| Parallel-safe | **yes** — new module + new tables + one new test; no existing table, API contract or client page changes. |
| Kaizen | `docs/specs/kaizen-log.md` does not exist — no Active Lessons to apply. |

## Intent

Reporting declares which fields exist today in each result type, per phase year — in code, versioned with the repo — so the rebuilt QA platform can know them without knowing any Reporting table or column, and so no new column can silently stay out of that declaration.

**Vision (not in this spec):** the catalog becomes Reporting's general field registry — later able to drive validation (replacing the `validation_*` procedures), reports and other integrations. This spec does not build any of that, but the model must already record **where each field's data lives** so those uses can be added without re-inventorying.

**This first piece only parameterizes the fields that exist today.** Priority is **2026**; 2025 is optional and lower priority; 2022–2024 are not catalogued (no backfill).

## Problem / Current Behavior

| # | Today | Source |
|---|---|---|
| 1 | QA reads Reporting by running hand-written SQL straight against `prdb` — 9 queries, 790–1 486 lines each, ~430 column aliases in total, joining ~40 `prdb` tables plus `integration_information.toc_*`. | `QA/server/sql/2025/QA_RESULTS_2025/*.sql` (last commit `8c2081d1`, 2026-03-06); alias count via `grep -oiE ' as …' \| sort -u \| wc -l` per file |
| 2 | Those queries hard-code the phase (`v1.phase_year = 2025`, `phase_name LIKE '%Reporting%'`) and return HTML built for views (`<a href…>`, `<br>`-joined lists). | same files; e.g. `1.policy_change.sql:114`, `10.ipsr.sql` |
| 3 | The set of fields per result type exists only implicitly — in the Angular form and in those aliases. No artifact in Reporting lists them. | `UNVERIFIED — confirm at source before relying on it` (no catalog/metadata table found by name; confirm in `/akili-specify`) |
| 4 | A result row belongs to one phase through `result.version_id`; the phase carries `phase_year` and `portfolio_id`. | `onecgiar-pr-server/src/api/results/entities/result.entity.ts:266-271`; `src/api/versioning/entities/version.entity.ts:56-61, 92-97` |
| 5 | A service-to-service guard already exists: `ClarisaApiKeyGuard` validates a CLARISA API key per declared endpoint. | `src/api/bilateral/guards/clarisa-api-key.guard.ts` |
| 6 | CI is a Jenkins trigger; the GitHub workflow has no MySQL service, so a test cannot read `information_schema` in CI. | `.github/workflows/jenkins-trigger.yml` (no `services:`) |
| 7 | Schema changes enter only through TypeORM entities + generated migrations. | TRD ADR-002 |

## Proposed Outcome

1. A **catalog defined in TypeScript** (result types, sections, fields, subfields) inside a new `api/qa-catalog` module — the single source of truth.
2. On application start, the catalog is **upserted** into catalog tables by key (never deletes).
3. A **Jest guard** fails the build when any column of an in-scope result entity is neither mapped to a field nor listed as "not for QA".
4. **`GET /api/qa/catalog?phase_year=`** returns the catalog valid for that year (shape below), behind a service credential.
5. **Initial load** of the current fields for **2026** (required) and **2025** (optional, lower priority).

### Response shape (agreed)

```json
{
  "portfolio": "P25",
  "phase": 2026,
  "catalog_version": "2026.3",
  "generated_at": "2026-10-06T12:00:00Z",
  "result_types": [
    { "key": "innovation_development", "label": "Innovation development", "level": "output" }
  ],
  "sections": [
    { "key": "general", "label": "General information", "order": 1, "result_types": ["*"] }
  ],
  "fields": [
    {
      "key": "innovation.readiness_level",
      "label": "Innovation readiness level",
      "description": "…",
      "type": "single_select",
      "control_list": "readiness_levels",
      "section": "innovation",
      "order": 1,
      "result_types": ["innovation_development"],
      "required": true,
      "valid_from": 2026,
      "valid_to": null,
      "subfields": [{ "key": "justification", "label": "Justification", "type": "text", "required": true }]
    }
  ]
}
```

| Element | Rule |
|---|---|
| `portfolio` | Output only, derived from the phase year's `version.portfolio_id`. QA never sends it. |
| `phase` | The requested `phase_year`. |
| `catalog_version` | `<year>.<revision>`; the revision increases whenever that year's catalog changes (see Recommended Approach §4). |
| `result_types[].key` | Stable string key (not the DB `result_type_id`); `level` = output / outcome / impact. |
| `result_types: ["*"]` | Applies to every result type. |
| `type` | `text` · `number` · `date` · `boolean` · `single_select` · `multi_select` · `list` (repeatable group) · `object` (composite). |
| `subfields` | Allowed on `list`, `object`, and on a select that carries extra data (e.g. readiness level + justification). |
| `key` | Dotted (`section.name`) at creation; immutable afterwards even if the field moves section. |
| `valid_from` / `valid_to` | Phase years. In the initial load `valid_from` = the first year catalogued (2026, or 2025 if that load is done) — the catalog makes no claim about 2022–2024. |

## Scope

| In | Detail |
|---|---|
| Catalog model | Result types (key, label, level) · sections (key, label, order, result types, valid_from/to) · fields (key, label, description, type, control_list, section, order, result types, required, valid_from/to) · subfields (key, label, type, control_list, required) |
| Sync | Idempotent boot-time upsert; retired fields keep their row with `valid_to` set |
| CI guard | Entity-metadata comparison (no DB) over the in-scope result entities + an explicit `NOT_FOR_QA` list with a reason per column |
| Endpoint | `GET /api/qa/catalog?phase_year=` read-only, service credential, additive-only contract doc (`onecgiar-pr-server/docs/qa-catalog.en.md` with change log) |
| Storage binding | Every field (and subfield) records where its data lives: table + column for a direct column; table + FK to `result` + value column + control-list table for relations. Stored in the catalog tables, used by the CI guard, **never returned by `/qa/catalog`** (QA never sees tables or columns) |
| Requirement rules | `required` per field, taken from the P25 `validation_*` procedures provided by the user (`SHOW CREATE FUNCTION` from the environment); conditional rules are recorded as data (`required_when` — structure decided in design), not reimplemented |
| Initial load | **2026 first**: fields of the current 2026 form for every result type. **2025 after, optional**: derived from the 9 `QA_RESULTS_2025` queries; it only identifies *which* fields exist — their HTML formatting is irrelevant because the catalog describes fields, not presentation |

## Non-Goals

- Catalogue phases 2022–2024 (no backfill).
- Anything about sending result values to QA — deferred to a later proposal.
- Any QA-side configuration (show / core / commentable / AI input) — Reporting never decides that.
- Changing the Reporting form or any existing endpoint.

## Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| QA platform (rebuild) | New consumer of `/api/qa/catalog` |
| Reporting developers | Adding a column to a result entity now requires one catalog line or one `NOT_FOR_QA` line, or CI fails |
| `onecgiar-pr-server` | New module `api/qa-catalog`, new catalog tables (names in design), one migration, one Jest guard |
| CLARISA | QA needs a CLARISA client registered for the new endpoint (if OQ-E keeps the CLARISA key) |
| Docs | New contract doc; TRD §7 Integration Points gains a QA row (applied on `staging` per shared-file discipline) |

## Visual Reference

- Source: None
- Location: —
- Notes: backend-only change; no UI surface.

## Requirement Delta Preview

### ADDED Requirements

- Reporting holds a catalog of result types, sections and fields, each section/field with `valid_from` / `valid_to` phase years.
- A field `key` is immutable and never reused; a meaning change creates a new key; a column rename does not change the key.
- A field is retired by setting `valid_to`, never deleted (the sync never issues DELETE; a test asserts no key in the stored snapshot disappears from code).
- Every column of an in-scope result entity is either catalogued or listed as `NOT_FOR_QA` with a reason; otherwise the Jest guard fails.
- `GET /api/qa/catalog?phase_year=` returns the agreed shape with only what is valid that year; a year with no catalog → 404; missing/invalid `phase_year` → 400; missing/invalid credential → 401.
- Anything not in the catalog is never exposed to QA.

### MODIFIED Requirements

- none.

### REMOVED Requirements

- none.

## Approach Options

| | A. Code catalog + boot upsert + entity-metadata guard (**recommended**) | B. Catalog rows carried by migrations | C. Catalog only in the DB, admin-edited |
|---|---|---|---|
| Source of truth | TS file in the repo, reviewed in PRs | Migration files | DB rows |
| "Versioned with migrations" | Yes — same commit as the entity + migration it describes | Yes, literally | No |
| CI guard | Pure Jest over TypeORM metadata — runs without MySQL | Same, but must parse migrations to know the catalog | Needs a DB in CI |
| Cost of a new field | One object literal | One migration per change | Manual, outside review |
| Drift risk | Low — boot sync converges every environment | Medium — a missed migration diverges envs | High |

## Recommended Approach

**Option A**, the smallest safe path:

1. **Catalog in code** — `api/qa-catalog/catalog/*.ts`, typed (`CatalogResultType`, `CatalogSection`, `CatalogField`, `CatalogSubField`). Phases referenced by year, never by `version.id` (IDs differ between environments).
2. **Boot sync** — `OnApplicationBootstrap` upsert keyed by `key`; never DELETE; logs counts only.
3. **CI guard** — Jest builds TypeORM metadata from the in-scope entities (no connection), lists `(table, column)`, subtracts catalogued columns and `NOT_FOR_QA`, and fails naming the missing pairs. Each catalog field declares the `(table, column)` pairs it covers so the guard can subtract them.
4. **`catalog_version`** — a committed snapshot per year; a Jest test fails if that year's catalog content changed without bumping its revision. This keeps the number honest without a DB.
5. **Endpoint** — `GET /api/qa/catalog?phase_year=` under a new `qa` route, guarded by the `ClarisaApiKeyGuard` pattern (pending OQ-E).
6. **Initial load** — 2026 from the current form, per result type; then 2025 if time allows. Two gates:
   - **Dependency:** the user supplies each P25 `validation_*` procedure (`SHOW CREATE FUNCTION` from the environment — repo migrations for these are stale). Without it, `required` stays marked unverified.
   - **HITL inventory review (pause):** before any catalog file is written, a draft inventory per result type (key, label, type, section, control list, storage binding, required, origin) is reviewed by someone who knows the form (Juan David or Cami). Keys are frozen at that review.
   - Phase-gated form parts are confirmed against the real environment's 2026 form; `description` is filled only from existing help text, never invented.

## Risks, Dependencies, And Open Questions

### Open questions

| ID | Question | Answer | Owner |
|---|---|---|---|
| OQ-A | Field version by result phase or by submission date? | **By phase year** of the result's phase (`version.phase_year`). A result reported again in 2026 is a new row in the 2026 phase. | Product / QA lead — confirm |
| OQ-B | How is the portfolio identified? | **Resolved 2026-10-06:** QA sends only `phase_year`; `portfolio` is returned as output, derived from `version.portfolio_id`. Residual check: no year has two portfolios with different forms. | Juan David |
| OQ-C | Which fields are not direct columns, and from which tables? | Countries `result_country`, regions `result_region`, partners `results_by_institution` + `partner_delivery_type`, actors `result_actors`, impact-area questions `result_questions`, projects `results_by_projects`, initiatives `results_by_inititiative`, ToC `results_toc_result_indicators`, evidence, IPSR tables. Each becomes `multi_select` or `list`. Full mapping is a `/akili-specify` task. | Spec |
| OQ-D | Which technical columns go to `NOT_FOR_QA`, and which tables are "result tables"? | Audit columns (`created_*`, `last_updated_*`, `is_active`), FK ids already exposed through a field, `in_qa`, legacy columns. Table list = result + per-type detail + relation tables, minus `clarisa_*` (control lists). | Spec + QA lead |
| OQ-E | Service-to-service auth? | Reuse `ClarisaApiKeyGuard` + a CLARISA client for QA. Alternative: a dedicated key in env (simpler, one more secret to rotate). | Juan David / CLARISA owner |
| OQ-G | Is `catalog_version` revision per year enough, or does QA want one global version? | Proposed: per year (`2026.3`), as in the agreed example. | QA lead |

### Risks

| Risk | Mitigation |
|---|---|
| The guard reads columns from the TypeORM entities, not from the live database. A column added with a hand-written `ALTER TABLE` and no entity change passes the guard unseen. | ADR-002 already requires entity first, then `migration:generate`. Accepted gap; can be closed later with an `information_schema` comparison wherever a DB is available. Such a column is not exposed to QA either. |
| `key` naming churn during the initial load | Keys frozen at merge; the snapshot test catches a disappeared key. |
| Large first PR (catalog data) | Split the load into per-result-type tasks, 2026 first. |
| Shared-file edits (TRD §7) on a spec branch | Record as pending; apply on `staging`. |

## Success Criteria

- The catalog contains result types, sections and fields for every result type in **2026**. (2025 is a stretch goal.)
- `GET /api/qa/catalog?phase_year=2026` returns the agreed shape; if 2025 is loaded, `?phase_year=2025` returns a different field set where the form changed.
- Adding a column to an in-scope entity without a catalog entry or a `NOT_FOR_QA` entry makes the Jest guard — and therefore CI — fail, naming the table and column.
- Setting `valid_to` on a field removes it from later years' responses while its definition remains in code and in the table.
- No request without a valid service credential gets a 200.

## Next Step

```text
/akili-specify quality-assurance/qa-field-catalog
```
