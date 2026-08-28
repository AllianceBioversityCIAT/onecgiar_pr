# `bugfix/w12-overview-phase-origin-alignment` — Requirements

## 1. Module / Feature

- **Module:** server `results` + `results-framework-reporting`; client `dashboard-lab` (SP Overview)
- **Sub-feature:** W1/W2 Overview figures (Reporting-status meter + category×status matrix) aligned with the Results tab's current-phase + W1/W2 population
- **Owner:** j.cadavid@cgiar.org
- **Status:** approved (2026-08-28, Phase 1 gate — owner "Go")
- **Depth:** Standard (Bug Mode) · **Type:** Bug · **Approval Mode:** gated
- **Linked proposal:** `./proposal.md` — §3 **Bug Diagnosis** is the source of truth (root causes code-confirmed with file:line, 2026-08-28)
- **Base:** commit `🔧 fix(dashboard-lab) : scope W3/bilateral overview figures to the current reporting phase` (agy's W3 fix, committed 2026-08-28) — this spec rhymes with it

## 2. Context

Results tab (SP04, `phase = current`, `origin = W1/W2`) = **11**. Overview W1/W2 meter = **24**, matrix = **23**. Confirmed causes: the meter counts bilateral-origin results (no `r.source` filter; phase already scoped); the matrix additionally counts contributor-role results, scopes by `year` table instead of `version_id`, and uses a different status/type universe. Origin discriminator = `result.source` (`'Result'` = W1/W2, `'API'` = W3/Bilateral). See proposal §3 for every file:line.

## 3. In Scope / Out of Scope

### In scope
- Meter population = W1/W2 origin, current reporting phase.
- Matrix population = W1/W2 origin, primary-submitter role, current reporting phase, same status/type universe as the Results tab; endpoint accepts `versionId`.
- Regression tests red-before/green-after on both sides; cache correctness per phase.

### Out of scope
- W3 cards (fixed by agy); Results tab; multi-open-phase determinism (recorded risk, DB check at execution pre-flight); status-slot redesign beyond OQ-2; migrations.

## 4. Personas Affected

| Persona | What changes |
|---|---|
| SP leaders / reporters on the Overview | W1/W2 figures stop over-counting; they match what the Results tab shows for the current phase |

## 5. User Stories

- **`W12-US-1`** As an SP leader, I want the Overview's W1/W2 numbers to equal the Results tab filtered to the current phase and W1/W2, so that the summary is trustworthy.

## 6. Functional Requirements (corrected behavior)

### Required (MUST)

- **`W12-R-1` Meter population.** `GET get/science-programs/progress` MUST count only W1/W2-origin results (`result.source = 'Result'`) in its per-version status breakdown, keeping the existing current-phase and primary-submitter scoping.

#### Scenario: Bilateral results excluded from the meter (the failing case)
- GIVEN SP04 in the current reporting phase with 11 W1/W2 results (10 Editing, 1 Submitted) and ≥13 bilateral-origin results including 2 in status 5 (Pending Review)
- WHEN the Overview loads the meter
- THEN the meter totals 11 with Editing 10 / Submitted 1 / Pending Review 0
- BUT it must NOT change the W3 meter (fed by `bilateralRows`, a different source) or any other consumer of the progress endpoint's non-status fields
- AND IT MUST keep the phase scoping exactly as today (`r.version_id IN (activeReportingPhase)`)

- **`W12-R-2` Matrix population.** `GET programs/indicator-contribution-summary` MUST count only results with `source = 'Result'`, `results_by_inititiative.initiative_role_id = 1`, `r.version_id = <versionId>`, and `status_id != 4` (Discontinued), with the result-type universe reconciled to the meter's (`excludeType [10, 11]`).

#### Scenario: Matrix matches the Results tab (the failing case)
- GIVEN the SP04 fixture above plus 3 results where SP04 is only a contributor (role 2), 4 results from another version, and 1 bilateral in status 1
- WHEN the summary is fetched for the current `versionId`
- THEN `totalsByType` sums to 11 and per-type/status cells reflect only the 11
- BUT it must NOT count contributor-role rows, other-version rows, or `source = 'API'` rows
- AND IT MUST default `versionId` to the active REPORTING phase (`$_findActivePhase(REPORTING)`) when the query param is absent — never to the `year` table

#### Scenario: Cache is phase-keyed
- GIVEN the Overview cached SP04's summary for version V1
- WHEN the current phase resolves to V2
- THEN a fresh summary is fetched for V2 (cache key includes the version)
- BUT it must NOT serve V1's matrix under V2

- **`W12-R-3` Internal consistency.** After the fix, for the same SP and phase, the meter total MUST equal the matrix total (same universe: origin, role, version, status ≠ 4, type ∉ {10, 11}).

#### Scenario: Meter ≡ matrix
- GIVEN any SP fixture
- WHEN both endpoints are computed over it with the same version
- THEN meter total === Σ matrix `totalResults`
- AND IT MUST hold for a fixture that mixes every excluded class (the parity is over the whole fixture, not one number)

### Should (SHOULD)

- **`W12-R-4` Client passes the phase.** The client SHOULD send the phase-preferring `latestVersion()`'s `versionId` (agy's helper) to the summary endpoint, falling back to server default when null.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Migrations | None. |
| API | One optional query param (`versionId`) on an existing GET; response shape unchanged. |
| Performance | No extra queries; predicates narrow the scans. |
| Security | No auth change; `versionId` validated numeric. |

