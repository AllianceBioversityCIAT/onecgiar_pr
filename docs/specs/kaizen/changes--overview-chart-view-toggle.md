# Kaizen Retrospective: `changes--overview-chart-view-toggle`

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-chart-view-toggle/` (archived 2026-08-27) |
| **Branch Context** | `qa-development-2026` (spec branch — pending items await default-branch apply) |
| **Run Classification** | Clean execution, turbulent scope: 3/3 tasks + 5 owner amendments, ALL Reviewer verdicts PASS on attempt 1; 0 rework/HALT/Pivot/FATAL; budget exceeded ~4× by gate-time amendments (each gated + recorded) |

## Metrics

| Metric | Target | Actual |
|---|---|---|
| Tasks / review rounds | 3 / 1 | 3 tasks + 5 amendments / 5 review rounds (1 per unit, 0 rework) |
| Reviewer FAILs / HALTs / Pivots | 0 | 0 / 0 / 0 |
| LOC (budget ~300) | ~300 | ~1,100 net incl. tests (owner amendments CVT-A-1..A-5) |
| Runtime issues | 0 | 2 subagent reports not delivered on completion (recovered by ping, no attempt consumed); 1 commit-staging race with a concurrent session in the same worktree (recovered, no loss) |

## Lessons

### KZ-CVT-1 (Methodology) — `git add -A` is unsafe in a shared worktree
- **Root cause:** the Leader staged with `git add -A` while a concurrent session had its own uncommitted/staged work in the same checkout — foreign files were swept into the spec's commit twice (second time via a mid-command staging race) before switching to `git commit --only <pathspecs>`.
- **Evidence:** `execution.md` → CVT-T-2 entry, Issues line; session log 2026-08-27.
- **Standardize (pending, spec branch):** one line in `.agents/leader.md` commit discipline: "Stage by explicit pathspec (`git commit --only <files>`), never `git add -A`/`-a` — worktrees can be shared and stashes/indexes race."

### KZ-CVT-2 (Methodology) — spawned workers must be told to deliver their report to "main"
- **Root cause:** two spawns (first Reviewer, scout) finished their work but went idle without sending their report — the wrapper personas define the report *shape* but the brief did not name the delivery *channel*; later briefs added "send verdict via SendMessage to main" and delivery became reliable.
- **Evidence:** `execution.md` → CVT-T-1 entry, Issues line; scout ping 2026-08-28.
- **Standardize (pending, spec branch):** one line in `.agents/leader.md` spawn checklist: "Every brief ends by naming the return channel (e.g. 'send your report via SendMessage to main')."

## Noted, not a lesson

- **The amendment mechanism absorbed a live design session.** The HITL gate produced 5 owner amendments (default flip, totals, card removal, separators, ECharts conversion) — each recorded in requirements/design before code, each briefed with pointers, each PASSed review on attempt 1. The never-silent-rewrite discipline and the budget tripwire (fired as recorded exceedance notes, owner present and directing) held under 4× scope growth. Recurrence-watch only: a gate that turns into a design session on a spec NOT owner-attended should Pivot instead.
- Reusing one Implementer (`impl-cvt-t2`) across chained amendments paid off — context carry-over, zero re-briefing of file layout; author≠auditor held throughout via a separate persistent Reviewer.
- Reviewer caught two silent-ship classes jsdom can't see: the reversed-ramp token drift (`--pr-chart-3` instead of `--pr-chart-2`) and the totals-artifact morph-set isolation — the deep-audit tier earns its cost on chart code.
- T6/HITL again surfaced the decisive calls (consolidation, defaults, separators) minutes after a live render — same pattern as the family retro.

## Pending Items

| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | guide-sync | `.../program-overview/CLAUDE.md` | high | **Extends** `changes--sp-overview-echarts.md` pending item 1 (per tasks.md §7): the rewrite must now ALSO cover — 7 cards (not 8/6); matrix cards toggle heatmap↔bars, default bars, bar-end totals; "DOM bars for single-series rows" invariant dead (all charts via `app-pr-viz-chart`); `categories` input/`overviewCategories` chain removed; separators pattern; new builders (`stackedBarOption`, `singleBarOption`, `datasetIdsFor`, resolvers). | pending |
| 2 | standardization | `.agents/leader.md` (KZ-CVT-1) | high | Commit-discipline line: stage by explicit pathspec, never `git add -A` in shared worktrees. | pending |
| 3 | standardization | `.agents/leader.md` (KZ-CVT-2) | medium | Spawn-checklist line: every brief names the return channel ("SendMessage to main"). | pending |
| 4 | digest-update | follow-up proposals (not guide edits) | medium | Recorded candidates: Overview keyboard drill-down (hidden-table cells as links — CVT-A-5 advisory 1, owner-notified); `changes/overview-toc-map` (proposal already drafted @ `0a9ff21da`). | pending |
| 5 | trd-adr | none | — | No TRD ADR overturned (client-internal; OVW-DD-4 supersession is spec-level, recorded at proposal). | n/a |
| 6 | factual-sweep | root guides | — | Swept root `CLAUDE.md`/`AGENTS.md`: no claim falsified by this cycle (change is component-internal; chart-engine claims already covered by `changes--sp-overview-echarts.md` items 3–4). | n/a |
