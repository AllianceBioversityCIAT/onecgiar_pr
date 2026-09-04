# Requirements — Indicator "Reported results" table (`changes/indicator-reported-results`)

**Answer first:** the Reporting-table row menu's **View reported results** must open the indicator drawer on a new **Reported results** tab that lists every result contributing to that indicator as a table — Code · Result · Category · Status · Contribution · Phase — with a way into each result, a header strip that reconciles with the row's ACHIEVED figure, and a drawer wide enough to read it. Today the action opens the *Report* form and the list is a three-field card stack on *Info* (`proposal.md` §3).

## Document Control

| Field | Value |
|---|---|
| Type | **Change** |
| Depth | **Standard** — one new drawer tab + table, one additive server field and one opt-in query param, five tasks |
| Approval Mode | `pre-approved (j.cadavid, standing feedback 2026-09-02 "pragmatic AKILI" — applied as default; Phase gates logged as auto-approved)` |
| Module | `result-framework-reporting` — client `pages/dashboard-lab/components/indicator-drawer` (+ one host line); server `results-framework-reporting` query `get-existing-result-contributors` |
| Requirement prefix | `IRR` |
| Owner | Reporting product owner (j.cadavid@cgiar.org) |
| Status | `approved` — Phase 1 gate: *auto-approved (pre-approved mode)* |
| Proposal | `proposal.md` (same folder) — followed; OQ-1 resolved in `IRR-R-3`, OQ-2 in `IRR-R-2.2` |
| Visual reference | `mockup/reported-results-drawer.html` (self-contained sketch) + user screenshot of the row menu, 2026-09-03 |
| Model routing | T1; session model exceeds the registry `opus` entry — flagged, no downgrade |

## 1. Module / Feature

- **Module:** `result-framework-reporting`
- **Sub-feature:** Indicator drawer — *Reported results* tab
- **Status:** `approved`

## 2. Context

On the Program shell's **Reporting** tab (`docs/ux-ui/design.md` §4 *Result Framework Reporting*; TRD §2 `result-framework-reporting` → `api/results-framework-reporting/*`) every KPI row has a `…` menu with **View reported results**. The host handler passes `'report'` to `manageIndicator()`, so the drawer opens on the create form; what was reported lives on the *Info* tab as cards without status, category, phase or a link. The archived `changes/mass-reporting-flow` made the drawer "the only surface for Target and Reported results" (`indicator-drawer/CLAUDE.md` *Trampas*), so the fix belongs inside the drawer.

The data is served by `GET api/results-framework-reporting/existing-result-contributors?resultTocResultId&tocResultIndicatorId` → `{ response: { contributors[] } }` with `result_id, title, result_code, status_name, status_id, version_id, role_id, contributing_indicator`. Its loader restricts results to *Quality Assessed* and *Approved*. The client's **Results** tab (`programme-results`) defines the column vocabulary and the status pill pairs this spec borrows.

