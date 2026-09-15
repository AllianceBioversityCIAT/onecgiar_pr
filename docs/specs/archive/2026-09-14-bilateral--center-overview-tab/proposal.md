# Proposal: Bilateral Center Overview Tab

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/center-overview-tab` |
| **Slug** | `center-overview-tab` — derived from free-text argument ("en la sección de bilaterales … contar con un Overview que puede ser el primer tab, similar a como lo tenemos en los SPs … gráficas … todo cableado … filtros en la parte superior") |
| **Type** | Change |
| **Approval Mode** | gated |
| **Parent Spec** | none |
| **Depends on** | `bilateral/shell-sp-alignment` (executed — sticky band, tab bar, `#workArea` scroll, `pr-viewport-page`) |
| **Parallel-safe** | **no** with `bilateral/ai-drafts-redesign` (both touch `bilateral-page-header` tab strip and `my-draft-results`); **yes** with `bilateral/manual-create-drawer` (wizard only) |
| **Author** | AKILI propose (session, T1 — Fable 5.1; registry entry `opus` is stale and should be refreshed) |
| **Date** | 2026-09-14 |
| **Routes** | new `/bilateral/:acronym/overview` · touched `/home`, `/results`, `/drafts` |
| **Approval notes (2026-09-14)** | Approved by the user with two decisions: **OQ-1 → Reporting (`/home`) stays the default landing; Overview is the first tab but not the landing.** **OQ-5 → a self-contained HTML mockup is generated during `/akili-specify`** (`mockup/center-overview-tab.html`). Scope, Delta and Success Criteria below were amended accordingly. |

---

## Intent

Give every CGIAR Center a first-tab **Overview** on its bilateral dashboard (`/bilateral/:acronym/*`) that answers, in one screen and for one reporting phase, the questions a center representative actually asks: *how much have we reported, where is it stuck, which projects have nothing yet, which Science Programs are we feeding, and what do I need to do next*. The tab mirrors the Science Program Overview (`entity-details/:id/overview`) in shell, controls placement and chart language (ECharts through `app-pr-viz-chart`), and every figure on it is a **deep link** into the Reporting, Results or Draft Results tab with the matching filters pre-applied.

---

## Problem / Current Behavior

| # | Today | Why it hurts |
|---|---|---|
| 1 | The center shell has three tabs — Reporting (`/home`), Results, Draft Results — and **no Overview**. The SP shell has Overview as its first, default tab (`mockup/reference-sp-overview-tab.png`). | A center lead lands on a project catalog with "Create result" buttons and has to open Results, change phase, and count by eye to know the state of the cycle. |
| 2 | The only aggregate figures on the center pages are the five **project** KPI cards on the Reporting tab (Total projects, per-SP project count, Multi-program) — they count projects, never results (`bilateral-projects-panel.component.ts` → `kpiSummary`). | "How many results did we report and how many were approved?" has no answer anywhere in the center view. |
| 3 | The Results tab (`bilateral-results-list`) loads every center result for a phase with status, type, project, primary SP, role and creation method — but only renders a table, and reads a single query param (`?result=`). Its chips (W3 / W1-W2 / Lead / Contributing) and phase are **not URL-addressable**. | Nothing can link into "Results, this phase, pending review, project X". The tabs cannot talk to each other. |
| 4 | Phase is chosen independently per tab (Results tab has its own selector; Reporting and Drafts have none). | Switching tab loses the cycle the user was looking at. |
| 5 | The Portfolio Overview (`portfolio-overview.charts.ts`) and the SP Overview already ship a tokenized ECharts layer (`pr-viz-chart`, `chart-tokens.util.ts`, a11y `VizChartTableModel`) with donut, stacked bar, ranking and line builders. | None of that reaches the center view; the library the user refers to ("la librería que tenemos") is unused in `pages/bilateral/`. |

---

## Proposed Outcome

### The questions the tab answers (drives the card set)

