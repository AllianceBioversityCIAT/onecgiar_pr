# Requirements — Impact Results: SP Reporting Entry

## 1. Module / Feature

| Field | Value |
|---|---|
| **Module** | `onecgiar-pr-client` — `pages/result-framework-reporting/pages/dashboard-lab` (SP Reporting page) + `shared/report-result` |
| **Sub-feature** | Impact results — entry point (child 2 of 3, see [`../family.md`](../family.md)) |
| **Owner** | Santiago Sanchez |
| **Status** | approved (2026-10-30) |
| **Ticket** | P2-3901 (AC 1–3, 17) |
| **Depth** | **Standard** — client-only, consumes server contracts E1 + E6 already live on PRTest (child #1 `done`) |
| **Type / Approval Mode** | Change · gated (inherited from [`../proposal.md`](../proposal.md)) |
| **Visual source** | User Guide v2 (2026-10-29), step 1 — the card screenshot itself is an image the agent could not extract; card anatomy comes from proposal §4.1 and the existing card styles |

**Requirement prefix:** `IRE` (Impact Results — Entry).

---

## 2. Executive Summary

On a Science Program's **Reporting** page, add an **Impact results** card right after **2030 outcomes**. It lists the five CGIAR Impact Areas, each with how many impact results the program already has there in the current phase, and a **Report result** button. The button opens the existing report drawer in **impact mode**: the chosen Impact Area is fixed, there is no indicator, target or Theory of Change, and saving creates a level 1 / type 9 result that carries the area, then opens the new result. Everything else on the page behaves exactly as today.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Impact result** | Result with level 1 (Impact) and type 9 (Impact contribution) |
| **Impact Area** | One of the 5 CGIAR Impact Areas: 1 Nutrition, health & food security · 2 Poverty reduction, livelihoods & jobs · 3 Gender equality, youth & social inclusion · 4 Climate adaptation & mitigation · 5 Environmental health & biodiversity |
| **Impact results card** | The new card on the Reporting page (tag `IMPACT`) |
| **Impact mode** | The report drawer/form opened from the Impact results card |
| **Area count** | Impact results owned by the program in the phase shown whose score for that area is **2 – Principal** (server E6; a result principal in two areas counts in both — proposal OQ-1 default) |
| **E1 / E6** | Server contracts from child #1: `POST /api/results-framework-reporting/create` with `result.impact_area_id` · `GET /api/results-framework-reporting/impact-level/counts?initiativeId&versionId` |

---

## 4. System Context & Scope

- PRD: **G1** (submission completeness — impact results become reportable); **US-S1** (create a result); **AC-3** (permissions enforced server-side; client gate is UX).
- TRD: client `result-framework-reporting` module; **W1** result lifecycle (create step only).
- UX: `docs/ux-ui/design.md` card / chip / button tokens; User Guide v2 step 1.
- Server contracts: [`../server-foundation/design.md`](../server-foundation/design.md) §4.1 E1, E6.

### In scope

- The Impact results card (anatomy, counts, loading/error/empty states, placement, filter behavior).
- The Report result action per area, gated by the same permission as other rows.
- Impact mode in the report drawer/form and the create payload.
- Post-create feedback and navigation.

### Out of scope

- The result detail page (Impact level info section, section order, ToC/geo restrictions in the detail form, BR9 labels) — child #3 `result-detail-impact`.
- Any server change. If a server gap is found it is recorded, not fixed here.
- Counting by "entry-point area" (would need a new column; OQ-1 default is Principal score).
- QA behavior; non-P25 programs' pages (the Reporting page only exists for P25 programs).

---

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| SP member with reporting permission | Can start an impact result from the program's Reporting page |
| SP member without reporting permission / guest | Sees the card and counts, cannot report |
| PMU lead | Sees per-area impact counts on each program's Reporting page |

**IRE-US-1** — As an SP member, I want to start an impact result from my program's Reporting page by choosing its Impact Area, so that the result is created at impact level with that area already set.
**IRE-US-2** — As a PMU lead, I want to see how many impact results a program has per Impact Area, so that I can follow impact reporting without opening every result.

---

## 6. Functional Requirements

### Requirement IRE-R-1: Impact results card placement and anatomy (MUST)

The Reporting page SHALL show an **Impact results** card immediately after the **2030 outcomes** card, as a sibling (not nested). The card SHALL show: a tag `IMPACT`, the title **Impact results**, the line **5 Impact Areas · no targets**, a **NEW** chip, the total number of impact results, and one row per Impact Area (icon, name, area count, Report result action), in Impact Area id order 1–5.

#### Scenario 1.1: Card is shown after 2030 outcomes
- GIVEN the Reporting page of program SP01 in the open reporting phase, grouped view
- WHEN the page finishes loading
- THEN the Impact results card appears directly after the 2030 outcomes card
- AND it lists exactly 5 rows, one per Impact Area, in order 1–5, each with the area icon and name
- BUT it must NOT show a progress bar, a "x of y" ratio, a percentage or a "By AOW" button (impact results have no targets)
- AND IT MUST show the tag `IMPACT`, the title, the "5 Impact Areas · no targets" line and the NEW chip

#### Scenario 1.2: View modes
- GIVEN the Reporting page
- WHEN the user switches to **All indicators** (flat view)
- THEN the Impact results card is not shown (the flat view lists indicator rows only)
- AND switching back to **Grouped** shows it again in the same place

### Requirement IRE-R-2: Area counts (MUST)

Each area row SHALL show its area count, and the card header SHALL show the total, both taken from E6 for the program and the phase the page shows. Counts SHALL be loaded once per page load (and again when program or phase changes).

#### Scenario 2.1: Counts shown
- GIVEN SP01 in phase 36 has 2 impact results principal in Climate and 1 in Nutrition, and E6 answers `{areas:[…], total: 2}`
- WHEN the card renders
- THEN Climate shows 2, Nutrition shows 1, the other three show 0, and the header shows 2
- BUT it must NOT compute or sum counts on the client (the header total is E6 `total`, not the sum of rows — a result principal in two areas counts once in the total)

#### Scenario 2.2: Loading
- GIVEN E6 has not answered yet
- WHEN the card renders
- THEN each count shows a loading placeholder of fixed width (no layout shift when the number arrives)
- AND the Report result actions are already usable

#### Scenario 2.3: Counts fail
- GIVEN E6 fails (network or 4xx/5xx)
- WHEN the card renders
- THEN each count and the total show "—" with an accessible label meaning "count unavailable"
- AND the Report result actions remain usable
- BUT it must NOT show a blocking error or hide the card

### Requirement IRE-R-3: Card is independent of indicator filters (MUST)

The Impact results card SHALL stay visible in the grouped view regardless of the page's indicator filters and controls (search, Only pending, Favorites, result-type chips, Section/Category/Target/PT filters, Expand all), because it holds no indicators.

#### Scenario 3.1: Filters active
- GIVEN the grouped view with **Only pending** on, a search text, and the "Knowledge Product" chip selected
- WHEN the indicator cards are filtered
- THEN the Impact results card is still shown, with all 5 rows and their counts
- BUT it must NOT change which AOW / Intermediate / 2030 cards are shown, their order, their counts or their expand state

### Requirement IRE-R-4: Report result action and permission (MUST)

Each area row SHALL offer **Report result**, labelled for assistive technology with the area name. It SHALL be enabled exactly when the user can report results for this program (same rule as the Report action on other rows of the page).

#### Scenario 4.1: User can report
- GIVEN an SP01 member with reporting permission and reporting enabled
- WHEN they click Report result on "Climate adaptation & mitigation"
- THEN the report drawer opens in impact mode with that area

#### Scenario 4.2: User cannot report
- GIVEN a user who is not an SP01 member (or reporting is disabled)
- WHEN the card renders
- THEN the Report result actions are disabled (or hidden) exactly as other rows' Report actions are for that user
- AND the card and its counts are still visible

### Requirement IRE-R-5: Impact mode form (MUST)

In impact mode the drawer SHALL show the chosen Impact Area (read-only, with icon and name) and the fields needed to create the result shell (title, and description if the standard form offers it). It SHALL NOT show any indicator, target, contribution-to-target, Theory of Change, result-category/level choice or innovation-link input.

#### Scenario 5.1: Impact mode fields
- GIVEN the drawer opened from the Climate row
- WHEN it renders
- THEN it shows "Impact result" as the kind of result and "Climate adaptation & mitigation" as the Impact Area, not editable
- AND the title input with the same rules as today (required, at most 30 words)
- BUT it must NOT show indicator, target, contribution-to-target, ToC, category/level choice or innovation-link inputs
- AND IT MUST disable Save while the title is empty or over the limit, or the user cannot report

#### Scenario 5.2: Cancel
- GIVEN the impact-mode drawer with a typed title
- WHEN the user closes it
- THEN nothing is created and the page is unchanged

### Requirement IRE-R-6: Create payload and outcome (MUST)

Saving in impact mode SHALL call E1 with level 1, type 9, the program, the title and `impact_area_id` of the chosen area, and SHALL NOT send `toc_result_id`, `indicators`, `number_target`, `target_date`, `contributing_indicator` or a non-empty `contributors_result_toc_result`. On success it SHALL show the standard success confirmation and open the new result's detail at General information in the current phase. On failure it SHALL keep the drawer open with the typed data and show the server's message.

#### Scenario 6.1: Successful create
- GIVEN impact mode for Climate (area 4) and title "Heat-tolerant beans reach 1M farmers"
- WHEN the user clicks Save
- THEN E1 receives `result.result_level_id = 1`, `result.result_type_id = 9`, `result.impact_area_id = 4`, `result.initiative_id = <SP01 id>`, the title
- AND the success confirmation is shown and the app navigates to `/result/result-detail/<code>/general-information?phase=<version>`
- BUT the body must NOT contain any of `toc_result_id`, `indicators`, `number_target`, `target_date`, `contributing_indicator` with a non-null value, nor a non-empty `contributors_result_toc_result`

#### Scenario 6.2: Server rejects
- GIVEN E1 answers 400 "Impact results require an Impact Area" (or any 4xx/5xx)
- WHEN the user clicks Save
- THEN the drawer stays open with the title kept, an error message with the server text is shown, and Save can be retried
- BUT it must NOT navigate or show the success confirmation

#### Scenario 6.3: Double submit
- GIVEN the user clicks Save
- WHEN the request is in flight
- THEN Save is disabled until it answers (one create per click sequence)

### Requirement IRE-R-7: No regression on the existing page (MUST)

Existing cards, filters, the row Report flow, the emerging-result flow and the create payloads they send SHALL behave exactly as before.

#### Scenario 7.1: Other create bodies unchanged
- GIVEN the row Report flow and the emerging flow
- WHEN they build their create payloads
- THEN the payloads are identical to before this change (no `impact_area_id` key at all, not even `null`)

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| **IRE-NFR-1** | Accessibility: card rows and Report result buttons reachable by keyboard in visual order; each button has an accessible name including the area; count placeholders/"—" have text alternatives; icons are decorative (`alt=""`) because the name is visible text |
| **IRE-NFR-2** | Layout: the card fits the page at 1280 px and 900 px width without horizontal scroll or clipped area names (names may wrap) |
| **IRE-NFR-3** | Styling uses existing design tokens (`docs/ux-ui/design.md` §7) and the page's current card look; new UI primitives use Spartan (team rule) |
| **IRE-NFR-4** | Performance: one E6 request per page load / program-phase change; the card must not delay rendering of the other cards |
| **IRE-NFR-5** | Copy is U.S. English and matches the guide: "Impact results", "Report result", "5 Impact Areas · no targets" |

---

## 8. Defect classes and their gates

| Defect class | Gate |
|---|---|
| Wrong create payload (missing area, forbidden field sent, other callers' bodies changed) | Jest — payload util spec (impact and non-impact bodies compared key by key) |
| Card hidden or reordered by filters / view mode; other cards affected | Jest — host spec over the grouped pipeline with filters on |
| Wrong counts mapping, loading/error states | Jest — card component spec with mocked E6 (success, pending, error) |
| Permission gate wrong | Jest — card + drawer specs with `canReport` true/false |
| Navigation / error handling after save | Jest — form spec with mocked API (success → navigate; 400 → stay, message) |
| **Visual/layout defects** (card look vs guide, wrapping at 900 px, spacing, NEW chip, icons) | **No reliable automated check** (jsdom cannot measure layout). Substitute: Cypress CT render at 1280 and 900 px + **human visual check at the HITL pause against User Guide v2 step 1** (T6) |
| Counts disagree with the database on real data | Manual PRTest check: card numbers vs the E6 response and a SQL count for SP01 / phase 36 |
| Keyboard / screen-reader labelling | Jest asserts accessible names; focus order checked manually at the HITL pause |

Accepted risk: exact pixel match with the guide mockup is not automatable; the HITL visual check is the gate.

---

## 9. Requirement ID Index

| ID | Title | Priority |
|---|---|---|
| IRE-R-1 | Card placement and anatomy | MUST |
| IRE-R-2 | Area counts | MUST |
| IRE-R-3 | Independent of indicator filters | MUST |
| IRE-R-4 | Report result action and permission | MUST |
| IRE-R-5 | Impact mode form | MUST |
| IRE-R-6 | Create payload and outcome | MUST |
| IRE-R-7 | No regression | MUST |
| IRE-NFR-1..5 | A11y, layout, styling, performance, copy | MUST |

## 10. Assumptions to confirm

| ID | Assumption (default used) |
|---|---|
| IRE-A-1 | The card ignores indicator filters and stays visible in grouped view (IRE-R-3). Alternative: hide it when any filter is active |
| IRE-A-2 | Counts use the Principal-score rule already shipped in E6 (proposal OQ-1 default) |
| IRE-A-3 | Who may report = same as other rows (`canReportResults`; proposal OQ-5 default) |
| IRE-A-4 | The form keeps the standard title rule (required, ≤ 30 words); description only if the standard form already offers it |
