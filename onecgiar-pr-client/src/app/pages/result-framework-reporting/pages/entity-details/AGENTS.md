# AGENTS.md — `entity-details/`

> **Scope:** the `/result-framework-reporting/entity-details/:entityId` page — the **dashboard for a single Science Program / Initiative**.
> **Parent guide:** [`../../AGENTS.md`](../../AGENTS.md) (module root).

---

## 1. Purpose

For a logged-in user who clicks into a Science Program from the Home page, this is the landing dashboard. It shows:

1. **Breadcrumb** with the entity's short name (multi-fallback resolution).
2. **Insights panel** — stat cards (Editing count, Submitted count) + two horizontal stacked bar charts (Outputs and Outcomes, split by Editing / Submitted / Quality assessed).
3. **Bilateral Results Review banner** (only when entity is NOT SGP-02) — a CTA into the bilateral review flow with a pending count.
4. **Reporting by Theory of Change** — a list of Area of Work (AOW) cards.
5. **Reporting by Result Category** — indicator-category cards grouped into Outputs vs Outcomes, with a "Report" action for unplanned results.
6. **Unplanned Result modal** — opens when the user clicks "Report" on an indicator card; reuses `app-report-result-form` from `ResultCreatorModule`.

---

## 2. Files in this folder

```
entity-details/
├── entity-details.component.{ts,html,scss,spec.ts}        Dashboard (347 LOC TS + 170 LOC HTML)
├── interfaces/
│   └── entity-details.interface.ts                        EntityDetails, Initiative, Unit, Metadata
└── components/
    ├── entity-aow-card/                                   Folder card → /aow/<code>
    ├── bilateral-results-review/                          Banner + pending count → /results-review
    └── entity-results-by-indicator-category-card/         Indicator card + report button
```

---

## 3. State sharing

This page is a **consumer** of `EntityAowService` (which lives in `../entity-aow/services/`), NOT an owner. Critical: `ngOnInit` calls `entityAowService.resetDashboardData()` on every route activation to purge state from the previous SP.

```ts
ngOnInit() {
  this.initChart();
  this.route.params.subscribe(params => {
    this.entityAowService.resetDashboardData();              // ← critical reset
    const entityId = params['entityId'];
    this.entityAowService.entityId.set(entityId);
    if (entityId) {
      this.entityAowService.getAllDetailsData(entityId);     // populates entityDetails, entityAows, indicatorSummaries
      this.entityAowService.getDashboardData();              // populates dashboardData
    }
  });
}
```

Without the reset, navigating between Science Programs leaks state because `EntityAowService` is `providedIn: 'root'` (singleton).

---

## 4. Computed signals

### 4.1 `summaryInsightsData` — stat card data

```ts
summaryInsightsData = computed(() => [
  { label: dashboardData()?.editing?.label,    value: dashboardData()?.editing?.total,    icon: 'editing_results.png' },
  { label: dashboardData()?.submitted?.label,  value: dashboardData()?.submitted?.total,  icon: 'submitted_results.png' }
]);
```

### 4.2 `dataOutputs` + `dataOutcomes` — Chart.js datasets

Both are stacked horizontal bar charts with 3 datasets (Editing / Submitted / Quality assessed):

```ts
dataOutputs = computed(() => ({
  labels: ['Knowledge product', 'Innovation development', 'Capacity sharing for development', 'Other output'],
  datasets: [
    { label: 'Editing',          backgroundColor: 'rgba(153, 153, 153, 0.6)', data: [...] },
    { label: 'Submitted',        backgroundColor: 'rgba(147, 197, 253, 1)',   data: [...] },
    { label: 'Quality assessed', backgroundColor: '#38DF7B',                  data: [...] }
  ]
}));

dataOutcomes = computed(() => ({
  labels: ['Policy change', 'Innovation use', 'Other outcome', 'IPSR'],
  datasets: [/* same 3-dataset shape */]
}));
```

Chart options:
- `indexAxis: 'y'` (horizontal bars).
- `responsive: true`, `maintainAspectRatio: false`, `aspectRatio: 0.8`.
- Axis max = `dataMax + axisPaddingValue (10)`.
- Data labels only show when value > 1 (via `chartjs-plugin-datalabels`).

`ChartDataLabels` plugin is registered in `initChart()` after `isPlatformBrowser(this.platformId)` — defensive SSR guard (the project is SPA but the guard is intentional).

### 4.3 `showBilateralResultsReview` — banner visibility

```ts
showBilateralResultsReview = computed(() => this.entityAowService.entityId() !== 'SGP-02');
```

> ⚠️ **BUG flagged in root §11.1**: this only checks `'SGP-02'`, NOT `'SGP02'` (the hyphen-stripped variant from the upstream catalog). Most other callsites guard both variants. Replicators should use a shared `isSgp02(id)` helper.

