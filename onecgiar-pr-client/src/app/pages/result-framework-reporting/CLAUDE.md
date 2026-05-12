# Bilateral Module — Frontend Replication Guide

> **Source**: `onecgiar-pr-client/src/app/pages/result-framework-reporting/`
> **Target audience**: A developer or team that needs to **extract this module and rebuild it in another application**, possibly with a different folder structure or a different stack.
> **Scope**: Everything required to replicate the module 1:1, including routes, components, services, signals, HTTP contracts, conventions, design tokens, and the implicit behavior that lives in the code but is not obvious by reading file names.
> **Last reviewed**: against the codebase on branch `staging`. Module size: ~7,000 LOC of `.ts`/`.html`/`.scss` (excluding `.spec.ts`).
> **Independently reviewed by**: DeepSeek R1, Google Gemini, Moonshot Kimi (see §17).

This document is the **single source of truth** for replicating the module. The accompanying `result-framework-reporting/` folder is the canonical implementation. Read this doc end-to-end before touching code in the target application.

### 0.1 How to use this document in a different stack

The module is described twice: once in **Angular terms** (because that is its current home) and once in **stack-agnostic terms** wherever a behavior cannot be expressed without an implementation detail. If you are replicating into a non-Angular project:

| Angular concept used in this doc | Stack-agnostic equivalent |
|---|---|
| `signal<T>()`, `computed()`, `effect()` | Any reactive primitive (Vue `ref`/`computed`/`watch`, React `useState`/`useMemo`/`useEffect`, Svelte stores, Solid signals). |
| `@Injectable({ providedIn: 'root' })` | A singleton store / global context. |
| `loadComponent` / `loadChildren` (Router lazy load) | Code-splitting per route. |
| PrimeNG `p-drawer`, `p-table`, `p-multiselect`, `p-dialog` | Any UI library that provides side drawer, grouped table, multi-select, modal dialog. |
| `OnPush` change detection | "Render only on state change" — most non-Angular reactive frameworks do this by default. |
| `app-cp-multiple-wps` (the TOC tree) | A nested tree picker bound to a TOC graph. Replicate the I/O contract listed in §10. |
| `RolesService.readOnly` (global toggle) | DO NOT replicate as a global. Use an explicit `readOnly` prop on every child. See §14. |
| Standalone components vs NgModule | Whatever module/file boundary your stack supports — preserve the public surface, not the syntax. |

