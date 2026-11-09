# Design — QA value labels (`quality-assurance/qa-value-labels`)

## Document Control

| Field | Value |
|---|---|
| Spec | `quality-assurance/qa-value-labels` · requirements `QVL-R-1..11` (R-3 amended 2026-11-09) |
| Depth | Full |
| Status | approved 2026-11-09 (Juan David, "Continue" at the Phase 2 gate; judgment-day not run) |
| Verified at | `4cf7bc01f` (`origin/performance-refactor`, 2026-11-06) |
| Exploration | Three scout passes (2026-11-09), one per group of lists. They read the server catalog, entities and migrations, plus the 2026 client form, and returned citations as run. No database row was read: row contents are `UNVERIFIED` where they matter (§1A) |
| Kaizen | **KZ-quality-assurance--qa-intake-1** shapes DD-6 and T-1: premises about text the client shows, and about database rows, are settled by observation (a client source read, a DB query, the prtest form), never from our own column names. The feedback memory "raw SQL columns: verify them" shapes DD-5: every table and column in the registry is checked against entity metadata |

## 1. Summary

Three new pieces go in `api/qa-catalog/values/`:

| Piece | Job |
|---|---|
| **Registry** (`label-sources.ts`) | Says, for each of the 55 control lists, where its label comes from and how the text is composed |
| **Collector** (`label-collector.ts`) | Walks each result's projected `values` with the catalog definitions and gathers the (list, id) pairs |
| **Resolver** (`label.resolver.ts`) | Reads all labels of a batch in one statement per source table, sharing the feed's query runner, renderer and failure boundary |

The details service attaches `labels` after it projects `values`, so `values` is never touched. The catalog, its hash and `catalog_version` are unchanged.

## 1A. Premise Ledger

