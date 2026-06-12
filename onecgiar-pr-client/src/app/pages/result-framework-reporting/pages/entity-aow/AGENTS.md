# AGENTS.md — `entity-aow/`

> **Scope:** the `/result-framework-reporting/entity-details/:entityId/aow/*` flow — Areas of Work navigation, HLO/Outcomes tables, Report Result modal, View Results drawer, Target Details drawer, and 2030 Outcomes view.
> **Parent guide:** [`../../AGENTS.md`](../../AGENTS.md) (module root).

---

## 1. Purpose

For a given Science Program, this flow lets the user:

1. Browse the Areas of Work (AOW) tree in a sidebar.
2. For each AOW, see High-Level Outputs (HLO) and Intermediate Outcomes as tabs, each rendered as a grouped indicator table.
3. Report a new result against any indicator (the **Report Result modal**, with CGSpace/MELSpace/WorldFish handle validation for Knowledge Products).
4. View existing contributing results for an indicator (the **View Results drawer**).
5. Inspect Center × Year target breakdowns (the **Target Details drawer**).
6. View 2030 Outcomes (long-term planned outcomes).

---

## 2. Files in this folder

```
entity-aow/
├── entity-aow.component.{ts,html,scss,spec.ts}        Sidebar layout + breadcrumb + router-outlet
├── services/
│   └── entity-aow.service.{ts,spec.ts}                THE state container for this flow (287 LOC)
└── pages/
    ├── entity-aow-all/                                Placeholder ("works!")
    ├── entity-aow-unplanned/                          Placeholder
    ├── entity-aow-2030/                               2030 Outcomes table (reuses aow-hlo-table)
    └── entity-aow-aow/
        ├── entity-aow-aow.component.{ts,html,scss,spec.ts}     Tab UI: HLO | Outcomes
        └── components/
            └── aow-hlo-table/
                ├── aow-hlo-table.component.{ts,html,scss,spec.ts}    PrimeNG p-table with status chips
                └── components/
                    ├── aow-hlo-table-create-modal/    Report Result dialog
                    ├── aow-view-results-drawer/       Existing contributing results
                    └── aow-target-details-drawer/     Center × Year pivot
```

---

## 3. Routes

```
/entity-details/:entityId/aow                          Layout (EntityAowComponent) + redirect to /all
  ├── /all                                             Placeholder
  ├── /unplanned                                       Placeholder
  ├── /2030-outcomes                                   EntityAow2030Component → 2030 outcomes table
  └── /:aowId                                          EntityAowAowComponent → HLO + Outcomes tabs
```

The `:aowId` route co-exists with `/all`, `/unplanned`, `/2030-outcomes`. Order matters: literal paths match first, then `:aowId` catches the rest. **Do NOT reorder the route table.**

---

## 4. State — `EntityAowService` (287 LOC, the big one)

This is the **largest feature service in the module**. Singleton (`providedIn: 'root'`), shared with the `entity-details` page. Loading state mutations must be coordinated — components are responsible for calling `resetDashboardData()` when re-entering with a new `entityId`.

### 4.1 Signals (grouped)

```ts
// Selection / context
entityId, aowId
currentAowSelected = computed(() => entityAows().find(a => a.code === aowId()))

// Entity data
entityDetails, entityAows, indicatorSummaries, dashboardData
sideBarItems, isLoadingDetails, reportingEnabled
canReportResults = computed(() => ...)

// TOC tables (per AOW + 2030)
tocResultsOutputsByAowId, tocResultsOutcomesByAowId, tocResults2030Outcomes
isLoadingTocResultsByAowId, isLoadingTocResults2030Outcomes

// Report Result modal
showReportResultModal, currentResultToReport
w3BilateralProjects, selectedW3BilateralProjects
selectedEntities, existingResultsContributors

// View Results drawer
showViewResultDrawer, viewResultDrawerFullScreen, currentResultToView

// Target Details drawer
showTargetDetailsDrawer, targetDetailsDrawerFullScreen, currentTargetToView
```

### 4.2 `canReportResults` computed (gating logic)

```ts
canReportResults = computed(() => {
  if (this.api.rolesSE.isAdmin) return true;
  if (!this.reportingEnabled()) return false;
  const myInitiativesList = this.api.dataControlSE.myInitiativesList || [];
  const found = myInitiativesList.find(item => item.official_code === this.entityId());
  return !!found;
});
```

Truth table:

| isAdmin | reportingEnabled | owns initiative | canReportResults |
|---|---|---|---|
| true | * | * | **true** |
| false | false | * | **false** |
| false | true | false | **false** |
| false | true | true | **true** |

### 4.3 `checkReportingAccess` — fail-open behavior

