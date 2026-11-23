# Design — Portfolio Overview graphs clarity (PGC)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-graphs-clarity/` |
| Depth | Lite (re-checked in §11) |
| Requirements | `requirements.md` PGC-R-1..R-6, PGC-NFR-1..4 |
| Code read at | `origin/master` `e4f090b05` |
| Skills | `nestjs-expert` (server), `angular-developer` (client); no new UI surface, so no `impeccable-bridge` direction round |
| Status | approved, 2026-11-23 (owner, gated: Phase 1 continue, Phase 2 continue without judgment-day, Phase 3 continue) |

## 2. Executive Summary

- **Server (PGC-R-4, R-5):** the project facts query returns one more column per project, the P/A codes its qualifying W3 results name. The service counts per-P/A "With W3/Bilateral results" from that column and keeps every other count on the CLARISA mapping. Response shape unchanged.
- **Client colours (PGC-R-3):** the projects chart gets its three colours from a local resolver (like the Typology block), not from the purple ramp: Mapped = `--pr-chart-1`, With W3/Bilateral results = `--pr-color-green-600`, Contributing to W1/W2 = `--pr-color-orange-700`, keeping its stripes.
- **Client copy (PGC-R-1, R-2, R-6):** four strings in `portfolio-overview.copy.ts` and one new `<li>` in the Typology key.

## 3. Architecture Overview

