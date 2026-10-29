# Execution Log — ToC KPI block: disclose KPIs with no target

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure/` |
| **Approval Mode** | gated |
| **Branch** | `qa-development-2026-ss` |
| **Started** | 2026-10-22 |
| **Budget** | 3 tasks · ≈ 260 LOC · ≤ 2 review rounds per code task |

## Task Execution History

### TND-T-1 — Server: `noTarget` in query, service and DTO — PASS

- **Date:** 2026-10-22
- **Attempts:** 1 (Implementer `akili-implementer`, effort high · Reviewer `akili-reviewer`, effort high)
- **Skills assigned:** `nestjs-expert`, `api-design-principles`, `tdd` (as listed in tasks.md)
- **Environment note:** free RAM 3.8 GB (< 4 GB), so Jest ran with `--runInBand` instead of `--maxWorkers=2` (machine rule 1).

#### Attempt 1

- **Files changed (+/-):**
  - `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (+13/-3)
  - `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts` (+42/-13)
  - `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts` (+14/-11)
  - `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.spec.ts` (+65/-10)
  - `onecgiar-pr-server/src/api/results-framework-reporting/dto/portfolio-toc-coverage.dto.ts` (+9/-1)
- **Red run:**
  - Service spec: 3 failed on the `noTarget` expectations (`Expected -3 / Received +0`).
  - Repository spec: the first run failed to compile (TS2339 `noTarget`). After the interface field and the mapping were added, with the old SQL, 3 of 10 failed (distinct counts, covered BOTH, LEFT JOIN).
- **Must-fail proofs:**
  1. Removing `tgt.indicator_id IS NOT NULL AND` from `covered`: 1 failed (the covered BOTH / S-1.3 case).
  2. Changing `LEFT JOIN (` back to `JOIN (`: 1 failed (the LEFT JOIN case).
  - Both edits were restored byte-identical (checked with `cmp`).
- **Green run:** `npx jest --silent --reporters=summary --forceExit --runInBand --testPathPattern="aow-bilateral.repository|results-framework-reporting.service"` → Test Suites 3 passed, Tests 219 passed.
- **ESLint:** `npx eslint <5 files> --quiet` → exit 0, no output.
- **Reviewer verdict:** **PASS**. The diff meets TND-R-1 (S-1.1 to S-1.5), TND-NFR-3 and design §6, §7.1, §7.2, DD-1 and DD-2. The params array, `debug: false` and the target subquery are unchanged. The rewritten repository assertions are required by §7.1/DD-2. The S-1.5 "unchanged" clause covers service cases only, and those only gained `noTarget` expectations.

#### ADVISORY (4R, non-gating)

- **Reliability:** the mapping case went red only as a TS2339 compile error, not as a behavioral failure. Next time, a red run with the interface field present and the mapping line missing would be a stronger proof.
- **Risk:** the SQL-text cases prove only the shape of the query. Real counts and the p95 cost of the LEFT JOIN depend on TND-T-3 (parity + NFR-1).

#### Decisions

- The service reads `row.noTarget` with no `?? 0`, because the repository always sets the field. The `?? 0` fallback (DD-3) applies on the client only.
- Three existing repository-spec assertions (`COUNT(DISTINCT tri.id) AS total`, the bare covered condition, the inner `JOIN`) were rewritten, because they asserted the SQL that §7.1/DD-2 replace.

#### Requirements covered

TND-R-1 S-1.1, S-1.2, S-1.3 (SQL shape + service equality), S-1.4, S-1.5. TND-NFR-3.

#### Final verification

Green (219/219) and eslint clean. Not committed: the user commits.

### TND-T-2 — Client: format helpers, copy and block lines — PASS

- **Date:** 2026-10-22
- **Attempts:** 1 (Implementer `akili-implementer`, effort medium · Reviewer `akili-reviewer`, effort high)
- **Skills assigned:** `angular-developer`, `tailwind-design-system`, `tdd` (as listed; `spartan` not needed, plain text only)
- **Mode:** the user asked on 2026-10-22 to continue through all tasks without pausing between them, with progress updates.

#### Attempt 1

- **Files changed (7 files, +179/-10):**
  - `onecgiar-pr-client/src/app/shared/interfaces/portfolio-toc-coverage.interface.ts`: `CoverageCount.noTarget?` (optional, DD-3)
  - `…/portfolio-overview/components/toc-kpi-block/toc-kpi.format.ts` + `.spec.ts`: `toViewRows` / `toSummary` read `noTarget ?? 0`, and `sumRows` adds it up
  - `…/toc-kpi-block/toc-kpi-block.component.ts`, `.html`, `.spec.ts`: computed `visibleNoTarget`, the row and summary disclosure lines, the `noTargetOnly` / `noKpis` zero row, and `emptyNoTarget` / `empty` in the empty state
  - `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts`: subtitle, `excludesNoTarget`, `noTargetOnly`, `emptyNoTarget`
