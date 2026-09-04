# Requirements — Filter the programme Results tab by Created by

**One line:** the Results tab Filter popover MUST offer a single-select **Created by** dimension that narrows the table to the person shown in the Created by column.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `result-framework-reporting/programme-results-created-by-filter` · Prefix `CBF` |
| Type | **Change** · Depth **Lite** |
| Approval Mode | `gated` (no `proposal.md`; each phase waits) |
| Date | 2026-09-03 |
| Status | `approved` (Phases 1–3, 2026-09-03) |
| Ticket(s) | none |
| Depends on | none · Parallel-safe: yes |

## 2. Context

On `entity-details/:entityId/results` the **Created by** column already shows `create_first_name` + `create_last_name` (e.g. Angel Jarrin). The Filter popover can narrow by phase, status, category, funding source, and center — not by that person. Submitters and programme leads who want “only my rows” or “only Angel’s rows” must scan the table.

This extends the Results tab filter surface shipped by `changes/sp-overview-echarts/results-tab-filter-deeplink` (`RFD-R-3` Center). Same clientside AND-of-dimensions model; no new API.

Cites: `docs/prd.md` G1 (find and complete reported work) · `US-P1` (phase-aware progress) · `docs/ux-ui/design.md` §2 Results Framework Reporting · `docs/trd/trd.md` results list payload (`GET …/roles/filter`, already carries `create_*_name`).

## 3. In Scope / Out of Scope

### In scope

- One single-select **Created by** control in the Results tab Filter popover.
- Options = distinct non-empty Created by values already on the loaded rows.
- Chip, Filter badge, Clear (chip × and Clear all), and URL hydrate/mirror for that dimension.

### Out of scope

- Results Center list (`results-list`) and its **Created by me** toggle.
- Multi-select, “Created by me” shortcut, server-side filter, new endpoint or payload field.
- Result-detail ⓘ **Created by** (still pending a name on `GET /api/results/get/:id`).
- Changing the Created by column, Columns picker, or CSV export.

## 4. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter | Can isolate results they (or a colleague) created on the programme Results tab. |
| QA reviewer / PMU lead | Can review one author’s queue without scanning the Created by column. |
| Platform admin / bilateral consumer | No change. |

## 5. User Stories

- **`CBF-US-1`** As a programme user on the Results tab, I want to filter by Created by, so that I only see results one person created. (Refines `US-P1`.)

## 6. Functional Requirements

### Required (MUST)

- **`CBF-R-1` Created by filter.** The Filter popover MUST offer a single-select Created by control. Options MUST be the distinct non-empty Created by values of the loaded rows, spelled exactly as the Created by column. Selecting a value MUST leave only rows whose Created by matches that value (case-insensitive), AND-combined with every other active dimension.

#### Scenario: Filter by a person who has rows

- GIVEN the Results tab for SP01 with rows created by Angel Jarrin, Santiago Sanchez, and at least one row with an empty Created by
- WHEN the user opens Filter and selects **Angel Jarrin**
- THEN the table shows only Angel Jarrin’s rows
- AND the status summary recounts over that subset (status pills still ignore the status dimension itself)
- BUT it must NOT offer a blank / empty option
- AND IT MUST use the same filter-select control family as Status / Center (`app-pr-filter-select`), never `custom-fields/pr-select`

#### Scenario: Combine with another dimension

- GIVEN Angel Jarrin has both Editing and Submitted rows
- WHEN the user selects Created by **Angel Jarrin** and Status **Submitted**
- THEN only Angel Jarrin’s Submitted rows remain
- BUT it must NOT drop the Status chip or the Created by chip

- **`CBF-R-2` Chip, badge, and clear.** An active Created by value MUST appear as a chip `Created by: {name}`, count toward the Filter button badge, clear from that chip’s ×, and clear with **Clear all** (phase default restored as today; Created by returns to unfiltered).

#### Scenario: Chip and Clear all

- GIVEN Created by is Angel Jarrin and Status is Submitted
- WHEN the user clicks × on **Created by: Angel Jarrin**
- THEN the Created by dimension is unfiltered, the Status filter stays, and the table widens accordingly
- AND **Clear all** then removes Status as well (and any other non-phase chips)
- BUT it must NOT remove the Phase chip’s default phase
- AND IT MUST update the Filter badge so it equals the number of active chips after each clear

- **`CBF-R-3` URL hydrate and mirror.** The Created by dimension MUST read from and write to a dedicated query param (plain name, single string, optional), using the same replace+merge bridge as `status` / `center` (`RFD-R-1`, `RFD-R-2`).

#### Scenario: Deep link and copy link

- GIVEN `…/entity-details/SP01/results?phase=Reporting%202026&createdBy=Angel%20Jarrin`
- WHEN the tab renders and rows load
- THEN the list is filtered to Angel Jarrin, the chip shows, and the dropdown shows that value
- AND changing or clearing the control updates the address bar without a new history entry
- BUT it must NOT alter `phase`, `reviewResult`, `reviewResultId`, `status`, `category`, `origin`, or `center`
- AND IT MUST apply an unknown name as-is (chip + “No results match these filters.”) rather than drop it

