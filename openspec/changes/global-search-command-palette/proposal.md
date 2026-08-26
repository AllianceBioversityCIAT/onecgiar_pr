# Proposal — Global search command palette (topbar)

**Jira ticket:** [P2-3401](https://cgiarmel.atlassian.net/browse/P2-3401) — *Revamp - Global search
palette (topbar Search)*, User Story under epic **P2-3172**. Notices:
[P2-3402](https://cgiarmel.atlassian.net/browse/P2-3402) (Indicators ships switched off) and
[P2-3403](https://cgiarmel.atlassian.net/browse/P2-3403) (the topbar Search box stops being a field
— written as a behaviour removal, business must object before release if they want the old inline
field back). Technical detail:
[P2-3413](https://cgiarmel.atlassian.net/browse/P2-3413) (`Technical documentation`).

**Original note, kept for the record:** at proposal time Searched project P2 for `search` / `palette` / `spotlight`
no ticket existed. The search covered `search` / `palette` / `spotlight`
in summaries plus the children of both revamp epics — **P2-3172** (Reporting Tool - Revamp) and
**P2-3273** (Small adjustment for reporting tool in 2026); nothing asked for a global search,
spotlight or command palette. The closest hits are all scoped, unrelated searches already shipped:
P2-3141 (KPI search bar at AoW level), P2-2336 / P2-1871 / P2-2650 (the OpenSearch indexing +
search-interface epic), P2-2155 (reuse elastic search at result creation), P2-1542 (Lead Contact
Person search). The work is driven by the approved Claude Design — the topbar
in the live mockup binds its Search control to `openPalette` — and P2-3401 was opened to carry it.

**Scope type:** **Frontend-only.** No backend change is required or requested. Every endpoint this
change consumes already exists and was verified live against `https://prtest-back.ciat.cgiar.org`
on 2026-08-21. One client-side interface gains a field (see Impact).

## Why

The topbar "Search" box is the only global entry point in the whole application, and today it is
wired to exactly one screen: typing filters the Results Center list, and Enter navigates there
(`shell-topbar.component.ts:114-126`). A user who knows the name of a result in another programme,
or who wants to jump to a programme, has no way to get there from where they are — they must
navigate the sidebar to the right programme first and then search inside it.

The approved Claude Design replaces that box with a **command palette**: one keystroke, one input,
and grouped results across the whole platform. The design's topbar control is already a button bound
to `openPalette` (`.design-snapshots/PRMS-Reporting.dc.html:232`), so the current in-topbar input is
the stale half of a change the design has already made.

## What Changes

- **BREAKING (user-visible behaviour):** the topbar Search control stops being a live
  `<input type="search">` that filters the Results Center list, and becomes a **button** that opens
  the palette — matching `PRMS-Reporting.dc.html:232`. The old "type here to filter the list"
  affordance disappears from the topbar. Filtering the Results Center list is still possible from
  that page's own search box, and the palette's result rows navigate straight to a result, which is
  what the topbar box was being used for in practice.
- **New overlay:** a centred, backdrop-dimmed, focus-trapped command palette with a search input,
  an `All programs` scope selector, an `Esc` hint, and results grouped under uppercase eyebrow
  headings carrying counts.
- **Three groups, two of them live:**
  - **`RESULTS (n)`** — implemented. Server-side free-text title search across programmes, each row
    showing the programme code chip, the title (ellipsised) and the status pill.
  - **`INDICATORS`** — ships **visible but disabled with a `Coming soon` tag**, in the position the
    design gives it. No endpoint accepts a text query for indicators, and the dotted
    `HL01.AOW1.K1` code the design shows is not a field anywhere — it is regex-parsed out of a
    free-text ToC title in the client (`dashboard-lab.component.ts:1976-1991`). Building it honestly
    needs a new server endpoint and a real indicator-code column. Becomes a notification ticket
    for Ángel.
  - **`PROGRAMS (n)`** — implemented. Filtered in memory from the science-programme list the shell
    already holds; coloured dot, mono code, name.
- **New global shortcut:** `Cmd/Ctrl+K` opens (and toggles) the palette. `Cmd/Ctrl+B` is already
  taken by the Spartan sidebar toggle (`hlm-sidebar.service.ts:47-53`); `Cmd/Ctrl+K` is free, and the
  app has no global shortcut of its own today.
- **Keyboard support is part of the feature, not a nicety:** `↑`/`↓` move the active row, `Enter`
  activates it, `Esc` closes, focus is trapped while open and restored to the trigger on close.
- **Two Spartan components get generated** into `src/app/spartan/`: `command` (the palette's
  listbox/option/group/activedescendant machinery) and `dialog` (the focus-trapped overlay). Neither
  exists in the project yet.

## Capabilities

### New Capabilities
- `global-search-palette`: the palette as a capability — how it opens and closes, what the scope
  selector scopes, the per-group search and match rules, group counts, empty/loading/too-short
  states, row activation and navigation targets, the disabled `Coming soon` group, and the full
  keyboard and screen-reader contract.

### Modified Capabilities
<!-- none. No spec under openspec/specs/ currently covers the shell topbar or its search control;
     the behaviour change to that control is documented inside the new capability above. -->

## Impact

**Client (new):**
- `src/app/shared/components/global-search-palette/` — the palette component, its search service,
  specs, and a folder `CLAUDE.md`.
- `src/app/spartan/command/` and `src/app/spartan/dialog/` — generated via
  `ng g @spartan-ng/cli:ui --name=command` and `--name=dialog`. `@spartan-ng/brain` 1.1 already ships
  both primitives in `node_modules`; only the styled Helm layer is missing.

**Client (modified):**
- `src/app/shared/components/shell-topbar/shell-topbar.component.html|ts` — the Search input becomes
  a button that opens the palette; `onSearchInput`/`onSearchSubmit` and the
  `ResultsListFilterService` coupling are removed from the topbar.
- `src/app/shared/services/api/api.service.ts:24-34` — the `SearchParams` interface gains an optional
  `title` field. The server already accepts and honours it; the client type simply cannot express it.

**Client (reused, read-only):**
- `ResultsApiService.GET_AllResultsWithUseRole` (`results-api.service.ts:51-77`) — the results query.
- `ResultFrameworkReportingHomeService.mySPsList()/otherSPsList()/otherProjectsList()`
  (`result-framework-reporting-home.service.ts:48-50`) — the already-loaded programme list.
- `ReportingNavSidebarComponent.programDotColor()` (`reporting-nav-sidebar.component.ts:595-613`) —
  the deterministic, contrast-checked programme dot palette.
- `STATUS_TOKENS` (`result-header.component.ts:17`, copied in
  `programme-results.component.ts:99`) — the fixed `--pr-status-*` fg/bg pairs.
- `report-result-form.component.ts:396-406` — the house debounce/cancel pipeline shape.

**Server:** none. `GET /api/results/get/all/roles/filter/:userId` already accepts `title`
(`results.controller.ts:251-256`, `result.repository.ts:705-708`) and returns `title`, `submitter`
(the `SP01` code) and `status_name`.

**Explicitly NOT used:** the Elasticsearch path. `GET_FindResultsElastic`
(`results-api.service.ts:104-170`) posts directly to AWS ES with hardcoded Basic auth, and its
document shape (`elastic.interface.ts:13-23`) carries **no programme code and no status** — it cannot
draw the design's result row. The server exposes only admin ingest/reset on that index, no query
endpoint (`elastic.controller.ts:16-43`).

**SDD baseline:** aligns with `docs/ux-ui/design.md` (shell/topbar navigation, consistent
search UX) and `docs/trd/trd.md` (standalone components, signals, OnPush).
No module spec exists under `docs/specs/` for the shell.

**QA:** the disabled `INDICATORS` group is deliberate and must not be reported as a bug. The
verification steps in `tasks.md` name the portfolio and phase to test with.
