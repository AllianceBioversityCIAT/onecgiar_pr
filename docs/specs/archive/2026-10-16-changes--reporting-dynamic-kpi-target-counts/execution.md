# Execution — Reporting: dynamic KPI and target counts

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/reporting-dynamic-kpi-target-counts/` |
| **Branch** | `qa-development-2026-ss` |
| **Leader** | Claude Code session, Opus 5.5 (T1) |
| **Implementer / Reviewer** | `akili-implementer` (T2 wrapper) / `akili-reviewer` (T3 wrapper, read-only) |
| **Approval mode** | gated (no proposal; Lite spec). Continue/pause asked after each task |
| **Budget (design §7)** | 3 tasks · ≈ 90 prod + ≈ 120 test LOC · 2 review rounds |
| **Started** | 2026-10-16 |

## 2. Task Execution History

### DKT-T-1 — Header count and target sum read the card's filtered base

- **Status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-16
- **Requirements covered:** DKT-R-1 (HLO, no filters / KCR-AC-5, toggles), DKT-R-2 (matches the groups, filter narrows, loading)
- **Skills / effort:** `angular-developer`, `tdd` · medium (task defaults, no deviation)

#### Attempt 1

- **Files changed** (under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/`):
  - `reporting-burndown.ts`: new pure `sumTargetValues(rows)` (numeric parse, integer or 1 decimal), `@akili-spec` tagged
  - `reporting-burndown.spec.ts`: 4 tests (`"9"+"100"` → `109`, null/empty/abc → `0`, `1.25+1` → `2.3`, empty/null input)
  - `components/reporting-aow-table/reporting-aow-table.component.ts`: `headerCount(group)`, `headerTargets(group)`, private `headerPending`; `hloTargetSum` delegates to the helper
  - `components/reporting-aow-table/reporting-aow-table.component.html`: header span renders `headerCount(group)` + `@if` ` · N targets` (`data-testid="aow-header-targets"`), keeps `hidden sm:inline`
  - `components/reporting-aow-table/reporting-aow-table.component.spec.ts`: 5 DOM tests (Type all 5 KPIs · 115 / HLO 3 · 109; `__allIndicators`; cross-cut excluded; loading → `group.count`, no sum; singular `1 target`)
  - `dashboard-lab.kcr-reconciliation.spec.ts`: `tableCountLabel()` returns `table.headerCount(group)` (the bound method), no longer `countLabel(group.count)`
  - `components/reporting-aow-table/CLAUDE.md`: header-rule bullet + Verified re-stamp (folder-doc convention)
- **Diff size:** 7 files, +112 / −7
- **Implementer verification:**
  - `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(reporting-burndown|reporting-aow-table.component|kcr-reconciliation)"` → Test Suites 3 passed, Tests 288 passed
  - Broader `--testPathPattern="(reporting-aow-table|dashboard-lab.mrf-burndown|dashboard-lab.oah-rows|dashboard-lab.hub)"` → 7 suites, 312 tests passed (incl. favorites, pt-activity)
  - Implementer `Not Done / Assumptions`: (1) ESLint not run, flat config missing; (2) red-first not observed (tests written with the code); (3) header split into `headerCount` / `headerTargets`, KCR reads only the count
- **Leader adjudication of Not Done:** (1) closed by the Leader: `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched .ts> --quiet` → clean (client uses `.eslintrc.json`). (2) not a scope gap; tasks.md has no `Red run` field and the Reviewer mutation-traced every "Would fail if". (3) design choice within scope, KCR spec only needs the count. No scope owed
- **Reviewer verdict:** `STATUS: PASS`. Header count and sum both read `ratioBase(group)` (P-1 confirmed at `reporting-aow-table.component.ts:1298-1301`); `group.count` only as loading fallback, host untouched; one helper, `hloTargetSum` output unchanged; no new tokens. Mutation trace: `count: 99` fixtures catch a `group.count` read; `109` / `115 targets` catch concatenation; `__allIndicators` test catches the 1-row `indicators`. KCR "Not evidence" clause satisfied (bound method, not a rebuilt label)

#### ADVISORY (4R, non-gating)

- Readability: the new describe sits between the `// ── In-card Target filter axis (KTO-R-7 …) ──` comment and the describe it labels (spec.ts ~1257-1308). Move the comment down and give the DKT block its own section comment
- Reliability: KCR `tableCountLabel()` checks the bound method, not rendered DOM; the component spec covers the DOM today
- Reliability: a non-loading card with empty `ratioBase` (e.g. Target = `without` card B) now shows `0 KPIs · 0 targets`. Spec-consistent (zeros suppressed only while loading); product call if unwanted
- Readability: the first test swaps the `groups` input to stand in for Type = HLO; the end-to-end host figures (49 / 57) belong to T-3

#### Decisions

- `headerCount` / `headerTargets` as two methods so the KCR spec can bind the count alone
- Folder `CLAUDE.md` updated in the task (folder-doc convention), not deferred

#### Final verification

Jest 3 suites / 288 tests green; broader 7 suites / 312 green; ESLint clean on touched `.ts`. Budget: 1 review round so far, LOC within estimate.

### DKT-T-2 — `KPI` chip label and informational `Target` chip

