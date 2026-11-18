# Requirements — Centers block status tiles sum to the block total (CBT)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/centers-block-status-tiles` |
| Prefix | `CBT` |
| Depth | **Lite**, Bug Mode |
| Type | Bug |
| Approval Mode | `gated` |
| Source | `proposal.md` (Option A approved by the user, 2026-11-05) |
| Status | approved (2026-11-05) |
| Date | 2026-11-05 |

## 2. Executive Summary

The CGIAR Centers block on `/portfolio-overview` must show every result of its total in exactly one status tile. Today, results in Draft, Submitted, Quality Assessed or Discontinued are counted in the total but have no tile (PRTest: 601 in tiles vs 606 total).

## 3. Glossary

| Term | Meaning |
|---|---|
| Block total | "W3/Bilateral results N" in the Centers block (distinct W3 rows, PCA-R-4) |
| Tiles | Status tiles + donut + sr-only "Status / Results / Share" table of the Centers block (one model, three views) |
| Base statuses | Editing (1), Pending review (5), Approved (6), Rejected (7): the tiles the block shows today |
| Extra statuses | Quality Assessed (2), Submitted (3), Discontinued (4) |
| Draft | Status 8 (`ResultStatus.Draft`) |

## 4. System Context & Scope

**In scope:** status tiles, donut and sr-only table of the Centers block; the folder guide line.
**Out of scope:** Center Overview page and `buildStatusModel`; the deck and the page Status section; Results Center; tile labels (no "Pending review" → "Submitted" rename); data of the Draft rows.

## 5. Personas

| Persona | Change |
|---|---|
| PMU / portfolio admin | Can add up the Centers tiles and get the block total |

## 6. Functional Requirements

### CBT-R-1 — Every row in exactly one tile (MUST)

For the selected origin (All / New / Replicated), the sum of the tile counts SHALL equal the number of distinct rows of that origin.

#### Scenario: PRTest reproduction

- GIVEN distinct W3 rows whose Editing bucket holds 405 (status 1 plus Draft and unknown ids), 3 ×1, 4 ×1, 5 ×146, 6 ×40, 7 ×13 (total 606; observed on the live page 2026-11-05, see `execution.md` CBT-T-2). *Corrected 2026-11-05: the first draft said Editing 402 (399 + 3 Draft), which sums to 603, not 606. The unit-test fixture keeps 399 + 3 Draft and asserts its own sum, 603.*
- WHEN the block renders with origin All
- THEN the tiles read, in this order, Editing 405 · Submitted 1 · Pending review 146 · Approved 40 · Rejected 13 · Discontinued 1 (order 1, 2, 3, 5, 6, 7, 4, the deck's slot order; absent extras are skipped)
- AND their sum is 606 = the block total
- AND IT MUST hold that the sr-only "Share" percentages are computed over that same total
- BUT it must NOT count any row in two tiles

#### Scenario: origin filter

- GIVEN the same rows, of which some are replicated
- WHEN origin New or Replicated is selected
- THEN the tiles sum to that origin's count

### CBT-R-2 — Draft counts as Editing (MUST)

A row in status 8 (Draft) SHALL be counted in the Editing tile, as the deck does.

- GIVEN 3 rows in Draft and 0 in Editing
- WHEN the block renders
- THEN the Editing tile shows 3
- AND no "Draft" tile exists

### CBT-R-3 — Extra tiles only when present (MUST)

Tiles for Quality Assessed, Submitted and Discontinued SHALL appear only when their count is > 0. The 4 base tiles SHALL appear always, as today.

- GIVEN rows only in base statuses
- WHEN the block renders
- THEN exactly the 4 base tiles render, in today's order and with today's labels and colors
- BUT it must NOT render a zero tile for 2, 3 or 4
- AND IT MUST keep a selected extra tile visible (count 0) when a filter change empties it, so the selection and the strip label never point at a missing tile

### CBT-R-4 — Interactions unchanged (MUST)

Clicking a tile or a donut slice, the strip label and "View in Results Center" SHALL keep working for every tile, extra tiles included.

- GIVEN the Discontinued tile is shown
- WHEN the admin clicks it
- THEN it is selected (`aria-pressed=true`), the donut fades the other slices, the strip reads "Discontinued"
- AND "View in Results Center" links with `status=4` and `funding=bilateral` (origin All)
- AND IT MUST hold that a click on the Editing tile still links with `status=1` (Draft rows are not listed there — accepted, see §8)

### CBT-R-5 — Center Overview untouched (MUST)

The Center Overview page (`bilateral-overview`) SHALL keep its 4 tiles and its counts.

- BUT it must NOT change `buildStatusModel` or `STATUS_TILE_DEFS`

### CBT-R-6 — Guide kept true (MUST)

`portfolio-overview/CLAUDE.md` SHALL state the new tile rule (base 4 always, 2/3/4 when > 0, Draft → Editing) without growing past its current length.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new request; counting stays O(rows) |
| Accessibility | New tiles reuse the tile button (`aria-pressed`); sr-only table lists every tile. WCAG 2.1 AA unchanged |
| Design tokens | Only existing `STATUS_TILE_TOKEN` / `STATUS_CHART_TOKEN` entries for 2, 3, 4. No new token |
| Copy | Labels from `resultStatusLabel(id)`; no new string |

## 8. Defect classes and gates

| Defect class | Gate |
|---|---|
| Tiles ≠ total (the bug) | Jest on `centers-block.aggregate` / component with a fixture holding every status 1–8: **red before the fix, green after** |
| Draft in the wrong tile, or a zero extra tile shown | Same Jest fixture, plus a base-only fixture asserting exactly 4 tiles |
| Interaction broken for an extra tile | Component Jest: click `status-tile-4` → selection, label, `resultsCenterParams()` = `{funding:'bilateral', status:4}` |
| Center Overview regression | Existing `bilateral-overview` specs via `--findRelatedTests` (must stay green, unchanged) |
| Tile grid layout with 5–7 tiles | **No automated check** (jsdom has no layout). Substitute: read-only browser check of PRTest after deploy, or local served page, at the HITL pause |
| Results Center Editing link omits Draft rows | **Accepted risk**: Results Center reads a single `?status=` number (`results-list.component.ts:402-403`). Recorded, not fixed |

## 9. Requirement ID Index

| ID | Strength |
|---|---|
| CBT-R-1 | MUST |
| CBT-R-2 | MUST |
| CBT-R-3 | MUST |
| CBT-R-4 | MUST |
| CBT-R-5 | MUST |
| CBT-R-6 | MUST |
