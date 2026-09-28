# bilateral-results-list

**Verified:** 2026-09-24 · branch qa-development-2026-ss · 8764605b0 · spec `changes/bilateral-science-program-filter` (`BSF-T-1`/`BSF-T-2`)

## What it is
The W3/Bilateral results table a Centre user lands on at `/bilateral/:centerAcronym`. One row per
result the centre participates in for the selected reporting phase, as lead or as contributor.

## Contract
- Route param `:centerAcronym` → `BilateralContextService` (`centerId()`, `centerAcronym()`); the
  component never reads the URL for the centre itself.
- Phase comes from `PhasesService.phases.reporting`; the row set is re-fetched on phase change.
- Data: `GET /api/results/bilateral-center-results?centerId&versionId` via
  `BilateralApiService.GET_bilateralCenterResults()` — **not** an `/api/bilateral/*` route, so it is
  outside the payload contract in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
  Server side: `results.controller.ts` → `results.service.getBilateralCenterResults` →
  `result.repository.getResultsByBilateralCenter`.
- Rejection history: `GET_bilateralReviewHistory(resultId)` (P2-3157 AC4 dialog).
- Delete: `ResultsApiService.PATCH_DeleteResult(id)`.
- Exported for reuse/tests: `BilateralCenterResult` (`COV-DD-11` — the interface itself now lives
  in `../../services/bilateral-center-result.interface.ts`, with a `project_id?: number | null`
  field added for `COV-R-16`; this file only re-exports the type so existing imports compile),
  `BilateralColumnDef`, `BILATERAL_COLUMNS`.

## Where it is used
- `src/app/pages/bilateral/bilateral-routing.module.ts` — the centre's default landing page.
- `bilateral-results-list.component.spec.ts` imports `BILATERAL_COLUMNS` to pin the column catalog.

## Columns
`BILATERAL_COLUMNS` is the single source of truth for the table order **and** the "Columns" picker
**and** the CSV export. Adding a column means four edits, in this order:

1. a field on `BilateralCenterResult` (and the server SELECT that fills it),
2. an entry in `BILATERAL_COLUMNS`,
3. an `@else if (column.attr === '…')` branch in the template,
4. a `case` in the private `cellText()` — the CSV writer, which otherwise emits an empty column.

Skipping 3 renders an empty `<td>`; skipping 4 breaks only the export, silently.

**Not every field is a column.** `result_type_id` and `submitter` (P2-3653) ride on the payload for
the "Update result" rule and the confirmation modal, and are deliberately absent from
`BILATERAL_COLUMNS` — only steps 1 and the server SELECT apply to them.

## Project multiselect filter (`changes/project-multiselect-filter`, `PMF-T-1` pivot)
The Filters popover exposes the shipped `project` URL contract through the same
`app-pr-filter-multiselect` the Created by field uses — placed between Source and Created by, group
name `Filter by project`, visible label `Project`.
- Options come from the **center's own catalog**, never from loaded rows (the pivot: contributing
  rows display other Centers' projects — 14 of AfricaRice's 20 row projects were foreign — and
  zero-row catalog projects would never appear). `BilateralApiService.GET_bilateralProjects(centerId,
  year)` is requested once per selected phase **year** per page lifetime (`selectedPhaseYears`),
  cached in `projectCatalogByYear`, and unioned/deduped by id into `projectOptions`: labels are
  trimmed `shortName fullName` (`Project <id>` fallback) sorted case-insensitively, string ids
  normalize through `normalizeProjectId` (same trap as `phaseVersionId`). A failed year is recorded
  and never retried — options degrade to the other years or empty. A center switch resets the
  cache. No project-specific loading/error surface; page states stay authoritative, and selecting
  a project never refetches rows.
- Server: `GET /api/bilateral/center/projects` takes an optional positive-integer `year` query
  (additive, `PMF-DD-5`); `BilateralProjectsService.getProjectsByCenter` resolves
  `targetYear = year ?? activeYear.year`, ignoring absent/invalid values (never a 5xx) and naming
  the resolved year in its phase log line. Omitted, the endpoint keeps the old active-year behavior
  byte-for-byte — the Overview/creation-wizard callers are untouched.
- `projectSelectOptions` appends URL-selected ids the catalog union does not carry (`Project <id>`
  label), so a deep link stays ticked and removable — never silently dropped.
- `onProjectFilterChange` normalizes the emitted array and routes it through the existing
  `projectFilter` signal, `filterCenterResults` predicate, chips and `syncUrlParams()` — no second
  state path. Chip removal reuses `removeProjectFilter`; Clear all reuses `clearAllFilters`.

