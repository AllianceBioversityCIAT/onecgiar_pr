# Requirements — Portfolio Overview KPI Cards: New vs Replicated Breakdown

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-kpi-breakdown/` |
| Module | `result-framework-reporting` › `portfolio-overview` (client only) |
| Type | Change |
| Depth | Standard (narrow: one screen, one service, no server work) |
| Approval Mode | gated |
| Status | draft |
| Source | `proposal.md` (approved 2026-10-14, OQ-1..4 and R-1 resolved in §12 Decisions) |
| Requirement prefix | `POVKB-*` (the `POV-R-*` ids already belong to `archive/2026-08-28-changes--portfolio-overview-echarts`) |
| Refines | PRD `US-P1` (phase-aware oversight of submission progress) |

## 2. Executive Summary

The admin `/portfolio-overview` KPI deck goes from 4 cards to 3. Every card splits its figure into **New** results (created this phase) and **Replicated** results (carried over from 2025, `is_replicated`), and the cards for each funding stream also split New into **Submitted / Editing**. The "Science programs" card is removed. All figures come from the open-phase rows the page already loads; there is no new request and no server change.

## 3. Glossary

| Term | Definition (observable) |
|---|---|
| Open-phase rows | The results the page already counts: the payload narrowed to `phase_status === 1`, or to the newest version when no phase is open (existing behaviour, unchanged). |
| W1/W2 / W3/Bilateral | `source_name` other than `W3/Bilaterals`, or equal to `W3/Bilaterals` (existing rule, unchanged). |
| Replicated | A row whose `is_replicated` is `1`, `'1'` or `true`. |
| New | Every row that is not Replicated, including when `is_replicated` is `0`, `'0'`, `null` or absent. |
| Editing | `status_id` = 1. |
| Submitted | Every status other than Editing (Submitted, Quality Assessed, Pending Review, Approved, Rejected, Discontinued…). The label is a product decision (proposal OQ-1). |

## 4. System Context & Scope

**In scope:** the KPI card deck at the top of `/portfolio-overview`, its loading skeleton, and the aggregation that feeds it.

**Out of scope:** server, SQL or the payload; the status strip, category bars, matrix and CGIAR Centers block; making the breakdown rows clickable; a per-type breakdown of replicated W1/W2; changing the W1/W2 vs W3 classification.

Prod snapshot that grounds the rules (open phase, 2026-10-14): W1/W2 new 199 · W1/W2 replicated 1776 (innovation types only) · W3 new 1 · W3 replicated 279 (innovation development/use, all Editing).

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Platform admin / PMU lead (route guarded by `CheckAdminGuard`) | They can read how much of each stream is new work versus carried over, and how much of the new work has left Editing. |
| Portfolio stakeholder who requested it (screenshot items 1–4) | Each annotated request is met; card 4 is gone. |

## 6. Functional Requirements

### Requirement POVKB-R-1: Total card shows four reconciling parts

The Total portfolio results card MUST keep its headline total and SHALL show four labelled counts: **W1/W2 new**, **W3/Bilateral new**, **W1/W2 replicated** and **W3/Bilateral replicated**. Rows of every status count.

#### Scenario: Four parts sum to the total

- GIVEN open-phase rows with 3 new W1/W2, 1 new W3, 4 replicated W1/W2 and 2 replicated W3, in mixed statuses
- WHEN the page renders
- THEN the card shows total 10 and parts 3 / 1 / 4 / 2
- AND IT MUST hold that the sum of the four parts equals the total for any input
- BUT it must NOT filter any part by status (an Editing row counts the same as an Approved one)

#### Scenario: Replicated flag arrives in any encoding

- GIVEN rows whose `is_replicated` is `1`, `'1'`, `true`, `0`, `'0'`, `null` or absent
- WHEN the counts are computed
- THEN only `1`, `'1'` and `true` count as Replicated, and every other value counts as New

### Requirement POVKB-R-2: W1/W2 card breakdown

The W1/W2 results card MUST keep its headline count and SHALL show **New**, subdivided into **Submitted** and **Editing**, plus **Replicated from previous years**.

#### Scenario: W1/W2 breakdown

- GIVEN W1/W2 rows: 2 new Editing, 1 new Submitted, 1 new Quality Assessed, 3 replicated (one of them Quality Assessed)
- WHEN the page renders
- THEN W1/W2 = 7; New = 4 (Submitted 2 · Editing 2); Replicated from previous years = 3
- AND IT MUST hold that Submitted + Editing + Replicated = W1/W2 count
- BUT it must NOT split replicated rows by status

### Requirement POVKB-R-3: W3/Bilateral card breakdown

The W3/Bilateral results card MUST keep its headline count and SHALL show **New** subdivided into **Submitted** and **Editing**, plus **Innovations replicated from 2025**.

#### Scenario: W3 breakdown

- GIVEN W3 rows: 1 new Editing, 1 new Approved, 2 replicated
- WHEN the page renders
- THEN W3 = 4; New = 2 (Submitted 1 · Editing 1); Innovations replicated from 2025 = 2
- AND IT MUST hold that Submitted + Editing + Replicated = W3 count

### Requirement POVKB-R-4: Science programs card removed

The KPI deck MUST show exactly 3 cards, and the loading skeleton MUST show 3 placeholders. The "Science programs" card SHALL NOT render at any breakpoint.

#### Scenario: Deck layout

- GIVEN the page has figures
- WHEN it renders at ≥ the `lg` breakpoint
- THEN the 3 cards share one row; at `sm` they wrap two per row, and below `sm` one per row
- BUT the text "Science programs" and the "% portfolio progress" figure must NOT appear in the deck

### Requirement POVKB-R-5: Existing card behaviour preserved

The phase chip on card 1, the `% submitted / QA` chip on card 2, the `% approved` chip on card 3, and every card's click target (Results Center all · Results Center W1/W2 · Bilateral results) MUST stay unchanged.

#### Scenario: Navigation unchanged

- GIVEN the new deck
- WHEN the admin clicks card 2
- THEN they land on Results Center filtered to W1/W2, exactly as before

### Requirement POVKB-R-6: Same data, no extra request

Every new count MUST come from the same open-phase rows as the headline figures. The page SHALL NOT make any additional HTTP request.

#### Scenario: Closed phase fallback

- GIVEN no phase is open and the page falls back to the newest version
- WHEN the cards render
- THEN the breakdowns count only that version's rows, consistent with the headlines

#### Scenario: Zero buckets

- GIVEN open-phase rows with no W3 results at all
- WHEN the cards render
- THEN card 3 shows 0 for every line, and no line shows `NaN`, a blank or a hidden value

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | One pass over at most 20 000 rows inside the existing `computed`. No added request. |
| Accessibility | Every breakdown line is real text (number plus label), not colour alone. Each card's accessible name still describes the card. Colour tokens follow `docs/ux-ui/design.md` §7 and the WCAG AA text contrast in §10. |
| Consistency | The labels "New" and "Replicated" match the vocabulary of `changes/overview-replicated-new-badges` (center Overview). |
| Honesty | When the payload is partial, the existing `isPartial()` banner keeps covering these figures. No new caveat is needed. |

## 8. Defect Classes → Gate

| Defect class this spec can produce | Gate |
|---|---|
| Wrong bucket math (misclassified flag or status, double counting) | Service Jest spec with fixed fixtures, plus a reconciliation assertion for each card (POVKB-R-1..3). This fails if any row lands in two buckets or in none. |
| Flag encoding misread (`'1'` vs `1` vs `null`) | Service Jest spec with an encoding matrix fixture (POVKB-R-1, 2nd scenario) |
| Card 4 or its skeleton placeholder still present | Component Jest spec: count the deck cards and skeleton placeholders, and assert "Science programs" is absent |
| Navigation or chips regress | The existing component specs for `navigateToResultsCenter` and the chip percentages stay green |
| **Layout: 3 cards crowd, lines wrap badly, or the hero card overflows at sm/lg** | **No automated check** — jsdom cannot measure layout. Substitute: a visual check in the running app at 375 / 768 / 1280 / 1440 px at the HITL pause after execution |
| Text contrast of the new lines on the purple hero gradient | **No automated check** — axe cannot evaluate text over a gradient. Substitute: the same visual check, using the existing `text-purple-100` / white tokens already validated on that card |

## 9. Requirement ID Index

| ID | Summary | Strength |
|---|---|---|
| POVKB-R-1 | Total card: 4 reconciling parts | MUST |
| POVKB-R-2 | W1/W2 card: New (Submitted/Editing) + Replicated | MUST |
| POVKB-R-3 | W3 card: New (Submitted/Editing) + Innovations replicated from 2025 | MUST |
| POVKB-R-4 | Remove Science programs card and its skeleton placeholder | MUST |
| POVKB-R-5 | Chips and click targets unchanged | MUST |
| POVKB-R-6 | Same rows, no extra request, zero-safe | MUST |

Cross-references: `docs/prd.md` US-P1 · `docs/ux-ui/design.md` §7 tokens, §9 responsive, §10 a11y · `docs/trd/trd.md` (no API change) · `portfolio-overview/CLAUDE.md` contract.