Count: 16 verified · 6 `UNVERIFIED` (2 High, 4 Low).
Blast-radius triggers:
- **`consumer`** fires (the response shape of `details` changes): P-15, P-16.
- **`live-path`** fires (the route is the user action): P-1.
- **`shared-state`** does not fire. The change adds a read step and touches no state, service, base class or condition that other code reads.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `POST /api/qa/results/details` reaches `QaResultsService.details`. It projects each applicable field into `out` (`project(f, normalize(...))`) and returns `{ phase, catalog_version, results, not_eligible }` | live-path | `qa-catalog.controller.ts` route `['POST','/results/details']` (pinned by `qa-catalog.controller.spec.ts:216`) → `qa-results.service.ts:97-178`, projection at `:154-166` | `4cf7bc01f` | DD-2 (where labels are collected) moves. High | — |
| P-2 | The projected `values` are the final values: capacity-sharing normalization runs before `project` | location | `qa-results.service.ts:158` (`project(f, normalize(f.key, own[f.key]))`); `values/normalizers.ts:3` | `4cf7bc01f` | A stored 1/2 for length would be labelled "PhD"/"Master" instead of "Long-term". Low | — |
| P-3 | The catalog content hash covers result types, sections and fields (bindings included), and nothing else | location | `definitions/content-hash.ts:40-62` (`HashableCatalog`, `computeCatalogContentHash`) | `4cf7bc01f` | A registry outside the fields would move `catalog_version` (R-10). High | — |
| P-4 | The catalog names 55 control lists over 122 select entries plus 1 `text` entry, and 9 of them are computed names that a literal grep misses | existence | `npx ts-node -T` walk over `CATALOG_FIELDS` (`definitions/sections/index.ts:94`) → `55` / `122` / `1`; `grep -rhoE "control_list: '[a-z0-9_]+'" definitions/sections \| sort -u \| wc -l` → `46` | `4cf7bc01f` | The completeness check (DD-5) would pass with lists missing. High | — |
| P-5 | `PlanQuery` supports `any_in` over string or number values and an optional `schema` (used for ToC). `dataSourceRunner` renders it with bound parameters and quoted identifiers | location | `values/read-plan.ts:27-41` (`Predicate`, `PlanQuery`), `:398-434` (`renderPlanSql`, `dataSourceRunner`) | `4cf7bc01f` | The resolver needs its own SQL renderer (DD-3). Low | — |
| P-6 | A lookup source whose database is not configured (ToC without `DB_TOC`) throws, and the details boundary turns it into the generic 500 | location | `values/lookup.resolver.ts:178-180` (`fail(..., 'reads a source that is not available')`); `qa-results.service.ts:236-275` (`guarded`, `toGenericFailure`) | `4cf7bc01f` | R-9 would need a different path for ToC labels. Low | — |
| P-7 | Entity metadata (TypeORM) is already read by `values/table-metadata.ts`. Its spec checks bound tables against it | location | `values/table-metadata.ts:1-5`, `:20-33` | `4cf7bc01f` | DD-5's metadata check needs a new reader. Low | — |
| P-8 | Five lists exist **only as client text**: geographic scopes, partner roles, policy amount statuses, evidence sources, Farmers count unit / use nature | location | Client: `shared/components/geoscope-management/geoscope-management.component.ts:36-41,205-206`; `normal-selector.component.html:132-177`; `policy-change-info.component.html:26-39`; `evidence-item.component.ts:83-86`; `innovation-use-form/farmer-follow-up.ts:33-54` (scout pass, 2026-11-09) | `4cf7bc01f` | DD-4 constants would be wrong or would need a table. Low | — |
| P-9 | `toc_levels` text in the 2026 form comes from a server constant (`findAllV2`), not from the PRMS `toc_level` table, whose rows hold pre-2025 names | location | `src/toc/toc-level/toc-level.service.ts:30-48`; `src/migrations/1667926054147` (old names) | `4cf7bc01f` | `toc_levels` labels would show the old names. Low | — |
| P-10 | The form text for a result id is `code - title` in merge/split and in the Innovation Use link select. Other places add or drop parts (`(acronym - year)` prefix on linked results, title only on IPSR cards) | location | Client `rd-annual-updating.component.ts:342-346`; `qa-innovation-development-results.service.ts:74-86`; `rd-contributors-and-partners.component.ts:1336-1354`; `selected-innovations.component.html:28-47` | `4cf7bc01f` | The canonical label for `results`-like lists (DD-4) changes. Low | — |
| P-11 | `centers` stores a text code. The display name and acronym live in `clarisa_institutions`, through `clarisa_center.institutionId` | data-env | `clarisa-center.entity.ts:16-45`; `results-center.entity.ts:87-90`; `clarisa-centers.repository.ts:31-42` | `4cf7bc01f` | The chained read (DD-3) is not needed or reads the wrong table. Low | — |
| P-12 | `general.<area>_impact_areas` read every `result_impact_area_score` row of the result, with no area filter | data-env | `definitions/sections/general-information.ts:71-76` (relation, no `filter`) | `4cf7bc01f` | No gap to record. Owner decision 2026-11-09: separate bugfix, documented here | — |
| P-13 | `clarisa_innovation_use_levels` holds duplicate levels (ids 13..20 repeat levels 2..9 on test). The Innovation Use form shows the name of the row with the same `level` among ids 1..10 | data-env | `definitions/sections/ipsr-step-3.ts:27-29` (catalog note); client `innovation-use-info.component.ts:256`; server `innovation-use.service.ts:118-140`; `clarisa-innovation-use-levels.service.ts:41-45` | `4cf7bc01f` | `innovation_use_levels` labels by id may differ from the form | — |
| P-14 | The duplicate use-level and readiness-level rows carry the **same `name`** as the row with the same level in ids 1..10. If so, a direct id → name read equals the form | data-env | `UNVERIFIED — confirm at source before relying on it` | — | DD-4 for `innovation_use_levels`, `use_levels` and `readiness_levels` needs the level-normalized two-step read. **High** | T-1 step 1 (DB query, test and prod) |
| P-15 | `qa-results.details.spec.ts:218` pins the exact key set of `results[0]` | consumer | `grep -n "Object.keys(res.results\[0\])" src/api/qa-catalog/qa-results.details.spec.ts` → `218` | `4cf7bc01f` | T-5 would leave a stale pin | — |
| P-16 | Readers of the `details` response shape, across the whole workspace: server (`dto/qa-results-response.dto.ts`, `dto/qa-results-details.dto.ts`, `qa-catalog.controller.ts`, `qa-catalog.controller.spec.ts`, `qa-results.details.spec.ts`, `qa-results.service.ts`, `docs/qa-catalog.en.md`; `app.module.ts` / `app.module.spec.ts` name the route only); QA repo (`server/src/ingestion/reporting-results-feed.client.ts`, `.spec.ts`, `results-feed.port.ts`, `load-runner.ts`, `.spec.ts`, `loads.service.spec.ts`, `test/support/fake-results-feed.ts`, `fixtures/results-details.json`). QA's `parseDetails` reads named properties only | consumer | `git grep -n -l "QaResultsDetailsItem\|results/details\|QaResultsDetailsResponse" -- onecgiar-pr-server onecgiar-pr-client` (9 files); in `onecgiar_qa`: `git grep -n -l "results/details\|results-details\|parseDetails\|FeedDetails"` (13 files, 3 of them archived specs); `reporting-results-feed.client.ts:200-217` | `4cf7bc01f`; QA `69784da` | QA would reject an unknown key, making the change breaking | — |
| P-17 | Several registry tables use TypeORM's default naming (`@Entity()` with no name): `result_type`, `gender_tag_level`, `result_level` and others. The physical names written in the registry match the database | data-env | `UNVERIFIED — confirm at source before relying on it` | — | Statement fails, and the batch returns 500. Low (DD-5's metadata check catches it at test time) | T-2 (metadata spec) |
| P-18 | `toc_results_melias` (ToC DB) has a single-column primary key that gives a deterministic pick when one `melia_id` joins several rows. Its titles per `melia_id` are equal | data-env | `UNVERIFIED — confirm at source before relying on it` | — | `toc_melia_studies` needs another pick rule or a known gap. **High** for that list only | T-1 step 2 (ToC DB query) |
| P-19 | `policy_change.amount_status` (stored text `status_amount`) arrives in `values` as a string such as `"2"`, not a number | data-env | `UNVERIFIED — confirm at source before relying on it` | — | The constant's keys and the collector's key normalization change. Low | T-3 (fixture through `value-typing`) |
| P-20 | Indicator ids (`toc_results_indicators`) are unique per `related_node_id` within a phase. A label read by `related_node_id OR id` returns one title per id | data-env | `UNVERIFIED — confirm at source before relying on it` | — | Pick by lowest PK, and record the gap. Low | T-1 step 2 |
| P-21 | `clarisa_geographic_scope` has a row 4. Its DB name differs from the client text ("Country") | data-env | `UNVERIFIED — confirm at source before relying on it` | — | Nothing: DD-4 uses the client constant either way. The row only informs the contract note. Low | T-1 step 1 |
| P-22 | The owner's decisions: inactive row → label (OQ-1); person-bearing labels with their field (OQ-2); QA fixture path (OQ-3); canonical text (R-3); impact areas as a separate bugfix | other | `requirements.md` §10 and QVL-R-3 (Phase 1 and 2 gates, 2026-11-09) | — | Scope | — |