The key **non-negotiables** to preserve across any stack:
- The route structure under `/result-framework-reporting/*` (§4).
- The API contracts in §6 + §16 (these are the backend's responsibility, do not deviate).
- The behavior catalog in §11 (these are correctness gates, not implementation details).
- The dirty-tracking + justification rules in §8.6–8.7 (compliance requirement).
- The status mapping (`status_id == 5` is "Pending review"; Approve/Reject only when pending).

---

## 1. Module mission (what does this module do)

The `result-framework-reporting` module is the landing surface and analytics dashboard for **Science Programs / Accelerators** at CGIAR (the institution that owns PRMS). From here a logged-in user can:

1. **Home** — see their own Science Programs (mySPs) and others (otherSPs), plus a "Recent activity" feed.
2. **Entity Details** — drill into one Science Program and see:
   - A summary stats panel (Editing + Submitted counts).
   - Two horizontal stacked bar charts (Outputs and Outcomes) split by Editing / Submitted / Quality assessed.
   - A "Bilateral Results Review" banner with a pending-count, that opens the review queue.
   - "Reporting by Theory of Change" — a list of Areas of Work (AoW) cards.
   - "Reporting by Result Category" — indicator-category cards grouped into Outputs vs Outcomes, with a "Report" action for unplanned results.
3. **Entity AOW** — navigate Areas of Work for the program:
   - A sidebar tree of AoWs + a "2030 Outcomes" leaf.
   - For each AoW, two tabs: High-Level Outputs Indicators / Intermediate Outcomes Indicators — both render as a grouped table with status chips and three row-level actions (Report result / View results / Target details).
   - A **Report Result modal** that creates a new result tied to a TOC indicator (with CGSpace / MELSpace / WorldFish handle validation for Knowledge Products).
   - A **View Results drawer** with a list of existing contributing results.
   - A **Target Details drawer** with a Center × Year pivot.
4. **Bilateral Results Review** — the heart of the module. A two-pane workspace where Program admins review bilateral results submitted by CGIAR Centers:
   - A **Centers sidebar** with pending-review counts per Center.
   - A **filterable, searchable, grouped table** of bilateral results.
   - A **review drawer** with full read/edit access to TOC alignment, Data Standards, and result-type-specific content, plus Approve / Reject with justification.

The **Bilateral Results Review** is the most complex artifact. The replicating team will spend the bulk of their effort there.

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ ResultFrameworkReportingComponent (NgModule, router-outlet only)    │
│   /result-framework-reporting/*                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────────────────┐
        │                       │                                   │
        ▼                       ▼                                   ▼
   /home              /entity-details/:entityId           /entity-details/:entityId/aow
   (standalone)       (standalone)                        (standalone, layout)
                              │                                       │
                              ▼                                       ├── /all (placeholder)
                  /entity-details/:entityId/                          ├── /unplanned (placeholder)
                  results-review                                      ├── /2030-outcomes
                  (standalone, "Bilateral")                           └── /:aowId (tabs HLO|Outcomes)

Wildcard ** → redirect to /home
```

**Lazy loading**: the root is an NgModule loaded via `loadChildren` in `app-routing.module.ts`. Every page below is a standalone Angular 19 component loaded via `loadComponent` in `routing-data.ts`. The mixed model is intentional and you should preserve it on replication if you stay on Angular.

**State**: three feature services, all `@Injectable({ providedIn: 'root' })`, all heavy in `signal()`/`computed()`. No NgRx, no BehaviorSubjects for shared state.

```
ResultFrameworkReportingHomeService   ── Home page state
EntityAowService                      ── Entity Details + AOW + AOW report flow state
BilateralResultsService               ── Bilateral Review page state
```

**Cross-service convention**: components reach the global `ApiService` aggregator (`api.resultsSE`, `api.dataControlSE`, `api.alertsFe`, `api.rolesSE`, `api.authSE`) instead of injecting feature API services directly. **Preserve this convention** when replicating — many shared components depend on it.

**Auth**: every HTTP request goes through a single interceptor that attaches a custom `auth: <JWT>` header. Replication note: **do not** use `Authorization: Bearer …` — the backend explicitly reads the `auth` header.

**API envelope**: every server response is `{ response, statusCode, message, timestamp, path }`. Always destructure `({ response }) => …`.

**Base URLs**:
- `apiBaseUrl` → `${envBase}` (legacy results API). Most reporting endpoints live here.
- `baseApiBaseUrl` → `${envBase}api/`.
- `apiBaseUrlV2`, `baseApiBaseUrlV2` → `${envBase}v2/api/...` (none used by this module).
- Production base: `https://prtest-back.ciat.cgiar.org/`.

---

## 3. Folder & file map

The full module under `pages/result-framework-reporting/`:

```
result-framework-reporting/
├── result-framework-reporting.module.ts                         NgModule, declares root component, imports routing.
├── result-framework-reporting-routing.module.ts                 Reads ResultFrameworkReportingRouting from shared/routing/routing-data.ts.
├── result-framework-reporting.component.{ts,html,spec.ts}       Root component (router-outlet only); sets page title + kicks off Home data.
└── pages/
    ├── result-framework-reporting-home/
    │   ├── result-framework-reporting-home.component.{ts,html,scss,spec.ts}
    │   ├── services/result-framework-reporting-home.service.{ts,spec.ts}
    │   └── components/
    │       ├── result-framework-reporting-card-item/.../.{ts,html,scss,spec.ts}
    │       └── result-framework-reporting-recent-item/.../.{ts,html,scss,spec.ts}
    ├── entity-details/
    │   ├── entity-details.component.{ts,html,scss,spec.ts}
    │   ├── interfaces/entity-details.interface.ts                EntityDetails, Initiative, Unit, Metadata.
    │   └── components/
    │       ├── entity-aow-card/
    │       ├── bilateral-results-review/                         Banner + pending-count link.
    │       └── entity-results-by-indicator-category-card/        Indicator card + (output) reportRequested.
    ├── entity-aow/
    │   ├── entity-aow.component.{ts,html,scss,spec.ts}           Sidebar + router-outlet + breadcrumb.
    │   ├── services/entity-aow.service.{ts,spec.ts}              287 LOC, the AOW state container.
    │   └── pages/
    │       ├── entity-aow-all/                                   Placeholder ("entity-aow-all works!").
    │       ├── entity-aow-unplanned/                             Placeholder.
    │       ├── entity-aow-2030/                                  Loads 2030 outcomes, reuses aow-hlo-table.
    │       └── entity-aow-aow/
    │           ├── entity-aow-aow.component.{ts,html,scss,spec.ts}
    │           └── components/aow-hlo-table/
    │               ├── aow-hlo-table.component.{ts,html,scss,spec.ts}
    │               └── components/
    │                   ├── aow-hlo-table-create-modal/             "Report result" dialog. CGSpace handle regex.
    │                   ├── aow-view-results-drawer/                Existing results table.
    │                   └── aow-target-details-drawer/              Center × Year pivot.
    └── bilateral-results/
        ├── bilateral-results.component.{ts,html,scss,spec.ts}
        ├── bilateral-results.service.{ts,spec.ts}
        └── components/
            ├── indicators-sidebar/                                 Centers list with pending-count badges.
            ├── results-review-container/                           <ng-content/> wrapper.
            ├── results-review-filters/                             Search + custom right-side filters drawer + chip bar.
            └── results-review-table/
                ├── results-review-table.component.{ts,html,scss,spec.ts}
                └── components/result-review-drawer/
                    ├── result-review-drawer.component.{ts,html,scss,spec.ts}  ~1,666 LOC.
                    ├── result-review-drawer.interfaces.ts                     ResultToReview, GroupedResult, BilateralResultDetail, ~15 sub-interfaces.
                    └── components/
                        ├── kp-content/                              Knowledge Product readonly view.
                        ├── inno-dev-content/                        Innovation Development editor.
                        ├── cap-sharing-content/                     Capacity Sharing editor.
                        ├── policy-change-content/                  Policy Change editor.
                        ├── innovation-use-content/                  Innovation Use editor.
                        └── save-changes-justification-dialog/       Reusable justification dialog.
```

Naming rules to preserve:
- 4-file Angular convention (`.ts`, `.html`, `.scss`, `.spec.ts`) per component.
- Features that own sub-features use nested `pages/` and `components/` folders (recursion allowed).
- Feature services live under `services/` next to the consumer (NOT in `shared/`).
- Type interfaces co-located with the consumer in `interfaces/` (NOT global types).

---

## 4. Routing contract

The routes are declared in `onecgiar-pr-client/src/app/shared/routing/routing-data.ts` as `ResultFrameworkReportingRouting: PrRoute[]` (≈ standard `Route[]` plus `prName`, `prHide?`, `underConstruction?`, `onlyTest?`, `portfolioAcronym?`). The `prName` is consumed by breadcrumbs and the navigation bar.

```ts
export const ResultFrameworkReportingRouting: PrRoute[] = [
  { prName: 'Result Framework & Reporting',
    path: 'home',
    loadComponent: () => import('.../result-framework-reporting-home.component')
                          .then(m => m.ResultFrameworkReportingHomeComponent) },

  { prName: 'Entity details',
    path: 'entity-details/:entityId',
    loadComponent: () => import('.../entity-details.component').then(m => m.EntityDetailsComponent) },

  { prName: 'Bilateral results review',
    path: 'entity-details/:entityId/results-review',
    loadComponent: () => import('.../bilateral-results.component').then(m => m.BilateralResultsComponent) },

  { prName: 'Entity AOW',
    path: 'entity-details/:entityId/aow',
    loadComponent: () => import('.../entity-aow.component').then(m => m.EntityAowComponent),
    children: [
      { path: '',               pathMatch: 'full', redirectTo: 'all' },
      { path: 'all',            loadComponent: () => …EntityAowAllComponent },
      { path: 'unplanned',      loadComponent: () => …EntityAowUnplannedComponent },
      { path: '2030-outcomes',  loadComponent: () => …EntityAow2030Component },
      { path: ':aowId',         loadComponent: () => …EntityAowAowComponent }
    ] },

  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'home' }
];
```

The `entity-details/:entityId/aow/:aowId` route co-exists with `2030-outcomes` and `unplanned`. Order matters: literal paths are matched first by Angular's router, then `:aowId` catches the rest. Preserve the order on replication.

**Query parameters used in the URL** (deep-linkable):
- `/entity-details/:entityId/results-review?center=<centerCode>&search=<text>` — sidebar selection + search persisted (search via `Location.replaceState`, no history pollution).
- `/result/result-detail/<resultCode>?phase=<versionId>` — recent activity items + navigations from drawer use this external route.

---

## 5. State management — feature services

### 5.1 `ResultFrameworkReportingHomeService`

```ts
@Injectable({ providedIn: 'root' })
export class ResultFrameworkReportingHomeService {
  api = inject(ApiService);
  recentActivityList     = signal<RecentActivity[]>([]);
  mySPsList              = signal<SPProgress[]>([]);
  otherSPsList           = signal<SPProgress[]>([]);
  isLoadingSPLists       = signal<boolean>(false);
  isLoadingRecentActivity= signal<boolean>(false);

  getRecentActivity()         // → GET /api/notification/recent-activity
  getScienceProgramsProgress()// → GET /api/results-framework-reporting/get/science-programs/progress
}
```

The root component (`ResultFrameworkReportingComponent.ngOnInit`) fires both. They keep their loading flags during the request and set on success — no error toast surfaces (the project relies on `manageError` in the interceptor for global handling).

### 5.2 `EntityAowService` (the big one, 287 LOC)

Owns all data and UI state shared by the entity-details + AOW family. **Loaded once, shared across navigations** because it is `providedIn: 'root'`. Components are responsible for calling `resetDashboardData()` when they re-enter the entity-details route with a new `entityId`.

Public signals (grouped):

| Group | Signals |
|---|---|
| **Selection / context** | `entityId`, `aowId`, `currentAowSelected` (computed) |
| **Entity data** | `entityDetails`, `entityAows`, `indicatorSummaries`, `dashboardData`, `sideBarItems`, `isLoadingDetails`, `reportingEnabled`, `canReportResults` (computed) |
| **TOC tables** | `tocResultsOutputsByAowId`, `tocResultsOutcomesByAowId`, `tocResults2030Outcomes`, `isLoadingTocResultsByAowId`, `isLoadingTocResults2030Outcomes` |
| **Report Result modal** | `showReportResultModal`, `currentResultToReport`, `w3BilateralProjects`, `selectedW3BilateralProjects`, `selectedEntities`, `existingResultsContributors` |
| **View Results drawer** | `showViewResultDrawer`, `viewResultDrawerFullScreen`, `currentResultToView` |
| **Target Details drawer** | `showTargetDetailsDrawer`, `targetDetailsDrawerFullScreen`, `currentTargetToView` |

Key methods:

```ts
getAllDetailsData(entityId?: string)        // SGP-02 branch + main forkJoin branch
setSideBarItems()                           // Builds tree: "By AOW" + "2030 Outcomes"
getTocResultsByAowId(entityId, aowId)
get2030Outcomes(entityId)
getW3BilateralProjects()                    // uses currentResultToReport().toc_result_id
getExistingResultsContributors(tocResultId, relatedNodeId)
getDashboardData()
onCloseReportResultModal()
resetDashboardData()                        // ALSO resets entityDetails, entityAows, indicatorSummaries, reportingEnabled
checkReportingAccess(initiativeId)          // private; calls GET phase-initiative status
```

`canReportResults` is a computed signal:
```ts
canReportResults = computed(() => {
  if (this.api.rolesSE.isAdmin) return true;
  if (!this.reportingEnabled()) return false;
  const owned = this.api.dataControlSE.myInitiativesList?.some(i => i.official_code === this.entityId());
  return !!owned;
});
```

**Replication note**: keep `reportingEnabled` defaulted to `true` on error responses — the gate is fail-open intentionally, so a transient API failure does not block users from reporting.

### 5.3 `BilateralResultsService`

```ts
entityId, entityDetails, centers, currentCenterSelected,
searchText, selectedCenterCode,
selectedIndicatorCategories, selectedStatus, selectedLeadCenters,  // table filters
tableData, tableResults, allResultsForCounts,                       // server data
indicatorCategoryOptions, statusOptions, leadCenterOptions,         // computed dropdown options (derived from data)
pendingCountByAcronym, totalPendingCount,                           // computed counts (status_id == 5)
centerAcronymsWithResults, centersToShowInSidebar,                  // computed center filtering
showReviewDrawer, currentResultToReview                             // drawer state
```

Methods:

```ts
selectCenter(centerCode | null)        // null = all centers
getEntityDetails()                     // GET clarisa-global-units → entityDetails
clearBilateralTableFilters()
refreshAllResultsForCounts()           // re-fetches all centers' results to update sidebar counts after a decision
```

**Computed dependency**: `pendingCountByAcronym` and the sidebar use `allResultsForCounts`, NOT `tableResults`. This is intentional — when the user filters the table by a single center, `tableResults` only contains that center's data, but the sidebar pending badges must keep showing all centers' counts.

---

## 6. API contracts (the backend the module talks to)

All URLs relative to `${apiBaseUrl}`, all use the `auth` header, all responses wrap data in `{ response, statusCode, message, timestamp, path }`.

| Verb | Path | Caller | Notes |
|---|---|---|---|
| GET | `api/results-framework-reporting/get/science-programs/progress` | Home service | Returns `{ mySciencePrograms: SPProgress[], otherSciencePrograms: SPProgress[] }`. |
| GET | `api/notification/recent-activity` | Home service | Returns `RecentActivity[]`. |
| GET | `api/results-framework-reporting/clarisa-global-units?programId=<id>` | EntityAowService + BilateralResultsService | Returns `EntityDetails` (initiative + parentUnit + units + metadata). |
| GET | `api/results-framework-reporting/programs/indicator-contribution-summary?program=<id>` | EntityAowService | Returns `{ totalsByType: Array<{ resultTypeId, resultTypeName, editing, submitted, ... }> }`. |
| GET | `api/results-framework-reporting/toc-results?program=<id>&areaOfWork=<aow>[&year=<y>]` | EntityAowService | Returns `{ tocResultsOutputs, tocResultsOutcomes }`. |
| GET | `api/results-framework-reporting/toc-results/2030-outcomes?programId=<id>` | EntityAowService | Returns `{ tocResults }`. |
| GET | `api/results-framework-reporting/bilateral-projects?tocResultId=<id>` | AowHloCreateModal | Returns project options. |
| GET | `api/results-framework-reporting/existing-result-contributors?resultTocResultId=<id>&tocResultIndicatorId=<id>` | AowHloCreateModal + AowViewResultsDrawer | Returns existing-result list to avoid duplicates. |
| GET | `api/results-framework-reporting/dashboard?programId=<id>` | EntityDetails | Returns `{ editing, submitted, qualityAssessed }` with nested `data.outputs.*` and `data.outcomes.*`. |
| POST | `api/results-framework-reporting/create` | AowHloCreateModal | Body: `{ result, number_target, target_date, contributing_indicator, contributing_center, knowledge_product, toc_result_id, toc_progressive_narrative, indicators, contributors_result_toc_result, bilateral_project }`. |
| GET | `api/results/admin-panel/phases/<phaseId>/reporting-initiatives/<initiativeId>/status` | EntityAowService | Returns `{ reporting_enabled: boolean }`. |
| GET | `api/results/by-program-and-centers?programId=<id>[&centerIds=<csv>]` | BilateralResultsTable | Returns `GroupedResult[]`. |
| GET | `api/results/pending-review?programId=<id>` | BilateralResultsReview banner | Returns `{ total_pending_review: number }`. |
| GET | `api/results/bilateral/<resultId>` | ReviewDrawer | Returns `BilateralResultDetail` (commonFields, tocMetadata, geographicScope, contributingCenters, contributingProjects, contributingInitiatives, contributingInstitutions, evidence, resultTypeResponse, contributors_result_toc_result). |
| PATCH | `api/results/bilateral/<id>/title` | ReviewDrawer | Body: `{ title: string }`. |
| PATCH | `api/results/bilateral/review-update/toc-metadata/<id>` | ReviewDrawer | Body: `{ tocMetadata: { planned_result, initiative_id, result_toc_results }, updateExplanation }`. |
| PATCH | `api/results/bilateral/review-update/data-standard/<id>` | ReviewDrawer | Body: see §8.3. |
| PATCH | `api/results/bilateral/<id>/review-decision` | ReviewDrawer | Body: `{ decision: 'APPROVE' \| 'REJECT', justification: string }`. |
| GET | `clarisa/initiatives[/<portfolioId>]` | AowHloCreateModal | Returns initiatives with `initiative_id`, `full_name`, etc. |
| GET | `clarisa/initiatives/get/all/without/result/<id>/<portfolio>` | ReviewDrawer | Excludes initiatives already linked to the result. |
| GET | `clarisa/projects/get/all` | ReviewDrawer + AowHloCreateModal | All bilateral projects. |
| GET | `capdevs-terms/get/all` | CapSharingContent | `slice(2, 4)` is used to pick the relevant subset. |
| GET | `capdevs-delivery-methods/get/all` | CapSharingContent | |
| `GETAllActorsTypes()` | actors-types catalog | InnovationUseContent | |

### 6.1 Polymorphism: `contributingInitiatives`

The drawer's most subtle contract. `BilateralResultDetail.contributingInitiatives` can be:
- An **array of initiative objects/IDs** (legacy shape) — then the drawer treats all of them as plain contributors.
- An **object** with three buckets:
  ```ts
  {
    contributing_and_primary_initiative: BilateralContributingInitiative[],
    accepted_contributing_initiatives:   BilateralContributingInitiative[],
    pending_contributing_initiatives:    BilateralContributingInitiative[]
  }
  ```
  - **Primary** (those with `initiative_role_id === 1` or `'1'`) → rendered as read-only disabled chips.
  - **Accepted** → pre-selected in the multiselect with an "accepted" tag, carry `share_result_request_id`.
  - **Pending** → pre-selected with a "pending" tag.

On save the drawer rebuilds the payload as:
```ts
contributingInitiatives: {
  accepted_contributing_initiatives: [{ id, share_result_request_id, is_active }, ...],
  pending_contributing_initiatives:  [{ id }, ...]
}
```

Replicators MUST support both shapes coming in (or normalize on the server side and accept the new shape on the way out).

### 6.2 Status semantics

- The drawer enables Approve/Reject **only** when `resultToReview()?.status_id == 5` (`==` loose, because the backend has historically returned strings or numbers). `5 = Pending review`.
- Status badges on the table:
  - `status_name === 'Approved'` → green
  - `status_name === 'Rejected'` → red
  - else (`'Pending'`, etc.) → orange
- The "Review result" button on the table becomes "See result" (with eye icon) for non-pending statuses or when the user lacks edit permission.

### 6.3 `GroupedResult` shape (table data)

```ts
interface ResultToReview {
  id: string;                  project_id: string;
  project_name: string;        result_code: string;
  result_title: string;        indicator_category: string;
  status_name: string;         status_id?: string | number;   // ALWAYS expect both string and number
  acronym: string;             toc_title: string;
  indicator: string;           submission_date: string;        // ISO; rendered via `date: 'dd/MM/yyyy'`
  lead_center?: string;
  initiative_role_name?: string; // 'Contributor' → renders an extra badge
}

interface GroupedResult {
  project_id: string;
  project_name: string;
  results: ResultToReview[];
}
```

The table groups by `project_name` (PrimeNG `rowGroupMode="subheader"`).

---

## 7. Component-by-component

### 7.1 `ResultFrameworkReportingComponent` (root)

- NgModule-based, declared in `result-framework-reporting.module.ts` with only `CommonModule` + the routing module.
- Template: literally `<router-outlet></router-outlet>`.
- `ngOnInit`:
  - `api.dataControlSE.detailSectionTitle('Results Framework & Reporting')` — feeds the global page header.
  - `resultFrameworkReportingHomeService.getScienceProgramsProgress()` + `getRecentActivity()` — prefetches Home data so Home renders instantly.

### 7.2 `ResultFrameworkReportingHomeComponent`

- Standalone, OnPush.
- Imports: `CommonModule`, `ProgressBarModule`, the two child card components, `SkeletonModule`, `CustomFieldsModule`, `AlertGlobalInfoModule`.
- Layout:
  - Top banner ("Welcome, <user_name>!").
  - Two-column grid: left column → SP cards (My / Other) + global info alert; right column (sticky-ish) → "Recent activity" feed.
  - On viewports < 1115px the right column collapses into the left column above "Other SPs".
- Skeleton fallback while loading SP cards (2 skeletons) and recent activity (10 skeletons).
- Empty state (My SPs only): an `app-alert-status` instructing the user to contact their SP coordinator.
- **`framework-reporting_left_header`** uses a background image at `assets/result-framework-reporting/header_img_v2.png`.

### 7.3 `ResultFrameworkReportingCardItemComponent`

- Standalone, OnPush, `RouterLink`.
- `@Input() item: SPProgress`.
- Renders an icon (PNG at `/assets/result-framework-reporting/SPs-Icons/<initiativeCode>.png`) with a signal-based fallback (`imageLoadError`) → a placeholder div.
- Clicking the card routes to `/result-framework-reporting/entity-details/<initiativeCode>`.
- Special case: `initiativeId === 41 || initiativeCode === 'SGP-02'` → use `initiativeShortName ?? initiativeName` as the display title (SGP-02 has a long official name that doesn't fit).

### 7.4 `ResultFrameworkReportingRecentItemComponent`

- Standalone, OnPush. Imports `FormatTimeAgoPipe`, `RouterLink`, `TooltipModule`.
- `@Input() item?: RecentActivity`.
- `getResultUrl()` → `/result/result-detail/<resultCode>/general-information`.
- Clicking routes with `[queryParams]="{ phase: item?.phase }"` — phase is required for deep links into the Result Detail page.
- Tooltip shows `View result: <code> - <title>`.

### 7.5 `EntityDetailsComponent`

- Standalone, OnPush.
- Heavy: 347 LOC of TS + 170 LOC of HTML.
- Imports: `CommonModule, FormsModule, SelectModule, RouterModule, ProgressBarModule, EntityAowCardComponent, EntityResultsByIndicatorCategoryCardComponent, SkeletonModule, ChartModule, ButtonModule, DialogModule, SplitButtonModule, ResultCreatorModule, BilateralResultsReviewComponent`.
- Two charts: `dataOutputs` and `dataOutcomes`, both stacked horizontal bars with 3 datasets (Editing / Submitted / Quality assessed).
  - Editing color: `rgba(153, 153, 153, 0.6)` (grey).
  - Submitted color: `rgba(147, 197, 253, 1)` (light blue).
  - Quality assessed color: `#38DF7B` (green).
- `ChartDataLabels` plugin is registered in `initChart()` after `isPlatformBrowser(this.platformId)` — defensive SSR guard.
- Axis max = `dataMax + 10` (constant `axisPaddingValue = 10`). Data labels only show when `value > 1`.
- `summaryInsightsData` (computed) — two stat cards "Editing results" and "Submitted results", with PNG icons in `assets/result-framework-reporting/`.
- `groupedIndicatorSummaries` (computed) — splits indicator summaries into `outputs` and `outcomes` arrays, **excluding** `resultTypeName === 'Innovation Use(IPSR)'`. Mapping:
  - Outputs: `'Innovation development'`, `'Knowledge product'`, `'Capacity sharing for development'`, `'Other output'`.
  - Outcomes: `'Innovation use'`, `'Policy change'`, `'Other outcome'`.
- `showBilateralResultsReview` (computed) — `entityAowService.entityId() !== 'SGP-02'`. SGP-02 has no bilateral review.
- `showReportModal` + `reportMenuItems` → a hidden `p-splitbutton` ("Report") with three menu items: AI Assistant (disabled), separator, "Unplanned result" (opens `<p-dialog>` with `app-report-result-form` from `ResultCreatorModule`).
- `ngOnInit`:
  1. `initChart()` (Chart.js plugin).
  2. Subscribes to `route.params`:
     - `entityAowService.resetDashboardData()` (purges previous SP state).
     - `entityAowService.entityId.set(entityId)`.
     - `getAllDetailsData(entityId)` + `getDashboardData()`.
- `entityDisplayShortName` getter — multi-fallback for the SP short name (entityDetails, `myInitiativesListReportingByPortfolio`, `myInitiativesList`, `mySPsList`, `otherSPsList`), with SGP-02 special-casing for both `'SGP-02'` and `'SGP02'`.

### 7.6 `EntityAowCardComponent`

- OnPush, standalone. Imports `ProgressBarModule`, `RouterLink`.
- Renders a folder card linking to `/result-framework-reporting/entity-details/<entityId>/aow/<code>`.
- Shows Editing + Submitted counts as dotted badges.

### 7.7 `BilateralResultsReviewComponent` (entity-details banner)

- Standalone, NOT OnPush (this is one of the few non-OnPush components in the module).
- On init: reads `entityId` from `activatedRoute.snapshot.params` and calls `GET_PendingReviewCount(entityId)` → `pendingCount` signal.
- Renders a banner with `material-icons-round` schedule icon, title "Bilateral Results Review", separator "•", count "{n} Pending review", description, and a CTA "Review results" linking to `['results-review']` (relative).

### 7.8 `EntityResultsByIndicatorCategoryCardComponent`

- OnPush, standalone.
- `@Input() item` + `output() reportRequested`.
- Icon mapping by `resultTypeId`: `7=flag, 6=book, 5=users, 2=sun, 1=folder-open, default=folder`.
- Renders Editing/Submitted dotted badges.
- Emits `reportRequested` when the user clicks "Report" — handled by the parent which sets `resultLevelSE.setPendingResultType(...)` and opens the unplanned-report modal.
- Two button variants: a full-text "Report" with `+` icon (default), and a slim "Report result" for narrow widths — both hidden behind `entityAowService.canReportResults()`.

### 7.9 `EntityAowComponent` (sidebar layout)

- Standalone, OnPush.
- Builds a sidebar from `entityAowService.sideBarItems()` — tree mode ("By AOW") + flat leaf ("2030 Outcomes").
- Active state via `routerLinkActive="active"`. Clicking a sub-AoW also calls `entityAowService.getTocResultsByAowId(...)` to warm the TOC tables before the sub-route mounts (race-avoidance pattern).
- Sub-AoW disable state: if `entityAowService.aowId() === item.label`, sets `cursor: not-allowed; pointer-events: none` — prevents re-clicking the active AoW.
- Breadcrumb: "Science programs > <entityId> - <name> > <current route label>".
- `getCurrentRoute()` parses `router.url` to find the `/aow/<subPath>` and looks it up in `sideBarItems()` to render the active label.

### 7.10 `EntityAowAowComponent` (HLO + Outcomes tabs)

- Standalone, OnPush, two-tab UI.
- Tabs: `'high-level-outputs'` (count = `tocResultsOutputsByAowId().length`) and `'outcomes'` (count = `tocResultsOutcomesByAowId().length`).
- Tab content renders `<app-aow-hlo-table [tableType]="'outputs' | 'outcomes'">`.
- `ngOnInit` subscribes to `route.params.aowId` and calls `getTocResultsByAowId`.
- `ngOnDestroy` clears `entityAowService.aowId.set('')` — important for staleness.

### 7.11 `AowHloTableComponent`

- Standalone, OnPush. Imports `TableModule, ProgressBarModule, ButtonModule, TooltipModule, AowHloCreateModalComponent, AowViewResultsDrawerComponent, AowTargetDetailsDrawerComponent`.
- PrimeNG `p-table` with `rowGroupMode="subheader"`, `groupRowsBy="result_title"`, `[expandedRowKeys]="expandedRowKeys()"` (all groups expanded by default).
- Five columns: Indicator name (30%), Type (10%), Expected target 2025 (10%), Actual achieved (10%), Status (11%), Actions (16%).
- Each row has 1–3 action buttons:
  - "Report result" (only if `canReportResults()` is true and `status_id` allows it).
  - "View results" (always available).
  - "Target details" (only if `hasTargets(item, indicatorId)` — checks `targets_by_center.centers.length > 0`).
- Status chip mapping:
  - `progress === 0 || null` → `not-started`.
  - `1..99` → `in-progress`.
  - `100` → `achieved`.
  - `> 100` → `overachieved`.
- Empty state for HLOs with no indicators: shows a "Report result directly" button when `canReportResults()`.

### 7.12 `AowHloCreateModalComponent` (Report result dialog)

- Standalone, OnPush.
- A large dialog with a two-column layout:
  - Left: form fields.
  - Right: existing-results sidebar (clickable, opens result in new tab).
- Form fields:
  - **Indicator category**: either read-only (when `result_type_id` is preset) or `p-select` with options from `resultsListFilterSE.filters.resultLevel`.
  - **Repository link/handle** (only for Knowledge Products): `pr-input` + Sync button that validates the URL with the CGSpace regex (see §8.5) and calls `GET_mqapValidation()` to autofill the title.
  - **Title**: `pr-input` with `[maxWords]="30"`. Autogenerated and locked when KP metadata was retrieved.
  - **TOC progressive narrative**: `pr-textarea` + an info alert.
  - **Contribution to indicator target**: `p-inputnumber` (min 0, max 9,999,999).
  - **Contributing CGIAR Centers**: `pr-multi-select` over `centersSE.centersList`.
  - **Contributing Science Programs/Accelerators**: `p-multiselect` over `allInitiatives()` (excluding the current entity).
  - **Contributing W3 / Bilateral Projects**: `p-multiselect` over `entityAowService.w3BilateralProjects()` filtered by `currentResultToReport().toc_result_id`.
- Selected centers and projects are shown as removable chips below the multiselects.
- On submit: `POST_createResult(body)` → on success, closes modal + navigates to `/result/result-detail/<resultCode>/general-information?phase=<versionId>`.
- KP validation regex (do not modify on replication):
  ```regex
  /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/
  ```

### 7.13 `AowViewResultsDrawerComponent`

- Standalone, OnPush. Drawer-based.
- Renders a table of "existing results" (the contributors for a specific indicator).
- Columns: Code (10%), Title, Status (130px), Target achieved (130px), PDF (10%), Actions (10%).
- Each row is clickable (navigates to `result-detail/...` in the same tab), with an extra Actions column popover ("View" → opens in new tab).
- PDF column links to `/reports/result-details/<resultCode>?phase=<versionId>` opening in a new tab.
- `ngOnInit` fakes a 1s loading delay (`setTimeout` after fetching `existingResultsContributors`) — purely UX, no functional reason.
- `ngOnInit` toggles `document.body.style.overflow = 'hidden'`; restores `'auto'` on destroy.

### 7.14 `AowTargetDetailsDrawerComponent`

- Standalone, OnPush. Drawer-based.
- Renders a `Center × Year` pivot from `currentTargetToView()?.indicators?.[0]?.targets_by_center` (`centers: Center[]`, `targets: Target[]`).
- `years` (computed) — unique years across all targets, sorted ascending.
- `tableData` (computed) — one row per center, with a `Map<year, target_value>`. All centers share the same year/target mapping (this is by design for the current backend; if the backend changes to per-center targets, refactor this computed).
- Also locks body scroll on init.

### 7.15 `BilateralResultsComponent` (page)

- NOT standalone-marked at the class level (`@Component` without `standalone: true`, but uses `imports:` → effectively standalone in Angular 19). Imports `IndicatorsSidebarComponent, ResultsReviewContainerComponent, ResultsReviewFiltersComponent, ResultsReviewTableComponent, RouterModule`.
- Page layout:
  ```
  ┌─────────────────────────────────────────────────────┐
  │  Breadcrumb                                         │
  ├──────────────┬──────────────────────────────────────┤
  │  Sidebar     │  Filters                             │
  │  (Centers)   │  ──────────────────────────────────  │
  │              │  Table (grouped by project_name)     │
  └──────────────┴──────────────────────────────────────┘
  ```
- Breadcrumb supports two states based on `?center=<code>`:
  - Without `center`: 3 crumbs ("Science programs > <entity> > Bilateral Results Review").
  - With `center`: 4 crumbs, the third becomes a back-link to the un-filtered view.
- `navigateToResultsReview()` clears the center selection in state and URL.
- `ngOnInit` reads `entityId` from `activatedRoute.params` and calls `getEntityDetails()`.

### 7.16 `IndicatorsSidebarComponent`

- Standalone (no module). Imports `CommonModule` only.
- `ngOnInit`:
  1. `centersService.getData()` (CLARISA centers).
  2. Sets `bilateralResultsService.centers`.
  3. Reads `?center=<code>` from `activatedRoute.snapshot.queryParams`. If valid → `selectCenter(centerFromUrl, updateUrl=false)`; else `selectCenter(null, false)`.
- "All Centers" item is a fixed leading entry with the `list` material icon and `totalPendingCount()` badge.
- Per-center items: `apartment` icon + acronym + pending-count badge (only when `pendingCountByAcronym()[acronym] > 0`).
- Only renders centers in `centersToShowInSidebar()` — i.e., centers that have at least one result in `allResultsForCounts()` (deduplicated via a `Set`).
- `selectCenter(centerCode, updateUrl=true)`:
  - Updates `selectedCenterCode` + `currentCenterSelected` (which triggers the table effect).
  - If `updateUrl`: pushes `?center=<code>` (or removes it) and clears `searchText`.
- Keyboard-accessible: each item has `tabindex="0"`, `role="button"`, and handles `keydown.enter` + `keydown.space`.

### 7.17 `ResultsReviewFiltersComponent`

- Standalone. Imports `CommonModule, IconFieldModule, InputIconModule, InputTextModule, FormsModule, MultiSelectModule, ButtonModule, OverlayBadgeModule, ChipModule, CustomFieldsModule`.
- Left: search input (350px) + filter button + clear button.
- Below: chip bar — for each active filter group, label + arrow + chips with `(onRemove)`.
- Custom right-side drawer (NOT PrimeNG `p-drawer`):
  - Pure CSS + a `[class.visible]/[class.open]` pattern.
  - Top offset matches the live navbar height via `ResizeObserver` watching the first match among `app-header-panel`, `header`, `nav`, `.navbar`, `.header`. Default 60px.
  - 3 multi-selects (indicator category, status, lead center) populated from `bilateralResultsService.indicatorCategoryOptions() / statusOptions() / leadCenterOptions()`.
  - Apply / Cancel buttons. Cancel restores `tempSelectedX` from service state and closes.
- `?search=` query param is hydrated on init and updated on change via `Location.replaceState` (no history pollution).

### 7.18 `ResultsReviewTableComponent`

- Standalone, OnPush.
- `filteredTableData` (computed) — applies search + 3 multi-select filters client-side over `bilateralResultsService.tableData()`. Drops empty groups.
- `onChangeCenterSelected` (effect) — listens to `currentCenterSelected()`. If non-empty: calls `getResultsToReview(centers)`. Always clears `tableData`, `tableResults`, and table filters before re-fetch. The effect uses `clearBilateralTableFilters()` proactively to avoid stale chips.
- `getResultsToReview(centers)`:
  - Calls `api.resultsSE.GET_ResultToReview(entityId, centers)`.
  - Updates `tableData` (grouped) and `tableResults` (flat).
  - **If all centers selected** (`centers.length === allCenters.length`): also writes to `allResultsForCounts` so pending counts stay in sync.
- `expandedRowKeys` (computed) — all groups expanded by default, keyed by `project_name`.
- Status chips on rows (CSS classes): `approved | rejected | pending`. The "pending" class is the catch-all.
- Contributor badge: `result.initiative_role_name === 'Contributor'` → renders a "Contributor" chip next to the title.
- Action button label/icon flips based on `status_id == 5 && canReviewResults()`:
  - True → "Review result" + `edit` icon.
  - False → "See result" + `visibility` icon.
- `onDecisionMade()` (output from drawer) → re-fetches both `getResultsToReview` and `refreshAllResultsForCounts`.
- `ngOnDestroy` resets `searchText` (so re-entering the page does not show a stale search box).

### 7.19 `ResultReviewDrawerComponent` (the 1,666-line drawer)

The crown jewel. Most of the replication effort lives here. Read §8 for the deep dive on its behaviors.

- Standalone, OnPush.
- Two-way bound inputs:
  - `visible = model<boolean>(false)`.
  - `resultToReview = model<ResultToReview | null>(null)`.
- Output: `decisionMade = output<void>()`.
- Sub-components imported and rendered inside the drawer:
  - `app-policy-change-content` (case 1).
  - `app-innovation-use-content` (case 2).
  - `app-cap-sharing-content` (case 5).
  - `app-kp-content` (case 6).
  - `app-inno-dev-content` (case 7).
  - `app-save-changes-justification-dialog` (shared dialog for both TOC and Data Standard saves).
- External widgets:
  - `app-geoscope-management` (from `shared/components/geoscope-management/`).
  - `app-cp-multiple-wps` (from `pages/results/pages/result-detail/pages/rd-contributors-and-partners/`) — the TOC tree, rendered twice (own initiative + each contributor initiative).
  - `pr-multi-select`, `pr-textarea`, `pr-radio-button`, `pr-yes-or-not`, `pr-field-header`, `pr-input`, `pr-button` (from `custom-fields/`).

---

## 8. Deep dive into the Review Drawer

The drawer is so dense it deserves its own section. The replicator must understand each of these mechanisms to avoid building a half-working clone.

### 8.1 Lifecycle & data load

```ts
constructor() {
  effect(() => {
    const result = this.resultToReview();
    if (result && this.visible()) this.loadResultDetail(result.id);
  });

  this.drawerReadOnlyEffectRef.set(effect(() => {
    const visible = this.visible();
    const canEdit = this.canEditInDrawer();
    if (visible && canEdit) {
      this.savedReadOnly ??= this.rolesSE.readOnly;
      this.rolesSE.readOnly = false;
    }
    if (!(visible && canEdit) && this.savedReadOnly !== null) {
      this.rolesSE.readOnly = this.savedReadOnly;
      this.savedReadOnly = null;
    }
  }));

  effect(() => {/* remap contributingInitiatives when initiativesList loads */});
}

