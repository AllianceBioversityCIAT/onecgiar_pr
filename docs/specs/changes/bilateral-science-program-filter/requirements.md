# Requirements — Bilateral Results: Science Program filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-science-program-filter` |
| Depth | **Lite** — client-only UI addition on top of an already-shipped `program` contract; no data/API/auth change |
| Module Code | `BSF` |
| Status | draft |
| Source | `proposal.md` (approved) |
| Ticket | none |

## Executive Summary

The Bilateral Results tab's Filters popover (Phase, Source, Project, Created by, Center role) is
missing a **Science Program** filter, even though the underlying `program` query-param contract,
row predicate (`filterCenterResults`), and component-level `programFilter` signal already exist and
are exercised by the Center Overview tab. This spec adds only the missing **UI**: options, control,
chips, handlers, URL round-trip — mirroring the just-shipped Project multiselect filter exactly.

## Glossary

| Term | Meaning |
|---|---|
| Science Program (SP) | A CGIAR Science Program, identified by an `official_code`/`initiativeCode` like `SP01` (same value the sidebar's "MY SCIENCE PROGRAMS" shows). |
| `submitter` | Field on a bilateral center row = the primary Science Program's official code that submitted the result. |
| `program` | Existing URL query-param and `BilateralQueryParams` key already used to filter rows by `submitter`. |
| Results tab | `/bilateral/:centerAcronym/results` — this spec's target screen (`bilateral-results-list.component.ts`). |

## System Context & Scope

### In scope

- A Science Program multiselect in the Results tab's Filters popover.
- An options source for that multiselect (client-side, existing CLARISA initiatives catalog).
- Wiring: selection → `programFilter` signal (already consumed by `filterCenterResults`) → filtered
  rows, chip(s), "Clear all", URL (`?program=...`) round-trip.
- Spec/test updates for `bilateral-results-list.component.spec.ts`.

### Out of scope

- Any change to the `program` URL contract, `BilateralQueryParams`, or `filterCenterResults`
  (`bilateral-query-params.ts`, `bilateral-result-filter.ts`) — they are correct and untouched.
- Any change to the Center Overview, Reporting, or Draft Results tabs.
- A new backend endpoint (only pursued if the client catalog check in Design fails — not expected;
  see `proposal.md` Approach Options).
- Any change to how `submitter` is computed server-side.

## Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Centre user (e.g. Alliance of Biodiversity and CIAT) viewing Results | Can now narrow the results table by Science Program, same as they already can by Project. |
| Other Bilateral tabs (Overview/Reporting/Draft Results) | No change — untouched. |

## Functional Requirements

### Required (MUST)

- **`BSF-R-1`** The Results tab's Filters popover MUST show a "Science Program" multiselect control,
  positioned in the popover alongside the existing filters (adjacent to Project, matching the
  `app-pr-filter-multiselect` pattern).
- **`BSF-R-2`** Selecting one or more Science Programs MUST narrow the visible rows to those whose
  `submitter` matches a selected program code, via the existing `programFilter` signal / `program`
  key of `filterCenterResults` — no new predicate logic.
- **`BSF-R-3`** Each selected Science Program MUST render as a removable chip in the existing chip
  strip; removing a chip MUST update the multiselect and the row set consistently.
- **`BSF-R-4`** "Clear all" MUST also clear the Science Program selection (already implemented at the
  `programFilter.set([])` level per `clearAllFilters` — this requirement is the UI-level guarantee
  that the new control observes it).
- **`BSF-R-5`** The selected Science Program(s) MUST serialize to and parse from the `?program=...`
  URL query param on load/share, consistent with existing `project` behavior (already implemented by
  `bilateral-query-params.ts` — this requirement is the UI-level guarantee that `syncUrlParams()`
  and initial hydration cover the new control).

#### Scenario: Filtering by one Science Program

- GIVEN the Results tab is showing rows from multiple Science Programs (e.g. `SP01`, `SP02`)
- WHEN the user opens Filters and selects `SP01` in the Science Program multiselect
- THEN only rows whose `submitter` is `SP01` remain visible
- AND a "SP01" chip appears in the chip strip
- AND the URL updates to include `?program=SP01`

#### Scenario: Removing the filter via chip

- GIVEN a Science Program filter is active (from the scenario above)
- WHEN the user removes the "SP01" chip
- THEN the full applicable row set (per any other active filters) is restored
- AND the Science Program multiselect shows no selection
- AND `program` is removed from the URL
- BUT other active filters (e.g. `project`) MUST NOT be affected

#### Scenario: Deep link with a Science Program preselected

- GIVEN a URL `?program=SP02` is opened directly
- WHEN the Results tab loads
- THEN the Science Program multiselect shows `SP02` preselected
- AND the table is pre-filtered to `SP02` rows
- AND IT MUST behave identically to a URL carrying `?project=<id>` on load (same hydration path)

#### Scenario: No Science Program options available

- GIVEN the Science Program catalog has not finished loading (or returned empty)
- WHEN the user opens Filters
- THEN the Science Program control MUST render (not throw/blank the popover) with no or a loading
  set of options
- BUT it must NOT block or delay rendering of the other filters in the same popover

### Should (SHOULD)

- **`BSF-R-10`** Science Program options SHOULD be sourced from a real catalog (not only the codes
  present in currently-loaded rows), so a program with zero rows on the current page/phase is still
  selectable — same rule the Project filter followed (`PMF-*` pivot).

## Non-Functional Requirements

- **Consistency:** the new control MUST reuse `app-pr-filter-multiselect` and the existing chip/Clear
  all mechanics verbatim — no new UI pattern introduced (`docs/ux-ui/design.md` component reuse rule).
- **No regression:** existing filters (Project, Source, Created by, Center role, Status, search) and
  their specs MUST remain green.
- **Coverage:** client Jest thresholds (50/60/60/60) MUST NOT drop.

### Defect classes and their gates

| Defect class | Catching command / check |
|---|---|
| Wrong predicate wiring (selecting a program doesn't filter rows) | `bilateral-results-list.component.spec.ts` new assertions (Jest) |
| Chip/Clear-all desync with the new control | Same spec file, chip-removal and Clear-all scenarios |
| URL round-trip broken (param not read/written) | Same spec file, hydration + `syncUrlParams()` scenarios |
| Catalog/options source returns wrong or mismatched codes (e.g. doesn't match `submitter` format) | **No automated check** — this is a real-data question. Verified manually in Design (already checked below: `official_code`/`initiativeCode` format `SPxx` matches `submitter` fixtures) and MUST be re-confirmed against a real API response before marking the task done (manual check at task verification, not unit-testable against a mock) |
| Visual placement/spacing in the popover looks wrong | No automated check (no visual regression tooling in this repo) — manual browser check per task done-criteria, following the existing Project filter's placement as the reference |

## Requirement ID Index

| ID | Summary |
|---|---|
| `BSF-R-1` | Science Program multiselect shown in Filters popover |
| `BSF-R-2` | Selection narrows rows via existing `programFilter`/predicate |
| `BSF-R-3` | Removable chip per selected program |
| `BSF-R-4` | Clear all clears Science Program too |
| `BSF-R-5` | URL round-trip via `?program=` |
| `BSF-R-10` | Options from a real catalog, not only loaded rows |
