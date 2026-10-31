# Execution — ToC KPI question optional vs. green check (`bugfix/toc-kpi-optional-green-check`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/toc-kpi-optional-green-check/` · Lite · Bug Mode |
| Ticket | P2-4061 |
| Approval Mode | `gated`; user chose "Continue" to `/akili-execute` on 2026-10-30. Tasks chain without a continue prompt; stops only on HALT, pivot or tripwire |
| Leader | Claude (Opus). Implementers: `akili-implementer`. Reviewers: `akili-reviewer` |
| Budget | 3 tasks · ~200 LOC · ≤ 2 review rounds per task |
| Run note | TKG-T-1 and TKG-T-2 run in parallel. Jest runs are serialised through a scratchpad lock file, with `--maxWorkers=1` because free RAM is low (~2.6 GB) |

## 2. Task Execution History

### TKG-T-2 — QA catalog: `toc.planned_result` optional · `[x]` · 2026-10-31

| Field | Value |
|---|---|
| Implementer | `akili-implementer`, effort low, skill `nestjs-expert`. Attempt 1 |
| Files | `definitions/sections/contributors-partners.ts` (`required: false`, comment cites P2-4061 / migration 1792100000000), `definitions/versions.ts` (2026 rev 30 → 31), `__snapshots__/qa-catalog.snapshot.json` (regenerated: revision + `content_hash` only, `keys` unchanged), `qa-catalog.contributors-partners.spec.ts` (+S-2.1 test), `qa-catalog.controller.spec.ts:98`, `qa-catalog.service.spec.ts:173`, `qa-catalog.shape.spec.ts:1029` (old revision literals → 31) |
| Verification | `npx jest src/api/qa-catalog --maxWorkers=1 --silent --reporters=summary --forceExit` (=1 because free RAM < 4 GB) |
| Baseline | 24/25 suites, 636/637 tests. The one failure is `qa-catalog.snapshot.spec.ts:430` "committed snapshot is current". The implementer believes it is CRLF line endings only: regenerating at rev 30 gave no git diff. **Not verified** |
| Intermediate | 3 failed, on the old `2026.30` / `revision: 30` literals |
| After | 25/25 suites, 638/638 tests |
| Falsifier | No existing spec asserted `toc.planned_result` requiredness, so the S-2.1 test was added |
| Lint | `npx eslint --quiet` on the 3 edited source/spec files: clean |
| Reviewer | `akili-reviewer`, light. **STATUS: PASS**. Checked the S-2.1 AND clause in the source: `toc.entries` L444-445 keeps `whenEq(planned_result, true)`; `toc.program_invested_financial_resources` L468-469 and `toc.narrative` L483-484 keep `whenEq(planned_result, false)`. Disqualifier (snapshot drift) does not apply |
| Not Done | None for this task. Open note: if the snapshot spec fails on another checkout, check line endings first |

### TKG-T-1 — Migration with the NULL + 2026 gate · `[~]` · 2026-10-31

| Field | Value |
|---|---|
| Implementer | `akili-implementer`, effort medium, skills `tdd`, `nestjs-expert`. Attempt 1 |
| Files | NEW `src/migrations/1792100000000-TKG-TocKpiOptionalGreenCheck.ts` (`up`: base body + lines tagged `-- TKG-GATE`: `DECLARE phase_year`, phase-year lookup via `result.version_id` bound to `resultId`, `IF planned_result IS NULL AND COALESCE(phase_year, 0) >= 2026 THEN SET general_validation = TRUE;`, old `IF planned_result = FALSE` → `ELSEIF`; `down`: imported `CONTRIBUTOR_PARTNER_WITH_IMPACT`). NEW `src/api/results-framework-reporting/contributors-partners/contributor-partner-green-check.migration.spec.ts` (cases a–d). EDITED `src/migrations/1792000000000-IRS-ImpactResultsFoundation.ts`: `const` → `export const CONTRIBUTOR_PARTNER_WITH_IMPACT` only |
| Red | `npx jest src/api/results-framework-reporting/contributors-partners/contributor-partner-green-check.migration.spec.ts --maxWorkers=1 --silent --reporters=summary --forceExit` → 3 failed, 1 passed. (a), (c), (d) failed (newest function migration was 1792000000000: no gate, `down` issues `CONTRIBUTOR_PARTNER_LIVE`, no phase-year lookup); (b) passes trivially without a gate. Summary reporter, so no verbatim assertion text |
| Green | Same command → 4/4 passed; still green after lint `--fix` |
| Falsifier | `> 0` → `>= 0` in the new migration made (b) fail (1 failed, 3 passed); reverted byte-identical |
| Lint | `npx eslint --quiet` on the 3 files: clean |
| Reviewers | Migration task, so two lens reviewers (`akili-reviewer`). **Lens 1 (spec + reliability/risk, SQL semantics): STATUS: PASS.** S-1.1..S-1.5 traced through MySQL semantics (no row → No-data warning leaves `planned_result` NULL; NULL row; 2025/NULL version → ELSE branch returns FALSE as today; type 9 untouched); the no-op `SET` cannot change an outcome; comments parse; TypeORM migration loader skips the string export. **Lens 2 (spec + readability/resilience, regression spec): STATUS: PASS** |
| IRS `export` vs TKG-NFR-1 | Recorded as the design §7 sanctioned exception: `up`/`down` of 1792000000000 unchanged (both reviewers agree) |
| ADVISORY (not gating) | (1) Nothing pins the gate's THEN line: `RETURN FALSE; -- TKG-GATE` or any extra tagged line would stay green. Assert the exact tagged lines. (2) Selector would skip a future `CREATE DEFINER=… FUNCTION` form; widen the regex. (3) Pick the migration class by `prototype.up`, not first function export. (4) (d)'s negative check is weak. (5) `newestFunctionMigration()` reads all migrations 4×; cache in `beforeAll`. (6) Phase-year SELECT has no `r.is_active` filter: harmless (inactive results return FALSE later) |
| Not Done | **TKG-NFR-3 `npm run migration:check` not run**: the script opens a MySQL connection and agents may not connect to the DB. Handed to Santiago. MySQL compile and real-row behaviour: TKG-T-3 on PRTest, per the defect-class table. Task stays `[~]` until `migration:check` is run |

#### TKG-T-1 closure · `[x]` · 2026-10-31

| Field | Value |
|---|---|
| TKG-NFR-3 | Santiago ran `npm run migration:check` locally (local stack points at the prod DB). Output: total 499, executed 498, pending 2: `IRSImpactResultsFoundation1792000000000`, `TKGTocKpiOptionalGreenCheck1792100000000`. TypeORM loads both classes with the right names, so the `export` added to the IRS file does not break migration discovery. Both pending is expected: neither has run on that DB. `migration:run` was **not** run, and must not be run from local against prod |
| Not Done | None for this task. MySQL compile and real-row behaviour remain TKG-T-3 (PRTest), per the defect-class table |