ngOnInit()    { document.body.style.overflow = 'hidden'; }
ngOnDestroy() {
  this.drawerReadOnlyEffectRef()?.destroy();
  if (this.savedReadOnly !== null) this.rolesSE.readOnly = this.savedReadOnly;
  document.body.style.overflow = 'auto';
}
```

`loadResultDetail(resultId)`:
1. `loadContributingLists()` — fetches CLARISA projects.
2. `ensureInstitutionsLoaded()` — promise that waits for the institutions catalog (3s timeout fallback).
3. `fetchAndProcessResultDetail(resultId)` — GET bilateral detail, normalize, set `resultDetail`, capture data-standard snapshot.

`fetchAndProcessResultDetail` does heavy normalization:
- Writes `currentResult` into `api.dataControlSE` so embedded shared components see the right context.
- Calls `GET_AllWithoutResults(activePortfolio)` to populate `contributingInitiativesList`.
- Normalizes `contributingCenters` → array of codes (strings).
- Normalizes `contributingProjects` → array of project IDs (strings), captures `leadProjectIds` separately for lock-down.
- Normalizes `contributingInitiatives` — branches based on array vs object (§6.1).
- Normalizes `contributingInstitutions` → array of institution IDs.
- Normalizes `resultTypeResponse`: for Innovation Use, ensures arrays exist; for others with `implementing_organization`, maps to `institutions` array.
- Normalizes `tocMetadata` → builds `tocInitiative` with `result_toc_results`, ensures defaults, sets `tocConsumed` to `true` after a 100ms delay to allow `app-cp-multiple-wps` to consume the data.
- Captures a snapshot of normalized data (`captureDataStandardSnapshot`) for dirty tracking.

### 8.2 Read-only toggling via `RolesService.readOnly`

The shared components inside the drawer (e.g., the TOC tree, geoscope, partner multiselects) read from `RolesService.readOnly` directly. To enable editing for the drawer while keeping the rest of the app's read-only state, the drawer **temporarily writes `false` to that global** for the duration of the drawer's open state.

**Replication note**: this is a fragile global side-effect. On replication, either:
- Refactor the shared components to accept an explicit `readOnly` prop (recommended).
- Or replicate the exact `savedReadOnly ??= ...` save/restore pattern via `effect()`.

The drawer also keeps an explicit `canEditInDrawer` computed that combines `isAdmin`, `status_id == 5`, and "user owns the initiative".

### 8.3 Data Standards save body

`PATCH /api/results/bilateral/review-update/data-standard/<id>` expects:

```ts
{
  commonFields: { id, result_description, result_type_id },
  geographicScope: {
    has_countries, has_regions,
    regions: [{ id }],
    countries: [{ id, sub_national: [...] }],   // sub_national fully normalized
    geo_scope_id, extra_geo_scope_id, extra_regions: [{id}], extra_countries: [...],
    has_extra_countries, has_extra_regions, has_extra_geo_scope
  },
  contributingCenters: [{ ...centerObj, result_id, is_leading_result, selected, new, is_active }],
  contributingProjects: [{ project_id }],
  contributingInitiatives: {
    accepted_contributing_initiatives: [{ id, share_result_request_id, is_active }],
    pending_contributing_initiatives:  [{ id }]
  },
  contributingInstitutions: [{ id, institutions_id, institution_roles_id, is_active, result_id }],
  evidence: [{ id?, link, is_sharepoint }],
  resultTypeResponse: <type-specific shape, see §8.4>,
  updateExplanation: '<user justification>'
}
```

Quirks:
- `is_leading_result: index === 0 ? 1 : null` — the first center in the array becomes lead.
- Centers without a CLARISA match are dropped silently.
- `contributingProjects` is **set twice** (once at construction time, once unconditionally near the end). The duplication is intentional in the current code; if you refactor, ensure the final write wins.
- Empty inputs do not delete; you must pass an explicit empty array.
- `institution_roles_id` defaults to `2` if unset on the incoming row.

### 8.4 Type-specific `resultTypeResponse` shapes

The drawer sends different `resultTypeResponse` shapes by `result_type_id`. The replicator MUST replicate these exactly:

| `result_type_id` | Type | Shape |
|---|---|---|
| 1 | Policy change | `{ result_policy_change_id, policy_type_id, policy_stage_id, policy_stage_name, policy_type_name, implementing_organization: [{ institution_id, acronym, institution_name }] }` |
| 2 | Innovation use | `[{ ...rt, actors, organizations, measures, investment_partners, investment_projects }]` (note: array, not object). `investment_projects` mapped from contributing bilateral projects via `onContributingProjectsChange`. |
| 5 | Capacity sharing | `{ result_capacity_development_id, male_using, female_using, non_binary_using, has_unkown_using, capdev_delivery_method_id, capdev_term_id }` |
| 6 | Knowledge product | `{ result_knowledge_product_id, knowledge_product_type, licence, metadata, keywords }` |
| 7 | Innovation development | `{ result_innovation_dev_id, innovation_nature_id, innovation_type_id, innovation_type_name, innovation_developers, innovation_readiness_level_id, readinness_level_id, level, name }` |

Note `readinness_level_id` (typo intentional, kept for backend compatibility — do NOT rename).

### 8.5 TOC save body

`PATCH /api/results/bilateral/review-update/toc-metadata/<id>` expects:
```ts
{
  tocMetadata: {
    planned_result: boolean,
    initiative_id: number,
    result_toc_results: [{
      result_toc_result_id?,    // only present on update
      toc_result_id,
      toc_progressive_narrative,
      toc_level_id,
      indicators: [{
        toc_results_indicator_id,
        indicator_contributing,
        status_id,
        related_node_id,
        result_toc_result_indicator_id?,
        targets: [{
          indicators_targets, number_target, contributing_indicator,
          target_date, target_progress_narrative, indicator_question
        }]
      }]
    }]
  },
  updateExplanation: '<user justification>'
}
```

### 8.6 Dirty tracking

- **TOC dirty**: simple boolean signal `isTocDirty`, flipped by `markTocAsDirty()` on `selectOptionEvent` (yes/no), `(change)` of the TOC tree container.
- **Data Standards dirty**: snapshot-based. `normalizeDataStandardForComparison(detail)` produces a stable JSON projection (sorted arrays of IDs, normalized geo, normalized resultType). `originalDataStandardSnapshot` is set at load (after a 300ms `setTimeout` to allow async normalization to settle) and after each successful save. `hasDataStandardUnsavedChanges()` re-normalizes and string-compares.

### 8.7 Approve / Reject

```ts
canApprove(): boolean {
  return this.isToCCompleted() && !this.hasDataStandardUnsavedChanges() && !this.hasTocUnsavedChanges();
}
```

Approve flow: clicks "APPROVE" → confirmation dialog (modal) → `PATCH .../review-decision` with `decision: 'APPROVE', justification: 'Approved'` → on success, emits `decisionMade` and closes drawer.

Reject flow: clicks "REJECT" → justification dialog (required textarea) → `PATCH .../review-decision` with `decision: 'REJECT', justification: <user input>` → on success, emits + closes.

Save TOC / Save Data Standards: each opens `SaveChangesJustificationDialogComponent`. `confirmSaveChanges(justification)` dispatches to `executeSaveTocChanges` or `executeSaveDataStandardChanges` based on `saveChangesType`. On success: `loadResultDetail` refreshes from server (re-snapshot).

### 8.8 Inline title edit

- "Pencil" icon next to the title → `startEditingTitle()` (copies current title into `editingTitleValue`).
- Confirm icon: validates non-empty, non-unchanged → `PATCH /api/results/bilateral/<id>/title` → on success, updates local `resultDetail.commonFields.result_title` AND patches the parent table row (`updateTableResultTitle(id, newTitle)`).
- Cancel icon: discards edit.

### 8.9 Evidence chips

- A `pr-input` of type `link` (validated by `pr-input` internally).
- "Enter" or button click → `addEvidenceLink()` pushes `{ link }` into `detail.evidence`.
- Each chip has a remove icon (only when editable). Chip is an `<a target="_blank" rel="noopener noreferrer">` to the URL.

### 8.10 Innovation Use ↔ Contributing Projects sync

When the user changes "Contributing Bilateral Projects":
```ts
onContributingProjectsChange(selectedProjects: any[]) → updates investment_projects[]
```
Preserves existing per-project fields (`kind_cash`, `is_determined`, `non_pooled_projetct_budget_id`) by matching `project_id`. New entries get `kind_cash: null, is_determined: null` and a friendly `name` from the CLARISA projects list. Removed projects are dropped from `investment_projects`.

### 8.11 SCSS reuse

All 6 sub-content components (`kp-content`, `inno-dev-content`, `cap-sharing-content`, `policy-change-content`, `innovation-use-content`, `save-changes-justification-dialog`) declare `styleUrl: '../../result-review-drawer.component.scss'`. Innovation use additionally has its own `styleUrls: ['../../result-review-drawer.component.scss', './innovation-use-content.component.scss']`.

**Replication note**: this pattern is unusual — Angular components rarely share SCSS files via `styleUrl` paths. On replication, prefer a shared partial (`@use '../../_drawer-shared.scss'`) over deep path references. The current approach works but is brittle when reorganizing folders.

---

## 9. Design tokens, breakpoints, assets

### 9.1 Color tokens used heavily

- `--pr-color-primary-300` (`#5569dd`, indigo) — primary buttons, breadcrumb active link, focus rings.
- `--pr-color-primary-25` — group-header background in tables.
- `--pr-color-secondary-50` — group-header border-bottom.
- `--pr-color-accents-1..6` — neutral greys (1 = lightest bg, 6 = body text muted).
- `--pr-color-neutral-200` — icon grey.
- `--pr-color-white` — most card backgrounds.
- `--pr-color-blue-300` — Submitted-status dots.
- `--pr-color-green-500` — approve confirm icon.
- `--pr-color-red-300` / `red-400` — delete icon, reject confirm.
- `--pr-color-orange-400` — contributor pending icon.
- `--pr-color-red-300` — delete project icon.

