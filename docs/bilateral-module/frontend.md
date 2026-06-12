# Bilateral Module Frontend Guide

This guide explains the frontend side of the bilateral module so it can be rebuilt in another stack. The current implementation lives under `onecgiar-pr-client/src/app/pages/result-framework-reporting/` and uses Angular 19, PrimeNG 19, signals, and shared PRMS components.

## Module Scope

The `result-framework-reporting` frontend module provides:

- Science Program / Accelerator home page.
- Entity details dashboard for one Science Program.
- Area of Work navigation and result-reporting entry points.
- Bilateral Results Review workspace with center sidebar, table, filters, and review drawer.

For a bilateral-only rebuild, the required surfaces are:

- `/result-framework-reporting/entity-details/:entityId`
- `/result-framework-reporting/entity-details/:entityId/results-review`
- The review banner, center sidebar, filter bar, grouped table, and result review drawer.

## Assets

Assets used by the module live in `onecgiar-pr-client/src/assets/result-framework-reporting/`:

| Asset | Use |
|---|---|
| `header_img_v2.png` | Home hero banner background. |
| `editing_results.png` | Entity Details editing stat card. |
| `submitted_results.png` | Entity Details submitted stat card. |
| `quality_assessed_results.png` | Quality assessed visual asset when used by dashboards. |
| `SPs-Icons/<initiativeCode>.png` | Science Program card icons, e.g. `SP01.png`, `SP12.png`, `SGP-02.png`. |

If an icon is missing, the current card component falls back to a placeholder. Preserve that behavior so catalog additions do not break the UI.

## Route Contract

Current routes are declared in `src/app/shared/routing/routing-data.ts` under `ResultFrameworkReportingRouting`:

```text
/result-framework-reporting/home
/result-framework-reporting/entity-details/:entityId
/result-framework-reporting/entity-details/:entityId/results-review
/result-framework-reporting/entity-details/:entityId/aow
/result-framework-reporting/entity-details/:entityId/aow/all
/result-framework-reporting/entity-details/:entityId/aow/unplanned
/result-framework-reporting/entity-details/:entityId/aow/2030-outcomes
/result-framework-reporting/entity-details/:entityId/aow/:aowId
```

Query parameters used by the bilateral review workspace:

- `center=<centerCode>` selects one center in the sidebar.
- `search=<text>` hydrates the table search input.

Deep links to the standard result detail page must include phase when possible:

```text
/result/result-detail/<resultCode>/general-information?phase=<versionId>
```

## State Model

The module uses singleton services with Angular signals. In another stack, use route-scoped state, a page store, or reactive context with equivalent responsibilities.

### `BilateralResultsService`

Current location: `pages/result-framework-reporting/pages/bilateral-results/bilateral-results.service.ts`.

Responsibilities:

- Store current Science Program code in `entityId`.
- Store CLARISA entity details and center list.
- Store selected center(s), search text, table filters, grouped table data, and flat table data.
- Compute filter options from current result rows.
- Compute pending-review counts from `allResultsForCounts`, not from the currently filtered table.
- Store drawer visibility and current result to review.

Important signals and computed values:

| State | Meaning |
|---|---|
| `entityId` | Science Program official code from the route. |
| `centers` | CLARISA centers used in the sidebar. |
| `currentCenterSelected` | Array of selected center codes. Null selection means all centers in caller logic. |
| `searchText` | Table search text, synced with `?search=`. |
| `selectedIndicatorCategories`, `selectedStatus`, `selectedLeadCenters` | Client-side table filter selections. |
| `tableData` | Grouped results by project. |
| `tableResults` | Flattened rows for filters. |
| `allResultsForCounts` | Full center result set used for sidebar badges. |
| `pendingCountByAcronym` | Count of `status_id == 5` rows by lead center acronym. |
| `showReviewDrawer`, `currentResultToReview` | Drawer state. |

Replication warning: sidebar counts must not depend on the current table filter, otherwise selecting one center makes counts for the other centers disappear.

## Page And Component Map

```text
result-framework-reporting/
├── result-framework-reporting.component.*
└── pages/
    ├── result-framework-reporting-home/
    ├── entity-details/
    │   └── components/bilateral-results-review/
    ├── entity-aow/
    └── bilateral-results/
        ├── bilateral-results.component.*
        ├── bilateral-results.service.*
        └── components/
            ├── indicators-sidebar/
            ├── results-review-container/
            ├── results-review-filters/
            └── results-review-table/
                └── components/result-review-drawer/
                    ├── result-review-drawer.component.*
                    ├── result-review-drawer.interfaces.ts
                    └── components/
                        ├── kp-content/
                        ├── inno-dev-content/
                        ├── cap-sharing-content/
                        ├── policy-change-content/
                        ├── innovation-use-content/
                        └── save-changes-justification-dialog/
```

## Entity Details Banner

`BilateralResultsReviewComponent` renders the entry point from an entity detail page:

- Reads `entityId` from route params.
- Calls `GET /api/results/pending-review?programId=<entityId>`.
- Shows `Bilateral Results Review`, the pending count, explanatory text, and a `results-review` relative link.
- Is hidden for `SGP-02` in the parent component.

Replication warning: current code checks only `entityId !== 'SGP-02'` in one place, while other parts also handle `SGP02`. Centralize this as `isSpecialProgramWithoutAow(id)` and support both forms.

## Bilateral Results Page

`BilateralResultsComponent` is the shell for the review workspace:

- Reads `entityId` from params.
- Loads entity details.
- Renders breadcrumb, sidebar, filters, and table.
- Supports breadcrumb state for `?center=<code>`.
- `navigateToResultsReview()` clears center selection and URL center filter.

Recommended layout in any stack:

```text
Breadcrumb
Sidebar: All Centers + centers with result counts
Main content:
  Filters: search, filter drawer, active chips
  Grouped table by bilateral project
  Review drawer modal/side panel
```

## Center Sidebar

Current component: `components/indicators-sidebar/`.

Behavior:

- Loads CLARISA centers through `CentersService`.
- Hydrates selected center from `?center=` if present.
- Includes an `All Centers` row with total pending count.
- Shows per-center pending badges for `status_id == 5`.
- Hides centers with no result rows once data is available.
- Is keyboard accessible through `role="button"`, `tabindex="0"`, Enter, and Space.

Rebuild note: fetch all-center rows on initial mount even when a center is deep-linked, otherwise sidebar counts for other centers start at zero.

## Filter Bar

Current component: `components/results-review-filters/`.

Behavior:

- Search matches `result_code`, `result_title`, `indicator_category`, `toc_title`, and `indicator`.
- Search is synced to the URL with replace-state behavior, not push-state on each keystroke.
- Three multiselect filters are memory-only: indicator category, status, and lead center.
- Filter options are derived from the current table rows.
- Filter drawer uses Apply/Cancel semantics. Cancel restores temporary selections from service state.

If the new tool needs shareable filtered views, add URL sync for all filter groups, not only `search` and `center`.

## Review Table

Current component: `components/results-review-table/`.

Input source:

- Calls `GET /api/results/by-program-and-centers?programId=<id>&centerIds=<csv>` whenever `currentCenterSelected` changes.
- Clears table data and filters before each fetch.
- Stores grouped rows in `tableData` and flattened rows in `tableResults`.
- When all centers are selected, also updates `allResultsForCounts` for sidebar badges.

Grouped row shape:

```ts
interface GroupedResult {
  project_id: string;
  project_name: string;
  results: ResultToReview[];
}

interface ResultToReview {
  id: string;
  project_id: string;
  project_name: string;
  result_code: string;
  result_title: string;
  indicator_category: string;
  status_name: string;
  status_id?: string | number;
  acronym: string;
  toc_title: string;
  indicator: string;
  submission_date: string;
  lead_center?: string;
  initiative_role_name?: string;
}
```

Button behavior:

- If `status_id == 5` and user can review, show `Review result`.
- Otherwise show `See result`.
- Loose status comparison exists because backend can return strings or numbers; in a rebuild, coerce `status_id` to number at API boundary.

After approve/reject:

- Re-fetch current table selection.
- Re-fetch all counts through `refreshAllResultsForCounts()`.

## Review Drawer

Current component: `components/results-review-table/components/result-review-drawer/`.

This is the core of the frontend rebuild.

### Responsibilities

- Load one result detail by ID.
- Normalize backend detail into UI-friendly arrays/objects.
- Temporarily enable editing for shared widgets if the user can edit.
- Render common fields, ToC, data standards, evidence, and type-specific content.
- Track unsaved ToC and data-standard changes.
- Save ToC changes with justification.
- Save data-standard changes with justification.
- Edit title inline.
- Approve or reject a pending result.

### Load Sequence

```text
visible + resultToReview set
  -> load CLARISA projects
  -> wait for institutions catalog, with timeout fallback
  -> GET /api/results/bilateral/<resultId>
  -> set current result in global data control for embedded widgets
  -> load initiatives without this result
  -> normalize centers, projects, initiatives, institutions, type response, and ToC metadata
  -> capture data-standard snapshot
```

### Edit Permissions

The current code allows editing when:

- User is admin, or
- Result `status_id == 5` and the current user has the Science Program in `myInitiativesList`.

The drawer flips global `RolesService.readOnly` to `false` while open and editable, then restores the old value on close/destroy. This is a fragile coupling to shared components. A cleaner rebuild should pass explicit `readOnly` or `editable` props to embedded widgets and avoid global mutation.

### ToC Editing

The drawer embeds `app-cp-multiple-wps`, the same ToC tree used by Result Detail.

Inputs to preserve conceptually:

