# Programme Results — Phase / Status / Created by multiselect — `requirements.md`

## Document Control

| Field | Value |
|---|---|
| **Module** | `result-framework-reporting` |
| **Sub-feature** | Programme Results tab — Filters popover |
| **Prefix** | `PRM` |
| **Status** | `draft` |
| **Depth** | Standard (client-only; patterned on MWB-T-13) |
| **Approval Mode** | gated |
| **Ticket(s)** | none provided |

---

## Executive Summary

On the Science Programme **Results** tab, the Filters popover still renders **Phase**, **Status**, and **Created by** as single-select dropdowns while **Category**, **Funding source**, **Contributing center**, and **Section** are already multiselect. Portfolio leads need to combine multiple phases, statuses, or creators in one view (e.g. "Editing + Submitted" across two reporting cycles) without clearing and re-applying filters repeatedly.

This spec converts the three remaining dimensions to **multiselect**, reusing the shared filter infrastructure (`parseListParam`, `joinListParam`, `app-pr-filter-multiselect`, OR-within / AND-across semantics) already shipped for Category / Origin / Center in MWB-T-13. No server or API change.

---

## Glossary

| Term | Meaning |
|---|---|
| **Dimension** | One filter axis (phase, status, createdBy, …) |
| **OR within** | A row matches if it satisfies **any** selected value in that dimension |
| **AND across** | A row must satisfy **every** dimension that has at least one selected value |
| **`defaultPhase()`** | Programme Results' auto-derived phase when the URL carries no explicit `?phase=` (see `bugfix/phase-filter-missing-phases-prod`) |
| **`ProgrammeResultsFilterService`** | Shared filter state for Results tab **and** My Work board |

---

## System Context & Scope

### Context

- **Screen:** `entity-details/:entityId/results` — `ProgrammeResultsComponent` Filters popover (`programme-results.component.html`).
- **Reference pattern:** MWB-T-13 (Category / Funding source / Center multiselect + comma URL lists).
- **PRD alignment:** Supports portfolio leads aggregating programme results (**G1** reporting completeness) and PMU-style cross-cutting review without leaving the Results tab.
- **UX:** Matches the multiselect checkbox controls already visible for Category and Section in the same popover; no new visual pattern.

### In scope

- Multiselect UI for **Phase**, **Status**, **Created by** on the Results tab Filters popover
- Shared filter service state, predicates, chips, and per-value `clearChip` for all three dimensions
- URL hydrate / mirror for `?phase=`, `?status=`, `?createdBy=` as comma-separated lists (single legacy values still valid)
- Status counter pills: toggle membership in the status multiselect (not exclusive single-select)
- **My Work board** parity — it injects the same `ProgrammeResultsFilterService` and the same query-param bridge
- Unit tests for filter predicates, URL bridge, chips, status pills, and backward-compatible deep links

### Out of scope

- Overview / Reporting tab filters
- Server-side filtering or new API query params
- Changing Category / Origin / Center / Section behavior
- Replacing `app-pr-filter-multiselect` with another control
- Full Cypress E2E (local Jest only per repo gates)

---

## Stakeholders / Personas

| Persona | What changes |
|---|---|
| **PMU / portfolio lead** | Can filter Results by multiple phases or statuses in one pass |
| **Result submitter** | Same on **My Work** when using shared filter dimensions |
| **QA reviewer** | No direct change (read-only consumers of filtered lists elsewhere) |

---

## User Stories

- **PRM-US-1** — As a portfolio lead, I want to select multiple **Status** values in the Results filters, so that I can see Editing and Submitted rows together without switching filters.
- **PRM-US-2** — As a portfolio lead, I want to select multiple **Phase** values, so that I can compare results across reporting cycles on one table.
- **PRM-US-3** — As a portfolio lead, I want to select multiple **Created by** values, so that I can review contributions from several submitters at once.
- **PRM-US-4** — As any user, I want each selected value to appear as its own removable chip and in a shareable URL, consistent with Category and Center filters.

---

## Functional Requirements

### PRM-R-1 — Phase multiselect control