Status-chip CSS (in HLO table SCSS):
- `.not-started` → grey.
- `.in-progress` → blue/yellow band.
- `.achieved` → green.
- `.overachieved` → purple/green gradient.

Bilateral table status badges:
- `.status-badge.approved` → green.
- `.status-badge.rejected` → red.
- `.status-badge.pending` → orange/yellow.

### 9.2 Typography

All headings use the `pr-typography(...)` SCSS mixin from `styles/fonts.scss`. Base 12px on `html, body`. Scale: h1 20/700, h2 18/700, h3 16/600, h4 14/500, body-1 14/400, body-2 12/400, body-3 10/400.

### 9.3 Breakpoints

- Home and entity-details: `1115px` (md). Below: collapse two-column to one-column.
- Other SPs: `1500px` (xl) → fixed `repeat(3, 1fr)`.
- Bilateral results: page height = `calc(100vh - 80px)` (assumes shell header = 80px).

### 9.4 Assets used

- `assets/result-framework-reporting/header_img_v2.png` — Home hero banner.
- `assets/result-framework-reporting/SPs-Icons/<initiativeCode>.png` — SP icons in card items (graceful fallback to a placeholder div).
- `assets/result-framework-reporting/editing_results.png` and `submitted_results.png` — Insights card icons.

