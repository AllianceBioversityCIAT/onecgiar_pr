# `bugfix/w12-overview-phase-origin-alignment` — Tasks

## 1. Scope of this task list

- **Module / feature:** W1/W2 Overview figure alignment (server `results` + `results-framework-reporting`, client `dashboard-lab`)
- **Linked spec:** `requirements.md` (W12-R-1..4) + `design.md` (W12-DD-1..5)
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** approved — ready for /akili-execute (2026-08-28)
- **Depth:** Standard (Bug Mode) · **Budget:** 3 tasks / ~220 LOC / 1 review round per task (design §1)
- **Parallel-safe:** T-1 ∥ T-2 possible (disjoint files) — but serial recommended (T-3 needs both; shared worktree discipline)

## 2. Pre-flight checklist

*(Prose — the tasks-gate hook reserves checked boxes for /akili-execute's evidence-first flow.)*

- `requirements.md`/`design.md` approved at gates (2026-08-28, owner "Go" on the proposal; specify phases auto-passed under the owner's explicit go — recorded).
- Base: agy's W3 fix committed (`🔧 fix(dashboard-lab) : scope W3/bilateral overview figures…`).
- **DB pre-flight (execution, before W12-T-2):** open reporting `version` rows for `app_module_id = 1` — expect exactly one; if >1, record in `execution.md` and escalate (design §13).
- No `package.json`, no migration.

## 3. Task list

### `W12-T-1` — Meter: W1/W2-origin filter + regression (server)

- **Type:** `server`
- **Description:** In `results.service.ts` `getScienceProgramProgress` (~:1798) add `fundingSource: ['Result']` to `filters` (the repo's `addInGeneric('r.source', filters?.fundingSource)` at `result.repository.ts:739` already applies it). **Regression test first (red):** in `results.service.spec.ts`, assert the repo is called with filters containing `fundingSource: ['Result']` AND `versionId` — run it against the pre-fix code and record the red output; then apply the one-liner → green.
- **Implements:** `W12-R-1` — *Bilateral results excluded from the meter* (THEN W1/W2-only breakdown; **BUT NOT** affect the W3 meter/other fields — no other change in the method; **AND IT MUST** keep phase scoping — `versionId` still asserted in the same filters)
- **Files (expected):** `results.service.ts`, `results.service.spec.ts`
- **Depends on:** — · **Blocks:** W12-T-3
- **Estimate:** S (~30 LOC incl. spec)
- **Skills:** `nestjs-expert`, `tdd`, `systematic-debugging`
- **Definition of done:**
  - [ ] Regression spec **red on pre-fix code (output recorded verbatim), green after**. **Disqualifier:** a spec that was never seen red is not regression evidence.
  - [ ] Filters assertion includes BOTH `fundingSource: ['Result']` and the existing `versionId` (phase scoping preserved). **FAIL input:** dropping either key → red.
  - [ ] Grep: no other caller of the progress method changes behaviour unexpectedly (record).
  - [ ] Full server suite `npx jest --silent --reporters=summary --forceExit` green; `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` clean; `npm run migration:check` clean. **Disqualifier:** path-pattern narrowing.

### `W12-T-2` — Matrix: origin + role + versionId + universe (server) · client passes the phase + versioned cache

- **Type:** `server` + `client`
- **Description:** Per design §2.1 rows 2–6 and W12-DD-2..5: (server) `getIndicatorContributionSummaryByProgram(initiativeId, versionId)` SQL predicates (`r.source = 'Result'`, `rbi.initiative_role_id = 1`, `r.version_id = ?`, `status_id != 4`, `result_type_id NOT IN (10, 11)`; verify `result_level_id IN (3,4)` against the meter's base query and record); service accepts optional `versionId`, defaults to `$_findActivePhase(REPORTING)` (inject `VersioningService` if absent), stops using `activeYearValue` for this call; controller `@Query('versionId')` numeric-parsed + `@ApiQuery`. (client) `GET_IndicatorContributionSummary(program, versionId?)` appends the param (mirror `GET_ResultToReview`); `loadSummaries` resolves the version like `loadBilateralRows` and passes it; `summariesByCode` keyed `${code}::${versionId ?? 'default'}` with all readers updated. **Regression tests first (red):** server mapping/SQL specs with the mixed fixture; client api + cache specs.
- **Implements:**
  - `W12-R-2` — *Matrix matches the Results tab* (THEN Σ = 11 on the fixture; **BUT NOT** count role-2 / other-version / `'API'` rows — one assertion per class; **AND IT MUST** default `versionId` to the active reporting phase, never the `year` table) · *Cache is phase-keyed* (THEN V2 fetches; **BUT NOT** serve V1 under V2)
  - `W12-R-4` — client sends `latestVersion` id; null → no param (server default)
- **Files (expected):** `result.repository.ts`, `results-framework-reporting.service.ts` + `.spec.ts`, `results-framework-reporting.controller.ts` (+ spec), `results-api.service.ts` + `.spec.ts`, `dashboard-lab.component.ts` + `.spec.ts`
- **Depends on:** — (pre-flight DB check first) · **Blocks:** W12-T-3
- **Estimate:** M (~160 LOC incl. specs)
- **Skills:** `nestjs-expert`, `angular-developer`, `api-design-principles`, `tdd`, `systematic-debugging`
- **Definition of done:**
  - [ ] Server regression specs **red before / green after** (recorded) for each excluded class: `source='API'`, role 2, other version, plus `others` bucket receiving a status ∉ {1,2,3}. **FAIL input:** removing any one predicate → its class's assertion red. **Disqualifier:** one combined "total = 11" assertion without per-class assertions (cannot tell which predicate broke).
  - [ ] Default resolution spec: absent/non-numeric `versionId` → `$_findActivePhase(REPORTING)` id used; explicit numeric honored. **FAIL input:** falling back to `year.active` → red.
  - [ ] Client: URL contains `versionId=NN` when given, absent otherwise; cache spec V1→V2 refetch. **FAIL input:** code-only cache key → red.
  - [ ] Grep other callers of the repo method / `resolveInitiativeAndYear`; record impact (design §11).
  - [ ] Full server suite + lint + `migration:check`; full client suite + `ng lint` + `ng build` green. **Disqualifier:** narrowing.

### `W12-T-3` — Parity + owner verification

- **Type:** `tests` / verification
- **Description:** (a) W12-R-3 parity spec: run the meter's status breakdown mapper and the summary mapper over ONE shared mixed fixture → meter total === Σ matrix `totalResults`; (b) full suites on the final tree; (c) **owner manual (W12-AC-4):** SP04 Overview W1/W2 meter total = matrix total = Results tab count at current phase + W1/W2 (11 today); W3 cards unchanged; second SP spot-check; record in `execution.md`; (d) OQ-1/OQ-2 outcomes observed live and recorded.
- **Implements:** `W12-R-3` — *Meter ≡ matrix* (**AND IT MUST** hold over a fixture mixing every excluded class) · W12-AC-1..4 closure
- **Files (expected):** one server spec file (parity); none else
- **Depends on:** W12-T-1, W12-T-2 · **Blocks:** —
- **Estimate:** S
- **Skills:** `nestjs-expert`, `tdd`
- **Definition of done:**
  - [ ] Parity spec over the mixed fixture green; **FAIL input:** re-widening either universe → red.
  - [ ] Owner verification recorded with the three numbers (meter / matrix / Results tab) for two SPs. **Disqualifier:** closing without the recorded numbers.
  - [ ] Final suites green (both packages).

## 4. Dependency graph

```
W12-T-1 (meter)  ─┐
                  ├── W12-T-3 (parity + owner check)
W12-T-2 (matrix) ─┘
```

No cycles. T-1 ∥ T-2 allowed (disjoint files); serial preferred in the shared worktree.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `W12-TEST-1` | unit (server, regression) | W12-R-1 | `results.service.spec.ts` |
| `W12-TEST-2` | unit (server, regression) | W12-R-2 both scenarios (server half) | `results-framework-reporting.service.spec.ts` / repo spec / controller spec |
| `W12-TEST-3` | unit (client) | W12-R-2 cache · W12-R-4 | `results-api.service.spec.ts`, `dashboard-lab.component.spec.ts` |
| `W12-TEST-4` | unit (server, parity) | W12-R-3 | new/extended server spec |
| `W12-TEST-5` | manual (owner) | W12-AC-4 | recorded in `execution.md` |

Server thresholds (5/20/35/40) and client (50/60/60/60) unaffected.

## 6. Rollout & verification
- Single PR against `qa-development-2026` (~220 LOC), stacked on agy's W3 fix. PR description: review the summary SQL predicates first; out of scope: W3 cards, Results tab, slot redesign.
- CI green; W12-AC-4 numbers in the PR.

## 7. Cleanup & follow-ups
- OQ-2 (always-0 "Not started" slot for W1/W2) → later quick if desired.
- Multi-open-phase determinism (`findOne` without ORDER BY on both sides) → proposal candidate if the pre-flight finds >1 row.

## 8. Roll-back plan
Revert the single PR: endpoint param is optional (callers without it keep working), no migration, no persisted state. Figures return to the over-counting behaviour.
