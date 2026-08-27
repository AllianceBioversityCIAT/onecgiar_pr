# Results Framework & Reporting — Module Guide

> **Deep functional + conceptual documentation** of `src/app/pages/result-framework-reporting/` and all its children (home, entity-details, entity-aow, bilateral-results). This is the reference to read **before touching any reporting flow** in this module. It complements (and supersedes where they conflict) the per-folder `AGENTS.md` files, several of which are partially stale (see §9).
>
> Last full audit: 2026-07-15 (branch `front-redesign-fields`, P25 · Reporting 2026 phase).

---

## 1. What this module is

This is the **P25 reporting surface and the de-facto landing page of PRMS**: the app-level wildcard route redirects to `result-framework-reporting`, whose own `**` fallback redirects to `home`.

It serves one job: **let a Science Program (SP) / Accelerator member report results for the current reporting phase and keep the program's reporting healthy**. It offers three distinct reporting-related workflows:

| # | Workflow | Where | Creates/changes |
|---|---|---|---|
| A | **Report against ToC indicators** ("planned") | `entity-aow` (indicators tables) | New PRMS result **linked to a ToC indicator** |
| B | **Report Emerging results** ("unplanned") | `entity-details` (indicator-category cards → modal) | New PRMS result **not planned in the ToC** |
| C | **Bilateral Results Review** | `bilateral-results` | Approve/Reject of Center-submitted bilateral results |

Both A and B end in the same place: the standard **Result Detail editor** (`/result/result-detail/{code}/general-information?phase={version_id}`) where the user completes the result. The module only handles *creation + context*; editing lives in the `results` feature.

## 2. Concept glossary

- **Science Program (SP) / Accelerator** — the reporting entity (e.g. `SP01 - Breeding for Tomorrow`, `SGP-02 - AVISA`). Identified by `initiativeCode` / `official_code`; this is the `:entityId` route param.
- **Phase** — the reporting cycle (e.g. "P25 · Reporting 2026", `phaseId` 36 for 2026). The module **never fetches phases itself**: `header-panel` (shell chrome) calls `dataControlSE.getCurrentPhases()` → `GET /api/versioning?status=open&module=Reporting` and fills `dataControlSE.reportingCurrentPhase` (plain object) + `reportingPhaseVersion` (version signal used as CD trigger).
- **AOW (Area of Work)** — a program's ToC subdivision (AOW01 Market Intelligence, …). Comes from `clarisa-global-units` as `units[]`.
- **HLO / Outcome / 2030 Outcome** — ToC result groups per AOW. Each group has **indicators** (KPI statements) with a target (`target_value_sum`), achieved value (`actual_achieved_value_sum`) and `progress_percentage` → status chip (0 Not started / 1-99 In progress / 100 Achieved / >100 Overachieved).
- **Indicator category = result type** — `result_type_id`: 1 Policy change, 2 Innovation use, 5 Capacity sharing for development, 6 Knowledge product, 7 Innovation development, plus "Other output/outcome". KP (6) has a special create path (repository handle + MQAP sync).
- **Result status** (workflow lifecycle, used everywhere in this module): `1 Editing` (yellow), `2 Quality Assessed` (blue), `3 Submitted` (brand indigo), `4 Discontinued` (orange), `5 Pending Review` (gray — bilateral pending). Visual mapping centralised in `pages/result-framework-reporting-home/status-meta.ts` (mirrors the global `completeness-*` classes in `styles.scss`).
- **Bilateral result** — a result submitted by a CGIAR **Center** against a program's bilateral project; it enters as `status_id == 5` (Pending Review) and a program admin must APPROVE (→ submitted) or REJECT it.

## 3. Route map

All child routes are declared **outside the module folder** in `src/app/shared/routing/routing-data.ts` (`ResultFrameworkReportingRouting`, ~line 471). Only guard: `CheckLoginGuard` on the parent. No resolvers; no child guards (access control is server-side + UI gating).

```
/result-framework-reporting
├── home                                → result-framework-reporting-home (landing)
├── entity-details/:entityId            → entity-details (SP dashboard)
├── entity-details/:entityId/results-review → bilateral-results (review workspace)
├── entity-details/:entityId/aow        → entity-aow (shell + Indicators sidebar)
│   ├── '' → redirect 'all'
│   ├── all            → PLACEHOLDER ("entity-aow-all works!")   ← dead page, default target!
│   ├── unplanned      → PLACEHOLDER ("entity-aow-unplanned works!")
│   ├── 2030-outcomes  → entity-aow-2030 (same table, tableType '2030-outcomes')
│   └── :aowId         → entity-aow-aow (HLO/Outcomes tabs)      ← must stay LAST (route order is load-bearing)
└── ** → redirect home
```

