# Change Proposal — "View reported results" as a results table for one indicator

**Answer first:** today the row menu's **View reported results** opens the indicator drawer on the *Report* tab (`dashboard-lab.component.ts:3595` passes `'report'`), and the results that were actually reported against the indicator live one tab over, on *Info*, as a stack of cards with three fields (title, code, contribution). Proposal: give the drawer a third tab, **Results**, that renders those results as a real table with the Results-tab vocabulary — **Code · Result · Category · Status · Contribution · Phase** — make the menu action land there, widen the drawer to a table-friendly preset while that tab is open, and let a row open the result. The data already exists (`GET api/results-framework-reporting/existing-result-contributors`); the change is one drawer tab, one small additive payload extension, and one corrected wiring line.

## 1. Document Control

| Field | Value |
|---|---|
| Type | **Change** |
| Spec path | `changes/indicator-reported-results` |
| Slug | `indicator-reported-results` — derived from free-text argument (*"view reported results de un indicator … tipo tabla como la tabla de results"*) |
| Approval Mode | `pre-approved (j.cadavid, standing feedback 2026-09-02 "pragmatic AKILI" — applied as default; flip to gated on request)` |
| Module | `result-framework-reporting` — client `pages/dashboard-lab/components/indicator-drawer` (+ one line in the host); server `results-framework-reporting` query `get-existing-result-contributors` (additive fields only) |
| Branch | `qa-development-2026` |
| Depends on | none |
| Parallel-safe | **partly** — the drawer component is untouched by other active specs; the one host line (`onReportingOpenAchieved`) sits in `dashboard-lab.component.ts`, the file every dashboard-lab spec edits. One session per checkout (root `CLAUDE.md` Concurrency; recurrence `KZ-MRF-3`) |
| Reported by | j.cadavid@cgiar.org, 2026-09-03, screenshot of the row menu on SP01 / AOW01 / HL04 |
| Model routing | T1 phase; session model (Fable 5.1) exceeds the registry's `opus` entry — flagged, no downgrade |

## 2. Intent

A submitter or program lead looking at one KPI row in the Reporting table wants to answer, in one click, *"which results were reported against this indicator, what state are they in, and how much did each contribute?"* — and to jump into any of them. The answer should look and behave like the program's **Results** tab (a scannable table with status pills), not like a card feed.

## 3. Problem / Current Behavior

| What | Today | Where |
|---|---|---|
| Menu action **View reported results** | opens the drawer on the **Report** tab (the form), not on the reported list | `dashboard-lab.component.ts:3595` `manageIndicator(row, hlo, 'report')` |
| The reported list | card stack under *Info → Reported results*: title, code chip, `official_code`, `contribution N` — no status, no category, no phase, no link to the result, no sorting | `indicator-drawer.component.html:145-190` |
| Data source | `GET existing-result-contributors?resultTocResultId&tocResultIndicatorId` → `{ contributors[] }` with `result_id, title, result_code, status_name, status_id, version_id, role_id, contributing_indicator` | `results-api.service.ts:1475`; server `existing-result-contributors.mapper.ts` |
| Population | only results in **Quality Assessed** or **Approved** (`status_id IN (…)` in the loader) — Editing / Submitted contributions never appear | `existing-result-contributors-loader.service.ts:48-57` |
| Legacy precedent | the previous AoW design had exactly this table (`Code · Title · Status · Achieved value`) in `AowViewResultsDrawerComponent` (`entity-aow/…/aow-view-results-drawer`), using the same endpoint | reusable pattern, not reusable code (old shell, `any`-typed) |

So the user clicks a menu item named *View reported results* and lands on a form; the list they wanted is two clicks away and does not show the two facts a Results-style table would lead with — **status** and **a way in**.

## 4. Proposed Outcome