```ts
private checkReportingAccess(initiativeId: number): void {
  const phaseId = this.api.dataControlSE.reportingCurrentPhase.phaseId;
  if (!phaseId || !initiativeId) {
    this.reportingEnabled.set(true);   // ← Fail-open: missing phase/initiative unlocks
    return;
  }
  this.api.resultsSE.GET_phaseInitiativeStatus(phaseId, initiativeId).subscribe({
    next: (res) => this.reportingEnabled.set(res.response?.reporting_enabled !== false),
    error: () => this.reportingEnabled.set(true)    // ← Fail-open: HTTP error unlocks
  });
}
```

> ⚠️ **Security concern**: this is fail-open. A transient 401/500 silently unlocks reporting during a closed window. Replicators on a stricter deployment should default to `false`.

### 4.4 `getAllDetailsData` — SGP-02 branching

```ts
getAllDetailsData(entityId?: string) {
  if (this.isSgp02(id)) {
    // SGP-02 branch: only fetch indicator summary, no AOWs
    GET_IndicatorContributionSummary(id) → {
      // resolve initiative from myInitiativesListReportingByPortfolio first,
      // fallback to GET_ScienceProgramsProgress
    }
  } else {
    // Main branch: forkJoin
    forkJoin({
      clarisaGlobalUnits: GET_ClarisaGlobalUnits(id),
      indicatorSummaries: GET_IndicatorContributionSummary(id)
    }) → set entityDetails, entityAows, indicatorSummaries, sideBarItems
  }
}
```

`isSgp02()` checks **both** `'SGP-02'` and `'SGP02'` (the upstream catalog returns either). **Centralize this check** — see the root AGENTS.md §11.1 for the known bug where `showBilateralResultsReview` only checks one variant.

### 4.5 Sidebar items

```ts
setSideBarItems() {
  this.sideBarItems.set([
    {
      isTree: true,
      label: 'By AOW',
      isOpen: true,
      items: this.entityAows().map(aow => ({
        label: aow.code,
        name: aow.name,
        itemLink: `/aow/${aow.code}`
      }))
    },
    {
      isTree: false,
      label: '2030 Outcomes',
      itemLink: '/aow/2030-outcomes'
    }
  ]);
}
```

---

## 5. API endpoints