### 4.4 `groupedIndicatorSummaries` — Output vs Outcome split

```ts
groupedIndicatorSummaries = computed(() => {
  const summaries = entityAowService.indicatorSummaries()
    .filter(item => item?.resultTypeName !== 'Innovation Use(IPSR)');  // excluded

  const outputs = summaries.filter(item =>
    ['Innovation development', 'Knowledge product', 'Capacity sharing for development', 'Other output']
      .includes(item.resultTypeName)
  );

  const outcomes = summaries.filter(item =>
    ['Innovation use', 'Policy change', 'Other outcome']
      .includes(item.resultTypeName)
  );

  return { outputs, outcomes };
});
```

`'Innovation Use(IPSR)'` is explicitly excluded — IPSR results have their own module.

---

## 5. Multi-fallback entity name resolution

`entityDisplayShortName` getter has **3 fallback paths** to handle SGP-02:

```ts
get entityDisplayShortName(): string {
  const details = this.entityAowService.entityDetails();
  if (details?.shortName) return details.shortName;                    // 1. service-loaded

  const entityId = this.entityAowService.entityId();
  if (entityId === 'SGP-02' || entityId === 'SGP02') {
    // 2. dataControlSE lists
    const list = this.api.dataControlSE.myInitiativesListReportingByPortfolio
              ?? this.api.dataControlSE.myInitiativesList
              ?? [];
    const found = list.find(i => i?.official_code === 'SGP-02' || i?.official_code === 'SGP02');
    if (found) return found.short_name ?? found.shortName ?? found.name ?? 'No information loaded';

    // 3. mySPsList / otherSPsList from home service
    const mySPs    = this.resultFrameworkReportingHomeService.mySPsList() ?? [];
    const otherSPs = this.resultFrameworkReportingHomeService.otherSPsList() ?? [];
    const sp = [...mySPs, ...otherSPs].find(i => i?.initiativeCode === 'SGP-02' || i?.initiativeCode === 'SGP02');
    if (sp) return sp.initiativeShortName ?? sp.initiativeName ?? 'No information loaded';
  }

  return 'No information loaded';
}
```

This is fragile but it's how the current code handles the SGP-02 quirk where `clarisa-global-units` may not return the initiative correctly.

---

## 6. Unplanned Result modal

The "Report by Result Category" cards emit `(reportRequested)` when the user clicks the "Report" button. The page handler:

```ts
onReportRequested(item: any) {
  this.resultLevelSE.setPendingResultType(item?.resultTypeId, item?.resultTypeName);
  this.showReportModal.set(true);
}
```

The modal is a `<p-dialog>` wrapping `<app-report-result-form>` from `ResultCreatorModule` (cross-feature import). On close:

```ts
onModalClose() {
  this.showReportModal.set(false);
  this.resultLevelSE.cleanData?.();
}
```

> ⚠️ **Cross-feature coupling**: `ResultCreatorModule` and `ResultLevelService` come from `pages/results/`. Replicating this page requires importing the whole results feature graph OR extracting `app-report-result-form` into a shared module first.

---

## 7. Components

### 7.1 `EntityDetailsComponent`

See §3, §4, §5, §6 above. Heavy: 347 LOC TS + 170 LOC HTML. Standalone, OnPush.

Imports: `CommonModule, FormsModule, SelectModule, RouterModule, ProgressBarModule, EntityAowCardComponent, EntityResultsByIndicatorCategoryCardComponent, SkeletonModule, ChartModule, ButtonModule, DialogModule, SplitButtonModule, ResultCreatorModule, BilateralResultsReviewComponent`.

### 7.2 `EntityAowCardComponent`

```ts
@Input() item: Unit;
```

Folder card linking to `/result-framework-reporting/entity-details/<entityId>/aow/<code>`. Shows Editing + Submitted counts as dotted badges with semantic colors:
- Editing dot: `var(--pr-color-accents-3)` (grey).
- Submitted dot: `var(--pr-color-blue-300)` (light blue).

### 7.3 `BilateralResultsReviewComponent` (banner)

Standalone, **NOT OnPush** (one of the few non-OnPush components in the module).

On init: reads `entityId` from `activatedRoute.snapshot.params` and calls `GET_PendingReviewCount(entityId)` → updates `pendingCount` signal.

Renders a banner with:
- `material-icons-round` schedule icon.
- Title: "Bilateral Results Review".
- Separator: "•".
- Count: "{n} Pending review".
- Description.
- CTA: "Review results" linking to `['results-review']` (relative).

### 7.4 `EntityResultsByIndicatorCategoryCardComponent`

```ts
@Input() item: any;
output reportRequested = output<any>();
```

