# Requirements — Bilateral Center Overview Tab

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `center-overview-tab` |
| **Spec Path** | `docs/specs/bilateral/center-overview-tab/` |
| **Type** | Change |
| **Depth** | Standard |
| **Approval Mode** | gated (inherited from `proposal.md`) |
| **Requirement prefix** | `COV` (Center OVerview) — `COV-R-n`, `COV-AC-n`, `COV-US-n`, `COV-OQ-n` |
| **Owner** | Juan Carlos Cadavid (j.cadavid@cgiar.org) |
| **Status** | approved (Phases 1–3 approved by the user 2026-09-14) |
| **Ticket(s)** | none yet — `COV-OQ-1` |
| **Source of intent** | `proposal.md` (approved 2026-09-14 with OQ-1 → Reporting stays the landing; OQ-5 → mockup generated) |
| **Visual reference** | `mockup/center-overview-tab.html` (self-contained HTML, generated this phase) · `mockup/reference-sp-overview-tab.png` · `mockup/current-bilateral-reporting-tab.png` |
| **Baseline cited** | `docs/prd.md` (G1, G2, US-P1, US-S4, AC-3, AC-5, AC-9) · `docs/ux-ui/design.md` §2, §6, §7, §8, §9, §10 · `docs/trd/trd.md` §4 (routing), §6 (frontend state, phase via query params), W1, W6 · `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules |
| **Depends on** | `bilateral/shell-sp-alignment` (executed) |
| **Coordinate with** | `bilateral/ai-drafts-redesign` (shares `bilateral-page-header` tab strip) |

---

## 1. Executive Summary

A center representative opening `/bilateral/<acronym>` today sees a project catalog and has no place that says how many results the center reported this phase, how many are approved, what is stuck, and which projects have nothing yet. This spec adds an **Overview** tab — first in the strip, not the landing — that answers those questions for one reporting phase with five KPI cards and six chart cards, all filterable from a single controls row under the tabs, and all deep-linked into the Reporting / Results / Draft Results tabs so that **every number on the Overview equals the row count the user sees after clicking it**.

Everything is computed on the client from three calls the shell already makes (center results per phase, center projects with SP mappings, AI drafts). The only server change is one additive field (`project_id`) so results can be joined to the project catalog by id.

---

## 2. Glossary

| Term | Meaning here |
|---|---|
| **Center shell** | `/bilateral/:acronym/*` — sticky band + tab strip + `#workArea` scroller delivered by `shell-sp-alignment` |
| **Phase / versionId** | A reporting cycle row in `version`; the P25 reporting phases exposed by `PhasesService.phases.reporting`. "Open phase" = the one with `status === true` |
| **Center results** | Rows from `GET api/results/bilateral-center-results?centerId&versionId`: every active result where the center is lead or contributing, `source IN ('API','Result')` |
| **W3/Bilateral** vs **W1/W2** | `source === 'API'` vs `source === 'Result'` (the Results tab's existing chip semantics) |
| **Lead / Contributing** | `is_leading_result` 1 / 0 on the center row |
| **Status ids** | 1 Editing · 2 Quality Assessed · 3 Submitted · 4 Discontinued · 5 Pending Review · 6 Approved · 7 Rejected (`result_status` catalogue) |
| **Primary SP** | `submitter` — official code of the result's role-1 Science Program |
| **Project** | A `BilateralProject` from `GET api/bilateral/center/projects` (id, short/full name, `sciencePrograms[]` with `programCode`) |
| **AI draft** | A `BilateralAiDraft` not `is_discarded` whose candidate has not been promoted (what the Draft Results tab lists and the tab badge counts) |
| **Deep link** | A `routerLink` into another center tab carrying the shared query-param contract (`COV-R-13`) |
| **Reconcile** | The count shown on an Overview figure equals the visible row/card count on the destination tab after the link is followed |

---

## 3. System Context & Scope

### 3.1 Context

- **Product:** `docs/prd.md` `US-P1` (phase-aware dashboard showing submission progress) applied to the center persona; `G1` (completeness / on-time) and `G2` (QA pass rate) are the metrics the cards surface; `US-S4` (see review outcomes) via the Rejected / Pending review figures.
- **UX:** `docs/ux-ui/design.md` §2 IA (center shell is a sibling of the SP shell), §6 layout patterns (viewport-locked shell), §7 tokens, §8 component inventory + hard rules, §9 responsive, §10 a11y. Reference screen: SP Overview (`mockup/reference-sp-overview-tab.png`).
- **Technical:** `docs/trd/trd.md` §4 routing (`BilateralRouting` in `shared/routing/routing-data.ts`), §6 "Phase context is shell-level and propagated via query params on links / navigation", W1 (status lifecycle), W6 (bilateral enrichment — untouched). The center-results endpoint is `api/results/*`, **outside** the `/api/bilateral/*` payload contract (`bilateral-result-summaries.en.md` is not touched).

### 3.2 In scope

1. Overview route, first tab, header union.
2. Controls row: phase selector + filter popover + chips + clear, URL-mirrored.
3. Phase shared across the four center tabs.
4. KPI deck (5) and analytical cards (6) with loading / error / empty states.
5. Shared bilateral query-param contract and the deep-link reconciliation rule.
6. Results tab becomes URL-driven (additive); Reporting and Draft Results tabs read the params relevant to them.
7. Server: additive `project_id` on center results.
8. Tests: unit (aggregation, chart builders, parsers, component states), one CT layout gate, server repository shape test, live HITL reconciliation.

### 3.3 Out of scope

- Default landing change (Reporting stays — proposal OQ-1 resolved).
- Multi-phase comparison on one screen; previous-phase pace overlay is `MAY` (`COV-R-31`).
- New server aggregate endpoints, migrations, `/api/bilateral/*` payload changes.
- Redesign of the Results table, project cards, draft cards (owned by `ai-drafts-redesign`), or the create wizard.
- SP-side pages.
- Budget / financial figures.

---

## 4. Stakeholders / Personas

| Persona (`docs/prd.md` §3) | What changes |
|---|---|
| **Result submitter (center staff)** | Gets a one-screen status of the center's cycle and a "Needs attention" list that opens exactly the results to work on |
| **Center lead / focal point** (sub-role of submitter) | Sees coverage (projects with no result), SP contribution and pace; can share a filtered URL with colleagues |
| **PMU / portfolio lead** | Unchanged; may browse a center Overview as admin (same role gate as the other center tabs) |
| **Platform admin** | Unchanged |
| **Bilateral consumer (downstream)** | Unchanged — no `/api/bilateral/*` change |

---

## 5. User Stories

- **`COV-US-1`** — As a center focal point, I want an Overview tab for my center and phase, so that I know how many results we reported, W3 vs W1/W2 and lead vs contributing, without counting table rows. *(Refines US-P1)*
- **`COV-US-2`** — As center staff, I want to see where our results sit in the pipeline and what needs my action (editing, rejected, AI drafts, long-pending), so that I work on the right items first. *(Refines US-S4, US-P1)*
- **`COV-US-3`** — As a center focal point, I want to see which bilateral projects have results and which have none, so that I can chase the teams behind uncovered projects. *(Refines G1)*
- **`COV-US-4`** — As a center focal point, I want to see which Science Programs our results feed compared with the SPs our projects are mapped to, so that I spot programs we committed to but have not reported against.
- **`COV-US-5`** — As center staff, I want every figure to open the matching tab already filtered, so that I never have to rebuild a filter by hand and the numbers always match. *(Refines US-P1)*
- **`COV-US-6`** — As center staff, I want the phase I picked to follow me across Overview, Reporting, Results and Draft Results, so that I never read one tab in 2026 and the next in 2025 by accident.

---

## 6. Functional Requirements

### 6.1 Route, tab and landing

#### `COV-R-1` — Overview tab and route

The center shell SHALL expose an **Overview** tab at `/bilateral/:acronym/overview`, rendered **first** in the tab strip, before Reporting, Results and Draft Results.

- **Scenario A — direct URL**
  - GIVEN a user with access to center `AfricaRice`
  - WHEN they open `/bilateral/AfricaRice/overview`
  - THEN the Overview page renders under the existing sticky band and the Overview tab shows the active state (2px brand underline, `aria-current="page"`)
  - AND the other three tabs keep their labels, icons, badges and routes
  - BUT it must NOT change what `/bilateral/AfricaRice` resolves to — the `**` redirect keeps landing on `home` (Reporting), and the sidebar / Home center-card links keep pointing to `home` (proposal OQ-1)
  - AND IT MUST keep `/home`, `/results`, `/drafts`, `/create`, `/result/:id`, `/drafts/:draftId` working unchanged.
- **Scenario B — header union**
  - GIVEN the header's `activeTab` input
  - WHEN a page passes `'overview'`
  - THEN only the Overview tab is active
  - BUT it must NOT also activate Reporting (today `'overview'` is a legacy alias of Reporting in `isReportingActive` — the alias is retired; its only caller passes `'reporting'`).

### 6.2 Controls row

#### `COV-R-2` — Phase selector

The Overview SHALL show a **Phase** selector as the first control in a controls row docked directly under the tab strip, listing the **P25 reporting phases** (same source and portfolio filter as the Results tab), defaulting to the **Open** phase.

- **Scenario A — default**
  - GIVEN P25 reporting phases where exactly one has `status === true`
  - WHEN the Overview loads with no `?phase=` in the URL
  - THEN the selector shows that Open phase (label `«phase_name» · «phase_year»` with an "Open" badge) and every card is scoped to it
  - AND IT MUST resolve the default also when phases arrive asynchronously (late `PhasesService` load), without flashing an empty state.
- **Scenario B — switch**
  - GIVEN the Overview on the Open phase
  - WHEN the user picks a different phase
  - THEN every KPI and card re-scopes to that phase, each card shows its own loading skeleton while its data is in flight, and the URL gains `?phase=<versionId>`
  - BUT it must NOT show a stale card from the previous phase once the new phase's data has arrived (late responses for a superseded phase are ignored — see `COV-R-21`).
- **Scenario C — deep link**
  - GIVEN a URL `/bilateral/AfricaRice/overview?phase=36`
  - WHEN it is opened
  - THEN the selector shows phase 36 and cards are scoped to it
  - BUT it must NOT accept an unknown or non-numeric `phase` — it falls back to the Open phase and strips the param.

#### `COV-R-3` — Filter popover, chips and clear

The controls row SHALL offer a single **Filter** button opening a popover with these dimensions, applied to **every** card and KPI at once; there SHALL be no per-card filter controls.

| Dimension | Values | Selection | Param |
|---|---|---|---|
| Science Program | SP codes present in projects' `sciencePrograms[]` ∪ results' `submitter` | multi | `program` |
| Project | center projects (`shortName — fullName`) | multi | `project` (id) |
| Result type | types present in the phase's results | multi | `type` (result_type_id) |
| Role | Lead · Contributing | single, default both | `role` |
| Source | W3/Bilateral · W1/W2 | single, default both | `source` |
| Creation method | AI-assisted · Manual | single, default both | `method` |

- **Scenario A — apply**
  - GIVEN the Overview with no filters
  - WHEN the user selects program `SP03` and source `W3/Bilateral` and applies
  - THEN the Filter button shows a count badge `2`, two removable chips appear next to it (`Program: SP03`, `Source: W3/Bilateral`), the URL carries `program=SP03&source=w3`, and every KPI and card recomputes from the filtered row set
  - AND IT MUST apply project/program filters consistently: a result matches `program` by its primary SP (`submitter`); a **project** matches `program` when any of its `sciencePrograms[].programCode` equals it (used by the coverage and SP-contribution cards).
- **Scenario B — clear**
  - GIVEN two active filters
  - WHEN the user clicks `Clear` (or removes both chips)
  - THEN badge, chips and URL params disappear and cards show the unfiltered phase
  - BUT it must NOT reset the phase.
- **Scenario C — popover behavior**
  - GIVEN the popover is open
  - WHEN the user presses `Escape` or clicks outside
  - THEN it closes without applying half-edited changes (hard rule 4)
  - AND IT MUST be keyboard-operable with a visible focus ring.
- **Scenario D — center switch**
  - GIVEN filters active for `AfricaRice`
  - WHEN the user navigates to another center's Overview
  - THEN filters, popover state and cached data are reset for the new center (kaizen `bilateral--overview-redesign` FIND-02: filters surviving a center switch produced a false empty state).

#### `COV-R-4` — Controls stay visible

The controls row SHALL remain visible at the top of the work area while the Overview content scrolls (the same sticky discipline `shell-sp-alignment` gave the Reporting/Results/Drafts toolbars).

- GIVEN the Overview on a ≥900px viewport with content taller than the work area
- WHEN the user scrolls the work area to the bottom
- THEN band, tab strip and controls row are still visible and the document itself has not scrolled
- BUT it must NOT introduce a second vertical scrollbar inside a card (one vertical scroll per view — hard rule 3).

### 6.3 Shared phase

#### `COV-R-5` — One phase for the center shell

The selected phase SHALL be shared by the four center tabs within a session and mirrored to `?phase=<versionId>` on tab links.

- **Scenario A — Overview → Results**
  - GIVEN phase 35 selected on the Overview
  - WHEN the user clicks the Results tab (or any Overview deep link)
  - THEN the Results tab opens on phase 35 and its own selector shows it
  - AND IT MUST behave identically in the other direction (phase picked on Results is what the Overview shows on return).
- **Scenario B — no selection**
  - GIVEN no phase was picked anywhere in the session and no `?phase=`
  - WHEN any center tab loads
  - THEN it uses the Open phase (today's behavior)
  - BUT it must NOT persist the phase across a page reload beyond the URL (no `localStorage`; reload without `?phase=` returns to Open).

### 6.4 KPI deck

#### `COV-R-6` — Five KPI cards

The Overview SHALL render, in one row, five cards computed from the filtered row set. The first is the violet hero card; the other four are neutral surfaces (hard rule 7).

| # | Card | Value | Sub-lines | Deep link |
|---|---|---|---|---|
| 1 | **Total results** (hero) | count of center results in scope | `n W3/Bilateral · n W1/W2` · `n lead · n contributing` | Results tab, scope params |
| 2 | **Pending review** | `status_id = 5` | `oldest N days` · `n > 14 days` | Results, `status=pending` |
| 3 | **Approved** | `status_id = 6` | `approval rate = approved / (approved + rejected)` as `%`, `— ` when denominator 0 · `n rejected` | Results, `status=approved` |
| 4 | **Needs attention** | editing (1) + rejected (7) + AI drafts awaiting review | `n editing · n rejected` · `n AI drafts` | scrolls to the Needs-attention card |
| 5 | **Projects covered** | projects with ≥1 result in scope `/ total projects in scope` | `n projects with no result yet` | Reporting tab, scope params |

- **Scenario — reconcile**
  - GIVEN the hero card reads `47`
  - WHEN the user clicks it
  - THEN the Results tab opens with the same phase and filters and its visible row count is `47`
  - AND IT MUST hold for cards 2, 3 and 5 against their destination tab's visible count (`COV-AC-9`).
- **Scenario — AI drafts scope**
  - GIVEN the Overview is filtered by project `X`
  - WHEN the Needs-attention KPI counts AI drafts
  - THEN it counts only drafts whose `job.project_id === X` and that are not discarded or promoted
  - BUT it must NOT include drafts of other centers (drafts are already scoped by `centerInstitutionId`).

### 6.5 Analytical cards

#### `COV-R-7` — Reporting status card

The Overview SHALL show a **Reporting status** card with a proportional status meter (ECharts) and five status tiles: Editing (1), Pending review (5), Submitted / QA (2 + 3), Approved (6), Rejected (7). Discontinued (4) results, if any, are listed in the a11y table but not tiled.

- GIVEN 47 results in scope
- WHEN the card renders
- THEN tile counts sum to 47 minus discontinued, each tile and meter segment is a button/link that opens Results with `status=<value>`, and the card's a11y table lists every status including zero rows
- BUT it must NOT color chart segments with status fg/bg tokens — series colors come from the chart ramp (`--pr-chart-*`); status colors are used only on the tile pills (hard rule 9; `chart-tokens.util.ts` fence)
- AND IT MUST compare status ids numerically after normalizing (`Number(status_id)`), because some payloads deliver ids as strings.

#### `COV-R-8` — Needs attention card

The Overview SHALL show a **Needs attention** list with four rows, each with a count and an "Open →" link:

| Row | Rule | Link |
|---|---|---|
| Results still in Editing | `status_id = 1` | Results `status=editing` |
| Rejected by the Science Program | `status_id = 7` | Results `status=rejected` |
| AI draft results awaiting review | drafts not discarded / not promoted (project-filtered when a project filter is active) | Draft Results (`project=` when set) |
| Pending review for more than 14 days | `status_id = 5` and `created_date` older than 14 days | Results `status=pending` |

- GIVEN all four counts are zero
- WHEN the card renders
- THEN it shows a single-line empty state "Nothing needs your attention in this phase" (≤160px, hard rule 5)
- BUT it must NOT hide individual zero rows when at least one row is non-zero (zero rows render muted so the list shape is stable).

#### `COV-R-9` — Results by project card

The Overview SHALL show **Results by project**: one horizontal bar per project with ≥1 result in scope, stacked lead/contributing, sorted by count desc, showing the top 7 with a "Show n more" expander; below it a **Not started yet** strip listing projects in scope with zero results.

- **Scenario A — bar click**
  - GIVEN project `A-AG10173` shows `9`
  - WHEN the user clicks its bar
  - THEN Results opens with `project=<id>` (+ current scope) and shows 9 rows.
- **Scenario B — not started**
  - GIVEN a project with zero results in scope
  - WHEN the user clicks its chip
  - THEN the Reporting tab opens with `project=<id>` and that project card is highlighted and scrolled into view, where its existing `Create result` button is available
  - AND IT MUST join results to projects by `project_id` (server field, `COV-R-15`), never by display name.
- **Scenario C — results without a project**
  - GIVEN results whose `project_id` is null (W1/W2 rows or unlinked results)
  - WHEN the card renders
  - THEN they are grouped in a final "No bilateral project" row that links to Results with `source=w1w2` when all such rows are W1/W2, and to Results without a project param otherwise
  - BUT it must NOT count them toward any project's bar or toward "Projects covered".

#### `COV-R-10` — Science Program contribution card

The Overview SHALL show **Science Program contribution**: for every SP appearing in either projects' mappings or results' primary SP, two bars — *projects mapped* (projects in scope with that SP in `sciencePrograms[]`) and *results reported* (results in scope with `submitter` = SP) — sorted by results desc, ties by projects desc.

- GIVEN SP `Better Diets` has 2 mapped projects and 0 results
- WHEN the card renders
- THEN the row shows `2 · 0` and a muted "no results yet" hint
- AND clicking the row opens the Reporting tab with `program=<code>`; clicking the results bar opens Results with `program=<code>`
- BUT it must NOT double-count a project that maps the same SP twice (dedupe per project, as `kpiSummary` already does).

#### `COV-R-11` — Results by result type card

The Overview SHALL show **Results by result type** as two groups — Outputs (Knowledge product, Innovation development, Capacity sharing for development, Other output) and Outcomes (Innovation use, Policy change, Other outcome, IPSR / Innovation use (IPSR)) — one stacked bar per type present, segments by status family (Approved · Pending review · Editing/other).

- GIVEN a type with zero results in scope
- WHEN the card renders
- THEN that type is omitted from the bars but present in the a11y table
- AND clicking a bar opens Results with `type=<result_type_id>`
- BUT it must NOT rely on catalogue *names* to place a type in Outputs vs Outcomes — grouping is by `result_type_id` (design lists the mapping), with unknown ids shown in an "Other" group rather than dropped.

#### `COV-R-12` — Reporting pace card

The Overview SHALL show **Reporting pace**: a cumulative line of results created (`created_date`) per ISO week across the phase window `[start_date, end_date]`, with the window shaded and a "today" marker when today is inside the window.

- GIVEN a phase with `start_date`/`end_date` and 47 results
- WHEN the card renders
- THEN the last plotted value equals 47 (the hero total) and the x-axis spans the phase window
- BUT it must NOT plot results whose `created_date` is outside the window as if inside — they are counted in the first bucket (before start) or last bucket (after end) and the a11y table says so
- AND IT MUST fall back to `[min(created_date), max(created_date)]` when the phase has no dates, hiding the window shading and today marker.

### 6.6 Deep links and the other tabs

#### `COV-R-13` — Shared query-param contract and reconciliation

All four center tabs SHALL share one query-param contract with these keys and parse rules:

| Key | Value space | Multi | Unknown/missing → |
|---|---|---|---|
| `phase` | numeric `versionId` | no | Open phase; param stripped |
| `status` | `editing \| pending \| approved \| rejected \| submitted \| qa \| discontinued` | yes (comma) | all statuses |
| `project` | CLARISA project id | yes | no project filter |
| `program` | SP official code | yes | no program filter |
| `type` | `result_type_id` | yes | no type filter |
| `role` | `lead \| contributing` | no | both |
| `source` | `w3 \| w1w2` | no | both |
| `method` | `ai \| manual` | no | both |
| `search` | free text | no | empty |
| `multi` | `1` | no | off (Reporting tab only) |

- **Scenario — reconciliation (the acceptance heart of the spec)**
  - GIVEN any figure on the Overview that carries a deep link
  - WHEN the link is followed
  - THEN the destination tab's visible count (table rows on Results; project cards on Reporting; draft cards on Draft Results) equals the figure
  - AND IT MUST be true because both sides apply the **same filter function** to the **same rows** — the Overview never counts anything the destination tab cannot show
  - BUT it must NOT be satisfied by hiding rows on the destination: the destination's own chips and search remain usable and reflect the params.

#### `COV-R-14` — Results tab becomes URL-driven (additive)

The Results tab SHALL read `phase`, `status`, `project`, `program`, `type`, `role`, `source`, `method`, `search` on load and write them back when the user changes a chip, the phase or the search; `?result=` (notification focus) keeps working.

- GIVEN `/bilateral/AfricaRice/results?status=pending&project=118`
- WHEN it loads
- THEN the table shows only pending-review rows of project 118, the phase is the shared phase, and the chip strip reflects the active status/project filters (a new **Status** chip group and a **Project** chip appear when those params are present)
- BUT it must NOT change today's default when no params are present (W3 + Lead on, W1/W2 + Contributing off, Open phase)
- AND IT MUST strip invalid values and keep the column picker preference local (not in the URL).

#### `COV-R-15` — Reporting and Draft Results tabs read their params

- **Reporting tab** SHALL read `program` (pre-selects its SP quick filter — first value when multiple), `project` (highlights and scrolls to the card; the card's `Create result` is untouched) and `multi=1` (Multi-Program quick filter).
- **Draft Results tab** SHALL read `project` (its existing project filter).
- GIVEN `/bilateral/AfricaRice/home?project=118`
- WHEN it loads
- THEN the catalog scrolls to project 118's card, which shows a transient highlight (ring, ≤2 s, respects reduced motion)
- BUT it must NOT filter the catalog down to one card (highlight, not filter — the user still sees the context).

### 6.7 Server

#### `COV-R-16` — `project_id` on center results (additive)

`GET api/results/bilateral-center-results` SHALL add `project_id` (the lead bilateral project's CLARISA project id, same selection rule as the existing `project_name`; `null` when none) to every row.

- GIVEN a result linked to two projects with `is_lead` on one
- WHEN the endpoint responds
- THEN `project_id` is that lead project's id and `project_name` is unchanged
- BUT it must NOT change, rename or reorder any existing field, and the row count for a (center, phase) pair MUST be identical before and after.

### 6.8 States, accessibility, responsive

#### `COV-R-17` — Loading, error and empty states

- Each KPI and card SHALL show its own skeleton while its data is in flight (`aria-busy`), an inline error state with a `Retry` ghost button when its call fails, and a ≤160px empty state when the phase has zero results in scope.
- GIVEN the results call fails and the projects call succeeds
- WHEN the Overview renders
- THEN result-based cards show the error state while "Projects covered" shows `0 of N` with a "results unavailable" hint
- BUT it must NOT show a full-height empty card or a toast per card.

#### `COV-R-18` — Accessibility

Every chart SHALL ship a `VizChartTableModel` (a11y table); every clickable figure SHALL be a real `<button>` or `<a>` with an accessible name that includes the count; tab active state uses `aria-current`; focus rings visible; `prefers-reduced-motion` disables transitions and the highlight animation; text contrast meets WCAG 2.1 AA (tokens only). No chart is the sole carrier of a number — the number is always also in text.

#### `COV-R-19` — Responsive

| Viewport | KPI deck | Rows A / C | Controls |
|---|---|---|---|
| ≥1280 | 5 columns | 2 columns | one line |
| 900–1279 | 3 + 2 | 1 column | wraps to 2 lines max |
| 640–899 | 2 columns | 1 column | wraps; chips scroll horizontally |
| <640 | 1 column | 1 column | phase select full width |

- GIVEN any of these viewports
- WHEN the Overview renders with 47 results and 21 projects
- THEN the document has no horizontal scroll and no card overflows its column
- AND IT MUST keep chart heights fixed per card (no aspect-ratio jump on resize).

### 6.9 Should / May

- **`COV-R-20`** (SHOULD) The "pending for more than N days" threshold SHOULD be a single constant (`14`) in the overview service, not repeated in templates.
- **`COV-R-21`** (SHOULD) Overview data SHOULD be cached per `centerId::versionId` for the session so returning to the tab does not refetch; a response arriving for a key that is no longer selected is stored under its own key and never rendered under another (race guard, `overview-phase-filter` DD-4 pattern).
- **`COV-R-22`** (SHOULD) The Overview SHOULD reuse the drafts already loaded by the shell (`BilateralAiService`) rather than refetching them.
- **`COV-R-30`** (MAY) The Reporting and Draft Results tabs MAY read `?phase=` in v1 where they have phase-dependent content; today they do not, so honoring the shared signal is sufficient.
- **`COV-R-31`** (MAY) The pace card MAY overlay the previous phase's same-period pace as a dotted line when that phase's rows are already cached; v1 may omit it.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance (client)** | Aggregating 5,000 center-result rows + 200 projects into all card models MUST complete in < 100 ms in the Jest performance assertion (median of 3 runs; if the spread exceeds 50 % of the median the reading is inconclusive and is reported, not committed). First paint of skeletons < 1 frame after route activation. |
| **Requests** | No new HTTP calls beyond the three the shell already makes; a phase switch issues exactly one results call. `COV-R-21` prevents refetch on tab return. |
| **Bundle** | No new runtime dependency; ECharts modules already registered in `pr-viz-chart` (`LineChart`, `BarChart`, `PieChart`) are sufficient. |
| **Availability** | Inherits platform SLO; the Overview degrades per card (`COV-R-17`) — one failing call never blanks the page. |
| **Security** | Same JWT + role gate as the other center tabs; no new server route; `project_id` is a CLARISA id, not a PRMS join PK (`AC-1`). No secrets in logs (`AC-9`). |
| **Backwards compatibility** | Server change additive (`COV-R-16`); Results tab behavior identical without params (`COV-R-14`); routes and redirects unchanged (`COV-R-1`). |
| **Accessibility** | WCAG 2.1 AA per `design.md` §10; `COV-R-18`. |
| **Design system** | Tailwind-first, `var(--pr-*)` only, Lucide / `material-icons-round` only as the header already uses, no new SCSS blocks beyond `:host` setup (hard rules 8/19/21; `KZ-BOR-1`). Grep gates: `#[0-9a-fA-F]{3,8}` = 0 and `pi pi-` = 0 in new files. |
| **i18n** | New strings follow the module's current practice (English literals in templates, like the sibling center tabs); no new i18n keys required. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then | Covers |
|---|---|---|---|---|
| `COV-AC-1` | `/bilateral/AfricaRice/overview` | page loads | Overview renders, first tab active, `/bilateral/AfricaRice` still lands on `home` | R-1 |
| `COV-AC-2` | Open phase 36, no `?phase` | Overview loads | selector shows phase 36 "Open"; all cards scoped to 36 | R-2 A |
| `COV-AC-3` | phase 36 shown | user picks 35 | skeletons per card → data for 35; URL `?phase=35`; a late 36 response is not rendered | R-2 B, R-21 |
| `COV-AC-4` | `?phase=abc` | load | falls back to Open; param stripped | R-2 C |
| `COV-AC-5` | no filters | apply `program=SP03`, `source=w3` | badge 2, two chips, URL params, every card recomputed | R-3 A |
| `COV-AC-6` | two filters | Clear | chips/params gone; phase unchanged | R-3 B |
| `COV-AC-7` | filters on AfricaRice | navigate to `/bilateral/CIMMYT/overview` | filters and cache reset | R-3 D |
| `COV-AC-8` | ≥900px, tall content | scroll work area | band + tabs + controls still visible; document not scrolled | R-4 |
| `COV-AC-9` | hero = 47, pending = 9, approved = 17, covered = 13/21 | click each KPI | Results shows 47 / 9 / 17 rows; Reporting shows 21 cards with 8 flagged "no result" | R-6, R-13 |
| `COV-AC-10` | status tiles | click Pending review | Results `status=pending`, 9 rows; tile pills use status tokens, meter uses chart ramp | R-7 |
| `COV-AC-11` | all attention counts 0 | render | one-line empty state ≤160px | R-8 |
| `COV-AC-12` | project 118 bar = 9 | click bar | Results `project=118` → 9 rows | R-9 A |
| `COV-AC-13` | zero-result project chip | click | Reporting `project=<id>`, card highlighted and scrolled, catalog not filtered | R-9 B, R-15 |
| `COV-AC-14` | SP with 2 projects, 0 results | render | row `2 · 0` + hint; row click → Reporting `program=`; a project mapping the SP twice counts once | R-10 |
| `COV-AC-15` | type with 0 results | render | omitted from bars, present in a11y table; unknown type id lands in "Other" | R-11 |
| `COV-AC-16` | phase with dates, 47 results | render pace | last value 47; window shaded; today marker inside window | R-12 |
| `COV-AC-17` | phase without dates | render pace | axis spans min/max created_date; no shading/marker | R-12 |
| `COV-AC-18` | `/results?status=pending&project=118` | load | only matching rows; chips reflect params; no params → today's default | R-14 |
| `COV-AC-19` | `/results` user toggles W1/W2 chip | — | URL gains `source=` reflecting the chip state | R-14 |
| `COV-AC-20` | result linked to 2 projects, one lead | GET center results | `project_id` = lead id; other fields byte-identical; row count unchanged | R-16 |
| `COV-AC-21` | results call fails | render | result cards show error + Retry; Projects covered shows `0 of N` hint | R-17 |
| `COV-AC-22` | any chart | inspect DOM | a11y table present with caption/headers/rows; clickable figures are buttons/links with count in the name | R-18 |
| `COV-AC-23` | 1280 / 900 / 375 px | render | KPI columns 5 / 3+2 / 1; no horizontal document scroll | R-19 |
| `COV-AC-24` | 5,000 rows fixture | aggregate | < 100 ms median; spread reported | NFR |
| `COV-AC-25` | new files | grep | 0 hex literals, 0 `pi pi-` | NFR |

Cross-cutting project ACs that apply without restating: `AC-3` (authorization), `AC-5` (phase scoping), `AC-9` (secrets).

---

## 9. Defect Classes → Gates

The classes this spec can actually produce, and what catches each. Classes with no automated gate are named and substituted, not assumed away.

| # | Defect class | Gate | Input that would make the gate fail | Blind spot / substitute |
|---|---|---|---|---|
| D1 | Wrong aggregation (status/type/project/SP counts, approval rate, aging) | Jest on the pure aggregation module with fixtures: string `status_id`, null `project_id`, duplicate SP mapping, discontinued rows, dates outside window | a fixture row with `status_id: '5'` counted as not-pending | — |
| D2 | **Overview ≠ destination count** (drift) | (a) Jest: Overview and Results tab import the same `filterCenterResults()`; (b) **live HITL reconciliation table** on AfricaRice for every KPI, tile, one project bar, one zero-project chip | a destination applying a predicate the Overview lacks (e.g. Results' default "Lead only") | jsdom cannot prove the live path; HITL is the gate |
| D3 | TypeScript errors ts-jest hides (type-only imports, DTO field names) | `npx tsc --noEmit -p tsconfig.app.json` per task | referencing `result_type_name` instead of `result_type` | — |
| D4 | Layout / responsive breakage, controls not sticky, horizontal overflow | Cypress CT `bilateral-overview.cy.ts` at 1280/900/375: KPI column count, `document.scrollWidth <= clientWidth`, controls `getBoundingClientRect().top` constant after scrolling `#workArea` | a KPI card with `min-width` > column width | measurement on the real scroller, never an `overflow-hidden` ancestor (tautology) |
| D5 | Hard-rule drift (hex, PrimeIcons, SCSS blocks) | grep gates in DoD (`COV-AC-25`) + Reviewer reads `onecgiar-pr-client/CLAUDE.md` §5 | one `#6b46e5` in a template | — |
| D6 | Chart option shape wrong (series/stack/colors/table) | Jest on chart builders: series count, stack keys, colors ∈ token set, table rows = data rows | a builder emitting a status token as a series color | **Visual correctness of rendered charts is not automatable in jsdom** → human check at HITL (T6 review of screenshots if the session model cannot see them) |
| D7 | URL contract parse bugs | Jest on parsers with invalid/duplicate/empty values | `?status=foo,pending` yielding `['foo','pending']` | — |
| D8 | Stale data across center/phase switch | Jest on service cache keys + effect: response for key A after selecting B is not rendered | out-of-order resolution of two mocked calls | — |
| D9 | Server SQL shape regression | `result.repository.spec.ts`: SELECT contains `project_id`, placeholder count === params length (KZ-W12-1), existing fields still selected | dropping `project_name` while adding `project_id` | live row-count check before/after on prtest at HITL |
| D10 | Accessibility: names, tables, focus, reduced motion | Jest DOM assertions (table present, `aria-current`, button names include counts) | a tile rendered as `<div (click)>` | contrast and focus visibility are human-checked at HITL (tokens inherit AA, but layering can break it) |
| D11 | Build-only breakage (global styles, DI) | `npm run build:dev` once at the end of the client tasks | a missing standalone import surfacing only in AOT | — |

**Accepted risk:** the *semantic* correctness of chart visuals (D6) and contrast after layering (D10) have no automated gate in this harness; both are covered by the HITL pause in the final task and recorded as such.

---

## 10. Dependencies & Assumptions

### Upstream

- `bilateral/shell-sp-alignment` executed: `bilateral-page-header` band variant, `pr-viewport-page`, `#workArea` pattern.
- `PhasesService.phases.reporting` populated with `obj_portfolio.acronym`, `start_date`, `end_date`, `status`.
- `GET api/results/bilateral-center-results` (results), `GET api/bilateral/center/projects` (projects), `GET api/bilateral/center/ai/drafts` (drafts, already loaded by the shell via `BilateralAiService`).
- `shared/components/pr-viz-chart` with `LineChart`, `BarChart`, `PieChart` registered; `shared/utils/chart-tokens.util.ts`.
- `custom-fields/pr-select` for the phase selector (same as the SP Overview).

### Downstream

- None outside the center shell. The SP pages and `/api/bilateral/*` consumers are untouched.

### Assumptions

- Center result volumes stay in the hundreds per phase (client aggregation is adequate; Option 2 in the proposal is the fallback if a center exceeds a few thousand).
- `created_date` is an acceptable proxy for "reported" in v1 (no submission timestamp in the payload).
- The user-approved mockup fixes the card **set and order**; exact spacing and copy are refined in `design.md`.

---

## 11. Open Questions

- **`COV-OQ-1`** — Jira ticket id for commit scoping (`P2-xxxx`). *Does not block design; blocks the first commit message.*
- **`COV-OQ-2`** — Should the "Submitted / QA" tile split into two tiles when W1/W2 rows are present? *Default: one tile, both ids, the a11y table splits them. Resolve at design.*
- **`COV-OQ-3`** — Highlight duration on the Reporting card (`COV-R-15`): 2 s ring proposed. *Cosmetic; design decides.*

---

## 12. Out-of-Band Notes

- **Coordination:** `bilateral/ai-drafts-redesign` renames the fourth tab to "AI Draft Results" in the same header template. Whichever executes second rebases a one-line label change; both `tasks.md` pre-flights name the other spec.
- **Stale guide:** `bilateral-results-list/CLAUDE.md` still calls the Results tab "the centre's default landing page" — false since `shell-sp-alignment`. Record for the archive-time guide sync, do not edit on the spec branch.
- **Registry:** `.agents/model-routing.md` T1 entry (`opus`) is older than the session model; flagged for the default-branch apply, not edited here.