PRD links: **US-P1** (a dashboard a lead can trust), **G1** (submission completeness — seeing which results back an indicator's achievement), **AC-5** (phase scoping: rows carry their `version_id`).

## 3. In Scope / Out of Scope

### In scope
- A third drawer tab, **Reported results**, with a sortable table of contributing results and row actions.
- The menu action **View reported results** landing on that tab; the drawer's "See them in detail" link too.
- A header strip (count, Σ contribution, target) with a disclosure when it does not match the row's ACHIEVED figure.
- An opt-in `scope=all` query parameter on the existing endpoint (drafts and submitted results included) and an additive `result_type_name` field. Default endpoint behaviour unchanged.
- Drawer width floor while the tab is active; card fallback on narrow widths.
- The *Info* tab keeps Target and the per-Center split; its card list moves to the new tab.

### Out of scope
- The program **Results** tab, its filters, Columns picker, CSV export; any "filter Results tab by indicator" deep link (P2-3395 / P2-3399).
- Server-side pagination, a new endpoint, bulk actions, editing from the table.
- The meaning of ACHIEVED on the Reporting row (`actual_achieved_value_sum`, server roll-up) — only disclosed, never recomputed.
- Overview tab, hub, legacy `AowViewResultsDrawerComponent` (old AoW pages).
- i18n keys — the shell is English-only today, consistent with its siblings.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | one click from a KPI row to the results behind it, with status and a link; sees drafts already started against the indicator before creating a duplicate |
| PMU / program lead | can audit which results (and in which state) make up an indicator's achievement without leaving the Reporting table |
| QA reviewer | unchanged |
| Platform admin | unchanged — no config, no roles |

## 5. User Stories

- **`IRR-US-1`** — As a submitter, I want *View reported results* to show me a table of the results reported against this indicator, so that I can open the right one instead of hunting through the Results tab. *(Refines US-P1)*
- **`IRR-US-2`** — As a program lead, I want each row to show status, category, contribution and phase, so that I can explain the indicator's ACHIEVED figure from its parts. *(Refines US-P1, G1)*

## 6. Glossary

| Term | Definition |
|---|---|
| **Contributing result** | A result whose `results_toc_result_indicators` row points at this indicator (`toc_results_indicator_id = indicator.related_node_id`) and is active |
| **Contribution** | Σ of the result's active `contributing_indicator` target values for this indicator (server mapper `sumContributingIndicatorForTocIndicator`) |
| **Reviewed scope** | Contributing results in status *Quality Assessed* (2) or *Approved* (6) — today's endpoint default |
| **All scope** | Contributing results in status *Editing* (1), *Quality Assessed* (2), *Submitted* (3), *Pending Review* (5) or *Approved* (6) — i.e. excluding *Discontinued* (4), *Rejected* (7) and *Draft* (8) |
| **Row ACHIEVED** | `actual_achieved_value_sum` shown on the Reporting-table row (server roll-up; not recomputed here) |
| **Table width** | Drawer width ≥ 640 px → table layout; below → card layout |

## 7. Functional Requirements

### Required (MUST)

- **`IRR-R-1` Menu lands on the tab.** **View reported results** MUST open the indicator drawer on the *Reported results* tab. The **Report** button and **Target details** keep their current tabs. The host's `initialTab` always wins (the drawer's per-indicator reset marks the tab as touched, so its "something already reported → switch tab" branch is dormant); that dormant branch MUST be retargeted to *Reported results* so it can never land on *Info* if it is ever revived.
- **`IRR-R-2` The table.** The tab MUST render every contributing result as one table row with the columns **Code · Result · Category · Status · Contribution · Phase** plus a row-actions cell, in that order.
  - **`IRR-R-2.1`** Status MUST render as a pill using the same foreground/background token pairs as the Results tab (`--pr-status-*-fg/bg`; unknown status → the *not-started* pair). Never a fifth colour, never a recombined pair.
  - **`IRR-R-2.2`** Category MUST show the result type **name** supplied by the server (`result_type_name`); when absent it shows `—`, never the numeric id. *(Resolves proposal OQ-2.)*
  - **`IRR-R-2.3`** Phase MUST show the reporting phase name resolved from `version_id` against the client's phase list; when unresolved it shows the raw `version_id`.
  - **`IRR-R-2.4`** Contribution MUST render right-aligned with tabular numerals; `null` renders `—`.
  - **`IRR-R-2.5`** Result MUST clamp to two lines and carry the full title in `title`.
- **`IRR-R-3` Population = all scope, status visible.** The tab MUST request the endpoint with `scope=all` and show every result in *All scope*, each with its status pill, so the reader sees the pipeline behind the number. *(Resolves proposal OQ-1 as option b.)*
  - **`IRR-R-3.1` Endpoint default unchanged.** Without `scope`, or with any value other than `all`, the endpoint MUST return exactly today's *Reviewed scope*; every existing caller is unaffected.
  - **`IRR-R-3.2`** The drawer's *Report*-tab preview ("N results already reported…") MUST read the same list as the tab (one request per indicator open, not two).