The system **SHALL** render **Phase** in the Filters popover using `app-pr-filter-multiselect` (not `app-pr-filter-select`), with options from `phaseSelectOptions()` and live apply on change (no Apply button).

#### Scenario: Select two phases

- **GIVEN** the Results tab is loaded for a programme with rows in phases "Reporting 2026 - P25" and "Reporting 2024"
- **WHEN** the user selects both phases in the Phase multiselect
- **THEN** the table shows rows whose phase matches **either** selected phase
- **AND** two chips appear: `Phase: Reporting 2026 - P25` and `Phase: Reporting 2024`
- **AND IT MUST** use OR semantics within the phase dimension only

### PRM-R-2 — Status multiselect control

The system **SHALL** render **Status** as `app-pr-filter-multiselect` with options from `statusSelectOptions()`.

#### Scenario: Multiple statuses

- **GIVEN** rows with statuses Editing, Submitted, and Quality assessed
- **WHEN** the user selects Editing and Submitted
- **THEN** Quality assessed rows are hidden
- **AND** rows in Editing **or** Submitted remain visible

#### Scenario: Status counter pills with multiselect

- **GIVEN** status counter pills above the table
- **WHEN** the user clicks the "Submitted" pill
- **THEN** "Submitted" is added to the active status selection (or removed if already selected)
- **AND** multiple pills may appear active simultaneously
- **AND** status counts **SHALL** still be computed with `{ ignoreStatus: true }` so counts stay meaningful while filtering

### PRM-R-3 — Created by multiselect control

The system **SHALL** render **Created by** as `app-pr-filter-multiselect` with options from `createdBySelectOptions()`.

#### Scenario: Two creators

- **GIVEN** rows created by "Alice" and "Bob"
- **WHEN** both creators are selected
- **THEN** rows created by Alice **or** Bob are shown

### PRM-R-4 — Shared filter semantics

The system **SHALL** store Phase, Status, and Created by as `string[]` on `ProgrammeResultsFilterService`, with `[]` meaning "no filter on this dimension" (show all values for that axis).

- **AND** filtering **SHALL** use OR within each dimension and AND across dimensions (same as MWB-T-13).
- **BUT** Phase **MUST NOT** use the `'all'` sentinel from `app-pr-filter-select`; empty selection is `[]`.

### PRM-R-5 — URL contract (comma-separated lists)

The system **SHALL** encode active selections in query params as comma-separated lists:

| Param | Example |
|---|---|
| `phase` | `?phase=Reporting+2026+-+P25,Reporting+2024` |
| `status` | `?status=Editing,Submitted` |
| `createdBy` | `?createdBy=Alice+Smith,Bob+Jones` |

#### Scenario: Legacy single-value deep link

- **GIVEN** a URL with `?status=Submitted` (single value, no comma)
- **WHEN** the Results tab loads
- **THEN** `selectedStatuses` hydrates as `['Submitted']`
- **AND** filtering behaves identically to before the change

#### Scenario: Empty dimension drops param

- **GIVEN** the user clears all status selections
- **WHEN** the filter mirror runs
- **THEN** `status` is removed from the URL (`null` under `queryParamsHandling: 'merge'`)
- **BUT IT MUST NOT** leave `?status=` with an empty string

### PRM-R-6 — Phase default and Clear filters (preserved behavior)

The system **SHALL** preserve the phase behaviors introduced by `bugfix/phase-filter-missing-phases-prod` and `quick/filters-clear-button-everywhere`:

#### Scenario: Initial load without `?phase=`

- **GIVEN** no explicit `?phase=` in the URL and row loading has completed
- **WHEN** the URL → filters effect runs
- **THEN** phase selection initializes to `[defaultPhase()]` (one-element array), not `[]`
- **BUT IT MUST NOT** commit `defaultPhase()` while `data.loading()` is still true

#### Scenario: External Clear filters button

