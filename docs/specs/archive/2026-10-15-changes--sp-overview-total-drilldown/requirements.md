# Requirements — SP Overview: Total General reconciles + drill-down

## 1. Document Control

| Field | Value |
|---|---|
| Module | `result-framework-reporting` (client only) |
| Sub-feature | Total General card (SP Overview) + Results tab Replication filter |
| Spec path | `changes/sp-overview-total-drilldown` |
| Depth | Standard |
| Type | Change |
| Approval Mode | gated |
| Owner | santiago.sanchez@cgiar.org |
| Status | approved (2026-10-15) |
| Supersedes | `STG-R-2` of `archive/2026-10-08-changes--sp-overview-total-general-card` (headline = replicated + new); SR-164368 row → section toggle |
| Decisions | OQ-1 → headline adds **pending review only** (status 5). OQ-2 → filter options **New / Previously reported**. Chart → **in-card composition bar** (proposal follow-up, 2026-10-15) |

## 2. Executive Summary

The Total General card's headline will equal the sum of its three rows, a stacked bar will show their proportions, and every row/segment will open the list of results behind its number (Results tab with a new Replication filter, or the Bilateral review tab on Pending).

## 3. Glossary

| Term | Meaning |
|---|---|
| Replicated | W1/W2 result whose version already existed in an earlier phase (`is_replicated = 1`; Results tab pill "Previously reported") |
| New | W1/W2 result with `is_replicated = 0` in the phase |
| Awaiting review | W3/Bilateral result tagged to the program with status Pending Review (5) |
| Effective phase | The phase the Overview is currently showing |
| Composition bar | Horizontal bar split into one segment per row, width proportional to the count |

## 4. System Context & Scope

Touches the SP Overview (`entity-details/:code/overview`, `docs/ux-ui/design.md` result-framework-reporting shell), its Results tab and Bilateral review tab. No API, data model or server change (`docs/trd/trd.md` — client consumes existing `GET_ScienceProgramsProgress`, `GET_AllResultsWithUseRole`, `GET_ResultToReview`). Refines PRD portfolio-consolidation flow (PMU / program lead persona).

**In scope:** headline sum, composition bar, row + segment navigation, Results tab Replication filter (control, chip, URL, clear).
**Out of scope:** making KPI 1 follow the AoW scope or Filter popover; the `status=Editing` vs W3 cards confusion; My results board support for the new filter; server changes.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Program lead / PMU | Total adds up; can open the exact list of new, replicated, or pending results |
| Result submitter | Results tab gains a Replication filter |

## 6. Functional Requirements

### STD-R-1 — Headline equals the sum of the rows (MODIFIED, supersedes STG-R-2)

The Total General headline SHALL equal replicated + new + awaiting review for the effective phase.

#### Scenario S-1.1: Prod SP05 numbers
- GIVEN replicated = 62, new = 7, awaiting review = 8
- WHEN the Overview renders
- THEN the headline reads **77**
- AND the three rows still read 62, 7, 8
- AND IT MUST stay program-wide: selecting an AoW scope does NOT change any of the four figures

#### Scenario S-1.2: Only the review-path pending status counts
- GIVEN W3/Bilateral rows with statuses Pending (5) ×2, Approved (6) ×3, Editing (1) ×1
- WHEN the headline is computed
- THEN only the 2 Pending rows are added
- BUT Approved, Rejected, Editing and Discontinued rows MUST NOT be added

#### Scenario S-1.3: Tooltip
- WHEN the user hovers the headline
- THEN the tooltip states the three parts (W1/W2 replicated, W1/W2 new, W3/Bilateral awaiting review) — it MUST NOT say "W1/W2 results" only

### STD-R-2 — Composition bar (ADDED)

The card SHALL show a horizontal bar under the headline with one segment per row, in row order (Replicated · New · Awaiting review), each width proportional to its count over the headline.

#### Scenario S-2.1: Proportions
- GIVEN 62 / 7 / 8
- THEN segment widths are ≈ 80.5% / 9.1% / 10.4% of the track (±1 point after the minimum-width rule)

#### Scenario S-2.2: Zero segment
- GIVEN new = 0
- THEN no New segment renders
- AND the other two still fill the track proportionally

#### Scenario S-2.3: All zero
- GIVEN all three counts are 0
- THEN an empty track renders with no segment buttons
- AND the headline reads 0

#### Scenario S-2.4: Tiny segment stays clickable
- GIVEN one segment is 1 of 200
- THEN it renders at a minimum visible width (≥ 6px)
- AND IT MUST still be a focusable, clickable target

#### Scenario S-2.5: Loading
- WHILE program results are loading
- THEN the bar shows a skeleton track, no segments, no counts

#### Scenario S-2.6: Legend
- Each row SHALL carry a colored dot matching its segment color (row = legend).

### STD-R-3 — Rows and segments open their list (MODIFIED, replaces SR-164368 toggle)

