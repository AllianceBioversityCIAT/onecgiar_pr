# Requirements — Impact results card: expand / collapse

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/impact-results-card-collapse` |
| Module code | `ICC` (Impact results Card Collapse) |
| Type | Change · Depth: **Lite** |
| Amends | `IRE-R-1` of `archive/2026-11-01-results--impact-results-reporting/sp-reporting-entry` (lifts the "no chevron" rule only) |
| Ticket | — (user request 2026-11-03, screenshot reference) |
| Owner | Santiago Sanchez |
| Status | approved (2026-11-03) |
| Approval Mode | gated |
| Date | 2026-11-03 |

## 1. Executive Summary

The **Impact results** card on the SP Reporting tab (grouped view) gets a chevron in its header that collapses and expands the 5 Impact Area rows, like the Area of Work cards next to it. The card starts **expanded**. Nothing else in the card changes: the header (tag, title, NEW chip, "5 Impact Areas · no targets", Total) stays visible in both states, counts and the Report action behave as today.

## 2. Glossary

| Term | Meaning |
|---|---|
| Card | `app-impact-results-card` on the Reporting tab, grouped view |
| Rows | The 5 Impact Area rows (icon, name, count, Report result) |
| Toggle | The header control that shows/hides the rows |

## 3. Scope

- **In:** collapse/expand of the rows, chevron, keyboard and screen-reader semantics.
- **Out:** the other differences visible in the screenshot (subtitle "Select the Impact Area…", "N results reported", coloured dots instead of icons) — not requested; a separate change if wanted. Remembering the state across reloads. Server/API.

## 4. Functional Requirements

### Requirement ICC-R-1: Toggle rows from the header (MUST)

The card header SHALL be a toggle that shows or hides the 5 rows. The card SHALL start expanded on every page load.

#### Scenario 1.1: Collapse and expand
- GIVEN the Reporting tab of a program, grouped view, card loaded (expanded)
- WHEN the user clicks the card header
- THEN the 5 rows are hidden and the chevron rotates to the collapsed position
- AND clicking the header again shows the 5 rows in order 1–5 with their counts
- BUT the header must NOT disappear: tag `IMPACT`, title, NEW chip, "5 Impact Areas · no targets" and Total stay visible in both states
- AND IT MUST keep the Total value (and its loading / `—` state) identical in both states

#### Scenario 1.2: Default state
- GIVEN a page load (switching program or phase within the page MAY keep the current state — see design ICC-DD-3)
- WHEN the card first renders
- THEN it is expanded
- BUT it must NOT persist the collapsed state (no localStorage, no URL param)

### Requirement ICC-R-2: Accessible toggle (MUST)

The toggle SHALL be operable by keyboard (Tab to focus, Enter / Space toggles) and SHALL expose its state with `aria-expanded` and the controlled region with `aria-controls`.

#### Scenario 2.1: Keyboard and screen reader
- GIVEN focus on the card header toggle
- WHEN the user presses Enter or Space
- THEN the rows toggle and `aria-expanded` flips between `true` and `false`
- AND IT MUST have an accessible name containing "Impact results"
- BUT the chevron icon must NOT be announced (decorative)

### Requirement ICC-R-3: Existing behaviour unchanged (MUST)

Everything in `IRE-R-1..4` except the "no chevron" rule SHALL keep working: counts request (one per program/phase, not re-fired by toggling), Report buttons, disabled state, error/loading states, no progress bar / ratio / % / By AOW.

#### Scenario 3.1: Toggling does not refetch
- GIVEN the card loaded its counts
- WHEN the user collapses and expands it
- THEN no new counts request is sent
- AND the Report result buttons emit the area id as before
- BUT it must NOT show a progress bar, ratio, percentage or "By AOW"

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| ICC-NFR-1 | Uses existing tokens and the AoW card chevron pattern (`lucideChevronDown`, `--pr-text-secondary`, rotate transition). No new design token. |
| ICC-NFR-2 | Header stays usable at 900 px (wraps as today; chevron does not push Total off-card). |

## 6. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Toggle does not hide/show rows, wrong default | Jest component spec (`impact-results-card.component.spec.ts`) |
| Missing/incorrect `aria-expanded` / `aria-controls`, keyboard toggle | Jest spec (native `<button>` → Enter/Space are browser-native; spec asserts click + attributes) |
| Toggle refetches counts | Jest spec (request count after toggle) |
| Header layout broken at 1280/900 px, chevron misaligned | Existing CT `impact-results-card.component.cy.ts` + manual visual check at the HITL pause (jsdom cannot measure layout) |
| Enter/Space in a real browser | Native `<button>` semantics; manual check at the HITL pause (accepted: not automated in jsdom) |

## 7. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| ICC-R-1 | Toggle rows from the header | MUST |
| ICC-R-2 | Accessible toggle | MUST |
| ICC-R-3 | Existing behaviour unchanged | MUST |
| ICC-NFR-1 | Existing tokens / AoW chevron pattern | MUST |
| ICC-NFR-2 | Header usable at 900 px | SHOULD |
