# Requirements — SP Overview: W3/Bilateral "received" row + "awaiting review" card

## 1. Document Control

| Field | Value |
|---|---|
| Module | `result-framework-reporting` (client only) |
| Sub-feature | SP Overview top KPI cards (Total General + new Awaiting review card) |
| Spec path | `changes/sp-overview-w3-received` |
| Ticket | P2-3977 (request #2 "make the Total General add up and stop shrinking") |
| Depth | Lite |
| Type | Change |
| Approval Mode | gated |
| Owner | santiago.sanchez@cgiar.org |
| Status | approved (2026-10-26) |
| Supersedes | `STD-R-1` (headline adds Pending only) and the `pendingReview` row of `STD-R-3` in `archive/2026-10-15-changes--sp-overview-total-drilldown` |
| Decisions (user, 2026-10-26) | Received = Pending Review + Approved + Rejected, **no Editing** (a rejected result stays part of the SP's history). "Awaiting review" (Nicoleta's wording) moves to its own card. Received row drill-down stays on the Overview with `section=bilateral` |

## 2. Executive Summary

The Total General card stops shrinking when the SP reviews a bilateral: its W3 row now counts every bilateral the SP **received** (pending, approved, rejected). The "awaiting review" count moves to a new card between Total General and Areas of Work that opens Bilateral review.

## 3. Glossary

| Term | Meaning |
|---|---|
| Received | W3/Bilateral results tagged to the SP with status Pending Review (5), Approved (6) or Rejected (7) in the effective phase |
| Awaiting review | Same population, status Pending Review (5) only |
| W3/Bilateral section | The Overview's `section=bilateral` view (chip "Section: W3/Bilateral"). Its Reporting Status donut counts every non-Editing status (incl. Discontinued 4 and Submitted 3), so it can exceed Received (pivot 2026-10-26) |

## 4. Scope

**In:** Total General W3 row (label, count, headline, bar segment, click); new Awaiting review card; top-card grid layout.
**Out:** server/API changes; Editing (1/8) rows; the other two Total General rows; the AoW card; P2-3977 requests other than #2 (ToC % removal, KPI split line, etc.).

## 5. Functional Requirements

### SWR-R-1 — Total General counts received bilaterals (MODIFIED, supersedes STD-R-1)

The headline SHALL equal replicated + new + received, and the W3 row SHALL read **"W3/Bilateral results received"** with the received count.

#### Scenario S-1.1: Reviewing does not shrink the total
- GIVEN replicated 8, new 5, and bilateral rows Pending ×4, Approved ×0, Rejected ×1
- WHEN the Overview renders
- THEN the W3 row reads **5** and the headline **18**
- AND WHEN one Pending becomes Approved (or Rejected), the W3 row and headline stay 5 and 18
- BUT Editing (1 or 8) and Discontinued rows MUST NOT be counted
- AND IT MUST stay program-wide: an AoW scope selection does not change it

#### Scenario S-1.2: Bar segment follows the row
- The composition-bar segment for W3 uses the received count and the same amber dot/color as today.

### SWR-R-2 — Received row opens the W3/Bilateral section in place (MODIFIED, replaces the pendingReview row of STD-R-3)

Clicking the received row (or its bar segment) SHALL keep the user on the Overview and set the section filter to W3/Bilateral.

#### Scenario S-2.1: Click
- GIVEN the Overview on section "All"
- WHEN the user clicks the received row
- THEN the URL gains `section=bilateral`, the chip "Section: W3/Bilateral" shows, and the W3/Bilateral cards render
- AND the row number equals the Bilateral review "All" tab count (both 5 + 6 + 7). The W3/Bilateral Reporting Status donut may be higher: it also counts Discontinued and Submitted (pivot 2026-10-26)
- BUT it MUST NOT navigate to another tab
- AND IT MUST NOT toggle back to "All" when the section is already W3/Bilateral (clicking again keeps it)

### SWR-R-3 — Awaiting review card (ADDED)

A card SHALL sit between Total General and Areas of Work, styled like the Areas of Work card, showing the Pending Review (5) count as **"W3/Bilateral results awaiting review"**.

#### Scenario S-3.1: Count and navigation
- GIVEN Pending ×4, Approved ×0, Rejected ×1
- THEN the card reads **4**
- WHEN the user clicks it (or presses Enter/Space)
- THEN Bilateral review opens with `status=pending` and the effective phase (same destination as today's pendingReview row)

#### Scenario S-3.2: Zero
- GIVEN no pending rows
- THEN the card reads 0 and still navigates (Bilateral review shows its empty state)

#### Scenario S-3.3: Loading
- WHILE program results load, the card shows a skeleton figure like the Total General card.

#### Scenario S-3.4: Layout
- ≥ xl: Total General (2 cols) · Awaiting review · Areas of Work on one row.
- sm–xl: Total General full width; Awaiting review and Areas of Work side by side below it.
- < sm: stacked in that order. No horizontal scroll at 320px.

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new HTTP request (reuses the bilateral rows already loaded) |
| Accessibility | Card is a real `<button>` with `aria-label` "View N W3/Bilateral results awaiting review"; visible focus ring |
| Tokens | Existing `--pr-*` tokens and the AoW card's badge pattern; no new color token |

## 7. Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong status set counted (Editing leaking, Rejected missing) | Jest `dashboard-lab.component.spec.ts` (S-1.1) |
| Headline / segment math | Jest `program-overview.component.spec.ts` (S-1.1, S-1.2) |
| Wrong click behavior (navigates vs sets section, toggle-off) | Jest both specs (S-2.1, S-3.1) |
| Row number ≠ Bilateral review "All" count | **No unit gate** — PRTest SP11 live read-only check at the HITL pause |
| Layout / card look-alike / wrap at breakpoints | **No automated gate** (jsdom) — screenshot check at the HITL pause |

## 8. Requirement ID Index

| ID | Scenarios |
|---|---|
| SWR-R-1 | S-1.1, S-1.2 |
| SWR-R-2 | S-2.1 |
| SWR-R-3 | S-3.1 – S-3.4 |

## 9. Open Questions

- OQ-1: Row copy — "W3/Bilateral results received" (matches sibling rows) vs literal "W3 Bilaterals: Bilateral results received". Default: the former.