| Verb | Path | Method (results-api.service.ts) | Used in |
|---|---|---|---|
| GET | `api/results-framework-reporting/clarisa-global-units?programId=<id>` | `GET_ClarisaGlobalUnits` | `getAllDetailsData` (non-SGP-02 branch) |
| GET | `api/results-framework-reporting/programs/indicator-contribution-summary?program=<id>` | `GET_IndicatorContributionSummary` | `getAllDetailsData` (both branches) |
| GET | `api/results-framework-reporting/toc-results?program=<id>&areaOfWork=<aow>` | `GET_TocResultsByAowId` | `getTocResultsByAowId` |
| GET | `api/results-framework-reporting/toc-results/2030-outcomes?programId=<id>` | `GET_2030Outcomes` | `get2030Outcomes` |
| GET | `api/results-framework-reporting/bilateral-projects?tocResultId=<id>` | `GET_W3BilateralProjects` | Create modal |
| GET | `api/results-framework-reporting/existing-result-contributors?resultTocResultId=<id>&tocResultIndicatorId=<id>` | `GET_ExistingResultsContributors` | Create modal + View Results drawer |
| GET | `api/results-framework-reporting/dashboard?programId=<id>` | `GET_DashboardData` | (Used by parent entity-details, but exposed here) |
| POST | `api/results-framework-reporting/create` | `POST_createResult` | Create modal submit |
| GET | `api/results/admin-panel/phases/<phaseId>/reporting-initiatives/<initiativeId>/status` | `GET_phaseInitiativeStatus` | `checkReportingAccess` |
| GET | `clarisa/initiatives[/<portfolioId>]` | `GET_AllInitiatives` | Create modal (contributing SPs dropdown) |
| GET | `clarisa/projects/get/all` | `GET_ClarisaProjects` | Create modal (projects dropdown) |
| GET | `api/results/results-knowledge-products/mqap?handle=<handle>` | `GET_mqapValidation` | Create modal "Sync" button |
| GET | `api/results/actors/type/all` | `GETAllActorsTypes` | (Used by drawer's innovation-use-content, exposed via api service) |

---

## 6. Components

### 6.1 `EntityAowComponent` (layout)

Standalone, OnPush. Sidebar + router-outlet + breadcrumb.

```html
<div class="entity-aow_layout">
  <aside class="entity-aow_sidebar">
    @for (item of sideBarItems(); ...) {
      // recursive: tree-mode "By AOW" + flat "2030 Outcomes" leaf
    }
  </aside>
  <main><router-outlet></router-outlet></main>
</div>
```

Reads `:entityId` from route params on init. Calls `getAllDetailsData()` only if `entityAows().length === 0` — relies on the service being warm from the parent `entity-details` page (race-avoidance pattern; if user lands directly on `/aow`, the call fires).

Sub-AoW item click also calls `getTocResultsByAowId(...)` to warm the TOC tables before the sub-route mounts. The active AoW item has `cursor: not-allowed; pointer-events: none` to prevent re-clicking.

`ngOnDestroy` does NOT clear state — `entity-aow-aow` does (see below).

### 6.2 `EntityAowAowComponent` (HLO + Outcomes tabs)

Standalone, OnPush. Two tabs:

```
high-level-outputs   →   <app-aow-hlo-table tableType="outputs">
outcomes             →   <app-aow-hlo-table tableType="outcomes">
```

`ngOnInit` subscribes to `route.params.aowId` and fires `getTocResultsByAowId(entityId(), aowId())`.

`ngOnDestroy` clears `entityAowService.aowId.set('')` — **important** to prevent stale aowId leaking to next mount.

### 6.3 `EntityAow2030Component`

Trivial — mounts and fires `get2030Outcomes(entityId)`. Renders `<app-aow-hlo-table tableType="2030-outcomes">`.

### 6.4 `AowHloTableComponent`

The grouped table. Standalone, OnPush. PrimeNG `p-table` with:
- `rowGroupMode="subheader"`, `groupRowsBy="result_title"`.
- `expandedRowKeys` is a `computed()` that pre-expands ALL groups by default.
- 5 columns: Indicator name (30%), Type (10%), Expected target 2025 (10%), Actual achieved (10%), Status (11%), Actions (16%).

Status chip mapping (using `getProgress()` to parse the leading number from `progress_percentage`):
- `progress === 0` or `null` → `not-started`
- `1 ≤ progress ≤ 99` → `in-progress`
- `progress === 100` → `achieved`
- `progress > 100` → `overachieved`

Per-indicator action buttons (1–3, depending on conditions):
1. **Report result** — when `canReportResults()` is true.
2. **View results** — always available.
3. **Target details** — only if `hasTargets(item, indicatorId)` (`targets_by_center.centers.length > 0`).

Empty state for HLOs with no indicators: shows a "Report result directly" button when `canReportResults()`.

### 6.5 `AowHloCreateModalComponent` (Report Result dialog)

The most complex artifact in this sub-tree. Two-column dialog.

**Left column — form fields:**
1. **Indicator category** (`p-select` OR read-only if `result_type_id` is preset from the indicator).
2. **Repository link/handle** (only for Knowledge Products, `result_type_id === 6`):
   - `pr-input` + Sync button.
   - Sync button validates URL against the CGSpace regex, then calls `GET_mqapValidation` to auto-fill the title.
   - CGSpace regex (verbatim, do not modify):
     ```regex
     /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/
     ```
3. **Title** (`pr-input` with `[maxWords]="30"`, auto-locked when KP metadata retrieved).
4. **TOC progressive narrative** (`pr-textarea` + info alert).
5. **Contribution to indicator target** (`p-inputnumber`, min 0, max 9,999,999).
6. **Contributing CGIAR Centers** (`pr-multi-select` over `centersSE.centersList`).
7. **Contributing Science Programs / Accelerators** (`p-multiselect` over `allInitiatives()`, excluding current entity).
8. **Contributing W3 / Bilateral Projects** (`p-multiselect` over `entityAowService.w3BilateralProjects()`, filtered by `currentResultToReport().toc_result_id`).

Selected centers, projects, and entities are shown as removable chips below their multiselects.

**Right column — existing results sidebar:** clickable list opens results in new tabs.

**On submit:**
```ts
POST /api/results-framework-reporting/create
body: {
  result: { result_type_id, result_level_id, initiative_id, result_name, handler },
  number_target, target_date,
  contributing_indicator,
  contributing_center: [...],
  knowledge_product: <mqapJson, only for KPs>,
  toc_result_id,
  toc_progressive_narrative,
  indicators: <currentResultToReport().indicators[0] | []>,
  contributors_result_toc_result: <selectedEntities>,
  bilateral_project: <selectedW3BilateralProjects>
}
// On success: navigate to /result/result-detail/<code>/general-information?phase=<version_id>
```

### 6.6 `AowViewResultsDrawerComponent`

PrimeNG `p-drawer` (right or full-screen). Shows existing contributing results as a sortable table (Code, Title, Status, Target achieved, PDF, Actions). PDF column links to `/reports/result-details/<code>?phase=<version_id>` in a new tab. Actions popover has a single "View" command (also opens in new tab).

`ngOnInit` toggles `document.body.style.overflow = 'hidden'`; `ngOnDestroy` restores `'auto'`.

Fakes a 1-second loading delay (`setTimeout` after fetching `existingResultsContributors`) — purely cosmetic.

### 6.7 `AowTargetDetailsDrawerComponent`

PrimeNG `p-drawer`. Renders a Center × Year pivot from `currentTargetToView()?.indicators?.[0]?.targets_by_center`.

```ts
years = computed(() => unique sorted years across all targets);
tableData = computed(() => centers.map(center => ({ center, targetsByYear })));
// All centers share the same year/target mapping (by design for current backend)
```

Also locks body scroll on init.

---

## 7. Behaviors / gotchas

1. **Service singleton sharing with entity-details**: `EntityAowService` is shared. Components MUST reset state when entering with a new `entityId` (see `entity-details/AGENTS.md` for the canonical reset path).

2. **Race condition prevention via sidebar click**: clicking a sub-AoW in the sidebar pre-warms `getTocResultsByAowId` before the route activates. Without this, the table sometimes mounts before the data arrives. This is intentional plumbing, not redundant code.

3. **`aowId` ngOnDestroy reset**: only `EntityAowAowComponent` clears `aowId`. If a new component is added that uses `aowId`, it must replicate the cleanup.

4. **`canReportResults` reads `myInitiativesList`**: a non-admin must own the initiative AND the phase must be open. Both gates are client-side; the backend MUST enforce them too on `POST /create`.

5. **CGSpace regex is the only validation before MQAP**: a malformed URL that passes the regex still goes to the MQAP backend, which does its own validation. Do not weaken the regex.

6. **`selectedEntities` in service vs modal**: the multiselect for "Contributing Science Programs" writes directly to `entityAowService.selectedEntities`. The chip removal helpers (`removeEntityOption`) also mutate the service signal. No two-way binding contract — the modal is intimately coupled to the service.

7. **The 3 drawers don't coordinate body scroll lock**: if 2 open at once (rare but possible defensively), closing one unlocks scroll while the other is still open. Same gotcha as `bilateral-results`.

---

## 8. Recommended tests

```ts
describe('EntityAowService', () => {
  it('canReportResults returns true for admins regardless of reportingEnabled or ownership');
  it('canReportResults returns false when reportingEnabled is false');
  it('canReportResults returns true when reportingEnabled true and initiative owned');
  it('canReportResults returns false when reportingEnabled true and initiative not owned');
  it('checkReportingAccess fail-opens (sets reportingEnabled true) when phaseId missing');
  it('checkReportingAccess fail-opens when initiativeId missing');
  it('checkReportingAccess fail-opens when GET_phaseInitiativeStatus errors');
  it('checkReportingAccess sets reportingEnabled false only on explicit reporting_enabled=false');
  it('getAllDetailsData branches to SGP-02 path for both "SGP-02" and "SGP02"');
  it('getAllDetailsData SGP-02 path fetches indicator summary only, empties entityAows');
  it('getAllDetailsData non-SGP path uses forkJoin and populates sideBarItems on success');
  it('resetDashboardData clears entityDetails, entityAows, indicatorSummaries, dashboardData');
});

describe('AowHloTableComponent', () => {
  it('expandedRowKeys returns all group keys (rows pre-expanded by default)');
  it('getStatusLabel returns Not started for progress 0 or null');
  it('getStatusLabel returns In progress for 1..99');
  it('getStatusLabel returns Achieved for 100');
  it('getStatusLabel returns Overachieved for >100');
  it('hasTargets returns true when indicator.targets_by_center.centers has elements');
});

describe('AowHloCreateModalComponent', () => {
  it('GET_mqapValidation regex rejects non-CGSpace/MELSpace/WorldFish handles');
  it('GET_mqapValidation regex accepts CGSpace items handle');
  it('GET_mqapValidation regex accepts hdl.handle.net/10568/<id>');
  it('createResult posts the expected body shape');
});
```

Cypress E2E:
1. Open Report Result modal, validate KP handle, sync metadata, submit, verify navigation to result-detail.
2. Open View Results drawer, click a row, verify navigates in same tab.
3. Open Target Details drawer, verify Center × Year pivot renders.
4. Switch between HLO and Outcomes tabs, verify counts update.

---

## 9. See also

- [`../../AGENTS.md`](../../AGENTS.md) — module root.
- [`../entity-details/AGENTS.md`](../entity-details/AGENTS.md) — parent page; shares `EntityAowService`.
- [`./services/entity-aow.service.ts`](./services/entity-aow.service.ts) — canonical state contract.
