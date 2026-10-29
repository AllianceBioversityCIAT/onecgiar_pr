# Execution — Portfolio Overview: W3/Bilateral projects, by P/A and by Center

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/w3-projects-section/` |
| Approval Mode | gated (stop for the user after every task) |
| Branch | `qa-development-2026-ss` (no commit without explicit go-ahead) |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Started | 2026-10-16 |
| Kaizen | `docs/specs/kaizen-log.md` does not exist; no Active Lessons |

**Pre-flight note:** the checkout also holds uncommitted changes outside this spec's folders (`result-framework-reporting/pages/dashboard-lab/**`, `family.md`, `achieved-display-basis.spec.ts`). None touch `portfolio-overview/` or the server `results-framework-reporting.*` files. Diffs for review are extracted per task path only.

## Task Execution History

### WPS-T-1 — Repository: one per-project facts query — PASS (attempt 2)

- **Date:** 2026-10-16
- **Skills:** `nestjs-expert`, `tdd` (as listed). Effort: `high` (correctness-critical SQL).
- **Requirements covered:** WPS-R-1 S-1.1 (P2–P7 predicates, P4 NULL active), WPS-R-2 S-2.1 (Discontinued, version, inactive links/results), WPS-R-3 S-3.1 (source Result, no status filter), NFR Security (bound params), JD-3 / JD-6 / JD-11.

**Attempt 1**
- Files:
  - `onecgiar-pr-server/src/api/bilateral/constants/approved-mapping-statuses.constants.ts` (new; `APPROVED_MAPPING_STATUSES = Set(['Confirmed'])`)
  - `onecgiar-pr-server/src/api/bilateral/services/bilateral-projects.service.ts` (private static set → imported constant; no behaviour change)
  - `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` (`getPortfolioProjectFacts(year, resolvedVersionId)` + `PortfolioProjectFactsRow`)
  - `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts` (10 tests)
- Verification: red run `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="clarisa-projects\.repository\.spec|bilateral-projects\.service\.spec"` → `Test Suites: 1 failed, 1 passed`; repository spec failed at compile (method missing), bilateral spec green. Green run and eslint **not run**: free RAM 0.92 / 2.83 / 3.43 GB (< 4 GB rule). The Implementer reported that the red run was fired together with the RAM probe (rule breach, no harm, `--maxWorkers=2`).
- Reviewer: **FAIL**
  > 1. **Discovered Issue:** In `clarisa-projects.repository.spec.ts`, the test `applies no status filter to the W1/W2 probe` fails on the correct implementation. It takes `sql.slice(indexOf('AS has_w1w2') - 400, ...)`. In the squashed SQL the W1/W2 EXISTS block is about 202 characters; before it come `) AS has_bilateral, ` and then `...OR r.status_id <> ?) ` from the W3 probe, so `status_id` falls inside the 400-character window and `expect(w1w2).not.toContain('status_id')` fails. The green run was never done, so this was not seen.
  >    * **Violated Rule:** `tasks.md` WPS-T-1, Definition of done: "Specs green (red run above)".
  >    * **Remediation Suggestion:** Scope the window to the W1/W2 block itself (slice from `sql.lastIndexOf('EXISTS', sql.indexOf('AS has_w1w2'))`). Keep the `status_id` count of 2. Then run the green command and eslint on the 4 touched files.
  - Leader adjudications confirmed by the Reviewer: repository returning booleans follows `tasks.md` (design §5 names the same boolean fields) — not a violation; `clarisa/` importing `SourceEnum` from `api/results` has precedent (`clarisa-connections.service.ts:9`, `clarisa-projects.service.ts:10`) and no load-time cycle.
  - Advisory: RELIABILITY `GROUP_CONCAT` truncates at `group_concat_max_len` (1024) — fine for a few codes, note for WPS-T-6; READABILITY prettier wrap in `bilateral-projects.service.ts`; RISK `Number(organization_code)` could be `NaN` on a non-numeric value (column is numeric, low).

**Attempt 2** (effort kept `high`; fix was test-only and mechanical)
- Files: `clarisa-projects.repository.spec.ts` (window = last `EXISTS` before `AS has_w1w2` → `AS has_w1w2`, plus a non-empty guard); prettier-only reformat via `eslint --fix` in `bilateral-projects.service.ts` (`.has(...)` on one line) and `clarisa-projects.repository.ts` (one line break). No SQL or logic change.
- Verification: free RAM 4.3 GB. Jest (same scoped command, `--maxWorkers=2`) → `Test Suites: 2 passed, 2 total · Tests: 51 passed, 51 total`. `npx eslint` on the 4 touched files `--quiet` → clean.
- Reviewer: **PASS** — the attempt-1 FAIL is fixed; the slice covers only the W1/W2 subquery; a status filter added to that probe is still caught (slice, `status_id` count 3 ≠ 2, `?` count 8 ≠ 7, bind array); the empty-slice guard prevents a vacuous pass. SQL, binds, constant, mapping and error routing unchanged and conformant.

- **Final SQL bind array for (2026, 7):** `[['Confirmed'], 'API', 7, 4, 'Result', 7, 2026]`.
- **Decisions:** the repository coerces `id` and `organization_code` with `Number()` (BIGINT may arrive as strings); `organizationCode` stays `null` when NULL. Error routing follows `contribution-to-indicator-result.repository.ts` (`.catch` → `throw returnErrorRepository(...)`).
- **Disqualifier (carried forward):** a presence assertion on SQL text only — no claim about count correctness. Parity is WPS-T-6. Note for WPS-T-6: `group_concat_max_len`.
- **Budget:** 2 review rounds (≤ 2 allowed). LOC ≈ +210 (prod ≈ 95, tests ≈ 115).
- **DoD:** specs green ✔; bilateral service diff only swaps the constant (+ prettier) ✔; no SQL text in error messages ✔.
- **Final verification:** PASS.

### WPS-T-2 — Service, controller, DTO and module wiring: `GET portfolio/bilateral-projects` — PASS (attempt 1)

- **Date:** 2026-10-16 · user instruction "continua hasta que termines" (run every task without the per-task gate; stop at the HITL task WPS-T-6).
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` (as listed). Effort: `high`.
- **Requirements covered:** WPS-R-1 S-1.1 (P4 once in totals), WPS-R-2 S-2.1 (P2 not counted), WPS-R-3 S-3.1 (invariants), WPS-R-4 S-4.1 (unmapped count), WPS-R-5 S-5.1, WPS-R-6 S-6.1 (CIAT alias, Unassigned, SO ≠ SMO, zero Centers absent), WPS-R-10 metadata. JD-1, JD-2.

**Attempt 1**
- Files (`onecgiar-pr-server/src/api/results-framework-reporting/`): `results-framework-reporting.service.ts` (`getPortfolioBilateralProjects`, private `resolveReportingVersion`, ctor deps `@InjectRepository(ClarisaCenter)` + `ClarisaProjectsRepository`), `results-framework-reporting.controller.ts` (`@Get('portfolio/bilateral-projects')`, `@Roles(ADMIN, APPLICATION)`, `@UseGuards(ValidRoleGuard)`, Swagger), `results-framework-reporting.module.ts` (provider `ClarisaProjectsRepository`), `dto/portfolio-bilateral-projects.dto.ts` (new), service + controller specs. No existing method changed; `getPortfolioTocCoverage` untouched.
- Verification: red `Test Suites: 2 failed` (compile, method missing). Green `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="results-framework-reporting\.(service|controller|module)\.spec"` → `Test Suites: 3 passed · Tests: 159 passed` (module spec added to the pattern to check the providers change). eslint `--quiet` on 6 files clean; `tsc --noEmit` clean for the folder.
- Reviewer: **PASS** — conforms to tasks.md § WPS-T-2, design §4.1 / §5 steps 1–6, WPS-DD-3/DD-4. Every falsifier traced to an assertion (P4 double-count → totals 5 ≠ 4; P9 routed → Unassigned row missing; SO→SMO → `CENTER-17` = 1 and `CENTER-16` undefined fail; P2 counted → totals/unmapped fail; IPSR id 404; closed id 200 with no `status` in `where`; newest fallback `order {phase_year DESC, id DESC}`; repo called with `(2026, 42)` from string id; `GUARDS_METADATA` = `[ValidRoleGuard]`, roles metadata; `'abc'`/`''`/`'0'`/`'-3'` → `undefined`). No circular import.
- Advisory (recorded, no rework):
  - RELIABILITY: red run was a compile failure; mutation coverage traced by reading, not observed.
  - RELIABILITY: `Version.phase_year` nullable → `Number(null)` = 0 → 200 with zeros instead of 404. Candidate follow-up.
  - READABILITY: only `dataSource.getRepository(Version)` in the service (chosen to avoid a `forFeature` change); a comment would prevent a refactor that breaks the spec mock.
  - READABILITY: design §9 says "No new logs" but the mandated #5 catch logs method name + driver `code` only; align §9 at archive.
  - RESILIENCE: `versionId='7.5'` passes coercion and ends as 404 (same as #5).
- **Decisions:** version lookup via `dataSource.getRepository(Version)` with TypeORM `where` (by id: `id`, `is_active`, `app_module_id = REPORTING`, no status; no id: open → else newest by `phase_year DESC, id DESC`; none → 404; `resolvedVersionId > 0`). Repository rows go straight into `resolveProjectOwnerCenter` (fields match `ProjectOwnerCenterInput`). P/A seed copies #5's query.
- **Concurrency note:** peer session onecgiar-pr-92 reported that onecgiar-pr-4a will fix #5's `getPortfolioTocCoverage` in the same service file (P2-3974 target-only rule). Told the peer the file is being edited here; #8 shows no KPI progress, so the rule does not apply to this spec.
- **Budget:** 1 review round. LOC ≈ +600 (cumulative ≈ 810).
- **DoD:** specs green ✔; Swagger + two-segment route ✔; `returnErrorRes`, no SQL/stack in body ✔.
- **Final verification:** PASS.

### WPS-T-3 — Client API method, interface, formatter and chart model — PASS (attempt 1)

- **Date:** 2026-10-16
- **Skills:** `angular-developer`, `tdd` (as listed). Effort: `medium`.
- **Requirements covered:** WPS-R-7 (P/A natural order; Center A→Z, Unassigned last), WPS-R-8 S-8.1 (maths, clamps, `null` at 0), WPS-R-4 S-4.1 (footnote text), WPS-DD-8 labels, JD-7 value labels.

**Attempt 1**
- Files (`onecgiar-pr-client/src/app/`): `shared/services/api/results-api.service.ts` (+ spec; `GET_PortfolioBilateralProjects(versionId?)`), `shared/interfaces/portfolio-bilateral-projects.interface.ts` (new), `pages/result-framework-reporting/pages/portfolio-overview/components/projects-block/projects.format.ts` + `projects.charts.ts` (new, + specs). `toc-kpi.format.ts` unchanged (`naturalCodeCompare` already exported; imported, not copied).
- Verification: RAM 6.4 GB. Red `Test Suites: 2 failed, 1 passed` (new modules missing). Green `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="projects\.(format|charts)\.spec|results-api\.service\.spec"` → `3 passed · 351 tests passed`. eslint `--quiet` on touched files: no errors.
- Implementer `Not Done / Assumptions`: API spec never observed red (method written before the first run) — adjudicated advisory by the Reviewer; copy labels passed in by the caller (copy group is WPS-T-4); `footnoteText` English in the formatter; `CLAUDE.md` deferred to WPS-T-5 (its own task); series distinguishability is WPS-T-6. None is scope owed by T-3.
- Reviewer: **PASS** — every falsifier asserted: `shareOfMapped` integer half-up `floor(count*1000/mapped + 0.5)` (29/30 '96.7', 1/1000 '0.1', 30/30 '100.0', 0/0 null, 17/30 '56.7', 1/30 '3.3', 9999/10000 → '99.9'); SP10 never before SP09; Center label precedence `labelFor` → institution acronym → code, A→Z, Unassigned last even at mapped 500; footnote singular/plural; 3 bar series, no `stack`, value labels on top, `ramp[0..2]` = `--pr-chart-1/2/3`; table total from `totals`; no hex. Interface matches the server DTO field for field.
- Advisory (recorded, no rework):
  - RELIABILITY: red runs were module-not-found, not behavioural.
  - READABILITY: design §6.2 puts `footnote(n)` and "Unassigned" in the `projects` copy group; today both live as English in `projects.format.ts`. **Forward pointer → WPS-T-4:** pass the copy values in and do not render the formatter's built-in strings.
  - READABILITY: series sets both `color` and `itemStyle.color` (harmless).
- **Budget:** 1 review round. LOC ≈ +360 (cumulative ≈ 1,170).
- **Final verification:** PASS.

### WPS-T-4 — Block `app-portfolio-projects-block` — PASS (attempt 1)

- **Date:** 2026-10-16
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` (as listed). Effort: `medium`.
- **Requirements covered:** WPS-R-8 (content, switches, total row from `totals`), WPS-R-7 (no sort control), WPS-R-9 + S-9.1 (one request per `versionId` / per Retry; no technical detail), WPS-R-5 (caption), WPS-R-4 (footnote only when > 0), NFR a11y semantics / design rules / copy.

**Attempt 1**
- Files: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/components/projects-block/projects-block.component.{ts,html,spec.ts}` (new; 19 tests), `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` (+30, additive `projects` group). `projects.format.ts` / `projects.charts.ts` unchanged.
- Forward pointer from WPS-T-3 honoured: `footnote(n)` and `unassigned` live in `copy.projects`; the block passes `copy.unassigned` to `toCenterRows` and renders `copy.footnote(n)`, never the formatter's built-in strings.
- Spartan tabs: markup copied from the typology block (DoD allows it); Spartan MCP not consulted.
- Verification: RAM 6.3 GB. Red `Test Suites: 1 failed` (component missing — proves nothing on its own; the gate rests on the falsifier assertions the Reviewer traced). Green `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage` over projects-block, projects format/charts, toc-kpi-block, typology-block, portfolio-overview.component specs → `6 passed · 112 tests`. First green attempt had 2 spec-only failures (row-label selector; a rem-class check reading Helm's own `text-sm`), fixed in the spec. eslint `--quiet` clean.
- Implementer `Not Done / Assumptions`: no layout/contrast claims (Disqualifier → WPS-T-6); subtitle/empty year from `response.phaseYear` (no `year` input); `echarts/*` mocked as in the Centers spec. **Forward pointer → WPS-T-5:** the block injects `CentersService` (HTTP on construction), so the page spec must provide or mock it.
- Reviewer: **PASS** — every falsifier traced to an assertion (one request per versionId, cancel/re-issue, one per Retry, double-click = one, none while ready, error shows only `copy.error`, empty state without tiles/chart, caption only in P/A, footnote absent at 0, total row 2 vs column sum 3, no `—%`/`NaN` at 0). Center labels `acronym || name || code` as in `centers-block.component.ts:216`, catalogue failure falls back to institution acronym → code, late catalogue re-sorts. No hex, px type, `font-mono tabular-nums` right-aligned, no brand button, `role="status"` on error/empty.
- Advisory (recorded, no rework):
  - RELIABILITY: red run was component-missing, not behavioural.
  - SPEC TENSION: empty state with unmapped > 0 shows two lines (empty + footnote); WPS-R-9 Empty row says "one line", WPS-R-4 requires the footnote; Implementer followed R-4; still within rule 5's 160px. Candidate spec clarification at archive.
  - RELIABILITY: a null `phaseYear` would read "for  yet." (contract guarantees a year).
  - READABILITY: view buttons merge static `class`, template `[class]` and `hlmBtn` host `[class]`.
  - Rule 5 ghost button: design §6.3 specifies an empty line only; read-only block has no action — consistent with spec.
- **Budget tripwire:** cumulative LOC ≈ 1,840 (T-4 ≈ +670, of which the spec ≈ 400) > the ≈ 1,500 escalation line in design §14. Escalated to the user before WPS-T-5; review rounds stay within ≤ 2 per task.
- **Final verification:** PASS.

### WPS-T-5 — Page integration, copy check and folder docs — PASS (attempt 1)

- **Date:** 2026-10-16 · user approved continuing past the budget line ("continua").
- **Skills:** `angular-developer` (as listed). Effort: `medium`.
- **Requirements covered:** WPS-OQ-5 / proposal MODIFIED (block last, after Centers), WPS-R-9 S-9.1 independent path (structural; see advisory), NFR folder docs.

**Attempt 1**
- Files (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/`): `portfolio-overview.component.html` (`<app-portfolio-projects-block [versionId]="data.versionId()" />` after Centers, inside `@if (!data.loading())`, outside `hasFigures()`, no skeleton slot), `portfolio-overview.component.ts` (import), `portfolio-overview.component.spec.ts` (describe "W3/Bilateral projects slot", 3 tests; `CentersService` mocked via `projectsProviders()` in every TestBed — forward pointer from WPS-T-4 honoured), `CLAUDE.md` (new section, "What this owns" + Contract bullet + Centers "rendered last" line updated, `Verified:` re-stamped 2026-10-16; 119 → 112 lines by rewrapping, no content removed).
- Verification: RAM 5.72 GB. Red (spec before mount) `Tests: 2 failed, 259 passed` (DOM order; present when loaded without figures). Green `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="portfolio-overview/"` → `Test Suites: 13 passed · Tests: 261 passed`. eslint `--quiet` clean.
- Implementer `Not Done / Assumptions`: `ResultsApiService` not mocked (mocking it broke 38 ToC KPI tests); the projects request is observed through `HttpTestingController`.
- Reviewer: **PASS** — mount position, gate, import, no skeleton slot, CLAUDE.md section and re-stamp all conform; each of the 4 falsifiers has a failing assertion (removing the loading gate makes the "absent while loading" DOM assertion fail); red run was behavioural; isolation holds (`provideHttpClientTesting`).
- Advisory (recorded, no rework):
  - RELIABILITY: no page-level test for S-9.1 "other sections render normally when the block errors" (in Implements, not a falsifier). Candidate test: flush `bilateral-projects` with an error, assert typology/Centers still present.
  - READABILITY: `httpMock.match(...).length === 0` while loading proves little (`versionId` null); consider `httpMock.verify()` in `afterEach`.
  - READABILITY: rewrapped Centers bullets run ~300 chars/line; trim wording instead next time. `Verified:` stays at the top (pre-existing placement vs COMPONENT-DOCS.md §4).
- **Budget:** cumulative LOC ≈ 2,000 (> ≈ 1,500 line; user approved). Review rounds: T-1 2, T-2..T-5 1 each.
- **Final verification:** PASS.

### WPS-T-6 — HITL live checks — PARTIAL (`[~]`: non-admin 403 pending, user-run)

- **Date:** 2026-10-16. Local stack: client :4200, server :3400 (live). Review: skip-eligible (evidence task).
- **DB / version guard (#5 trap):** the user ran the parity SQL on the DB the local server uses, with `@v = 36`, `@y = 2026`; the endpoint resolved `versionId 36`, `phaseName "Reporting 2026"`, `phaseYear 2026` — same version and year. Served bundle not stale: the block's live instance was read through `window.ng.getComponent(app-portfolio-projects-block)`.

**1. Parity (independent SQL pasted in chat vs endpoint)**

| Figure | SQL | Endpoint |
|---|---|---|
| Totals mapped / with-W3 / W1/W2 | 911 / 95 / 8 | 911 / 95 / 8 |
| Unmapped with W3 | 0 | 0 |
| SP01 | 239 / 28 / 3 | 239 / 28 / 3 |
| SP04 | 107 / 15 / 0 | 107 / 15 / 0 |
| All 14 Centers (CENTER-01,02,03,05,06,07,09,10,11,12,13,14,15,17) | e.g. CENTER-03 145 / 13 / 0, CENTER-17 2 / 0 / 0 | identical for every row |
| Unassigned | absent | absent |

- CIAT alias exercised: CENTER-03 has 145 projects, all `via_alias` (NULL org + `'CIAT'`) → label "CIAT (Alliance)". Disqualifier "no CIAT project in sample" not triggered.
- WPS-P-4 inactive projects in phase 2026: **0**. WPS-P-11 org-set-but-unmatched: **0** for every Center. No known divergence to record.
- WPS-P-12: `results_by_projects` has BTREE indexes on `project_id` (FK_e00b1f…) and `result_id` (FK_3abb7…). Premise verified.
- Σ Centers mapped = 911 = total; Σ P/A mapped (all 14 seed codes incl. SGP-02 = 0) > 911 as designed (multi-P/A).

**2. Auth**
- Admin session: 200 with body. No `auth` header: **401** (JWT middleware applies; route not exempt).
- Non-admin session → 403: **pending (user-run)** — needs a non-admin login; the agent does not type passwords.

**3. Timing** (3 calls from the page context, admin session, `versionId=36`): 978 / 979 / 970 ms → p95 ≈ 0.98 s ≤ 3 s. Spread 9 ms (< 1 s disqualifier).

**4. Browser** (viewport via same-origin iframes at exact widths; the Chrome window would not shrink below the screen size)
- Placement: block follows `app-portfolio-centers-block` and is the last section.
- 375: document scrollWidth 362 ≤ 375 → no horizontal page scroll; the table (420 px) scrolls inside its `overflow-x-auto` wrapper (249 px). 768 / 1280: no overflow, no inner scroll.
- Series colours `#4a2bb8` / `#6b46e5` / `#9270f0` vs white surface: 9.02 / 5.78 / 3.62 : 1 → all ≥ 3:1. Pairwise between series: 1.56 / 1.60 / 2.49 : 1. Each bar carries a value label on top (JD-7). **Borderline on distinguishability** of series 1 vs 2 (adjacent violets); design §6.3 gives the remedy (swap the W1/W2 series to a non-violet chart token). Raised to the user, not changed.
- Keyboard: Tab reaches the By P/A tab with a visible focus ring (`:focus-visible`, outline + ring); ArrowRight moves to By Center and switches the dimension; Tab reaches the Chart button (3 px `--pr` ring); Tab + Enter activates Table (`aria-pressed="true"`), total row "Total 911 95 8" from `totals`.
- Center labels: AfricaRice, Bioversity (Alliance), CIAT (Alliance), CIMMYT, CIP, ICARDA, ICRISAT, IFPRI, IITA, ILRI, IRRI, IWMI, SO, WorldFish — from `CentersService` catalogue (same source as the Centers block), A→Z.
- No write button clicked (only the block's own view switch and tabs).

- **DoD:** every check recorded with numbers or marked pending ✔; no parity difference ✔; no write click ✔. Open: non-admin 403 (user-run); decision on series 1/2 colour.

## Pivot Record: WPS-T-6 (chart series colours)

- **Date:** 2026-10-16. **Trigger:** WPS-T-6 browser check — series 1 (`#4a2bb8`, Mapped) vs series 2 (`#6b46e5`, With W3) only 1.56:1 apart; borderline distinguishability.
- **Blocker:** design §6.3's remedy ("swap the W1/W2 series to a non-violet chart token already defined in `colors.scss`") is unviable: `colors.scss` defines only `--pr-chart-1..4` (violet) + `--pr-chart-2-muted`, and forbids status colours in charts. The remedy also targeted the wrong series (the close pair is Mapped vs With W3).
- **Alternatives offered:** A1 reorder existing violets + stripe decal on one series (no new token); A2 add a non-violet chart token (design-system change, needs design owner); B leave as is (value labels identify series).
- **Decision (user, 2026-10-16):** **A1.** Mapped → `--pr-chart-1` (#4a2bb8), With W3 → `--pr-chart-3` (#9270f0, 2.49:1 vs Mapped, 3.62:1 on white), W1/W2 → `--pr-chart-2` (#6b46e5) with a diagonal-stripe decal. No ADR affected.
- **Spec amended:** `design.md` §6.3 Chart bullet (old remedy struck through, amendment dated); `tasks.md` WPS-T-3 description note. Correction closure sweep: grep `chart-1|chart-2|chart-3|non-violet|--pr-chart` over the spec folder — only those two sites carried the old rule.
- **Execution:** delegated as a WPS-T-3 follow-up (`projects.charts.ts` + spec) through Implementer → Reviewer, then re-verified in the browser.

### WPS-T-3 follow-up (Pivot Record WPS-T-6, option A1) — PASS (attempt 1)

- **Date:** 2026-10-16. Skills `angular-developer`, `tdd`; effort `medium`.
- Files: `…/projects-block/projects.charts.ts` + `projects.charts.spec.ts`. Series order unchanged (Mapped, With W3, W1/W2); colours `ramp[0]` / `ramp[2]` / `ramp[1]`; W1/W2 only gets `itemStyle.decal` `{ symbol: 'rect', rotation: π/4, dashArrayX: [1,0], dashArrayY: [3,4] }`, decal colour left to the ECharts default (no hex, no new token).
- Verification: RAM 6.66 GB. Red `Tests: 2 failed, 24 passed` (spec first; colour + decal assertions). Green `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="projects\.charts\.spec|projects-block\.component\.spec"` → `2 passed · 26 tests`. eslint clean.
- Reviewer: **PASS** — mapping matches amended design §6.3; decal fields exist in ECharts 6.1.0 `DecalObject`; decal only on series 2; 3 series, no `stack`, labels on top; no hex.
- Browser (live bundle confirmed via `window.ng`: colours `#4a2bb8` / `#9270f0` / `#6b46e5`, decal on series 3 only): stripes render on the W1/W2 bars and on the legend swatch; Mapped vs With W3 now 2.49:1 apart, each ≥ 3:1 on white (9.02 / 3.62 / 5.78). Distinguishability check: **PASS**.

### WPS-T-6 — closure (2026-10-16)

- **Non-admin check (user-run):** the user tested with a non-admin session and reported that the Portfolio Overview (and thus the block) does not appear for non-admin users ("ya probé"). The agent did not observe this itself. The server path was observed independently: no `auth` header → 401; the route carries `@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard` (WPS-T-2 metadata spec). A direct 403 body from a non-admin token was not captured: recorded as **user-reported**, not agent-measured.
- **Distinguishability:** PASS after the Pivot A1 follow-up (see above).
- **Final status:** all WPS-T-6 checks recorded; no parity divergence; no write button clicked. **PASS** (evidence task, review skip-eligible).

## Summary

All six tasks complete on 2026-10-16. Server: one repository query (`getPortfolioProjectFacts`), one admin endpoint `GET results-framework-reporting/portfolio/bilateral-projects`. Client: formatter + charts, `app-portfolio-projects-block`, mounted last on `/portfolio-overview`. Live parity on version 36 / 2026: 911 / 95 / 8, every P/A and Center identical to an independent SQL; p95 ≈ 0.98 s. One pivot (chart colours, option A1). Budget: ≈ 2,000 LOC vs ≈ 1,100 estimate (user approved past the ≈ 1,500 line); review rounds ≤ 2 per task.