### 9.5 PrimeNG components used

`Drawer, Dialog, Table, Button, Multiselect, Select, InputNumber, InputText, IconField, InputIcon, Skeleton, Chart, SplitButton, Tooltip, Chip, OverlayBadge, ProgressBar, Popover, ProgressSpinner, Textarea, Ripple, RowToggler`.

---

## 10. External dependencies (the long list)

What this module reaches into outside its own folder:

### Shared services
- `services/api/api.service.ts` (aggregator).
- `services/api/results-api.service.ts` (all reporting endpoints).
- `services/api/auth.service.ts` (user info).
- `services/data-control.service.ts` (`myInitiativesList`, `myInitiativesListReportingByPortfolio`, `currentResult(Signal)`, `reportingCurrentPhase.phaseId`, `detailSectionTitle()`).
- `services/global/centers.service.ts` (`centersList`, `getData()`).
- `services/global/institutions.service.ts` (`institutionsList`, `loadedInstitutions`, `institutionsWithoutCentersListPartners`).
- `services/global/policy-control-list.service.ts`.
- `services/global/innovation-control-list.service.ts` (`readinessLevelsLoaded$`).
- `services/global/roles.service.ts` (`isAdmin`, `readOnly` — toggled by drawer).

### Shared components & modules
- `shared/components/geoscope-management/` — geo picker.
- `shared/components/alert-global-info/` — Home banner.
- `shared/icon-components/pdf-icon/` — view drawer.
- `shared/directives/ymz-list-structure-item/` — used by `innovation-use-content` for list animations.
- `shared/pipes/format-time-ago/` — recent activity.
- `shared/interfaces/SP-progress.interface.ts`, `recentActivity.interface.ts`, `center.dto.ts`.

