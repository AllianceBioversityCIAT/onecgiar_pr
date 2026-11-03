# Requirements — Impact previous-results dropdown

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `results` → Impact level info (P25, `result_type_id = 9`) |
| Sub-feature | `impact-previous-results-dropdown` (code `IPD`) |
| Depth | Lite (see design §Budget — sized against the design) |
| Status | `draft` |
| Requested by | Santiago Sanchez, 2026-11-03 (PDF wording + Contributors dropdown as visual reference) |
| Extends | archived `results/impact-results-reporting/result-detail-impact` (`IRD-R-5`, `IRD-R-6`) |
| Related | copy change `[SPEC:quick/impact-previously-reported-label]` (question text, already in the working tree) |

**In one line:** on "Yes", replace the "Add results" button + pop-up picker with an inline dropdown that looks and behaves like the Contributors & partners "Please select a result" dropdown, still fed by the Impact search (E5).

## 2. Context

Today "Has this intervention, or a component of it, already been reported in PRMS?" = Yes shows the selected rows and an **Add results** button that opens a dialog (search, Phase/portfolio select, Result type multiselect, Prev/Next paging, Cancel/Done). Product wants the same inline dropdown users already know from Contributors & partners (visual reference: screenshot in the request, `rd-contributors-and-partners.component.html` "Please select a result").

**Decisions taken with the user (2026-11-03):**

| # | Decision |
|---|---|
| U-1 | Contributors **look**, Impact **search**: data keeps coming from E5 (any phase/portfolio, current result excluded, server order, paged). No Funding source filter (E5 has none; adding it = backend change, out of scope). |
| U-2 | Selected results are shown like Contributors: "Results selected (N)" header + one line per result with a remove icon. |

## 3. Scope

| In scope | Out of scope |
|---|---|
| Inline dropdown replacing the dialog picker | Server / E5 / payload changes (none) |
| Filters: Result typology chips, Portfolio All / P22 / P25 | Funding source filter (U-1) |
| Selected list restyled like Contributors | Contributors & partners dropdown itself (untouched) |
| Keyboard + read-only behaviour of the new control | Question copy (done in the quick change) |

## 4. Personas

Result submitter of a P25 Impact contribution result (edits); QA / read-only viewer (reads).

## 5. Functional requirements

### IPD-R-1 — Inline dropdown on Yes (MUST)

On Yes (and not read-only) the section SHALL show a field "Please select a result" (required marker) that opens an inline panel below it. The dialog picker and the "Add results" button SHALL no longer exist.

Panel content, top to bottom (Contributors layout):

| Element | Behaviour |
|---|---|
| Search bar | "Search by code or title…"; clear (×) when not empty; by title or exact code (E5 `q`) |
| FILTER BY RESULT TYPOLOGY | One chip per result type (multi-select, toggle); none active = all types |
| PORTFOLIO | Segmented All / P22 / P25 (single choice, All by default) |
| Summary | "Showing N results" (server total) + "Reset filters" |
| List | Checkbox row: `[<portfolio> · <phase>] <code> · <type>` + status badge, title below; checked when selected |
| Paging | "Load more" at the end of the list while more pages exist |
| Footer | "N results selected", "Clear selection" (only when N > 0), **Close** |

#### Scenario 1.1 — Open and pick

- GIVEN Yes is answered and no result is linked
- WHEN the user opens the dropdown and checks result 20507
- THEN 20507 appears in "Results selected (1)" below the field
- AND the footer reads "1 results selected"
- AND the section is marked unsaved (nothing is stored until Save)
- BUT the current result must NOT appear in the list
- AND IT MUST NOT show any dialog

#### Scenario 1.2 — Uncheck in the list

- GIVEN 20507 is selected
- WHEN the user unchecks 20507 in the panel
- THEN it disappears from the selected list

#### Scenario 1.3 — Close

- GIVEN the panel is open
- WHEN the user presses Close, clicks the field again, or presses Escape
- THEN the panel closes and the selection is kept

### IPD-R-2 — Search and filters drive the Impact search (MUST)

Every search/filter change SHALL reload page 1 from E5 with the current query, selected type ids and portfolio; the current result SHALL always be excluded.

#### Scenario 2.1 — Filters combine

- GIVEN typology "Policy change" and portfolio P25 are active
- WHEN the user types "water"
- THEN one request is sent after typing stops, with q=water, that type and the P25 portfolio
- AND the list shows only the response of the latest request
- BUT Reset filters MUST clear search, typology and portfolio (All) and reload