- **New drawer tab `results`** ("Reported results", icon `fact_check`) between *Report* and *Info*. It renders an `app-pr-table` with the Results-tab column vocabulary:

  | Column | Source | Notes |
  |---|---|---|
  | Code | `result_code` | monospace, links like the Results tab |
  | Result | `title` | 2-line clamp, `title` attr with full text |
  | Category | `result_type_id` → name | client enum map (`ResultTypeEnum`) or server `result_type_name` — decide in specify |
  | Status | `status_id` / `status_name` | the same fg/bg pill pairs as the Results tab (`STATUS_TOKENS`, verbatim from `result-header`) |
  | Contribution | `contributing_indicator` | tabular-nums, right-aligned; header shows `Σ contribution of target` |
  | Phase | `version_id` → phase name | via `PhasesService` (already injected in the host) |
  | Actions | row menu | **Open result** (Result Detail with `?phase=version_id`, same route rule as `programme-results.resultRoute()`), **Copy link** (absolute URL, `globalUserNotification` toast) |

- **Header strip** above the table: `N results reported · Σ contribution X of target Y`, reconciled with the row's ACHIEVED figure on the Reporting table; if the two disagree (see OQ-1) the strip discloses it in a `title`.
- **Menu wiring:** *View reported results* → `manageIndicator(row, hlo, 'results')`. *Report* button and *Target details* unchanged.
- **Drawer width:** while the `results` tab is active the drawer opens at `max(current, 760px)` (the existing drag handle and `widthChange` persistence stay); leaving the tab restores the user's width. Below 640 px viewport the table degrades to the current card layout (keep the cards as the narrow variant, not as a second design).
- **Empty state** keeps today's copy and CTA (*Nothing reported against this indicator yet → Report the first result*), which switches to the *Report* tab.
- **Info tab** loses the card list (it moves to *Results*) and keeps *Target* and the metadata.
- **Sorting** by Code / Status / Contribution / Phase through `prSortableColumn` (the table owns sort, per the Results-tab contract); a search box only when the list exceeds 8 rows.

## 5. Scope

- Client: `indicator-drawer` (new tab, table, header strip, width preset, empty/loading states), `DrawerTab` union, one line in `dashboard-lab.component.ts`, `results-api.service` typing of the response.
- Server (additive): `existing-result-contributors.mapper.ts` gains `result_type_id` (already selected), optional `result_type_name`, `phase_name`; nothing removed, no new endpoint.
- Tests: drawer DOM tests (tab, columns, pills, empty state, navigation, copy link), host wiring test, mapper unit test; one Cypress CT for the width preset (layout-shaped gate — jsdom cannot see widths).
- Folder guide update for `indicator-drawer`.

## 6. Non-Goals

- No change to the program **Results** tab, its filters, Columns picker or CSV export.
- No "filter the Results tab by indicator" deep link — the results list payload carries no ToC indicator (P2-3395 / P2-3399, server-hard gap); out of scope here.
- No server-side pagination or new endpoint; no bulk actions; no editing from the table.
- No change to what counts as *achieved* on the Reporting row (`actual_achieved_value_sum`) — only disclosure if it differs (OQ-1).
- Overview tab and hub untouched.

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Submitter | one click from a KPI row to the list of results behind it, with status and a way in |
| Program lead / PMU | can audit contributions per indicator without leaving the Reporting table |
| `indicator-drawer` (MRF, `changes/mass-reporting-flow`) | gains a tab; *Report* flow untouched |
| `reporting-aow-table` | template unchanged (menu label already correct); only the host handler's tab argument changes |
| Server `results-framework-reporting` | mapper extended additively; loader status filter unchanged unless OQ-1 says otherwise |
| Related archived specs | `mass-reporting-flow` (drawer), `results-table-resizable-columns` / `programme-results` (column vocabulary + `STATUS_TOKENS` precedent), `reporting-aow-jira-hierarchy` (row menu) |

## 8. Visual Reference

- Source: **Self-contained HTML mockup** + user screenshot of the current row menu (2026-09-03).
- Location: `docs/specs/changes/indicator-reported-results/mockup/reported-results-drawer.html` (drawer at 760 px with the Results tab, header strip, table, row menu, and the empty-state variant).
- Notes: the mockup reuses the shell's violet accent and the Results-tab status pill pairs; it is a layout/intent sketch, not pixel truth — `docs/ux-ui/design.md` §7 tokens and §8 component rules govern.

## 9. Requirement Delta Preview