- **GIVEN** multiple filters including phase
- **WHEN** the user clicks **Clear filters** (toolbar button)
- **THEN** search, status, category, origin, center, section, and created-by selections reset
- **AND** phase resets to `[defaultPhase()]` (not all phases)
- **AND** `hasClearableFilters` **SHALL** still ignore the phase chip (phase alone does not show Clear filters)

#### Scenario: Remove one phase chip

- **GIVEN** phases `[A, B]` selected
- **WHEN** the user removes chip `Phase: B`
- **THEN** selection becomes `[A]` only
- **WHEN** the user removes the last phase chip and selection would become `[]`
- **THEN** selection **SHALL** fall back to `[defaultPhase()]`

### PRM-R-7 — Chips and per-value removal

The system **SHALL** emit **one chip per selected value** for phase, status, and created-by (matching category/origin/center).

- **WHEN** the user removes one chip
- **THEN** only that value is removed from the dimension's array
- **AND IT MUST NOT** clear other values in the same dimension

### PRM-R-8 — My Work board parity

The system **SHALL** apply the same three multiselect controls and URL semantics on **My Work** (`my-work-board.component`), which shares `ProgrammeResultsFilterService`.

- **BUT IT MUST NOT** change My Work–specific phase mirroring from `effectivePhase()` beyond what is required to read/write array state.

### PRM-R-9 — No custom-fields in filter strip

Filter controls **SHALL** remain `app-pr-filter-multiselect` / `app-pr-filter-select` only — never `custom-fields` primitives (green-check DOM scan rule, `programme-results/CLAUDE.md`).

---

## Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Client-side filter over existing row payload; no new HTTP |
| **Accessibility** | Multiselects inherit `app-pr-filter-multiselect` keyboard/focus behavior; **jsdom Jest cannot verify focus order** — manual keyboard check at HITL |
| **Backwards compatibility** | Single-value `?phase=`, `?status=`, `?createdBy=` URLs keep working |
| **Tests** | Scoped Jest only (`programme-results-filter.service.spec.ts`, `programme-results.component.spec.ts`, `my-work-board.component.spec.ts` + any spec pinning `PROGRAMME_RESULTS_QUERY_PARAM_MAP`) |

### Defect coverage

| Defect class | Gate |
|---|---|
| Wrong OR/AND filter logic | `programme-results-filter.service.spec.ts` predicate cases |
| URL hydrate ↔ mirror loop | `programme-results.component.spec.ts` query-param effects |
| Phase default race on load | Existing + extended tests from `phase-filter-missing-phases-prod` |
| Status pill / multiselect drift | Component spec: pill click adds/removes from array |
| Shared export map drift | Grep `PROGRAMME_RESULTS_QUERY_PARAM_MAP` in `*.spec.ts`; run `dashboard-lab.scope.spec.ts` if map comments change |
| Multiselect a11y / focus | **Accepted gap in Jest** — manual HITL on Filters popover Tab/Escape |

---

## Requirement ID Index

| ID | Summary |
|---|---|
| PRM-R-1 | Phase multiselect |
| PRM-R-2 | Status multiselect + status pills |
| PRM-R-3 | Created by multiselect |
| PRM-R-4 | Array state + OR/AND semantics |
| PRM-R-5 | Comma-separated URL params + legacy single values |
| PRM-R-6 | Phase default + Clear filters retention |
| PRM-R-7 | One chip per value |
| PRM-R-8 | My Work parity |
| PRM-R-9 | No custom-fields in filters |

---

## Open Questions

| ID | Question | Default if unresolved |
|---|---|---|
| PRM-OQ-1 | Should selecting **all** phases explicitly differ from "no phase filter" (`[]`)? | **No** — treat explicit all-selected same as OR over listed options; empty `[]` only after user clears every chip falls back to `[defaultPhase()]`, never "all phases" unless user selects every option manually |

---

## References

- `docs/specs/kaizen/result-framework-reporting--programme-results-created-by-filter.md` — grep shared exports for specs
- `docs/specs/bugfix/phase-filter-missing-phases-prod/` — phase load-order guard
- `docs/specs/quick/quick-log.md` — Clear filters retains phase
- MWB-T-13 (archive) — multiselect pattern for category/origin/center