## 2. Architecture Overview

### 2.1 Where this lives

```text
details() ──classify──► eligible ids
          ──readValues──► base + paths + lookups ──► project/normalize ──► results[].values   (unchanged)
          ──collectLabels(results, fields)──► per result: Map<list, Set<id>>; batch union
          ──resolveLabels(union, run, env)──► Map<list, Map<id, label|null>>   (guarded, counted)
          ──attach──► results[].labels = per-result slice                       (new)
```

### 2.2 Interaction

1. **Collect.** For each result, walk `out` with each applicable field's definition. At every select node (`single_select`, `multi_select`; field, subfield, depth-2 subfield) that names a `control_list`, add each non-null id to `(list, String(id))`. A `text` node is skipped even when it names a list (`general.lead_contact_person`).
2. **Plan.** Group the batch union by source. Constant lists resolve in memory. Table lists sharing one (source, key column) share one `PlanQuery` with `any_in` over the union of their ids. A chained source (centers) adds one follow-up query for its second table.
3. **Resolve.** Run the queries through the counted `run`, inside `guarded`. Format each row with the list's composer. An id with no row is `null`.
4. **Attach.** Each result gets only its own pairs (R-2), as `{ list: { id: label|null } }`, or `{}`.

## 3. Data Model Changes

None: no entity, migration or catalog change.

## 4. API Surface

`POST /api/qa/results/details`: each `results[]` element gains `labels: Record<string, Record<string, string | null>>`. The route, guard, grant, body, status codes and every other property are unchanged. `GET /api/qa/catalog` and `GET /api/qa/results` are unchanged. The Swagger DTO (`dto/qa-results-response.dto.ts`) gains the property.