## Science Program multiselect filter (`changes/bilateral-science-program-filter`, `BSF-T-1`/`BSF-T-2`)
The Filters popover exposes the pre-existing `program` URL contract (already read/written by
`filterCenterResults`/`currentContractParams`/`applyUrlParams`/`syncUrlParams` before this spec)
through the same `app-pr-filter-multiselect` the Project field uses — placed immediately after
Project and before Created by, group name `Filter by science program`, visible label `Science
Program`.
- Options come from the **portfolio-wide** CLARISA initiatives catalog — deliberately NOT
  centre-scoped, unlike the Project filter (`PMF-*`): Science Programs are a small, stable,
  portfolio-wide list, so listing every program in the active portfolio (not only ones with rows at
  this centre) is the more useful default (see the spec's `DD-1`). `ResultsApiService.
  GET_AllInitiatives(portfolioAcronym)` is requested once per portfolio acronym per page lifetime
  (keyed off `selectedPhase()?.obj_portfolio?.acronym`, via a `toObservable(selectedPhase)` pipe in
  the constructor — parallel to, never blocking, the results/project-catalog pipelines), cached in
  `programCatalogByPortfolio`, filtered through the shared `filterOutAvisaInitiatives` util (drops
  SGP-02/AVISA), and unioned into `programOptions`: labels are **code-first**
  (`${official_code} - ${short_name || name}`, bare code when no name) — mirrors `catalogProjectLabel`
  and matters because the code (`SPxx`) is what the deep-link fallback and the `[filter]="true"`
  search box key off. A failed portfolio is recorded and never retried, degrading to an empty list
  for that portfolio — no program-specific loading/error surface.
- `programSelectOptions` appends URL-selected codes the catalog doesn't carry (bare-code label), so a
  deep link stays ticked and removable — same pattern as `projectSelectOptions`.
- `onProgramFilterChange` normalizes the emitted array (unique, trimmed) and routes it through the
  existing `programFilter` signal, `filterCenterResults` predicate, chips and `syncUrlParams()` — no
  second state path. Chip removal reuses `removeProgramFilter`; Clear all resets `programFilter`
  alongside the other filters.
- ⚠️ **`filterOutAvisaInitiatives<T extends AvisaInitiativeLike>` cannot infer `T` from an
  `any`-typed argument** (`GET_AllInitiatives` returns `Observable<any>`) — TypeScript silently falls
  back to the bare `AvisaInitiativeLike` constraint (only `official_code`-family + `id` fields, no
  `short_name`/`name`), which compiles fine under `ng lint`/Jest (ts-jest transform) but fails a real
  `ng build`/`ng serve` with `TS2339`. Always pass an explicit type argument at the call site (see
  `loadProgramCatalog`) when consuming `filterOutAvisaInitiatives` on an `any`-sourced array — don't
  rely on inference, and don't trust lint/Jest alone to catch this class of error; verify with an
  actual `ng build` when touching this codepath.

## "Update result" (P2-3229, P2-3653)
`canUpdateResult()` delegates to `ApiService.canUpdateBilateral` so this list and the Results Center
row menu cannot drift: previous phase, Approved, **not a Knowledge Product**, user of the lead centre
or admin. The KP condition compares `result_type_id`, not the `result_type` display name — which is
why the server SELECT has to carry the id.

`asCurrentResult()` is the adapter into the shared `app-change-phase-modal`. The modal reads fields
this row does not have, so they are supplied here or by the payload: `phase_name` is derived from the
row's phase and formatted as the Results Center formats it (`"Reporting 2025 - P25"`), `lead_center`
is this centre, `phase_year` comes from the phase, and `submitter` (the primary Science Program's
official code) arrives from the server. Adding a field to that modal means checking this adapter —
a missing one renders blank here and populated from the Results Center, which is how P2-3653 was
found.

## Traps (⚠️ = already broke something)
- ⚠️ **The APIs deliver ids as STRINGS.** `GET /api/versioning` answers `{ id: '34', … }` and the
  center projects payload does the same, although `Phases.id` is typed `number` (H-1/H-2 of the
  `center-overview-tab` spec). `selectedPhase`, `selectPhase` and the `loadResults` subscription all
  normalize through `phaseVersionId()`; a strict `p.id === ctx.selectedVersionId()` matched nothing,
  so the shared phase degraded to Open and the fetch went out with a string `versionId`. Phase
  fixtures MUST use string ids.
- ⚠️ **Bump `BILATERAL_COLUMN_STORAGE_KEY` whenever a new column must be visible by default.**
  Visibility is persisted per browser in `localStorage`, and a stored map from an older version
  wins over `defaultOn`, so returning users would never see the new column. Currently `…v4`
  (v4 = Created by column; v3 = P2-3152 AC6 Project name and Description). The spec asserts the key by name.
- ⚠️ **Never widen the project lookup into a `LEFT JOIN` on `results_by_projects`.** A result can
  carry several active project links; the server resolves `project_name` with a correlated
  subquery precisely so the row is not multiplied. `result.repository.spec.ts` pins this.
- The row `(click)` opens the result, so every in-row control needs `$event.stopPropagation()`.
- `canManageW3()` is `true` for admins regardless of centre; do not treat it as a centre check.

## Pending / not implemented here
- P2-3152 AC5 (automatic notification to the Science Program on submit) is blocked on business —
  the system cannot resolve "the Science Program users" today.