Each row and its segment SHALL navigate on click / Enter / Space:

| Item | Destination | Query |
|---|---|---|
| Replicated | Results tab | `origin=W1/W2`, `replication=replicated`, `phase=<effective phase label>` |
| New | Results tab | `origin=W1/W2`, `replication=new`, `phase=<effective phase label>` |
| Awaiting review | Bilateral review tab | `status=pending`, `phase=<effective versionId>` |

#### Scenario S-3.1: New → list of new results
- GIVEN the Overview shows New = 7 for phase P25
- WHEN the user clicks the New row (or its segment)
- THEN the Results tab opens with the Replication chip "New" and the Funding source chip "W1/W2"
- AND the table lists the W1/W2 results of P25 that are not previously reported
- AND IT MUST NOT carry the Overview's AoW scope as `?section=` (KPI 1 is program-wide)

#### Scenario S-3.2: Replicated → list of previously reported results
- Same as S-3.1 with chip "Previously reported" and only rows showing the "Previously reported" pill.

#### Scenario S-3.3: Awaiting review → pending list
- WHEN the user clicks the Awaiting review row
- THEN the Bilateral review tab opens on the effective phase with the Pending status filter

#### Scenario S-3.4: Zero rows still navigate
- GIVEN New = 0
- WHEN the user clicks the New row
- THEN the Results tab opens filtered, showing its filtered-empty state (not an error)

#### Scenario S-3.5: No more section toggle
- WHEN a row is clicked
- THEN the Overview `activeSection` does NOT change
- BUT the Filter popover's section control MUST keep working as today

### STD-R-4 — Results tab Replication filter (ADDED)

The Results tab SHALL offer a multi-select filter "Replication" with options **New** and **Previously reported**.

#### Scenario S-4.1: Filtering
- WHEN "Previously reported" is selected
- THEN only rows with the "Previously reported" pill remain
- AND selecting both options shows all rows (same as none)

#### Scenario S-4.2: URL round-trip
- GIVEN `?replication=new` in the URL
- WHEN the page loads or reloads
- THEN the filter and its chip "Replication: New" are restored
- AND changing the filter writes `?replication=` back; clearing it removes the key

#### Scenario S-4.3: Invalid value
- GIVEN `?replication=foo`
- THEN the value is ignored (no chip, no filtering)
- AND IT MUST NOT throw or empty the table

#### Scenario S-4.4: Chip + clear
- The chip can be removed individually; "Clear filters" removes it with the others; the filter counter includes it.

#### Scenario S-4.5: My results board unaffected
- The My results board (shares the filter service) MUST behave exactly as before — no new control, no URL key.

### STD-R-5 — Count parity (verification requirement)

For the effective phase, the count shown in the destination list SHOULD equal the row number on the Overview (New, Replicated: Results tab row count; Awaiting review: Bilateral review Pending count). A mismatch MUST be reported with its cause, not hidden.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new HTTP request on the Overview or Results tab |
| Accessibility | Rows and segments are real `<a>`/`<button>` with `aria-label` "View N new results" etc.; focus ring visible on the purple card; segment colors ≥ 3:1 against the card background (WCAG 1.4.11) and information never color-only (count + label in rows) |
| Responsive | Bar and rows work from 320px card width; no horizontal scroll |
| Typography | Figures in mono/`tabular-nums` like today |
| Compatibility | Old Results links without `replication` behave exactly as before |

## 8. Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong headline / segment math | Jest: program-overview + dashboard-lab specs (S-1.x, S-2.1–2.4) |
| Wrong destination / query params / scope leaking | Jest: navigation specs with a mocked router (S-3.x) |
| Filter predicate / URL hydration wrong | Jest: filter service + programme-results specs (S-4.x) |
| Count mismatch Overview vs list (population, fuzzy phase match) | **No unit gate** — live check on SP05 (local stack, read-only) at the HITL pause (STD-R-5). Known risk: Results phase match is label/year based |
| Segment colour contrast / visual proportion / tiny-segment hit area | **No automated gate** (jsdom can't measure) — T6 screenshot review + manual contrast check of chosen hexes at the HITL pause |

## 9. Requirement ID Index

| ID | Scenarios |
|---|---|
| STD-R-1 | S-1.1, S-1.2, S-1.3 |
| STD-R-2 | S-2.1 – S-2.6 |
| STD-R-3 | S-3.1 – S-3.5 |
| STD-R-4 | S-4.1 – S-4.5 |
| STD-R-5 | live parity check |

## 10. Open Questions

None (OQ-1, OQ-2 resolved 2026-10-15).

## 11. Cross-references

- `docs/prd.md` — PMU / portfolio lead persona, portfolio consolidation flow
- `docs/ux-ui/design.md` §7 tokens, §10 a11y
- `docs/trd/trd.md` — results / bilateral read endpoints (unchanged)
- `dashboard-lab/components/program-overview/CLAUDE.md`, `programme-results/CLAUDE.md`