## 8. Acceptance Criteria

- **`W12-AC-1`** Server Jest: repository/service regression specs with the mixed fixture — **red on current code, green after** — for W12-R-1, W12-R-2 (both scenarios), W12-R-3; full server suite green; lint clean; `npm run migration:check` clean (no migration).
- **`W12-AC-2`** Client Jest: `GET_IndicatorContributionSummary` carries `versionId`; `summariesByCode` keyed by code+version; full client suite green; lint; build.
- **`W12-AC-3`** Static: no secrets/logs of tokens; diff confined to the files in design §2.1.
- **`W12-AC-4`** **Manual (owner):** SP04 Overview W1/W2 meter total = matrix total = Results tab count at current phase + W1/W2 (11 today); W3 cards unchanged; one additional SP spot-checked.

## 9. Defect Classes → Gates

| Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|
| Bilateral leak (origin) | W12-AC-1 fixture with `source = 'API'` rows | Dropping the `source` predicate → total red |
| Contributor leak (role) | Fixture with role-2 rows | Dropping `initiative_role_id = 1` → red |
| Phase leak (version) | Fixture with other-version rows | Year-COALESCE left in place → red |
| Universe mismatch meter↔matrix | W12-R-3 parity spec | Divergent status/type sets → red |
| Stale cache per phase | W12-AC-2 cache spec | Code-only key → red |
| Server/client resolve different "current phase" | **No code gate** — execution pre-flight DB check (`version` rows open for module 1); recorded risk if >1 | — (explicit substitute) |
| Figures vs live data | W12-AC-4 manual | — |

## 10. Dependencies & Assumptions

- Agy's W3 fix committed (base); `latestVersion()` phase-preferring helper exists on the client.
- `$_findActivePhase(REPORTING)` returns the intended phase — assumed single open row (pre-flight check).
- The repo's existing `addInGeneric('r.source', filters?.fundingSource)` path works as read (proposal §3).

## 11. Open Questions

- **OQ-1** Heatmap `'Other'` column: today structurally dead (statuses 1–3 only). **Default: keep the column; it receives real non-1/2/3 statuses once the set widens to `!= 4`.**
- **OQ-2** Meter slot "Not started" (status 5) is bilateral-only → always 0 for W1/W2. **Default: leave slots as-is (renders 0)** — slot redesign out of scope.

## 12. Requirement ID Index

| ID | Summary | Scenarios | Covered by task |
|---|---|---|---|
| W12-R-1 | Meter = W1/W2 origin | Bilateral excluded | W12-T-1 |
| W12-R-2 | Matrix = origin + role + version + universe | Matrix matches · Cache phase-keyed | W12-T-2 |
| W12-R-3 | Meter ≡ matrix | Meter ≡ matrix | W12-T-3 |
| W12-R-4 | Client passes phase | — | W12-T-2 |

## Required cross-references
- `./proposal.md` §3 (diagnosis, file:line) · agy's W3 fix commit (pattern) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (status vocabulary) · `docs/trd/trd.md` (results module).