| Q | A center representative asks… | Card that answers it | Deep link target |
|---|---|---|---|
| Q1 | How many results has my center reported this cycle, W3 vs W1/W2, lead vs contributing? | **KPI deck** (hero card) | Results tab, `?phase=&source=` |
| Q2 | Where are they in the pipeline — Editing, Pending review, Approved, Rejected, Submitted/QA? | **Reporting status** donut + status tiles | Results tab, `?status=` |
| Q3 | What needs my action right now? | **Needs attention** list: Editing not yet submitted · Rejected (rework) · AI drafts awaiting review · Pending review older than N days | Results `?status=`, Drafts tab |
| Q4 | Which of my bilateral projects have results, and which have **none yet**? | **Results by project** ranked bars + "Not started" strip with `Create result` | Reporting tab `?project=` · Results `?project=` |
| Q5 | Which Science Programs are our results feeding, vs. which SPs our projects are mapped to? | **Science Program contribution** grouped bars (projects mapped vs results reported per SP) | Reporting `?program=` · Results `?program=` |
| Q6 | What kinds of results are we producing (outputs vs outcomes, by type)? | **Results by result type** stacked bars (status inside type) | Results `?type=` |
| Q7 | How is our reporting pacing across the phase window? | **Reporting pace** cumulative line from `created_date` over `phase.start_date → end_date` | Results `?phase=` |
| Q8 | How much of our reporting is AI-assisted, and how much of the AI backlog is still unreviewed? | KPI sub-line + Needs-attention row (drafts) | Drafts tab |
| Q9 | Are we leading or mostly contributing to other centers' results? | Lead/contributing split inside Q1 hero and Q4 bars | Results `?role=` |

### Layout (mirrors the SP Overview, top to bottom)

1. **Sticky band** (existing `bilateral-page-header`, `band` variant) with a new first tab **Overview** (`space_dashboard`), then Reporting · Results · Draft Results. Tab strip stays the shell-sp-alignment design (48px, 2px active border, badges).
2. **Controls row** docked directly under the tabs, inside `#workArea` as its first child exactly like `dashboard-lab.component.html:1175` — `PHASE` selector (`app-pr-select`, P25 reporting phases, Open phase default) · divider · **Filter** button + popover (Science Program · Project · Result type · Role lead/contributing · Source W3 / W1-W2 · Creation method AI/manual) · active-filter chips · `Clear`. Filters are the *only* filtering UI on the tab — no per-card dropdowns (user rule: filters at the top).
3. **KPI deck** — five cards on one row (violet hero first, then neutral): **Total results** (n · W3 / W1-W2 split · lead / contributing) · **Pending review** (n · oldest N days) · **Approved** (n · approval rate = approved / (approved+rejected)) · **Needs attention** (Editing + Rejected + AI drafts) · **Projects covered** (x of N with ≥1 result). Every card is a link.
4. **Row A** — *Reporting status* (ECharts donut + proportional meter + status tiles, `statusPipelineOption` pattern) · *Needs attention* (action list with counts and per-row CTA).
5. **Row B** — *Results by project* (horizontal ranked bars, lead vs contributing stacked; zero-result projects listed underneath with `Create result` → `/create` with project pre-selected).
6. **Row C** — *Science Program contribution* (grouped bars: projects mapped vs results reported per SP) · *Results by result type* (outputs group / outcomes group, status stacked).
7. **Row D** — *Reporting pace* (cumulative line, phase window shaded, today marker).
8. Every chart ships its `VizChartTableModel` (a11y table drawer, `requireTable=true`), loading skeletons per card, and the 160px-max empty state (hard rule 5).

### Wiring between tabs (the part the user called "cableado")

