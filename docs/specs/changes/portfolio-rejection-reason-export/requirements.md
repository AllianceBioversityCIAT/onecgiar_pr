# Requirements — Results detail filters and rejection reason in the Portfolio Overview export

> **Answer first:** the Results detail block gets a **Filters** dropdown (Funding + Status) that is a shortcut to the page's global filters, and its Excel export gains **Rejection reason / Rejected by / Rejected on** for currently rejected results. Requirement IDs use the prefix `PRE` (Portfolio Rejection Export).

## 1. Document Control

| Field | Value |
|---|---|
| Module / sub-feature | `result-framework-reporting` · Portfolio Overview · Results detail |
| Spec Path | `changes/portfolio-rejection-reason-export` |
| Type | Change |
| Deliverable | software |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved (2026-11-17; design and tasks approved the same day) |
| Ticket | SR-168253 |
| Proposal | `proposal.md` (approved 2026-11-17, with the "shortcut to globals" decision) |
| PRD | G2 (data quality), US-P1 (PMU phase-aware dashboard) |
| Extends | `archive/2026-10-16-changes--portfolio-overview-revamp--filtered-detail-export` (FDE) · `archive/2026-10-16-changes--portfolio-overview-revamp--global-filters` (GLF) · `archive/2026-11-04-changes--portfolio-overview-feedback-round--funding-filter` (PFF) |

## 2. Executive Summary

The PMU admin reviewing the Portfolio Overview sees W3/Bilateral results that a Program/Accelerator rejected, but has no way to see why short of opening each one. The global filters that narrow the list live at the top of a page about 4,600 px long, far from the table. This spec puts Funding and Status filters next to the table (one shared state with the top bar) and writes the latest rejection reason, the rejecting P/A and the date into the Excel export.

## 3. Glossary

| Term | Meaning |
|---|---|
| Global selection | The page's single filter state (Program, Project, Center, Typology, Status, Funding) owned by the Portfolio Overview service |
| Results detail | The last block of the page: searchable, paged table + **Export to Excel** (FDE) |
| Funding | Global dimension with two values: `W1/W2` and `W3/Bilateral` (PFF) |
| Status slot | One of six page statuses: Editing, Quality Assessed, Submitted, Approved, Rejected, Discontinued |
| Rejection record | The newest `result_review_history` row with action `REJECT` (or legacy `REJECTED`) for a result |
| Dimensions map | The admin-only `portfolio/result-dimensions` response the page loads once per phase |

## 4. System Context & Scope

Current behavior (cited):