- **Status:** PASS (attempt 1 of 3; one in-attempt scope completion round)
- **Date:** 2026-10-16
- **Requirements covered:** DKT-R-3 (label, active/click unchanged, no cross-cut double count), DKT-R-4 (= Σ header sums, informational, no emit / no `aria-pressed`), §7 a11y
- **Skills / effort:** `angular-developer`, `spartan`, `tdd` · medium (task defaults)

#### Attempt 1

- **Runtime event:** the first spawn was cut by an account rate limit (HTTP 429) before writing anything; resumed via SendMessage. Not counted as an attempt
- **Files changed** (under `dashboard-lab/`):
  - `components/reporting-quick-typology-filters/reporting-quick-typology.util.ts`: `All` → `KPI` (label + short label); `id` / `matchKey` stay `all`
  - `components/reporting-quick-typology-filters/reporting-quick-typology-filters.component.ts`: `targetSum` input; non-focusable `span` pill after the first chip (`data-testid="quick-typology-target-pill"`, `aria-label="Target sum: N"`, inactive-chip tokens, no handler)
  - `components/reporting-quick-typology-filters/reporting-quick-typology.util.spec.ts` (new): first chip `KPI` / `KPI`, count from `counts.all`, active
  - `components/reporting-program-band/reporting-program-band.component.ts` / `.html`: pass-through `targetSum`
  - `components/reporting-program-band/reporting-program-band.component.spec.ts`: 3 `'All'` → `'KPI'`; Target pill test (SPAN, aria-label, no aria-pressed, click → no emit); no pill without input
  - `dashboard-lab.component.ts`: `reportingTypologyCounts` skips `__isIntermediateCrosscut`; new `reportingTargetSum` computed over the same rows via `sumTargetValues`
  - `dashboard-lab.component.html`: `[targetSum]="reportingTargetSum()"` at both call sites
  - `dashboard-lab.kcr-reconciliation.spec.ts`: Σ-identity test (`all` = Σ `headerCount`, `reportingTargetSum` = Σ `headerTargets`, cross-cut fixture); host filter test (Type hlo → `15` / 2; Type all → > 15; hlo + KP → `10` / 1) driving the real filter signals
- **Implementer `Not Done` (first report):** host Type=HLO test and `buildQuickTypologyChips` test not added. **Leader adjudication:** both are named in tasks.md "Tests to add" and the HLO one backs a "Would fail if" clause → scope owed, sent back to the same Implementer before review. Completed in the second round; no outstanding gap
- **Verification:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(reporting-quick-typology|reporting-program-band|dashboard-lab.component|kcr-reconciliation)"` → 28 suites / 1144 tests passed. ESLint (`ESLINT_USE_FLAT_CONFIG=false --quiet`) clean on touched `.ts`
- **Reviewer verdict:** `STATUS: PASS`. Conforms to DKT-R-3/R-4, DKT-DD-3/DD-4, §7 a11y, design §5 tokens (`py-0.2` copied from the existing chip badge). Leader question answered: `reportingGroups()` (dashboard-lab.component.ts:3695-3809) applies only Section/Type/Category/Target; Only pending / Favorites / PT apply in `reportingGroupsForTable` (:3818-3820), which only feeds the table, so `KPI` = Σ header counts holds under the toggles. Remaining `'All'` strings are the Target-filter option (band .ts:681, spec:1549, html:628), not the quick chip
- **ADVISORY:** none (checklist mode, suppressed by the Reviewer)

#### Final verification

28 suites / 1144 tests green, ESLint clean. Budget: 2 tasks, 1 review round each, within §7.

### DKT-T-3 — Live check against the SP05 2026 reference (HITL)

- **Status:** PASS (user check, 2026-10-16)
- **Route:** local `http://localhost:4200/result-framework-reporting/entity-details/SP05?tocView=aows`, read-only. User screenshots (images 27, 28)
- **Type = High level output:** `KPI 182` · `Target 259` · AOW01 `49 KPIs · 57 targets` · AOW02 `33 · 42` · AOW03 `31 · 78` · AOW04 `44 · 47` · AOW06 `25 · 35`. AOW05 card not rendered (no HLO KPIs), consistent with expected 0. Σ header sums 57+42+78+47+35 = 259 = chip; Σ counts 49+33+31+44+25 = 182 = chip
- **No filters:** `KPI 213` (53+39+37+50+1+29+2+2) · `Target 399` (63+74+100+118+0+41+3+0 = Σ header sums) · AOW01 `53 KPIs · 63 targets`
- **Premise P-4:** confirmed. The totals match the reference table, so no centre sub-row double count
- **Layout NFR:** screenshots are at desktop width (~1520 px) and show no overflow. The 1366 / 1280 / 375 px widths are not shown; recorded as accepted on the user's "funciona bien"
- **Reviewer:** user at the HITL pause (per tasks.md)

## 3. Summary

All 3 tasks PASS on the first attempt (one in-attempt scope completion on T-2; one rate-limit runtime event). Budget held: 3 tasks, 1 review round each. Client-only change in `dashboard-lab/`; nothing committed. Open follow-ups: tasks.md §6 items to confirm with Angel; T-1 advisories (spec comment placement; `0 KPIs · 0 targets` on empty non-loading cards is a product call).