- Initiative object with `planned_result`, `initiative_id`, `result_toc_results`.
- Initiative id.
- Result level id.
- `isIpsr=false`.
- `isContributor=false` for primary editable tree.
- `isContributor=true` and `editable=false` for contributor display trees.
- `forceP25=true`.
- `isUnplanned=!planned_result`.
- `showMultipleWPsContent=tocConsumed`.

Internal ToC tree dependencies:

- Reads current result from global data control.
- Calls ToC endpoints for levels 1, 2, and 3 per initiative.
- Mutates the initiative object in place.

Rebuild warning: if you do not port the ToC tree, start with a read-only ToC display and defer editing.

### Data Standards Save Body

The drawer sends this conceptual body to `PATCH /api/results/bilateral/review-update/data-standard/<id>`:

```ts
{
  commonFields: { id, result_description, result_type_id },
  geographicScope: {
    has_countries,
    has_regions,
    regions: [{ id }],
    countries: [{ id, sub_national: [...] }],
    geo_scope_id,
    extra_geo_scope_id,
    extra_regions: [{ id }],
    extra_countries: [{ id, sub_national: [...] }],
    has_extra_countries,
    has_extra_regions,
    has_extra_geo_scope
  },
  contributingCenters: [{ code, acronym, institution_id, result_id, is_leading_result, selected, new, is_active }],
  contributingProjects: [{ project_id }],
  contributingInitiatives: {
    accepted_contributing_initiatives: [{ id, share_result_request_id, is_active }],
    pending_contributing_initiatives: [{ id }]
  },
  contributingInstitutions: [{ id, institutions_id, institution_roles_id, is_active, result_id }],
  evidence: [{ id, link, is_sharepoint }],
  resultTypeResponse: {},
  updateExplanation: string
}
```

Important quirks:

- First selected center becomes lead through array position: `is_leading_result = 1` for index 0.
- Empty arrays mean clear; omitted arrays generally mean leave unchanged.
- Evidence defaults `is_sharepoint` to `0` at save time.
- `contributingProjects` has mixed shapes in current code; normalize to `{ project_id }` in a rebuild.

### Type-Specific Content

The drawer renders one sub-component by `result_type_id`:

| ID | Type | Component |
|---|---|---|
| 1 | Policy change | `policy-change-content` |
| 2 | Innovation use | `innovation-use-content` |
| 5 | Capacity sharing | `cap-sharing-content` |
| 6 | Knowledge product | `kp-content` |
| 7 | Innovation development | `inno-dev-content` |

The GET response uses `resultTypeResponse` as a single-item array. Normalize it at the API boundary to avoid repeated `resultTypeResponse[0]` assumptions.

### Dirty Tracking

- ToC dirty state is a boolean flipped by user changes and reset after reload/save.
- Data-standard dirty state compares a JSON snapshot of normalized detail against current normalized detail.

Recommended rebuild improvement: use structural diff or per-field dirty flags instead of `JSON.stringify` snapshots.

### Approval Rules

The Approve button is enabled only when:

- ToC is complete.
- There are no unsaved ToC changes.
- There are no unsaved data-standard changes.

Approve sends:

```ts
{ decision: 'APPROVE', justification: 'Approved' }
```

Reject requires a user justification and sends:

```ts
{ decision: 'REJECT', justification: '<required text>' }
```

## Shared Dependencies

The current implementation depends on many PRMS shared pieces:

- `ApiService` aggregator and `ResultsApiService`.
- `DataControlService` for current result, phase, and user initiatives.
- `CentersService` and `InstitutionsService` catalogs.
- `RolesService` for admin/read-only state.
- `GeoscopeManagementModule` for geography editing.
- `RdContributorsAndPartnersModule` for `app-cp-multiple-wps` ToC tree.
- Custom fields module: `pr-input`, `pr-textarea`, `pr-multi-select`, `pr-radio-button`, `pr-yes-or-not`, `pr-field-header`, `pr-button`.
- PrimeNG drawer, table, multiselect, dialog, buttons, chips, skeletons, tooltips.

If rebuilding outside Angular, define equivalents before porting the drawer.

## Design Tokens

The UI relies on PRMS CSS variables:

- `--pr-color-primary-300`
- `--pr-color-primary-25`
- `--pr-color-secondary-50`
- `--pr-color-accents-1` through `--pr-color-accents-8`
- `--pr-color-neutral-200`
- `--pr-color-blue-300`
- `--pr-color-green-500`
- `--pr-color-red-300`
- `--pr-color-orange-400`
- `--pr-color-white`

In a different design system, create a token map first. Missing tokens can produce unreadable white-on-white states.

## Frontend Risks To Avoid

- Do not make pending counts depend on current table filter.
- Do not rely on global read-only mutation if you can pass explicit editability props.
- Do not ignore `status_id` type coercion.
- Do not drop contributor initiative buckets: primary, accepted, pending.
- Do not collapse all filter state into memory if shareable URLs are required.
- Do not skip phase query params when linking into Result Detail.
- Do not port `setTimeout` timing workarounds blindly; use reactive lifecycle hooks where possible.
