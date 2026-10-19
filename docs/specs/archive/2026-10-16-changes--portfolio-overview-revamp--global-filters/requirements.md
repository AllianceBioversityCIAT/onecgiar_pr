# Requirements — Portfolio Overview: global filters

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/global-filters/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #6) |
| Depends on | #1–#5, #7, #8, #10: all `done` (family manifest). No warning |
| Blocks | #9 `filtered-detail-export` (consumes the filtered row set) |
| Module | Server: `api/results-framework-reporting` (one new read endpoint). Client: `result-framework-reporting` › `portfolio-overview` (page, service, 4 blocks, new filter bar) |
| Type | Change |
| Depth | **Full**: a new admin API endpoint plus a cross-cutting client change that touches every section of the page |
| Approval Mode | gated |
| Status | approved (2026-10-16, Phase 1 gate; GLF-OQ-1..6 at defaults). GLF-R-5 amended in Phase 2: the Results Center link needs at most one Program and one Status |
| Source | [`proposal.md`](./proposal.md), Option A; OQ-1..5 carried at their recommended defaults (§10) |
| Requirement prefix | `GLF` |
| PRD | `US-P1` (PMU tracks progress), `AC-3` (backend role check), `AC-5` (phase-scoped reads) |

## 2. Executive Summary

The stakeholder wants one set of filters, *Program/Accelerator · W3/Bilateral project · Center · typology · status*, that applies to every chart on `/portfolio-overview`.

This spec adds a **filter bar** at the top of the page. Every section reacts to it in one of two ways:

| Section | Honours | How |
|---|---|---|
| KPI deck, Results Reporting Status, Results by typology | all 5 | recomputed from the filtered result rows |
| CGIAR Centers | all 5 | its own rows, filtered on the client |
| Progress against ToC KPIs | Program | shows only the selected P/As; summary recomputed |
| W3/Bilateral projects | Program, Center | bars and table show only the selected P/As / Centers; KPI figures stay portfolio-wide |

When a filter is active that a section does not honour, that section says so in place ("Not affected by: …"). **No section shows unfiltered figures as if they were filtered.**

The page rows carry no project and only the lead Center. A new admin-only endpoint returns, per result of the page version, its linked projects and its lead and contributing Centers. The Results Center query is not touched.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Page rows | The open-phase result rows the page already loads (one request, up to 20,000) |
| Filtered rows | Page rows that match every active filter dimension |
| Dimension | One of: Program, Project, Center, Typology, Status |
| Selection | The set of values picked in a dimension. Empty = the dimension is inactive |
| P/A | Program or Accelerator, by official code (`SP01`…, `A…`); on a result row it is the `submitter` |
| Result Center | A Center that **leads or contributes** to a result: an active `results_center` row |
| Result project | A CLARISA project with an active `results_by_projects` link to the result, any source |
| Typology | Result level (Output / Outcome / Impact / Unclassified) and result type. The level comes from the type, using the map the typology block already uses |
| Status slot | One of the six status groups the status section shows: Editing, In QA, Submitted (includes Pending review), Approved, Rejected, Discontinued |
| Dimensions map | The new endpoint's answer: result → projects and result → Centers, for one version |
| Honoured / not affected | A section *honours* a dimension when its figures change with it. Otherwise it is *not affected* and says so |

## 4. Scope

**In**
- A filter bar with 5 multi-select dimensions, chips for active values, "Clear all", and a "N of M results" count.
- Filter state mirrored in the URL.
- A new admin-only endpoint: the dimensions map plus the project and Center option labels.
- The KPI deck, status section and typology block driven by the filtered rows.
- The ToC KPI, Projects and Centers blocks narrowed as in §2.
- A "Not affected by" note, a "No results match these filters" state, and degraded behaviour when the dimensions map fails.
- The page's status-tile selection becomes the global Status filter (replaces `selectedStatusFilter`).
- Copy, page `CLAUDE.md`, and scoped Jest specs (server + client).