- **Red:** `--testPathPattern="toc-kpi"` → 19 failed / 48 passed / 67. After the implementation, 5 failures came from a test-helper misuse. They were fixed in the tests only.
- **Must-fail proofs** (both restored byte-identical with `cmp`):
  1. `@if (row.noTarget >= 0)` → 2 failed (S-2.2, and the older-server no-NaN case).
  2. `noTarget` dropped from `sumRows` → 3 failed (S-2.3 ×2, and the existing sums case).
- **Green:**
  - `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="toc-kpi"` → 2 suites / 67 tests passed.
  - `--testPathPattern="portfolio-overview"` → 18 suites / 456 tests passed.
- **`--findRelatedTests`** (7 changed files):
  - The Implementer's run had 442 suites: 441 passed, 1 failed, and the failing suite was not captured.
  - The Leader re-ran it with `--json`. The failing suite is `src/app/shared/components/global-completeness-status/global-completeness-status.component.spec.ts`, test "Submitter label (PF2-R-2, M2) › typing the program name in the real search input keeps only the matching row". The assertion comes from a `setTimeout` at spec line 92 (`mapMyInitiativesList()` → `[]`).
  - Run alone, that suite gives 19 / 19 passed. It does not import any changed file directly, and the Reviewer confirmed that the diff adds no timers or zone code.
  - **Leader adjudication:** this is a pre-existing timing flake (a leaked `setTimeout` under load) that the diff did not cause. It does not block T-2. It is recorded as a follow-up outside this spec.
- **ESLint:** 6 touched files clean (`ESLINT_USE_FLAT_CONFIG=false` is needed, because the client still uses `.eslintrc.json`).
- **Reviewer verdict:** **PASS**.
  - Every copy string matches design §8.3 and the requirements character for character (including the `·`).
  - All 4 template spots in §8.2 are wired. No new tokens, no `role` or `tabindex` (NFR-4), and `isEmpty` is unchanged.
  - DD-3 and DD-5 hold. The mutation traces are behavioral.
  - The LF endings in the component spec are not a defect (`.prettierrc` `endOfLine: auto`, no `.gitattributes`).

#### ADVISORY (4R, non-gating)

- **Risk (NFR-2, T-3):** the zero-row text `noTargetOnly(n)` is about twice as long as `noKpis` and sits in the `sm:col-span-2 sm:text-right` cell. The T-3 browser check should include a `total=0, noTarget>0` row.
- **Readability:** `sumRows` returns `CoverageCount`, so the reducer needs `(acc.noTarget ?? 0)`. `Required<CoverageCount>` would remove that fallback. Cosmetic.
- **Reliability:** with no Program filter, the empty state sums `noTarget` over the rows, while the summary uses the server's `portfolio.noTarget`. They agree whenever S-1.4 holds. The T-3 parity check should compare both.

#### Decisions

- `noTarget` is optional on the shared interface (DD-3, older server) and required on the view types after `?? 0`.
- The row disclosure appears only in the `percent !== null` branch. `total=0` rows use `noTargetOnly` (S-3.1).

#### Requirements covered

TND-R-2 (S-2.1 to S-2.4), TND-R-3 (S-3.1 to S-3.3), TND-R-4 (S-4.1), TND-NFR-4.

#### Follow-up (outside this spec)

- `global-completeness-status.component.spec.ts` line 92: an assertion inside a `setTimeout` leaks into later tests under load. It should use `fakeAsync`/`tick` or `await`.

### TND-T-3 — Verification: real-data parity, performance, layout (HITL) — DONE (performance pending PRTest deploy)

- **Date:** 2026-10-22
- **Executed by:** the Leader with the user (HITL). No Implementer or Reviewer: this task is verification only and changes no code.

#### Step 1: Parity

- **Data source:** the user ran the read-only query on prdb, the same database the local server reads. The query rebuilds the count independently, with `EXISTS` on targets and no coverage join. The query is in the chat and not saved to any file.
- **Context:**
  - Query: `year=2026`, `phase=7baf200a-c958-4ded-9894-6557a94cae18`.
  - Endpoint: local `GET …/toc-results/portfolio-coverage?versionId=36`, with the new code.
  - The bundle served on `localhost:4200` was confirmed as the new one: the subtitle reads "…out of the KPIs with a target…".

| Program · category | Query in_scope / with target / no target | Endpoint total / noTarget | Match |
|---|---|---|---|
| SP05 · OUTPUT | 169 / 141 / 28 | 141 / 28 | ✅ |
| SP05 · OUTCOME | 27 / 16 / 11 | 16 / 11 | ✅ |
| SP05 program | — | 157 / 39 | ✅ |
| SP12 · OUTPUT | 161 / 161 / 0 | 161 / 0 | ✅ |
| SP12 · OUTCOME | 10 / 9 / 1 | 9 / 1 | ✅ |
| SP12 program | — | 170 / 1 | ✅ |

