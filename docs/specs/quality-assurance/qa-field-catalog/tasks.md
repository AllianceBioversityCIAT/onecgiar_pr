# Tasks — QA field catalog (`quality-assurance/qa-field-catalog`)

## 1. Scope

- **Module / feature:** `quality-assurance` / `qa-field-catalog`
- **Linked spec:** `requirements.md` (`QAC-R-1…12`) + `design.md` (DD-1…9, P-1…13)
- **Owner:** Juan David Delgado
- **Status:** not-started
- **Approval Mode:** pre-approved (Juan David, 2026-10-06) for routine gates; T-7 HITL review and escalations still stop

## 2. Pre-flight

- [x] Base branch: `performance-refactor` (owner, 2026-10-06). Work branch `JuanGuzman-io/feature-qa-result-fields` = `origin/performance-refactor` @ `356ea3c24`. Re-check branch before every commit.
- [ ] `onecgiar-pr-server/.env` present in the worktree (copy from the main checkout).
- [ ] Tests always scoped: `npx jest --testPathPattern="qa-catalog" --silent --reporters=summary --forceExit` — never the full suite.
- [x] QAC-OQ-1: CLARISA API key (DD-6).
- [ ] P25 `validation_*` definitions supplied by the owner before T-7 closes.

Common verification for every server task: scoped Jest above · `npx tsc --noEmit -p tsconfig.json` · `npx eslint "src/api/qa-catalog/**/*.ts" --quiet`.

## 3. Task list

### [x] QAC-T-1 — Catalog types, shape validator, skeleton definitions

- **Type:** server · **Estimate:** M · **Review:** checklist — new isolated files, no shared consumer
- **Description:** Define `CatalogResultType`, `CatalogSection`, `CatalogField`, `CatalogSubField`, `StorageBinding`, `RequiredWhen`, `NotForQaEntry` types; `result-types.ts` (9 types, keys + labels + level); `versions.ts` (`2026 → {portfolio:'P25', revision:1}`); empty `sections/`; a pure `isValidIn(entry, year)` helper; shape-validator spec.
- **Implements:** QAC-R-1 (all clauses incl. both `AND IT MUST` rejections), QAC-R-3 (validity rule), QAC-R-7 (`NOT_FOR_QA` reason non-empty)
- **Design:** §3, §6 `definitions/*`, Shape spec, DD-4, DD-9
- **Files:** `onecgiar-pr-server/src/api/qa-catalog/definitions/**`, `qa-catalog.shape.spec.ts`
- **Depends on:** — · **Blocks:** T-3, T-4, T-5, T-6, T-8
- **Verification:** shape spec with fixtures: select without `control_list` → error; `list`/`object` without subfields → error; `valid_from > valid_to` → error; duplicate key → error; unknown section/result type → error; empty `NOT_FOR_QA` reason → error; `isValidIn` table (2025/2025 valid only in 2025; null `valid_to` open-ended).
- **Falsifier:** remove the control-list check from the validator → the "select without control_list" case goes green-to-red; fixture must contain one select without `control_list` and one with it.
- **Red run:** each rejection case observed failing on its assertion before the validator rule exists.
- **Disqualifier:** a case that passes because the fixture is malformed elsewhere (two errors at once) — each fixture must violate exactly one rule and the test asserts the specific error.
- **Consumers:** none (new symbols).
- **Done:** all shape rules covered one-fixture-per-rule; `tsc` green.
- **Skills:** `nestjs-expert`, `tdd`

### [x] QAC-T-2 — Catalog entities and migration

- **Type:** db · **Estimate:** M · **Review:** full — migration
- **Description:** Entities `qa_catalog_result_type`, `qa_catalog_section`, `qa_catalog_field` (incl. `parent_key`, `required_confirmed`, `storage` JSON, `required_when` JSON), `qa_catalog_version` per design §4. Generate the migration with `npm run migration:generate --name=QaCatalogTables`, **prune** every statement not about these 4 tables. Do not run it — the owner runs migrations.
- **Implements:** QAC-R-6 (tables exist to receive the sync), QAC-R-3 (`valid_to` column, rows kept)
- **Design:** §4, DD-4, DD-9, P-7, P-9
- **Files:** `src/api/qa-catalog/entities/*.entity.ts`, `src/migrations/<ts>-QaCatalogTables.ts`
- **Depends on:** — · **Blocks:** T-3
- **Verification:** migration file contains only `CREATE TABLE`/indexes for the 4 tables and the matching `down`; `npx tsc --noEmit`; entity metadata spec asserts table names and the unique (`key`,`parent_key`) index.
- **Falsifier:** leave one unrelated generated statement in the migration → the review grep `grep -c "qa_catalog" <migration>` vs total statements mismatches.
- **Red run:** n/a — schema declaration; metadata spec written before entities fails on missing class.
- **Disqualifier:** `migration:generate` run against a DB already containing the tables (empty diff) — must be generated against a DB without them.
- **Consumers:** none.
- **Done:** pruned migration committed; owner notified to run it in dev.
- **Skills:** `nestjs-expert`