**Out**
- Any change to `AllResultsByRoleUserAndInitiativeFiltered` or to the Results Center list.
- Any change to what a ToC KPI is or what "covered" means (#5 / #10), and to the Projects aggregate's rules (#8).
- Filtering the Projects KPI figures, or the ToC block by anything but Program.
- A results list or export (#9).
- Saved / named filter presets.

## 5. Personas

Admin / PMU readers of `/portfolio-overview`. The page has `CheckAdminGuard`, and the new endpoint checks the Admin role on the server.

## 6. Functional Requirements

### GLF-R-1 — The filter bar

The page SHALL show a filter bar above the KPI deck with five multi-select controls, in this order:

1. Program/Accelerator
2. W3/Bilateral project
3. Center
4. Typology
5. Status

It SHALL also show:
- one removable chip per selected value;
- a **Clear all** action, visible only when something is selected;
- the count **"N of M results"**, where N = filtered rows and M = page rows.

The bar SHALL render only once the page rows are loaded, and SHALL NOT render in the page error state.

#### Scenario S-1.1: Chips and count
- GIVEN 6,094 page rows, of which 1,284 are led or contributed by CIAT
- WHEN the user selects Center = CIAT
- THEN a chip "CIAT" appears with a remove control
- AND the count reads "1,284 of 6,094 results"
- AND **Clear all** is visible
- BUT with nothing selected, there are no chips, no **Clear all**, and the count reads "6,094 results"

### GLF-R-2 — Matching rule

A row SHALL match when it matches **every** active dimension. It matches a dimension when it has **at least one** of the selected values (OR inside a dimension, AND across dimensions).

| Dimension | A row matches when |
|---|---|
| Program | its P/A is selected |
| Project | at least one of its result projects is selected |
| Center | at least one of its Result Centers (lead **or** contributing) is selected |
| Typology | its type is selected. Selecting a level selects every type of that level |
| Status | its status slot is selected |

#### Scenario S-2.1: AND across, OR inside
- GIVEN rows
  - R1 (SP02, lead CIAT, Output, Editing)
  - R2 (SP02, contributor CIAT, Outcome, Submitted)
  - R3 (SP03, lead IRRI, Output, Editing)
- WHEN Program = {SP02, SP03} and Center = {CIAT}
- THEN R1 and R2 match, and R3 does not
- AND adding Status = {Editing} leaves only R1

#### Scenario S-2.2: Contributing Center counts
- GIVEN R2's lead Center is ILRI and CIAT only contributes
- WHEN Center = {CIAT}
- THEN R2 matches
- BUT a row whose only link to CIAT is an **inactive** `results_center` row must NOT match

#### Scenario S-2.3: Project link of any source
- GIVEN project P is linked to a W3 result R4 and to a W1/W2 result R5, and both links are active
- WHEN Project = {P}
- THEN R4 and R5 both match
- AND IT MUST ignore inactive links

#### Scenario S-2.4: Typology by level
- WHEN the user selects the level "Outcome"
- THEN every Outcome type (Policy change, Innovation use, Capacity change, Other outcome) is selected
- AND rows whose type is unclassified must NOT match unless "Unclassified" is selected

### GLF-R-3 — Filter options come from the data

Each control SHALL list only values present in the page data, never a hardcoded list:

| Dimension | Options | Order | Label |
|---|---|---|---|
| Program | P/As present in the page rows | Natural code order (`SP01`…`SP13`, then Accelerators) | `code — short name` |
| Project | Projects linked to ≥ 1 **W3/Bilateral** page row | By short name, A→Z | Short name (full name as a hint) |
| Center | Centers that lead or contribute to ≥ 1 page row | By acronym, A→Z | Acronym |
| Typology | Grouped by level (Output, Outcome, Impact, then Unclassified), with the types present under each | Fixed level order; types A→Z inside each level | Level, then type |
| Status | The six status slots | The status section's order | Slot label |

The Project and Center controls SHALL offer a text search inside the list.

#### Scenario S-3.1: W1/W2-only project is not an option
- GIVEN project Q is linked only to W1/W2 page rows
- THEN Q must NOT appear in the Project list
- BUT a project linked to both W1/W2 and W3 rows appears, and selecting it matches both rows (S-2.3)

### GLF-R-4 — Row-driven sections follow the filtered rows

The KPI deck, the Results Reporting Status section (donut, tiles, strip) and the Results by typology block SHALL compute every figure from the **filtered rows**. "Clear all" SHALL restore the unfiltered figures exactly.

#### Scenario S-4.1: Reconciliation
- GIVEN any filter selection with N filtered rows
- THEN the KPI total = N
- AND the status total = N
- AND the typology level cards sum to N
- AND the KPI breakdowns still reconcile: New + Replicated = card total

### GLF-R-5 — Status tiles drive the global Status filter

Clicking a status tile or donut segment in the status section SHALL toggle that slot in the global Status filter. It SHALL behave exactly like the Status control: the chip, the URL and every section update.

The section's "Active filter" strip and its **View in Results Center** link SHALL stay, but now reflect the global selection:
- The strip SHALL show only when at least one filter is active.
- The link SHALL show only when every active dimension is one the Results Center can apply, which today means **at most one** Program and **at most one** Status. The Results Center takes one status and puts the program in its text search. Otherwise the link SHALL be hidden, never pointing to a list that does not match.

This replaces the page-local status highlight, which filtered no data. It also removes the defect where the strip always read "Active filter: all".

#### Scenario S-5.1: Tile toggles the global filter
- GIVEN no filter
- WHEN the user clicks the Editing tile
- THEN Status = {Editing}, the chip appears, and the KPI total equals the Editing count
- AND clicking it again clears it

#### Scenario S-5.2: Link only when Results Center can match
- GIVEN Status = {Editing} and Program = {SP02}
- THEN **View in Results Center** is shown, with program and status applied
- BUT with Center = {CIAT} also selected, the link must NOT show
- AND with Status = {Editing, Approved} (two values), the link must NOT show

### GLF-R-6 — ToC KPI block honours Program only

When Program is active, the ToC KPI block SHALL list only the selected P/As, and its portfolio summary (covered / total and %) SHALL describe only those P/As. The block SHALL NOT re-request data when filters change.

#### Scenario S-6.1
- GIVEN SP01 has 10/40 KPIs covered and SP02 has 5/10
- WHEN Program = {SP01, SP02}
- THEN only SP01 and SP02 are listed
- AND the summary reads 15 / 50 (30%)
- AND IT MUST make no new request

### GLF-R-7 — Projects block honours Program and Center

- When Program is active, the **By P/A** view of the W3/Bilateral projects block SHALL list only the selected P/As.
- When Center is active, the **By Center** view SHALL list only the selected Centers. Unassigned SHALL be hidden while Center is active.
- The block's three KPI figures SHALL stay portfolio-wide, and the block SHALL say so while Program or Center is active.

  A project mapped to several P/As counts once in the totals, so the totals cannot be derived from the visible rows.
- The block SHALL NOT re-request data when filters change.

#### Scenario S-7.1
- GIVEN Center = {CIAT}
- THEN By Center shows only CIAT, Unassigned is hidden, and the KPI figures are unchanged
- AND the block shows "Totals cover the whole portfolio" alongside its "Not affected by" note

### GLF-R-8 — Centers block honours all five

The CGIAR Centers block SHALL apply the global filters to its own rows:
- Center limits which Centers are shown and counted.
- Program uses each row's P/A.
- Project uses the same rule as the page (any active project link, through the dimensions map). This holds when the block's phase is the page version. Otherwise (between cycles, A-3), Project is not honoured by this block, and GLF-R-9 says so.
- Typology uses each row's type.
- Status uses each row's status slot.

Its local origin buttons (New / Replicated) and status tiles SHALL keep working as a refinement **inside** the global selection.

Its KPI cards (total, New, Replicated, % approved, Centers reporting) SHALL follow the global filters and SHALL keep ignoring the local origin buttons (rule DD-4 of #3).

#### Scenario S-8.1
- GIVEN Typology = {Output}
- THEN every Center figure counts only Output rows
- AND New + Replicated = the block total
- AND choosing the local "Replicated" origin narrows the donut and tiles, but must NOT change the KPI cards

#### Scenario S-8.2: Center filter narrows to those Centers
- GIVEN Center = {CIAT, IRRI}
- THEN the block shows and counts only CIAT and IRRI
- AND "Centers reporting" is out of the selected Centers (e.g. "2 of 2")

### GLF-R-9 — "Not affected by" note

While a dimension is active that a section does not honour, that section SHALL show one line, "Not affected by: <dimensions>". It SHALL list exactly the active, un-honoured dimensions, in bar order. It SHALL disappear when none apply.

#### Scenario S-9.1
- GIVEN Center = {CIAT} and Status = {Editing}
- THEN the ToC KPI block reads "Not affected by: Center, Status"
- AND the Projects block reads "Not affected by: Status"
- BUT the KPI deck, status section, typology and Centers blocks show no such line

### GLF-R-10 — No match

When the filtered rows are empty, the KPI deck, status section and typology block SHALL be replaced by one message, *"No results match these filters."*, with a **Clear all** action. The page SHALL NOT show its "no results in this phase" empty state because of filters. The other blocks keep their own rules (GLF-R-6..8).

#### Scenario S-10.1
- GIVEN Program = {SP05} and Status = {Rejected}, which match nothing
- THEN the no-match message shows with **Clear all**
- AND the ToC KPI block still lists SP05
- BUT the "no results in this phase" state must NOT appear

### GLF-R-11 — The dimensions map endpoint

The server SHALL expose `GET` portfolio result dimensions for one version, with the same `versionId` coercion and fallback as the existing portfolio endpoints. It SHALL return:

1. **Project links:** each active result of the version paired with each project of an active link. Each pair appears once.
2. **Center links:** each active result of the version paired with each Center of an active `results_center` row, lead or contributing. Duplicate active rows for the same Center count once.
3. **Project labels:** id, short name and full name for every project in (1).
4. **Center labels:** code, acronym and name for every Center in (2).

It SHALL include W1/W2 and W3 results, and SHALL use the same result-type exclusions as the page rows (types 10 and 11). No list SHALL be truncated by a string-length limit.

#### Scenario S-11.1: Duplicates and inactive rows
- GIVEN result R has two active `results_center` rows for CIAT and one inactive row for IRRI
- THEN Center links contain (R, CIAT) exactly once
- AND IT MUST NOT contain (R, IRRI)

#### Scenario S-11.2: Long lists
- GIVEN a result linked to 200 Centers or projects
- THEN all 200 pairs are returned

### GLF-R-12 — Backend authorization

The endpoint SHALL require a valid JWT (`auth` header) **and** the Admin application role. A non-admin caller SHALL get 403 with no data (`AC-3`). The route SHALL NOT fall under any JWT-exempt path.

### GLF-R-13 — Dimensions map failure and loading

The page SHALL request the dimensions map once per page load, plus once per Retry.

| State | Behaviour |
|---|---|
| Loading | The Project and Center controls are disabled with a loading hint. The other three work. |
| Failed | The Project and Center controls stay disabled, with *"Project and Center filters are unavailable."* and **Retry**. The other three work. |
| Loaded | All five work. |

If a Project or Center selection is present (e.g. from the URL) before the map is loaded, the row-driven sections SHALL show their loading skeleton rather than unfiltered figures. If the map fails, those selections SHALL be dropped, and the page SHALL say so in one line.

#### Scenario S-13.1
- GIVEN the map request fails with a 500
- THEN Program, Typology and Status still filter every section
- AND Project and Center show the unavailable message and Retry
- BUT a row must NOT be treated as matching or not matching a Center when the map is missing

### GLF-R-14 — Filters in the URL

The selection SHALL be mirrored in query params: `program`, `project`, `center`, `typology`, `status`, with comma-separated values. Mirroring SHALL replace the history entry, not push one.

Loading the page with those params SHALL restore the selection. Unknown values SHALL be dropped silently.

#### Scenario S-14.1
- GIVEN `?program=SP02,ZZ99&status=editing`
- WHEN the page loads
- THEN Program = {SP02} and Status = {Editing}
- AND `ZZ99` is dropped from the URL
- AND IT MUST NOT add a history entry per filter change

### GLF-R-15 — Phase and partial guards unchanged

The selection SHALL NOT change which phase the page describes, nor the closed-phase banner. The partial-results banner ("Showing the first N results") SHALL stay visible and keep its unfiltered count under any filter.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Client performance | Recomputing every row-driven figure after a filter change takes ≤ 150 ms for 20,000 rows on a dev laptop (Chrome performance panel, median of 5) |
| Endpoint performance | p95 ≤ 3 s on prdb-sized data, from 3 timed calls at the HITL check |
| Correctness parity | For 2 selections (one Center-only, one Project-only), the filtered KPI total equals an independent SQL count run by the user |
| Security | JWT + Admin role. Only bound parameters. No SQL text or stack in error bodies or logs (KZ lesson of #5: "stop logging the coverage query text") |
| Backwards compatibility | Additive endpoint, no migration. The body of `AllResultsByRoleUserAndInitiativeFiltered` (`result.repository.ts:686`) is unchanged (diff check); a new method in the same file is allowed |
| Accessibility | WCAG 2.1 AA. Every control is keyboard-operable, with a combobox/listbox pattern and an accessible name. Chip remove buttons are named "Remove <value>". The count is in a polite live region |
| Responsive | At 375 px the bar collapses to a "Filters (n)" button opening a sheet. No horizontal page scroll at 375 / 768 / 1280 |
| Design rules (client `CLAUDE.md` §5) | Spartan primitives, Tailwind-first, `var(--pr-*)` tokens only, `font-mono tabular-nums` for counts |
| i18n / copy | Every new string in `portfolio-overview.copy.ts` (Centers-block strings in `portfolio-centers-block.copy.ts`) |
| Folder docs | `portfolio-overview/CLAUDE.md` updated and re-stamped in the same commit |

## 8. Defect classes → the gate that catches each

| Defect class | Gate |
|---|---|
| Wrong matching (OR/AND swapped, level not expanding to types, lead-only Center) | Client Jest on a pure matcher, covering S-2.1..S-2.4 |
| A figure reading unfiltered rows (one computed missed) | Client Jest on the service: for one selection, KPI total = status total = typology sum = N (S-4.1) |
| Endpoint duplicates or inactive leaks, truncated lists | Server Jest on the query's predicates and the service dedupe (S-11.1). **Truncation and real duplicates: only live parity proves the SQL**, at HITL |
| Wrong role / JWT-exempt path | Server Jest on guard metadata (presence only). **Behaviour: one manual non-admin call at HITL** |
| ToC summary or Projects rows not narrowed, or a refetch on filter change | Client Jest on each block: rows, summary and HTTP call count (S-6.1, S-7.1) |
| Centers block: origin leaking into KPI cards, or global filter not applied | Client Jest on the aggregate (S-8.1, S-8.2) |
| Wrong "Not affected by" list | Client Jest on the pure function mapping (active dimensions, section) to a list (S-9.1) |
| Unfiltered figures shown during map loading or failure | Client Jest with a pending / failing map request (S-13.1) |
| URL round-trip, history spam | Client Jest with the router testing harness (S-14.1) |
| Parity with the database | **No automated gate.** User-run SQL at HITL (§7). Reported verbatim; a mismatch stops the task |
| Bar layout at 375 / 768 / 1280, sheet, chip wrap, focus order | **jsdom cannot lay out or move focus realistically.** Browser check at the HITL pause (read-only: never click write buttons, memory "browser checks hit shared prdb") |
| Client recompute time | **No automated gate.** Measured manually at HITL. A spread > 2× the median across 5 runs is reported, not taken as evidence |

## 9. Dependencies & Assumptions

- **A-1:** `results_center.center_id` is the CLARISA Center code, and the Centers block's per-Center rows are keyed by the same code. The page's `lead_center` is an acronym only, so Center matching on the page rows uses the dimensions map, never `lead_center`.
- **A-2:** The page's `RawResult.id` is the result id (`r.id`), the same id the map returns.
- **A-3:** The Centers block reads the open P25 phase. The page reads the open phase, or the newest one when nothing is open. They describe the same phase except between cycles. Then the Centers block is already on its own phase (pre-existing, unchanged).
- **A-4:** A ToC KPI belongs to one P/A, so the summary for a P/A set is the sum of their rows. This is checked against the server's portfolio summary in design (premise ledger).
- **Known, out of scope:** the page query's left join on lead Centers can repeat a row when a result has two active lead rows (SR-164368). This spec does not change the page query. Parity checks count distinct result ids, and the duplication is reported as a follow-up if seen.

## 10. Open Questions (proposal defaults applied; confirm at the Phase 1 gate)

| ID | Question | Default applied |
|---|---|---|
| GLF-OQ-1 | Project options and matching | Options: projects linked to ≥ 1 W3 row. Matching: any active link, any source (GLF-R-2, R-3) |
| GLF-OQ-2 | Typology control | Grouped by level; a level selects all its types (GLF-R-2) |
| GLF-OQ-3 | Global Status vs existing status controls | Status tiles become the global filter. The Centers block tiles refine inside it. DD-4 holds (GLF-R-5, R-8) |
| GLF-OQ-4 | Program for W3 rows | `submitter`, the mapped P/A (GLF-R-2) |
| GLF-OQ-5 | URL sync | In scope (GLF-R-14) |
| GLF-OQ-6 | Projects block KPI figures under a filter (new) | Stay portfolio-wide, labelled as such (GLF-R-7). Filtering them would need per-project facts on the client, which is a change to #8 |

## 11. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| GLF-R-1 | Filter bar | SHALL |
| GLF-R-2 | Matching rule | SHALL |
| GLF-R-3 | Options from data | SHALL |
| GLF-R-4 | Row-driven sections | SHALL |
| GLF-R-5 | Status tiles → global Status | SHALL |
| GLF-R-6 | ToC KPI: Program | SHALL |
| GLF-R-7 | Projects: Program + Center | SHALL |
| GLF-R-8 | Centers: all five | SHALL |
| GLF-R-9 | "Not affected by" | SHALL |
| GLF-R-10 | No match | SHALL |
| GLF-R-11 | Dimensions endpoint | SHALL |
| GLF-R-12 | Backend authorization | SHALL |
| GLF-R-13 | Map failure / loading | SHALL |
| GLF-R-14 | URL sync | SHALL |
| GLF-R-15 | Phase / partial guards | SHALL |