- The Results detail table receives the globally filtered rows (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.html:376-383`). Its toolbar holds Search and Export only (`components/results-detail/results-detail.component.html:14-38`).
- Global Status and Funding already exist (`services/portfolio-filters.ts:16`, `:59-63`). Selection changes go through `toggleValue` / `clearDimension` (`services/portfolio-overview.service.ts:553-564`).
- Funding only separates W1/W2 (combined) from W3/Bilateral (`portfolio-filters.ts:62-63`).
- The export has 13 columns with no rejection data (`components/results-detail/results-detail.rows.ts:161-175`).
- A reject sets `status_id` to Rejected and writes a history row in the **same transaction**. The row carries the justification and the deciding SP. Justification is mandatory on REJECT, and the reject is allowed only from Pending Review (`onecgiar-pr-server/src/api/results/results.service.ts:4366-4426`).
- Older history rows may use `REJECTED` and have a null `initiative_id` (`onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-review-history.interface.ts`, `isRejectAction` and the doc comment).
- Only results that pass through Pending Review (W3/Bilateral) reach Rejected. `UNVERIFIED — confirm at source before relying on it` (a second writer exists at `results.service.ts:4208`, settled in design)

### In scope

- The Filters dropdown in the Results detail toolbar (Funding, Status), bound to the global selection.
- Three rejection columns in the Excel export.
- A `rejections` array on the existing dimensions endpoint.

### Out of scope

- A table-only filter state; the other four dimensions in the table dropdown; a W1 vs W2 split.
- On-screen rejection reason (column or tooltip).
- Reasons for results that are no longer Rejected; the full rejection history.
- Any `/api/bilateral/*` payload change.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| PMU / portfolio lead (platform admin, the page is admin-only) | Filters by funding and status next to the list; sees why results were rejected in the export |
| Ticket requester (SR-168253) | Gets the rejection reasons |
| Other users | Nothing (admin-only page and endpoint) |

## 6. Functional Requirements

### PRE-R-1 Filters dropdown in the Results detail toolbar (MUST)

The Results detail toolbar SHALL show a **Filters** button between Search and Export to Excel. It opens a panel with two multi-select groups: **Funding** (W1/W2, W3/Bilateral) and **Status** (the six status slots, in the page's order).

#### Scenario: Open and read state

- GIVEN the page has figures and the global selection has Status = Rejected
- WHEN the admin opens Filters
- THEN Rejected is checked under Status and nothing is checked under Funding
- AND the button label shows the count of active values in those two groups (`Filters · 1`)
- BUT it must NOT show Program, Project, Center or Typology options

#### Scenario: No active values

- GIVEN no Funding and no Status value is selected
- THEN the button reads `Filters` with no count

### PRE-R-2 One selection state with the top bar (MUST)

A tick in the Filters panel SHALL change the same global selection the top filter bar uses, and vice versa.

#### Scenario: Tick from the table

- GIVEN no filter is active
- WHEN the admin ticks Funding → W3/Bilateral and Status → Rejected in the table's panel
- THEN the top filter bar shows those two values as active
- AND the KPI deck, the blocks and the table update together
- AND the table count equals the KPI total (FDE S-2.1 stays true)
- BUT it must NOT keep any filter state that only the table knows
- AND IT MUST behave exactly like ticking the same values in the top bar (same "Not affected by" behavior on single-source blocks)

#### Scenario: Tick from the top bar

- GIVEN the panel is closed
- WHEN the admin sets Status = Submitted in the top bar
- THEN opening the table's panel shows Submitted checked

### PRE-R-3 Clear in the panel (MUST)

The panel SHALL offer **Clear**, which removes every Funding and Status value.

#### Scenario: Clear keeps other dimensions

- GIVEN Program = SP01, Funding = W3/Bilateral and Status = Rejected are active
- WHEN the admin clicks Clear in the table's panel
- THEN Funding and Status become empty
- BUT Program = SP01 must NOT be cleared

### PRE-R-4 Panel hint (SHOULD)

The panel SHOULD show one line telling the admin that these filters also filter the whole page.

### PRE-R-5 Panel availability (MUST)

The Filters button SHALL follow the toolbar's existing states.

#### Scenario: Filters pending

- GIVEN the filters are pending (the dimensions map is loading)
- THEN the Filters button is disabled, like Export
- AND IT MUST be enabled again once the filters resolve, including when the filtered list is empty (so the admin can widen it)

> **Amended 2026-11-17 during `/akili-execute` (spec tension found in PRE-T-3; the Leader decided under the owner's delegation, recorded in `execution.md` → *Spec tension: PRE-R-5 vs the R-9 mount rule*).** "The filtered list is empty" means the table's **own** empty state: rows are listed but the search matches none (`detail-no-results`). When the **global** selection yields 0 results, the existing page rule is kept: the Results detail block, and with it the Filters button, is not rendered, and the no-match panel (`portfolio-no-match`, Clear all) plus the top filter bar let the admin widen the selection (FDE R-9, mount rule in the page `CLAUDE.md`). This spec does not change the mount rule.

### PRE-R-6 Accessible dropdown (MUST)

The Filters button and panel SHALL be keyboard and screen-reader operable to the same level as the top-bar multi-selects.

#### Scenario: Keyboard

- GIVEN focus is on Filters
- WHEN the admin presses Enter or Space
- THEN the panel opens and focus moves into it; Tab and Space toggle the options
- AND Escape closes the panel and returns focus to the Filters button
- AND the button exposes `aria-expanded` and an accessible name that includes the active count

### PRE-R-7 Rejection columns in the export (MUST)

The Excel export SHALL add three columns right after `Status`: `Rejection reason`, `Rejected by`, `Rejected on`. The export still contains exactly the listed rows (FDE-R-8), now in 16 columns.

#### Scenario: Rejected row

- GIVEN a listed result whose status is Rejected, with a rejection record (comment "Evidence link broken", SP `SP03`, 2026-11-10)
- WHEN the admin exports
- THEN its row has `Rejection reason` = `Evidence link broken`, `Rejected by` = `SP03 - <program name>` (the label format of the rejection notice), and `Rejected on` = `2026-11-10`
- AND IT MUST use the **newest** rejection record when the result was rejected more than once

#### Scenario: Non-rejected row

- GIVEN a listed result in any other status, even one rejected earlier and later resubmitted
- THEN the three cells read `—`

#### Scenario: Incomplete record

- GIVEN a rejected result with a null comment or a null deciding SP, or no rejection record at all
- THEN each missing value reads `—`
- BUT a cell must NOT be empty, `null` or `undefined`

#### Scenario: Map not ready

- GIVEN the dimensions map failed or is still loading
- THEN the three cells on rejected rows read `Unavailable`, like the Projects and Centers columns (FDE S-3.1)

#### Scenario: Legacy spelling

- GIVEN a rejected result whose newest rejection row has action `REJECTED`
- THEN it counts as a rejection record

### PRE-R-8 Rejection data from the server (MUST)

`GET api/results-framework-reporting/portfolio/result-dimensions` SHALL return `rejections` for the resolved version: one entry per active result in that version whose current status is Rejected and that has a rejection record. Each entry holds the result id, comment, deciding SP code, SP name and date.

#### Scenario: Version scoping and exclusions

- GIVEN version V with two rejected results and one approved result, and a rejected result in another version
- WHEN the endpoint is called for V
- THEN `rejections` has exactly the two rejected results of V
- BUT it must NOT include result types 10 and 11, inactive results, or results of other versions (same scope as the existing arrays)
- AND IT MUST keep the existing admin-only guard and the existing generic-500 error handling

### PRE-R-9 Long comments (MUST)

A rejection comment longer than Excel's 32,767-character cell limit SHALL be truncated to fit, so the file opens without repair.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No extra HTTP request. The added query runs inside the existing `Promise.all`, and the endpoint's p95 increase stays under 150 ms on the PROD-sized phase (measured on PRTest) |
| Security | Admin-only (unchanged guard). Comment text is never logged; on failure, the existing generic 500 with no SQL text |
| Backwards compatibility | Additive field on an internal admin endpoint; the existing fields are unchanged |
| Accessibility | WCAG 2.1 AA per `docs/ux-ui/design.md`; keyboard behavior per PRE-R-6 |
| i18n / copy | New strings in `PORTFOLIO_OVERVIEW_COPY.detail` (EN) |
| Layout | Toolbar stays on one row at 1280 px and wraps cleanly at 768 px, with no page-level horizontal scroll |

## 8. Defect Classes and Gates

| Defect class | Gate |
|---|---|
| Wrong rejection mapping (missing, wrong record, wrong `—`/`Unavailable`) | Client Jest on `results-detail.rows` (pure functions) |
| Export columns wrong at the file sink | Component Jest asserting the `exportExcel` call arguments (`KZ-changes--portfolio-overview-revamp--filtered-detail-export-1`) |
| Panel not bound to the global selection (local state, Clear wipes other dimensions) | Component Jest with the real service selection signal |
| Wrong SQL scope (version, status, newest record, legacy spelling) | Server Jest on the service mapping plus a **manual SQL check on PRTest** against known rejected results (Jest cannot run MySQL; substitute named) |
| Type-contract errors (DTO / interface) | `npx tsc --noEmit` / build on both packages (stricter than Jest) |
| Keyboard / focus behavior | Component Jest for Escape/focus return, plus a manual keyboard walk at the HITL pause |
| Toolbar layout at 768 / 1280 px | Rendered check in a real browser at the HITL pause (jsdom cannot measure layout) |
| Endpoint latency | PRTest timing before vs after (3 runs each). Accepted risk if the spread exceeds the effect |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| PRE-R-1 | Filters dropdown in the toolbar | MUST |
| PRE-R-2 | One selection state with the top bar | MUST |
| PRE-R-3 | Clear in the panel | MUST |
| PRE-R-4 | Panel hint | SHOULD |
| PRE-R-5 | Panel availability | MUST |
| PRE-R-6 | Accessible dropdown | MUST |
| PRE-R-7 | Rejection columns in the export | MUST |
| PRE-R-8 | Rejection data from the server | MUST |
| PRE-R-9 | Long comments | MUST |

## 10. Open Questions

None blocking. The proposal's OQ-1..3 were resolved with their defaults: no on-screen reason, keep `Rejected on`, only rows that are currently Rejected.
