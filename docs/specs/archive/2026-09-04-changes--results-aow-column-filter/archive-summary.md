# Archive Summary — `changes/results-aow-column-filter`

**Outcome:** complete. Five tasks, five `[x]` with Reviewer PASS evidence; the Results tab shows each result's Area of Work, the Section filter is live with `?section=`, Overview links carry the active scope, and the live reconciliation on SP01 / SP12 passed on every bucket key.

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/results-aow-column-filter/` |
| Archive date | 2026-09-04 |
| Archived from branch | `qa-development-2026` (spec branch; default pin `master`) |
| Approval Mode | `pre-approved` (standing feedback 2026-09-02) |
| Depth | Standard |
| Tickets closed (Results tab half) | P2-3398 (Section filter disabled), P2-3399 (payload lacks AoW) |
| Related | archived `changes/overview-aow-cross-filter` (OSF-DD-2/2b/2d/3, OSF-DD-12 — superseded, see §9) |

## 2. Final Status

| Gate | Status |
|---|---|
| Tasks | 5/5 `[x]` — `RAC-T-1..T-5` |
| Reviewer verdicts | 5 PASS; 3 rework rounds total (T-1, T-2, T-5 — one each, within the ≤ 1 limit) |
| HALT / Pivot / FATAL_FAIL | none |
| Judgment-day | 1 pass, inline fallback (harness could not spawn judges); JI-1 SEVERE fixed before execution |
| `test-report.md` / `validation-report.md` | **absent — accepted.** Every task carried its own Jest gate (server 256, client 474 + 186 + 269 tests in the touched areas) and T-5 was the live validation (`RAC-AC-7`). No `/akili-test` or `/akili-validate` run was requested |
| Budget | tripwire fired after T-2 (≈ 1 430 vs 1 300 LOC); user chose *continue all*; final ≈ 940 source + ≈ 1 020 test LOC |

## 3. Requirements Delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| `RAC-R-1`, `R-1.1`, `R-1.2` one bucket per result, same rule as the Overview | T-1 | mapper + service specs; `getScopeBuckets` totals byte-identical |
| `RAC-R-2`, `R-2.1`, `R-2.2` Area of Work column, states, sort | T-2 | component/service specs; live cells on SP01/SP12 |
| `RAC-R-3`, `R-3.1` Section filter live, bucket-key vocabulary | T-3 | component specs (options, chips, badge, URL) |
| `RAC-R-4`, `R-4.1` Overview links carry scope; hydrate without rewrite | T-4 (+ T-3) | `dashboard-lab.scope.spec.ts`, `program-overview.scope.spec.ts` |
| `RAC-R-5` reconciliation on the owner W1/W2 population | T-5 | `execution.md` T-5 tables — SP01 8/8 keys, SP12 7/7 keys PASS |
| `RAC-R-6` search matches key, label, codes | T-2 | filter-service spec; live `AOW02` search attribution |
| `RAC-R-7` (SHOULD) unit name beside the code | T-3 remainder | `AOW01 · Market Intelligence (36)` live |
| `RAC-AC-1..8` | T-1..T-5 | per-task entries in `execution.md` |

## 4. Files Changed Summary (from `execution.md`)

| Commit | Scope | Files |
|---|---|---|
| `f2165ffe4` | server | `results-framework-reporting.{service,controller}.ts` (+ specs); new `application/queries/results-scope/{dto,mapper,mapper.spec}.ts` |
| `2e513a420` | client | `shared/services/api/results-api.service.ts`; `programme-results/services/programme-results.service.ts`, `programme-results-filter.service.ts`, new `programme-results-section-labels.ts`; `programme-results.component.{ts,html}` (+ specs) |
| `8a78ecaf3` | client | `programme-results.component.{ts,html}`, `services/programme-results-filter.service.ts`, `services/programme-results-query-params.ts`, `services/programme-results.service.ts` (+ specs) |
| `6a9a45b5e` | client | `dashboard-lab/dashboard-lab.component.ts`, `components/program-overview/program-overview.component.{ts,html}` (+ specs) |
| `a390717c9` *(foreign session, non-`[SPEC:]` message)* | docs | swept this spec's attempt-1 T-5 record and the three folder guides (`programme-results/`, `dashboard-lab/`, `program-overview/` `CLAUDE.md`) |
| `da1f9f005` | docs | corrected T-5 record, `programme-results/CLAUDE.md` fix, `execution.md` summary, `tasks.md` |
| `58c71b95d` *(`quick/results-filter-popover-polish`, after the spec)* | client | Section dropdown group headers, Section in the 2-col grid, popover anchoring at `md` |

## 5. Test Evidence Summary

| Area | Command | Result |
|---|---|---|
| Server module | `npx jest src/api/results-framework-reporting --silent --forceExit` | 23 suites / 256 tests PASS; eslint clean |
| Programme results + API service | `npx jest …/programme-results src/app/shared/services/api/results-api.service.spec.ts --silent` | 474 PASS (T-2); 186 PASS in `programme-results` after T-3; `ng lint` clean; dev build clean |
| Dashboard lab + program overview | `npx jest …/dashboard-lab.scope.spec.ts …/components/program-overview --silent` | 5 suites / 269 PASS; lint + dev build clean |
| Live (T-5) | Orca browser, SP01 + SP12, phase *Reporting 2026* (`versionId` 36) | every key PASS; contributor-only delta SP01 = 4 ids, SP12 = 2 ids; `results-scope` medians 61 / 123 ms |

## 6. Validation Summary

No `validation-report.md`. Validation evidence is the T-5 live reconciliation (`RAC-AC-7`) plus the per-task Reviewer PASS verdicts recorded in `execution.md`. Design-review pass by the owner on 2026-09-04 (screenshot) found three cosmetic issues, fixed in `quick/results-filter-popover-polish` (`58c71b95d`).

## 7. Accepted Warnings / Follow-ups

| Item | Origin | Disposition |
|---|---|---|
| `Object.hasOwn` on `PROGRAMME_RESULTS_FIXED_SECTION_LABELS` lookup (`?section=constructor`) | T-3 Reviewer RISK advisory | follow-up candidate (`/akili-quick`) |
| `@ApiQuery versionId required: true` while the handler accepts omission | T-1 Reviewer advisory | follow-up candidate |
| `currentPhaseVersionId` reads joined `rows()` (feedback edge) — `rawRows` would remove it | T-2 Reviewer advisory | follow-up candidate |
| `toSectionValues` does not dedupe `?section=A,A` | T-3 Reviewer advisory | benign, recorded |
| Breakdown-row hover tint no longer covers the *View results* icon | T-4 Reviewer advisory | cosmetic, recorded |
| Overview total counts contributor-only results (any role) while Results is owner-only | `RAC-DD-6`, T-5 delta (4 + 2 ids) | follow-up **spec** on the Overview population |
| Indicator line under result titles (P2-3399 other half); Results Center column | `design.md` §13 | separate specs |

## 8. Constitution & Graph Sync (spec branch — recorded, not written)

- `docs/trd/trd.md` §2 module table: add the read-only `GET results-scope` endpoint to the `Results Framework Reporting` row → **pending `guide-sync`** (kaizen entry P-item).
- Root `CLAUDE.md` / `AGENTS.md` factual sweep: no falsified assertion found.
- `.agents/model-routing.md` registry: T1/T3 `opus` entries are below the session model → **pending `factual-sweep`**.
- Folder guides (`programme-results`, `dashboard-lab`, `program-overview`) were the spec's own deliverable (T-5) and are updated at HEAD.
- **CodeGraph re-index recommended** (`codegraph sync`): new server folder, reshaped client services.

## 9. Historical Notes

- **Approach deviation:** proposal Option A (extend the results-list endpoint) → Option C corrected (new reporting-module endpoint + client join) because `ResultsFrameworkReportingModule` imports `ResultsModule` (`RAC-DD-1`).
- **Supersessions (archived specs are not edited):** `overview-aow-cross-filter` `OSF-AC-8` ("must NOT add a scope parameter to the Results deep-link") and the deferred half of `OSF-R-7` / `OSF-DD-12` are superseded by `RAC-R-4`; the `programme-results/CLAUDE.md` "Coming soon" rows for the Section filter (P2-3398) are removed.
- **Judgment-day:** blind judges could not be spawned (Orca pane timeout, third spec in a row); inline single-pass review found JI-1 SEVERE (population mismatch in `RAC-R-5`) and fixed it before execution.
- **Concurrency incident:** another session committed `a390717c9` in this checkout mid-run, sweeping this spec's in-progress T-5 record and guide edits under a non-`[SPEC:]` message (`KZ-MRF-3` recurrence).
- **Workers:** Reviewer wrappers (`Read/Grep/Glob`) cannot answer `shutdown_request`; the Leader closed them with `TaskStop`.
