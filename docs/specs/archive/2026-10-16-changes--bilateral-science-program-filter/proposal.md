# Proposal — Bilateral Results: Science Program filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-science-program-filter` |
| Type | Change |
| Approval Mode | gated |
| Author | Santiago Sanchez (via AKILI) |
| Date | 2026-09-24 |
| Requirement Source | User-supplied screenshot + verbal ask, no Jira ticket |
| Related module notes | `docs/architecture/modules/client-bilateral.md`, `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` |

## Intent

Add a **Science Program** filter control to the Filters popover on the Bilateral centre's Results
tab (`/bilateral/:centerAcronym/results`), so a centre user can narrow the results table to the
rows submitted under one or more Science Programs — the same way they can already filter by
Project, Source, Created by, and Center role.

## Problem / Current Behavior

The Filters popover on this screen currently shows: **Phase, Source, Project, Created by, Center
role** (see screenshot). There is no Science Program filter, even though:

- The underlying **query-param contract already has a `program` key** (`BILATERAL_PROGRAM_QUERY_PARAM`,
  `bilateral-query-params.ts`), parsed into `BilateralQueryParams.program: string[]`.
- The **row predicate already filters on it**: `filterCenterResults` in `bilateral-result-filter.ts`
  matches `programCodes` against `row.submitter` (the primary Science Program's official code,
  e.g. `SP01`).
- The Results-tab component (`bilateral-results-list.component.ts`) already has a `programFilter`
  signal, already reads/writes it from the URL (`params.program`), and already threads it into the
  filter call (`program: this.programFilter()`, lines ~293/430/783/958).

**What's missing is only the UI**: no options source, no control in the Filters popover, no chip,
no `onProgramFilterChange`/`removeProgramFilter` handlers. The Results tab is the one Bilateral tab
where this dimension is invisible to the user — the Center Overview tab (`COV-*` spec) already
exercises `program` end-to-end via its own UI.

## Proposed Outcome

The Results tab's Filters popover gains a **Science Program** multiselect, positioned consistently
with the existing filters (the just-shipped `Project` multiselect is the closest precedent — same
popover, same `app-pr-filter-multiselect` component, same chip-plus-"Clear all" pattern). Selecting
one or more programs narrows the table to rows whose `submitter` matches a selected program code;
clearing it (or "Clear all") returns to the full set. The filter round-trips through the URL exactly
like `project` does today (`?program=SP01,SP04`), so links stay shareable/bookmarkable.

## Scope

- Add a Science Program options source for the Results tab (see Approach Options — reuse vs. new
  catalog call).
- Add the Science Program multiselect control to the Filters popover template, wired to the
  existing `programFilter` signal.
- Add `onProgramFilterChange` / `removeProgramFilter` handlers mirroring `onProjectFilterChange` /
  `removeProjectFilter`.
- Add a filter chip for selected Science Programs (same chip strip as Project/Created by/Status).
- Update `bilateral-results-list.component.spec.ts` for the new control (selection → row narrowing,
  chip removal, Clear all, URL round-trip).

## Non-Goals

- No change to the `program` URL contract, `BilateralQueryParams`, or `filterCenterResults` —
  they already support this; this change is UI-only plumbing on top of an existing contract.
- No change to the Center Overview tab's existing Science Program control (if any) or to the
  Reporting / Draft Results tabs' filter panels.
- No change to how `submitter` is computed/resolved server-side.
- No new backend endpoint unless Approach Option B is selected (see below).

## Affected Users, Systems, And Specs

