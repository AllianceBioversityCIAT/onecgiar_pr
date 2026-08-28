# Archive Summary: Overview Phase Filter

## 1. Document Control
| Field | Value |
|---|---|
| **Original Spec Path** | `docs/specs/changes/overview-phase-filter/` |
| **Archive Date** | 2026-08-28 |
| **Final Status** | Delivered — 5/5 tasks PASS + 2 HITL hotfixes; owner visual approval ("super") |
| **Branch** | `qa-development-2026` (spec branch — constitution syncs recorded as pending items) |

## 2. What Shipped
A phase selector on the SP Overview (`entity-details/:sp/overview`) that re-scopes all four card families — W1/W2 meter, indicator matrix, W3/bilateral cards, ToC map — to any reporting phase of the program's portfolio. Default (untouched selector) = the Open phase, byte-identical to before. One canonical parameter (`versionId`); the server derives year + ToC context from the `version` row itself (never `year.active`).

## 3. Requirements Delivered
OPF-R-1..6 delivered and live-verified (SP04: 2025→32/81, 2026→11; ToC context per phase; 400/404 contracts). OPF-R-7 (deep-link `?phase=`) deferred by design (DD-5, recorded MAY). OPF-N-1..3 held (zero extra default-path requests; per-phase caches; component-level a11y with one recorded shared-component residual).

## 4. Files Changed (from execution.md)
- **Server:** `reporting-toc-context.service.ts` (+`resolveByVersionId`), `results-framework-reporting.service.ts` (+`resolveTocContextForRequest`), controller (3 routes + `versionId`), 3 spec files (+437).
- **Client:** `results-api.service.ts` (+4 wrapper params) + spec; `dashboard-lab.component.*` (selection signal, `activeSelection` view gate, `effectiveVersionId` single resolver, per-phase Map caches, cache-presence loading computeds, selector UI, meter overlay); `program-overview.component.*` (`meterLoading`/`bilateralLoading` inputs); `reporting-program-band.component.*` (`phaseLabelOverride`); `phasesList.interface.ts` (+`obj_portfolio.id`); `pr-viz-chart` (LineChart registered — collateral unblock of the concurrent trend feature).
- Commits: a064feadb, b6edef6c5 (T-2), ffe4114bc (T-1), 8f83e29fd (T-3), a57cd2040 (T-4), bbea07a3c (h1), 3be2149f8 (build unblock), 89ba9f126 (h2).

## 5. Test Evidence
Scoped suites at close: server RFR 166/166; client dashboard-lab 423/423 (12 suites) + shared API wrappers (both-direction URL assertions); `ng lint` + `tsc` + `npm run build` clean. Red→green proofs on the load-bearing fixes: tab-leak gate (f), skeleton immediacy (h), string-id normalization (2 tests fail with the fix reverted). Live authenticated probe table in `execution.md` (5 endpoints × explicit/absent/invalid versionId).

## 6. Validation
No standalone validation-report (owner-accepted, fast mode). HITL D4 visual gate run twice by the owner: caught hotfix h1 (no skeletons on switch — effect-timing class) and hotfix h2 (string bigint id silently dropped by strict wrapper guards). Final owner verdict: approved.

## 7. Follow-Ups (recorded, not defects)
1. Bilateral card 81 vs Results-tab API-origin 79 (+2): universe/role semantics difference — candidate requirements-level cotejo (same family as the W12 meter/matrix residuals).
2. The concurrent trend feature's `loadProgramResults` caches per phase key but fetches without `versionId` (phase-blind) — flagged to its owner via kaizen.
3. `overviewTocMapLoading` lacks the view gate its siblings got (harmless today); parameterize the no-stuck-loader error test across the 3 remaining loaders; `?? 0` on `totalResults` overlay branch; `dashboard-lab.toc-map.ts:90` stale key comment; `.slice()` redundancy.
4. `app-pr-select` has no programmatic ARIA label association (shared component gap).
5. Exemplar endpoint `getProgramIndicatorContributionSummary` still silently falls back on garbage `versionId` (now the odd one out vs the ToC family's 4xx contract).

## 8. Historical Notes
The Reviewer FAIL on T-4 attempt 1 was the run's save: the design's own §8 contradicted its §5 (options from `sp.versions`, which carries one row) — the selector would have shipped structurally inert. Corrected in-place to the PhasesService catalogue. Both HITL hotfixes were classes no jsdom gate could see (D4 doing its designed job): effect-flush timing and wire-type mismatch.
