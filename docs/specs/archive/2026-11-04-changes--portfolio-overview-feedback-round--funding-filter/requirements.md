# Requirements — Portfolio Overview: Funding source filter (PFF)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/funding-filter` |
| Parent Spec | `changes/portfolio-overview-feedback-round` (child 2 of 3, point 1) |
| Prefix | `PFF` |
| Depth | **Standard** (client only; one new filter dimension that crosses 4 blocks + URL + link) |
| Type | Change |
| Approval Mode | `gated` |
| Depends on | `cleanup-and-approved` — manifest status `executed (fb4526f9b)`, not `done`; shares page template + service. Warn only |
| Status | approved (2026-11-04) |

## 2. Executive Summary

Add a 6th global filter, **Funding source** (`W1/W2`, `W3/Bilateral`), to the `/portfolio-overview` bar. It narrows every block that reads the page rows, survives a reload through `?funding=`, tells the single-funding blocks (Centers, Projects, ToC KPI) to say "Not affected by: Funding source" when the choice excludes them, and carries `funding=` to Results Center.

## 3. Glossary

| Term | Meaning |
|---|---|
| Funding source | `W3/Bilateral` when the result's funding source name is exactly `W3/Bilaterals`; `W1/W2` otherwise. Same rule the deck already uses |
| Bar | The global filter bar above the deck (Program, Project, Center, Typology, Status today) |
| Page rows | Open-phase results of the page's own request, after the global selection (`filteredRows`) |
| Single-funding block | A block whose data is one funding source by rule: Centers and Projects (W3 only), ToC KPI (W1/W2 only) |
| Not-affected note | The existing line "Not affected by: <dimensions>" a block shows for an active dimension it cannot apply |

## 4. System Context & Scope

**In scope:** filter bar (desktop row + mobile sheet), selection model, row matching, URL mirror, active-filter strip + its Results Center link, not-affected handling in Centers / Projects / ToC KPI, copy, component guide.
**Out of scope:** server (no endpoint, payload or query change), Results Center itself (already reads `funding=w1w2|bilateral|w3`), the deck card click targets, the Centers block's own "View in Results Center" (already `funding=bilateral`), contribution requests (child 3).

## 5. Personas

| Persona | Change |
|---|---|
| PMU / portfolio admin | Can look at only W1/W2 or only W3/Bilateral results across the deck, status, typology and results list, and share that view by URL |

## 6. Functional Requirements

### PFF-R-1 — Funding source control in the bar (MUST)

The bar SHALL offer a **Funding source** multi-select with exactly two options, `W1/W2` and `W3/Bilateral`, placed **last** (after Status), in both the desktop row and the mobile sheet.

- GIVEN the page has figures
- WHEN the admin opens Funding source
- THEN the two options are listed, enabled, with no search box
- AND selecting one adds a chip "W3/Bilateral" (or "W1/W2"), updates the "N of M results" count and the sheet trigger count, and Clear all removes it
- AND IT MUST be available as soon as the rows exist (it never waits for the Project / Center map)
- BUT it must NOT list options derived from the data (no third value, even if a row has an unexpected funding name)

### PFF-R-2 — Rows narrowed by funding source (MUST)

A selected funding source SHALL keep only the page rows of that source; values inside the dimension combine with OR, and the dimension combines with the others with AND (same as today).

- GIVEN open-phase rows with 120 W1/W2 and 288 W3/Bilateral results, no other filter
- WHEN the admin selects `W3/Bilateral`
- THEN the Total card reads 288, the W3/Bilateral card reads 288, the W1/W2 card reads 0
- AND the Status tiles, Typology block and Results detail list (and its Excel export) count only those 288
- AND IT MUST classify with the deck's rule (exact name `W3/Bilaterals` = W3, anything else incl. blank = W1/W2), so the filtered Total equals the unfiltered W3/Bilateral card

#### Scenario: both values
- GIVEN both `W1/W2` and `W3/Bilateral` selected
- THEN every count equals the unfiltered page (but the chips, strip and URL still show the selection)

#### Scenario: combined with Program
- GIVEN Program = SP01 and Funding = W1/W2
- THEN only SP01 rows that are W1/W2 count; a W3 SP01 row is excluded

### PFF-R-3 — URL mirror (MUST)

The funding selection SHALL be mirrored to the URL as `?funding=` with the values `w1w2` and `bilateral` (comma list), like the other dimensions.

- GIVEN the admin opens `/portfolio-overview?funding=bilateral`
- WHEN the rows load
- THEN Funding = W3/Bilateral is applied and the figures match PFF-R-2
- AND changing the selection rewrites the URL without a history entry; emptying it removes `funding`
- BUT an unknown value (`?funding=w4`) is dropped silently, never shown as a chip and never empties the page