## 5. Server Workflow / Business Rules — the label of each list

**Kinds:**
- **C** = server constant mirroring the client.
- **T** = PRMS table.
- **TC** = PRMS table, chained through a second table.
- **ToC** = a table in the ToC database (through `resolveLookupSource`, `DB_TOC`).

No source filters on an active or deleted flag (OQ-1). `null` = no row.

| List | Kind | Source → label | Places the form shows something else |
|---|---|---|---|
| countries | T | `clarisa_countries.id` → `name` | The dropdown prefixes `ISO2 - ` |
| regions | T | `clarisa_regions.um49Code` → `name` | — |
| subnational_areas | T | `clarisa_subnational_scopes.code` (text) → first non-empty of `name`, `local_name`, `romanization_system_name` | The form adds ` - <other names>` |
| geographic_scopes / extra_geographic_scopes / ipsr_geographic_scopes | C | 1 Global · 2 Regional · 3 Country · **4 Country** · 5 Sub-national · 50 This is yet to be determined (`geoscope-management.component.ts:36-41,205-206`) | The server folds 4 into 3 on read; the DB `name` is not used |
| institutions | T | `clarisa_institutions.id` → `name` | The selects show `(Id:n) ACR - name - HQ country` (cap dev, policy change, lead partner, KP partner) |
| institution_types | T | `clarisa_institution_types.code` → `name` | A sub-type id appears in the form's Sub-type select |
| partner_delivery_types | C | 1 Scaling · 2 Demand · 3 Innovation · 4 Other (`normal-selector.component.html:132-177`) | — |
| centers | TC | `clarisa_center.code` (text) → `clarisa_institutions` (`institutionId`) → `acronym - name` | 2026 chips show the acronym; IPSR chips show the name |
| initiatives | T | `clarisa_initiatives.id` → `official_code - name` | Submitter adds `short_name` |
| projects | T | `clarisa_projects.id` → `full_name`, falling back to `short_name` when blank | The investment tables show `short_name`; contributors appends ` (Center: …)`; dropdown text comes from the ToC DB |
| innovation_types | T | `clarisa_innovation_type.code` → `name` | The select adds the definition |
| innovation_characteristics | T | `clarisa_innovation_characteristic.id` → `name` | The select adds the definition |
| innovation_use_levels · use_levels · readiness_levels | T (or TC per P-14) | `clarisa_innovation_use_levels.id` / `clarisa_innovation_readiness_level.id` → `name`. If T-1 refutes P-14: id → `level` → the `name` of the row with that level among ids 1..10 | The IPSR workshop table shows the list position, not the name |
| results · qa_innovation_dev_results · ipsr_bundle_candidates | T | `result.id` → `result_code - title` | Linked results prefix `(ACR - year)` and the type; IPSR cards show the title |
| users | T | `users.id` → trimmed `first_name last_name`; empty → `null` | — (person-bearing) |
| directory_users | T | `ad_users.id` → `display_name` | The form adds `mail - title` on a second line, and falls back to the free text when the user is inactive (person-bearing) |
| result_types | T | `result_type.id` → `name`, except **9 → "Impact result"** (client `impact-result.util.ts:4-5,24-26`) | The IPSR card shows "Created in IPSR" / "PRMS result" |
| result_statuses | T | `result_status.result_status_id` → `status_name` | — |
| result_levels | T | `result_level.id` → `name` | The type-9 header shows `Impact · Impact Area …` |
| discontinued_reasons | T | `investment_discontinued_option.investment_discontinued_option_id` → `option` | The form hides a reason that is inactive or from another generation |
| tag_levels | T | `gender_tag_level.id` → `title` | The segmented control prefixes a digit 0-2 (id − 1) |
| impact_area_components_{gender, climate, nutrition, environmental, poverty} | T | `impact_areas_scores_components.id` → `name`, **no area filter** | Known gap: the field may hold other areas' ids (P-12); separate bugfix |
| question_options_gesi_stage · _risk_stage · _ipr · policy_related_questions | T | `result_questions.result_question_id` → `question_text` | `related_to` ids differ per environment (known gaps 15 and 18) |
| policy_types | T | `clarisa_policy_type.id` → `name` | — |
| policy_stages | T | `clarisa_policy_stage.id` → `name` | The select adds ` - definition` |
| policy_amount_statuses | C | 1 Confirmed · 2 Estimated · 3 Unknown (`policy-change-info.component.html:26-39`); keyed by the stored text | Another stored text → `null` |
| assessed_workshop_options | T | `assessed_during_expert_workshop.id` → `name` | — |
| complementary_functions | T | `complementary_innovation_functions.complementary_innovation_functions_id` → `name` | — |
| complementary_innovation_enabler_types | T | `complementary_innovation_enabler_types.complementary_innovation_enabler_types_id` → `group` | The level-0 parent's group is shown as a header |
| eoi_outcomes | ToC | `toc_results.id` → `result_title` | — |
| actor_types | T | `actor_type.actor_type_id` → `name` | — |
| actor_count_unit · actor_use_nature | C | households "Households" · individuals "Individual actors" · information_received "Actors who received information, advice or inputs" · innovation_applied "Actors who applied the innovation" (`farmer-follow-up.ts:33-54`) | — |
| capdev_training_lengths · capdev_degrees | T | `capdevs_term.capdev_term_id` → `name` (read from the normalized value: length 4 = "Long-term") | — |
| capdev_delivery_methods | T | `capdevs_delivery_methods.capdev_delivery_method_id` → `name` | — |
| evidence_sources | C | 0 Link · 1 Upload file (`evidence-item.component.ts:83-86`) | — |
| melia_types | T | `clarisa_melia_study_type.id` → `name` | — |
| toc_melia_studies | ToC | `toc_results_melias.melia_id` (text) → `title`, lowest PK first (P-18) | — |
| toc_levels | C | 1 High Level Output · 2 Intermediate Outcome · 3 2030 Outcome (`toc-level.service.ts:30-48`) | AVISA (SGP-02, initiative 41) uses other names on the result's own mappings; known gap |
| toc_results | ToC | `toc_results.id` → `result_title` | Levels 1 and 2 prefix the work-package acronym |
| toc_results_indicators | ToC | `toc_results_indicators`, matched on `related_node_id` or `id` → `indicator_description`, lowest PK first (P-20) | A legacy numeric id shows nothing in the form |