#### Scenario 2.2 — Load more

- GIVEN the server reports more pages
- WHEN the user presses Load more
- THEN the next page is appended below the current rows
- AND IT MUST NOT show Load more on the last page

#### Scenario 2.3 — Errors and empty

- GIVEN the search request fails
- THEN the panel shows "Results could not be loaded" with Retry, and the selection is unchanged
- AND when the search returns 0 rows the panel shows "No results match your search"

### IPD-R-3 — Selected results list (MUST)

Below the field, when at least one result is selected: "Results selected (N)" and one line per result (code, title, type, phase · portfolio, status) with a remove icon button.

#### Scenario 3.1 — Remove from the list

- GIVEN 2 results are selected
- WHEN the user presses the remove icon of the first
- THEN only the second remains and the section is unsaved
- AND focus moves to the next remove button, else the previous, else the dropdown field

#### Scenario 3.2 — Clear selection

- GIVEN 2 results are selected and the panel is open
- WHEN the user presses Clear selection
- THEN the selected list is empty and the footer reads "0 results selected"

### IPD-R-4 — Unchanged section rules (MUST)

Save body, green check, Yes→No confirmation ("N links will be removed"), leave-page guard and load-error banner SHALL behave exactly as today (`IRD-R-5`, `IRD-R-7`).

#### Scenario 4.1 — Yes → No with links

- GIVEN Yes with 2 selected results
- WHEN the user chooses No and confirms
- THEN the selected list and the dropdown disappear and Save sends `previous_result_ids: []`
- BUT on Cancel the toggle stays on Yes and both results remain

### IPD-R-5 — Read-only (MUST)

In read-only mode the dropdown field SHALL NOT render and the selected list SHALL render without remove icons.

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| IPD-NFR-1 | Keyboard: field, chips, segmented options, rows, Load more, Clear, Close and remove icons are reachable with Tab and operable with Enter/Space; chips/segments expose pressed state; Escape closes the panel and returns focus to the field. |
| IPD-NFR-2 | Visual parity with the Contributors dropdown (same panel, chip, segmented, row, footer styles) using existing tokens only — no new colour or size values. |
| IPD-NFR-3 | No horizontal page scroll at 1280 px and 900 px. |
| IPD-NFR-4 | One E5 request per typing burst (300 ms debounce); stale responses discarded. |
| IPD-NFR-5 | Results count announced politely (`aria-live`) after each load. |

## 7. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Wrong E5 params (type ids, portfolio, q, exclude, page) or stale response shown | Jest dropdown spec (asserts params per action) |
| Selection add / remove / clear not reaching `previousResults` / save body / dirty flag | Jest page spec |
| Yes→No confirm, load error, read-only regressions | existing Jest page spec (kept green, adapted) |
| Keyboard / Escape / focus return | Cypress CT (real keyboard), batch run — jsdom cannot prove focus |
| Horizontal overflow at 900 / 1280 px | Cypress CT width check |
| **Visual mismatch vs Contributors** | **No automated check.** Substitute: side-by-side screenshot at 1280 px reviewed at the T-3 HITL pause (T6 visual review). |

## 8. Requirement index

| ID | Title | Strength |
|---|---|---|
| IPD-R-1 | Inline dropdown on Yes | MUST |
| IPD-R-2 | Search and filters drive E5 | MUST |
| IPD-R-3 | Selected results list | MUST |
| IPD-R-4 | Unchanged section rules | MUST |
| IPD-R-5 | Read-only | MUST |
| IPD-NFR-1..5 | Keyboard, visual parity, width, debounce, announce | MUST |

## 9. Assumptions

| ID | Assumption |
|---|---|
| IPD-A-1 | P22 / P25 portfolio ids are taken from the versioning rows (`obj_portfolio`) the picker already loads — not hard-coded. If none load, the Portfolio filter shows only All. |
| IPD-A-2 | Typology chips list every result type from the result-types catalog with the existing `resultTypeFilterLabel` labels (same set as today's picker). |
| IPD-A-3 | Selection applies immediately (Contributors behaviour); there is no Cancel/Done working copy any more — the section Save + leave guard still protect it. |
| IPD-A-4 | The specific-phase filter ("Reporting 2026 · P25") is replaced by the Portfolio segment (U-1); filtering by a single phase is no longer offered. |