#### Scenario: No createdBy param

- GIVEN `…/results` with no `createdBy` query param
- WHEN the tab renders
- THEN Created by is unfiltered and today’s no-param behavior is unchanged

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new network call. Filter stays clientside over the rows already held (`PROGRAMME_RESULTS_PAGE_LIMIT`). |
| Backwards compatibility | No-`createdBy` URL and today’s five dimensions behave as now. |
| Accessibility | New control MUST be keyboard-operable and named “Created by” / “Filter by created by” (WCAG 2.1 AA, `docs/ux-ui/design.md` §10). |
| Internationalization | New strings MAY match the existing hardcoded English toolbar (Status, Center) — do not invent an i18n path this surface does not use. |
| Security | No new auth surface. Do not log tokens. Created by is already on the row. |
| Purity | Filter service stays router-free; URL I/O stays in the Results tab component. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `CBF-AC-1` | Loaded rows with two distinct Created by names and one blank | User selects one name | Only that person’s rows remain; blank-name rows are hidden. |
| `CBF-AC-2` | Created by + Status both set | User clears the Created by chip | Status remains; table and badge update. |
| `CBF-AC-3` | URL contains `createdBy=Angel%20Jarrin` | Tab loads | Filter, chip, and dropdown match; `replaceUrl` + `merge` on later changes. |
| `CBF-AC-4` | URL contains `createdBy=Nobody` | Rows load | Chip stays; empty-filter state; no throw. |

Project ACs that still apply and are not restated: `AC-3` (authorization unchanged) · `AC-4` (no payload change) · `AC-9` (no secrets).

## 9. Defect Classes → Gates

| Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|
| Predicate matches the wrong person or ignores the dimension | Scoped Jest on `matchesProgrammeResultFilters` / `filterRows` | A fixture with two authors where selecting A still returns B’s row |
| Options list includes blanks or omits a present name | Scoped Jest on the Created by options builder | Removing the non-empty guard, or dropping a unique name from the distinct set |
| Chip / badge / Clear all miss the new dimension | Scoped Jest on `activeChips` / `clearChip` / `clearAll` | `clearAll` leaving `selectedCreatedBy` set |
| URL hydrate/mirror wrong key, push instead of replace, or loop | Scoped Jest on hydrate/mirror (`router.navigate` args, navigate count after hydrate) | Mapping `createdBy` onto `center`, or omitting `replaceUrl: true` |
| Wrong filter control (`pr-select` → false mandatory) | **Human diff check at HITL** — template uses `app-pr-filter-select` | — (cheap to eyeball; no automated CSS-class gate) |
| Popover overflow / misaligned Created by row | jsdom cannot measure layout — **live browser check at HITL** (Orca tab, Filter open) | — (accepted substitute; T6 if a screenshot is attached) |

## 10. Dependencies & Assumptions

### Upstream

- Rows already expose Created by as the same display string as the column (`create_first_name` + `create_last_name`).
- Existing Filter popover, chips, badge, and `PROGRAMME_RESULTS_QUERY_PARAM_MAP` hydrate/mirror.

### Downstream

- None. Overview deep links do not need to send `createdBy` in this spec.

### Assumptions

- Single-select is enough (same as Center / Status). Multi-select and “Created by me” are deferred.
- Matching the **display name** is correct; two people with the identical first+last name are indistinguishable, as they already are in the column.

## 11. Open Questions

None that block design. Locked for Lite:

| # | Decision |
|---|---|
| Single vs multi | Single-select |
| Match key | Created by column string, case-insensitive |
| URL | Yes — dedicated optional param, RFD bridge |
| Placement | Filter popover, after Contributing Center, before Section (Coming soon) |

## 12. Requirement ID Index

| ID | Summary | Scenario(s) | Covered by |
|---|---|---|---|
| `CBF-R-1` | Created by filter | Filter by a person · Combine with another dimension | `CBF-T-1` + `CBF-T-2` |
| `CBF-R-2` | Chip, badge, clear | Chip and Clear all | `CBF-T-1` + `CBF-T-2` |
| `CBF-R-3` | URL hydrate and mirror | Deep link and copy link · No createdBy param | `CBF-T-2` |

## Required cross-references

- `docs/prd.md` — G1, `US-P1`, `AC-3`, `AC-4`, `AC-9`
- `docs/ux-ui/design.md` — §2 Results Framework Reporting · §10 a11y
- `docs/trd/trd.md` — results list / `GET …/roles/filter` (no new endpoint)
- Archived sibling: `docs/specs/archive/2026-08-27-changes--sp-overview-echarts/results-tab-filter-deeplink/` (`RFD-R-1`…`R-3`)
- Surface guide: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/CLAUDE.md`