- **`IRR-R-4` Header strip.** Above the table the tab MUST show `N result(s) reported · Σ contribution X of target Y`, where X = Σ Contribution over the rows and Y = the indicator's `target_value_sum`.
  - **`IRR-R-4.1`** When X ≠ the row ACHIEVED figure, the strip MUST carry a `title` disclosing both numbers and the reason class (*"Achieved on the row counts reviewed results only"* / *"… counts contributions from other phases"* — wording in design §6.3), never silently.
- **`IRR-R-5` A way in.** Clicking a row, pressing Enter/Space on a focused row, or choosing **Open result** in the row menu MUST navigate to Result Detail for that result with `?phase=<version_id>`, using the same route rule as the Results tab (non-AVISA `W3/Bilaterals` results that are not *Approved* open the bilateral review drawer instead). **Copy link** MUST copy the absolute URL of that same destination and toast on the `globalUserNotification` key.
- **`IRR-R-6` Sorting.** Code, Status, Contribution and Phase headers MUST be sortable (click and Enter), with `aria-sort` reflecting the active column; default order Contribution descending, then Code.
  - **`IRR-R-6.1`** When the list holds more than 8 rows a search box MUST filter rows by code or title (case-insensitive, substring); with 8 or fewer it is not rendered.
- **`IRR-R-7` States.** Loading → skeleton rows (3); empty → the existing empty-state copy and **Report the first result** CTA switching to the *Report* tab; endpoint error other than 404 → *"Could not load reported results"* with a **Retry** control; 404 → treated as empty (existing contract).
- **`IRR-R-8` Room for a table.** While the *Reported results* tab is active the drawer width MUST be at least **760 px** (raised on entering the tab if narrower, `widthChange` emitted); leaving the tab MUST restore the width the user had; the drag handle keeps working on the tab. The floor MUST never exceed the drawer's existing viewport clamp (`min(1100, viewport − 320)`).
  - **`IRR-R-8.1` Narrow fallback.** When the drawer width is below **640 px** (phone sheet, or a very narrow drag) the rows MUST render as the current card layout (title, code chip, status pill, contribution) instead of the table; the header strip and actions remain.
- **`IRR-R-9` Info tab keeps its job.** *Info* MUST keep *Target*, *Achieved so far* and *Split by year and Center*; its *Reported results* card list is removed (moved to the tab). The *Report* tab's compact preview stays and its **See them in detail** link switches to *Reported results*.
- **`IRR-R-10` Accessibility.** The table MUST use `<table>` semantics with `scope="col"` headers; rows MUST be focusable (`tabindex="0"`) with a visible focus ring; the row menu MUST use `role="menu"` / `menuitem` and close on Escape; the drawer title/icon MUST change to *Reported results* / `fact_check` on the tab.

### Should (SHOULD)
- **`IRR-R-11`** The strip's count SHOULD split by status when more than one status is present (`3 results · 2 quality assessed · 1 editing`) — one line, no chart.

### Could (MAY)
- **`IRR-R-12`** Ctrl/Cmd-click or middle-click on a row MAY open the result in a new tab (same URL as Copy link).

### Scenarios

#### `IRR-R-1` — Menu lands on the tab
- GIVEN the Reporting table for SP01 with indicator `#12` (HL04) whose `related_node_id` matches results `#9006` (QA'd, contribution 3), `#8871` (Submitted, 1), `#8702` (Editing, 1)
- WHEN the user opens the row menu and clicks **View reported results**
- THEN the drawer opens with the *Reported results* tab active and title *Reported results*
- AND the request carries `scope=all`
- BUT it must NOT show the report form first, and the **Report** button must still open the *Report* tab
- AND IT MUST keep the host's `initialTab` authoritative: **Report** on an indicator with existing results still opens *Report* (today's behaviour), and no code path switches to *Info* automatically

