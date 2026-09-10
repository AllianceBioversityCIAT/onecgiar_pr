# Archive Summary — `bugfix/w12-overview-phase-origin-alignment`

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/w12-overview-phase-origin-alignment/` |
| Archive date | 2026-08-28 |
| Final status | **Complete — 3/3 tasks `[x]` + 3 hotfixes; live-verified SP04 = 11 = Results tab** |
| Owner | j.cadavid@cgiar.org · Branch `qa-development-2026` (spec branch) · shipped to `performance-refactor` @ `dd2d2c282` |

## 2. Outcome

The SP Overview's W1/W2 figures (Reporting-status meter + category×status matrix) now match the Results tab scoped to **current reporting phase + W1/W2 origin + primary submitter** — SP04 went from meter 24 / matrix 23 vs Results 11 to **11 = 11 = 11** (verified via authenticated endpoint probe + direct DB breakdown).

## 3. Root Causes Fixed (all code-confirmed, Bug Mode red→green)

1. **Meter counted bilaterals** — no `r.source` filter (one-line `fundingSource: ['Result']`).
2. **Matrix**: no origin filter, no ownership filter (`initiative_role_id = 1`), year-scoped instead of phase-scoped (`r.version_id` + optional `versionId` param defaulting to `$_findActivePhase(REPORTING)`), divergent status/type universe (now `!= 4`, `NOT IN (10,11)`; `result_level_id` filter dropped — Reviewer-adjudicated as required for parity); versioned client cache.
3. **Hotfixes:** phase-reactivity (effect + computeds read `reportingPhaseVersion()` — late/switched phase no longer orphans the cache); **stray `?` in a SQL comment** consumed as a positional placeholder by mysql2 → 500 → empty card (regression test: placeholder count === params).

## 4. Evidence

Server suites 197/1737 + parity spec (meter ≡ matrix over a mixed universe, 14=14; FAIL-input 14 vs 11); client 483/6973+; scoped verifications for hotfixes; `migration:check` clean. Reviewer PASS on T-1 (a1), T-2 (a2), T-3 (a2), hotfix a1 FAIL→a2 items landed under **owner waiver** (Implementer session died at completion; Leader verified scoped-green 23/23 — recorded in execution.md). Leader-inline exception (owner-directed) for the SQL-comment fix — recorded.

## 5. Documented Residuals (legitimate divergence sources, owner-notified)

1. Meter/Results tab apply no `status_id != 4`; the matrix excludes Discontinued (requirements-level inconsistency).
2. Meter INNER JOINs `result_level` (drops null/orphan level rows); matrix doesn't.
3. `loadBilateralRows` (agy's W3 code) has the same phase-reactivity gap → candidate quick.
4. Home cards (`mySciencePrograms`) share the meter endpoint — a bilateral-only SP now shows null totals there (in-scope per W12-R-1; spot-check noted).
5. `?versionId=` empty string → 0 (pre-existing pattern shared with `results.controller.ts`).

## 6. Historical Notes

Budget 3 tasks/~220 LOC/1 round → actual 3 tasks + 3 hotfixes (~420 LOC), 2 rework rounds + 1 waived review. T-1 ∥ T-2 parallel execution worked (disjoint files). The unit-mocked `query` blind spot (couldn't see the placeholder bug) is the run's standout lesson — see kaizen.
