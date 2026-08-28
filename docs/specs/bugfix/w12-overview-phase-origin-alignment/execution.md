# `bugfix/w12-overview-phase-origin-alignment` — Execution Log

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec** | `docs/specs/bugfix/w12-overview-phase-origin-alignment/` |
| **Approval mode** | gated — owner "arranca" (2026-08-28); Leader proceeds through PASS gates, stops at W12-T-3's owner verification |
| **Branch** | `qa-development-2026` @ base `6679944e9` (on top of agy's W3 fix `e9b9171cb`) |
| **Triad** | Leader: session model (T1) · Implementers: `akili-implementer` (T2) · Reviewers: `akili-reviewer` (T3, read-only) |
| **Budget (design §1)** | 3 tasks · ~220 LOC · 1 review round per task |
| **Pre-flight (design §13)** | **Owner-confirmed 2026-08-28: exactly ONE active reporting phase** → the server/client "current phase" resolution is deterministic; risk closed. |
| **Parallelism** | W12-T-1 ∥ W12-T-2 (disjoint files: `results.service.ts`+spec vs the summary chain + client) — width 2 |

## 2. Task Execution History

## W12-T-1 — Meter: W1/W2-origin filter + regression (server)

- **Status:** PASS (attempt 1) · 2026-08-28 · Implementer: `impl-w12-t1` · Reviewer: `rev-w12-t1`
- **Files:** `results.service.ts` (+5/−1: `filters` type widened to admit `string[]`, `fundingSource: ['Result']`), `result.spec.ts` (+9/−1; the repo's real ResultsService spec — `results.service.spec.ts` named in tasks.md does not exist; nominal deviation, fix spec naming at archive).
- **Bug Mode evidence:** RED pre-fix verbatim — `toHaveBeenCalledWith` received `{portfolioId: 3, versionId: 1}` missing `fundingSource` (1 failed / 93); GREEN post-fix 93/93. Exact-deep-equality assertion carries BOTH `fundingSource` and `versionId` → dropping either goes red.
- **Verification:** full server suite **197 suites / 1725 tests** green; eslint clean; `migration:check` 0 pending. Callers (`results.controller.ts:309`, `results-framework-reporting.controller.ts:65`) unaffected.
- **Reviewer:** **STATUS: PASS** — sole behavioural change; repo path verified (`addInGeneric` → `r.source IN ('Result')`); type widening provably no less safe (target param already declared string fields).
- **Forward pointer → W12-T-3 (owner check):** this endpoint ALSO feeds the RFR home cards (`mySciencePrograms`/`otherSciencePrograms`) and the SGP-02 fallback — an SP whose only results are bilateral now shows `totalResults: null` / empty `versions[]` on the home card too (in-scope under W12-R-1; metadata/progress/my-other bucketing verified unaffected). Spot-check a bilateral-only SP's home card at W12-AC-4.

## W12-T-2 — Matrix: origin + role + versionId + universe (server) · client passes the phase + versioned cache

- **Status:** PASS (attempt 2 of 3) · 2026-08-28 · Implementer: `impl-w12-t2` (effort high) · Reviewer: `rev-w12-t2`
- **Files (11):** server `result.repository.ts` + spec, `results-framework-reporting.{service,controller,module}.ts` + specs; client `results-api.service.ts` + spec, `dashboard-lab.component.ts` + spec. (`module.ts` = nominal deviation from design §2.1 — the only way to inject `VersioningService`; recorded.)
- **What:** SQL predicates `r.source = 'Result'`, `rbi.initiative_role_id = 1`, `r.version_id = ?` (year-COALESCE removed), `status_id != 4`, `result_type_id NOT IN (10,11)`; **`result_level_id IN (3,4)` DROPPED** — Reviewer independently verified the meter's base query (`result.repository.ts:627-802`) has NO level predicate, so keeping it would make parity unreachable (DD-2 requires the drop). Service: optional `versionId` → finite passthrough else `$_findActivePhase(REPORTING)` (404 if none), never `year.active`; `resolveInitiative` extracted, `getDashboardStats` behaviour identical; `VersioningModule` imported (no circular-import risk — grepped). Controller `@Query('versionId')` mirrors `results.controller.ts:295-313`. Client: `&versionId=` only when finite; `dashboard-lab` resolves the version like `loadBilateralRows`; single `summaryCacheKey` helper across all 4 map sites; 2 pre-existing heatmap fixtures re-seeded at `'SP02::default'` (adjudicated legitimate: stale seeding format, assertions untouched).
- **Bug Mode evidence (per layer, RED→GREEN recorded verbatim in the Implementer report):** repo 6 failed/12 → 12/12 (one spec per predicate class incl. level drop); service 5 failed/46 → 46/46 (defaults via `$_findActivePhase`, `mockYearRepository.findOne` NOT called); client api 1 failed → 4/4; dashboard-lab 4 failed/20 → 20/20 ×3. Reviewer reconciled every red count against what the code predicts; temporary `as any` casts for TS2554 red runs accepted (reverted; arity pinned by controller spec + green build).
- **Attempt 1 FAIL (1 issue):** DoD "`others` bucket receiving status ∉ {1,2,3}" had no consequence test. **Attempt 2:** case added (status 1/5/7 → `others: 5`, `totalResults: 6`, both surfaces) — recorded as green-only by construction (mapper unchanged; red-before lives in the repo predicate spec). + describe renamed, `INNER JOIN version v` justified.
- **Verification:** attempt 1 full: server **197 / 1737**, eslint, `migration:check` 0; client **483 / 6973**, `ng lint`, `ng build`. Attempt 2 scoped (owner directed no full reruns): 59/59 server specs, 285/285 client api spec, lint clean on touched files.
- **Forward pointers → W12-T-3:** (1) parity fixture must include a NULL/orphan `result_level_id` row — the meter INNER JOINs `result_level`, the matrix does not; (2) W12-AC-4 must spot-check an **AoW detail** page (`entity-aow.service.ts:167,191` consume the same endpoint — data now phase/origin/role-scoped) and a bilateral-only SP's **home card** (T-1 pointer).
- **ADVISORY (recorded, die here):** `reportingCurrentPhase` read non-reactively — late phase resolution could cache under `::default` then miss under `::N` (silent empty; pre-existing pattern, cost raised by versioned key; fix = derive key from `reportingPhaseVersion()`); `?versionId=` empty string → `Number('')=0` finite → `version_id = 0` (mirrors shipped `results.controller.ts`; fix both together); comment cites `:~692` should be `:702`.

## W12-T-3 — Parity + owner verification

- **Status (code half):** PASS (attempt 2) · 2026-08-28 · Implementer: `impl-w12-t2` · Reviewer: `rev-w12-t2`
- **File:** `results-framework-reporting.service.spec.ts` (+~130 LOC: `W12-R-3` describe).
- **What:** ONE `RAW_UNIVERSE` (survivors: Editing×10, Submitted×1, Pending-Review×2 [status 5], Rejected×1 w/ null `result_level_id`; excluded: 'API'×13, role-2×3, other-version×4, status-4×6, type-10×2, type-11×1) + ONE `SHARED_UNIVERSE_PREDICATE` fed to BOTH mappers → meter 14 === Σ matrix 14. Meter mapper `buildScienceProgramBuckets` invoked via `ResultsService.prototype` (Reviewer verified zero `this.` refs — pure, same code the endpoint runs; sidesteps the 45-dep DI). FAIL-input test: matrix re-narrowed to status ≤ 3 → concrete 14 vs 11 asserted.
- **Attempt 1 FAIL → attempt 2:** the `result_level_id` "positive proof" claim was false (meter INNER JOINs `result_level` at `result.repository.ts:692`, matrix does not → null-level row: meter < matrix); rewritten as a documented residual. + concrete 14/11 assertions + `role_id` fixture comment.
- **Two documented residuals (requirements-level, NOT implementation defects — carry into owner verification):** (1) meter has no `status_id != 4` predicate (Results tab neither) while the matrix excludes Discontinued; (2) meter drops null/orphan `result_level_id` rows, matrix doesn't. Either makes the three numbers legitimately diverge if such rows exist for the SP checked.
- **Verification:** scoped 49/49 in file; eslint clean.

### DB diagnostic (Leader, 2026-08-28, local QA DB via server creds — values never printed)
- Active reporting phase: **exactly one** — id 36 "Reporting 2026" (pre-flight confirmed in data).
- SP04 breakdown by (version, source, role, status): v36 `Result`/role-1 = **10 Editing + 1 Submitted = 11**; v36 `API` = 11 (status 1) + 2 (status 5); v36 `Result`/role-2 = 1; v34 carries 32 W1/W2 + 81 bilateral; v30 = 2.
- **New matrix SQL @ v36 → 11** (= Results tab). Confirms every W12-T-2 predicate and explains the original 24 (11 W1/W2 + 11 bilateral Editing + 2 bilateral Pending Review) and 23 (year-scoped, incl. role-2 and prior-version rows).
- Owner's post-fix empty card: the endpoint returned all-zero for `versionId=36` → **local server was serving stale code** (a `dist/src/main` process predating the change); the server has since restarted (01:09) with the new `dist`. Not a code defect.

### Hotfix under W12-T-2 scope — summaries cache reactivity (in flight, attempt 2)
- Real, separate gap found while chasing the empty card (Reviewer's attempt-1 advisory): nothing in `dashboard-lab` reads `reportingPhaseVersion()`, so a phase landing/switching after the load could orphan the versioned cache key. Attempt 1: dedicated `effect()` + `refreshSelectedSummaries()` (not folded into the selection effect — that one resets filter state); RED/GREEN recorded. Reviewer FAIL (2 items): computeds must also read the signal (cache-HIT phase switch served memoized old matrix — W12-R-2 BUT clause), and the effect's signal read had zero test coverage (mocks lacked `reportingPhaseVersion`). Attempt 2 in progress.
- **ADVISORY (recorded):** `loadBilateralRows` has the identical structural gap (agy's W3 code, effect doesn't read `reportingPhaseVersion()`) → own quick for the owner.
