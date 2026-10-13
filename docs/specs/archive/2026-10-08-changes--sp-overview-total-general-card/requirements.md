# Requirements — SP Overview "Total General" card

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/sp-overview-total-general-card/` |
| Module | `result-framework-reporting` → `dashboard-lab` / `program-overview` (client only) |
| Type | Change |
| Depth | Lite (narrow UI change + 3 figures from data already loaded) |
| Approval Mode | gated |
| Status | draft |
| Source | `proposal.md` (same folder) + reviewer feedback "General box" (2026-10-08) |
| Requirement prefix | `STG` |
| Assumptions | OQ-1..OQ-4 of the proposal taken at their **recommended** defaults (see §3). Any of them can be overruled at this gate. |

## 2. Executive Summary

The purple **Total General** KPI card on the Science Program Overview (`/result-framework-reporting/entity-details/<SP>/overview`) stops showing `N W1/W2 · N W3/Bilateral`. It takes the center card's look (count, then a divider, then rows with count chips) and shows three figures the program acts on: **innovations replicated for update**, **new results** and **W3/Bilateral results awaiting review**.

Implementation discovery (it changes the proposal's Option A): the program-progress payload the W1/W2 meter already uses carries **`replicatedResults` / `newResults` per phase**. The server counts both over the same rows as the meter's statuses, so replicated + new reconciles with the W1/W2 total **by construction**. Proposal risks R1/R2 (all-phase `programResults`, two sources) disappear.

## 3. Glossary & assumptions

| Term | Meaning here |
|---|---|
| Replicated result | A W1/W2 result of the effective phase with `is_replicated = 1`, carried over from a previous phase for update. All result types count; the label keeps the reviewer's wording "Innovations" (**OQ-2 default**). |
| New result | A W1/W2 result of the effective phase with `is_replicated ≠ 1`. |
| Awaiting review | A W3/Bilateral result tagged to the program in status **Pending Review** (status 5) only (**OQ-4 default**). Labelled "awaiting **review**", not "revision" (**OQ-3 default**). |
| Headline | The big count = the program's W1/W2 results of the effective phase = replicated + new (**OQ-1 default**). |
| Effective phase | The phase the Overview currently shows (explicit phase selection, or the default one). |
| Scope | The Overview AoW/outcome filter (`?scope=`). |

## 4. Scope

**In:** KPI 1 "Total General" card only: figures, labels, tooltips and layout.
**Out:** KPI cards 2–5, the center Overview, the server, and the replicated/new pills (they would repeat rows 1–2).

## 5. Personas

| Persona | Change |
|---|---|
| SP focal point / PMU reviewer | Sees at a glance how many results to **update** (replicated), how many were **created** (new) and how many bilateral results wait for **their review**. |

## 6. Functional Requirements

### STG-R-1 — Three breakdown rows

The Total General card SHALL show, below the headline and a divider, exactly three rows in this order, each with its label left and a count chip right:

1. "Innovations replicated for update": replicated results
2. "New results": new results
3. "W3/Bilateral results awaiting review": awaiting-review results

#### Scenario STG-S-1.1: Figures render

- GIVEN the effective phase reports 62 replicated and 7 new W1/W2 results, and 2 bilateral results are in Pending Review
- WHEN the Overview loads
- THEN the rows show `62`, `7` and `2` in that order
- AND each row has a tooltip stating what it counts

#### Scenario STG-S-1.2: Zero is shown, not hidden

- GIVEN no bilateral result is in Pending Review
- WHEN the card renders
- THEN the third row still renders with `0`
- BUT it must NOT disappear (a missing row reads as "no data", a `0` reads as "nothing to do")

### STG-R-2 — Headline reconciles with the rows

The headline SHALL equal replicated + new for the effective phase.

#### Scenario STG-S-2.1: Sum

- GIVEN 62 replicated and 7 new
- THEN the headline reads `69 results`
- AND IT MUST equal the W1/W2 Results card (KPI 2) when no scope is active
- BUT it must NOT add W3/Bilateral results into the headline

### STG-R-3 — The W3/Bilateral volume figure is removed

The card SHALL NOT show the `N W1/W2 · N W3/Bilateral` line or any total W3/Bilateral count (reviewer: "not the program's responsibility").

#### Scenario STG-S-3.1: Removed

- WHEN the card renders
- THEN no text matching `W3/Bilateral` appears in it except the "awaiting review" row label
- BUT the separate **W3 / Bilateral** KPI card (KPI 3) must NOT change

### STG-R-4 — Program-wide, per phase

The card's figures SHALL be program-wide (the card carries the `Program` pill) and SHALL follow the effective phase.

#### Scenario STG-S-4.1: Phase switch

- GIVEN the user switches the Overview to another phase
- THEN all four figures change to that phase's values
- BUT a figure from the previous phase must NOT remain

#### Scenario STG-S-4.2: Scope does not narrow the card

- GIVEN a scope (e.g. `AOW01`) is selected
- THEN the Total General figures stay the program-wide values
- AND the card's tooltip/label makes "program-wide" explicit
- BUT the other cards keep their existing scope behaviour

### STG-R-5 — Visual pattern and preserved behaviour

The card SHALL reuse the center card's row/chip pattern (`quick/overview-total-results-mockup`). It SHALL keep its gradient, `Total General` header, `Program` pill, its click action (activates the "All" section) and its loading skeleton.

#### Scenario STG-S-5.1: Loading

- GIVEN meter or bilateral data are loading
- THEN the card shows pulse placeholders and no figure
- BUT it must NOT show a `0` that later jumps to the real value

#### Scenario STG-S-5.2: Click unchanged

- WHEN the card is clicked
- THEN the "All" section is activated, exactly as today

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| STG-NFR-1 | No new HTTP request. Figures come from payloads the Overview already loads. |
| STG-NFR-2 | Numbers in `font-mono` + `tabular-nums`. Px-based type utilities only (12px root, UI rule §1.3). |
| STG-NFR-3 | Accessible name: each row's label is readable text. Chips are not the only carrier of meaning. |
| STG-NFR-4 | Narrow widths: a long label truncates (`truncate`) and the chip never wraps or overflows the card. |

## 8. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Wrong figure / wrong source (e.g. scoped count, all-phase count) | Jest `program-overview.component.spec.ts` + `dashboard-lab.component.spec.ts` (inputs → rendered rows; host computed from phase version) |
| Rows don't reconcile with KPI 2 | Jest assertion headline = replicated + new; **live check** on SP01 at the HITL pause (KPI 1 headline vs KPI 2) |
| W3 line still present / KPI 3 accidentally changed | Jest DOM assertion on both cards |
| Visual drift from the center card (spacing, chip, divider, truncation at narrow widths) | **No automated check**: jsdom cannot lay out. Substitute: human browser check at the HITL pause (desktop + ~360px card width), compared side by side with the center card |
| Stale bundle making the change look un-applied | Verify the served bundle per client `CLAUDE.md` §9 before concluding |

## 9. Requirement ID Index

| ID | Title |
|---|---|
| STG-R-1 | Three breakdown rows (S-1.1, S-1.2) |
| STG-R-2 | Headline reconciles (S-2.1) |
| STG-R-3 | W3/Bilateral volume removed (S-3.1) |
| STG-R-4 | Program-wide, per phase (S-4.1, S-4.2) |
| STG-R-5 | Visual pattern + preserved behaviour (S-5.1, S-5.2) |
| STG-NFR-1..4 | No new request, mono figures, a11y, narrow widths |