### ADDED Requirements
- A `results` tab in the indicator drawer rendering reported results as a table (columns above) with sortable headers, status pills, contribution figures and a phase column.
- Row actions **Open result** and **Copy link** with the same route rule as the Results tab.
- A header strip `N results · Σ contribution of target`, with disclosure when it diverges from the row's ACHIEVED figure.
- Drawer width preset ≥ 760 px while the `results` tab is active; narrow-viewport card fallback.
- Additive payload fields (`result_type_id`/`result_type_name`, `phase_name`) on `existing-result-contributors`.

### MODIFIED Requirements
- **View reported results** opens the drawer on the new `results` tab (today: `report`).
- The *Info* tab no longer lists reported results (moved to *Results*); it keeps Target and metadata.

### REMOVED Requirements
- None. The legacy `AowViewResultsDrawerComponent` (old AoW pages) is not touched.

## 10. Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| **A** | **Table as a third drawer tab** (`results`), drawer widens to a table preset | keeps the user in context of the Reporting table; reuses the drawer, the endpoint, `app-pr-table` and the Results-tab pill tokens; smallest diff; *Report the first result* CTA stays one tab away | a 760 px drawer covers most of the table on laptops (mitigated by the existing scrim + drag handle) |
| B | Dedicated full-width modal (legacy `AowViewResultsDrawerComponent` pattern) | more room for columns | a second surface for the same indicator (drawer *and* modal), contradicts design §6 "drawer for side-by-side review"; duplicates header/target context |
| C | Deep link to the **Results** tab filtered by indicator | one table for everything | the results list payload has no ToC indicator (P2-3395/3399); needs a server change to `get/all/roles/filter` and a new filter on a surface with open product questions (P2-3400) — cross-module, weeks not days |

## 11. Recommended Approach

**Option A.** It fixes the mislabelled action, puts the table where the user already is, and spends the budget on the table itself rather than on a new surface or a cross-module payload change. Estimated: Standard depth, 4–5 tasks, ≈250 LOC source + tests.

## 12. Risks, Dependencies, And Open Questions

- **OQ-1 — Which statuses count as "reported"?** The loader returns only *Quality Assessed* and *Approved* results, while the Reporting row's ACHIEVED figure comes from `actual_achieved_value_sum` (server roll-up). If a Submitted or Editing result already carries a contribution, the table's Σ will be lower than the row's ACHIEVED. Options: (a) keep the filter and disclose the difference; (b) include Submitted/Editing with their pills so the table explains the number. **Recommendation: (b)** — the whole point of a status column is to show the pipeline; confirm with the product owner.
- **OQ-2 — Category source:** client-side `ResultTypeEnum` map vs server `result_type_name`. Client map is zero server risk; server name is authoritative. Specify decides.
- **Risk — width preset vs the user's saved width:** the preset must not overwrite the persisted drag width; apply it as a floor while the tab is active only.
- **Risk — `dashboard-lab.component.ts` contention:** one line, but the file is edited by every dashboard-lab spec; land it in a single commit and rebase if another spec is mid-flight.
- **Dependency:** none blocking. `PhasesService` and `STATUS_TOKENS` already exist; `app-pr-table` is the shared table.

## 13. Success Criteria

1. From any KPI row, **View reported results** shows the table in one click; no form is shown first.
2. Every result the endpoint returns appears as one row with Code, Result, Category, Status pill, Contribution and Phase; the header strip's Σ equals the sum of the Contribution column.
3. Clicking a row (or *Open result*) opens Result Detail for that code with the right `?phase`; *Copy link* copies the same URL.
4. Drawer width ≥ 760 px while the tab is active; the user's dragged width is preserved when leaving the tab; below 640 px the card fallback renders.
5. Empty state shows the existing CTA and switches to *Report*.
6. Jest DOM tests cover 1–3 and 5; one Cypress CT covers 4.

## 14. Next Step

```text
/akili-specify changes/indicator-reported-results
```

Standard depth, Change track. Specify resolves OQ-1/OQ-2 first (one question to the product owner), then writes `requirements.md`, `design.md`, `tasks.md`.