## 6. Frontend Plan

None in this repository. QA renders `labels` (P2-3910, `onecgiar_qa`).

## 7. Security & Authorization

- The route, guard and grant are unchanged.
- Physical names stay in the registry and never reach a response or an error (QRF-R-9).
- Labels and ids are never logged.
- Person-bearing labels come only from returned person-bearing fields (R-6). They follow automatically from collecting over the returned `values`.
- `directory_users` returns `display_name` only, never the email.

## 8. Performance & Capacity

- Label statements = distinct table sources touched + 1 per chained source.
  - Upper bound for a batch that spans all 9 types: about 33 table sources + 1 chain.
  - A batch narrowed by `field_keys` touches fewer.
  - The count never depends on ids or results (R-7).
- The queries run concurrently (`Promise.all`) through the pool. The existing value reads stay sequential.
- Each query reads by primary key or by an indexed code (`any_in` on one column, or two for indicators).
- T-1 measures the baseline. The NFR bound is p95 +30 %.

## 9. Observability

The details log line gains `labels=<number of (list, id) pairs in the response>`. `statements=` includes the label queries. Nothing else is logged.

## 10. Testing Plan

| Defect class | Test |
|---|---|
| D-1 text vs form | (a) The client-mirror spec reads each cited client file **as text** and asserts that every constant label string occurs there. Falsifier: change one constant letter → red. (b) T-7 HITL samples one option per list on prtest |
| D-2 coverage | Collector spec over fixtures holding depth-2 ids (`contributors.science_programs/toc_entries/toc_result`, `geo.countries/subnational`). It asserts the walk equals an independent enumeration. Falsifier: walk depth ≤ 1 → red |
| D-3 extra ids | Two-result fixture plus a `field_keys` fixture (R-2 scenarios) |
| D-4 `values` altered | Golden: the same request is answered with the labels step stubbed out versus real, compared under `stableStringify` with `labels` removed |
| D-5 N+1 | Statement-counting runner: batch 1 vs 50 with the same lists → equal label statements |
| D-6 missing source | Completeness spec: walk `CATALOG_FIELDS` (never grep, P-4); every list is in the registry. Falsifier: delete one entry → red, naming it |
| D-6b wrong table or column | Metadata spec: every T/TC table and column exists in entity metadata (P-7, P-17). ToC sources are cited to their repository SQL instead |
| D-7 key types | Fixture with numeric, code (`CENTER-02`, `households`) and text-numeric (`"2"`) ids. Every JSON key is asserted a string |
| D-8 logs | Log-line spec on the exact format |
| D-9 hash | Existing snapshot guard green, no revision bump |
| D-10 types | `npx tsc --noEmit` |
| D-11 latency | T-1 baseline and T-7 after, 6 runs each, on prtest |