### Custom fields
The entire `custom-fields/` module: `pr-input, pr-textarea, pr-select, pr-multi-select, pr-radio-button, pr-yes-or-not, pr-field-header, pr-button, alert-status`.

### Cross-feature pulls (the most concerning coupling)
- `pages/results/pages/result-creator/result-creator.module.ts` → `app-report-result-form`.
- `pages/results/pages/result-creator/services/result-level.service.ts` → result-type selection state.
- `pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service.ts` → result-type catalog.
- `pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.module.ts` → **`app-cp-multiple-wps`** (the TOC tree). This is the biggest dependency. The TOC tree is itself a large component with its own state, services, and child trees.

### 10.1 `app-cp-multiple-wps` — the TOC tree (most critical replication dependency)

This is the single most important external widget to understand. It is rendered twice inside the review drawer (own initiative + each contributor initiative) and is the editing surface for TOC alignment.

**Public input/output contract** (as consumed by `result-review-drawer.component.html`):

```
@Inputs
  [initiative]            → the tocInitiative object (planned_result, initiative_id, result_toc_results[], ...)
  [initiativeId]          → number (the initiative_id under which to edit)
  [resultLevelId]         → number (from commonFields.result_level_id, drives which work packages are eligible)
  [isIpsr]                → boolean (false for bilateral)
  [isContributor]         → boolean (false for own initiative, true for contributors)
  [isNotifications]       → boolean (false in this module)
  [isUnplanned]           → boolean (= !planned_result, drives the "unplanned" branch of the tree)
  [showMultipleWPsContent]→ boolean (= tocConsumed(), gates rendering until parent data is settled)
  [hidden]                → boolean (= true, hides an internal "details" panel)
  [forceP25]              → boolean (= true, forces the new portfolio code path)
  [editable]              → boolean (= canEditInDrawer(); falls back to RolesService.readOnly when false)
@Outputs
  (selectOptionEvent)     → fires when the user picks HLO / Indicator / Contribution; the drawer responds by flipping `markTocAsDirty()` and re-running `validateIsToCCompleted()`.
```

**Internal contract** (what the tree expects to read AND write):
- Reads `dataControlSE.currentResult` (set by the drawer in `fetchAndProcessResultDetail`).
- Reads `RolesService.readOnly` for fine-grained disable states (why the drawer flips this).
- Mutates `tocInitiative.result_toc_results[i].toc_level_id / toc_result_id / indicators[0].related_node_id / indicators[0].targets[0].contributing_indicator` in place.
- Uses an internal HTTP fetch for the TOC tree of `[initiativeId]` — that fetch happens on every `[initiativeId]` change, so toggling between contributors triggers network traffic.

**Replication strategy** (per Kimi + Gemini + DeepSeek): **port the source files as a "core shared component" before touching the drawer.** Do not try to rebuild this widget from scratch as part of the bilateral module replication — it is its own multi-week project. For an MVR (§13), substitute a **read-only display** of the TOC tree, with full editing deferred to Phase 2.

