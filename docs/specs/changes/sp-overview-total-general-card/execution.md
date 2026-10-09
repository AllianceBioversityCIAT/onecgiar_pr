# Execution — SP Overview "Total General" card

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/sp-overview-total-general-card/` |
| Approval Mode | gated |
| Budget | 3 tasks · ~140 LOC · 1 review round |
| Started | 2026-10-08 |
| Branch | `qa-development-2026-ss` |

## Task Execution History

### T-1 — Host computed `overviewTotalBreakdown`

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-10-08 |
| Attempts | 1 |
| Effort | medium |
| Skills | `angular-developer`, `tdd` (per tasks.md, no deviation) |
| Requirements | STG-R-2, STG-R-4 (S-4.1, S-4.2), STG-NFR-1 |
| LOC | ~85 (+20 prod, +62 spec) |

**Attempt 1 — files changed** (under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/`):
- `dashboard-lab.component.ts`: imports `OverviewTotalBreakdown`. Adds the `overviewTotalBreakdown` computed: replicated and new come from `latestVersion(selected())` (`?? 0`), and pendingReview counts unscoped `bilateralRows()` where `resolveBilateralStatusId === 5`.
- `dashboard-lab.component.html`: adds `[totalBreakdown]="overviewTotalBreakdown()"` next to `[statusSegments]`.
- `components/program-overview/program-overview.component.ts`: exports `OverviewTotalBreakdown` and adds the minimal `totalBreakdown` input (default zeros) so the binding compiles.
- `dashboard-lab.component.spec.ts`: 4 tests that drive the computed's sources (versions, `bilateralRowsByKey`, `overviewScope`, `cacheMeterOverlay`, `selectedVersionId`).

**Verification (Implementer):**
- `npx jest --testPathPattern=dashboard-lab.component.spec --maxWorkers=2 --silent --reporters=summary --no-coverage`: 1 suite, 79 passed (4 new).
- `--testPathPattern=program-overview.component.spec`: 1 suite, 63 passed.
- ESLint on the 3 touched `.ts` files: clean. It needs `ESLINT_USE_FLAT_CONFIG=false` because the client has only a legacy `.eslintrc.json`.
- `git diff | grep -c "api\."`: 0, so no new request (NFR-1).

**Reviewer verdict:** PASS. The computed matches design §8 Host and DD-2 (it reads neither `overviewScope` nor `scopedBilateralRows`). Both tasks.md fail inputs (scoped rows; `=== 5` on string status) would turn the tests red. The disqualifier is not hit. Pre-adding the input is accepted as within T-1's own files.

**ADVISORY (non-gating):**
- RELIABILITY: `ng build` was not run. Jest JIT does not strictly type-check templates (client `src/CLAUDE.md` §21.7). Run `npm run build` in T-2 or T-3 before the HITL pause.
- READABILITY: the T-2 scope still says "add `totalBreakdown` input". It already exists, so the T-2 brief must say not to redeclare it.
- PROCESS: red-first was not observed (tests were written after the code). The Reviewer's mutation reasoning confirms the tests would fail under the documented wrong implementations.

**Decisions:** the minimal child input was moved from T-2 to T-1 because the host binding can't compile without it. T-2 still owns `programResultsTotal` and the markup.

**Forward pointers → T-2:** do not redeclare `totalBreakdown`. Run `npm run build` (or leave it to T-3) to type-check the template binding.

### T-2 — Card markup + child input