- **One phase for the whole shell.** `BilateralContextService` gains `selectedVersionId: signal<number | null>` (`null` = Open phase). Overview and Results read/write it; Reporting and Drafts read it when they need phase context. The value is mirrored to `?phase=<versionId>` so links are shareable (same value space as the SP *Bilateral review* tab — `bilateral-review.query-params.ts` — not the phase-name space the SP Results tab uses).
- **A shared query-param contract** `pages/bilateral/bilateral-query-params.ts`: `phase` · `status` · `project` (CLARISA project id) · `program` (SP official code) · `type` (result_type_id) · `role` (`lead|contributing`) · `source` (`w3|w1w2`) · `method` (`ai|manual`) · `search`, with pure `parse*` helpers exactly like the bilateral-review file. Unknown values parse to the tab default and are stripped from the URL.
- **Results tab** becomes URL-driven: chips, phase and search read from and write to those params (today: only `?result=`). Column picker stays local.
- **Reporting tab** reads `?program=` (pre-selects the SP quick filter), `?project=` (scrolls to / highlights the card) and `?multi=1`.
- **Draft Results tab** reads `?project=` (its existing project filter).
- Overview → any tab navigation carries the Overview's own active filters plus the clicked dimension, so the destination shows *exactly* the subset the user clicked on (counts reconcile — Success Criterion 4).

---

## Scope

### In scope

- **Route + tab**: `overview` route in `BilateralRouting`, first tab in `bilateral-page-header`, `activeTab` union gains `'overview'` as a real tab (today `'overview'` is only a legacy alias of Reporting — `bilateral-page-header.component.ts:26`). The `**` redirect keeps pointing to `home`.
- **Default landing unchanged (OQ-1 resolved):** `/bilateral/:acronym` and the sidebar / Home center-card links keep landing on Reporting (`/home`). Overview is reachable as the first tab and by direct URL `/overview`. No redirect or link changes.
- **Data layer (client)**: `BilateralOverviewService` (root, per-center per-phase `Map` cache keyed `centerId::versionId`, KZ-W12/OPF pattern) that composes three **existing** calls — `GET api/results/bilateral-center-results` (results), `GET api/bilateral/center/projects` (projects + SP mappings), `GET api/bilateral/ai/drafts` (drafts) — into the nine answers above with pure aggregation functions (unit-tested, `KZ`-style performance assertion at 5k rows).
- **Server (one additive field)**: `getResultsByBilateralCenter` gains `project_id` (lead project id, same correlated subquery that already yields `project_name`) so results join to the project catalog by id, not by display name. Additive, no migration, spec test asserts the shape.
- **Charts**: `bilateral-overview.charts.ts` — pure builders returning `EChartsOption` + `VizChartTableModel`, colored only from `resolveChartTokens()` (status tokens never enter chart series — `VCE-DD-3` fence). Reuse/adapt `statusPipelineOption`, `categoryOriginBarOption`, `programRankingOption`, and the registered `LineChart`.
- **Controls row** (phase + filter popover + chips) and its URL sync.
- **Cross-tab contract** and the additive URL reading in Results / Reporting / Drafts tabs.
- Jest specs (service aggregation, chart builders, component states, URL parsers), one Cypress CT for the KPI row + controls layout at 3 breakpoints, `tsc --noEmit` + touched-module specs.

### Out of scope

- Multi-phase comparison on one screen (phase selector is single-phase, like SP Overview).
- New server aggregate endpoints or materialized views.
- Any change to `/api/bilateral/*` public payloads (`bilateral-result-summaries.en.md` untouched).
- Redesign of the Results table, project cards or draft cards themselves (`ai-drafts-redesign` owns the draft cards).
- SP-side pages (`dashboard-lab`, `program-overview`) — read-only references.
- Financial/budget figures (`allocation` is a percentage string; no budget data reaches the client).

---

## Non-Goals