No new module, endpoint or table. Data path unchanged: `projects-block` → `GET …/portfolio/bilateral-projects` → `ResultsFrameworkReportingService.getPortfolioBilateralProjects` → `ClarisaProjectsRepository.getPortfolioProjectFacts` (one SQL). Only the SQL's select list and the service's per-P/A loop change.

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` | `PortfolioProjectFactsRow.namedProgramCodes: string[]`; new correlated sub-select `named_program_codes` |
| `…/clarisa-projects/clarisa-projects.repository.spec.ts` | Binding order + mapping of the new column |
| `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts` | Per-P/A loop split (DD-2) |
| `…/results-framework-reporting.service.spec.ts` | Scenarios 4.1–4.6, 5.1 |
| `…/dto/portfolio-bilateral-projects.dto.ts` | Swagger description of `withBilateralResults` on the by-P/A row |
| `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` | `barKey.singleBar`, `centerNote`, `projects.subtitle`, `projects.multiProgramCaption` |
| `…/typology-block/typology-block.component.html` (+ spec) | One `<li>` in `typology-bar-key` |
| `…/projects-block/projects.charts.ts` (+ spec) | `buildProjectsOption` takes a `ProjectsSeriesColours` argument instead of reading `tokens.ramp` |
| `…/projects-block/projects-block.component.ts` (+ spec) | Resolves the three colour tokens and passes them |
| `…/portfolio-overview/CLAUDE.md` | W3/Bilateral projects + Typology notes |

## 5. Data Model

No schema change. Read-only use of existing tables: `results_by_inititiative` (`inititiative_id`, `initiative_role_id`, `is_active`), `share_result_request` (`shared_inititiative_id`, `request_status_id`, `is_active`), `clarisa_initiatives` (`id`, `official_code`).

## 6. API Design

`GET api/results-framework-reporting/portfolio/bilateral-projects`: same route, guard, query and shape (PGC-NFR-1). Only the meaning of `byProgram[*].withBilateralResults` changes; the DTO description says so. Not a `/api/bilateral/*` contract, so no bilateral change log entry.

## 7. Backend Module Design

**Query (`getPortfolioProjectFacts`).** Add `named_program_codes`: `GROUP_CONCAT(DISTINCT TRIM(ci.official_code))` over the project's qualifying W3 results (exact same filter as `has_bilateral`: active `results_by_projects`, active result, `source = 'API'`, same version, not Discontinued), joined to the union of:

1. `results_by_inititiative` active rows with role 1 or 2 → `inititiative_id`;
2. `share_result_request` active rows with status 1, 2 or 4 → `shared_inititiative_id`.

Then `clarisa_initiatives` by id for `official_code`. Every value bound, appended to `params` in placeholder text order (the existing comment above the method is updated). Mapped like `approved_program_codes` (split, trim, drop blanks).

**Service (`getPortfolioBilateralProjects`).** For a project with ≥ 1 approved mapping (the block's universe, unchanged):

- totals: unchanged (`addProject(totals, hasBilateral, hasW1w2)`);
- each **approved** code in the seed: `mapped += 1`, `w1w2Contributors += hasW1w2` (unchanged);
- each **named** code in the seed (deduped by `normaliseCode`): `withBilateralResults += 1`;
- by Center + unmapped: unchanged.

Projects with no approved mapping stay outside every P/A row (Scenario 4.5).

Backend route: lead `nestjs-expert` (repository + service in an existing module; no new pattern).

## 8. Frontend / UX Component Architecture

- **Typology key:** a third `<li data-testid="typology-bar-key-single">` before the counts hint, muted text, no swatch. Text: "A row with only one bar has results in only one of the two groups."
- **Center footnote:** `centerNote` text from PGC-R-2, same element and test id.
- **Projects colours:** `projects-block.component.ts` resolves `{ mapped, withBilateral, w1w2 }` from `--pr-chart-1`, `--pr-color-green-600`, `--pr-color-orange-700` with the same `getComputedStyle(...).getPropertyValue(...)` + `var(token)` fallback used in `typology-block.component.ts:42-51`. `buildProjectsOption(rows, tokens, labels, colours)` uses them; `tokens` still supplies text and border colours. W1/W2 keeps the stripe decal as a second cue (green vs orange is a weak pair for red-green colour blindness).
- **Projects copy:**
  - `subtitle(year)`: "Projects mapped to a Program or Accelerator for {year}. Per Program/Accelerator, \"With W3/Bilateral results\" counts the projects whose W3/Bilateral results name it as primary or contributing."
  - `multiProgramCaption`: "A project counts under every P/A it is mapped to and every P/A its results name, so a P/A can show more projects with results than mapped projects, and the bars add up to more than the total."

## 9. Shared Contracts

`PortfolioProjectFactsRow` gains `namedProgramCodes` (server-internal). The client interface `portfolio-bilateral-projects.interface.ts` is unchanged.

## 10. Design Decisions

| DD | Decision | Why | Rejected |
|---|---|---|---|
| PGC-DD-1 | Contributing = role-2 link **or** request in status 1/2/4; declined (3) and inactive never | W3 ingestion only writes drafts (4); a later accept writes role 2; owner decision OQ-2 | Only accepted (would drop nearly every W3 contributor, since ingestion leaves them as drafts) |
| PGC-DD-2 | Per-P/A `withBilateralResults` from named codes; `mapped` and `w1w2Contributors` stay on approved mapping | Ticket asks only about "with W3/bilat results"; changing W1/W2 too is unrequested | Re-basing the whole row on named codes |
| PGC-DD-3 | Universe stays "projects with ≥ 1 approved mapping" | Keeps per-P/A ≤ the KPI total and keeps the unmapped footnote true | Counting unmapped projects in P/A rows (footnote would then be false) |
| PGC-DD-4 | One extra correlated sub-select in the same query, not a second query | Same round trip; the facts row already has three sub-selects per project | A second query joined in memory |
| PGC-DD-5 | Colours resolved in the component, not added to `chart-tokens.util` | That util is fenced to the ramp + neutrals (`chart-tokens.util.ts:3`) and shared; Typology already resolves `--pr-color-*` locally | Extending `ResolvedChartTokens` (touches every chart consumer) |
| PGC-DD-6 | Green-600 / orange-700, stripes kept on W1/W2 | Contrast on `--pr-surface-card` `#ffffff`: `#4a2bb8` 9.02:1, `#188d45` 4.26:1, `#c2410c` 5.18:1 (computed 2026-11-23, WCAG formula) — all ≥ 3:1. Orange-600 is 3.56:1, kept out for margin | Blue-600 (too close in hue to the purple Mapped bar) |

**Reversion challenge (Step 2.3), PGC-DD-2.** It replaces delivered WPS behaviour (mapping-based per-P/A count). Question: what does removing it break? Readers of `byProgram[*].withBilateralResults` (P-6): the chart series, the table cell (`projects-block.component.html:129`) and specs. The `% of mapped` hint reads **totals only** (`projects-block.component.ts:64`), so no per-row percentage can exceed 100 %. Breakage found: the old caption implied bars come only from mappings, fixed by PGC-R-6. Nothing else.

## 11. Budget

| Item | Estimate |
|---|---|
| Tasks | 3 |
| LOC | ~260 (server ~50 + ~110 tests; client ~40 + ~60 tests) |
| Review rounds | 4 |

Matches Lite + three tasks; no change of depth.

## 12. Premise Ledger

Count: 9 verified, 2 `UNVERIFIED` (1 High, 1 Low).
Blast-radius triggers: `consumer` (response field meaning, exported `buildProjectsOption`, copy keys, DOM hooks) and `shared-state` (the facts row feeds totals, by Center and unmapped). `live-path` fired (user opens `/portfolio-overview`).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Per-P/A `withBilateralResults` comes from approved mapping codes only | location | `results-framework-reporting.service.ts` loop `for (const code of codes) … addProject(counts, row.hasBilateral, row.hasW1w2)`, `codes` from `row.approvedProgramCodes` | e4f090b05 | No change needed, spec moot — High | — |
| P-2 | W3 ingestion stores contributors as `share_result_request` status 4 with `shared_inititiative_id` | location | `bilateral.service.ts:1662` (`REQUEST_STATUS_CONTRIBUTING = 4`), `:1700-1730` | e4f090b05 | DD-1 misses contributors — High | — |
| P-3 | Request status ids: 1 Pending, 2 Accepted, 3 Declined, 4 Draft | data-env | `share-result-request/services/primary-program-request.service.ts:64-72` | e4f090b05 | DD-1 filter wrong — High | — |
| P-4 | Primary = `results_by_inititiative` role 1; accepted contributor = role 2; FK column `inititiative_id` joins `clarisa_initiatives.id` | location | `bilateral-resubmission.service.ts:397-402`; `git grep "INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id"` → service line 1120 | e4f090b05 | SQL joins wrong — High | — |
| P-5 | Live path: page → `projects-block.component.ts` `GET_PortfolioBilateralProjects` → controller `portfolio/bilateral-projects` → `getPortfolioBilateralProjects` → `getPortfolioProjectFacts` (single caller) | live-path | `git grep -l -E "getPortfolioProjectFacts\|PortfolioProjectFactsRow" origin/master -- onecgiar-pr-server` → repository (+spec), service (+spec), `approved-mapping-statuses.constants.ts` (comment only); POD proposal P-7 | e4f090b05 | Change lands off the screen — High | — |
| P-6 | Consumers of `withBilateralResults` / `buildProjectsOption` / changed copy keys / test ids | consumer | `git grep -n -l -E "buildProjectsOption\|centerNote\|barKey\|multiProgramCaption\|projects\.subtitle\|typology-bar-key\|typology-center-note" origin/master -- onecgiar-pr-client` → copy file, portfolio-overview `CLAUDE.md`, projects-block `.html/.ts/.spec.ts`, `projects.charts.ts/.spec.ts`, typology-block `.html/.spec.ts`; plus `hlm-sidebar.service*`/`hlm-sidebar.token.ts` (false positive on `barKey`, different symbol). Cypress/tests: `git grep -l -E "typology-bar-key\|typology-center-note\|projects-block\|portfolio-overview" origin/master -- onecgiar-pr-client/cypress onecgiar-pr-client/tests` → 0 | e4f090b05 | Unswept specs break — Low | — |
| P-7 | `% of mapped` is computed from totals only | consumer | `projects-block.component.ts:64` `shareOfMapped(this.totals().withBilateralResults, this.totals().mapped)` | e4f090b05 | A per-row percent > 100 % appears — Low | — |
| P-8 | The facts row feeds totals, per-P/A, by Center and unmapped in one loop | shared-state | `getPortfolioBilateralProjects`: `addProject(totals…)`, `countsByProgram`, `centerBuckets`, `unmappedWithBilateralResults` in the same `for (const row of rows)` | e4f090b05 | R-5 side effects — High | — |
| P-9 | Card background is `#ffffff` and has no dark-mode override in the client styles | data-env | `grep -rn -E "\-\-pr-surface-card:" onecgiar-pr-client/src/styles*` → `colors.scss:185` only | e4f090b05 | DD-6 contrast must be re-checked on a dark surface — Low | — |
| P-10 | The new SQL runs on prod MySQL and the per-P/A figures move only on `withBilateralResults` | data-env | `UNVERIFIED — confirm at source before relying on it` | — | Query error or R-5 broken in prod — High | PGC-T-1 HITL: owner runs the read-only check query on PRTest (then PROD) |
| P-11 | Accepted W3 contributions also exist as role-2 rows (so the role-2 arm is needed, not only status 4) | data-env | `UNVERIFIED — confirm at source before relying on it` | — | Role-2 arm is harmless dead weight — Low | PGC-T-1 HITL query (count of W3 results with role 2) |
