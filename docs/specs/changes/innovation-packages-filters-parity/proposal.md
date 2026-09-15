# Proposal — Innovation Packages: Filter & Toolbar Parity With Result Center

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-packages-filters-parity` |
| Slug | `innovation-packages-filters-parity` — derived from free-text argument (user's request had no slug/path token, only a Spanish/English sentence + screenshot) |
| Type | Change |
| Approval Mode | gated (default — no explicit end-to-end mandate given) |
| Parent Spec | none |
| Author input | Free text (EN) + Spanish follow-up + screenshot `Image #32` (current Innovation Packages page) |
| Date | 2026-09-14 |

## 2. Intent

Bring the **Innovation Packages** list page (`/ipsr/innovation-package-list-content/innovation-package-list`) up to the same filtering capability and visual/interaction pattern as the **Results Center** list page (`/result/results-outlet/results-list`), so both surfaces feel like one product instead of two generations of UI.

## 3. Problem / Current Behavior

The Innovation Packages list ships a legacy chip-based toolbar (`app-ipsr-list-filters`, see screenshot) that only supports:

- **Submitter(s)** — chip toggle, one active `official_code` at a time (`ipsr-list-filter.service.ts:8-19`)
- **Phases** — chip toggle (`phase_name`)
- Free-text search (title/code, `full_name` match)

All filtering runs **client-side** over the full unfiltered list returned by `GETAllInnovationPackages()` (`innovation-package-list.component.ts:75-85`), via `InnovationPackageListFilterPipe` (`innovation-package-list-filter.pipe.ts`).