**Attempt 1 — FAIL** (effort medium, skills `angular-developer`, `tailwind-design-system`, `spartan`)
- Files: `program-overview.component.{ts,html,spec.ts}`. `programResultsTotal` was re-pointed to replicated + new. KPI 1 got a divider, 3 rows and a 3rd skeleton bar, and the W3 line was removed. 5 new specs were added, `:885` was updated to `0`, and the `:899` selector now excludes `-breakdown` ids.
- Verify: `program-overview` Jest gave 4 suites, 266 passed. `dashboard-lab.component.spec` gave 79 passed. ESLint is clean. `ng build` was **skipped** because free RAM was ~2.4 GB, under the 4 GB rule, so it is deferred to T-3.
- Reviewer: **FAIL**.
  1. **Discovered Issue:** the test 'programResultsTotal = replicated + new from the input; bilateral segments do not change it' (spec:1070-1075) sets `bilateralCategories`, which does not feed the headline formula. `bilateralStatusTotal()` sums `bilateralStatusSegments()` (ts:720-722), and no test gives `bilateralStatusSegments` a non-zero count. A `replicated + new + bilateralStatusTotal()` formula would therefore pass every T-2 test.
     **Violated Rule:** tasks.md:74 and the :82 Fail input; requirements.md STG-S-2.1; reviewer contract §3.
     **Remediation:** set `bilateralStatusSegments` (count 9) instead, assert `bilateralStatusTotal()` = 9, then assert `programResultsTotal()` = 69 and the rendered `.pr-figure` = '69'. Mutation-check by adding `+ this.bilateralStatusTotal()` temporarily, seeing the test go red, then reverting.
  - Q2 (S-5.1 bilateral loading): already covered by the existing `meterLoading || bilateralLoading` OR (ts:676). Not a gate.
  - Q3 (`:899` selector): acceptable, not masking.
  - ADVISORY: add a `bilateralLoading: true` sibling skeleton test. The `chip()` helper depends on span position, so prefer a `.font-mono` selector.

**Attempt 2 — PASS** (effort high; the Implementer was resumed with the attempt-1 Reviewer report verbatim)
- Files: `program-overview.component.spec.ts` only.
  - The headline test now sets `bilateralStatusSegments` (count 9) and asserts `bilateralStatusTotal()` = 9 before checking that `programResultsTotal()` and the rendered `.pr-figure` = 69.
  - `chip()` now selects `.font-mono`.
  - Added a skeleton test for bilateral-only loading (both advisories applied).
- Mutation check: line 674 with `+ this.bilateralStatusTotal()` gave `Expected: 69 Received: 78`, 1 failed / 68 passed. Reverted afterwards (the Leader confirmed line 674 is `replicated + new`).
- Verify: `npx jest --testPathPattern=program-overview --maxWorkers=2 --silent --reporters=summary --no-coverage` gave 4 suites, 267 passed. ESLint on the spec is clean.
- Reviewer: **PASS**. The attempt-1 issue is closed: the Fail input from tasks.md:82 is now caught, and the rest of the diff was already audited clean in attempt 1.
- ADVISORY: RISK — `ng build` is still deferred, and T-3 MUST run it before closing. A failure there points at the T-2 template.

**Requirements covered:** STG-R-1 (S-1.1, S-1.2), R-2 (unit), R-3 (S-3.1), R-4 (tooltip), R-5 (S-5.1, S-5.2), NFR-2/3/4 (classes only; the layout effect is owned by T-3).
**Decisions:** the `:899` "5 KPI card buttons" selector now excludes `-breakdown` ids, because the mandated test ids share the `overview-kpi-` prefix. The Reviewer judged this not masking. `statusTotal`/`bilateralStatusTotal` were kept because they are still used by KPI 2/3 and the specs.
**Forward pointers → T-3:** run `npm run build` in the client (check free RAM ≥ 4 GB first, and never alongside Jest). Template type-checking is unproven until it does.

## Budget Tripwire (after T-2)

| Metric | Budget | Actual so far | Cause |
|---|---|---|---|
| Review rounds | 1 | T-1: 1 · T-2: 2 | T-2 attempt 1 had a test that could not detect its own Fail input |
| LOC (incl. tests + doc) | ~140 | ~190 (T-1 + T-2, before the T-3 doc) | Spec assertions are more explicit than estimated (labels, tooltips, order, mutation-proof precondition, extra loading test) |

Escalated to the user at the T-2 gate (gated mode pauses there anyway).

### T-3 — Folder doc + live verification (HITL)

**Attempt 1 — FAIL** (effort medium, skill `claude-in-chrome`)
- Docs:
  - `program-overview/CLAUDE.md`: `Verified:` re-stamped 2026-10-08, plus a `totalBreakdown` Data flow row and a "Total General (KPI 1)" note.
  - `dashboard-lab/CLAUDE.md`: new "Añadido 2026-10-08" line.