#### `IRR-R-2` / `IRR-R-3` — The table shows the pipeline
- GIVEN the fixture above and the indicator target `8`, row ACHIEVED `3`
- WHEN the tab renders
- THEN three rows read `#9006 · … · Knowledge product · Quality assessed · 3 · Reporting 2026`, `#8871 · … · Submitted · 1`, `#8702 · … · Editing · 1`
- AND the strip reads `3 results reported · Σ contribution 5 of target 8`
- AND the strip `title` discloses `Achieved on the row: 3 — counts reviewed results only`
- BUT it must NOT render `result_type_id` digits in Category, nor a status colour outside the token pairs
- AND IT MUST omit any result whose status is *Discontinued*, *Rejected* or *Draft*

#### `IRR-R-3.1` — Endpoint default unchanged
- GIVEN the same data
- WHEN a caller requests the endpoint without `scope` (or with `scope=reviewed`, or `scope=foo`)
- THEN only `#9006` is returned
- AND IT MUST return `#9006, #8871, #8702` only for `scope=all`

#### `IRR-R-5` — A way in
- GIVEN the table above
- WHEN the user presses Enter on the focused `#8871` row
- THEN the router navigates to `/result/result-detail/8871/general-information?phase=<version_id>`
- AND **Copy link** on the same row copies the absolute form of that URL and toasts *Result link copied*
- BUT it must NOT navigate when the click lands on the row-menu button

#### `IRR-R-7` — States
- GIVEN an indicator the endpoint answers 404 for
- WHEN the tab renders
- THEN the empty state with **Report the first result** appears and clicking it switches to *Report*
- AND IT MUST show *Could not load reported results* with **Retry** for a 500, and a retry re-issues the request