Icon mapping by `resultTypeId`:
- `7` → `pi pi-flag` (Innovation development)
- `6` → `pi pi-book` (Knowledge product)
- `5` → `pi pi-users` (Capacity sharing)
- `2` → `pi pi-sun` (Innovation use)
- `1` → `pi pi-folder-open` (Policy change)
- default → `pi pi-folder`

Renders Editing/Submitted dotted badges. Emits `reportRequested` on Report button click — handled by parent.

Two button variants for responsive layout:
- "Report" with `+` icon (default).
- "Report result" — slim variant for narrow widths.

Both hidden behind `entityAowService.canReportResults()`.

---

## 8. API endpoints used

| Verb | Path | Caller |
|---|---|---|
| GET | `api/results-framework-reporting/clarisa-global-units?programId=<id>` | `getAllDetailsData` (via EntityAowService) |
| GET | `api/results-framework-reporting/programs/indicator-contribution-summary?program=<id>` | `getAllDetailsData` |
| GET | `api/results-framework-reporting/dashboard?programId=<id>` | `getDashboardData` |
| GET | `api/results/pending-review?programId=<id>` | `BilateralResultsReviewComponent` (banner pending count) |
| GET | `api/results/admin-panel/phases/<phaseId>/reporting-initiatives/<initiativeId>/status` | `checkReportingAccess` |
| GET | `api/results-framework-reporting/get/science-programs/progress` | SGP-02 fallback resolution |

---

## 9. Behaviors / gotchas

1. **`resetDashboardData` is the only safety against state leak**. If you add a new field to `EntityAowService`, add it to `resetDashboardData()` too.

2. **SGP-02 hides the bilateral banner but the `showBilateralResultsReview` check is incomplete** (only `'SGP-02'`, not `'SGP02'`). See root §11.1.

3. **Chart options are computed per render** — `chartOptionsOutputs` and `chartOptionsOutcomes` re-run every time the chart data changes. For 4-bar charts this is fine; if you add 20+ bars, consider memoizing.

4. **PNG asset paths are relative**:
   - Hero charts icons: `assets/result-framework-reporting/editing_results.png`, `submitted_results.png`.
   - The asset folder must exist in the new app, or the cards render broken images.

5. **`Innovation Use(IPSR)` filter is hardcoded** — the name string must match the backend's `resultTypeName` exactly. If the backend renames it, the IPSR row will reappear in Outputs/Outcomes.

6. **The hidden `p-splitbutton`** — there's a `[hidden]="true"` p-splitbutton in the "Reporting by Result Category" header. It's a dead UI element; the menu items (`AI Assistant`, separator, `Unplanned result`) are defined in TS but never shown. The unplanned-report flow is currently triggered only from the indicator cards' `reportRequested` output. Don't delete the splitbutton — its modal logic is still wired.

7. **`changeDetection: OnPush` requires `markForCheck()` for non-signal updates** — the component injects `ChangeDetectorRef` and calls `cd.markForCheck()` in `initChart()` after registering the Chart.js plugin. Without this, the chart wouldn't render on first paint.

---

## 10. Recommended tests

```ts
describe('EntityDetailsComponent', () => {
  it('ngOnInit calls entityAowService.resetDashboardData on every route activation');
  it('ngOnInit subscribes to route.params and calls getAllDetailsData/getDashboardData with new entityId');
  it('showBilateralResultsReview returns false for entityId "SGP-02"');
  it('showBilateralResultsReview KNOWN BUG returns true for entityId "SGP02" (only checks hyphenated)');
  it('groupedIndicatorSummaries excludes Innovation Use(IPSR) and splits the rest into outputs/outcomes');
  it('summaryInsightsData maps editing/submitted totals from dashboardData');
  it('chartOptions axis max equals dataMax + axisPaddingValue (10)');
  it('chartOptions datalabels formatter shows label only for values > 1');
  it('entityDisplayShortName falls back through 3 paths for SGP-02');
  it('entityDisplayShortName returns "No information loaded" when all fallbacks miss');
  it('initChart registers ChartDataLabels only inside isPlatformBrowser');
  it('onReportRequested sets pending result type and opens the modal');
  it('onModalClose closes the modal and calls resultLevelSE.cleanData');
});
```

Cypress E2E:
1. Navigate from Home → SP card → verify entity-details renders charts + AOW cards + indicator cards.
2. Open Unplanned Result modal, verify result-creator form mounts.
3. SGP-02 entity: verify bilateral banner is hidden and AOW list is empty.
4. Click an AOW card, verify navigation to `/aow/<code>`.
5. Click the Bilateral banner (non-SGP-02), verify navigation to `/results-review`.

---

## 11. See also

- [`../../AGENTS.md`](../../AGENTS.md) — module root.
- [`../entity-aow/AGENTS.md`](../entity-aow/AGENTS.md) — child page; the dashboard is its consumer.
- [`./interfaces/entity-details.interface.ts`](./interfaces/entity-details.interface.ts) — canonical TS shapes.
