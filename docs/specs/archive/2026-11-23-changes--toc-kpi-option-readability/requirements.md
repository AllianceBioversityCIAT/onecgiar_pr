# Requirements — ToC KPI dropdown readability (`changes/toc-kpi-option-readability`)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` (Result Detail › Contributors & partners) + `custom-fields` (`app-pr-select`) |
| Spec Path | `changes/toc-kpi-option-readability` |
| Type | Change |
| Deliverable | software |
| Depth | Lite (narrow UI change; touches one shared control behind an opt-in) |
| Approval Mode | gated |
| Status | draft |
| Ticket(s) | Epic P2-3094 (Marc Schut feedback batch 1, item 3 usability note) |
| Proposal | `proposal.md` (approved 2026-11-19) |
| Owner | Santiago Sanchez |

## 2. Executive Summary

The "KPI Statement/description" dropdown lists ToC KPIs whose text is 1,000–3,969 characters long, in one non-wrapping line inside a list that scrolls sideways. Reporters cannot read what they pick. This spec makes each option show its first two lines (which, for SP09 PoDs, already contain code + PoD name + Lead Center), removes the sideways scroll for this list only, and shows the full text of the chosen KPI under the select with Show more / Show less.

## 3. Glossary

| Term | Meaning |
|---|---|
| KPI option | One row of the "KPI Statement/description" list; its text is `indicator_description` from the ToC DB |
| Selected-KPI block | The read-only block under the select that already shows Unit of measurement and Target (2026+ form) |
| Opt-in | A new input of `app-pr-select`, off by default, that only this select turns on |

## 4. System Context & Scope

Current behavior (cited):

- The KPI select passes `indicator_description` as `optionLabel` — `multiple-wps-content.component.html:88-101`.
- Option rows are 30 px tall, fixed, for the CDK virtual scroll — `pr-select.component.ts:63`; `custom-fields.scss:180-183`.
- Option labels never wrap — `custom-fields.scss:191-192` (`white-space: nowrap`) — and the list scrolls sideways — `custom-fields.scss:166-170` (`.virtual_scroll { overflow-x: scroll }`). This is the horizontal scroll Marc reported.
- KPI text length (PROD, `Integration_information.toc_results_indicators`, read 2026-11-19): 10,251 rows, max 3,969 chars, 273 start with a code such as `A5P6.2: PoD name: …`. Source: query run by Santiago; CSV `data_20261113_SS-1795089176402.csv` (42 rows, SP09 lengths 954–3,644).
- After selection, the 2026+ form shows Unit of measurement and Target in a read-only block, from the `selectedIndicatorData` signal — `multiple-wps-content.component.html:117-122`. The KPI text itself is shown nowhere except the closed select.

In scope: the KPI select's option rendering; the selected-KPI block; one opt-in input on `app-pr-select`.
Out of scope: which KPIs are listed; server/DB/ToC data; other selects (Level, HLO, Outcome, Output, and every other `app-pr-select` in the app); `/api/bilateral/*` (payload unchanged).

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter (W1/W2 P25, 2026+) | Can read KPI options while choosing and read the chosen KPI in full |
| IPSR submitter | Same, via the shared `app-cp-multiple-wps` |
| QA reviewer / PMU (read-only views: review drawer, share-request modal, contributor mirrors) | Sees the full text of the chosen KPI in the read-only block |

## 6. Functional Requirements

### Requirement TKR-R-1: KPI options are readable in the list

The KPI select SHALL show each option on up to two lines, ending in "…" when the text is longer, with no sideways scroll in that list.

#### Scenario TKR-S-1.1: long SP09 KPI options

- GIVEN a 2026 result of SP09 mapped to HLO 5.5.1 whose KPI options are 1,000+ characters long
- WHEN the reporter opens the "KPI Statement/description" list
- THEN each option shows at most two lines of its text, starting with its own first words (e.g. `A5P8.2: PoD name: …`)
- AND the list has no horizontal scrollbar and no option overflows the list's width
- AND IT MUST keep every row the same height, so the virtual scroll stays correct when the list is scrolled to the end
- BUT it must NOT cut the text in the DOM: the full option text stays in the row so search and screen readers still see all of it

#### Scenario TKR-S-1.2: short option

- GIVEN a KPI option whose text fits on one line
- WHEN the list opens
- THEN the option shows its whole text, without "…"

#### Scenario TKR-S-1.3: search still works