**Module shell** (`result-framework-reporting.component.ts`) is a bare `<router-outlet>` whose `ngOnInit` sets the tab title AND preloads the home data (`getScienceProgramsProgress()` + `getRecentActivity()`) — so **entering any child route fires the home GETs too**.

## 4. Screens & what they load

### 4.1 Home (`/home`)

Two-column layout `grid-cols-[1fr_380px]` (collapses <1115px; the right column is duplicated as a mobile block — **any change must be applied in both spots**).

- **Left**: hero (welcome + phase chip) → "My Science Programs/Accelerators" cards → "Other Science Programs/Accelerators" cards. Each card (`result-framework-reporting-card-item`) shows `totalResults` + a segmented status bar + chips, and navigates to `entity-details/{initiativeCode}`.
- **Right (380px sidebar)**: **Reporting overview** widget (`result-framework-reporting-insights`, added 2026-07-15) above **Recent activity** (feed items deep-link to Result Detail preserving `?phase=`). The widget renders: stat tile (total results + programs), a **Chart.js doughnut** of my results by status (center total, status chips as legend), and a **Chart.js horizontal bar chart** of submission progress per SP (% Submitted+QAed) — all computed from `mySPsList()`, zero extra endpoints. Chart colors are resolved at runtime from `--pr-*` CSS tokens (no hex in TS). The **page-wide Compact toggle** is a colored button placed under the hero, left-aligned, with a hover tooltip explaining what it does (`ResultFrameworkReportingHomeService.compactView`, persisted in `localStorage['pr-rfr-home-compact']`): compact mode hides the charts (keeps stat + chips) AND hides the status bar/chips inside every SP card. Active state = solid brand button "Expanded view"; inactive = soft brand "Compact view". The SP-card status block **animates open/closed** on toggle via Angular 20+ `animate.enter`/`animate.leave` (native, no `BrowserAnimationsModule`): a **left-to-right `clip-path` wipe** reveals/erases the content while `grid-template-rows: 0fr↔1fr` + top margin collapse the height in parallel (see `result-framework-reporting-card-item.component.scss`, honors `prefers-reduced-motion`).

Data: `GET api/results-framework-reporting/get/science-programs/progress` → `{ mySciencePrograms: SPProgress[], otherSciencePrograms: SPProgress[] }`; `GET api/notification/recent-activity` → `RecentActivity[]`. State in `ResultFrameworkReportingHomeService` (root singleton, signals).

`SPProgress` = `{ initiativeId, initiativeCode, initiativeName, initiativeShortName, portfolio*, entityType*, totalResults, progress, versions: [{ versionId, phaseName, phaseYear, totalResults, statuses: [{ statusId, statusName, count }] }] }`.

### 4.2 Entity details (`/entity-details/:entityId`) — the SP dashboard

- **Insights panel**: Editing/Submitted stat tiles + two Chart.js stacked horizontal bars (Outputs / Outcomes × Editing/Submitted/QAed) from `GET .../dashboard?programId=` (a full 3-status × 8-category matrix — more data than is rendered today).
- **Bilateral Results Review banner**: pending count from `GET api/results/pending-review?programId=` + CTA → `results-review`. Hidden for `SGP-02` (⚠️ but not for the `'SGP02'` spelling — known bug).
- **"Results planned in your {year} ToC"**: one AOW card per `Unit` from `GET .../clarisa-global-units?programId=` with Editing/Submitted counts; "Report against indicators" → `aow/{code}` (workflow A).
- **"Report Emerging results"**: indicator-category cards from `GET .../programs/indicator-contribution-summary?program=` (`totalsByType`, "Innovation Use(IPSR)" filtered out client-side), grouped OUTPUTS/OUTCOMES. "Report result" → workflow B modal.

### 4.3 Entity AOW (`/entity-details/:entityId/aow/...`) — indicators & workflow A

Shell renders breadcrumb + "Indicators" sidebar ("By AOW" tree + "2030 Outcomes") + outlet. Per AOW: `GET .../toc-results?program=&areaOfWork=` → `{ tocResultsOutputs, tocResultsOutcomes }`, rendered in two tabs of a grouped table (`aow-hlo-table`, grouped by `result_title`, all expanded, client-side search + status filter). Row actions:

- **Report result** (gated by `canReportResults()`) → create modal (§5A).
- **View results** → drawer listing existing contributors (`GET .../existing-result-contributors?...`), deep-links + PDF links per row.
- **Target details** (only when `targets_by_center.centers.length > 0`) → client-side Center × Year pivot drawer.

### 4.4 Bilateral results (`/entity-details/:entityId/results-review`) — workflow C

Centers sidebar (CLARISA centers with pending badges = count of `status_id == 5` per `lead_center`) + grouped-by-project table (`GET api/results/by-program-and-centers?programId=[&centerIds=]` — `centerIds` appended **only when exactly 1 center** is selected) + client-side filters (search persisted as `?search=`, center as `?center=`; the 3 multiselects are NOT URL-persisted). Row → **review drawer** (§5C).

## 5. The three reporting flows in detail

### 5A. Report against a ToC indicator (planned) — `aow-hlo-create-modal`

1. Row "Report result" → `openReportResultModal` stores `{group, indicators:[indicator]}` in `EntityAowService.currentResultToReport` (always exactly ONE indicator, or `[]` for indicator-less HLOs).
2. Modal `ngOnInit` fetches: `bilateral-projects?tocResultId=`, `existing-result-contributors?...` (right column "Existing results"), `clarisa/initiatives/p25` (contributing SPs, current entity excluded).
3. Form: Indicator category (read-only if the indicator carries `result_type_id`, else select from `resultsListFilterSE.filters.resultLevel` — ⚠️ implicit dependency: populated by `ResultLevelService`'s constructor); **KP path**: handle input + Sync → hard regex (CGSpace / MELSpace / WorldFish / hdl.handle.net prefixes — do NOT modify) → `GET api/results/results-knowledge-products/mqap?handle=` → title auto-filled + locked; Title (max 30 words); ToC alignment narrative (`toc_progressive_narrative`); numeric "Contribution to indicator target"; contributing Centers / SPs / W3-bilateral projects (multi-selects with chips).
4. **"Create and continue"** → `POST api/results-framework-reporting/create` with composite body `{ result: {result_type_id, result_level_id, initiative_id, result_name, handler}, number_target, target_date, contributing_indicator, contributing_center, knowledge_product (mqapJson|null), toc_result_id, toc_progressive_narrative, indicators, contributors_result_toc_result, bilateral_project }`.
5. One save creates: the result (+phase version), the ToC link (indicator + contribution + narrative), center/SP/bilateral-project links, and the KP record if synced. Then navigates to Result Detail.

⚠️ Client-side validation is minimal: the submit button is only disabled while `creatingResult()` — empty title/category surfaces as a server error toast (council finding, confirmed).

### 5B. Report Emerging result (unplanned) — `report-result-form` (cross-feature)

1. Indicator-category card emits `reportRequested` → `entity-details` calls `resultLevelSE.setPendingResultType(resultTypeId, name)` + `showReportModal.set(true)`.
2. The modal body is **`app-report-result-form` from `pages/results/pages/result-creator`** (cross-feature import of `ResultCreatorModule` — replicating this page drags in the whole results graph). Header copy: "This reporting pathway is intended for results that are not planned for in the Program's ToC".
3. Form: "Report for" select **locked to the current SP**; Output/Outcome level cards (levels 4/3 from `GET api/results/type-by-level/get/all`); Indicator category radio (pre-selected via `consumePendingResultType`, user may change); Title with **Elasticsearch duplicate-title check** (debounced 500ms, direct POST to `environment.elastic.baseUrl` with Basic creds — interceptor skips auth header; exact match blocks Save); KP path = handle + Sync like 5A.
4. Save → `POST v2/api/results/create/header` (non-KP; note **v2**) or `POST api/results/results-knowledge-products/create` (KP) → toast → navigate to Result Detail.

**Key asymmetry (revamp target):** workflows A and B use **two completely different modal components** for the same conceptual job ("report a result"), with different validation, different KP handling code, different endpoints (`results-framework-reporting/create` vs `results/create/header`) and different UX (B has duplicate-title check and level cards; A has ToC contribution fields, centers/SPs/bilateral pickers). Any flow-simplification redesign should aim at **one form** with the endpoints kept as-is per pathway.

### 5C. Bilateral Results Review — `result-review-drawer` (~1,650 lines)

1. Row "Review result" (only `status_id == 5` — loose `==` on purpose, backend returns number or string — AND user is admin or program member) opens the drawer; "See result" = read-only.
2. Drawer load: `GET api/results/bilateral/{id}` (contract doc: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`) + catalogs (clarisa projects, institutions poll ~3s timeout, initiatives-without-result). It **mutates global state** while open: `api.resultsSE.currentResultId`, `dataControlSE.currentResult` (portfolio 'P25'), **flips `RolesService.readOnly = false`** (restored on destroy — crash before destroy leaves widgets unlocked, council finding), `document.body.overflow`.
3. Optional edits, each an independent PATCH: title (`PATCH api/results/bilateral/{id}/title`, no justification — pencil rendered even in read-only mode, backend must gate); ToC alignment (`PATCH .../review-update/toc-metadata/{id}`); Data Standards (`PATCH .../review-update/data-standard/{id}` — description/geo/centers/projects/SPs/partners/evidence + one per-type section: 1 policy, 2 innovation-use, 5 cap-sharing, 6 KP read-only, 7 inno-dev). Both section saves require a justification (`updateExplanation`) via the shared dialog and reload the detail on success.
4. **Decision**: APPROVE (enabled only when ToC complete + no unsaved changes; justification hardcoded `"Approved"`) or REJECT (free-text justification required) → `PATCH api/results/bilateral/{id}/review-decision {decision, justification}` → table + sidebar badges refresh, drawer closes.

## 6. State & permission model

| Service (all `providedIn:'root'`) | Owns | Shared with |
|---|---|---|
| `ResultFrameworkReportingHomeService` | SP lists, recent activity, loading flags | shell, home, insights widget, entity-details (SGP-02 name fallback), dormant `WebsocketService` |
| `EntityAowService` (in `entity-aow/services/`) | entityId/aowId, entityDetails, entityAows, indicatorSummaries, dashboardData, ToC results, ALL modal/drawer open-state, `reportingEnabled`, `canReportResults` | **entity-details AND entity-aow** (de-facto owner of both pages' state). New fields must be added to `resetDashboardData()` or they leak between SPs |
| `BilateralResultsService` | centers, selection, filters, tableData/tableResults, `allResultsForCounts`, pending counts | bilateral-results tree |

**Permissions:** `canReportResults() = rolesSE.isAdmin OR (reportingEnabled AND entity ∈ dataControlSE.myInitiativesList)`. `reportingEnabled` comes from `GET api/results/admin-panel/phases/{phaseId}/reporting-initiatives/{initiativeId}/status` and **fails open** (missing phase/initiative or HTTP error ⇒ `true`). `myInitiativesList` is filled by header-panel's `updateUserData()` — the module never fetches it. **Every gate is client-side; the backend must enforce on POST/PATCH.**

## 7. Endpoint inventory (module-triggered)

| Verb | Path | Used by |
|---|---|---|
| GET | `api/results-framework-reporting/get/science-programs/progress` | home (+ SGP-02 fallback) |
| GET | `api/notification/recent-activity` | home |
| GET | `api/results-framework-reporting/clarisa-global-units?programId=` | entity-details, entity-aow, bilateral |
| GET | `api/results-framework-reporting/programs/indicator-contribution-summary?program=` | entity-details (sole call for SGP-02) |
| GET | `api/results-framework-reporting/dashboard?programId=` | entity-details charts |
| GET | `api/results-framework-reporting/toc-results?program=&areaOfWork=[&year=]` | entity-aow (`year` never sent — dead param) |
| GET | `api/results-framework-reporting/toc-results/2030-outcomes?programId=` | entity-aow 2030 |
| GET | `api/results-framework-reporting/bilateral-projects?tocResultId=` | create modal A |
| GET | `api/results-framework-reporting/existing-result-contributors?resultTocResultId=&tocResultIndicatorId=` | create modal A + view drawer |
| POST | `api/results-framework-reporting/create` | **workflow A create** |
| POST | `v2/api/results/create/header` / `api/results/results-knowledge-products/create` | **workflow B create** (non-KP / KP) |
| GET | `api/results/results-knowledge-products/mqap?handle=` | KP Sync (both A & B) |
| GET | `api/results/type-by-level/get/all` | level/category catalogs (B) |
| GET | `api/results/admin-panel/phases/{phaseId}/reporting-initiatives/{initId}/status` | reporting gate |
| GET | `api/results/pending-review?programId=` | bilateral banner |
| GET | `api/results/by-program-and-centers?programId=[&centerIds=]` | review table (+ counts refresh) |
| GET | `api/results/bilateral/{id}` | review drawer |
| PATCH | `api/results/bilateral/{id}/title` · `.../review-update/toc-metadata/{id}` · `.../review-update/data-standard/{id}` · `.../{id}/review-decision` | review drawer |
| GET | `api/versioning?status=open&module=Reporting` | NOT called here — header-panel fills the phase the module reads |
| GET | CLARISA catalogs (`centers`, `projects`, `initiatives[...]`, policy/innovation lists, institutions, regions/countries) | lazily by global services' constructors |
| POST | `{environment.elastic.baseUrl}` (direct ES, Basic auth) | duplicate-title check (B only) |

## 8. Data already in memory (build UI/charts WITHOUT new endpoints)

- **Home**: `SPProgress[]` gives per-SP, per-version, per-status counts (powers the "Reporting overview" widget); `RecentActivity[]` (⚠️ can be empty for a user — verify before building time-series on it).
- **Entity details**: `dashboardData` is a full 3-status × 8-category matrix (only partially rendered); `entityAows[].resultsCount {editing, submitted}` per AOW; `indicatorSummaries.totalsByType`.
- **Entity AOW**: per indicator `target_value_sum`, `actual_achieved_value_sum`, `progress_percentage`, `targets_by_center {centers[], targets[]}`.
- **Bilateral**: `allResultsForCounts` (flat, all centers) → per-status / per-category / per-center / per-project counts + `submission_date` series.

## 9. Known quirks, bugs & friction (revamp backlog)

**Bugs / risks (confirmed against code):**
- `showBilateralResultsReview` only checks `'SGP-02'`, not `'SGP02'` (other guards check both) — use a shared `isSgp02()`.
- Create modal A: removing a Contributing-Center chip mutates the signal array with `splice` (no `.set()`) — no re-render guarantee under OnPush; mirror `removeBilateralProject`.
- Create modal A: no client-side required-field validation (empty title/category → server toast).
- Review drawer: global `RolesService.readOnly` flip (restored only in `ngOnDestroy`); `contributingProjects` payload built then overwritten with raw detail (dead mapping); first selected center becomes lead by array index; `planned_result null` coerced to `false`; duplicate `(selectOptionEvent)` binding.
- View-results drawer fakes loading with `setTimeout(1000)` (not tied to the HTTP).
- Sidebar AOW click fires the ToC GET twice (pre-warm + ngOnInit).
- Bilateral deep-link with `?center=X` never hydrates `allResultsForCounts` → other centers show no badges until "All Centers" is clicked.
- `.DS_Store` files committed under `bilateral-results/`.
- `bilateral-results.service.ts` seeds `tableData` with a ghost all-empty-strings row.

**Structural friction (what a flow-simplification should attack):**
- **Two different "Report result" modals** for the same job (A bespoke vs B cross-feature `report-result-form`) — different validation, KP code, endpoints and UX (see §5B note). Consolidate the FORM, keep endpoints.
- Default `/aow` route lands on a **placeholder page** (`all`); `unplanned` is also a stub.
- Cross-feature coupling: entity-details imports `ResultCreatorModule` + `ResultLevelService`; modal A depends on `resultsListFilterSE.filters.resultLevel` being populated as a side effect.
- Review drawer is ~1,650 lines with ~10 `setTimeout` workarounds — extraction candidate.
- Data loads live in the module shell (every child entry re-fires home GETs).
- Hardcoded: `'p25'` portfolio in modal A's initiatives call, chart hex colors in entity-details TS (violates `--pr-*` token rule), `unit_messurament` (sic, backend field name), "Title retrived" typo shown to users.
- Both API home methods typed `<any>` despite `SPProgress`/`RecentActivity` interfaces existing.
- Per-folder `AGENTS.md` files describe the pre-redesign PrimeNG UI (p-table/p-dialog/p-drawer) — on `front-redesign-fields` the code uses custom `pr-table`/`pr-dialog`/custom drawers + Spartan `HlmButton`. Trust the code (and this file) over those docs.

## 10. Change log

| Date | Change |
|---|---|
| 2026-07-15 | Document created (full module audit: 5 parallel readers + DeepSeek council + manual verification). Added `result-framework-reporting-insights` widget (Reporting overview: stat tile + Chart.js doughnut by status + Chart.js bars per SP) to home right column; extracted `STATUS_META` to `status-meta.ts` (shared by card-item + insights, now with `chartVar` tokens); added page-wide Compact view preference (`compactView` signal in the home service, affects widget + SP cards, persisted in localStorage). |