- Do not move the "Bulk Results Uploader" CTA or change the band height/typography (settled by `shell-sp-alignment`).
- Do not make the Overview compute figures the Results tab cannot reproduce with a filter (every number must reconcile — no "tagged AND reached review"-style hidden predicates, cf. `program-overview/CLAUDE.md` gotcha).
- Do not add PrimeIcons, hex literals or new SCSS blocks (hard rules 8/19/21; `KZ-BOR-1`).

---

## Affected Users, Systems, And Specs

| Layer | Items | Impact |
|---|---|---|
| **Users** | Center result submitters and center leads (`docs/prd.md` persona *Result submitter*; `US-P1` phase-aware dashboard applied to centers) | New first tab (not the landing); existing tabs unchanged in function |
| **Client — new** | `pages/bilateral/pages/bilateral-overview/` (component, charts, service, specs), `pages/bilateral/bilateral-query-params.ts` | New |
| **Client — modified** | `bilateral-page-header.component.{ts,html}` (tab), `routing-data.ts` (`BilateralRouting`), `bilateral-context.service.ts` (`selectedVersionId`), `bilateral-results-list.component.ts` (URL-driven filters + shared phase), `bilateral-projects-panel.component.ts` (read `?program=`/`?project=`), `my-draft-results.component.ts` (read `?project=`), `reporting-nav-sidebar.component.ts:657`, `result-framework-reporting-center-card-item.component.html:16` | Additive |
| **Client — reused** | `shared/components/pr-viz-chart`, `shared/utils/chart-tokens.util.ts`, `app-pr-select`, `pr-viewport-page` mixin, filter popover pattern from `dashboard-lab.component.html:1175-1240` | Read-only |
| **Server** | `result.repository.ts` → `getResultsByBilateralCenter` (+`project_id`), `results.service.spec.ts` | Additive field, no migration |
| **Baseline** | `docs/trd/trd.md` §6 client module table (bilateral pages) — record at archive; `docs/ux-ui/design.md` §4 screen inventory gains the center Overview | Doc sync at `/akili-archive` (default branch) |
| **Specs** | `bilateral/shell-sp-alignment` (parent shell, its roadmap listed "tab-by-tab" follow-ups — this is the first), `bilateral/ai-drafts-redesign` (shares the tab strip — coordinate), archived `changes/portfolio-overview-echarts`, `changes/overview-phase-filter`, `changes/sp-bilateral-review-tab` (patterns reused) | Reference |

---

## Visual Reference

- **Source:** user-provided screenshots (current vs. reference) — no Figma.
- **Location:**
  - `docs/specs/bilateral/center-overview-tab/mockup/current-bilateral-reporting-tab.png` — AfricaRice Reporting tab today (3 tabs, project KPI cards, catalog).
  - `docs/specs/bilateral/center-overview-tab/mockup/reference-sp-overview-tab.png` — SP01 Overview: Overview first tab, `PHASE` selector + `Filter` under the tabs, violet hero KPI + 4 neutral KPI cards, progress card.
- **Notes:** the SP screenshot is the layout reference (band → tabs → controls row → KPI deck → cards). A generated mockup of the six card rows was **not** produced in this session; `/akili-specify` may generate one (stitch-design or a self-contained HTML under `mockup/`) before Judgment Day if the user wants to review card composition visually first — recommended, since the card set is the product decision here.

---

## Requirement Delta Preview

### ADDED Requirements

- Overview tab at `/bilateral/:acronym/overview`, first in the tab strip (Reporting remains the default landing — OQ-1).
- Controls row under the tabs: phase selector (Open phase default) + Filter popover (SP, project, type, role, source, method) + chips + clear; filters persist in the URL.
- KPI deck of five linked cards (Total, Pending review, Approved / approval rate, Needs attention, Projects covered).
- Six analytical cards (status donut, needs-attention list, results by project incl. zero-result projects, SP contribution, results by type, reporting pace) rendered with `app-pr-viz-chart` + a11y tables, tokenized colors, skeleton and empty states.
- Shared bilateral query-param contract; every Overview figure deep-links to a tab whose visible count equals the clicked figure.
- `selectedVersionId` shared across the four center tabs.
- `project_id` on the center-results payload.