- GIVEN the KPI list open with 5+ options (search box visible)
- WHEN the reporter types a word that appears only beyond the visible two lines of an option
- THEN that option is still found

#### Scenario TKR-S-1.4: disabled option keeps its prefix

- GIVEN a KPI already chosen in another tab of the same ToC node (option disabled, prefixed "(Already selected in another tab)")
- WHEN the list opens
- THEN the disabled option still shows the prefix and is still not selectable

### Requirement TKR-R-2: the chosen KPI is readable in full

After a KPI is chosen, the 2026+ form SHALL show its full text read-only in the selected-KPI block, clamped to three lines with a "Show more" / "Show less" control when longer.

#### Scenario TKR-S-2.1: long chosen KPI

- GIVEN a 2026 result with a chosen KPI whose text exceeds three lines
- WHEN the section renders
- THEN the selected-KPI block shows the KPI text clamped to three lines, above Unit of measurement and Target
- AND a "Show more" control expands it to the full text, and "Show less" collapses it again
- AND IT MUST be operable by keyboard (a real button, focus visible) and announce its expanded state
- BUT it must NOT change `partnersBody`, the PATCH payload, or the section's unsaved-changes state

#### Scenario TKR-S-2.2: short chosen KPI

- GIVEN a chosen KPI whose text fits in three lines
- WHEN the section renders
- THEN the full text shows and no "Show more" control appears

#### Scenario TKR-S-2.3: changing the KPI

- GIVEN the block expanded for KPI A
- WHEN the reporter picks KPI B
- THEN the block shows KPI B's text, collapsed

#### Scenario TKR-S-2.4: pre-2026 form

- GIVEN a result of phase < 2026 (`isCP2026()` false)
- WHEN the section renders
- THEN no selected-KPI text block appears (behavior unchanged)

### Requirement TKR-R-3: other selects are unchanged

`app-pr-select` SHALL keep its current rendering for every instance that does not turn on the new opt-in.

#### Scenario TKR-S-3.1: default instance

- GIVEN any `app-pr-select` without the opt-in (e.g. Level, HLO, Lead center)
- WHEN its list opens
- THEN row height (30 px, or 50 px with `extraInformation`), single-line labels and the list's scroll behavior are exactly as before
- BUT it must NOT gain clamping, wrapping or a changed scroll

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| TKR-NFR-1 | New copy ("Show more", "Show less", block label) goes through `src/app/internationalization/` |
| TKR-NFR-2 | Styling via Tailwind utilities in templates; SCSS only where the virtual-scroll row CSS lives (`custom-fields.scss`) |
| TKR-NFR-3 | No server, DB, API or payload change; the PR states "W3/bilateral payload: no impact" |
| TKR-NFR-4 | Templates compile (`npx ngc -p tsconfig.app.json --noEmit`); Jest `--maxWorkers=2` scoped; Cypress CT batched, never alongside Jest |

## 8. Defect Classes → Gates

| Defect class | Gate |
|---|---|
| Option text still overflows / sideways scroll remains / rows of uneven height break the virtual scroll | Cypress CT rendered measurement on `pr-select` with the opt-in: per-row `scrollWidth <= clientWidth`, list `scrollWidth <= clientWidth`, row height constant, last option reachable after scroll; two viewport widths |
| Opt-in leaks into other selects | Existing `pr-select.cy.ts` / `pr-select.contract.cy.ts` green vs baseline + a CT case asserting default rows unchanged (height 30, `white-space: nowrap`) |
| Show more / less logic wrong (state, reset on KPI change, absent for short text) | Jest on `multiple-wps-content` (logic) + CT for the "is it actually clamped" measurement, because jsdom cannot measure line clamping |
| Template error (signals, inputs) | `npx ngc -p tsconfig.app.json --noEmit` |
| Payload / dirty-state change | Jest: block toggling does not touch `partnersBody`; no new field in the PATCH |
| Real data look (SP09 #953) | Human check on PRTest at the validation pause (no automated substitute for the real ToC strings) |

## 9. Requirement ID Index

| ID | Scenarios |
|---|---|
| TKR-R-1 | TKR-S-1.1, 1.2, 1.3, 1.4 |
| TKR-R-2 | TKR-S-2.1, 2.2, 2.3, 2.4 |
| TKR-R-3 | TKR-S-3.1 |
| NFR | TKR-NFR-1..4 |
