# Design — `changes/overview-aow-progress-hero`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/overview-aow-progress-hero` · Depth Standard · Judged: APPROVED (fix round 1, `judgment.md`) |
| Implements | OAH-R-1..R-6, N-1..N-3 |
| Visual | `mockup/Main.dc.html` + `RowStates.dc.html` (corrected post-judgment; B/C = decision references) |
| Skills | `angular-developer` (+ `tdd` on T-1) |

## 2. Executive Summary

Client-side only. One new host computed derives rich rows; `program-overview` §8 is rebuilt to the Option A anatomy and moved up; navigation reuses the EXISTING `onOpenAow` router path; the CTA is a router navigation plus the storage-backed Only-pending setter. No new outputs, no new glue methods, no server change.

## 3. Architecture Overview

- **Tabs are routes (C-1).** Overview and Reporting are separate route configs; the component is destroyed on switch and `rfrView` is route-derived. Every cross-tab action therefore goes through `router.navigate` with query params — the mechanism `onOpenAow` already implements. State that must survive the switch rides query params (`?tocView=`, `?tocAow=`) or sessionStorage (Only-pending, via its existing persisting setter).
- **Host**: new `overviewAowProgressRich` computed — per-AoW `{code, name, complete, inProgress, notStarted, zeroTarget, reported, total, remaining}` from `indicatorsByAow()` (output tier, `__tier !== 'outcome'`), delegating splits to the shared helpers' `stateOf`/`applyZeroTargetRule` (glossary = the helper's own partition, C-2). Sort remaining DESC, tie code ASC. Loading reuses the existing flags (`loadingAows()` + per-bundle `loading`) — no new aggregate (B-16).
- **CTA**: `setOnlyPending(true)` (sessionStorage-backed — a bare `.set()` dies with the component, C-1/B-7) then `router.navigate` to the program's Reporting route with `{queryParams: {tocView: 'aows'}}`. `reportingViewMode` untouched (B-12).
- **`program-overview`**: NEW `richRows` input for §8 ONLY (C-8). The thin `aowProgress` input remains untouched, still feeding KPI card 4, the section-tab badge, `aowStats`, and the hub — their numbers do not move. On-screen denominator/order differences vs the hero are ACCEPTED and disclosed (DD-1/DD-4).

## 4. Files touched

`dashboard-lab.component.ts` (+computed, +CTA method, binding), `program-overview.component.{ts,html,spec.ts}` (§8 rebuild + move + new input + the four expected-to-change pinned tests), `reporting-burndown.ts` (docstring scope amendment only — B-14), folder `CLAUDE.md`s. No SCSS (the component's file is a 3-line `:host` stub and stays so).

## 5. Data Model

`OverviewAowProgressRowRich` (client interface): glossary counts; invariant `complete + inProgress + notStarted = total` (zero-target excluded from all four; the `target=0∧achieved>0` case lands in `inProgress` — the partition is total, C-2). No API change.

## 6. Component Design (mockup → structure)

| Region | Implementation |
|---|---|
| Summary rail | Flex column, `--pr-surface-band` tint; SVG ring (dasharray from reported/total); `.pr-figure` mono; splits list; CTA styled as the section's primary action (brand fill — note: the hub above also paints brand buttons; no "only brand button" claim, A-14) |
| Rows grid | CSS grid `1fr 260px 120px 170px` — **the mockup's tracks; deliberately NOT the reporting-aow-table's** (`28px minmax(280px,1fr) 80px 80px 112px 136px 36px`) — different anatomy, different grid (A-13) |
| Segmented bar | 12px track `--pr-border`; segment widths = `count/total*100%` computed in TS (never template arithmetic); Complete = `var(--pr-color-green-500)`, In progress = `var(--pr-color-primary-300)` — tokens, never hex (B-15); `title` = three counts + zero-target disclosure |
| Actions | Report/View results + open icon: **inlined utility recipes** (32px / border `--pr-color-primary-300` / 14px/500 — the repo's cross-component precedent at `dashboard-lab.component.html:1741`). `.pr-row-action` is component-scoped SCSS and MUST NOT be referenced here (C-10). `canReportW1W2` gate preserved verbatim (C-7) |
| Outcomes footer | Chips + legend on `--pr-surface-subtle` (token snap from the mockup's `#fbfbfc`, A-17); chips keep the old rows' click-through |
| Skeletons | Pulse blocks `bg-[var(--pr-surface-ground)]`, shapes per corrected `RowStates.dc.html` |

## 7. Design Decisions

- **DD-1 · Zero-target rule on the HERO only.** The thin input (card 4, badge, hub) keeps today's unfiltered rule — their numbers do not move (C-8). The same-screen difference is disclosed via the hero's `title` (MRF precedent) and recorded here as accepted; so is the hub-vs-hero ORDER difference (hub % ASC, hero remaining DESC — A-19). Reversion challenge: what breaks? Nothing delivered — no existing consumer changes inputs.
- **DD-2 · Placement supersedes TCM-R-1 adjacency.** Map stays last; §8 moves up; the map's heading index shifts 8→7 (A-20). The four pinned tests this breaks are enumerated in T-2 as deliberate edits (C-4).
- **DD-3 · Row basis = output tier** (`__tier !== 'outcome'`), as today (B-18).
- **DD-4 · Thin + rich inputs coexist**; hub and cards untouched (C-8).
- **DD-5 · No echarts** (Option B rejected — near-zero data barely paints).
- **DD-6 · One navigation path.** Rows/chips/buttons all emit the EXISTING `openAow` output → `onOpenAow` (already lands on `?tocView=byAow&tocAow=` per REH-R-10; buckets branch to `?tocView=aows`). No new output, no `openAowReporting` (C-5/C-6). Reversion challenge: nothing is removed — buttons are additive over the row's existing click-through (A-16).

## 8. Budget (tripwire)

| Metric | Estimate |
|---|---|
| Tasks | 6 |
| Non-test LOC | ~650 (KZ-REH-1 2× template factor; scope shrank — no glue duplication) |
| Review rounds | ≤1 per task (owner mandate) |

## 9. Risks

Parallel session on the same files (KZ-MRF-3 — `git diff HEAD` before commits); the pinned-test edits are the riskiest diff (own task, smallest possible); jsdom-blind classes routed to T-6 live rows.
