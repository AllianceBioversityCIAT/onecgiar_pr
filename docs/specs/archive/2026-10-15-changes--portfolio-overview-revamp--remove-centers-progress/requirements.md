# Requirements — CGIAR Centers block: remove "Progress by Center"

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-centers-progress/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #7; runs before #3 `centers-new-vs-replicated`, see `family.md`) |
| Module | `result-framework-reporting` › `portfolio-overview` › `components/centers-block/` (client only) |
| Type | Change |
| Depth | Lite (removes one card from one component and relocates its error recovery; no data or API change) |
| Approval Mode | gated |
| Status | approved (2026-10-15, Phase 1 gate) |
| Source | `proposal.md` (stakeholder email "RE: Reporting monitoring dashboard", item 9, `image007.png`). Its open question was delegated to the default by the user on 2026-10-15 |
| Requirement prefix | `RCP` |

## 2. Executive Summary

The stakeholder asked to remove the **"Progress by Center"** card. Their reason: progress can only be assessed against planning, and there is no planning data for W3/Bilateral results. This spec removes that card from the CGIAR Centers block, in both its table and chart views.

The card also held the block's only error recovery: a per-Center **Retry** link and the "some rows could not be loaded" note. Both move into the Reporting status card, so a failed Center is still visible and recoverable. The block keeps its header, its KPI cards and its status donut + tiles, and their figures do not change.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Centers block | `app-portfolio-centers-block`, the last section of `/portfolio-overview`. It shows W3/Bilateral results per CGIAR Center for the open P25 phase |
| Progress by Center card | The card titled "Progress by Center", with a Table View / Chart View toggle, a search box, a sortable per-Center status table with an "All" footer, and a stacked-bar chart |
| Reporting status card | The card in the same block that holds the status donut, the status tiles and the active-filter strip |
| Failed Center | A Center whose `GET_bilateralCenterResults` call errored. Its numbers are left out of every total |

## 4. Scope

**In:**
- Remove the Progress by Center card and everything that only it used.
- A partial-data note and a "Retry failed Centers" action in the Reporting status card.
- An empty-state message when the Centers catalogue is empty.
- Copy, specs and the folder `CLAUDE.md`.

**Out:**
- The KPI cards (family #3 makes them New vs Replicated).
- The data path (one call per Center).
- The Center Overview page.
- Any other section of `/portfolio-overview`.

## 5. Personas

Admin and PMU readers of `/portfolio-overview` (`CheckAdminGuard`).

## 6. Functional Requirements

### RCP-1 — Progress by Center card removed (MUST)

The Centers block SHALL NOT render the Progress by Center card in any view.

- GIVEN an admin opens `/portfolio-overview` and the Centers block has loaded
- WHEN the block renders
- THEN no card titled "Progress by Center" is present
- AND there is no Table View / Chart View toggle, no "Search center…" box, no per-Center status table and no per-Center bar chart
- AND the block shows, in order: header with phase chip, KPI cards, Reporting status card
- BUT it must NOT remove or alter the header, the phase chip, the KPI cards or the Reporting status card
- AND IT MUST NOT render a loading skeleton for the removed table while the block is loading

### RCP-2 — Figures unchanged (MUST)

The KPI cards, the donut and the status tiles SHALL show the same numbers as before the removal.

- GIVEN the same per-Center responses as before the change
- WHEN the block renders
- THEN "W3/Bilateral results", "% approved", "Centers reporting N / M", and every tile count and percentage equal their values before the change
- AND IT MUST keep one `GET_bilateralCenterResults` call per Center for the open P25 phase, and no new request

### RCP-3 — Status tile filter still works without a table (MUST)

Clicking a status tile or a donut slice SHALL still toggle the status filter.

- GIVEN the Reporting status card is rendered
- WHEN the reader clicks a status tile (or its donut slice)
- THEN the tile is marked pressed and the donut highlights that status
- AND the "Active filter" strip shows the status label and a "View in Results Center" link carrying `?status=<id>`
- WHEN the reader clicks the same tile again, or "Clear filter"
- THEN the filter clears
- BUT it must NOT depend on any sort or search state (the table is gone)

### RCP-4 — Failed Centers stay visible and recoverable (MUST)

When at least one Center call fails, the Reporting status card SHALL say that the totals are partial and SHALL offer one action that retries every failed Center.

- GIVEN the Centers list loaded and the call for ≥1 Center failed
- WHEN all other calls have finished
- THEN the card shows "Some Centers could not be loaded, so the totals leave them out." and a "Retry failed Centers" button
- WHEN the reader clicks "Retry failed Centers"
- THEN each failed Center (and only those) is requested again, and the KPI cards, donut and tiles update as the responses arrive
- AND the note and the button disappear once no Center is in the failed state
- BUT a second click while a retry is still loading must NOT fire duplicate requests for the same Center
- AND IT MUST NOT show the note or the button when no Center has failed

### RCP-5 — Empty catalogue says so (SHOULD)

When the Centers catalogue returns no Center with a code, the block SHOULD say "Nothing to show." instead of an empty donut and nothing else. Before this change the table carried that message.

- GIVEN the catalogue is empty (or every entry lacks a code)
- WHEN the block renders
- THEN "Nothing to show." is visible in the Reporting status card
- AND no per-Center request is made

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| RCP-N1 | No dead code is left behind. Signals, computeds, chart builders, icons, copy keys and spec cases that only served the removed card are deleted together. Code still used by the KPI cards, donut or tiles stays |
| RCP-N2 | No server change and no new HTTP request |
| RCP-N3 | New and changed strings live in `internationalization/portfolio-centers-block.copy.ts` (client CLAUDE.md §5/§10) |
| RCP-N4 | `portfolio-overview/CLAUDE.md` is updated: the Centers block contents, and "Progress by Center" added to the "Removed on purpose" list. Its `Verified:` line is re-stamped |
| RCP-N5 | Accessibility: "Retry failed Centers" is a real `<button>`. The partial note sits in a live region (`role="status"`) so a screen reader hears it when it appears |

## 8. Defect classes → gate

| Defect class this spec can produce | Caught by |
|---|---|
| Dangling template reference to a removed signal or copy key (`tsc` does not check templates) | `npm run build:dev` (template typecheck) |
| Unused imports or icons left behind | `npx eslint <touched files> --quiet` |
| Specs still asserting the table, the sort or the search | Scoped Jest: `npm run test:local -- --testPathPattern=centers-block` (`--maxWorkers=2`) |
| Figures changed by accident (RCP-2) | Existing KPI and segment specs kept unchanged, plus `centers-block.aggregate.spec.ts` |
| Retry fires for healthy Centers, duplicates a request, or never clears the note (RCP-4) | Component spec with one failing Center, a double-click, and recovery |
| Layout gap or orphan wrapper where the card was | **No automated check** (jsdom cannot see layout). Substitute: a read-only browser check at the HITL pause at 1440px and 768px (served bundle confirmed first; no write buttons, per memory) |

## 9. Requirement ID Index

| ID | Strength | Owner task |
|---|---|---|
| RCP-1 | MUST | see `tasks.md` |
| RCP-2 | MUST | see `tasks.md` |
| RCP-3 | MUST | see `tasks.md` |
| RCP-4 | MUST | see `tasks.md` |
| RCP-5 | SHOULD | see `tasks.md` |
| RCP-N1..N5 | MUST | see `tasks.md` |

## 10. Open Questions

| ID | Question | Decision |
|---|---|---|
| OQ-1 | Remove the status donut and tiles as well? | No: keep them (delegated default, 2026-10-15). They show reporting status, not progress |
