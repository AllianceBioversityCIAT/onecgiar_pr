# `bugfix/achieved-counts-submitted` — Tasks

**Depth:** Standard (Bug Mode) · **Status:** complete · Budget: 5 tasks · ~350 LOC · 2 review rounds (`design.md` §12)

## 1. Scope

Implements `ACS-R-1..5` per `design.md` (`ACS-DD-1..5`). No migration, no SQL change, no bilateral contract change.

## 2. Pre-flight

- [x] On `qa-development-2026-ss` (or a branch from it); uncommitted notification work in the tree is **not** part of this spec — do not stage it.
- [x] Inline SQL check run 2026-10-02: **30983** (id 34339) is `status_id = 3`, active, `contributing_indicator = 1` on one 2026 target row (7 sibling targets NULL) → valid live evidence. **31037** (id 34393) is `status_id = 3` but **soft-deleted** (`result.is_active = 0`, its `rtr`/`rtri`/`rit` rows also 0, contribution 1.00) — it was active when Nicoleta took the screenshot (Prel 100%) and was deleted afterwards, so it can no longer serve as live evidence. `ACS-S-1` stays as a fixture scenario in T-1; T-5 uses 30983 plus any active status-3 result.
- [x] Scoped test runs only (`--testPathPattern` / `--spec`) — never the full suite.

## 3. Task list

### [x] `ACS-T-1` — Regression tests first (red on current code)

- **Size:** S · **Depends on:** — · **Skills:** `tdd`, `nestjs-expert`, `angular-developer`
- **Covers:** `ACS-S-1`, `ACS-S-2`, `ACS-S-4`, `ACS-S-7`, `ACS-S-8`, `ACS-S-11` · **Design:** §6, §7, §8.1
- **Scope (tests only):**
  1. `toc-progress-rollup.spec.ts` — indicator `{target 1, actual 0, preliminary 1, achieved 1}` → `rollUpIndicators` yields `achieved_value 100`, `achieved_progress_percentage '100%'`; `rollUpChildren` over two children (100, 0) → `achieved_value 50`; zero-target child skipped for `achieved` exactly as for `actual` (`ACS-S-7` BUT).
  2. `aow-bilateral.repository.spec.ts` — the grouped indicator from `fetchAndGroupTocResults` carries `achieved_progress_percentage '100%'` when `achieved_value_sum 1`, target 1; and `actual_achieved_value_sum` / `progress_percentage` keep their QA values (`ACS-S-11`).
  3. `achieved-display-basis.spec.ts` (new) — `{actual 0, achieved 1, progress '0%', achieved_progress '100%'}` → displayed `actual 1`, `progress '100%'`, `qa_actual_achieved_value_sum 0`; Approved-only and 3→2 fixtures both display 1, never 2 (`ACS-S-2`); payload without union fields returned unchanged (`ACS-DD-5`); switch on → identity (`ACS-S-10`).
  4. `results-api.service.spec.ts` — `GET_TocResultsByAowId` flush of the fixture above emits `actual_achieved_value_sum 1` (proves the pipe is wired, not just the helper).
  5. `reporting-burndown` spec — `summarisePartition` over normalised rows counts the KPI as reported (`ACS-S-8`, 1 not 0).
- **Done:** every new case fails today for the right reason (missing field / helper / pipe), existing cases still pass.
- **Verify:** server `npx jest --silent --reporters=summary --forceExit --testPathPattern="toc-progress-rollup|aow-bilateral.repository"` · client `npx jest --silent --reporters=summary --no-coverage --testPathPattern="achieved-display-basis|results-api.service|reporting-burndown"`.
- **Fails when / disqualifier:** a case that passes before T-2/T-3 is not a regression test — rewrite it. A red caused by a typo/compile error *outside* the asserted behaviour is not evidence; the failure message must name the missing field or wrong value.

### [x] `ACS-T-2` — Server: achieved basis on rows and roll-ups

