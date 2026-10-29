# Requirements — Portfolio Overview: remove rankings, clarify the status section

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-rankings-status-copy/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #2 — after `kpi-breakdown`, see `family.md`) |
| Module | `result-framework-reporting` › `portfolio-overview` (client only) |
| Type | Change |
| Depth | Lite (deletion of two chart cards + copy on one section; no data or API change) |
| Approval Mode | gated |
| Status | approved (2026-10-14, Phase 1 gate) |
| Source | Parent `proposal.md` items 3, 5, 8 (stakeholder feedback, 2026-10-14) |
| Requirement prefix | `PRC` |
| Assumption | OQ-1 of the parent proposal is open (no status-guide URL yet). Default: the link ships behind one configurable URL and **renders only when the URL is set** (PRC-4). |

## 2. Executive Summary

Stakeholders read two charts as a **competition** between Programs and between Centers, and asked for them to go. This spec removes the **Science Programs output ranking** card and the **CGIAR Centers ranking** card from `/portfolio-overview`.

It also fixes a wording problem in the status section. The section already counts W1/W2 **and** W3/Bilateral results (2069 = 1790 + 279), but its subtitle says "across all Science Programs", which made readers think bilaterals were left out. The section is renamed **Portfolio Results Reporting Status**. Its subtitle says plainly that both funding streams are included, and it gains a link to the document that explains the statuses. The figures do not change.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Program ranking card | The card titled "Science Programs output ranking", with Horizontal / Vertical / Heatmap modes, under the status section |
| Center ranking card | The card titled "CGIAR Centers ranking" inside the CGIAR Centers block, with three modes |
| Status section | The card currently titled "Portfolio reporting status": donut, pipeline bar and status tiles |
| Status guide | The external document that explains each result status (for example, that *Rejected* applies only to W3/Bilateral). It is owned by PMU, not by PRMS |

## 4. Scope

**In:** removing the two ranking cards (including their loading skeletons); the title and subtitle of the status section; the status-guide link; a short hint on the *Rejected* tile.
**Out:** any change to the figures; the KPI cards (family #1, `kpi-breakdown`); the Centers block KPI cards (#3); the "Progress by science program" card (#5); the Centers block's "Progress by Center" detail card, which **stays**.

## 5. Personas

Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard`).

## 6. Functional Requirements

### PRC-1 — Program ranking card removed (MUST)

The page SHALL NOT render the Science Programs output ranking card or its skeleton placeholder.

- GIVEN an admin opens `/portfolio-overview` with figures loaded
- WHEN the page renders
- THEN no card titled "Science Programs output ranking" is present, and no Horizontal / Vertical / Heatmap switcher belongs to it
- AND the "Progress by science program" card follows the status section directly
- BUT it must NOT remove or change the "Progress by science program" card, including its table/chart toggle, export, filters and pagination
- AND IT MUST NOT show a loading skeleton for the removed card while `isLoading()` is true

### PRC-2 — Center ranking card removed (MUST)

The CGIAR Centers block SHALL NOT render the CGIAR Centers ranking card.

- GIVEN the Centers block has loaded rows
- WHEN it renders
- THEN no card titled "CGIAR Centers ranking" is present
- AND the block shows, in order: KPI cards, Reporting status, Progress by Center
- BUT it must NOT break the **chart view of Progress by Center**: it still renders with an accessible table fallback and a height that grows with the number of Centers
- AND IT MUST keep the Centers status donut/tile filter working (clicking a status still highlights its column in the Progress by Center **table view**, the default; the chart view never reflected it)

### PRC-3 — Status section renamed and scoped (MUST)

The status section SHALL be titled **"Portfolio Results Reporting Status"**. Its subtitle SHALL state that it covers W1/W2 **and** W3/Bilateral results of the phase.

- GIVEN the page renders with figures
- WHEN the reader looks at the status section
- THEN the title reads "Portfolio Results Reporting Status"
- AND the subtitle names both W1/W2 and W3/Bilateral
- BUT the counts, percentages, donut and tile filter must NOT change (the same `statusSegments()` source, no source filter added)
- AND IT MUST keep the donut total equal to the "Total portfolio results" KPI

### PRC-4 — Link to the status guide (SHOULD)

The status section SHOULD offer a link, "What do these statuses mean?", that opens the status guide in a new tab.

- GIVEN a status-guide URL is configured
- WHEN the section renders
- THEN the link appears next to the subtitle and opens the URL in a new tab (`rel="noopener"`)
- GIVEN no URL is configured (current state, OQ-1)
- THEN no link is rendered: no dead `#` and no disabled placeholder
- AND IT MUST be configured in exactly one place, so adding the URL later is a one-line change

### PRC-5 — Rejected applies to W3/Bilateral only (SHOULD)

The *Rejected* status tile SHOULD carry an accessible hint: "Applies to W3/Bilateral results only".

- GIVEN the status tiles render
- WHEN the reader hovers over or focuses the *Rejected* tile
- THEN the hint is exposed (tooltip and accessible name/description)
- BUT the tile's click behaviour (toggle status filter) must NOT change

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| PRC-N1 | No dead code is left behind. Computeds, chart builders, view-mode signals and click handlers that only served the removed cards are deleted together with their specs. Code shared with surviving cards stays |
| PRC-N2 | No new HTTP request; no server change |
| PRC-N3 | Every string this spec adds or changes lives in `src/app/internationalization/` (client CLAUDE.md §5/§10), following the `portfolio-centers-block.copy.ts` shape. The existing template copy is not migrated by this spec |
| PRC-N4 | Folder docs: `portfolio-overview/CLAUDE.md` is updated and its `Verified:` line re-stamped in the same change |

## 8. Defect classes → gate

| Defect class this spec can produce | Caught by |
|---|---|
| A surviving card loses an input it shared with a removed card (for example, the Progress by Center chart reusing the ranking table or height) | Build (`npm run build:dev` typechecks templates) + scoped Jest on `centers-block` + browser check |
| Compile error from a dangling reference in a template (`tsc` does not check templates) | `npm run build:dev` |
| Specs asserting the removed API or the old copy | Scoped Jest: `npx jest --testPathPattern=portfolio-overview --maxWorkers=2` |
| Status figures changed by accident | Existing `statusSegments` specs (unchanged) + a spec asserting donut total = KPI total |
| Status-guide link rendered with an empty URL | Component spec covering both states (URL set / unset) |
| Layout gap or orphan wrapper where a card was removed | **No automated check** (jsdom cannot see layout). Substitute: a browser check at the HITL pause at 1440px and 768px. Per memory: read-only, no write buttons; confirm the served bundle first |

## 9. Requirement ID Index

| ID | Strength | Owner task |
|---|---|---|
| PRC-1 | MUST | see `tasks.md` |
| PRC-2 | MUST | see `tasks.md` |
| PRC-3 | MUST | see `tasks.md` |
| PRC-4 | SHOULD | see `tasks.md` |
| PRC-5 | SHOULD | see `tasks.md` |
| PRC-N1..N4 | MUST | see `tasks.md` |

## 10. Open Questions

| ID | Question | Default |
|---|---|---|
| OQ-1 | Status guide URL | Link hidden until a URL is provided |
| OQ-2 | Exact subtitle copy | "All W1/W2 and W3/Bilateral results reported in this phase, by status" |
| OQ-3 | Keep the *Rejected* hint (PRC-5) once the guide exists? | Keep it. It is cheap, and it is the example the stakeholder gave |