### MODIFIED Requirements

- Results tab: phase, chips and search become URL-driven and read the shared phase signal (behavior identical when no params are present).
- Reporting tab: accepts `?program=`, `?project=`, `?multi=1` to pre-apply its existing quick filters.
- Draft Results tab: accepts `?project=`.

### REMOVED Requirements

- None. `/home` stays the Reporting tab URL; the legacy `activeTab='overview'` alias is repurposed to the real Overview tab (the only caller is `bilateral-home`, which passes `'reporting'`).

---

## Approach Options

### Option 1 — Client-side aggregation over existing endpoints + one additive field (Recommended)

Compose the three calls the shell already makes (center results per phase, center projects, AI drafts) in a cached `BilateralOverviewService`; aggregate with pure functions; render with the existing ECharts wrapper. Server change limited to `project_id` in the center-results SQL.

- **Pros:** zero new endpoints or migrations; the same rows feed Overview and Results tab, so counts reconcile by construction; follows the `portfolio-overview-echarts` precedent (20k rows aggregated < 150 ms, no backend load); testable in Jest without DB.
- **Cons:** Overview cost scales with results per center per phase (today tens to low hundreds — fine); Q7 pace uses `created_date`, not submission date (no `submitted_date` in the payload — accepted, labelled "created").

### Option 2 — New server aggregate endpoint `GET api/results/bilateral-center-overview`

Server returns pre-computed counts per status/type/project/SP/week.

- **Pros:** thin client; one request.
- **Cons:** a second predicate set on the server that can drift from the Results-tab SQL (the exact "81 vs 79" class of residual the SP Overview still carries); more server tests and Lambda surface; every new card needs a server release. Reserve for when a center exceeds a few thousand results per phase.

### Option 3 — Promote the Reporting tab's KPI strip into an "Overview" section on `/home`

Add charts above the project catalog instead of a new tab.

- **Pros:** no routing change.
- **Cons:** breaks the SP parity the user asked for, mixes analytics with the create-result workflow on one scroll, and leaves the cross-tab wiring unsolved.

---

## Recommended Approach

**Option 1.** It is the smallest path that delivers all nine questions with charts, keeps every number reconcilable against the Results tab, and reuses three already-hardened layers (viewport shell, ECharts wrapper + tokens, query-param contract pattern). The single server touch is additive and gated by a shape test.

Execution shape suggested for `/akili-specify` (Standard depth, ~7 tasks): (1) query-param contract + shared phase signal + Results-tab URL sync · (2) server `project_id` + client interface · (3) overview service + aggregation + tests · (4) chart builders + tests · (5) overview component: controls row, KPI deck, six cards, states · (6) route, tab, Reporting/Drafts param reading · (7) CT layout gate + live HITL at three breakpoints. Tasks 1–2 are prerequisites; 3–4 are parallel-safe; 5–6 depend on all.

---

## Risks, Dependencies, And Open Questions

### Risks