- **Size:** S (~70 LOC) · **Depends on:** T-1 · **Skills:** `nestjs-expert`
- **Covers:** `ACS-R-2` (row %), `ACS-R-3`, `ACS-S-6`, `ACS-S-7`, `ACS-S-11`, `ACS-NFR-1/2` · **Design:** §6, §7
- **Scope:** `toc-progress-rollup.ts` (`RollupIndicator.achieved_value_sum`, `NumericRollup.achieved`, compute in `rollUpIndicatorsNumeric` with `hasUsableTarget`, average in `rollUpChildren` over the same `measurable` set, emit in `present`); `aow-bilateral.repository.ts` (`achieved_progress_percentage` in `fetchAndGroupTocResults`, whitelisted in `groupTocRows`, interface fields).
- **BUT must NOT:** change SQL, status sets, the averaging rule, or any existing field's value.
- **Done:** T-1 server cases green; existing rollup/repository specs green unchanged.
- **Verify:** same server command as T-1 + `npx eslint "src/api/results/results-toc-results/repositories/*.ts" --quiet`.
- **Fails when:** an existing rollup/repository assertion needs its expected value changed — that means an existing field moved (`ACS-S-11` broken); stop and report.

### [x] `ACS-T-3` — Client: display-basis normaliser at the API choke point

- **Size:** S (~80 LOC) · **Depends on:** T-1 (T-2 for real data, not for tests) · **Skills:** `angular-developer`
- **Covers:** `ACS-R-1`, `ACS-R-2` (badge), `ACS-R-4`, `ACS-S-1..5`, `ACS-S-8`, `ACS-S-10` · **Design:** §8.1, `ACS-DD-1/2/5`
- **Scope:** new `shared/constants/achieved-display-basis.ts` (`SHOW_QA_PREL_SPLIT`, `toDisplayBasis`, doc comment on the field re-pointing and `qa_*` keys); `.pipe(map(toDisplayBasis))` in `GET_TocResultsByAowId`, `GET_IntermediateOutcomes`, `GET_2030Outcomes`, `GET_ScienceProgramTocProgress`; optional `achieved_*` / `qa_*` fields on `ReportingIndicator`, `TocAchievement`.
- **BUT must NOT:** edit numeric bindings in components; mutate the HTTP response object shared with another subscriber (return copies).
- **Done:** T-1 client cases green; `reporting-aow-table`, `aow-hlo-table`, `program-overview`, `indicator-drawer`, `dashboard-lab` existing specs still green or only fail on QA/Prel text (handled in T-4).
- **Verify:** client Jest command from T-1 + `npx jest ... --testPathPattern="reporting-aow-table.component|aow-hlo-table|indicator-drawer"` + grep gate: `grep -rn "GET_TocResultsByAowId\|GET_IntermediateOutcomes\|GET_2030Outcomes\|GET_ScienceProgramTocProgress" src/app/shared/services/api/results-api.service.ts` → each body contains `toDisplayBasis`.
- **Fails when:** a component still calls a raw endpoint outside these four for indicator progress (grep `http.get` on `toc` progress URLs elsewhere) — that surface is uncovered; add it or record it.

### [x] `ACS-T-4` — Client: hide the QA / Prel pair (flag), update affected specs