By contrast, **Results Center** (`results-list-filters.component.html`) offers a modern toolbar: a primary row (Search, **Program**, **Phase**, **Indicator category**, **Status**) plus a "More filters" popover (Portfolio, Center, Submitter, Funding source, Created/Submitted by me), filter chips with per-chip removal, and a signal-backed service (`ResultsListFilterService`). None of that exists for Innovation Packages today — there is **no Program filter, no Status filter, no Core innovation filter, no "More filters" popover**, and the toolbar lives in a different visual language (rounded chip pills vs. the RC toolbar's select dropdowns + chips row).

Row data already carries `status` (display text: New/Editing/…) and `official_code` (submitter/program) per row (`innovation-package-custom-table.component.ts:28-33`); `core_innovation` currently exists only as an **export column key** (`ipsr-list-filters.component.ts:45`), not confirmed as a stable per-row filterable field on the list payload — needs verification in `/akili-specify`.

## 4. Proposed Outcome

Innovation Packages gets the same toolbar shape, placement, and filter set pattern as Results Center:

- Primary row: Search · **Program** (initiatives, multiselect) · **Phase** (multiselect, replacing single-toggle chips) · **Package status** (multiselect) · **Core innovation** (pending data confirmation — see Open Questions)
- "More filters" popover for secondary facets (candidates: Portfolio, Submitter, Center — mirrored from RC where applicable to IPSR data)
- Chip row under the toolbar showing active filters with per-chip removal + "Clear all"
- Same placement/order as Results Center: toolbar sits directly under the page header/action buttons, above the table — already true today, so structural placement is preserved, only the toolbar's internal content and component are swapped

## 5. Scope

- `innovation-package-list.component.html` / `.ts` — swap/extend the filter toolbar
- `ipsr-list-filters.component.{ts,html,scss}` — rebuilt to the RC toolbar pattern, or replaced by a new component following it
- `ipsr-list-filter.service.ts` — extended from the current 2-facet chip model to a signal-backed multi-facet model (Program, Phase, Status, Core innovation, + More-filters facets)
- `innovation-package-list-filter.pipe.ts` — extended to filter by the new facets
- Verifying backend payload fields for Status and Core innovation are filter-safe (stable option sets, not free text)

## 6. Non-Goals

- No change to the Results Center toolbar itself (it is the reference, not the target of edits)
- No change to the Innovation Package **detail/creator** flows — list page only
- No backend/API contract changes assumed yet — if Status/Core innovation option catalogs don't already exist server-side in a filterable shape, that becomes an explicit dependency surfaced in `/akili-specify`, not solved here
- No P22/P25 terminology rework beyond what's needed to reuse existing terms

## 7. Affected Users, Systems, And Specs

- **Users:** anyone browsing/filtering the Innovation Packages list (submitters, PMU leads, admins)
- **Client files:** see Scope above, all under `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/`
- **Reference implementation (read-only):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/components/results-list-filters/` and its `ResultsListFilterService`
- **No related specs found** under `docs/specs/` for the IPSR list filters specifically — this is a net-new spec, not a continuation

## 8. Visual Reference

- Source: Existing in-repo pattern (no Figma/mockup) — Results Center toolbar is the literal visual target; screenshot `Image #32` documents the current (pre-change) Innovation Packages toolbar
- Location: `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/components/results-list-filters/results-list-filters.component.html` (target pattern) · user-provided screenshot (current state, not saved to disk — describe in `/akili-specify` requirements instead of re-uploading)
- Notes: `/akili-specify` should treat the RC toolbar's rendered HTML/SCSS as the design spec directly (component reuse or close structural mirroring), rather than generating a fresh mockup — the target already exists and runs in production

## 9. Requirement Delta Preview

### ADDED Requirements

- Program (initiative) multiselect filter, applied live like RC's Program filter
- Package status multiselect filter
- Core innovation filter (facet type TBD — pending data shape confirmation)
- "More filters" popover pattern for secondary facets
- Filter chips row with per-chip removal + "Clear all"

### MODIFIED Requirements

- Phase filter: single-select chip toggle → multiselect, matching RC's `selectedPhases`
- Submitter chip toggle → "Program" multiselect in the primary row (terminology aligned with RC, which calls the initiative filter "Program")
- Toolbar visual style: chip-pill rows → RC's select-dropdown + chip-row layout

### REMOVED Requirements

- Legacy single-active-chip submitter/phase toggle model (`onSelectChip`, `cleanAllFilters`) — superseded by multiselect, unless `/akili-specify` finds a reason to keep single-select semantics for IPSR specifically

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Reuse `ResultsListFilterService` pattern, new IPSR-scoped service (Recommended)** | Build a new signal-backed `IpsrListFilterService` (v2) mirroring `ResultsListFilterService`'s shape (submittersOptionsAdmin-equivalent, phasesOptionsOld-equivalent, statusOptions, chip groups) and a new/rebuilt `app-ipsr-list-filters` component styled like `results-list-filters` | Some duplication vs. a shared abstraction, but keeps IPSR and RC independently evolvable (they already have different data shapes — `official_code` vs richer submitter objects) and avoids a risky cross-module shared-service refactor |
| **B — Extract a shared generic filter-toolbar component/service used by both RC and IPSR** | One `ResultsFilterToolbarComponent` parameterized for both modules | Higher upfront cost, higher regression risk to the already-shipped RC toolbar; better long-term DRY, but not justified by this ticket's scope |
| **C — Minimal patch: add Status/Core innovation as more chip rows to the existing legacy component** | Smallest diff | Does not achieve "migrate the same styles… same filters… same location" — explicitly what the user asked for; rejected |

**Recommended: Option A.** It delivers the requested visual/functional parity without touching the working Results Center code, and keeps risk contained to the IPSR list page.

## 11. Recommended Approach

Follow Option A. `/akili-specify` should:

1. Confirm the exact facet list and option catalogs available from `GETAllInnovationPackages()` (or a new dedicated endpoint/params if server-side filtering is warranted for performance — current approach fetches the full list client-side, which the RC toolbar also effectively does per its `submittersOptionsAdmin`/`phasesOptionsOld` naming)
2. Design the new `IpsrListFilterService` signal shape 1:1 against `ResultsListFilterService` where the data supports it
3. Rebuild `app-ipsr-list-filters` HTML/SCSS mirroring `results-list-filters.component.html`'s structure (`.rc-toolbar`, `.rc-filter-bar`, `.rc-more-panel`, `.rc-meta-row`) — reusing the same SCSS classes only if they're promoted to a shared stylesheet, otherwise a parallel `.ip-*` namespace following the same shape
4. Extend `InnovationPackageListFilterPipe` (or replace client-side filtering with the same `computed()`-driven approach RC uses) for Program/Status/Core innovation
5. Regression-test the P25 vs P22 IPSR list, since Innovation Packages are IPSR-portfolio scoped and the RC toolbar is dual-portfolio aware (`selectedIndicatorCategories`, portfolio terms)

## 12. Risks, Dependencies, And Open Questions

- **Open question:** Is "Core innovation" a bounded categorical value suitable for a multiselect filter, or free text per result? Row-level field not yet confirmed outside the export-column key `core_innovation`. Must be resolved in `/akili-specify` before committing to a multiselect UI for it.
- **Open question:** Should filtering move server-side (query params) given the client already fetches and holds the *entire* Innovation Packages list in memory? Out of scope to change unless `/akili-specify` finds a performance requirement — flag as a possible follow-up, not blocking this change.
- **Risk:** Terminology — RC's "Program" filter is themed for `results` (all portfolios); IPSR is P25/reporting-cycle specific (`portfolioAcronym`). Confirm terminology consistency via `TerminologyService`/`TermKey` rather than hardcoding "Program".
- **Dependency:** No blocking dependency on other in-flight specs — this is additive/isolated to the IPSR list page.
- **Risk:** Removing the legacy single-active-chip UX could be a a behavior change some users rely on (only one submitter/phase visible at a time) — flag as a MODIFIED requirement for explicit sign-off, not an unannounced removal.

## 13. Success Criteria

- Innovation Packages list toolbar visually matches Results Center's toolbar pattern (search, primary filter row, "More filters" popover, filter-chip row with removal, same placement above the table)
- Users can filter Innovation Packages by Program, Phase (multi), Status, and (if data supports it) Core innovation — not just Submitter/Phase as today
- No regression to existing IPSR list behavior (download/export, admin deselect-inits flow, P25 phase gating)
- Client Jest coverage stays ≥ 50/60/60/60; new/changed components ship specs

## 14. Next Step

```text
/akili-specify changes/innovation-packages-filters-parity
```
