# bilateral-results-list

**Verified:** 2026-09-11 · branch JuanGuzman-io/p2-3653-kp-exclusion-ui · 689240e7a

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
- Exported for reuse/tests: `BilateralCenterResult`, `BilateralColumnDef`, `BILATERAL_COLUMNS`.

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
- ⚠️ **Bump `BILATERAL_COLUMN_STORAGE_KEY` whenever a new column must be visible by default.**
  Visibility is persisted per browser in `localStorage`, and a stored map from an older version
  wins over `defaultOn`, so returning users would never see the new column. Currently `…v3`
  (v3 = P2-3152 AC6 added Project name and Description). The spec asserts the key by name.
- ⚠️ **Never widen the project lookup into a `LEFT JOIN` on `results_by_projects`.** A result can
  carry several active project links; the server resolves `project_name` with a correlated
  subquery precisely so the row is not multiplied. `result.repository.spec.ts` pins this.
- The row `(click)` opens the result, so every in-row control needs `$event.stopPropagation()`.
- `canManageW3()` is `true` for admins regardless of centre; do not treat it as a centre check.

## Pending / not implemented here
- P2-3152 AC5 (automatic notification to the Science Program on submit) is blocked on business —
  the system cannot resolve "the Science Program users" today.