- **Size:** M (~200 LOC incl. specs) · **Depends on:** T-3 · **Skills:** `angular-developer`, `spartan` (tokens only; no new component), `frontend-design`
- **Covers:** `ACS-R-5`, `ACS-S-9`, `ACS-S-10`, `ACS-NFR-3/4` · **Design:** §8.2, §10.1
- **Scope:** `@if (showQaPrelSplit) … @else <single track>` in reporting-aow-table (row cell both layouts, AoW header, HLO header), program-overview (hero, AoW rows), dashboard-lab `:1627`/`:1825`, aow-hlo-table Prel bar/column, entity-aow-aow AoW header (added at T-4 review), entity-aow-card `Prel.`; branch the "QA … and Preliminary …" tooltip/aria builders. Update the specs listed in design §10.1 to the default (single figure) and keep **one** flag-on case per suite.
- **BUT must NOT:** delete the two-track markup; introduce new colours/tokens; leave a visible "QA"/"Prel." label with the flag off.
- **Done:** grep gate `grep -rn ">QA<\|>Prel\.\|>PREL<" <touched templates>` → every hit sits inside an `@if (showQaPrelSplit)` block; scoped Jest + Cypress CT green.
- **Verify:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="reporting-aow-table|program-overview|aow-hlo-table|entity-aow-card|dashboard-lab.component"` · `npx cypress run --component --spec "src/app/pages/result-framework-reporting/pages/dashboard-lab/components/**/*row-layout.cy.ts"` · `npx ng lint --quiet`.
- **Cannot prove:** jsdom presence-asserts labels, it does not prove nothing clips or misaligns → Cypress CT (real browser) + T-5 visual check. Pre-existing red CT specs on this branch (memory: CT suite broadly red) do not count as pass or fail of this task — compare against a run on the parent commit and report only new failures.

### [x] `ACS-T-5` — Verification at the HITL pause (manual)

- **Size:** XS · **Depends on:** T-2, T-3, T-4 · **Skills:** `run` / `claude-in-chrome` (optional)
- **Covers:** real-data side of `ACS-S-1`, `ACS-S-5`, `ACS-S-8`, visual side of `ACS-S-9`, `ACS-S-3`
- **Scope:** locally (or on testing after deploy) open SAAF Reporting → AoW1/HLO 1.1 and Overview → Productivity+; SF Reporting → AoW5/HLO 5.3 CIMMYT row. Confirm: Achieved 1 / 100% / Achieved; 1/90; Achieved 1 / 20% with siblings 0; no QA/Prel visible; layout intact at desktop and narrow widths.
- **Done:** user confirms the three checks (screenshots in `execution.md`).
- **Live cases:** 30983 (SF AoW5/HLO 5.3 CIMMYT) + one active status-3 SAAF result picked at T-5 time (31037 is deleted — it must now show 0, which is correct).
- **Fails when:** the chosen live result is not active status 3 with a non-null contribution on that target — then a 0 on screen is not this bug; pick another or re-diagnose instead of passing.

## 4. Dependency graph

`T-1 → T-2` · `T-1 → T-3 → T-4` · `{T-2, T-4} → T-5` (T-2 ∥ T-3 possible).

## 5. Coverage closure (scenario / clause → task)

| Clause | Task |
|---|---|
| S-1 Achieved 1 · HLO sum includes it · BUT not 0 / empty state | T-1(3,4), T-3, T-5 |
| S-2 stays 1 after 3→2 · MUST once, Approved once | T-1(3) (SQL single-count already gated by `indicator-achieved-value-per-center` T-1) |
| S-3 statuses 1/5/7/8 contribute 0 | Unchanged SQL `IN (2,3,6)` — existing repository spec; T-5 spot check |
| S-4 100% + Achieved · Report rule · BUT not "Not started" | T-1(3) + T-3 (badge reads re-pointed `progress_percentage`) |
| S-5 30983 1 / 20% · siblings 0 | T-5 (real data); scoping unchanged by T-2 BUT clause |
| S-6 zero target Overachieved / No target set, excluded | T-2 (same `hasUsableTarget`), T-1(1) |
| S-7 roll-up mean · BUT averaging rule unchanged | T-1(1), T-2 |
| S-8 1/90 · summary band · MUST keep KCR-R-2 | T-1(5), T-3 |
| S-9 no QA/Prel visible · a11y single figure | T-4, T-5 |
| S-10 flag restores · BUT no server change | T-1(3) identity, T-4 flag-on cases |
| S-11 existing fields unchanged, new alongside | T-1(2), T-2 fail-when |
| NFR-1 no new query | T-2 BUT (no SQL change) |
| NFR-2 additive | T-2, S-11 |
| NFR-3 tokens / no layout shift | T-4, T-5 |
| NFR-4 tests updated not deleted, scoped | T-4, pre-flight |

## 6. Rollout & rollback

Single PR (server + client, order-independent per `ACS-DD-5`). Rollback: `SHOW_QA_PREL_SPLIT = true` or revert. No commit without explicit user go-ahead; commit subjects with emoji + type and no apostrophes (Jenkins).
