# Tasks — Impact Results: Server Foundation

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `results` — impact results server foundation (child 1/3 of [`../family.md`](../family.md)) |
| Linked spec | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Baseline | `docs/prd.md` G1, G2, US-S1/S2 · `docs/ux-ui/design.md` (n/a server) · `docs/trd/trd.md` §3–5 |
| Ticket | P2-3901 |
| Owner | Santiago Sanchez |
| Status | in-progress (IRS-T-1..T-8 done 2026-10-29; IRS-T-10 amendment done 2026-10-30; IRS-T-9 PRTest HITL pending) |
| Approval Mode | gated |
| Budget (design §12A) | 9 tasks · ~1,300 LOC · ≤ 12 review rounds |

**Test rules (machine + user policy):** every Jest run uses `--maxWorkers=2`, scoped to touched files (`--findRelatedTests <files>`), one test run at a time. Never run the full suite. The agent never connects to the DB — every SQL observation is user-run.

---

## 2. Pre-flight checklist

- [ ] `requirements.md` approved.
- [ ] `design.md` approved.
- [ ] IRS-OQ-1 (replication) — non-blocking; IRS-R-14 code is inert until decided.
- [x] IRS-T-1 outputs pasted into `execution.md` (live bodies + premise answers).
- [x] No in-flight spec touching `validation_contributor_partner_P25` / `validation_geo_location_P25` (search `docs/specs/` + `git log -S` on both names).
- [ ] `npm run migration:check` green on a clean `qa-development-2026-ss`.

---

## 3. Task list

### IRS-T-1 — Capture live DB facts (user-run, HITL) — `[x]`

- **Type:** db (read-only, user-run)
- **Description:** User runs the 8 read-only statements of design §1A in DBeaver against prdb and pastes outputs into `execution.md`. The agent records each premise P-1, P-2, P-3, P-5, P-6, P-7, P-10, P-11 as `verified` or `refuted`, and saves the three live bodies verbatim as the migration's `down` source. **Also captures the "before" baseline for IRS-T-9:** the section results (`general-information`, `contributor-partners`, `geographic-location`) for 10 non-impact P25 results covering types 1, 2, 4, 5, 6, 7, 8 (agent supplies the inline SELECT calling each `validation_*_P25` function for those ids).
- **Implements:** design §1A; preconditions of IRS-R-1, R-2, R-8, R-9, R-15
- **Files (expected):** `docs/specs/results/impact-results-reporting/server-foundation/execution.md`
- **Depends on:** —
- **Blocks:** IRS-T-2, IRS-T-4
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any premise refuted (e.g. `result_by_level` has no (1,9); type-9 rows with `source='API'` and Global scope exist **and** P25 — that one is expected and handled by IRS-DD-6, others are not).
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** a refuted premise whose "If false" column changes a DD → stop, amend design, re-approve before IRS-T-2.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [x] All 8 outputs recorded; premise ledger statuses updated in `design.md`.
  - [x] Live bodies of the two functions + procedure stored verbatim (no secrets in output).

### IRS-T-2 — Migration + entities — `[x]`