### PFF-R-4 — Single-funding blocks say when funding does not apply (MUST)

Blocks with their own single-funding data path SHALL show the not-affected note for Funding source **only** when the selection excludes their source, and SHALL NOT change their figures because of it.

| Block | Its source | Note "Not affected by: Funding source" when |
|---|---|---|
| CGIAR Centers | W3 | Funding is active and does not include W3/Bilateral |
| W3/Bilateral projects | W3 | Funding is active and does not include W3/Bilateral |
| Progress against ToC KPIs | W1/W2 | Funding is active and does not include W1/W2 |

- GIVEN Funding = W3/Bilateral
- WHEN the Centers block renders
- THEN its figures equal those with no funding selected, and it shows **no** Funding note (it is already W3)
- AND IT MUST still apply every other active dimension as today
- BUT it must NOT drop its rows because they lack the page's funding field (Centers rows carry no funding name)

#### Scenario: W1/W2 only
- GIVEN Funding = W1/W2
- THEN Centers and Projects show "Not affected by: Funding source" (joined with any other not-affected dimension, bar order) and keep their W3 figures
- AND the ToC KPI block shows no Funding note

#### Scenario: W3 only, ToC KPI
- GIVEN Funding = W3/Bilateral
- THEN the ToC KPI block shows "Not affected by: Funding source" and keeps its figures

### PFF-R-5 — "View in Results Center" carries funding (MUST)

The strip's link SHALL stay available when Funding has at most one value (plus at most one Program and one Status, as today) and SHALL pass it on.

- GIVEN Funding = W3/Bilateral and Status = Approved
- WHEN the admin clicks "View in Results Center"
- THEN Results Center opens with `phase=<open version>`, `status=6` and `funding=bilateral`, and its funding filter shows W3/Bilaterals
- AND with Funding = W1/W2 it passes `funding=w1w2`
- BUT with both funding values selected the link is hidden (same rule as two Programs)
- AND IT MUST still hide the link when Project, Center or Typology is active

### PFF-R-6 — Guide kept true (MUST)

`portfolio-overview/CLAUDE.md` SHALL list Funding source among the bar dimensions, the URL params, and the not-affected rules, with a re-stamped `Verified:` line.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| PFF-NFR-1 | No new HTTP request; filtering stays in memory over the rows already loaded |
| PFF-NFR-2 | Copy through the copy files (`portfolio-overview.copy.ts`, `portfolio-centers-block.copy.ts`); no hard-coded English in templates |
| PFF-NFR-3 | Bar keeps the existing control (`app-filter-multi-select`), tokens and Spartan parts; no new component |
| PFF-NFR-4 | Tests: Jest `--maxWorkers=2`, scoped patterns, one run at a time; lint only touched files |

## 8. Defect classes and gates

| Defect class | Gate |
|---|---|
| Wrong classification (blank / other names counted as W3) | Pure unit tests on the matcher (`portfolio-filters.spec.ts`) |
| Funding filter empties the Centers block (its rows have no funding name) | `centers-block.aggregate.spec.ts` + component spec: W3 selected → same figures |
| Wrong not-affected note per block / funding combination | Unit tests on the not-affected function, all 3 blocks × {W1/W2, W3, both} |
| URL codec loses or invents `funding` | `portfolio-filters.spec.ts` parse/serialize round-trip + unknown value |
| Results Center link missing `funding=` or shown with 2 values | `portfolio-overview.component.spec.ts` |
| Selection-shaped test objects / copy records missing the new key | TypeScript in Jest run of the 6 touched spec files; `findRelatedTests` before push |
| **Bar layout with 6 controls (wrap, mobile sheet)** | **No automated gate** (jsdom has no layout). Substitute: read-only browser check at the HITL pause (desktop ≥1280 and <768 px), no write buttons |
| Template type errors (Jest does not type-check templates) | Accepted risk for Jest; caught by the next `ng build` in CI. Template changes are limited to existing bindings |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| PFF-R-1 | Funding source control in the bar | MUST |
| PFF-R-2 | Rows narrowed by funding source | MUST |
| PFF-R-3 | URL mirror | MUST |
| PFF-R-4 | Single-funding blocks not-affected note | MUST |
| PFF-R-5 | Results Center link carries funding | MUST |
| PFF-R-6 | Guide kept true | MUST |
| PFF-NFR-1..4 | No HTTP, copy, design system, test discipline | MUST |