| Risk | Mitigation |
|---|---|
| **Count drift between Overview and Results tab** (the SP Overview's own recurring residual) | Same rows, same filter functions (`filterResults(rows, params)` shared by both tabs); Success Criterion 4 is a reconciliation check on live data, not a unit test |
| **Tab-strip collision with `ai-drafts-redesign`** (renames "Draft Results" → "AI Draft Results" in the same `bilateral-page-header.html`) | Land whichever executes first; the other rebases a one-line tab label — record in both `tasks.md` pre-flight |
| **Hard-rule drift** (`KZ-BOR-1`: 16 hexes / 12 PrimeIcons shipped past a clean review in the previous bilateral overview spec) | `design.md` must cite `onecgiar-pr-client/CLAUDE.md` §5 rules 8/19/21 as links; DoD carries a grep count (`#[0-9a-f]{3,6}` = 0, `pi pi-` = 0) per `KZ-BOR-2` |
| **`status_id` arrives as a string** in some payloads (`program-overview/CLAUDE.md` gotcha) | Normalize with `Number()` in the service boundary once; assert in tests |
| **Phase window for the pace chart** — `Phases.start_date/end_date` may be empty on some phases | Fall back to min/max `created_date`; hide the "today" marker outside the window |
| **Rendering cost** — 7 ECharts instances on one page | `pr-viz-chart` already uses SVGRenderer + ResizeObserver; cards below the fold render on first intersection (or accept eager render if HITL shows no jank) |
| **Verification blind spots** — Jest passes on code `ng build` rejects; CT silently skipped (`KZ-bugfix--lead-center-full-catalog-1`, memory) | Every task runs `tsc --noEmit` and the module's `*.cy.ts`; final HITL in the real browser at 1280 / 900 / 375 |

### Dependencies

- `bilateral/shell-sp-alignment` executed (sticky band + `#workArea` pattern present in the three tabs) — confirmed in code.
- `PhasesService.phases.reporting` populated (already relied on by the Results tab).
- `GET api/bilateral/ai/drafts?centerId=` returning `is_discarded` and `job.status` (present).

### Open Questions

| ID | Question | Recommendation |
|---|---|---|
| OQ-1 | Should Overview be the **default landing** of `/bilateral/:acronym` (SP parity) or should Reporting stay the landing with Overview merely first in the strip? | **Resolved 2026-09-14 (user): Reporting stays the landing.** Overview is first in the strip and reachable by URL. |
| OQ-2 | "Needs attention → Pending review older than N days": what N? | 14 days default, constant in the service; not user-configurable in v1. |
| OQ-3 | Should the Reporting pace card use `created_date` (available) or wait for a submission timestamp? | Use `created_date`, label the axis "results created"; revisit when review history is exposed per row. |
| OQ-4 | Is a Jira ticket being opened for this (P2-xxxx) so `requirements.md` can cite it? | Create one before `/akili-specify`; the proposal is ticket-less today. |
| OQ-5 | Generate a visual mockup of the six card rows before specifying? | **Resolved 2026-09-14 (user): yes.** Self-contained HTML mockup at `mockup/center-overview-tab.html` (Stitch and Claude Design MCPs unavailable in the session). |

---

## Success Criteria

1. `/bilateral/<acronym>/overview` renders the **Overview** as the first tab, active state styled like the SP shell; `/bilateral/<acronym>` still lands on Reporting; Reporting, Results, Draft Results unchanged in function.
2. Controls row sits directly under the tabs, stays visible while the work area scrolls; phase switch re-scopes every card and updates `?phase=`; filter popover applies to every card at once.
3. KPI deck and six cards render with skeletons → data → empty state (≤160px) for a center with zero results in the phase; all chart colors come from `resolveChartTokens()`; a11y table available for every chart.
4. **Reconciliation:** for AfricaRice on the Open phase, clicking each KPI card and each status tile opens the Results tab showing a row count equal to the clicked figure; clicking a project bar opens Results filtered to that project with matching count; clicking a zero-result project opens the Reporting tab with that project highlighted.
5. Phase chosen on Overview is the phase shown when switching to Results, and vice-versa.
6. Server: `bilateral-center-results` response gains `project_id`; existing fields unchanged; shape test green.
7. Quality gates: touched-module Jest green, `tsc --noEmit` clean, `ng lint` clean, CT layout spec green at 1280/900/375, grep gates `hex=0`, `pi pi-=0` on new files; live HITL screenshots recorded in `execution.md`.

---

## Next Step

```text
/akili-specify bilateral/center-overview-tab
```

Change track, Standard depth (new page + cross-tab contract + one additive server field). OQ-1 and OQ-5 resolved at approval; open the Jira ticket (OQ-4) before execution.
