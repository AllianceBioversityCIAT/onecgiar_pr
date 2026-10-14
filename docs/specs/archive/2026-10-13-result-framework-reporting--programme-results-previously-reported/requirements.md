# Requirements — Previously reported tag on the SP Results list

> **In one line:** a row whose result was already reported in an earlier phase shows the same **Previously reported** pill the Results Center shows. Nothing else on the list changes.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `result-framework-reporting` · sub-feature `programme-results` (Results tab, `entity-details/:entityId/results`) |
| Module code | `PRP` |
| Type | Change · **Depth: Lite** |
| Status | approved (2026-10-13, gated) · **amended 2026-10-13: PRP-R-5 grouping (OQ-1) added at the user's request after HITL-1. Approved by the user 2026-10-13** |
| Ticket | P2-3953 |
| Proposal | `./proposal.md`, approved 2026-10-13, **Option A (tag only)** |
| Approval Mode | `gated` |
| Related specs | `result-framework-reporting/programme-results-multiselect-filters` (phase multi-select), `changes/results-aow-column-filter` |

## 2. Context

On the Results Center, a result version flagged as replicated already carries a `Previously reported` pill before its title. The tooltip reads *Previously reported in an earlier phase*. The Science Program Results tab lists the same results from the same endpoint, but shows no marker. On that tab, a carried-over innovation looks identical to a new one (ticket P2-3953).

## 3. Scope

| In | Out (ticket / proposal) |
|---|---|
| Pill on the RESULT cell of the SP Results tab | Filter "previously reported / new only" |
| Every result type | New phase column |
| *(Amendment, PRP-R-5)* Rows that share a result code stay together under any sort and are drawn as **one block** | Merging versions into one row; changing counters, filters, paging size, total label, CSV, My results board UI, Results Center |

## 4. Glossary

| Term | Meaning |
|---|---|
| Replicated result | A result **version** whose payload flag `is_replicated` is truthy, meaning it was carried over from an earlier phase. The same flag drives the Results Center pill |
| Pill | The `Previously reported` badge rendered before the title |

## 5. Personas

| Persona | What changes |
|---|---|
| Science Program member / PMU | Can tell carried-over results from new ones on their own Results tab |

## 6. Functional Requirements

### PRP-R-1 — Tag carried-over results

The Results tab SHALL show the pill `Previously reported` before the title of every row whose result version is replicated. The pill SHALL carry the tooltip `Previously reported in an earlier phase`.

#### Scenario PRP-S-1.1: replicated row
- GIVEN the SP09 Results tab with phase `Reporting 2026 · P25`
- AND a row whose result version has `is_replicated = 1`
- WHEN the list renders
- THEN the RESULT cell shows `Previously reported` before the title
- AND hovering the pill shows `Previously reported in an earlier phase`

#### Scenario PRP-S-1.2: new row
- GIVEN a row whose result version has `is_replicated` = `0`, `null` or absent
- WHEN the list renders
- THEN the RESULT cell shows the title only
- BUT it must NOT render the pill, an empty placeholder, or any spacing for it

#### Scenario PRP-S-1.3: any type, any phase
- GIVEN replicated rows of different categories (innovation, knowledge product, capacity sharing)
- AND any selected phase, including an earlier one
- WHEN the list renders
- THEN every replicated row carries the pill, regardless of category or phase
- AND IT MUST be the row's own flag that decides, never the category or the phase name

### PRP-R-2 — Same tag as the Results Center

The pill SHALL be recognisably the Results Center pill: the same wording, the same tooltip, and the same shape, size, weight and colour tokens.

#### Scenario PRP-S-2.1: side-by-side
- GIVEN the same replicated result open on the Results Center and on the SP Results tab
- WHEN the two pills are compared
- THEN the text, the tooltip and the appearance match
- BUT the Results Center markup and styles must NOT be modified (BR5)

### PRP-R-3 — The title gives way, not the tag