#### `IRR-R-8` — Room for a table
- GIVEN a 1440 px viewport and a drawer the user dragged to 520 px
- WHEN the *Reported results* tab activates
- THEN the drawer widens to 760 px and `widthChange` emits 760
- AND switching to *Info* restores 520 px
- BUT it must NOT exceed the clamp on a 1000 px viewport (floor becomes `1000 − 320 = 680`)
- AND IT MUST render the card layout, not the table, when the drawer is 600 px wide

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | One request per drawer open (shared by *Report* preview and the tab); client-side sort/filter over ≤ 200 rows renders under 100 ms in jsdom tests; no new heavy dependency |
| **Backwards compatibility** | Endpoint additive: new optional query param, new optional response field; default response byte-identical to today |
| **Security** | Same JWT `auth` header and role resolution as today; `scope` validated to the enum `reviewed | all`; no new input reaches SQL unparameterised |
| **Accessibility** | WCAG 2.1 AA per `docs/ux-ui/design.md` §10: keyboard-reachable rows and menu, `aria-sort`, visible focus, pill text contrast from the existing pairs |
| **Responsive** | Drawer full-bleed below `sm` (existing); card fallback below 640 px drawer width (`IRR-R-8.1`) |
| **Observability** | none — display-only |

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `IRR-AC-1` | Reporting table row menu | **View reported results** | drawer opens on *Reported results*, title *Reported results*, request has `scope=all` |
| `IRR-AC-2` | 3-result fixture (QA'd 3, Submitted 1, Editing 1), target 8 | tab renders | three rows with exact Code/Category/Status/Contribution/Phase text; strip `3 results reported · Σ contribution 5 of target 8`; disclosure `title` present with both numbers |
| `IRR-AC-3` | same data, server | endpoint without `scope` / `scope=all` | 1 result / 3 results; Discontinued, Rejected and Draft never returned |
| `IRR-AC-4` | a row | click, Enter, **Open result**, **Copy link** | navigation to `/result/result-detail/<code>/general-information?phase=<version_id>`; clipboard = absolute URL; toast on `globalUserNotification` |
| `IRR-AC-5` | 10-row fixture | sort by Contribution, type `88` in search | order descending by contribution; only `#8871` remains |
| `IRR-AC-6` | endpoint 404 / 500 | tab renders | empty state + CTA → *Report* tab / error + **Retry** re-requests |
| `IRR-AC-7` | drawer at 520 px, viewport 1440 | tab activates / leaves | 760 px, `widthChange(760)` / back to 520; at 600 px width the card layout renders (Cypress CT, real layout) |
| `IRR-AC-8` | *Info* tab | renders | Target, Achieved so far, Split present; no *Reported results* card list |

Cross-cutting project ACs that apply without restating: `AC-3` (authorization — unchanged endpoint guard), `AC-5` (phase scoping via `version_id`), `AC-9`.

### Defect classes and the gate that catches each

| Defect class | Gate | Blind spot / substitute |
|---|---|---|
| Wrong population / status filter / `scope` parsing on the server | Jest handler + loader spec with an in-memory repository fixture (`IRR-AC-3`) | none |
| Wrong column text, pill pair, category or phase mapping | Jest DOM tests on the drawer (`IRR-AC-2`) asserting exact cell text and computed style tokens | pill **colour** is a token pair by construction; the test asserts the pair name, the visual is covered by the existing Results-tab precedent |
| Navigation / clipboard wiring | Jest with a `Router` spy and a clipboard stub (`IRR-AC-4`) | none |
| Width floor / restore / card fallback | **Cypress component test** in real Chromium (`IRR-AC-7`) — jsdom lays out nothing | CT prints two known non-blocking errors (primeicons font, `ct-utils` TS2322) — documented harness noise, not evidence |
| Menu action lands on the wrong tab (the original defect) | Jest host test on `onReportingOpenAchieved` + drawer `initialTab` (`IRR-AC-1`) | none |
| Fixture-shaped blindness (real payload differs: missing `related_node_id`, `result_type_name` null) | live check on SP01 in the authenticated Orca browser at the final task, reading the rendered rows | manual; the automated harness has no API access |
| Visual polish (spacing, hover, density) | none automated | **accepted risk** — tokens and the Results-tab classes are reused; a human glance at the live check |

## 10. Dependencies & Assumptions

- **Upstream:** `GET api/results-framework-reporting/existing-result-contributors` (unchanged path); `Result.obj_result_type` relation for the type name; `PhasesService.phases.reporting` for phase names (already loaded by the shell).
- **Downstream:** none outside the drawer; the *Report*-tab preview shares the list.
- **Assumption A-1:** Reporting rows carry `related_node_id` at runtime (the drawer already queries with it; `indicator-drawer.component.spec.ts` pins it). Verified again in the live check.
- **Assumption A-2:** *All scope* is the explicit list Editing (1), Quality Assessed (2), Submitted (3), Pending Review (5), Approved (6) — verified against `ResultStatusData` (`result-status.enum.ts`), which also defines Discontinued (4), Rejected (7) and **Draft (8)**; the last three are excluded. Pending Review is included because a bilateral result awaiting review still contributes.
- **Assumption A-3:** No other in-flight spec edits `indicator-drawer/*`; `dashboard-lab.component.ts` receives exactly one changed line (see `KZ-MRF-3` — one session per checkout).

## 11. Open Questions

- none blocking. Proposal OQ-1 → `IRR-R-3` (all scope, opt-in param); OQ-2 → `IRR-R-2.2` (server name).

## 12. Out-of-Band Notes

- The status pill pairs exist in `programme-results.component.ts` (`STATUS_TOKENS`) as a deliberate local copy of `result-header.component.ts:17`; this spec makes a third copy inside the drawer with the same "do not DRY in passing" note — extraction is its own PR (folder guide rule).

## Required cross-references

- `docs/prd.md` — US-P1, G1, AC-3, AC-5, AC-9.
- `docs/ux-ui/design.md` — §4 Result Framework Reporting, §6 Drawers, §9 Responsive, §10 Accessibility.
- `docs/trd/trd.md` — §2 `result-framework-reporting` → `api/results-framework-reporting/*`.
- `docs/specs/archive/2026-08-31-changes--mass-reporting-flow/` (drawer as the single surface); `docs/specs/archive/2026-09-03-changes--results-table-resizable-columns/` and `pages/programme-results/CLAUDE.md` (column vocabulary, `STATUS_TOKENS`, route and copy-link rules).