- **Type:** db + server
- **Description:** Entities `ImpactStudyType`, `ResultImpactLevel`, `ResultImpactPreviousResult` (design §3.1) and one idempotent migration (§3.2): 3 tables + FKs + unique keys + seed (2 study types, verbatim definitions); ensure (1,9) and type 9 active; `validation_maps` row `impact-level-info → impact_level_info`; new `validation_impact_level_info_P25` (IRS-R-6 rule, word count per design §5); `validation_contributor_partner_P25` = **live body** + `result_type` variable + bypass of ToC and linked/innovation-link blocks for type 9 (IRS-DD-5); `validation_geo_location_P25` = **live body** + gate `type 9 AND source <> 'API' AND scope NOT IN (2,3) ⇒ FALSE` before the scope-50 shortcut (IRS-DD-6). `down` restores live bodies verbatim and drops the rest.
- **Implements:** IRS-R-3 (seed), IRS-R-6, IRS-R-8 (Scenario 8.1 incl. BUT clause), IRS-R-9 (green-check half, incl. "still require region/country" AND clause), IRS-R-15 (SQL side)
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/impact-level/entities/*.entity.ts`, `onecgiar-pr-server/src/migrations/<ts>-IRS-ImpactResultsFoundation.ts`
- **Depends on:** IRS-T-1
- **Blocks:** IRS-T-3, IRS-T-7
- **Estimate:** L
- **Review:** lenses
- **Verification:**
  - **Falsifier:** a diff between the migration's "old" text and the live body recorded in IRS-T-1 other than the added gates; or a non-impact branch whose return value can change (e.g. a gate placed inside an `ELSE` that other types reach).
  - **Red run:** `npm run migration:check` (fails before entities+migration agree, passes after).
  - **Disqualifier:** live body differs structurally from the repo body so the gate cannot be inserted as designed → stop and re-design IRS-DD-5/6.
  - **Consumers:** `validate_sections_mapped_batch`; `api/qa-catalog/definitions/sections/*.ts`; `api/bilateral/services/bilateral-projects.service.ts` (both call these functions — behavior for non-type-9 must be identical).
  - **Cannot prove:** `migration:check` proves schema/entity agreement only — not SQL function behavior. Behavior is proven in IRS-T-9.
- **Definition of done:**
  - [x] Up/down text reviewed against IRS-T-1 bodies line by line.
  - [x] `migration:check` green; no `synchronize`. *(moved to IRS-T-9: the check only compares migration names, see execution.md IRS-T-2 Leader decision 1)*
  - [ ] Commit `✨ feat(impact-level) [P2-3901]: …`.

### IRS-T-3 — `impact-level` module skeleton + study-types endpoint + `countWords` — `[x]`

- **Type:** server
- **Description:** Module, controller (no prefix, routes per design §4.1), service, repositories (`ResultImpactLevelRepository`, `ResultImpactPreviousResultRepository` extending the project's replicable base), wiring in `results-framework-reporting.module.ts` and `api/modules.routes.ts`; E2 `GET impact-level/study-types`; shared `countWords` util; module `CLAUDE.md`.
- **Implements:** IRS-R-3, IRS-R-12 (JWT parity), word definition of requirements §3
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/impact-level/**`, `…/results-framework-reporting.module.ts`, `src/api/modules.routes.ts`
- **Depends on:** IRS-T-2
- **Blocks:** IRS-T-5, IRS-T-6, IRS-T-8
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** `countWords("  a\n\tb  ")` ≠ 2; `countWords("")` ≠ 0; 100 words joined by mixed whitespace ≠ 100; E2 returns an inactive row or ≠ 2 rows on the seed.
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/api/results-framework-reporting/impact-level/utils/count-words.ts src/api/results-framework-reporting/impact-level/impact-level.service.ts`
  - **Disqualifier:** route path collides with an existing route under `results-framework-reporting`.
  - **Consumers:** none (new module)
- **Definition of done:** tests green; Swagger tags present; lint clean on touched files (`npx eslint <files> --quiet`).

### IRS-T-4 — Impact branch in create handler (E1) — `[x]`

- **Type:** server
- **Description:** Add optional `impact_area_id` to `CreateResultDto`; in `create-result-from-framework.handler.ts` detect level 1/type 9 → manual guard (area 1–5 required; reject non-null `toc_result_id`, `indicators`, `number_target`, `target_date`, `contributing_indicator`) **before** any write; skip `LinkFrameworkResultTocService`; after creation write chosen tag column = 3 and the other four = 1 using the `IMPACT_AREA_TAG_COLUMN` constant confirmed in IRS-T-1; non-impact requests ignore `impact_area_id`.
- **Implements:** IRS-R-1 (Scenarios 1.1 incl. BUT, 1.2, 1.3 incl. AND IT MUST, 1.4), IRS-R-2 (Scenario 2.1 incl. AND + BUT)
- **Files (expected):** `onecgiar-pr-server/src/application/commands/create-result-from-framework/*.ts`, `src/api/results/dto/create-result.dto.ts`, `…/impact-level/constants/impact-area-tag-column.ts`
- **Depends on:** IRS-T-1
- **Blocks:** IRS-T-9
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** (a) payload with `number_target: 5` creates a result; (b) missing area creates a result; (c) a later `PATCH general-information` with Climate=1 is overwritten back to 3; (d) a level-3 request with `impact_area_id` behaves differently from today (snapshot of calls to `createOwnerResultV2` / ToC link).
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/application/commands/create-result-from-framework/create-result-from-framework.handler.ts`
  - **Disqualifier:** `createOwnerResultV2` must be changed to avoid the ToC row → re-spec (design assumes it stays untouched).
  - **Consumers:** `CreateResultDto` users — `results.service.ts` `createOwnerResult*`, `ResultsController` create endpoints, client `create-result-payload.util.ts` (additive field only).
- **Definition of done:** tests for 1.1–1.4 and 2.1 green; no change to non-impact code paths (diff review).

### IRS-T-5 — Read/save Impact level info (E3, E4) — `[x]`

- **Type:** server
- **Description:** E3 returns the section DTO (null-safe when never saved). E4 validates (type 9, study type in catalog, ≤ 100 words, ≤ 5,000 chars, link ids exist + active + ≠ self) and in one transaction upserts `results_impact_level` and syncs links (set semantics; `previously_reported=false` deactivates all; unsent fields untouched).
- **Implements:** IRS-R-4 (4.1, 4.2), IRS-R-5 (5.1 incl. AND IT MUST 100 accepted, 5.2 incl. both ANDs, 5.3, 5.4)
- **Files (expected):** `…/impact-level/impact-level.service.ts`, `…/impact-level/dto/*.ts`, repositories, `*.spec.ts`
- **Depends on:** IRS-T-3
- **Blocks:** IRS-T-9
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** 101 words saved; 100 words rejected; sending `[7,7,9]` stores two rows for 7; removing 9 from the list leaves it active; self id accepted; a non-impact result id returns 200; a rejected request writes the `results_impact_level` row before failing (transaction not wrapping validation).
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/api/results-framework-reporting/impact-level/impact-level.service.ts`
  - **Disqualifier:** none expected.
  - **Consumers:** none (new endpoints)
- **Definition of done:** one test per scenario/clause above; error messages name the rule.

### IRS-T-6 — Cross-portfolio search (E5) + per-area counts (E6) — `[x]`

- **Type:** server
- **Description:** E5 per design §5 (filters, order active-phase-first → phase year desc → code, exclude inactive + `excludeResultId`, page/limit 1–50, `meta`). E6 aggregate by initiative ownership role 1 + version + level 1/type 9 + active, `SUM(tag=3)` per area + distinct total, all 5 areas present with zeros.
- **Implements:** IRS-R-10 (10.1 incl. AND exclusions, AND page size), IRS-R-11 (11.1)
- **Files (expected):** `…/impact-level/repositories/*.ts`, controller, dto, `*.spec.ts`
- **Depends on:** IRS-T-3
- **Blocks:** IRS-T-9
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** 2023 row listed before 2026 row; `limit=51` accepted; a deleted result returned; Scenario 11.1 fixture gives Climate ≠ 2 or total ≠ 2; an area missing from E6 when its count is 0.
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/api/results-framework-reporting/impact-level/repositories/impact-level-search.repository.ts src/api/results-framework-reporting/impact-level/repositories/impact-level-counts.repository.ts`
  - **Disqualifier:** ordering needs a column not on `version` (e.g. no phase year) → amend design §5.
  - **Cannot prove:** mocked query builders do not prove SQL ordering or p95 — proven on PRTest in IRS-T-9.
  - **Consumers:** `VersioningService.$_findActivePhase` (read-only use).
- **Definition of done:** tests green; Swagger documents query params.

### IRS-T-7 — Section list for impact results + geography save guard — `[x]`

- **Type:** server
- **Description:** Enum `IMPACT_LEVEL_INFO='impact-level-info'`; `case 9` in `results-validation-module.repository.ts` adds it only for P25. Guard at top of `saveGeoScopeV2`: load `result_type_id` + `source`; type 9 and source ≠ `API` and scope ∉ {2,3} → 400, nothing written.
- **Implements:** IRS-R-7 (incl. BUT clause), IRS-R-9 (Scenario 9.1 save half incl. BUT other types), IRS-R-15 (TS side)
- **Files (expected):** `src/api/results/results-validation-module/enum/validation-maps.enum.ts`, `…/results-validation-module.repository.ts`, `src/api/results-framework-reporting/geographic-location/geographic-location.service.ts`, specs
- **Depends on:** IRS-T-2
- **Blocks:** IRS-T-9
- **Estimate:** S
- **Review:** full
- **Verification:**
  - **Falsifier:** a type-7 P25 result's section list changes; a type-9 P22 result gets `impact-level-info`; scope 50 saved for a PRMS type-9 result; scope 1 rejected for a type-9 `source='API'` result or for a type-1 result.
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/api/results/results-validation-module/results-validation-module.repository.ts src/api/results-framework-reporting/geographic-location/geographic-location.service.ts`
  - **Disqualifier:** `saveGeoScopeV2` is called inside a transaction where an extra `findOne` deadlocks → move the guard to the controller (design alternative).
  - **Consumers:** `saveGeoScopeV2` callers — `geographic-location.controller.ts:28`, `ResultsService._updateGeographicScope` (admin data-standard path).
- **Definition of done:** tests green for every falsifier row.

### IRS-T-8 — Lifecycle: replication case 9 + soft/hard delete — `[x]`

- **Type:** server
- **Description:** `case 9` in `versioning.service.ts` `$_phaseChangeReporting` replicating both tables to the new result id (links keep `previous_result_id`); `logicalDelete` of both tables in `deleteResult`; `fisicalDelete` on type change away from 9 (common path if it runs for all types — confirm; else each `DELETE_*`), awaited.
- **Implements:** IRS-R-13, IRS-R-14
- **Files (expected):** `src/api/versioning/versioning.service.ts`, `src/api/delete-recover-data/delete-recover-data.service.ts`, impact repositories, specs
- **Depends on:** IRS-T-3
- **Blocks:** IRS-T-9
- **Estimate:** S
- **Review:** full
- **Verification:**
  - **Falsifier:** replication of a type-9 result leaves no `results_impact_level` row on the copy; links on the copy point to the copy's own id; deleting the result leaves impact rows active; replication of a type-7 result calls the impact repository.
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/api/versioning/versioning.service.ts src/api/delete-recover-data/delete-recover-data.service.ts`
  - **Disqualifier:** the replication transaction contract differs from `ReplicableRepository` → follow the actual base, note in `execution.md`.
  - **Consumers:** `$_phaseChangeReporting` (phase rollover — W2), `deleteResult`, `deleteDataByNewResultType`.
- **Definition of done:** tests green; no change to other `case` branches (diff review).

### IRS-T-10 — Post-decision amendment: ToC contributors + P25-only geo guard — `[x]`

- **Type:** amendment (added 2026-10-30 after the user decisions in `execution.md`)
- **Description:** reject a non-empty `contributors_result_toc_result` on impact create (same 400); geo save guard only for P25 type-9 non-bilateral results.
- **Implements:** IRS-R-1 (forbidden fields), IRS-R-9 (amended: P25 only)
- **Files:** `create-result-from-framework.handler.ts` + impact spec, `geographic-location.service.ts` + spec
- **Depends on:** IRS-T-4, IRS-T-7 · **Blocks:** IRS-T-9
- **Definition of done:** scoped tests + lint green; Reviewer PASS.

### IRS-T-9 — End-to-end verification on PRTest (HITL)

- **Type:** rollout / tests
- **Description:** After deploy to PRTest (performance-refactor flow): user runs green-check comparison for 10 non-impact P25 results across types 1, 2, 4, 5, 6, 7, 8 (baseline captured in IRS-T-1 before the migration, re-run here after it) — must be identical; user (or agent via API with the user's token, never logged) walks one impact result through every rule (prefill, sub-component, contributors without ToC, geo 2/3 only, section 5 incomplete → complete, submit flag); measures E5 p95 (20 calls, text filter, limit 20) and E6 p95.
- **Implements:** IRS-R-6 (6.1 incl. BUT), IRS-R-8 (8.1 BUT parity), IRS-R-9 (green-check half), IRS-R-15, NFR performance
- **Files (expected):** `execution.md` (evidence only)
- **Depends on:** IRS-T-2, T-4, T-5, T-6, T-7, T-8, T-10
- **Blocks:** child #2, #3 start
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any non-impact result whose section values differ before/after; an impact result complete in contributors only when a ToC narrative is present; E5 p95 ≥ 800 ms or E6 ≥ 300 ms.
  - **Red run:** n/a (no test gate — live SQL behavior)
  - **Disqualifier:** p95 measured from fewer than 20 calls, or runs whose spread exceeds the threshold distance → report spread, not a pass. A before/after comparison where the "before" was captured after the migration ran is not evidence.
  - **Consumers:** children #2 and #3 (contracts E1–E6).
- **Definition of done:** evidence table in `execution.md`; family row #1 → `done`.

---

## 4. Dependency graph

```
IRS-T-1 (HITL live facts)
 ├── IRS-T-2 (migration + entities)
 │     ├── IRS-T-3 (module + E2 + countWords)
 │     │     ├── IRS-T-5 (E3/E4)        ┐
 │     │     ├── IRS-T-6 (E5/E6)        │ parallel-safe with each other
 │     │     └── IRS-T-8 (lifecycle)    ┘
 │     └── IRS-T-7 (section list + geo guard)
 └── IRS-T-4 (create branch)            — parallel with T-2..T-8
            └── all ──► IRS-T-9 (PRTest HITL)
```

Only one Jest run at a time even when tasks run in parallel.

---

## 5. Test plan & clause coverage

| Requirement clause | Owning task | Test |
|---|---|---|
| R-1 S1.1 happy + BUT no ToC/target required | T-4 | handler spec |
| R-1 S1.2 missing/invalid area → 400, no write | T-4 | handler spec |
| R-1 S1.3 target/ToC → 400 + AND no rows | T-4 | handler spec |
| R-1 S1.4 area ignored for non-impact | T-4 | handler spec |
| R-2 S2.1 prefill + AND sub-component pending + BUT no re-prefill | T-4 (+ T-9 live) | handler spec |
| R-3 two study types with definitions | T-2 seed, T-3 | service spec |
| R-4 S4.1 never saved → nulls | T-5 | service spec |
| R-4 S4.2 non-impact → 400 | T-5 | service spec |
| R-5 S5.1 101 rejected + AND 100 accepted | T-3 (`countWords`), T-5 | util + service spec |
| R-5 S5.2 set semantics + AND invalid/self rejected + AND any portfolio | T-5 | service spec |
| R-5 S5.3 No deactivates links | T-5 | service spec |
| R-5 S5.4 invalid study type | T-5 | service spec |
| R-6 S6.1 complete + BUT Yes/0 links, 0 or >100 words | T-2 (SQL), T-9 (live) | manual |
| R-7 five sections + BUT no section for other types | T-7 | repository spec |
| R-8 S8.1 complete without ToC + BUT parity for others | T-2 (SQL), T-9 (live) | manual |
| R-9 S9.1 save rejects 1/4/5/50 + AND region/country still required + BUT other types/API keep scopes | T-7 (save), T-2 + T-9 (green check) | service spec + manual |
| R-10 S10.1 ordering + AND exclusions + AND page size | T-6 (+ T-9 live) | repository spec |
| R-11 S11.1 counts | T-6 | repository spec |
| R-12 JWT parity | T-3 | review (no new exclusion) |
| R-13 delete | T-8 | service spec |
| R-14 replication | T-8 | service spec |
| R-15 no regression | T-4, T-7 (TS), T-9 (SQL) | specs + manual |

No clause is cleared by citing another requirement.

---

## 6. Rollout & verification

- [ ] Commits per task, convention `✨ feat(<scope>) [P2-3901]: …` (no apostrophes in subject — Jenkins).
- [ ] Only on user go-ahead: commit, push to `qa-development-2026-ss`, then performance-refactor for PRTest (~30 min deploy).
- [ ] CI green: lint, scoped tests, `migration:check:ci`, SonarCloud.
- [ ] IRS-T-9 evidence before children #2/#3 start.

## 7. Cleanup & follow-ups

- [ ] Tickets: server Submit completeness guard (IRS-G-3); per-result write authorization (IRS-G-4).
- [ ] Nicoleta answer on replication (IRS-OQ-1).
- [ ] `codegraph sync` after merge.

## 8. Roll-back plan

1. Revert the IRS commits in reverse order.
2. `npm run migration:revert` once — restores the two live function bodies and drops the new tables/map row/function.
3. No flag to disable; children #2/#3 not yet shipped, so no client depends on E1–E6.
4. Bilateral payloads unchanged — nothing to notify.
