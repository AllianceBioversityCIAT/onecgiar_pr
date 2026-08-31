# Design — `changes/overview-aow-progress-hero`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/overview-aow-progress-hero` · Depth Standard · Approval: pre-approved (gates logged) |
| Implements | OAH-R-1..R-6, OAH-N-1..N-3 |
| Visual source | `mockup/Main.dc.html` + `RowStates.dc.html` (Option A approved); B/C kept as decision references only |
| Skills (from Skill Map) | `angular-developer` (+ `tdd` on T-1) |

## 2. Executive Summary

Everything is client-side derivation over signals the host already owns. One new host computed enriches the rows; `program-overview` §8 is rebuilt to the Option A anatomy and moved up; row actions reuse the existing tab-switch + `openAowFocused` mechanics with one small host glue method.

## 3. Architecture Overview

- **Host (`dashboard-lab.component.ts`)** stays the data owner: a new `overviewAowProgressRich` computed derives per-AoW `{code, name, complete, partial, notStarted, zeroTarget, reported, total, remaining}` from `indicatorsByAow()` (HLO tier only, as today) **delegating to the shared helpers** in `reporting-burndown.ts` (`applyZeroTargetRule`; Reported/Complete boundaries per the MRF glossary). Sort: remaining DESC, tie code ASC. Loading = the same `!toc` flags (`indicatorsByAow`'s `loading`) aggregated into a `overviewAowProgressLoading` boolean the section consumes.
- **`program-overview` (§8)** consumes the rich rows via a widened `AowProgressRow` interface (superset — old fields stay for the hub's `aowRows` input, which keeps consuming the THIN rows unchanged; two inputs, no shared mutation).
- **Navigation glue**: one host method `openAowReporting(code)` = switch the top tab to Reporting + `openAowFocused(code)`; `continueReporting()` = switch tab + grouped view + `onlyPending.set(true)`. Both are thin compositions of existing signals — no new routing.

## 4. Directory / Files touched

`dashboard-lab.component.ts` (+computed, +2 glue methods, +outputs wiring), `program-overview.component.{ts,html}` (§8 rebuild + section move + interface), `program-overview` spec files, `reporting-burndown.ts` (ONLY if a helper needs a non-breaking export — no rule changes). No SCSS files: Tailwind utilities per the client hard rule; skeleton token `--pr-surface-ground` already exists.

## 5. Data Model

`OverviewAowProgressRowRich` (client interface only): counts as defined in requirements §3 glossary; invariant `complete + partial + notStarted = total` (zero-target excluded from all four). No server/API change.

## 6. Component Design (mockup → structure)

| Mockup region | Implementation |
|---|---|
| Summary rail (300px, `--pr-surface-band` tint) | Flex column inside the section card; SVG ring (stroke-dasharray from reported/total); mono figures `.pr-figure`; split counts list; CTA = the one `brand` button of the screen (rule §4.1) |
| Rows grid | CSS grid `1fr 260px 120px 170px` (matches the reporting-aow-table rhythm); row min-height 62px |
| Segmented bar | 12px track, flex children widths = `count/total*100%`, emerald `#19ae58` (status token green-500) + violet `--pr-color-primary-300` on `--pr-border` track; `title` carries the three counts + zero-target disclosure |
| Actions | Report/View = `.pr-row-action` recipe (32px, border -300 — the WCAG deviation); open icon = the shared 30/32px icon-button recipe (aligned family from MRF) |
| Outcomes footer | Chips + legend row on `#fbfbfc`-equivalent surface token (`--pr-surface-subtle`) |
| Skeletons | Pulse blocks `bg-[var(--pr-surface-ground)]`, exact shapes from `RowStates.dc.html` |

## 7. Design Decisions

- **DD-1 · Adopt the zero-target rule on this surface** (closes judgment C-5's recorded divergence for §8 only). Reversion challenge (this CHANGES delivered behavior — today's rows count zero-target KPIs): *what breaks?* The hub's W1/W2 lane and the old §8 shared `overviewAowProgress`; the hub KEEPS the thin computed (unchanged numbers), so only §8's figures shift — by design, to match the Reporting tab. `overviewXcutProgress`/toc-map stay on the old rule (still-recorded divergence). Accepted.
- **DD-2 · Placement supersedes TCM-R-1's adjacency clause.** The ToC map keeps its absolute position; only §8 moves up. Rationale: dragging the (huge) map up would bury the status charts; the map's value is exploratory, the hero's is operational. Recorded as a superseding note — `changes/overview-toc-map` is archived; no live doc edit needed beyond this record.
- **DD-3 · Row basis stays HLO-tier** (as today's §8) — outcomes tier lives in the footer chips; mixing tiers into the bars would break count honesty vs the "HIGH LEVEL OUTPUTS" framing.
- **DD-4 · Thin + rich rows coexist**: the hub keeps consuming the thin rows; §8 consumes rich. One derivation site each, no interface break for the hub (REH untouched).
- **DD-5 · No echarts** (Option B rejected): near-zero data barely paints; grid+flex is testable and cheap.
- **DD-6 · Both actions land on the By-AOW focused view** (OQ-1 resolved: CTA → grouped+Only-pending; row actions → focused AoW). Uses existing `openAowFocused`; the legacy `openAow` page stays reachable from other surfaces (no removal — no reversion challenge needed).

## 8. Budget (tripwire for /akili-execute)

| Metric | Estimate |
|---|---|
| Tasks | 5 |
| Non-test LOC | ~700 (KZ-REH-1 applied: state-rich Tailwind template budgeted at 2× naive) |
| Review rounds | ≤1 per task (owner mandate) |

## 9. Risks

Concurrency with the parallel session on `dashboard-lab.component.*` (KZ-MRF-3 — diff-check before commits); template-heavy diff (budget above); jsdom-blind visual classes routed to T-5 live rows (requirements §8).