- `in_scope = total + noTarget` holds in all 4 groups (S-1.3, "AND IT MUST").
- `covered` from the endpoint: SP05 = 1, SP12 = 1. The pre-change baseline was not captured live. `total` matches the old definition (targets > 0 for the year, inner join), and the service-equality case in T-1 covers `covered`.
- Portfolio: `total=2452`, `covered=24`, `noTarget=137`. The summary line shows "excludes 137 KPIs with no target set", the same number as the server's `portfolio.noTarget`. This is the Reliability advisory from T-2, and the two numbers agree.
- No program has `total=0` with `noTarget>0`. **S-3.1 is checked only by the T-2 DOM spec** (the disqualifier rule in tasks.md).

- **Full-portfolio parity (2026-10-22, the user's request):**
  - The user re-ran the query with no code filter, as a variable-free version (the first run returned nothing because only the `SELECT` was executed and `@year`/`@phase` were NULL).
  - It returned 23 rows, all for `year=2026` and `phase=7baf200a…`, and only codes SP01 to SP13.
  - Per code, OUTPUT + OUTCOME match the endpoint exactly:

    | SP01 | SP02 | SP03 | SP04 | SP05 | SP06 | SP07 | SP08 | SP09 | SP10 | SP11 | SP12 | SP13 |
    |---|---|---|---|---|---|---|---|---|---|---|---|---|
    | 360 / 43 | 137 / 2 | 244 / 4 | 436 / 36 | 157 / 39 | 108 / 7 | 151 / 0 | 174 / 0 | 267 / 1 | 156 / 0 | 19 / 2 | 170 / 1 | 73 / 2 |

    (total / noTarget)
  - The sums are 2452 for total and 137 for noTarget, matching the endpoint's `portfolio`. In scope = 2589 = 2452 + 137.
  - **No Accelerator code has ToC rows in this phase,** so every Accelerator is 0 / 0 in the endpoint (`noKpis`).
  - The task's sample "SP05 + one Accelerator" therefore could not test an Accelerator with data.
  - Correction: SP12, used as the second sample, is a Science Program (Digital Transformation), not an Accelerator.
  - The full-portfolio comparison replaces the 2-program sample.

#### Step 2: Layout

- **1280 (the actual viewport was 2560, because the window is maximized):**
  - The summary line and the 10 row lines render under the split line in the left column.
  - The figures and the bar stay in their columns, and there is no horizontal overflow.
  - The disclosure has no `role` and no `tabindex`.
  - Singular and plural are correct ("excludes 1 KPI…" for SP09 and SP12).
- **768 / 375 (emulated by the agent, 2026-10-22):**
  - Method: the window is maximized and popups are blocked, so the agent emulated each width in a separate tab:
    - It switched the page's `min-width` / `width >=` media rules to the target viewport.
    - It fixed the block's width to `viewport / html zoom (1.15) − 32 px gutter`.
    - This is an approximation of a real device, not the device itself.
  - **768:** no horizontal scroll, no element past the right edge, no disclosure overflow, and no disclosure or figure wraps.
  - **375:**
    - No horizontal scroll and no element past the right edge.
    - The disclosure lines do not overflow or wrap, and the row figures stay on one line.
    - **The summary header figure `24 / 2452` wraps onto 2 lines (up to about 430 px). This is pre-existing and not caused by this change:**
      - The height is the same with the disclosure lines hidden (48 px both ways).
      - The header markup (`items-baseline justify-end … font-mono`) is not in the T-2 diff. It was last touched by 6cfde7ed8 (global-filters).
    - Recorded as a follow-up outside this spec.
  - Screenshots:
    - 1280: `screenshot-1792688506400-6.jpg`
    - 768: `screenshot-1792690565694-8.jpg`
    - 375: `screenshot-1792690657832-9.png`
    - All in `%TEMP%/claude-chrome-screenshots-5iZZIS/`.
- No write action was clicked. The temporary overlay and the emulation tab were removed or closed.

#### Step 3: Performance

- Local reference only, not the gate: 3 calls took 757, 758 and 771 ms against prdb. The spread is 14 ms.
- The gate (p95 ≤ 1700 ms) runs on PRTest after the deploy. **Pending.**

#### Acceptance

- 2026-10-22: the user accepted the parity (full portfolio) and the layout at all three widths. The user's words: "Acepto".
- Performance (step 3) is **pending**. The user will run it on PRTest after the deploy. The task's Done list allows "marked pending until the PRTest deploy".

#### Follow-ups (outside this spec)

- The summary header figure `24 / 2452` wraps at ≤ about 430 px. This is pre-existing (global-filters markup).
- The `global-completeness-status.component.spec.ts` flake (from T-2).

## Summary

- All 3 tasks are closed. T-1 and T-2 passed Reviewer on the first attempt. T-3 is accepted by the user, with performance pending the PRTest deploy.
- Budget: 3 tasks, as estimated. LOC is about 330 (server ≈ 140, client ≈ 190) against an estimate of about 260, so ≈ 1.3×, mostly in specs. There was 1 review round per code task, within the ≤ 2 budget. The tripwire was not crossed.
- Commits: T-1 server, then T-2 client, then the spec docs. All are on `qa-development-2026-ss`.
