# Proposal — Center Overview by P/A: W3 results, W1/W2 tagging, visible filters

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/center-overview-pa-contribution/` |
| Slug | `center-overview-pa-contribution`, derived from free-text argument (INC-166545 points 6 + 7) |
| Type | **Change** |
| Status | approved 2026-10-27 (owner) |
| Approval Mode | `gated` |
| Owner | Santiago Sanchez |
| Date | 2026-10-26 |
| Ticket | Freshdesk **INC-166545**, points 6 and 7 (Nicoleta Trifa, 26-Oct-2026). Due 30-Oct (this part will not make it; agree a date in the reply) |
| Depends on | the `/akili-quick` for INC-166545 points 3–5 (same `bilateral-overview` files: removes "No new results yet" and "Reporting pace", project titles on "Results by project"). Land it first |
| Parallel-safe | **no** with that quick (same component, charts, specs). **yes** with `bilateral/ai-drafts-bulk-discard` |
| Branch | from `staging`, after the quick lands |
| Requirement prefix (proposed) | `CPA` (Center overview by P/A) |

## 2. Intent

On the Center Overview, show **per Program/Accelerator (P/A)** how the center's W3/bilateral projects are reported: results reported under the P/A, and W1/W2 results of the P/A that tag the center's projects. Make the W1/W2 tagging visible everywhere it is counted, and filterable.

Nicoleta, 26-Oct-2026:

> *(6) "Convert this graph to count results reported under the P/A and results reported by the P/A which tagged the projects."*
>
> *(7) "The overview section for IFPRI indicates that one of their projects has been tagged as contributor to a w1/w2 result but I can't find the project anywhere listed in any of the graphs. Would it be possible to include a few visible filters at the top to filter by P/A, by results reported and by w1/w2 results reported with w3/bilateral projects tagged as contributor?"* — plus a mock "Projects by P/A" grouped bar chart: **# Mapped Projects · # Projects with Reported W3/Bilat Results · # Projects Tagged as Contributors to W1/2 Results**.

## 3. Problem / Current Behavior

Page: `/bilateral/:acronym/overview` (`pages/bilateral/pages/bilateral-overview/`). Row set: `GET api/results/bilateral-center-results?scope=bilateral` (`CWS-R-1`): categories `replicated_w3`, `new_w3`, `w1w2_tagging`.

| Item | Today |
|---|---|
| "Science Program contribution" (`COV-R-10`) | `buildBySpModel` (`bilateral-overview.aggregate.ts:540-572`), `bySpOption` (`bilateral-overview.charts.ts:~285`). Two series: **Projects mapped** (projects whose `sciencePrograms[]` include the SP) vs **Results reported** (rows whose `submitter` = SP). W3 and W1/W2 rows are mixed in "Results reported"; nothing tells them apart |
| W1/W2 tagging KPI | Total card line `w1w2_tagging` (`countCategories`, `aggregate.ts:129`). The rows exist in the payload, but no chart isolates them |
| Row shape limits | **One `project_id` per row** (correlated `LIMIT 1`, prefers a center project: `result.repository.ts:4277-4286`). **One P/A per row** (`submitter` = primary, `initiative_role_id=1`: `:4315-4324`). A W1/W2 result tagging 2 center projects counts once |
| Filters | `overview-controls` (program, project, type, role, source, method) live **inside a popover**, not visible. Applied client-side by `filterCenterResults` (`bilateral-result-filter.ts:31-79`), shared with the Results tab (`COV-R-13`). No filter by category (W3 reported vs W1/W2 tagging) |
| Role filter bug | Tagging rows have `is_leading_result = NULL`; the role filter only accepts 0/1 (`bilateral-result-filter.ts:56-57`), so "Lead" **and** "Contributing" both hide them |
| IFPRI's missing project (unconfirmed) | Likely: (a) its `project_id` is not in `getProjectsByCenter` → counted in `unmatchedProjectRows`, not drawn (`aggregate.ts:504`); (b) outside the top-N bars; (c) only a +1 under its SP, unlabelled. **To confirm with a prod query in specify** |

## 4. Proposed Outcome

1. **"Science Program contribution" → results by P/A** (point 6). One bar group per P/A, two series:
   - **W3/Bilateral results under the P/A** — `replicated_w3` + `new_w3` rows whose primary P/A is that P/A.
   - **W1/W2 results by the P/A tagging center projects** — `w1w2_tagging` rows whose P/A (submitter) is that P/A.
   - Click → Results tab filtered by P/A **and** category (reconciles, `COV-R-13`).
2. **New "Projects by P/A" chart** (point 7, her mock). Grouped vertical bars per P/A, three series:
   - **Mapped projects** (approved `sciencePrograms` mapping — today's "Projects mapped").
   - **Projects with reported W3/Bilat results** (center projects of that P/A with ≥ 1 W3 row).
   - **Projects tagged as contributors to W1/W2 results** (center projects tagged by ≥ 1 W1/W2 result — see `CPA-OQ-1` for which P/A).
   - Reuses the portfolio `projects.charts.ts` grouped-bar builder pattern (`buildProjectsOption`, `:20-52`).
3. **Visible filter bar** at the top of the Overview (point 7): **P/A**, **Result category** (`W3/Bilat reported` · `W1/W2 tagging a center project`) as always-visible selects/chips; the rest of the popover stays. A new `category` key in the shared query contract so the Results tab shows the same rows.
4. **Tagging rows are never invisible**: role filter treats `NULL` as "Contributing" (or "not applicable", `CPA-OQ-3`); a tagging row whose project is outside the center list is counted on the existing "outside this center's project list" line and drill-downs from the KPI land on it.
5. IFPRI: its tagging row is visible in at least the P/A chart, the Projects by P/A chart and the filtered Results tab.

## 5. Scope

| Layer | Item |
|---|---|
| Server | `result.repository.ts` `getResultsByBilateralCenter`: additive field `tagged_center_project_ids` (JSON/CSV) on `w1w2_tagging` rows, so a result tagging several center projects counts each one. No change for unscoped callers (spec asserts it). Pass-through types |
| Client aggregate | `bilateral-overview.aggregate.ts`: `buildBySpModel` → W3 vs W1/W2 split; new `buildProjectsByPaModel` (3 series) |
| Client charts | `bilateral-overview.charts.ts`: new options + a11y tables; reuse grouped-bar pattern from `portfolio-overview/components/projects-block/projects.charts.ts` |
| Client filters | `overview-controls`: visible P/A + category selects; `bilateral-result-filter.ts`: `category` predicate, `NULL` role fix; `bilateral-query-params.ts`: `category` key; Results tab honours it with a removable chip |
| Client page | `bilateral-overview.component.ts/html`: chart wiring, click → deep links |
| Docs | `bilateral-overview/CLAUDE.md`, COV-R-10 note |
| Tests | Aggregate + charts + filter specs, component spec, server repository spec. Jest `--findRelatedTests` on changed files, `--maxWorkers=2`. Live reconciliation on PRTest with IFPRI (`KZ-EVM-1`: a fixture can't prove reconciliation) |

## 6. Non-Goals

- Points 3, 4, 5 of the ticket (handled by `/akili-quick`).
- Point 1 (result Overview section) — declined: it is where the lead project / Primary SP is assigned.
- Point 2 (bulk discard) — separate spec `bilateral/ai-drafts-bulk-discard`.
- Changing what `scope=bilateral` returns (the 3 categories, `CWS-R-1`).
- Counting non-primary P/As of a result (only primary, as today) — unless `CPA-OQ-2` says otherwise.
- The Portfolio Overview projects block and the SP-side Overview.

## 7. Affected Users, Systems, And Specs

| Type | Item |
|---|---|
| Users | Center Users / leads (IFPRI first); Nicoleta (CGIAR SO) reviewing Center Overviews |
| Server | `api/results` (`result.repository.ts`), additive field |
| Client | `pages/bilateral/pages/bilateral-overview/` (+ `components/overview-controls/`), `pages/bilateral/bilateral-result-filter.ts`, `pages/bilateral/bilateral-query-params.ts`, `pages/bilateral/pages/bilateral-results-list/` |
| Specs modified | archive `2026-09-14-bilateral--center-overview-tab`: `COV-R-3` (filters visible), `COV-R-10` (SP chart series), `COV-R-13` (`category` key). `2026-10-21-...center-overview-w3-scope`: `CWS-R-*` reused, unchanged |
| Specs related | `changes/overview-w1w2-contributor-badge` (`BOV2-*`, different figure: W1/W2 non-lead — do not merge), `bilateral/project-overview-metrics` (`BIL-POM-*`) |

## 8. Visual Reference

- Source: **ticket PDF mock** (INC-166545 p.2: "Projects by P/A" grouped bar chart, green / yellow / blue series).
- Location: `C:\Users\santiagosanchez\Downloads\Alliance IT Support new enhancements.pdf` (copy into `docs/specs/bilateral/center-overview-pa-contribution/mockup/` during specify).
- Notes: colors follow `docs/ux-ui/design.md` §7 chart tokens, not the mock's palette.

## 9. Requirement Delta Preview

### ADDED Requirements

- `CPA-R-1`: "Projects by P/A" chart with 3 series per P/A (mapped · with W3 results · tagged by W1/W2), with a11y table and drill-down.
- `CPA-R-2`: Visible P/A and Result category filters at the top of the Overview; applied to every card.
- `CPA-R-3`: `category` key in the shared query contract; the Results tab applies it with a removable chip; each figure equals the drill-down count.
- `CPA-R-4`: `w1w2_tagging` rows carry all tagged center project ids; each project counts once per chart.

### MODIFIED Requirements

- `COV-R-10`: series become **W3/Bilat results under the P/A** and **W1/W2 results by the P/A tagging center projects**. "Projects mapped" moves to the new chart.
- `COV-R-3`: P/A and category filters are always visible, not only in the popover.
- Role filter: `is_leading_result = NULL` rows are not dropped.

### REMOVED Requirements

- "Projects mapped" series from the SP contribution chart (moved, not lost).

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| A. Client only | Build both charts from current rows; tagged project = the row's single `project_id` | No server change, fastest | A W1/W2 result tagging 2+ center projects counts once → series 3 under-counts; IFPRI-type gaps can reappear |
| **B. Additive server field + client (recommended)** | Add `tagged_center_project_ids` to tagging rows; everything else client-side as today | Correct project counts; unscoped callers unchanged; filters stay client-side and shared with Results tab | Small SQL change + repository spec |
| C. New per-P/A aggregate endpoint | Server returns the chart numbers directly | Lightest client | Breaks the "one row set, every figure reconciles" invariant (`COV-R-13`, `CWS-R-2`); filters would have to be re-implemented server-side |

## 11. Recommended Approach

**Option B.** It keeps the Overview's invariant (every figure comes from one row set and drills down to the same rows in the Results tab) and fixes the one real data gap (multi-project tagging). The server change is additive and scoped to `scope=bilateral`.

## 12. Risks, Dependencies, And Open Questions

| ID | Type | Description | Recommendation |
|---|---|---|---|
| `CPA-OQ-1` | Rule (owner) | Series 3 "projects tagged as contributors to W1/W2 results" per P/A: group by the **project's mapped P/A** or by the **P/A that reported the W1/W2 result**? Her mock's IFPRI bar (1, under Sustainable Farming) fits either | Default: P/A that reported the W1/W2 result (matches point 6's "reported by the P/A"). Confirm in the INC-166545 reply |
| `CPA-OQ-2` | Rule (owner) | "Results reported under the P/A": primary P/A only, or any P/A tagged on the result? | Primary only (as today, one P/A per row). Confirm |
| `CPA-OQ-3` | Copy | Role filter label for tagging rows (`NULL`) | Treat as "Contributing" — the center project contributes to a W1/W2 result |
| `CPA-OQ-4` | Scope | Keep the horizontal SP chart and add the vertical Projects chart, or merge into one? | Keep both: one counts **results**, the other **projects**; mixing units in one chart confuses |
| `CPA-RISK-1` | Diagnosis | IFPRI's root cause is a hypothesis | First specify task: prod query for IFPRI's tagging row (project id vs `getProjectsByCenter` ownership rule) — read-only SQL, pasted inline |
| `CPA-RISK-2` | Concurrency | `bilateral-overview.charts.ts` was being edited by another session while this proposal was written (quick for points 3–5) | Land the quick first, rebase this spec on it |
| `CPA-RISK-3` | Regression | `bilateral-result-filter.ts` is shared with the Results tab; the role `NULL` fix changes Results tab counts too | Spec both consumers; `--findRelatedTests` before pushing (memory: folder-scoped Jest missed a consumer) |
| `CPA-RISK-4` | Timeline | Due 30-Oct; this is a multi-day change | Ship the quick (3–5) by 30-Oct; reply with a date for 6–7 |

## 13. Success Criteria

- IFPRI, Reporting 2026: its W1/W2 tagging result appears in the P/A results chart (W1/W2 series), in Projects by P/A (series 3), and in the Results tab when filtered by category = W1/W2 tagging; each count equals the Total card's tagging line.
- Projects by P/A matches a SQL check per P/A for one center (IFPRI or CIP).
- P/A and category filters are visible without opening the popover and change every card.
- Unscoped `bilateral-center-results` response unchanged (server spec).
- Jest green with `--findRelatedTests` on changed files and `--maxWorkers=2`; lint clean on touched files.

## 14. Next Step

```text
/akili-specify bilateral/center-overview-pa-contribution
```
