# Requirements — Portfolio Overview: cleanup + W3 Approved (PCA)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/cleanup-and-approved` |
| Parent Spec | `changes/portfolio-overview-feedback-round` (child 1 of 3) |
| Prefix | `PCA` |
| Depth | **Standard** (client-only, 4 small behaviors, one counting rule change) |
| Type | Change (point 4 bug-shaped) |
| Approval Mode | `gated` |
| Status | approved (2026-11-04) |
| Date | 2026-11-04 |

## 2. Executive Summary

Stakeholder points 2, 3, 4, 5 on `/portfolio-overview`: drop every percentage figure, add an **Approved** count to the W3/Bilateral card, make the CGIAR Centers block count each W3 result **once**, and drop the "Centers reporting" card.

## 3. Glossary

| Term | Meaning |
|---|---|
| Deck | The 3 KPI cards at the top (Total, W1/W2, W3/Bilateral) |
| Status slot | One of `editing`, `in-qa` (label "Quality Assessed"), `submitted`, `approved`, `rejected`, `discontinued` — resolved by the page's single status map |
| W3 row (deck) | Result with funding source "W3/Bilaterals" |
| W3 row (Centers) | Result returned by a Center's overview with `source = API` |
| Distinct result | Counted once by result id, however many Centers it is linked to |

## 4. System Context & Scope

**In scope:** deck chips and W3 split, page status tiles, Centers block (chip, tiles, headline totals, card, subtitle copy), component guide.
**Out of scope:** funding filter (child 2), contribution requests (child 3), server endpoints, Results Center, Center Overview screen, status tile **bar widths** (graphic, not a figure), donut chart geometry.

## 5. Personas

| Persona | Change |
|---|---|
| PMU / portfolio admin | Reads counts only, sees how many W3 results are approved, and sees the same W3 total in the deck and the Centers block |

## 6. Functional Requirements

### PCA-R-1 — No percentage figures on the deck (MUST)

The deck SHALL NOT show the `% submitted / QA` chip (W1/W2 card) nor the `% approved` chip (W3 card).

- GIVEN the page loaded with figures
- WHEN the admin reads the W1/W2 and W3/Bilateral cards
- THEN no text on either card contains `%`
- AND the counts, New / Replicated lines and click targets are unchanged
- BUT it must NOT leave an empty chip placeholder in the card header

### PCA-R-2 — No percentage in the page status tiles (MUST)

Each tile of "Portfolio Results Reporting Status" SHALL show its label and count only.

- GIVEN any status tile
- WHEN rendered
- THEN it shows `<label> <count>` and no `(N%)`
- AND the proportional bar under the count stays (graphic)
- AND tile click → status filter behaves exactly as today

### PCA-R-3 — W3 card status split with Approved (MUST)

The W3/Bilateral card SHALL break down **both** the New line and the Replicated line by status slot, showing `Submitted`, `Approved`, `Editing` always and `Quality Assessed`, `Rejected`, `Discontinued` only when > 0.

- GIVEN W3 rows in the open phase: 9 New (1 Pending Review, 0 Approved, 8 Editing) and 279 Replicated
- WHEN the card renders
- THEN the New sub-line reads `Submitted 1 · Approved 0 · Editing 8`
- AND the Replicated line gets its own sub-line with the same parts
- AND IT MUST hold that the shown parts of each line sum exactly to that line's count
- AND IT MUST resolve the slot with the page's single status map (Pending Review → Submitted, Approved → Approved)
- BUT it must NOT count Quality Assessed (status 2) as Approved (today's chip did)

#### Scenario: Approved count matches Results Center
- GIVEN the open phase
- WHEN the admin compares the card's New + Replicated Approved to Results Center filtered by W3 + Approved + the same phase
- THEN the numbers are equal

The W1/W2 card split stays `Submitted · Editing` (no change).

### PCA-R-4 — Centers block counts distinct results (MUST)

In the CGIAR Centers block, the headline W3 total, the New / Replicated counts, and the status donut + tiles SHALL count each result **once**, even when it is linked to several Centers.

- GIVEN result R linked to Centers A and B, both loaded
- WHEN the block aggregates
- THEN R adds 1 to the headline total, 1 to its origin count, 1 to its status slot
- AND the subtitle no longer says a shared result counts once per Center; it says each result counts once
- AND IT MUST still compose the origin and status filters as today
- AND IT MUST keep "Retry failed Centers" and partial-load notes unchanged
- AND IT MUST count only W3 rows that have an active lead Program/Accelerator — the same rule the deck uses (amended 2026-11-04, PCA-DD-6)

#### Scenario: deck and Centers agree
- GIVEN the open phase with every Center loaded and no filter active
- WHEN the admin compares the deck's W3 total to the Centers block total
- THEN they are equal, OR the difference is explained by verification V-1 (§8) and recorded in the design

### PCA-R-5 — No percentage in the Centers block (MUST, OQ-2)

The Centers block SHALL NOT show the `% approved` chip nor `(N%)` in its status tiles. Same acceptance as PCA-R-1/R-2.

### PCA-R-6 — "Centers reporting" card removed (MUST)

The Centers block SHALL NOT render the "Centers reporting N / M" card; the W3/Bilateral card fills the row.

- GIVEN the Centers block loaded
- THEN no element shows "Centers reporting" or "with at least one result"
- AND the W3 card spans the full width at every breakpoint
- BUT it must NOT remove the origin buttons (New / Replicated) inside the W3 card

### PCA-R-7 — Guide kept true (MUST)

The component guide `portfolio-overview/CLAUDE.md` SHALL drop the statements this spec reverses (% chips, "counts once per Center", Centers reporting KPI in DD-4) and record the new rules, so later agents do not re-add them.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new HTTP request. Dedupe is O(rows) |
| Accessibility | Removing the chip must not leave an empty landmark; tiles keep `aria-pressed`. WCAG 2.1 AA unchanged |
| i18n | New / changed strings live in `internationalization/portfolio-*.copy.ts`; no hard-coded new copy in templates beyond what exists |
| Compatibility | Test ids that remain keep their names; removed ones (`kpi-centers-reporting`) are removed from specs |

## 8. Defect classes and gates

| Defect class | Gate |
|---|---|
| Wrong count (split, dedupe, sums) | Jest on service `kpiTotals` + centers aggregate, with a fixture holding a multi-Center result and every W3 status |
| `%` still rendered / card still rendered | Jest DOM assertions on the page and Centers block (`textContent` has no `%` in deck/tiles; no `kpi-centers-reporting`) |
| Layout gap after card/chip removal | **No automated check** (jsdom has no layout). Substitute: read-only browser check of the served page at the HITL pause (no write buttons, shared prdb) |
| Deck vs Centers still differ on real data (second cause) | **V-1 verification** against prod data (SQL run by the user, pasted inline in chat) before execution closes; residue recorded or fixed |

## 9. Requirement ID Index

| ID | Points | Strength |
|---|---|---|
| PCA-R-1 | 2a | MUST |
| PCA-R-2 | 3 | MUST |
| PCA-R-3 | 2b | MUST |
| PCA-R-4 | 4 | MUST |
| PCA-R-5 | OQ-2 | MUST |
| PCA-R-6 | 5 | MUST |
| PCA-R-7 | — | MUST |