- `ng build`: **not run** (free RAM 2.9 GB, under 4 GB). The dev server compiled and served the new template.
- Live check (localhost:4200, SP01 overview, read-only; the only click was the AOW02 filter hero row):
  - Freshness: `ng.getComponent` has `totalBreakdown` = {8,160,33} and `programResultsTotal()` = 168, and the test ids are in the DOM. Fresh bundle.
  - Check 1 PASS: unscoped KPI 1 = 168 = KPI 2. Rows are 8/160/33, the old sub-line is gone, and KPI 3 = 156.
  - Check 2 PASS: the chip shows 33, matching "Pending Review 33 (21%)" on the W3/Bilateral Reporting Status card.
  - Check 3 PASS: with `?scope=AOW02`, KPI 2 went 168→6 and KPI 3 went 156→1 while KPI 1 stayed 168/8/160/33. The scope was reset afterwards.
  - Check 4 partial: at a 298px card, the third label truncates and the chips stay on one line (screenshot in a temp dir). Forcing ~360px failed. The center-card comparison was not done because `/bilateral` redirected.
  - Console: no NG0 or error messages on 2 reloads; the first load was not captured.
- Reviewer: **FAIL**.
  1. **Discovered Issue:** `dashboard-lab/CLAUDE.md` line 3 `**Verified:**` still reads 2026-10-02 / ACS-T-4, although T-1 changed `dashboard-lab.component.ts` and T-3 added content to that doc.
     **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §10 (Folder docs: re-stamp `Verified:` in the same commit), `src/CLAUDE.md` §22, and T-3 Done.
     **Remediation:** re-stamp line 3 as `**Verified:** 2026-10-08 · qa-development-2026-ss · changes/sp-overview-total-general-card (adds overviewTotalBreakdown — see "Añadido 2026-10-08") · prior: 2026-10-02 · …`, keeping the existing chain after it.
  - The doc text was verified accurate against `dashboard-lab.component.ts:2106-2113` and `program-overview.component.ts:674`. Checks 1–3 and the disqualifier are valid evidence.

**Attempt 2 — Reviewer PASS** (effort medium)
- File: `dashboard-lab/CLAUDE.md` line 3, `Verified:` re-stamped to `2026-10-08 · qa-development-2026-ss · changes/sp-overview-total-general-card (adds overviewTotalBreakdown — see "Añadido 2026-10-08") · prior: 2026-10-02 · …`. The prior chain was kept intact (the Reviewer read it on disk).
- Reviewer: **PASS**. Both folder docs are re-stamped per client CLAUDE.md §10. The doc text matches the code, and checks 1–3 plus the stale-bundle disqualifier are valid evidence.

**Status: `[~]` — awaiting HITL.** The Reviewer PASS covers the agent-checkable part. T-3 Done also requires the user's visual confirmation, which is still owed:
1. Visual confirmation of the Total General card.
2. Check 4: a side-by-side look against the center card (divider, chips, spacing). Not done: `/bilateral` redirected.
3. Check 4 at a narrow or stacked width. The only evidence is a 298px desktop card; forcing ~360px failed.
4. The browser console on the first load (not captured).
5. `ng build` once free RAM is ≥ 4 GB (it was 2.9 GB).
6. The user's go-ahead for a single commit: code + both CLAUDE.md files.

**Requirements covered (live):** STG-R-2 (KPI 1 = KPI 2 = 168 unscoped), R-4 S-4.2 (scope AOW02 leaves KPI 1 unchanged), R-1 (33 = Pending Review), NFR-4 (partial, 298px).
**Budget:** review rounds 4 total against 1 budgeted (T-1: 1, T-2: 2, T-3: 2). Diff is ~190 LOC against ~140 budgeted.

**HITL 2026-10-08:** the user approved committing and pushing to `qa-development-2026-ss` ("subamos cambios a mi rama y despues validamos para poder subir a performance-refactor"). Code and both CLAUDE.md files go in one commit, as T-3 Done requires. T-3 stays `[~]` until the user validates, ahead of the merge to `performance-refactor`. `ng build` is still pending (RAM rule).