### Third-party
- `chart.js` + `chartjs-plugin-datalabels` — entity-details charts.
- PrimeNG 19, PrimeIcons.
- `@angular/forms` (`FormsModule`).
- `@angular/router`.

---

## 11. Behavior catalog (the gotchas the file structure hides)

A condensed catalog of behaviors a replicator must NOT lose:

1. **SGP-02 is a snowflake initiative.** No AOWs, no bilateral review. The code checks both `'SGP-02'` and `'SGP02'` because the upstream catalog has both. Entity-details has 3 fallback paths to resolve its short name. If your new app doesn't have SGP-02 yet, leave the branch as dead code rather than removing it.

2. **Body scroll lock per drawer.** Three drawers each set `document.body.style.overflow = 'hidden'` on init and `'auto'` on destroy. They do NOT coordinate. If two open at once (it shouldn't, but defensively) and one closes first, the body becomes scrollable while the other is still open.

3. **`status_id` is sometimes a string.** Always compare with `==`, not `===`, when checking `status_id == 5`. Or coerce on ingress.

4. **Effect-based table refresh.** `ResultsReviewTableComponent.onChangeCenterSelected` is an `effect()` that fires on every change to `currentCenterSelected()`. It clears `tableData/tableResults/filters` BEFORE re-fetching — so users see an empty table for a moment. On replication, consider keeping the previous data visible until the new fetch lands.

5. **Pending counts vs filtered table.** `pendingCountByAcronym` derives from `allResultsForCounts` (which is filled only when "All Centers" is selected, or after `refreshAllResultsForCounts()`). When a single center is selected, the counts can become stale unless the user re-selects "All Centers" or commits a decision (which triggers a refresh).

6. **Fail-open reporting access.** If `GET_phaseInitiativeStatus` errors, `reportingEnabled` is set to `true`. This is intentional but means a 401/500 hides a real lockout.

7. **CLARISA initiatives polymorphism.** The `contributingInitiatives` field can arrive as an array OR an object (§6.1). The drawer also handles primitives (numbers, strings) and objects in the same array — re-mapping via `effect()` once `contributingInitiativesList` is loaded.

8. **`tocConsumed` flag.** Toggled to `false` then back to `true` after 100ms when the user flips Yes/No on planned-result. This forces `app-cp-multiple-wps` to re-consume the TOC tree (it's an `@Input` based widget that doesn't react to internal mutations).

9. **Setting `setTimeout(..., 0/50/100/300, 1000)` cascades.** The drawer is full of these. They are workarounds for async timing issues with `app-cp-multiple-wps`, `geoscope-management`, and the institutions catalog. On replication, prefer to flatten via:
   - Replace the institutions polling with a single `take(1)` on the load Subject.
   - Replace `setTimeout(0)` markForCheck calls with `effect()` reactions.

10. **`isPlatformBrowser` guard.** Chart.js plugin registration is gated. The project is SSR-naive but the guard is defensive.

11. **Search query param via `Location.replaceState`.** Updates `?search=` without a router navigation — avoids browser history entries while typing. Re-implementation: use `history.replaceState` or a debounced router navigation with `replaceUrl: true`.

12. **TS class names with typos that are load-bearing**:
    - `cgspace`, `repo.mel.cgiar.org` (in regex, correct).
    - `target.contributing_indicator` (correct).
    - `non_pooled_projetct_budget_id` — typo from the backend (single `j` and double `t`). Do NOT rename.
    - `has_unkown_using` — typo from the backend (`unkown`, missing `n`). Do NOT rename.
    - `readinness_level_id` — typo from the backend. Do NOT rename.

---

## 12. Testing footprint

Each component ships with a `.spec.ts` next to it. The project enforces:
- branches ≥ 50%
- functions ≥ 60%
- lines ≥ 60%
- statements ≥ 60%

Cypress E2E tests exist at the application level (`cypress/`); the module does not own its own E2E specs.

Recommended test priorities (in replication order):
1. `BilateralResultsService` — pure signal/computed logic, easy wins, high value.
2. `EntityAowService.canReportResults` and `checkReportingAccess` — gating logic.
3. `ResultReviewDrawerComponent.normalizeDataStandardForComparison` — pure function, must be byte-stable for snapshot tracking.
4. `ResultReviewDrawerComponent.canApprove` — combinator of three predicates.
5. Filter chip removal + filter drawer Apply/Cancel rollback.

---

## 13. Minimal viable replication (2-week roadmap)

If a team must rebuild the module in 2 weeks (1 dev), this is the order of business:

**Week 1 — read paths only**

1. Day 1–2: Scaffold the module + routing. Stub all components.
2. Day 3: Implement `ResultFrameworkReportingHomeService` + Home page (cards + recent activity, no real-time).
3. Day 4: Implement `EntityDetailsComponent` charts and stats.
4. Day 5: Implement `EntityAowComponent` + sidebar + `EntityAowAowComponent` tabs + the read-only HLO table (no actions).

**Week 2 — write paths + bilateral**

6. Day 6: `BilateralResultsService` + `BilateralResultsComponent` page shell + sidebar + table (READ ONLY).
7. Day 7: `ResultsReviewFiltersComponent` (search + multi-select drawer + chips).
8. Day 8: `ResultReviewDrawerComponent` — load + display only (no edit, no save, no approve).
9. Day 9: Add the 5 type-specific sub-content components (read-only first).
10. Day 10: Add Approve/Reject mutations. Add inline title edit.
11. Day 11–12: TOC + Data Standards edit + save + dirty tracking + justification dialogs.
12. Day 13: AOW Report Result modal + View Results drawer + Target Details drawer.
13. Day 14: Polish, accessibility (keyboard handlers + ARIA labels), responsive, body-scroll-lock cleanup, type-specific quirks.

**Deferred** (post-2-weeks): the SGP-02 branching, fail-open reporting gates, and the CLARISA-projects-investment-projects sync. These can be ignored on day 1 if their data shapes are absent in the new application's backend.

---

## 14. Anti-patterns flagged for the replicator

These are things the current implementation does that the replicator should **not** copy verbatim:

1. **Mutating `@Input()` values inside setters** (`cap-sharing-content`, `inno-dev-content`, `policy-change-content`, `innovation-use-content`). The `set resultDetail(value)` mutates incoming objects (`value.resultTypeResponse[0].xxx = null`). Prefer cloning + emitting back through `(resultDetailChange)` outputs.

2. **Global `RolesService.readOnly` toggling** during drawer open. Prefer explicit `[readOnly]` inputs on the shared components.

3. **`setTimeout(..., 0|50|100|300|1000)` chains** in `loadResultDetail` and `confirmEditingTitle`. Replace with `effect()`/`queueMicrotask()`/`take(1)`/RxJS coordination.

4. **Body scroll lock via `document.body.style.overflow`**. Use a single shared service that ref-counts open drawers.

5. **Snapshot-based dirty tracking via `JSON.stringify`**. Works, but fragile against non-deterministic key order and `Map`/`Set` containers. Consider a structural-comparison utility.

6. **PrimeNG `p-multiselect` populated from `signal().` computed every render**. Memoize when the list grows large (institutions catalog has thousands of entries).

7. **`p-skeleton` arrays as `[0,1,2,...,9]` in templates**. Replace with a count input (or a `*ngFor="let _ of [].constructor(10)"`) for readability.

8. **Cross-feature imports** (`RdContributorsAndPartnersModule`, `ResultCreatorModule`). On replication, extract the TOC tree (`app-cp-multiple-wps`) and the "Report Result Form" into their own `shared/`-level modules first; otherwise the replicated module pulls in the whole results feature graph.

9. **Hardcoded `resultTypeResponse[0]`** in sub-content components. The code reads `resultTypeResponse?.[0]` everywhere but does not guard against empty arrays. Production data always has one item, but a malformed response will silently render nothing. Normalize on ingress (drawer's `fetchAndProcessResultDetail`) to a single object, or assert non-empty before passing to children.

10. **SGP-02 magic string** scattered across `EntityAowService`, `EntityDetailsComponent`, and the card item. Centralize as a config: `const SPECIAL_INITIATIVES_WITHOUT_AOW = ['SGP-02', 'SGP02'];` and check membership instead of equality.

11. **Theme tokens are non-optional**. If the target app does not define every `--pr-color-*` used by this module, the UI silently renders white-on-white. Add a boot-time check in dev that verifies the required tokens exist (warn in console if missing).

12. **Singleton state leak across navigation** (per Gemini). `providedIn: 'root'` services retain state across routes — the code papers over this with `resetDashboardData()` and similar imperative resets in `ngOnInit`. A cleaner replication uses **route-scoped services** (Angular: `providers: [...]` on the route component, React/Vue: a context provided in the page component).

---

## 15. Checklist for the replicator

Use this as the gate to "module is ready":

- [ ] Routes resolve under `/result-framework-reporting/*` and `**` redirects to `home`.
- [ ] Home renders SP cards from real API data; loading skeletons fire; empty state renders alert.
- [ ] Entity Details renders 2 charts, 2 stat cards, AOW cards, indicator cards.
- [ ] SGP-02 hides the Bilateral banner and the AOW list is empty.
- [ ] AOW tabs switch between HLO and Outcomes tables.
- [ ] Report Result modal validates CGSpace handles and POSTs successfully.
- [ ] View Results drawer + Target Details drawer body-scroll-lock work.
- [ ] Bilateral Centers sidebar shows pending counts, hides centers with zero results, "All Centers" works as the default.
- [ ] Table groups by project, status badges and contributor badge render, search + filter chips work, custom filter drawer Apply/Cancel rolls back state.
- [ ] Review drawer loads detail; inline title edit succeeds.
- [ ] TOC tab: yes/no flip, app-cp-multiple-wps consumes TOC tree, dirty tracking flags Save button.
- [ ] Data Standards: geo, centers, projects, initiatives (accepted/pending/primary), institutions, evidence — all save successfully.
- [ ] Type-specific sub-content renders for `result_type_id` in {1, 2, 5, 6, 7}.
- [ ] Approve / Reject mutations work; sidebar pending counts refresh; drawer closes.
- [ ] Read-only state restores after drawer closes (verify by opening another section that depends on `RolesService.readOnly`).
- [ ] No hex literals in SCSS; all colors via `--pr-color-*`.
- [ ] All user-facing copy goes through the project's i18n (`TerminologyService` if you're staying on PRMS, else your own).
- [ ] Coverage thresholds met (50/60/60/60).

---

## 16. Backend contracts cheat sheet

For a parallel backend rebuild, the minimum set of endpoints to honor:

```
GET    /api/results-framework-reporting/get/science-programs/progress
GET    /api/notification/recent-activity
GET    /api/results-framework-reporting/clarisa-global-units?programId=<id>
GET    /api/results-framework-reporting/programs/indicator-contribution-summary?program=<id>
GET    /api/results-framework-reporting/toc-results?program=<id>&areaOfWork=<aow>[&year=<y>]
GET    /api/results-framework-reporting/toc-results/2030-outcomes?programId=<id>
GET    /api/results-framework-reporting/bilateral-projects?tocResultId=<id>
GET    /api/results-framework-reporting/existing-result-contributors?resultTocResultId=<id>&tocResultIndicatorId=<id>
GET    /api/results-framework-reporting/dashboard?programId=<id>
POST   /api/results-framework-reporting/create
GET    /api/results/admin-panel/phases/<phaseId>/reporting-initiatives/<initiativeId>/status
GET    /api/results/by-program-and-centers?programId=<id>[&centerIds=<csv>]
GET    /api/results/pending-review?programId=<id>
GET    /api/results/bilateral/<resultId>
PATCH  /api/results/bilateral/<resultId>/title
PATCH  /api/results/bilateral/review-update/toc-metadata/<resultId>
PATCH  /api/results/bilateral/review-update/data-standard/<resultId>
PATCH  /api/results/bilateral/<resultId>/review-decision
GET    /clarisa/initiatives[/<portfolioId>]
GET    /clarisa/initiatives/get/all/without/result/<resultId>/<portfolio>
GET    /clarisa/projects/get/all
GET    /capdevs-terms/get/all
GET    /capdevs-delivery-methods/get/all
GET    /actors-types/...   (GETAllActorsTypes())
```

All responses: `{ response, statusCode, message, timestamp, path }`. Auth header: `auth: <JWT>`.

---

## 17. Cross-reviewer findings (independent AI reviewers)

This section consolidates three independent reviews performed against this exact replication context: **DeepSeek R1** (deep reasoning), **Google Gemini** (architectural lens), **Moonshot Kimi** (sceptical review). Each was given the same brief: "tell me what's missing, what's risky, and what a 2-week MVR looks like." The findings below are paraphrased with attribution.

### 17.1 Highest-confidence findings (all three reviewers agreed)

These items received independent confirmation from at least two reviewers — treat them as authoritative:

1. **`RolesService.readOnly` global toggle is the #1 fragility.** All three flagged this. If the drawer crashes before `ngOnDestroy`, the global stays polluted; any background process that reads `isAdmin`/`readOnly` (notification toasts, headers) sees the temporarily-flipped state. **Action**: replicate with explicit `[readOnly]` props per child component, not a global mutation. (Gemini's term: *"the RolesService hijack"*.)

2. **`app-cp-multiple-wps` is the single largest black box.** All three identified it as the deepest replication risk. Without it the review drawer cannot edit TOC alignment. **Action**: port it as a "core shared component" first OR replicate a simplified read-only version as a Phase-1 substitute. Kimi noted its contract: input `tocResult` object, output `selectOptionEvent`; the drawer renders it twice (own initiative + each contributor) and re-mounts it on yes/no flips via the `tocConsumed` flag.

3. **`status_id == 5` (loose equality) is fragile.** All three flagged the `==` vs `===` choice. The backend has historically returned the field as both string and number. **Action**: coerce at the API boundary (`Number(status_id)`) and use `===` everywhere downstream.

4. **2-week MVR scope agrees**: focus on the **bilateral review flow** (sidebar + table + drawer + Approve/Reject). Defer: AOW, charts, SGP-02 branching, TOC editing, type-specific sub-content edits.

### 17.2 DeepSeek R1 — replication risks & API contract clarity

Specific additions to incorporate into this doc:

- **Reapply guard `_lastContributingInitiativesReapplyKey`** is a workaround for an effect-loop, not a feature. A cleaner replication would use `toSignal` on `combineLatest` with `distinctUntilChanged`, or split "fetched data" signals from "user edit" signals.
- **`canReportResults` fail-open**: `reportingEnabled` defaults to `true` on error. DeepSeek flagged this as a **security concern** — a transient API failure silently unlocks reporting. If your new app cares about lockout enforcement, default to `false`.
- **Pending counts vs filtered table** — uses two distinct endpoints. Replicators must NOT collapse them into one or the sidebar badges will get stale on single-center filtering.
- **CGSpace regex** — export as a module-level constant and reuse in the AOW create modal AND the knowledge product sub-panel.
- **Suggested doc structure** matches §1–§16 of this file ✓.

### 17.3 Gemini — architectural lens

Specific additions:

- **"Singleton leak" pattern**: `EntityAowService` and `BilateralResultsService` are `providedIn: 'root'`, which means they retain state across navigations. Two tabs open will see inconsistent state. **Alternative replication strategy**: provide these services at the **route component level** (Angular `providers: [...]` on the component, not on the root injector) so each route activation gets a fresh instance. Trade-off: lose the `prefetch` benefit but gain isolation. The current code papers over this with imperative `resetDashboardData()` calls in `ngOnInit` — easy to forget.
- **Single-item array pattern**: `resultTypeResponse` is *always* an array with exactly one element in current production data, but the code does not enforce this on the typings. **Replication warning**: always `safe-access [0]` or normalize to a single object during ingress, never assume `length >= 1`.
- **Polymorphic `contributingInitiatives` as a TypeScript union**: document the `BilateralResultDetail.contributingInitiatives` type explicitly as `BilateralContributingInitiative[] | BilateralContributingInitiativesObject`. Replicators on a non-TypeScript stack should still document both shapes side-by-side.
- **Sibling module coupling (Feature-on-Feature)**: this module imports `ResultCreatorModule` (from `pages/results/...`) for `app-report-result-form`, AND `RdContributorsAndPartnersModule` for `app-cp-multiple-wps`. The module is **not** standalone — it brings in the whole results feature graph. **Replication strategy**: extract those shared widgets to a true `shared/` namespace BEFORE replicating, or accept the full results-feature pull.
- **SCSS token fragility**: if the target app uses a different naming (`--primary-500` vs `--pr-color-primary-300`), the UI goes white-on-white. Define a complete token map up front (see §9.1).
- **Granular PATCH endpoints** (title, toc-metadata, data-standard, review-decision) — replicators MUST honor this split. Do NOT collapse them into a single `PUT /bilateral/:id`. Each save has different validation, justification requirements, and downstream effects (the review-decision endpoint emits notifications).
- **`setTimeout` cascades** in the drawer are workarounds for `app-cp-multiple-wps` and the institutions catalog. Replicators should flatten via `ResizeObserver` / `NgZone.onStable` / a `take(1)` on a load Subject.

### 17.4 Kimi — sceptical review

Specific additions:

- **`app-cp-multiple-wps` contract** (the most useful single addition to the doc):
  - Input: `tocResult` (object matching `BilateralTocMetadata` plus `result_toc_results` array).
  - Input: `tocResultId` (number).
  - Input: `nodeId` (string).
  - Input: `isReadOnly` (boolean — falls back to `RolesService.readOnly`).
  - Output: `selectOptionEvent` (fired when the user picks a HLO / Indicator / Contribution).
  - Internal: recursive tree component that reads from `dataControlSE.currentResult` to gate which work packages are selectable for the current portfolio.
- **`refreshAllResultsForCounts()` post-decision cascade**: Kimi emphasized this is non-obvious. After Approve/Reject, the drawer emits `decisionMade`; the table component listens and ALSO triggers a full refresh of `allResultsForCounts`. Without this cascade, the sidebar pending badges and the table go out of sync.
- **Theme dependency = invisible UI risk**: missing `--pr-color-*` tokens cause silent white-on-white rendering. Suggest a "token verification" boot check that warns in dev.
- **SGP-02 magic string**: `'SGP-02'` is scattered across `EntityAowService`, `EntityDetailsComponent`, and the SP card item. Replicators should centralize this in a config constant (`SPECIAL_INITIATIVES.NO_AOW = ['SGP-02', 'SGP02']`) and check membership, not equality.
- **Hardcoded `resultTypeResponse[0]`**: same concern as Gemini's "single-item array" — replicators MUST normalize on ingress.
- **Client-side table grouping**: `project_name` grouping is done in the browser. Sort stability is lost on filter changes. For larger datasets (>500 rows per center) replicators should consider server-side grouping or pagination.

### 17.5 Integration into this doc

Every actionable item from §17.2–17.4 has been merged into the appropriate section (§6 for contracts, §8 for drawer mechanics, §11 for behaviors, §14 for anti-patterns). The reviewer attributions above are kept here for traceability — if a future replicator disagrees with a recommendation, the named reviewer's reasoning provides the audit trail.

---

## 18. Document changelog

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 | 2026-05-12 | Yecksin Guerrero, in coordination with Claude | Initial extraction & replication guide. Reviewed by DeepSeek R1, Gemini, Kimi (pending integration). |
