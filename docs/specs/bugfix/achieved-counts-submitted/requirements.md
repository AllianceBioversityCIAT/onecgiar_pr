# `bugfix/achieved-counts-submitted` — Requirements

**Depth:** Standard (Bug Mode) · **Status:** draft · **Ticket(s):** INC-162943 (Alliance IT Support, reported by Nicoleta Trifa, reply of 2026-09-30)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/achieved-counts-submitted` |
| Type | Bug (inherited from `proposal.md`) |
| Approval Mode | `gated` |
| Module | `results-framework-reporting` (server `api/results/results-toc-results/`, client `pages/result-framework-reporting/`) |
| Predecessor | `bugfix/indicator-achieved-value-per-center` (server `achieved_value_sum` shipped; client binding deferred in its §7) |
| Alignment | Aligned with `proposal.md` Option A. Open questions OQ-1..OQ-3 resolved as **assumptions** in §9 — confirm at this gate |

## 2. Executive Summary

A submitted result must show up as progress right away. Today every "Achieved" surface reads the QA-only figure (status 2, 6), so a submitted KP (status 3) shows **Achieved 0 / Not started** and the Overview counts **0/90**. The fix: every Achieved figure, %, status badge, count and roll-up uses the union basis **Submitted + QA'd + Approved (3, 2, 6)**, counted once per result. The QA / Prel pair is hidden behind one switch.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Achieved (union basis)** | Sum of `contributing_indicator` from active results at status 2, 3 or 6 on that indicator row. Already returned as `achieved_value_sum` |
| QA basis | Status 2, 6 — today's `actual_achieved_value_sum` / `progress_percentage` |
| Prel basis | Status 3, 6 — today's `preliminary_*` |
| Indicator row | One ToC indicator × target × center row on the Reporting table |
| Roll-up | Mean of child percentages: indicator → HLO/node → AoW → Science Program (zero-target excluded) |
| QA/Prel split | The two-track "QA x% · Prel. y%" display on rows, headers and the Overview |

## 4. System Context & Scope

### In scope
- Indicator-row Achieved value, progress %, status badge (Reporting tab, legacy By-AoW table, indicator drawer, ToC map).
- HLO/node, AoW and Science Program roll-up % on Reporting headers and Overview.
- KPIs-reported counts (Overview "Progress by area of work" `x/N`, reporting summary band).
- Hiding the QA/Prel split, restorable by one switch.

### Out of scope
- Which row/center a result counts in (owned by `reported-results-center-scoping`, `indicator-achieved-value-per-center`).
- Bilateral indicator without center (separate thread with Nicoleta).
- Excel export and the server-built dashboard/galaxy figures (`results.service.ts:1670`, `results-framework-reporting.service.ts:99`) — assumption A-2. The Home galaxy *client card* follows the display basis (design `ACS-DD-1`).
- Removing QA/Prel fields from the API payload.
- Data migration — nothing stored is wrong.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| P/A lead / coordinator | Sees submitted progress immediately as Achieved, one progress figure |
| PMU (Nicoleta Trifa) | Reporting and Overview agree with what was submitted |
| QA reviewer | No change to QA workflow; QA-only figure no longer on screen |

## 6. Functional Requirements

### Requirement: `ACS-R-1` — Indicator Achieved counts submitted results

The indicator row's Achieved value SHALL be the union-basis figure (status 2, 3, 6).

#### Scenario: `ACS-S-1` — Submitted KP, not yet QA'd (the reported case)
- GIVEN SAAF → AoW1 → HLO 1.1, indicator "Tanzania – chicken…", Target 1
- AND KP 31037 contributes 1 at status Submitted (3), and no other result contributes (state at ticket time; the result was soft-deleted afterwards — this scenario is exercised by fixture, live evidence uses 30983)
- WHEN the Reporting tab loads
- THEN the Achieved cell shows **1**
- AND the HLO header achieved sum includes that 1
- BUT it must NOT show 0 or the "Nothing reported yet" empty state

#### Scenario: `ACS-S-2` — Status transition keeps the number
- GIVEN the same result moves Submitted (3) → QualityAssessed (2)
- WHEN the tab reloads
- THEN Achieved is still **1**
- AND IT MUST be counted exactly once — never 0, never 2 — including for Approved (6), which today sits in both QA and Prel sets

#### Scenario: `ACS-S-3` — Non-counting statuses
- GIVEN a result at Editing (1), Pending Review (5), Rejected (7) or Draft (8)
- WHEN the tab loads
- THEN it contributes 0 to Achieved

### Requirement: `ACS-R-2` — Indicator progress % and status badge follow Achieved

The row's single progress % SHALL be Achieved ÷ Target, and the status badge (Not started / In progress / Achieved / Overachieved) SHALL be derived from that %.

#### Scenario: `ACS-S-4`
- GIVEN the `ACS-S-1` row (Achieved 1, Target 1)
- THEN the row shows **100%** and status **Achieved**
- AND the Report action follows the existing achieved/overachieved rule
- BUT the badge must NOT read "Not started" while Achieved > 0

#### Scenario: `ACS-S-5` — Per-center row (30983)
- GIVEN SF → AoW5 → HLO 5.3, FAIR KPs CIMMYT row, Target 5, KP 30983 submitted contributing 1
- THEN the row shows Achieved **1**, **20%**, In progress
- AND sibling center rows of the same indicator stay at 0 (scoping unchanged)

#### Scenario: `ACS-S-6` — Zero / no target
- GIVEN a row with Target 0 or no target and Achieved > 0
- THEN it reads "Overachieved" as today, and stays excluded from the roll-up averages
- AND with Achieved 0 it reads "No target set"

### Requirement: `ACS-R-3` — Roll-ups use the Achieved basis

HLO/node, AoW and Science Program percentages SHALL be the mean of their children's union-basis % with the same zero-target exclusion and the same weighting as today.

#### Scenario: `ACS-S-7`
- GIVEN an HLO whose only measurable indicator is the `ACS-S-1` row
- THEN the HLO shows 100%, and the AoW / Program % are the mean over their measurable children using the union basis
- BUT the averaging rule (simple mean, children with nothing measurable skipped) must NOT change

### Requirement: `ACS-R-4` — KPIs-reported counts include submitted

A KPI SHALL count as reported when its union-basis Achieved > 0.

#### Scenario: `ACS-S-8` — Overview
- GIVEN SAAF where 31037 is the only contribution under Productivity+ (90 KPIs)
- WHEN the Overview tab loads
- THEN "Progress by area of work → Productivity+" shows **1/90** (not 0/90)
- AND the reporting summary band's "KPIs with evidence" counts it too
- AND IT MUST keep the zero-target exclusion of `kpi-count-reconciliation` (KCR-R-2) unchanged

### Requirement: `ACS-R-5` — QA / Prel split hidden, restorable

The UI SHALL show one progress figure where it shows the QA/Prel pair today, on: Reporting row cells, HLO and AoW headers, Overview AoW rows, Overview program hero, legacy By-AoW table, indicator drawer, ToC map.

#### Scenario: `ACS-S-9`
- GIVEN the split switch is off (default)
- THEN no "QA" / "Prel." labels or second bar are visible on those surfaces
- AND accessible names / tooltips describe the single figure (no "QA x% and Preliminary y%" text)

#### Scenario: `ACS-S-10` — Restore
- GIVEN the switch is turned on
- THEN the previous QA/Prel display returns unchanged
- BUT turning it on must NOT require a server change

#### Scenario: `ACS-S-11` — Payload stays additive
- GIVEN any existing consumer of `actual_achieved_value_sum`, `progress_percentage`, `preliminary_*`
- THEN those fields keep their current values and meaning
- AND the new achieved % / roll-up fields are added alongside

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| `ACS-NFR-1` | No new database query or round-trip: the union figure comes from the existing aggregation pass |
| `ACS-NFR-2` | Payload change is additive only (bilateral contract not touched — endpoint is not `/api/bilateral/*`) |
| `ACS-NFR-3` | Single-figure cells keep existing design tokens; no layout shift wider than today's two-track cell (design.md §7 tokens) |
| `ACS-NFR-4` | Client and server unit tests touched by the change are updated, not deleted; scoped runs only |

## 8. Defect Classes → Gate

| Defect class | Caught by | Gap? |
|---|---|---|
| A surface still binds the QA-only field | Client Jest on `achievedText`, `statusOf`, `achievedOf`, `hloAchievedSum`, aow-hlo-table (red today) + a grep gate: no remaining `actual_achieved_value_sum` read on a display path outside the switch-on branch | — |
| Roll-up math wrong / not carrying achieved | Server Jest `toc-progress-rollup.spec.ts`, `aow-bilateral.repository.spec.ts` | — |
| Double count of Approved / status move | Existing server SQL test (single `status_id`, union `IN (2,3,6)`) + `ACS-S-2` mapper test | — |
| QA/Prel text still visible somewhere | Jest template assertions + Cypress CT row-layout specs | Partial — jsdom cannot see every rendered surface → **human visual check at HITL pause** on Reporting + Overview |
| Layout regression from removing a track (clipping, misalignment) | Cypress CT row-layout specs (real browser) | Partial → same human check |
| Real data disagrees (live example not active / not status 3 / wrong target id — 31037 found soft-deleted 2026-10-02) | — | **No automated check** → user runs the inline SQL verification before execute, and checks the two ticket examples on testing after deploy |

## 9. Assumptions (resolving proposal OQs — confirm at this gate)

| ID | Assumption |
|---|---|
| A-1 (OQ-1) | Split hidden **completely**; no QA-only tooltip |
| A-2 (OQ-2) | Excel export and server-built dashboard figures stay on the QA basis in this spec; the Home galaxy client card follows the new basis (design §10.1). Follow-up if Nicoleta wants all aligned |
| A-3 (OQ-3) | Pending Review (5) does not count — status set stays (2, 3, 6) |
| A-4 | Report-button enablement following the new status is intended (`ACS-S-4`) |

## 10. Requirement ID Index

| ID | Short name | Scenarios |
|---|---|---|
| `ACS-R-1` | Indicator Achieved counts submitted | S-1, S-2, S-3 |
| `ACS-R-2` | Row % and status from Achieved | S-4, S-5, S-6 |
| `ACS-R-3` | Roll-ups on Achieved basis | S-7 |
| `ACS-R-4` | KPIs-reported counts include submitted | S-8 |
| `ACS-R-5` | QA/Prel hidden, restorable, additive payload | S-9, S-10, S-11 |
| `ACS-NFR-1..4` | No extra query · additive · tokens · tests kept | — |