## 11. Backwards Compatibility & Rollout

- Additive. QA's `parseDetails` ignores `labels` until P2-3910 reads it (P-16).
- The change ships on `performance-refactor` (prtest), then follows the `/api/qa/*` path to PROD.
- Rollback: revert the commit. There is no data and no migration.

## 12. Design Decisions

### QVL-DD-1 — Per-result `labels` grouped by list (Option A)

`values` is untouched, and each snapshot is self-contained. Rejected:
- a batch-level dictionary (QA must slice it per snapshot);
- inline `{id, label}` (breaks ADR-004);
- a new contents route (not asked; needs a grant; no point-in-time label).

### QVL-DD-2 — Collect from the projected `values`

The labels describe exactly what is returned. That covers normalization (P-2), `field_keys`, applicability and the person-bearing rule with no extra logic. Collecting from bindings or raw rows was rejected: it would label values that are not returned.

### QVL-DD-3 — One `PlanQuery` per source table, through the feed's runner

The resolver reuses:
- `PlanQuery` with `any_in`, and the renderer (P-5);
- `resolveLookupSource` for the ToC schema (P-6);
- the counted `run`;
- the `guarded` boundary (R-9).

Lists sharing a table share a query: the four question lists, the three result lists, the two capdev term lists and the use-level lists. A chained source issues one follow-up query over the first query's foreign keys. Composition happens in TypeScript, not SQL. Rejected: one `UNION ALL` per database. It needs a new renderer, and its gain over ≤ ~34 concurrent primary-key reads is not measured. T-7 revisits it if the NFR fails.

### QVL-DD-4 — Canonical text per list; client-only texts as constants citing their source

This implements R-3 as amended. Each constant carries its client `file:line`, and the client-mirror spec (§10) pins it. The type 9 rename is a constant override on a table source.

### QVL-DD-5 — The registry is code, checked three ways

The registry is code, outside the catalog fields, so the catalog hash does not change (P-3). It is checked three ways:
1. Completeness, by walking `CATALOG_FIELDS`.
2. Entity metadata, for tables and columns.
3. The client mirror, for constants.

A new list, a renamed column or an edited client text fails a test.

### QVL-DD-6 — Premises about rows are settled by querying, before code builds on them

T-1 runs read-only queries on the test DB, and on prod through the owner. They settle P-14, P-18, P-20 and P-21, and measure the baseline. This applies KZ-quality-assurance--qa-intake-1.

**Reversion challenge (Step 2.3):** no DD removes, disables or inverts shipped behavior, so the challenge does not apply.

## 13. Budget (Step 2.4)

| Item | Estimate |
|---|---|
| Tasks | 7 |
| LOC | ~1 400 (≈ 500 production: registry ~250, collector ~80, resolver ~150, service ~20; ≈ 700 tests and fixtures; ≈ 200 docs and QA fixture) |
| Review rounds | ~10 (one per task, plus margin for the registry and resolver) |

This sits within Full depth. Exceeding it is a tripwire for `/akili-execute`.

## 14. Open Gaps & Follow-ups

| Gap | Handling |
|---|---|
| Impact-area binding has no area filter (P-12) | A separate bugfix spec and ticket (owner, 2026-11-09). A comment goes on P2-4037. The contract records it as a known gap |
| AVISA ToC level names | Known gap in the contract |
| Client text edited later | The client-mirror spec catches constant drift. Table-sourced composition drift is a known gap |
| Linked results `(ACR - year)` prefix, institution `full_name`, Submitter `short_name` | Documented as "places the form shows something else" (R-3) |