#### Scenario PRP-S-3.1: long title
- GIVEN a replicated row whose title overflows the RESULT column
- WHEN the list renders at any column width
- THEN the pill stays fully visible, without shrinking or wrapping
- AND the title truncates with an ellipsis and keeps its native `title` tooltip

### PRP-R-4 — Nothing else on the list changes

#### Scenario PRP-S-4.1: regression
- GIVEN any filter, sort, phase or column selection
- WHEN the pill feature is active
- THEN the columns, column order, sorting (except the group adjacency PRP-R-5 adds), filters, paging, status counters, total label, and CSV export are identical to before
- AND the indicator second line of the RESULT cell is unchanged
- BUT the pill text must NOT become part of the search text or the CSV title value

### PRP-R-5 — Versions of one result read as one block (amendment, OQ-1)

When the list shows more than one row with the same result code (e.g. the 2026 replica and its 2025 original, or a W1/W2 row and its bilateral twin), those rows SHALL appear together and SHALL be drawn as one block. The visual reference is the user's Results Center screenshot (2026-10-13): no divider and tighter spacing between the rows in a group, a divider only between groups, and the code repeated on every line.

#### Scenario PRP-S-5.1: adjacent block
- GIVEN rows 28738 · 2026 P25 (replicated) and 28738 · 2025 P25 in the filtered list
- WHEN the list renders
- THEN the two rows are consecutive, the newest phase first
- AND there is no row divider between them, only above and below the block
- AND each row keeps its own code, pill, title, category, status, owner, phase and row action

#### Scenario PRP-S-5.2: any sort keeps the block
- GIVEN the same pair and the user sorts by any column, ascending or descending (e.g. Status, where the members differ)
- WHEN the list re-sorts
- THEN the members stay consecutive, newest phase first
- AND the block is placed by the value of its **first (newest) member**

#### Scenario PRP-S-5.3: singletons unchanged
- GIVEN a code that appears only once
- WHEN the list renders
- THEN its row looks and sorts exactly as before this amendment

#### Scenario PRP-S-5.4: nothing else changes
- GIVEN grouping is active
- THEN status counters, total label, page size, filters, search and the CSV (rows and their order as today) are unchanged
- AND every other screen that uses `app-pr-table` behaves exactly as before

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| PRP-NFR-1 | Client only. No new request, no server or payload change (the flag already arrives on `get/all/roles/filter`) |
| PRP-NFR-2 | Uses design tokens `--pr-color-primary-100` / `--pr-color-primary-700`. No hard-coded colours beyond the same fallbacks the Results Center uses |
| PRP-NFR-3 | Screen readers read the pill as text before the title (no `aria-hidden`), the same as the Results Center |

## 8. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Flag not mapped, or mapped with the wrong truthiness (`'1'`, `1`, `true`, `0`, `null`) | Jest mapper test on `toProgrammeResultRow` (PRP-TEST-1) |
| Pill shown or hidden on the wrong rows, or with the wrong text or tooltip | Jest template test (PRP-TEST-2) |
| Regression in search, CSV or counters | Existing `programme-results` Jest specs, run scoped |
| **Pill visually different from the Results Center, or squeezed out by a long title** | **No automated check:** jsdom cannot measure layout or colour. Substitute: a **human visual check at the HITL pause** on SP09 against the Results Center (read only, shared prdb; never click write buttons) |

## 9. Requirement ID Index

| ID | Ticket AC | Scenarios |
|---|---|---|
| PRP-R-1 | AC-1, AC-2, AC-5, edge "earlier phase" | S-1.1, S-1.2, S-1.3 |
| PRP-R-2 | AC-3, AC-4, AC-8 | S-2.1 |
| PRP-R-3 | edge "long title" | S-3.1 |
| PRP-R-4 | AC-6, AC-7 | S-4.1 |
| PRP-R-5 | proposal OQ-1 / R-4 (user decision 2026-10-13) | S-5.1, S-5.2, S-5.3, S-5.4 |