- **Users:** Centre users viewing `/bilateral/:centerAcronym/results` who work with results across
  multiple Science Programs (e.g. a multi-SP alliance centre, matching the screenshot's "Biodiversity
  (Alliance)" context and its "MY SCIENCE PROGRAMS" / "OTHER SCIENCE PROGRAMS" sidebar).
- **Code:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts`
  - Possibly `onecgiar-pr-client/src/app/pages/bilateral/services/` (new/reused options source) and
    `onecgiar-pr-client/src/app/shared/services/global/initiatives.service.ts` (if reused).
- **Specs:** this change sits alongside `bilateral/center-overview-tab` (`COV-*`, owns the shared
  `program` contract) and mirrors the pattern from `changes/project-multiselect-filter` (`PMF-*`).
  Neither of those specs needs edits — this is additive.

## Visual Reference

- Source: None (screenshot shows current state, not a target design)
- Location: n/a
- Notes: no new visual pattern — this reuses the existing Filters popover layout and the
  `app-pr-filter-multiselect` component already used for Project/Created by in the same popover, so
  no mockup is needed.

## Requirement Delta Preview

### ADDED Requirements

- The Results tab's Filters popover exposes a Science Program multiselect.
- Selecting Science Program(s) narrows the results table via the existing `program` predicate.
- A chip appears per selected Science Program with individual removal; "Clear all" clears it too.
- The selection round-trips through `?program=...` on the URL, consistent with `project`.

### MODIFIED Requirements

- None — no existing behavior changes; this only adds a UI surface for state that already exists.

### REMOVED Requirements

- None.

## Approach Options

### Option A — Reuse the CLARISA initiatives catalog already loaded client-side (recommended)

Source the Science Program option list from `InitiativesService` (`shared/services/global/`),
which already loads CLARISA initiatives/programs app-wide, filtered/mapped to the codes that can
appear in `row.submitter`. No new server endpoint.

- **Pros:** No backend work; matches the "options from a real catalog, not from loaded rows" rule
  the Project filter spec (`PMF-*`) already established (avoids the same pivot bug: a centre's rows
  may under-represent Science Programs the centre still needs to filter by, or a program with zero
  rows in the current page would never appear as an option if sourced from rows).
  Also consistent with the sidebar's own "MY SCIENCE PROGRAMS" / "OTHER SCIENCE PROGRAMS" lists,
  which likely already come from the same catalog.
- **Cons:** Needs to confirm the catalog's code field matches `row.submitter`'s code format exactly
  (both should be the CLARISA official code, e.g. `SP01`) — a mapping mismatch would silently show
  0 rows for a selected program. This must be verified in `/akili-specify` against real data, not
  assumed.

### Option B — New dedicated endpoint, `GET /api/bilateral/center/programs` (mirrors `PMF-DD-5`)

Mirror the Project filter's approach exactly: a center-scoped, optionally year-scoped endpoint that
returns only the Science Programs relevant to this centre, server-computed.

- **Pros:** Guaranteed correctness — the option list is exactly what the centre can see, computed
  the same way `submitter` is computed server-side. Matches the `PMF-*` precedent 1:1.
- **Cons:** New backend work (server module change), larger surface than the ask requires. Only
  justified if Option A's catalog turns out not to align with `row.submitter` codes, or if "my
  Science Programs at this centre" differs from "all CLARISA programs."

### Recommendation

Start with **Option A** during `/akili-specify`: check whether `InitiativesService`'s data already
carries the exact codes used in `row.submitter` for this centre's rows. If it does, Option A ships
as a pure client-side change — smallest safe path. If the codes don't line up cleanly (e.g. the
catalog isn't centre-scoped, or code formats differ), fall back to Option B, which has a working
precedent to copy (`PMF-DD-5`, `BilateralProjectsService.getProjectsByCenter`).

## Risks, Dependencies, And Open Questions

- **Open question:** does `InitiativesService`'s catalog expose the same code format as
  `row.submitter`, and is it centre-scoped the way the sidebar's "MY SCIENCE PROGRAMS" list is?
  Needs a quick real-data check in `/akili-specify` before locking Option A.
- **Open question:** should the multiselect only offer Science Programs the centre actually
  participates in (parity with the Project filter's centre-scoping, `PMF-*`), or the full CLARISA
  catalog? Recommend centre-scoped, for consistency with Project and with the sidebar.
- **Dependency:** the `program` contract, `filterCenterResults`, and `programFilter` signal already
  exist and are stable (owned by `COV-*`) — this change only consumes them, so there is no contract
  risk, only an options-source risk (above).
- **Risk:** low. This is additive UI on a shipped, tested contract; the closest precedent
  (`changes/project-multiselect-filter`) landed cleanly with the same shape.

## Success Criteria

- The Filters popover on `/bilateral/:centerAcronym/results` shows a Science Program multiselect.
- Selecting a Science Program narrows the visible rows to those whose `submitter` matches.
- A removable chip appears per selection; "Clear all" also clears Science Program.
- `?program=<code>[,<code>...]` round-trips on reload/share, matching `project`'s behavior.
- `bilateral-results-list.component.spec.ts` covers selection, chip removal, Clear all, and URL
  round-trip for the new control; existing specs stay green.

## Next Step

```text
/akili-specify changes/bilateral-science-program-filter
```
