# Proposal — Project Multiselect Filter for Bilateral Results

> **Amendment (Pivot, 2026-09-18):** Sections 5, 9, 10, 11 and 13 below described options derived from loaded result rows. That source was superseded after live-data verification and user feedback: options now come from the center's own bilateral project catalog, phase-scoped (`execution.md` Pivot Record). This file is kept as the original intent record; `requirements.md` / `design.md` / `tasks.md` are the current authority.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-multiselect-filter` |
| Slug | `project-multiselect-filter` |
| Type | Change |
| Approval Mode | gated |
| Parent Spec | none |
| Requirement Source | Direct user request and screenshot of `/bilateral/AfricaRice/results` |
| Date | 2026-09-18 |
| Depends on | none |
| Parallel-safe | yes |

## 2. Intent

Let Center users narrow the bilateral Results table to one or more projects from the existing Filters popover, using the same compact multiselect pattern already used for **Created by**.

## 3. Problem / Current Behavior

The Results table displays a **Project** column and already supports project filtering through deep links, active chips, and the shared client-side predicate. However, the Filters popover has no Project control, so users cannot discover or change this filter in the UI.

The existing contract is partially complete:

- `projectFilter` stores multiple numeric project IDs.
- `project=<id,id>` round-trips through the URL.
- Selected projects use OR semantics; other filter dimensions combine with AND semantics.
- Project chips can be removed individually or through **Clear all**.
- Each loaded row already provides `project_id` and `project_name`.

## 4. Proposed Outcome

Add a searchable **Project** multiselect to the Filters popover. Its options come from the distinct projects represented by the loaded result rows. Selecting projects immediately filters the table, updates the URL and active chips, and does not trigger another results request.

The filter matches the project shown in the table's **Project** column. Filtering by every historical project relation attached to a result is outside this bounded change.

## 5. Scope

- Add a computed, deduplicated, alphabetically sorted project option list to `BilateralResultsListComponent`.
- Preserve selected project IDs from a deep link even when their labels are absent from the currently loaded rows.
- Add a project selection handler that normalizes wire IDs to numbers and synchronizes the existing URL contract.
- Add the existing `app-pr-filter-multiselect` control to the current Filters popover.
- Extend the component's existing Jest coverage for options, selection, URL synchronization, and request stability.
- Re-stamp the local `bilateral-results-list/CLAUDE.md` guide in the implementation commit, as required by the folder documentation convention.

## 6. Non-Goals

- No server endpoint, DTO, SQL, database, or bilateral payload-contract change.
- No additional project catalog request.
- No change to how the server chooses the preferred/lead project displayed per result.
- No filtering against every active project relation attached to a result.
- No redesign of the surrounding filter popover or other filter dimensions.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Center result submitters and reviewers | Can filter the bilateral Results table by multiple displayed projects. |
| Angular client | Small change in `pages/bilateral/pages/bilateral-results-list/`. |
| URL contract | Uses the already-shipped comma-separated `project` query parameter without changing its shape. |
| Server/API | No change; filtering remains client-side over authorized rows already loaded for the Center and phases. |
| Related spec | Extends the archived `changes/sp-overview-echarts/results-tab-filter-deeplink` pattern and the existing `bilateral/center-overview-tab` implementation contract. |

Project-level references: `docs/prd.md` G4/M4.2 and the bilateral reporting scope in §5; `docs/ux-ui/design.md` §6 Listing screens, §8 Component Inventory, and §10 Accessibility; `docs/trd/trd.md` §6 Frontend Architecture & State Boundaries.

## 8. Visual Reference

- Source: User-provided screenshot plus existing in-repo filter pattern.
- Location: `/bilateral/AfricaRice/results`; `bilateral-results-list.component.html` Created-by multiselect.
- Notes: Place **Project** in the open Filters popover and reuse `app-pr-filter-multiselect`; no new visual pattern or token is required.

## 9. Requirement Delta Preview

### ADDED Requirements

- The Filters popover exposes a searchable Project multiselect.
- Options represent distinct non-null projects in the loaded rows, sorted by project label.
- Selecting multiple projects shows rows matching any selected project.
- Project selection updates the existing `project` URL query parameter and active filter chips immediately.
- A deep-linked project ID missing from loaded rows remains selected and removable with a fallback label.

### MODIFIED Requirements

- Project filtering changes from deep-link-only capability to a discoverable UI capability.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Derive options from loaded result rows (Recommended)** | Dedupe `project_id`/`project_name` from `results()`, retain missing selected IDs, and reuse the existing multiselect and filter contract. | Smallest change; only projects represented in the selected phases are offered. |
| B — Load the Center project catalog | Call the existing projects endpoint and offer every active Center project. | Adds loading/error state and another request; the catalog is active-year scoped and can mismatch historical phases. |
| C — Add server-side project filtering | Send selected IDs to the results endpoint and filter in SQL. | Unnecessary contract and query complexity because all rows are already loaded and filtered client-side. |

## 11. Recommended Approach

Use Option A. It completes the existing client contract without widening scope: the page already has multivalue project state, URL parsing/serialization, OR matching, chips, and clear behavior. The implementation only needs to expose that capability through the existing control.

Project options should be derived from the unfiltered `results()` collection so selecting one project does not remove the other choices. Wire IDs must be normalized with `Number(...)`, matching the page's documented string-ID handling. URL-selected IDs absent from loaded rows should remain available as `Project <id>` so deep links never become impossible to clear.

## 12. Risks, Dependencies, And Open Questions

| Item | Treatment |
|---|---|
| Project IDs may arrive as strings despite numeric TypeScript types | Normalize IDs before deduplication, comparison, and URL synchronization. |
| Selected phases may contain the same project more than once | Dedupe by normalized project ID and sort labels case-insensitively. |
| A deep-linked ID may not exist in the loaded phase rows | Preserve it with the existing `Project <id>` fallback. |
| Users may interpret Project as any linked project | Keep the filter aligned with the visible Project column; any-linked semantics require a separate proposal and API payload decision. |
| Jira ticket | None supplied; it can be linked during specification without changing scope. |

No blocking dependency or open question remains for the bounded displayed-project behavior.

## 13. Success Criteria

1. The Filters popover shows a searchable Project multiselect populated from distinct projects in the loaded rows.
2. Selecting two projects displays results belonging to either project while preserving AND behavior with phase, source, role, creator, status, and search filters.
3. The URL contains one comma-separated `project` value, active project chips render, and chip removal/Clear all remain synchronized.
4. Project selection performs no additional results or catalog HTTP request.
5. Existing no-filter and deep-link behavior remains unchanged; focused Jest tests and client lint pass.
6. The control remains keyboard accessible and uses the existing design-system component with no new hardcoded token.

## 14. Next Step

```text
/akili-specify changes/project-multiselect-filter
```
