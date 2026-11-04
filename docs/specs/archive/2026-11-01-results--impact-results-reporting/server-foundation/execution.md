# Execution Log — Impact Results: Server Foundation

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/results/impact-results-reporting/server-foundation/` |
| Ticket | P2-3901 |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated |
| Budget (design §12A) | 9 tasks · ~1,300 LOC · ≤ 12 review rounds |
| Started | 2026-10-29 |
| Leader | Claude Code (Opus 5.5) — registry T1 `opus` ✓ |

### Pre-flight (2026-10-29)

| Item | Result |
|---|---|
| `requirements.md` approved | ✅ approved 2026-10-29 (Santiago Sanchez) |
| `design.md` approved | ⚠️ no explicit status line in `design.md`; treated as approved with requirements (same session, family change log 2026-10-29) |
| IRS-OQ-1 | open, non-blocking |
| In-flight spec on `validation_contributor_partner_P25` / `validation_geo_location_P25` | ✅ none — last touches are `qa-field-catalog` (no open tasks) and archived/bugfix specs already in history |
| `npm run migration:check` on clean branch | ⏳ needs DB — user-run, folded into IRS-T-2 red run |

---

## 2. Task Execution History

### IRS-T-1 — Capture live DB facts (user-run, HITL)

- **Status:** `[x]` PASS 2026-10-29 (outputs received same day)
- **Mode:** HITL, no Implementer/Reviewer spawn (agent never connects to the DB). Leader supplied the 8 premise statements (design §1A) + baseline SELECT inline in chat.
- **Baseline query design:** 10 active P25 results — types 1, 2, 4 ×2 and 5, 6, 7, 8 ×1 — newest id per type, each scored with `validation_general_information_P25`, `validation_contributor_partner_P25`, `validation_geo_location_P25`. Written without window functions so it runs regardless of P-11. The 10 ids it returns are the fixed set IRS-T-9 must re-run.

#### Outputs (user-run 2026-10-29, prdb, DBeaver screenshots)

| # | Statement | Premise | Output | Status |
|---|---|---|---|---|
| 1 | `result_by_level` level 1 | P-1 | one row: `id=13, result_level_id=1, result_type_id=9` | **verified** |
| 2 | `result_type` id 9 | P-2 | `9, Impact contribution, is_active=1` | **verified** — migration "ensure active" is a no-op |
| 3 | type-9 rows by portfolio/source | P-3 | one group: `portfolio_id=2, source='Result', count=2`; **no** `source='API'` type-9 rows | **verified** — `clarisa_portfolios` id 2 = P22 (1/4 NULL, 3 = P25): zero P25 type-9 rows, zero API type-9 rows |
| 4 | `clarisa_impact_areas` | P-10 | no `smo_code` column (user ran with `financialCode`): 1 Nutrition, Health and Food Security (IA1) · 2 Poverty Reduction, Livelihoods and Jobs (IA2) · 3 Gender Equality, Youth and Social Inclusion (IA3) · 4 Climate Adaptation and Mitigation (IA4) · 5 Environmental Health and Biodiversity (IA5) | **verified** — `IMPACT_AREA_TAG_COLUMN` = {1: nutrition, 2: poverty, 3: gender, 4: climate_change, 5: environmental_biodiversity} |
| 5 | `VERSION()` | P-11 | `8.4.8` | **verified** — `REGEXP_REPLACE` available |
| 6 | live `validation_contributor_partner_P25` | P-5 | `sql_mode=STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION`, utf8mb4 / `utf8mb4_0900_ai_ci`. Visible head **differs from repo** (`1762866499786`): live declares `result_type_id BIGINT`, lacks `center_count_all` / `center_count_leading` (`institutions_count_leading` exists in both) | **refuted (live ≠ repo)** — expected case IRS-G-1; full live body in Appendix A. No DD change (see Leader decisions) |
| 7 | live `validation_geo_location_P25` | P-6 | Head matches repo shape: declares `geo_scope`, `result_type`, `has_*` incl. `has_extra_*`; SELECT loads `geographic_scope_id`, `result_type_id`, extra flags | **verified** — `NULL => FALSE`, then `ELSEIF geo_scope = 50 => TRUE` right after the SELECT; `source` not loaded. Full body Appendix B |
| 8 | live `validate_sections_mapped_batch` | P-7 | `IN p_result_id BIGINT, IN p_sections_json JSON`; resolves `cp.acronym` via `version` → `clarisa_portfolios`. `sql_mode=IGNORE_SPACE,NO_ENGINE_SUBSTITUTION`, `collation_connection=utf8mb4_unicode_ci` | **verified** — active `validation_maps.display_name` → `validation_<function_name>_<acronym>`; missing map or missing routine ⇒ FALSE. Full body Appendix C (not changed by this spec) |
| 9 | IRS-T-9 "before" baseline | — | see table below | captured |

Definer on all three: `prmsadmin@%` (recorded as user name only; host wildcard).

**Baseline "before" (IRS-T-9 must re-run these exact ids):**

| id | result_code | type | source | general_information | contributor_partners | geographic_location |
|---|---|---|---|---|---|---|
| 34550 | 31194 | 1 | API | 0 | 0 | 0 |
| 34551 | 31195 | 1 | API | 0 | 0 | 0 |
| 34564 | 31208 | 2 | Result | 1 | 1 | 1 |
| 34566 | 31210 | 2 | Result | 0 | 0 | 0 |
| 34561 | 31205 | 4 | API | 0 | 0 | 0 |
| 34562 | 31206 | 4 | API | 0 | 0 | 0 |
| 34580 | 31224 | 5 | Result | 1 | 0 | 1 |
| 34577 | 31221 | 6 | Result | 1 | 1 | 1 |
| 34574 | 31218 | 7 | Result | 0 | 0 | 0 |
| 34579 | 31223 | 8 | Result | 1 | 1 | 1 |

**Leader note on baseline strength:** 5 of 10 rows are all-zero (incl. all four API rows), so a gate that wrongly returns FALSE would not show on them. Only 34564, 34577, 34579 have contributor=1 and geo=1. Supplementary baseline captured below.

**Supplementary baseline "before" (rows currently TRUE; IRS-T-9 re-runs these too):**

| id | result_code | type | source | geo_scope | general_information | contributor_partners | geographic_location |
|---|---|---|---|---|---|---|---|
| 34495 | 31139 | 1 | Result | 3 | 1 | 1 | 1 |
| 34563 | 31207 | 2 | Result | 1 | 0 | 1 | 1 |
| 30978 | 27623 | 4 | API | 1 | 1 | 1 | 1 |
| 34521 | 31165 | 5 | API | 4 | 0 | 0 | 1 |
| 34575 | 31219 | 5 | Result | 3 | 1 | 1 | 1 |
| 34576 | 31220 | 5 | API | 3 | 1 | 0 | 1 |
| 34467 | 31111 | 6 | API | 2 | 0 | 0 | 1 |
| 34514 | 31158 | 7 | Result | 2 | 1 | 1 | 1 |

Combined set for IRS-T-9: 18 ids; 12 have contributor=1 and/or geo=1, covering types 1, 2, 4, 5, 6, 7, 8, both sources, geo scopes 1–4.

#### Leader decisions (IRS-T-1 → IRS-T-2 brief)

1. **IRS-DD-5 placement (adaptation, not a re-design).** Live `validation_contributor_partner_P25` already declares `result_type_id`, but loads it in the `result` SELECT that runs *after* the ToC block — so "add `result_type` to the existing SELECT" cannot gate the ToC block as worded (the repo body had the same order; the design wording was imprecise). IRS-T-2 loads `result_type_id` before the ToC block (one extra `SELECT r.result_type_id INTO result_type_id FROM result r WHERE r.id = resultId AND r.is_active = TRUE`) and wraps the ToC block in `IF COALESCE(result_type_id, 0) <> 9 THEN … END IF`. The later SELECT reassigns the same value — no change for other types. Decision intent (skip ToC for type 9; partner/center rules unchanged) stands; the disqualifier does not fire.
2. **Linked-results block.** Live has no separate linked-results block; the only `linked_result` check sits inside `IF has_innovation_link = TRUE`, fed by `results_innovations_dev/use` rows a type-9 result never has. Gate it explicitly anyway (`AND result_type_id <> 9`) to match IRS-DD-5 literally; inert in practice.
3. **IRS-DD-6 gate.** Live geo function does not load `source`: IRS-T-2 adds `r.source` to the existing SELECT (new variable) and inserts the gate as its own `IF` between `geo_scope IS NULL ⇒ FALSE` and `geo_scope = 50 ⇒ TRUE`.
4. **DEFINER.** Appendices store the bodies from `CREATE FUNCTION` on; the only edit is removing `DEFINER=…` (repo migrations never set a definer). Everything else as pasted by the user.
5. **No P25 type-9 rows exist live** — the new gates change the value of zero existing results on deploy day.

- **DoD:** 8 outputs recorded ✅ · premise ledger updated in `design.md` ✅ · live bodies stored (Appendices A–C) ✅

#### Review — attempt 1

- **Implementer:** n/a (HITL; Leader recorded user-run evidence).
- **Reviewer verdict:** `STATUS: PASS` — every cell of the outputs and both baseline tables matches the screenshots; premise statuses follow from evidence in both `execution.md` and `design.md` §1A; disqualifier does not fire (decisions 1 and 3 are implementation details of IRS-DD-5/DD-6, no re-approval needed); no secrets recorded.
- **ADVISORY (recorded, applied where it was bookkeeping on this task's own record):**
  - Count 11 → 12 rows with a TRUE value — fixed.
  - `institutions_count_leading` is not a live-only difference — reworded here and in `design.md` P-5.
  - IRS-DD-5 wording vs Leader decision 1 — one clarifying sentence added in `design.md` (no change to the decision).
  - Reliability for IRS-T-2: a NULL `result.source` would make `source <> 'API'` NULL and silently skip the DD-6 gate → **forward pointer to IRS-T-2** (below).
  - Stale "waiting" markers in `tasks.md` / `execution.md` — closed.

#### Forward pointers → IRS-T-2 brief

- FP-1: build both replaced functions from Appendices A/B, not from repo migrations; `down` = Appendices A/B verbatim.
- FP-2: Leader decisions 1–3 above are the placement rules for the DD-5/DD-6 gates.
- FP-3: geo gate must be NULL-safe on `source` (`COALESCE(result_source, '') <> 'API'`), unless the column is proven NOT NULL in the entity/migrations.
- FP-4: `IMPACT_AREA_TAG_COLUMN` mapping confirmed by P-10 (for IRS-T-4).

---

### IRS-T-4 — Impact branch in create handler (E1)

- **Started:** 2026-10-29 · run in parallel with IRS-T-2 (disjoint files; only IRS-T-4 runs Jest)
- **Skills assigned:** `nestjs-expert`, `tdd` · **Effort:** high · **Review:** full

#### Attempt 1

- **Implementer:** handler guard + skip ToC link + prefill update; `impact_area_id?` on `CreateResultDto`; new `impact-level/constants/impact-area-tag-column.ts`; new `create-result-from-framework.impact.spec.ts` (34 tests).
- **Evidence:** red 24/34 failing before handler change · `npx jest --runInBand --findRelatedTests <handler> <dto>` 70 suites green (runInBand: free RAM ≈1.8 GB) · `--testPathPattern create-result-from-framework` 8 suites / 90 tests passed · eslint 4 files exit 0 · tsc clean on touched files.
- **Implementer assumptions:** tag values are `gender_tag_level` ids (3 = Principal score 2, 1 = Not targeted score 0); `indicators: []` rejected (non-null); prefill is a separate `update` outside a transaction; client payload util out of scope.
- **Reviewer verdict:** `STATUS: FAIL`
  1. **Discovered Issue:** E1 400 messages differ from contract (`'A valid impact_area_id (1-5) is required…'`, `'Impact results cannot carry ToC or target data: …'`). **Violated Rule:** `design.md` §4.1 E1 Errors: `Impact results require an Impact Area` · `Impact results cannot have targets, indicators or Theory of Change`. **Remediation:** throw the exact strings (offending fields may go in `throwServiceError`'s `response` arg); update spec assertions.
- **Reviewer confirmed:** field locations (top-level forbidden fields, `result.impact_area_id`) match DTO and design §4.1; tag ids 3/1 match IRS-R-2 + design §2.2/§5; `indicators: []` rejection conforms to Scenario 1.3 / DD-3; non-impact path unchanged.
- **ADVISORY:**
  - RISK/RESILIENCE: prefill `update` outside a transaction — failure leaves a result with null scores and a 500; a client retry duplicates. → recorded; not in scope of DD.
  - RISK (spec gap): `contributors_result_toc_result` is not in the forbidden list; `ApplyFrameworkResultAssociationsService` still writes ToC-linked contributor rows for an impact result. Scenario 1.3 names five fields only → **open question for the user** (possible spec amendment), not applied.
  - RELIABILITY: client child spec must omit empty-but-non-null fields (`indicators: []`, `number_target: ''`) for level 1/type 9 → forward pointer to client child #2.
  - READABILITY: falsifier (c) test only counts writes — reword its comment; drop the `as unknown as Record` cast by checking fields directly. → passed to attempt 2 as optional.

#### Attempt 2

- **Effort:** xhigh (bumped). Feedback = issue 1 verbatim + the two readability advisories.
- **Implementer:** `_assertImpactCreatePayload` throws exactly `Impact results require an Impact Area` / `Impact results cannot have targets, indicators or Theory of Change` (400); offending fields in `throwServiceError`'s `response` as `{ forbidden_fields }`; cast removed (typed field reads); falsifier (c) test relabelled "partial" with the real guarantee stated. No other logic change.
- **Evidence:** `npx jest --runInBand --testPathPattern create-result-from-framework --silent --reporters=summary --forceExit` → 8 suites / 90 tests passed (runInBand: free RAM ≈0.7 GB) · eslint handler + spec exit 0 · tsc clean on touched files.
- **Reviewer verdict:** `STATUS: PASS` — messages match design §4.1 E1 verbatim and are asserted exactly; `throwServiceError(message, status, response)` confirmed (`shared/utils/service-error.util.ts:12-20`); guard still before any write; non-impact path unchanged; prefill 3/1 unchanged.
- **ADVISORY (recorded):**
  - Open user question: `contributors_result_toc_result` not rejected for impact results (spec gap; decision pending).
  - Prefill outside a transaction (failure → result without scores + 500; retry duplicates) — accepted gap for now.
  - Client child #2: payload util must omit `indicators: []` / empty targets for level 1 / type 9; confirm `HttpExceptionFilter` passes `forbidden_fields` if the client needs it.
- **Files:** `create-result-from-framework.handler.ts`, `create-result-from-framework.impact.spec.ts` (new), `results/dto/create-result.dto.ts`, `impact-level/constants/impact-area-tag-column.ts` (new).
- **Status:** `[x]` PASS 2026-10-29 (2 attempts). Not committed.

---

### IRS-T-2 — Migration + entities

- **Started:** 2026-10-29 · parallel with IRS-T-4 · **Skills:** `nestjs-expert` · **Effort:** xhigh · **Review:** parallel lenses (A: replaced SQL functions; B: schema/entities/seed/new function)

#### Attempt 1

- **Implementer:** `src/migrations/1792000000000-IRS-ImpactResultsFoundation.ts` (class `IRSImpactResultsFoundation1792000000000`); entities `impact-level/entities/{impact-study-type,result-impact-level,result-impact-previous-result}.entity.ts`. Replaced bodies generated by a scratch script that extracted Appendices A/B and applied each gate as an exactly-once replace. `result.source` is `nullable: true` enum (`'Result'`/`'API'`) → NULL-safe `COALESCE(result_source,'') <> 'API'` (FP-3). Geo gate placed as an `ELSEIF` in the existing chain between `geo_scope IS NULL` and `= 50`.
- **Evidence:** `npx tsc --noEmit -p tsconfig.json` exit 0 · eslint clean on 3 entities (eslint ignores `src/migrations/**`) · `migration:check` not run (needs DB; agent never connects).
- **Implementer assumptions:** audit columns `created_by`/`last_updated_by` int NULL; seed definitions capitalised first letter; ICU `[[:space:]]` vs TS `\s` NBSP parity untested; `down` does not undo the (1,9)/type-9 ensure.
- **Reviewer Lens A verdict:** `STATUS: PASS` — `*_LIVE` == Appendices A/B line by line (incl. trailing whitespace; only backtick escaping + DEFINER removed); `*_WITH_IMPACT` == LIVE + stated gates only; ToC block only writes `planned_result`/`general_validation`, neither read afterwards in a way the skip changes; closing `END IF` correctly nested; inactive result → NULL → COALESCE 0 → behaves as today; geo `ELSEIF` equivalent to decision 3 (non-9 falls through; type 9 scope 2/3 still checked for region/country; API unchanged; NULL source gated); `VARCHAR(25)` ≥ enum length; qualified column vs local var unambiguous. Falsifier and disqualifier do not fire.
  - ADVISORY: geo gate edit dropped trailing whitespace on 2 lines (no semantic effect); function behavior still owed by IRS-T-9 (18-id baseline).
- **Reviewer Lens B verdict:** `STATUS: PASS` — entities ↔ DDL agree (bigint FKs to `result.id`, int FKs to `users.id` signed int, `timestamp(6)` from TypeORM default precision, boolean→tinyint, NO ACTION defaults, `@Unique` names); `orm.config.ts` glob covers the folder; seed names exact; idempotent `up`; `down` order respects FKs; `validation_impact_level_info_P25` matches IRS-R-6 / §3 word definition; naming follows RIR migrations.
  - ADVISORY:
    1. **Gate gap:** `npm run migration:check` (`scripts/check-pending-migrations.ts`) only compares migration names with the `migrations` table — it never diffs schema. The tasks.md red run ("fails before entities+migration agree") cannot detect drift. Real drift check = `migration:generate --dryrun` (filtered to the 3 tables) after the migration is applied.
    2. Predicted drift for the 3 tables: none. Watch `tinyint(1)` vs `tinyint`, and confirm `result.id` is signed `bigint` on the target DB (unsigned would make the FK CREATE fail).
    3. Seed capitalises "Evaluates" vs requirements §3 glossary.
    4. `DETERMINISTIC` on a table-reading function follows the repo P25 convention.
    5. `down` deletes all impact data by design; interrupted `up` is re-runnable.

#### Leader decisions (IRS-T-2 close)

1. **DoD `migration:check` redefined.** The command cannot prove what the DoD intends (advisory B1), and applying the migration to the shared prdb from a dev checkout would change live P25 functions for everyone. The migration is applied by the normal deploy; the drift proof moves to **IRS-T-9**: after the PRTest deploy, `migration:check` (0 pending) + `migration:generate --dryrun` filtered to `impact_study_type` / `results_impact_level` / `results_impact_previous_result` showing no change. Pre-deploy check for the user: `result.id` signed bigint (advisory B2). → forward pointer to IRS-T-9.
2. **Seed capitalisation accepted** as a deliberate deviation (standalone field text; meaning unchanged). Any client/test comparison uses the seeded text. → forward pointer to IRS-T-3 (E2 test) and client child #2.
3. Audit columns NULL kept (matches `BaseEntity` and replication flows) pending the user's answer.

#### Forward pointers

- FP-5 → IRS-T-9: apply on PRTest via deploy; `migration:check` 0 pending + filtered `migration:generate --dryrun` = no change; then the 18-id baseline re-run; ignore trailing-whitespace diffs in the two replaced functions.
- FP-6 → IRS-T-3: E2 seed text is `Evaluates the effectiveness of an intervention in a localized context` / `Evaluates the total effect of an intervention that has gone to scale`; repositories register via `forFeature` in the new module.
- FP-7 → IRS-T-3/T-5: `countWords` must match the SQL definition (whitespace runs incl. U+00A0/U+3000 per ICU `[[:space:]]`) — add an NBSP case to the parity tests.

- **Status:** `[x]` PASS 2026-10-29 (1 attempt; DoD `migration:check` moved to IRS-T-9 per Leader decision 1). Not committed.

---

### IRS-T-7 — Section list for impact results + geography save guard

- **Started:** 2026-10-29 · parallel with IRS-T-3 (Jest serialized by process check) · **Skills:** `nestjs-expert`, `tdd` · **Effort:** high · **Review:** full

#### Attempt 1

- **Implementer:** `ValidationMapsEnum.IMPACT_LEVEL_INFO`; `case IMPACT_CONTRIBUTION` in `results-validation-module.repository.ts` pushes it only for `P25_PORTFOLIO_ACRONYM` (literal `'P25'` replaced by the constant; `break` added after the former last case); `_assertImpactGeoScope` as first statement inside `saveGeoScopeV2`'s `try` (one `findOne` of `id, result_type_id, source`; type 9 + `source !== 'API'` (NULL included) + scope ∉ {2,3} → `BadRequestException`, returned as 400 by `returnErrorRes`). Message (design defines none): `Impact results only accept Regional (2) or Country (3) geographic scope.` New `results-validation-module.repository.spec.ts`; new describe in `geographic-location.service.spec.ts`.
- **Evidence:** `npx jest --runInBand --findRelatedTests <3 files>` → 75 suites / 2349 tests passed (runInBand: ~1.7 GB free; no other Jest running) · geo specs after lint fix 2 suites / 26 tests · eslint 5 files exit 0 · `tsc --noEmit` clean. **No red run recorded** (code + specs in one pass).
- **Consumers:** controller PATCH → 400; `ResultsService._updateGeographicScope` (after the transaction, warn-log on non-200, does not abort); `progress-tracker-prefill.service.ts:464` (non-200 → `{applied:null, reason:'failed'}`). Disqualifier does not fire (no `EntityManager`, not inside a transaction).
- **Reviewer verdict:** `STATUS: PASS` — IRS-R-7 (incl. BUT), R-9 Scenario 9.1 save half (incl. BUT other types), R-15, DD-6, DD-7 met; 400 reaches the caller (`ResponseInterceptor` sets status); section lists: P25 type 9 = 5 sections, P22 type 9 unchanged, other types unchanged, no fallthrough change. Missing red run compensated by mutation reading (removing guard / source check / type check / P25 gate each fails a named spec).
- **ADVISORY:**
  - RISK: TS guard has no portfolio gate, unlike the SQL gate (DD-6 "P22 type-9 unaffected (P25 function)" holds only SQL-side). The 2 P22 type-9 `source='Result'` rows would get 400 on scope 1/4/5/50 if saved via v2 → **open question for the user** (accept per R-9 text, or add a P25 gate).
  - RELIABILITY: design §9 wants 400s logged at `warn` with result/user id only; service pattern logs at `error` via `returnErrorRes({debug:true})` → apply consistently at IRS-T-9 / `/akili-validate`.
  - READABILITY: prefill reports a type-9 rejection as `reason:'failed'`.
  - RESILIENCE: scope 0/null rejected for PRMS type 9 → client child #2 must not send a scope-less save.
- **Status:** `[x]` PASS 2026-10-29 (1 attempt). Not committed.

---

### IRS-T-3 — `impact-level` module skeleton + study-types endpoint + `countWords`

- **Started:** 2026-10-29 · parallel with IRS-T-7 · **Skills:** `nestjs-expert`, `tdd` · **Effort:** medium · **Review:** checklist

#### Attempt 1

- **Implementer:** new `impact-level/{impact-level.module,controller,service}.ts`, `repositories/result-impact-level.repository.ts`, `repositories/result-impact-previous-result.repository.ts` (extend `BaseRepository` → `ReplicableRepository`, `LogicalDelete`, `createQueries` required by the abstract base), `utils/count-words.ts`, specs, module `CLAUDE.md`; `ImpactLevelModule` imported in `results-framework-reporting.module.ts` and mounted in `modules.routes.ts` at `results-framework-reporting/impact-level`. E2 = `GET /api/results-framework-reporting/impact-level/study-types` (active rows, by id, `{id, name, definition}`).
- **Evidence:** `npx jest --runInBand --testPathPattern "results-framework-reporting/impact-level|results-framework-reporting.module.spec|modules.routes"` → 3 suites / 11 tests passed (runInBand: ~1.28 GB free) · eslint clean · tsc filtered clean. **No red run recorded.**
- **Reviewer verdict:** `STATUS: PASS` — URL per design §4.1; JWT parity via global `/api/(.*)` middleware, same controller shape as RFR (IRS-R-12, DD-8); mount pattern = GeographicLocationModule (no double registration, no route collision); `countWords` falsifiers + FP-7 NBSP/U+3000 asserted; E2 seed text = FP-6; `createQueries` columns match DDL and are in scope (abstract in base; wiring stays IRS-T-8). Missing red run compensated by mutation reading.
- **ADVISORY:**
  - RELIABILITY → IRS-T-8: both repositories' `findQuery` omit `${config.new_result_id} AS result_id` (sibling `summary/repositories/results-policy-changes.repository.ts:37` has it); unused today (no `custonFunction`), but a NULL `result_id` insert if that path is used.
  - READABILITY → IRS-T-8: `results_impact_level` replication copies `last_updated_date`, the links table uses NULL — make consistent.
  - RISK: JS `\s` vs ICU `[[:space:]]` differ on U+0085 (SQL whitespace only) and U+FEFF (JS only) → document in module `CLAUDE.md` or align regex (IRS-T-5).
  - READABILITY: add a controller-level routing spec for E2 (IRS-T-5/T-6).

#### Forward pointers

- FP-8 → IRS-T-8: add `result_id` (new id) to both `findQuery`s; align `last_updated_date` handling with the sibling pattern.
- FP-9 → IRS-T-5: decide U+0085/U+FEFF parity in `countWords` (align or document); E3/E4 must use `countWords` for the 100-word rule.

- **Status:** `[x]` PASS 2026-10-29 (1 attempt). Not committed.

---

### IRS-T-5 — Read/save Impact level info (E3, E4)

- **Started:** 2026-10-29 · parallel with IRS-T-8 · **Skills:** `nestjs-expert`, `tdd`, `api-design-principles` · **Effort:** high · **Review:** full

#### Attempt 1

- **Implementer:** `ImpactLevelService.getImpactLevelInfo` (E3) / `saveImpactLevelInfo` (E4) — constructor now `(studyTypeRepo, DataSource, HandlersError)`; controller `GET get/result/:resultId`, `PATCH save/result/:resultId` (`@UserToken()`); `dto/save-impact-level.dto.ts`, `dto/impact-level-info.dto.ts`; `countWords` regex aligned to ICU `[[:space:]]` (U+0085 separates, U+FEFF does not; no `trim()`) — FP-7/FP-9 resolved; new `impact-level.read-save.spec.ts` (35 tests, stateful fake DB), `impact-level.controller.spec.ts` (E2/E3/E4 routing); module `CLAUDE.md` updated.
- **Evidence:** red `--runInBand --testPathPattern 'impact-level/(impact-level|utils)'` → 3 suites failed / 1 passed, 1 test failed / 8 passed (missing methods/handlers + U+0085 case) · green module 5 suites / 52 tests · `--findRelatedTests` 11 suites / 72 tests (runInBand: ~1.3 GB free) · eslint impact-level exit 0 · tsc clean.
- **Implementer assumptions:** query-builder joins only mocked; `previously_reported=false` deactivates all + ignores ids; no row lock on first save; own message wording where design has no literal; non-numeric id → 400 `Invalid result id`.
- **Reviewer verdict:** `STATUS: PASS` — R-4/R-5 met incl. 100-accepted and both ANDs; `Not an impact result` verbatim, `at most 100 words` contained; validation before `dataSource.transaction`, single transaction for upsert + sync; set semantics; query-builder relations/columns verified against real entities (`obj_previous_result`, `obj_result_type.name`, `obj_version.phase_name`, `obj_portfolio.acronym`, `obj_status.status_name`, `result_code`); countWords parity confirmed; UTF-16 length only stricter than `CHAR_LENGTH`.
- **ADVISORY (recorded, follow-ups):**
  - READABILITY: `count-words.ts:13` has an invisible literal U+FEFF — write `(?!﻿)`.
  - RESILIENCE: concurrent first saves → `ER_DUP_ENTRY` on `UQ_results_impact_level_result` → 500 with driver text (§7 "errors never echo SQL") — consider upsert / catch dup.
  - RELIABILITY: `_buildSection` shows soft-deleted previous results — client may need `is_active`/status flag (client child #2 / IRS-T-9).
  - RELIABILITY: ids sent while stored `previously_reported=false` (not resent) are synced → active links under "No"; harmless for green check.
  - OBSERVABILITY: E3 400s lack the service-level `warn` with user id (§9) — fold into the §9 consistency pass at IRS-T-9 / `/akili-validate`.
- **Status:** `[x]` PASS 2026-10-29 (1 attempt). Not committed.

---

### IRS-T-8 — Lifecycle: replication case 9 + soft/hard delete

- **Started:** 2026-10-29 · parallel with IRS-T-5 · **Skills:** `nestjs-expert`, `tdd` · **Effort:** high · **Review:** full

#### Attempt 1

- **Implementer:** `versioning.service.ts` `case 9` replicates both impact repositories (same `manager`/`config`); `delete-recover-data.service.ts` `deleteResult` → `logicalDelete` on both; `deleteDataByNewResultType` common path → awaited `fisicalDelete` on both only when `old == 9 && new != 9`; FP-8 applied (`findQuery` projects new `result_id`; level `last_updated_date` NULL); both repositories added as providers in `versioning.module.ts`, `delete-recover-data.module.ts`, `toc/toc-results/toc-results.module.ts`, `results-knowledge-products.module.ts` (pattern = `ResultsPolicyChangesRepository`; `ImpactLevelModule` not imported → no cycle). New specs: `versioning.service.impact-replication.spec.ts`, `delete-recover-data.service.impact.spec.ts`, `impact-repositories.replication.spec.ts`; DI-only edits to `versioning.service.spec.ts`, `toc-results.module.spec.ts`.
- **Evidence:** red `--runInBand --testPathPattern "api/versioning/|api/delete-recover-data/|impact-level/"` → 5 failed / 6 passed suites (3 = new specs; others likely concurrent IRS-T-5 specs, not isolated) · green (+ `toc/toc-results/`, `results-knowledge-products/`) 25 suites / 572 tests · tsc clean · eslint exit 0. `--findRelatedTests` **not run**.
- **Reviewer verdict:** `STATUS: PASS` — R-13/R-14 + design §5 met; `case 9` only, no other branch changed; replication SQL columns match DDL, links keep `previous_result_id`, unique key cannot clash; delete methods target correct table with bound params; hard delete only on 9→non-9, awaited; every module providing `VersioningService`/`DeleteRecoverDataService` has both repositories (bilateral via `VersioningModule` import); type-7 falsifier read as "must NOT call" — agreed. R-13 "or recovered": no recovery path exists in `src/` and design maps R-13 to delete only → nothing to implement.
- **ADVISORY:**
  - RISK → **pre-push gate:** run `npx jest --maxWorkers=2 --findRelatedTests` on `versioning.service.ts`, `delete-recover-data.service.ts` and the 4 module files (folder-scoped runs have missed cross-folder consumer specs before).
  - RISK (data loss): type change away from 9 hard-deletes impact data with no audit and no user warning → client children #2/#3: warn in the type-change confirm.
  - RELIABILITY: soft-deleting result A leaves other results' links to A active → readers filter `r.is_active` or follow-up deactivation (joins the IRS-T-5 advisory).
  - RELIABILITY: repository delete methods swallow errors (`.catch` returns an error object), same as siblings → a failed impact delete is silent in production; the "rejection surfaces" test only proves it against a rejecting mock.
  - READABILITY: FP-8 partially aligned — level copy writes `last_updated_by = user.id` (sibling: NULL); links copy omits `last_updated_date`/`last_updated_by` (defaults CURRENT_TIMESTAMP) → align both with the sibling in a follow-up.
  - RELIABILITY: add a 9→9 test case to pin the hard-delete guard.
- **Status:** `[x]` PASS 2026-10-29 (1 attempt). Not committed.

---

### IRS-T-6 — Cross-portfolio search (E5) + per-area counts (E6)

- **Started:** 2026-10-29 (after IRS-T-5 PASS — shared controller) · **Skills:** `nestjs-expert`, `tdd`, `api-design-principles` · **Effort:** high · **Review:** checklist

#### Attempt 1

- **Implementer:** new `repositories/impact-level-search.repository.ts`, `repositories/impact-level-counts.repository.ts`, `impact-level-search.service.ts`, `dto/impact-level-search-query.dto.ts` (+ specs); controller E5 `GET previous-results/search`, E6 `GET counts`; module registers both repositories + service and imports `VersioningModule`; module `CLAUDE.md`. E5 order: active REPORTING phase → `version.phase_year DESC` → `result_code ASC` → `r.id`; `getRawMany` + offset/limit + `getCount`. E6: `COUNT(DISTINCT CASE WHEN col = 3 THEN r.id END)` per area + distinct total, owner role 1 scope. Disqualifier does not fire (`version.phase_year` exists).
- **Evidence:** red `--runInBand --testPathPattern "impact-level/(repositories/impact-level-(search|counts)|impact-level-search)"` → 3 suites failed (modules missing) · green `--runInBand --findRelatedTests <5 files>` → 11 suites / 60 tests (~1.3 GB free) · eslint / tsc clean.
- **Reviewer verdict:** `STATUS: PASS` — paths, params, `meta`, E6 shape per §4.1 (no literals defined for E5/E6 400s); filters ANDed after `is_active`; `limit=51` → 400 before any query; all-types search correct per R-10 / DD-9; E6 scope + tag 3 = Principal; `COUNT(DISTINCT …)` equivalent to `SUM(col=3)` and safe against duplicate owner rows; every column/relation exists; no DI cycle (RFR already imports `VersioningModule`); all user input bound; Swagger documents every param.
- **ADVISORY:**
  - RELIABILITY → IRS-T-9: the 11.1 test proves mapping only — run the real fixture (Climate 2, Nutrition 1, total 2) and an E5 2026-before-2023 case on PRTest.
  - READABILITY → archive: design §5 names `skip/take/getManyAndCount`; code uses offset/limit + `getRawMany` + `getCount` (same behaviour) — sync §5.
  - READABILITY: E6 `initiativeId`/`versionId` documented `@ApiPropertyOptional` with "Required." → `@ApiProperty({ required: true })`.
  - RESILIENCE: `totalPages = 1` when `total = 0` → tell client child #2.
  - RISK (low): LIKE escaping relies on backslash escape; add explicit `ESCAPE '\\'`.
- **Status:** `[x]` PASS 2026-10-29 (1 attempt). Not committed.

---

### Pre-push gate (2026-10-29, Leader)

- `npx jest --runInBand --findRelatedTests <29 changed non-spec .ts files under src/, migrations excluded> --silent --reporters=summary --forceExit` → **Test Suites: 101 passed, 101 total · Tests: 2657 passed, 2657 total** (119 s; runInBand: ~3 GB free; no other Jest running). Closes the IRS-T-8 advisory (versioning / delete-recover-data consumers).

### Open user decisions (before IRS-T-9 / commit)

1. Reject `contributors_result_toc_result` on impact create? (IRS-T-4 advisory; spec amendment)
2. `created_by` / `last_updated_by` NULL in the new tables — keep? (IRS-T-2)
3. Geo save guard P25-only (like the SQL gate / DD-6 note) or any portfolio (R-9 text)? (IRS-T-7)

**Answered 2026-10-30 (Angel, relayed by user):**

1. **Reject** — a non-empty `contributors_result_toc_result` on impact create returns the same 400 as the other forbidden fields. Provisional: to be confirmed with Nicoleta; if she disagrees, revert is a one-line change in `_assertImpactCreatePayload`.
2. **Optional, like the rest** — the app always writes the user (service + replication), and the columns stay `int NULL` as in `BaseEntity`. No code change.
3. **P25 only** — `_assertImpactGeoScope` applies only when the result's phase portfolio is P25, matching the SQL gate. R-9 wording amended accordingly (amendment recorded here; sync `requirements.md` R-9 at archive).

Decisions 1 and 3 are executed as **IRS-T-10** (post-decision amendment to IRS-T-4 / IRS-T-7) before IRS-T-9.

---

### IRS-T-10 — Post-decision amendment (decisions 1 and 3)

- **Status:** `[x]` PASS 2026-10-30, attempt 1/3. Review round 11/12.
- **Skills:** nestjs-expert, tdd · effort medium · Reviewer lens checklist.
- **Implementer (attempt 1):**
  - `_assertImpactCreatePayload` adds `contributors_result_toc_result` to the forbidden list only when it is a non-empty array (`[]` / null / undefined pass), with the same 400 and `{forbidden_fields}`.
  - `_assertImpactGeoScope` additionally requires `obj_version.obj_portfolio.acronym === P25_PORTFOLIO_ACRONYM`. It loads the portfolio through the already-injected `ResultRepository`, with no module change.
  - Files:
    - `create-result-from-framework.handler.ts`
    - `create-result-from-framework.impact.spec.ts`
    - `geographic-location.service.ts`
    - `geographic-location.service.spec.ts`
- **Evidence:**
  - Free RAM was about 2.6 GB, so Jest ran with `--runInBand`: `npx jest --silent --reporters=summary --forceExit --runInBand --findRelatedTests <handler.ts> <geographic-location.service.ts>` gave `Test Suites: 70 passed, 70 total` and `Tests: 2305 passed, 2305 total`.
  - `npx eslint <4 files> --quiet` exited 0.
- **Not Done / Assumptions (Implementer):**
  - No red run was recorded. The Reviewer traced both new tests against the pre-T-10 code; they would have failed on behavior: P22 returned 400, and the non-empty contributors list resolved instead of rejecting.
  - The TypeORM `select` + `relations` query was only run against mocks. It has to be confirmed live in IRS-T-9 (FP-10).
  - When the portfolio cannot be resolved, the guard does not fire. This is the permissive default for "not P25".
- **Reviewer verdict:** `STATUS: PASS`. Both decisions are met and decision 2 is untouched. The relations `Result.obj_version` (`result.entity.ts` L277) and `Version.obj_portfolio` (`version.entity.ts` L111-113) exist and match the anchor in `delete-recover-data.service.ts`. The bilateral and type-1 cases are unchanged.
- **Forward pointers:**
  - **FP-10 → IRS-T-9:** live geo save checks:
    - a P25 type-9 result with scope 1 returns 400;
    - a P22 type-9 result with scope 1 saves; the 2 existing P22 impact results are candidates, read-only check preferred;
    - confirm the portfolio query runs without a TypeORM error.
  - **FP-11 → archive:** sync the `requirements.md` R-9 wording to P25-only. Decision 1 stays provisional until Nicoleta confirms it.

---

### IRS-T-9 — End-to-end verification on PRTest (HITL) — in progress

**Pre-deploy check (user-run 2026-10-30, DBeaver screenshots, PRMSPROD and PRTest prdb):**

| Table.column | PROD | PRTest | Expected |
|---|---|---|---|
| `result.id` | `bigint` | `bigint` | signed `bigint` (FK target of the 3 new tables) |
| `users.id` | `int` | `int` | signed `int` (audit FK target) |

Verified: neither column is unsigned, so the migration's FK `CREATE` matches both environments (closes the IRS-T-2 Lens B watch item).

**Commit authorization:** the user authorized commit and push to `qa-development-2026-ss` on 2026-10-30.

**Deploy:**

- **qa-dev commit:** `9022e24ea` (52 files) on `qa-development-2026-ss`.
- **Merge into performance-refactor:** the user asked the agent to do it. Merge commit `fb8ad8075` on `performance-refactor`, made in the user's checkout. It was a `--no-ff` merge because perf carried other commits, among them `1793283760300-AddResultQaIntakeLog`. The merge had no conflicts.
- **Post-merge gate:** `--findRelatedTests` on the 30 changed non-spec `.ts` files, run with `--runInBand` because free RAM was 1.7 GB, gave `Test Suites: 102 passed, 102 total` and `Tests: 2677 passed, 2677 total` in 312 s. Pushed after that.
- **CI failure on `fb8ad8075` (run 41093526188):**
  - **What failed:** `qa-catalog.completeness.spec.ts` (QAC-R-7). Result: 1 failed / 6688 tests.
  - **Error:** `result table results_impact_level / results_impact_previous_result is neither in scope.ts nor in excluded-tables.ts`.
  - **Why the pre-push gate missed it:** the guard loads entities by glob, so `--findRelatedTests` cannot reach it.
  - **Fix:** commit `4a141416e`, made by the Leader inline because the user said "soluciona ya mismo"; it is a one-file data-list edit. It adds both tables to `EXCLUDED_TABLES`, with the reason "form section ships with result-detail-impact".
  - **Verification:**
    - QA catalog specs: 24/25 suites. The one failure is the `qa-catalog.snapshot` "committed snapshot is current" check. It is local-only, from CRLF vs LF on Windows (454 vs 454 lines), and green in CI.
    - Lint: OK.
  - **Merge:** merged into perf as `b06028408`, which triggered CI run 41102679372.
  - **FP-12 → result-detail-impact:** catalogue both tables in `scope.ts` and the sections, and remove them from `EXCLUDED_TABLES`.
  - **Kaizen candidate:** before push, the pre-push gate should also run `src/api/qa-catalog/qa-catalog.completeness.spec.ts` whenever a spec adds an entity.
- **Post-deploy checks (user-run 2026-10-30, PRTest):**
  - `migrations` lists 564 `IRSImpactResultsFoundation1792000000000` and 563 `AddResultQaIntakeLog1793283760300`.
  - `impact_study_type` holds 2 rows: Learning, Accountability.
  - `validation_maps` holds `impact-level-info` → `impact_level_info`, active.
  - The routine `validation_impact_level_info_P25` exists.
  - **All four verified.**
- **18-id baseline returns 0 rows on PRTest.** The IRS-T-1 baseline was captured on **PRMSPROD** (screenshot tab `<PRMSPROD> Script-84`), and those ids do not exist in PRTest's dataset. It cannot serve as before/after there.
- **Leader decision: replace it with a differential test on PRTest.**
  - **Setup:** install the pre-migration bodies (Appendix A/B, PROD live) as temporary functions `tmp_before_contributor_partner_P25` / `tmp_before_geo_location_P25`.
  - **Check:** compare them with the migrated functions on every active non-type-9 P25 result. Pass = 0 differences.
  - **Teardown:** drop the temporary functions.
  - **Why it is stronger than the 18 ids:** the migration installed exactly Appendix A/B + gates, so the differential isolates the gate delta over the whole P25 set. The "before captured after the migration" disqualifier does not apply, because the temp functions *are* the pre-migration bodies.
- **Differential result (user-run 2026-10-30 15:0x COT, PRTest):**
  - Setup: `tmp_before_contributor_partner_P25` (created 20:03:47 UTC) and `tmp_before_geo_location_P25` (20:05:10) next to the migrated `validation_contributor_partner_P25` (19:49:03, restored) and `validation_geo_location_P25` (18:22:53).
  - Over **3,161 active non-type-9 P25 results** (types 1, 2, 4, 5, 6, 7, 8, 10, 11; sources `API` and `Result`): `dif_contribuyentes = 0` and `dif_geografia = 0` in every group and in the ROLLUP total.
  - **IRS-R-15 / R-8 BUT parity verified.** This replaces the 18-id baseline.
- **PRTest type-9 inventory (user-run 2026-10-30):**
  - 40 active type-9 results: 39 P22 and **1 P25**, `id 8101` / `result_code 5834`, `geographic_scope_id = 1`. Code 5834 also exists as P22 id 8016, so it is a phase copy.
  - On PRTest this one row now gets:
    - geo green check FALSE (scope 1, unless `source = 'API'`);
    - the ToC bypass in contributors;
    - the new `impact-level-info` section, incomplete.
  - PROD had 0 P25 type-9 rows on 2026-10-29 (T-1 P-3). **Re-run P-3 on PROD before promoting to master.**
- **Live walk-through (user-run via PRTest Swagger `prtest-back.ciat.cgiar.org/api`, 2026-10-30 ~20:34–20:40 UTC):**

  | Step | Call | Observed | Verdict |
  |---|---|---|---|
  | a | GET study-types | 200, 2 types with definitions | ✅ |
  | b | POST create, no area | 400 `Impact results require an Impact Area` | ✅ R-1 S1.2 |
  | c | POST create + `toc_result_id` | 400 `…targets, indicators or Theory of Change`, `forbidden_fields:["toc_result_id"]` | ✅ R-1 S1.3 |
  | d | POST create + non-empty `contributors_result_toc_result` | 400 same, `forbidden_fields:["contributors_result_toc_result"]` | ✅ T-10 decision 1 |
  | e | POST create valid (area 4) | 201, result **12506** / code 10038, version 36 (Reporting 2026, P25), level 1 type 9 | ✅ R-1 S1.1 |
  | f | PATCH save, 101 words | 400 `The contribution statement must have at most 100 words` | ✅ R-5 S5.1 |
  | g | PATCH save valid | 200, echoes the saved values | ✅ |
  | h | GET get/result/12506 | 200, same values | ✅ R-4 |
  | i | PATCH `/v2/api/geographic-location/update/geographic/12506` scope 1 | 400 `Impact results only accept Regional (2) or Country (3) geographic scope.` | ✅ R-9 + T-10 (P25) |
  | j | same, scope 2 | 200 | ✅ |
  | SQL | result 12506 | `climate_change_tag_level_id = 3` (prefill R-2), `impact_level = 1` (R-6), `contributors = 0`, `geo = 0` | ✅ |

  - `contributors = 0` comes from having no partners (`no_applicable_partner = 0`, 0 institutions). It is not the ToC: the ToC block is bypassed for type 9.
  - `geo = 0` comes from scope 2 having no regions. Both are expected.
  - Test result **12506 must be deleted** after IRS-T-9.
  - **k:** GET get/result/8101 (the existing P25 type-9 phase copy) → 200 with null fields and `previous_results: []` (R-4 S4.1). ✅
  - **E5 search without `q`, page 1:**
    - 200, `total 7958`, `totalPages 398`, `limit 20`.
    - All 20 items are Reporting 2026 / P25, ordered by `result_code` ascending (347, 3580, 4104, …). This matches the ordering rule: open reporting phase first, then `phase_year` desc, then `result_code` asc. ✅
    - Older phases are expected on later pages.
  - **E5 p95 (20 calls, `q=maize&limit=20`, from the user's machine):** p95 = **96 ms**, min 78, max 1,191 (cold first call). Under 800 ms. ✅
  - **E6 p95 (20 calls, `initiativeId=50&versionId=36`):** p95 = **36 ms**, min 29, max 202. Under 300 ms. ✅
  - Last-page ordering check (`page=398`) was not run. Ordering is covered by page 1 plus the repository spec; recorded as an optional follow-up.
- **IRS-T-9 verdict: PASS (2026-10-30).**
  - **Migration:** applied ✅.
  - **Parity:** 0 differences over 3,161 P25 results ✅.
  - **Live walk-through:** 11/11 ✅.
  - **Performance:** E5 96 ms, E6 36 ms ✅.
  - **Follow-ups (user, 2026-10-30):**
    - Test result 12506 stays on PRTest; the user accepted it.
    - P-3 re-run on PROD: **0** active P25 type-9 rows, so the gates change no PROD result on release.
    - Nicoleta confirmation of decision 1 is left open for now (user's call).
- **Incident during the differential setup (2026-10-30, PRTest):**
  - The user pasted the pre-migration body (Appendix A) over `validation_contributor_partner_P25` itself, instead of creating `tmp_before_*`.
  - It was restored from `CONTRIBUTOR_PARTNER_WITH_IMPACT` by the user, then verified: `ROUTINE_DEFINITION LIKE '%<> 9%'` = 1, CREATED 19:49:03.
  - `validation_geo_location_P25` was untouched (CREATED 18:22:53 = migration time).
  - Lesson: temp-copy instructions must lead with the rename and warn that keeping the original name overwrites the migrated function.
- **Migration order note:** PRTest may already have run `1793283760300` before IRS `1792000000000`. TypeORM still runs every pending migration whatever its timestamp; confirm in the `migrations` table after the deploy.

---

## Appendix A — live `validation_contributor_partner_P25` (IRS-T-1, 2026-10-29)

```sql
CREATE FUNCTION `validation_contributor_partner_P25`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    
       DECLARE general_validation BOOLEAN DEFAULT TRUE;
      DECLARE lead_by_partner BOOLEAN DEFAULT NULL;
      DECLARE has_innovation_link BOOLEAN DEFAULT NULL;
      DECLARE no_applicable_partner BOOLEAN DEFAULT NULL;
      DECLARE planned_result BOOLEAN DEFAULT NULL;
      DECLARE result_id BIGINT DEFAULT NULL;
      DECLARE result_type_id BIGINT DEFAULT NULL;
      DECLARE count_institutions BIGINT DEFAULT 0;
      DECLARE institutions_ids TEXT DEFAULT NULL;
      DECLARE institutions_count_leading BIGINT DEFAULT 0;

      SELECT
        rtr.planned_result,
        valid_text(rtr.toc_progressive_narrative)
        INTO
        planned_result,
        general_validation
    FROM results_toc_result rtr
    WHERE rtr.is_active = TRUE
        AND rtr.results_id = resultId
    LIMIT 1;

      IF planned_result = FALSE THEN

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      ELSE

    SELECT
      COUNT(temp.valid) = SUM(temp.valid)
    INTO
      general_validation
    FROM
    (
      SELECT
        CAST(
          (
            (
              rtr.toc_progressive_narrative IS NULL
              OR TRIM(rtr.toc_progressive_narrative) = ''
              OR valid_text(rtr.toc_progressive_narrative)
            )
            AND rtr.toc_result_id IS NOT NULL
            AND COUNT(rtri.result_toc_result_indicator_id) > 0
            AND COALESCE(MAX(rit.contributing_indicator > 0), 0) = 1
          ) AS UNSIGNED
        ) AS valid
      FROM results_toc_result rtr
        LEFT JOIN results_toc_result_indicators rtri
          ON rtri.results_toc_results_id = rtr.result_toc_result_id
         AND rtri.is_active = TRUE
         AND rtri.is_not_aplicable = FALSE
        LEFT JOIN result_indicators_targets rit
          ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
         AND rit.is_active = TRUE
        LEFT JOIN `result` r ON r.id = rtr.results_id
      WHERE rtr.results_id = resultId
        AND rtr.is_active = TRUE
        AND r.is_active = TRUE
      GROUP BY rtr.result_toc_result_id
    ) temp;


          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      SELECT
          r.is_lead_by_partner,
          r.no_applicable_partner,
          r.id,
          r.result_type_id
          INTO
          lead_by_partner,
          no_applicable_partner,
          result_id,
          result_type_id
      FROM `result` r
      WHERE r.is_active = TRUE
          AND r.id = resultId;

      IF (result_id IS NULL) THEN RETURN FALSE; END IF;
      IF (no_applicable_partner IS NULL) THEN RETURN FALSE; END IF;

      SELECT
         COUNT(rbi.id),
         GROUP_CONCAT(rbi.id)
         INTO
         count_institutions,
         institutions_ids
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
         AND rbi.institution_roles_id = IF(result_type_id = 6, 8, 2)
         AND rbi.is_active = TRUE;

      SELECT
        COUNT(rbi.id)
        INTO
        institutions_count_leading
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
        AND rbi.is_leading_result = TRUE
        AND rbi.is_active = TRUE;

      SELECT
          rid.has_innovation_link IS NOT NULL AND
          rid.has_innovation_link = TRUE
        INTO
        has_innovation_link
      FROM results_innovations_dev rid
      WHERE rid.results_id = resultId
          AND rid.is_active = TRUE;

      SELECT
          riu.has_innovation_link IS NOT NULL AND
          riu.has_innovation_link = TRUE OR has_innovation_link
        INTO
        has_innovation_link
      FROM results_innovations_use riu
      WHERE riu.results_id = resultId
          AND riu.is_active = TRUE;

      IF (has_innovation_link = TRUE) THEN

          SELECT
              COUNT(*) > 0
              INTO
              general_validation
          FROM linked_result lr
          WHERE lr.origin_result_id = resultId
              AND lr.is_active = TRUE;

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      RETURN CASE
          WHEN no_applicable_partner = TRUE THEN TRUE
          WHEN lead_by_partner IS NULL THEN FALSE
          WHEN no_applicable_partner = FALSE AND count_institutions = 0 THEN FALSE
          WHEN (count_institutions > 0 AND count_institutions <> (
               SELECT COUNT(DISTINCT rbibdt.result_by_institution_id)
               FROM result_by_institutions_by_deliveries_type rbibdt
               WHERE rbibdt.is_active = TRUE
                   AND FIND_IN_SET(rbibdt.result_by_institution_id, institutions_ids)
           )) THEN FALSE
           WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE
           ELSE TRUE
           END;

END
```

## Appendix B — live `validation_geo_location_P25` (IRS-T-1, 2026-10-29)

```sql
CREATE FUNCTION `validation_geo_location_P25`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    
DECLARE general_validation BOOLEAN DEFAULT TRUE;
      DECLARE geo_scope BIGINT DEFAULT NULL;
      DECLARE has_countries BOOLEAN DEFAULT NULL;
      DECLARE has_regions BOOLEAN DEFAULT NULL;
      DECLARE has_extra_countries BOOLEAN DEFAULT NULL;
      DECLARE has_extra_regions BOOLEAN DEFAULT NULL;
      DECLARE has_extra_geo_scope BOOLEAN DEFAULT NULL;
      DECLARE result_type BIGINT DEFAULT NULL;
      
      SELECT 
          r.geographic_scope_id,
          r.has_countries,
          r.has_regions,
          r.result_type_id,
          r.has_extra_geo_scope,
          r.has_extra_countries,
          r.has_extra_regions 
          INTO
          geo_scope,
          has_countries,
          has_regions,
          result_type,
          has_extra_geo_scope,
          has_extra_countries,
          has_extra_regions
      FROM `result` r 
      WHERE r.id = resultId
          AND r.is_active = TRUE;
      
      IF (geo_scope IS NULL) THEN 
      
          RETURN FALSE; 
          
      ELSEIF(geo_scope = 50) THEN
      
          RETURN TRUE;
      
      END IF;  
      
      
      
      -- SCOPE 1,2
      
    IF ( geo_scope IN (1, 2) ) THEN 
    
        IF ( has_regions = TRUE OR geo_scope = 2 ) THEN 
        
            SELECT
                COUNT(rr.result_region_id) > 0
                INTO
                general_validation
            FROM result_region rr
            WHERE rr.result_id = resultId
                AND rr.is_active = TRUE
                AND rr.geo_scope_role_id = 1;
            
            IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        ELSEIF ( has_regions IS NULL ) THEN
        
            RETURN FALSE;
        
        END IF;
        
        IF (  has_countries = TRUE ) THEN 
        
            SELECT
                COUNT(rc.result_country_id) > 0
                INTO
                general_validation
            FROM result_country rc
            WHERE rc.result_id = resultId
                AND rc.is_active = TRUE
                AND rc.geo_scope_role_id = 1;
            
            IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        ELSEIF ( has_countries IS NULL ) THEN
        
            RETURN FALSE;
        
        END IF;

    
    END IF;
    
    -- SCOPE 3,4
    
    IF ( geo_scope IN (3, 4) ) THEN
    
        SELECT
            COUNT(rc.result_country_id) > 0
            INTO
            general_validation
        FROM result_country rc
        WHERE rc.result_id = resultId
            AND rc.is_active = TRUE
            AND rc.geo_scope_role_id = 1;
            
        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
    
    END IF;
    
    -- SCOPE 5
    
    IF ( geo_scope = 5 ) THEN
    
        SELECT 
            IF(COUNT(*) - COALESCE(SUM(temp.sub_counter),0) = 0, TRUE, FALSE)
            INTO
            general_validation
        FROM (SELECT IF((SELECT COUNT(css.code)
                            FROM clarisa_subnational_scopes css
                            WHERE css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, COUNT(rcs.result_country_subnational_id) > 0, TRUE) AS sub_counter
                FROM result_country rc
                LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
                LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc.result_country_id
                                                        AND rcs.is_active = TRUE
                                                        AND rcs.geo_scope_role_id = 1
        WHERE rc.result_id = resultId
            AND rc.is_active = TRUE
            AND rc.geo_scope_role_id = 1
        GROUP by  rc.country_id, cc.name) temp;
        
        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
    
    END IF;
    
    IF ( result_type IN (2, 7) AND geo_scope NOT IN (1, 50) ) THEN
    
        IF ( has_extra_geo_scope IS NULL ) THEN RETURN FALSE; END IF;
        IF ( has_extra_geo_scope = FALSE ) THEN RETURN TRUE; END IF;

        IF (has_extra_geo_scope = TRUE) THEN
        
            -- SCOPE 1,2
      
            IF ( has_extra_geo_scope IN (1, 2) ) THEN 
            
                IF ( has_extra_regions = TRUE OR has_extra_geo_scope = 2 ) THEN 
                
                    SELECT
                        COUNT(rr.result_region_id) > 0
                        INTO
                        general_validation
                    FROM result_region rr
                    WHERE rr.result_id = resultId
                        AND rr.is_active = TRUE
                        AND rr.geo_scope_role_id = 2;
                    
                    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        
                ELSEIF ( has_extra_regions IS NULL ) THEN
                
                    RETURN FALSE;
                
                END IF;
                
                IF (  has_extra_countries = TRUE ) THEN 
                
                    SELECT
                        COUNT(rc.result_country_id) > 0
                        INTO
                        general_validation
                    FROM result_country rc
                    WHERE rc.result_id = resultId
                        AND rc.is_active = TRUE
                        AND rc.geo_scope_role_id = 2;
                    
                    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        
                ELSEIF ( has_extra_countries IS NULL ) THEN
                
                    RETURN FALSE;
                
                END IF;
        
            
            END IF;
            
            -- SCOPE 3,4
            
            IF ( has_extra_geo_scope IN (3, 4) ) THEN
            
                SELECT
                    COUNT(rc.result_country_id) > 0
                    INTO
                    general_validation
                FROM result_country rc
                WHERE rc.result_id = resultId
                    AND rc.is_active = TRUE
                    AND rc.geo_scope_role_id = 2;
                    
                IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
            
            END IF;
            
            -- SCOPE 5
            
            IF ( has_extra_geo_scope = 5 ) THEN
            
                SELECT 
                    IF(COUNT(*) - COALESCE(SUM(temp.sub_counter),0) = 0, TRUE, FALSE)
                    INTO
                    general_validation
                FROM (SELECT IF((SELECT COUNT(css.code)
                                    FROM clarisa_subnational_scopes css
                                    WHERE css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, COUNT(rcs.result_country_subnational_id) > 0, TRUE) AS sub_counter
                        FROM result_country rc
                        LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
                        LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc.result_country_id
                                                                AND rcs.is_active = TRUE
                                                                AND rcs.geo_scope_role_id = 2
                WHERE rc.result_id = resultId
                    AND rc.is_active = TRUE
                    AND rc.geo_scope_role_id = 2
                GROUP by  rc.country_id, cc.name) temp;
                
                IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
            
            END IF;
        
        END IF;
    
    END IF;

     RETURN TRUE;
END
```

## Appendix C — live `validate_sections_mapped_batch` (IRS-T-1, 2026-10-29; reference only, not changed)

```sql
CREATE PROCEDURE `validate_sections_mapped_batch`(
  IN p_result_id BIGINT,
  IN p_sections_json JSON
)
BEGIN
  DECLARE v_portfolio_code VARCHAR(25);
  DECLARE v_json_length INT;
  DECLARE v_counter INT DEFAULT 0;
  DECLARE v_display_name VARCHAR(255);
  DECLARE v_function_name VARCHAR(255);
  DECLARE v_full_function VARCHAR(500);
  DECLARE v_function_exists INT DEFAULT 0;
  DECLARE v_continue_processing BOOLEAN DEFAULT TRUE;
  DECLARE v_validation_result TINYINT DEFAULT 0;
  
  -- Obtener datos críticos
  SELECT 
    cp.acronym
    INTO 
    v_portfolio_code
  FROM `result` r 
    INNER JOIN version v ON v.id = r.version_id 
    INNER JOIN clarisa_portfolios cp ON cp.id = v.portfolio_id 
  WHERE r.id = p_result_id
    AND r.is_active = TRUE;

  SET v_json_length = JSON_LENGTH(p_sections_json);
  
  -- Validación inicial
  IF v_json_length = 0 OR v_portfolio_code IS NULL THEN
    SELECT 'No data available' as section_name, FALSE as is_valid;
    SET v_continue_processing = FALSE;
  END IF;

  -- Solo procesar si la validación inicial pasó
  IF v_continue_processing THEN
    -- Tabla temporal para resultados
      DROP TEMPORARY TABLE IF EXISTS temp_validation_results;
    CREATE TEMPORARY TABLE temp_validation_results (
      display_name VARCHAR(255),
      validation BOOLEAN,
      execution_order INT,
      PRIMARY KEY (display_name)
    ) ENGINE = MEMORY;

    -- Procesar cada sección
    WHILE v_counter < v_json_length DO
      SET v_display_name = JSON_UNQUOTE(JSON_EXTRACT(p_sections_json, CONCAT('$[', v_counter, ']')));
      SET v_function_name = NULL; -- Reset para cada iteración
      
      -- Buscar mapeo de función
      SELECT 
        vm.function_name 
        INTO
        v_function_name
      FROM validation_maps vm 
      WHERE vm.display_name = v_display_name 
        AND vm.is_active = TRUE;
      
      IF v_function_name IS NOT NULL THEN
        -- Construir nombre completo de función
        SET v_full_function = CONCAT('validation_', v_function_name, '_', v_portfolio_code);
        
        -- Verificar si la función existe
        SELECT COUNT(*) INTO v_function_exists
        FROM information_schema.ROUTINES 
        WHERE ROUTINE_SCHEMA = DATABASE() 
          AND ROUTINE_NAME = v_full_function 
          AND ROUTINE_TYPE = 'FUNCTION';
        
        IF v_function_exists > 0 THEN
          -- Ejecutar función existente usando SQL dinámico CORREGIDO
          SET @validation_sql = CONCAT(
            'SELECT ', v_full_function, '(', p_result_id, ') INTO @validation_result'
          );
          PREPARE validation_stmt FROM @validation_sql;
          EXECUTE validation_stmt;
          DEALLOCATE PREPARE validation_stmt;
          
          -- Insertar el resultado obtenido
          INSERT INTO temp_validation_results VALUES (v_display_name, @validation_result, v_counter);
        ELSE
          -- Función no existe, insertar FALSE
          INSERT INTO temp_validation_results VALUES (v_display_name, FALSE, v_counter);
        END IF;
      ELSE
        -- Mapeo no encontrado, insertar FALSE
        INSERT INTO temp_validation_results VALUES (v_display_name, FALSE, v_counter);
      END IF;
      
      SET v_counter = v_counter + 1;
    END WHILE;

    -- Retornar resultados ordenados
    SELECT display_name as section_name, validation 
    FROM temp_validation_results 
    ORDER BY execution_order;
    
    -- Cleanup
    DROP TEMPORARY TABLE IF EXISTS temp_validation_results;
  END IF;
END
```