### [x] QAC-T-3 — Boot-time sync service

- **Type:** server · **Estimate:** M · **Review:** full — writes on every boot
- **Description:** `QaCatalogSyncService` (`OnApplicationBootstrap`): read existing keys, insert missing, update changed field-by-field, never delete, warn on orphans, wrap in try/catch logging counts only; upsert the `qa_catalog_version` row per declared year.
- **Implements:** QAC-R-6 (all scenarios: idempotent; removed-from-code not deleted + warning; failure does not stop the app), QAC-R-3 (row persists after retirement)
- **Design:** §6 Sync, DD-1
- **Files:** `qa-catalog-sync.service.ts`, `qa-catalog-sync.service.spec.ts`
- **Depends on:** T-1, T-2 · **Blocks:** T-12
- **Verification:** unit tests with mocked repositories: (a) empty tables → N inserts; (b) identical → 0 writes; (c) one label changed → 1 update; (d) orphan row → 0 deletes + warning with key; (e) repository throws → method resolves, error logged, no secret/PII in message; (f) never calls `delete`/`remove`.
- **Falsifier:** add a `delete` of orphans → test (d)/(f) red; make compare always "changed" → test (b) red.
- **Red run:** (b) and (d) observed failing on their assertions before implementation.
- **Disqualifier:** mocks that return the same object reference for "existing" and "code" rows make (b) pass trivially — fixtures must be distinct copies.
- **Consumers:** none.
- **Gap:** real MySQL behavior (JSON compare, unique index) is verified only in T-12's local run.
- **Done:** all six cases green.
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`

### [x] QAC-T-4 — Completeness guard

- **Type:** tests · **Estimate:** M · **Review:** full — it is the CI gate
- **Description:** `scope.ts` (in-scope entity classes; starts with none), `excluded-tables.ts` (every `results?_` table not in scope, with reason — initially all, reason `pending QAC-T-8…11` or a real reason), `not-for-qa.ts`. Guard spec reads `getMetadataArgsStorage()` tables, columns and join columns, walking the prototype chain; subtracts bindings (fields + subfields) and `NOT_FOR_QA`.
- **Implements:** QAC-R-7 (both scenarios: new column fails naming `table.column` / passes once bound or listed; stale entry fails), DD-3
- **Design:** §6 Completeness guard, DD-2, DD-3, DD-8, P-2
- **Files:** `definitions/scope.ts`, `definitions/excluded-tables.ts`, `definitions/not-for-qa.ts`, `qa-catalog.completeness.spec.ts`
- **Depends on:** T-1 · **Blocks:** T-8…T-12
- **Verification:** guard runs on the real (empty) scope green; a **test-only fixture entity** (declared in the spec, extending `AuditableEntity`) proves: uncatalogued own column → failure message contains `fixture_table.foo_bar`; inherited audit column → detected; binding to non-existent column → stale failure; a new `@Entity('results_fixture')` neither in scope nor excluded → failure.
- **Falsifier:** drop the prototype-chain walk → the inherited-column case stays green → test red (fixture must have a column only on the base class).
- **Red run:** each fixture case observed failing on its message assertion.
- **Disqualifier:** a guard that passes because `scope` is empty and the fixture is not wired through the same code path — fixture cases MUST call the same function the real-scope test calls.
- **Consumers:** none (new).
- **Done:** guard + fixtures green; real scope green.
- **Skills:** `nestjs-expert`, `tdd`

### [x] QAC-T-5 — Snapshot and catalog-version integrity

- **Type:** tests · **Estimate:** S · **Review:** full — governs key immutability
- **Description:** Canonical hash per year of the effective catalog; `__snapshots__/qa-catalog.snapshot.json`; `npm run qa-catalog:snapshot`; spec enforcing the three rules.
- **Implements:** QAC-R-2 (scenario: key disappears → fails naming key; BUT gaining `valid_to` does not fail), QAC-R-8 (change w/o bump fails; bump w/o change fails)
- **Design:** §6 Snapshot spec
- **Files:** `qa-catalog.snapshot.spec.ts`, `__snapshots__/…json`, `scripts/qa-catalog-snapshot.ts`, `package.json` script
- **Depends on:** T-1 · **Blocks:** T-8…T-12
- **Verification:** spec over in-memory fixture catalogs: remove key → red naming it; add `valid_to` (with bump) → green; change label without bump → red; bump without change → red; hash stable across key ordering.
- **Falsifier:** hash computed over unsorted keys → the "stable across ordering" case red.
- **Red run:** each rule observed failing on assertion.
- **Disqualifier:** a fixture where adding `valid_to` also removes the field from the effective year so "key missing" fires for the wrong reason — the key check uses all keys ever declared, not the year's effective set.
- **Consumers:** `package.json` (scripts block) — `grep -n '"qa-catalog' package.json` before/after.
- **Done:** rules green; snapshot file for 2026 (empty catalog, revision 1) committed.
- **Skills:** `nestjs-expert`, `tdd`

### [x] QAC-T-6 — Service, mapper, controller, route, auth

- **Type:** server · **Estimate:** M · **Review:** full — auth + external contract
- **First step:** read `src/shared/guards/throttler-exclude-bilateral.guard.ts` and settle **P-11**; QAC-OQ-1 = CLARISA key (DD-6).
- **Description:** `QaCatalogService.getCatalog(year)`; whitelist response mapper; controller `GET /catalog` with query DTO; `QaCatalogModule` providing `HttpModule`, `ClarisaApiKeyValidationService`, `ClarisaApiKeyGuard`; route `qa` in `modules.routes.ts`; `api/qa/catalog` in the `JwtMiddleware` exclude list (`app.module.ts:142-151`); throttler exclusion if P-11 requires it.
- **Implements:** QAC-R-3 (2026 request omits field retired in 2025), QAC-R-4 (no table names leak), QAC-R-9 (200 shape, 400, 404 incl. "must NOT return empty 200", ordering, `["*"]`, scenario 2025 vs 2026 via fixtures), QAC-R-10 (credential required, JWT not accepted, never logged), QAC-R-12
- **Design:** §2, §5, §6, DD-1, DD-5, DD-6, P-3, P-10, P-11
- **Files:** `qa-catalog.service.ts`, `qa-catalog.controller.ts`, `qa-catalog.module.ts`, `dto/*`, `src/api/modules.routes.ts`, `src/app.module.ts`, specs
- **Depends on:** T-1 · **Blocks:** T-12
- **Verification:** service spec with a fixture catalog (fields 2025-only, 2026-only, both, retired; `["*"]`); mapper spec: serialize every response and assert no `storage`, `table`, `column`, `required_confirmed`, `id` keys (deep scan); controller spec: missing year → 400, `abc` → 400, `2023` → 404, valid → 200; guard metadata spec asserts `@BilateralClarisaEndpoint('/api/qa/catalog')` and `UseGuards(ClarisaApiKeyGuard)`; app.module middleware spec/grep asserts the exclude entry.
- **Falsifier:** mapper switched to spread-then-delete with `storage` forgotten → deep-scan red (fixture field must carry a `storage` binding); remove the exclude entry → middleware assertion red.
- **Red run:** 404 and leak tests observed failing on assertion before implementation.
- **Disqualifier:** a 401 test that passes because the route is unmounted (404/401 confusion) — assert the route resolves with a valid mocked key first.
- **Consumers:** `src/app.module.ts` exclude list and `modules.routes.ts` — sweep `grep -rn "JwtMiddleware\|ModulesRoutes" src --include='*.spec.ts'` and run those specs.
- **Done:** all cases green; manual `curl` against local server with and without key (key never echoed).
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`

### [x] QAC-T-7 — 2026 inventory draft (HITL pause)

- **Type:** docs · **Estimate:** L · **Review:** checklist — artifact reviewed by the owner
- **First steps:** settle **P-5** (query `version` + `clarisa_portfolios` in the env, owner runs or supplies output), **P-12** (Explore the client result-detail + P25 framework-reporting forms), **P-6** (owner supplies each P25 `validation_*` via `SHOW CREATE FUNCTION`).
- **Description (amended 2026-10-06, DD-11):** list every field of the 2026 form per type, marking which are required by a `validation_*` (stage 1) and which are optional (stage 1 if cheap, else `PENDING_CATALOG`). `inventory/2026.md`: one table per result type + one for common sections — key, label, type, section, order, control list, storage binding, required, `required_when`, confirmed?, origin (`file:line` of the form control / validation function). Proposed `NOT_FOR_QA` list with reasons and in-scope table list. `description` only from existing help text.
- **Implements:** QAC-R-5 (rules from live definitions; unconfirmed marked, never silent `false`), QAC-R-11 (HITL review; keys freeze at review; description rule), QAC-OQ-4
- **Design:** §3 inventory, DD-7, P-5, P-6, P-12
- **Depends on:** — (parallel with T-1…T-6) · **Blocks:** T-8…T-11
- **Verification:** every row has an origin citation; every field of every type in the 2026 form appears (cross-check: form control count per type vs rows); **HITL pause — owner approves the inventory**.
- **Falsifier:** a field present in the form but missing from the inventory — the per-type control count mismatch reveals it.
- **Red run:** n/a — document.
- **Disqualifier:** a count cross-check run against a phase-gated form branch that is not the 2026 one — counts must come from the 2026 P25 path.
- **Consumers:** none.
- **Done:** owner approval recorded in the inventory header with date.
- **Skills:** `nestjs-expert`, `angular-developer` (reading the form)

### [x] QAC-T-8 — Catalog: common sections

- **Type:** server · **Estimate:** L · **Review:** checklist — declarative data against an approved inventory
- **Description:** Transcribe common sections (general information, ToC alignment, contributors/partners, geography, impact areas/tags, evidence, links) from the approved inventory; move their tables from `excluded-tables.ts` to `scope.ts`; add their `NOT_FOR_QA`; create `definitions/pending-catalog.ts` and make the completeness guard subtract it (DD-11) with a fixture test, then list the not-yet-catalogued optional columns there; bump 2026 revision; regenerate snapshot.
- **Implements:** QAC-R-11 (common part), QAC-R-1, QAC-R-7 (real scope grows)
- **Design:** DD-8
- **Depends on:** T-4, T-5, T-7 · **Blocks:** T-12
- **Verification:** shape + completeness + snapshot specs green; diff of keys vs the inventory's common rows = empty (script or review).
- **Falsifier:** remove one column binding → completeness guard red naming it.
- **Red run:** moving the tables into scope before transcribing must turn the guard red (observed once).
- **Disqualifier:** green guard with a table still in `excluded-tables.ts` — check those tables left the excluded list.
- **Consumers:** none.
- **Done:** specs green; key list matches inventory.
- **Skills:** `nestjs-expert`

### [x] QAC-T-9 — Catalog: output types

Same shape as T-8 for knowledge product, capacity sharing, innovation development, other output. **Implements:** QAC-R-11, R-1, R-7. **Depends on:** T-8. **Review:** checklist. Falsifier / Red run / Disqualifier as T-8. **Consumers:** none. **Skills:** `nestjs-expert`.

### [x] QAC-T-10 — Catalog: outcome and impact types

Same shape as T-8 for policy change, innovation use, other outcome, impact contribution. **Implements:** QAC-R-11, R-1, R-7. **Depends on:** T-8. **Review:** checklist. Falsifier / Red run / Disqualifier as T-8. **Consumers:** none. **Skills:** `nestjs-expert`.

### [x] QAC-T-11 — Catalog: innovation package (IPSR)

Same shape as T-8 for IPSR. **Implements:** QAC-R-11, R-1, R-7. **Depends on:** T-8. **Review:** checklist. Falsifier / Red run / Disqualifier as T-8. **Consumers:** none. **Skills:** `nestjs-expert`.

### [x] QAC-T-12 — Close-out: pending list, contract doc, local sync run

- **Type:** rollout · **Estimate:** M · **Review:** full
- **Description:** Assert `excluded-tables.ts` has no `pending` reasons left (test) — `PENDING_CATALOG` entries are allowed (DD-11) and are reported as a count in the contract doc; write `onecgiar-pr-server/docs/qa-catalog.en.md` (contract, status codes, change log v1); local run: owner runs the migration in dev, app boots twice — first boot inserts, second logs 0/0; `curl` 2026 → 200, 2023 → 404. Record TRD §7 QA row as pending (applied on `staging`).
- **Implements:** QAC-R-6 (real DB idempotence — closes T-3 gap), QAC-R-7 (complete scope), QAC-R-9 (live check), QAC-R-11 (all 9 types present), NFR compatibility/observability
- **Depends on:** T-3, T-6, T-9, T-10, T-11 · **Blocks:** —
- **Verification:** scoped Jest + `tsc` + eslint; boot logs; `curl` outputs (no key in transcript); type list in response = 9.
- **Falsifier:** leave one `pending` reason → new test red.
- **Red run:** pending-list test red before T-9…T-11 land.
- **Disqualifier:** a second-boot "0 updates" read from a DB where the first boot failed silently — confirm row counts after first boot.
- **Consumers:** none in repo (P-13); external: QA platform.
- **Done:** all green; doc committed; owner sees the live response.
- **Skills:** `nestjs-expert`, `api-design-principles`

### QAC-T-13 — (Optional) 2025 inventory and load

Inventory from the 9 `QA_RESULTS_2025` queries (field identity only; HTML ignored) diffed against 2026; set `valid_from=2025` on shared fields, `valid_to=2025` on retired ones, add 2025-only fields; `versions.ts` 2025 entry; HITL review as T-7. **Implements:** QAC-R-9 (2025 vs 2026 scenario on real data), QAC-R-3, QAC-R-11 (2025 MAY). **Depends on:** T-12. **Review:** checklist. **Falsifier:** a 2026-only field leaking into 2025 → service test red. **Consumers:** none. **Skills:** `nestjs-expert`.

### [x] QAC-T-14 — Model extension: display rules, depth 2, path and lookup bindings (amendment 2026-10-07)

- **Type:** server · **Review:** full (contract + CI gate)
- **Description:** types (`visible_when` on field/subfield; `required_when` on subfield; nested subfields depth 2; `PathBinding`, `LookupBinding`); shape validator (condition keys exist and are valid that year; depth ≤ 2; path steps well-formed; lookup has source + key_from); completeness guard (path steps' columns subtracted; lookups ignored; path tables must be in scope); response mapper exposes `visible_when` / `required_when` (and nested subfields), still never storage; sync unaffected beyond JSON; snapshot hash includes the new data; contract doc updated.
- **Implements:** QAC-R-13, QAC-R-14 (mechanics), DD-12, DD-13
- **Depends on:** T-1…T-12 (done)
- **Verification:** qa-catalog Jest suites; fixtures per new rule (unknown key in condition → error; depth 3 → error; path column unbound → guard error; lookup not checked by guard); mapper deep-scan still finds no storage; tsc; eslint.
- **Falsifier:** remove the condition-key check → the "unknown key" fixture stays green → red required.
- **Consumers:** response shape (QA) — additive; contract doc change log.

### [x] QAC-T-15 — Contributors & partners fully parametrized (amendment 2026-10-07)

- **Type:** server · **Review:** full
- **Description:** from the 2026 client form (`rd-contributors-and-partners.component.*` and its child components) transcribe every field with its `visible_when` / `required_when`: submitter; planned result; Multiple WPs (`toc.entries`: level, output/outcome, HLO statement [lookup], KPI [path], indicator typology / unit / target [lookup], contribution to target [path]); program invested; narrative; lead center before contributing centers; contributing centers (from ToC) and other(s) centers; Contributing Science Program/Accelerator (list depth 2: program, from ToC/other, planned result, its own ToC mappings); bilateral projects; external partners applicability; partners list (institution, partner type [lookup], partner role [path]); led by external partner; lead partner; linked/bundled + results. Remove the now-bound columns from `PENDING_CATALOG`. Form order.
- **Implements:** QAC-R-13, QAC-R-14 for this section; owner walk-through 2026-10-07
- **Depends on:** QAC-T-14
- **Verification:** qa-catalog suites; a test asserting each owner-listed field and its rule; live endpoint response saved to `tmp/qa-catalog-2026.json`.

### [x] QAC-T-16 — Geographic location (Results) fully parametrized (amendment 2026-10-07)

- **Type:** server · **Review:** full
- **Description:** Results only (IPSR geography out of scope for now — owner, 2026-10-07). From the 2026 client form (rd-geographic-location and its children): `visible_when` / `required_when` for every field; `geo.countries` and `geo.extra_countries` become `list` (country → its subnational areas via path on `result_country_subnational`), replacing the D2-pending subnational keys; `geographic_scopes` as a CLOSED list with ids from an authoritative source (client `GeoScopeEnum` 1/2/3/5/50, DB/CLARISA for 4 — verify, D24). Remove now-bound columns from PENDING_CATALOG.
- **Implements:** QAC-R-13, QAC-R-14 for Geo
- **Depends on:** QAC-T-14, QAC-T-15
- **Verification:** qa-catalog suites; a test for each conditional field's rules; live/service response saved to `tmp/qa-catalog-2026.json`.

### [x] QAC-T-17 — Evidence (Results) fully parametrized (amendment 2026-10-07)

- **Type:** server · **Review:** full
- **Description:** Owner: QA must receive ALL evidence data, not only what the green-check function requires (validations only drive `required`). Each `evidence.items` element: source (link / upload), link URL (when link), uploaded file: is_public, file name, file URL (when upload; URL delivered even when private — `is_public` tells QA how to treat it), description (verbatim help text), impact-area flags (each visible when its GI tag is Principal = id 3), other-output / innovation-readiness flags per result type as the form shows. Bindings on `evidence` and `evidence_sharepoint` (path). Remove now-bound columns from PENDING_CATALOG. Results only.
- **Implements:** QAC-R-13, QAC-R-14 for Evidence
- **Depends on:** QAC-T-16
- **Verification:** qa-catalog suites; a test per conditional subfield; service response saved to `tmp/qa-catalog-2026.json`.

### [x] QAC-T-18 — Innovation development (Results) fully parametrized (amendment 2026-10-07) · P2-3925

- **Type:** server · **Review:** full
- **Description:** Every field of the 2026 Innovation Dev info form (owner listed from prtest result 9765, phase 36): short name; characterization; typology; new/improved variety (+ number of varieties); GESI stage (+ Why? when Not applicable); risk stage (+ Why?); IPR consideration and its follow-ups (entry points text, formal IPR, IP expert support); innovation developers (list); collaborators; team diversity (+ actions 116–121 when 113, + Other text); readiness level; readiness justification; readiness-diminished notice (if stored); the three investment tables (SP/A pooled, W3/bilateral projects, partners) with "yet to be determined". Question-tree rule: each question = a field; its options = a CLOSED control list of `result_questions` ids (ids equal in test and prod, verified 2026-10-07); sub-questions = fields/subfields with `visible_when` on the chosen id; free texts tied to an option = text fields with their rule. Phase-gated 2026 removals (user-need evidence, anticipated users, scaling studies, reference materials) stay out (or PENDING with reason). Results only.
- **Implements:** QAC-R-13, QAC-R-14 for Innovation development
- **Depends on:** QAC-T-17
- **Verification:** qa-catalog suites; a test per conditional field; closed-list ids checked; service response saved to `tmp/qa-catalog-2026.json`.

### [x] QAC-T-19 — `required` follows the form in all Results sections (amendment 2026-10-07, option B) · P2-3925

- **Type:** server · **Review:** full
- **Description:** Sweep GI, Contributors & partners, Geo, Evidence, Policy change, Capacity sharing, Knowledge product and the existing Innovation use fields: every field/subfield the 2026 form marks required (incl. conditional) gets `required: true` / `required_when`, citing the form; `required_confirmed` stays true only where the live function also states it. Contract doc updated (what `required` means).
- **Implements:** QAC-R-5 (amended)
- **Depends on:** QAC-T-18

### [x] QAC-T-20 — Innovation use (Results) completed (amendment 2026-10-07) · P2-3925

- **Type:** server · **Review:** full
- **Description:** From prtest result 9755 (phase 36): the three investment tables (programs, W3/bilateral projects, partners) shared with innovation development; 2026 flags age_disaggregation_not_available, youth_split_applied, graduate_students; a mirror field for "Are you reporting the use of an innovation that has already been reported and quality assessed?" (+ ID result picker) in the innovation-use section, same stored value as `linked.*`; visible_when / required_when for every field per the form (option B) and validation_innovation_use_P25.
- **Implements:** QAC-R-13, QAC-R-14, QAC-R-5 for Innovation use
- **Depends on:** QAC-T-19

### [x] QAC-T-21 — Policy change (Results) completed (amendment 2026-10-07) · P2-3925

- **Type:** server · **Review:** full
- **Description:** From prtest result 9674 (phase 36): USD amount and its status visible (and required per the form) when `policy_type_id` = 1; actors influenced per the form's `showActorsInfluenced()` rule; status as a closed list; policy-type guidance as verbatim description. Option B for `required`.
- **Implements:** QAC-R-13, QAC-R-14, QAC-R-5 for Policy change
- **Depends on:** QAC-T-19

### [x] QAC-T-22 — Knowledge product (Results) completed: M-QAP author affiliations + CGSpace metadata (amendment 2026-10-07) · P2-3925

- **Type:** server · **Review:** full
- **Description:** From prtest result 9532 (phase 36). (a) `partners.kp_author_affiliations` (KP only, list, `required: false` — form `[required]="false"`, not checked by validation_contributor_partner_P25): one element per role-2 `results_by_institution` row linked to `results_kp_mqap_institutions` (`result_kp_mqap_institution_id` not null). Subfields: CGSpace affiliation name (`intitution_name`), CLARISA partner (`institutions_id`, prefilled by M-QAP only when `confidant` ≥ global `kp_mqap_institutions_confidence`), match type (`is_predicted`: "Predicted by M-QAP AI" / "Manual match"; recomputed on save — true only when the chosen partner equals the prediction and confidence passes the threshold), confidence %, partner type (CLARISA lookup), partner role (deliveries). Move `is_predicted` out of NOT_FOR_QA (it is displayed); bring `results_kp_mqap_institutions` into scope or correct its exclusion reason (it surfaces through author affiliations, not role 8). (b) Read-only CGSpace/WoS metadata of KP info now in PENDING: online date, issue date, authors, peer reviewed, WoS/ISI, DOI, accessibility, keywords, AGROVOC, Altmetric, FAIR (score + F1…R1), reference to other knowledge products (locate storage). (c) `results_center.from_cgspace` lock flag. Results only.
- **Implements:** QAC-R-13, QAC-R-14, QAC-R-5 for Knowledge product
- **Depends on:** QAC-T-19

### [x] QAC-T-23 — Distinct labels for the extra geographic block (QA feedback 2026-10-08) · P2-3925

- **Type:** server · **Review:** full
- **Description:** QA feedback: `geo.extra_regions_specified`, `geo.extra_regions`, `geo.extra_countries_specified` and `geo.extra_countries` repeat the labels of the main geo fields, so a QA assessor sees "Select countries" twice. In the form they sit under the "potential impact in other geographic areas" question, context QA loses. The catalog supplies distinct labels (owner approved 2026-10-08), keys unchanged, e.g. "Select countries (other geographic areas of potential impact)". Contract change-log row; revision bump.
- **Implements:** QAC-R-1 (labels), QAC-R-13 (QA evaluates without Reporting's code)
- **Depends on:** QAC-T-22

### [x] QAC-T-24 — Geo: extra-scope option list and level-word labels (owner 2026-10-08) · P2-3925

- **Type:** server · **Review:** full
- **Description:** (1) `geo.extra_scope` gets its own closed list `extra_geographic_scopes` = `geographic_scopes` minus 50: the form hides "This is yet to be determined" in the extra block (`hideTobeDetermined`, rd-geographic-location.component.html), so a condition on it can no longer name 50. (2) Contract: the form's "for this Output/Outcome/…" questions substitute the result level word (`resultLevelWord`); the catalog's labels say "result" as the generic form — documented, labels unchanged. Owner asked for the adjustments; revision bump.
- **Implements:** QAC-R-13 (closed lists), QAC-R-1 (labels)
- **Depends on:** QAC-T-23

### [x] QAC-T-25 — QA review fixes: value shape, capdev lists, missing display rules (owner 2026-10-08) · P2-3925

- **Type:** server · **Review:** full
- **Description:** From the QA review of catalog 2026.23 (owner approved the necessary and recommended items). (a) `multi_select` fields that carry subfields (`contributors.centers`, `contributors.other_centers` with `from_cgspace`; `general.discontinued_reasons` with `reason` / `description`) become `list` with an identity subfield — the contract defines subfields on lists only. (b) Capacity sharing: separate closed lists — length of training offers 3 Short-term / 4 Long-term, degree offers 1 PhD / 2 Master (cap-dev-info.component.ts:98-102) — and degree visible when length = 4 (the 1/2 branches are unreachable, .ts:206-209, 234). (c) Add `visible_when` where the form hides the field: `general.is_discontinued` / `discontinued_reasons` (annual-updating block on `is_replicated` and Innovation dev/use; reasons on `is_discontinued`), KP MELIA cascade, Innovation use actors / organizations / measures (hidden when "yet to be determined", current use and 2030), actor subfields women / youth / men (shown when disaggregation applies), `other_actor_type` (type 5), `other_institution` (type 78), `use_level.readiness_level_explanation` (levels 5–9). Not `partners.is_lead_by_partner`, `how_many`, `kind_cash` (always visible). (d) `innovation_dev.number_of_varieties`: `required_when` equal to its `visible_when`. (e) KP `online_date` / `issue_date_*` labels state the value is a year. (f) GI order: `general.is_replicated` before `is_discontinued` / `discontinued_reasons`. (g) Contract: `is_determined` true = "This is yet to be determined". Keys unchanged; IPSR out of scope.
- **Implements:** QAC-R-1, QAC-R-13, QAC-R-14
- **Depends on:** QAC-T-24

### [x] QAC-T-26 — Missing display rules: impact-area components, discontinued-reason description (QA review 2026-10-08) · P2-3925

- **Type:** server · **Review:** full
- **Description:** QA review of 2026.24. (1) `general.{gender,climate,nutrition,environment,poverty}_impact_areas`: `visible_when` = `<tag> eq 3` (form shows the components only when the tag is Principal, rd-general-information.component.html:146,195,244,297,346). (2) `general.discontinued_reasons` → `description`: the form shows the text box per `needsDescription()` (rd-annual-updating.component.ts:627-633: the option's `requires_description` flag, else legacy id 6). Owner chose option (a): read-only lookup subfield `requires_description` from the discontinued options table, `visible_when: any[requires_description eq true, reason eq 6]`; `required_when` unchanged (`reason eq 6`, live function).
- **Implements:** QAC-R-13
- **Depends on:** QAC-T-25

### [x] QAC-T-27 — IPSR: common sections fitted to the innovation package form (owner 2026-10-09) · P2-3925

- **Type:** server · **Review:** full
- **Description:** From the IPSR review of prtest result 9733 (phase 37). `innovation_package` is removed from fields its 2026 form does not have: `evidence.items` (no Evidence tab; IPSR evidence lives in Step 3), `contributors.submitter`, `general.primary_program`, `linked.has_innovation_link`, `linked.results`. Centers (owner decision): `contributors.centers` / `contributors.other_centers` do not apply to IPSR; new `contributors.ipsr_centers` — one list of all active `results_center` rows, required (IPSR stores centers without `from_toc`, ipsr-contributors.component.ts:627). Annual updating: the IPSR form shows `is_discontinued` / reasons when `is_replicated` (ipsr-annual-updating.component.html) — include `innovation_package` with the form's rules (V-GI does not enforce it for type 10).
- **Implements:** QAC-R-11, QAC-R-13 for IPSR
- **Depends on:** QAC-T-26

### [x] QAC-T-28 — IPSR Step 1 completed · P2-3925

- **Type:** server · **Review:** full
- **Description:** `ipsr_step_1.geo_scope` on its own closed list [1,2,3,4,5] (no TBD); `regions` / `countries` with the same visibility and requirement rules as Results geo; `countries` → list with subnational subfield (IPSR rows have no scope role); `eoi_outcomes` (required, VS1:32-41); `scaling_partners` with partner role (form-required; VS1:211-237); workshop: facilitators visible when Yes (+ email), participants link, participants consent (visible per form), scaling-ambition blurb (read-only); targeted use actors / organizations / measures subfield rules (other type 5, other org 78, disaggregation). Keys from inventory 2026-B §3.4.
- **Depends on:** QAC-T-27

### [x] QAC-T-29 — IPSR Step 2 completed · P2-3925

- **Type:** server · **Review:** full
- **Description:** 2.1 new complementary innovation fields (short / long title, description, function(s), other functions, aware of projects + specify) with the form's rules; 2.2 type of enabler per bundled element (admin-only screen; nested option tree). Keys from inventory 2026-B §3.5–3.6.
- **Depends on:** QAC-T-28

### [x] QAC-T-30 — IPSR Step 3 completed · P2-3925

- **Type:** server · **Review:** full
- **Description:** Owner decision: add the TypeORM entity for the existing `result_ip_step_three_evidence` table (no migration) so the catalog can bind it. Core and complementary evidence-based readiness / use levels with their evidence lists (max 6; required when level ≠ 0 per form; VS3:19-47, 231-264); current use of the core (actors / organizations / measures with evidence link; hidden when use level is 0; VS3:49-230); `assessed_during_workshop` and the current-level table visible per the form; complementary levels' requirement per VS3. Keys from inventory 2026-B §3.7.
- **Depends on:** QAC-T-29

### [x] QAC-T-31 — IPSR Step 4 completed · P2-3925

- **Type:** server · **Review:** full
- **Description:** The three investment lists (CGIAR programs, W3 / bilateral projects, partner co-investment; amount or "yet to be determined", VS4:45-103) on the innovation-use pattern; reference materials link rule. Keys from inventory 2026-B §3.8. Fix the stale "pending" comment in ipsr-step-4.ts.
- **Depends on:** QAC-T-30

## 4. Dependency graph

```
T-1 ─┬─ T-3 ◄─ T-2
     ├─ T-4 ─┐
     ├─ T-5 ─┼─ T-8 ─┬─ T-9  ─┐
     └─ T-6  │       ├─ T-10 ─┼─ T-12 ─ (T-13 optional)
T-7 (HITL) ──┘       └─ T-11 ─┘
T-3, T-6 ─────────────────────┘
```

No cycles.

## 5. Coverage (scenario / clause level)

| Requirement clause | Task |
|---|---|
| R-1 content model; list w/ subfields; select carries subfield; `AND IT MUST` reject list w/o subfields; reject select w/o control list | T-1 |
| R-2 key immutable / not reused / not removed; scenario disappear → fail; `BUT` `valid_to` only → no fail | T-5 |
| R-2 rename changes only binding | T-4 (stale-binding case) |
| R-3 retire by `valid_to`; scenario 2026 absent, 2025 present | T-1 (rule), T-6 (response) |
| R-3 row still exists in table | T-3 (d) |
| R-4 binding declared; no table names leak | T-1 (type), T-6 (deep scan) |
| R-5 live definitions; `required_when` data; unconfirmed not silent false | T-7 |
| R-6 insert/update by key; no delete; idempotent; orphan warning; failure doesn't stop app | T-3; real DB T-12 |
| R-7 guard; reason non-empty; no DB; message names `table.column`; `BUT` passes once bound; stale entry | T-4, T-1 (reason) ; real scope T-8…T-12 |
| R-8 version per year; change w/o bump fails; bump w/o change fails | T-5 |
| R-9 shape, ordering, `["*"]`, 400, 404, `BUT` no empty 200, 2025 vs 2026 | T-6 (fixtures), T-13 (real data) |
| R-10 credential required; JWT not a substitute; never logged | T-6 |
| R-11 2026 all 9 types; 2025 MAY; HITL; description rule | T-7…T-12, T-13 |
| R-12 only catalogued data | T-6 (whitelist mapper) |

## 6. Rollout & roll-back

- Rollout: PR 1 (T-1…T-6, framework, empty catalog) → PR 2 (T-7…T-12, inventory + data). Owner runs the migration; deploy is automatic on merge.
- Roll-back: revert PRs; `migration:revert` optional (tables inert).

## 7. Follow-ups (out of scope)

- Results-to-QA endpoints using the storage bindings.
- Validation engine evaluating `required_when` (replacing `validation_*`).
- Optional `information_schema` check if a DB becomes available in CI.
- Level-number rules (use / readiness levels compared as level-table row ids): deferred by the owner to bug P2-3939 (epic P2-2340), not addressed in P2-3925.
